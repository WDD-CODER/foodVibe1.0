'use strict'
/** Plan 472 - PUT /api/v1/business/name: owner-only, trimmed 1-200 characters, writes only the caller's own business. */

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
const STAFF = { userId: 'st1', name: 'staff1', businessId: 'b1', businessRole: 'staff' }
const put = (body, who = OWNER) => request(app).put('/api/v1/business/name').set(as(who)).send(body)
const stored = id => testDb().collection('businesses').findOne({ _id: id })

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('businesses').insertMany([
    { _id: 'b1', name: 'business 1', ownerId: 'own1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0 },
    { _id: 'b2', name: 'business 2', ownerId: 'own2', createdAt: 2, internal: false, lastSyncedMasterVersion: 0 },
  ])
})

describe('PUT /api/v1/business/name', () => {
  it('owner renames: the trimmed name is returned and stored, another business is untouched', async () => {
    const res = await put({ name: '  מטבח דנה ' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ name: 'מטבח דנה' })
    expect((await stored('b1')).name).toBe('מטבח דנה')
    expect((await stored('b2')).name).toBe('business 2')
  })

  it('accepts exactly 200 characters', async () => {
    expect((await put({ name: 'x'.repeat(200) })).status).toBe(200)
  })

  it.each([
    ['empty', { name: '' }],
    ['spaces only', { name: '   ' }],
    ['201 characters', { name: 'x'.repeat(201) }],
    ['missing', {}],
    ['not a string', { name: 5 }],
    ['extra key', { name: 'ok', ownerId: 'own2' }],
  ])('refuses %s with 400 and keeps the name', async (_label, body) => {
    const res = await put(body)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
    expect((await stored('b1')).name).toBe('business 1')
  })

  it('staff get 403 and the name is unchanged', async () => {
    const res = await put({ name: 'staff name' }, STAFF)
    expect(res.status).toBe(403)
    expect((await stored('b1')).name).toBe('business 1')
  })

  it('needs a signed-in user', async () => {
    const res = await request(app).put('/api/v1/business/name').send({ name: 'x' })
    expect(res.status).toBe(401)
  })
})
