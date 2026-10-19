/**
 * Code QA shared helpers (plan 413): paths, dates, a small glob matcher and the page map.
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { dirname, join, relative, resolve, sep } from 'path'
import { fileURLToPath } from 'url'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/** bugs/qa-runs/code-qa under `root`. */
export const outRoot = (root = repoRoot) => join(root, 'bugs', 'qa-runs', 'code-qa')

/** Local calendar date YYYY-MM-DD. */
export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Forward-slash path of `abs` relative to `root`. */
export const rel = (root, abs) => relative(root, abs).split(sep).join('/')

/** Glob → RegExp over forward-slash relative paths. Supports **, *, ? and {a,b}. */
export function globToRegExp(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++
        if (glob[i + 1] === '/') { i++; re += '(?:.*/)?' } else re += '.*'
      } else re += '[^/]*'
    } else if (c === '?') re += '[^/]'
    else if (c === '{') {
      const end = glob.indexOf('}', i)
      re += `(?:${glob.slice(i + 1, end).split(',').map((s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&')).join('|')})`
      i = end
    } else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.angular', 'bugs', 'coverage'])

/** Every file under `dir` (absolute paths), skipping build and dependency folders. */
export function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

/** Files under `root` (relative, forward slashes) matching `glob`. Walks only the glob's literal prefix. */
export function globFiles(root, glob) {
  const literal = glob.split('/').filter((_, i, a) => !/[*?{]/.test(a.slice(0, i + 1).join('/'))).join('/')
  const base = join(root, literal)
  const re = globToRegExp(glob)
  if (existsSync(base) && statSync(base).isFile()) return re.test(literal) ? [literal] : []
  return walk(base).map((p) => rel(root, p)).filter((p) => re.test(p))
}

/** docs/qa/code-qa-pages.json → { pages: [...] }. */
export function loadPageMap(root = repoRoot) {
  return JSON.parse(readFileSync(join(root, 'docs', 'qa', 'code-qa-pages.json'), 'utf8'))
}

/** The page id whose `files` globs match `relPath`, else 'GLOBAL'. */
export function pageForFile(pageMap, relPath) {
  for (const p of pageMap.pages) {
    if ((p.files || []).some((g) => globToRegExp(g).test(relPath))) return p.id
  }
  return 'GLOBAL'
}

/** Appends `CODE-QA: …` style lines to bugs/qa-runs/.nightly.log in qa-nightly-up.ps1's format. */
export function nightlyLog(root, msg) {
  const dir = join(root, 'bugs', 'qa-runs')
  mkdirSync(dir, { recursive: true })
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const stamp = `${localDate(d)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  appendFileSync(join(dir, '.nightly.log'), `${stamp} code  ${msg}\n`, 'utf8')
}
