'use strict'
/** Plan 430 (C-USAGE) - one usageDays doc per user per Israel day; throttled reads; helpers for Team list and dashboards. */

const request = require('supertest')
const { productBody, recipeBody } = require('./helpers/v2-docs')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { jerusalemDate, isCountedWrite, _resetUsageThrottle } = require('../middleware/usage')
const { lastActiveByUser, activeDays, activeDaysByBusiness, weekBounds } = require('../utils/usage-stats')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  _resetUsageThrottle()
  await testDb().collection('usageDays').deleteMany({})
})

const OWNER = { userId: 'u1', name: 'u1', businessId: 'b1', businessRole: 'owner' }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const today = () => jerusalemDate(Date.now())
const docs = () => testDb().collection('usageDays').find({}).toArray()
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** The recorder runs after the response is sent, so wait until the condition holds (max ~2 s). */
async function until(check) {
  for (let i = 0; i < 40; i++) {
    const value = await check()
    if (value) return value
    await sleep(50)
  }
  return check()
}

describe('recordUsage', () => {
  it('counts two writes in one doc for the user, business from the token', async () => {
    await request(app).post('/api/v1/data/recipes').set(as(OWNER)).send(recipeBody())
    await request(app).post('/api/v1/data/products').set(as(OWNER)).send(productBody())
    const doc = await until(async () => {
      const [d] = await docs()
      return d?.writeCount === 2 ? d : null
    })
    expect(await docs()).toHaveLength(1)
    expect(doc).toMatchObject({ _id: `u1:${today()}`, userId: 'u1', businessId: 'b1', date: today(), writeCount: 2 })
    expect(doc.firstAt).toBeLessThanOrEqual(doc.lastAt)
  })

  it('does not count VERSION_HISTORY writes or failed (400) writes', async () => {
    await request(app).post('/api/v1/data/VERSION_HISTORY').set(as(OWNER)).send({ nonsense: true })
    const bad = await request(app).post('/api/v1/data/recipes').set(as(OWNER)).send({})
    expect(bad.status).toBe(400)
    const doc = await until(async () => (await docs())[0])
    expect(doc.writeCount).toBe(0)
  })

  it('classifies which calls are business writes', () => {
    const req = (method, originalUrl) => ({ method, originalUrl })
    expect(isCountedWrite(req('POST', '/api/v1/data/recipes'))).toBe(true)
    expect(isCountedWrite(req('DELETE', '/api/v1/data/products/p1'))).toBe(true)
    expect(isCountedWrite(req('GET', '/api/v1/data/products'))).toBe(false)
    for (const url of [
      '/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/logout', '/api/v1/ai/parse-price-list',
      '/api/v1/log', '/api/v1/admin/businesses/b1/internal', '/api/v1/data/VERSION_HISTORY', '/api/v1/data/activity_log',
      '/api/v1/data/DICTIONARY_OVERRIDES', '/api/v1/data/DICTIONARY_OVERRIDES/x',
    ]) {
      expect(isCountedWrite(req('POST', url))).toBe(false)
    }
  })

  it('sends one upsert when several reads finish at once', async () => {
    const col = testDb().collection('usageDays')
    const id = `u1:${today()}`
    await col.insertOne({ _id: id, userId: 'u1', businessId: 'b1', date: today(), firstAt: 1000, lastAt: 1000, writeCount: 0 })
    const spy = vi.spyOn(Object.getPrototypeOf(col), 'updateOne')
    try {
      await Promise.all([1, 2, 3, 4, 5].map(() => request(app).get('/api/v1/data/products').set(as(OWNER))))
      await until(async () => (await col.findOne({ _id: id })).lastAt > 1000)
      await sleep(300)
      const usageCalls = spy.mock.calls.filter(c => c[0] && c[0]._id === id)
      expect(usageCalls).toHaveLength(1)
    } finally {
      spy.mockRestore()
    }
  })

  it('throttles reads to one update a minute per user', async () => {
    const col = testDb().collection('usageDays')
    const id = `u1:${today()}`
    await col.insertOne({ _id: id, userId: 'u1', businessId: 'b1', date: today(), firstAt: 1000, lastAt: 1000, writeCount: 0 })
    await request(app).get('/api/v1/data/products').set(as(OWNER))
    const first = await until(async () => {
      const d = await col.findOne({ _id: id })
      return d.lastAt > 1000 ? d : null
    })
    expect(first.lastAt).toBeGreaterThan(1000)
    expect(first.writeCount).toBe(0)

    await col.updateOne({ _id: id }, { $set: { lastAt: 1000 } })
    await request(app).get('/api/v1/data/products').set(as(OWNER))
    await sleep(300)
    expect((await col.findOne({ _id: id })).lastAt).toBe(1000)

    _resetUsageThrottle()
    await request(app).get('/api/v1/data/products').set(as(OWNER))
    const again = await until(async () => {
      const d = await col.findOne({ _id: id })
      return d.lastAt > 1000 ? d : null
    })
    expect(again.lastAt).toBeGreaterThan(1000)
    expect(again.writeCount).toBe(0)
  })

  it('records nothing for anonymous requests', async () => {
    const res = await request(app).get('/api/v1/data/products')
    expect(res.status).toBe(200)
    await sleep(300)
    expect(await docs()).toHaveLength(0)
  })

  it('records nothing for a token with no user or no business', async () => {
    await request(app).get('/api/v1/data/products').set(as({ userId: undefined, businessId: undefined, name: 'x' }))
    const noBusiness = await request(app).get('/api/v1/data/products').set(as({ userId: 'u9', businessId: undefined }))
    expect(noBusiness.status).toBe(401)
    await sleep(300)
    expect(await docs()).toHaveLength(0)
  })

  it('never counts refresh or logout as writes', async () => {
    await request(app).post('/api/v1/auth/refresh').set(as(OWNER))
    await request(app).post('/api/v1/auth/logout').set(as(OWNER))
    await sleep(300)
    for (const d of await docs()) expect(d.writeCount).toBe(0)
  })

  it('still answers 200 when the usageDays write throws', async () => {
    const db = testDb()
    const original = db.collection.bind(db)
    const spy = vi.spyOn(db, 'collection').mockImplementation(name => {
      if (name === 'usageDays') throw new Error('boom')
      return original(name)
    })
    try {
      const res = await request(app).get('/api/v1/data/products').set(as(OWNER))
      expect(res.status).toBe(200)
      await sleep(200)
    } finally {
      spy.mockRestore()
    }
    expect(await docs()).toHaveLength(0)
  })
})

describe('jerusalemDate', () => {
  it('rolls over at Israel midnight', () => {
    expect(jerusalemDate(Date.UTC(2026, 9, 20, 21, 30))).toBe('2026-10-21')
    expect(jerusalemDate(Date.UTC(2026, 9, 20, 20, 59))).toBe('2026-10-20')
  })
})

describe('usage-stats', () => {
  const day = (userId, businessId, date, lastAt) => ({
    _id: `${userId}:${date}`, userId, businessId, date, firstAt: lastAt - 10, lastAt, writeCount: 1,
  })

  it('counts active days once per business, even when owner and staff both worked', async () => {
    await testDb().collection('usageDays').insertMany([
      day('u1', 'b1', '2026-10-18', 100),
      day('u1', 'b1', '2026-10-20', 200),
      day('u2', 'b1', '2026-10-20', 300),
      day('u1', 'b1', '2026-10-25', 400),
      day('u3', 'b2', '2026-10-19', 500),
    ])
    const db = testDb()
    expect(await activeDays(db, { businessId: 'b1', from: '2026-10-18', to: '2026-10-24' })).toBe(2)
    const all = await activeDaysByBusiness(db, { from: '2026-10-18', to: '2026-10-24' })
    expect(all).toEqual(new Map([['b1', 2], ['b2', 1]]))
  })

  it('returns the latest lastAt per user of one business', async () => {
    await testDb().collection('usageDays').insertMany([
      day('u1', 'b1', '2026-10-18', 100),
      day('u1', 'b1', '2026-10-20', 200),
      day('u2', 'b1', '2026-10-19', 300),
      day('u3', 'b2', '2026-10-19', 900),
    ])
    expect(await lastActiveByUser(testDb(), 'b1')).toEqual(new Map([['u1', 200], ['u2', 300]]))
  })

  it('finds the Sunday-Saturday week of a date', () => {
    expect(weekBounds('2026-10-20')).toEqual({ from: '2026-10-18', to: '2026-10-24' })
    expect(weekBounds('2026-10-18')).toEqual({ from: '2026-10-18', to: '2026-10-24' })
    expect(weekBounds('2026-10-24')).toEqual({ from: '2026-10-18', to: '2026-10-24' })
    expect(weekBounds(Date.UTC(2026, 9, 20, 21, 30))).toEqual({ from: '2026-10-18', to: '2026-10-24' })
    expect(weekBounds(Date.UTC(2026, 9, 24, 22, 30))).toEqual({ from: '2026-10-25', to: '2026-10-31' })
  })
})
