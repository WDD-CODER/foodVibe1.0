'use strict'
/** Plans 424/425 — signup creates the business; every access token carries the business fields; no session without a business. */

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
const FIELDS = ['userId', 'name', 'businessId', 'businessRole', 'isPlatformAdmin']

async function signup(name = 'chefone', businessName = `העסק של ${name}`) {
  return request(app).post('/api/v1/auth/signup').send({ name, email: `${name}@x.com`, password: HASH, businessName })
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
    expect(payload).toMatchObject({ name: 'chefone', businessRole: 'owner', isPlatformAdmin: false })
    expect(payload.businessId).toBe(res.body.user.businessId)
  })
})

describe('login, refresh and guest', () => {
  it('login and refresh tokens carry the business fields', async () => {
    const agent = request.agent(app)
    const su = await agent.post('/api/v1/auth/signup').send({ name: 'chefone', email: 'c@x.com', password: HASH, businessName: 'מטבח' })
    expect(su.status).toBe(201)
    const login = await request(app).post('/api/v1/auth/login').send({ name: 'chefone', password: 'pw' })
    expect(login.status).toBe(200)
    expect(decode(login.body.token)).toMatchObject({ businessId: su.body.user.businessId, businessRole: 'owner', isPlatformAdmin: false })
    const refresh = await agent.post('/api/v1/auth/refresh')
    expect(refresh.status).toBe(200)
    expect(decode(refresh.body.token)).toMatchObject({ businessId: su.body.user.businessId, businessRole: 'owner', isPlatformAdmin: false })
  })

  it('plan 425: isPlatformAdmin in the token comes from the flag only — a legacy role admin is not one', async () => {
    const db = testDb()
    await signup('boss')
    await db.collection('users').updateOne({ name: 'boss' }, { $set: { role: 'admin' } })
    const asRole = await request(app).post('/api/v1/auth/login').send({ name: 'boss', password: 'pw' })
    expect(decode(asRole.body.token)).toMatchObject({ isPlatformAdmin: false })
    await db.collection('users').updateOne({ name: 'boss' }, { $set: { isPlatformAdmin: true } })
    const asFlag = await request(app).post('/api/v1/auth/login').send({ name: 'boss', password: 'pw' })
    expect(decode(asFlag.body.token)).toMatchObject({ isPlatformAdmin: true })
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
  it('403 for a non-admin and for a legacy role admin, next() only for isPlatformAdmin; requireAdmin is gone', () => {
    const auth = require('../middleware/auth')
    expect(auth.requireAdmin).toBeUndefined()
    const run = user => {
      const out = { status: null, nexted: false }
      const res = { status: s => ({ json: () => { out.status = s } }) }
      auth.requirePlatformAdmin({ user }, res, () => { out.nexted = true })
      return out
    }
    expect(run({ userId: 'u', role: 'user', isPlatformAdmin: false })).toEqual({ status: 403, nexted: false })
    expect(run({ userId: 'u', role: 'admin' })).toEqual({ status: 403, nexted: false })
    expect(run({ userId: 'u', role: 'user', isPlatformAdmin: true }).nexted).toBe(true)
  })

  it('a non-admin token gets 403 on an admin route', async () => {
    const token = signTestToken({ userId: 'u', role: 'user', businessId: 'b', isPlatformAdmin: false })
    const res = await request(app).put('/api/v1/data/products/x/push-to-master').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('a role: admin user without isPlatformAdmin gets 403 on GET /api/v1/admin/users', async () => {
    const token = signTestToken({ userId: 'old', role: 'admin', isPlatformAdmin: false })
    const res = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
    const ok = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${signTestToken({ userId: 'boss', isPlatformAdmin: true })}`)
    expect(ok.status).toBe(200)
  })
})

describe('no session without a business (plan 425)', () => {
  const setCookieNames = res => (res.headers['set-cookie'] || []).map(c => c.split('=')[0])

  it('a data route refuses a token without businessId (401), a token with one works', async () => {
    const noBusiness = require('jsonwebtoken').sign({ userId: 'u1', name: 'u1' }, 'test-access-secret')
    const res = await request(app).get('/api/v1/data/products').set('Authorization', `Bearer ${noBusiness}`)
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid or expired token' })
    const ok = await request(app).get('/api/v1/data/products').set('Authorization', `Bearer ${signTestToken({ userId: 'u1' })}`)
    expect(ok.status).toBe(200)
  })

  it('login of a user with no businessId -> 403 NO_BUSINESS, no token, no cookie', async () => {
    await testDb().collection('users').insertOne({ _id: 'nb', name: 'nobiz', email: 'nb@x.com', passwordHash: HASH })
    const res = await request(app).post('/api/v1/auth/login').send({ name: 'nobiz', password: 'pw' })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'NO_BUSINESS' })
    expect(setCookieNames(res)).toEqual([])
  })

  it('login of a removed user -> 403 USER_REMOVED, no token, no cookie', async () => {
    await signup('gone')
    await testDb().collection('users').updateOne({ name: 'gone' }, { $set: { removedAt: Date.now() } })
    const res = await request(app).post('/api/v1/auth/login').send({ name: 'gone', password: 'pw' })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'USER_REMOVED' })
    expect(res.body.token).toBeUndefined()
    expect(setCookieNames(res)).toEqual([])
  })

  it('wrong password still answers 401 before any business check', async () => {
    await testDb().collection('users').insertOne({ _id: 'nb', name: 'nobiz', email: 'nb@x.com', passwordHash: HASH })
    const res = await request(app).post('/api/v1/auth/login').send({ name: 'nobiz', password: 'bad' })
    expect(res.status).toBe(401)
  })

  it.each([
    ['NO_BUSINESS', {}],
    ['USER_REMOVED', { businessId: 'b1', businessRole: 'staff', removedAt: 5 }],
  ])('refresh for %s -> 401 with that error and the refresh cookie cleared', async (error, fields) => {
    await testDb().collection('users').insertOne({ _id: 'u9', name: 'u9', email: 'u9@x.com', ...fields })
    const cookie = require('jsonwebtoken').sign({ userId: 'u9' }, 'test-refresh-secret')
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', [`fv_refresh_${process.env.PORT || 3000}=${cookie}`])
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error })
    const cleared = (res.headers['set-cookie'] || []).find(c => c.startsWith('fv_refresh'))
    expect(cleared).toMatch(/=;|Expires=Thu, 01 Jan 1970/)
  })
})
