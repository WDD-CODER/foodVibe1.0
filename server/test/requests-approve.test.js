'use strict'
/** Plan 550 - approve, decline and ask on /api/v1/requests, and the decision log they write. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'עובד', businessId: 'b1', businessRole: 'staff' }
const OUTSIDER = { userId: 'out1', name: 'זר', businessId: 'b2', businessRole: 'owner' }
const approve = (user, id, body = {}) => request(app).post(`/api/v1/requests/${id}/approve`).set(as(user)).send(body)
const decline = (user, id, body) => request(app).post(`/api/v1/requests/${id}/decline`).set(as(user)).send(body)
const db = c => testDb().collection(c)
const NAME = 'דנה כהן'
const PHONE = '0521234567'

beforeEach(async () => {
  for (const c of ['requests', 'bookings', 'clients', 'menuEvents', 'frontDeskProfiles', 'decisionLog']) await db(c).deleteMany({})
  await db('frontDeskProfiles').insertOne({
    _id: 'p1', schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: 1, updatedAt: 1,
    businessType: 'restaurant', slug: 'place-b1', displayName: 'מקום', hours: [],
    requestKinds: { table: { enabled: true, questions: [], rules: {}, expireAfterHours: 24, defaultDurationMinutes: 90 } },
    assistant: { level: 0, tone: 'warm' }, status: 'draft',
  })
  await db('clients').insertOne({ _id: 'c1', businessId: 'b1', name: NAME, phone: PHONE, kinds: ['lead'], counters: { requests: 1, bookings: 0, events: 0, noShows: 0, conversations: 0 } })
})

/** A stored request of business b1, created 90 seconds ago. */
async function seed(id, kind, wanted, over = {}) {
  const now = Date.now()
  const doc = {
    _id: id, schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: now - 90_000, updatedAt: now - 90_000,
    kind, status: 'qualified', channel: 'manual', clientId: 'c1', guestName: NAME, guestPhone: PHONE,
    wanted, answers: [{ questionKey: 'diet', label: 'תזונה', value: 'צמחוני' }, { questionKey: 'a', label: 'אלרגיה', value: 'אגוזים' }],
    qualification: { verdict: 'fit', reasons: [], by: 'rules' },
    statusHistory: [{ status: 'qualified', at: now - 90_000, by: 'own1', byName: 'בעלים', via: 'member' }],
    publicToken: id.padEnd(32, 'T'), ...over,
  }
  await db('requests').insertOne(doc)
  return doc
}

describe('approve an event request', () => {
  it('creates one inquiry event equal to a generic-POST event, with the answers as the first note', async () => {
    await seed('r1', 'event', { date: '2026-12-24', partySize: 40, eventTypeKey: 'wedding' })
    const res = await approve(OWNER, 'r1')
    expect(res.status).toBe(200)
    const events = await db('menuEvents').find({}).toArray()
    expect(events).toHaveLength(1)
    const ev = events[0]
    expect(res.body.request).toMatchObject({ status: 'approved', outcome: { type: 'menuEvent', id: ev._id } })
    expect(ev).toMatchObject({
      stage: 'inquiry', clientId: 'c1', clientName: NAME, clientPhone: PHONE, guestCount: 40, eventDate: '2026-12-24',
      eventType: 'wedding', name: `${NAME} wedding 2026-12-24`, createdBy: 'own1', businessId: 'b1',
    })
    expect(ev.notes).toHaveLength(1)
    expect(ev.notes[0].text).toBe('תזונה: צמחוני\nאלרגיה: אגוזים')

    const generic = await request(app).post('/api/v1/data/menuEvents').set(as(OWNER)).send({
      name: ev.name, clientId: 'c1', clientName: NAME, clientPhone: PHONE, eventDate: '2026-12-24', guestCount: 40,
      eventType: 'wedding', servingType: '', sections: [],
    })
    expect(generic.status).toBe(201)
    const strip = ({ _id, _masterId, createdAt, updatedAt, notes, stageHistory, ...rest }) => ({ ...rest, history: stageHistory.map(({ at, ...h }) => h) })
    expect(strip(ev)).toEqual(strip(generic.body))
  })

  it('updates the client: lead replaced by event_client, events counter + 1', async () => {
    await seed('r1', 'event', { date: '2026-12-24', partySize: 40 })
    await approve(OWNER, 'r1')
    const client = await db('clients').findOne({ _id: 'c1' })
    expect(client.kinds).toEqual(['event_client'])
    expect(client.counters.events).toBe(1)
  })
})

describe('approve a booking request', () => {
  it('table: a confirmed booking with the profile duration, linked both ways, kinds diner', async () => {
    await seed('r1', 'table', { date: '2026-12-24', time: '19:30', partySize: 4 })
    const res = await approve(STAFF, 'r1')
    expect(res.status).toBe(200)
    const bookings = await db('bookings').find({}).toArray()
    expect(bookings).toHaveLength(1)
    const startAt = jerusalemEpoch('2026-12-24', '19:30')
    expect(bookings[0]).toMatchObject({
      kind: 'table', status: 'confirmed', source: 'request', requestId: 'r1', startAt, endAt: startAt + 90 * 60000,
      durationMinutes: 90, partySize: 4, clientId: 'c1', createdBy: 'st1',
    })
    expect(res.body.outcome._id).toBe(bookings[0]._id)
    expect((await db('requests').findOne({ _id: 'r1' })).outcome).toEqual({ type: 'booking', id: bookings[0]._id })
    const client = await db('clients').findOne({ _id: 'c1' })
    expect(client.kinds).toEqual(['diner'])
    expect(client.counters.bookings).toBe(1)
  })

  it('a kind without a configured duration uses 60 minutes; consultation needs no party size', async () => {
    await seed('r1', 'consultation', { date: '2026-12-24', time: '10:00' })
    expect((await approve(OWNER, 'r1')).status).toBe(200)
    expect(await db('bookings').findOne({})).toMatchObject({ durationMinutes: 60, partySize: 1, kind: 'consultation' })
    expect((await db('clients').findOne({ _id: 'c1' })).kinds).toEqual(['event_client'])
  })

  it('missing date or time: 400 MISSING_BOOKING_FIELDS, request untouched; an override fixes it and is logged as edited', async () => {
    await seed('r1', 'table', { partySize: 4 })
    const bad = await approve(OWNER, 'r1')
    expect(bad.status).toBe(400)
    expect(bad.body).toEqual({ error: 'MISSING_BOOKING_FIELDS', fields: ['date', 'time'] })
    expect((await db('requests').findOne({ _id: 'r1' })).status).toBe('qualified')
    expect(await db('bookings').countDocuments()).toBe(0)
    const ok = await approve(OWNER, 'r1', { wanted: { date: '2026-12-24', time: '20:00', partySize: 4 } })
    expect(ok.status).toBe(200)
    const [row] = await db('decisionLog').find({}).toArray()
    expect(row.editedFields.sort()).toEqual(['date', 'time'])
  })

  it('a bad wanted override: 400 BAD_REQUEST_INPUT', async () => {
    await seed('r1', 'table', { date: '2026-12-24', time: '19:30', partySize: 4 })
    expect((await approve(OWNER, 'r1', { wanted: { partySize: 0 } })).body.error).toBe('BAD_REQUEST_INPUT')
  })
})

describe('idempotency', () => {
  it('a second approve and a decline of a decided request: 409 ALREADY_DECIDED, one outcome', async () => {
    await seed('r1', 'table', { date: '2026-12-24', time: '19:30', partySize: 4 })
    expect((await approve(OWNER, 'r1')).status).toBe(200)
    const again = await approve(OWNER, 'r1')
    expect([again.status, again.body]).toEqual([409, { error: 'ALREADY_DECIDED' }])
    const dec = await decline(OWNER, 'r1', { reason: 'full' })
    expect([dec.status, dec.body]).toEqual([409, { error: 'ALREADY_DECIDED' }])
    expect(await db('bookings').countDocuments()).toBe(1)
  })

  it('two approves at the same time: one 200, one 409, one outcome', async () => {
    await seed('r1', 'table', { date: '2026-12-24', time: '19:30', partySize: 4 })
    const results = await Promise.all([approve(OWNER, 'r1'), approve(STAFF, 'r1')])
    expect(results.map(r => r.status).sort()).toEqual([200, 409])
    expect(await db('bookings').countDocuments()).toBe(1)
    expect(await db('decisionLog').countDocuments()).toBe(1)
  })

  it('another business gets 404 and nothing changes', async () => {
    await seed('r1', 'table', { date: '2026-12-24', time: '19:30', partySize: 4 })
    expect((await approve(OUTSIDER, 'r1')).status).toBe(404)
    expect((await db('requests').findOne({ _id: 'r1' })).status).toBe('qualified')
  })
})

describe('decline', () => {
  it('stores the reason, text, time and member', async () => {
    await seed('r1', 'table', { partySize: 4 })
    const res = await decline(OWNER, 'r1', { reason: 'date_taken', text: 'x' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'declined', decline: { reason: 'date_taken', text: 'x', by: 'own1' } })
    expect(typeof res.body.decline.at).toBe('number')
    expect(res.body.statusHistory.at(-1)).toMatchObject({ status: 'declined', via: 'member', note: 'x' })
  })

  it('a reason outside the list: 400 BAD_REASON, nothing changes', async () => {
    await seed('r1', 'table', { partySize: 4 })
    const res = await decline(OWNER, 'r1', { reason: 'nope' })
    expect([res.status, res.body.error]).toEqual([400, 'BAD_REASON'])
    expect((await db('requests').findOne({ _id: 'r1' })).status).toBe('qualified')
  })
})

describe('decision log', () => {
  const BASE_KEYS = ['_id', 'schemaVersion', 'businessId', 'createdBy', 'createdAt', 'updatedAt']
  const CONTRACT_KEYS = ['requestId', 'verdict', 'decidedAction', 'decidedBy', 'editedFields', 'secondsToDecision', 'at']

  it('approve, decline and ask each write one row with only the contract keys and no personal data', async () => {
    await seed('r1', 'table', { date: '2026-12-24', time: '19:30', partySize: 4 })
    await seed('r2', 'table', { partySize: 2 })
    await seed('r3', 'table', { partySize: 2 })
    await approve(OWNER, 'r1', { wanted: { partySize: 6 } })
    await decline(STAFF, 'r2', { reason: 'full', text: 'סיבה' })
    const ask = await request(app).put('/api/v1/requests/r3/status').set(as(OWNER)).send({ status: 'needs_info' })
    expect(ask.status).toBe(200)

    const rows = await db('decisionLog').find({}).sort({ requestId: 1 }).toArray()
    expect(rows.map(r => [r.requestId, r.decidedAction, r.decidedBy, r.editedFields])).toEqual([
      ['r1', 'approve', 'own1', ['partySize']],
      ['r2', 'decline', 'st1', []],
      ['r3', 'ask', 'own1', []],
    ])
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual([...BASE_KEYS, ...CONTRACT_KEYS].sort())
      expect(row).toMatchObject({ verdict: 'fit', businessId: 'b1' })
      expect(row.secondsToDecision).toBeGreaterThanOrEqual(89)
      const text = JSON.stringify(row)
      for (const secret of [NAME, PHONE, 'דנה', 'סיבה']) expect(text).not.toContain(secret)
    }
  })

  it('a suggestion on the request is copied into the row', async () => {
    await seed('r1', 'table', { partySize: 2 }, { suggested: { action: 'decline', at: 1 } })
    await decline(OWNER, 'r1', { reason: 'other' })
    expect((await db('decisionLog').findOne({})).suggestion).toBe('decline')
  })
})
