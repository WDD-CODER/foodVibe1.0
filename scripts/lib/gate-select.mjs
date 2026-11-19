/**
 * Which slow suites a gate runs (docs/agent/orchestrator.md "What a gate runs"). No model is involved.
 *
 *   import { selectGate, cacheKey } from './lib/gate-select.mjs'
 *   const { run, skipped, lines, keys } = selectGate({ commands, changed, ownCommands, testScript, cache, root })
 *
 * `commands` are orchestrator.ciMirror entries: a string (always runs) or `{ command, touches: [globs] }` (runs when a
 * changed file matches a glob). Every skip, `once` and `cached` decision is one `GATE:` line; nothing is skipped silently.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import picomatch from 'picomatch'

/** A diff that touches one of these selects every suite: the settings and the dependencies every suite reads. */
export const ALL_SELECT_FILES = ['kit.config.json', '.kit/config.json', 'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']
const SKIP_DIRS = new Set(['.git', 'node_modules', '.claude'])
const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '')

/** { command, touches } of a ciMirror entry (touches null for a plain string), or null for a shape that is neither. */
export function entryOf(e) {
  if (typeof e === 'string') return e.trim() ? { command: e.trim(), touches: null } : null
  if (e && typeof e === 'object' && typeof e.command === 'string' && e.command.trim()) {
    const t = Array.isArray(e.touches) ? e.touches.filter((g) => typeof g === 'string' && g.trim()).map((g) => norm(g.trim())) : []
    return { command: e.command.trim(), touches: t.length ? t : null }
  }
  return null
}

/** Every file under `root` (posix paths, relative) a glob list matches. */
export function matchedFiles(root, touches) {
  const m = picomatch(touches.map(norm), { dot: true })
  const out = []
  const walk = (rel) => {
    let names = []
    try { names = readdirSync(join(root, rel), { withFileTypes: true }) } catch { return }
    for (const d of names) {
      const p = rel ? `${rel}/${d.name}` : d.name
      if (d.isDirectory()) { if (!SKIP_DIRS.has(d.name)) walk(p) } else if (m(p)) out.push(p)
    }
  }
  walk('')
  return out.sort()
}

/** The command plus a hash of the content of every file its globs match (line endings ignored, so Windows and POSIX agree). */
export function cacheKey(command, touches, root) {
  const h = createHash('sha1')
  for (const f of matchedFiles(root, touches)) {
    h.update(`${f}\0`)
    h.update(String(readFileSync(join(root, f), 'utf8')).replace(/\r\n/g, '\n'))
    h.update('\0')
  }
  return `${command} @ ${h.digest('hex')}`
}

/** True when `testScript` (the body of the project's test script) already runs `command`. */
export function runsInside(command, testScript) {
  const parts = String(testScript ?? '').split(/&&|;|\|\|/).map((s) => s.trim().replace(/\s+/g, ' '))
  return parts.includes(String(command).trim().replace(/\s+/g, ' '))
}

/**
 * { run, skipped, lines, keys }: `run` = the commands to run (in order), `skipped` = those left out, `lines` = one `GATE:`
 * line per decision, `keys` = { command: cache key } of the commands that run (to record on a pass). `own` commands (the
 * plan's [auto] items) always run; `cache` = { key: plan } of earlier passes in this run. `suites` are
 * orchestrator.suiteTouches entries ({ command, touches }); `testCommand` is the gate's test script and `planOwn` the
 * plan's own [auto] commands, the only commands a suite entry applies to.
 */
export function selectGate({ commands = [], changed = [], ownCommands = [], testScript = '', cache = {}, root = null, suites = [], testCommand = '', planOwn = [] } = {}) {
  const files = (Array.isArray(changed) ? changed : []).map(norm)
  const own = new Set((ownCommands ?? []).map((c) => String(c).trim()))
  const everything = files.some((f) => ALL_SELECT_FILES.includes(f))
  // A test script that suiteTouches skips runs nothing: a suite it would have run (`once`) then runs on its own.
  const testEntry = String(testCommand).trim() && !(planOwn ?? []).map((c) => String(c).trim()).includes(String(testCommand).trim())
    ? (Array.isArray(suites) ? suites : []).map(entryOf).find((x) => x?.touches && x.command === String(testCommand).trim())
    : null
  const testSkipped = Boolean(testEntry) && !everything && !files.some((f) => picomatch(testEntry.touches, { dot: true })(f))
  const out = { run: [], skipped: [], lines: [], keys: {} }
  for (const e of (Array.isArray(commands) ? commands : []).map(entryOf).filter(Boolean)) {
    const { command, touches } = e
    if (own.has(command)) { out.run.push(command); continue }
    if (!testSkipped && runsInside(command, testScript)) {
      out.skipped.push(command)
      out.lines.push(`GATE: once ${command} — runs inside npm run test`)
      continue
    }
    if (!touches || everything) { out.run.push(command); continue }
    const hit = picomatch(touches, { dot: true })
    if (!files.some((f) => hit(f))) {
      out.skipped.push(command)
      out.lines.push(`GATE: skip ${command} — no change under ${touches.join(', ')}`)
      continue
    }
    if (root) {
      const key = cacheKey(command, touches, root)
      const plan = cache?.[key]
      if (plan) {
        out.skipped.push(command)
        out.lines.push(`GATE: cached ${command} — passed on the same files in plan ${plan}`)
        continue
      }
      out.keys[command] = key
    }
    out.run.push(command)
  }
  // orchestrator.suiteTouches: the test script and the plan's own [auto] commands with globs. They are in the gate list
  // already, so a decision here only adds them to `skipped` (with its line) or records their cache key. The test script
  // is skipped when no changed file matches; a plan-own command is never skipped by globs (its Done-when must pass once
  // on this plan's code), only reused from a pass on the same files. A settings or dependency change runs both.
  const owned = new Set((planOwn ?? []).map((c) => String(c).trim()))
  for (const e of (Array.isArray(suites) ? suites : []).map(entryOf).filter((x) => x?.touches)) {
    const { command, touches } = e
    const isOwn = owned.has(command)
    if ((!isOwn && command !== String(testCommand).trim()) || everything) continue
    if (!isOwn && !files.some((f) => picomatch(touches, { dot: true })(f))) {
      out.skipped.push(command)
      out.lines.push(`GATE: skip ${command} — no change under ${touches.join(', ')}`)
      continue
    }
    if (!root) continue
    const key = cacheKey(command, touches, root)
    if (cache?.[key]) {
      out.skipped.push(command)
      out.lines.push(`GATE: cached ${command} — passed on the same files in plan ${cache[key]}`)
      continue
    }
    out.keys[command] = key
  }
  return out
}

/** The run's cache: { key: plan } in `file` (.claude/orchestrator-runs/<run>/gate-cache.json); {} when absent or unreadable. */
export function readCache(file) {
  try { const j = JSON.parse(readFileSync(file, 'utf8')); return j && typeof j === 'object' && !Array.isArray(j) ? j : {} } catch { return {} }
}
/** Record the passes: `keys` = { command: key }, `passed` = the commands that passed, `plan` = who ran them. */
export function writeCache(file, { keys = {}, passed = [], plan }) {
  const now = readCache(file)
  for (const c of passed) if (keys[c]) now[keys[c]] = String(plan)
  try {
    if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, `${JSON.stringify(now, null, 2)}\n`)
  } catch { /* a cache that cannot be written only costs a rerun */ }
  return now
}
export const cacheFileOf = (root, run) => join(root, '.claude', 'orchestrator-runs', run, 'gate-cache.json')
