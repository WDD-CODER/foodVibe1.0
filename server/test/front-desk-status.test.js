'use strict'
/** Plan 557 - the platform admin sets a front desk's status, assistant level and plan; owners cannot; data stays readable. */
const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { templateFor } = require('../generated/schemas/front-desk-templates')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const ADMIN = { userId: 'boss', name: 'Dandan', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const OWNER = { userId: 'own1', businessId: 'b1', businessRole: 'owner' }
const col = name => testDb().collection(name)
const url = id => `/api/v1/admin/businesses/${id}/front-desk`
const put = (id, body, user = ADMIN) => request(app).put(url(id)).set(as(user)).send(body)
const profile = () => col('frontDeskProfiles').findOne({ businessId: 'b1' })

beforeEach(async () => {
  for (const c of ['frontDeskProfiles', 'businesses', 'clients', 'requests', 'bookings']) await col(c).deleteMany({})
  await col('businesses').insertMany([
    { _id: 'b1', name: 'עסק', ownerId: 'own1' },
    { _id: 'b2', name: 'ללא פרופיל', ownerId: 'own2' },
  ])
  const created = await request(app).post('/api/v1/data/frontDeskProfiles').set(as(OWNER))
    .send({ ...templateFor('catering'), slug: 'my-catering', displayName: 'קייטרינג' })
  expect(created.status).toBe(201)
})

describe('PUT /admin/businesses/:id/front-desk', () => {
  it('sets status and appends one history row', async () => {
    const res = await put('b1', { status: 'pilot', reason: 'התחלת פיילוט' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, status: 'pilot', assistantLevel: 0 })
    const p = await profile()
    expect(p.status).toBe('pilot')
    expect(p.adminHistory).toHaveLength(1)
    expect(p.adminHistory[0]).toMatchObject({ by: 'boss', byName: 'Dandan', status: 'pilot', reason: 'התחלת פיילוט' })
    expect(typeof p.adminHistory[0].at).toBe('number')
  })

  it('sets the assistant level and the plan', async () => {
    expect((await put('b1', { assistantLevel: 1, reason: 'earned' })).status).toBe(200)
    expect((await profile()).assistant.level).toBe(1)
    const res = await put('b1', { plan: 'pilot', reason: 'plan' })
    expect(res.body.plan).toBe('pilot')
    expect((await col('businesses').findOne({ _id: 'b1' })).frontDeskPlan).toBe('pilot')
    expect((await profile()).adminHistory).toHaveLength(2)
  })

  it('the platform list row carries the assistant level next to the status', async () => {
    const list = async () => (await request(app).get('/api/v1/admin/businesses').set(as(ADMIN))).body.rows.find(r => r._id === 'b1')
    expect((await list()).frontDesk).toEqual({ status: 'draft', done: expect.any(Number), total: expect.any(Number) })
    expect((await put('b1', { assistantLevel: 1, reason: 'earned' })).status).toBe(200)
    expect((await list()).frontDesk).toMatchObject({ status: 'draft', assistantLevel: 1 })
  })

  it('refuses a non-admin, a bad body, an unknown business and a business with no profile', async () => {
    expect((await put('b1', { status: 'pilot', reason: 'x' }, OWNER)).status).toBe(403)
    expect((await put('b1', { status: 'pilot' })).status).toBe(400)
    expect((await put('b1', { status: 'pilot', reason: 'x'.repeat(201) })).status).toBe(400)
    expect((await put('b1', { assistantLevel: 2, reason: 'x' })).status).toBe(400)
    expect((await put('b1', { reason: 'x' })).status).toBe(400)
    expect((await put('nope', { status: 'pilot', reason: 'x' })).status).toBe(404)
    const none = await put('b2', { status: 'pilot', reason: 'x' })
    expect(none.status).toBe(404)
    expect(none.body).toEqual({ error: 'NO_PROFILE' })
    expect((await profile()).status).toBe('draft')
  })
})

describe('owner writes through the generic API', () => {
  it('a PUT cannot change status, assistant.level or adminHistory', async () => {
    await put('b1', { status: 'pilot', assistantLevel: 1, reason: 'x' })
    const p = await profile()
    const res = await request(app).put(`/api/v1/data/frontDeskProfiles/${p._id}`).set(as(OWNER)).send({
      displayName: 'חדש', status: 'active', adminHistory: [], assistant: { ...p.assistant, level: 0 },
    })
    expect(res.status).toBe(200)
    const after = await profile()
    expect(after.displayName).toBe('חדש')
    expect(after.status).toBe('pilot')
    expect(after.assistant.level).toBe(1)
    expect(after.adminHistory).toHaveLength(1)
  })

  it('a POST stores assistant.level 0', async () => {
    await col('frontDeskProfiles').deleteMany({})
    const res = await request(app).post('/api/v1/data/frontDeskProfiles').set(as(OWNER))
      .send({ ...templateFor('catering'), slug: 'other-slug', displayName: 'x', assistant: { level: 1, tone: 'warm' }, adminHistory: [] })
    expect(res.status).toBe(201)
    const p = await profile()
    expect(p.assistant.level).toBe(0)
    expect(p.adminHistory).toBeUndefined()
  })
})

describe('suspended', () => {
  it('closes the public page, writes nothing, and the owner still reads the records', async () => {
    await put('b1', { status: 'suspended', reason: 'stopped' })
    const pub = await request(app).get('/api/v1/public/my-catering')
    expect(pub.status).toBe(200)
    expect(pub.body).toEqual({ available: false, displayName: 'קייטרינג' })
    const post = await request(app).post('/api/v1/public/my-catering/requests').send({
      kind: 'table', guestName: 'דנה', guestPhone: '0521234567', wanted: { partySize: 2 }, answers: [], consentTerms: true,
    })
    expect(post.status).toBe(403)
    expect(post.body.error).toBe('NOT_AVAILABLE')
    expect(await col('requests').countDocuments({})).toBe(0)
    expect(await col('clients').countDocuments({})).toBe(0)
    for (const type of ['clients', 'requests', 'bookings']) {
      expect((await request(app).get(`/api/v1/data/${type}`).set(as(OWNER))).status).toBe(200)
    }
  })
})
