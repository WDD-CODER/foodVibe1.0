'use strict'
/** Plan 629 - GET /api/v1/product-import/price-rises: the latest qualifying rise per product and supplier. */

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
const DAY = 86400000
const get = (query = '', who = OWNER) => request(app).get(`/api/v1/product-import/price-rises${query}`).set(as(who))

let seq = 0
const hist = (changePct, extra = {}) => ({
  _id: `h${++seq}`, businessId: 'b1', productId: 'p1', supplierId: 's1', price: 10 + changePct, prevPrice: 10,
  changePct, at: Date.now() - DAY, by: 'own1', source: 'invoice', ...extra,
})

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('businesses').insertMany([
    { _id: 'b1', name: 'one', ownerId: 'own1' },
    { _id: 'b2', name: 'two', ownerId: 'own2' },
  ])
})

const seed = (...rows) => testDb().collection('priceHistory').insertMany(rows)

describe('GET /api/v1/product-import/price-rises', () => {
  it('uses the default 5: 6% and exactly 5% are returned, 4% is not', async () => {
    await seed(hist(6, { productId: 'a' }), hist(4, { productId: 'b' }), hist(5, { productId: 'c' }))
    const res = await get()
    expect(res.status).toBe(200)
    expect(res.body.map(r => r.productId).sort()).toEqual(['a', 'c'])
  })

  it('uses the stored threshold of the business', async () => {
    await testDb().collection('businesses').updateOne({ _id: 'b1' }, { $set: { settings: { profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10, priceRiseAlertPct: 10 } } })
    await seed(hist(6))
    expect((await get()).body).toEqual([])
  })

  it('leaves out a row older than days', async () => {
    await seed(hist(6, { at: Date.now() - 10 * DAY }))
    expect((await get('?days=5')).body).toEqual([])
    expect((await get('?days=30')).body).toHaveLength(1)
  })

  it('returns only the later of two rises of one product and supplier', async () => {
    await seed(hist(7, { at: Date.now() - 5 * DAY }), hist(9, { at: Date.now() - 2 * DAY }))
    const res = await get()
    expect(res.body).toHaveLength(1)
    expect(res.body[0].changePct).toBe(9)
  })

  it('a rise at another supplier is its own row', async () => {
    await seed(hist(7, { at: Date.now() - 5 * DAY }), hist(9, { supplierId: 's2' }))
    expect((await get()).body).toHaveLength(2)
  })

  it('never returns another business', async () => {
    await seed(hist(9, { businessId: 'b2' }))
    expect((await get()).body).toEqual([])
  })

  it('answers exactly six keys', async () => {
    await seed(hist(6))
    const [row] = (await get()).body
    expect(Object.keys(row).sort()).toEqual(['at', 'changePct', 'from', 'productId', 'supplierId', 'to'])
  })

  it('staff get 403, no token gets 401', async () => {
    expect((await get('', STAFF)).status).toBe(403)
    expect((await get('', STAFF)).body.error).toBe('FORBIDDEN')
    expect((await request(app).get('/api/v1/product-import/price-rises')).status).toBe(401)
  })

  it.each(['0', '366', 'abc'])('days=%s is 400 BAD_DAYS', async days => {
    const res = await get(`?days=${days}`)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'BAD_DAYS' })
  })
})
