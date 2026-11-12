'use strict'
/** Plan 568 - the business report: measured numbers only, 3-event rule, owner / platform-admin access, no client data. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { monthKeys } = require('../services/business-report')
const { REPORT_METRICS } = require('../constants/report')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const OWNER = { userId: 'ownerA', businessId: 'bA', businessRole: 'owner' }
const STAFF = { userId: 'staffA', businessId: 'bA', businessRole: 'staff' }
const ADMIN = { userId: 'boss', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const DAY = 86400000
const ago = days => Date.now() - days * DAY
const get = (user, query = '') => request(app).get('/api/v1/stats/report' + query).set(as(user))

const base = (id, extra = {}) => ({
  _id: id, businessId: 'bA', userId: 'x', name: 'ev ' + id, stage: 'inquiry', eventDate: '2026-01-01',
  clientName: 'Secret Client', clientPhone: '0500000000', guestName: 'G', guestPhone: '1', ...extra,
})
const closed = (id, createdDays, closedDays, pricing, guestCount, extra = {}) =>
  base(id, { stage: 'deposit_paid', createdAt: ago(createdDays), closedAt: ago(closedDays), pricing, guestCount, ...extra })
const lost = (id, createdDays, lostDays, reason) =>
  base(id, { stage: 'not_closed', createdAt: ago(createdDays), notClosedAt: ago(lostDays), notClosedReason: reason })

const FIXTURE = [
  closed('e1', 100, 98, { revenue: 10000, foodCost: 3000, profit: 5000, profitPct: 50 }, 50),
  closed('e2', 95, 90, { revenue: 10000, foodCost: 4000, profit: 3000, profitPct: 30 }, 50),
  closed('e3', 90, 85, { revenue: 20000, foodCost: 6000, profit: 10000, profitPct: 50 }, 100),
  closed('e4', 20, 10, { revenue: 12000, foodCost: 3600, profit: 2400, profitPct: 20 }, 40),
  closed('e5', 15, 5, { revenue: 8000, foodCost: 2000, profit: 1000, profitPct: 12.5, partial: true }, 20),
  lost('n1', 45, 35, 'price'),
  lost('n2', 25, 20, 'price'),
  lost('n3', 14, 12, 'no_reply'),
]

beforeEach(async () => {
  const db = testDb()
  for (const c of ['users', 'businesses', 'usageDays', 'menuEvents']) await db.collection(c).deleteMany({})
  await db.collection('users').insertMany([
    { _id: 'ownerA', email: 'ownera@test.invalid', name: 'Owner A', businessId: 'bA', businessRole: 'owner' },
    { _id: 'staffA', email: 'staffa@test.invalid', name: 'Staff A', businessId: 'bA', businessRole: 'staff' },
    { _id: 'boss', email: 'boss@test.invalid', name: 'boss', role: 'admin', isPlatformAdmin: true, businessId: 'bBoss', businessRole: 'owner' },
  ])
  await db.collection('businesses').insertMany([
    { _id: 'bA', name: 'A', ownerId: 'ownerA', createdAt: ago(200), internal: false },
    { _id: 'bB', name: 'B', ownerId: 'x', createdAt: ago(200), internal: false },
  ])
  await db.collection('menuEvents').insertMany([
    ...FIXTURE,
    // never counted
    closed('legacy1', 20, 10, { revenue: 99999, foodCost: 1, profit: 1, profitPct: 1 }, 1, { legacy: true }),
    closed('deleted1', 20, 10, { revenue: 99999, foodCost: 1, profit: 1, profitPct: 1 }, 1, { deletedAt: 9 }),
    closed('other1', 20, 10, { revenue: 99999, foodCost: 1, profit: 1, profitPct: 1 }, 1, { businessId: 'bB' }),
  ])
})

const sum = points => points.reduce((a, p) => a + p.value, 0)

describe('GET /api/v1/stats/report', () => {
  it('returns one point per month for every metric and counts only live, non-legacy events of the business', async () => {
    const res = await get(OWNER, '?months=6')
    expect(res.status).toBe(200)
    expect(res.body.months).toBe(6)
    expect(res.body.businessName).toBe('A')
    const keys = monthKeys(Date.now(), 6)
    for (const { key } of REPORT_METRICS) expect(res.body.series[key].map(p => p.month)).toEqual(keys)
    expect(sum(res.body.series.inquiries)).toBe(8)
    expect(sum(res.body.series.eventsClosed)).toBe(5)
    expect(sum(res.body.series.revenue)).toBe(60000)
    expect(Math.abs(res.body.firstEventAt - ago(100))).toBeLessThan(60000)
  })

  it('compares the first 30 days with the latest 30 days', async () => {
    const { body } = await get(OWNER, '?months=6')
    expect(body.comparable).toBe(true)
    expect(body.start.metrics.inquiries.value).toBe(3)
    expect(body.latest.metrics.inquiries.value).toBe(4)
    expect(body.change.inquiries.changePct).toBeCloseTo(33.333, 2)
    expect(body.start.metrics.eventsClosed.value).toBe(3)
    expect(body.latest.metrics.eventsClosed.value).toBe(2)
    expect(body.change.eventsClosed.changePct).toBeCloseTo(-33.333, 2)
    expect(body.start.metrics.closeRatePct.value).toBe(100)
    expect(body.latest.metrics.closeRatePct.value).toBe(50)
    expect(body.change.closeRatePct.changePts).toBe(-50)
    expect(body.start.metrics.revenuePerEvent.value).toBeCloseTo(40000 / 3, 4)
    expect(body.start.metrics.foodCostPct.value).toBeCloseTo(100 / 3, 4)
    expect(body.start.metrics.profitPct.value).toBeCloseTo(130 / 3, 4)
    expect(body.start.metrics.profitPerGuest.value).toBe(90)
  })

  it('hides a rate built on 2 events: enough false, value null, no change', async () => {
    const { body } = await get(OWNER, '?months=6')
    expect(body.latest.metrics.revenuePerEvent).toEqual({ value: null, enough: false, n: 2 })
    expect(body.latest.metrics.profitPct.enough).toBe(false)
    expect(body.change.revenuePerEvent.changePct).toBeNull()
    expect(body.change.profitPct.changePts).toBeNull()
    // counts are never hidden
    expect(body.latest.metrics.eventsClosed.enough).toBe(true)
  })

  it('lists the rule findings in priority order, at most 3', async () => {
    const { body } = await get(OWNER, '?months=6')
    expect(body.findings.map(f => f.key)).toEqual(['below_profit_target', 'closed_with_partial_prices', 'top_not_closed_reason'])
    expect(body.findings[0]).toEqual({ key: 'below_profit_target', value: 2, evidenceCount: 5 })
    expect(body.findings[1].value).toBe(1)
    expect(body.findings[2]).toEqual({ key: 'top_not_closed_reason', value: 'price', evidenceCount: 2 })
  })

  it('finds the supplier that overran over 2 finished events', async () => {
    const db = testDb()
    await db.collection('menuEvents').deleteMany({})
    const fin = id => base(id, {
      stage: 'finished', createdAt: ago(40),
      planSnapshot: { plannedRevenue: 10000, plannedProfitPct: 40, extraCosts: 0 },
      closing: { suppliers: [{ supplierId: 's1', name: 'Dairy', planned: 1000, actualPaid: 1300 }], actualRevenue: 10000, finishedAt: ago(5) },
    })
    await db.collection('menuEvents').insertMany([fin('f1'), fin('f2')])
    const { body } = await get(OWNER, '?months=3')
    const finding = body.findings.find(f => f.key === 'top_supplier_overrun')
    expect(finding.value.name).toBe('Dairy')
    expect(finding.value.overrunPct).toBeCloseTo(30, 4)
    expect(finding.evidenceCount).toBe(2)
  })

  it('has no baseline by default, and maps a stored baseline to metric keys', async () => {
    const none = await get(OWNER)
    expect(none.status).toBe(200)
    expect(none.body.baseline).toBeNull()
    expect(none.body.estimatesOnly).toBeNull()
    expect(none.body.months).toBe(6)

    await testDb().collection('businesses').updateOne({ _id: 'bA' }, { $set: { baseline: { foodCostPct: 32, wastePct: 5, filledAt: 1 } } })
    const { body } = await get(OWNER)
    expect(body.baseline).toEqual({ foodCostPct: 32 })
    expect(body.estimatesOnly).toEqual({ wastePct: 5 })
  })

  it('returns an empty report for a business with no events', async () => {
    await testDb().collection('menuEvents').deleteMany({})
    const { status, body } = await get(OWNER)
    expect(status).toBe(200)
    expect(body.firstEventAt).toBeNull()
    expect(body.comparable).toBe(false)
  })

  it('answers staff 403, another business 403, a bad months 400', async () => {
    expect((await get(STAFF)).status).toBe(403)
    expect((await get(OWNER, '?businessId=bB')).status).toBe(403)
    expect((await get(OWNER, '?months=5')).status).toBe(400)
  })

  it('lets the platform admin read a named business, and answers 404 for an unknown one', async () => {
    const res = await get(ADMIN, '?businessId=bA&months=6')
    expect(res.status).toBe(200)
    expect(res.body.businessName).toBe('A')
    expect(sum(res.body.series.inquiries)).toBe(8)
    expect((await get(ADMIN, '?businessId=nope')).status).toBe(404)
  })

  it('never carries a client name or phone', async () => {
    const text = JSON.stringify((await get(OWNER)).body)
    for (const key of ['clientName', 'clientPhone', 'guestName', 'guestPhone', 'Secret Client', '0500000000']) {
      expect(text).not.toContain(key)
    }
  })
})
