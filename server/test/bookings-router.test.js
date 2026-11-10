'use strict'
/** Plan 549 - /api/v1/bookings/:id/status: the Wave 1 moves, the no-show rule and the client's no-show counter. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'עובד', businessId: 'b1', businessRole: 'staff' }
const OUTSIDER = { userId: 'out1', name: 'זר', businessId: 'b2', businessRole: 'owner' }
const HOUR = 3_600_000
const raw = id => testDb().collection('bookings').findOne({ _id: id })
const move = (user, id, status) => request(app).put(`/api/v1/bookings/${id}/status`).set(as(user)).send({ status })

async function seed(id, status, startAt = Date.now() - HOUR) {
  await testDb().collection('bookings').insertOne({
    _id: id, schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: 1, updatedAt: 1,
    kind: 'table', status, source: 'request', date: '2026-12-01', time: '19:00', startAt, endAt: startAt + 90 * 60000,
    durationMinutes: 90, partySize: 4, clientId: 'c1', guestName: 'דנה', guestPhone: '0521234567',
    statusHistory: [{ status, at: 1, by: 'own1', byName: 'בעלים', via: 'server' }], publicToken: 'B'.repeat(32),
  })
}

beforeEach(async () => {
  for (const c of ['bookings', 'clients']) await testDb().collection(c).deleteMany({})
  await testDb().collection('clients').insertOne({ _id: 'c1', businessId: 'b1', counters: { noShows: 0 } })
})

describe('PUT /:id/status', () => {
  it.each([
    ['confirmed', 'seated'], ['seated', 'finished'], ['confirmed', 'no_show'], ['confirmed', 'cancelled'], ['seated', 'cancelled'],
  ])('%s -> %s answers 200 and appends one history entry', async (from, to) => {
    await seed('b1x', from)
    const res = await move(STAFF, 'b1x', to)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe(to)
    expect(res.body.statusHistory).toHaveLength(2)
    expect(res.body.statusHistory[1]).toMatchObject({ status: to, by: 'st1', byName: 'עובד', via: 'member' })
  })

  it.each([
    ['finished', 'seated'], ['cancelled', 'confirmed'], ['seated', 'no_show'], ['confirmed', 'finished'], ['no_show', 'seated'],
  ])('%s -> %s answers 409 BAD_STATUS and changes nothing', async (from, to) => {
    await seed('b1x', from)
    const before = await raw('b1x')
    const res = await move(OWNER, 'b1x', to)
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'BAD_STATUS' })
    expect(await raw('b1x')).toEqual(before)
  })

  it('no_show before startAt is 409 BAD_STATUS and the counter stays 0', async () => {
    await seed('b1x', 'confirmed', Date.now() + 5 * HOUR)
    const res = await move(OWNER, 'b1x', 'no_show')
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('BAD_STATUS')
    expect((await testDb().collection('clients').findOne({ _id: 'c1' })).counters.noShows).toBe(0)
  })

  it('no_show after startAt adds 1 to the client\'s counters.noShows', async () => {
    await seed('b1x', 'confirmed')
    expect((await move(OWNER, 'b1x', 'no_show')).status).toBe(200)
    expect((await testDb().collection('clients').findOne({ _id: 'c1' })).counters.noShows).toBe(1)
  })

  it('another business gets 404 and an unknown status 400', async () => {
    await seed('b1x', 'confirmed')
    expect((await move(OUTSIDER, 'b1x', 'seated')).status).toBe(404)
    expect((await move(OWNER, 'b1x', 'bogus')).status).toBe(400)
    expect((await raw('b1x')).status).toBe('confirmed')
  })
})
