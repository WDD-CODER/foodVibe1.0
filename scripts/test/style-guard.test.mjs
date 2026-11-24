import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { styleFindings } from '../lib/style-guard.mjs'

const root = mkdtempSync(join(tmpdir(), 'style-guard-'))
process.on('exit', () => rmSync(root, { recursive: true }))
let n = 0
function run(ext, text, opts = {}, name) {
  const file = name ?? `src/app/x/f${n++}.${ext}`
  mkdirSync(dirname(join(root, file)), { recursive: true })
  writeFileSync(join(root, file), text)
  return styleFindings([file], { root, ...opts })
}
const rules = (ext, text, opts, name) => run(ext, text, opts, name).map((f) => f.rule)

test('colour', () => {
  assert.deepEqual(rules('scss', '.a { color: #fff; }'), ['colour'])
  assert.deepEqual(rules('scss', '.a { background: rgba(0,0,0,.1); }'), ['colour'])
  assert.deepEqual(rules('scss', '.a { color: var(--x, #fff); }'), ['colour'])
  assert.deepEqual(rules('scss', '.a { --brand: #fff; }'), [])
  assert.deepEqual(rules('scss', '@media print { .a { color: #000; } }'), [])
})

test('font-size, font-weight, radius, shadow', () => {
  assert.deepEqual(rules('scss', '.a { font-size: 0.875rem; }'), ['font-size'])
  assert.deepEqual(rules('scss', '.a { font-size: var(--fs-sm); }'), [])
  assert.deepEqual(rules('scss', '.a { font-weight: 600; }'), ['font-weight'])
  assert.deepEqual(rules('scss', '.a { border-radius: 6px; }'), ['radius'])
  assert.deepEqual(rules('scss', '.a { border-radius: var(--radius-sm); }'), [])
  assert.deepEqual(rules('scss', '.a { box-shadow: 0 2px 4px var(--x); }'), ['shadow'])
  assert.deepEqual(rules('scss', '.a { box-shadow: var(--shadow-card); }'), [])
})

test('space-scale', () => {
  assert.deepEqual(rules('scss', '.a { padding: 1rem 0.5rem; }'), ['space-scale'])
  assert.deepEqual(rules('scss', '.a { gap: 8px; }'), ['space-scale'])
  assert.deepEqual(rules('scss', '.a { padding: 0.625rem; }'), [])
  assert.deepEqual(rules('scss', '.a { gap: var(--space-2); }'), [])
})

test('physical', () => {
  assert.deepEqual(rules('scss', '.a { margin-left: var(--space-2); }'), ['physical'])
  assert.deepEqual(rules('scss', '.a { left: 0; }'), ['physical'])
  assert.deepEqual(rules('scss', '.a { width: 100%; }'), ['physical'])
  assert.deepEqual(rules('scss', '.a { border-top: 1px solid var(--x); }'), ['physical'])
  assert.deepEqual(rules('scss', '.a { text-align: right; }'), ['physical'])
  assert.deepEqual(rules('scss', '.a { inline-size: 100%; }'), [])
  assert.deepEqual(rules('scss', '@media (max-width: 767px) { .a { inline-size: 100%; } }'), [])
})

test('engine-in-component', () => {
  assert.deepEqual(rules('scss', '.c-list { display: grid; }'), ['engine-in-component'])
  assert.deepEqual(rules('scss', '.c-list { display: grid; }', {}, 'src/styles.scss'), [])
  assert.deepEqual(rules('scss', '.mine { display: grid; }'), [])
})

test('template rules', () => {
  assert.deepEqual(rules('html', '<div class="c-modal-overlay"></div>'), ['hand-drawn-dialog'])
  assert.deepEqual(rules('html', '<div role="dialog"></div>'), ['hand-drawn-dialog'])
  assert.deepEqual(rules('html', '<p class="no-results">x</p>'), ['local-empty'])
  assert.deepEqual(rules('html', '<p class="trash-empty">x</p>'), ['local-empty'])
  assert.deepEqual(rules('html', '<p class="c-empty-state">x</p>'), [])
  assert.deepEqual(rules('html', '<p class="fs-loading">x</p>'), ['local-loading'])
  assert.deepEqual(rules('html', '<input type="text">'), ['bare-input'])
  assert.deepEqual(rules('html', '<input type="text" class="c-input">'), [])
  for (const t of ['checkbox', 'radio', 'hidden', 'file']) assert.deepEqual(rules('html', `<input type="${t}">`), [])
  assert.deepEqual(rules('html', '<textarea></textarea>'), ['bare-input'])
})

test('findings carry file and line, sorted', () => {
  const r = run('scss', '.a {\n  color: #fff;\n  font-weight: 700;\n}')
  assert.deepEqual(r.map((f) => f.line), [2, 3])
})

test('allow entries', () => {
  const file = 'src/app/x/allowed.scss'
  assert.deepEqual(run('scss', '.a { color: #fff; }', { allow: [{ rule: 'colour', file, why: 'brand mark' }] }, file), [])
  assert.throws(() => run('scss', '.a { color: #fff; }', { allow: [{ rule: 'colour', file, why: '' }] }, file))
  assert.throws(() => styleFindings(['src/missing.scss'], { root }))
})
