'use strict'
/**
 * Plan 631 (C-ACCESS, ADR 0032): a session acting in another business. The business-route table (consultant allowed /
 * denied), the re-check on every request (ACCESS_ENDED, forged tokens, 503 on a failed read), no usage for an acting
 * request, the write-limit key and the log route, zero checks for a home token, the consultant's Trash routes, and the
 * one access-token sign in the server.
 */

const fs = require('fs')
const path = require('path')
const request = require('supertest')
const mongoose = require('mongoose')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { recipeBody } = require('./helpers/v2-docs')

let app
let access
let usage

beforeAll(async () => {
  app = await buildTestApp()
  access = require('../services/access')
  usage = require('../middleware/usage')
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const A = 'b_ownerA'
const C = 'b_consult'
const db = c => testDb().collection(c)
const BASELINE = { inquiriesPerMonth: 7, filledAt: 5 }

beforeEach(async () => {
  usage._resetUsageThrottle()
  for (const c of ['businesses', 'businessAccess', 'users', 'usageDays', 'frontDeskProfiles', 'knowledgeItems', 'recipes', 'app_logs']) await db(c).deleteMany({})
  await db('businesses').insertMany([
    { _id: A, name: 'מטבח א', ownerId: 'ownerA', createdAt: 1, internal: false, lastSyncedMasterVersion: 0, baseline: BASELINE },
    { _id: C, name: 'משרד', ownerId: 'consult', createdAt: 2, internal: false, lastSyncedMasterVersion: 0 },
  ])
  await db('users').insertMany([
    { _id: 'ownerA', name: 'ownera', email: 'o@x.com', businessId: A, businessRole: 'owner', removedAt: null },
    { _id: 'consult', name: 'consult', email: 'c@x.com', businessId: C, businessRole: 'owner', removedAt: null },
    { _id: 'boss', name: 'boss', email: 'b@x.com', businessId: 'b_boss', businessRole: 'owner', isPlatformAdmin: true, removedAt: null },
  ])
  await db('businessAccess').insertOne({ _id: 'g1', userId: 'consult', businessId: A, role: 'consultant', grantedBy: 'boss', grantedByName: 'boss', grantedAt: 1 })
})

const CONSULTANT = { userId: 'consult', name: 'consult', businessId: A, businessRole: 'consultant', homeBusinessId: C, acting: 'consultant' }
const PLATFORM = { userId: 'boss', name: 'boss', businessId: A, businessRole: 'owner', homeBusinessId: 'b_boss', acting: 'platform', isPlatformAdmin: true }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** The recorder runs after the response is sent, so wait until the condition holds (max ~2 s). Same as usage-days.test.js. */
async function until(check) {
  for (let i = 0; i < 40; i++) {
    const value = await check()
    if (value) return value
    await sleep(50)
  }
  return check()
}

const intakeBody = (over = {}) => ({
  businessType: 'catering',
  profile: { displayName: 'קייטרינג', slug: 'acting-catering' },
  knowledge: [{ topic: 'prices', question: 'כמה זה עולה?', answer: '100 לאורח', visibility: 'public' }],
  ...over,
})

/** Every route of server/routes/business.js with the body that would pass its validation. */
const DENIED = [
  ['put', '/api/v1/business/settings', {}],
  ['put', '/api/v1/business/name', { name: 'שם חדש' }],
  ['put', '/api/v1/business/staff-visible-stages', { stages: [] }],
  ['put', '/api/v1/business/logistics-hidden', { keys: [] }],
  ['put', '/api/v1/business/baseline', { inquiriesPerMonth: 1 }],
  ['get', '/api/v1/business/setup-status'],
  ['get', '/api/v1/business/team'],
  ['post', '/api/v1/business/team', { name: 'newcook', password: 'x' }],
  ['delete', '/api/v1/business/team/ownerA'],
]

const call = (method, url, body, user) => {
  const req = request(app)[method](url).set(as(user))
  return body === undefined ? req : req.send(body)
}

describe('the business-route table, consultant side', () => {
  it('GET /business answers the active (client) business', async () => {
    const res = await request(app).get('/api/v1/business').set(as(CONSULTANT))
    expect(res.status).toBe(200)
    expect(res.body._id).toBe(A)
  })

  it.each(DENIED)('%s %s is denied 403 and the business is unchanged', async (method, url, body) => {
    const before = await db('businesses').findOne({ _id: A })
    const users = await db('users').countDocuments({})
    const res = await call(method, url, body, CONSULTANT)
    expect(res.status).toBe(403)
    expect(await db('businesses').findOne({ _id: A })).toEqual(before)
    expect(await db('users').countDocuments({})).toBe(users)
  })

  it('POST /front-desk-intake is allowed but the baseline is skipped for a consultant', async () => {
    const res = await request(app).post('/api/v1/business/front-desk-intake').set(as(CONSULTANT)).send(intakeBody({ baseline: { inquiriesPerMonth: 20 } }))
    expect(res.status).toBe(200)
    expect(res.body.baseline).toBe('skipped')
    expect((await db('businesses').findOne({ _id: A })).baseline).toEqual(BASELINE)
    expect(await db('frontDeskProfiles').findOne({ businessId: A })).toMatchObject({ createdBy: 'consult' })
  })

  it('the platform admin acting in the business has the owner\'s rights on every row', async () => {
    for (const [method, url] of [['get', '/api/v1/business/team'], ['get', '/api/v1/business/setup-status'], ['get', '/api/v1/business']]) {
      expect((await call(method, url, undefined, PLATFORM)).status).toBe(200)
    }
    const res = await request(app).post('/api/v1/business/front-desk-intake').set(as(PLATFORM)).send(intakeBody({ baseline: { inquiriesPerMonth: 20 } }))
    expect(res.status).toBe(200)
    expect(res.body.baseline).toBe('saved')
  })
})

describe('the acting re-check', () => {
  it('a removed grant answers 401 ACCESS_ENDED on the very next request', async () => {
    expect((await request(app).get('/api/v1/data/recipes').set(as(CONSULTANT))).status).toBe(200)
    await db('businessAccess').updateOne({ _id: 'g1' }, { $set: { revokedAt: Date.now(), revokedBy: 'ownerA' } })
    const res = await request(app).get('/api/v1/data/recipes').set(as(CONSULTANT))
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'ACCESS_ENDED' })
  })

  it('a forged acting token without a grant answers 401 and reads nothing', async () => {
    const forged = { ...CONSULTANT, businessId: 'b_other' }
    const res = await request(app).get('/api/v1/data/recipes').set(as(forged))
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'ACCESS_ENDED' })
    const notAdmin = { ...PLATFORM, userId: 'consult' }
    expect((await request(app).get('/api/v1/data/recipes').set(as(notAdmin))).status).toBe(401)
    const unknown = { ...CONSULTANT, acting: 'friend' }
    expect((await request(app).get('/api/v1/data/recipes').set(as(unknown))).status).toBe(401)
  })

  it('a platform admin who lost the flag or was removed is stopped', async () => {
    expect((await request(app).get('/api/v1/data/recipes').set(as(PLATFORM))).status).toBe(200)
    await db('users').updateOne({ _id: 'boss' }, { $set: { removedAt: Date.now() } })
    expect((await request(app).get('/api/v1/data/recipes').set(as(PLATFORM))).body).toEqual({ error: 'ACCESS_ENDED' })
    await db('users').updateOne({ _id: 'boss' }, { $set: { removedAt: null, isPlatformAdmin: false } })
    expect((await request(app).get('/api/v1/data/recipes').set(as(PLATFORM))).body).toEqual({ error: 'ACCESS_ENDED' })
  })

  it('a database error during the check answers 503 and never reaches the route', async () => {
    const real = mongoose.connection.db.collection.bind(mongoose.connection.db)
    const spy = vi.spyOn(mongoose.connection.db, 'collection').mockImplementation((name, ...rest) => {
      if (name === 'businessAccess') return { findOne: () => Promise.reject(new Error('boom')) }
      return real(name, ...rest)
    })
    try {
      const res = await request(app).post('/api/v1/data/recipes').set(as(CONSULTANT)).send(recipeBody())
      expect(res.status).toBe(503)
      expect(res.body).toEqual({ error: 'DB_UNAVAILABLE' })
    } finally {
      spy.mockRestore()
    }
    expect(await db('recipes').countDocuments({})).toBe(0)
  })

  it('a home token runs zero acting checks; an acting token runs one per request', async () => {
    access._resetActingChecksForTests()
    const home = { userId: 'ownerA', name: 'ownera', businessId: A, businessRole: 'owner', homeBusinessId: A }
    expect((await request(app).get('/api/v1/data/recipes').set(as(home))).status).toBe(200)
    expect((await request(app).get('/api/v1/business').set(as(home))).status).toBe(200)
    expect(access._actingChecksForTests()).toBe(0)
    await request(app).get('/api/v1/data/recipes').set(as(CONSULTANT))
    expect(access._actingChecksForTests()).toBe(1)
  })
})

describe('what an acting session leaves behind', () => {
  it('an acting request writes no usageDays document', async () => {
    const created = await request(app).post('/api/v1/data/recipes').set(as(CONSULTANT)).send(recipeBody())
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ businessId: A, createdBy: 'consult' })
    // A home request after it: once its row lands, the acting one would have landed too.
    const home = { userId: 'ownerA', name: 'ownera', businessId: A, businessRole: 'owner' }
    await request(app).post('/api/v1/data/recipes').set(as(home)).send(recipeBody())
    expect(await until(async () => (await db('usageDays').find({}).toArray()).length === 1)).toBe(true)
    await sleep(100)
    const rows = await db('usageDays').find({}).toArray()
    expect(rows.map(r => r.userId)).toEqual(['ownerA'])
  })

  it('the write-limit key of an acting token is the real user', () => {
    const { writeLimitKey } = require('../middleware/write-limit')
    const req = { headers: { authorization: `Bearer ${signTestToken(CONSULTANT)}` }, ip: '127.0.0.1' }
    expect(writeLimitKey(req)).toBe('user:consult')
  })

  it('POST /api/v1/log with an acting token whose grant was removed answers 202 with the real userId', async () => {
    await db('businessAccess').updateOne({ _id: 'g1' }, { $set: { revokedAt: Date.now(), revokedBy: 'ownerA' } })
    const res = await request(app).post('/api/v1/log').set(as(CONSULTANT)).set('Content-Type', 'application/json')
      .send({ level: 'error', event: 'test.acting.failed', message: 'x', timestamp: '2026-11-18T10:00:00.000Z' })
    expect(res.status).toBe(202)
    const doc = await until(() => db('app_logs').findOne({ event: 'test.acting.failed' }))
    expect(doc).toMatchObject({ userId: 'consult' })
    expect(doc).not.toHaveProperty('businessId')
  })

  it('the consultant\'s Trash routes answer like the owner\'s', async () => {
    const restore = await request(app).put('/api/v1/data/recipes/trash/restore-all').set(as(CONSULTANT))
    expect(restore.status).toBe(200)
    const empty = await request(app).delete('/api/v1/data/recipes/trash').set(as(CONSULTANT))
    expect(empty.status).toBe(200)
  })
})

describe('one access-token sign', () => {
  it('server/routes and server/services sign with ACCESS_SECRET exactly once', () => {
    const root = path.join(__dirname, '..')
    let count = 0
    for (const dir of ['routes', 'services']) {
      for (const file of fs.readdirSync(path.join(root, dir), { recursive: true })) {
        if (!String(file).endsWith('.js')) continue
        const text = fs.readFileSync(path.join(root, dir, String(file)), 'utf8')
        count += (text.match(/jwt\.sign\([^;]*ACCESS_SECRET/g) || []).length
      }
    }
    expect(count).toBe(1)
  })
})
