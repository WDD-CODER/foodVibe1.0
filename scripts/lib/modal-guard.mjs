/**
 * Modal guard (plan 720): does a set of files make a bottom sheet, a top sheet, or a popup card that cannot scroll?
 *
 *   import { modalFindings } from './modal-guard.mjs'
 *   const findings = modalFindings(['src/styles.scss', 'src/app/x/x.html'], { allow: [{ rule, file, selector, why }] })
 *
 * Stylesheet rules: bottom-sheet, top-sheet, modal-no-scroll. Template rules: sheet-binding.
 * Node built-ins plus parseStylesheet from the styleqa checks.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseStylesheet } from '../styleqa/static-checks.mjs'

const posix = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '')
const BASE_CARD_CLASSES = ['c-modal-card', 'c-modal-body']
const SHEETISH = /overlay|backdrop|sheet|modal/i
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const clean = (value) => String(value).replace(/\s*!important\s*$/i, '').trim()
const isZero = (value) => /^0(?:\.0+)?(?:px|rem|em|pt|%)?$/.test(clean(value))
const nonZero = (value) => {
  const v = clean(value)
  if (v === '' || /^(?:none|initial|unset|inherit)$/i.test(v)) return false
  return v.split(/\s+/).some((part) => !isZero(part))
}

/** Corner radii (longhands only) of one block: hasStart / hasEnd say a start (top) / end (bottom) corner has a non-zero radius. */
function radii(d) {
  const start = ['border-start-start-radius', 'border-start-end-radius', 'border-top-left-radius', 'border-top-right-radius']
  const end = ['border-end-start-radius', 'border-end-end-radius', 'border-bottom-left-radius', 'border-bottom-right-radius']
  const hasStart = start.some((p) => d.has(p) && nonZero(d.get(p)))
  const hasEnd = end.some((p) => d.has(p) && nonZero(d.get(p)))
  const bottomZero = ['border-end-start-radius', 'border-end-end-radius'].every((p) => d.has(p) && isZero(d.get(p)))
  return { hasStart, hasEnd, bottomZero }
}

function scanBlock(file, rec, cardRe, out) {
  const { prelude, line, decls: d, fullSelector } = rec
  const push = (rule, text) => out.push({ file, line, rule, selector: prelude, text })
  const r = radii(d)

  if (/\.m-sheet/.test(prelude)) push('bottom-sheet', `${prelude} (.m-sheet helper)`)
  const alignItems = d.get('align-items')
  if (alignItems !== undefined && /^(?:flex-)?end$/i.test(clean(alignItems)) && SHEETISH.test(fullSelector)) {
    push('bottom-sheet', `align-items: ${clean(alignItems)}`)
  }
  if (r.bottomZero && r.hasStart) push('bottom-sheet', 'rounded top corners, square bottom corners')
  const fixed = /^fixed$/i.test(clean(d.get('position') ?? ''))
  if (fixed && (d.has('inset-block-end') || d.has('bottom')) && r.hasStart) {
    push('bottom-sheet', 'position: fixed at the bottom with a rounded top')
  }
  const insetBlock = d.get('inset-block')
  if (insetBlock !== undefined && /^auto\s+\S+/i.test(clean(insetBlock)) && d.has('inset-inline')) {
    push('bottom-sheet', `inset-block: ${clean(insetBlock)}`)
  }

  if (fixed && d.has('inset-inline') && d.has('inset-block-start') && isZero(d.get('inset-block-start')) && r.hasEnd && !r.hasStart) {
    push('top-sheet', 'position: fixed at the top with a rounded bottom')
  }

  if (cardRe.test(prelude)) {
    const overflow = d.get('overflow')
    const overflowY = d.get('overflow-y')
    const maxBlock = d.get('max-block-size')
    const bad =
      (overflow !== undefined && /^(?:hidden|visible)(?:\s+(?:hidden|visible))?$/i.test(clean(overflow))) ||
      (overflowY !== undefined && /^(?:hidden|visible)$/i.test(clean(overflowY))) ||
      (maxBlock !== undefined && /^none$/i.test(clean(maxBlock)))
    if (bad) push('modal-no-scroll', `${prelude} turns popup scrolling off`)
  }
}

function stylesheetFindings(file, text, cardRe) {
  const out = []
  const records = []
  const open = []
  for (const node of parseStylesheet(text)) {
    if (node.kind === 'block') {
      const atRule = node.prelude.startsWith('@')
      // A nested @media / @supports block is scanned as the rule it sits in (its own declarations only).
      const nested = atRule && /^@(?:media|supports|container|layer)\b/.test(node.prelude)
      const owner = nested ? node.stack.slice(0, -1).reverse().find((p) => !p.startsWith('@')) : undefined
      const rec = {
        prelude: nested && owner !== undefined ? owner : node.prelude,
        line: node.line,
        decls: new Map(),
        printed: node.stack.some((p) => /^@media\s+print\b/.test(p)),
        fullSelector: node.stack.filter((p) => !p.startsWith('@')).join(' ')
      }
      open.length = node.stack.length - 1
      open[node.stack.length - 1] = rec
      if (!atRule || (nested && owner !== undefined)) records.push(rec)
    } else {
      const rec = open[node.stack.length - 1]
      if (rec) rec.decls.set(node.prop, node.value)
    }
  }
  for (const rec of records) if (!rec.printed) scanBlock(file, rec, cardRe, out)
  return out
}

function templateFindings(file, text) {
  const out = []
  text.split('\n').forEach((l, i) => {
    if (/\[sheet\]\s*=\s*"true"/.test(l)) out.push({ file, line: i + 1, rule: 'sheet-binding', selector: '[sheet]', text: l.trim() })
    if (/class\s*=\s*"[^"]*\bm-sheet\b[^"]*"/.test(l)) out.push({ file, line: i + 1, rule: 'sheet-binding', selector: 'm-sheet', text: l.trim() })
  })
  return out
}

function cardClassesOf(html) {
  const found = []
  for (const m of html.matchAll(/<app-modal-shell\b[^>]*?\bcardClass\s*=\s*"([^"]*)"/g)) {
    for (const t of m[1].split(/\s+/)) if (/^[A-Za-z_][\w-]*$/.test(t)) found.push(t)
  }
  return found
}

/**
 * Plan 757: the text of src/styles.scss without the bottom-sheet rules the Human approved removing on 2026-11-26
 * (the append-only tests compare with a base that may still hold them)
 */
export function withoutRetiredSheetRules(text) {
  return text
    .replace(/\r?\n\r?\n  \/\* Tablet \+ mobile: the same panel[\s\S]*?\r?\n  &\.as-modal \{[\s\S]*?\r?\n  \}(?=\r?\n\})/, '')
    .replace(/  \/\* Centred dialogs become bottom sheets\. \*\/\r?\n  \.m-sheet \{[^}]*\}\r?\n\r?\n  \.m-sheet-card \{[^}]*\}\r?\n\r?\n/, '')
    .replace(/ The tablet\/phone modal variant \(\.inline-edit-panel\.as-modal,\r?\n\s*position: fixed, z-index 1001\) is excluded: it already sits above its backdrop and must stay fixed\. \*\//, ' */')
    .replace('.inline-edit-panel:not(.as-modal):has(.c-dropdown)', '.inline-edit-panel:has(.c-dropdown)')
}

export function modalFindings(files, { root = process.cwd(), allow = [], cardClasses = [] } = {}) {
  for (const a of allow) {
    if (!a || typeof a.why !== 'string' || a.why.trim() === '') throw new Error('modalFindings: an allow entry needs a why')
  }
  const texts = files.map((f) => ({ file: posix(f), text: readFileSync(join(root, f), 'utf8') }))
  const classes = new Set([...BASE_CARD_CLASSES, ...cardClasses])
  for (const { file, text } of texts) if (file.endsWith('.html')) for (const c of cardClassesOf(text)) classes.add(c)
  const cardRe = new RegExp(`\\.(?:${[...classes].map(escapeRe).join('|')})(?![\\w-])`)
  const out = []
  for (const { file, text } of texts) {
    if (file.endsWith('.html')) out.push(...templateFindings(file, text))
    else if (file.endsWith('.scss') || file.endsWith('.css')) out.push(...stylesheetFindings(file, text, cardRe))
  }
  const allowed = (f) => allow.some((a) => a.rule === f.rule && posix(a.file) === f.file && a.selector === f.selector)
  return out
    .filter((f) => !allowed(f))
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line))
}
