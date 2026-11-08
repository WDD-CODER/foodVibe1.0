import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolvePlanStart, databaseUri } from '../log-query.mjs'

test('marker wins', () => {
  const d = mkdtempSync(join(tmpdir(), 'lq-'))
  mkdirSync(join(d, '.claude'))
  writeFileSync(join(d, '.claude', '.slot-plan-start'), '2026-01-01T00:00:00Z\n')
  assert.deepEqual(resolvePlanStart(d), { value: '2026-01-01T00:00:00Z', source: 'marker' })
})

test('no marker, non-git folder -> 24h', () => {
  const d = mkdtempSync(join(tmpdir(), 'lq-'))
  const r = resolvePlanStart(d)
  assert.equal(r.source, '24h')
  assert.ok(!Number.isNaN(Date.parse(r.value)))
})

test('no marker inside this repo -> merge-base (or 24h without origin/main)', () => {
  const r = resolvePlanStart(join(import.meta.dirname, '..', '..'))
  assert.ok(['marker', 'merge-base', 'first-commit', '24h'].includes(r.source))
  assert.ok(!Number.isNaN(Date.parse(r.value)))
})

test('databaseUri', () => {
  const keys = ['MONGO_LOCAL_URI', 'MONGO_URI', 'MONGO_REMOTE_URI']
  const keep = Object.fromEntries(keys.map((k) => [k, process.env[k]]))
  try {
    for (const k of keys) delete process.env[k]
    assert.equal(databaseUri({ remote: false }), '')
    assert.equal(databaseUri({ remote: true }), '')
    process.env.MONGO_LOCAL_URI = 'mongodb://x/y'
    assert.equal(databaseUri({ remote: false }), 'mongodb://x/y')
  } finally {
    for (const k of keys) {
      if (keep[k] === undefined) delete process.env[k]
      else process.env[k] = keep[k]
    }
  }
})
