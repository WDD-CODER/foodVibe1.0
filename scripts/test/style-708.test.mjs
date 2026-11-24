import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const DIRS = [
  'src/app/pages/frontdesk/frontdesk-settings',
  'src/app/pages/frontdesk/frontdesk-onboarding',
  'src/app/pages/public-request'
]

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) return walk(p)
    return /\.(html|scss)$/.test(e.name) ? [p] : []
  })

export const FILES = DIRS.flatMap(walk)
export const ALLOW = [
  {
    rule: 'bare-input',
    file: 'src/app/pages/public-request/public-request.page.html',
    why: 'the honeypot input is hidden off-screen on purpose; it must not look like a field'
  }
]

test('front desk setup and the guest pages use the shared pieces and tokens', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('the old local loading, empty, button and date classes are gone', () => {
  const gone = ['c-btn-secondary', 'fs-loading', 'ob-loading', 'pb-loading', 'ob-dates', 'fs-card-title', 'ob-title']
  for (const file of FILES.filter((f) => f.endsWith('.html'))) {
    const text = readFileSync(file, 'utf8')
    const classes = new Set(
      [...text.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean)
    )
    for (const word of gone) assert.ok(!classes.has(word), `${file} still has ${word}`)
    assert.ok(!text.includes('class="c-empty-state'), `${file} hand-writes c-empty-state`)
  }
})
