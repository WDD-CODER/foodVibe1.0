// A raw design value on an added line of a component stylesheet: a colour, font-size, radius, shadow, blur or spacing
// literal where the project has a token for that kind. `style-raw-<kind>` names the token prefix to use. A kind is
// checked only when its styleqa.tokenPrefixes key is set and styleqa.tokenFiles holds a definition with that prefix.
// The same classifier as Style QA (scripts/styleqa/static-checks.mjs). counts() = the whole-tree debt `style-raw.<kind>`
// per file. No reuse.componentStylesheets (node-express) = nothing runs.
// Settings: styleqa.* and reuse.* (kit.config.json); a kit-checks `--config` JSON "styleqa" / "reuse" object may lay over them (tests).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { matcher } from '../diff-items.mjs'
import { projectFiles } from './reuse-copies.mjs'
import { LITERAL_KINDS, literalMatches, declarationOf, isTokenDefinition, globToRegExp } from '../../styleqa/static-checks.mjs'

export const id = 'style-raw-values'

const SETTINGS = {
  tokenPrefixes: {
    color: "--color-", fontSize: "--fs-", radius: "--radius-",
    shadow: "", blur: "", spacing: "",
  },
  tokenFiles: ["src/styles.scss"],
  componentStylesheets: ["src/app/**/*.scss"],
}

const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x) : [])
const bare = (name) => String(name).replace(/^(--|\$|@)/, '')
const DEF = /^\s*((?:--|\$|@)[\w-]+)\s*:/

function settingsOf(ctx) {
  const o = ctx?.config ?? {}
  return {
    tokenPrefixes: { ...SETTINGS.tokenPrefixes, ...(o.styleqa?.tokenPrefixes ?? {}) },
    tokenFiles: list(o.styleqa?.tokenFiles ?? SETTINGS.tokenFiles),
    componentStylesheets: list(o.reuse?.componentStylesheets ?? SETTINGS.componentStylesheets),
  }
}

/** The kinds this project can check: [{ kind, prefix }] — the prefix is set and a tokenFiles file defines one with it. */
function activeKinds(root, s, files) {
  const set = Object.entries(LITERAL_KINDS).filter(([, key]) => s.tokenPrefixes[key]).map(([kind, key]) => ({ kind, prefix: s.tokenPrefixes[key] }))
  if (!set.length || !s.tokenFiles.length) return { active: [], tokenFile: () => false }
  const res = s.tokenFiles.map(globToRegExp)
  const isTokenFile = (f) => res.some((r) => r.test(f))
  const defined = new Set()
  for (const f of files.filter(isTokenFile)) {
    let text
    try { text = readFileSync(join(root, f), 'utf8') } catch { continue }
    for (const l of text.split(/\r?\n/)) {
      const m = DEF.exec(l)
      if (m) for (const { prefix } of set) if (bare(m[1]).startsWith(bare(prefix))) defined.add(prefix)
    }
  }
  return { active: set.filter((k) => defined.has(k.prefix)), tokenFile: isTokenFile }
}

/** [{ kind, prefix, text }] for one line of a component stylesheet. */
function rawOn(lineText, active, allPrefixes) {
  const d = declarationOf(lineText)
  if (!d || isTokenDefinition(d.prop, allPrefixes)) return []
  const kinds = new Map(active.map((k) => [k.kind, k.prefix]))
  return literalMatches(d.prop, d.value).filter((m) => kinds.has(m.kind)).map((m) => ({ ...m, prefix: kinds.get(m.kind) }))
}

export function run(ctx) {
  const s = settingsOf(ctx)
  if (!s.componentStylesheets.length) return []
  const isSheet = matcher(s.componentStylesheets)
  const added = ctx.items.lines.filter((l) => isSheet(l.file))
  if (!added.length) return []
  const { active, tokenFile } = activeKinds(ctx.root, s, projectFiles(ctx.root))
  if (!active.length) return []
  const all = Object.values(s.tokenPrefixes).filter(Boolean)
  const findings = []
  for (const l of added) {
    if (tokenFile(l.file)) continue
    const seen = new Set()
    for (const m of rawOn(l.text, active, all)) {
      if (seen.has(m.kind)) continue
      seen.add(m.kind)
      findings.push({ rule: `style-raw-${m.kind}`, file: l.file, line: l.line, hint: `use a ${m.prefix}* token` })
    }
  }
  return findings
}

/** The whole-tree debt: { 'style-raw.<kind>': { <file>: n } } — one per line and kind. */
export function counts(ctx) {
  const s = settingsOf(ctx)
  if (!s.componentStylesheets.length) return {}
  const isSheet = matcher(s.componentStylesheets)
  const files = projectFiles(ctx.root)
  const { active, tokenFile } = activeKinds(ctx.root, s, files)
  if (!active.length) return {}
  const all = Object.values(s.tokenPrefixes).filter(Boolean)
  const out = {}
  for (const f of files.filter((x) => isSheet(x) && !tokenFile(x))) {
    let text
    try { text = readFileSync(join(ctx.root, f), 'utf8') } catch { continue }
    for (const l of text.split(/\r?\n/)) {
      for (const kind of new Set(rawOn(l, active, all).map((m) => m.kind))) {
        const k = (out[`style-raw.${kind}`] ??= {})
        k[f] = (k[f] ?? 0) + 1
      }
    }
  }
  return out
}
