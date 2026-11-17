/**
 * The family registry (path `paths.reuseRegistry`, default docs/brain/component-families.md): one
 * `### <family-id> — <title>` heading per family, bullet fields below it (`selector`, `when`, `files`), and one header
 * line `Reuse enforced from plan: NNN`. Every backticked repo path in the file is a path that must exist.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'

export const REGISTRY_PATH = "docs/brain/component-families.md" || 'docs/brain/component-families.md'

const FIELD = /^\s*[-*]\s+(selector|when|files)\s*:\s*(.*)$/i
const REPO_PATH_RE = /^[\w.@-]+(?:\/[\w.@-]+)+\/?$/

/** { enforcedFrom, families: [{ id, title, line, end (last line of its block), selector, when, files }], paths: [{ path, line }] } */
export function parseRegistry(text) {
  const enforced = String(text).match(/^(?:Reuse enforced|Enforced) from plan:\s*(\d+)/m)
  const families = []
  const paths = []
  let cur = null
  let field = null
  let last = null
  const all = String(text).split(/\r?\n/)
  all.forEach((l, i) => {
    if (/^#{1,6} /.test(l) && last) { last.end = i; last = null }
    const h = l.match(/^### ([a-z0-9][a-z0-9-]*)\s*[—-]\s*(.*)$/)
    if (h) {
      cur = { id: h[1], title: h[2].trim(), line: i + 1, end: all.length, selector: '', when: '', files: '' }
      families.push(cur)
      last = cur
      field = null
    } else if (/^#{1,3} /.test(l)) {
      cur = null
      field = null
    } else if (cur) {
      const f = l.match(FIELD)
      if (f) {
        field = f[1].toLowerCase()
        cur[field] = f[2].trim()
      } else if (field && /^\s{2,}\S/.test(l)) cur[field] = `${cur[field]} ${l.trim()}`.trim()
      else if (!l.trim() || /^\s*[-*]\s/.test(l)) field = null
    }
    for (const m of l.matchAll(/`([^`]+)`/g)) if (REPO_PATH_RE.test(m[1])) paths.push({ path: m[1], line: i + 1 })
  })
  return { enforcedFrom: enforced ? Number(enforced[1]) : null, families, paths }
}

/** The parsed registry of a repo, or null when the file is missing. `override` replaces the configured path (tests). */
export function readRegistryFile(root, override) {
  const path = String(override || REGISTRY_PATH).replace(/\\/g, '/')
  const abs = isAbsolute(path) ? path : join(root, path)
  if (!existsSync(abs)) return null
  return parseRegistry(readFileSync(abs, 'utf8'))
}
