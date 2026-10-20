'use strict'
/** Plan 424 — signup creates the business; every access token carries the business fields. */

const request = require('supertest')
const jwt = require('jsonwebtoken')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
})

const crypto = require('crypto')
const SALT = 'a'.repeat(32)
// Same shape the client stores: saltHex:PBKDF2(plain). Login sends the plain password.
const HASH = SALT + ':' + crypto.pbkdf2Sync('pw', Buffer.from(SALT, 'hex'), 100000, 32, 'sha256').toString('hex')
const decode = token => jwt.decode(token)
const FIELDS = ['userId', 'name', 'role', 'businessId', 'businessRole', 'isPlatformAdmin']

async function signup(name = 'chefone') {
  return request(app).post('/api/v1/auth/signup').send({ name, email: `${name}@x.com`, password: HASH })
}

describe('signup', () => {
  it('creates one business, makes the user its owner and stamps every cloned item', async () => {
    const db = testDb()
    await db.collection('venues').insertOne({ _id: 'm1', userId: '__master__', businessId: '__master__', createdBy: '__master__', nameHebrew: 'x' })
    const res = await signup()
    expect(res.status).toBe(201)

    const businesses = await db.collection('businesses').find({}).toArray()
    expect(businesses).toHaveLength(1)
    const user = await db.collection('users').findOne({ name: 'chefone' })
    expect(businesses[0]).toMatchObject({ name: 'העסק של chefone', ownerId: user._id, internal: false })
    expect(user).toMatchObject({ businessId: businesses[0]._id, businessRole: 'owner', isPlatformAdmin: false })
    expect(typeof user.createdAt).toBe('number')

    const clone = await db.collection('venues').findOne({ userId: user._id })
    expect(clone).toMatchObject({ businessId: businesses[0]._id, createdBy: user._id })
    expect(res.body.user).toMatchObject({ businessId: businesses[0]._id, businessRole: 'owner', isPlatformAdmin: false })
  })

  it('the token decodes to the contract fields', async () => {
    const res = await signup()
    const payload = decode(res.body.token)
    for (const f of FIELDS) expect(payload).toHaveProperty(f)
    expect(payload).toMatchObject({ name: 'chefone', role: 'user', businessRole: 'owner', isPlatformAdmin: false })
    expect(payload.businessId).toBe(res.body.user.businessId)
  })
})

describe('login, refresh and guest', () => {
  it('login and refresh tokens carry the business fields', async () => {
    const agent = request.agent(app)
    const su = await agent.post('/api/v1/auth/signup').send({ name: 'chefone', email: 'c@x.com', password: HASH })
    expect(su.status).toBe(201)
    const login = await request(app).post('/api/v1/auth/login').send({ name: 'chefone', password: 'pw' })
    expect(login.status).toBe(200)
    expect(decode(login.body.token)).toMatchObject({ businessId: su.body.user.businessId, businessRole: 'owner', isPlatformAdmin: false })
    const refresh = await agent.post('/api/v1/auth/refresh')
    expect(refresh.status).toBe(200)
    expect(decode(refresh.body.token)).toMatchObject({ businessId: su.body.user.businessId, businessRole: 'owner', isPlatformAdmin: false })
  })

  it('a role admin user gets isPlatformAdmin true in the token', async () => {
    const db = testDb()
    await signup('boss')
    await db.collection('users').updateOne({ name: 'boss' }, { $set: { role: 'admin' } })
    const login = await request(app).post('/api/v1/auth/login').send({ name: 'boss', password: 'pw' })
    expect(decode(login.body.token)).toMatchObject({ role: 'admin', isPlatformAdmin: true })
  })

  it('guest ensures a business and is a platform admin', async () => {
    const res = await request(app).post('/api/v1/auth/guest')
    expect(res.status).toBe(200)
    const payload = decode(res.body.token)
    expect(payload).toMatchObject({ userId: 'dev-guest', isPlatformAdmin: true, businessRole: 'owner' })
    expect(payload.businessId).toBeTruthy()
    expect(await testDb().collection('businesses').findOne({ _id: payload.businessId })).toMatchObject({ ownerId: 'dev-guest' })
    const again = await request(app).post('/api/v1/auth/guest')
    expect(decode(again.body.token).businessId).toBe(payload.businessId)
    expect(await testDb().collection('businesses').countDocuments({ ownerId: 'dev-guest' })).toBe(1)
  })
})

describe('requirePlatformAdmin', () => {
  it('403 for a non-admin, next() for a platform admin, requireAdmin is the same function', () => {
    const { requirePlatformAdmin, requireAdmin } = require('../middleware/auth')
    expect(requireAdmin).toBe(requirePlatformAdmin)
    const run = user => {
      const out = { status: null, nexted: false }
      const res = { status: s => ({ json: () => { out.status = s } }) }
      requirePlatformAdmin({ user }, res, () => { out.nexted = true })
      return out
    }
    expect(run({ userId: 'u', role: 'user', isPlatformAdmin: false })).toEqual({ status: 403, nexted: false })
    expect(run({ userId: 'u', role: 'user', isPlatformAdmin: true }).nexted).toBe(true)
    expect(run({ userId: 'u', role: 'admin' }).nexted).toBe(true)
  })

  it('a non-admin token gets 403 on an admin route', async () => {
    const token = signTestToken({ userId: 'u', role: 'user', businessId: 'b', isPlatformAdmin: false })
    const res = await request(app).put('/api/v1/data/products/x/push-to-master').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })
})
