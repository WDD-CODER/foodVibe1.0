'use strict'
/** Plan 442 - migration 0008: every event gets a stage and is marked old; idempotent; verify read-only. */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const M = require('../migrations/0008-event-stages')
const { menuEventSchema } = require('../generated/schemas/entities')
const { menuEventBody, stored } = require('./helpers/v2-docs')

const NOW = Date.parse('2026-10-20T10:00:00Z')

beforeAll(async () => {
  await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).drop()
})

const silently = async fn => {
  const log = console.log
  const lines = []
  console.log = (...a) => lines.push(a.join(' '))
  try {
    await fn()
  } finally {
    console.log = log
  }
  return lines
}

const event = (id, extra = {}) => stored(menuEventBody(), { _id: id, userId: 'u1', ...extra })
const raw = id => testDb().collection('menuEvents').findOne({ _id: id })

async function run() {
  const db = testDb()
  const result = await M.plan(db, NOW)
  await silently(() => M.write(db, { target: 'local', db: 'scratch' }, result))
  return result
}

describe('pure helpers', () => {
  it('reads today in Jerusalem', () => {
    expect(M.todayInJerusalem(NOW)).toBe('2026-10-20')
    expect(M.todayInJerusalem(Date.parse('2026-10-20T22:30:00Z'))).toBe('2026-10-21')
  })

  it('past dates finish, today / future / no date are quote_sent, an existing stage is untouched', () => {
    expect(M.legacyStage({ eventDate: '2026-09-01' }, '2026-10-20')).toBe('finished')
    expect(M.legacyStage({ eventDate: '2026-10-20' }, '2026-10-20')).toBe('quote_sent')
    expect(M.legacyStage({ eventDate: '2026-11-01T18:00' }, '2026-10-20')).toBe('quote_sent')
    expect(M.legacyStage({}, '2026-10-20')).toBe('quote_sent')
    expect(M.eventPatch({ stage: 'inquiry' }, '2026-10-20')).toBeNull()
  })
})

describe('plan / write / verify', () => {
  it('stages every event, marks it legacy and leaves a valid document', async () => {
    const events = testDb().collection('menuEvents')
    await events.insertMany([
      event('past', { eventDate: '2026-09-01' }),
      event('future', { eventDate: '2026-11-01' }),
      event('nodate'),
      event('master', { userId: '__master__', businessId: '__master__' }),
      event('trashed', { eventDate: '2026-01-01', deletedAt: 5 }),
      event('moved', { stage: 'deposit_paid', stageHistory: [{ stage: 'deposit_paid', at: 1, by: 'u', byName: 'n' }], notes: [] }),
    ])
    const dry = await M.plan(testDb(), NOW)
    expect(dry.perStage).toEqual({ finished: 2, quote_sent: 3 })
    expect(await raw('past')).not.toHaveProperty('stage')

    await run()
    for (const [id, stage] of [['past', 'finished'], ['future', 'quote_sent'], ['nodate', 'quote_sent'], ['master', 'quote_sent'], ['trashed', 'finished']]) {
      const doc = await raw(id)
      expect(doc).toMatchObject({ stage, legacy: true, stageHistory: [], notes: [] })
      expect(menuEventSchema.safeParse(doc).success).toBe(true)
    }
    const moved = await raw('moved')
    expect(moved.stage).toBe('deposit_paid')
    expect(moved.legacy).toBeUndefined()
    expect(moved.stageHistory).toHaveLength(1)
  })

  it('a second plan reports 0', async () => {
    await testDb().collection('menuEvents').insertOne(event('a', { eventDate: '2026-01-01' }))
    await run()
    const again = await M.plan(testDb(), NOW)
    expect(again.patches).toHaveLength(0)
    expect(again.perStage).toEqual({})
  })

  it('verify fails while an event has no stage and passes after the write', async () => {
    await testDb().collection('menuEvents').insertOne(event('a'))
    process.exitCode = undefined
    await silently(() => M.verify(testDb()))
    expect(process.exitCode).toBe(1)
    process.exitCode = undefined
    await run()
    const lines = await silently(() => M.verify(testDb()))
    expect(process.exitCode).toBeUndefined()
    expect(lines.join('\n')).toContain('[verify] OK')
  })
})
