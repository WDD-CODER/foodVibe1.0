'use strict'
/**
 * Plan 637 (C-STOCK) - POST /api/v1/ai/stock/extract. Gemini is faked by stubbing global fetch; the app runs on the
 * in-memory Mongo test app. Nothing here needs a key, a network or a real model.
 */
const request = require('supertest')

process.env.GEMINI_API_KEY = 'test-key'
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { captureLogs } = require('./helpers/log-capture')
const { resetForTests } = require('../services/gemini-client')

let app
let fetchMock
let logs

beforeAll(async () => {
  app = await buildTestApp()
  logs = captureLogs()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'b1', businessRole: 'owner' }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const modelAnswer = obj => jsonResponse(200, { candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }] })
const post = (body, user = OWNER) => request(app).post('/api/v1/ai/stock/extract').set(as(user)).send(body)
const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body)

async function product(id, nameHebrew, businessId = 'b1', extra = {}) {
  await testDb().collection('products').insertOne({
    _id: id, businessId, schemaVersion: 2, createdBy: 'own1', createdAt: 1, updatedAt: 1,
    name: id, nameHebrew, baseUnit: 'kg', purchaseOptions: [], ...extra,
  })
}

beforeEach(async () => {
  resetForTests()
  logs.records.length = 0
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const db = testDb()
  for (const c of ['products', 'stockCounts', 'aiDrafts', 'aiUsage', 'taxonomyTerms']) await db.collection(c).deleteMany({})
  await product('flour', 'קמח')
  await product('rice', 'אורז')
  await product('tomato', 'עגבניות')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Sorted by nameHebrew: 0 אורז (rice), 1 עגבניות (tomato), 2 קמח (flour).
describe('POST /ai/stock/extract', () => {
  it('requires a token and a valid body', async () => {
    expect((await request(app).post('/api/v1/ai/stock/extract').send({ text: 'x' })).status).toBe(401)
    expect((await post({})).body).toEqual({ error: 'INVALID_REQUEST' })
    expect((await post({ text: '   ' })).status).toBe(400)
    expect((await post({ text: 'x'.repeat(20001) })).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns only the caller products; position 99, null and no number land in unmatched', async () => {
    fetchMock.mockResolvedValue(modelAnswer({ lines: [
      { p: 2, spoken: 'קמח', quantity: 4, u: null },
      { p: 99, spoken: 'בננות', quantity: 2, u: null },
      { p: null, spoken: 'חמוצים', quantity: 1, u: null },
      { p: 0, spoken: 'אורז', quantity: null, u: null },
    ] }))
    const res = await post({ text: 'קמח 4 קילו, בננות 2, חמוצים 1, אורז' })
    expect(res.status).toBe(200)
    expect(res.body.lines).toEqual([{ productId: 'flour', quantity: 4, unit: 'kg' }])
    expect(res.body.unmatched).toEqual([
      { spoken: 'בננות', quantity: 2 }, { spoken: 'חמוצים', quantity: 1 }, { spoken: 'אורז' },
    ])
    const sent = sentBody()
    const user = sent.contents[0].parts[0].text
    expect(user).toContain('0. "אורז" [kg]')
    expect(user).toContain('קמח 4 קילו')
    expect(JSON.stringify(sent.system_instruction)).not.toContain('קמח')
    expect(JSON.stringify(sent.system_instruction)).not.toContain('אורז')
    expect(sent.contents).toHaveLength(1)
  })

  it('refuses 801 live products with 413 and no model call; 800 answers 200', async () => {
    const docs = Array.from({ length: 797 }, (_, i) => ({
      _id: `bulk${i}`, businessId: 'b1', schemaVersion: 2, createdBy: 'own1', createdAt: 1, updatedAt: 1,
      name: `bulk${i}`, nameHebrew: `מוצר ${i}`, baseUnit: 'kg', purchaseOptions: [],
    }))
    await testDb().collection('products').insertMany(docs)
    fetchMock.mockResolvedValue(modelAnswer({ lines: [] }))
    expect((await post({ text: 'קמח 1' })).status).toBe(200)
    await product('extra', 'עוד')
    fetchMock.mockClear()
    const res = await post({ text: 'קמח 1' })
    expect(res.status).toBe(413)
    expect(res.body).toEqual({ error: 'TOO_MANY_PRODUCTS', max: 800 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('leaves out a product in the Trash and a product of another business', async () => {
    await testDb().collection('products').updateOne({ _id: 'rice' }, { $set: { deletedAt: 5 } })
    await product('foreign', 'סוכר-זר', 'b2')
    fetchMock.mockResolvedValue(modelAnswer({ lines: [] }))
    await post({ text: 'אורז 1' })
    const user = sentBody().contents[0].parts[0].text
    expect(user).not.toContain('אורז [kg]')
    expect(user).not.toContain('סוכר-זר')
    expect(user).toContain('"קמח"')
  })

  it('answers 200 with empty lists and no model call when the business has no product', async () => {
    await testDb().collection('products').deleteMany({})
    const res = await post({ text: 'קמח 1' })
    expect(res.body).toEqual({ draftId: null, lines: [], unmatched: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('writes no count, one pending draft, one usage row, and logs no name or count word', async () => {
    fetchMock.mockResolvedValue(modelAnswer({ lines: [{ p: 2, spoken: 'קמח', quantity: 4, u: null }] }))
    const res = await post({ text: 'קמח סודי 4 קילו' })
    expect(res.status).toBe(200)
    expect(await testDb().collection('stockCounts').countDocuments({})).toBe(0)
    const drafts = await testDb().collection('aiDrafts').find({}).toArray()
    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({
      _id: res.body.draftId, businessId: 'b1', feature: 'stock_extract', status: 'pending', subject: { type: 'stockCount' },
    })
    expect(drafts[0].aiDraft.lines).toEqual([{ productId: 'flour', quantity: 4, unit: 'kg' }])
    expect(await testDb().collection('aiUsage').countDocuments({ feature: 'stock_extract' })).toBe(1)
    const logged = JSON.stringify(logs.records)
    for (const word of ['קמח', 'אורז', 'עגבניות', 'סודי']) expect(logged).not.toContain(word)
    expect(logs.byEvent('ai.stock_extract.done')).toHaveLength(1)
  })

  it('stores fileId in the draft input only when sent, and the model that answered', async () => {
    fetchMock.mockResolvedValue(modelAnswer({ lines: [] }))
    const withFile = await post({ text: 'קמח 1', fileId: 'file123' })
    const without = await post({ text: 'קמח 1' })
    const a = await testDb().collection('aiDrafts').findOne({ _id: withFile.body.draftId })
    const b = await testDb().collection('aiDrafts').findOne({ _id: without.body.draftId })
    expect(a.input).toEqual({ text: 'קמח 1', fileId: 'file123' })
    expect(b.input).toEqual({ text: 'קמח 1' })
    expect(typeof a.model).toBe('string')
    expect(a.model.length).toBeGreaterThan(0)
  })

  it('answers 502 and saves no draft for an unusable answer', async () => {
    fetchMock.mockResolvedValue(modelAnswer('not json at all'))
    const bad = await post({ text: 'קמח 1' })
    expect(bad.status).toBe(502)
    expect(bad.body).toEqual({ error: 'Gemini returned invalid JSON' })
    fetchMock.mockResolvedValue(modelAnswer({ nope: true }))
    expect((await post({ text: 'קמח 1' })).status).toBe(502)
    expect(await testDb().collection('aiDrafts').countDocuments({})).toBe(0)
    expect(logs.byEvent('ai.stock_extract.parse_failed')[0]).toMatchObject({ rawLength: expect.any(Number) })
  })

  it('answers 429 on the 21st call in 15 minutes', async () => {
    const user = { userId: 'limit1', name: 'מגביל', businessId: 'b1', businessRole: 'owner' }
    fetchMock.mockResolvedValue(modelAnswer({ lines: [] }))
    for (let i = 0; i < 20; i++) expect((await post({ text: 'קמח 1' }, user)).status).toBe(200)
    expect((await post({ text: 'קמח 1' }, user)).status).toBe(429)
  })
})
