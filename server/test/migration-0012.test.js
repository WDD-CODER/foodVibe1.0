'use strict'
/** Plan 600 — migration 0012 deletes only the GEMINI_SHOTS documents with no businessId. */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const M = require('../migrations/0012-drop-unscoped-ai-shots')

beforeAll(async () => {
  await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  await testDb().collection('GEMINI_SHOTS').deleteMany({})
  await testDb().collection('GEMINI_SHOTS').insertMany([
    { prompt: 'legacy 1', status: 'approved' },
    { prompt: 'legacy 2', status: 'rejected' },
    { prompt: 'stamped', status: 'approved', businessId: 'bizX' },
    { prompt: 'shared', status: 'approved', businessId: '__master__' },
  ])
  process.exitCode = undefined
})

const silently = async fn => {
  const log = console.log
  const lines = []
  console.log = (...a) => lines.push(a.join(' '))
  try {
    return { value: await fn(), lines }
  } finally {
    console.log = log
  }
}

describe('migration 0012', () => {
  it('dry run reports the count and deletes nothing', async () => {
    const { lines } = await silently(async () => M.printPlan(await M.plan(testDb())))
    expect(lines.join('\n')).toContain('GEMINI_SHOTS without businessId: 2')
    expect(await testDb().collection('GEMINI_SHOTS').countDocuments()).toBe(4)
  })

  it('--write deletes only the unscoped shots; verify then passes', async () => {
    const db = testDb()
    await silently(async () => M.write(db, {}, await M.plan(db)))
    const left = (await db.collection('GEMINI_SHOTS').find({}).toArray()).map(d => d.prompt).sort()
    expect(left).toEqual(['shared', 'stamped'])
    const { value } = await silently(() => M.verify(db))
    expect(value.ok).toBe(true)
    expect(process.exitCode).toBeUndefined()
  })

  it('verify fails (exit code 1) while unscoped shots remain', async () => {
    const { value } = await silently(() => M.verify(testDb()))
    expect(value.ok).toBe(false)
    expect(process.exitCode).toBe(1)
    process.exitCode = undefined
  })
})
