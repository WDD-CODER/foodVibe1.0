'use strict'
/**
 * Plan 584 — sign-up requires the current terms version, POST /accept-terms records acceptance, and the
 * terms text cannot change without a new version + sectionsHash. Own file: the signup limiter allows 5 requests per app instance.
 */

const request = require('supertest')
const crypto = require('crypto')
const fs = require('fs')
const { currentTermsVersion, TERMS_FILE } = require('../utils/terms-version')
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

const SALT = 'c'.repeat(32)
const HASH = SALT + ':' + crypto.pbkdf2Sync('pw', Buffer.from(SALT, 'hex'), 100000, 32, 'sha256').toString('hex')
const signup = body => request(app).post('/api/v1/auth/signup').send({ name: 'chefone', email: 'c@x.com', password: HASH, ...body })

describe('signup terms (plan 584)', () => {
  it('without termsVersion -> 400 TERMS_NOT_ACCEPTED and nothing is written', async () => {
    const res = await signup({})
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'TERMS_NOT_ACCEPTED' })
    expect(await testDb().collection('users').countDocuments()).toBe(0)
  })

  it('with a wrong version -> 400 TERMS_NOT_ACCEPTED', async () => {
    const res = await signup({ termsVersion: 'old' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'TERMS_NOT_ACCEPTED' })
  })

  it('with the current version -> 201 and the user holds version, time and address', async () => {
    const res = await signup({ termsVersion: currentTermsVersion() })
    expect(res.status).toBe(201)
    expect(res.body.user.termsAcceptedVersion).toBe(currentTermsVersion())
    expect(res.body.user).not.toHaveProperty('termsAcceptedAt')
    expect(res.body.user).not.toHaveProperty('termsAcceptedIp')
    const doc = await testDb().collection('users').findOne({ name: 'chefone' })
    expect(doc.termsAcceptedVersion).toBe(currentTermsVersion())
    expect(Date.now() - doc.termsAcceptedAt).toBeLessThan(60000)
    expect(doc.termsAcceptedAt).toBeLessThanOrEqual(Date.now())
    expect(typeof doc.termsAcceptedIp).toBe('string')
    expect(doc.termsAcceptedIp.length).toBeGreaterThan(0)
  })
})

describe('POST /accept-terms (plan 584)', () => {
  const accept = (body, token) => {
    const r = request(app).post('/api/v1/auth/accept-terms')
    if (token) r.set('Authorization', `Bearer ${token}`)
    return r.send(body)
  }

  async function seedUser() {
    await testDb().collection('users').insertOne({ _id: 'u1', name: 'old', email: 'o@x.com', businessId: 'b_u1', businessRole: 'owner' })
    return signTestToken({ userId: 'u1', name: 'old' })
  }

  it('valid token + current version -> sets the three fields and returns the public user', async () => {
    const token = await seedUser()
    const res = await accept({ termsVersion: currentTermsVersion() }, token)
    expect(res.status).toBe(200)
    expect(res.body.user.termsAcceptedVersion).toBe(currentTermsVersion())
    expect(res.body.user).not.toHaveProperty('termsAcceptedIp')
    const doc = await testDb().collection('users').findOne({ _id: 'u1' })
    expect(doc.termsAcceptedVersion).toBe(currentTermsVersion())
    expect(Date.now() - doc.termsAcceptedAt).toBeLessThan(60000)
    expect(typeof doc.termsAcceptedIp).toBe('string')
  })

  it('without a token -> 401', async () => {
    expect((await accept({ termsVersion: currentTermsVersion() })).status).toBe(401)
  })

  it('with an old version -> 400 TERMS_NOT_ACCEPTED and the user is unchanged', async () => {
    const token = await seedUser()
    const res = await accept({ termsVersion: 'old' }, token)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'TERMS_NOT_ACCEPTED' })
    expect((await testDb().collection('users').findOne({ _id: 'u1' })).termsAcceptedVersion ?? null).toBeNull()
  })
})

describe('terms file version guard (plan 584)', () => {
  it('sectionsHash equals the SHA-256 of JSON.stringify(sections): a text change needs a new version + sectionsHash', () => {
    const terms = JSON.parse(fs.readFileSync(TERMS_FILE, 'utf8'))
    const hash = crypto.createHash('sha256').update(JSON.stringify(terms.sections)).digest('hex')
    expect(terms.sectionsHash).toBe(hash)
    expect(terms.version).toBeTruthy()
  })
})
