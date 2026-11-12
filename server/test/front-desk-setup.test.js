'use strict'
/** Plan 556 - the front desk checklist the server computes: per type, in setup-status and in the admin rows. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { templateFor } = require('../generated/schemas/front-desk-templates')
const { frontDeskSetup, REQUIRED_TOPICS } = require('../services/front-desk-setup')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'owner1', businessId: 'b1', businessRole: 'owner' }
const ADMIN = { userId: 'adm1', name: 'admin', businessId: 'b9', businessRole: 'owner', isPlatformAdmin: true }
const db = c => testDb().collection(c)
const status = () => request(app).get('/api/v1/business/setup-status').set(as(OWNER))

beforeEach(async () => {
  for (const c of ['frontDeskProfiles', 'knowledgeItems', 'requests', 'businesses', 'users']) await db(c).deleteMany({})
  await db('businesses').insertMany([
    { _id: 'b1', name: 'business 1', ownerId: 'own1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0 },
    { _id: 'b9', name: 'admin biz', ownerId: 'adm1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0 },
  ])
})

const profile = (type, over = {}) => ({
  _id: 'p1', schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: 1, updatedAt: 1,
  slug: 'my-place', displayName: 'מקום', ...templateFor(type), ...over,
})
let seq = 0
const item = (topic, over = {}) => ({
  _id: `k-${topic}-${seq++}`, schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: 1, updatedAt: 1,
  topic, question: `q ${topic}`, answer: 'a', status: 'approved', source: 'manual', visibility: 'public', ...over,
})
const keys = items => items.map(i => i.key)
const doneKeys = items => items.filter(i => i.done).map(i => i.key)

describe('checklist per business type', () => {
  it.each([
    ['restaurant', ['profile_basics', 'hours', 'request_kinds', 'knowledge_hours', 'knowledge_location', 'knowledge_menu', 'knowledge_policy', 'link_published', 'test_request']],
    ['private_chef', ['profile_basics', 'hours', 'request_kinds', 'knowledge_prices', 'knowledge_events', 'knowledge_dietary', 'knowledge_policy', 'link_published', 'test_request']],
    ['catering', ['profile_basics', 'hours', 'request_kinds', 'knowledge_events', 'knowledge_prices', 'knowledge_policy', 'link_published', 'test_request']],
    ['other', ['profile_basics', 'hours', 'request_kinds', 'knowledge_policy', 'link_published', 'test_request']],
  ])('%s lists the expected keys, only request_kinds done at first', async (type, expected) => {
    await db('frontDeskProfiles').insertOne(profile(type))
    const out = await frontDeskSetup(testDb(), 'b1')
    expect(out.businessType).toBe(type)
    expect(keys(out.items)).toEqual(expected)
    expect(doneKeys(out.items)).toEqual(['request_kinds'])
    expect(out.total).toBe(expected.length)
    expect(out.done).toBe(1)
    expect(keys(out.items).some(k => k.includes('baseline'))).toBe(false)
  })

  it('REQUIRED_TOPICS matches the plan', () => {
    expect(REQUIRED_TOPICS.catering).toEqual(['events', 'prices', 'policy'])
  })

  it('restaurant hours and location come from the profile, not from items', async () => {
    await db('frontDeskProfiles').insertOne(profile('restaurant', { hours: [{ days: 'א-ה', time: '10:00-22:00' }], address: 'רחוב 1' }))
    let out = await frontDeskSetup(testDb(), 'b1')
    expect(doneKeys(out.items)).toEqual(expect.arrayContaining(['hours', 'knowledge_hours', 'knowledge_location']))
    await db('knowledgeItems').insertOne(item('menu'))
    out = await frontDeskSetup(testDb(), 'b1')
    expect(doneKeys(out.items)).toContain('knowledge_menu')
    await db('frontDeskProfiles').updateOne({ _id: 'p1' }, { $unset: { address: '' } })
    await db('knowledgeItems').insertOne(item('location'))
    out = await frontDeskSetup(testDb(), 'b1')
    expect(doneKeys(out.items)).not.toContain('knowledge_location')
  })

  it('a draft item does not count, a deleted approved item does not count', async () => {
    await db('frontDeskProfiles').insertOne(profile('other'))
    await db('knowledgeItems').insertMany([item('policy', { status: 'draft' }), item('policy', { deletedAt: 5 })])
    expect(doneKeys((await frontDeskSetup(testDb(), 'b1')).items)).not.toContain('knowledge_policy')
    await db('knowledgeItems').insertOne(item('policy'))
    expect(doneKeys((await frontDeskSetup(testDb(), 'b1')).items)).toContain('knowledge_policy')
  })

  it('profile_basics, link_published and test_request follow their sources', async () => {
    await db('frontDeskProfiles').insertOne(profile('other', { phone: '0501234567', serviceArea: 'מרכז', status: 'pilot' }))
    await db('requests').insertOne({ _id: 'r1', businessId: 'b1', test: true, status: 'approved' })
    const out = await frontDeskSetup(testDb(), 'b1')
    expect(doneKeys(out.items)).toEqual(expect.arrayContaining(['profile_basics', 'link_published', 'test_request']))
    await db('requests').updateOne({ _id: 'r1' }, { $set: { status: 'qualified' } })
    expect(doneKeys((await frontDeskSetup(testDb(), 'b1')).items)).not.toContain('test_request')
  })

  it('request_kinds is not done when an enabled kind has no question', async () => {
    const p = profile('other')
    p.requestKinds.consultation.questions = []
    await db('frontDeskProfiles').insertOne(p)
    expect(doneKeys((await frontDeskSetup(testDb(), 'b1')).items)).not.toContain('request_kinds')
  })
})

describe('GET /setup-status', () => {
  it('has an empty frontDesk block without a profile and keeps the five counts', async () => {
    const res = await status()
    expect(res.status).toBe(200)
    expect(res.body.frontDesk).toEqual({ businessType: null, items: [], done: 0, total: 0 })
    expect(Object.keys(res.body)).toEqual(expect.arrayContaining(['pricedProducts', 'suppliers', 'recipes', 'events', 'staff']))
  })

  it('carries the checklist when a profile exists', async () => {
    await db('frontDeskProfiles').insertOne(profile('catering'))
    const res = await status()
    expect(res.body.frontDesk.businessType).toBe('catering')
    expect(res.body.frontDesk.total).toBe(8)
  })
})

describe('GET /admin/businesses', () => {
  it('rows carry frontDesk { status, done, total } with a profile and null without', async () => {
    await db('frontDeskProfiles').insertOne(profile('other', { status: 'pilot' }))
    const res = await request(app).get('/api/v1/admin/businesses').set(as(ADMIN))
    expect(res.status).toBe(200)
    const row = id => res.body.rows.find(r => r._id === id)
    expect(row('b1').frontDesk).toEqual({ status: 'pilot', done: 2, total: 6 })
    expect(row('b9').frontDesk).toBeNull()
  })
})
