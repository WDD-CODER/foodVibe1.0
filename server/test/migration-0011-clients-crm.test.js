'use strict'
/**
 * Plan 544 - migration 0011: backfills phoneKey, kinds, firstSeenAt and counters.events on live clients, lists
 * phoneKey collisions without touching them, is idempotent and verifies. Never reads __master__ or counts another
 * business's events.
 */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const M = require('../migrations/0011-clients-crm')
const { clientSchema } = require('../generated/schemas/entities')
const { menuEventBody, stored } = require('./helpers/v2-docs')

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

/** A client of business `b_<userId>` as plan 512 / migration 0009 stored it (no CRM fields). */
const client = (id, userId, phone, extra = {}) =>
  stored({ name: `לקוח ${id}`, phone, phoneNormalized: phone.replace(/\D/g, ''), clientType: 'private' }, { _id: id, userId, createdAt: 100, ...extra })
const event = (id, userId, extra = {}) => stored(menuEventBody(), { _id: id, userId, ...extra })
const raw = id => testDb().collection('clients').findOne({ _id: id })

async function seed() {
  const db = testDb()
  await db.collection('clients').insertMany([
    // Business A: two live events (one trashed event never counts) -> event_client, counters.events 2.
    client('a1', 'ownerA', '052-1234567'),
    // Business A: the same person in the international form -> a collision with a1, listed, never merged.
    client('a2', 'ownerA', '+972 52 123 4567', { kinds: ['diner'], firstSeenAt: 50 }),
    // Business A: no events -> kinds untouched, counters.events 0.
    client('a3', 'ownerA', '03-1234567'),
    // Business A: trashed -> never touched.
    client('a4', 'ownerA', '0529999999', { deletedAt: 5 }),
    // Business B: the same id as an A event's clientId is not used; its own event counts once.
    client('b1', 'ownerB', '0521234567'),
    // Master: never read.
    client('m1', '__master__', '0521234567'),
  ])
  await db.collection('menuEvents').insertMany([
    event('e1', 'ownerA', { clientId: 'a1' }),
    event('e2', 'ownerA', { clientId: 'a1' }),
    event('e3', 'ownerA', { clientId: 'a1', deletedAt: 5 }),
    // Another business's event pointing at a1 never counts for it.
    event('e4', 'ownerB', { clientId: 'a1' }),
    event('e5', 'ownerB', { clientId: 'b1' }),
    event('e6', '__master__', { clientId: 'm1' }),
  ])
}

describe('migration 0011', () => {
  it('the dry run writes nothing and prints the counts and one line per collision group', async () => {
    await seed()
    const db = testDb()
    const before = await db.collection('clients').find({}).sort({ _id: 1 }).toArray()
    const { lines } = await silently(async () => M.printPlan(await M.plan(db)))
    expect(lines[0]).toBe('clients: 4, to patch: 4, phoneKey collisions: 1')
    expect(lines.slice(1)).toEqual(['collision b_ownerA 521234567: a1 "לקוח a1", a2 "לקוח a2"'])
    expect(await db.collection('clients').find({}).sort({ _id: 1 }).toArray()).toEqual(before)
    expect(await db.collection('migrations').countDocuments()).toBe(0)
  })

  it('a collision line never carries the phone', async () => {
    await seed()
    const { lines } = await silently(async () => M.printPlan(await M.plan(testDb())))
    for (const line of lines) {
      expect(line).not.toContain('052-1234567')
      expect(line).not.toContain('0521234567')
      expect(line).not.toContain('972521234567')
    }
  })

  it('--write=yes backfills the fields, a second write changes 0 docs, verify prints ok', async () => {
    await seed()
    const db = testDb()
    const { value: first } = await silently(async () => M.write(db, { target: 'local', db: 'scratch' }, await M.plan(db)))
    expect(first.patched).toBe(4)

    expect(await raw('a1')).toMatchObject({ phoneKey: '521234567', kinds: ['event_client'], firstSeenAt: 100, counters: { events: 2 } })
    expect(await raw('a2')).toMatchObject({ phoneKey: '521234567', kinds: ['diner'], firstSeenAt: 50, counters: { events: 0 } })
    expect(await raw('a3')).toMatchObject({ phoneKey: '031234567', firstSeenAt: 100, counters: { events: 0 } })
    expect(await raw('a3')).not.toHaveProperty('kinds')
    expect(await raw('b1')).toMatchObject({ phoneKey: '521234567', kinds: ['event_client'], counters: { events: 1 } })
    expect(await raw('a4')).not.toHaveProperty('phoneKey')
    expect(await raw('m1')).not.toHaveProperty('phoneKey')
    for (const id of ['a1', 'a2', 'a3', 'b1']) expect(clientSchema.safeParse(await raw(id)).success).toBe(true)
    expect(await db.collection('migrations').findOne({ _id: M.MIGRATION_ID })).toMatchObject({ patched: 4 })

    const { value: second } = await silently(async () => M.write(db, { target: 'local', db: 'scratch' }, await M.plan(db)))
    expect(second.patched).toBe(0)

    const { value: check, lines } = await silently(() => M.verify(db))
    expect(check.ok).toBe(true)
    expect(lines).toContain('verify: ok')
  })

  it('verify fails before the write', async () => {
    await seed()
    const { value, lines } = await silently(() => M.verify(testDb()))
    expect(value).toEqual({ ok: false, failing: 4 })
    expect(lines).toContain('verify: fail 4')
    expect(process.exitCode).toBe(1)
    process.exitCode = undefined
  })

  it('a write without --backup-dir on a real target is refused', async () => {
    await seed()
    const db = testDb()
    await expect(M.write(db, { target: 'local' }, await M.plan(db))).rejects.toThrow(/--backup-dir/)
    expect(await raw('a1')).not.toHaveProperty('phoneKey')
  })

  it('an invalid client aborts the dry run', async () => {
    await testDb().collection('clients').insertOne(client('bad', 'ownerA', '0521234567', { name: 7 }))
    await expect(M.plan(testDb())).rejects.toThrow(/invalid client bad/)
  })
})
