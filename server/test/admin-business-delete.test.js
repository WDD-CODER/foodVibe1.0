'use strict'
/** Plan 619 (C-LEARN, C-FILES): deleting a whole business removes its private records and keeps what the platform learned, (what was learned stays unless eraseLearned is asked for). */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { setFileStoreForTests, createMemoryFileStore } = require('../services/file-store')
const { deleteBusinessServerData } = require('../services/business')

let app
let store
beforeAll(async () => { app = await buildTestApp() }, 60000)
afterAll(async () => { await teardownTestApp() })

const ADMIN = { userId: 'boss', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const SERVER_ONLY = ['priceHistory', 'invoiceAliases', 'storedFiles', 'businessAccess']
const file = (id, businessId) => ({
  _id: id, businessId, kind: 'voice', mimeType: 'audio/webm', bytes: 3, provider: 'cloudinary', providerId: 'fv/' + id,
  resourceType: 'video', createdBy: 'u', createdAt: 1,
})

beforeEach(async () => {
  store = createMemoryFileStore()
  setFileStoreForTests(store)
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('users').insertMany([
    { _id: 'boss', name: 'boss', email: 'boss@x.com', role: 'admin', isPlatformAdmin: true, businessId: 'bBoss', businessRole: 'owner' },
    { _id: 'ownerA', name: 'ownerA', email: 'a@x.com', role: 'user', businessId: 'bA', businessRole: 'owner' },
    { _id: 'staffA', name: 'staffA', email: 's@x.com', role: 'user', businessId: 'bA', businessRole: 'staff' },
    { _id: 'ownerP', name: 'ownerP', email: 'p@x.com', role: 'user', businessId: 'bP', businessRole: 'owner' },
    { _id: 'ownerB', name: 'ownerB', email: 'b@x.com', role: 'user', businessId: 'bB', businessRole: 'owner' },
  ])
  await db.collection('businesses').insertMany([
    { _id: 'bBoss', name: 'boss', ownerId: 'boss', createdAt: 1, internal: false },
    { _id: 'bA', name: 'A', ownerId: 'ownerA', createdAt: 1, internal: false },
    { _id: 'bP', name: 'P', ownerId: 'ownerP', createdAt: 1, internal: false, aiPrivate: true },
    { _id: 'bB', name: 'B', ownerId: 'ownerB', createdAt: 1, internal: false },
  ])
  for (const biz of ['bA', 'bP', 'bB']) {
    for (const c of SERVER_ONLY) await db.collection(c).insertOne({ _id: `${c}-${biz}`, businessId: biz })
    await db.collection('storedFiles').deleteMany({ businessId: biz })
    for (const n of [1, 2]) {
      const f = file(`f${n}-${biz}`, biz)
      await db.collection('storedFiles').insertOne(f)
      store.files.set(f.providerId, Buffer.from('x'))
    }
    await db.collection('GEMINI_SHOTS').insertOne({ _id: `shot-${biz}`, businessId: '__master__', promotedFrom: { businessId: biz } })
    await db.collection('aiDrafts').insertOne({
      _id: `d-${biz}`, businessId: biz, feature: 'recipe', model: 'm', keptRatio: 0.5, status: 'accepted', at: 5, confirmedAt: 6,
      input: 'secret', aiDraft: { a: 1 }, saved: { b: 2 }, userId: 'u', subject: 's1',
    })
  }
  await db.collection('invoiceAliases').insertOne({ _id: 'alias-master', businessId: '__master__', contributors: ['bA', 'bP'] })
  await db.collection('supplierProfiles').insertOne({ _id: 'sup1', businessId: '__master__', contributors: ['bA', 'bP'] })
})
afterEach(() => setFileStoreForTests(null))

const countIn = async (c, businessId) => testDb().collection(c).countDocuments({ businessId })

describe('deleting the owner of a business that is not private', () => {
  it('removes private records and files, keeps shared material and strips drafts to numbers', async () => {
    const res = await request(app).delete('/api/v1/admin/users/ownerA').set(as(ADMIN))
    expect(res.status).toBe(200)
    const db = testDb()
    for (const c of SERVER_ONLY) expect(await countIn(c, 'bA'), c).toBe(0)
    expect([...store.files.keys()].filter(k => k.includes('-bA'))).toEqual([])
    expect(await db.collection('invoiceAliases').findOne({ _id: 'alias-master' })).toEqual({ _id: 'alias-master', businessId: '__master__', contributors: ['bA', 'bP'] })
    expect(await db.collection('supplierProfiles').findOne({ _id: 'sup1' })).not.toBeNull()
    expect(await db.collection('GEMINI_SHOTS').findOne({ _id: 'shot-bA' })).not.toBeNull()
    const draft = await db.collection('aiDrafts').findOne({ _id: 'd-bA' })
    expect(Object.keys(draft).sort()).toEqual(['_id', 'at', 'businessId', 'confirmedAt', 'feature', 'keptRatio', 'model', 'status'].sort())
    for (const c of SERVER_ONLY.filter(x => x !== 'storedFiles')) expect(await countIn(c, 'bB'), c).toBe(1)
    expect(await countIn('storedFiles', 'bB')).toBe(2)
    expect(store.files.size).toBe(4)
    expect(await db.collection('aiDrafts').findOne({ _id: 'd-bB' })).toHaveProperty('input')
  })
})

describe('deleting the owner of a private business', () => {
  it('keeps promoted copies and shared contributions, strips drafts to numbers, deletes its own records (plan 639)', async () => {
    const res = await request(app).delete('/api/v1/admin/users/ownerP').set(as(ADMIN))
    expect(res.status).toBe(200)
    const db = testDb()
    for (const c of SERVER_ONLY) expect(await countIn(c, 'bP'), c).toBe(0)
    expect(await db.collection('GEMINI_SHOTS').findOne({ _id: 'shot-bP' })).not.toBeNull()
    expect((await db.collection('invoiceAliases').findOne({ _id: 'alias-master' })).contributors).toEqual(['bA', 'bP'])
    expect(await db.collection('aiDrafts').findOne({ _id: 'd-bP' })).not.toHaveProperty('input')
    expect(await db.collection('GEMINI_SHOTS').findOne({ _id: 'shot-bB' })).not.toBeNull()
    expect(await countIn('storedFiles', 'bB')).toBe(2)
    expect(await countIn('aiDrafts', 'bB')).toBe(1)
  })
})

describe('DELETE with eraseLearned (plan 639)', () => {
  it('eraseLearned=true also removes promoted copies, shared contributions and every draft; another business untouched', async () => {
    const res = await request(app).delete('/api/v1/admin/users/ownerA?eraseLearned=true').set(as(ADMIN))
    expect(res.status).toBe(200)
    const db = testDb()
    for (const c of [...SERVER_ONLY, 'aiDrafts']) expect(await countIn(c, 'bA'), c).toBe(0)
    expect(await db.collection('GEMINI_SHOTS').findOne({ _id: 'shot-bA' })).toBeNull()
    expect((await db.collection('invoiceAliases').findOne({ _id: 'alias-master' })).contributors).toEqual(['bP'])
    expect((await db.collection('supplierProfiles').findOne({ _id: 'sup1' })).contributors).toEqual(['bP'])
    expect(await db.collection('GEMINI_SHOTS').findOne({ _id: 'shot-bB' })).not.toBeNull()
    expect(await countIn('aiDrafts', 'bB')).toBe(1)
  })

  it.each(['false', '1', 'TRUE', ''])('eraseLearned=%s keeps what was learned', async value => {
    const res = await request(app).delete(`/api/v1/admin/users/ownerA?eraseLearned=${value}`).set(as(ADMIN))
    expect(res.status).toBe(200)
    const db = testDb()
    expect(await db.collection('GEMINI_SHOTS').findOne({ _id: 'shot-bA' })).not.toBeNull()
    expect((await db.collection('invoiceAliases').findOne({ _id: 'alias-master' })).contributors).toEqual(['bA', 'bP'])
    expect(await countIn('aiDrafts', 'bA')).toBe(1)
  })

  it('a staff delete ignores the parameter', async () => {
    const res = await request(app).delete('/api/v1/admin/users/staffA?eraseLearned=true').set(as(ADMIN))
    expect(res.status).toBe(200)
    expect(await testDb().collection('GEMINI_SHOTS').findOne({ _id: 'shot-bA' })).not.toBeNull()
    expect(await countIn('aiDrafts', 'bA')).toBe(1)
  })

  it('the log line carries eraseLearned and counts only', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../routes/admin.js'), 'utf8')
    expect(src).toContain("event: 'admin.users_delete', deletedBusiness: wholeBusiness, eraseLearned,")
  })
})

describe('a failed provider delete', () => {
  it('still answers 200 and removes the rows', async () => {
    store.failNextDestroy = true
    const res = await request(app).delete('/api/v1/admin/users/ownerA').set(as(ADMIN))
    expect(res.status).toBe(200)
    expect(await countIn('storedFiles', 'bA')).toBe(0)
  })

  it('logs one warn with the business id and a count only', async () => {
    store.failNextDestroy = true
    const log = { warn: vi.fn(), info: vi.fn(), error: vi.fn() }
    const business = await testDb().collection('businesses').findOne({ _id: 'bA' })
    await deleteBusinessServerData(testDb(), business, log)
    expect(log.warn).toHaveBeenCalledTimes(1)
    expect(log.warn).toHaveBeenCalledWith({ event: 'business.delete.files_left', businessId: 'bA', count: 1 })
  })
})

describe('deleting a staff user', () => {
  it('changes none of these rows', async () => {
    const res = await request(app).delete('/api/v1/admin/users/staffA').set(as(ADMIN))
    expect(res.status).toBe(200)
    for (const c of [...SERVER_ONLY, 'aiDrafts']) expect(await countIn(c, 'bA'), c).toBeGreaterThan(0)
    expect(await countIn('storedFiles', 'bA')).toBe(2)
    expect(await testDb().collection('aiDrafts').findOne({ _id: 'd-bA' })).toHaveProperty('input')
  })
})
