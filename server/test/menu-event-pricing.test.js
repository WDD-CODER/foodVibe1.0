'use strict'
/** Plan 445 - the money fields and the pricing cache of a menu event through the generic write routes. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { menuEventBody, stored } = require('./helpers/v2-docs')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  await testDb().collection('menuEvents').deleteMany({})
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', businessId: 'b1', businessRole: 'staff' }
const FORBIDDEN = { error: 'FORBIDDEN', messageKey: 'no_permission' }
const URL = '/api/v1/data/menuEvents'
const pricing = { foodCost: 4000, revenue: 10000, profit: 5000, profitPct: 50, partial: false, computedAt: 1700000000000 }

async function seed(_id, createdBy, body = {}) {
  await testDb().collection('menuEvents').insertOne(
    stored(menuEventBody(body), { _id, userId: createdBy, businessId: 'b1', createdBy, _masterId: _id, _userModified: false })
  )
}
const raw = _id => testDb().collection('menuEvents').findOne({ _id })

describe('menuEvents money fields (schema)', () => {
  it('rejects an event target of 100', async () => {
    const res = await request(app).post(URL).set(as(OWNER)).send(menuEventBody({ targetsOverride: { profitTargetPct: 100 } }))
    expect(res.status).toBe(400)
  })

  it('rejects a safety margin of 100', async () => {
    const res = await request(app).post(URL).set(as(OWNER)).send(menuEventBody({ targetsOverride: { safetyMarginPct: 100 } }))
    expect(res.status).toBe(400)
  })

  it('rejects a negative extra cost', async () => {
    const res = await request(app).post(URL).set(as(OWNER)).send(menuEventBody({ extraCosts: { amount: -1 } }))
    expect(res.status).toBe(400)
  })

  it('rejects a negative price per guest', async () => {
    const res = await request(app).post(URL).set(as(OWNER)).send(menuEventBody({ pricePerGuest: -5 }))
    expect(res.status).toBe(400)
  })

  it('stores valid money fields and a pricing object as sent', async () => {
    const body = menuEventBody({
      pricePerGuest: 200,
      extraCosts: { amount: 1000, note: 'הובלה' },
      targetsOverride: { profitTargetPct: 15, safetyMarginPct: 5 },
      pricing
    })
    const res = await request(app).post(URL).set(as(OWNER)).send(body)
    expect(res.status).toBe(201)
    const doc = await raw(res.body._id)
    expect(doc.pricePerGuest).toBe(200)
    expect(doc.extraCosts).toEqual({ amount: 1000, note: 'הובלה' })
    expect(doc.targetsOverride).toEqual({ profitTargetPct: 15, safetyMarginPct: 5 })
    expect(doc.pricing).toEqual(pricing)
  })
})

describe('menuEvents money fields (staff)', () => {
  it('staff cannot change the price per guest of an event he created', async () => {
    await seed('e-st', 'st1', { pricePerGuest: 100 })
    const res = await request(app).put(`${URL}/e-st`).set(as(STAFF)).send({ pricePerGuest: 150 })
    expect(res.status).toBe(403)
    expect(res.body).toEqual(FORBIDDEN)
    expect((await raw('e-st')).pricePerGuest).toBe(100)
  })

  it('staff saving only the pricing cache of his own event is allowed (derived, not a money field)', async () => {
    await seed('e-st', 'st1', { pricePerGuest: 100 })
    const res = await request(app).put(`${URL}/e-st`).set(as(STAFF)).send({ pricing })
    expect(res.status).toBe(200)
    const doc = await raw('e-st')
    expect(doc.pricing).toEqual(pricing)
    expect(doc.pricePerGuest).toBe(100)
  })
})
