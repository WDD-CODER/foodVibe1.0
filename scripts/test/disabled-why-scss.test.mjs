// Plan 758 (default `disabled-explains-why`): a control that carries appDisabledWhy is not natively disabled, so a
// stylesheet that styles it only through `:disabled` lets a blocked control look active. For every component whose
// template has such a control, its stylesheet (partials included) must give the blocked state
// (`aria-disabled="true"` or `.is-disabled`) the same treatment.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join, dirname, resolve, posix } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

/** The value the global `.is-disabled` dims to: an opacity at or under it already reads as blocked. */
const BLOCKED_OPACITY = 0.5

function walk(dir, ext, out = []) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) walk(p, ext, out)
    else if (p.endsWith(ext)) out.push(p)
  }
  return out
}

/** Every element of a template that carries `[appDisabledWhy]`: its tag and its static and bound classes. */
export function convertedControls(html) {
  const tag = /<([a-zA-Z][\w-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*\/?>/g
  const out = []
  for (const [, name, attrs] of html.replace(/<!--[\s\S]*?-->/g, '').matchAll(tag)) {
    if (!/\[appDisabledWhy\]/.test(attrs)) continue
    const classes = [...attrs.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean)
    classes.push(...[...attrs.matchAll(/\[class\.([\w-]+)\]/g)].map((m) => m[1]))
    out.push({ tag: name, classes: new Set(classes) })
  }
  return out
}

/** Splits on a separator that is not inside (), [] or quotes. */
function splitTop(text, separator) {
  const parts = []
  let depth = 0
  let quote = ''
  let current = ''
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = ''
    } else if (ch === '"' || ch === "'") quote = ch
    else if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    else if (depth === 0 && separator.test(ch)) {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  parts.push(current)
  return parts.map((p) => p.trim()).filter(Boolean)
}

/** A small reader for the nesting this project writes: flat rules with full selectors, their declarations and layer. */
export function flatRules(scss) {
  const text = scss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/#\{[^}]*\}/g, 'x')
  const rules = []
  const stack = [{ selectors: [''], layered: false, skip: false, decls: new Map() }]
  let buffer = ''
  const declare = () => {
    const m = /^\s*([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(buffer)
    if (m) stack.at(-1).decls.set(m[1], m[2])
    buffer = ''
  }
  for (const ch of text) {
    if (ch === ';') declare()
    else if (ch === '{') {
      const header = buffer.trim().replace(/\s+/g, ' ')
      const parent = stack.at(-1)
      const frame = { selectors: parent.selectors, layered: parent.layered, skip: parent.skip, decls: new Map() }
      if (header.startsWith('@')) {
        if (header.startsWith('@layer')) frame.layered = true
        if (/^@(keyframes|mixin|function|font-face)/.test(header)) frame.skip = true
      } else {
        frame.selectors = parent.selectors.flatMap((outer) =>
          splitTop(header, /,/).map((inner) =>
            inner.includes('&') ? inner.replaceAll('&', outer) : `${outer} ${inner}`.trim()
          )
        )
      }
      stack.push(frame)
      buffer = ''
    } else if (ch === '}') {
      declare()
      const frame = stack.pop()
      if (!frame.skip && frame.decls.size) {
        for (const selector of frame.selectors) {
          if (selector) rules.push({ selector: normalise(selector), layered: frame.layered, decls: frame.decls })
        }
      }
    } else buffer += ch
  }
  return rules
}

function normalise(selector) {
  return selector.replace(/\s+/g, ' ').replace(/\[([\w-]+)=["']([^"']*)["']\]/g, '[$1=$2]').trim()
}

const withoutNot = (s) => s.replace(/:(not|has)\((?:[^()]|\([^()]*\))*\)/g, '')
const NATIVE = /:disabled|\[disabled\]/
const BLOCKED = /\[aria-disabled=true\]|\.is-disabled/

/** The last compound of a selector: the element the rule styles. */
const subject = (selector) => splitTop(selector, /[\s>+~]/).at(-1) ?? ''

/** Does this compound name this control? Every class it requires must be one the control can carry. */
function matches(compound, control) {
  const bare = withoutNot(compound)
  const classes = [...bare.replace(/\[[^\]]*\]/g, '').matchAll(/\.([\w-]+)/g)]
    .map((m) => m[1])
    .filter((c) => c !== 'is-disabled')
  const tag = /^[a-zA-Z][\w-]*/.exec(bare)?.[0]
  if (!classes.length && !tag) return false
  if (tag && tag !== control.tag) return false
  return classes.every((c) => control.classes.has(c))
}

const namesClass = (compound, control) => [...control.classes].some((c) => withoutNot(compound).includes(`.${c}`))

/** The problems one stylesheet has with the converted controls of its template. */
export function problems(controls, scss) {
  const rules = flatRules(scss)
  const found = new Set()
  const blocked = rules.filter((r) => BLOCKED.test(withoutNot(r.selector)))
  const blockedFor = (control) => blocked.filter((r) => matches(subject(r.selector), control))

  for (const rule of rules) {
    const compound = subject(rule.selector)
    for (const control of controls) {
      if (!matches(compound, control)) continue

      // 1. A `:disabled` look needs the same selector for the blocked state.
      if (NATIVE.test(withoutNot(rule.selector))) {
        const twins = [`[aria-disabled=true]`, '.is-disabled'].map((state) =>
          rule.selector.replace(/:disabled|\[disabled\]/g, state)
        )
        if (!rules.some((r) => twins.includes(r.selector))) {
          found.add(`${rule.selector}: no rule for the blocked state`)
        }
        continue
      }

      // 2. A hover look that skips `:disabled` must skip, or undo, the blocked state too.
      if (/:(hover|active)/.test(compound) && /:not\((:disabled|\[disabled\])\)/.test(compound)) {
        const guarded = /:not\((\[aria-disabled=true\]|\.is-disabled)\)/.test(compound)
        const undone = blockedFor(control).some(
          (r) => /:(hover|active)/.test(r.selector) || [...r.decls.keys()].some((k) => k.startsWith('--'))
        )
        if (!guarded && !undone) found.add(`${rule.selector}: the hover look also applies to a blocked control`)
      }

      // 3. A component rule outside @layer beats the global `.is-disabled`: the blocked state must set it again.
      if (rule.layered || BLOCKED.test(rule.selector) || !namesClass(compound, control)) continue
      const hover = /:hover(?!:not)/.test(withoutNot(compound))
      for (const property of ['cursor', 'opacity']) {
        const value = rule.decls.get(property)
        if (value === undefined || value === 'not-allowed') continue
        if (property === 'opacity' && !(Number(value) > BLOCKED_OPACITY)) continue
        const restated = blockedFor(control).some(
          (r) => r.decls.has(property) && (!hover || property === 'cursor' || r.selector.includes(':hover'))
        )
        if (!restated) found.add(`${rule.selector}: ${property}: ${value} also applies to a blocked control`)
      }
    }
  }
  return [...found]
}

/** A stylesheet with the local partials it pulls in. */
function stylesheet(path, seen = new Set()) {
  if (seen.has(path)) return ''
  seen.add(path)
  const text = read(path)
  let out = ''
  for (const [, target] of text.matchAll(/@(?:use|import)\s+['"](\.[^'"]+)['"]/g)) {
    const joined = posix.join(posix.dirname(path), target.replace(/\.scss$/, ''))
    const name = posix.basename(joined)
    const file = [`${posix.dirname(joined)}/_${name}.scss`, `${joined}.scss`].find((f) => existsSync(join(root, f)))
    if (file) out += stylesheet(file, seen)
  }
  return out + text
}

const templates = walk('src/app', '.html')
  .map((file) => ({ file, controls: convertedControls(read(file)) }))
  .filter((t) => t.controls.length)

test('the converted controls are found in the templates', () => {
  assert.ok(templates.length > 40, `only ${templates.length} templates with appDisabledWhy`)
})

test('the check fails a stylesheet that styles a converted control through :disabled only', () => {
  const controls = convertedControls('<button class="x-btn" [appDisabledWhy]="why()"></button>')
  assert.equal(problems(controls, '.x-btn { &:disabled { opacity: 0.4; } }').length, 1)
  assert.equal(problems(controls, '.x-btn { &:hover:not(:disabled) { color: red; } }').length, 1)
  assert.equal(problems(controls, '.x-btn { cursor: pointer; opacity: 0.7; }').length, 2)
  assert.deepEqual(
    problems(controls, `.x-btn { cursor: pointer; &:disabled, &[aria-disabled='true'] { cursor: not-allowed; } }`),
    []
  )
  assert.deepEqual(problems(controls, '.other:disabled { opacity: 0.4; }'), [])
})

test('every stylesheet gives a converted control its blocked look', () => {
  const bad = []
  for (const { file, controls } of templates) {
    const scss = file.replace(/\.html$/, '.scss')
    if (!existsSync(join(root, scss))) continue
    for (const problem of problems(controls, stylesheet(scss))) bad.push(`${scss}: ${problem}`)
  }
  assert.deepEqual(bad, [])
})

test('a toggle chip with a blocked tick is dimmed by the global engine', () => {
  const rule = flatRules(read('src/styles.scss')).find((r) => r.selector === '.c-chip--toggle:has(> input.is-disabled)')
  assert.ok(rule, 'src/styles.scss has no blocked rule for .c-chip--toggle')
  assert.equal(rule.decls.get('opacity'), String(BLOCKED_OPACITY))
  assert.equal(rule.decls.get('cursor'), 'not-allowed')
})
