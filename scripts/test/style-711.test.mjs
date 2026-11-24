import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const DIRS = [
  'src/app/pages/inventory/components/inventory-product-list',
  'src/app/pages/inventory/components/invoices-list',
  'src/app/pages/inventory/components/stock-count',
  'src/app/pages/equipment/components/equipment-list',
  'src/app/pages/suppliers/components/supplier-list'
]

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) return e.name === 'stock-ai-draft' ? [] : walk(p)
    return /\.(html|scss)$/.test(e.name) ? [p] : []
  })

export const FILES = DIRS.flatMap(walk)
const WRAPPER = 'the input sits in a c-input-wrapper, which draws the box'
export const ALLOW = [
  ...[
    'src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html',
    'src/app/pages/inventory/components/stock-count/stock-count.component.html',
    'src/app/pages/equipment/components/equipment-list/equipment-list.component.html',
    'src/app/pages/suppliers/components/supplier-list/supplier-list.component.html'
  ].map((file) => ({ rule: 'bare-input', file, why: WRAPPER })),
  {
    rule: 'hand-drawn-dialog',
    file: 'src/app/pages/inventory/components/stock-count/stock-count.component.html',
    why: 'base-amount popover (plan 658, anchored-popup default) is a popover, not a modal'
  }
]

test('the product, equipment, supplier and stock lists use the shared pieces and tokens', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('the old local classes are gone', () => {
  const gone = ['no-results', 'low-stock-badge', 'c-chip amber', 'stock-count__past"']
  for (const file of FILES) {
    const text = readFileSync(file, 'utf8')
    for (const word of gone) assert.ok(!text.includes(word), `${file} still has ${word}`)
  }
})

test('the equipment phone panel is the shared popup sheet', () => {
  const html = readFileSync('src/app/pages/equipment/components/equipment-list/equipment-list.component.html', 'utf8')
  assert.match(html, /<app-modal-shell\s+size="md"/)
  assert.ok(!html.includes('c-modal-overlay'))
})
