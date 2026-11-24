import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { styleFindings } from '../lib/style-guard.mjs'

const D = 'src/app/pages/dashboard'

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name).replace(/\\/g, '/')
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

export const FILES = walk(D).filter((f) => /\.(html|scss)$/.test(f))
export const ALLOW = []

const html = (f) => readFileSync(`${D}/${f}`, 'utf8')
const HTMLS = FILES.filter((f) => f.endsWith('.html'))

test('every dashboard template and stylesheet uses the tokens and shared pieces', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('the old local classes are gone from the dashboard templates', () => {
  const gone = [
    'kpi-card',
    'perf-card',
    'link-btn',
    'activity-type',
    'act-chip',
    'entity-type-tag',
    'activity-empty',
    'perf__empty',
    'perf-panel__empty',
    'fd-card__none'
  ]
  for (const f of HTMLS) {
    const text = readFileSync(f, 'utf8')
    for (const c of gone) assert.ok(!new RegExp(`class="[^"]*\\b${c}\\b`).test(text), `${f} still uses ${c}`)
    assert.ok(!/class="[^"]*__head\b/.test(text), `${f} still has a local __head class`)
  }
})

test('the tiles are on the shared stat tile', () => {
  assert.ok(html('components/dashboard-overview/dashboard-overview.component.html').includes('c-stat-tile'))
  assert.ok(html('components/business-performance/business-performance.component.html').includes('c-stat-tile'))
  assert.ok(html('components/business-performance/business-performance.component.html').includes('c-stat-tile--hero'))
})

test('the five small cards use the shared card head', () => {
  for (const c of ['front-desk-checklist-card', 'frontdesk-week-card', 'price-rises-card', 'setup-checklist-card', 'diagnosis-card']) {
    assert.ok(html(`components/${c}/${c}.component.html`).includes('c-card-head'), `${c} has no c-card-head`)
  }
})

test('the trash tab gets the list host', () => {
  assert.ok(html('dashboard.page.html').includes("activeTab() === 'venues' || activeTab() === 'trash'"))
})
