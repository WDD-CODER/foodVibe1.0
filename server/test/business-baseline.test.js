'use strict'
/** Plan 431 - opening baseline (owner-only, whole replace, server-set filledAt) and setup status (own items only). */

const request = require('supertest')
const crypto = require('crypto')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { productBody, recipeBody, supplierBody, menuEventBody } = require('./helpers/v2-docs')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const SALT = 'b'.repeat(32)
const HASH = SALT + ':' + crypto.pbkdf2Sync('pw', Buffer.from(SALT, 'hex'), 100000, 32, 'sha256').toString('hex')
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'owner1', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'staff1', businessId: 'b1', businessRole: 'staff' }
const URL = '/api/v1/business'
const put = (body, who = OWNER) => request(app).put(`${URL}/baseline`).set(as(who)).send(body)
const getBusiness = (who = OWNER) => request(app).get(URL).set(as(who))
const status = (who = OWNER) => request(app).get(`${URL}/setup-status`).set(as(who))
const FORBIDDEN = { error: 'FORBIDDEN', messageKey: 'no_permission' }

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('businesses').insertMany([
    { _id: 'b1', name: 'business 1', ownerId: 'own1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0 },
    { _id: 'b2', name: 'business 2', ownerId: 'own2', createdAt: 2, internal: false, lastSyncedMasterVersion: 0 },
  ])
})

describe('PUT /api/v1/business/baseline', () => {
  it('owner saves the baseline and GET returns it with a filledAt number', async () => {
    const res = await put({ eventsClosedPerMonth: 4, avgRevenuePerEvent: 12000 })
    expect(res.status).toBe(200)
    const get = await getBusiness()
    expect(get.body.baseline).toEqual({ eventsClosedPerMonth: 4, avgRevenuePerEvent: 12000, filledAt: expect.any(Number) })
  })

  it('a second PUT replaces the whole baseline and filledAt is newer', async () => {
    await put({ eventsClosedPerMonth: 4, avgRevenuePerEvent: 12000 })
    const first = (await getBusiness()).body.baseline.filledAt
    await new Promise(r => setTimeout(r, 5))
    await put({ eventsClosedPerMonth: 5 })
    const second = (await getBusiness()).body.baseline
    expect(second).toEqual({ eventsClosedPerMonth: 5, filledAt: expect.any(Number) })
    expect(second.filledAt).toBeGreaterThan(first)
  })

  it('an empty body (skip) stores only filledAt', async () => {
    const res = await put({})
    expect(res.status).toBe(200)
    expect((await getBusiness()).body.baseline).toEqual({ filledAt: expect.any(Number) })
  })

  it.each([
    ['negative inquiries', { inquiriesPerMonth: -1 }],
    ['profit 100%', { estProfitPct: 100 }],
    ['profit -100%', { estProfitPct: -100 }],
    ['text revenue', { avgRevenuePerEvent: 'x' }],
    ['unknown key', { foo: 1 }],
  ])('rejects %s with 400 and stores nothing', async (_name, body) => {
    const res = await put(body)
    expect(res.status).toBe(400)
    expect((await testDb().collection('businesses').findOne({ _id: 'b1' })).baseline).toBeUndefined()
  })

  it('ignores a client-sent filledAt', async () => {
    const res = await put({ eventsClosedPerMonth: 2, filledAt: 5 })
    expect(res.status).toBe(200)
    expect((await getBusiness()).body.baseline.filledAt).toBeGreaterThan(1000000)
  })

  it('only writes the caller business', async () => {
    await put({ eventsClosedPerMonth: 2 })
    expect((await testDb().collection('businesses').findOne({ _id: 'b2' })).baseline).toBeUndefined()
  })

  it('refuses staff with 403 and stores nothing', async () => {
    const res = await put({ eventsClosedPerMonth: 2 }, STAFF)
    expect(res.status).toBe(403)
    expect(res.body).toEqual(FORBIDDEN)
    expect((await testDb().collection('businesses').findOne({ _id: 'b1' })).baseline).toBeUndefined()
  })
})

describe('GET /api/v1/business/setup-status', () => {
  const doc = (id, extra) => ({ _id: id, businessId: 'b1', createdBy: 'own1', createdAt: 1, ...extra })
  const own = (id, extra) => doc(id, { _masterId: id, ...extra })

  it('refuses staff with 403', async () => {
    const res = await status(STAFF)
    expect(res.status).toBe(403)
    expect(res.body).toEqual(FORBIDDEN)
  })

  it('counts nothing on a business holding only master clones', async () => {
    const db = testDb()
    await db.collection('products').insertMany([doc('p1', { _masterId: 'm1', sources: [{ price: 5 }] })])
    await db.collection('suppliers').insertMany([doc('s1', { _masterId: 'm2' })])
    await db.collection('recipes').insertMany([doc('r1', { _masterId: 'm3' })])
    await db.collection('menuEvents').insertMany([doc('e1', { _masterId: 'm4' })])
    expect((await status()).body).toEqual({ pricedProducts: 0, suppliers: 0, recipes: 0, events: 0, staff: 0 })
  })

  it('counts items the owner creates through the data API and a staff member added through the team route', async () => {
    const db = testDb()
    const data = (type, who, body) => request(app).post(`/api/v1/data/${type}`).set(as(who)).send(body)
    const priced = (n, price) => productBody({ nameHebrew: `product ${n}`, sources: [{ supplierId: 'sup', price }] })
    for (let i = 0; i < 10; i++) expect((await data('products', OWNER, priced(i, 3))).status).toBe(201)
    expect((await data('products', OWNER, priced('free', 0))).status).toBe(201)
    const deleted = await data('products', OWNER, priced('deleted', 3))
    expect(deleted.status).toBe(201)
    await db.collection('products').updateOne({ _id: deleted.body._id }, { $set: { deletedAt: 5 } })
    expect((await data('suppliers', OWNER, supplierBody({ nameHebrew: 'supplier 1' }))).status).toBe(201)
    expect((await data('recipes', OWNER, recipeBody({ nameHebrew: 'recipe 1' }))).status).toBe(201)
    expect((await data('menuEvents', OWNER, menuEventBody({ name: 'event 1' }))).status).toBe(201)
    const staff = await request(app).post(`${URL}/team`).set(as(OWNER)).send({ name: 'cook1', password: HASH })
    expect(staff.status).toBe(201)
    // Another business owner's priced product and supplier must not count here.
    const other = { userId: 'own2', name: 'owner2', businessId: 'b2', businessRole: 'owner' }
    expect((await data('products', other, priced('other', 3))).status).toBe(201)
    expect((await data('suppliers', other, supplierBody({ nameHebrew: 'supplier 2' }))).status).toBe(201)
    await db.collection('users').insertOne({ _id: 'st-gone', name: 'gone', email: 'g@x', businessId: 'b1', businessRole: 'staff', removedAt: 9 })
    const res = await status()
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ pricedProducts: 10, suppliers: 1, recipes: 1, events: 1, staff: 1 })
  })

  it('counts a product priced only in purchaseOptions, and dishes count with recipes', async () => {
    const db = testDb()
    await db.collection('products').insertMany([
      own('a', { purchaseOptions: [{ priceOverride: 2 }] }),
      own('b', { sources: [{ price: 4 }] }),
      own('c', { sources: [{ price: 0 }] }),
    ])
    await db.collection('dishes').insertMany([own('d1')])
    await db.collection('recipes').insertMany([own('r1')])
    expect((await status()).body).toEqual({ pricedProducts: 2, suppliers: 0, recipes: 2, events: 0, staff: 0 })
  })
})
