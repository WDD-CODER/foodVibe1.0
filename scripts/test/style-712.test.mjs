import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const DIRS = [
  'src/app/pages/equipment/components/equipment-form',
  'src/app/pages/suppliers/components/supplier-form',
  'src/app/pages/inventory/components/product-form'
]

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) return walk(p)
    return /\.(html|scss)$/.test(e.name) ? [p] : []
  })

export const FILES = [
  ...DIRS.flatMap(walk),
  'src/app/pages/inventory/components/product-import/product-import.component.html',
  'src/app/pages/inventory/components/product-import/product-import.component.scss',
  'src/app/pages/suppliers/suppliers.page.html',
  'src/app/pages/suppliers/suppliers.page.scss'
]
export const ALLOW = []

const read = (p) => readFileSync(p, 'utf8')

test('the entity forms, the import and the suppliers page use the shared pieces and tokens', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('the three forms sit on the shared frame and header', () => {
  for (const f of [
    'src/app/pages/equipment/components/equipment-form/equipment-form.component.html',
    'src/app/pages/suppliers/components/supplier-form/supplier-form.component.html',
    'src/app/pages/inventory/components/product-form/product-form.component.html'
  ]) {
    const html = read(f)
    assert.ok(html.includes('c-form-page'), `${f} has no c-form-page`)
    assert.ok(html.includes('<app-page-header'), `${f} has no app-page-header`)
    assert.ok(!html.includes('form-header'), `${f} still has form-header`)
  }
})

test('the import preview is the shared table', () => {
  assert.ok(read('src/app/pages/inventory/components/product-import/product-import.component.html').includes('class="c-table'))
})

test('the product form has one primary button in its action row', () => {
  const html = read('src/app/pages/inventory/components/product-form/product-form.component.html')
  const row = html.slice(html.indexOf('c-form-actions'))
  assert.equal((row.match(/c-btn-primary/g) ?? []).length, 1)
})
