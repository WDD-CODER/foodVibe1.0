/**
 * Readiness asks — the questions of a run the plan's own text lets the script foresee, asked once in the dry run
 * before any builder starts (docs/agent/orchestrator.md "Questions up front"). No model call: file scans only.
 *   1. the test files that import a scoped file and no scope line lists (outside the sibling rule), and the manifest
 *      (docs/workflow-kit/manifest.json) when the plan adds a script, agent, doc or test file and does not list it;
 *   2. the QA login (ORCH_QA_USER / ORCH_QA_PASSWORD in the main folder's .env) a `[ui]` plan needs.
 * Pure but for the reads of the project folder. `replayAsks` measures the gain on the asks a project recorded.
 */
import { createRequire } from 'module'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, join, posix } from 'path'
import { spawnSync } from 'child_process'
import { extractScopeGlobs, isTestPath, plannedTestPaths, testRefusals } from './plan-scope.mjs'
import { uiItems } from './done-when.mjs'

const picomatch = createRequire(import.meta.url)('picomatch')
const match = (g) => picomatch(g, { dot: true })
export const MANIFEST = 'docs/workflow-kit/manifest.json'
export const QA_KEYS = ['ORCH_QA_USER', 'ORCH_QA_PASSWORD']
const CODE_EXT = /\.(?:[cm]?[jt]sx?|vue|svelte)$/
const RESOLVE = ['', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '/index.js', '/index.mjs', '/index.ts']
// A file the kit manifest lists: scripts, agents, commands, skills, brain and agent docs, workflows, tests of those.
const MANIFEST_INVENTORY = /^(?:scripts|tools|\.claude\/(?:agents|commands|skills)|docs\/(?:brain|agent)|\.github\/workflows)\//

function trackedFiles(root) {
  const r = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return r.status === 0 ? r.stdout.split('\0').filter(Boolean) : []
}

/** The relative module specifiers a source text imports (import … from, import(), require()). */
export function specifiersOf(src) {
  const out = []
  const re = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"]*)['"]/g
  for (let m = re.exec(src); m; m = re.exec(src)) out.push(m[1])
  return out
}

/** The test files (outside the sibling rule) that import a file the scope covers and that no scope line lists. */
export function importerTests(root, planText, files = trackedFiles(root)) {
  const globs = extractScopeGlobs(String(planText).replace(/\r\n/g, '\n')) ?? []
  if (!globs.length) return []
  const inScope = match(globs)
  const scoped = new Set(files.filter((f) => !isTestPath(f) && CODE_EXT.test(f) && inScope(f)))
  if (!scoped.size) return []
  const found = []
  for (const f of files) {
    if (!isTestPath(f) || !CODE_EXT.test(f)) continue
    let src
    try {
      src = readFileSync(join(root, f), 'utf8')
    } catch { continue }
    const hit = specifiersOf(src).some((s) => {
      const base = posix.normalize(posix.join(dirname(f), s))
      return RESOLVE.some((x) => scoped.has(base + x))
    })
    if (hit) found.push(f)
  }
  return testRefusals(found, globs, match).map((r) => r.file)
}

/** The manifest, when the plan adds a file the manifest inventories (or a test) and no scope line covers the manifest. */
export function manifestNeeded(root, planText) {
  if (!existsSync(join(root, MANIFEST))) return []
  const globs = extractScopeGlobs(String(planText).replace(/\r\n/g, '\n')) ?? []
  if (match(globs)(MANIFEST)) return []
  const added = [...globs.filter((g) => !/[*?{}[\]]/.test(g)), ...plannedTestPaths(planText)].map((g) => g.replace(/\\/g, '/'))
  const fresh = added.filter((f) => !existsSync(join(root, f)) && (MANIFEST_INVENTORY.test(f) || isTestPath(f)))
  return fresh.length ? [MANIFEST] : []
}

/** The value of each key a .env text sets (non-empty only); never logged. */
export function envKeys(envText) {
  const out = {}
  for (const l of String(envText ?? '').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(l)
    if (m && m[2].replace(/^["']|["']$/g, '')) out[m[1]] = m[2]
  }
  return out
}

export const QA_PROBLEM = 'environment: QA login missing in .env (ORCH_QA_USER / ORCH_QA_PASSWORD)'

/** A [ui] card that signs in: "log in", "sign in", "logged in", "as the admin user", "role: admin". */
export const SIGNS_IN_RE = /\b(log(?:ged)?[\s-]?in|sign(?:ed)?[\s-]?in|as (?:the |an? )?[\w-]+ user|role:\s*\w+|authenticated)\b/i

/** True when some [ui] card needs the QA login: the project's UI checks sign in (ORCH_UI_LOGIN_URL set), or a card does. */
export function needsLogin(cards, envHave = {}) {
  const list = (Array.isArray(cards) ? cards : []).map((c) => (typeof c === 'string' ? c : c?.text ?? JSON.stringify(c ?? '')))
  if (!list.length) return false
  return Boolean(envHave.ORCH_UI_LOGIN_URL) || list.some((t) => SIGNS_IN_RE.test(t))
}

/** One plan's readiness asks: { paths, tests, manifest, problems, lines, question }. `envText` is the main folder's .env (null: none). */
export function readinessAsks({ root, planText, envText = null, files }) {
  const tests = importerTests(root, planText, files)
  const manifest = manifestNeeded(root, planText)
  const paths = [...tests, ...manifest]
  const problems = []
  const have = envKeys(envText)
  // The QA login is needed only by a [ui] check that signs in: the project's UI checks sign in (ORCH_UI_LOGIN_URL in
  // .env), or a card says so itself. A card on a page anyone can open runs without it, as before.
  if (needsLogin(uiItems(planText), have) && QA_KEYS.some((k) => !have[k])) problems.push(QA_PROBLEM)
  return {
    paths, tests, manifest, problems,
    lines: [paths.length ? `readiness asks: scope — ${paths.join(', ')}` : 'readiness asks: none'],
    question: paths.length ? `scope: the plan needs these files in its scope block: ${paths.join(', ')}. Answer approve to add them before the run starts.` : null,
  }
}

/** Copies the QA login (by key name only) from the main folder's .env into the worktree's .env. { ok, keys } */
export function copyQaLogin(mainRoot, dst) {
  const src = join(mainRoot, '.env')
  const have = envKeys(existsSync(src) ? readFileSync(src, 'utf8') : '')
  if (QA_KEYS.some((k) => !have[k])) return { ok: false, keys: [] }
  const file = join(dst, '.env')
  const old = existsSync(file) ? readFileSync(file, 'utf8') : ''
  const add = QA_KEYS.filter((k) => !envKeys(old)[k])
  if (add.length) writeFileSync(file, `${old}${old && !old.endsWith('\n') ? '\n' : ''}${add.map((k) => `${k}=${have[k]}`).join('\n')}\n`)
  return { ok: true, keys: QA_KEYS }
}

/** Would the readiness asks have raised this recorded ask up front? Judged from the ask's own text. */
export function askedUpFront(ask) {
  const text = `${ask.question ?? ''} ${(ask.options ?? []).join(' ')} ${JSON.stringify(ask.context ?? '')}`
  if (ask.kind === 'environment') return /QA|login|ORCH_QA|\.env/i.test(text)
  if (ask.kind !== 'scope') return false
  const paths = text.match(/[\w@.\-/]+\.(?:[cm]?[jt]sx?|json|vue|py)\b/g) ?? []
  return paths.length > 0 && paths.every((p) => isTestPath(p) || p.endsWith('manifest.json'))
}

/** Read-only: one line per recorded ask of a project folder, and the total. */
export function replayAsks(projectDir) {
  const runs = join(projectDir, '.claude', 'orchestrator-runs')
  const rows = []
  if (existsSync(runs)) {
    for (const run of readdirSync(runs).sort()) {
      const dir = join(runs, run, 'asks')
      if (!existsSync(dir)) continue
      for (const f of readdirSync(dir).sort()) {
        if (!/^\d+-\d+\.json$/.test(f)) continue
        let a
        try {
          a = JSON.parse(readFileSync(join(dir, f), 'utf8'))
        } catch { continue }
        rows.push(`${run} ${a.plan ?? f.split('-')[0]} ${a.kind ?? 'unstated'} ${askedUpFront(a) ? 'up-front' : 'still-mid-run'}`)
      }
    }
  }
  const up = rows.filter((r) => r.endsWith(' up-front')).length
  return { rows, up, total: rows.length, lines: [...rows, `would have been asked up front: ${up} of ${rows.length}`] }
}
