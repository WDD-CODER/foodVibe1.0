'use strict'
/** Plan 428 - owner adds, lists and removes staff; removed staff cannot log in or refresh; items they made stay. */

const crypto = require('crypto')
const request = require('supertest')
const { productBody: baseProduct } = require('./helpers/v2-docs')
const jwt = require('jsonwebtoken')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const SALT = 'b'.repeat(32)
const HASH = SALT + ':' + crypto.pbkdf2Sync('pw', Buffer.from(SALT, 'hex'), 100000, 32, 'sha256').toString('hex')
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'owner1', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'staff1', businessId: 'b1', businessRole: 'staff' }
const FORBIDDEN = { error: 'FORBIDDEN', messageKey: 'no_permission' }
const TEAM = '/api/v1/business/team'

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('businesses').insertMany([
    { _id: 'b1', name: 'business 1', ownerId: 'own1', createdAt: 1, internal: false, lastSyncedMasterVersion: 4 },
    { _id: 'b2', name: 'business 2', ownerId: 'own2', createdAt: 2, internal: false, lastSyncedMasterVersion: 0 },
  ])
  await db.collection('users').insertMany([
    { _id: 'own1', name: 'owner1', email: 'o1@x.com', businessId: 'b1', businessRole: 'owner', isPlatformAdmin: false, createdAt: 10, passwordHash: HASH },
    { _id: 'own2', name: 'owner2', email: 'o2@x.com', businessId: 'b2', businessRole: 'owner', isPlatformAdmin: false, createdAt: 11, passwordHash: HASH },
    { _id: 'other-staff', name: 'otherstaff', email: 'os@x.com', businessId: 'b2', businessRole: 'staff', isPlatformAdmin: false, createdAt: 12, passwordHash: HASH },
  ])
})

const add = (name, password = HASH, who = OWNER) => request(app).post(TEAM).set(as(who)).send({ name, password })

describe('POST /team', () => {
  it('creates a staff user in the owner business, with no cloned data', async () => {
    const res = await add('cook1')
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'cook1', businessRole: 'staff', lastActiveAt: null })
    expect(typeof res.body.createdAt).toBe('number')
    const user = await testDb().collection('users').findOne({ name: 'cook1' })
    expect(user).toMatchObject({ businessId: 'b1', businessRole: 'staff', isPlatformAdmin: false, lastSyncedMasterVersion: 4 })
    expect(typeof user.createdAt).toBe('number')
    expect(user.email.endsWith('@staff.foodvibe.invalid')).toBe(true)
    for (const c of ['products', 'recipes']) expect(await testDb().collection(c).countDocuments({})).toBe(0)
  })

  it('the new staff member logs in with the owner businessId and the staff role', async () => {
    await add('cook1')
    const login = await request(app).post('/api/v1/auth/login').send({ name: 'cook1', password: 'pw' })
    expect(login.status).toBe(200)
    expect(jwt.decode(login.body.token)).toMatchObject({ businessId: 'b1', businessRole: 'staff', isPlatformAdmin: false })
  })

  it('refuses a taken username, a bad username and a non-PBKDF2 password', async () => {
    expect((await add('cook1')).status).toBe(201)
    const taken = await add('cook1')
    expect(taken.status).toBe(409)
    expect(taken.body).toEqual({ error: 'USERNAME_TAKEN' })
    const bad = await add('a b')
    expect(bad.status).toBe(400)
    expect(bad.body).toEqual({ error: 'INVALID_USERNAME' })
    const pw = await add('cook2', 'plain-text')
    expect(pw.status).toBe(400)
    expect(pw.body).toEqual({ error: 'INVALID_PASSWORD_FORMAT' })
  })

  it('is limited to 10 owner requests per window', async () => {
    const statuses = []
    for (let i = 0; i < 11; i++) statuses.push((await add('x', 'bad', { ...OWNER, userId: 'limited-owner' })).status)
    expect(statuses.slice(0, 10).every(s => s === 400)).toBe(true)
    expect(statuses[10]).toBe(429)
  })
})

describe('staff are refused', () => {
  it('on GET, POST and DELETE', async () => {
    for (const res of [
      await request(app).get(TEAM).set(as(STAFF)),
      await request(app).post(TEAM).set(as(STAFF)).send({ name: 'cook9', password: HASH }),
      await request(app).delete(`${TEAM}/own1`).set(as(STAFF)),
    ]) {
      expect(res.status).toBe(403)
      expect(res.body).toEqual(FORBIDDEN)
    }
    expect(await testDb().collection('users').countDocuments({})).toBe(3)
  })

  it('anonymous -> 401', async () => {
    expect((await request(app).get(TEAM)).status).toBe(401)
  })
})

describe('DELETE /team/:userId', () => {
  it('the owner cannot remove self', async () => {
    const res = await request(app).delete(`${TEAM}/own1`).set(as(OWNER))
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'CANNOT_REMOVE_SELF' })
  })

  it('cannot remove a user of another business (404)', async () => {
    const res = await request(app).delete(`${TEAM}/other-staff`).set(as(OWNER))
    expect(res.status).toBe(404)
    expect((await testDb().collection('users').findOne({ _id: 'other-staff' })).removedAt ?? null).toBe(null)
  })

  it('blocks login and refresh of the removed member, and keeps what he created', async () => {
    const agent = request.agent(app)
    const created = await add('cook1')
    const staffId = created.body._id
    const login = await agent.post('/api/v1/auth/login').send({ name: 'cook1', password: 'pw' })
    expect(login.status).toBe(200)
    await testDb().collection('recipes').insertOne({ _id: 'r-cook', businessId: 'b1', userId: staffId, createdBy: staffId, nameHebrew: 'recipe' })

    const removed = await request(app).delete(`${TEAM}/${staffId}`).set(as(OWNER))
    expect(removed.status).toBe(200)

    const again = await request(app).post('/api/v1/auth/login').send({ name: 'cook1', password: 'pw' })
    expect(again.status).toBe(403)
    expect(again.body).toEqual({ error: 'USER_REMOVED' })
    const refresh = await agent.post('/api/v1/auth/refresh')
    expect(refresh.status).toBe(401)
    expect(refresh.body).toEqual({ error: 'USER_REMOVED' })

    expect(await testDb().collection('users').findOne({ _id: staffId })).toMatchObject({ removedAt: expect.any(Number) })
    const recipe = await request(app).get('/api/v1/data/recipes/r-cook').set(as(OWNER))
    expect(recipe.status).toBe(200)
    expect((await request(app).delete(`${TEAM}/${staffId}`).set(as(OWNER))).status).toBe(200)
  })
})

describe('GET /team', () => {
  it('lists the owner and active staff only, with the contract row shape', async () => {
    const a = await add('cook1')
    const b = await add('cook2')
    await request(app).delete(`${TEAM}/${b.body._id}`).set(as(OWNER))
    const res = await request(app).get(TEAM).set(as(OWNER))
    expect(res.status).toBe(200)
    expect(res.body.map(r => r.name)).toEqual(['owner1', 'cook1'])
    expect(res.body[0]).toEqual({ _id: 'own1', name: 'owner1', businessRole: 'owner', createdAt: 10, lastActiveAt: null })
    expect(res.body[1]).toEqual({ _id: a.body._id, name: 'cook1', businessRole: 'staff', createdAt: expect.any(Number), lastActiveAt: null })
  })
})

describe('staff save their own product again (zero prices)', () => {
  const productBody = (overrides = {}) => baseProduct({
    purchaseOptions: [{ unitSymbol: 'box', conversionRate: 6, priceOverride: 0 }],
    sources: [{ supplierId: 's1', price: 0 }],
    ...overrides,
  })
  const DATA = '/api/v1/data/products'

  it('PUT with the same zero prices -> 200; a real price -> 403', async () => {
    const created = await request(app).post(DATA).set(as(STAFF)).send(productBody())
    expect(created.status).toBe(201)
    const same = await request(app).put(`${DATA}/${created.body._id}`).set(as(STAFF)).send(productBody({ nameHebrew: 'עגבניות' }))
    expect(same.status).toBe(200)
    const priced = await request(app).put(`${DATA}/${created.body._id}`).set(as(STAFF))
      .send(productBody({ purchaseOptions: [{ unitSymbol: 'box', conversionRate: 6, priceOverride: 5 }] }))
    expect(priced.status).toBe(403)
    expect(priced.body).toEqual(FORBIDDEN)
  })
})
