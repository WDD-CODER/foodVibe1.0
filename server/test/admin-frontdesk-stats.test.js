'use strict'
/** Plan 559 - the platform admin's front desk numbers per business, and the CSV. */

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
const ADMIN = { userId: 'boss', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const OWNER = { userId: 'own1', businessId: 'b1', businessRole: 'owner' }
const db = c => testDb().collection(c)
const URL = '/api/v1/admin/frontdesk-stats'
const MON = Date.parse('2026-01-12T08:00:00Z')

beforeEach(async () => {
  for (const c of ['requests', 'decisionLog', 'bookings', 'menuEvents', 'frontDeskProfiles', 'businesses']) await db(c).deleteMany({})
  await db('businesses').insertMany([
    { _id: 'b1', name: 'One, "quoted"', createdAt: 1 },
    { _id: 'b2', name: 'Two', createdAt: 2 },
    { _id: '__master__', name: 'Master', createdAt: 0 },
  ])
  await db('requests').insertMany([
    { _id: 'r1', businessId: 'b1', kind: 'table', status: 'approved', channel: 'public_form', createdAt: MON, guestName: 'SECRETNAME', guestPhone: '0501234567' },
    { _id: 'r2', businessId: 'b1', kind: 'table', status: 'declined', channel: 'manual', createdAt: MON, decline: { reason: 'full' } },
    { _id: 'r3', businessId: 'b2', kind: 'table', status: 'new', channel: 'manual', createdAt: MON },
  ])
})

describe('GET /admin/frontdesk-stats', () => {
  it('returns one row per business with the same numbers (master left out)', async () => {
    const res = await request(app).get(`${URL}?from=2026-01-05&to=2026-01-18`).set(as(ADMIN))
    expect(res.status).toBe(200)
    expect(res.body.from).toBe('2026-01-05')
    const by = Object.fromEntries(res.body.rows.map(r => [r.businessId, r]))
    expect(Object.keys(by).sort()).toEqual(['b1', 'b2'])
    expect(by.b1).toEqual({
      businessId: 'b1', name: 'One, "quoted"', requests: 2, afterHoursPct: null, approved: 1, declined: 1,
      medianMinutesToDecision: null, noShowRatePct: null, eventsFromRequests: 0,
    })
    expect(by.b2.requests).toBe(1)
  })

  it('a business owner gets 403; a bad range 400', async () => {
    expect((await request(app).get(URL).set(as(OWNER))).status).toBe(403)
    expect((await request(app).get(`${URL}?from=2026-02-01&to=2026-01-01`).set(as(ADMIN))).status).toBe(400)
  })

  it('format=csv returns text/csv with a header and no client name or phone', async () => {
    const res = await request(app).get(`${URL}?from=2026-01-05&to=2026-01-18&format=csv`).set(as(ADMIN))
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.headers['content-disposition']).toBe('attachment; filename="frontdesk-2026-01-05-2026-01-18.csv"')
    expect(res.text.charCodeAt(0)).toBe(0xFEFF)
    const lines = res.text.slice(1).trim().split('\r\n')
    expect(lines[0]).toBe('businessId,name,requests,afterHoursPct,approved,declined,medianMinutesToDecision,noShowRatePct,eventsFromRequests')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('"One, ""quoted"""')
    expect(res.text).not.toMatch(/SECRETNAME|0501234567/)
  })
})
