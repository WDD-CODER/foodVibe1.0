'use strict'
/** Plan 727: the month plan routes: owner, consultant, staff, another business, module off, null kept apart from 0. */
const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { clearModuleCache } = require('../middleware/require-module')

let app
beforeAll(async () => { app = await buildTestApp() }, 60000)
afterAll(async () => { await teardownTestApp() })

const db = c => testDb().collection(c)
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'owner', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'staff', businessId: 'b1', businessRole: 'staff' }
const OWNER_2 = { userId: 'own2', name: 'owner2', businessId: 'b2', businessRole: 'owner' }
const OWNER_OFF = { userId: 'own3', name: 'owner3', businessId: 'b3', businessRole: 'owner' }
const CONSULTANT = { userId: 'cons1', name: 'cons', businessId: 'b1', businessRole: 'consultant', homeBusinessId: 'bHome', acting: 'consultant' }
const URL = '/api/v1/month-plans'
const post = (body, who = OWNER) => request(app).post(URL).set(as(who)).send(body)
const put = (month, body, who = OWNER) => request(app).put(`${URL}/${month}`).set(as(who)).send(body)
const get = (path, who = OWNER) => request(app).get(`${URL}${path}`).set(as(who))

beforeEach(async () => {
  for (const c of await testDb().listCollections().toArray()) if (c.type === 'collection') await db(c.name).deleteMany({})
  await db('businesses').insertMany([
    { _id: 'b1', name: 'one', ownerId: 'own1', createdAt: 1, modules: ['monthly_plan'] },
    { _id: 'b2', name: 'two', ownerId: 'own2', createdAt: 1, modules: ['monthly_plan'] },
    { _id: 'b3', name: 'three', ownerId: 'own3', createdAt: 1, modules: ['events'] },
    { _id: 'bHome', name: 'home', ownerId: 'cons1', createdAt: 1 },
  ])
  await db('businessAccess').insertOne({ _id: 'g1', userId: 'cons1', businessId: 'b1', role: 'consultant', grantedBy: 'x', grantedByName: 'x', grantedAt: 1 })
  clearModuleCache()
})

describe('create', () => {
  it('opens a month with the default targets, the default VAT copy and empty revenue', async () => {
    const res = await post({ month: '2026-11' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      month: '2026-11', status: 'open', businessId: 'b1', createdBy: 'own1', vatRatePct: 18, dealerType: 'murshe',
      targets: { foodPct: 32, labourPct: 33, primePct: 65, fixedPct: 25, profitPct: 10 },
      revenue: { plan: null, actual: null },
    })
    expect(await db('monthPlans').countDocuments({ businessId: 'b1' })).toBe(1)
  })

  it('copies the stored settings targets and VAT; later changes to the settings leave the month alone', async () => {
    const monthTargets = { foodPct: 30, labourPct: 31, primePct: 61, fixedPct: 22, profitPct: 8 }
    await db('businesses').updateOne({ _id: 'b1' }, { $set: { settings: { profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10, vatRatePct: 17, dealerType: 'patur', monthTargets } } })
    const first = await post({ month: '2026-11' })
    expect(first.body).toMatchObject({ targets: monthTargets, vatRatePct: 17, dealerType: 'patur' })
    await db('businesses').updateOne({ _id: 'b1' }, { $set: { 'settings.monthTargets.foodPct': 34 } })
    expect((await get('/2026-11')).body.targets.foodPct).toBe(30)
    expect((await post({ month: '2026-12' })).body.targets.foodPct).toBe(34)
  })

  it('answers 409 MONTH_EXISTS for a second copy, and 400 for a bad month or an extra field', async () => {
    expect((await post({ month: '2026-11' })).status).toBe(201)
    const dup = await post({ month: '2026-11' })
    expect(dup.status).toBe(409)
    expect(dup.body.error).toBe('MONTH_EXISTS')
    expect((await post({ month: '2026-13' })).status).toBe(400)
    expect((await post({ month: '2026-10', revenue: { plan: 5 } })).status).toBe(400)
    expect(await db('monthPlans').countDocuments({ businessId: 'b1' })).toBe(1)
  })

  it('the unique index decides when two creates race', async () => {
    const [a, b] = await Promise.all([post({ month: '2026-09' }), post({ month: '2026-09' })])
    expect([a.status, b.status].sort()).toEqual([201, 409])
  })
})

describe('read', () => {
  it('lists newest month first, only the own business', async () => {
    await post({ month: '2026-09' })
    await post({ month: '2026-11' })
    await post({ month: '2026-10' })
    await post({ month: '2026-11' }, OWNER_2)
    const res = await get('')
    expect(res.status).toBe(200)
    expect(res.body.months.map(m => m.month)).toEqual(['2026-11', '2026-10', '2026-09'])
  })

  it('gets one month; 404 MONTH_NOT_FOUND; 400 for a bad key; another business never sees it', async () => {
    await post({ month: '2026-11' })
    expect((await get('/2026-11')).status).toBe(200)
    const missing = await get('/2026-10')
    expect(missing.status).toBe(404)
    expect(missing.body.error).toBe('MONTH_NOT_FOUND')
    expect((await get('/2026-13')).status).toBe(400)
    expect((await get('/2026-11', OWNER_2)).status).toBe(404)
  })
})

describe('update', () => {
  it('keeps null apart from 0 and sets only the named paths', async () => {
    await post({ month: '2026-11' })
    const res = await put('2026-11', { revenue: { actual: 0, plan: 120000 }, targets: { profitPct: 8 } })
    expect(res.status).toBe(200)
    expect(res.body.revenue).toEqual({ plan: 120000, actual: 0 })
    expect(res.body.targets).toEqual({ foodPct: 32, labourPct: 33, primePct: 65, fixedPct: 25, profitPct: 8 })
    const stored = await db('monthPlans').findOne({ month: '2026-11' })
    expect(stored.revenue.actual).toBe(0)
    expect(stored.revenue.actual).not.toBeNull()
    const cleared = await put('2026-11', { revenue: { actual: null } })
    expect(cleared.body.revenue).toEqual({ plan: 120000, actual: null })
    expect((await db('monthPlans').findOne({ month: '2026-11' })).targets.profitPct).toBe(8)
  })

  it('refuses an empty body, an unknown field, a negative amount and a target above 100', async () => {
    await post({ month: '2026-11' })
    for (const body of [{}, { revenue: {} }, { status: 'closed' }, { revenue: { plan: -1 } }, { targets: { foodPct: 101 } }, { targets: { nope: 1 } }]) {
      expect((await put('2026-11', body)).status, JSON.stringify(body)).toBe(400)
    }
  })

  it('answers 404 for a month that is not there and 409 MONTH_CLOSED for a closed one', async () => {
    expect((await put('2026-11', { revenue: { plan: 5 } })).status).toBe(404)
    await post({ month: '2026-11' })
    await db('monthPlans').updateOne({ month: '2026-11' }, { $set: { status: 'closed' } })
    const res = await put('2026-11', { revenue: { plan: 5 } })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('MONTH_CLOSED')
    expect((await db('monthPlans').findOne({ month: '2026-11' })).revenue.plan).toBeNull()
  })

  it('another business cannot change the month', async () => {
    await post({ month: '2026-11' })
    expect((await put('2026-11', { revenue: { plan: 5 } }, OWNER_2)).status).toBe(404)
  })
})

describe('who may', () => {
  it('a consultant with a grant works the client month', async () => {
    const made = await post({ month: '2026-11' }, CONSULTANT)
    expect(made.status).toBe(201)
    expect(made.body.businessId).toBe('b1')
    expect((await put('2026-11', { revenue: { plan: 90000 } }, CONSULTANT)).status).toBe(200)
    expect((await get('', CONSULTANT)).body.months).toHaveLength(1)
  })

  it('staff are refused every call, reads too', async () => {
    await post({ month: '2026-11' })
    expect((await get('', STAFF)).status).toBe(403)
    expect((await get('/2026-11', STAFF)).status).toBe(403)
    expect((await post({ month: '2026-12' }, STAFF)).status).toBe(403)
    expect((await put('2026-11', { revenue: { plan: 1 } }, STAFF)).status).toBe(403)
    expect(await db('monthPlans').countDocuments({})).toBe(1)
  })

  it('no token is 401', async () => {
    expect((await request(app).get(URL)).status).toBe(401)
  })

  it('a business without the module gets 403 MODULE_OFF on every route', async () => {
    for (const res of [await get('', OWNER_OFF), await get('/2026-11', OWNER_OFF), await post({ month: '2026-11' }, OWNER_OFF), await put('2026-11', { revenue: { plan: 1 } }, OWNER_OFF)]) {
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('MODULE_OFF')
    }
    expect(await db('monthPlans').countDocuments({})).toBe(0)
  })

  it('the generic data API does not know the type', async () => {
    await post({ month: '2026-11' })
    for (const res of [
      await request(app).get('/api/v1/data/monthPlans').set(as(OWNER)),
      await request(app).get('/api/v1/data/monthPlans').set(as(STAFF)),
      await request(app).post('/api/v1/data/monthPlans').set(as(OWNER)).send({ month: '2026-12' }),
    ]) {
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    }
    expect(await db('monthPlans').countDocuments({})).toBe(1)
  })
})
