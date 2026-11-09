import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const FILES = [
  'server/scripts/bump-master-version.js',
  'server/scripts/check-name-lengths.js',
  'server/scripts/check-unit-weights.js',
  'server/scripts/time-business-stats.js',
  'server/scripts/db-backup.js',
  'server/scripts/db-restore.js',
  'server/scripts/reset-user-from-master.js',
  'scripts/log-query.mjs',
]
const read = (f) => readFileSync(join(ROOT, f), 'utf8')

for (const f of FILES) {
  test(`${f} chooses its database through db-target`, () => {
    const src = read(f)
    assert.match(src, /db-target/)
    assert.doesNotMatch(src, /process\.env\.(MONGO_URI|MONGO_LOCAL_URI|MONGO_REMOTE_URI)/)
    assert.doesNotMatch(src, /dotenv'\)\.config\(|\bconfig\(\{/)
  })
}

test('log-query has no --remote path except the replacement message', () => {
  const src = read('scripts/log-query.mjs')
  const hits = src.split('\n').filter((l) => l.includes("has('remote')"))
  assert.equal(hits.length, 1)
  assert.match(hits[0], /--remote was replaced by --target=atlas/)
})
