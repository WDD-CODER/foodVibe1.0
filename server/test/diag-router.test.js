'use strict'
/** Plan 633 (C-DIAG): the diagnosis record routes. The gate reads the HOME business; the data is the client's. */
const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { clearModuleCache } = require('../middleware/require-module')

let app
beforeAll(async () => { app = await buildTestApp() }, 60000)
afterAll(async () => { await teardownTestApp() })

const db = c => testDb().collection(c)
const HOME = 'b_home'
const CLIENT = 'b_client'
const OTHER = 'b_other'
const DAY = 86400000

const consultant = (extra = {}) => signTestToken({ userId: 'u_cons', name: 'cons', businessId: CLIENT, businessRole: 'consultant', homeBusinessId: HOME, acting: 'consultant', ...extra })
const as = token => ({ Authorization: `Bearer ${token}` })
const create = (body = { name: 'Job' }, token = consultant()) => request(app).post('/api/v1/diag').set(as(token)).send(body)

beforeEach(async () => {
  for (const c of ['businesses', 'businessAccess', 'diagnoses', 'dishes', 'invoices', 'priceHistory']) await db(c).deleteMany({})
  await db('businesses').insertMany([
    { _id: HOME, name: 'home', ownerId: 'u_cons', createdAt: 1, modules: ['events', 'consultant_diag'] },
    { _id: CLIENT, name: 'client', ownerId: 'u_client', createdAt: 1, modules: ['events'] },
    { _id: OTHER, name: 'other', ownerId: 'u_other', createdAt: 1, modules: ['consultant_diag'] },
    { _id: 'b_nomod', name: 'nomod', ownerId: 'u_nomod', createdAt: 1, modules: [] },
  ])
  await db('businessAccess').insertOne({ _id: 'g1', userId: 'u_cons', businessId: CLIENT, role: 'consultant', grantedBy: 'x', grantedByName: 'x', grantedAt: 1 })
  clearModuleCache()
})

describe('create and gate', () => {
  it('a consultant whose home has the module creates in a client business without it', async () => {
    const res = await create()
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ businessId: CLIENT, createdBy: 'u_cons', homeBusinessId: HOME, pricesIncludeVat: true, vatPct: 18, status: 'open', periodDays: 60, menu: [], invoiceIds: [] })
  })
  it('a user whose home lacks the module gets 403 MODULE_OFF even when the acting business has it', async () => {
    await db('businessAccess').insertOne({ _id: 'g2', userId: 'u_x', businessId: OTHER, role: 'consultant', grantedBy: 'x', grantedByName: 'x', grantedAt: 1 })
    const token = signTestToken({ userId: 'u_x', businessId: OTHER, businessRole: 'consultant', homeBusinessId: 'b_nomod', acting: 'consultant' })
    const res = await create({ name: 'Job' }, token)
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'MODULE_OFF', module: 'consultant_diag' })
  })
  it('staff get 403', async () => {
    const token = signTestToken({ userId: 'u_s', businessId: OTHER, businessRole: 'staff' })
    expect((await create({ name: 'Job' }, token)).status).toBe(403)
  })
  it('keeps the VAT fields named at creation and refuses vatPct 101', async () => {
    const res = await create({ name: 'Job', pricesIncludeVat: false, vatPct: 17 })
    expect(res.body).toMatchObject({ pricesIncludeVat: false, vatPct: 17 })
    expect((await create({ name: 'Job', vatPct: 101 })).status).toBe(400)
  })
  it('a generic POST stores nothing and a staff read carries no menu', async () => {
    const generic = await request(app).post('/api/v1/data/diagnoses').set(as(consultant())).send({ name: 'x' })
    expect(generic.status).toBeGreaterThanOrEqual(400)
    expect(await db('diagnoses').countDocuments()).toBe(0)
    const made = await create()
    await db('diagnoses').updateOne({ _id: made.body._id }, { $set: { menu: [{ name: 'a', sellPrice: 5 }] } })
    const staff = signTestToken({ userId: 'u_s', businessId: CLIENT, businessRole: 'staff' })
    const read = await request(app).get('/api/v1/data/diagnoses').set(as(staff))
    expect(read.status).toBe(200)
    expect(JSON.stringify(read.body)).not.toContain('menu')
    expect(JSON.stringify(read.body)).not.toContain('sellPrice')
  })
})

describe('menu, invoices, status', () => {
  it('PUT menu stores the VAT fields and a later body without them keeps them', async () => {
    const { body } = await create()
    const a = await request(app).put(`/api/v1/diag/${body._id}/menu`).set(as(consultant())).send({ menu: [{ name: 'a', sellPrice: 10 }], pricesIncludeVat: false, vatPct: 17 })
    expect(a.status).toBe(200)
    expect(a.body).toMatchObject({ pricesIncludeVat: false, vatPct: 17 })
    const b = await request(app).put(`/api/v1/diag/${body._id}/menu`).set(as(consultant())).send({ menu: [{ name: 'b', sellPrice: 12 }] })
    expect(b.body).toMatchObject({ pricesIncludeVat: false, vatPct: 17, menu: [{ name: 'b', sellPrice: 12 }] })
    expect((await db('diagnoses').findOne({ _id: body._id })).vatPct).toBe(17)
  })
  it('vatPct 101 on the menu is 400; an unknown dish is 400 UNKNOWN_DISH; a live dish is accepted', async () => {
    const { body } = await create()
    const put = menu => request(app).put(`/api/v1/diag/${body._id}/menu`).set(as(consultant())).send(menu)
    expect((await put({ menu: [], vatPct: 101 })).status).toBe(400)
    const bad = await put({ menu: [{ name: 'a', sellPrice: 1, dishId: 'nope' }] })
    expect(bad.status).toBe(400)
    expect(bad.body.error).toBe('UNKNOWN_DISH')
    await db('dishes').insertMany([{ _id: 'd1', businessId: CLIENT }, { _id: 'd2', businessId: OTHER }])
    expect((await put({ menu: [{ name: 'a', sellPrice: 1, dishId: 'd1' }] })).status).toBe(200)
    expect((await put({ menu: [{ name: 'a', sellPrice: 1, dishId: 'd2' }] })).body.error).toBe('UNKNOWN_DISH')
  })
  it('invoices: another business id is UNKNOWN_INVOICE; duplicates are removed', async () => {
    const { body } = await create()
    await db('invoices').insertMany([{ _id: 'i1', businessId: CLIENT }, { _id: 'i2', businessId: OTHER }])
    const put = invoiceIds => request(app).put(`/api/v1/diag/${body._id}/invoices`).set(as(consultant())).send({ invoiceIds })
    const bad = await put(['i1', 'i2'])
    expect(bad.status).toBe(400)
    expect(bad.body.error).toBe('UNKNOWN_INVOICE')
    const ok = await put(['i1', 'i1'])
    expect(ok.body.invoiceIds).toEqual(['i1'])
  })
  it('a done diagnosis refuses menu and invoices (409) until reopened', async () => {
    const { body } = await create()
    const url = p => `/api/v1/diag/${body._id}/${p}`
    expect((await request(app).put(url('status')).set(as(consultant())).send({ status: 'done' })).body.status).toBe('done')
    const m = await request(app).put(url('menu')).set(as(consultant())).send({ menu: [] })
    expect(m.status).toBe(409)
    expect(m.body.error).toBe('DIAGNOSIS_DONE')
    expect((await request(app).put(url('invoices')).set(as(consultant())).send({ invoiceIds: [] })).status).toBe(409)
    await request(app).put(url('status')).set(as(consultant())).send({ status: 'open' })
    expect((await request(app).put(url('menu')).set(as(consultant())).send({ menu: [] })).status).toBe(200)
  })
  it('a diagnosis of another business answers 404', async () => {
    const { body } = await create()
    const token = signTestToken({ userId: 'u_o', businessId: OTHER, businessRole: 'owner' })
    for (const [m, p, b] of [['put', 'menu', { menu: [] }], ['put', 'invoices', { invoiceIds: [] }], ['put', 'status', { status: 'done' }], ['get', 'data', undefined]]) {
      const r = await request(app)[m](`/api/v1/diag/${body._id}/${p}`).set(as(token)).send(b)
      expect(r.status).toBe(404)
    }
  })
})

describe('GET /:id/data', () => {
  it('returns the movement of the period and ignores older rows', async () => {
    const { body } = await create()
    const now = Date.now()
    const row = (price, at, businessId = CLIENT) => ({ businessId, productId: 'p1', supplierId: 's1', price, at })
    await db('priceHistory').insertMany([row(10, now - DAY), row(12, now - 2 * DAY), row(15, now - 3 * DAY), row(1, now - 90 * DAY), row(99, now - DAY, OTHER)])
    const res = await request(app).get(`/api/v1/diag/${body._id}/data`).set(as(consultant()))
    expect(res.status).toBe(200)
    expect(res.body.diagnosis._id).toBe(body._id)
    expect(res.body.volatility).toEqual([{ productId: 'p1', supplierId: 's1', min: 10, max: 15, movePct: 50, points: 3 }])
  })
})
