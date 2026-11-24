import { test } from 'node:test'
import assert from 'node:assert/strict'
import { styleFindings } from '../lib/style-guard.mjs'
import { REUSE_RULES } from '../lib/registry-families.mjs'
import { lintAddedLines } from '../lib/checks/reuse-copies.mjs'
import * as s704 from './style-704.test.mjs'
import * as s705 from './style-705.test.mjs'
import * as s706 from './style-706.test.mjs'
import * as s707 from './style-707.test.mjs'
import * as s708 from './style-708.test.mjs'
import * as s709 from './style-709.test.mjs'
import * as s710 from './style-710.test.mjs'
import * as s711 from './style-711.test.mjs'
import * as s712 from './style-712.test.mjs'
import * as s713 from './style-713.test.mjs'
import * as s714 from './style-714.test.mjs'
import * as s715 from './style-715.test.mjs'
import * as s716 from './style-716.test.mjs'
import * as s717 from './style-717.test.mjs'

const RUN = [s704, s705, s706, s707, s708, s709, s710, s711, s712, s713, s714, s715, s716, s717]
const ALL_FILES = [...new Set(RUN.flatMap((m) => m.FILES))]
const ALL_ALLOW = RUN.flatMap((m) => m.ALLOW)

test('every file the style run converged still passes the style guard', () => {
  assert.ok(ALL_FILES.length > 0)
  assert.deepEqual(styleFindings(ALL_FILES, { allow: ALL_ALLOW }), [])
})

const flagged = (file, text) => lintAddedLines([{ file, line: 1, text }], REUSE_RULES).map((w) => w.rule)

test('page-local-empty-state flags a hand-made empty text and passes app-empty-state', () => {
  assert.ok(flagged('src/app/pages/trash/trash.page.html', '<p class="trash-empty">').includes('page-local-empty-state'))
  assert.ok(!flagged('src/app/pages/trash/trash.page.html', '<app-empty-state messageKey="x" />').includes('page-local-empty-state'))
  assert.ok(!flagged('src/app/pages/trash/trash.page.html', '<div class="c-empty-state">').includes('page-local-empty-state'))
})

test('own-dialog-role flags a hand-drawn dialog outside the shell', () => {
  assert.ok(flagged('src/app/pages/trash/trash.page.html', '<div role="dialog">').includes('own-dialog-role'))
  assert.ok(!flagged('src/app/shared/modal-shell/modal-shell.component.html', '<div role="dialog">').includes('own-dialog-role'))
})

test('page-local-width flags a private page width but not a media prelude', () => {
  assert.ok(flagged('src/app/pages/trash/trash.page.scss', '  max-inline-size: 36rem;').includes('page-local-width'))
  assert.ok(!flagged('src/app/pages/trash/trash.page.scss', '@media (max-width: 600px) {').includes('page-local-width'))
})
