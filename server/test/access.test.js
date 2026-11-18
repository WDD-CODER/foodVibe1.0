'use strict'
/**
 * Plan 631 (C-ACCESS, ADR 0032): resolveSession, the switch, refresh with an active business, the grant routes and
 * the list of businesses a user may enter. Real app on the in-memory database.
 */

const crypto = require('crypto')
const request = require('supertest')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { currentTermsVersion } = require('../utils/terms-version')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')

let app
let access

beforeAll(async () => {
  app = await buildTestApp()
  access = require('../services/access')
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  adminId = `admin${++adminSeq}`
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
})

const SALT = 'a'.repeat(32)
const HASH = SALT + ':' + crypto.pbkdf2Sync('pw', Buffer.from(SALT, 'hex'), 100000, 32, 'sha256').toString('hex')
const decode = token => jwt.decode(token)
const bearer = token => ({ Authorization: `Bearer ${token}` })
// The grant limiter (30 per 15 minutes) is keyed by user: each test gets its own platform admin id.
let adminSeq = 0
let adminId = 'admin0'
const ADMIN_TOKEN = () => signTestToken({ userId: adminId, name: 'admin', role: 'admin' })
const users = () => testDb().collection('users')

/** Signs a user up through the real route (same helper as auth-business.test.js); returns { token, user, agent }. */
async function signup(name, businessName = `העסק של ${name}`) {
  const agent = request.agent(app)
  const res = await agent.post('/api/v1/auth/signup')
    .send({ name, email: `${name}@x.com`, password: HASH, businessName, termsVersion: currentTermsVersion() })
  expect(res.status).toBe(201)
  return { token: res.body.token, user: res.body.user, agent }
}

async function grant(businessId, username) {
  return request(app).post('/api/v1/access/grants').set(bearer(ADMIN_TOKEN())).send({ businessId, username })
}

const switchTo = (token, businessId) =>
  request(app).post('/api/v1/auth/switch-business').set(bearer(token)).send({ businessId })

/** An owner (business A) and a consultant (home C) with a live grant into A. */
async function consultantSetup() {
  const owner = await signup('ownera', 'מטבח א')
  const consultant = await signup('consult', 'משרד יועץ')
  const g = await grant(owner.user.businessId, 'consult')
  expect(g.status).toBe(201)
  return { owner, consultant, A: owner.user.businessId, C: consultant.user.businessId, grantId: g.body._id }
}

describe('resolveSession', () => {
  it('home: no active business, or active = home, answers the home fields with no database read', async () => {
    const spy = vi.spyOn(mongoose.connection.db, 'collection')
    try {
      const user = { _id: 'u1', businessId: 'b1', businessRole: 'staff' }
      expect(await access.resolveSession(user)).toEqual({ businessId: 'b1', businessRole: 'staff' })
      expect(await access.resolveSession({ ...user, activeBusinessId: 'b1' })).toEqual({ businessId: 'b1', businessRole: 'staff' })
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it('a live grant → consultant in that business', async () => {
    const { A, C } = await consultantSetup()
    const user = await users().findOne({ name: 'consult' })
    const session = await access.resolveSession({ ...user, activeBusinessId: A })
    expect(session).toEqual({ businessId: A, businessRole: 'consultant', acting: 'consultant' })
    expect(session.businessId).not.toBe(C)
  })

  it('a platform admin → owner of any business, acting platform', async () => {
    const { A } = await consultantSetup()
    const admin = { _id: 'admin1', businessId: 'b_admin1', businessRole: 'owner', isPlatformAdmin: true, activeBusinessId: A }
    expect(await access.resolveSession(admin)).toEqual({ businessId: A, businessRole: 'owner', acting: 'platform' })
  })

  it('a stale active business (gone, or no grant) falls back to home and clears the stored value', async () => {
    const { A } = await consultantSetup()
    const other = await signup('stranger')
    await users().updateOne({ name: 'stranger' }, { $set: { activeBusinessId: A } })
    const stored = await users().findOne({ name: 'stranger' })
    expect(await access.resolveSession(stored)).toEqual({ businessId: other.user.businessId, businessRole: 'owner' })
    expect((await users().findOne({ name: 'stranger' })).activeBusinessId).toBeNull()

    await users().updateOne({ name: 'consult' }, { $set: { activeBusinessId: 'no_such_business' } })
    const consult = await users().findOne({ name: 'consult' })
    expect((await access.resolveSession(consult)).businessId).toBe(consult.businessId)
    expect((await users().findOne({ name: 'consult' })).activeBusinessId).toBeNull()
  })
})

describe('POST /api/v1/auth/switch-business', () => {
  it('with a live grant: token in the client business as consultant; refresh keeps it; null goes home', async () => {
    const { consultant, A, C } = await consultantSetup()
    const res = await switchTo(consultant.token, A)
    expect(res.status).toBe(200)
    expect(decode(res.body.token)).toMatchObject({ businessId: A, businessRole: 'consultant', homeBusinessId: C, acting: 'consultant', isPlatformAdmin: false })
    expect(res.body.user).toMatchObject({ businessId: A, businessRole: 'consultant', homeBusinessId: C, acting: 'consultant' })
    expect(Array.isArray(res.body.user.homeModules)).toBe(true)
    expect((await users().findOne({ name: 'consult' })).activeBusinessId).toBe(A)

    const refreshed = await consultant.agent.post('/api/v1/auth/refresh')
    expect(refreshed.status).toBe(200)
    expect(decode(refreshed.body.token)).toMatchObject({ businessId: A, businessRole: 'consultant', acting: 'consultant', homeBusinessId: C })

    const home = await switchTo(res.body.token, null)
    expect(home.status).toBe(200)
    expect(decode(home.body.token)).toMatchObject({ businessId: C, businessRole: 'owner', homeBusinessId: C })
    expect(decode(home.body.token)).not.toHaveProperty('acting')
    expect(home.body.user).not.toHaveProperty('homeModules')
    expect((await users().findOne({ name: 'consult' })).activeBusinessId).toBeNull()
  })

  it('the home id is the same as null', async () => {
    const { consultant, A, C } = await consultantSetup()
    const away = await switchTo(consultant.token, A)
    const home = await switchTo(away.body.token, C)
    expect(home.status).toBe(200)
    expect(decode(home.body.token)).toMatchObject({ businessId: C, businessRole: 'owner' })
  })

  it('without a grant: 403 NO_ACCESS and users.activeBusinessId unchanged', async () => {
    const { owner, consultant, C } = await consultantSetup()
    const res = await switchTo(owner.token, C)
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'NO_ACCESS' })
    expect((await users().findOne({ name: 'ownera' })).activeBusinessId ?? null).toBeNull()
    expect(consultant.token).toBeTruthy()
  })

  it('unknown business and __master__: 403 NO_ACCESS, even for the platform admin', async () => {
    const { consultant } = await consultantSetup()
    await users().insertOne({ _id: adminId, name: 'admin', email: 'a@x.com', businessId: 'b_admin1', businessRole: 'owner', isPlatformAdmin: true })
    for (const token of [consultant.token, ADMIN_TOKEN()]) {
      for (const id of ['no_such_business', '__master__']) {
        const res = await switchTo(token, id)
        expect(res.status).toBe(403)
        expect(res.body).toEqual({ error: 'NO_ACCESS' })
      }
    }
  })

  it('platform admin: owner in any business, acting platform', async () => {
    const { A } = await consultantSetup()
    const boss = await signup('boss')
    await users().updateOne({ name: 'boss' }, { $set: { isPlatformAdmin: true } })
    const login = await request(app).post('/api/v1/auth/login').send({ name: 'boss', password: 'pw' })
    const res = await switchTo(login.body.token, A)
    expect(res.status).toBe(200)
    expect(decode(res.body.token)).toMatchObject({ businessId: A, businessRole: 'owner', acting: 'platform', homeBusinessId: boss.user.businessId, isPlatformAdmin: true })
  })

  it('a bad body answers 400 INVALID_BODY', async () => {
    const { consultant } = await consultantSetup()
    for (const businessId of [undefined, 5, '', 'x'.repeat(65), {}]) {
      const res = await request(app).post('/api/v1/auth/switch-business').set(bearer(consultant.token)).send({ businessId })
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: 'INVALID_BODY' })
    }
  })
})

describe('refresh after the grant is removed', () => {
  it('lands at home and clears the active business', async () => {
    const { consultant, A, C, grantId } = await consultantSetup()
    await switchTo(consultant.token, A)
    const removed = await request(app).delete(`/api/v1/access/grants/${grantId}`).set(bearer(ADMIN_TOKEN()))
    expect(removed.status).toBe(200)
    const refreshed = await consultant.agent.post('/api/v1/auth/refresh')
    expect(refreshed.status).toBe(200)
    expect(decode(refreshed.body.token)).toMatchObject({ businessId: C, businessRole: 'owner', homeBusinessId: C })
    expect(decode(refreshed.body.token)).not.toHaveProperty('acting')
    expect((await users().findOne({ name: 'consult' })).activeBusinessId).toBeNull()
  })

  it('login lands in the business that was active last', async () => {
    const { consultant, A } = await consultantSetup()
    await switchTo(consultant.token, A)
    const login = await request(app).post('/api/v1/auth/login').send({ name: 'consult', password: 'pw' })
    expect(decode(login.body.token)).toMatchObject({ businessId: A, acting: 'consultant' })
  })
})

describe('the grant routes', () => {
  it('POST /grants: 201 with ids; the stored row is live and stamped with the admin', async () => {
    const owner = await signup('ownera')
    const consultant = await signup('consult')
    const res = await grant(owner.user.businessId, 'consult')
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ userId: consultant.user._id, name: 'consult', businessId: owner.user.businessId })
    const row = await testDb().collection('businessAccess').findOne({ _id: res.body._id })
    expect(row).toMatchObject({ userId: consultant.user._id, businessId: owner.user.businessId, role: 'consultant', grantedBy: adminId, grantedByName: 'admin' })
    expect(row).not.toHaveProperty('revokedAt')
  })

  it('POST /grants refuses: not admin 403, bad body 400, business 404, user 404, member 409, twice 409', async () => {
    const owner = await signup('ownera')
    await signup('consult')
    await signup('gone')
    await users().updateOne({ name: 'gone' }, { $set: { removedAt: Date.now() } })
    const A = owner.user.businessId

    const notAdmin = await request(app).post('/api/v1/access/grants').set(bearer(owner.token)).send({ businessId: A, username: 'consult' })
    expect(notAdmin.status).toBe(403)
    for (const body of [{}, { businessId: A }, { businessId: '', username: 'consult' }, { businessId: A, username: 7 }]) {
      const res = await request(app).post('/api/v1/access/grants').set(bearer(ADMIN_TOKEN())).send(body)
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: 'INVALID_BODY' })
    }
    for (const id of ['no_such', '__master__']) expect((await grant(id, 'consult')).body).toEqual({ error: 'BUSINESS_NOT_FOUND' })
    for (const name of ['nobody', 'gone']) {
      const res = await grant(A, name)
      expect(res.status).toBe(404)
      expect(res.body).toEqual({ error: 'USER_NOT_FOUND' })
    }
    const member = await grant(A, 'ownera')
    expect(member.status).toBe(409)
    expect(member.body).toEqual({ error: 'ALREADY_MEMBER' })
    expect((await grant(A, 'consult')).status).toBe(201)
    const twice = await grant(A, 'consult')
    expect(twice.status).toBe(409)
    expect(twice.body).toEqual({ error: 'ALREADY_GRANTED' })
  })

  it('a removed grant can be given again', async () => {
    const { A, grantId } = await consultantSetup()
    expect((await request(app).delete(`/api/v1/access/grants/${grantId}`).set(bearer(ADMIN_TOKEN()))).status).toBe(200)
    expect((await grant(A, 'consult')).status).toBe(201)
    expect(await testDb().collection('businessAccess').countDocuments({ businessId: A })).toBe(2)
  })

  it('GET /grants: the owner sees who has access, newest first; staff and consultants are refused', async () => {
    const { owner, consultant, A } = await consultantSetup()
    await signup('second')
    expect((await grant(A, 'second')).status).toBe(201)
    const list = await request(app).get('/api/v1/access/grants').set(bearer(owner.token))
    expect(list.status).toBe(200)
    expect(list.body.map(r => r.name)).toEqual(['second', 'consult'])
    expect(Object.keys(list.body[0]).sort()).toEqual(['_id', 'grantedAt', 'name'])

    const staff = signTestToken({ userId: 'st1', businessId: A, businessRole: 'staff' })
    expect((await request(app).get('/api/v1/access/grants').set(bearer(staff))).status).toBe(403)
    const acting = await switchTo(consultant.token, A)
    expect((await request(app).get('/api/v1/access/grants').set(bearer(acting.body.token))).status).toBe(403)
  })

  it('DELETE /grants/:id: the owner of that business removes it; another owner gets 404, staff 403', async () => {
    const { owner, A, grantId } = await consultantSetup()
    const otherOwner = await signup('otherown')
    expect((await request(app).delete(`/api/v1/access/grants/${grantId}`).set(bearer(otherOwner.token))).status).toBe(404)
    const staff = signTestToken({ userId: 'st1', businessId: A, businessRole: 'staff' })
    expect((await request(app).delete(`/api/v1/access/grants/${grantId}`).set(bearer(staff))).status).toBe(403)
    const res = await request(app).delete(`/api/v1/access/grants/${grantId}`).set(bearer(owner.token))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    const row = await testDb().collection('businessAccess').findOne({ _id: grantId })
    expect(typeof row.revokedAt).toBe('number')
    expect(row.revokedBy).toBe(owner.user._id)
    expect((await request(app).delete(`/api/v1/access/grants/${grantId}`).set(bearer(owner.token))).status).toBe(404)
  })
})

describe('GET /api/v1/access/businesses', () => {
  it('home first with the stored role, then each live grant by name; a grant to a deleted business is left out', async () => {
    const owner = await signup('ownera', 'ב מטבח')
    const second = await signup('ownerb', 'א מטבח')
    const gone = await signup('ownerc', 'ג מטבח')
    const consultant = await signup('consult', 'משרד')
    for (const b of [owner, second, gone]) expect((await grant(b.user.businessId, 'consult')).status).toBe(201)
    await testDb().collection('businesses').deleteOne({ _id: gone.user.businessId })

    const res = await request(app).get('/api/v1/access/businesses').set(bearer(consultant.token))
    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      { businessId: consultant.user.businessId, name: 'משרד', role: 'owner' },
      { businessId: second.user.businessId, name: 'א מטבח', role: 'consultant' },
      { businessId: owner.user.businessId, name: 'ב מטבח', role: 'consultant' },
    ])

    const acting = await switchTo(consultant.token, owner.user.businessId)
    const whileActing = await request(app).get('/api/v1/access/businesses').set(bearer(acting.body.token))
    expect(whileActing.body[0]).toEqual({ businessId: consultant.user.businessId, name: 'משרד', role: 'owner' })
  })
})
