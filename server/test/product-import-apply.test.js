'use strict'
/** Plan 641 — a row may name the supplier whose existing price it updates (`targetSupplierId`). */

const request = require('supertest')

process.env.GEMINI_API_KEY = 'test-key'
process.env.IMPORT_LIMIT_MAX = '200'
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { productBody, supplierBody, stored } = require('./helpers/v2-docs')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'owner1', businessId: 'b1', businessRole: 'owner' }

const apply = body => request(app).post('/api/v1/product-import/apply').set(as(OWNER)).send(body)
const line = (name, price, extra = {}) => ({ name, baseUnit: 'kg', price, category: null, purchaseUnit: null, purchaseQty: null, ...extra })
const col = name => testDb().collection(name)

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('suppliers').insertMany([
    stored(supplierBody({ nameHebrew: 'ספק א' }), { _id: 'supA', userId: 'own1', businessId: 'b1' }),
    stored(supplierBody({ nameHebrew: 'ספק ב' }), { _id: 'supB', userId: 'own1', businessId: 'b1' }),
    stored(supplierBody({ nameHebrew: 'ספק זר' }), { _id: 'supX', userId: 'own2', businessId: 'b2' }),
  ])
  await db.collection('products').insertMany([
    stored(productBody({ nameHebrew: 'לחם', sources: [{ supplierId: 'supA', price: 100, addedBy: 'own1', addedAt: 1 }] }), { _id: 'p-bread', userId: 'own1', businessId: 'b1' }),
  ])
})

const invoice = () => ({ supplierName: 'ספק ב', source: 'photo', lines: [{ printedName: 'לחם', needsReview: false, row: 0 }] })

describe('apply with targetSupplierId', () => {
  it('updates that supplier source and adds none; history records that supplier', async () => {
    const res = await apply({ supplierId: 'supB', rows: [line('לחם', 142, { targetSupplierId: 'supA' })], invoice: invoice() })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ created: 0, updated: 1 })
    const product = await col('products').findOne({ _id: 'p-bread' })
    expect(product.sources.map(s => [s.supplierId, s.price])).toEqual([['supA', 142]])
    const history = await col('priceHistory').find({}).toArray()
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ productId: 'p-bread', supplierId: 'supA', prevPrice: 100, price: 142, changePct: 42 })
    const saved = await col('invoices').findOne({})
    expect(saved.lines[0]).toMatchObject({ result: 'updated', productId: 'p-bread', price: 142, supplierId: 'supA' })
  })

  it('without it the invoice supplier is added as a source, as before', async () => {
    const res = await apply({ supplierId: 'supB', rows: [line('לחם', 142)], invoice: invoice() })
    expect(res.status).toBe(200)
    const product = await col('products').findOne({ _id: 'p-bread' })
    expect(product.sources.map(s => [s.supplierId, s.price])).toEqual([['supA', 100], ['supB', 142]])
    const saved = await col('invoices').findOne({})
    expect(saved.lines[0]).toMatchObject({ result: 'updated', productId: 'p-bread', price: 142, supplierId: 'supB' })
  })

  it('answers 400 BAD_TARGET_SUPPLIER for a supplier that is not a source of the product, and writes nothing', async () => {
    const res = await apply({ supplierId: 'supB', rows: [line('לחם', 142, { targetSupplierId: 'supB' })] })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('BAD_TARGET_SUPPLIER')
    const product = await col('products').findOne({ _id: 'p-bread' })
    expect(product.sources).toHaveLength(1)
    expect(await col('priceHistory').countDocuments()).toBe(0)
  })

  it('answers 400 BAD_TARGET_SUPPLIER for a supplier of another business', async () => {
    await col('products').updateOne({ _id: 'p-bread' }, { $push: { sources: { supplierId: 'supX', price: 90, addedBy: 'own1', addedAt: 1 } } })
    const res = await apply({ supplierId: 'supB', rows: [line('לחם', 142, { targetSupplierId: 'supX' })] })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('BAD_TARGET_SUPPLIER')
    const product = await col('products').findOne({ _id: 'p-bread' })
    expect(product.sources.map(s => s.price)).toEqual([100, 90])
    expect(await col('priceHistory').countDocuments()).toBe(0)
  })
})
