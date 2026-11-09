import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
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
  assert.equal(databaseUri({ target: 'local', env: {} }), '')
  assert.equal(databaseUri({ target: 'local', env: { MONGO_LOCAL_URI: 'mongodb://x/y' } }), 'mongodb://x/y')
  assert.equal(databaseUri({ target: 'atlas', env: { MONGO_URI: 'mongodb://a/b' } }), 'mongodb://a/b')
})

test('databaseUri local never falls back to MONGO_URI', () => {
  assert.equal(databaseUri({ target: 'local', env: { MONGO_URI: 'mongodb://atlas/x' } }), '')
})

test('databaseUri atlas without MONGO_URI throws', () => {
  assert.throws(() => databaseUri({ target: 'atlas', env: {} }), /MONGO_URI is not set/)
})

test('--remote exits 1 with the replacement message', () => {
  const r = spawnSync(process.execPath, [join(import.meta.dirname, '..', 'log-query.mjs'), '--remote'], { encoding: 'utf8' })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /--remote was replaced by --target=atlas/)
})
