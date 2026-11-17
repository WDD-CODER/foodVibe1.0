'use strict'
/** Plan 616 — PUT /api/v1/admin/businesses/:id/platform, and what members see of it. */

const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { clearModuleCache } = require('../middleware/require-module')
const { createBusinessFor } = require('../services/business')
const { clearCapCache } = require('../services/ai-cap')
const { jerusalemDate } = require('../middleware/usage')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const ADMIN = { userId: 'boss', name: 'The Boss', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const OWNER = { userId: 'ownerA', name: 'Owner A', businessId: 'bA', businessRole: 'owner' }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const put = (body, who = ADMIN, id = 'bA') => request(app).put(`/api/v1/admin/businesses/${id}/platform`).set(as(who)).send(body)
const stored = () => testDb().collection('businesses').findOne({ _id: 'bA' })

beforeEach(async () => {
  const db = testDb()
  await db.collection('businesses').deleteMany({})
  await db.collection('businesses').insertMany([
    { _id: 'bBoss', name: 'boss', ownerId: 'boss', createdAt: 1 },
    { _id: 'bA', name: 'A', ownerId: 'ownerA', createdAt: 1 },
  ])
  clearModuleCache()
})

describe('PUT /admin/businesses/:id/platform', () => {
  it('stores modules, appends a history row and the next gated request follows', async () => {
    expect((await request(app).get('/api/v1/data/requests').set(as(OWNER))).status).toBe(200)
    const res = await put({ modules: ['events'], reason: 'pilot scope' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, modules: ['events'], aiMonthlyTokenCap: null, aiPrivate: false })
    const doc = await stored()
    expect(doc.modules).toEqual(['events'])
    expect(doc.platformHistory).toHaveLength(1)
    expect(doc.platformHistory[0]).toMatchObject({ by: 'boss', byName: 'The Boss', reason: 'pilot scope', changed: ['modules'] })
    expect(typeof doc.platformHistory[0].at).toBe('number')
    const next = await request(app).get('/api/v1/data/requests').set(as(OWNER))
    expect(next.status).toBe(403)
    expect(next.body).toEqual({ error: 'MODULE_OFF', module: 'frontdesk' })
  })

  it('stores the cap, removes it on null, and stores aiPrivate', async () => {
    await put({ aiMonthlyTokenCap: 5000, reason: 'cap it' })
    expect((await stored()).aiMonthlyTokenCap).toBe(5000)
    const res = await put({ aiMonthlyTokenCap: null, aiPrivate: true, reason: 'uncap' })
    expect(res.status).toBe(200)
    const doc = await stored()
    expect('aiMonthlyTokenCap' in doc).toBe(false)
    expect(doc.aiPrivate).toBe(true)
    expect(doc.platformHistory[1].changed).toEqual(['aiMonthlyTokenCap', 'aiPrivate'])
  })

  it('keeps only the last 50 history rows', async () => {
    for (let i = 0; i < 51; i++) expect((await put({ aiPrivate: i % 2 === 0, reason: 'round ' + i })).status).toBe(200)
    const rows = (await stored()).platformHistory
    expect(rows).toHaveLength(50)
    expect(rows[0].reason).toBe('round 1')
  })

  it.each([
    ['no reason', { modules: ['events'] }],
    ['a 2-character reason', { modules: ['events'], reason: 'ab' }],
    ['an unknown module', { modules: ['nope'], reason: 'because' }],
    ['a repeated module', { modules: ['events', 'events'], reason: 'because' }],
    ['an unknown key', { modules: ['events'], reason: 'because', extra: 1 }],
    ['none of the three fields', { reason: 'because' }],
  ])('answers 400 with issues for %s', async (_name, body) => {
    const res = await put(body)
    expect(res.status).toBe(400)
    expect(res.body.issues.length).toBeGreaterThan(0)
    expect((await stored()).platformHistory).toBeUndefined()
  })

  it('404 for an unknown business, 403 for an owner, 401 without a token', async () => {
    expect((await put({ modules: [], reason: 'because' }, ADMIN, 'nope')).status).toBe(404)
    expect((await put({ modules: [], reason: 'because' }, OWNER)).status).toBe(403)
    const res = await request(app).put('/api/v1/admin/businesses/bA/platform').send({ modules: [], reason: 'because' })
    expect(res.status).toBe(401)
  })

  it('the log line carries the business id and the field names, never the reason', () => {
    const src = fs.readFileSync(path.join(__dirname, '../routes/admin.js'), 'utf8')
    const line = src.split('\n').find(l => l.includes("event: 'admin.platform.updated'"))
    expect(line).toContain('businessId: req.params.id')
    expect(line).toContain('changed')
    expect(line).not.toContain('reason')
  })
})

describe('the cap takes effect at once', () => {
  it('a new cap refuses the next AI call and null lets it through', async () => {
    const db = testDb()
    clearCapCache()
    process.env.GEMINI_API_KEY = 'test-key'
    await db.collection('aiUsage').deleteMany({})
    await db.collection('aiUsage').insertOne({ businessId: 'bA', day: jerusalemDate(Date.now()), totalTokens: 50, feature: 'parse_text', ok: true, at: 1 })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ingredients":[]}' }] } }] }) })
    vi.stubGlobal('fetch', fetchMock)
    try {
      const ai = () => request(app).post('/api/v1/ai/parse-text').set(as(OWNER)).send({ rawText: '2 eggs' })
      expect((await ai()).status).not.toBe(429) // no cap yet; the state is cached
      expect((await put({ aiMonthlyTokenCap: 1, reason: 'cap it' })).status).toBe(200)
      const refused = await ai()
      expect(refused.status).toBe(429)
      expect(refused.body.error).toBe('ai_monthly_cap_reached')
      const calls = fetchMock.mock.calls.length
      expect((await put({ aiMonthlyTokenCap: null, reason: 'uncap' })).status).toBe(200)
      await ai()
      expect(fetchMock.mock.calls.length).toBe(calls + 1)
    } finally {
      vi.unstubAllGlobals()
      await db.collection('aiUsage').deleteMany({})
    }
  })
})

describe('what members see', () => {
  it('GET /business returns modules and never platformHistory', async () => {
    await put({ modules: ['events'], reason: 'pilot scope' })
    const res = await request(app).get('/api/v1/business').set(as(OWNER))
    expect(res.status).toBe(200)
    expect(res.body.modules).toEqual(['events'])
    expect('platformHistory' in res.body).toBe(false)
  })

  it('a signed-up business has no modules field', async () => {
    const doc = await createBusinessFor({ _id: 'newbie', name: 'New' })
    expect('modules' in (await testDb().collection('businesses').findOne({ _id: doc._id }))).toBe(false)
  })
})
