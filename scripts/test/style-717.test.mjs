import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const D = 'src/app/pages/menu-intelligence'
const C = `${D}/components`
const COMPONENTS = ['event-stage-bar', 'event-notes-log', 'event-logistics-panel', 'menu-dish-row', 'pricing-meter', 'loading-list']

const own = COMPONENTS.flatMap((c) =>
  readdirSync(`${C}/${c}`)
    .filter((f) => /\.(html|scss)$/.test(f))
    .map((f) => `${C}/${c}/${f}`),
)
export const FILES = [
  `${D}/_paper-ui.scss`,
  `${D}/_toolbar.scss`,
  `${D}/_layout.scss`,
  `${D}/menu-intelligence.page.html`,
  `${D}/menu-intelligence.page.scss`,
  ...own,
]
// Inputs inside the shared wrapper or stack, and the paper skin's own inline editors (registry: chip family, paper set).
export const ALLOW = [
  { rule: 'bare-input', file: `${C}/event-stage-bar/event-stage-bar.component.html`, why: 'the deposit amount sits in the shared c-input-stack' },
  { rule: 'bare-input', file: `${C}/pricing-meter/pricing-meter.component.html`, why: 'the money inputs sit in the shared c-input-wrapper' },
  { rule: 'bare-input', file: `${C}/menu-dish-row/menu-dish-row.component.html`, why: 'the paper skin keeps its own inline dish-price and dish-field editors' },
  { rule: 'bare-input', file: `${D}/menu-intelligence.page.html`, why: 'the paper skin keeps its own menu-title and guest-count inline editors' },
]

test('the editor styles and templates use the tokens and shared pieces', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('the old local classes are gone from the templates', () => {
  const htmls = FILES.filter((f) => f.endsWith('.html')).map((f) => readFileSync(f, 'utf8'))
  for (const c of ['stage-pill', 'notes-empty', 'client-row-empty', 'note-btn', 'class="c-chip--tag client-chip"']) {
    for (const h of htmls) assert.ok(!h.includes(c), `still mentions ${c}`)
  }
})

test('the loading list is drawn as the shared table', () => {
  assert.ok(readFileSync(`${C}/loading-list/loading-list.component.html`, 'utf8').includes('class="c-table'))
})
