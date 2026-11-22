/**
 * The plan "## Adopt Check" gate: `node scripts/scope-check.mjs --adopt --plan=<p>`.
 *
 * It triggers when the plan has a "## Reuse Check" row at rung 4 (a new family), or a package.json in its Read-Write
 * Scope (a possible new dependency). Plan section — one row per triggering capability (bullets or a table):
 *   ## Adopt Check
 *   - <capability> — candidate: <pkg> — considered: <pkg>, <pkg> — verdict: adopt | wrap | build — license: <spdx> — why: <one line>
 *   - <capability> — verdict: skip — why: <one line>       (domain logic; no search is run)
 *   - none — why: <one line>                               (no rung-4 row and no new dependency)
 * A GPL / AGPL / unknown `license:` on an adopt or wrap row also needs `license-ok: Human YYYY-MM-DD`.
 * The procedure behind the rows (known-good lists, one search round, facts by adopt-facts.mjs): docs/agent/adopt-check.md.
 *
 * Output: ADOPT: ok | missing | bad | skipped (grandfathered), one line per problem, exit 1 on missing or bad.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { sectionRows } from './plan-sections.mjs'
import { planNumber } from './invariants.mjs'
import { extractScopeGlobs } from './plan-scope.mjs'
import { REUSE_COLUMNS, nameTokens } from './reuse-check.mjs'

export const ADOPT_ENFORCED_FROM = 151
export const ADOPT_COLUMNS = ['capability', 'candidate', 'considered', 'verdict', 'license', 'license-ok', 'why']
const VERDICTS = new Set(['adopt', 'wrap', 'build', 'skip'])
const EMPTY_RE = /^\[.*\]$|^<.*>$|^$/
/** A licence an adopt or wrap verdict may use only with the Human's `license-ok:` (shared with adopt-facts.mjs). */
export const COPYLEFT_RE = /^(?:unknown|unlicensed|none|see license in .*|.*\bA?GPL\b.*)$/i
const plain = (s) => String(s).replace(/`/g, '').trim()

/** The rung-4 piece names of the plan's Reuse Check. */
export function rung4Pieces(planText) {
  return sectionRows(planText, 'Reuse Check', REUSE_COLUMNS).rows.filter((r) => !r.none && r.rung === '4').map((r) => plain(r.piece))
}

/** The Read-Write Scope lines that write a package.json. */
export function packageJsonScope(planText) {
  return (extractScopeGlobs(planText) || []).filter((g) => /(^|\/)package\.json$/.test(g.trim()))
}

/** True when an Adopt Check row's capability names the rung-4 piece (same text, or a shared word). */
function covers(capability, piece) {
  const a = plain(capability).toLowerCase()
  const b = piece.toLowerCase()
  if (a === b || a.includes(b) || b.includes(a)) return Boolean(a)
  const mine = new Set(nameTokens(piece))
  return nameTokens(capability).some((t) => mine.has(t))
}

/** The problems of one non-none row (empty when the row is complete). */
function rowProblems(r) {
  const name = plain(r.capability) || '(unnamed)'
  const verdict = plain(r.verdict).toLowerCase()
  const out = []
  if (EMPTY_RE.test(plain(r.capability))) out.push(`ADOPT: bad unnamed capability — "- <capability> — … — why: …"`)
  if (EMPTY_RE.test(verdict)) out.push(`ADOPT: bad no verdict — "verdict: adopt | wrap | build | skip": ${name}`)
  else if (!VERDICTS.has(verdict)) out.push(`ADOPT: bad verdict "${plain(r.verdict)}" — adopt | wrap | build | skip: ${name}`)
  if (verdict !== 'skip' && VERDICTS.has(verdict) && EMPTY_RE.test(plain(r.candidate))) out.push(`ADOPT: bad no candidate — "candidate: <package>" (the one picked or compared): ${name}`)
  const considered = plain(r.considered).split(/\s*,\s*/).filter(Boolean)
  if (considered.length > 2) out.push(`ADOPT: bad considered lists ${considered.length} — at most 3 candidates in all (candidate + 2 considered): ${name}`)
  if (EMPTY_RE.test(plain(r.why))) out.push(`ADOPT: bad no why — "why: <one line>": ${name}`)
  // A table has its own license-ok column; in a bullet `license-ok:` (a hyphen) stays inside the license value.
  const [license, inlineOk = ''] = plain(r.license).split(/\s+—\s+license-ok\s*:\s*/i)
  const licenseOk = plain(r['license-ok']) || inlineOk
  const adopting = verdict === 'adopt' || verdict === 'wrap'
  if (adopting && EMPTY_RE.test(license)) out.push(`ADOPT: bad no licence — "license: <spdx>" from node scripts/adopt-facts.mjs: ${name}`)
  else if (adopting && COPYLEFT_RE.test(license) && !/^Human \d{4}-\d{2}-\d{2}/.test(licenseOk)) {
    out.push(`ADOPT: bad licence ${license} needs the Human's "license-ok: Human YYYY-MM-DD" on the row: ${name}`)
  }
  return out
}

/** The gate. Returns { ok, lines }. */
export function checkPlanAdopt({ planPath, planText }) {
  const section = sectionRows(planText, 'Adopt Check', ADOPT_COLUMNS)
  const pieces = rung4Pieces(planText)
  const pkgs = packageJsonScope(planText)
  const num = planNumber(planPath)
  if (!section.present && num !== null && num < ADOPT_ENFORCED_FROM) return { ok: true, lines: ['ADOPT: skipped (grandfathered)'] }
  if (!section.present && !pieces.length && !pkgs.length) return { ok: true, lines: ['ADOPT: ok none (no rung-4 row, no package.json in scope)'] }

  const problems = section.errors.map((e) => `ADOPT: bad ${e}`)
  const rows = section.rows.filter((r) => !r.none)
  const noneRows = section.rows.filter((r) => r.none)
  for (const r of rows) problems.push(...rowProblems(r))
  for (const n of noneRows) if (EMPTY_RE.test(plain(n.why).replace(/^why\s*:\s*/i, ''))) problems.push('ADOPT: bad none-without-why — "- none — why: <one line>"')
  for (const p of pieces) {
    if (!rows.some((r) => covers(r.capability, p))) problems.push(`ADOPT: missing row for the rung-4 piece "${p}" — "- ${p} — candidate: … — verdict: … — why: …" or "- ${p} — verdict: skip — why: …"`)
  }
  if (pkgs.length && !rows.length && !noneRows.length) problems.push(`ADOPT: missing section rows for ${pkgs.join(', ')} in scope — one row per new package, or "- none — why: <no new package>"`)

  if (problems.length) return { ok: false, lines: problems }
  const summary = rows.length
    ? rows.map((r) => `${plain(r.capability)} (${plain(r.verdict).toLowerCase()}${plain(r.candidate) ? ` ${plain(r.candidate)}` : ''})`).join(', ')
    : 'none'
  return { ok: true, lines: [`ADOPT: ok ${summary}`] }
}

/** CLI entry for `scope-check.mjs --adopt --plan=<p>`. Prints, returns the exit code. */
export function runAdoptCheck({ args, repoRoot }) {
  if (!args.plan || args.plan === true) {
    console.error('SCOPE_CHECK: --adopt needs --plan=<path>')
    return 1
  }
  const planPath = String(args.plan).replace(/\\/g, '/')
  const planAbs = isAbsolute(planPath) ? planPath : join(repoRoot, planPath)
  if (!existsSync(planAbs)) {
    console.error(`SCOPE_CHECK: plan not found: ${planPath}`)
    return 1
  }
  const { ok, lines } = checkPlanAdopt({ planPath, planText: readFileSync(planAbs, 'utf8') })
  for (const l of lines) (ok ? console.log : console.error)(l)
  return ok ? 0 : 1
}
