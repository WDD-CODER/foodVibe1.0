'use strict'
/** Plan 764 (C-SETTINGS, C-MENU-FIELDS): the owner's default menu design, and the server-owned latest export. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { menuEventBody, stored } = require('./helpers/v2-docs')
const { businessSchema } = require('../generated/schemas/entities')

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
const business = (_id, ownerId, extra = {}) => ({ _id, name: _id, ownerId, createdAt: 1, internal: false, lastSyncedMasterVersion: 0, ...extra })
const design = (_id, businessId, extra = {}) => ({ _id, schemaVersion: 2, businessId, createdBy: 'own1', createdAt: 1, updatedAt: 1, name: _id, ...extra })
const put = (body, who = OWNER) => request(app).put('/api/v1/business/menu-design-default').set(as(who)).send(body)
const storedBusiness = (id = 'b1') => testDb().collection('businesses').findOne({ _id: id })

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('businesses').insertMany([business('b1', 'own1'), business('b2', 'own2')])
  await db.collection('menuDesigns').insertMany([
    design('d1', 'b1'), design('d2', 'b1'), design('dOther', 'b2'), design('dGone', 'b1', { deletedAt: 5 }),
  ])
})

describe('PUT /api/v1/business/menu-design-default', () => {
  it('stores the id for the owner and starts hidePoweredBy false; the next GET returns it', async () => {
    const res = await put({ designId: 'd1' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ menuDesign: { hidePoweredBy: false, defaultDesignId: 'd1' } })
    const doc = await storedBusiness()
    expect(doc.menuDesign).toEqual({ hidePoweredBy: false, defaultDesignId: 'd1' })
    expect(businessSchema.safeParse(doc).success).toBe(true)
    const get = await request(app).get('/api/v1/business').set(as(OWNER))
    expect(get.body.menuDesign.defaultDesignId).toBe('d1')
    expect((await storedBusiness('b2')).menuDesign).toBeUndefined()
  })

  it('replaces the default and keeps the platform admin\'s hidePoweredBy', async () => {
    await testDb().collection('businesses').updateOne({ _id: 'b1' }, { $set: { menuDesign: { defaultDesignId: 'd1', hidePoweredBy: true } } })
    const res = await put({ designId: 'd2' })
    expect(res.status).toBe(200)
    expect((await storedBusiness()).menuDesign).toEqual({ defaultDesignId: 'd2', hidePoweredBy: true })
  })

  it('answers 403 for staff and 401 without a token, writing nothing', async () => {
    expect((await put({ designId: 'd1' }, STAFF)).status).toBe(403)
    expect((await request(app).put('/api/v1/business/menu-design-default').send({ designId: 'd1' })).status).toBe(401)
    expect((await storedBusiness()).menuDesign).toBeUndefined()
  })

  it.each([
    ['a design of another business', 'dOther'],
    ['a deleted design', 'dGone'],
    ['an unknown design', 'nope'],
  ])('answers 404 for %s', async (_label, designId) => {
    expect((await put({ designId })).status).toBe(404)
    expect((await storedBusiness()).menuDesign).toBeUndefined()
  })

  it.each([
    ['no designId', {}],
    ['an object as designId', { designId: { $ne: null } }],
    ['hidePoweredBy in the body', { designId: 'd1', hidePoweredBy: true }],
  ])('refuses %s with 400', async (_label, body) => {
    expect((await put(body)).status).toBe(400)
    expect((await storedBusiness()).menuDesign).toBeUndefined()
  })
})

describe('menuEvents latestExport is server-owned', () => {
  const url = (rest = '') => `/api/v1/data/menuEvents${rest}`
  const forged = { fileId: 'forged', at: 9, designId: 'd9' }
  const storedEvent = id => testDb().collection('menuEvents').findOne({ _id: id })

  it('a client PUT cannot set it, while the menu fields are saved', async () => {
    const created = await request(app).post(url()).set(as(OWNER)).send(menuEventBody({ latestExport: forged }))
    expect(created.status).toBe(201)
    const id = created.body._id
    expect((await storedEvent(id)).latestExport).toBeUndefined()

    const edited = await request(app).put(url(`/${id}`)).set(as(OWNER))
      .send({ latestExport: forged, designId: 'd1', subtitle: 'כותרת', bottomNote: 'הערה' })
    expect(edited.status).toBe(200)
    const doc = await storedEvent(id)
    expect(doc.latestExport).toBeUndefined()
    expect(doc).toMatchObject({ designId: 'd1', subtitle: 'כותרת', bottomNote: 'הערה' })
  })

  it('a client PUT keeps the stored value', async () => {
    const kept = { fileId: 'f1', at: 1, designId: 'd1' }
    await testDb().collection('menuEvents').insertOne(stored(menuEventBody(), {
      _id: 'ev1', userId: 'own1', businessId: 'b1', createdBy: 'own1', _masterId: 'ev1', _userModified: false,
      stage: 'inquiry', stageHistory: [], notes: [], latestExport: kept,
    }))
    const res = await request(app).put(url('/ev1')).set(as(OWNER)).send({ name: 'חדש', latestExport: forged })
    expect(res.status).toBe(200)
    expect((await storedEvent('ev1')).latestExport).toEqual(kept)
  })
})

describe('generic /api/v1/data/menuDesigns', () => {
  const url = '/api/v1/data/menuDesigns'
  const { baseDesign } = require('../generated/schemas/menu-design')
  const { clearModuleCache } = require('../middleware/require-module')

  beforeEach(() => clearModuleCache())

  it('answers 403 MODULE_OFF to a business without menu_design', async () => {
    const res = await request(app).get(url).set(as(OWNER))
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'MODULE_OFF', module: 'menu_design' })
  })

  it('creates, edits and deletes a design, storing no clone lineage', async () => {
    await testDb().collection('businesses').updateOne({ _id: 'b1' }, { $set: { modules: ['menu_design'] } })
    const created = await request(app).post(url).set(as(OWNER)).send({ ...baseDesign('classic'), name: 'ערב' })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    const id = created.body._id
    const doc = await testDb().collection('menuDesigns').findOne({ _id: id })
    expect(doc).toMatchObject({ businessId: 'b1', createdBy: 'own1', schemaVersion: 2, name: 'ערב' })
    expect(doc).not.toHaveProperty('_masterId')

    const edited = await request(app).put(`${url}/${id}`).set(as(OWNER)).send({ name: 'צהריים' })
    expect(edited.status, JSON.stringify(edited.body)).toBe(200)
    expect((await request(app).delete(`${url}/${id}`).set(as(OWNER))).status).toBe(200)
    expect((await testDb().collection('menuDesigns').findOne({ _id: id })).deletedAt).toBeDefined()
  })
})
