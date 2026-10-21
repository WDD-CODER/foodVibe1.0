/**
 * Reuse layer (plan 450, ADR 0024): the component-family registry parser and the plan "## Reuse Check" gate.
 * Used by `node scripts/scope-check.mjs --reuse --plan=<p>` (BLOCK) and `scripts/reuse-lint.mjs`.
 *
 * Registry (docs/brain/component-families.md): one `### <family-id> — <title>` heading per family, bullet fields
 * below it, and one header line "Reuse enforced from plan: NNN". Every backticked repo path in the file is
 * expected to exist on disk (`reuse-lint --check-registry`).
 *
 * Plan section — one bullet (or table row) per new piece the plan creates:
 *   ## Reuse Check
 *   - <new piece> — family: <family-id | none> — rung: <1-4> — why: <one line; required for rung 4>
 *   - none — <why this plan creates no component, util, pipe, service or .c-* class>
 * Rungs: 1 use as is · 2 use with existing inputs · 3 extend the family · 4 new family (needs a why).
 * Table form: | New piece | Family | Rung | Why | (header row names the columns).
 *
 * A plan numbered below "Reuse enforced from plan:" without the section is grandfathered (skipped);
 * a plan that has the section is always checked.
 */
import { readFileSync, existsSync } from 'fs'
import { join, isAbsolute } from 'path'
import { planNumber } from './invariants.mjs'

export const REGISTRY_PATH = 'docs/brain/component-families.md'

const REPO_PATH_RE = /^(?:src|server|shared|scripts|docs|public|e2e)\/[^\s`]*$/

/** Parse the registry: { enforcedFrom, families: [{ id, title, line }], paths: [{ path, line }] }. */
export function parseRegistry(text) {
  const enforced = text.match(/^(?:Reuse enforced|Enforced) from plan:\s*(\d+)/m)
  const families = []
  const paths = []
  text.split(/\r?\n/).forEach((l, i) => {
    const h = l.match(/^### ([a-z0-9][a-z0-9-]*)\s*[—-]\s*(.*)$/)
    if (h) families.push({ id: h[1], title: h[2].trim(), line: i + 1 })
    for (const m of l.matchAll(/`([^`]+)`/g)) {
      if (REPO_PATH_RE.test(m[1])) paths.push({ path: m[1], line: i + 1 })
    }
  })
  return { enforcedFrom: enforced ? Number(enforced[1]) : null, families, paths }
}

function sectionBody(planText, title) {
  const m = planText.match(new RegExp(`^## ${title}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'))
  return m ? m[1] : null
}

function field(text, name) {
  const m = text.match(new RegExp(`\\b${name}\\s*:\\s*([^—·|]*)`, 'i'))
  return m ? m[1].trim() : ''
}

function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
}

/** Parse "## Reuse Check": { present, rows: [{ raw, none, piece, family, rung, why }] }. */
export function parseReuseCheck(planText) {
  const body = sectionBody(planText, 'Reuse Check')
  if (body === null) return { present: false, rows: [] }
  const rows = []
  let header = null
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('|')) {
      const c = cells(line)
      if (c.every((x) => /^:?-{2,}:?$/.test(x))) continue
      if (!header && c.some((x) => /^rung$/i.test(x))) {
        header = c.map((x) => x.toLowerCase())
        continue
      }
      const col = (name) => {
        const idx = header ? header.findIndex((h) => h.includes(name)) : -1
        return idx >= 0 ? (c[idx] || '') : ''
      }
      const piece = header ? col('piece') || c[0] : c[0]
      if (/^none\b/i.test(piece)) { rows.push({ raw: line, none: true, piece: 'none', family: '', rung: null, why: c.slice(1).join(' ') }); continue }
      const rungText = header ? col('rung') : ''
      rows.push({ raw: line, none: false, piece, family: header ? col('family') : '', rung: /^[1-4]$/.test(rungText) ? Number(rungText) : null, why: header ? col('why') || col('justification') : '' })
      continue
    }
    const b = line.match(/^[-*]\s+(.*)$/)
    if (!b) continue
    const text = b[1]
    if (/^none\b/i.test(text)) {
      rows.push({ raw: line, none: true, piece: 'none', family: '', rung: null, why: text.replace(/^none\s*[—·:-]?\s*/i, '').trim() })
      continue
    }
    const rungText = field(text, 'rung')
    rows.push({
      raw: line,
      none: false,
      piece: text.split(/\s[—·|]\s|\bfamily\s*:/i)[0].trim(),
      family: field(text, 'family'),
      rung: /^[1-4]$/.test(rungText) ? Number(rungText) : null,
      why: ((text.match(/\b(?:why|justification)\s*:\s*(.*)$/i) || [])[1] || '').trim()
    })
  }
  return { present: true, rows }
}

const PLACEHOLDER_RE = /^\[.*\]$|^<.*>$|^$/

/** The --reuse --plan gate. Returns { ok, lines }. */
export function checkPlanReuse({ planPath, planText, registry }) {
  const section = parseReuseCheck(planText)
  const num = planNumber(planPath)
  const enforcedFrom = registry ? registry.enforcedFrom : null
  if (!section.present && num !== null && enforcedFrom !== null && num < enforcedFrom) {
    return { ok: true, lines: ['REUSE: skipped (grandfathered)'] }
  }
  if (!section.present) {
    return { ok: false, lines: ['REUSE: missing section "## Reuse Check" (one line per new piece: "- <piece> — family: <id|none> — rung: <1-4> — why: <…>", or "- none — <why>")'] }
  }
  if (!section.rows.length) return { ok: false, lines: ['REUSE: empty section "## Reuse Check" — list each new piece, or "- none — <why>"'] }

  const known = new Set((registry ? registry.families : []).map((f) => f.id))
  const problems = []
  for (const r of section.rows) {
    if (r.none) {
      if (PLACEHOLDER_RE.test(r.why)) problems.push(`REUSE: none-without-why — say why the plan creates no new piece: ${r.raw}`)
      continue
    }
    if (r.rung === null) { problems.push(`REUSE: unreadable row — needs "rung: 1-4": ${r.raw}`); continue }
    if (PLACEHOLDER_RE.test(r.piece)) problems.push(`REUSE: unnamed piece: ${r.raw}`)
    if (r.rung === 4) {
      if (PLACEHOLDER_RE.test(r.why)) problems.push(`REUSE: rung-4 without justification — a new family needs "why: <one line>": ${r.raw}`)
      continue
    }
    const family = r.family.replace(/`/g, '').trim()
    if (PLACEHOLDER_RE.test(family) || /^none$/i.test(family)) problems.push(`REUSE: rung ${r.rung} needs the registry family it reuses ("family: <id>"): ${r.raw}`)
    else if (known.size && !known.has(family)) problems.push(`REUSE: unknown family "${family}" — not a ### heading in ${REGISTRY_PATH}: ${r.raw}`)
  }
  if (problems.length) return { ok: false, lines: problems }
  const summary = section.rows.map((r) => (r.none ? 'none' : `${r.piece} (rung ${r.rung})`)).join(', ')
  return { ok: true, lines: [`REUSE: ok ${summary}`] }
}

/** Read the registry from disk, or null when it is missing. --registry=<path> overrides it (tests). */
export function readRegistryFile(repoRoot, override) {
  const path = String(override || REGISTRY_PATH).replace(/\\/g, '/')
  const abs = isAbsolute(path) ? path : join(repoRoot, path)
  if (!existsSync(abs)) return null
  return parseRegistry(readFileSync(abs, 'utf8'))
}

/** CLI entry for `scope-check.mjs --reuse --plan=<p> [--registry=<path>]`. Prints, returns the exit code. */
export function runReuseCheck({ args, repoRoot }) {
  if (!args.plan || args.plan === true) {
    console.error('SCOPE_CHECK: --reuse needs --plan=<path>')
    return 1
  }
  const planPath = String(args.plan).replace(/\\/g, '/')
  const planAbs = isAbsolute(planPath) ? planPath : join(repoRoot, planPath)
  if (!existsSync(planAbs)) {
    console.error(`SCOPE_CHECK: plan not found: ${planPath}`)
    return 1
  }
  const registry = readRegistryFile(repoRoot, args.registry)
  if (!registry && args.registry) {
    console.error(`SCOPE_CHECK: reuse registry not found: ${args.registry}`)
    return 1
  }
  const { ok, lines } = checkPlanReuse({ planPath, planText: readFileSync(planAbs, 'utf8'), registry })
  for (const l of lines) (ok ? console.log : console.error)(l)
  return ok ? 0 : 1
}
