'use strict'
/** Plan 556 - the onboarding intake in one request, and the test request that touches no client. */

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
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'עובד', businessId: 'b1', businessRole: 'staff' }
const OWNER2 = { userId: 'own2', name: 'בעלים2', businessId: 'b2', businessRole: 'owner' }
const db = c => testDb().collection(c)
const intake = (body, who = OWNER) => request(app).post('/api/v1/business/front-desk-intake').set(as(who)).send(body)
const body = (over = {}) => ({
  businessType: 'catering',
  profile: { displayName: 'קייטרינג', slug: 'my-catering' },
  knowledge: [{ topic: 'prices', question: 'כמה זה עולה?', answer: '100 לאורח', visibility: 'public' }],
  ...over,
})

beforeEach(async () => {
  for (const c of ['frontDeskProfiles', 'knowledgeItems', 'requests', 'clients', 'decisionLog', 'menuEvents', 'bookings', 'businesses']) await db(c).deleteMany({})
  await db('businesses').insertMany([
    { _id: 'b1', name: 'business 1', ownerId: 'own1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0 },
    { _id: 'b2', name: 'business 2', ownerId: 'own2', createdAt: 2, internal: false, lastSyncedMasterVersion: 0 },
  ])
})

describe('POST /business/front-desk-intake', () => {
  it('creates the profile from the template as a draft, with the draft knowledge items', async () => {
    const res = await intake(body({
      profile: {
        displayName: 'קייטרינג', slug: 'my-catering', phone: '0501234567',
        requestKinds: { event: { rules: { minPartySize: 50 }, eventTypeOptions: ['חתונה', 'בר מצווה'] }, tasting: { enabled: false } },
      },
    }))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ knowledge: { created: 1, updated: 0, skipped: 0 }, baseline: 'skipped' })
    const p = await db('frontDeskProfiles').findOne({ businessId: 'b1' })
    expect(p).toMatchObject({ status: 'draft', businessType: 'catering', slug: 'my-catering', phone: '0501234567' })
    expect(p.assistant.level).toBe(0)
    expect(p.requestKinds.event.rules.minPartySize).toBe(50)
    expect(p.requestKinds.event.rules.minLeadHours).toBe(templateFor('catering').requestKinds.event.rules.minLeadHours)
    expect(p.requestKinds.event.questions.find(q => q.key === 'event_type').options).toEqual(['חתונה', 'בר מצווה'])
    expect(p.requestKinds.tasting.enabled).toBe(false)
    const items = await db('knowledgeItems').find({}).toArray()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ status: 'draft', source: 'manual', businessId: 'b1', topic: 'prices' })
  })

  it('a second identical POST creates no new items and no second profile', async () => {
    await intake(body())
    const res = await intake(body())
    expect(res.status).toBe(200)
    expect(res.body.knowledge).toEqual({ created: 0, updated: 1, skipped: 0 })
    expect(await db('knowledgeItems').countDocuments({})).toBe(1)
    expect(await db('frontDeskProfiles').countDocuments({})).toBe(1)
  })

  it('an approved item with the same question is left unchanged and counted skipped', async () => {
    await intake(body())
    await db('knowledgeItems').updateMany({}, { $set: { status: 'approved' } })
    const res = await intake(body({ knowledge: [{ topic: 'prices', question: 'כמה זה עולה?', answer: 'חדש', visibility: 'public' }] }))
    expect(res.body.knowledge).toEqual({ created: 0, updated: 0, skipped: 1 })
    const stored = await db('knowledgeItems').findOne({})
    expect(stored.answer).toBe('100 לאורח')
  })

  it('leaves baseline unchanged when none is filled, stores it like PUT /baseline when one is', async () => {
    await db('businesses').updateOne({ _id: 'b1' }, { $set: { baseline: { inquiriesPerMonth: 7, filledAt: 5 } } })
    expect((await intake(body())).body.baseline).toBe('skipped')
    expect((await intake(body({ baseline: {} }))).body.baseline).toBe('skipped')
    expect((await db('businesses').findOne({ _id: 'b1' })).baseline).toEqual({ inquiriesPerMonth: 7, filledAt: 5 })
    const res = await intake(body({ baseline: { inquiriesPerMonth: 20 } }))
    expect(res.body.baseline).toBe('saved')
    const b = (await db('businesses').findOne({ _id: 'b1' })).baseline
    expect(b.inquiriesPerMonth).toBe(20)
    expect(typeof b.filledAt).toBe('number')
  })

  it('refuses staff with 403 and writes nothing', async () => {
    const res = await intake(body(), STAFF)
    expect(res.status).toBe(403)
    expect(await db('frontDeskProfiles').countDocuments({})).toBe(0)
  })

  it.each([
    ['status', b => ({ ...b, profile: { ...b.profile, status: 'active' } })],
    ['whatsapp', b => ({ ...b, profile: { ...b.profile, whatsapp: { phoneNumberId: 'x', ownerAlertOptIn: true } } })],
    ['assistant.level', b => ({ ...b, profile: { ...b.profile, assistant: { level: 2 } } })],
    ['a top-level key', b => ({ ...b, status: 'active' })],
  ])('a body with %s gives 400', async (_name, mk) => {
    const res = await intake(mk(body()))
    expect(res.status).toBe(400)
    expect(await db('frontDeskProfiles').countDocuments({})).toBe(0)
  })

  it('a new profile without a slug gives 400 SLUG_REQUIRED; a taken slug gives 409 SLUG_TAKEN', async () => {
    const noSlug = await intake(body({ profile: { displayName: 'x' } }))
    expect(noSlug.status).toBe(400)
    expect(noSlug.body.error).toBe('SLUG_REQUIRED')
    await intake(body())
    const taken = await intake(body(), OWNER2)
    expect(taken.status).toBe(409)
    expect(taken.body.error).toBe('SLUG_TAKEN')
  })

  it("never touches another business's profile and never changes status or whatsapp", async () => {
    await intake(body({ profile: { displayName: 'ב2', slug: 'other-biz' } }), OWNER2)
    await db('frontDeskProfiles').updateOne({ businessId: 'b2' }, { $set: { status: 'pilot', whatsapp: { phoneNumberId: 'PN', ownerAlertOptIn: false } } })
    await intake(body())
    await db('frontDeskProfiles').updateOne({ businessId: 'b1' }, { $set: { status: 'active' } })
    await intake(body({ profile: { displayName: 'חדש' } }))
    const b2 = await db('frontDeskProfiles').findOne({ businessId: 'b2' })
    expect(b2).toMatchObject({ displayName: 'ב2', status: 'pilot', whatsapp: { phoneNumberId: 'PN' } })
    const b1 = await db('frontDeskProfiles').findOne({ businessId: 'b1' })
    expect(b1).toMatchObject({ displayName: 'חדש', status: 'active', slug: 'my-catering' })
  })
})

describe('test request', () => {
  const post = (b, who = OWNER) => request(app).post('/api/v1/requests').set(as(who)).send(b)
  const testBody = (over = {}) => ({
    kind: 'event', test: true, guestName: 'בקשת בדיקה', guestPhone: '0501234567',
    wanted: { date: '2030-01-01', partySize: 40 }, answers: [], ...over,
  })

  beforeEach(async () => {
    await intake(body())
    await db('clients').insertOne({ _id: 'c1', businessId: 'b1', name: 'לקוח', phone: '0521111111', counters: { requests: 3, events: 0, bookings: 0 } })
  })

  it('is stored with test:true and the placeholder client, creating no client', async () => {
    const res = await post(testBody())
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ test: true, clientId: '__test__', guestName: 'בקשת בדיקה' })
    expect(await db('clients').countDocuments({})).toBe(1)
    expect((await db('clients').findOne({ _id: 'c1' })).counters.requests).toBe(3)
  })

  it('needs a name and a phone', async () => {
    expect((await post(testBody({ guestPhone: undefined }))).status).toBe(400)
    expect((await post(testBody({ clientId: 'c1', guestName: undefined, guestPhone: undefined }))).status).toBe(400)
  })

  it('approving sets approved with no event, booking, decision row or client change', async () => {
    const created = await post(testBody())
    const res = await request(app).post(`/api/v1/requests/${created.body._id}/approve`).set(as(OWNER)).send({})
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, test: true, request: { status: 'approved' } })
    expect(res.body.request.outcome).toBeUndefined()
    expect(res.body.request.statusHistory.at(-1).status).toBe('approved')
    expect(await db('menuEvents').countDocuments({})).toBe(0)
    expect(await db('bookings').countDocuments({})).toBe(0)
    expect(await db('decisionLog').countDocuments({})).toBe(0)
    expect(await db('clients').countDocuments({})).toBe(1)
    const again = await request(app).post(`/api/v1/requests/${created.body._id}/approve`).set(as(OWNER)).send({})
    expect(again.status).toBe(409)
  })

  it('declining and asking move the status with no decision row', async () => {
    const a = await post(testBody())
    const d = await request(app).post(`/api/v1/requests/${a.body._id}/decline`).set(as(OWNER)).send({ reason: 'other' })
    expect(d.status).toBe(200)
    expect(d.body.status).toBe('declined')
    const b = await post(testBody())
    await db('requests').updateOne({ _id: b.body._id }, { $set: { status: 'qualified' } })
    const ask = await request(app).put(`/api/v1/requests/${b.body._id}/status`).set(as(OWNER)).send({ status: 'needs_info' })
    expect(ask.status).toBe(200)
    expect(await db('decisionLog').countDocuments({})).toBe(0)
  })
})
