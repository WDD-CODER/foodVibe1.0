'use strict'
/** Plan 639 (C-LEARN): POST /api/v1/admin/businesses/:id/erase-learned - the platform admin erases what was learned from one business. */

const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')

let app
beforeAll(async () => { app = await buildTestApp() }, 60000)
afterAll(async () => { await teardownTestApp() })

const ADMIN = { userId: 'boss', name: 'The Boss', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const OWNER = { userId: 'ownerA', name: 'Owner A', businessId: 'bA', businessRole: 'owner' }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const post = (body, who = ADMIN, id = 'bA') => request(app).post(`/api/v1/admin/businesses/${id}/erase-learned`).set(as(who)).send(body)

beforeEach(async () => {
  const db = testDb()
  for (const c of ['businesses', 'GEMINI_SHOTS', 'aiDrafts', 'invoiceAliases', 'supplierProfiles']) await db.collection(c).deleteMany({})
  await db.collection('businesses').insertMany([
    { _id: 'bBoss', name: 'boss', ownerId: 'boss', createdAt: 1 },
    { _id: 'bA', name: 'A', ownerId: 'ownerA', createdAt: 1, aiPrivate: true },
    { _id: 'bB', name: 'B', ownerId: 'ownerB', createdAt: 1 },
  ])
  await db.collection('GEMINI_SHOTS').insertMany([
    { _id: 's-A', businessId: '__master__', promotedFrom: { businessId: 'bA' } },
    { _id: 's-B', businessId: '__master__', promotedFrom: { businessId: 'bB' } },
    { _id: 's-own-A', businessId: 'bA' },
  ])
  await db.collection('aiDrafts').insertMany([{ _id: 'd-A', businessId: 'bA' }, { _id: 'd-B', businessId: 'bB' }])
  await db.collection('invoiceAliases').insertMany([
    { _id: 'al-both', businessId: '__master__', contributors: ['bA', 'bB'] },
    { _id: 'al-A', businessId: '__master__', contributors: ['bA'] },
  ])
  await db.collection('supplierProfiles').insertMany([{ _id: 'sp-both', contributors: ['bA', 'bB'] }, { _id: 'sp-A', contributors: ['bA'] }])
})

describe('POST /admin/businesses/:id/erase-learned', () => {
  it('erases the business learned data, keeps another business, and stores one history row', async () => {
    const res = await post({ reason: '  the business asked  ' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      counts: { promoted: 1, drafts: 1, aliasesPulled: 2, aliasesDeleted: 1, profilesPulled: 2, profilesDeleted: 1 },
    })
    const db = testDb()
    expect((await db.collection('GEMINI_SHOTS').find({}).toArray()).map(s => s._id).sort()).toEqual(['s-B', 's-own-A'])
    expect((await db.collection('aiDrafts').find({}).toArray()).map(s => s._id)).toEqual(['d-B'])
    expect((await db.collection('invoiceAliases').find({}).toArray()).map(a => [a._id, a.contributors])).toEqual([['al-both', ['bB']]])
    expect((await db.collection('supplierProfiles').find({}).toArray()).map(a => [a._id, a.contributors])).toEqual([['sp-both', ['bB']]])
    const doc = await db.collection('businesses').findOne({ _id: 'bA' })
    expect(doc.platformHistory).toHaveLength(1)
    expect(doc.platformHistory[0]).toMatchObject({
      by: 'boss', byName: 'The Boss', reason: 'the business asked',
      changed: ['learnedData'], changes: [{ field: 'learnedData', from: '', to: 'erased' }],
    })
  })

  it.each([['missing', {}], ['empty', { reason: '' }], ['blank', { reason: '   ' }], ['too long', { reason: 'x'.repeat(301) }]])('answers 400 for a %s reason and erases nothing', async (_n, body) => {
    expect((await post(body)).status).toBe(400)
    expect(await testDb().collection('aiDrafts').countDocuments({ businessId: 'bA' })).toBe(1)
  })

  it('404 for an unknown id before any delete, 403 for an owner, 401 without a token', async () => {
    expect((await post({ reason: 'because' }, ADMIN, 'nope')).status).toBe(404)
    expect(await testDb().collection('aiDrafts').countDocuments({})).toBe(2)
    expect((await post({ reason: 'because' }, OWNER)).status).toBe(403)
    expect((await request(app).post('/api/v1/admin/businesses/bA/erase-learned').send({ reason: 'x' })).status).toBe(401)
  })

  it('the log line holds the business id and the counts only, never the reason', () => {
    const src = fs.readFileSync(path.join(__dirname, '../routes/admin.js'), 'utf8')
    expect(src).toMatch(/event: 'admin\.learned_data\.erased', businessId, counts \}/)
    expect(src).toMatch(/event: 'admin\.learned_data\.erase_failed', businessId \}/)
  })
})
