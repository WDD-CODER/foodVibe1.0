import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { styleFindings } from '../lib/style-guard.mjs'

const P = 'src/app/pages'

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name).replace(/\\/g, '/')
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
const styleFiles = (dir) => walk(dir).filter((f) => /\.(html|scss)$/.test(f))

export const FILES = [
  `${P}/platform-dashboard/platform-dashboard.page.html`,
  `${P}/platform-dashboard/platform-dashboard.page.scss`,
  ...['platform-ai-shots', 'platform-logistics-items', 'platform-learning'].flatMap((c) =>
    styleFiles(`${P}/platform-dashboard/components/${c}`)
  ),
  `${P}/diagnosis/diagnosis.page.html`,
  `${P}/diagnosis/diagnosis.page.scss`,
  ...['diagnosis-workspace', 'diag-report', 'diag-menu'].flatMap((c) => styleFiles(`${P}/diagnosis/components/${c}`)),
  `${P}/report/report.page.html`,
  `${P}/report/report.page.scss`
]
export const ALLOW = []

const HTMLS = FILES.filter((f) => f.endsWith('.html'))

test('the platform, diagnosis and report screens use the tokens and shared pieces', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('every table in these templates is a c-table', () => {
  for (const f of HTMLS) {
    for (const m of readFileSync(f, 'utf8').matchAll(/<table\b[^>]*>/g)) {
      assert.ok(/class="[^"]*\bc-table\b/.test(m[0]), `${f}: ${m[0]}`)
    }
  }
})

test('the old local classes are gone', () => {
  const gone = ['sort-btn', 'total-tile', 'platform-empty', 'learning__empty', 'diagnosis-workspace__title']
  for (const f of FILES) {
    const text = readFileSync(f, 'utf8')
    for (const c of gone) assert.ok(!text.includes(c), `${f} still has ${c}`)
  }
})

test('the platform idle tint stays unlayered and starts with the page row class', () => {
  const scss = readFileSync(`${P}/platform-dashboard/platform-dashboard.page.scss`, 'utf8')
  assert.match(scss, /^\.platform-row\.is-idle-7 > \.c-list-body-cell/m)
  assert.match(scss, /^\.platform-row\.is-idle-14 > \.c-list-body-cell/m)
})
