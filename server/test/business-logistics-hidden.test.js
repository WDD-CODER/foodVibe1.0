'use strict'
/** Plan 579 - PUT /api/v1/business/logistics-hidden: owner-only whole-list replace; a kept key keeps its `at`. */

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
const OWNER = { userId: 'own1', name: 'owner1', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'staff1', businessId: 'b1', businessRole: 'staff' }
const URL = '/api/v1/business/logistics-hidden'
const put = (body, who = OWNER) => request(app).put(URL).set(as(who)).send(body)
const stored = id => testDb().collection('businesses').findOne({ _id: id })
const sleep = ms => new Promise(r => setTimeout(r, ms))

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('businesses').insertMany([
    { _id: 'b1', name: 'business 1', ownerId: 'own1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0 },
    { _id: 'b2', name: 'business 2', ownerId: 'own2', createdAt: 2, internal: false, lastSyncedMasterVersion: 0 },
  ])
})

describe('PUT /api/v1/business/logistics-hidden', () => {
  it('a kept key keeps its first `at`; a new key gets a later one; a missing key is dropped', async () => {
    const first = await put({ keys: ['a'] })
    expect(first.status).toBe(200)
    const aAt = first.body.hiddenLogisticsKeys[0].at
    await sleep(15)
    const second = await put({ keys: ['a', ' b ', 'b'] })
    expect(second.body.hiddenLogisticsKeys.map(e => e.key)).toEqual(['a', 'b'])
    expect(second.body.hiddenLogisticsKeys[0].at).toBe(aAt)
    expect(second.body.hiddenLogisticsKeys[1].at).toBeGreaterThan(aAt)
    expect((await stored('b1')).hiddenLogisticsKeys).toEqual(second.body.hiddenLogisticsKeys)
    const third = await put({ keys: [] })
    expect(third.body.hiddenLogisticsKeys).toEqual([])
  })

  it('staff 403, no token 401, 301 keys 400, and another business is unchanged', async () => {
    expect((await put({ keys: ['a'] }, STAFF)).status).toBe(403)
    expect((await request(app).put(URL).send({ keys: [] })).status).toBe(401)
    const many = await put({ keys: Array.from({ length: 301 }, (_, i) => 'k' + i) })
    expect(many.status).toBe(400)
    await put({ keys: ['a'] })
    expect((await stored('b2')).hiddenLogisticsKeys).toBeUndefined()
  })
})
