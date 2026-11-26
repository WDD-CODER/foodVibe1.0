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
const { _waitForUsageWritesForTests } = require('../services/ai-usage')

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

  it('returns only the caller products; an unknown name, no number and an empty name are not lines', async () => {
    fetchMock.mockResolvedValue(modelAnswer({ lines: [
      { spoken: 'קמח', quantity: 4, unit: null },
      { spoken: 'banana', quantity: 2, unit: null },
      { spoken: 'חמוצים', quantity: 1, unit: 'kg' },
      { spoken: 'אורז', quantity: null, unit: null },
      { spoken: '', quantity: 3, unit: null },
    ] }))
    const res = await post({ text: 'קמח 4 קילו, banana 2, חמוצים 1, אורז' })
    expect(res.status).toBe(200)
    expect(res.body.lines).toEqual([{ productId: 'flour', quantity: 4, unit: 'kg', missing: [] }])
    expect(res.body.unmatched).toEqual([
      { spoken: 'banana', status: 'unmatched', quantity: 2, missing: ['product', 'unit'] },
      { spoken: 'חמוצים', status: 'unmatched', quantity: 1, unit: 'kg', missing: ['product'] },
      {
        spoken: 'אורז', status: 'unmatched', productId: 'rice', missing: ['amount', 'unit'],
        candidates: [{ productId: 'rice', nameHebrew: 'אורז' }],
      },
    ])
    const sent = sentBody()
    const user = sent.contents[0].parts[0].text
    expect(user).toContain('קמח 4 קילו')
    expect(user).toContain('UNITS:')
    expect(sent.contents).toHaveLength(1)
  })

  it('works with 3,000 products: one line for קמח, and the model gets no product list', async () => {
    const docs = Array.from({ length: 2997 }, (_, i) => ({
      _id: `bulk${i}`, businessId: 'b1', schemaVersion: 2, createdBy: 'own1', createdAt: 1, updatedAt: 1,
      name: `bulk${i}`, nameHebrew: `מוצר ${i}`, baseUnit: 'kg', purchaseOptions: [],
    }))
    await testDb().collection('products').insertMany(docs)
    fetchMock.mockResolvedValue(modelAnswer({ lines: [{ spoken: 'קמח', quantity: 4, unit: 'kg' }] }))
    const res = await post({ text: 'קמח 4 קילו' })
    expect(res.status).toBe(200)
    expect(res.body.lines).toEqual([{ productId: 'flour', quantity: 4, unit: 'kg', missing: [] }])
    const sent = JSON.stringify(sentBody())
    expect(sent).not.toContain('מוצר 1')
    expect(sent).not.toContain('אורז')
    expect(sent).not.toContain('PRODUCTS')
    expect(sent).toContain('קמח 4 קילו')
  })

  it('plan 650: a plural fills the singular product; onions are a choice, counted-before first; no other business', async () => {
    await testDb().collection('products').updateOne({ _id: 'tomato' }, { $set: { nameHebrew: 'עגבניה' } })
    await product('yellow', 'בצל צהוב')
    await product('purple', 'בצל סגול')
    await product('foreign', 'בצל אדום', 'b2')
    await testDb().collection('stockCounts').insertOne({
      _id: 'c1', businessId: 'b1', status: 'final', countedAt: 1, lines: [{ productId: 'purple', quantity: 1, unit: 'kg', baseQuantity: 1 }],
    })
    fetchMock.mockResolvedValue(modelAnswer({ lines: [
      { spoken: 'עגבניות', quantity: 3, unit: null }, { spoken: 'בצל', quantity: 2, unit: 'kg' },
    ] }))
    const res = await post({ text: 'שלושה עגבניות ושני קילו בצל' })
    expect(res.body.lines).toEqual([{ productId: 'tomato', quantity: 3, unit: null, unitMissing: true, missing: ['unit'] }])
    expect(res.body.unmatched).toHaveLength(1)
    expect(res.body.unmatched[0]).toMatchObject({ spoken: 'בצל', status: 'choose', quantity: 2, unit: 'kg' })
    expect(res.body.unmatched[0].candidates.map(c => c.productId)).toEqual(['purple', 'yellow'])
  })

  it('plan 651: similar tomato products ask; a crate unit the product has is kept, else the line is flagged', async () => {
    await testDb().collection('products').updateOne({ _id: 'tomato' }, { $set: { nameHebrew: 'עגבניה' } })
    await product('cherry', 'עגבניות שרי')
    await product('tamar', 'עגבניה תמר')
    await product('avocado', 'אבוקדו', 'b1', { baseUnit: 'gram', purchaseOptions: [{ unitSymbol: 'ארגז', conversionRate: 10000 }] })
    await product('lemon', 'לימון', 'b1', { baseUnit: 'gram' })
    fetchMock.mockResolvedValue(modelAnswer({ lines: [
      { spoken: 'עגבניות', quantity: 3, unit: 'ארגזים' }, { spoken: 'אבוקדו', quantity: 2, unit: 'ארגזים' },
      { spoken: 'לימון', quantity: 1, unit: 'ארגזים' },
    ] }))
    const res = await post({ text: 'שלושה ארגזים עגבניות' })
    expect(res.body.unmatched).toHaveLength(1)
    expect(res.body.unmatched[0].status).toBe('choose')
    expect(res.body.unmatched[0].candidates).toHaveLength(3)
    expect(res.body.lines).toEqual([
      { productId: 'avocado', quantity: 2, unit: 'ארגז', missing: [] },
      { productId: 'lemon', quantity: 1, unit: null, unitNeedsFix: true, spokenUnit: 'ארגזים', missing: ['unit'] },
    ])
  })

  it('plan 655: a unit added by the user is in the model prompt and read back; every line carries missing', async () => {
    await testDb().collection('taxonomyTerms').insertOne({ _id: 'u-handful', businessId: 'b1', kind: 'unit', key: 'handful' })
    await testDb().collection('DICTIONARY_OVERRIDES').updateOne(
      { userId: 'own1' }, { $set: { items: { handful: 'חופן' } } }, { upsert: true })
    await product('parsley', 'פטרוזיליה', 'b1', { baseUnit: 'gram', purchaseOptions: [{ unitSymbol: 'handful', conversionRate: 30 }] })
    fetchMock.mockResolvedValue(modelAnswer({ lines: [
      { spoken: 'פטרוזיליה', quantity: 2, unit: 'חופנים' }, { spoken: 'עגבניות', quantity: 3, unit: null },
    ] }))
    const res = await post({ text: '2 חופנים פטרוזיליה, 3 עגבניות' })
    expect(sentBody().contents[0].parts[0].text).toContain('"handful" ("חופן")')
    expect(res.body.lines).toHaveLength(2)
    expect(res.body.lines).toEqual(expect.arrayContaining([
      { productId: 'tomato', quantity: 3, unit: null, unitMissing: true, missing: ['unit'] },
      { productId: 'parsley', quantity: 2, unit: 'handful', missing: [] },
    ]))
    // A line with a missing part is never a counted one: every such line says what to ask.
    for (const line of res.body.lines) expect(Array.isArray(line.missing)).toBe(true)
    for (const line of res.body.lines.filter(l => l.unit === null)) expect(line.missing).toContain('unit')
    await testDb().collection('DICTIONARY_OVERRIDES').deleteMany({})
  })

  it('a spoken name matching two products is a choice with both as candidates', async () => {
    await product('whole', 'קמח מלא')
    await testDb().collection('products').updateOne({ _id: 'flour' }, { $set: { nameHebrew: 'קמח לבן' } })
    fetchMock.mockResolvedValue(modelAnswer({ lines: [{ spoken: 'קמח', quantity: 4, unit: 'kg' }] }))
    const res = await post({ text: 'קמח 4' })
    expect(res.body.lines).toEqual([])
    expect(res.body.unmatched).toHaveLength(1)
    expect(res.body.unmatched[0]).toMatchObject({ spoken: 'קמח', quantity: 4, unit: 'kg' })
    expect(res.body.unmatched[0].candidates.map(c => c.productId).sort()).toEqual(['flour', 'whole'])
  })

  it('leaves out a product in the Trash and a product of another business', async () => {
    await testDb().collection('products').updateOne({ _id: 'rice' }, { $set: { deletedAt: 5 } })
    await product('foreign', 'סוכר-זר', 'b2')
    fetchMock.mockResolvedValue(modelAnswer({ lines: [
      { spoken: 'אורז', quantity: 1, unit: null }, { spoken: 'סוכר-זר', quantity: 1, unit: null },
    ] }))
    const res = await post({ text: 'אורז 1, סוכר-זר 1' })
    expect(res.body.lines).toEqual([])
    expect(res.body.unmatched.map(u => u.spoken)).toEqual(['אורז', 'סוכר-זר'])
  })

  it('answers 200 with empty lists and no model call when the business has no product', async () => {
    await testDb().collection('products').deleteMany({})
    const res = await post({ text: 'קמח 1' })
    expect(res.body).toEqual({ draftId: null, lines: [], unmatched: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('writes no count, one pending draft, one usage row, and logs no name or count word', async () => {
    fetchMock.mockResolvedValue(modelAnswer({ lines: [{ spoken: 'קמח', quantity: 4, unit: null }] }))
    const res = await post({ text: 'קמח סודי 4 קילו' })
    expect(res.status).toBe(200)
    expect(await testDb().collection('stockCounts').countDocuments({})).toBe(0)
    const drafts = await testDb().collection('aiDrafts').find({}).toArray()
    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({
      _id: res.body.draftId, businessId: 'b1', feature: 'stock_extract', status: 'pending', subject: { type: 'stockCount' },
    })
    expect(drafts[0].aiDraft.lines).toEqual([{ productId: 'flour', quantity: 4, unit: null, unitMissing: true, missing: ['unit'] }])
    // Plan 654 (d): the model's raw lines are kept next to the cleaned answer.
    expect(drafts[0].aiDraft.modelLines).toEqual([{ spoken: 'קמח', quantity: 4, unit: null }])
    await _waitForUsageWritesForTests()
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
