import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const DIRS = [
  'src/app/pages/clients/components/client-list',
  'src/app/pages/clients/components/client-profile',
  'src/app/pages/settings',
  'src/app/pages/frontdesk/knowledge'
]

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) return walk(p)
    return /\.(html|scss)$/.test(e.name) ? [p] : []
  })

export const FILES = DIRS.flatMap(walk)
const WRAPPER = 'the input sits in a c-input-wrapper, which draws the box'
export const ALLOW = [
  { rule: 'bare-input', file: 'src/app/pages/clients/components/client-list/client-list.component.html', why: WRAPPER },
  { rule: 'bare-input', file: 'src/app/pages/frontdesk/knowledge/knowledge.page.html', why: WRAPPER },
  {
    rule: 'bare-input',
    file: 'src/app/pages/settings/components/baseline-tab/baseline-tab.component.html',
    why: WRAPPER
  },
  {
    rule: 'bare-input',
    file: 'src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.html',
    why: WRAPPER
  },
  {
    rule: 'bare-input',
    file: 'src/app/pages/settings/components/business-name-form/business-name-form.component.html',
    why: WRAPPER
  }
]

test('clients, settings and knowledge use the shared pieces and tokens', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('the old local row, field and empty classes are gone', () => {
  const gone = [
    'no-results',
    'team-row',
    'access-row',
    'timeline-row',
    'team-field',
    'baseline-field',
    'business-field'
  ]
  for (const file of FILES) {
    const text = readFileSync(file, 'utf8')
    const classes = file.endsWith('.html')
      ? [...text.matchAll(/\bclass="([^"]*)"/g)].map((m) => m[1]).join(' ')
      : [...text.matchAll(/\.([\w-]+)/g)].map((m) => m[1]).join(' ')
    const tokens = new Set(classes.split(/\s+/))
    for (const word of gone) assert.ok(!tokens.has(word), `${file} still has ${word}`)
  }
})

test('settings is a narrow page, with no 36rem limit', () => {
  assert.ok(readFileSync('src/app/pages/settings/settings.page.html', 'utf8').includes('c-page c-page--narrow'))
  for (const file of FILES.filter((f) => f.endsWith('.scss'))) {
    assert.ok(!readFileSync(file, 'utf8').includes('36rem'), `${file} has 36rem`)
  }
})
