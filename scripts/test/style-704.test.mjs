import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleFindings } from '../lib/style-guard.mjs'

const MENU = 'src/app/pages/menu-library/components/menu-library-list'
const TRASH = 'src/app/pages/trash'

const stylable = (dir) =>
  readdirSync(dir)
    .filter((f) => /\.(html|scss)$/.test(f))
    .map((f) => `${dir}/${f}`)

export const FILES = [...stylable(MENU), ...stylable(TRASH)]
export const ALLOW = []

test('the menu library and the trash use the shared pieces and tokens', () => {
  assert.deepEqual(styleFindings(FILES, { allow: ALLOW }), [])
})

test('both templates sit on the shared list page and drop the old local classes', () => {
  const templates = [`${MENU}/menu-library-list.component.html`, `${TRASH}/trash.page.html`]
  for (const file of templates) {
    const html = readFileSync(file, 'utf8')
    assert.ok(html.includes('<app-list-shell'), `${file} uses app-list-shell`)
    for (const old of ['event-card', 'filters-bar', 'trash-item', 'history-overlay', 'btn-refresh', 'action-btn']) {
      assert.ok(!html.includes(old), `${file} has no ${old}`)
    }
  }
})
