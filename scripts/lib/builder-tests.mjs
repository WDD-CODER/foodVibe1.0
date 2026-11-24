#!/usr/bin/env node
/**
 * Which tests a builder runs (orchestrator.builderTests). `full` (the default): every gate check, as before. `focused`:
 * the builder runs the cheap checks and only the tests its change needs (the test files it changed, plus the tests that
 * name a changed file); the full suites are left to the gate, whose list never changes.
 *
 *   import { splitBuilderChecks, builderFocusedTests } from './lib/builder-tests.mjs'
 *   node scripts/lib/builder-tests.mjs --base origin/<run branch>   (prints the focused test files of this folder's diff)
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { focusedTests } from './local-ci.mjs'

const NOT_A_SUITE = /(?:lint|seed|fixture|data|watch)/
/**
 * A gate command that runs a whole test suite, exactly: `<npm|pnpm> [--dir X|-C X] [run] [--if-present] <script>
 * [--if-present]` where the script is the project's test script, `test` or `test:<name>`; or `node --test` over a glob.
 * Anything with arguments (`test -- src/a.spec.ts`), a compound command or another shape is not: the builder runs it,
 * as before (a wrong "no" costs time, never a check).
 */
export function isSuiteCommand(command, { testScripts = [] } = {}) {
  const c = String(command ?? '').trim()
  if (/&&|\|\||[;|]/.test(c)) return false
  const run = /^(?:npm|pnpm)(?: --dir \S+| -C \S+)? (?:run )?(?:--if-present )?([A-Za-z0-9:_-]+)(?: --if-present)?$/.exec(c)
  if (run) return testScripts.includes(run[1]) || run[1] === 'test' || (/^test:[A-Za-z0-9_-]+$/.test(run[1]) && !NOT_A_SUITE.test(run[1]))
  const node = /^node --test\b(.*)$/.exec(c)
  if (node) return node[1].trim().split(/\s+/).filter((a) => a && !a.startsWith('-')).some((a) => /[*?{]/.test(a))
  return false
}

/**
 * The builder's checks for `mode`: `full` (or any value but `focused`) = { checks: every gate check, suites: [] };
 * `focused` = { checks: the gate checks that are not a whole suite, suites: the ones left to the gate }.
 */
export function splitBuilderChecks(checks, { mode = 'full', testScripts = [], own = [] } = {}) {
  const list = Array.isArray(checks) ? checks : []
  if (mode !== 'focused') return { checks: list, suites: [] }
  // `own`: the plan's own [auto] commands — the builder always runs those, whatever their shape.
  const cmd = (c) => (typeof c === 'string' ? c : c?.command)
  const suite = (c) => !own.includes(cmd(c)) && isSuiteCommand(cmd(c), { testScripts })
  return { checks: list.filter((c) => !suite(c)), suites: list.filter(suite).map((c) => (typeof c === 'string' ? c : c.command)) }
}

const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', 'out', 'tmp'])
/** Every test file under `root` (`*.test.*` / `*.spec.*`), repo-relative with `/`, skipping build, package and dot folders. */
export function testFilesIn(root) {
  const out = []
  const walk = (rel) => {
    let entries = []
    try { entries = readdirSync(join(root, rel), { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(p) }
      else if (TEST_FILE.test(e.name)) out.push(p)
    }
  }
  walk('')
  return out.sort()
}

/** The focused tests of a change: the changed test files plus every test that names a changed file (local CI's rule). */
export function builderFocusedTests({ changed, files, read }) {
  return focusedTests({ changed, files, read })
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const i = process.argv.indexOf('--base')
  const base = i > 0 ? process.argv[i + 1] : null
  if (!base) { console.error('usage: node scripts/lib/builder-tests.mjs --base origin/<run branch>'); process.exit(1) }
  const root = process.cwd()
  const lines = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  let changed
  try {
    // Committed since the base, plus what is not committed yet (changed and new files).
    changed = [...new Set([...lines(['diff', '--name-only', '--no-renames', `${base}...HEAD`]), ...lines(['diff', '--name-only', '--no-renames', 'HEAD']), ...lines(['ls-files', '--others', '--exclude-standard'])])]
  } catch (e) {
    console.error(`BUILDER_TESTS: cannot diff against ${base}: ${String(e.stderr ?? e.message).trim().split('\n').pop()}`)
    process.exit(2)
  }
  const picked = builderFocusedTests({ changed, files: testFilesIn(root), read: (f) => readFileSync(join(root, f), 'utf8') })
  // stdout holds only test files; the "none" line goes to stderr.
  if (picked.length) console.log(picked.join('\n'))
  else console.error('BUILDER_TESTS: none — no test file changed or names a changed file')
}
