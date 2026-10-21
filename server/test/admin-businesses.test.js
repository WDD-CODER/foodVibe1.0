'use strict'
/** Plan 448 - the platform admin's table of businesses (counts and dates only) and the internal flag. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { jerusalemDate } = require('../middleware/usage')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const ADMIN = { userId: 'boss', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const OWNER = { userId: 'ownerA', businessId: 'bA', businessRole: 'owner' }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const DAY = 86400000
const dateAgo = days => jerusalemDate(Date.now() - days * DAY)
const usage = (userId, businessId, daysAgo) => {
  const lastAt = Date.now() - daysAgo * DAY
  return { _id: `${userId}:${dateAgo(daysAgo)}`, userId, businessId, date: dateAgo(daysAgo), firstAt: lastAt, lastAt, writeCount: 1 }
}
const event = (id, businessId, extra = {}) => ({ _id: id, businessId, userId: 'x', name: 'secret ' + id, stage: 'inquiry', eventDate: '2026-01-01', ...extra })

const EXPECTED_KEYS = ['_id', 'name', 'ownerName', 'staffCount', 'createdAt', 'internal', 'lastActivityAt', 'activeDays7', 'events', 'closeRate', 'lastEventDate'].sort()

let bAUsageLast

beforeEach(async () => {
  const db = testDb()
  for (const c of ['users', 'businesses', 'usageDays', 'menuEvents']) await db.collection(c).deleteMany({})
  await db.collection('users').insertMany([
    { _id: 'boss', name: 'boss', role: 'admin', isPlatformAdmin: true, businessId: 'bBoss', businessRole: 'owner' },
    { _id: 'ownerA', name: 'Owner A', businessId: 'bA', businessRole: 'owner' },
    { _id: 'staffA1', name: 's1', businessId: 'bA', businessRole: 'staff' },
    { _id: 'staffA2', name: 's2', businessId: 'bA', businessRole: 'staff', removedAt: 5 },
    { _id: 'ownerB', name: 'Owner B', businessId: 'bB', businessRole: 'owner' },
  ])
  await db.collection('businesses').insertMany([
    { _id: 'bBoss', name: 'Boss biz', ownerId: 'boss', createdAt: 1, internal: false },
    { _id: 'bA', name: 'A', ownerId: 'ownerA', createdAt: 100, internal: false },
    { _id: 'bB', name: 'B', ownerId: 'ownerB', createdAt: 200 },
  ])
  const a1 = usage('ownerA', 'bA', 1)
  const a2 = usage('staffA1', 'bA', 1) // same day as the owner: counts once
  const a3 = usage('ownerA', 'bA', 3)
  const old = usage('ownerA', 'bA', 20) // outside the 7 days
  bAUsageLast = Math.max(a1.lastAt, a2.lastAt)
  await db.collection('usageDays').insertMany([a1, a2, a3, old])
  await db.collection('menuEvents').insertMany([
    event('e1', 'bA', { stage: 'inquiry' }),
    event('e2', 'bA', { stage: 'deposit_paid', closedAt: 10, eventDate: '2026-03-05' }),
    event('e3', 'bA', { stage: 'finished', closedAt: 10 }),
    event('e4', 'bA', { stage: 'not_closed' }),
    event('e5', 'bA', { stage: 'deposit_paid', closedAt: 10, legacy: true, eventDate: '2030-01-01' }),
    event('e6', 'bA', { stage: 'deposit_paid', closedAt: 10, deletedAt: 9, eventDate: '2031-01-01' }),
    event('e7', 'bBoss', { stage: 'inquiry' }),
  ])
})

const rowsOf = async () => {
  const res = await request(app).get('/api/v1/admin/businesses').set(as(ADMIN))
  expect(res.status).toBe(200)
  return Object.fromEntries(res.body.rows.map(r => [r._id, r]))
}

describe('GET /api/v1/admin/businesses', () => {
  it('returns one row per business with members, activity and event numbers', async () => {
    const rows = await rowsOf()
    expect(Object.keys(rows).sort()).toEqual(['bA', 'bB', 'bBoss'])
    const a = rows.bA
    expect(a).toMatchObject({
      name: 'A', ownerName: 'Owner A', staffCount: 1, createdAt: 100, internal: false,
      lastActivityAt: bAUsageLast, activeDays7: 2, lastEventDate: '2026-03-05',
    })
    expect(a.events).toEqual({ total: 4, active: 2, closed: 2, finished: 1 })
    expect(a.closeRate).toBeCloseTo(2 / 3)
  })

  it('gives a business with no events or usage zeros and nulls', async () => {
    const b = (await rowsOf()).bB
    expect(b).toMatchObject({ ownerName: 'Owner B', staffCount: 0, internal: false, lastActivityAt: null, activeDays7: 0, closeRate: null, lastEventDate: null })
    expect(b.events).toEqual({ total: 0, active: 0, closed: 0, finished: 0 })
  })

  it('returns exactly the allowed keys, no content', async () => {
    for (const row of Object.values(await rowsOf())) {
      expect(Object.keys(row).sort()).toEqual(EXPECTED_KEYS)
      expect(Object.keys(row.events).sort()).toEqual(['active', 'closed', 'finished', 'total'])
    }
    const res = await request(app).get('/api/v1/admin/businesses').set(as(ADMIN))
    expect(JSON.stringify(res.body)).not.toContain('secret')
  })

  it('refuses an owner (403) and no token (401)', async () => {
    expect((await request(app).get('/api/v1/admin/businesses').set(as(OWNER))).status).toBe(403)
    expect((await request(app).get('/api/v1/admin/businesses')).status).toBe(401)
  })
})

describe('PUT /api/v1/admin/businesses/:id/internal', () => {
  const put = (id, body, user = ADMIN) => request(app).put(`/api/v1/admin/businesses/${id}/internal`).set(as(user)).send(body)

  it('stores the flag and the next GET shows it', async () => {
    expect((await put('bA', { internal: true })).status).toBe(200)
    expect((await rowsOf()).bA.internal).toBe(true)
    expect((await put('bA', { internal: false })).status).toBe(200)
    expect((await rowsOf()).bA.internal).toBe(false)
  })

  it('rejects a non-boolean (400), an unknown id (404), an owner (403)', async () => {
    expect((await put('bA', { internal: 'yes' })).status).toBe(400)
    expect((await put('nope', { internal: true })).status).toBe(404)
    expect((await put('bA', { internal: true }, OWNER)).status).toBe(403)
    expect((await request(app).put('/api/v1/admin/businesses/bA/internal').send({ internal: true })).status).toBe(401)
  })
})
