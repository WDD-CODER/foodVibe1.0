/**
 * Local CI fallback (docs/agent/local-ci.md) — when GitHub Actions has no budget left, run a PR's checks on this PC and
 * post the result to the PR as the `local-ci` commit status (statuses cost no Actions minutes); after a merge, close the
 * finished plans the todo-sync workflow could not.
 *
 *   node scripts/local-ci.mjs --pr <n> [--force] [--dry-run] [--timeout-min <m>]
 *   node scripts/local-ci.mjs --release [--dry-run] [--timeout-min <m>]   every check on origin/<main>, before a release
 *   node scripts/local-ci.mjs --close-plans [--sha <sha>] [--force] [--dry-run]
 *   node scripts/local-ci.mjs --use local|github|auto     the switch: move this repo's CI to this PC, or back
 *   node scripts/local-ci.mjs --which                     which one it is now
 *
 * --use local turns off every workflow under .github/workflows/ on GitHub (`gh workflow disable`: no Actions minute is
 * used), --use github (or auto) turns the same ones on again. The state lives on GitHub, so every clone sees it. With CI
 * switched here, --pr and --close-plans always run (no budget check), and /ship and /orchestrate run --pr on every PR.
 *
 * --pr: this folder must be on the PR's head commit with no tracked change (the receipt names that commit). It runs only
 * when a job of the PR never started for budget, or CI is switched here (`--force` runs anyway); a real failure stops it. The commands: the
 * project checks (build, lint, test, the manifest check, kit-checks against origin/<main>, orchestrator.ciMirror), every
 * one-line step of the repo's pull-request workflows this runner can start (a step in a subfolder runs there), and the
 * secret scan of the PR's changed files. Every step it cannot run is printed as `LOCAL_CI: not run here — …`. One
 * failure posts `failure`; all passing posts `success` and writes `<git common dir>/kit-local-ci/<sha>.json`, which the merge guard
 * reads (scripts/lib/merge-guard.mjs). The commands listed in `ci.releaseOnly` are left to --release; a release-only
 * `node --test <glob>` gives way to the tests the PR touches. A command that already passed here on exactly the PR's tree
 * (the ship gate's record, an orchestrator run's plan or final gate) is not run again: `reused — …`.
 * --release: the whole list (release-only included, nothing reused) on origin/<main>; one step may take 90 minutes.
 * --close-plans: when the todo-sync run of origin/<main>'s head never started for budget (`--force`: whatever it did),
 * runs the workflow's steps in a temporary worktree and pushes the result to <main> (a plans-only change, the Planner's
 * admin write); a refused push opens a PR instead.
 *
 * Exit: 0 pass or nothing to do · 1 a check failed · 2 refused (usage, wrong folder, a real CI failure, gh error).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir, hostname, freemem, setPriority, constants as osConstants } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from './lib/proc.mjs'
import { gateCommands, commandArgv, runCommand, treeOf, sameTreeSplit } from './lib/plan-gate.mjs'
import { runsInside } from './lib/gate-select.mjs'
import { holdHeavyLock } from './lib/heavy-lock.mjs'
import { PATTERNS } from './pre-commit-secret-scan.mjs'
import { workflowCommands, prTriggered, prHead, commitBudget, receiptPath, repoWorkflows, ciMode, STATUS_CONTEXT, treePassSources, globFiles, focusedTests, nodeTestGlobs } from './lib/local-ci.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MAIN = 'main'
const PM = "pnpm" === 'pnpm' ? 'pnpm' : 'npm'
const COMMANDS = { build: "build", lint: "lint", test: "test:ci", testCi: "" }
const CI_MIRROR = ["node scripts/override-check.mjs","pnpm run lint:icons","pnpm run lint:no-native-select","node scripts/plan-ledger-check.mjs","node scripts/breadcrumbs-check.mjs","node scripts/ci-scope-check.mjs --checkout-branch"]
// ci.releaseOnly: checks a PR run leaves to the release run (--release). Empty (every project's default) = a PR runs all.
const RELEASE_ONLY = []
const SECRET_SCAN = 'secret scan (local) of the changed files'
// One step's limit: a large test suite can take over 30 minutes on a busy PC.
export const DEFAULT_TIMEOUT_MIN = 90
const say = (l) => console.log(`LOCAL_CI: ${l}`)

function args(argv) {
  const o = { pr: null, closePlans: false, release: false, sha: null, force: false, dryRun: false, timeoutMin: DEFAULT_TIMEOUT_MIN, use: null, which: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const val = () => { const v = argv[++i]; if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`); return v }
    if (a === '--pr') o.pr = val()
    else if (a === '--close-plans') o.closePlans = true
    else if (a === '--release') o.release = true
    else if (a === '--sha') o.sha = val()
    else if (a === '--force') o.force = true
    else if (a === '--dry-run') o.dryRun = true
    else if (a === '--timeout-min') o.timeoutMin = Number(val())
    else if (a === '--use') o.use = val()
    else if (a === '--which') o.which = true
    else throw new Error(`unknown flag ${a}`)
  }
  if (o.use !== null && !['local', 'github', 'auto'].includes(o.use)) throw new Error('--use takes local, github or auto')
  if (o.use === null && !o.which && !o.closePlans && !o.release && !/^\d+$/.test(String(o.pr ?? ''))) throw new Error('--pr <number>, --release, --close-plans, --use or --which')
  if (!(o.timeoutMin > 0)) throw new Error('--timeout-min takes a positive number')
  return o
}

const bin = process.env.KIT_GH_BIN || 'gh'
function gh(a, cwd = ROOT) {
  const [cmd, pre] = /\.m?js$/i.test(bin) ? [process.execPath, [bin]] : [bin, []]
  const r = spawnSync(cmd, [...pre, ...a], { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || (r.error ? String(r.error.message) : '') }
}
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return { status: r.status, out: String(r.stdout || '').trim(), err: String(r.stderr || '').trim() }
}

/** `npm test` / `pnpm run --if-present x` → the shape the gate runs, or null (with the reason). */
function normalise(command, cwd) {
  let c = command.replace(/\s+/g, ' ').trim()
  const t = /^(npm|pnpm) test$/.exec(c)
  if (t) c = `${t[1]} run test`
  const ip = /^(npm|pnpm) run --if-present (\S+)$/.exec(c) || /^(npm|pnpm) run (\S+) --if-present$/.exec(c)
  if (ip) {
    let scripts = {}
    try { scripts = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).scripts ?? {} } catch {}
    if (!scripts[ip[2]]) return { command: null, why: `${ip[2]} is not in package.json (--if-present)` }
    c = `${ip[1]} run ${ip[2]}`
  }
  // Node's test runner runs files side by side; a lower limit keeps a full local suite inside this PC's memory.
  if (/^node --test\b/.test(c) && !/--test-concurrency/.test(c)) c = c.replace(/^node --test/, `node --test --test-concurrency=${Number(process.env.LOCAL_CI_TEST_CONCURRENCY) || 2}`)
  return { command: c }
}

/**
 * The run list: [{ job, command, cwd }] plus the skipped steps. `tier: 'pr'` (default) leaves the `ci.releaseOnly`
 * commands to the release run (releaseSplit); `tier: 'release'` runs everything.
 */
export function localCommands(root = ROOT, { tier = 'pr', releaseOnly = RELEASE_ONLY, changed = null } = {}) {
  const manifest = existsSync(join(root, 'scripts', 'kit-manifest-check.mjs')) && existsSync(join(root, 'docs', 'workflow-kit', 'manifest.json'))
  const list = gateCommands({ pm: PM, ...COMMANDS, manifest, ciMirror: CI_MIRROR }).map((command) => ({ job: 'kit', command, cwd: root }))
  if (existsSync(join(root, 'scripts', 'kit-checks.mjs'))) list.push({ job: 'kit-checks', command: `node scripts/kit-checks.mjs --base origin/${MAIN}`, cwd: root })
  const skipped = []
  const dir = join(root, '.github', 'workflows')
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort() : []
  for (const f of files) {
    const text = readFileSync(join(dir, f), 'utf8')
    if (!prTriggered(text)) continue
    const w = workflowCommands(text, (c) => commandArgv(normalise(c, root).command ?? '') !== null)
    for (const r of w.run) {
      const n = normalise(r.command, root)
      if (n.command && !list.some((x) => x.command === n.command && x.cwd === root)) list.push({ job: `${f}/${r.job}`, command: n.command, cwd: root })
    }
    for (const s of w.skipped) {
      // A step in a subfolder (a server's tests) runs there when it is a command the runner starts.
      const cwd = s.dir ? resolve(root, s.dir) : null
      const n = s.command ? normalise(s.command, cwd ?? root) : null
      if (cwd && n?.command && commandArgv(n.command) && existsSync(cwd)) list.push({ job: `${f}/${s.job}`, command: n.command, cwd })
      else skipped.push(`${f}/${s.job} · ${s.step} — ${n?.why ?? s.why}`)
    }
  }
  list.push({ job: 'gitleaks', command: SECRET_SCAN, cwd: root })
  // A command an npm script in the list already runs (`npm run test` = install-check && …) runs once, inside it.
  let scripts = {}
  try { scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts ?? {} } catch {}
  const bodies = list.map((c) => /^(?:npm|pnpm) run (\S+)$/.exec(c.command)?.[1]).filter(Boolean).map((s) => scripts[s] ?? '')
  const once = list.filter((c) => c.cwd === root && !/^(?:npm|pnpm) run /.test(c.command) && bodies.some((b) => runsInside(c.command, b)))
  const all = list.filter((c) => !once.includes(c))
  if (tier === 'release') return { list: all, skipped, once: once.map((c) => c.command), releaseOnly: [] }
  const split = releaseSplit(all, { root, releaseOnly, changed: changed ?? changedFiles(root) })
  return { list: split.list, skipped, once: once.map((c) => c.command), releaseOnly: split.releaseOnly }
}

/** The files this branch changed against origin/<main>. */
function changedFiles(root) {
  return git(root, 'diff', '--name-only', '--no-renames', `origin/${MAIN}...HEAD`).out.split('\n').map((f) => f.trim().replace(/\\/g, '/')).filter(Boolean)
}

/**
 * A PR run's list without the `releaseOnly` commands (each named in `releaseOnly` of the result); a release-only
 * `node --test <globs>` gives way to one `node --test` of only the tests the change touches (focusedTests), or to none.
 */
export function releaseSplit(list, { root = ROOT, releaseOnly = RELEASE_ONLY, changed = [] } = {}) {
  const wanted = new Set((Array.isArray(releaseOnly) ? releaseOnly : []).map((c) => normalise(String(c), root).command).filter(Boolean))
  if (!wanted.size) return { list, releaseOnly: [] }
  const out = []
  const left = []
  for (const c of list) {
    if (!wanted.has(c.command)) { out.push(c); continue }
    left.push(c.command)
    const globs = nodeTestGlobs(c.command)
    if (!globs) continue
    const files = [...new Set(globs.flatMap((g) => globFiles(c.cwd ?? root, g)))]
    const picked = focusedTests({ changed, files, read: (p) => readFileSync(join(c.cwd ?? root, p), 'utf8') })
    if (picked.length) out.push({ job: c.job, command: normalise(`node --test ${picked.join(' ')}`, root).command, cwd: c.cwd, focused: picked.length })
  }
  return { list: out, releaseOnly: left }
}

/** The secret scan of the files the PR changed against origin/<main> (the same patterns as the pre-commit hook). */
function secretScan(root) {
  const files = git(root, 'diff', '--name-only', '--diff-filter=ACMR', `origin/${MAIN}...HEAD`).out.split('\n').map((f) => f.trim())
    .filter((f) => f && !f.endsWith('.md') && !f.includes('package-lock.json'))
  const hits = []
  for (const f of files) {
    let t
    try { t = readFileSync(join(root, f), 'utf8') } catch { continue }
    for (const { name, re } of PATTERNS) if (re.test(t)) hits.push(`${f}: ${name}`)
  }
  return hits.length ? { exit: 1, out: hits.map((h) => `secret-scan: ${h}`).join('\n') } : { exit: 0, out: `secret-scan: ok — ${files.length} file(s)` }
}

function postStatus(ghFn, repo, sha, state, description) {
  return ghFn(['api', '-X', 'POST', `repos/${repo}/statuses/${sha}`, '-f', `state=${state}`, '-f', `context=${STATUS_CONTEXT}`, '-f', `description=${description.slice(0, 139)}`])
}

/**
 * Run `list` in order, write the receipt for `head.sha` under `root`, post the `local-ci` status. Returns the exit code
 * (0 pass, 1 a command failed, 2 the status could not be posted).
 */
export async function runList(opts) {
  // Free memory first, before the queue: a CI waiting for memory never holds the heavy-job lock other gates wait for.
  await waitForMemory()
  // One heavy job on this PC at a time (lib/heavy-lock.mjs): local CI waits its turn behind another gate or CI run.
  const release = await holdHeavyLock(`local CI ${opts.pr ? `PR #${opts.pr}` : opts.tier ?? 'pr'} in ${String(opts.root ?? ROOT).split(/[\\/]/).pop()}`)
  try { return await runListCommands(opts) } finally { release() }
}

// Free memory local CI waits for before it starts (GB): below it, the PC is already busy (dev servers, a run's gate)
// and a test suite on top would push it to the floor. KIT_CI_MIN_FREE_GB overrides it; 0 turns the wait off.
export const CI_MIN_FREE_GB = 4
// The longest wait (minutes): a PC that never frees that much memory (os.freemem counts only free pages on some systems)
// still gets its CI, late rather than never.
export const CI_MEM_WAIT_MAX_MIN = 120
/**
 * Wait until free memory is at least `minGb`: re-checked every minute, one line when it starts waiting and one every
 * 10 minutes, at most CI_MEM_WAIT_MAX_MIN (then it starts anyway and says so). Off under `node --test` unless
 * KIT_CI_MIN_FREE_GB is set. Returns the minutes waited.
 */
export async function waitForMemory({ env = process.env, freeGb = () => freemem() / 1024 ** 3, say = (l) => console.log(l), sleepMs = 60_000, maxMin = CI_MEM_WAIT_MAX_MIN } = {}) {
  const set = env.KIT_CI_MIN_FREE_GB
  if (env.NODE_TEST_CONTEXT && set === undefined) return 0
  const minGb = set === undefined || set === '' ? CI_MIN_FREE_GB : Number(set)
  if (!(minGb > 0)) return 0
  let waited = 0
  let free
  while ((free = freeGb()) < minGb) {
    if (waited >= maxMin) { say(`LOCAL_CI: still ${free.toFixed(1)} GB free after ${waited} min — starting anyway`); return waited }
    if (waited % 10 === 0) say(`LOCAL_CI: waiting — ${free.toFixed(1)} GB free, starts at ${minGb} GB (${waited} min so far)`)
    await new Promise((r) => setTimeout(r, sleepMs))
    waited++
  }
  if (waited) say(`LOCAL_CI: ${free.toFixed(1)} GB free after ${waited} min — starting`)
  return waited
}

async function runListCommands({ root = ROOT, gh: ghFn = gh, head, pr, list, skipped = [], timeoutMin = DEFAULT_TIMEOUT_MIN, tier = 'pr', reuse = tier !== 'release', releaseOnly = [] }) {
  const results = []
  const reused = []
  const started = Date.now()
  // A command that already passed on exactly this tree here (the ship gate, a run's plan or final gate) is not run again.
  if (reuse) {
    const same = sameTreeSplit(list.filter((c) => c.command !== SECRET_SCAN && (!c.cwd || c.cwd === root)).map((c) => c.command), treeOf(root), treePassSources(root))
    if (same.skipped.length) {
      const from = treePassSources(root)[treeOf(root)]?.plan ?? 'an earlier gate'
      for (const c of same.skipped) { reused.push({ command: c, source: from }); say(`reused — passed on this tree (${from}): ${c}`) }
      const skip = new Set(same.skipped)
      list = list.filter((c) => !(skip.has(c.command) && (!c.cwd || c.cwd === root)))
    }
  }
  for (const c of list) {
    const r = c.command === SECRET_SCAN ? { ...secretScan(root), seconds: 0 } : await runCommand(c.command, c.cwd ?? root, timeoutMin * 60_000)
    results.push({ job: c.job, command: c.command, cwd: !c.cwd || c.cwd === root ? '.' : c.cwd, exit: r.exit, seconds: r.seconds })
    say(`${r.exit === 0 ? 'pass' : 'FAIL'} ${c.command} (${r.seconds}s)`)
    if (r.exit !== 0) console.log(String(r.out ?? '').split('\n').slice(-30).join('\n'))
  }
  const failed = results.filter((r) => r.exit !== 0)
  const minutes = Math.round((Date.now() - started) / 6000) / 10
  const receipt = { sha: head.sha, pr: pr == null ? null : Number(pr), repo: head.repo, host: hostname(), at: new Date().toISOString(), tier, pass: failed.length === 0, minutes, results, reused, releaseOnly, skipped }
  const file = receiptPath(root, head.sha)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`)
  const extra = [reused.length ? `${reused.length} reused` : '', releaseOnly.length ? `${releaseOnly.length} left to the release run` : ''].filter(Boolean).join(', ')
  const desc = failed.length ? `failed: ${failed[0].command}` : `${tier === 'release' ? 'release: ' : ''}${results.length} commands passed on this PC in ${minutes} min${extra ? ` (${extra})` : ''}`
  const p = postStatus(ghFn, head.repo, head.sha, failed.length ? 'failure' : 'success', desc)
  say(`${failed.length ? 'FAIL' : 'PASS'} — ${desc}; status ${p.status === 0 ? 'posted' : `not posted (${String(p.stderr).trim().split('\n')[0]})`}; receipt ${file}`)
  return failed.length ? 1 : p.status === 0 ? 0 : 2
}

export async function runPr(o, { root = ROOT, gh: ghFn = gh } = {}) {
  const head = prHead(ghFn, o.pr)
  if (!head) { say(`cannot read PR ${o.pr} (gh pr view)`); return 2 }
  const here = git(root, 'rev-parse', 'HEAD').out
  if (here !== head.sha) { say(`this folder is at ${here.slice(0, 8)}, PR ${o.pr} is at ${head.sha.slice(0, 8)} — check out its branch and pull first`); return 2 }
  if (git(root, 'status', '--porcelain', '--untracked-files=no').out) { say('this folder has uncommitted changes to tracked files — commit or stash them first'); return 2 }
  const budget = commitBudget(ghFn, head.repo, head.sha, (n) => n !== STATUS_CONTEXT)
  if (!budget) { say(`cannot read the checks of ${head.sha.slice(0, 8)} (gh api)`); return 2 }
  say(`PR ${o.pr} @ ${head.sha.slice(0, 8)}: ${budget.blocked.length} job(s) never started for budget, ${budget.real.length} failed, ${budget.pending.length} running, ${budget.runs} in all`)
  const switchedHere = ciMode(repoWorkflows(ghFn, root)) === 'local'
  if (switchedHere) say('CI is switched to this PC (--use local): the checks run here')
  if (budget.real.length && !o.force && !switchedHere) { say(`a real failure: ${budget.real.join(', ')} — fix it (docs/agent/pr-check-fix-loop.md); the local run stands in only for jobs that never started`); return 2 }
  if (!budget.blocked.length && !o.force && !switchedHere) { say('no job was stopped by the Actions budget — GitHub runs the checks; nothing to do'); return 0 }
  const { list, skipped, once, releaseOnly } = localCommands(root)
  for (const c of once) say(`once ${c} — an npm script in the list already runs it`)
  for (const s of skipped) say(`not run here — ${s}`)
  for (const c of releaseOnly) say(`release only — ${c} (node scripts/local-ci.mjs --release runs it before a release)`)
  for (const c of list.filter((x) => x.focused)) say(`focused — ${c.focused} test file(s) this change touches, instead of the whole suite`)
  if (o.dryRun) { for (const c of list) say(`would run ${c.command}${c.cwd !== root ? ` (in ${c.cwd})` : ''}`); return 0 }
  return runList({ root, gh: ghFn, head, pr: o.pr, list, skipped, timeoutMin: o.timeoutMin, releaseOnly })
}

/**
 * --release: every check, release-only ones included and nothing reused, on this folder's HEAD, which must be
 * origin/<main> with no tracked change. Posts the `local-ci` status on that commit and writes a `tier: "release"` receipt.
 */
export async function runRelease(o, { root = ROOT, gh: ghFn = gh } = {}) {
  git(root, 'fetch', 'origin', MAIN, '--quiet')
  const here = git(root, 'rev-parse', 'HEAD').out
  const main = git(root, 'rev-parse', `origin/${MAIN}`).out
  if (!here || here !== main) { say(`this folder is at ${here.slice(0, 8)}, origin/${MAIN} is at ${main.slice(0, 8)} — a release run checks origin/${MAIN}: check it out and pull first`); return 2 }
  if (git(root, 'status', '--porcelain', '--untracked-files=no').out) { say('this folder has uncommitted changes to tracked files — commit or stash them first'); return 2 }
  const v = ghFn(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], root)
  const repo = String(v.stdout).trim()
  if (v.status !== 0 || !repo) { say('cannot read the repository name (gh repo view)'); return 2 }
  const { list, skipped, once } = localCommands(root, { tier: 'release' })
  say(`release run on origin/${MAIN} @ ${here.slice(0, 8)}: ${list.length} command(s), nothing reused`)
  for (const c of once) say(`once ${c} — an npm script in the list already runs it`)
  for (const s of skipped) say(`not run here — ${s}`)
  if (o.dryRun) { for (const c of list) say(`would run ${c.command}${c.cwd !== root ? ` (in ${c.cwd})` : ''}`); return 0 }
  return runList({ root, gh: ghFn, head: { sha: here, repo }, pr: null, list, skipped, timeoutMin: o.timeoutMin, tier: 'release' })
}

/** The todo-sync workflow's steps in a temporary worktree of `sha`, pushed to <main> (or a PR when the push is refused). */
export function closePlans(o, { root = ROOT, gh: ghFn = gh } = {}) {
  git(root, 'fetch', 'origin', MAIN, '--quiet')
  const sha = o.sha || git(root, 'rev-parse', `origin/${MAIN}`).out
  if (!o.force && ciMode(repoWorkflows(ghFn, root)) !== 'local') {
    const v = ghFn(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'])
    const repo = String(v.stdout).trim()
    if (v.status !== 0 || !repo) { say('cannot read the repository name (gh repo view)'); return 2 }
    const b = commitBudget(ghFn, repo, sha, (n) => n === 'sync')
    if (!b) { say(`cannot read the checks of ${sha.slice(0, 8)} (gh api)`); return 2 }
    if (!b.blocked.length) { say(b.runs ? `todo-sync ran on GitHub for ${sha.slice(0, 8)} — nothing to do` : `no todo-sync run for ${sha.slice(0, 8)} (no plan changed) — nothing to do`); return 0 }
  }
  const tmp = mkdtempSync(join(tmpdir(), 'kit-close-'))
  const wt = join(tmp, 'wt')
  try {
    if (git(root, 'worktree', 'add', '--detach', wt, sha).status !== 0) { say('cannot add a temporary worktree'); return 2 }
    const node = (...a) => spawnSync(process.execPath, a, { cwd: wt, encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true' } })
    if (existsSync(join(wt, '.claude', 'todo.md'))) {
      node('scripts/todo-query.mjs', 'sync', '--merged')
      node('scripts/todo-archive.mjs')
    }
    const pc = node('scripts/plan-close.mjs', ...(o.dryRun ? ['--dry-run'] : []))
    for (const l of String(pc.stdout).split('\n').filter(Boolean)) say(l)
    if (pc.status !== 0) { say(`plan-close failed: ${String(pc.stderr).trim().split('\n')[0]}`); return 2 }
    const paths = ['plans', '.claude/todo.md', '.claude/todo-archive'].filter((p) => existsSync(join(wt, p)))
    if (o.dryRun || !git(wt, 'status', '--porcelain', '--', ...paths).out) { say(o.dryRun ? 'dry run — nothing written' : 'plans and ledger already in sync'); return 0 }
    git(wt, 'add', '-A', '--', ...paths)
    const c = git(wt, 'commit', '-m', `chore(todo): sync ledger and close finished plans (${sha.slice(0, 8)}, local-ci)`)
    if (c.status !== 0) { say(`commit failed: ${c.err.split('\n')[0]}`); return 2 }
    const push = git(wt, 'push', 'origin', `HEAD:refs/heads/${MAIN}`)
    if (push.status === 0) { say(`closed and pushed to ${MAIN} (${git(wt, 'rev-parse', '--short', 'HEAD').out})`); return 0 }
    const branch = `chore/todo-sync-${sha.slice(0, 8)}`
    git(wt, 'push', 'origin', `HEAD:refs/heads/${branch}`)
    const pr = ghFn(['pr', 'create', '--base', MAIN, '--head', branch, '--title', 'chore(todo): sync ledger from merged plan files', '--body', `Local CI fallback: todo-sync could not run on GitHub for ${sha.slice(0, 8)}.`], wt)
    say(`push to ${MAIN} refused; opened ${String(pr.stdout).trim() || `branch ${branch}`} — merge it like any PR`)
    return pr.status === 0 ? 0 : 2
  } finally {
    git(root, 'worktree', 'remove', '--force', wt)
    rmSync(tmp, { recursive: true, force: true })
  }
}

const MODE_LINE = {
  local: 'local — CI runs on this PC (GitHub workflows off; /ship and /orchestrate run node scripts/local-ci.mjs --pr <n>)',
  github: 'github — GitHub Actions runs CI; this PC steps in only for jobs the Actions budget stopped',
  mixed: 'mixed — some workflows are off on GitHub; run --use local or --use github to settle it',
}

/** --which: the repo's mode and each workflow's state. */
export function which({ root = ROOT, gh: ghFn = gh } = {}) {
  const list = repoWorkflows(ghFn, root)
  if (!list) { say('cannot list the workflows (gh workflow list)'); return 2 }
  say(`mode ${MODE_LINE[ciMode(list)]}`)
  for (const w of list) say(`  ${w.state === 'active' ? 'on ' : 'off'} ${w.path} (${w.name})`)
  return 0
}

/** --use local|github|auto: turn every workflow of the repo off (local) or on (github, auto). */
export function useMode(mode, { root = ROOT, gh: ghFn = gh } = {}) {
  const list = repoWorkflows(ghFn, root)
  if (!list) { say('cannot list the workflows (gh workflow list)'); return 2 }
  if (!list.length) { say('this repo has no workflows under .github/workflows/ on GitHub — nothing to switch'); return 0 }
  const off = mode === 'local'
  let failed = 0
  for (const w of list) {
    const isOff = w.state !== 'active'
    if (isOff === off) { say(`  already ${off ? 'off' : 'on'} ${w.path}`); continue }
    const r = ghFn(['workflow', off ? 'disable' : 'enable', String(w.id)])
    if (r.status === 0) say(`  turned ${off ? 'off' : 'on'} ${w.path}`)
    else { failed++; say(`  could not turn ${off ? 'off' : 'on'} ${w.path}: ${String(r.stderr).trim().split('\n')[0]}`) }
  }
  say(failed ? `${failed} workflow(s) not switched — mode not settled` : `mode ${MODE_LINE[off ? 'local' : 'github']}`)
  return failed ? 2 : 0
}

async function main() {
  let o
  try { o = args(process.argv.slice(2)) } catch (e) {
    console.error(`usage: node scripts/local-ci.mjs --pr <n> [--force] [--dry-run] [--timeout-min <m>] | --release [--dry-run] [--timeout-min <m>] | --close-plans [--sha <sha>] [--force] [--dry-run] | --use local|github|auto | --which — ${e.message}`)
    process.exit(2)
  }
  if (o.which) process.exit(which())
  // Below-normal priority: the checks this process starts inherit it, so builders and the Human's own work keep the CPU.
  try { setPriority(process.pid, osConstants.priority.PRIORITY_BELOW_NORMAL) } catch { /* not allowed here: run as is */ }
  if (o.use) process.exit(useMode(o.use))
  process.exit(o.closePlans ? closePlans(o) : o.release ? await runRelease(o) : await runPr(o))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
