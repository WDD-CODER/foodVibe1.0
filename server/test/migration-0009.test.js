'use strict'
/** Plan 513 - migration 0009: one client per phone (or name) per business, events linked, idempotent, verify. */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const M = require('../migrations/0009-clients-from-events')
const { clientSchema } = require('../generated/schemas/entities')
const { menuEventBody, stored } = require('./helpers/v2-docs')

const NOW = Date.parse('2026-11-03T10:00:00Z')

beforeAll(async () => {
  await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).drop()
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

/** An event of business `b_<userId>`, created by `userId`. */
const event = (id, userId, extra = {}) => stored(menuEventBody(), { _id: id, userId, ...extra })
const raw = id => testDb().collection('menuEvents').findOne({ _id: id })

async function run() {
  const db = testDb()
  const result = await M.plan(db, NOW)
  const { value } = await silently(() => M.write(db, { target: 'local', db: 'scratch' }, result))
  return { result, ...value }
}

async function seed() {
  const db = testDb()
  await db.collection('users').insertMany([
    { _id: 'staffA', name: 'staffA', email: 'staffA@test.local', businessId: 'b_ownerA', businessRole: 'staff', createdAt: 1 },
    { _id: 'ownerA', name: 'ownerA', email: 'ownerA@test.local', businessId: 'b_ownerA', businessRole: 'owner', createdAt: 2 },
  ])
  await db.collection('menuEvents').insertMany([
    // Business A: the same phone in two formats -> one client, named after the most recently updated event.
    event('a1', 'ownerA', { clientName: 'דנה', clientPhone: '052-1234567', updatedAt: 10, createdBy: 'staffA' }),
    event('a2', 'ownerA', { clientName: 'דנה כהן', clientPhone: '0521234567', updatedAt: 20 }),
    // Business A: a name only, twice with different spacing -> one group by the trimmed name.
    event('a3', 'ownerA', { clientName: '  יוסי  ' }),
    event('a4', 'ownerA', { clientName: 'יוסי' }),
    // Business A: neither -> skipped.
    event('a5', 'ownerA', { clientName: '   ' }),
    // Business B (no owner user): the same phone as A -> its own client, created by its first event's creator.
    event('b1', 'ownerB', { clientPhone: '052 123 4567', createdAt: 5, createdBy: 'lateB' }),
    event('b2', 'ownerB', { clientPhone: '0521234567', createdAt: 3, createdBy: 'firstB' }),
    // Never touched: trashed and master events.
    event('trashed', 'ownerA', { clientName: 'x', clientPhone: '0500000000', deletedAt: 5 }),
    event('master', '__master__', { clientName: 'x', clientPhone: '0500000000' }),
  ])
}

describe('pure helpers', () => {
  it('normalizePhone keeps the digits only', () => {
    expect(M.normalizePhone('052-123 45(67)')).toBe('0521234567')
    expect(M.normalizePhone(undefined)).toBe('')
    expect(M.normalizePhone('abc')).toBe('')
  })

  it('groupKey groups by phone digits, then by trimmed name, else null', () => {
    expect(M.groupKey({ clientPhone: '052-1234567', clientName: 'a' })).toEqual({ kind: 'phone', value: '0521234567' })
    expect(M.groupKey({ clientPhone: '--', clientName: '  דנה ' })).toEqual({ kind: 'name', value: 'דנה' })
    expect(M.groupKey({ clientName: '   ' })).toBeNull()
    expect(M.groupKey({})).toBeNull()
  })
})

describe('plan / write / verify', () => {
  it('dry run counts per business and writes nothing', async () => {
    await seed()
    const r = await M.plan(testDb(), NOW)
    expect(r.clientsToInsert).toHaveLength(2)
    expect(r.eventPatches.map(p => p.eventId).sort()).toEqual(['a1', 'a2', 'b1', 'b2'])
    expect(r.skipped.sort()).toEqual(['a3', 'a4', 'a5'])
    expect(r.invalid).toHaveLength(1)
    expect(r.invalid[0]).toMatchObject({ key: 'b_ownerA|name:יוסי', eventIds: ['a3', 'a4'] })
    expect(r.perBusiness).toEqual({
      b_ownerA: { clients: 1, events: 2, skipped: 3 },
      b_ownerB: { clients: 1, events: 2, skipped: 0 },
    })
    expect(await testDb().collection('clients').countDocuments()).toBe(0)
    expect(await raw('a1')).not.toHaveProperty('clientId')
  })

  it('inserts one valid client per group, links the events and sets createdBy to the owner', async () => {
    await seed()
    const { inserted, patched } = await run()
    expect(inserted).toBe(2)
    expect(patched).toBe(4)

    const clients = await testDb().collection('clients').find().toArray()
    for (const c of clients) expect(clientSchema.safeParse(c).success).toBe(true)
    const a = clients.find(c => c.businessId === 'b_ownerA')
    const b = clients.find(c => c.businessId === 'b_ownerB')
    expect(a).toMatchObject({ name: 'דנה כהן', phone: '0521234567', phoneNormalized: '0521234567', clientType: 'private', createdBy: 'ownerA', schemaVersion: 2, createdAt: NOW })
    expect(b).toMatchObject({ phoneNormalized: '0521234567', createdBy: 'firstB' })
    expect(b.name).toBe(b.phone)

    expect((await raw('a1')).clientId).toBe(a._id)
    expect((await raw('a2')).clientId).toBe(a._id)
    expect((await raw('a2')).clientName).toBe('דנה כהן')
    expect((await raw('b1')).clientId).toBe(b._id)
    expect((await raw('b2')).updatedAt).toBe(NOW)
    for (const id of ['a3', 'a4', 'a5', 'trashed', 'master']) expect(await raw(id)).not.toHaveProperty('clientId')

    const marker = await testDb().collection('migrations').findOne({ _id: M.MIGRATION_ID })
    expect(marker.runs).toBe(1)
  })

  it('a second run inserts 0 clients and patches 0 events', async () => {
    await seed()
    await run()
    const again = await run()
    expect(again.inserted).toBe(0)
    expect(again.patched).toBe(0)
    expect(await testDb().collection('clients').countDocuments()).toBe(2)
    expect((await testDb().collection('migrations').findOne({ _id: M.MIGRATION_ID })).runs).toBe(2)
  })

  it('reuses an existing client of the business instead of inserting a duplicate', async () => {
    await seed()
    await testDb().collection('clients').insertOne({ _id: 'existing', schemaVersion: 2, businessId: 'b_ownerA', createdBy: 'ownerA', createdAt: 1, updatedAt: 1, name: 'דנה', phone: '052-1234567', phoneNormalized: '0521234567', clientType: 'private' })
    const { inserted } = await run()
    expect(inserted).toBe(1)
    expect((await raw('a1')).clientId).toBe('existing')
    expect(await testDb().collection('clients').countDocuments({ businessId: 'b_ownerA' })).toBe(1)
  })

  it('verify fails while an event with a phone or name has no clientId and passes once all are linked', async () => {
    await seed()
    // Without the name-only events: everything is linkable.
    await testDb().collection('menuEvents').deleteMany({ _id: { $in: ['a3', 'a4'] } })
    const before = await silently(() => M.verify(testDb()))
    expect(before.value).toMatchObject({ ok: false, failing: 4 })
    expect(before.lines.join('\n')).toContain('verify: fail 4')
    expect(process.exitCode).toBe(1)

    process.exitCode = undefined
    await run()
    const after = await silently(() => M.verify(testDb()))
    expect(after.value).toEqual({ ok: true, failing: 0, unlinkable: 0 })
    expect(after.lines.join('\n')).toContain('verify: ok')
    expect(process.exitCode).toBeUndefined()
  })

  it('verify does not print ok while name-only events stay unlinked (clientSchema needs a phone)', async () => {
    await seed()
    await run()
    const after = await silently(() => M.verify(testDb()))
    expect(after.value).toEqual({ ok: false, failing: 2, unlinkable: 2 })
    expect(after.lines.join('\n')).toContain('verify: fail 2')
    expect(after.lines.join('\n')).not.toContain('verify: ok')
    expect(process.exitCode).toBe(1)
  })
})
