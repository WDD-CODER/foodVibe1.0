'use strict'
/** Plan 559 - the front desk numbers: counts, after hours, decision time, no-shows, events from requests, access. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { isOutsideHours, rangeOf } = require('../services/frontdesk-stats')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'o', businessId: 'b1', businessRole: 'owner' }
const OWNER2 = { userId: 'own2', name: 'o2', businessId: 'b2', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 's', businessId: 'b1', businessRole: 'staff' }
const ADMIN = { userId: 'boss', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const db = c => testDb().collection(c)
const get = (qs, who = OWNER) => request(app).get(`/api/v1/stats/frontdesk${qs}`).set(as(who))

// Winter (UTC+2): Fri 2026-01-09 10:00 Israel = 08:00Z; Mon 2026-01-12 10:00 Israel = 08:00Z.
const FRI = Date.parse('2026-01-09T08:00:00Z')
const MON = Date.parse('2026-01-12T08:00:00Z')
const RANGE = '?from=2026-01-05&to=2026-01-18'
const HOURS = [{ dayIndexes: [0, 1, 2, 3, 4], open: '09:00', close: '18:00' }]
let n = 0
const req = (businessId, over = {}) => ({ _id: `r${++n}`, businessId, kind: 'table', status: 'new', channel: 'public_form', createdAt: MON, ...over })

beforeEach(async () => {
  for (const c of ['requests', 'decisionLog', 'bookings', 'menuEvents', 'frontDeskProfiles', 'businesses']) await db(c).deleteMany({})
  await db('businesses').insertMany([
    { _id: 'b1', name: 'One', ownerId: 'own1', createdAt: 1 },
    { _id: 'b2', name: 'Two', ownerId: 'own2', createdAt: 2 },
    { _id: 'bBoss', name: 'Boss', ownerId: 'boss', createdAt: 3 },
  ])
})

describe('isOutsideHours', () => {
  it('uses Israel local day and time', () => {
    expect(isOutsideHours(HOURS, FRI)).toBe(true)
    expect(isOutsideHours(HOURS, MON)).toBe(false)
    expect(isOutsideHours(HOURS, Date.parse('2026-01-12T16:30:00Z'))).toBe(true) // 18:30 Israel
  })
  it('rangeOf spans whole Israel days', () => {
    const r = rangeOf('2026-01-05', '2026-01-18')
    expect(r.days).toBe(14)
    expect(r.fromMs).toBe(Date.parse('2026-01-04T22:00:00Z'))
    expect(r.toMs).toBe(Date.parse('2026-01-18T22:00:00Z') - 1)
  })
})

describe('GET /stats/frontdesk', () => {
  it('counts the caller business only: totals, channel, kind, outcomes, decline reasons', async () => {
    await db('requests').insertMany([
      req('b1', { channel: 'manual', kind: 'table', status: 'approved' }),
      req('b1', { channel: 'public_form', kind: 'event', status: 'declined', decline: { reason: 'full' } }),
      req('b1', { channel: 'whatsapp', kind: 'tasting', status: 'expired' }),
      req('b1', { channel: 'public_form', kind: 'table', status: 'cancelled' }),
      req('b1', { channel: 'public_form', kind: 'consultation', status: 'needs_info' }),
      req('b1', { createdAt: Date.parse('2025-06-01T00:00:00Z') }), // outside the range
      req('b2'), req('b2'),
    ])
    const res = await get(RANGE)
    expect(res.status).toBe(200)
    expect(res.body.requests).toEqual({
      total: 5, perDay: 5 / 14,
      byChannel: { manual: 1, public_form: 3, whatsapp: 1 },
      byKind: { table: 2, event: 1, tasting: 1, consultation: 1 },
    })
    expect(res.body.outcomes).toEqual({ approved: 1, declined: 1, expired: 1, cancelled: 1, waiting: 1 })
    expect(res.body.declinesByReason).toEqual({ full: 1, out_of_area: 0, below_minimum: 0, date_taken: 0, other: 0 })
    expect(res.body.baseline).toBeNull()
  })

  it('a test request changes no number', async () => {
    const t = req('b1', { test: true })
    await db('requests').insertMany([req('b1'), req('b1', { test: true, status: 'approved' }), t])
    await db('decisionLog').insertOne({ _id: 'd1', businessId: 'b1', requestId: t._id, decidedAction: 'approve', secondsToDecision: 60, at: MON })
    const res = await get(RANGE)
    expect(res.body.requests.total).toBe(1)
    expect(res.body.outcomes.approved).toBe(0)
    expect(res.body.medianMinutesToDecision).toBeNull()
  })

  it('a test request decision row does not count toward the median', async () => {
    const t = req('b1', { test: true })
    await db('requests').insertOne(t)
    const rows = [60, 120, 180].map((s, i) => ({ _id: `dt${i}`, businessId: 'b1', requestId: t._id, decidedAction: 'approve', secondsToDecision: s, at: MON }))
    await db('decisionLog').insertMany(rows)
    expect((await get(RANGE)).body.medianMinutesToDecision).toBeNull()
  })

  it('after hours: guest channels only, from the profile hours; no hours is null', async () => {
    await db('requests').insertMany([
      req('b1', { createdAt: FRI }), req('b1', { createdAt: MON }),
      req('b1', { createdAt: FRI, channel: 'manual' }),
    ])
    expect((await get(RANGE)).body.afterHoursPct).toBeNull()
    await db('frontDeskProfiles').insertOne({ _id: 'p1', businessId: 'b1', hours: HOURS })
    expect((await get(RANGE)).body.afterHoursPct).toBe(50)
  })

  it('median minutes to decision: approve and decline only, null under three rows', async () => {
    const rows = (secs, action = 'approve') => secs.map((s, i) => ({ _id: `d${action}${s}${i}`, businessId: 'b1', requestId: `x${s}`, decidedAction: action, secondsToDecision: s, at: MON }))
    await db('decisionLog').insertMany(rows([60, 120]))
    expect((await get(RANGE)).body.medianMinutesToDecision).toBeNull()
    await db('decisionLog').insertMany([...rows([600], 'decline'), ...rows([99999], 'ask')])
    expect((await get(RANGE)).body.medianMinutesToDecision).toBe(2)
  })

  it('no-show rate over bookings that started in range; fewer than 3 is null', async () => {
    const b = (status, startAt = MON) => ({ _id: `bk${++n}`, businessId: 'b1', status, startAt })
    await db('bookings').insertMany([b('no_show'), b('finished')])
    let res = await get(RANGE)
    expect(res.body.bookings).toEqual({ total: 2, noShowRatePct: null, enough: false })
    await db('bookings').insertMany([b('seated'), b('confirmed'), b('finished', Date.parse('2025-01-01T00:00:00Z'))])
    res = await get(RANGE)
    expect(res.body.bookings.enough).toBe(true)
    expect(res.body.bookings.noShowRatePct).toBeCloseTo(100 / 3)
  })

  it('events from requests: count approved, revenue of closed events', async () => {
    await db('requests').insertMany([
      req('b1', { status: 'approved', kind: 'event', outcome: { type: 'menuEvent', id: 'e1' } }),
      req('b1', { status: 'approved', kind: 'event', outcome: { type: 'menuEvent', id: 'e2' } }),
      req('b1', { status: 'approved', outcome: { type: 'booking', id: 'bk' } }),
    ])
    await db('menuEvents').insertMany([
      { _id: 'e1', businessId: 'b1', closedAt: 5, pricing: { revenue: 1000 } },
      { _id: 'e2', businessId: 'b1', pricing: { revenue: 500 } },
    ])
    expect((await get(RANGE)).body.eventsFromRequests).toEqual({ count: 2, revenue: 1000 })
  })

  it('baseline estimates beside their measured twins', async () => {
    await db('businesses').updateOne({ _id: 'b1' }, { $set: { baseline: { filledAt: 1, phoneInquiriesPerDay: 4, messagesPerDay: 9 } } })
    const res = await get(RANGE)
    expect(res.body.baseline.phoneInquiriesPerDay).toEqual({ estimate: 4, measured: 0 })
    expect(res.body.baseline.messagesPerDay).toEqual({ estimate: 9 })
  })

  it('access: staff 403, owner with another businessId 403, admin with businessId 200, bad range 400', async () => {
    expect((await get(RANGE, STAFF)).status).toBe(403)
    expect((await get(`${RANGE}&businessId=b2`, OWNER)).status).toBe(403)
    expect((await get(`${RANGE}&businessId=b2`, ADMIN)).status).toBe(200)
    expect((await get(`${RANGE}&businessId=nope`, ADMIN)).status).toBe(404)
    expect((await get('?from=2026-02-01&to=2026-01-01')).status).toBe(400)
    expect((await get('?from=2024-01-01&to=2026-01-01')).status).toBe(400)
    expect((await get('?from=abc&to=2026-01-01')).status).toBe(400)
    expect((await get('', OWNER2)).status).toBe(200)
  })
})
