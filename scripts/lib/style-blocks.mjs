/**
 * A stylesheet as declaration blocks — the shared input of the style-duplicates check.
 *
 *   import { parseBlocks, blockKey, classesOf } from './style-blocks.mjs'
 *   parseBlocks('.a { color: red; margin: 0 }', 'a.scss')   // [{ selector: '.a', file: 'a.scss', line: 1, decls: ['color:red', 'margin:0'] }]
 *
 * A block is a rule that holds declarations of its own. Nested rules (SCSS, native CSS nesting, at-rules) become blocks of
 * their own, their selector being the stack of preludes (`.a .b`, `@media (…) .a`); comments are dropped, declarations are
 * sorted, and a Sass variable or a block inside @keyframes / @font-face is left out. A block's key is its sorted
 * declarations, so the same rules in another order are the same block.
 * Built on the Style QA parser (scripts/styleqa/static-checks.mjs). Node built-ins only; no placeholders.
 */
import { parseStylesheet } from '../styleqa/static-checks.mjs'

const SKIP_AT = /^@(?:-\w+-)?(?:keyframes|font-face)\b/i

/** [{ selector, file, line, decls }] of every block with at least one declaration; decls are sorted `prop:value`. */
export function parseBlocks(text, file = '') {
  const blocks = []
  const open = []
  for (const item of parseStylesheet(text)) {
    const depth = item.stack.length
    if (item.kind === 'block') {
      open.length = Math.min(open.length, depth - 1)
      const skip = item.stack.some((p) => SKIP_AT.test(p))
      const b = { selector: item.stack.join(' '), file, line: item.line, decls: [], skip }
      open[depth - 1] = b
      blocks.push(b)
    } else {
      open.length = Math.min(open.length, depth)
      const b = depth > 0 ? open[depth - 1] : null
      if (!b || /^(\$|@)/.test(item.prop)) continue
      b.decls.push(`${item.prop.toLowerCase()}:${item.value}`)
    }
  }
  return blocks
    .filter((b) => !b.skip && b.decls.length)
    .map(({ skip, decls, ...b }) => ({ ...b, decls: [...decls].sort() }))
}

/** The key of a block: its sorted declarations. Two blocks with one key have the same properties and values. */
export const blockKey = (block) => block.decls.join(';')

/** The class names a block's selector defines (`.a:hover > .b` → a, b). */
export function classesOf(block) {
  return [...String(block.selector).matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1])
}
