'use strict'
/** Plan 559 - front desk numbers: counts by channel and kind, after hours, decision time, no-shows, events from requests, access. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')

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
const get = (user, query = '') => request(app).get('/api/v1/stats/frontdesk' + query).set(as(user))

// Israel is UTC+2 on these dates (summer time ended 2026-10-25): Fri 10:00 local = 08:00Z.
const FRI_10 = Date.parse('2026-10-30T08:00:00Z')
const MON_10 = Date.parse('2026-11-02T08:00:00Z')
const RANGE = '?from=2026-10-25&to=2026-11-07'

const req = (id, extra = {}) => ({
  _id: id, businessId: 'bA', kind: 'table', status: 'new', channel: 'public_form', createdAt: MON_10, ...extra,
})
const decision = (id, requestId, action, seconds, extra = {}) => ({
  _id: id, businessId: 'bA', requestId, decidedAction: action, secondsToDecision: seconds, at: MON_10 + 1000, ...extra,
})
const booking = (id, status, extra = {}) => ({ _id: id, businessId: 'bA', status, startAt: MON_10, ...extra })

beforeEach(async () => {
  const db = testDb()
  for (const c of ['users', 'businesses', 'frontDeskProfiles', 'requests', 'bookings', 'decisionLog', 'menuEvents']) await db.collection(c).deleteMany({})
  await db.collection('users').insertMany([
    { _id: 'ownerA', email: 'ownera@test.invalid', name: 'Owner A', businessId: 'bA', businessRole: 'owner' },
    { _id: 'staffA', email: 'staffa@test.invalid', name: 'Staff A', businessId: 'bA', businessRole: 'staff' },
    { _id: 'boss', email: 'boss@test.invalid', name: 'boss', role: 'admin', isPlatformAdmin: true, businessId: 'bBoss', businessRole: 'owner' },
  ])
  await db.collection('businesses').insertMany([
    { _id: 'bA', name: 'A', ownerId: 'ownerA', createdAt: 1 },
    { _id: 'bB', name: 'B', ownerId: 'x', createdAt: 1 },
  ])
})

describe('counts', () => {
  it('counts requests by channel, kind, outcome and decline reason for the caller only', async () => {
    const db = testDb()
    await db.collection('requests').insertMany([
      req('r1', { channel: 'manual', kind: 'event', status: 'approved' }),
      req('r2', { channel: 'public_form', status: 'declined', decline: { reason: 'full' } }),
      req('r3', { channel: 'whatsapp', kind: 'tasting', status: 'needs_info' }),
      req('r4', { status: 'expired' }),
      req('r5', { createdAt: Date.parse('2026-12-01T08:00:00Z') }), // outside the range
      req('rb', { businessId: 'bB' }),
    ])
    const res = await get(OWNER, RANGE)
    expect(res.status).toBe(200)
    expect(res.body.requests.total).toBe(4)
    expect(res.body.requests.byChannel).toEqual({ manual: 1, public_form: 2, whatsapp: 1 })
    expect(res.body.requests.byKind).toEqual({ table: 2, event: 1, tasting: 1, consultation: 0 })
    expect(res.body.outcomes).toEqual({ approved: 1, declined: 1, expired: 1, cancelled: 0, waiting: 1 })
    expect(res.body.declinesByReason.full).toBe(1)
    expect(res.body.requests.perDay).toBeCloseTo(4 / 14)
  })

  it('a test request changes no number', async () => {
    const db = testDb()
    await db.collection('requests').insertMany([
      req('r1'),
      req('t1', { test: true, status: 'declined', decline: { reason: 'full' }, channel: 'manual' }),
    ])
    await db.collection('decisionLog').insertMany([
      decision('d1', 'r1', 'approve', 60), decision('d2', 'r1', 'approve', 120), decision('d3', 'r1', 'decline', 180),
      decision('dt', 't1', 'decline', 99999),
    ])
    const res = await get(OWNER, RANGE)
    expect(res.body.requests.total).toBe(1)
    expect(res.body.requests.byChannel.manual).toBe(0)
    expect(res.body.outcomes.declined).toBe(0)
    expect(res.body.declinesByReason.full).toBe(0)
    expect(res.body.medianMinutesToDecision).toBe(2)
  })
})

describe('after hours', () => {
  const HOURS = [{ dayIndexes: [0, 1, 2, 3, 4], open: '09:00', close: '18:00' }]

  it('counts a Friday form request after hours, not a Monday one; manual requests are left out', async () => {
    const db = testDb()
    await db.collection('frontDeskProfiles').insertOne({ _id: 'p1', businessId: 'bA', hours: HOURS })
    await db.collection('requests').insertMany([
      req('fri', { createdAt: FRI_10 }),
      req('mon', { createdAt: MON_10 }),
      req('man', { createdAt: FRI_10, channel: 'manual' }),
    ])
    const res = await get(OWNER, RANGE)
    expect(res.body.afterHoursPct).toBe(50)
  })

  it('is null without profile hours', async () => {
    await testDb().collection('requests').insertOne(req('fri', { createdAt: FRI_10 }))
    const res = await get(OWNER, RANGE)
    expect(res.body.afterHoursPct).toBeNull()
  })
})

describe('decision time', () => {
  it('is the median of approve and decline rows in minutes, ask rows left out; null under 3 rows', async () => {
    const db = testDb()
    await db.collection('requests').insertOne(req('r1'))
    await db.collection('decisionLog').insertMany([
      decision('d1', 'r1', 'approve', 60), decision('d2', 'r1', 'decline', 600), decision('d3', 'r1', 'ask', 99999),
    ])
    expect((await get(OWNER, RANGE)).body.medianMinutesToDecision).toBeNull()
    await db.collection('decisionLog').insertOne(decision('d4', 'r1', 'approve', 300))
    expect((await get(OWNER, RANGE)).body.medianMinutesToDecision).toBe(5)
  })
})

describe('bookings', () => {
  it('computes the no-show rate over seated, finished and no_show; fewer than 3 gives null and enough false', async () => {
    const db = testDb()
    await db.collection('bookings').insertMany([booking('b1', 'no_show'), booking('b2', 'finished'), booking('bx', 'cancelled')])
    let res = await get(OWNER, RANGE)
    expect(res.body.bookings).toMatchObject({ noShowRatePct: null, enough: false })
    await db.collection('bookings').insertMany([booking('b3', 'seated'), booking('b4', 'finished'), booking('bb', 'no_show', { businessId: 'bB' })])
    res = await get(OWNER, RANGE)
    expect(res.body.bookings).toMatchObject({ noShowRatePct: 25, enough: true })
  })
})

describe('events from requests', () => {
  it('counts approved requests that became events and sums the closed ones', async () => {
    const db = testDb()
    await db.collection('menuEvents').insertMany([
      { _id: 'e1', businessId: 'bA', closedAt: MON_10, pricing: { revenue: 5000 } },
      { _id: 'e2', businessId: 'bA', pricing: { revenue: 9000 } },
    ])
    await db.collection('requests').insertMany([
      req('r1', { kind: 'event', status: 'approved', outcome: { type: 'menuEvent', id: 'e1' } }),
      req('r2', { kind: 'event', status: 'approved', outcome: { type: 'menuEvent', id: 'e2' } }),
      req('r3', { status: 'approved', outcome: { type: 'booking', id: 'b1' } }),
    ])
    const res = await get(OWNER, RANGE)
    expect(res.body.eventsFromRequests).toEqual({ count: 2, revenue: 5000 })
  })
})

describe('baseline', () => {
  it('shows only filled front desk estimates beside their measured twin', async () => {
    const db = testDb()
    await db.collection('businesses').updateOne({ _id: 'bA' }, { $set: { baseline: { phoneInquiriesPerDay: 10, hostHoursPerWeek: 5 } } })
    await db.collection('requests').insertOne(req('r1'))
    const res = await get(OWNER, RANGE)
    expect(Object.keys(res.body.baseline).sort()).toEqual(['hostHoursPerWeek', 'phoneInquiriesPerDay'])
    expect(res.body.baseline.phoneInquiriesPerDay.estimate).toBe(10)
    expect(res.body.baseline.phoneInquiriesPerDay.measured).toBeCloseTo(1 / 14)
    expect(res.body.baseline.hostHoursPerWeek.measured).toBeNull()
  })
  it('is null when nothing is filled', async () => {
    expect((await get(OWNER, RANGE)).body.baseline).toBeNull()
  })
})

describe('access', () => {
  it('staff 403; owner with another businessId 403; platform admin with businessId 200; unknown 404', async () => {
    expect((await get(STAFF, RANGE)).status).toBe(403)
    expect((await get(OWNER, RANGE + '&businessId=bB')).status).toBe(403)
    const ok = await get(ADMIN, RANGE + '&businessId=bB')
    expect(ok.status).toBe(200)
    expect(ok.body.requests.total).toBe(0)
    expect((await get(ADMIN, RANGE + '&businessId=nope')).status).toBe(404)
  })

  it('from after to, a bad date or a range over 366 days is 400; the default is the last 7 days', async () => {
    expect((await get(OWNER, '?from=2026-11-07&to=2026-10-25')).status).toBe(400)
    expect((await get(OWNER, '?from=nope&to=2026-10-25')).status).toBe(400)
    expect((await get(OWNER, '?from=2024-01-01&to=2026-10-25')).status).toBe(400)
    const res = await get(OWNER)
    expect(res.status).toBe(200)
    expect((Date.parse(res.body.to) - Date.parse(res.body.from)) / 86400000).toBe(6)
  })
})
