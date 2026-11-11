'use strict'
/** Plan 532 - the platform admin's cross-business read of own logistics items, and the fold on promote. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const ADMIN = { userId: 'boss', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const OWNER = { userId: 'ownerA', businessId: 'bA', businessRole: 'owner' }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const URL = '/api/v1/admin/taxonomy'
const EXPECTED_KEYS = ['id', 'businessId', 'businessName', 'key', 'phase', 'section', 'answerType', 'environments', 'hint', 'createdAt'].sort()

const term = (businessId, key, extra = {}) => ({
  _id: `logisticsItem:${businessId}:${key}`, schemaVersion: 2, userId: `u_${businessId}`, businessId, createdBy: `u_${businessId}`,
  createdAt: 10, updatedAt: 10, sortOrder: 0, kind: 'logisticsItem', key, phase: 'site_visit', section: 'space', answerType: 'status', ...extra,
})

beforeEach(async () => {
  const db = testDb()
  for (const c of ['taxonomyTerms', 'businesses']) await db.collection(c).deleteMany({})
  await db.collection('businesses').insertMany([
    { _id: 'bA', name: 'Biz A' },
    { _id: 'bB', name: 'Biz B' },
    { _id: 'bBoss', name: 'Boss biz' },
  ])
  await db.collection('taxonomyTerms').insertMany([
    term('__master__', 'shared item'),
    term('bA', 'own item', { hint: 'h', environments: ['indoor'] }),
    term('bB', 'own item', { createdAt: 20 }),
    term('bA', 'deleted item', { deletedAt: 5 }),
    term('bA', 'unit thing', { kind: 'unit', _id: 'unit:bA:x' }),
  ])
})

describe('GET /api/v1/admin/taxonomy', () => {
  it('the admin gets only the own live rows of the kind, with business names', async () => {
    const res = await request(app).get(`${URL}?kind=logisticsItem`).set(as(ADMIN))
    expect(res.status).toBe(200)
    expect(res.body.rows).toHaveLength(2)
    expect(res.body.rows.map(r => r.businessName)).toEqual(['Biz A', 'Biz B'])
    expect(res.body.rows.every(r => r.key === 'own item')).toBe(true)
    for (const r of res.body.rows) expect(Object.keys(r).sort()).toEqual(EXPECTED_KEYS)
  })

  it('an owner gets 403, no token 401, an unsupported kind 400', async () => {
    expect((await request(app).get(`${URL}?kind=logisticsItem`).set(as(OWNER))).status).toBe(403)
    expect((await request(app).get(`${URL}?kind=logisticsItem`)).status).toBe(401)
    const bad = await request(app).get(`${URL}?kind=unit`).set(as(ADMIN))
    expect(bad.status).toBe(400)
    expect(bad.body).toEqual({ error: 'Unsupported kind' })
  })

  it('a shared POST folds both businesses\' own rows away', async () => {
    const post = await request(app).post('/api/v1/data/taxonomyTerms').set(as(ADMIN))
      .send({ kind: 'logisticsItem', key: 'own item', sortOrder: 1, phase: 'site_visit', section: 'space', answerType: 'status', shared: true })
    expect(post.status, JSON.stringify(post.body)).toBe(201)
    const res = await request(app).get(`${URL}?kind=logisticsItem`).set(as(ADMIN))
    expect(res.body.rows).toEqual([])
    const kept = await testDb().collection('taxonomyTerms').find({ kind: 'logisticsItem', key: 'own item', businessId: { $ne: '__master__' } }).toArray()
    expect(kept).toHaveLength(2)
    expect(kept.every(t => t.foldedAt > 0 && typeof t.createdAt === 'number')).toBe(true)
  })
})
