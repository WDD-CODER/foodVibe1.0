'use strict'
/**
 * Plan 513 - migration 0009: one client per phone per business, events linked, idempotent, verify.
 * Name-only and invalid-phone events stay unlinked, are listed by id and never fail verify (Human 2026-11-03).
 */

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
    // Business A: the same phone in two formats and two names -> one client, named after the most recent event.
    event('a1', 'ownerA', { clientName: 'דנה', clientPhone: '052-1234567', updatedAt: 10, createdBy: 'staffA' }),
    event('a2', 'ownerA', { clientName: 'דנה כהן', clientPhone: '0521234567', updatedAt: 20 }),
    // Business A: a name only -> listed, not linked.
    event('a3', 'ownerA', { clientName: '  יוסי  ' }),
    // Business A: neither -> skipped.
    event('a4', 'ownerA', { clientName: '   ', clientPhone: ' ' }),
    // Business A: a phone with letters, and a phone with 5 digits -> invalid-phone, listed with the raw value.
    event('a5', 'ownerA', { clientName: 'רון', clientPhone: '050-1234567 ext 5' }),
    event('a6', 'ownerA', { clientName: 'גל', clientPhone: '12345' }),
    // Business A: dots fail the client regex -> the client phone is the digits.
    event('a7', 'ownerA', { clientName: 'מיכל', clientPhone: '052.765.4321' }),
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

  it('resolvePhone keeps a schema-valid phone, takes the digits of a separated one, refuses the rest', () => {
    expect(M.resolvePhone(' 052-1234567 ')).toEqual({ phone: '052-1234567', phoneNormalized: '0521234567' })
    expect(M.resolvePhone('+972 (52) 123-4567')).toEqual({ phone: '+972 (52) 123-4567', phoneNormalized: '972521234567' })
    expect(M.resolvePhone('052.123.4567')).toEqual({ phone: '0521234567', phoneNormalized: '0521234567' })
    expect(M.resolvePhone('052/123/4567')).toEqual({ phone: '0521234567', phoneNormalized: '0521234567' })
    // 21 characters fails the client regex; digits plus separators -> digits only.
    expect(M.resolvePhone('052 - 123 - 4567 - 00')).toEqual({ phone: '052123456700', phoneNormalized: '052123456700' })
    expect(M.resolvePhone('050-1234567 ext 5')).toBeNull()
    expect(M.resolvePhone('0521234567a')).toBeNull()
    expect(M.resolvePhone('abcdefghijklmnopqrs')).toBeNull()
    expect(M.resolvePhone('05212345#67')).toBeNull()
    expect(M.resolvePhone('12345')).toBeNull()
    expect(M.resolvePhone('1-2-3-4-5-6')).toBeNull()
    expect(M.resolvePhone('1'.repeat(21))).toBeNull()
    expect(M.resolvePhone('1'.repeat(20))).toEqual({ phone: '1'.repeat(20), phoneNormalized: '1'.repeat(20) })
  })

  it('groupKey: phone group, invalid phone, name only, or null', () => {
    expect(M.groupKey({ clientPhone: '052-1234567', clientName: 'a' })).toEqual({ kind: 'phone', value: '0521234567', phone: '052-1234567' })
    expect(M.groupKey({ clientPhone: 'ext', clientName: 'a' })).toEqual({ kind: 'invalid-phone', raw: 'ext' })
    expect(M.groupKey({ clientPhone: '  ', clientName: '  דנה ' })).toEqual({ kind: 'name-only', name: 'דנה' })
    expect(M.groupKey({ clientName: '   ' })).toBeNull()
    expect(M.groupKey({})).toBeNull()
  })
})

describe('plan / write / verify', () => {
  it('dry run counts per business, lists the unlinked events and writes nothing', async () => {
    await seed()
    const r = await M.plan(testDb(), NOW)
    expect(r.clientsToInsert).toHaveLength(3)
    expect(r.eventPatches.map(p => p.eventId).sort()).toEqual(['a1', 'a2', 'a7', 'b1', 'b2'])
    expect([...r.skipped].sort()).toEqual(['a3', 'a4', 'a5', 'a6'])
    expect(r.nameOnly).toEqual(['a3'])
    expect(r.invalidPhone).toEqual([{ eventId: 'a5', raw: '050-1234567 ext 5' }, { eventId: 'a6', raw: '12345' }])
    expect(r.sameNameConflicts).toEqual([{ businessId: 'b_ownerA', phone: '0521234567', names: ['דנה כהן', 'דנה'] }])
    expect(r.perBusiness).toEqual({
      b_ownerA: { clients: 2, events: 3, skipped: 4 },
      b_ownerB: { clients: 1, events: 2, skipped: 0 },
    })
    expect(await testDb().collection('clients').countDocuments()).toBe(0)
    expect(await raw('a1')).not.toHaveProperty('clientId')
  })

  it('dry-run output prints the summary, the different names and both unlinked lists', async () => {
    await seed()
    const r = await M.plan(testDb(), NOW)
    const { lines } = await silently(() => M.printPlan(r))
    expect(lines).toContain('clients: 3, events: 5, skipped: 4')
    expect(lines).toContain('b_ownerA: clients 2, events 3, skipped 4')
    expect(lines).toContain('same phone, different names: 0521234567 → דנה כהן | דנה')
    expect(lines).toContain('name-only events: 1')
    expect(lines).toContain('  a3')
    expect(lines).toContain('invalid-phone events: 2')
    expect(lines).toContain('  a5 "050-1234567 ext 5"')
    expect(lines).toContain('  a6 "12345"')
  })

  it('inserts one valid client per phone group, links the events and sets createdBy to the owner', async () => {
    await seed()
    const { inserted, patched } = await run()
    expect(inserted).toBe(3)
    expect(patched).toBe(5)

    const clients = await testDb().collection('clients').find().toArray()
    for (const c of clients) expect(clientSchema.safeParse(c).success).toBe(true)
    for (const c of clients) expect(c._id).toMatch(/^[0-9a-f-]{36}$/)
    const a = clients.find(c => c.businessId === 'b_ownerA' && c.phoneNormalized === '0521234567')
    const dotted = clients.find(c => c.businessId === 'b_ownerA' && c.phoneNormalized === '0527654321')
    const b = clients.find(c => c.businessId === 'b_ownerB')
    expect(a).toMatchObject({ name: 'דנה כהן', phone: '0521234567', clientType: 'private', createdBy: 'ownerA', schemaVersion: 2, createdAt: NOW, updatedAt: NOW })
    expect(dotted).toMatchObject({ name: 'מיכל', phone: '0527654321', createdBy: 'ownerA' })
    expect(b).toMatchObject({ phoneNormalized: '0521234567', createdBy: 'firstB' })
    expect(b.name).toBe(b.phone)

    expect((await raw('a1')).clientId).toBe(a._id)
    expect((await raw('a2')).clientId).toBe(a._id)
    expect((await raw('a2')).clientName).toBe('דנה כהן')
    expect((await raw('a7')).clientId).toBe(dotted._id)
    expect((await raw('b1')).clientId).toBe(b._id)
    expect((await raw('b2')).updatedAt).toBe(NOW)
    for (const id of ['a3', 'a4', 'a5', 'a6', 'trashed', 'master']) expect(await raw(id)).not.toHaveProperty('clientId')

    const marker = await testDb().collection('migrations').findOne({ _id: M.MIGRATION_ID })
    expect(marker.runs).toBe(1)
  })

  it('a second run inserts 0 clients and patches 0 events', async () => {
    await seed()
    await run()
    const again = await run()
    expect(again.inserted).toBe(0)
    expect(again.patched).toBe(0)
    expect(again.result.clientsToInsert).toHaveLength(0)
    expect(await testDb().collection('clients').countDocuments()).toBe(3)
    expect((await testDb().collection('migrations').findOne({ _id: M.MIGRATION_ID })).runs).toBe(2)
  })

  it('reuses the oldest existing client with the same phone instead of inserting a duplicate', async () => {
    await seed()
    const existing = { schemaVersion: 2, businessId: 'b_ownerA', createdBy: 'ownerA', updatedAt: 1, name: 'דנה', phone: '052-1234567', phoneNormalized: '0521234567', clientType: 'private' }
    await testDb().collection('clients').insertMany([
      { ...existing, _id: 'newer', createdAt: 9 },
      { ...existing, _id: 'oldest', createdAt: 1 },
    ])
    const { inserted } = await run()
    expect(inserted).toBe(2)
    expect((await raw('a1')).clientId).toBe('oldest')
    expect((await raw('a2')).clientId).toBe('oldest')
    expect(await testDb().collection('clients').countDocuments({ businessId: 'b_ownerA', phoneNormalized: '0521234567' })).toBe(2)
  })

  it('never reuses a client by name alone', async () => {
    await seed()
    await testDb().collection('clients').insertOne({ _id: 'byName', schemaVersion: 2, businessId: 'b_ownerA', createdBy: 'ownerA', createdAt: 1, updatedAt: 1, name: 'יוסי', phone: '0509999999', phoneNormalized: '0509999999', clientType: 'private' })
    await run()
    expect(await raw('a3')).not.toHaveProperty('clientId')
  })

  it('verify fails while a phone event is unlinked, then passes with name-only and invalid-phone events listed', async () => {
    await seed()
    const before = await silently(() => M.verify(testDb()))
    expect(before.value).toMatchObject({ ok: false, failing: 5 })
    expect(before.lines).toContain('verify: fail 5')
    expect(process.exitCode).toBe(1)

    process.exitCode = undefined
    await run()
    const after = await silently(() => M.verify(testDb()))
    expect(after.value).toEqual({
      ok: true,
      failing: 0,
      nameOnly: ['a3'],
      invalidPhone: [{ eventId: 'a5', raw: '050-1234567 ext 5' }, { eventId: 'a6', raw: '12345' }],
    })
    expect(after.lines).toContain('verify: ok')
    expect(after.lines).toContain('name-only events: 1')
    expect(after.lines).toContain('  a3')
    expect(after.lines).toContain('invalid-phone events: 2')
    expect(after.lines).toContain('  a5 "050-1234567 ext 5"')
    expect(process.exitCode).toBeUndefined()
  })

  it('aborts the dry run on the first client that fails clientSchema', async () => {
    await testDb().collection('menuEvents').insertOne(event('long', 'ownerA', { clientName: 'א'.repeat(201), clientPhone: '0521234567' }))
    await expect(M.plan(testDb(), NOW)).rejects.toThrow(/invalid client for b_ownerA\|0521234567/)
    expect(await testDb().collection('clients').countDocuments()).toBe(0)
  })
})
