// node --test scripts/test/ — scripts/reuse-lint.mjs and its rules in scripts/lib/registry-families.mjs (plan 450).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintAddedLines, checkRegistry } from '../reuse-lint.mjs'
import { parseRegistry } from '../lib/reuse-check.mjs'
import { REUSE_RULES } from '../lib/registry-families.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIX = 'scripts/test/fixtures/reuse'

function lint(...args) {
  return spawnSync(process.execPath, ['scripts/reuse-lint.mjs', ...args], { cwd: repoRoot, encoding: 'utf8' })
}

const line = (file, text) => ({ file, line: 1, text })

test('patch adding app-scrollable-dropdown in a page folder warns and exits 0', () => {
  const r = lint(`--patch=${FIX}/combobox.diff`)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^REUSE: warn page-local-combobox search-combobox src\/app\/pages\/orders\/orders\.component\.html:12 — /m)
  assert.equal(r.stdout.trim().split('\n').length, 1, 'only the opening tag line warns')
})

test('patch adding a .c-* class in a component scss warns and exits 0', () => {
  const r = lint(`--patch=${FIX}/engine-class.diff`)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^REUSE: warn engine-class-outside-styles engine-classes src\/app\/pages\/orders\/orders\.component\.scss:4 — /m)
})

test('clean patch prints REUSE: ok', () => {
  const r = lint(`--patch=${FIX}/clean.diff`)
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.stdout.trim(), 'REUSE: ok')
})

test('mixed patch: relative core import and page list logic warn; shared bases and styles.scss do not', () => {
  const r = lint(`--patch=${FIX}/mixed.diff`)
  assert.equal(r.status, 0, r.stderr)
  const out = r.stdout.trim().split('\n')
  assert.equal(out.length, 2, r.stdout)
  assert.match(out[0], /^REUSE: warn relative-core-import helpers src\/app\/pages\/orders\/orders\.component\.ts:2 /)
  assert.match(out[1], /^REUSE: warn page-list-logic list-logic src\/app\/pages\/orders\/orders\.component\.ts:42 /)
})

test('patch adding window.confirm, a bare prompt and alert warns; ConfirmModalService, .confirm( and comments do not', () => {
  const r = lint(`--patch=${FIX}/native-dialog.diff`)
  assert.equal(r.status, 0, r.stderr)
  const out = r.stdout.trim().split('\n')
  assert.equal(out.length, 3, r.stdout)
  for (const [i, ln] of [11, 12, 13].entries()) {
    assert.ok(
      out[i].startsWith(`REUSE: warn native-browser-dialog modal-shell src/app/pages/orders/orders.component.ts:${ln} `),
      out[i]
    )
  }
})

test('--diff against HEAD runs on the real repo and exits 0', () => {
  const r = lint('--diff=HEAD')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^REUSE: (ok|warn )/)
})

test('usage error without a mode', () => {
  const r = lint()
  assert.equal(r.status, 1)
  assert.match(r.stderr, /usage:/)
})

test('rules: alias imports, spec files and comments do not warn', () => {
  assert.deepEqual(lintAddedLines([
    line('src/app/pages/a/a.component.ts', "import { X } from '@pipes/translation-pipe.pipe'"),
    line('src/app/pages/a/a.component.spec.ts', '  onClearSearch() {}'),
    line('src/app/pages/a/a.component.scss', '// .c-old {'),
    line('src/app/pages/a/a.component.scss', '  .wrapper .c-input {'),
    line('src/app/pages/a/a.component.ts', '    this.onClearSearch()')
  ]), [])
})

test('rules: inline template in a page .ts and a ../ core/services import warn', () => {
  const out = lintAddedLines([
    line('src/app/pages/a/a.component.ts', "  template: `<app-add-option-row (add)=\"x()\" />`"),
    line('src/app/shared/b/b.component.ts', "import { S } from '../../core/services/s.service'")
  ])
  assert.equal(out.length, 2)
  assert.match(out[0], /page-local-combobox/)
  assert.match(out[1], /relative-core-import/)
})

test('every rule names a family and has a hint', () => {
  for (const r of REUSE_RULES) {
    assert.ok(r.id && r.family && r.hint && r.pattern instanceof RegExp && r.files.length, r.id)
  }
})

test('checkRegistry: missing path and unknown rule family are reported', () => {
  const registry = parseRegistry(readFileSync(resolve(repoRoot, FIX, 'registry-broken.md'), 'utf8'))
  const problems = checkRegistry({ registry, exists: () => false, trackedFiles: () => [] })
  assert.ok(problems.some((p) => p.startsWith('REUSE: registry missing-path src/app/shared/no-such-folder/')))
  assert.ok(problems.some((p) => p.startsWith('REUSE: registry unknown-family list-logic')))
})

test('--check-registry: fixture registry with a missing path exits 1', () => {
  const r = lint('--check-registry', `--registry=${FIX}/registry-broken.md`)
  assert.equal(r.status, 1)
  assert.match(r.stderr, /missing-path src\/app\/shared\/no-such-folder\//)
})

test('--check-registry: the real registry exits 0 (every listed path exists)', () => {
  const r = lint('--check-registry')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^REUSE: registry ok \(\d+ families, \d+ paths\)/)
})

test('--diff with a base git cannot resolve is a usage error, not REUSE: ok', () => {
  const r = lint('--diff=no-such-branch-450')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /REUSE: bad base no-such-branch-450/)
  assert.doesNotMatch(r.stdout, /REUSE: ok/)
})

test('number-box rule: a number input line warns unless it carries appNumberBox', () => {
  const r = lint(`--patch=${FIX}/number-input.diff`)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^REUSE: warn number-input-outside-number-box number-box src\/app\/pages\/orders\/orders\.component\.html:12 — /m)
  assert.equal(r.stdout.trim().split('\n').length, 1, 'the appNumberBox line does not warn')
})

test('stepper rule: a hand-built minus / plus click handler warns unless it carries appStepHold', () => {
  const r = lint(`--patch=${FIX}/stepper.diff`)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^REUSE: warn minus-plus-outside-stepper stepper src\/app\/pages\/orders\/orders\.component\.html:11 — /m)
  assert.equal(r.stdout.trim().split('\n').length, 1, 'the appStepHold line does not warn')
})
