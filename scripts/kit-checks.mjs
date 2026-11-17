/**
 * The diff checks: every check under scripts/lib/checks/ on what the branch adds, then the debt ratchet.
 *
 *   node scripts/kit-checks.mjs [--base <ref>] [--plan <path>] [--config <json file>] [--json]
 *
 * --base     the ref the branch is compared with (default origin/<git.mainBranch>); the diff is the working tree against
 *            the merge base, plus untracked files (scripts/lib/diff-items.mjs)
 * --plan     the plan the branch builds; checks that compare the diff with a plan section skip without it (CI)
 * --config   a JSON object whose keys go on top of the rendered settings (tests, one-off runs)
 * Output, plain English, one finding per line:
 *   KIT_CHECK: <rule> <file>:<line> — <what to use instead>
 *   KIT_DEBT: <kind> <old> → <new> — new in <files>
 *   KIT_CHECKS: ok (<n> checks) | fail (<f> findings, <r> debt kinds raised)
 * Exit 0 = nothing found and no debt rose; 1 = a finding, a raised count or a check that failed; 2 = bad usage or base.
 *
 * Run by: the orchestrator's per-plan gate (the main folder's copy, scripts/lib/plan-gate.mjs), /ship on every lane
 * (scripts/ship-prep.mjs) and the project's CI job `kit-checks`. The checks load from this script's own folder, so a
 * builder that edits its branch's copy cannot pass the plan gate with it. A check module is shaped as
 * scripts/lib/checks/README.md says.
 */
import { readdirSync, readFileSync, existsSync, realpathSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { addedItems } from './lib/diff-items.mjs'
import { normalizeCounts, readBaseline, compare } from './lib/debt-baseline.mjs'

/** The project settings the checks read, rendered from kit.config.json. Later plans add keys. */
export const CHECKS_CONFIG = {
  mainBranch: "main" || 'main',
  debtBaseline: "_shared/debt-baseline.json" || 'docs/project/debt-baseline.json',
  kinds: {},
  stylesheets: [],
  tokenPrefixes: [],
  enginePrefix: '',
}

export const CHECKS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'lib', 'checks')

/** Every check module, sorted by file name: [{ id, run?, counts?, file }]. A module without an id throws naming it. */
export async function loadChecks(dir = CHECKS_DIR) {
  if (!existsSync(dir)) return []
  const out = []
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mjs')).sort()) {
    const mod = await import(pathToFileURL(join(dir, f)).href)
    const check = mod.default ?? mod
    if (!check || typeof check.id !== 'string' || !check.id) throw new Error(`scripts/lib/checks/${f} exports no check id`)
    if (typeof check.run !== 'function' && typeof check.counts !== 'function') throw new Error(`check ${check.id} (${f}) has neither run() nor counts()`)
    out.push({ id: check.id, run: check.run, counts: check.counts, file: f })
  }
  return out
}

/** The rendered settings, with the keys of a `--config <file>` JSON object on top. */
export function loadConfig(root, file = null) {
  if (!file) return { ...CHECKS_CONFIG }
  return { ...CHECKS_CONFIG, ...JSON.parse(readFileSync(join(root, file), 'utf8')) }
}

/** The normalized debt counts of every check's counts(ctx); a throwing counter throws naming its check. */
export async function collectCounts(checks, ctx) {
  const parts = []
  for (const c of checks) {
    if (typeof c.counts !== 'function') continue
    try {
      parts.push(await c.counts(ctx))
    } catch (e) {
      throw new Error(`check ${c.id}: counts() failed: ${e.message}`)
    }
  }
  return normalizeCounts(...parts)
}

function parseArgs(argv) {
  const o = { base: null, plan: null, config: null, json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const val = () => {
      const v = argv[++i]
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`)
      return v
    }
    if (a === '--base') o.base = val()
    else if (a.startsWith('--base=')) o.base = a.slice(7)
    else if (a === '--plan') o.plan = val()
    else if (a.startsWith('--plan=')) o.plan = a.slice(7)
    else if (a === '--config') o.config = val()
    else if (a === '--json') o.json = true
    else throw new Error(`unknown argument ${a}`)
  }
  return o
}

export async function main(argv = process.argv.slice(2), root = process.cwd(), print = (l) => console.log(l)) {
  let o
  try {
    o = parseArgs(argv)
  } catch (e) {
    print(`KIT_CHECKS: refused — ${e.message}`)
    print('usage: node scripts/kit-checks.mjs [--base <ref>] [--plan <path>] [--config <json file>] [--json]')
    return 2
  }
  const config = loadConfig(root, o.config)
  const base = o.base ?? `origin/${config.mainBranch}`
  let items
  try {
    items = addedItems({ root, base, kinds: config.kinds, stylesheets: config.stylesheets, tokenPrefixes: config.tokenPrefixes, enginePrefix: config.enginePrefix })
  } catch (e) {
    print(`KIT_CHECKS: refused — ${e.message}`)
    return 2
  }
  const planText = o.plan && existsSync(join(root, o.plan)) ? readFileSync(join(root, o.plan), 'utf8') : null
  if (o.plan && planText === null) print(`KIT_CHECKS: note — plan ${o.plan} not found; checks that read the plan skip`)
  const ctx = { root, base, plan: o.plan, planText, items, config, note: (t) => print(`KIT_CHECKS: note — ${t}`) }
  const findings = []
  const errors = []
  let checks = []
  try {
    checks = await loadChecks()
  } catch (e) {
    errors.push(e.message)
  }
  for (const c of checks) {
    if (typeof c.run !== 'function') continue
    try {
      for (const f of (await c.run(ctx)) ?? []) findings.push({ rule: f.rule ?? c.id, file: f.file, line: f.line ?? 1, hint: f.hint ?? '' })
    } catch (e) {
      errors.push(`check ${c.id}: ${e.message}`)
    }
  }
  let raised = []
  try {
    const current = await collectCounts(checks, ctx)
    raised = compare(current, readBaseline(root, config.debtBaseline)).raised
  } catch (e) {
    errors.push(e.message)
  }
  for (const f of findings) print(`KIT_CHECK: ${f.rule} ${f.file}:${f.line} — ${f.hint}`)
  for (const r of raised) print(`KIT_DEBT: ${r.kind} ${r.old} → ${r.now} — new in ${r.files.join(', ') || '(no single file)'}; reuse the existing piece or remove the copy`)
  for (const e of errors) print(`KIT_CHECK: error — ${e}`)
  const ok = !findings.length && !raised.length && !errors.length
  print(ok ? `KIT_CHECKS: ok (${checks.length} checks)` : `KIT_CHECKS: fail (${findings.length} findings, ${raised.length} debt kinds raised${errors.length ? `, ${errors.length} errors` : ''})`)
  if (o.json) print(`KIT_CHECKS_JSON ${JSON.stringify({ ok, checks: checks.map((c) => c.id), findings, raised, errors })}`)
  return ok ? 0 : 1
}

/** True when `metaUrl`'s file is the script node was started with (so importing a CLI never runs it). */
export function isEntry(metaUrl) {
  if (!process.argv[1]) return false
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(process.argv[1])
  } catch {
    return false
  }
}

if (isEntry(import.meta.url)) process.exitCode = await main()
