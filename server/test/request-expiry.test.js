'use strict'
/** Plan 549 - lazy expiry: stale `new` / `needs_info` requests expire on the next generic GET, per business. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { expireDue } = require('../utils/request-expiry')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'b1', businessRole: 'owner' }
const HOUR = 3_600_000
const KINDS = { table: { enabled: true, questions: [], rules: {}, expireAfterHours: 24 }, event: { enabled: true, questions: [], rules: {}, expireAfterHours: 72 } }

async function seedProfile(businessId) {
  await testDb().collection('frontDeskProfiles').insertOne({
    _id: 'p_' + businessId, schemaVersion: 2, businessId, createdBy: 'o', createdAt: 1, updatedAt: 1, businessType: 'restaurant',
    slug: 'place-' + businessId, displayName: 'מקום', hours: [], requestKinds: KINDS, assistant: { level: 0, tone: 'warm' }, status: 'draft',
  })
}

async function seed(id, businessId, status, ageHours, kind = 'table') {
  const createdAt = Date.now() - ageHours * HOUR
  await testDb().collection('requests').insertOne({
    _id: id, schemaVersion: 2, businessId, createdBy: 'o', createdAt, updatedAt: createdAt, kind, status, channel: 'manual',
    clientId: 'c1', guestName: 'דנה', guestPhone: '0521234567', wanted: {}, answers: [],
    statusHistory: [{ status, at: createdAt, by: 'o', byName: '', via: 'member' }], publicToken: id.padEnd(32, 'x'),
  })
}

beforeEach(async () => {
  for (const c of ['requests', 'frontDeskProfiles']) await testDb().collection(c).deleteMany({})
  await seedProfile('b1')
  await seedProfile('b2')
})

describe('lazy expiry', () => {
  it('a stale new request expires on the next GET; a qualified one of the same age and another business\'s stay', async () => {
    await seed('old_new', 'b1', 'new', 30)
    await seed('old_qualified', 'b1', 'qualified', 30)
    await seed('fresh_new', 'b1', 'new', 2)
    await seed('other_biz', 'b2', 'new', 30)
    const res = await request(app).get('/api/v1/data/requests').set(as(OWNER))
    expect(res.status).toBe(200)
    const byId = Object.fromEntries(res.body.map(d => [d._id, d]))
    expect(byId.old_new.status).toBe('expired')
    expect(byId.old_new.statusHistory.at(-1)).toMatchObject({ status: 'expired', by: 'server', byName: '', via: 'server' })
    expect(byId.old_qualified.status).toBe('qualified')
    expect(byId.fresh_new.status).toBe('new')
    expect((await testDb().collection('requests').findOne({ _id: 'other_biz' })).status).toBe('new')
  })

  it('uses each kind\'s own window, also on a read by id, and expires needs_info', async () => {
    await seed('ev', 'b1', 'new', 30, 'event')
    await seed('tb', 'b1', 'needs_info', 30, 'table')
    expect((await request(app).get('/api/v1/data/requests/ev').set(as(OWNER))).body.status).toBe('new')
    expect((await request(app).get('/api/v1/data/requests/tb').set(as(OWNER))).body.status).toBe('expired')
  })

  it('expireDue returns the count and is 0 for a business without a profile', async () => {
    await seed('a', 'b1', 'new', 30)
    await seed('b', 'b1', 'new', 40)
    expect(await expireDue(testDb(), 'b1', Date.now())).toBe(2)
    expect(await expireDue(testDb(), 'b1', Date.now())).toBe(0)
    await seed('c', 'b3', 'new', 99)
    expect(await expireDue(testDb(), 'b3', Date.now())).toBe(0)
  })
})
