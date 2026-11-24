/**
 * Style guard (plan 703): does a set of files use the shared style pieces and the design tokens?
 *
 *   import { styleFindings } from './style-guard.mjs'
 *   const findings = styleFindings(['src/app/x/x.scss', 'src/app/x/x.html'], { allow: [{ rule, file, why }] })
 *
 * Stylesheet rules: colour, font-size, font-weight, radius, shadow, space-scale, physical, engine-in-component.
 * Template rules: hand-drawn-dialog, local-empty, local-loading, bare-input.
 * Node built-ins plus parseStylesheet from the styleqa checks.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseStylesheet } from '../styleqa/static-checks.mjs'

const COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?)\(/
const LENGTH = /(?<![\w.$-])(\d*\.?\d+)(px|rem|em|pt)\b/g
const SPACE_REM = new Set([0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3])
const SPACE_PX = new Set([4, 8, 12, 16, 20, 24, 32, 40, 48])
const SPACE_PROP = /^(?:padding|margin|inset)(?:-.+)?$|^(?:gap|row-gap|column-gap)$/
const PHYSICAL_PROP = /^(?:(?:margin|padding)-(?:left|right|top|bottom)|border-(?:left|right|top|bottom)(?!.*radius).*|left|right|top|bottom|width|height|min-width|max-width|min-height|max-height)$/

const posix = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '')

function hasLiteralLength(value) {
  return [...String(value).matchAll(LENGTH)].some((m) => Number(m[1]) !== 0)
}

function onSpaceScale(value) {
  return [...String(value).matchAll(LENGTH)].some((m) => {
    const n = Number(m[1])
    if (m[2] === 'rem') return SPACE_REM.has(n)
    if (m[2] === 'px') return SPACE_PX.has(n)
    return false
  })
}

function declRules(prop, value) {
  const rules = []
  if (COLOR.test(value) || /^(?:white|black)$/i.test(value)) rules.push('colour')
  if (prop === 'font-size' && hasLiteralLength(value)) rules.push('font-size')
  if (prop === 'font-weight' && (/^\d+$/.test(value) || /^bold$/i.test(value))) rules.push('font-weight')
  if (/^border(?:-[a-z]+)*-radius$/.test(prop) && hasLiteralLength(value)) rules.push('radius')
  if (prop === 'box-shadow' && !/^var\([^()]*\)$/.test(value) && !/^none$/i.test(value)) rules.push('shadow')
  if (SPACE_PROP.test(prop) && onSpaceScale(value)) rules.push('space-scale')
  if (PHYSICAL_PROP.test(prop)) rules.push('physical')
  else if (prop === 'text-align' && /^(?:left|right)$/i.test(value)) rules.push('physical')
  else if (prop === 'float' && /^(?:left|right)$/i.test(value)) rules.push('physical')
  return rules
}

function stylesheetFindings(file, text) {
  const out = []
  for (const node of parseStylesheet(text)) {
    if (node.stack.some((p) => /^@media\s+print\b/.test(p))) continue
    if (node.kind === 'block') {
      if (file !== 'src/styles.scss' && /^\.c-/.test(node.prelude)) {
        out.push({ file, line: node.line, rule: 'engine-in-component', text: node.prelude })
      }
      continue
    }
    if (node.prop.startsWith('--') || node.prop.startsWith('$')) continue
    for (const rule of declRules(node.prop, node.value)) {
      out.push({ file, line: node.line, rule, text: `${node.prop}: ${node.value}` })
    }
  }
  return out
}

function templateFindings(file, text) {
  const out = []
  const lineAt = (i) => text.slice(0, i).split('\n').length
  const add = (i, rule, snippet) => out.push({ file, line: lineAt(i), rule, text: snippet.replace(/\s+/g, ' ').trim() })
  const loadingList = file.split('/').pop().includes('loading-list')

  for (const m of text.matchAll(/\bclass="([^"]*)"/g)) {
    const tokens = m[1].split(/\s+/).filter(Boolean)
    if (tokens.includes('c-modal-overlay')) add(m.index, 'hand-drawn-dialog', m[0])
    if (tokens.some((t) => !t.startsWith('c-empty-state') && (t.includes('empty') || t === 'no-results'))) add(m.index, 'local-empty', m[0])
    if (!loadingList && tokens.some((t) => t.includes('loading') || t.includes('spinner'))) add(m.index, 'local-loading', m[0])
  }
  for (const m of text.matchAll(/\brole="dialog"/g)) add(m.index, 'hand-drawn-dialog', m[0])

  const hasInputClass = (tag) => {
    const c = /\bclass="([^"]*)"/.exec(tag)
    return !!c && c[1].split(/\s+/).some((t) => t.startsWith('c-input'))
  }
  for (const m of text.matchAll(/<input\b[^>]*>/g)) {
    const type = /\btype="([^"]*)"/.exec(m[0])?.[1] ?? 'text'
    if (/^(?:checkbox|radio|hidden|file)$/i.test(type)) continue
    if (!hasInputClass(m[0])) add(m.index, 'bare-input', m[0])
  }
  for (const m of text.matchAll(/<textarea\b[^>]*>/g)) {
    if (!hasInputClass(m[0])) add(m.index, 'bare-input', m[0])
  }
  return out
}

/** @returns {{ file: string, line: number, rule: string, text: string }[]} sorted by file and line */
export function styleFindings(files, { root = process.cwd(), allow = [] } = {}) {
  for (const a of allow) {
    if (typeof a?.why !== 'string' || !a.why.trim()) throw new Error(`style-guard: allow entry for ${a?.rule}/${a?.file} needs a non-empty why`)
  }
  const found = []
  for (const f of files) {
    const file = posix(f)
    const text = readFileSync(join(root, file), 'utf8')
    if (file.endsWith('.scss')) found.push(...stylesheetFindings(file, text))
    else if (file.endsWith('.html')) found.push(...templateFindings(file, text))
  }
  const allowed = (f) => allow.some((a) => a.rule === f.rule && posix(a.file) === f.file && (a.line === undefined || a.line === f.line))
  return found
    .filter((f) => !allowed(f))
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line))
}
