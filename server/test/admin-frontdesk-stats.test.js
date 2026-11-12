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

const ADMIN = { userId: 'boss', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const OWNER = { userId: 'ownerA', businessId: 'bA', businessRole: 'owner' }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const get = (user, query = '') => request(app).get('/api/v1/admin/frontdesk-stats' + query).set(as(user))
const AT = Date.parse('2026-11-02T08:00:00Z')
const RANGE = '?from=2026-10-25&to=2026-11-07'

beforeEach(async () => {
  const db = testDb()
  for (const c of ['users', 'businesses', 'frontDeskProfiles', 'requests', 'bookings', 'decisionLog', 'menuEvents']) await db.collection(c).deleteMany({})
  await db.collection('users').insertMany([
    { _id: 'boss', email: 'boss@test.invalid', name: 'boss', role: 'admin', isPlatformAdmin: true, businessId: 'bBoss', businessRole: 'owner' },
    { _id: 'ownerA', email: 'ownera@test.invalid', name: 'Owner A', businessId: 'bA', businessRole: 'owner' },
  ])
  await db.collection('businesses').insertMany([
    { _id: 'bA', name: 'Alpha, "Cafe"', createdAt: 1 },
    { _id: 'bB', name: 'Beta', createdAt: 1 },
    { _id: '__master__', name: 'Master', createdAt: 1 },
  ])
  await db.collection('requests').insertMany([
    { _id: 'r1', businessId: 'bA', kind: 'table', status: 'approved', channel: 'public_form', createdAt: AT, clientName: 'Secret Client', clientPhone: '0501234567' },
    { _id: 'r2', businessId: 'bA', kind: 'table', status: 'declined', channel: 'manual', createdAt: AT, decline: { reason: 'full' } },
    { _id: 'r3', businessId: 'bB', kind: 'event', status: 'new', channel: 'whatsapp', createdAt: AT },
    { _id: 't1', businessId: 'bB', kind: 'event', status: 'new', channel: 'whatsapp', createdAt: AT, test: true },
  ])
})

describe('GET /admin/frontdesk-stats', () => {
  it('returns one row per business except the master, with the same numbers', async () => {
    const res = await get(ADMIN, RANGE)
    expect(res.status).toBe(200)
    expect(res.body.rows.map(r => r.businessId).sort()).toEqual(['bA', 'bB'])
    const a = res.body.rows.find(r => r.businessId === 'bA')
    expect(a).toMatchObject({ name: 'Alpha, "Cafe"', requests: 2, approved: 1, declined: 1, afterHoursPct: null, medianMinutesToDecision: null, noShowRatePct: null, eventsFromRequests: 0 })
    expect(res.body.rows.find(r => r.businessId === 'bB').requests).toBe(1)
  })

  it('a business owner gets 403', async () => {
    expect((await get(OWNER, RANGE)).status).toBe(403)
  })

  it('a bad range is 400', async () => {
    expect((await get(ADMIN, '?from=2026-11-07&to=2026-10-25')).status).toBe(400)
  })

  it('format=csv returns text/csv with a header row and no client name or phone', async () => {
    const res = await get(ADMIN, RANGE + '&format=csv')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/^text\/csv/)
    expect(res.headers['content-disposition']).toBe('attachment; filename="frontdesk-2026-10-25-2026-11-07.csv"')
    const lines = res.text.trim().split('\n')
    expect(lines[0]).toBe('businessId,name,requests,afterHoursPct,approved,declined,medianMinutesToDecision,noShowRatePct,eventsFromRequests')
    expect(lines).toHaveLength(3)
    expect(res.text).toContain('"Alpha, ""Cafe"""')
    expect(res.text).not.toContain('Secret Client')
    expect(res.text).not.toContain('0501234567')
  })
})
