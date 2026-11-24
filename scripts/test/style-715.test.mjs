import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) return walk(p)
    return /\.(html|scss)$/.test(e.name) ? [p] : []
  })

const B = 'src/app/pages/recipe-builder'
export const FILES = [
  ...walk('src/app/pages/recipe-book'),
  `${B}/recipe-builder.page.html`,
  `${B}/recipe-builder.page.scss`,
  ...['recipe-header', 'recipe-ingredients-table', 'recipe-workflow', 'ingredient-search', 'preparation-search'].flatMap((d) =>
    walk(`${B}/components/${d}`),
  ),
]
export const ALLOW = []

test('the recipe book and recipe builder use the shared pieces and tokens', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('the old local classes are gone from every template and stylesheet', () => {
  const gone = [
    'section-card', 'add-row-btn', 'warning-badge', 'incomplete-badge', 'unlinked-badge', 'edit-badge',
    'step-badge', 'logistics-add-btn', 'no-results',
  ]
  for (const f of FILES) {
    const text = readFileSync(f, 'utf8')
    for (const c of gone) assert.ok(!text.includes(c), `${f} still mentions ${c}`)
  }
})
