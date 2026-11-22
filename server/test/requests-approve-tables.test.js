'use strict'
/** Plan 685 (C-BOOK2, C-TABLES, C-HOLD): approving a table request goes through the table booking service. */

const mongoose = require('mongoose')
const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { clearModuleCache } = require('../middleware/require-module')
const { ROOM, profileWith, tableKeyOf } = require('../generated/schemas/testing/table-engine-fixtures')
const { turnFor } = require('../generated/schemas/front-desk/table-engine')
const { tableServiceOf } = require('../generated/schemas/front-desk/table-service')
const { wallOf } = require('../services/table-bookings')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'Owner', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'Staff', businessId: 'b1', businessRole: 'staff' }
const FD_OWNER = { userId: 'own2', name: 'Owner2', businessId: 'bFd', businessRole: 'owner' }
const DAY = 86400000
const DATE = wallOf(Date.now() + 2 * DAY).date
const T2 = tableKeyOf(2)
const T3 = tableKeyOf(3)
const SERVICE = tableServiceOf(profileWith())
const dbc = name => testDb().collection(name)
const approve = (user, id, body = {}) => request(app).post(`/api/v1/requests/${id}/approve`).set(as(user)).send(body)

const COLLECTIONS = ['businesses', 'frontDeskProfiles', 'floorPlans', 'bookings', 'tableHolds', 'clients', 'requests', 'decisionLog']

/** A plan of the given tables of the shared room fixture. */
const planOf = (businessId, keys) => ({
  ...ROOM, _id: `fp-${businessId}`, businessId, tables: ROOM.tables.filter(t => keys.includes(t.key)),
})

async function seed(keys) {
  for (const c of COLLECTIONS) await dbc(c).deleteMany({})
  await dbc('businesses').insertMany([
    { _id: 'b1', name: 'one', ownerId: 'own1', createdAt: 1, modules: ['frontdesk', 'tables'] },
    { _id: 'bFd', name: 'fd', ownerId: 'own2', createdAt: 1, modules: ['frontdesk'] },
  ])
  clearModuleCache()
  await dbc('frontDeskProfiles').insertMany([
    { ...profileWith(), _id: 'p1', businessId: 'b1' },
    { ...profileWith(), _id: 'p2', businessId: 'bFd', slug: 'other-place' },
  ])
  await dbc('floorPlans').insertOne(planOf('b1', keys))
  for (const [id, businessId] of [['c1', 'b1'], ['c2', 'bFd']]) {
    await dbc('clients').insertOne({
      _id: id, schemaVersion: 2, businessId, createdBy: 'own1', createdAt: 1, updatedAt: 1, name: 'Dana Levi',
      phone: '0521234567', phoneNormalized: '+972521234567', phoneKey: '521234567', clientType: 'private', source: 'manual',
      kinds: ['lead'], counters: { requests: 1, bookings: 0, events: 0, noShows: 0, conversations: 0 },
    })
  }
}

/** A stored, qualified request of `businessId`. */
async function seedRequest(id, over = {}) {
  const now = Date.now()
  const businessId = over.businessId ?? 'b1'
  const doc = {
    _id: id, schemaVersion: 2, businessId, createdBy: 'own1', createdAt: now - 90_000, updatedAt: now - 90_000,
    kind: 'table', status: 'qualified', channel: 'manual', clientId: businessId === 'b1' ? 'c1' : 'c2', guestName: 'Dana Levi',
    guestPhone: '0521234567', wanted: { date: DATE, time: '20:00', partySize: 2 }, answers: [],
    qualification: { verdict: 'fit', reasons: [], by: 'rules' },
    statusHistory: [{ status: 'qualified', at: now - 90_000, by: 'own1', byName: 'Owner', via: 'member' }],
    publicToken: id.padEnd(32, 'T'), ...over,
  }
  await dbc('requests').insertOne(doc)
  return doc
}

const bookings = () => dbc('bookings').find({}).toArray()
const holdRows = () => dbc('tableHolds').find({}).toArray()

describe('approve a table request with tables on', () => {
  beforeEach(async () => {
    await seed([T2])
  })

  it('stores a confirmed booking on an engine table with its holds, links both ways, counts, logs once', async () => {
    await seedRequest('r1')
    const res = await approve(OWNER, 'r1')
    expect(res.status).toBe(200)
    const all = await bookings()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({
      status: 'confirmed', source: 'request', kind: 'table', tableKeys: [T2], durationMinutes: turnFor(SERVICE, 2), requestId: 'r1',
    })
    const rows = await holdRows()
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every(r => r.bookingId === all[0]._id)).toBe(true)
    const stored = await dbc('requests').findOne({ _id: 'r1' })
    expect(stored.status).toBe('approved')
    expect(stored.outcome).toEqual({ type: 'booking', id: all[0]._id })
    expect((await dbc('clients').findOne({ _id: 'c1' })).counters.bookings).toBe(1)
    expect(await dbc('decisionLog').countDocuments({})).toBe(1)
  })

  it('a second request for the one table and time: 409 NO_TABLE, nothing written; the owner chooses another table', async () => {
    await dbc('floorPlans').deleteMany({})
    await dbc('floorPlans').insertOne(planOf('b1', [T2, T3]))
    const startAt = require('../generated/schemas/front-desk/local-time').jerusalemEpoch(DATE, '20:00')
    await dbc('tableHolds').insertOne({ _id: 'ghost', businessId: 'b1', tableKey: T3, cell: startAt, bookingId: 'ghost' })
    await seedRequest('r1')
    await seedRequest('r2')
    expect((await approve(OWNER, 'r1')).status).toBe(200)
    const holdsBefore = (await holdRows()).length
    const refused = await approve(OWNER, 'r2')
    expect(refused.status).toBe(409)
    expect(refused.body).toMatchObject({ error: 'NO_TABLE', reason: 'full' })
    expect(Array.isArray(refused.body.alternatives)).toBe(true)
    const r2 = await dbc('requests').findOne({ _id: 'r2' })
    expect(r2.status).toBe('qualified')
    expect(r2.outcome).toBeUndefined()
    expect(await bookings()).toHaveLength(1)
    expect(await holdRows()).toHaveLength(holdsBefore)
    expect(await dbc('decisionLog').countDocuments({})).toBe(1)

    await dbc('tableHolds').deleteMany({ bookingId: 'ghost' })
    expect((await approve(STAFF, 'r2', { tableKeys: [T3] })).status).toBe(403)
    const bad = await approve(OWNER, 'r2', { tableKeys: ['nosuchtable'] })
    expect([bad.status, bad.body.error]).toEqual([400, 'BAD_TABLES'])
    expect((await dbc('requests').findOne({ _id: 'r2' })).status).toBe('qualified')
    const chosen = await approve(OWNER, 'r2', { tableKeys: [T3] })
    expect(chosen.status).toBe(200)
    expect(chosen.body.outcome.tableKeys).toEqual([T3])
  })

  it('two approves at once for the one table: one 200, one 409 NO_TABLE, one booking', async () => {
    await seedRequest('r1')
    await seedRequest('r2')
    const results = await Promise.all([approve(OWNER, 'r1'), approve(OWNER, 'r2')])
    expect(results.map(r => r.status).sort()).toEqual([200, 409])
    expect(results.find(r => r.status === 409).body.error).toBe('NO_TABLE')
    const all = await bookings()
    expect(all).toHaveLength(1)
    expect((await holdRows()).every(r => r.bookingId === all[0]._id)).toBe(true)
  })

  it('no orphan hold: a failed booking insert gives the request back and leaves no hold', async () => {
    await seedRequest('r1')
    const Collection = Object.getPrototypeOf(mongoose.connection.db.collection('bookings'))
    const original = Collection.insertOne
    const spy = vi.spyOn(Collection, 'insertOne').mockImplementation(function (...args) {
      if (this.collectionName === 'bookings') return Promise.reject(new Error('write failed'))
      return original.apply(this, args)
    })
    try {
      const res = await approve(OWNER, 'r1')
      expect(res.status).toBe(500)
    } finally {
      spy.mockRestore()
    }
    const stored = await dbc('requests').findOne({ _id: 'r1' })
    expect(stored.status).toBe('qualified')
    expect(stored.outcome).toBeUndefined()
    expect(await holdRows()).toHaveLength(0)
    expect(await bookings()).toHaveLength(0)
  })

  it('tableKeys for a tasting request is 400 BAD_REQUEST_INPUT; malformed keys too', async () => {
    await seedRequest('t1', { kind: 'tasting' })
    const res = await approve(OWNER, 't1', { tableKeys: [T2] })
    expect([res.status, res.body.error]).toEqual([400, 'BAD_REQUEST_INPUT'])
    await seedRequest('r1')
    expect((await approve(OWNER, 'r1', { tableKeys: [] })).status).toBe(400)
  })
})

describe('approve as today', () => {
  beforeEach(async () => {
    await seed([T2])
  })

  it('a tasting request, a table request with tables off and a test request take no table', async () => {
    await seedRequest('t1', { kind: 'tasting' })
    const tasting = await approve(OWNER, 't1')
    expect(tasting.status).toBe(200)
    expect(tasting.body.outcome.tableKeys).toBeUndefined()

    await seedRequest('f1', { businessId: 'bFd' })
    const off = await approve(FD_OWNER, 'f1')
    expect(off.status).toBe(200)
    expect(off.body.outcome.tableKeys).toBeUndefined()
    const sent = await seedRequest('f2', { businessId: 'bFd' })
    expect((await approve(FD_OWNER, sent._id, { tableKeys: [T2] })).status).toBe(400)

    await seedRequest('x1', { test: true, clientId: '__test__' })
    const test = await approve(OWNER, 'x1')
    expect(test.status).toBe(200)
    expect(test.body.test).toBe(true)
    expect(await holdRows()).toHaveLength(0)
  })
})
