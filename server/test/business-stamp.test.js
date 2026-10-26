'use strict'
/** Plan 424 — every create path stamps businessId + createdBy; clients can never set or change them. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { productBody } = require('./helpers/v2-docs')

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

const USER = { userId: 'userA', name: 'a', role: 'user', businessId: 'bizA', businessRole: 'owner', isPlatformAdmin: false }
const ADMIN = { userId: 'adm', name: 'adm', role: 'admin', businessId: 'bizAdm', businessRole: 'owner', isPlatformAdmin: true }
const auth = u => ({ Authorization: `Bearer ${signTestToken(u)}` })

describe('POST /:type', () => {
  it('stamps businessId + createdBy from the token and ignores client-sent values', async () => {
    const res = await request(app).post('/api/v1/data/products').set(auth(USER))
      .send({ ...productBody(), businessId: 'evil', createdBy: 'evil', userId: 'evil' })
    expect(res.status).toBe(201)
    const doc = await testDb().collection('products').findOne({ _id: res.body._id })
    expect(doc).toMatchObject({ userId: 'userA', businessId: 'bizA', createdBy: 'userA' })
  })

  it('an admin shared term gets businessId __master__', async () => {
    const res = await request(app).post('/api/v1/data/taxonomyTerms').set(auth(ADMIN))
      .send({ kind: 'allergen', key: 'lupin', sortOrder: 0, shared: true })
    expect(res.status).toBe(201)
    const doc = await testDb().collection('taxonomyTerms').findOne({ _id: res.body._id })
    expect(doc).toMatchObject({ userId: '__master__', businessId: '__master__', createdBy: 'adm' })
  })
})

describe('PUT /:type/:id', () => {
  it('never changes the stored businessId / createdBy, even when the body sends them', async () => {
    const created = await request(app).post('/api/v1/data/products').set(auth(USER)).send(productBody())
    const put = await request(app).put(`/api/v1/data/products/${created.body._id}`).set(auth(USER))
      .send({ ...productBody({ nameHebrew: 'חדש' }), businessId: 'evil', createdBy: 'evil' })
    expect(put.status).toBe(200)
    const doc = await testDb().collection('products').findOne({ _id: created.body._id })
    expect(doc).toMatchObject({ nameHebrew: 'חדש', businessId: 'bizA', createdBy: 'userA' })
  })
})

describe('PUT /:type (replace-all)', () => {
  it('stamps every VERSION_HISTORY doc', async () => {
    const res = await request(app).put('/api/v1/data/VERSION_HISTORY').set(auth(USER)).set('X-Confirm-Replace', 'true')
      .send([{ _id: 'h1', businessId: 'evil' }, { _id: 'h2' }])
    expect(res.status).toBe(200)
    const docs = await testDb().collection('VERSION_HISTORY').find({}).toArray()
    expect(docs).toHaveLength(2)
    for (const d of docs) expect(d).toMatchObject({ userId: 'userA', businessId: 'bizA', createdBy: 'userA' })
  })
})

describe('push-to-master', () => {
  it('gives the first master copy businessId __master__ and never writes the pusher business onto master', async () => {
    const created = await request(app).post('/api/v1/data/products').set(auth(ADMIN)).send(productBody())
    const push = await request(app).put(`/api/v1/data/products/${created.body._id}/push-to-master`).set(auth(ADMIN))
    expect(push.status).toBe(200)
    const master = await testDb().collection('products').findOne({ userId: '__master__' })
    expect(master).toMatchObject({ businessId: '__master__', createdBy: 'adm' })

    await request(app).put(`/api/v1/data/products/${created.body._id}`).set(auth(ADMIN)).send(productBody({ nameHebrew: 'שונה' }))
    await request(app).put(`/api/v1/data/products/${created.body._id}/push-to-master`).set(auth(ADMIN))
    const again = await testDb().collection('products').findOne({ userId: '__master__' })
    expect(again).toMatchObject({ nameHebrew: 'שונה', businessId: '__master__' })
  })
})

describe('master sync and clone', () => {
  it('login sync Rule 2 never overwrites a clone businessId with __master__; Rule 1 stamps the clone', async () => {
    const { syncMasterToBusiness } = require('../services/sync-master')
    const db = testDb()
    await db.collection('venues').insertMany([
      { _id: 'm1', userId: '__master__', businessId: '__master__', createdBy: '__master__', nameHebrew: 'v2' },
      { _id: 'm2', userId: '__master__', businessId: '__master__', createdBy: '__master__', nameHebrew: 'new' },
      { _id: 'u1', userId: 'userA', businessId: 'bizA', createdBy: 'userA', _masterId: 'm1', _userModified: false, nameHebrew: 'v1' },
    ])
    await syncMasterToBusiness('bizA', { createdBy: 'userA' })
    expect(await db.collection('venues').findOne({ _id: 'u1' })).toMatchObject({ nameHebrew: 'v2', businessId: 'bizA', createdBy: 'userA' })
    expect(await db.collection('venues').findOne({ userId: 'userA', _masterId: 'm2' })).toMatchObject({ businessId: 'bizA', createdBy: 'userA' })
  })

  it('cloneMasterDataToBusiness stamps the given business and never copies master fields', async () => {
    const { cloneMasterDataToBusiness } = require('../services/clone-master')
    const db = testDb()
    await db.collection('venues').insertOne({ _id: 'm1', userId: '__master__', businessId: '__master__', createdBy: '__master__', nameHebrew: 'x' })
    await cloneMasterDataToBusiness('bizB', { createdBy: 'userB' })
    expect(await db.collection('venues').findOne({ userId: 'userB' })).toMatchObject({ businessId: 'bizB', createdBy: 'userB' })
  })
})

describe('seed-master', () => {
  it('stamps businessId __master__ on every master term it writes', async () => {
    const { seedMasterTaxonomy } = require('../services/seed-master')
    expect(await seedMasterTaxonomy()).toBeGreaterThan(0)
    const terms = await testDb().collection('taxonomyTerms').find({ userId: '__master__' }).toArray()
    expect(terms.length).toBeGreaterThan(0)
    for (const t of terms) expect(t).toMatchObject({ businessId: '__master__', createdBy: '__master__' })
  })
})
