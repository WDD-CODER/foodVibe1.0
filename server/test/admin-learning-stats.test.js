'use strict'
/** Plan 630 - GET /admin/learning/stats: counts only, private businesses left out. */

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
const ADMIN = { userId: 'boss', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const OWNER = { userId: 'own1', businessId: 'b1', businessRole: 'owner' }
const db = c => testDb().collection(c)
const URL = '/api/v1/admin/learning/stats'

beforeEach(async () => {
  for (const c of ['aiDrafts', 'invoiceAliases', 'supplierProfiles', 'businesses']) await db(c).deleteMany({})
  const now = Date.now()
  await db('businesses').insertMany([
    { _id: 'b1', name: 'SECRETBIZ One', createdAt: 1 },
    { _id: 'bp', name: 'SECRETBIZ Private', createdAt: 2, aiPrivate: true },
  ])
  await db('aiDrafts').insertMany([
    { _id: 'd1', businessId: 'b1', feature: 'invoice_read', status: 'confirmed', keptRatio: 0.5, at: now - 1000, confirmedAt: now },
    { _id: 'd2', businessId: 'bp', feature: 'invoice_read', status: 'confirmed', keptRatio: 0, at: now - 1000, confirmedAt: now },
    // a stripped row of a deleted business
    { _id: 'd3', businessId: 'gone', feature: 'invoice_read', model: 'gemini-x', keptRatio: 1, status: 'confirmed', at: now - 2000, confirmedAt: now },
    { _id: 'd4', businessId: 'b1', feature: 'invoice_read', status: 'confirmed', keptRatio: 1, at: now - 200 * 86400000 },
  ])
  await db('supplierProfiles').insertMany([
    { _id: 'SUPPLIERKEY1', names: ['SECRETSUPPLIER'], invoices: 1, contributors: ['b1'], lastAt: now },
    { _id: 'SUPPLIERKEY2', names: ['SECRETSUPPLIER2'], invoices: 1, contributors: ['b1', 'b2'], lastAt: now },
  ])
  await db('invoiceAliases').insertMany([
    { _id: 'a1', businessId: '__master__', supplierKey: 's1', nameKey: 'n1', printedName: 'SECRETPRINTED1', masterProductId: 'm1', hits: 1, contributors: ['b1'], lastAt: now },
    { _id: 'a2', businessId: '__master__', supplierKey: 's1', nameKey: 'n2', printedName: 'SECRETPRINTED2', masterProductId: 'm2', hits: 1, contributors: ['b1', 'b2'], lastAt: now },
    { _id: 'a3', businessId: '__master__', supplierKey: 's2', nameKey: 'n3', printedName: 'SECRETPRINTED3', masterProductId: 'm3', hits: 1, contributors: ['b2'], lastAt: now },
    { _id: 'a4', businessId: 'b1', supplierKey: 's1', nameKey: 'n1', printedName: 'SECRETPRINTED4', productId: 'p1', hits: 1, lastAt: now },
  ])
})

describe('GET /admin/learning/stats', () => {
  it('leaves private businesses out, counts a deleted business, honours days, and counts the brain', async () => {
    const res = await request(app).get(URL).set(as(ADMIN))
    expect(res.status).toBe(200)
    expect(res.body.privateBusinesses).toBe(1)
    expect(res.body.brain).toEqual({ suppliers: 2, names: 3, businesses: 2 })
    const rows = res.body.flows
    expect(rows.map(r => [r.model, r.drafts])).toEqual([['gemini-x', 1], [null, 1]])
    const nullRow = rows.find(r => r.model === null)
    expect(nullRow.avgKeptRatio).toBe(0.5)
    expect(rows.find(r => r.model === 'gemini-x').avgKeptRatio).toBe(1)
    expect(res.body.truncated).toBe(false)
    const wide = await request(app).get(`${URL}?days=365`).set(as(ADMIN))
    expect(wide.body.flows.find(r => r.model === null).drafts).toBe(2)
  })

  it('returns no ids, names or content', async () => {
    const res = await request(app).get(URL).set(as(ADMIN))
    for (const secret of ['b1', 'b2', 'bp', 'gone', 'SECRETBIZ', 'SECRETPRINTED', 'SECRETSUPPLIER', 'SUPPLIERKEY']) {
      expect(res.text).not.toContain(secret)
    }
  })

  it('refuses a non-admin and no token', async () => {
    expect((await request(app).get(URL).set(as(OWNER))).status).toBe(403)
    expect((await request(app).get(URL)).status).toBe(401)
  })

  it('rejects a bad days value', async () => {
    for (const days of ['6', '366', 'x']) {
      const res = await request(app).get(`${URL}?days=${days}`).set(as(ADMIN))
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('BAD_DAYS')
    }
  })
})
