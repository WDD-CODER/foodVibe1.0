'use strict'
/**
 * Plan 615 (C-REGISTRY): the registered collections, indexes, empty routers and the AI helper exports.
 * No behaviour is asserted beyond the registry: later plans fill the routers and must not break this file.
 */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { menuEventBody, stored, logisticsAnswer } = require('./helpers/v2-docs')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'owner', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'staff', businessId: 'b1', businessRole: 'staff' }
const OTHER = { userId: 'own2', name: 'other', businessId: 'b2', businessRole: 'owner' }
const ADMIN = { userId: 'adm1', name: 'admin', role: 'admin', businessId: 'bAdmin', businessRole: 'owner' }
const data = type => `/api/v1/data/${type}`

const SEEDS = {
  invoices: biz => ({
    _id: 'inv_' + biz, schemaVersion: 2, businessId: biz, createdBy: 'u', createdAt: 1, updatedAt: 1,
    supplierName: 'ספק', invoiceDate: '2026-11-01', invoiceNumber: '77', source: 'photo',
    lines: [{ printedName: 'עגבניות', unitPrice: 2, lineTotal: 20, price: 2, needsReview: false, result: 'created' }],
  }),
  diagnoses: biz => ({
    _id: 'dg_' + biz, schemaVersion: 2, businessId: biz, createdBy: 'u', createdAt: 1, updatedAt: 1,
    name: 'אבחון', periodDays: 60, menu: [{ name: 'מנה', sellPrice: 55 }], pricesIncludeVat: true, vatPct: 18,
    invoiceIds: [], homeBusinessId: biz, status: 'open',
  }),
  stockCounts: biz => ({
    _id: 'sc_' + biz, schemaVersion: 2, businessId: biz, createdBy: 'u', createdAt: 1, updatedAt: 1,
    countedAt: 1, status: 'draft', source: 'manual', lines: [],
  }),
}

describe.each(['invoices', 'diagnoses', 'stockCounts'])('%s: router-written readable collection', type => {
  beforeEach(async () => {
    await testDb().collection(type).insertOne(SEEDS[type]('b1'))
  })

  it('the owner reads his document, another business gets []', async () => {
    const mine = await request(app).get(data(type)).set(as(OWNER))
    expect(mine.status).toBe(200)
    expect(mine.body.map(d => d._id)).toEqual([SEEDS[type]('b1')._id])
    const theirs = await request(app).get(data(type)).set(as(OTHER))
    expect(theirs.status).toBe(200)
    expect(theirs.body).toEqual([])
  })

  it('generic POST, PUT and DELETE answer 405 USE_ROUTER', async () => {
    const id = SEEDS[type]('b1')._id
    const post = await request(app).post(data(type)).set(as(OWNER)).send({})
    const put = await request(app).put(`${data(type)}/${id}`).set(as(OWNER)).send({})
    const del = await request(app).delete(`${data(type)}/${id}`).set(as(OWNER))
    for (const res of [post, put, del]) {
      expect(res.status).toBe(405)
      expect(res.body.error).toBe('USE_ROUTER')
    }
  })
})

describe('staff reads are trimmed', () => {
  it('a staff GET of invoices returns the header fields only (no lines)', async () => {
    await testDb().collection('invoices').insertOne(SEEDS.invoices('b1'))
    const res = await request(app).get(data('invoices')).set(as(STAFF))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ supplierName: 'ספק', invoiceDate: '2026-11-01', invoiceNumber: '77', businessId: 'b1' })
    expect(res.body[0].lines).toBeUndefined()
  })

  it('a staff GET of diagnoses returns no menu', async () => {
    await testDb().collection('diagnoses').insertOne(SEEDS.diagnoses('b1'))
    const res = await request(app).get(data('diagnoses')).set(as(STAFF))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ name: 'אבחון', status: 'open' })
    expect(res.body[0].menu).toBeUndefined()
  })
})

describe('server-only collections', () => {
  it.each(['priceHistory', 'invoiceAliases', 'supplierProfiles', 'aiDrafts', 'storedFiles', 'businessAccess'])(
    'a generic GET of %s answers 403', async type => {
      const res = await request(app).get(data(type)).set(as(OWNER))
      expect(res.status).toBe(403)
    })
})

describe('indexes', () => {
  const names = async col => (await testDb().collection(col).indexes()).map(i => i.name)

  it('the ten indexes exist by name', async () => {
    expect(await names('aiDrafts')).toContain('ai_drafts_business_feature_at')
    expect(await names('storedFiles')).toContain('stored_files_business_kind')
    expect(await names('priceHistory')).toEqual(expect.arrayContaining(['price_history_business_product_at', 'price_history_business_at']))
    expect(await names('invoiceAliases')).toEqual(expect.arrayContaining(['invoice_alias_own_unique', 'invoice_alias_shared_unique']))
    expect(await names('businessAccess')).toContain('business_access_live_unique')
    expect(await names('invoices')).toContain('invoices_business_created')
    expect(await names('diagnoses')).toContain('diagnoses_business_created')
    expect(await names('stockCounts')).toContain('stock_counts_business_status_counted')
  })

  it('own aliases with the same keys collide; shared rows differing in masterProductId do not; own and shared do not', async () => {
    const col = testDb().collection('invoiceAliases')
    const own = (id, extra = {}) => ({ _id: id, businessId: 'b1', supplierKey: 'tax:1', nameKey: 'tomato', printedName: 'Tomato', productId: 'p1', hits: 1, lastAt: 1, ...extra })
    const shared = (id, masterProductId) => ({ _id: id, businessId: '__master__', supplierKey: 'tax:1', nameKey: 'tomato', printedName: 'Tomato', masterProductId, hits: 1, contributors: [], lastAt: 1 })
    await col.insertOne(own('a1'))
    await expect(col.insertOne(own('a2'))).rejects.toMatchObject({ code: 11000 })
    await col.insertOne(shared('s1', 'm1'))
    await col.insertOne(shared('s2', 'm2'))
    await expect(col.insertOne(shared('s3', 'm1'))).rejects.toMatchObject({ code: 11000 })
  })

  it('two live grants of one user and business collide; a revoked one beside a live one does not', async () => {
    const col = testDb().collection('businessAccess')
    const grant = (id, extra = {}) => ({ _id: id, userId: 'u2', businessId: 'b1', role: 'consultant', grantedBy: 'u1', grantedByName: 'a', grantedAt: 1, ...extra })
    await col.insertOne(grant('g1'))
    await expect(col.insertOne(grant('g2'))).rejects.toMatchObject({ code: 11000 })
    await col.insertOne(grant('g3', { revokedAt: 5, revokedBy: 'u1' }))
    await col.insertOne(grant('g4', { revokedAt: 6, revokedBy: 'u1' }))
  })
})

describe('registry probe', () => {
  const MOUNTS = [
    '/api/v1/files', '/api/v1/access', '/api/v1/stock', '/api/v1/diag', '/api/v1/admin/learning',
    '/api/v1/ai/voice', '/api/v1/ai/logistics', '/api/v1/ai/invoices', '/api/v1/ai/diag', '/api/v1/ai/stock',
  ]
  const ALL_MODULES = ['events', 'event_logistics', 'frontdesk', 'ai_create', 'consultant_diag', 'menu_design']

  beforeEach(async () => {
    await testDb().collection('businesses').insertOne({
      _id: 'bAdmin', name: 'admin biz', ownerId: 'adm1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0, modules: ALL_MODULES,
    })
  })

  it.each(MOUNTS)('GET %s/__registry_probe__ answers 404', async mount => {
    const res = await request(app).get(`${mount}/__registry_probe__`).set(as(ADMIN))
    expect(res.status).toBe(404)
  })

  it('each of the ten router modules loads on its own and exports a router function', () => {
    for (const p of ['files', 'access', 'stock', 'diag', 'admin-learning', 'ai/voice', 'ai/logistics', 'ai/invoices', 'ai/diag', 'ai/stock']) {
      expect(typeof require(`../routes/${p}`), p).toBe('function')
    }
  })

  it('routes/ai exposes the four shared helpers as functions', () => {
    const ai = require('../routes/ai')
    for (const k of ['respondFromGeminiFailure', 'usageOf', 'requestedModel', 'aiLimiter']) expect(typeof ai[k], k).toBe('function')
  })
})

describe('logistics save keeps the loading ticks', () => {
  it('PUT /events/:id/logistics leaves siteLogistics.loaded unchanged', async () => {
    const loaded = [{ key: 'מקרר', at: 5, by: 'own1', byName: 'owner' }]
    const doc = stored(menuEventBody({ eventDate: '2026-12-01' }), {
      _id: 'ev1', userId: 'own1', businessId: 'b1', createdBy: 'own1', _masterId: 'ev1', _userModified: false,
      stage: 'inquiry', stageHistory: [], notes: [], siteLogistics: { answers: [], loaded },
    })
    await testDb().collection('menuEvents').insertOne(doc)
    const { at: _a, by: _b, byName: _n, ...answer } = logisticsAnswer({ itemKey: 'תנור' })
    const res = await request(app).put('/api/v1/events/ev1/logistics').set(as(OWNER)).send({ answers: [answer] })
    expect(res.status).toBe(200)
    const after = await testDb().collection('menuEvents').findOne({ _id: 'ev1' })
    expect(after.siteLogistics.loaded).toEqual(loaded)
    expect(after.siteLogistics.answers).toHaveLength(1)
  })
})
