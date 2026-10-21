'use strict'
/** Plan 432 - the price-list import routes: the AI parse guards (no Gemini call) and the one-request apply. */

const request = require('supertest')

process.env.GEMINI_API_KEY = 'test-key'
process.env.IMPORT_LIMIT_MAX = '40'
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { productBody, supplierBody, stored } = require('./helpers/v2-docs')
const { getUsageCount } = require('../services/gemini-client')

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
const OTHER_OWNER = { userId: 'own2', name: 'owner2', businessId: 'b2', businessRole: 'owner' }
const FORBIDDEN = { error: 'FORBIDDEN', messageKey: 'no_permission' }

const parse = (body, who = OWNER) => request(app).post('/api/v1/ai/parse-price-list').set(as(who)).send(body)
const apply = (body, who = OWNER) => request(app).post('/api/v1/product-import/apply').set(as(who)).send(body)
const line = (name, baseUnit, price, extra = {}) => ({ name, baseUnit, price, category: null, purchaseUnit: null, purchaseQty: null, ...extra })

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('suppliers').insertMany([
    stored(supplierBody({ nameHebrew: 'ירקן' }), { _id: 'sup1', userId: 'own1', businessId: 'b1' }),
    stored(supplierBody({ nameHebrew: 'זר' }), { _id: 'sup-other', userId: 'own2', businessId: 'b2' }),
  ])
})

const productsOf = (businessId, nameHebrew) => testDb().collection('products').find({ businessId, nameHebrew }).toArray()

describe('POST /api/v1/ai/parse-price-list', () => {
  it('needs a token', async () => {
    expect((await request(app).post('/api/v1/ai/parse-price-list').send({ rawText: 'x' })).status).toBe(401)
  })

  it('staff get 403 before any Gemini call and the usage count does not move', async () => {
    const before = await getUsageCount()
    const res = await parse({ rawText: 'עגבנייה 5.9 לק"ג' }, STAFF)
    expect(res.status).toBe(403)
    expect(res.body).toEqual(FORBIDDEN)
    expect(await getUsageCount()).toBe(before)
  })

  it('empty text is 400', async () => {
    expect((await parse({ rawText: '   ' })).status).toBe(400)
    expect((await parse({})).status).toBe(400)
  })

  it('text over 20 000 characters is 400 TEXT_TOO_LONG', async () => {
    const res = await parse({ rawText: 'א'.repeat(20001) })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('TEXT_TOO_LONG')
  })
})

describe('POST /api/v1/product-import/apply', () => {
  const FIRST = [line('עגבנייה', 'kg', 5.9), line('מלפפון', 'kg', 4.5), line('שמנת 32%', 'liter', 12)]

  it('needs a token', async () => {
    expect((await request(app).post('/api/v1/product-import/apply').send({ rows: [] })).status).toBe(401)
  })

  it('staff get 403', async () => {
    const res = await apply({ supplierId: null, rows: FIRST }, STAFF)
    expect(res.status).toBe(403)
    expect(res.body).toEqual(FORBIDDEN)
    expect(await testDb().collection('products').countDocuments()).toBe(0)
  })

  it('creates three products under the supplier in the owner business', async () => {
    const res = await apply({ supplierId: 'sup1', rows: FIRST })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ created: 3, updated: 0, skipped: 0 })
    const [tomato] = await productsOf('b1', 'עגבנייה')
    expect(tomato).toMatchObject({ baseUnit: 'kg', createdBy: 'own1', yieldFactor: 1, schemaVersion: 2, businessId: 'b1' })
    expect(tomato.sources).toEqual([{ supplierId: 'sup1', price: 5.9, addedBy: 'own1', addedAt: expect.any(Number) }])
    expect(await productsOf('b1', 'מלפפון')).toHaveLength(1)
    expect((await productsOf('b1', 'שמנת 32%'))[0].sources[0].price).toBe(12)
  })

  it('a second import with a new price updates only the price', async () => {
    await apply({ supplierId: 'sup1', rows: FIRST })
    const res = await apply({ supplierId: 'sup1', rows: [line('עגבנייה', 'liter', 6.2)] })
    expect(res.body).toMatchObject({ created: 0, updated: 1, skipped: 0 })
    const found = await productsOf('b1', 'עגבנייה')
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ baseUnit: 'kg', nameHebrew: 'עגבנייה', _userModified: true })
    expect(found[0].sources).toHaveLength(1)
    expect(found[0].sources[0]).toMatchObject({ supplierId: 'sup1', price: 6.2 })
  })

  it('the same price again is skipped', async () => {
    await apply({ supplierId: 'sup1', rows: FIRST })
    await apply({ supplierId: 'sup1', rows: [line('עגבנייה', 'kg', 6.2)] })
    const res = await apply({ supplierId: 'sup1', rows: [line(' עגבנייה ', 'kg', 6.2)] })
    expect(res.body).toMatchObject({ created: 0, updated: 0, skipped: 1, skippedRows: [{ name: 'עגבנייה', reason: 'same_price' }] })
  })

  it('a price from a new supplier is added next to the old one', async () => {
    await apply({ supplierId: 'sup1', rows: FIRST })
    await testDb().collection('suppliers').insertOne(stored(supplierBody({ nameHebrew: 'שוק' }), { _id: 'sup2', userId: 'own1', businessId: 'b1' }))
    const res = await apply({ supplierId: 'sup2', rows: [line('עגבנייה', 'kg', 5)] })
    expect(res.body.updated).toBe(1)
    expect((await productsOf('b1', 'עגבנייה'))[0].sources.map(s => [s.supplierId, s.price])).toEqual([['sup1', 5.9], ['sup2', 5]])
  })

  it('without a supplier the price is the global price', async () => {
    const res = await apply({ supplierId: null, rows: [line('בצל', 'kg', 3)] })
    expect(res.body.created).toBe(1)
    expect((await productsOf('b1', 'בצל'))[0].sources[0]).toMatchObject({ supplierId: '', price: 3 })
  })

  it('a row without a price creates the product with no sources, and later never touches a price', async () => {
    const res = await apply({ supplierId: null, rows: [line('פטרוזיליה', 'unit', null)] })
    expect(res.body.created).toBe(1)
    expect((await productsOf('b1', 'פטרוזיליה'))[0].sources).toEqual([])
    const again = await apply({ supplierId: null, rows: [line('פטרוזיליה', 'unit', null)] })
    expect(again.body).toMatchObject({ created: 0, updated: 0, skipped: 1, skippedRows: [{ reason: 'no_price' }] })
  })

  it('saves a known purchase unit and the category on a new product', async () => {
    await testDb().collection('taxonomyTerms').insertOne({ _id: 't1', kind: 'unit', key: 'ארגז', businessId: 'b1', userId: 'own1' })
    await apply({ supplierId: null, rows: [line('לימון', 'kg', 7, { purchaseUnit: 'ארגז', purchaseQty: 10, category: 'פירות' }), line('תפוז', 'kg', 7, { purchaseUnit: 'שק', purchaseQty: 5 })] })
    const [lemon] = await productsOf('b1', 'לימון')
    expect(lemon.purchaseOptions).toEqual([{ unitSymbol: 'ארגז', conversionRate: 10, uom: 'kg' }])
    expect(lemon.categories).toEqual(['פירות'])
    expect((await productsOf('b1', 'תפוז'))[0].purchaseOptions).toEqual([])
  })

  it('a repeated name in one request is skipped as duplicate', async () => {
    const res = await apply({ supplierId: null, rows: [line('בצל', 'kg', 3), line('בצל', 'kg', 4)] })
    expect(res.body).toMatchObject({ created: 1, skipped: 1, skippedRows: [{ reason: 'duplicate' }] })
  })

  it('invalid rows are skipped, the rest is saved', async () => {
    const res = await apply({ supplierId: null, rows: [line('', 'kg', 1), line('חצילים', 'ארגזון', 1), line('א'.repeat(201), 'kg', 1), line('גזר', 'kg', 2)] })
    expect(res.body).toMatchObject({ created: 1, skipped: 3 })
    expect(res.body.skippedRows.map(r => r.reason)).toEqual(['invalid', 'invalid', 'invalid'])
  })

  it('201 rows are 400 TOO_MANY_ROWS and nothing is saved', async () => {
    const res = await apply({ supplierId: null, rows: Array.from({ length: 201 }, (_, i) => line(`מוצר ${i}`, 'kg', 1)) })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('TOO_MANY_ROWS')
    expect(await testDb().collection('products').countDocuments()).toBe(0)
  })

  it('exactly 200 rows are saved in one request', async () => {
    const res = await apply({ supplierId: null, rows: Array.from({ length: 200 }, (_, i) => line(`מוצר ${i}`, 'kg', 1)) })
    expect(res.status).toBe(200)
    expect(res.body.created).toBe(200)
  })

  it('a supplier of another business is 400 UNKNOWN_SUPPLIER', async () => {
    const res = await apply({ supplierId: 'sup-other', rows: FIRST })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('UNKNOWN_SUPPLIER')
    expect(await testDb().collection('products').countDocuments()).toBe(0)
  })

  it('a product of another business with the same name is never updated: a new one is created', async () => {
    await testDb().collection('products').insertOne(stored(productBody({ nameHebrew: 'עגבנייה', sources: [{ supplierId: 'x', price: 1 }] }), { _id: 'p-other', userId: 'own2', businessId: 'b2' }))
    const res = await apply({ supplierId: null, rows: [line('עגבנייה', 'kg', 9)] })
    expect(res.body).toMatchObject({ created: 1, updated: 0 })
    expect((await testDb().collection('products').findOne({ _id: 'p-other' })).sources).toEqual([{ supplierId: 'x', price: 1 }])
    expect(await productsOf('b1', 'עגבנייה')).toHaveLength(1)
    const other = await apply({ supplierId: null, rows: [line('עגבנייה', 'kg', 2)] }, OTHER_OWNER)
    expect(other.body.updated).toBe(1)
  })

  it('a deleted product is not matched', async () => {
    await testDb().collection('products').insertOne(stored(productBody({ nameHebrew: 'כרוב' }), { _id: 'p-del', userId: 'own1', businessId: 'b1', deletedAt: 5 }))
    const res = await apply({ supplierId: null, rows: [line('כרוב', 'kg', 2)] })
    expect(res.body).toMatchObject({ created: 1, updated: 0 })
  })

  it('an owner is limited to the import budget per 15 minutes', async () => {
    const heavy = { userId: 'own3', name: 'owner3', businessId: 'b3', businessRole: 'owner' }
    const statuses = []
    for (let i = 0; i < 41; i++) statuses.push((await apply({ supplierId: null, rows: [] }, heavy)).status)
    expect(statuses.slice(0, 40).every(s => s === 200)).toBe(true)
    expect(statuses[40]).toBe(429)
  })

  it('rows must be a list', async () => {
    expect((await apply({ supplierId: null })).status).toBe(400)
  })
})
