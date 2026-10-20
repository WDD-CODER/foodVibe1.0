/**
 * Code QA findings store (plan 413).
 *
 * Every finding gets a fingerprint sha1(layer|check|page|bp|locator)[0..12] and, the first time it is seen,
 * a permanent ID CODE-<LAYER>-<NNN>. known.json keeps every finding ever seen; a finding not seen again in a
 * run whose layer covered its page becomes `gone`. Reports:
 *   <DATE>/pre-qa.json, <DATE>/pre-qa.md — this run, per layer
 *   latest.md                           — what the UI agent reads: open findings by page + PRE-CHECKED
 */
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export const SEVERITIES = ['S1', 'S2', 'S3', 'S4']
export const BREAKPOINTS = ['D', 'T', 'M']
/** Order layers run and are reported in. Later plans add theirs here. */
export const LAYER_ORDER = ['gates', 'static', 'api', 'sweep', 'ai']

/** sha1(layer|check|page|bp|locator), first 12 hex chars. */
export function fingerprint({ layer, check, page, bp, locator }) {
  return createHash('sha1').update([layer, check, page, bp || '-', locator].join('|')).digest('hex').slice(0, 12)
}

/** Strips tokens and auth headers from text that came from a page, a log or a command. */
export function redact(text) {
  return String(text ?? '')
    .replace(/(authorization\s*[:=]\s*)(bearer\s+)?[^\s,;"']+/gi, '$1[redacted]')
    .replace(/bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, '[jwt redacted]')
    .replace(/(fv_token["']?\s*[:=,]\s*["']?)[^\s"',;)]+/gi, '$1[redacted]')
    .replace(/(fv_refresh[A-Za-z0-9_]*=)[^;\s]+/gi, '$1[redacted]')
}

/** Fills defaults, redacts free text and adds the fingerprint. */
export function normalizeFinding(layer, f) {
  const out = {
    layer,
    check: f.check,
    page: f.page || 'GLOBAL',
    bp: f.bp || '-',
    locator: String(f.locator ?? ''),
    severity: SEVERITIES.includes(f.severity) ? f.severity : 'S3',
    type: f.type || 'FUNC',
    title: redact(f.title),
    where: redact(f.where || ''),
    expected: redact(f.expected || ''),
    actual: redact(f.actual || ''),
    evidence: f.evidence || '',
    detail: redact(f.detail || '')
  }
  out.fp = fingerprint(out)
  return out
}

/** Drops in-run duplicates (same fingerprint): the first is kept, `count` says how often it was seen. */
export function dedupe(findings) {
  const byFp = new Map()
  for (const f of findings) {
    const seen = byFp.get(f.fp)
    if (seen) seen.count = (seen.count || 1) + 1
    else byFp.set(f.fp, { ...f, count: f.count || 1 })
  }
  return [...byFp.values()]
}

export function loadKnown(file) {
  if (!existsSync(file)) return { version: 1, counters: {}, findings: {} }
  const k = JSON.parse(readFileSync(file, 'utf8'))
  return { version: 1, counters: k.counters || {}, findings: k.findings || {} }
}

const covers = (layerRun, page) =>
  layerRun.coveredPages === '*' || (Array.isArray(layerRun.coveredPages) && layerRun.coveredPages.includes(page))

/**
 * Merges this run into known (returns a new object). Gives each run finding its permanent `id`.
 * run = { date, layers: { <layer>: { status, coveredPages: '*' | [pageIds], findings: [normalized] } } }
 */
export function mergeKnown(known, run) {
  const next = { version: 1, counters: { ...known.counters }, findings: structuredClone(known.findings) }
  const seen = new Set()
  for (const [layer, lr] of Object.entries(run.layers)) {
    for (const f of lr.findings || []) {
      seen.add(f.fp)
      let k = next.findings[f.fp]
      if (!k) {
        const key = layer.toUpperCase()
        next.counters[key] = (next.counters[key] || 0) + 1
        k = next.findings[f.fp] = {
          fp: f.fp, id: `CODE-${key}-${String(next.counters[key]).padStart(3, '0')}`,
          firstSeen: run.date, layer, page: f.page, bp: f.bp, check: f.check, title: f.title
        }
      }
      Object.assign(k, { lastSeen: run.date, status: 'open', severity: f.severity, title: f.title })
      delete k.goneSince
      f.id = k.id
    }
  }
  for (const k of Object.values(next.findings)) {
    if (k.status !== 'open' || seen.has(k.fp)) continue
    const lr = run.layers[k.layer]
    if (lr && ['ok', 'partial'].includes(lr.status) && covers(lr, k.page)) {
      k.status = 'gone'
      k.goneSince = run.date
    }
  }
  return next
}

const sevRank = (s) => SEVERITIES.indexOf(s)
const bySeverity = (a, b) => sevRank(a.severity) - sevRank(b.severity) || String(a.id).localeCompare(String(b.id))

/** One finding in the qa-agent.md §6.3 shape. */
export function renderFinding(f) {
  const lines = [`### ${f.id} · ${f.severity} · ${f.type} · ${f.title}`]
  lines.push(`- **Where:** ${f.where || f.page} · **Breakpoint:** ${f.bp === '-' ? 'any' : f.bp} · **Check:** ${f.check} · **Fingerprint:** \`${f.fp}\``)
  if (f.expected) lines.push(`- **Expected:** ${f.expected}`)
  if (f.actual) lines.push(`- **Actual:** ${f.actual}${f.count > 1 ? ` (seen ${f.count}×)` : ''}`)
  if (f.evidence) lines.push(`- **Evidence:** \`${f.evidence}\``)
  if (f.detail) lines.push('- **Detail:**', '```', f.detail.trimEnd(), '```')
  return lines.join('\n')
}

const orderedLayers = (layers) =>
  Object.keys(layers).sort((a, b) => (LAYER_ORDER.indexOf(a) + 1 || 99) - (LAYER_ORDER.indexOf(b) + 1 || 99))

const fmtMs = (ms) => (ms >= 60_000 ? `${(ms / 60_000).toFixed(1)} min` : `${Math.round((ms || 0) / 1000)} s`)

export function renderPreQa(run) {
  const out = [
    `# Code QA — ${run.date}`,
    `Commit: ${run.commit || '?'} · started ${run.startedAt} · finished ${run.finishedAt || '?'}`,
    'Severity: S1 blocker · S2 major · S3 minor · S4 cosmetic. IDs are permanent; `latest.md` lists what is still open.',
    ''
  ]
  if (run.blocked) out.push(`**BLOCKED:** ${run.blocked}`, '')
  for (const layer of orderedLayers(run.layers)) {
    const lr = run.layers[layer]
    const fs = [...(lr.findings || [])].sort(bySeverity)
    out.push(`## ${layer}`, `Status: ${lr.status} · ${fs.length} findings · ${fmtMs(lr.durationMs)}`, `Coverage: ${lr.coverage || 'none'}`)
    if (lr.note) out.push(`Note: ${lr.note}`)
    out.push('')
    for (const f of fs) out.push(renderFinding(f), '')
  }
  return out.join('\n')
}

/**
 * latest.md for the UI agent. opts.pageExtras = { <PAGE>: [markdown lines] } lets later layers (plan 415's
 * code review) add a block under a page.
 */
export function renderLatest(run, known, opts = {}) {
  const open = Object.values(known.findings).filter((k) => k.status === 'open')
  const runFindings = new Map()
  for (const lr of Object.values(run.layers)) for (const f of lr.findings || []) runFindings.set(f.fp, f)
  const pages = [...new Set([...(opts.pageOrder || []), ...open.map((k) => k.page)])]
  const out = [
    '# Code QA — latest',
    `Generated: ${run.finishedAt || new Date().toISOString()} · Run: ${run.date} · Commit: ${run.commit || '?'}`,
    `Report: bugs/qa-runs/code-qa/${run.date}/pre-qa.md`,
    '',
    'For the UI agent (docs/qa/qa-agent.md §7): every finding below is already known — never report a `CODE-*`',
    'fingerprint again. A G-check listed under PRE-CHECKED for a page and breakpoint was run by the script: skip it.',
    'If this file is missing or Generated is older than 24 h, ignore it and run the full protocol.',
    '',
    `Layers: ${orderedLayers(run.layers).map((l) => `${l} ${run.layers[l].status}`).join(' · ')}`,
    `Open findings: ${open.length}`,
    ''
  ]
  const pre = run.preChecked || []
  out.push('## PRE-CHECKED', '')
  if (!pre.length) out.push('none — run the G-checks yourself', '')
  else {
    out.push('| Page | D | T | M |', '|---|---|---|---|')
    const byPage = new Map()
    for (const p of pre) {
      if (!byPage.has(p.page)) byPage.set(p.page, {})
      byPage.get(p.page)[p.bp] = p.checks.join(' ')
    }
    for (const [page, bps] of byPage) out.push(`| ${page} | ${BREAKPOINTS.map((b) => bps[b] || '—').join(' | ')} |`)
    out.push('')
  }
  out.push('## Open findings by page', '')
  for (const page of pages) {
    const list = open.filter((k) => k.page === page).sort(bySeverity)
    const extras = opts.pageExtras?.[page] || []
    if (!list.length && !extras.length) continue
    out.push(`### ${page}`, '')
    for (const k of list) {
      const f = runFindings.get(k.fp)
      const where = f ? ` — ${f.where || ''}`.replace(/ — $/, '') : ''
      out.push(`- \`${k.id}\` · ${k.severity} · ${k.bp === '-' ? 'any bp' : k.bp} · ${k.title}${where} · fp \`${k.fp}\` · since ${k.firstSeen}${f?.evidence ? ` · \`${f.evidence}\`` : ''}`)
    }
    if (extras.length) out.push('', ...extras)
    out.push('')
  }
  if (run.shots?.length) {
    out.push('## Newest shots', '')
    for (const s of run.shots) out.push(`- \`${s}\``)
    out.push('')
  }
  return out.join('\n')
}

/** Writes <DATE>/pre-qa.json, <DATE>/pre-qa.md, known.json and latest.md under `base`; returns known. */
export function writeReports(base, run, opts = {}) {
  const dir = join(base, run.date)
  mkdirSync(dir, { recursive: true })
  const knownFile = join(base, 'known.json')
  const known = mergeKnown(loadKnown(knownFile), run)
  writeFileSync(join(dir, 'pre-qa.json'), JSON.stringify(run, null, 2) + '\n', 'utf8')
  writeFileSync(join(dir, 'pre-qa.md'), renderPreQa(run), 'utf8')
  writeFileSync(knownFile, JSON.stringify(known, null, 2) + '\n', 'utf8')
  writeFileSync(join(base, 'latest.md'), renderLatest(run, known, opts), 'utf8')
  return known
}
