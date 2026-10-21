'use strict'
/** Plan 429 - business settings: defaults on read, owner-only validated write, same-business writes only. */

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
const OWNER = { userId: 'own1', name: 'owner1', businessId: 'b1', businessRole: 'owner' }
const OWNER_Y = { userId: 'own2', name: 'owner2', businessId: 'b2', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'staff1', businessId: 'b1', businessRole: 'staff' }
const DEFAULTS = { profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 }
const VALID = { profitTargetPct: 30, safetyMarginPct: 12.5, overrunThresholdPct: 15 }
const URL = '/api/v1/business'
const put = (body, who = OWNER) => request(app).put(`${URL}/settings`).set(as(who)).send(body)
const stored = id => testDb().collection('businesses').findOne({ _id: id })

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('businesses').insertMany([
    { _id: 'b1', name: 'business 1', ownerId: 'own1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0 },
    { _id: 'b2', name: 'business 2', ownerId: 'own2', createdAt: 2, internal: false, lastSyncedMasterVersion: 0 },
  ])
})

describe('GET /api/v1/business settings', () => {
  it('fills the defaults when nothing is stored, and writes nothing', async () => {
    const res = await request(app).get(URL).set(as(OWNER))
    expect(res.status).toBe(200)
    expect(res.body.settings).toEqual(DEFAULTS)
    expect((await stored('b1')).settings).toBeUndefined()
  })

  it('fills only the missing keys of a partly stored settings object', async () => {
    await testDb().collection('businesses').updateOne({ _id: 'b1' }, { $set: { settings: { profitTargetPct: 40 } } })
    const res = await request(app).get(URL).set(as(STAFF))
    expect(res.body.settings).toEqual({ ...DEFAULTS, profitTargetPct: 40 })
  })
})

describe('PUT /api/v1/business/settings', () => {
  it('owner saves valid numbers and the next GET returns them', async () => {
    const res = await put(VALID)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ settings: VALID })
    const get = await request(app).get(URL).set(as(OWNER))
    expect(get.body.settings).toEqual(VALID)
  })

  it.each([
    ['target 100', { ...VALID, profitTargetPct: 100 }, 'profitTargetPct'],
    ['target -1', { ...VALID, profitTargetPct: -1 }, 'profitTargetPct'],
    ['margin 100', { ...VALID, safetyMarginPct: 100 }, 'safetyMarginPct'],
    ['overrun 0', { ...VALID, overrunThresholdPct: 0 }, 'overrunThresholdPct'],
    ['string value', { ...VALID, profitTargetPct: '30' }, 'profitTargetPct'],
    ['missing key', { profitTargetPct: 30, safetyMarginPct: 10 }, 'overrunThresholdPct'],
  ])('refuses %s with 400 and an issue on the field', async (_label, body, field) => {
    const res = await put(body)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
    expect(res.body.issues.some(i => i.path === field)).toBe(true)
    expect((await stored('b1')).settings).toBeUndefined()
  })

  it('refuses an unknown key', async () => {
    const res = await put({ ...VALID, foo: 1 })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })

  it('staff gets 403 and the stored values stay unchanged', async () => {
    await put(VALID)
    const res = await put({ ...VALID, profitTargetPct: 50 }, STAFF)
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'FORBIDDEN', messageKey: 'no_permission' })
    expect((await stored('b1')).settings).toEqual(VALID)
  })

  it('returns 404 and writes nothing when the business in the token does not exist', async () => {
    const res = await put(VALID, { userId: 'own9', name: 'owner9', businessId: 'gone', businessRole: 'owner' })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Business not found' })
  })

  it('anonymous gets 401', async () => {
    expect((await request(app).put(`${URL}/settings`).send(VALID)).status).toBe(401)
  })

  it('an owner only ever writes their own business', async () => {
    const res = await put({ ...VALID, profitTargetPct: 45 }, OWNER_Y)
    expect(res.status).toBe(200)
    expect((await stored('b2')).settings.profitTargetPct).toBe(45)
    expect((await stored('b1')).settings).toBeUndefined()
  })
})
