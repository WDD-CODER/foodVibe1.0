'use strict'
/**
 * Plan 426 — signup requires a business name, and neither the access token nor the signup / login / guest
 * `user` objects carry the legacy `role`. Own file: the signup limiter allows 5 requests per app instance,
 * and auth-business.test.js already uses all 5 of its own.
 */

const request = require('supertest')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')

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

const SALT = 'b'.repeat(32)
const HASH = SALT + ':' + crypto.pbkdf2Sync('pw', Buffer.from(SALT, 'hex'), 100000, 32, 'sha256').toString('hex')
const post = body => request(app).post('/api/v1/auth/signup').send({ name: 'chefone', email: 'c@x.com', password: HASH, ...body })

describe('signup businessName (plan 426)', () => {
  it('missing or blank -> 400 BUSINESS_NAME_REQUIRED, and no user or business is created', async () => {
    const missing = await post({})
    expect(missing.status).toBe(400)
    expect(missing.body).toEqual({ error: 'BUSINESS_NAME_REQUIRED' })
    const blank = await post({ businessName: '   ' })
    expect(blank.status).toBe(400)
    expect(blank.body).toEqual({ error: 'BUSINESS_NAME_REQUIRED' })
    expect(await testDb().collection('users').countDocuments()).toBe(0)
    expect(await testDb().collection('businesses').countDocuments()).toBe(0)
  })

  it('201 characters -> 400 BUSINESS_NAME_TOO_LONG', async () => {
    const res = await post({ businessName: 'x'.repeat(201) })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'BUSINESS_NAME_TOO_LONG' })
  })

  it('exactly 200 characters is accepted', async () => {
    expect((await post({ businessName: 'x'.repeat(200) })).status).toBe(201)
  })

  it('names the business with the trimmed text; tokens and user objects have no role key', async () => {
    const su = await post({ businessName: '  מטבח דנה  ' })
    expect(su.status).toBe(201)
    expect(await testDb().collection('businesses').findOne({ _id: su.body.user.businessId })).toMatchObject({ name: 'מטבח דנה' })

    expect(su.body.user).not.toHaveProperty('role')
    expect(jwt.decode(su.body.token)).not.toHaveProperty('role')

    const login = await request(app).post('/api/v1/auth/login').send({ name: 'chefone', password: 'pw' })
    expect(login.status).toBe(200)
    expect(login.body.user).not.toHaveProperty('role')
    expect(jwt.decode(login.body.token)).not.toHaveProperty('role')

    const guest = await request(app).post('/api/v1/auth/guest')
    expect(guest.status).toBe(200)
    expect(guest.body.user).not.toHaveProperty('role')
    expect(guest.body.user.isPlatformAdmin).toBe(true)
    expect(jwt.decode(guest.body.token)).not.toHaveProperty('role')
  })
})
