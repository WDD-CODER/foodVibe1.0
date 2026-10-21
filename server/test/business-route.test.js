'use strict'
/** Plan 425 — GET /api/v1/business returns the caller's own business to any member. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('businesses').insertMany([
    { _id: 'bA', name: 'העסק של A', ownerId: 'ownerA', createdAt: 1, internal: false, lastSyncedMasterVersion: 7 },
    { _id: 'bB', name: 'העסק של B', ownerId: 'ownerB', createdAt: 2, internal: false, lastSyncedMasterVersion: 0 },
  ])
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })

describe('GET /api/v1/business', () => {
  it('returns the business doc (settings defaults filled) for the owner and for staff', async () => {
    const owner = await request(app).get('/api/v1/business').set(as({ userId: 'ownerA', businessId: 'bA', businessRole: 'owner' }))
    expect(owner.status).toBe(200)
    expect(owner.body).toEqual({ _id: 'bA', name: 'העסק של A', ownerId: 'ownerA', createdAt: 1, internal: false, lastSyncedMasterVersion: 7, settings: { profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 } })
    const staff = await request(app).get('/api/v1/business').set(as({ userId: 'staffA', businessId: 'bA', businessRole: 'staff' }))
    expect(staff.status).toBe(200)
    expect(staff.body._id).toBe('bA')
  })

  it('never returns another business', async () => {
    const res = await request(app).get('/api/v1/business').set(as({ userId: 'ownerB', businessId: 'bB' }))
    expect(res.body._id).toBe('bB')
  })

  it('404 when the business doc is missing', async () => {
    const res = await request(app).get('/api/v1/business').set(as({ userId: 'u', businessId: 'gone' }))
    expect(res.status).toBe(404)
  })

  it('anonymous -> 401', async () => {
    expect((await request(app).get('/api/v1/business')).status).toBe(401)
  })
})
