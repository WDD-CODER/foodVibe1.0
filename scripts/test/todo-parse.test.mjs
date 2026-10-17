import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkboxStats, isFullyDone, findArchiveCandidates } from '../lib/todo-parse.mjs'

const section = (nnn, items) => `### Plan ${nnn} — X\n\n${items.join('\n')}\n`

test('[-] counts as closed', () => {
  assert.deepEqual(checkboxStats('- [ ] a\n- [x] b\n- [-] c\n- [-] d'), { open: 1, done: 1, closed: 2 })
})

test('a section with only [-] lines is an archive candidate', () => {
  assert.equal(isFullyDone(section('001', ['- [-] dropped', '- [-] closed'])), true)
})

test('a section with [x] and [-] lines is an archive candidate', () => {
  assert.equal(isFullyDone(section('002', ['- [x] done', '- [-] dropped'])), true)
})

test('a section with any [ ] line is not', () => {
  assert.equal(isFullyDone(section('003', ['- [x] done', '- [-] dropped', '- [ ] open'])), false)
  assert.equal(isFullyDone(section('004', ['- [ ] open'])), false)
})

test('a section with no checkboxes is not', () => {
  assert.equal(isFullyDone(section('005', ['just notes'])), false)
})

test('findArchiveCandidates picks the closed sections only', () => {
  const todo = ['# Todo', '', section('010', ['- [-] a']), section('011', ['- [ ] b']), section('012', ['- [x] c', '- [-] d'])].join('\n')
  assert.deepEqual(findArchiveCandidates(todo).map((s) => s.heading), ['### Plan 010 — X', '### Plan 012 — X'])
})
