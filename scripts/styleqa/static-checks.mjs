/**
 * Style QA static checks — stylesheet literals that bypass the design tokens, read without a browser:
 *
 *   S1  a media query with a literal px width (a breakpoint the project's breakpointPattern does not name)
 *   S2  a colour literal (#hex, rgb(), rgba(), hsl(), hsla()) outside the token definitions
 *   S3  a font-size literal (px, rem, em, pt)
 *
 * A token definition (a declaration whose name starts with a configured token prefix, as --x, $x or @x) and every
 * declaration in a tokenFiles file are never reported. S2 needs tokenPrefixes.color and S3 tokenPrefixes.fontSize:
 * without the prefix the check is off and the result says so in `notes`.
 *
 *   import { staticChecks, globToRegExp } from './static-checks.mjs'
 *   const { findings, notes, files } = staticChecks({ root, settings })
 *
 * Node built-ins only; no placeholders (tools import it).
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

// Dependency, build and tool folders: never the project's own stylesheets (a dot folder is a tool's cache).
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage'])

/** A glob of the kit's subset (`**`, `*`, `?`, a trailing `/` = everything under it) as an anchored RegExp. */
export function globToRegExp(glob) {
  let g = String(glob).replace(/\\/g, '/').replace(/^\.\//, '')
  if (g.endsWith('/')) g += '**'
  let re = ''
  for (let i = 0; i < g.length; i++) {
    const c = g[i]
    if (c === '*' && g[i + 1] === '*') {
      if (g[i + 2] === '/') {
        re += '(?:.*/)?'
        i += 2
      } else {
        re += '.*'
        i += 1
      }
    } else if (c === '*') re += '[^/]*'
    else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

/** Repo-relative posix paths under root (dependency, build and output folders left out). */
function walk(root, skip, dir = root, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const rel = relative(root, p).replace(/\\/g, '/')
    if (statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(e) && !e.startsWith('.') && !skip.some((s) => rel === s || rel.startsWith(`${s}/`))) walk(root, skip, p, out)
    } else out.push(rel)
  }
  return out
}

/** The stylesheets the checks read: the configured globs, else every *.<stylesheetExt> file. */
export function stylesheetFiles(root, settings) {
  const globs = settings.stylesheets?.length ? settings.stylesheets : [`**/*.${settings.stylesheetExt || 'css'}`]
  const res = globs.map(globToRegExp)
  const skip = [String(settings.outDir ?? '').replace(/\\/g, '/').replace(/\/+$/, '')].filter(Boolean)
  return walk(root, skip).filter((f) => res.some((r) => r.test(f))).sort()
}

/**
 * The blocks and declarations of a stylesheet, with line numbers. Comments and strings are skipped; nesting (SCSS,
 * native CSS nesting, at-rules) is followed with a stack of block preludes.
 * Yields { kind: 'block', prelude, line, stack } and { kind: 'decl', prop, value, line, stack }.
 */
export function parseStylesheet(text) {
  const out = []
  const stack = []
  let buf = ''
  let bufLine = null
  let line = 1
  const flush = () => {
    const d = buf.trim()
    if (d && !d.startsWith('@') && d.includes(':')) {
      const at = d.indexOf(':')
      out.push({ kind: 'decl', prop: d.slice(0, at).trim(), value: d.slice(at + 1).trim().replace(/\s+/g, ' '), line: bufLine, stack: [...stack] })
    }
    buf = ''
    bufLine = null
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      const stop = end < 0 ? text.length : end + 2
      line += (text.slice(i, stop).match(/\n/g) ?? []).length
      i = stop - 1
      continue
    }
    if (c === '/' && text[i + 1] === '/' && (buf === '' || /\s$/.test(buf))) {
      const end = text.indexOf('\n', i)
      i = (end < 0 ? text.length : end) - 1
      continue
    }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < text.length && text[j] !== c && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1
      if (bufLine === null) bufLine = line
      buf += text.slice(i, j + 1)
      i = j
      continue
    }
    if (c === '{') {
      const prelude = buf.trim().replace(/\s+/g, ' ')
      stack.push(prelude)
      out.push({ kind: 'block', prelude, line: bufLine ?? line, stack: [...stack] })
      buf = ''
      bufLine = null
    } else if (c === '}') {
      flush()
      stack.pop()
    } else if (c === ';') flush()
    else {
      if (c === '\n') line++
      if (bufLine === null && !/\s/.test(c)) bufLine = line
      buf += c
    }
  }
  return out
}

const PX_IN_MEDIA = /(?<![\w.-])\d+(?:\.\d+)?px\b/
const COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?)\(/
const FONT_SIZE = /(?<![\w.$-])\d*\.?\d+(?:px|rem|em|pt)\b/
const LENGTH = /(?<![\w.$-])(\d*\.?\d+)(?:px|rem|em)\b/g
const BLUR = /\bblur\(\s*(\d*\.?\d+)(?:px|rem|em)\b/
const bare = (name) => String(name).replace(/^(--|\$|@)/, '')
/** The kinds of raw value, each with the styleqa.tokenPrefixes key that holds its token prefix. */
export const LITERAL_KINDS = Object.freeze({ color: 'color', 'font-size': 'fontSize', radius: 'radius', shadow: 'shadow', blur: 'blur', spacing: 'spacing' })
const nonZeroLength =(value) => [...String(value).matchAll(LENGTH)].find((m) => Number(m[1]) !== 0)

/**
 * The raw design values of one declaration: [{ kind, text }] (kind: color, font-size, radius, shadow, blur, spacing).
 * A colour literal counts in any property; the other kinds read their own properties only. 0, a percentage, auto and a
 * var() / token reference are never a literal; a length of 0 (0px) is not one either.
 * Shared with the diff check scripts/lib/checks/style-raw-values.mjs, so both agree on what a raw value is.
 */
export function literalMatches(prop, value) {
  const p = String(prop).toLowerCase()
  const v = String(value)
  const out = []
  const color = COLOR.exec(v)
  if (color) out.push({ kind: 'color', text: color[0].endsWith('(') ? `${color[0]}…)` : color[0] })
  if (p === 'font-size') {
    const m = FONT_SIZE.exec(v)
    if (m) out.push({ kind: 'font-size', text: m[0] })
  } else if (/^border(-(top|bottom|start|end)-(left|right|start|end))?-radius$/.test(p)) {
    const m = nonZeroLength(v)
    if (m) out.push({ kind: 'radius', text: m[0] })
  } else if (p === 'box-shadow' || p === 'text-shadow') {
    const m = nonZeroLength(v)
    if (m) out.push({ kind: 'shadow', text: m[0] })
  } else if (p === 'filter' || p === 'backdrop-filter') {
    const m = BLUR.exec(v)
    if (m && Number(m[1]) !== 0) out.push({ kind: 'blur', text: m[0] })
  } else if (/^(margin|padding)(-[a-z-]+)?$/.test(p) || p === 'gap' || p === 'row-gap' || p === 'column-gap' || p === 'grid-gap') {
    const m = nonZeroLength(v)
    if (m) out.push({ kind: 'spacing', text: m[0] })
  }
  return out
}

/** { prop, value } of a one-line declaration (`  margin: 8px; // note`), else null (selector, comment, at-rule, brace). */
export function declarationOf(line) {
  const t = String(line).replace(/\/\*.*?\*\//g, '').replace(/(^|\s)\/\/.*$/, '').trim()
  if (!t || t.includes('{') || t.includes('}') || (t.startsWith('@') && !/^@[\w-]+\s*:/.test(t))) return null
  const m = /^((?:--|\$|@)?[a-zA-Z_][\w-]*)\s*:\s*(.+?)\s*;?$/.exec(t)
  return m ? { prop: m[1], value: m[2].replace(/\s+/g, ' ') } : null
}

const tokenPrefixList = (settings) => Object.values(settings.tokenPrefixes ?? {}).filter(Boolean)

/** The kinds of raw values on one stylesheet line (`color: #fff;` → ['color']); a line that is no declaration, or a token definition, has none. */
export function literalKinds(line, settings = {}) {
  const d = declarationOf(line)
  if (!d || isTokenDefinition(d.prop, tokenPrefixList(settings))) return []
  return [...new Set(literalMatches(d.prop, d.value).map((m) => m.kind))]
}

/** True when a declaration defines a token: its name has a variable sigil and starts with a configured prefix. */
export function isTokenDefinition(prop, prefixes) {
  if (!/^(--|\$|@)/.test(prop)) return false
  return prefixes.some((p) => p && bare(prop).startsWith(bare(p)))
}

/** The static findings of the configured stylesheets: { findings, notes, files }. */
export function staticChecks({ root, settings }) {
  const prefixes = settings.tokenPrefixes ?? {}
  const all = tokenPrefixList(settings)
  const s2 = Boolean(prefixes.color)
  const s3 = Boolean(prefixes.fontSize)
  const notes = []
  if (!s2 && !s3) notes.push('S2/S3 off: no token prefixes configured')
  else if (!s2) notes.push('S2 off: no colour token prefix configured')
  else if (!s3) notes.push('S3 off: no font-size token prefix configured')
  let bp = null
  if (settings.breakpointPattern) bp = new RegExp(settings.breakpointPattern)
  const tokenRes = (settings.tokenFiles ?? []).map(globToRegExp)
  const files = stylesheetFiles(root, settings)
  const findings = []
  const add = (check, file, item, prop, message) => {
    const selector = item.stack.join(' / ')
    findings.push({
      layer: 'static', check, page: '', state: '', locator: `${file} | ${selector} | ${prop}`,
      file, line: item.line, selector, property: prop, value: item.value ?? item.prelude, message, widths: [], component: '',
    })
  }
  for (const file of files) {
    const tokenFile = tokenRes.some((r) => r.test(file))
    const text = readFileSync(join(root, file), 'utf8')
    for (const item of parseStylesheet(text)) {
      if (item.kind === 'block') {
        if (!/^@media\b/i.test(item.prelude) || (bp && bp.test(item.prelude))) continue
        const m = PX_IN_MEDIA.exec(item.prelude)
        if (m) add('S1', file, item, '@media', `media query uses the literal width ${m[0]} — use a breakpoint variable`)
        continue
      }
      if (tokenFile || isTokenDefinition(item.prop, all)) continue
      for (const m of literalMatches(item.prop, item.value)) {
        if (m.kind === 'color' && s2) add('S2', file, item, item.prop, `${item.prop} uses the colour literal ${m.text} — use a colour token (${prefixes.color}…)`)
        else if (m.kind === 'font-size' && s3) add('S3', file, item, item.prop, `font-size uses the literal ${m.text} — use a font-size token (${prefixes.fontSize}…)`)
      }
    }
  }
  return { findings, notes, files }
}
