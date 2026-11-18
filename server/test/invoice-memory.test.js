'use strict'
/** Plan 627 - the invoice name memory: own + shared aliases, resolve, forget. Runs through the real routes. */

const request = require('supertest')
const mongoose = require('mongoose')

process.env.GEMINI_API_KEY = 'test-key'
process.env.IMPORT_LIMIT_MAX = '200'
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { productBody, stored } = require('./helpers/v2-docs')
const { sharedInvoiceAliasSchema, ownInvoiceAliasSchema } = require('../generated/schemas/entities/invoice-alias.schema')
const { supplierProfileSchema } = require('../generated/schemas/entities/supplier-profile.schema')
const { setAiPrivate } = require('../services/business')

let app
beforeAll(async () => { app = await buildTestApp() }, 60000)
afterAll(async () => { await teardownTestApp() })

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER_A = { userId: 'uA', name: 'a', businessId: 'bA', businessRole: 'owner' }
const OWNER_B = { userId: 'uB', name: 'b', businessId: 'bB', businessRole: 'owner' }
const STAFF_A = { userId: 'sA', name: 's', businessId: 'bA', businessRole: 'staff' }
const KEY = 'tax:514236987'
const PRINTED = "עגב' שרי 1 ק״ג"
const row = (name, price = 9.9) => ({ name, baseUnit: 'kg', price, category: null, purchaseUnit: null, purchaseQty: null })
const apply = (who, body) => request(app).post('/api/v1/product-import/apply').set(as(who)).send(body)
const resolve = (who, body) => request(app).post('/api/v1/product-import/resolve').set(as(who)).send(body)
const invoiceOf = (lines, extra = {}) => ({ supplierName: 'ירקן', source: 'photo', supplierKey: KEY, lines, ...extra })
const approve = (who = OWNER_A, name = 'עגבניות שרי', printed = PRINTED, extra = {}) =>
  apply(who, { supplierId: null, rows: [row(name)], invoice: invoiceOf([{ printedName: printed, needsReview: false, row: 0 }], extra) })
const db = () => testDb()

beforeEach(async () => {
  vi.restoreAllMocks()
  for (const c of await db().listCollections().toArray()) if (c.type === 'collection') await db().collection(c.name).deleteMany({})
  await db().collection('products').insertMany([
    stored(productBody({ nameHebrew: 'עגבניות שרי' }), { _id: 'm1', businessId: '__master__', userId: 'admin' }),
    stored(productBody({ nameHebrew: 'עגבניות שרי' }), { _id: 'a1', businessId: 'bA', userId: 'uA', _masterId: 'm1' }),
    stored(productBody({ nameHebrew: 'עגבניות שרי' }), { _id: 'b1', businessId: 'bB', userId: 'uB', _masterId: 'm1' }),
  ])
  await db().collection('businesses').insertMany([{ _id: 'bA', name: 'A' }, { _id: 'bB', name: 'B' }])
})

describe('shapes', () => {
  it('shared shapes have exactly the planned keys', () => {
    expect(Object.keys(sharedInvoiceAliasSchema.shape).sort())
      .toEqual(['_id', 'businessId', 'supplierKey', 'nameKey', 'printedName', 'masterProductId', 'hits', 'contributors', 'lastAt'].sort())
    expect(Object.keys(supplierProfileSchema.shape).sort())
      .toEqual(['_id', 'names', 'vatIncludedYes', 'vatIncludedNo', 'invoices', 'contributors', 'lastAt'].sort())
  })
})

describe('own memory', () => {
  it('answers from memory with no model call, whatever the case or spacing', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect((await approve()).status).toBe(200)
    const res = await resolve(OWNER_A, { supplierKey: KEY, names: [`  ${PRINTED.toUpperCase().replace(/ /g, '   ')}  `] })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ matches: [{ i: 0, productId: 'a1', source: 'own' }] })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(await db().collection('aiUsage').countDocuments({ feature: 'product_match' })).toBe(0)
    vi.unstubAllGlobals()
  })

  it('the newer link wins', async () => {
    await db().collection('products').insertOne(stored(productBody({ nameHebrew: 'אחר' }), { _id: 'a2', businessId: 'bA', userId: 'uA' }))
    await approve()
    await approve(OWNER_A, 'אחר')
    const res = await resolve(OWNER_A, { supplierKey: KEY, names: [PRINTED] })
    expect(res.body.matches).toEqual([{ i: 0, productId: 'a2', source: 'own' }])
    const own = await db().collection('invoiceAliases').find({ businessId: 'bA' }).toArray()
    expect(own).toHaveLength(1)
    expect(own[0].hits).toBe(2)
  })

  it('never returns another business own alias or a deleted product', async () => {
    await approve()
    expect((await resolve(OWNER_B, { supplierKey: KEY, names: [PRINTED] })).body.matches).toEqual([{ i: 0, productId: 'b1', source: 'shared' }])
    await db().collection('invoiceAliases').deleteMany({ businessId: '__master__' })
    expect((await resolve(OWNER_B, { supplierKey: KEY, names: [PRINTED] })).body.matches).toEqual([])
    await db().collection('products').updateOne({ _id: 'a1' }, { $set: { deletedAt: 1 } })
    expect((await resolve(OWNER_A, { supplierKey: KEY, names: [PRINTED] })).body.matches).toEqual([])
  })
})

describe('shared memory', () => {
  it('teaches another business, mapped to its own copy', async () => {
    await approve()
    const res = await resolve(OWNER_B, { supplierKey: KEY, names: [PRINTED] })
    expect(res.body).toEqual({ matches: [{ i: 0, productId: 'b1', source: 'shared' }] })
    const profile = await db().collection('supplierProfiles').findOne({ _id: KEY })
    expect(profile.invoices).toBe(1)
    expect(profile.contributors).toEqual(['bA'])
  })

  it('an imported product adds an own alias and no shared one', async () => {
    const res = await approve(OWNER_A, 'מוצר חדש לגמרי')
    expect(res.status).toBe(200)
    expect(await db().collection('invoiceAliases').countDocuments({ businessId: 'bA' })).toBe(1)
    expect(await db().collection('invoiceAliases').countDocuments({ businessId: '__master__' })).toBe(0)
  })

  it('a private business adds own aliases only', async () => {
    await db().collection('businesses').updateOne({ _id: 'bA' }, { $set: { aiPrivate: true } })
    await approve()
    expect(await db().collection('invoiceAliases').countDocuments({ businessId: 'bA' })).toBe(1)
    expect(await db().collection('invoiceAliases').countDocuments({ businessId: '__master__' })).toBe(0)
    expect(await db().collection('supplierProfiles').countDocuments()).toBe(0)
  })

  it('every stored memory document passes its schema and holds no money or date keys', async () => {
    await approve()
    await approve(OWNER_B, 'עגבניות שרי', PRINTED, { vatIncluded: true })
    for (const d of await db().collection('invoiceAliases').find({ businessId: 'bA' }).toArray()) expect(ownInvoiceAliasSchema.safeParse(d).success).toBe(true)
    const shared = await db().collection('invoiceAliases').find({ businessId: '__master__' }).toArray()
    expect(shared.length).toBeGreaterThan(0)
    for (const d of shared) expect(sharedInvoiceAliasSchema.safeParse(d).success).toBe(true)
    const profiles = await db().collection('supplierProfiles').find({}).toArray()
    for (const d of profiles) expect(supplierProfileSchema.safeParse(d).success).toBe(true)
    const text = JSON.stringify([...shared, ...profiles])
    for (const bad of ['price', 'unitPrice', 'lineTotal', 'quantity', 'invoiceDate', 'invoiceId']) expect(text).not.toContain(`"${bad}"`)
  })

  it('ranks: own beats shared; more contributors win; a tie goes to the newer; no copy gives no match', async () => {
    await db().collection('products').insertMany([
      stored(productBody({ nameHebrew: 'ש2' }), { _id: 'm2', businessId: '__master__', userId: 'admin' }),
      stored(productBody({ nameHebrew: 'ש2' }), { _id: 'b2', businessId: 'bB', userId: 'uB', _masterId: 'm2' }),
      stored(productBody({ nameHebrew: 'ש3' }), { _id: 'm3', businessId: '__master__', userId: 'admin' }),
    ])
    const base = { businessId: '__master__', supplierKey: KEY, nameKey: 'x', printedName: 'x', hits: 1 }
    await db().collection('invoiceAliases').insertMany([
      { ...base, _id: 'r1', masterProductId: 'm1', contributors: ['q'], lastAt: 1 },
      { ...base, _id: 'r2', masterProductId: 'm2', contributors: ['q', 'w'], lastAt: 0 },
    ])
    expect((await resolve(OWNER_B, { supplierKey: KEY, names: ['X'] })).body.matches).toEqual([{ i: 0, productId: 'b2', source: 'shared' }])
    await db().collection('invoiceAliases').updateOne({ _id: 'r1' }, { $set: { contributors: ['q', 'w'], lastAt: 5 } })
    expect((await resolve(OWNER_B, { supplierKey: KEY, names: ['x'] })).body.matches).toEqual([{ i: 0, productId: 'b1', source: 'shared' }])
    await db().collection('invoiceAliases').updateOne({ _id: 'r2' }, { $set: { masterProductId: 'm3', contributors: ['q', 'w', 'e'] } })
    expect((await resolve(OWNER_B, { supplierKey: KEY, names: ['x'] })).body.matches).toEqual([])
    await db().collection('invoiceAliases').insertOne({ ...base, _id: 'o1', businessId: 'bB', productId: 'b2', lastAt: 1 })
    expect((await resolve(OWNER_B, { supplierKey: KEY, names: ['x'] })).body.matches).toEqual([{ i: 0, productId: 'b2', source: 'own' }])
  })
})

describe('forget', () => {
  it('removes a business from the shared memory and keeps its own aliases', async () => {
    await approve(OWNER_A)
    await approve(OWNER_B)
    await db().collection('products').insertOne(stored(productBody({ nameHebrew: 'ש2' }), { _id: 'm2', businessId: '__master__', userId: 'admin' }))
    await db().collection('products').insertOne(stored(productBody({ nameHebrew: 'ש2' }), { _id: 'a2', businessId: 'bA', userId: 'uA', _masterId: 'm2' }))
    await approve(OWNER_A, 'ש2', 'אחר לגמרי')
    await setAiPrivate('bA', true)
    const shared = await db().collection('invoiceAliases').find({ businessId: '__master__' }).toArray()
    expect(shared).toHaveLength(1)
    expect(shared[0].contributors).toEqual(['bB'])
    expect((await db().collection('supplierProfiles').findOne({ _id: KEY })).contributors).toEqual(['bB'])
    expect(await db().collection('invoiceAliases').countDocuments({ businessId: 'bA' })).toBe(2)
  })
})

describe('POST /resolve', () => {
  it('checks the token, the role and the body', async () => {
    expect((await request(app).post('/api/v1/product-import/resolve').send({})).status).toBe(401)
    expect((await resolve(STAFF_A, { supplierKey: KEY, names: ['x'] })).status).toBe(403)
    const many = await resolve(OWNER_A, { supplierKey: KEY, names: Array.from({ length: 201 }, (_, i) => `n${i}`) })
    expect(many.status).toBe(400)
    expect(many.body.error).toBe('INVALID_REQUEST')
    expect((await resolve(OWNER_A, { supplierKey: 'bad', names: ['x'] })).body.error).toBe('INVALID_REQUEST')
  })

  it('answers only i, productId and source', async () => {
    await approve()
    const res = await resolve(OWNER_A, { supplierKey: KEY, names: [PRINTED] })
    expect(Object.keys(res.body)).toEqual(['matches'])
    expect(Object.keys(res.body.matches[0]).sort()).toEqual(['i', 'productId', 'source'])
  })
})

describe('a failing memory write', () => {
  it('still answers 200 with the counts and the invoice id', async () => {
    const orig = mongoose.mongo.Collection.prototype.bulkWrite
    vi.spyOn(mongoose.mongo.Collection.prototype, 'bulkWrite').mockImplementation(function (ops, opts) {
      if (this.collectionName === 'invoiceAliases') throw new Error('boom')
      return orig.call(this, ops, opts)
    })
    const res = await approve()
    expect(res.status).toBe(200)
    expect(res.body.updated).toBe(1)
    expect(typeof res.body.invoiceId).toBe('string')
  })
})
