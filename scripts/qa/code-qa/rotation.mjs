#!/usr/bin/env node
/**
 * Code QA (plan 415) — the code-review rotation. Scripts own all state; the Cowork agent only reads queue.md
 * and writes review-<PAGE>.md files.
 *
 *   node scripts/qa/code-qa/rotation.mjs pick   --date=YYYY-MM-DD [--stop-at=HH:MM]
 *        → bugs/qa-runs/code-qa/<DATE>/queue.md: every page in review order
 *   node scripts/qa/code-qa/rotation.mjs ingest --date=YYYY-MM-DD
 *        → reads <DATE>/review-*.md, updates ledger.json, adds CODE-AI- findings and Code review blocks to latest.md
 *
 * Queue order: partial pages first (resume), then never-reviewed pages in qa-plan.md order, then the rest by
 * last review, oldest first. Files changed since a page's last review only break ties, so a busy page can
 * never starve a quiet one.
 */
import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'
import { loadPageMap, localDate, nightlyLog, outRoot, repoRoot } from './common.mjs'
import { loadPlanChecks } from './plan-checks.mjs'
import { normalizeFinding, writeReports } from './findings.mjs'

export const MARKS = ['code-verified', 'suspect', 'unknown']

// --- ledger ----------------------------------------------------------------------

export const emptyLedger = () => ({ version: 1, pages: {}, ingested: {} })

export function loadLedger(file) {
  if (!existsSync(file)) return emptyLedger()
  const l = JSON.parse(readFileSync(file, 'utf8'))
  return { version: 1, pages: l.pages || {}, ingested: l.ingested || {} }
}

const pageEntry = (ledger, id) => ledger.pages[id] || { id, status: 'never', lastReviewed: null, lastCommit: null, checksDone: [], marks: {}, openFindings: 0, history: [], reviews: 0 }

// --- review files ------------------------------------------------------------------

/**
 * Parses the fixed header and the `### <CHECK> · <mark> · [S1-S4 ·] <line>` lines of a review file.
 * Returns { page, commit, status, checksDone, checks: [{ id, mark, severity, title }] } or { error }.
 */
export function parseReview(text) {
  const head = (k) => new RegExp(`^${k}:\\s*(.+?)\\s*(?:#.*)?$`, 'mi').exec(text)?.[1]
  const page = head('Page')
  const commit = head('Commit') || ''
  const status = head('Status')
  if (!page || !/^[A-Z]+$/.test(page)) return { error: 'no Page: header' }
  if (!['done', 'partial'].includes(status)) return { error: `Status: must be done or partial, got ${status || 'nothing'}` }
  const checksDone = (head('Checks-done') || '').split(/[\s,]+/).filter((c) => /^[A-Z]+-C\d{2}$/.test(c))
  const checks = []
  for (const m of text.matchAll(/^###\s+([A-Z]+-C\d{2})\s*·\s*(code-verified|suspect|unknown)\s*·\s*(?:(S[1-4])\s*·\s*)?(.+?)\s*$/gm)) {
    if (!m[1].startsWith(`${page}-`)) continue
    checks.push({ id: m[1], mark: m[2], severity: m[3] || 'S3', title: m[4] })
  }
  return { page, commit, status, checksDone: [...new Set([...checksDone, ...checks.map((c) => c.id)])], checks }
}

/**
 * Applies one review to the ledger (returns a new ledger). Idempotent: a file already ingested with the same
 * content changes nothing, and a review older than the page's last review is ignored.
 */
export function applyReview(ledger, review, date, file, sha) {
  if (ledger.ingested[file] === sha) return ledger
  const next = structuredClone(ledger)
  next.ingested[file] = sha
  const p = pageEntry(next, review.page)
  if (p.lastReviewed && p.lastReviewed > date) { next.pages[review.page] = p; return next }
  const marks = p.status === 'partial' || p.lastReviewed === date ? { ...p.marks } : {}
  for (const c of review.checks) marks[c.id] = c.mark
  const done = review.status === 'done'
  next.pages[review.page] = {
    ...p,
    status: done ? 'done' : 'partial',
    lastReviewed: date,
    lastCommit: review.commit || p.lastCommit,
    checksDone: done ? [] : [...new Set([...(p.status === 'partial' ? p.checksDone : []), ...review.checksDone])].sort(),
    marks,
    openFindings: Object.values(marks).filter((m) => m === 'suspect').length,
    history: [...new Set([...p.history, date])].sort(),
    reviews: new Set([...p.history, date]).size
  }
  return next
}

// --- queue ---------------------------------------------------------------------------

/**
 * Review order of `pageIds` (qa-plan order). `changed(id)` = files changed since that page's last review.
 * partial (oldest first) → never (plan order) → the rest by lastReviewed oldest first; ties: more changed first.
 */
export function pickOrder(ledger, pageIds, changed = () => 0) {
  const rank = (p) => (p.status === 'partial' ? 0 : p.status === 'never' ? 1 : 2)
  const idx = new Map(pageIds.map((id, i) => [id, i]))
  return pageIds
    .map((id) => pageEntry(ledger, id))
    .sort((a, b) => rank(a) - rank(b)
      || (rank(a) === 1 ? 0 : String(a.lastReviewed).localeCompare(String(b.lastReviewed)))
      || (rank(a) === 2 ? changed(b.id) - changed(a.id) : 0)
      || idx.get(a.id) - idx.get(b.id))
    .map((p) => p.id)
}

function git(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

/** { count, range } of files under `globs` changed since `commit` (count 0, range n/a when unknown). */
export function changesSince(root, commit, globs) {
  if (!commit || !globs.length) return { count: 0, range: 'n/a' }
  const head = git(root, ['rev-parse', '--short', 'HEAD'])
  const out = git(root, ['diff', '--name-only', commit, 'HEAD', '--', ...globs.map((g) => `:(glob)${g}`)])
  if (out === null || !head) return { count: 0, range: `${commit}..? (commit not found)` }
  return { count: out ? out.split('\n').length : 0, range: `${commit}..${head}` }
}

export function renderQueue({ date, commit, stopAt, order, ledger, pageMap, checks, changes }) {
  const byId = new Map(pageMap.pages.map((p) => [p.id, p]))
  const out = [
    `# Code review queue — ${date}`,
    `Commit: ${commit}`,
    `STOP_AT: ${stopAt}`,
    '',
    'Work down this list in order (docs/qa/code-qa-agent.md). Write bugs/qa-runs/code-qa/' + date + '/review-<PAGE>.md',
    'per page and update its header after every check. Stop at STOP_AT wherever you are.',
    ''
  ]
  order.forEach((id, i) => {
    const p = pageEntry(ledger, id)
    const page = byId.get(id) || { title: id, files: [] }
    const done = new Set(p.status === 'partial' ? p.checksDone : [])
    const ch = changes[id] || { count: 0, range: 'n/a' }
    out.push(`## ${i + 1}. ${id} — ${page.title}`)
    out.push(`Status: ${p.status}${p.lastReviewed ? ` · last reviewed ${p.lastReviewed} at ${p.lastCommit || '?'}` : ''} · reviews: ${p.reviews}`)
    out.push(`Changed since last review: ${ch.count} file(s) · ${ch.range}`)
    out.push(`Files: ${(page.files || []).map((f) => `\`${f}\``).join(' ')}`)
    out.push(`Already done: ${done.size ? [...done].join(', ') : 'none'}`)
    out.push('Checks (qa-plan.md section ' + id + '):')
    for (const c of checks[id] || []) out.push(`- ${c.id}${done.has(c.id) ? ' (done)' : ''} — ${c.planId} — ${c.text.slice(0, 160)}${c.text.length > 160 ? '…' : ''}`)
    out.push('')
  })
  return out.join('\n')
}

export function pick({ root = repoRoot, date, stopAt = '02:40' }) {
  const base = outRoot(root)
  const ledger = loadLedger(join(base, 'ledger.json'))
  const pageMap = loadPageMap(root)
  const checks = loadPlanChecks(root)
  const ids = pageMap.pages.map((p) => p.id)
  const changes = {}
  for (const p of pageMap.pages) changes[p.id] = changesSince(root, pageEntry(ledger, p.id).lastCommit, p.files || [])
  const order = pickOrder(ledger, ids, (id) => changes[id].count)
  const commit = git(root, ['rev-parse', '--short', 'HEAD']) || '?'
  mkdirSync(join(base, date), { recursive: true })
  const file = join(base, date, 'queue.md')
  writeFileSync(file, renderQueue({ date, commit, stopAt, order, ledger, pageMap, checks, changes }), 'utf8')
  return { file, order }
}

// --- latest.md blocks ------------------------------------------------------------------------

/** pageExtras for findings.renderLatest: a `Code review:` block per reviewed page. */
export function codeReviewExtras(ledger) {
  const extras = {}
  for (const p of Object.values(ledger.pages)) {
    if (!p.lastReviewed) continue
    const marks = Object.entries(p.marks).sort(([a], [b]) => a.localeCompare(b))
    extras[p.id] = [
      `Code review: ${p.lastReviewed} (${p.status}) · commit ${p.lastCommit || '?'} · suspect ${marks.filter(([, m]) => m === 'suspect').length} · unknown ${marks.filter(([, m]) => m === 'unknown').length} · verified ${marks.filter(([, m]) => m === 'code-verified').length}`,
      ...(marks.length ? [`  ${marks.map(([c, m]) => `${c} ${m}`).join(' · ')}`] : [])
    ]
  }
  return extras
}

// --- ingest ------------------------------------------------------------------------------

/** Ingests every review file of `date`; updates ledger.json, the date's pre-qa and latest.md. */
export function ingest({ root = repoRoot, date, log = () => {} }) {
  const base = outRoot(root)
  const dir = join(base, date)
  const ledgerFile = join(base, 'ledger.json')
  let ledger = loadLedger(ledgerFile)
  const pageMap = loadPageMap(root)
  const known = new Set(pageMap.pages.map((p) => p.id))
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^review-[A-Z]+\.md$/.test(f)).sort() : []
  const reviews = []
  for (const f of files) {
    const text = readFileSync(join(dir, f), 'utf8')
    const r = parseReview(text)
    if (r.error) { log(`ingest skipped ${date}/${f} ${r.error}`); continue }
    if (!known.has(r.page)) { log(`ingest skipped ${date}/${f} unknown page ${r.page}`); continue }
    if (`review-${r.page}.md` !== f) { log(`ingest skipped ${date}/${f} Page: ${r.page} does not match the file name`); continue }
    reviews.push({ file: f, review: r })
    ledger = applyReview(ledger, r, date, `${date}/${f}`, createHash('sha1').update(text).digest('hex'))
  }
  writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + '\n', 'utf8')

  const findings = reviews.flatMap(({ file, review }) => review.checks.filter((c) => c.mark === 'suspect').map((c) => normalizeFinding('ai', {
    check: c.id, page: review.page, locator: c.id, severity: c.severity, type: 'CODE', title: c.title,
    where: `code review of ${review.page} (${c.id})`, evidence: `bugs/qa-runs/code-qa/${date}/${file}`
  })))
  const preQa = join(dir, 'pre-qa.json')
  const run = existsSync(preQa)
    ? JSON.parse(readFileSync(preQa, 'utf8'))
    : { run: `code-qa-${date}`, date, commit: git(root, ['rev-parse', '--short', 'HEAD']) || '?', startedAt: new Date().toISOString(), layers: {} }
  run.layers.ai = {
    status: 'ok', durationMs: 0,
    coverage: `${reviews.length} page review(s): ${reviews.map(({ review }) => `${review.page} ${review.status}`).join(', ') || 'none'}`,
    coveredPages: reviews.filter(({ review }) => review.status === 'done').map(({ review }) => review.page),
    findings
  }
  run.finishedAt = run.finishedAt || new Date().toISOString()
  writeReports(base, run, { pageOrder: ['GLOBAL', ...pageMap.pages.map((p) => p.id)], pageExtras: codeReviewExtras(ledger) })
  return { reviews: reviews.length, findings: findings.length }
}

// --- CLI ---------------------------------------------------------------------------------

export function main(argv = process.argv.slice(2), { root = repoRoot } = {}) {
  const [cmd, ...rest] = argv
  const opt = Object.fromEntries(rest.map((a) => a.replace(/^--/, '').split(/=(.*)/s).slice(0, 2)))
  const date = opt.date || localDate()
  const say = (m) => {
    console.log(`CODE-QA: ${m}`)
    if ('nightly' in opt) nightlyLog(root, `CODE-QA: ${m}`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error('CODE-QA: --date must be YYYY-MM-DD'); return 1 }
  if (cmd === 'pick') {
    const { file, order } = pick({ root, date, stopAt: opt['stop-at'] || '02:40' })
    say(`queue ${date}: ${order.slice(0, 5).join(' ')}${order.length > 5 ? ' …' : ''} — ${file.replace(/\\/g, '/').replace(/^.*\/bugs\//, 'bugs/')}`)
    return 0
  }
  if (cmd === 'ingest') {
    const r = ingest({ root, date, log: say })
    say(`ingest ${date}: ${r.reviews} review(s), ${r.findings} suspect finding(s)`)
    return 0
  }
  console.error('usage: rotation.mjs pick|ingest --date=YYYY-MM-DD [--stop-at=HH:MM] [--nightly]')
  return 1
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href.toLowerCase() === import.meta.url.toLowerCase()
if (isMain) process.exit(main())
