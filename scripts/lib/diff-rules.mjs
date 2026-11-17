/**
 * "A file that matches X must also show Y" — rule data checked against what a branch adds. Product defaults
 * and any later check write rules as data and reuse this engine.
 *
 *   import { runRules } from './diff-rules.mjs'
 *   const findings = runRules({ root, items, rules })   // items from diff-items.mjs addedItems()
 *
 * A rule:
 *   id        stable id, printed in the finding
 *   files     globs of the changed files the rule looks at (added or modified)
 *   exclude   globs that skip a file (optional)
 *   on        'file' (default): `trigger` is tested on the whole file; 'added': only on the branch's added lines
 *   trigger   RegExp source (multiline): the file needs the evidence when this matches
 *   evidence  RegExp source (multiline) that must match the file itself, or one file matching `in`.
 *             `{stem}` is replaced by the file's name up to its first dot (escaped), e.g. `{stem}` of
 *             src/app/edit-user.component.ts is `edit-user`
 *   in        globs of other files (tracked or untracked) where the evidence may be instead (optional)
 *   hint      what to use instead, one line
 * A finding: { rule, file, line, hint } — line is the first added line that matches the trigger (else the first file line
 * that does, else 1). A bad RegExp throws naming the rule.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { spawnSync } from 'node:child_process'
import { matcher } from './diff-items.mjs'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function regex(rule, field, source, stem) {
  try {
    return new RegExp(String(source).replaceAll('{stem}', esc(stem)), 'm')
  } catch (e) {
    throw new Error(`rule ${rule.id}: ${field} is not a valid regular expression: ${e.message}`)
  }
}

function repoFiles(root) {
  const r = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true })
  return String(r.stdout ?? '').split('\n').map((x) => x.trim()).filter(Boolean)
}

/**
 * `read(path)` (optional) returns a repo file's text — a caller or a test may inject one; the default reads `root`.
 * `list()` (optional) returns every repo path the `in` globs are matched against; the default asks git.
 */
export function runRules({ root, items, rules = [], read = null, list = null }) {
  const findings = []
  let all = null
  read ??= (p) => {
    const abs = join(root, p)
    return existsSync(abs) ? readFileSync(abs, 'utf8') : ''
  }
  list ??= () => repoFiles(root)
  for (const rule of rules) {
    if (!rule?.id || !rule.files || !rule.trigger || !rule.evidence) throw new Error(`rule ${rule?.id ?? '(no id)'}: id, files, trigger and evidence are required`)
    const inFiles = matcher(rule.files)
    const skip = matcher(rule.exclude ?? [])
    for (const f of items.files) {
      if (f.status === 'renamed' && rule.on === 'added') continue
      if (!inFiles(f.path) || skip(f.path)) continue
      const stem = basename(f.path).split('.')[0]
      const trigger = regex(rule, 'trigger', rule.trigger, stem)
      const text = read(f.path)
      const added = items.lines.filter((l) => l.file === f.path)
      const hit = rule.on === 'added' ? added.some((l) => trigger.test(l.text)) || trigger.test(added.map((l) => l.text).join('\n')) : trigger.test(text)
      if (!hit) continue
      const evidence = regex(rule, 'evidence', rule.evidence, stem)
      if (evidence.test(text)) continue
      if (rule.in) {
        all ??= list()
        const where = matcher(rule.in)
        if (all.some((p) => p !== f.path && where(p) && evidence.test(read(p)))) continue
      }
      const line = added.find((l) => trigger.test(l.text))?.line ?? (text.split(/\r?\n/).findIndex((l) => trigger.test(l)) + 1 || 1)
      findings.push({ rule: rule.id, file: f.path, line, hint: rule.hint ?? '' })
    }
  }
  return findings
}
