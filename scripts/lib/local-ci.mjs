/**
 * Local CI fallback (docs/agent/local-ci.md): when GitHub Actions has no budget left, every job of a private repo fails
 * without starting. These helpers tell that apart from a real failure, list the commands a PR's workflows run (the line
 * reader below — no YAML package), and decide whether a passing local run on this PC stands in for the jobs that never
 * started. No model is involved; every gh call goes through the `gh(args)` the caller gives (KIT_GH_BIN in tests).
 *
 *   import { workflowCommands, budgetBlocked, localCiCovers, receiptPath } from './lib/local-ci.mjs'
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

/** The annotation GitHub puts on a job it never started for lack of budget or a billing problem. */
export const BUDGET_RE = /spending limit|billing|account payments|account is locked/i
/** The commit status a local run posts (statuses cost no Actions minutes). */
export const STATUS_CONTEXT = 'local-ci'
/**
 * Receipts live in the repository's shared git folder (`<git-common-dir>/kit-local-ci/<sha>.json`): never committed,
 * and the same folder for the main checkout and every worktree, so a run in a run's merge folder is seen by the merge
 * guard of the main folder. A folder that is not a git repository falls back to `<root>/.git`.
 */
export function receiptPath(root, sha) {
  const r = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8', windowsHide: true })
  const common = r.status === 0 && String(r.stdout).trim() ? String(r.stdout).trim() : join(root, '.git')
  return join(common, 'kit-local-ci', `${sha}.json`)
}

const indentOf = (l) => l.length - l.trimStart().length
const unquote = (s) => {
  const t = String(s).trim()
  return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")) ? t.slice(1, -1) : t
}

/** True when a workflow runs on pull requests (`on: pull_request`, `on: [push, pull_request]` or a `pull_request:` key). */
export function prTriggered(text) {
  const t = String(text).replace(/\r\n/g, '\n')
  return /^on:.*\bpull_request\b(?!_)/m.test(t) || /^\s{2}pull_request:/m.test(t)
}

/**
 * The steps of every job: [{ job, name, run, uses, workingDirectory }]. A line reader for the shapes the kit's workflows
 * use: jobs at two spaces, steps as `- ` items, `run:` one line or a `|` / `>` block; job `defaults.run.working-directory`.
 */
export function workflowSteps(text) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n')
  const steps = []
  let inJobs = false
  let job = null
  let jobDir = null
  let stepsIndent = -1 // indent of the job's `steps:` key; -1 = not in the step list
  let itemIndent = -1 // indent of the `- ` that opens a step
  let step = null
  let block = null // { indent, lines }: a `run: |` block being read
  for (const raw of lines) {
    if (block) {
      if (raw.trim() === '' || indentOf(raw) > block.indent) { block.lines.push(raw.trim()); continue }
      step.run = block.lines.join('\n').trim()
      block = null
    }
    if (raw.trim() === '' || /^\s*#/.test(raw)) continue
    const ind = indentOf(raw)
    if (ind === 0) { inJobs = /^jobs:\s*$/.test(raw); job = null; continue }
    if (!inJobs) continue
    const jm = ind === 2 ? /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(raw) : null
    if (jm) { job = jm[1]; jobDir = null; stepsIndent = -1; itemIndent = -1; step = null; continue }
    if (!job) continue
    if (stepsIndent >= 0 && ind <= stepsIndent) { stepsIndent = -1; step = null }
    if (stepsIndent < 0) {
      if (/^\s+steps:\s*$/.test(raw)) { stepsIndent = ind; continue }
      const wd = /^\s+working-directory:\s*(.+)$/.exec(raw)
      if (wd) jobDir = unquote(wd[1])
      continue
    }
    let body = raw
    const item = /^(\s*)- (.*)$/.exec(raw)
    if (item && (itemIndent < 0 || ind === itemIndent)) {
      itemIndent = ind
      step = { job, name: '', run: '', uses: '', workingDirectory: jobDir }
      steps.push(step)
      body = `${' '.repeat(ind + 2)}${item[2]}`
    }
    if (!step || indentOf(body) !== itemIndent + 2) continue
    const kv = /^\s+([A-Za-z-]+):\s*(.*)$/.exec(body)
    if (!kv) continue
    const [, key, value] = kv
    if (key === 'name') step.name = unquote(value)
    else if (key === 'uses') step.uses = unquote(value)
    else if (key === 'working-directory') step.workingDirectory = unquote(value)
    else if (key === 'run') {
      if (/^[|>][-+]?\s*$/.test(value)) block = { indent: itemIndent + 2, lines: [] }
      else step.run = unquote(value)
    }
  }
  if (block) step.run = block.lines.join('\n').trim()
  return steps
}

/**
 * What a local run can take from a workflow: { run: [{ job, command }], skipped: [{ job, step, why }] }. A step runs here
 * only when it is one plain command `runnable(command)` accepts, with no GitHub expression or variable and no working
 * directory; checkout / setup / install steps are dropped (this folder is checked out and installed); anything else is
 * listed as skipped, never dropped silently.
 */
export function workflowCommands(text, runnable) {
  const out = { run: [], skipped: [] }
  for (const s of workflowSteps(text)) {
    const label = s.name || s.uses || s.run.split('\n')[0]
    if (s.uses) {
      if (/^actions\/(checkout|setup-node|cache)@|^pnpm\/action-setup@/.test(s.uses)) continue
      out.skipped.push({ job: s.job, step: label, why: `uses ${s.uses}` })
      continue
    }
    const lines = s.run.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    if (lines.length !== 1) { out.skipped.push({ job: s.job, step: label, why: 'a multi-line shell step' }); continue }
    const command = lines[0]
    if (/^(npm|pnpm|yarn)\s+(ci|install|i)\b/.test(command)) continue
    if (/\$\{\{|\$[A-Za-z_{]/.test(command)) { out.skipped.push({ job: s.job, step: label, why: 'uses GitHub expressions or variables' }); continue }
    // A step in a subfolder: the caller may run `command` in `dir` itself.
    if (s.workingDirectory) { out.skipped.push({ job: s.job, step: label, why: `runs in ${s.workingDirectory}`, command, dir: s.workingDirectory }); continue }
    if (!runnable(command)) { out.skipped.push({ job: s.job, step: label, why: 'not a command the local run starts', command }); continue }
    out.run.push({ job: s.job, command })
  }
  return out
}

/**
 * Which failing check runs never started for budget: `checkRuns` = GitHub's check-runs of the commit
 * ([{ id, name, status, conclusion }]), `annotations` = { id: [{ message }] }. Returns { blocked: [names], real: [names],
 * pending: [names] }; a failure with no budget annotation is real.
 */
export function budgetBlocked(checkRuns = [], annotations = {}) {
  const out = { blocked: [], real: [], pending: [] }
  for (const r of Array.isArray(checkRuns) ? checkRuns : []) {
    if (r.status !== 'completed') { out.pending.push(r.name); continue }
    if (['success', 'skipped', 'neutral'].includes(r.conclusion)) continue
    const msgs = (annotations[r.id] ?? []).map((a) => String(a?.message ?? ''))
    ;(msgs.some((m) => BUDGET_RE.test(m)) ? out.blocked : out.real).push(r.name)
  }
  return out
}

/** The receipt a local run wrote for `sha`, or null. */
export function readReceipt(root, sha) {
  try {
    const p = receiptPath(root, sha)
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null
  } catch { return null }
}

/**
 * Does a local run stand in for this PR's failing rows? `rows` = `gh pr checks --json name,bucket`; `budget` =
 * budgetBlocked() of the head commit; `receipt` = readReceipt(). Every row that is not pass/skipping must be a job that
 * never started for budget, the `local-ci` status row must pass, and the receipt must be this sha's and passing.
 */
export function localCiCovers({ rows = [], budget, receipt, sha }) {
  const bad = rows.filter((r) => r.bucket !== 'pass' && r.bucket !== 'skipping')
  const local = rows.find((r) => r.name === STATUS_CONTEXT)
  if (!bad.length) {
    // A passing `local-ci` among the checks counts only with this PC's receipt for the head commit: anyone with write
    // access can post a status, only a real local run writes the receipt.
    if (local && (!receipt || receipt.sha !== sha || receipt.pass !== true)) return { ok: false, why: `${STATUS_CONTEXT} passed but this PC has no passing receipt for ${String(sha).slice(0, 8)} — run node scripts/local-ci.mjs --pr <n> here` }
    return { ok: true, why: local ? `every check passed, ${STATUS_CONTEXT} with its receipt (${receipt.results?.length ?? '?'} commands)` : 'every check passed' }
  }
  if (!budget?.blocked?.length) return { ok: false, why: 'no job was stopped by the Actions budget' }
  if (!local || local.bucket !== 'pass') return { ok: false, why: `no passing ${STATUS_CONTEXT} check (run node scripts/local-ci.mjs --pr <n>)` }
  const notBudget = bad.filter((r) => !budget.blocked.includes(r.name))
  if (notBudget.length) return { ok: false, why: `check ${notBudget[0].name} is ${notBudget[0].bucket} and was not stopped by the budget` }
  if (!receipt || receipt.sha !== sha || receipt.pass !== true) return { ok: false, why: `no passing local receipt for ${String(sha).slice(0, 8)} on this PC` }
  return { ok: true, why: `${bad.length} job(s) never started (Actions budget); ${STATUS_CONTEXT} passed ${receipt.results?.length ?? '?'} commands` }
}

/** { owner/repo, sha } of a PR through gh, or null. */
export function prHead(gh, pr, repoArgs = []) {
  const v = gh(['pr', 'view', String(pr), ...repoArgs, '--json', 'headRefOid,url'])
  if (v.status !== 0) return null
  try {
    const j = JSON.parse(String(v.stdout))
    const m = /github\.com\/([^/]+\/[^/]+)\/pull\//.exec(j.url ?? '')
    return m && j.headRefOid ? { repo: m[1], sha: j.headRefOid } : null
  } catch { return null }
}

/**
 * The switch (`node scripts/local-ci.mjs --use local|github`): the repo's own GitHub workflows — the files under
 * `<root>/.github/workflows/` — with their GitHub id and state ([{ id, name, path, state }]), or null when gh cannot list
 * them. The switch turns exactly these off and on; the state lives on GitHub, so every clone and worktree sees it.
 */
export function repoWorkflows(gh, root, repoArgs = []) {
  const v = gh(['workflow', 'list', '--all', ...repoArgs, '--json', 'id,name,path,state'])
  if (v.status !== 0) return null
  let all
  try { all = JSON.parse(String(v.stdout)) } catch { return null }
  return (Array.isArray(all) ? all : []).filter((w) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(w.path ?? '') && existsSync(join(root, w.path)))
}

/** `local` when every one of the repo's workflows is turned off by hand, `github` when none is, else `mixed`. */
export function ciMode(workflows) {
  if (!Array.isArray(workflows) || !workflows.length) return 'github'
  const off = workflows.filter((w) => w.state === 'disabled_manually').length
  return off === workflows.length ? 'local' : off === 0 ? 'github' : 'mixed'
}

/** budgetBlocked() of one commit, read through gh (check-runs plus the annotations of each failed run), or null. */
export function commitBudget(gh, repo, sha, only = null) {
  const c = gh(['api', `repos/${repo}/commits/${sha}/check-runs?per_page=100`])
  if (c.status !== 0) return null
  let runs
  try { runs = JSON.parse(String(c.stdout)).check_runs ?? [] } catch { return null }
  if (only) runs = runs.filter((r) => only(r.name))
  const annotations = {}
  for (const r of runs) {
    if (r.status !== 'completed' || ['success', 'skipped', 'neutral'].includes(r.conclusion)) continue
    const a = gh(['api', `repos/${repo}/check-runs/${r.id}/annotations`])
    try { annotations[r.id] = a.status === 0 ? JSON.parse(String(a.stdout)) : [] } catch { annotations[r.id] = [] }
  }
  return { ...budgetBlocked(runs, annotations), runs: runs.length }
}
