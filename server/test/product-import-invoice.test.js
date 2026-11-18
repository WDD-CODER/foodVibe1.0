'use strict'
/** Plan 625 — the invoice record, the price history and the draft close written by the one apply request. */

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
const STAFF = { userId: 'st1', name: 'staff1', businessId: 'b1', businessRole: 'staff' }
const OTHER_OWNER = { userId: 'own2', name: 'owner2', businessId: 'b2', businessRole: 'owner' }

const apply = (body, who = OWNER) => request(app).post('/api/v1/product-import/apply').set(as(who)).send(body)
const line = (name, price, extra = {}) => ({ name, baseUnit: 'kg', price, category: null, purchaseUnit: null, purchaseQty: null, ...extra })
const printed = (printedName, row, extra = {}) => ({ printedName, needsReview: false, row, ...extra })
const header = (lines, extra = {}) => ({ supplierName: 'ירקן', source: 'photo', lines, ...extra })

const col = name => testDb().collection(name)

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('suppliers').insertMany([
    stored(supplierBody({ nameHebrew: 'ירקן' }), { _id: 'sup1', userId: 'own1', businessId: 'b1' }),
  ])
  await db.collection('products').insertMany([
    stored(productBody({ nameHebrew: 'עגבנייה', sources: [{ supplierId: 'sup1', price: 5.9, addedBy: 'own1', addedAt: 1 }] }), { _id: 'p-tom', userId: 'own1', businessId: 'b1' }),
    stored(productBody({ nameHebrew: 'מלפפון', sources: [{ supplierId: 'sup1', price: 4.5, addedBy: 'own1', addedAt: 1 }] }), { _id: 'p-cuc', userId: 'own1', businessId: 'b1' }),
  ])
})

const threeRows = () => [line('חסה', 4), line('עגבנייה', 6.49), line('מלפפון', 4.5)]
const threeLines = () => [printed('חסה אורגנית', 0), printed('עגבניות', 1), printed('מלפפונים', 2)]

describe('apply with an invoice', () => {
  it('writes one invoice and one history row per created or changed price', async () => {
    const res = await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header(threeLines()) })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ created: 1, updated: 1, skipped: 1 })
    const invoices = await col('invoices').find({}).toArray()
    expect(invoices).toHaveLength(1)
    expect(res.body.invoiceId).toBe(invoices[0]._id)
    const lettuce = await col('products').findOne({ businessId: 'b1', nameHebrew: 'חסה' })
    expect(invoices[0].lines.map(l => [l.result, l.productId, l.price])).toEqual([
      ['created', lettuce._id, 4], ['updated', 'p-tom', 6.49], ['same_price', 'p-cuc', 4.5],
    ])
    expect(invoices[0]).toMatchObject({ businessId: 'b1', supplierId: 'sup1', supplierName: 'ירקן', source: 'photo' })
    const history = await col('priceHistory').find({}).sort({ price: 1 }).toArray()
    expect(history).toHaveLength(2)
    expect(history[0]).toMatchObject({ productId: lettuce._id, price: 4, source: 'invoice', invoiceId: invoices[0]._id, businessId: 'b1', supplierId: 'sup1', by: 'own1' })
    expect(history[0]).not.toHaveProperty('prevPrice')
    expect(history[1]).toMatchObject({ productId: 'p-tom', prevPrice: 5.9, price: 6.49, changePct: 10, source: 'invoice', invoiceId: invoices[0]._id })
  })

  it('without invoice: no invoiceId, no invoice document, history with source import', async () => {
    const res = await apply({ supplierId: 'sup1', rows: threeRows() })
    expect(res.status).toBe(200)
    expect(res.body).not.toHaveProperty('invoiceId')
    expect(await col('invoices').countDocuments()).toBe(0)
    const history = await col('priceHistory').find({}).toArray()
    expect(history).toHaveLength(2)
    for (const row of history) {
      expect(row.source).toBe('import')
      expect(row).not.toHaveProperty('invoiceId')
    }
  })

  it('logs counts only', async () => {
    await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header(threeLines(), { invoiceNumber: 'INV-SECRET-1' }) })
    const applied = logs.byEvent('product_import.applied').at(-1)
    expect(applied).toMatchObject({ historyRows: 2, historySkipped: 0, invoice: true })
    expect(JSON.stringify(applied)).not.toContain('INV-SECRET-1')
  })
})

describe('a failing trail never undoes the prices', () => {
  const failOn = (method, collectionName) => {
    const original = mongoose.mongo.Collection.prototype[method]
    vi.spyOn(mongoose.mongo.Collection.prototype, method).mockImplementation(function (...args) {
      if (this.collectionName === collectionName) throw new Error('boom')
      return original.apply(this, args)
    })
  }

  it('invoice insert fails: 200, invoiceId null, price kept, one trail_failed log without names or prices', async () => {
    failOn('insertOne', 'invoices')
    const before = logs.byEvent('product_import.apply.trail_failed').length
    const res = await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header(threeLines()) })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ created: 1, updated: 1, invoiceId: null })
    expect((await col('products').findOne({ _id: 'p-tom' })).sources[0].price).toBe(6.49)
    const failed = logs.byEvent('product_import.apply.trail_failed').slice(before)
    expect(failed).toHaveLength(1)
    expect(failed[0].stage).toBe('invoice')
    expect(failed[0].historyRows).toBe(2)
    expect(JSON.stringify(failed[0])).not.toMatch(/עגבני|6\.49/)
  })

  it('history insert fails: 200, invoiceId null, no invoice written', async () => {
    failOn('insertMany', 'priceHistory')
    const res = await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header(threeLines()) })
    expect(res.status).toBe(200)
    expect(res.body.invoiceId).toBeNull()
    expect(await col('invoices').countDocuments()).toBe(0)
    expect((await col('products').findOne({ _id: 'p-tom' })).sources[0].price).toBe(6.49)
  })

  it('keeps the file clean-up date when the invoice insert fails', async () => {
    await col('storedFiles').insertOne({ _id: 'f1', businessId: 'b1', kind: 'invoice', deleteAfter: 999 })
    failOn('insertOne', 'invoices')
    await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header(threeLines(), { fileId: 'f1' }) })
    expect((await col('storedFiles').findOne({ _id: 'f1' })).deleteAfter).toBe(999)
  })
})

describe('a broken invoice is refused before any write', () => {
  const expectNothingWritten = async () => {
    expect(await col('priceHistory').countDocuments()).toBe(0)
    expect(await col('invoices').countDocuments()).toBe(0)
    expect(await col('products').countDocuments()).toBe(2)
    expect((await col('products').findOne({ _id: 'p-tom' })).sources[0].price).toBe(5.9)
  }

  it('a line pointing at a row that does not exist', async () => {
    const res = await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header([printed('x', 3)]) })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'INVALID_INVOICE' })
    await expectNothingWritten()
  })

  it('a tax id that is not 9 digits', async () => {
    const res = await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header(threeLines(), { supplierTaxId: '12345' }) })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'INVALID_INVOICE' })
    await expectNothingWritten()
  })

  it('a file of another business', async () => {
    await col('storedFiles').insertOne({ _id: 'f-other', businessId: 'b2', kind: 'invoice' })
    const res = await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header(threeLines(), { fileId: 'f-other' }) })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'UNKNOWN_FILE' })
    await expectNothingWritten()
  })

  it('a draft of another business', async () => {
    await col('aiDrafts').insertOne({ _id: 'd-other', businessId: 'b2', userId: 'own2', feature: 'invoice_read', input: {}, aiDraft: {}, status: 'pending', at: 1 })
    const res = await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header(threeLines(), { draftId: 'd-other' }) })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'UNKNOWN_DRAFT' })
    await expectNothingWritten()
  })
})

describe('the AI draft and the stored file', () => {
  it('closes the draft with the share of lines saved unchanged', async () => {
    await col('aiDrafts').insertOne({
      _id: 'd1', businessId: 'b1', userId: 'own1', feature: 'invoice_read', input: {}, status: 'pending', at: 1,
      aiDraft: { printed: [
        { name: 'עגבניות', quantity: 1, unit: 'kg', unitPrice: 6.49, lineTotal: 6.49 },
        { name: 'מלפפונים', quantity: 1, unit: 'kg', unitPrice: 4.5, lineTotal: 4.5 },
      ] },
    })
    const lines = [
      printed('עגבניות', 1, { quantity: 1, unit: 'kg', unitPrice: 6.49, lineTotal: 6.49 }),
      printed('מלפפונים', 2, { quantity: 1, unit: 'kg', unitPrice: 4.7, lineTotal: 4.7 }),
    ]
    const res = await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header(lines, { draftId: 'd1' }) })
    expect(res.status).toBe(200)
    expect(await col('aiDrafts').findOne({ _id: 'd1' })).toMatchObject({ status: 'confirmed', keptRatio: 0.5 })
  })

  it('lifts the clean-up date of the stored file once the invoice is saved', async () => {
    await col('storedFiles').insertOne({ _id: 'f1', businessId: 'b1', kind: 'invoice', deleteAfter: 999 })
    const res = await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header(threeLines(), { fileId: 'f1' }) })
    expect(res.body.invoiceId).toEqual(expect.any(String))
    expect(await col('storedFiles').findOne({ _id: 'f1' })).not.toHaveProperty('deleteAfter')
  })
})

describe('who can read and write invoices', () => {
  it('owner reads lines; staff only the header fields; another business nothing; writes are 405; staff cannot apply', async () => {
    const res = await apply({ supplierId: 'sup1', rows: threeRows(), invoice: header(threeLines(), { supplierTaxId: '123456789', invoiceNumber: 'N1', invoiceDate: '2026-11-01' }) })
    const invoiceId = res.body.invoiceId
    const get = who => request(app).get('/api/v1/data/invoices').set(as(who))

    const owner = await get(OWNER)
    expect(owner.status).toBe(200)
    expect(owner.body).toHaveLength(1)
    expect(owner.body[0].lines).toHaveLength(3)

    const staff = await get(STAFF)
    expect(staff.status).toBe(200)
    expect(staff.body).toHaveLength(1)
    expect(staff.body[0]).toMatchObject({ _id: invoiceId, supplierName: 'ירקן', invoiceDate: '2026-11-01', invoiceNumber: 'N1' })
    expect(staff.body[0]).not.toHaveProperty('lines')
    expect(staff.body[0]).not.toHaveProperty('supplierTaxId')

    const other = await get(OTHER_OWNER)
    expect(other.status).toBe(200)
    expect(other.body).toEqual([])

    for (const method of ['post', 'put', 'delete']) {
      const url = method === 'post' ? '/api/v1/data/invoices' : `/api/v1/data/invoices/${invoiceId}`
      const r = await request(app)[method](url).set(as(OWNER)).send({})
      expect(r.status).toBe(405)
      expect(r.body).toMatchObject({ error: 'USE_ROUTER' })
    }

    const before = await col('priceHistory').countDocuments()
    const denied = await apply({ supplierId: 'sup1', rows: [line('חסה2', 7)], invoice: header([printed('x', 0)]) }, STAFF)
    expect(denied.status).toBe(403)
    expect(await col('priceHistory').countDocuments()).toBe(before)
    expect(await col('invoices').countDocuments()).toBe(1)
  })
})
