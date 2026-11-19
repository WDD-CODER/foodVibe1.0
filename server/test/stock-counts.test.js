'use strict'
/** Plan 635 - /api/v1/stock: counts as draft and final, on-hand, one unit rule, creator-or-owner. */
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
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'עובד', businessId: 'b1', businessRole: 'staff' }
const STAFF2 = { userId: 'st2', name: 'עובד ב', businessId: 'b1', businessRole: 'staff' }
const OUTSIDER = { userId: 'out1', name: 'זר', businessId: 'b2', businessRole: 'owner' }
const NOW = Date.now()
const HOUR = 3_600_000

const post = (user, body) => request(app).post('/api/v1/stock/counts').set(as(user)).send(body)
const put = (user, id, body) => request(app).put(`/api/v1/stock/counts/${id}`).set(as(user)).send(body)
const finalize = (user, id) => request(app).post(`/api/v1/stock/counts/${id}/finalize`).set(as(user)).send({})
const list = (user, qs) => request(app).get(`/api/v1/stock/counts${qs}`).set(as(user))
const onHand = user => request(app).get('/api/v1/stock/on-hand').set(as(user))
const line = (productId, quantity, unit) => ({ productId, quantity, unit })
const body = (lines, countedAt = NOW - HOUR, extra = {}) => ({ countedAt, lines, ...extra })

async function product(id, businessId, extra = {}) {
  await testDb().collection('products').insertOne({
    _id: id, businessId, schemaVersion: 2, createdBy: 'own1', createdAt: 1, updatedAt: 1,
    name: id, baseUnit: 'kg', purchaseOptions: [], ...extra,
  })
}

beforeEach(async () => {
  for (const c of ['stockCounts', 'products', 'taxonomyTerms']) await testDb().collection(c).deleteMany({})
  await product('flour', 'b1')
  await product('rice', 'b1')
  await product('other', 'b2')
})

describe('on-hand', () => {
  it('follows the newest final count; drafts do not change it', async () => {
    const a = await post(OWNER, body([line('flour', 4, 'kg')], NOW - 3 * HOUR))
    expect(a.status).toBe(201)
    expect(a.body.status).toBe('draft')
    expect(a.body.lines[0].baseQuantity).toBe(4)
    expect((await finalize(OWNER, a.body._id)).status).toBe(200)
    expect((await onHand(OWNER)).body).toEqual([{ productId: 'flour', baseQuantity: 4, countedAt: NOW - 3 * HOUR }])

    const draft = await post(OWNER, body([line('flour', 9, 'kg')], NOW - 2 * HOUR))
    expect((await onHand(OWNER)).body[0].baseQuantity).toBe(4)
    expect((await finalize(OWNER, draft.body._id)).status).toBe(200)
    expect((await onHand(OWNER)).body[0].baseQuantity).toBe(9)

    const c = await post(OWNER, body([line('rice', 2000, 'gram')], NOW - HOUR))
    await finalize(OWNER, c.body._id)
    const rows = (await onHand(OWNER)).body
    expect(rows).toEqual([
      { productId: 'flour', baseQuantity: 9, countedAt: NOW - 2 * HOUR },
      { productId: 'rice', baseQuantity: 2, countedAt: NOW - HOUR },
    ])
  })

  it('answers 401 with no token', async () => {
    expect((await request(app).get('/api/v1/stock/on-hand')).status).toBe(401)
  })
})

describe('POST /counts', () => {
  it('answers 400 UNIT_NOT_CONVERTIBLE with the line index and stores nothing', async () => {
    const res = await post(OWNER, body([line('flour', 1, 'kg'), line('rice', 1, 'liter')]))
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'UNIT_NOT_CONVERTIBLE', line: 1 })
    expect(await testDb().collection('stockCounts').countDocuments()).toBe(0)
  })

  it('answers 400 for a duplicate and an unknown product', async () => {
    expect((await post(OWNER, body([line('flour', 1, 'kg'), line('flour', 2, 'kg')]))).body).toEqual({ error: 'DUPLICATE_PRODUCT', line: 1 })
    expect((await post(OWNER, body([line('other', 1, 'kg')]))).body).toEqual({ error: 'UNKNOWN_PRODUCT', line: 0 })
  })

  it('answers 400 when the body carries a server-owned field', async () => {
    expect((await post(OWNER, body([line('flour', 1, 'kg')], NOW - HOUR, { baseQuantity: 1 }))).status).toBe(400)
    expect((await post(OWNER, body([line('flour', 1, 'kg')], NOW - HOUR, { status: 'final' }))).status).toBe(400)
  })

  it('uses a crate pack size and the business unit rate', async () => {
    await product('oil', 'b1', { baseUnit: 'liter', purchaseOptions: [{ unitSymbol: 'ארגז', conversionRate: 10, uom: 'liter' }] })
    const res = await post(OWNER, body([line('oil', 3, 'ארגז')]))
    expect(res.body.lines[0].baseQuantity).toBe(30)
  })

  it('answers 401 with no token', async () => {
    expect((await request(app).post('/api/v1/stock/counts').send(body([]))).status).toBe(401)
  })
})

describe('PUT and finalize', () => {
  it('lets staff edit and finalise his own draft', async () => {
    const d = await post(STAFF, body([line('flour', 1, 'kg')]))
    const upd = await put(STAFF, d.body._id, body([line('flour', 3, 'kg')]))
    expect(upd.status).toBe(200)
    expect(upd.body.lines[0].baseQuantity).toBe(3)
    expect((await finalize(STAFF, d.body._id)).status).toBe(200)
  })

  it('refuses staff on another member draft, lets the owner, hides it from another business', async () => {
    const d = await post(STAFF, body([line('flour', 1, 'kg')]))
    const a = await put(STAFF2, d.body._id, body([line('flour', 2, 'kg')]))
    expect(a.status).toBe(403)
    expect(a.body.error).toBe('FORBIDDEN')
    expect((await finalize(STAFF2, d.body._id)).status).toBe(403)
    expect((await put(OWNER, d.body._id, body([line('flour', 2, 'kg')]))).status).toBe(200)
    expect((await put(OUTSIDER, d.body._id, body([]))).status).toBe(404)
    expect((await finalize(OUTSIDER, d.body._id)).status).toBe(404)
    expect((await finalize(OWNER, d.body._id)).status).toBe(200)
  })

  it('answers 409 COUNT_FINAL on a final count', async () => {
    const d = await post(OWNER, body([line('flour', 1, 'kg')]))
    await finalize(OWNER, d.body._id)
    const p = await put(OWNER, d.body._id, body([line('flour', 2, 'kg')]))
    expect(p.status).toBe(409)
    expect(p.body).toEqual({ error: 'COUNT_FINAL' })
    expect((await finalize(OWNER, d.body._id)).body).toEqual({ error: 'COUNT_FINAL' })
  })

  it('answers 400 EMPTY_COUNT with no lines and 401 with no token', async () => {
    const d = await post(OWNER, body([]))
    expect(d.status).toBe(201)
    const f = await finalize(OWNER, d.body._id)
    expect(f.status).toBe(400)
    expect(f.body).toEqual({ error: 'EMPTY_COUNT' })
    expect((await request(app).post(`/api/v1/stock/counts/${d.body._id}/finalize`)).status).toBe(401)
  })

  it('removes the note when the body has none', async () => {
    const d = await post(OWNER, body([], NOW - HOUR, { note: 'hello' }))
    expect(d.body.note).toBe('hello')
    const upd = await put(OWNER, d.body._id, body([]))
    expect(upd.body.note).toBeUndefined()
  })
})

describe('GET /counts', () => {
  it('lists drafts newest first, only the business, and only final when asked', async () => {
    const a = await post(OWNER, body([line('flour', 1, 'kg')], NOW - 3 * HOUR))
    await post(OWNER, body([line('flour', 2, 'kg')], NOW - HOUR))
    const f = await post(OWNER, body([line('rice', 1, 'kg')], NOW - 2 * HOUR))
    await finalize(OWNER, f.body._id)
    await post(OUTSIDER, body([line('other', 1, 'kg')]))
    const drafts = (await list(STAFF, '?status=draft')).body
    expect(drafts.map(c => c.countedAt)).toEqual([NOW - HOUR, NOW - 3 * HOUR])
    expect(drafts[1]._id).toBe(a.body._id)
    expect(drafts[0].lines).toHaveLength(1)
    expect((await list(STAFF, '?status=final')).body.map(c => c._id)).toEqual([f.body._id])
    expect((await list(STAFF, '?status=draft&limit=1')).body).toHaveLength(1)
  })

  it('answers 400 BAD_STATUS and BAD_LIMIT', async () => {
    expect((await list(OWNER, '')).body).toEqual({ error: 'BAD_STATUS' })
    expect((await list(OWNER, '?status=draft&limit=101')).body).toEqual({ error: 'BAD_LIMIT' })
    expect((await list(OWNER, '?status=draft&limit=0')).body).toEqual({ error: 'BAD_LIMIT' })
  })
})

describe('the generic data API', () => {
  it('answers 405 USE_ROUTER on writes and lists the business counts on read', async () => {
    const d = await post(OWNER, body([line('flour', 1, 'kg')]))
    await post(OUTSIDER, body([line('other', 1, 'kg')]))
    const h = as(OWNER)
    const w1 = await request(app).post('/api/v1/data/stockCounts').set(h).send({ _id: 'x' })
    const w2 = await request(app).put(`/api/v1/data/stockCounts/${d.body._id}`).set(h).send({ status: 'final' })
    const w3 = await request(app).delete(`/api/v1/data/stockCounts/${d.body._id}`).set(h)
    for (const w of [w1, w2, w3]) {
      expect(w.status).toBe(405)
      expect(JSON.stringify(w.body)).toContain('USE_ROUTER')
    }
    const read = await request(app).get('/api/v1/data/stockCounts').set(h)
    expect(read.status).toBe(200)
    const items = Array.isArray(read.body) ? read.body : read.body.items ?? read.body.data
    expect(items.map(c => c._id)).toEqual([d.body._id])
  })
})

describe('finalize confirms the AI drafts of the count (plan 637)', () => {
  const drafts = () => testDb().collection('aiDrafts')
  const aiDraft = (...lines) => ({ lines, unmatched: [] })
  const seed = (_id, businessId, extra = {}) => drafts().insertOne({
    _id, businessId, userId: 'own1', feature: 'stock_extract', subject: { type: 'stockCount' }, input: { text: 't' },
    aiDraft: aiDraft(line('flour', 4, 'kg'), line('rice', 2, 'kg')), status: 'pending', at: 1, ...extra,
  })

  beforeEach(async () => {
    await drafts().deleteMany({})
  })

  it('confirms two pending drafts, each with its own keptRatio, and skips a confirmed one', async () => {
    await seed('d1', 'b1')
    await seed('d2', 'b1', { aiDraft: aiDraft(line('flour', 4, 'kg')) })
    await seed('d3', 'b1', { status: 'confirmed', confirmedAt: 7, keptRatio: 0.25 })
    const c = await post(OWNER, body([line('flour', 4, 'kg'), line('rice', 3, 'kg')], NOW - HOUR, {
      source: 'voice', draftIds: ['d1', 'd2', 'd3'],
    }))
    expect(c.status).toBe(201)
    const res = await finalize(OWNER, c.body._id)
    expect(res.status).toBe(200)
    const d1 = await drafts().findOne({ _id: 'd1' })
    const d2 = await drafts().findOne({ _id: 'd2' })
    const d3 = await drafts().findOne({ _id: 'd3' })
    expect(d1).toMatchObject({ status: 'confirmed', keptRatio: 0.5 })
    expect(d2).toMatchObject({ status: 'confirmed', keptRatio: 1 })
    expect(d1.saved.lines).toEqual([line('flour', 4, 'kg'), line('rice', 3, 'kg')])
    expect(d3).toMatchObject({ status: 'confirmed', confirmedAt: 7, keptRatio: 0.25 })
  })

  it('leaves a draft of another business pending and still answers 200', async () => {
    await seed('d1', 'b1')
    await seed('foreign', 'b2')
    const c = await post(OWNER, body([line('flour', 4, 'kg')], NOW - HOUR, { draftIds: ['foreign', 'nope', 'd1'] }))
    const res = await finalize(OWNER, c.body._id)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('final')
    expect((await drafts().findOne({ _id: 'foreign' })).status).toBe('pending')
    expect((await drafts().findOne({ _id: 'd1' })).status).toBe('confirmed')
  })
})
