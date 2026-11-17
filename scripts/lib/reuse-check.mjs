/**
 * The plan "## Reuse Check" gate: `node scripts/scope-check.mjs --reuse --plan=<p> [--diff=<base>] [--registry=<path>]`.
 *
 * Plan section — one row per new piece the plan creates (bullets, or a table with the columns Piece, Family, Rung, Why):
 *   ## Reuse Check
 *   - <new piece> — family: <family-id | none> — rung: <1-4> — why: <one line; required for rung 4>
 *   - none — <why this plan creates no new shared piece>
 * Rungs: 1 use as is · 2 use with existing inputs · 3 extend the family · 4 new family (needs a why).
 *
 * Output: REUSE: ok | missing | bad | skipped (…), one line per problem, exit 1 on missing or bad.
 * A plan numbered below the registry's "Reuse enforced from plan:" without the section is grandfathered (skipped);
 * a plan that has the section is always checked. With --diff, a plan without the section passes when the only .ts / .html
 * line the branch adds is one import of a piece the registry lists (the one-import override).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { sectionRows } from './plan-sections.mjs'
import { planNumber } from './invariants.mjs'
import { readRegistryFile, REGISTRY_PATH } from './registry.mjs'
import { addedItems } from './diff-items.mjs'

export const REUSE_COLUMNS = ['piece', 'family', 'rung', 'why']
const PLACEHOLDER_RE = /^\[.*\]$|^<.*>$|^$/

/** True when the added lines are one import of a registry-listed piece (the only .ts / .html change). */
export function oneImportOverride(items, registry) {
  if (!registry) return false
  const lines = items.lines.filter((l) => /\.(ts|html)$/.test(l.file) && l.text.trim() !== '')
  if (lines.length !== 1) return false
  const m = lines[0].text.match(/^\s*import\b[^'"]*['"]([^'"]+)['"]/)
  if (!m) return false
  const stem = m[1].replace(/\\/g, '/').split('/').filter(Boolean).pop().replace(/\.[a-z]+$/i, '')
  if (!stem || stem === '.' || stem === '..') return false
  return registry.paths.some((p) => p.path.split('/').some((seg) => seg.replace(/\.[a-z]+$/i, '') === stem))
}

/** The gate. Returns { ok, lines }. `oneImport` is the override verdict (computed by the caller from the diff). */
export function checkPlanReuse({ planPath, planText, registry, oneImport = false }) {
  const section = sectionRows(planText, 'Reuse Check', REUSE_COLUMNS)
  const num = planNumber(planPath)
  const enforcedFrom = registry ? registry.enforcedFrom : null
  if (!section.present && num !== null && enforcedFrom !== null && num < enforcedFrom) return { ok: true, lines: ['REUSE: skipped (grandfathered)'] }
  if (!section.present && oneImport) return { ok: true, lines: ['REUSE: ok (one import of an existing shared piece)'] }
  if (!section.present) {
    return { ok: false, lines: ['REUSE: missing section "## Reuse Check" (one line per new piece: "- <piece> — family: <id|none> — rung: <1-4> — why: <…>", or "- none — <why>")'] }
  }
  const problems = section.errors.map((e) => `REUSE: ${e}`)
  if (!section.rows.length && !problems.length) return { ok: false, lines: ['REUSE: empty section "## Reuse Check" — list each new piece, or "- none — <why>"'] }
  const known = new Set((registry ? registry.families : []).map((f) => f.id))
  for (const r of section.rows) {
    if (r.none) {
      if (PLACEHOLDER_RE.test(r.why)) problems.push('REUSE: none-without-why — say why the plan creates no new piece')
      continue
    }
    if (!/^[1-4]$/.test(r.rung)) { problems.push(`REUSE: unreadable row — needs "rung: 1-4": ${r.piece}`); continue }
    const rung = Number(r.rung)
    if (PLACEHOLDER_RE.test(r.piece)) problems.push(`REUSE: unnamed piece (rung ${rung})`)
    if (rung === 4) {
      if (PLACEHOLDER_RE.test(r.why)) problems.push(`REUSE: rung-4 without justification — a new family needs "why: <one line>": ${r.piece}`)
      continue
    }
    const family = r.family.replace(/`/g, '').trim()
    if (PLACEHOLDER_RE.test(family) || /^none$/i.test(family)) problems.push(`REUSE: rung ${rung} needs the registry family it reuses ("family: <id>"): ${r.piece}`)
    else if (registry && !known.has(family)) problems.push(`REUSE: unknown family "${family}" — not a ### heading in ${REGISTRY_PATH}: ${r.piece}`)
  }
  if (problems.length) return { ok: false, lines: problems }
  const summary = section.rows.map((r) => (r.none ? 'none' : `${r.piece} (rung ${r.rung})`)).join(', ')
  return { ok: true, lines: [`REUSE: ok ${summary}`] }
}

/** CLI entry for `scope-check.mjs --reuse --plan=<p> [--diff=<base>] [--registry=<path>]`. Prints, returns the exit code. */
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
  const planText = readFileSync(planAbs, 'utf8')
  let oneImport = false
  if (args.diff && args.diff !== true && !/^## Reuse Check/m.test(planText)) {
    try {
      oneImport = oneImportOverride(addedItems({ root: repoRoot, base: String(args.diff) }), registry)
    } catch {
      oneImport = false
    }
  }
  const { ok, lines } = checkPlanReuse({ planPath, planText, registry, oneImport })
  for (const l of lines) (ok ? console.log : console.error)(l)
  return ok ? 0 : 1
}

// ---- What a diff adds is matched with the plan's rows, and the nearest existing piece is named ----

/** The lower-case word tokens of a name (`BadgeTitle`, `badge-title`, `badge_title.component.ts` → badge, title, …). */
export function nameTokens(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1)
}

export const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`)

/** True when a `## Reuse Check` row's piece text names `word` (a file stem, a selector or a token) as a whole word. */
export function pieceNames(piece, word) {
  const w = String(word).replace(/^\./, '')
  if (!w) return false
  return new RegExp(`(^|[^\\w-])\\.?${escapeRe(w)}(?![\\w-])`, 'i').test(String(piece))
}

/** True when any row (not a `none` row) names `word`. */
export function rowsName(rows, word) {
  return rows.some((r) => !r.none && pieceNames(r.piece, word))
}

/**
 * The candidate with the most name tokens in common with `name`: [{ label, tokens }] → label, or null when none
 * shares a token. A tie keeps the earlier candidate (the caller lists registry families first).
 */
export function nearest(name, candidates) {
  const mine = new Set(nameTokens(name))
  let best = null
  let bestN = 0
  for (const c of candidates) {
    let n = 0
    for (const t of c.tokens) if (mine.has(t)) n++
    if (n > bestN) {
      best = c.label
      bestN = n
    }
  }
  return best
}
