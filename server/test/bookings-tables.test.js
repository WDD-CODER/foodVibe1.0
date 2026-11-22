'use strict'
/** Plan 668 (C-HOLD, C-BOOK2): table bookings on the server: holds, phone booking, walk-in, move, change, day read. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { captureLogs } = require('./helpers/log-capture')
const { clearModuleCache } = require('../middleware/require-module')
const { ROOM, profileWith, tableKeyOf } = require('../generated/schemas/testing/table-engine-fixtures')
const { turnFor } = require('../generated/schemas/front-desk/table-engine')
const { tableServiceOf } = require('../generated/schemas/front-desk/table-service')
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')
const { wallOf, bookTable, loadTableContext } = require('../services/table-bookings')

let app
let logs

beforeAll(async () => {
  app = await buildTestApp()
  logs = captureLogs()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'Owner', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'Staff', businessId: 'b1', businessRole: 'staff' }
const FD_ONLY = { userId: 'own2', name: 'Owner2', businessId: 'bFd', businessRole: 'owner' }
const DAY = 86400000
const DATE = wallOf(Date.now() + 2 * DAY).date
const T1 = tableKeyOf(1) // 2 seats
const T2 = tableKeyOf(2) // 2-4 seats
const T3 = tableKeyOf(3)
const SERVICE = tableServiceOf(profileWith())
const dbc = name => testDb().collection(name)

async function seed(modules) {
  for (const c of ['businesses', 'frontDeskProfiles', 'floorPlans', 'bookings', 'tableHolds', 'clients']) await dbc(c).deleteMany({})
  await dbc('businesses').insertMany([
    { _id: 'b1', name: 'one', ownerId: 'own1', createdAt: 1, modules },
    { _id: 'bFd', name: 'fd', ownerId: 'own2', createdAt: 1, modules: ['frontdesk'] },
  ])
  clearModuleCache()
  await dbc('frontDeskProfiles').insertMany([
    { ...profileWith(), _id: 'p1', businessId: 'b1' },
    { ...profileWith(), _id: 'p2', businessId: 'bFd', slug: 'other-place' },
  ])
  await dbc('floorPlans').insertOne({ ...ROOM, _id: 'fp1', businessId: 'b1' })
  await dbc('clients').insertOne({
    _id: 'c1', schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: 1, updatedAt: 1, name: 'Dana Levi',
    phone: '0521234567', phoneNormalized: '+972521234567', phoneKey: '521234567', clientType: 'private', source: 'manual',
    kinds: ['lead'], counters: { requests: 0, bookings: 0, events: 0, noShows: 0, conversations: 0 },
  })
}

beforeEach(async () => {
  await seed(['frontdesk', 'tables'])
})

const post = (body, user = OWNER) => request(app).post('/api/v1/bookings').set(as(user)).send(body)
const phoneBody = (over = {}) => ({ clientId: 'c1', date: DATE, time: '20:00', partySize: 2, ...over })
const bookings = () => dbc('bookings').find({}).toArray()
const holdRows = () => dbc('tableHolds').find({}).toArray()

/** A confirmed table booking written straight into the database, with its holds. */
async function seedBooking(id, over = {}) {
  const startAt = jerusalemEpoch(DATE, over.time ?? '20:00')
  const durationMinutes = turnFor(SERVICE, 2)
  const doc = {
    _id: id, schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: 1, updatedAt: 1, kind: 'table', status: 'confirmed',
    source: 'phone', date: DATE, time: '20:00', startAt, endAt: startAt + durationMinutes * 60000, durationMinutes, partySize: 2,
    clientId: 'c1', guestName: 'Dana Levi', guestPhone: '0521234567', statusHistory: [{ status: 'confirmed', at: 1, by: 'own1', byName: 'O', via: 'member' }],
    publicToken: id.padEnd(32, 'T'), ...over,
  }
  await dbc('bookings').insertOne(doc)
  if (doc.tableKeys) {
    const rows = []
    for (const tableKey of doc.tableKeys) {
      for (let cell = Math.floor(doc.startAt / 900000) * 900000; cell < doc.endAt; cell += 900000) {
        rows.push({ _id: `${id}-${tableKey}-${cell}`, businessId: 'b1', tableKey, cell, bookingId: id })
      }
    }
    await dbc('tableHolds').insertMany(rows)
  }
  return doc
}

describe('POST / (phone booking)', () => {
  it('without tableKeys: the engine assigns, the duration is the turn, the client counter moves', async () => {
    const res = await post(phoneBody())
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ status: 'confirmed', source: 'phone', kind: 'table', durationMinutes: turnFor(SERVICE, 2), clientId: 'c1' })
    expect(res.body.tableKeys).toHaveLength(1)
    expect(res.body.override).toBeUndefined()
    expect((await bookings())).toHaveLength(1)
    expect(await dbc('tableHolds').countDocuments({ bookingId: res.body._id })).toBeGreaterThan(0)
    const client = await dbc('clients').findOne({ _id: 'c1' })
    expect(client.counters.bookings).toBe(1)
    expect(client.kinds).toEqual(['diner'])
  })

  it('a guest creates the client by phone', async () => {
    const res = await post({ guest: { name: 'Noa Bar', phone: '0541112233' }, date: DATE, time: '19:00', partySize: 3 })
    expect(res.status).toBe(201)
    expect(await dbc('clients').countDocuments({})).toBe(2)
  })

  it('a full time: 409 NO_TABLE with at most three alternatives, nothing written', async () => {
    const startAt = jerusalemEpoch(DATE, '20:00')
    const rows = ROOM.tables.map((t, i) => ({ _id: 'h' + i, businessId: 'b1', tableKey: t.key, cell: startAt, bookingId: 'ghost' }))
    await dbc('tableHolds').insertMany(rows)
    const res = await post(phoneBody())
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('NO_TABLE')
    expect(res.body.reason).toBe('full')
    expect(res.body.alternatives.length).toBeLessThanOrEqual(3)
    expect(await bookings()).toHaveLength(0)
    expect(await dbc('tableHolds').countDocuments({})).toBe(rows.length)
  })

  it('tableKeys: a staff token 403; the owner stores override when the set is not a candidate', async () => {
    expect((await post(phoneBody({ tableKeys: [T1] }), STAFF)).status).toBe(403)
    const fits = await post(phoneBody({ tableKeys: [T1] }))
    expect(fits.status).toBe(201)
    expect(fits.body.override).toBeUndefined()
    const off = await post(phoneBody({ time: '18:00', partySize: 4, tableKeys: [T1] }))
    expect(off.status).toBe(201)
    expect(off.body.override).toBe(true)
  })

  it('an unknown or inactive table is 400 BAD_TABLES', async () => {
    const unknown = await post(phoneBody({ tableKeys: ['nosuchtable'] }))
    expect([unknown.status, unknown.body.error]).toEqual([400, 'BAD_TABLES'])
    const inactive = await post(phoneBody({ tableKeys: [tableKeyOf(5)] }))
    expect([inactive.status, inactive.body.error]).toEqual([400, 'BAD_TABLES'])
  })

  it('bad input, an unknown client', async () => {
    expect((await post(phoneBody({ time: '25:00' }))).status).toBe(400)
    expect((await post({ ...phoneBody(), guest: { name: 'x', phone: '0541112233' } })).status).toBe(400)
    expect((await post(phoneBody({ clientId: 'nobody' }))).status).toBe(404)
  })

  it('twenty at once for the same table: one 201, nineteen 409 NO_TABLE', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => post(phoneBody({ tableKeys: [T2] }))))
    expect(results.filter(r => r.status === 201)).toHaveLength(1)
    const lost = results.filter(r => r.status === 409)
    expect(lost).toHaveLength(19)
    expect(lost.every(r => r.body.error === 'NO_TABLE')).toBe(true)
    const all = await bookings()
    expect(all).toHaveLength(1)
    const rows = await holdRows()
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every(r => r.bookingId === all[0]._id)).toBe(true)
  })
})

describe('no orphan hold', () => {
  it('bookTable with an insert that throws leaves no holds and no booking', async () => {
    const ctx = await loadTableContext(testDb(), 'b1')
    const startAt = Date.now()
    const doc = {
      _id: 'orphan1', schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: startAt, updatedAt: startAt, kind: 'table',
      status: 'confirmed', source: 'phone', clientId: 'c1', guestName: 'x', guestPhone: '', statusHistory: [{ status: 'confirmed', at: startAt, by: 'own1', byName: '', via: 'member' }],
      publicToken: 'O'.repeat(32),
    }
    const boom = new Error('write failed')
    await expect(bookTable(testDb(), {
      doc, ctx, date: DATE, time: '20:00', partySize: 2, onlineOnly: false, now: startAt, insert: async () => { throw boom },
    })).rejects.toBe(boom)
    expect(await holdRows()).toHaveLength(0)
    expect(await bookings()).toHaveLength(0)
  })
})

describe('POST /walk-in', () => {
  const walkIn = (body, user = STAFF) => request(app).post('/api/v1/bookings/walk-in').set(as(user)).send(body)

  it('with a guest: seated, source walk_in, seatedAt, a client', async () => {
    const res = await walkIn({ partySize: 2, tableKeys: [T1], guest: { name: 'Gil Cohen', phone: '0509998877' } })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ status: 'seated', source: 'walk_in', tableKeys: [T1] })
    expect(typeof res.body.seatedAt).toBe('number')
    expect(await dbc('clients').countDocuments({})).toBe(2)
    expect(res.body.clientId).not.toBe('__walk_in__')
  })

  it('without a guest: the placeholder client, no client written', async () => {
    const res = await walkIn({ partySize: 2, tableKeys: [T1] })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ clientId: '__walk_in__', guestName: '', guestPhone: '' })
    expect(await dbc('clients').countDocuments({})).toBe(1)
    expect((await dbc('clients').findOne({ _id: 'c1' })).counters.bookings).toBe(0)
  })

  it('on a table held now: 409 NO_TABLE; a bad table 400', async () => {
    expect((await walkIn({ partySize: 2, tableKeys: [T1] })).status).toBe(201)
    const again = await walkIn({ partySize: 2, tableKeys: [T1] })
    expect([again.status, again.body.error]).toEqual([409, 'NO_TABLE'])
    const bad = await walkIn({ partySize: 2, tableKeys: ['nosuchtable'] })
    expect([bad.status, bad.body.error]).toEqual([400, 'BAD_TABLES'])
  })
})

describe('PUT /:id/tables and /:id/when', () => {
  const put = (id, part, body, user = STAFF) => request(app).put(`/api/v1/bookings/${id}/${part}`).set(as(user)).send(body)

  it('tables: the holds move to the new table, the old one is free again', async () => {
    const b = await seedBooking('bk1', { tableKeys: [T1], areaKey: ROOM.tables[0].areaKey })
    const res = await put(b._id, 'tables', { tableKeys: [T3] })
    expect(res.status).toBe(200)
    expect(res.body.tableKeys).toEqual([T3])
    expect((await holdRows()).every(r => r.tableKey === T3)).toBe(true)
    expect((await post(phoneBody({ tableKeys: [T1] }))).status).toBe(201)
  })

  it('tables: a table that is held answers 409 and changes nothing; a finished booking is BAD_STATUS', async () => {
    await seedBooking('bk1', { tableKeys: [T1] })
    await seedBooking('bk2', { tableKeys: [T3] })
    const lost = await put('bk1', 'tables', { tableKeys: [T3] })
    expect([lost.status, lost.body.error]).toEqual([409, 'NO_TABLE'])
    expect((await dbc('bookings').findOne({ _id: 'bk1' })).tableKeys).toEqual([T1])
    expect(await dbc('tableHolds').countDocuments({ bookingId: 'bk1', tableKey: T1 })).toBeGreaterThan(0)
    await dbc('bookings').updateOne({ _id: 'bk1' }, { $set: { status: 'finished' } })
    expect((await put('bk1', 'tables', { tableKeys: [T2] })).status).toBe(409)
  })

  it('tables: a booking with no table gets one', async () => {
    await seedBooking('bk1')
    const res = await put('bk1', 'tables', { tableKeys: [T1] })
    expect(res.status).toBe(200)
    expect(await dbc('tableHolds').countDocuments({ bookingId: 'bk1' })).toBeGreaterThan(0)
  })

  it('when: a new time is re-assigned through the engine', async () => {
    const created = await post(phoneBody())
    const res = await put(created.body._id, 'when', { time: '21:00' })
    expect(res.status).toBe(200)
    expect(res.body.time).toBe('21:00')
    expect(res.body.startAt).toBe(jerusalemEpoch(DATE, '21:00'))
    const rows = await dbc('tableHolds').find({ bookingId: created.body._id }).toArray()
    expect(Math.min(...rows.map(r => r.cell))).toBe(Math.floor(jerusalemEpoch(DATE, '21:00') / 900000) * 900000)
  })

  it('when: a full time answers 409 NO_TABLE and leaves the booking and its holds', async () => {
    const created = await post(phoneBody())
    const before = (await holdRows()).map(r => r._id).sort()
    const startAt = jerusalemEpoch(DATE, '12:00')
    await dbc('tableHolds').insertMany(ROOM.tables.map((t, i) => ({ _id: 'g' + i, businessId: 'b1', tableKey: t.key, cell: startAt, bookingId: 'ghost' })))
    const res = await put(created.body._id, 'when', { time: '12:00' })
    expect([res.status, res.body.error]).toEqual([409, 'NO_TABLE'])
    expect((await dbc('bookings').findOne({ _id: created.body._id })).time).toBe('20:00')
    expect((await dbc('tableHolds').find({ bookingId: created.body._id }).toArray()).map(r => r._id).sort()).toEqual(before)
  })

  it('when: no field is a 400; tableKeys needs the owner', async () => {
    await seedBooking('bk1', { tableKeys: [T1] })
    expect((await put('bk1', 'when', {})).status).toBe(400)
    expect((await put('bk1', 'when', { tableKeys: [T2] })).status).toBe(403)
  })
})

describe('PUT /:id/status', () => {
  const status = (id, to) => request(app).put(`/api/v1/bookings/${id}/status`).set(as(STAFF)).send({ status: to })

  it('seated stamps seatedAt, finished stamps finishedAt and frees the holds', async () => {
    await seedBooking('bk1', { tableKeys: [T1] })
    const seated = await status('bk1', 'seated')
    expect(seated.status).toBe(200)
    expect(typeof seated.body.seatedAt).toBe('number')
    expect(await dbc('tableHolds').countDocuments({ bookingId: 'bk1' })).toBeGreaterThan(0)
    const finished = await status('bk1', 'finished')
    expect(typeof finished.body.finishedAt).toBe('number')
    const left = await dbc('tableHolds').find({ bookingId: 'bk1' }).toArray()
    expect(left.every(r => r.cell < Math.floor(finished.body.finishedAt / 900000) * 900000)).toBe(true)
  })

  it('cancelled deletes the holds', async () => {
    await seedBooking('bk1', { tableKeys: [T1] })
    expect((await status('bk1', 'cancelled')).status).toBe(200)
    expect(await holdRows()).toHaveLength(0)
  })

  it('no_show deletes the holds from now on', async () => {
    const startAt = Math.floor((Date.now() - 20 * 60000) / 60000) * 60000
    const { date, time } = wallOf(startAt)
    await seedBooking('bk1', { tableKeys: [T1], date, time, startAt, endAt: startAt + turnFor(SERVICE, 2) * 60000 })
    expect(await dbc('tableHolds').countDocuments({ bookingId: 'bk1', cell: { $gte: Date.now() } })).toBeGreaterThan(0)
    const res = await status('bk1', 'no_show')
    expect(res.status).toBe(200)
    expect(await dbc('tableHolds').countDocuments({ bookingId: 'bk1', cell: { $gte: Math.floor(Date.now() / 900000) * 900000 } })).toBe(0)
  })
})

describe('GET /availability and /day', () => {
  it('availability: the booked time is not available', async () => {
    const free = await request(app).get('/api/v1/bookings/availability').query({ date: DATE, partySize: 2, area: ROOM.areas[1].key }).set(as(STAFF))
    expect(free.status).toBe(200)
    expect(free.body.slots.find(s => s.time === '20:00').available).toBe(true)
    const startAt = jerusalemEpoch(DATE, '20:00')
    await dbc('tableHolds').insertMany(ROOM.tables.map((t, i) => ({ _id: 'g' + i, businessId: 'b1', tableKey: t.key, cell: startAt, bookingId: 'ghost' })))
    const res = await request(app).get('/api/v1/bookings/availability').query({ date: DATE, partySize: 2 }).set(as(STAFF))
    expect(res.body.slots.find(s => s.time === '20:00')).toEqual({ time: '20:00', available: false })
    expect(res.body.slots.find(s => s.time === '12:00').available).toBe(true)
  })

  it('day: holds, unassigned and now', async () => {
    await seedBooking('bk1', { tableKeys: [T1] })
    await seedBooking('bk2', { time: '19:00' })
    const res = await request(app).get('/api/v1/bookings/day').query({ date: DATE }).set(as(STAFF))
    expect(res.status).toBe(200)
    expect(res.body.unassigned).toEqual(['bk2'])
    expect(typeof res.body.now).toBe('number')
    expect(res.body.holds).toEqual([expect.objectContaining({ tableKey: T1, bookingId: 'bk1' })])
  })

  it('without the tables module: five routes answer 403 MODULE_OFF, day and status as before', async () => {
    await dbc('bookings').insertOne({
      _id: 'fd1', schemaVersion: 2, businessId: 'bFd', createdBy: 'own2', createdAt: 1, updatedAt: 1, kind: 'table', status: 'confirmed', source: 'request',
      date: DATE, time: '20:00', startAt: 1000, endAt: 1000 + 60 * 60000, durationMinutes: 60, partySize: 2, clientId: 'c9', guestName: 'x', guestPhone: '',
      statusHistory: [{ status: 'confirmed', at: 1, by: 'o', byName: '', via: 'member' }], publicToken: 'F'.repeat(32),
    })
    const off = { error: 'MODULE_OFF', module: 'tables' }
    const calls = [
      request(app).get('/api/v1/bookings/availability').query({ date: DATE, partySize: 2 }),
      request(app).post('/api/v1/bookings').send(phoneBody()),
      request(app).post('/api/v1/bookings/walk-in').send({ partySize: 2, tableKeys: [T1] }),
      request(app).put('/api/v1/bookings/fd1/tables').send({ tableKeys: [T1] }),
      request(app).put('/api/v1/bookings/fd1/when').send({ time: '21:00' }),
    ]
    for (const c of calls) {
      const res = await c.set(as(FD_ONLY))
      expect([res.status, res.body]).toEqual([403, off])
    }
    const day = await request(app).get('/api/v1/bookings/day').query({ date: DATE }).set(as(FD_ONLY))
    expect(Object.keys(day.body).sort()).toEqual(['bookings', 'coversByHour'])
    const seated = await request(app).put('/api/v1/bookings/fd1/status').set(as(FD_ONLY)).send({ status: 'cancelled' })
    expect(seated.status).toBe(200)
    expect(seated.body.status).toBe('cancelled')
  })
})

describe('logs', () => {
  it('a phone booking and a walk-in with a guest log neither the name nor the phone digits', async () => {
    const before = logs.records.length
    await post({ guest: { name: 'Zvika Pickles', phone: '0547776655' }, date: DATE, time: '19:00', partySize: 2, notes: 'window please' })
    await request(app).post('/api/v1/bookings/walk-in').set(as(STAFF))
      .send({ partySize: 2, tableKeys: [T2], guest: { name: 'Moshe Dayan', phone: '0531239876' } })
    const text = JSON.stringify(logs.records.slice(before))
    expect(logs.byEvent('bookings.created').length).toBeGreaterThan(0)
    expect(logs.byEvent('bookings.walk_in').length).toBeGreaterThan(0)
    for (const secret of ['Zvika', 'Pickles', 'Moshe', 'Dayan', '547776655', '531239876', 'window please']) {
      expect(text).not.toContain(secret)
    }
  })
})
