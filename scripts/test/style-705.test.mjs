import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const PAGE = 'src/app/pages/bookings'
const COMPONENTS = ['waitlist-drawer', 'table-sheet', 'service-lists'].map((d) => `${PAGE}/components/${d}`)

const stylable = (dir) =>
  readdirSync(dir)
    .filter((f) => /\.(html|scss)$/.test(f))
    .map((f) => `${dir}/${f}`)

export const FILES = [`${PAGE}/bookings.page.html`, `${PAGE}/bookings.page.scss`, ...COMPONENTS.flatMap(stylable)]
export const ALLOW = []

test('the bookings screen uses the shared pieces and tokens', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('the four list templates sit on the in-panel list and drop the old row classes', () => {
  const templates = [
    `${PAGE}/bookings.page.html`,
    `${COMPONENTS[0]}/waitlist-drawer.component.html`,
    `${COMPONENTS[2]}/arriving-list.component.html`,
    `${COMPONENTS[2]}/unassigned-list.component.html`
  ]
  for (const file of templates) {
    // data-testid="wl-row" is a test hook the e2e specs use; only a class would be the old row.
    const html = readFileSync(file, 'utf8').replace(/data-testid="wl-row"/g, '')
    assert.ok(html.includes('class="c-list'), `${file} uses c-list`)
    for (const old of ['bk-row', 'wl-row', 'bk-none']) {
      assert.ok(!html.includes(old), `${file} has no ${old}`)
    }
  }
})

test('the two sheets take their title from the shell or a plain paragraph, never a hand h3', () => {
  for (const file of [`${COMPONENTS[0]}/waitlist-drawer.component.html`, `${COMPONENTS[1]}/table-sheet.component.html`]) {
    assert.ok(!readFileSync(file, 'utf8').includes('<h3'), `${file} has no <h3`)
  }
})
