'use strict'
/** Plan 646 — in-app alerts for a big price change: who gets them, who reads them, and that a failure never undoes prices. */

const request = require('supertest')
const mongoose = require('mongoose')

process.env.GEMINI_API_KEY = 'test-key'
process.env.IMPORT_LIMIT_MAX = '200'
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { productBody, supplierBody, stored } = require('./helpers/v2-docs')
const { captureLogs } = require('./helpers/log-capture')

let app
let logs

beforeAll(async () => {
  app = await buildTestApp()
  logs = captureLogs()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'owner1', businessId: 'b1', businessRole: 'owner' }
const CONSULTANT = { userId: 'con1', name: 'consultant1', businessId: 'b_con1', businessRole: 'owner' }
const CONSULTANT_B2 = { userId: 'con2', name: 'consultant2', businessId: 'b_con2', businessRole: 'owner' }
const OWNER2 = { userId: 'own2', name: 'owner2', businessId: 'b2', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'staff1', businessId: 'b1', businessRole: 'staff' }

const apply = (body, who = OWNER) => request(app).post('/api/v1/product-import/apply').set(as(who)).send(body)
const line = (name, price) => ({ name, baseUnit: 'kg', price, category: null, purchaseUnit: null, purchaseQty: null })
const col = name => testDb().collection(name)
const list = (who, query = '') => request(app).get(`/api/v1/notifications${query}`).set(as(who))

const seedBusiness = async (settings) => {
  await col('businesses').insertMany([
    { _id: 'b1', name: 'העסק של אחד', ownerId: 'own1', ...(settings ? { settings } : {}) },
    { _id: 'b2', name: 'העסק של שניים', ownerId: 'own2' },
  ])
}

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('suppliers').insertMany([
    stored(supplierBody({ nameHebrew: 'ספק א' }), { _id: 'supA', userId: 'own1', businessId: 'b1' }),
  ])
  await db.collection('products').insertMany([
    stored(productBody({ nameHebrew: 'לחם', sources: [{ supplierId: 'supA', price: 100, addedBy: 'own1', addedAt: 1 }] }), { _id: 'p-bread', userId: 'own1', businessId: 'b1' }),
    stored(productBody({ nameHebrew: 'חלב', sources: [{ supplierId: 'supA', price: 100, addedBy: 'own1', addedAt: 1 }] }), { _id: 'p-milk', userId: 'own1', businessId: 'b1' }),
  ])
  await db.collection('businessAccess').insertMany([
    { _id: 'g1', userId: 'con1', businessId: 'b1', role: 'consultant', grantedBy: 'admin', grantedByName: 'a', grantedAt: 1 },
    { _id: 'g2', userId: 'con2', businessId: 'b2', role: 'consultant', grantedBy: 'admin', grantedByName: 'a', grantedAt: 1 },
  ])
})

describe('creating alerts on apply', () => {
  it('(a) +6% and +3% at threshold 5: only the +6% row alerts the owner and each consultant of that business', async () => {
    await seedBusiness()
    const res = await apply({ supplierId: 'supA', rows: [line('לחם', 106), line('חלב', 103)] })
    expect(res.status).toBe(200)
    const rows = await col('notifications').find({}).toArray()
    expect(rows).toHaveLength(2)
    expect(rows.map(r => r.userId).sort()).toEqual(['con1', 'own1'])
    expect(rows.every(r => r.productId === 'p-bread' && r.businessId === 'b1')).toBe(true)
    expect(rows.some(r => ['st1', 'own2', 'con2'].includes(r.userId))).toBe(false)
  })

  it('(b) a drop of 6% alerts too', async () => {
    await seedBusiness()
    await apply({ supplierId: 'supA', rows: [line('לחם', 94)] })
    const rows = await col('notifications').find({}).toArray()
    expect(rows).toHaveLength(2)
    expect(rows[0].changePct).toBe(-6)
  })

  it('(c) a stored threshold of 10 creates none for +6%', async () => {
    await seedBusiness({ priceRiseAlertPct: 10 })
    await apply({ supplierId: 'supA', rows: [line('לחם', 106)] })
    expect(await col('notifications').countDocuments({})).toBe(0)
  })

  it('(g) stores ids, names, prices and percent; no token or email', async () => {
    await seedBusiness()
    await apply({ supplierId: 'supA', rows: [line('לחם', 106)] })
    const row = await col('notifications').findOne({ userId: 'own1' })
    expect(row).toMatchObject({ businessId: 'b1', kind: 'price_change', productId: 'p-bread', productName: 'לחם', supplierName: 'ספק א', from: 100, to: 106, changePct: 6 })
    expect(JSON.stringify(row)).not.toMatch(/token|@/i)
  })

  it('(h) a failing alert write keeps the prices and logs notifications.write_failed', async () => {
    await seedBusiness()
    const original = mongoose.mongo.Collection.prototype.insertMany
    vi.spyOn(mongoose.mongo.Collection.prototype, 'insertMany').mockImplementation(function (...args) {
      if (this.collectionName === 'notifications') throw new Error('boom')
      return original.apply(this, args)
    })
    const res = await apply({ supplierId: 'supA', rows: [line('לחם', 106)] })
    expect(res.status).toBe(200)
    expect((await col('products').findOne({ _id: 'p-bread' })).sources[0].price).toBe(106)
    const failed = logs.byEvent('notifications.write_failed')
    expect(failed.length).toBeGreaterThan(0)
    expect(JSON.stringify(failed.at(-1))).not.toContain('לחם')
  })
})

describe('reading alerts', () => {
  beforeEach(async () => {
    await seedBusiness()
    await apply({ supplierId: 'supA', rows: [line('לחם', 106)] })
    await col('products').updateOne({ _id: 'p-milk' }, { $set: { 'sources.0.price': 100 } })
    await new Promise(resolve => setTimeout(resolve, 5))
    await apply({ supplierId: 'supA', rows: [line('חלב', 110)] })
  })

  it('(d) returns only the caller\'s alerts, newest first, with unread', async () => {
    const res = await list(OWNER)
    expect(res.status).toBe(200)
    expect(res.body.unread).toBe(2)
    expect(res.body.rows.map(r => r.productId)).toEqual(['p-milk', 'p-bread'])
    expect(res.body.rows.every(r => r.userId === 'own1')).toBe(true)
    expect(res.body.rows[0].businessName).toBe('העסק של אחד')
    expect((await list(OWNER2)).body).toEqual({ rows: [], unread: 0 })
    expect((await list(STAFF)).body.rows).toEqual([])
  })

  it('(d) a consultant reads the alerts of a business he has a live grant for, and none after removal', async () => {
    expect((await list(CONSULTANT)).body.rows).toHaveLength(2)
    expect((await list(CONSULTANT_B2)).body.rows).toHaveLength(0)
    await col('businessAccess').updateOne({ _id: 'g1' }, { $set: { revokedAt: 5, revokedBy: 'admin' } })
    expect(await list(CONSULTANT)).toMatchObject({ body: { rows: [], unread: 0 } })
  })

  it('rejects a bad limit', async () => {
    expect((await list(OWNER, '?limit=0')).status).toBe(400)
    expect((await list(OWNER, '?limit=abc')).status).toBe(400)
  })

  it('(e) read marks only the caller\'s alert; another user\'s id is 404', async () => {
    const mine = (await list(OWNER)).body.rows[0]
    const theirs = (await list(CONSULTANT)).body.rows[0]
    expect((await request(app).post(`/api/v1/notifications/${theirs._id}/read`).set(as(OWNER))).status).toBe(404)
    expect((await list(CONSULTANT)).body.unread).toBe(2)
    expect((await request(app).post(`/api/v1/notifications/${mine._id}/read`).set(as(OWNER))).status).toBe(200)
    expect((await list(OWNER)).body.unread).toBe(1)
    expect((await list(CONSULTANT)).body.unread).toBe(2)
  })

  it('(e) read-all marks only the caller\'s alerts', async () => {
    const res = await request(app).post('/api/v1/notifications/read-all').set(as(OWNER))
    expect(res.status).toBe(200)
    expect((await list(OWNER)).body.unread).toBe(0)
    expect((await list(CONSULTANT)).body.unread).toBe(2)
  })

  it('(f) no token is 401', async () => {
    expect((await request(app).get('/api/v1/notifications')).status).toBe(401)
    expect((await request(app).post('/api/v1/notifications/read-all')).status).toBe(401)
    expect((await request(app).post('/api/v1/notifications/x/read')).status).toBe(401)
  })
})
