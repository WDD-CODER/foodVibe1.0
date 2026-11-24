import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const REQUESTS = 'src/app/pages/requests'
const INBOX = 'src/app/pages/inbox'

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) return walk(p)
    return /\.(html|scss)$/.test(e.name) ? [p] : []
  })

export const FILES = [
  ...walk(REQUESTS),
  `${INBOX}/inbox.page.html`,
  `${INBOX}/inbox.page.scss`,
  `${INBOX}/components/reply-box/reply-box.component.scss`
]
export const ALLOW = []

test('requests and inbox use the shared pieces and tokens', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('no requests template keeps the old field stack', () => {
  for (const file of walk(REQUESTS).filter((f) => f.endsWith('.html'))) {
    assert.ok(!readFileSync(file, 'utf8').includes('c-input-stack'), `${file} has no c-input-stack`)
  }
})

test('the inbox list is the shared list', () => {
  const html = readFileSync(`${INBOX}/inbox.page.html`, 'utf8')
  assert.ok(html.includes('class="c-list'))
  assert.ok(!html.includes('ibx-row'))
})
