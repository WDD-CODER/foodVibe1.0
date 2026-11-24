import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const DIR = 'src/app/pages/metadata-manager'

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) return walk(p)
    return /\.(html|scss)$/.test(e.name) ? [p] : []
  })

export const FILES = walk(DIR)
export const ALLOW = []

test('the metadata manager folder uses the shared pieces and tokens', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('the old local classes are gone from every template', () => {
  const goneClasses = ['manager-card', 'list-stack', 'list-item', 'coef-row', 'model-row', 'logistics-empty', 'empty-state']
  const goneText = ['c-chip teal', 'c-chip amber']
  for (const f of FILES.filter((n) => n.endsWith('.html'))) {
    const text = readFileSync(f, 'utf8')
    const tokens = [...text.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/))
    for (const c of goneClasses) assert.ok(!tokens.includes(c), `${f} still has class ${c}`)
    for (const word of goneText) assert.ok(!text.includes(word), `${f} still has ${word}`)
  }
})
