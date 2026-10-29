/**
 * CI scope check — on a pull request from a Worker branch (`feat/NNN-*`), proves the branch only changed files
 * inside its plan's Read-Write Scope. Maps the branch to `plans/NNN-*.plan.md` (scripts/lib/plan-paths.mjs) and runs
 * `scope-check.mjs --diff=<base> --plan=<plan>`. Any other branch name is skipped (exit 0).
 *
 * Usage:
 *   node scripts/ci-scope-check.mjs --branch=<head branch> --base=<base ref or sha> [--checkout-branch]
 *   HEAD_REF=<head branch> BASE_SHA=<base sha> node scripts/ci-scope-check.mjs --checkout-branch
 *
 * The branch name is untrusted input in CI: the workflow passes it through an env variable, and it only reaches
 * `git` and `node` as an argv element (never a shell line) after it matches `feat/<digits>-...`.
 * --checkout-branch: when HEAD is detached (CI checks out a merge commit), name the checkout after the branch,
 * so `scope-check.mjs` can name the plan from the branch when no `--plan` is given (kit `branchPlanPath`).
 *
 * Exit 0 = in scope or skipped, 1 = a file outside the scope (named in the output) or a usage error.
 * Node built-ins only.
 */
import { execFileSync, spawnSync } from 'child_process'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { findOpenPlan } from './lib/plan-paths.mjs'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptsDir, '..')

const WORKER_BRANCH = /^feat\/(\d+)-[A-Za-z0-9._/-]*$/

function parseArgs(argv) {
  const out = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const eq = arg.indexOf('=')
    if (eq >= 0) out[arg.slice(2, eq)] = arg.slice(eq + 1)
    else out[arg.slice(2)] = true
  }
  return out
}

function git(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

const args = parseArgs(process.argv.slice(2))
const branch = String(args.branch ?? process.env.HEAD_REF ?? '').trim()
const base = String(args.base ?? process.env.BASE_SHA ?? process.env.BASE_REF ?? '').trim()

const match = WORKER_BRANCH.exec(branch)
if (!match) {
  console.log(`ci-scope-check: skipped (branch "${branch.slice(0, 80)}" is not feat/NNN-*)`)
  process.exit(0)
}

const plan = findOpenPlan(repoRoot, match[1])
if (!plan) {
  console.log(`ci-scope-check: skipped (no open plan numbered ${match[1]} under plans/)`)
  process.exit(0)
}

if (!base || base.startsWith('-')) {
  console.error('ci-scope-check: FAIL — no base given (--base=<ref or sha> or BASE_SHA)')
  process.exit(1)
}

// scope-check reads a missing base as "no changes", so refuse here rather than pass silently.
try {
  git(['rev-parse', '--verify', '--quiet', `${base}^{commit}`])
} catch {
  console.error(`ci-scope-check: FAIL — base "${base}" is not a commit in this checkout (fetch the full history)`)
  process.exit(1)
}

if (args['checkout-branch'] &&git(['branch', '--show-current']) === '') {
  git(['checkout', '-q', '-B', branch])
}

console.log(`ci-scope-check: ${branch} -> ${plan}, diff against ${base}`)
const run = spawnSync(process.execPath, [join(scriptsDir, 'scope-check.mjs'), `--diff=${base}`, `--plan=${plan}`], {
  cwd: repoRoot,
  encoding: 'utf8'
})
process.stdout.write(run.stdout ?? '')
process.stderr.write(run.stderr ?? '')
if (run.status !== 0) {
  console.error(`ci-scope-check: FAIL — files outside ${plan} "## Read-Write Scope" (listed above). Add the path to the plan's scope block or drop the change.`)
  process.exit(1)
}
console.log('ci-scope-check: ok')
