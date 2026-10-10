import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rangeFolder, atomicAllClosed, setStatusDone, findClosable } from '../plan-close.mjs'

const plan = (items) => `# Plan 401 — X\n\nStatus: active\n\n## Atomic Sub-tasks\n${items}\n\n## Technical Considerations\n- [ ] not a task\n`

test('rangeFolder buckets by hundred', () => {
  assert.equal(rangeFolder('042'), '1-100')
  assert.equal(rangeFolder('353'), '300-400')
  assert.equal(rangeFolder('401'), '400-500')
})

test('atomicAllClosed: only the Atomic Sub-tasks block counts', () => {
  assert.equal(atomicAllClosed(plan('- [x] A1\n- [-] A2')), true)
  assert.equal(atomicAllClosed(plan('- [x] A1\n- [ ] A2')), false)
  assert.equal(atomicAllClosed('# Plan 1 — no tasks\n'), false)
})

test('setStatusDone replaces or adds the Status line', () => {
  assert.match(setStatusDone(plan('- [x] A1')), /^Status: done$/m)
  assert.match(setStatusDone('# Plan 1 — X\n\nbody\n'), /^Status: done$/m)
})

test('findClosable needs archived, not open, and all tasks closed', () => {
  const texts = { '401-a.plan.md': plan('- [x] A1'), '402-b.plan.md': plan('- [x] A1'), '403-c.plan.md': plan('- [ ] A1') }
  const got = findClosable({
    files: [...Object.keys(texts), '300-400', 'notes.md'],
    openNums: new Set(['402']),
    archivedNums: new Set(['401', '402', '403']),
    readPlan: f => texts[f]
  })
  assert.deepEqual(got.map(g => g.nnn), ['401'])
})

test('findClosable takes repo-relative paths from every open dir', () => {
  const texts = { 'plans/401-a.plan.md': plan('- [x] A1'), 'plans/design/402-b.plan.md': plan('- [x] A1') }
  const got = findClosable({
    files: Object.keys(texts),
    openNums: new Set(),
    archivedNums: new Set(['401', '402']),
    readPlan: f => texts[f]
  })
  assert.deepEqual(got.map(g => g.file), ['plans/401-a.plan.md', 'plans/design/402-b.plan.md'])
})
