/**
 * What a branch adds — the shared input of every check under scripts/lib/checks/ (run by kit-checks.mjs).
 *
 *   import { addedItems } from './diff-items.mjs'
 *   const items = addedItems({ root, base: 'origin/main', kinds: { component: ['src/**\/*.component.ts'] },
 *                              stylesheets: ['**\/*.scss'], tokenPrefixes: ['--color-'], enginePrefix: 'c-' })
 *   // items = { mergeBase, files, lines, selectors, tokens, engineClasses }
 *
 * The diff is the working tree against the merge base of `base` and HEAD (commits, staged, unstaged), plus the untracked
 * files, the way scope-check.mjs reads it. A renamed file is `renamed`, never `added`.
 *   files          [{ path, status: added|modified|renamed, kind }]  (kind: the first `kinds` entry whose globs match, or null)
 *   lines          [{ file, line, text }]  every added line (all lines of an untracked file)
 *   selectors      [{ file, line, name }]  class selectors defined on added lines of a stylesheet file
 *   tokens         [{ file, line, name }]  definitions (--x: / $x: / @x:) on added lines; only names with a listed prefix
 *                                          when `tokenPrefixes` is not empty
 *   engineClasses  the selectors whose name starts with `enginePrefix` (none when it is empty)
 * Kinds and globs are data from the caller (the project's config), never written here. Node built-ins and picomatch.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'
import { parseAddedLines } from './invariants.mjs'

const DEFAULT_STYLESHEETS = ['**/*.css', '**/*.scss', '**/*.sass', '**/*.less']

function git(root, args) {
  // core.quotepath=false: a non-ASCII path comes out as it is, not "\303\251…" in quotes, so every list agrees on it.
  const r = spawnSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true })
  return { status: r.status ?? 1, out: String(r.stdout ?? ''), err: String(r.stderr ?? '') }
}

// A path with a space ends its `+++ b/<path>` diff header with a tab: drop it, so added lines match the file list.
const norm = (p) => String(p).replace(/\t+$/, '').replace(/\\/g, '/').replace(/^\.\//, '')

/** A glob list as one matcher; an empty list matches nothing. */
export function matcher(globs) {
  const list = (Array.isArray(globs) ? globs : [globs]).filter((g) => typeof g === 'string' && g !== '')
  return list.length ? picomatch(list, { dot: true }) : () => false
}

/** The merge base of `base` and HEAD, or throws with a plain reason (an unknown ref, a repo with no commit). */
export function mergeBaseOf(root, base) {
  const r = git(root, ['merge-base', base, 'HEAD'])
  if (r.status !== 0 || !r.out.trim()) throw new Error(`base ${base} not found or shares no history with HEAD — fetch it first (git fetch origin)`)
  return r.out.trim()
}

/** [{ path, status }] changed between the merge base and the working tree, untracked files as added; deletions left out. */
export function changedFiles(root, mergeBase) {
  const out = new Map()
  const r = git(root, ['diff', '--name-status', '-M', '--no-color', mergeBase])
  if (r.status !== 0) throw new Error(`git diff failed: ${r.err.trim()}`)
  for (const l of r.out.split('\n')) {
    const f = l.split('\t')
    if (f.length < 2) continue
    const s = f[0][0]
    if (s === 'D') continue
    if (s === 'R') out.set(norm(f[2]), 'renamed')
    else if (s === 'A' || s === 'C') out.set(norm(f[f.length - 1]), 'added')
    else out.set(norm(f[1]), 'modified')
  }
  for (const p of git(root, ['ls-files', '--others', '--exclude-standard']).out.split('\n').map((x) => x.trim()).filter(Boolean)) out.set(norm(p), 'added')
  return [...out].map(([path, status]) => ({ path, status })).sort((a, b) => a.path.localeCompare(b.path))
}

/** The selector part of a stylesheet line that opens a rule (`.a, .b {` or a `.a,` continuation), else null. */
export function selectorPart(text) {
  const t = String(text).replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '').trim()
  if (!t || t.startsWith('@') && !/^@include\b/.test(t) && !t.includes('{')) return null
  let sel = null
  if (t.includes('{')) sel = t.slice(0, t.indexOf('{'))
  // A `.a,` continuation; a value continuation (`url(b.png),`, `rgba(0 0 0 / 50%),`, `"Font Name",`) is not one.
  else if (t.endsWith(',') && /^[.#&[:*>+~a-zA-Z]/.test(t) && !/^[\w-]+\(/.test(t) && !/\burl\(/.test(t)) sel = t
  if (sel === null || sel.includes(';')) return null
  // A declaration whose value holds a brace (`a: { … }` maps in SCSS) is not a selector.
  if (/^[\w-]+\s*:\s/.test(sel.trim())) return null
  return sel
}

/** The class names a selector defines (`.a:hover > .b` → a, b). */
export function classNames(sel) {
  return [...String(sel).matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1])
}

const TOKEN_DEF = /^\s*((?:--|\$|@)[\w-]+)\s*:/

export function addedItems({ root, base, kinds = {}, stylesheets = DEFAULT_STYLESHEETS, tokenPrefixes = [], enginePrefix = '' }) {
  const mergeBase = mergeBaseOf(root, base)
  const changed = changedFiles(root, mergeBase)
  const kindMatchers = Object.entries(kinds ?? {}).map(([k, g]) => [k, matcher(g)])
  const files = changed.map((f) => ({ ...f, kind: kindMatchers.find(([, m]) => m(f.path))?.[0] ?? null }))
  const diff = git(root, ['diff', '-U0', '--no-color', '-M', mergeBase])
  const lines = parseAddedLines(diff.out).map((l) => ({ ...l, file: norm(l.file) }))
  for (const f of changed) {
    if (f.status !== 'added') continue
    if (lines.some((l) => l.file === f.path)) continue
    const abs = join(root, f.path)
    if (!existsSync(abs) || !statSync(abs).isFile()) continue
    readFileSync(abs, 'utf8').split(/\r?\n/).forEach((text, i, all) => {
      if (i === all.length - 1 && text === '') return
      lines.push({ file: f.path, line: i + 1, text })
    })
  }
  const isSheet = matcher(stylesheets?.length ? stylesheets : DEFAULT_STYLESHEETS)
  const prefixes = (tokenPrefixes ?? []).filter(Boolean)
  const selectors = []
  const tokens = []
  for (const l of lines) {
    if (!isSheet(l.file)) continue
    const sel = selectorPart(l.text)
    if (sel !== null) for (const name of classNames(sel)) selectors.push({ file: l.file, line: l.line, name })
    const t = TOKEN_DEF.exec(l.text)
    if (t && (!prefixes.length || prefixes.some((p) => t[1].startsWith(p)))) tokens.push({ file: l.file, line: l.line, name: t[1] })
  }
  const engineClasses = enginePrefix ? selectors.filter((s) => s.name.startsWith(enginePrefix)) : []
  return { mergeBase, files, lines, selectors, tokens, engineClasses }
}
