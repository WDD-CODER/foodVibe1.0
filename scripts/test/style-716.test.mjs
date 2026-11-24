import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const D = 'src/app/pages/cook-view'
export const FILES = [`${D}/cook-view.page.scss`, `${D}/cook-view.page.html`]

// The ink skin keeps its own number and clock inputs on purpose (registry: chip family, ink set).
const HTML = `${D}/cook-view.page.html`
export const ALLOW = [
  { rule: 'bare-input', file: HTML, why: 'the ink skin keeps its own amount and clock inputs (cv-amount-input, cv-clock-input)' },
]

test('the cook view stylesheet and template use the tokens and shared pieces', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('the old local empty classes are gone from the template', () => {
  const html = readFileSync(HTML, 'utf8')
  for (const c of ['cook-view-empty', 'empty-state-text']) assert.ok(!html.includes(c), `still mentions ${c}`)
})

test('every icon size is on the shared scale', () => {
  const html = readFileSync(HTML, 'utf8')
  for (const m of html.matchAll(/\[size\]="(\d+)"/g)) assert.ok([14, 16, 18, 24, 32, 48].includes(Number(m[1])), `size ${m[1]}`)
})
