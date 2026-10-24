'use strict'
/** Plan 447 (spec 07.2) - the dashboard numbers are computed on the server, per business, and staff never get money. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { jerusalemDate } = require('../middleware/usage')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const OWNER = { userId: 'ownerA', businessId: 'bA', businessRole: 'owner' }
const STAFF = { userId: 'staffA', businessId: 'bA', businessRole: 'staff' }
const NEW_OWNER = { userId: 'ownerN', businessId: 'bNew', businessRole: 'owner' }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const DAY = 86400000
const ago = days => Date.now() - days * DAY
const dateAgo = days => jerusalemDate(Date.now() - days * DAY)
const dateAhead = days => jerusalemDate(Date.now() + days * DAY)

const snapshot = { suppliers: [{ supplierId: 's1', name: 'S', plannedCost: 5000 }], extraCosts: 1000, plannedRevenue: 12000, plannedProfit: 6000, plannedProfitPct: 50 }
const event = (id, extra = {}) => ({ _id: id, businessId: 'bA', userId: 'x', name: 'ev ' + id, stage: 'inquiry', createdAt: ago(5), eventDate: dateAgo(100), ...extra })
const closedEvent = (id, extra = {}) => event(id, { stage: 'deposit_paid', closedAt: ago(3), pricing: { revenue: 12000 }, ...extra })
const finishedEvent = (id, actualPaid) => closedEvent(id, {
  stage: 'finished',
  planSnapshot: snapshot,
  closing: { suppliers: [{ supplierId: 's1', name: 'S', planned: 5000, actualPaid, arrived: true, hasInvoice: true, photos: [] }], actualRevenue: 12000, finishedAt: ago(1) },
})

const BASELINE = { inquiriesPerMonth: 6, eventsClosedPerMonth: 3, avgRevenuePerEvent: 12000, estProfitPct: 50, filledAt: 1 }

const get = (user, query = '?period=30') => request(app).get('/api/v1/stats/business' + query).set(as(user))

beforeEach(async () => {
  const db = testDb()
  for (const c of ['users', 'businesses', 'usageDays', 'menuEvents']) await db.collection(c).deleteMany({})
  await db.collection('users').insertMany([
    { _id: 'ownerA', name: 'Owner A', businessId: 'bA', businessRole: 'owner' },
    { _id: 'staffA', name: 'Staff A', businessId: 'bA', businessRole: 'staff' },
    { _id: 'ownerN', name: 'Owner N', businessId: 'bNew', businessRole: 'owner' },
  ])
  await db.collection('businesses').insertMany([
    { _id: 'bA', name: 'A', ownerId: 'ownerA', createdAt: ago(200), internal: false, baseline: BASELINE },
    { _id: 'bNew', name: 'New', ownerId: 'ownerN', createdAt: ago(10), internal: false },
    { _id: 'bB', name: 'B', ownerId: 'x', createdAt: ago(200), internal: false },
  ])
  await db.collection('menuEvents').insertMany([
    finishedEvent('f1', 4760), // actual profit 52 %: +2 points
    finishedEvent('f2', 5480), // actual profit 46 %: -4 points
    closedEvent('c3', { eventDate: dateAhead(0) }),
    closedEvent('c4', { eventDate: dateAhead(14) }),
    event('n1', { stage: 'not_closed', notClosedAt: ago(2), eventDate: dateAhead(2) }),
    event('n2', { stage: 'not_closed', notClosedAt: ago(2) }),
    event('n3', { stage: 'not_closed', notClosedAt: ago(2) }),
    event('i1', { eventDate: dateAhead(3), guestCount: 40 }),
    event('i2', { eventDate: dateAhead(15) }),
    event('q1', { stage: 'quote_sent', eventDate: dateAgo(1) }),
    // never counted
    closedEvent('legacy1', { legacy: true, eventDate: dateAhead(5) }),
    closedEvent('deleted1', { deletedAt: 9, eventDate: dateAhead(5) }),
    closedEvent('other1', { businessId: 'bB', eventDate: dateAhead(5) }),
  ])
  const day = (userId, businessId, daysAgo) => ({ _id: `${userId}:${dateAgo(daysAgo)}`, userId, businessId, date: dateAgo(daysAgo), firstAt: 1, lastAt: 2, writeCount: 1 })
  await db.collection('usageDays').insertMany([
    day('ownerA', 'bA', 1), day('staffA', 'bA', 1), day('ownerA', 'bA', 4), day('ownerA', 'bA', 9),
    day('ownerA', 'bA', 60), // outside 30 days
    day('x', 'bB', 2), // other business
  ])
})

describe('GET /api/v1/stats/business', () => {
  it('owner, 30 days: the spec 07.2 numbers', async () => {
    const res = await get(OWNER)
    expect(res.status).toBe(200)
    const { cards, funnel, upcoming } = res.body
    expect(res.body).toMatchObject({ period: '30', periodDays: 30, hasBaseline: true })
    expect(cards.inquiries.value).toBe(10)
    expect(cards.inquiries.changePct).toBeCloseTo(66.67, 2)
    expect(cards.closed).toMatchObject({ value: 4, notClosed: 3 })
    expect(cards.closed.closeRatePct).toBeCloseTo(57.14, 2)
    expect(cards.closed.changePct).toBeCloseTo(33.33, 2)
    expect(cards.revenue).toMatchObject({ value: 48000, baseline: 36000 })
    expect(cards.revenue.changePct).toBeCloseTo(33.33, 2)
    expect(cards.accuracy.finishedCount).toBe(2)
    expect(cards.accuracy.avgAccuracyPts).toBeCloseTo(-1, 9)
    expect(cards.accuracy.avgActualProfitPct).toBeCloseTo(49, 9)
    expect(cards.accuracy.baselineEstProfitPct).toBe(50)
    expect(cards.accuracy.vsBaselinePts).toBeCloseTo(-1, 9)
    expect(cards.usage.activeDays).toBe(3)
    expect(cards.usage.perWeek).toBeCloseTo(3 / (30 / 7), 9)
    expect(funnel.map(f => f.stage)).toEqual(['inquiry', 'quote_sent', 'deposit_paid', 'ordering', 'execution', 'post_production'])
    expect(Object.fromEntries(funnel.map(f => [f.stage, f.count]))).toEqual({
      inquiry: 2, quote_sent: 1, deposit_paid: 2, ordering: 0, execution: 0, post_production: 0,
    })
    expect(upcoming.map(e => e._id)).toEqual(['c3', 'i1', 'legacy1', 'c4'])
    expect(upcoming.find(e => e._id === 'i1')).toEqual({ _id: 'i1', name: 'ev i1', eventDate: dateAhead(3), guestCount: 40, stage: 'inquiry', legacy: false })
    expect(upcoming.find(e => e._id === 'legacy1').legacy).toBe(true)
  })

  it('upcoming holds only today to today + 14 and leaves out lost events and other businesses', async () => {
    const { upcoming } = (await get(OWNER)).body
    const ids = upcoming.map(e => e._id)
    expect(ids).not.toContain('i2') // today + 15
    expect(ids).not.toContain('q1') // yesterday
    expect(ids).not.toContain('n1') // lost
    expect(ids).not.toContain('deleted1')
    expect(ids).not.toContain('other1')
    expect(upcoming.map(e => e.eventDate)).toEqual([...upcoming.map(e => e.eventDate)].sort())
  })

  it('legacy, deleted and other-business events never count', async () => {
    const res = await get(OWNER)
    expect(res.body.cards.closed.value).toBe(4)
    expect(res.body.cards.revenue.value).toBe(48000)
    expect(res.body.cards.inquiries.value).toBe(10)
  })

  it('a reopened event counts by its planned revenue until it is finished again', async () => {
    await testDb().collection('menuEvents').updateOne(
      { _id: 'f1' },
      { $set: { stage: 'post_production', 'pricing.revenue': 11000 }, $unset: { 'closing.finishedAt': '' } },
    )
    const { cards } = (await get(OWNER)).body
    expect(cards.revenue.value).toBe(47000)
    expect(cards.accuracy.finishedCount).toBe(1)
    expect(cards.accuracy.avgAccuracyPts).toBeCloseTo(-4, 9)
  })

  it('an event finished straight from "פנייה" counts once in closed, with its snapshot revenue (plan 493)', async () => {
    await testDb().collection('menuEvents').insertOne(event('direct1', {
      stage: 'finished', closedAt: ago(1), eventDate: dateAgo(2),
      planSnapshot: { ...snapshot, plannedRevenue: 7000, frozenAt: ago(1) },
      closing: { suppliers: [{ supplierId: 's1', name: 'S', planned: 5000, arrived: false, hasInvoice: false, photos: [] }], finishedAt: ago(1), finishedBy: 'ownerA' },
    }))
    const res = await get(OWNER)
    expect(res.status).toBe(200)
    expect(res.body.cards.closed.value).toBe(5)
    expect(res.body.cards.revenue.value).toBe(55000)
  })

  it('staff get the funnel and the upcoming list, and no cards', async () => {
    const res = await get(STAFF)
    expect(res.status).toBe(200)
    expect(res.body).not.toHaveProperty('cards')
    expect(res.body.funnel).toHaveLength(6)
    expect(res.body.upcoming.length).toBeGreaterThan(0)
    expect(JSON.stringify(res.body)).not.toMatch(/revenue|profit|accuracy/i)
  })

  it('a business without a baseline has hasBaseline false and null changes', async () => {
    await testDb().collection('businesses').updateOne({ _id: 'bA' }, { $unset: { baseline: '' } })
    const { hasBaseline, cards } = (await get(OWNER)).body
    expect(hasBaseline).toBe(false)
    expect(cards.inquiries.changePct).toBeNull()
    expect(cards.closed.changePct).toBeNull()
    expect(cards.revenue.changePct).toBeNull()
    expect(cards.accuracy.vsBaselinePts).toBeNull()
    expect(cards.inquiries.value).toBe(10)
  })

  it('a business without events has zeros, a null accuracy and an empty funnel', async () => {
    const res = await get(NEW_OWNER)
    expect(res.status).toBe(200)
    const { cards, funnel, upcoming } = res.body
    expect(cards.inquiries.value).toBe(0)
    expect(cards.closed).toMatchObject({ value: 0, notClosed: 0, closeRatePct: null })
    expect(cards.revenue.value).toBe(0)
    expect(cards.accuracy).toMatchObject({ finishedCount: 0, avgAccuracyPts: null, avgActualProfitPct: null })
    expect(cards.usage.activeDays).toBe(0)
    expect(funnel.every(f => f.count === 0)).toBe(true)
    expect(upcoming).toEqual([])
  })

  it('period=all starts at the business creation date', async () => {
    const res = await get(NEW_OWNER, '?period=all')
    expect(res.status).toBe(200)
    expect(res.body.period).toBe('all')
    expect(res.body.periodDays).toBe(11) // ceil of 10 days and a few ms
    const a = await get(OWNER, '?period=all')
    expect(a.body.periodDays).toBe(201)
    expect(a.body.cards.usage.activeDays).toBe(4) // the 60-day-old day now counts
  })

  it('period=90 widens the window', async () => {
    await testDb().collection('menuEvents').insertOne(event('old', { createdAt: ago(60) }))
    expect((await get(OWNER, '?period=30')).body.cards.inquiries.value).toBe(10)
    const wide = await get(OWNER, '?period=90')
    expect(wide.body.periodDays).toBe(90)
    expect(wide.body.cards.inquiries.value).toBe(11)
  })

  it('rejects other periods and anonymous callers', async () => {
    expect((await get(OWNER, '?period=7')).status).toBe(400)
    expect((await get(OWNER, '?period=abc')).status).toBe(400)
    expect((await request(app).get('/api/v1/stats/business?period=30')).status).toBe(401)
  })
})

describe('accuracy formula on spec 08.1 numbers', () => {
  it('revenue 10,000; A 1,000 to 1,150; B 2,000 to 1,950; extra 1,000 gives 59 % and accuracy -1', async () => {
    const db = testDb()
    await db.collection('menuEvents').deleteMany({})
    await db.collection('menuEvents').insertOne(event('spec', {
      stage: 'finished',
      closedAt: ago(3),
      planSnapshot: {
        suppliers: [{ supplierId: 'a', name: 'A', plannedCost: 1000 }, { supplierId: 'b', name: 'B', plannedCost: 2000 }],
        extraCosts: 1000, plannedRevenue: 10000, plannedProfit: 6000, plannedProfitPct: 60,
      },
      closing: {
        suppliers: [
          { supplierId: 'a', name: 'A', planned: 1000, actualPaid: 1150, arrived: true, hasInvoice: true, photos: [] },
          { supplierId: 'b', name: 'B', planned: 2000, actualPaid: 1950, arrived: true, hasInvoice: true, photos: [] },
        ],
        actualExtraCosts: 1000, actualRevenue: 10000, finishedAt: ago(1),
      },
    }))
    const { cards } = (await get(OWNER)).body
    expect(cards.accuracy.avgActualProfitPct).toBeCloseTo(59, 9)
    expect(cards.accuracy.avgAccuracyPts).toBeCloseTo(-1, 9)
    expect(cards.revenue.value).toBe(10000)
  })

  it('an empty supplier amount counts as planned', async () => {
    const db = testDb()
    await db.collection('menuEvents').deleteMany({})
    await db.collection('menuEvents').insertOne(event('partial', {
      stage: 'finished', closedAt: ago(3), planSnapshot: snapshot,
      closing: { suppliers: [{ supplierId: 's1', name: 'S', planned: 5000, arrived: true, hasInvoice: false, photos: [] }], finishedAt: ago(1) },
    }))
    const { cards } = (await get(OWNER)).body
    expect(cards.accuracy.avgAccuracyPts).toBeCloseTo(0, 9)
    expect(cards.revenue.value).toBe(12000)
  })
})
