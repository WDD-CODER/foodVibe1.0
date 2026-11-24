import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { modalFindings } from '../lib/modal-guard.mjs'

function run(files, options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'modal-guard-'))
  try {
    for (const [name, text] of Object.entries(files)) writeFileSync(join(root, name), text)
    return modalFindings(Object.keys(files), { root, ...options })
  } finally {
    rmSync(root, { recursive: true })
  }
}

const rules = (files, options) => run(files, options).map((f) => f.rule)

test('bottom-sheet: .m-sheet in a prelude', () => {
  assert.deepEqual(rules({ 'a.scss': '.m-sheet { color: red; }' }), ['bottom-sheet'])
  assert.deepEqual(rules({ 'a.scss': '.x { color: red; }' }), [])
})

test('bottom-sheet: align-items end in an overlay-like block only', () => {
  assert.deepEqual(rules({ 'a.scss': '.c-modal-overlay { align-items: flex-end; }' }), ['bottom-sheet'])
  assert.deepEqual(rules({ 'a.scss': '.my-backdrop { align-items: end; }' }), ['bottom-sheet'])
  assert.deepEqual(rules({ 'a.scss': '.row { align-items: flex-end; }' }), [])
  assert.deepEqual(rules({ 'a.scss': '.c-modal-overlay { align-items: center; }' }), [])
})

test('bottom-sheet: square bottom corners with a rounded top', () => {
  const css = '.p { border-end-start-radius: 0; border-end-end-radius: 0; border-start-start-radius: 1rem; }'
  assert.deepEqual(rules({ 'a.scss': css }), ['bottom-sheet'])
  const flat = '.p { border-end-start-radius: 0; border-end-end-radius: 0; border-start-start-radius: 0; }'
  assert.deepEqual(rules({ 'a.scss': flat }), [])
})

test('bottom-sheet: fixed at the bottom with a rounded top; the plain pricing bar is not one', () => {
  const sheet = '.p { position: fixed; inset-block-end: 0; border-start-start-radius: 1rem; }'
  assert.deepEqual(rules({ 'a.scss': sheet }), ['bottom-sheet'])
  const viaBottom = '.p { position: fixed; bottom: 0; border-start-start-radius: 1rem; }'
  assert.deepEqual(rules({ 'a.scss': viaBottom }), ['bottom-sheet'])
  const bar = '.pricing-bar { position: fixed; inset-inline: 0; inset-block-end: 0; }'
  assert.deepEqual(rules({ 'a.scss': bar }), [])
  const tabs = '.tab-bar { position: fixed; inset-inline: 0; inset-block-end: 0; padding: 0; }'
  assert.deepEqual(rules({ 'a.scss': tabs }), [])
})

test('bottom-sheet: inset-block auto <length> with inset-inline', () => {
  assert.deepEqual(rules({ 'a.scss': '.p { inset-block: auto 0; inset-inline: 0; }' }), ['bottom-sheet'])
  assert.deepEqual(rules({ 'a.scss': '.p { inset-block: auto 0; }' }), [])
})

test('top-sheet: fixed at the top with only end radii', () => {
  const css = '.p { position: fixed; inset-block-start: 0; inset-inline: 0; border-end-start-radius: 1rem; border-end-end-radius: 1rem; }'
  assert.deepEqual(rules({ 'a.scss': css }), ['top-sheet'])
  const both = css.replace('}', 'border-start-start-radius: 1rem; }')
  assert.deepEqual(rules({ 'a.scss': both }), [])
})

test('sheet-binding: [sheet]="true" and class="m-sheet" in a template', () => {
  assert.deepEqual(rules({ 'a.html': '<app-modal-shell [sheet]="true"></app-modal-shell>' }), ['sheet-binding'])
  assert.deepEqual(rules({ 'a.html': '<div class="x m-sheet"></div>' }), ['sheet-binding'])
  assert.deepEqual(rules({ 'a.html': '<app-modal-shell [size]="\'md\'"></app-modal-shell>' }), [])
})

test('modal-no-scroll: card, body and cardClass blocks', () => {
  assert.deepEqual(rules({ 'a.scss': '.c-modal-card { overflow: hidden; }' }), ['modal-no-scroll'])
  assert.deepEqual(rules({ 'a.scss': '.c-modal-body { overflow-y: visible; }' }), ['modal-no-scroll'])
  assert.deepEqual(rules({ 'a.scss': '.c-modal-card { max-block-size: none !important; }' }), ['modal-no-scroll'])
  assert.deepEqual(rules({ 'a.scss': '.c-modal-card { overflow-y: auto; }' }), [])
  assert.deepEqual(rules({ 'a.scss': '.c-modal-overlay[popover] { overflow: visible; }' }), [])
  const files = { 'a.scss': ':host ::ng-deep .my-card { overflow: hidden; }', 'a.html': '<app-modal-shell cardClass="my-card"></app-modal-shell>' }
  assert.deepEqual(rules(files), ['modal-no-scroll'])
  assert.deepEqual(rules({ 'a.scss': '.my-card { overflow: hidden; }' }), [])
  assert.deepEqual(rules({ 'a.scss': '.my-card { overflow: hidden; }' }, { cardClasses: ['my-card'] }), ['modal-no-scroll'])
})

test('nothing inside @media print', () => {
  assert.deepEqual(rules({ 'a.scss': '@media print { .c-modal-card { overflow: hidden; } .m-sheet { color: red; } }' }), [])
})

test('allow drops an exact match; an entry with no why throws', () => {
  const files = { 'a.scss': '.m-sheet { color: red; }' }
  const entry = { rule: 'bottom-sheet', file: 'a.scss', selector: '.m-sheet', why: 'retired' }
  assert.deepEqual(rules(files, { allow: [entry] }), [])
  assert.deepEqual(rules(files, { allow: [{ ...entry, selector: '.other' }] }), ['bottom-sheet'])
  assert.throws(() => rules(files, { allow: [{ ...entry, why: '' }] }))
  assert.throws(() => rules(files, { allow: [{ rule: entry.rule, file: entry.file, selector: entry.selector }] }))
})

test('findings carry file, line and are sorted; a missing file throws', () => {
  const found = run({ 'b.scss': '.m-sheet { a: b; }', 'a.scss': '\n.m-sheet { a: b; }' })
  assert.deepEqual(found.map((f) => [f.file, f.line]), [['a.scss', 2], ['b.scss', 1]])
  assert.throws(() => modalFindings(['does-not-exist.scss'], { root: tmpdir() }))
})
