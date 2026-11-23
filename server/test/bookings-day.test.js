'use strict'
/** Plan 550 - GET /api/v1/bookings/day: one day's bookings and covers per hour. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { clearModuleCache } = require('../middleware/require-module')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const STAFF = { userId: 'st1', name: 'עובד', businessId: 'b1', businessRole: 'staff' }
const OUTSIDER = { userId: 'out1', name: 'זר', businessId: 'b2', businessRole: 'owner' }
const day = (user, date) => request(app).get('/api/v1/bookings/day').query({ date }).set(as(user))

function booking(id, over) {
  return {
    _id: id, schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: 1, updatedAt: 1, kind: 'table', status: 'confirmed',
    source: 'request', date: '2026-12-24', time: '19:00', startAt: 1000, endAt: 1000 + 60 * 60000, durationMinutes: 60, partySize: 4,
    clientId: 'c1', guestName: 'דנה', guestPhone: '0521234567', statusHistory: [], publicToken: id.padEnd(32, 'T'), ...over,
  }
}

beforeEach(async () => {
  await testDb().collection('bookings').deleteMany({})
})

describe('GET /day', () => {
  it('returns the non-cancelled bookings sorted by startAt, and covers by start hour', async () => {
    await testDb().collection('bookings').insertMany([
      booking('late', { time: '20:00', startAt: 3000, partySize: 4 }),
      booking('a', { time: '19:00', startAt: 1000, partySize: 6 }),
      booking('b', { time: '19:45', startAt: 2000, partySize: 4, status: 'seated' }),
      booking('gone', { time: '19:15', startAt: 1500, partySize: 9, status: 'cancelled' }),
      booking('noshow', { time: '19:20', startAt: 1600, partySize: 3, status: 'no_show' }),
      booking('other-day', { date: '2026-12-25', startAt: 9000 }),
      booking('other-biz', { businessId: 'b2', startAt: 1200 }),
    ])
    const res = await day(STAFF, '2026-12-24')
    expect(res.status).toBe(200)
    expect(res.body.bookings.map(b => b._id)).toEqual(['a', 'noshow', 'b', 'late'])
    expect(res.body.coversByHour).toEqual({ 19: 10, 20: 4 })
    expect((await day(OUTSIDER, '2026-12-24')).body.bookings.map(b => b._id)).toEqual(['other-biz'])
  })

  it('a bad date: 400 BAD_DATE; no date either', async () => {
    const bad = await day(STAFF, '24-12')
    expect([bad.status, bad.body]).toEqual([400, { error: 'BAD_DATE' }])
    expect((await request(app).get('/api/v1/bookings/day').set(as(STAFF))).status).toBe(400)
  })

  it('needs a signed-in member', async () => {
    expect((await request(app).get('/api/v1/bookings/day').query({ date: '2026-12-24' })).status).toBe(401)
  })

  it('with the tables module the answer carries the server clock as a number (plan 671)', async () => {
    await testDb().collection('businesses').deleteMany({})
    await testDb().collection('businesses').insertOne({ _id: 'b1', name: 'one', ownerId: 'own1', createdAt: 1, modules: ['frontdesk', 'tables'] })
    clearModuleCache()
    const before = Date.now()
    const res = await day(STAFF, '2026-12-24')
    expect(res.status).toBe(200)
    expect(typeof res.body.now).toBe('number')
    expect(Math.abs(res.body.now - before)).toBeLessThan(1000)
    await testDb().collection('businesses').deleteMany({})
    clearModuleCache()
  })
})
