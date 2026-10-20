'use strict'
/** Plan 425 — the admin user tools understand businesses. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const ADMIN = { userId: 'boss', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('users').insertMany([
    { _id: 'boss', name: 'boss', email: 'boss@x.com', role: 'admin', isPlatformAdmin: true, businessId: 'bBoss', businessRole: 'owner' },
    { _id: 'ownerA', name: 'ownerA', email: 'a@x.com', role: 'user', businessId: 'bA', businessRole: 'owner' },
    { _id: 'staffA', name: 'staffA', email: 'sa@x.com', role: 'user', businessId: 'bA', businessRole: 'staff' },
    { _id: 'ownerB', name: 'ownerB', email: 'b@x.com', role: 'user', businessId: 'bB', businessRole: 'owner' },
  ])
  await db.collection('businesses').insertMany([
    { _id: 'bBoss', name: 'העסק של boss', ownerId: 'boss', createdAt: 1, internal: false },
    { _id: 'bA', name: 'העסק של ownerA', ownerId: 'ownerA', createdAt: 1, internal: false },
    { _id: 'bB', name: 'העסק של ownerB', ownerId: 'ownerB', createdAt: 1, internal: false },
  ])
  for (const type of ALL_USER_ENTITY_TYPES) {
    // kind + key keep the taxonomy unique index (kind, key, businessId) happy for the raw fixtures.
    const doc = (suffix, userId, businessId) => ({ _id: `${type}-${suffix}`, kind: 'k', key: suffix, userId, businessId, createdBy: userId })
    await db.collection(type).insertMany([
      doc('A-owner', 'ownerA', 'bA'),
      doc('A-staff', 'staffA', 'bA'),
      doc('B', 'ownerB', 'bB'),
      doc('boss', 'boss', 'bBoss'),
    ])
  }
})

const count = async (businessId) => {
  let n = 0
  for (const type of ALL_USER_ENTITY_TYPES) n += await testDb().collection(type).countDocuments({ businessId })
  return n
}

describe('GET /api/v1/admin/users', () => {
  it('rows carry businessId, businessName, businessRole and isPlatformAdmin', async () => {
    const res = await request(app).get('/api/v1/admin/users').set(as(ADMIN))
    expect(res.status).toBe(200)
    const row = id => res.body.find(u => u._id === id)
    expect(row('ownerA')).toMatchObject({ businessId: 'bA', businessName: 'העסק של ownerA', businessRole: 'owner', isPlatformAdmin: false })
    expect(row('staffA')).toMatchObject({ businessId: 'bA', businessName: 'העסק של ownerA', businessRole: 'staff', isPlatformAdmin: false })
    expect(row('boss')).toMatchObject({ isPlatformAdmin: true })
  })

  it('403 for a non platform admin', async () => {
    const res = await request(app).get('/api/v1/admin/users').set(as({ userId: 'ownerA', businessId: 'bA' }))
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/v1/admin/users/:userId', () => {
  it('deleting an owner removes the business, all its users and every doc with its businessId, and nothing else', async () => {
    const res = await request(app).delete('/api/v1/admin/users/ownerA').set(as(ADMIN))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, deletedBusiness: true, usersDeleted: 2 })
    const db = testDb()
    const ids = async c => (await db.collection(c).find({}).project({ _id: 1 }).toArray()).map(d => d._id).sort()
    expect(await ids('users')).toEqual(['boss', 'ownerB'])
    expect(await ids('businesses')).toEqual(['bB', 'bBoss'])
    expect(await count('bA')).toBe(0)
    expect(await count('bB')).toBe(ALL_USER_ENTITY_TYPES.length)
    expect(await count('bBoss')).toBe(ALL_USER_ENTITY_TYPES.length)
  })

  it('deleting a staff user removes only that user; their items and the business stay', async () => {
    const res = await request(app).delete('/api/v1/admin/users/staffA').set(as(ADMIN))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, deletedBusiness: false, usersDeleted: 1 })
    const db = testDb()
    expect(await db.collection('users').findOne({ _id: 'staffA' })).toBeNull()
    expect(await db.collection('users').findOne({ _id: 'ownerA' })).not.toBeNull()
    expect(await db.collection('businesses').findOne({ _id: 'bA' })).not.toBeNull()
    expect(await count('bA')).toBe(ALL_USER_ENTITY_TYPES.length * 2)
  })

  it('a user of the caller\'s own business -> 403 and nothing is deleted', async () => {
    await testDb().collection('users').insertOne({ _id: 'bossStaff', name: 'bs', email: 'bs@x.com', businessId: 'bBoss', businessRole: 'staff' })
    const res = await request(app).delete('/api/v1/admin/users/bossStaff').set(as(ADMIN))
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Cannot delete your own business' })
    expect(await testDb().collection('users').findOne({ _id: 'bossStaff' })).not.toBeNull()
    expect(await count('bBoss')).toBe(ALL_USER_ENTITY_TYPES.length)
    const self = await request(app).delete('/api/v1/admin/users/boss').set(as(ADMIN))
    expect(self.status).toBe(403)
  })

  it('403 for a non platform admin, 404 for an unknown user', async () => {
    expect((await request(app).delete('/api/v1/admin/users/ownerB').set(as({ userId: 'ownerA', businessId: 'bA' }))).status).toBe(403)
    expect((await request(app).delete('/api/v1/admin/users/nobody').set(as(ADMIN))).status).toBe(404)
    expect(await count('bB')).toBe(ALL_USER_ENTITY_TYPES.length)
  })
})
