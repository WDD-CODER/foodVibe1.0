// A copied style block: an added block of 2+ declarations with the same properties and values as a block in another
// component stylesheet or as an engine class (a class of reuse.globalStylesheet that starts with reuse.enginePrefix)
// → `style-duplicate-block <file>:<line> — same as <other file>:<line>`. counts() = the whole-tree debt
// `style-duplicate-block` (a block with an earlier twin) and `style-duplicate-class` (a class name defined in more than
// one component stylesheet), per file. No reuse.componentStylesheets (node-express) = nothing runs.
// Settings: reuse.* (kit.config.json); a kit-checks `--config` JSON "reuse" object may lay over them (tests).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { matcher } from '../diff-items.mjs'
import { projectFiles } from './reuse-copies.mjs'
import { parseBlocks, blockKey, classesOf } from '../style-blocks.mjs'

export const id = 'style-duplicates'

const SETTINGS = {
  componentStylesheets: ["src/app/**/*.scss"],
  globalStylesheet: "src/styles.scss" || '',
  enginePrefix: "c-" || '',
}

const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x) : [])
const order = (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line)

function settingsOf(ctx) {
  return { ...SETTINGS, ...(ctx?.config?.reuse ?? {}) }
}

/** Every block of the component stylesheets and, apart, the engine classes' blocks of the global stylesheet. */
function load(root, s) {
  const isSheet = matcher(list(s.componentStylesheets))
  const files = projectFiles(root)
  const read = (f) => {
    try { return parseBlocks(readFileSync(join(root, f), 'utf8'), f) } catch { return [] }
  }
  const component = files.filter((f) => isSheet(f) && f !== s.globalStylesheet).sort().flatMap(read)
  const engine = []
  if (s.globalStylesheet && s.enginePrefix && files.includes(s.globalStylesheet)) {
    for (const b of read(s.globalStylesheet)) {
      const name = classesOf(b).find((n) => n.startsWith(s.enginePrefix))
      if (name) engine.push({ ...b, engineClass: name })
    }
  }
  return { component, engine }
}

const byKey = (blocks) => {
  const m = new Map()
  for (const b of blocks.filter((x) => x.decls.length >= 2)) {
    const k = blockKey(b)
    m.set(k, [...(m.get(k) ?? []), b])
  }
  return m
}

export function run(ctx) {
  const s = settingsOf(ctx)
  if (!list(s.componentStylesheets).length) return []
  const isSheet = matcher(list(s.componentStylesheets))
  const added = new Map()
  for (const l of ctx.items.lines) {
    if (!isSheet(l.file) || l.file === s.globalStylesheet) continue
    if (!added.has(l.file)) added.set(l.file, new Set())
    added.get(l.file).add(l.line)
  }
  if (!added.size) return []
  const { component, engine } = load(ctx.root, s)
  const comp = byKey(component)
  const eng = byKey(engine)
  const isAdded = (b) => added.get(b.file)?.has(b.line) ?? false
  const findings = []
  for (const b of component.filter((x) => x.decls.length >= 2 && isAdded(x))) {
    const k = blockKey(b)
    const copy = (comp.get(k) ?? []).filter((o) => o.file !== b.file && (!isAdded(o) || order(o, b) < 0)).sort(order)[0]
    const cls = (eng.get(k) ?? [])[0]
    if (cls) findings.push({ rule: 'style-duplicate-block', file: b.file, line: b.line, hint: `same as the engine class .${cls.engineClass} (${cls.file}:${cls.line}) — use the class` })
    else if (copy) findings.push({ rule: 'style-duplicate-block', file: b.file, line: b.line, hint: `same as ${copy.file}:${copy.line}` })
  }
  return findings
}

/** { 'style-duplicate-block': { <file>: n }, 'style-duplicate-class': { <file>: n } } over the whole tree. */
export function counts(ctx) {
  const s = settingsOf(ctx)
  if (!list(s.componentStylesheets).length) return {}
  const { component, engine } = load(ctx.root, s)
  const eng = byKey(engine)
  const out = { 'style-duplicate-block': {}, 'style-duplicate-class': {} }
  const bump = (kind, file) => { out[kind][file] = (out[kind][file] ?? 0) + 1 }
  // A block counts when it has an earlier twin in another component stylesheet (a group of n copies = n - 1) or is an engine class's copy.
  for (const group of byKey(component).values()) {
    const sorted = [...group].sort(order)
    sorted.forEach((b, i) => {
      if (eng.has(blockKey(b)) || sorted.slice(0, i).some((o) => o.file !== b.file)) bump('style-duplicate-block', b.file)
    })
  }
  // A class name counts once per file when an earlier component stylesheet defines it too.
  const first = new Map()
  const seen = new Set()
  for (const b of component) {
    for (const name of classesOf(b)) {
      const key = `${b.file}|${name}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!first.has(name)) first.set(name, b.file)
      else if (first.get(name) !== b.file) bump('style-duplicate-class', b.file)
    }
  }
  return out
}
