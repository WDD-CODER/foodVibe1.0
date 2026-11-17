// Copies of a registered family as debt: the project's rules (scripts/lib/registry-families.mjs) count the lines
// that look like a copy of a family, per family and file. The ratchet (paths.debtBaseline) lets an old copy stay and
// fails a new one: `reuse-copy.<family>` is the debt kind. No rules file or no rules = no copies counted.
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { matcher } from '../diff-items.mjs'

export const id = 'reuse-copies'
export const RULES_FILE = 'scripts/lib/registry-families.mjs'

/**
 * The project's REUSE_RULES: { found, rules }. A missing file is { found: false }; a file that throws or exports a
 * rule of the wrong shape throws naming it (never swallowed).
 */
export async function loadRules(root) {
  const abs = join(root, RULES_FILE)
  if (!existsSync(abs)) return { found: false, rules: [] }
  let mod
  try {
    mod = await import(`${pathToFileURL(abs).href}?m=${statSync(abs).mtimeMs}`)
  } catch (e) {
    throw new Error(`${RULES_FILE} does not load: ${e.message}`)
  }
  const rules = mod.REUSE_RULES ?? []
  if (!Array.isArray(rules)) throw new Error(`${RULES_FILE}: REUSE_RULES is not an array`)
  rules.forEach((r, i) => {
    const bad = (why) => { throw new Error(`${RULES_FILE}: rule ${r?.id ?? i} ${why}`) }
    if (!r || typeof r.id !== 'string' || !r.id) bad('has no id')
    if (typeof r.family !== 'string' || !r.family) bad('has no family')
    if (!Array.isArray(r.files) || !r.files.length) bad('has no files globs')
    if (!(r.pattern instanceof RegExp)) bad('has no pattern RegExp')
  })
  return { found: true, rules }
}

const compile = (rules) => rules.map((r) => ({ ...r, inFiles: matcher(r.files), excluded: r.exclude ? matcher(r.exclude) : () => false }))

function hits(compiled, file, text) {
  return compiled.filter((r) => r.inFiles(file) && !r.excluded(file) && !(r.skip && r.skip.test(text)) && r.pattern.test(text))
}

/** [{ rule, family, file, line, hint }] for added lines ([{ file, line, text }]) that look like a copy. */
export function lintAddedLines(added, rules) {
  const compiled = compile(rules)
  const out = []
  for (const { file, line, text } of added) {
    for (const r of hits(compiled, file, text)) out.push({ rule: r.id, family: r.family, file, line, hint: r.hint ?? '' })
  }
  return out
}

/** The files git knows (tracked, and untracked but not ignored), repo-relative with forward slashes. */
export function projectFiles(root) {
  const r = spawnSync('git', ['-c', 'core.quotepath=false', 'ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true })
  if (r.status !== 0) throw new Error(`git ls-files failed: ${String(r.stderr).trim()}`)
  return [...new Set(String(r.stdout).split('\n').map((x) => x.trim().replace(/\\/g, '/')).filter(Boolean))]
}

/** The debt counts over the whole tree: { 'reuse-copy.<family>': { <file>: n } }. */
export function countCopies(root, rules) {
  const compiled = compile(rules)
  const out = {}
  if (!compiled.length) return out
  for (const file of projectFiles(root)) {
    const rs = compiled.filter((r) => r.inFiles(file) && !r.excluded(file))
    if (!rs.length) continue
    const abs = join(root, file)
    let text
    try {
      if (!statSync(abs).isFile()) continue
      text = readFileSync(abs, 'utf8')
    } catch {
      continue
    }
    for (const line of text.split(/\r?\n/)) {
      for (const r of rs) {
        if (r.skip && r.skip.test(line)) continue
        if (r.pattern.test(line)) {
          const kind = (out[`reuse-copy.${r.family}`] ??= {})
          kind[file] = (kind[file] ?? 0) + 1
        }
      }
    }
  }
  return out
}

/** Registry problems: a listed repo path that is gone (a glob needs one file), a rule family with no heading. */
export function checkRegistry({ registry, rules, exists, files }) {
  const problems = []
  const ids = new Set(registry.families.map((f) => f.id))
  const seen = new Set()
  for (const { path, line } of registry.paths) {
    if (seen.has(path)) continue
    seen.add(path)
    if (path.includes('*')) {
      const match = matcher(path)
      if (!files().some((f) => match(f))) problems.push(`REUSE: registry missing-path ${path} (line ${line}) — no file matches`)
    } else if (!exists(path.replace(/\/$/, ''))) problems.push(`REUSE: registry missing-path ${path} (line ${line})`)
  }
  for (const r of rules) {
    if (!ids.has(r.family)) problems.push(`REUSE: registry unknown-family ${r.family} (rule ${r.id}) — add a "### ${r.family} — …" heading`)
  }
  return problems
}

// The ratchet does the failing (KIT_DEBT: reuse-copy.<family> …); this check has no per-line finding.
export async function counts(ctx) {
  const { rules } = await loadRules(ctx.root)
  return countCopies(ctx.root, rules)
}
