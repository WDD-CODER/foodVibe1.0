'use strict'
/** Plan 549 - /api/v1/requests: manual request, status moves, wanted edits, and the generic API's read-only view. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { qualify } = require('../generated/schemas/front-desk/qualify')

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
const ASK = [{ key: 'diet', label: 'תזונה', type: 'text', required: true }]
const TABLE_CONFIG = { enabled: true, questions: ASK, rules: { maxPartySize: 10 }, expireAfterHours: 24 }
const raw = id => testDb().collection('requests').findOne({ _id: id })
const post = (user, body) => request(app).post('/api/v1/requests').set(as(user)).send(body)
const NEW = { kind: 'table', guestName: 'דנה כהן', guestPhone: '052-123 4567', wanted: { partySize: 4 }, answers: [{ questionKey: 'diet', label: 'תזונה', value: 'צמחוני' }] }

async function seedProfile(businessId = 'b1', requestKinds = { table: TABLE_CONFIG }) {
  await testDb().collection('frontDeskProfiles').insertOne({
    _id: 'p_' + businessId, schemaVersion: 2, businessId, createdBy: 'own1', createdAt: 1, updatedAt: 1,
    businessType: 'restaurant', slug: 'place-' + businessId, displayName: 'מקום', hours: [], requestKinds,
    assistant: { level: 0, tone: 'warm' }, status: 'draft',
  })
}

beforeEach(async () => {
  for (const c of ['requests', 'bookings', 'clients', 'frontDeskProfiles']) await testDb().collection(c).deleteMany({})
  await seedProfile()
})

/** A stored request of business b1 in `status`. */
async function seed(id, status) {
  const doc = {
    _id: id, schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: 1, updatedAt: 1,
    kind: 'table', status, channel: 'manual', clientId: 'c1', guestName: 'דנה', guestPhone: '0521234567',
    wanted: { partySize: 4 }, answers: [{ questionKey: 'diet', label: 'תזונה', value: 'x' }],
    statusHistory: [{ status, at: 1, by: 'own1', byName: 'בעלים', via: 'member' }], publicToken: 'T'.repeat(32),
  }
  await testDb().collection('requests').insertOne(doc)
  return doc
}

describe('POST / (manual request)', () => {
  it('staff records a phone request: client created with source manual, counters 1, kinds lead; a +972 repeat reuses it', async () => {
    const res = await post(STAFF, NEW)
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ businessId: 'b1', createdBy: 'st1', channel: 'manual', status: 'qualified', guestName: 'דנה כהן' })
    const clients = await testDb().collection('clients').find({}).toArray()
    expect(clients).toHaveLength(1)
    expect(clients[0]).toMatchObject({ source: 'manual', kinds: ['lead'], counters: { requests: 1 } })
    expect(clients[0].lastContactAt).toEqual(expect.any(Number))
    expect(res.body.clientId).toBe(clients[0]._id)

    const again = await post(STAFF, { ...NEW, guestPhone: '+972 52 123 4567' })
    expect(again.status).toBe(201)
    expect(again.body.clientId).toBe(clients[0]._id)
    const after = await testDb().collection('clients').find({}).toArray()
    expect(after).toHaveLength(1)
    expect(after[0].counters.requests).toBe(2)
    expect(after[0].kinds).toEqual(['lead'])
  })

  it('every required answer given: stored qualified by rules with the qualify reasons', async () => {
    const res = await post(OWNER, { ...NEW, wanted: { partySize: 12 } })
    expect(res.status).toBe(201)
    const expected = qualify(TABLE_CONFIG, { partySize: 12 }, { diet: 'צמחוני' }, { now: Date.now(), hours: [], kind: 'table' })
    expect(res.body.status).toBe('qualified')
    expect(res.body.qualification).toEqual({ ...expected, by: 'rules' })
    expect(res.body.statusHistory).toEqual([{ status: 'qualified', at: expect.any(Number), by: 'own1', byName: 'בעלים', via: 'member' }])
    expect(res.body.publicToken).toHaveLength(32)
  })

  it('a missing required answer is stored needs_info', async () => {
    const res = await post(OWNER, { ...NEW, answers: [] })
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('needs_info')
    expect(res.body.qualification.reasons).toContain('fd_reason_missing_answer|q=diet')
  })

  it('an existing clientId is used; another business\'s client is CLIENT_NOT_FOUND', async () => {
    const first = await post(OWNER, NEW)
    const ok = await post(STAFF, { kind: 'table', clientId: first.body.clientId, wanted: { partySize: 2 }, answers: NEW.answers })
    expect(ok.status).toBe(201)
    expect(ok.body.guestName).toBe('דנה כהן')
    const other = await post(OUTSIDER, { kind: 'table', clientId: first.body.clientId, wanted: {}, answers: [] })
    expect([404, 409]).toContain(other.status)
    await seedProfile('b2')
    const missing = await post(OUTSIDER, { kind: 'table', clientId: first.body.clientId, wanted: {}, answers: [] })
    expect(missing.status).toBe(404)
    expect(missing.body.error).toBe('CLIENT_NOT_FOUND')
  })

  it('bad input is 400 BAD_REQUEST_INPUT; no profile is 409 NO_PROFILE; nothing is written', async () => {
    const bad = await post(OWNER, { kind: 'table', wanted: {} })
    expect(bad.status).toBe(400)
    expect(bad.body.error).toBe('BAD_REQUEST_INPUT')
    const none = await post(OUTSIDER, NEW)
    expect(none.status).toBe(409)
    expect(none.body.error).toBe('NO_PROFILE')
    expect(await testDb().collection('requests').countDocuments()).toBe(0)
    expect(await testDb().collection('clients').countDocuments()).toBe(0)
  })
})

describe('PUT /:id/status', () => {
  const LEGAL = [
    ['new', 'qualified'], ['new', 'needs_info'], ['new', 'cancelled'],
    ['qualified', 'needs_info'], ['qualified', 'cancelled'],
    ['needs_info', 'qualified'], ['needs_info', 'cancelled'],
  ]
  const ALL = ['new', 'qualified', 'needs_info', 'approved', 'declined', 'cancelled', 'expired']
  const ILLEGAL = ALL.flatMap(from => ALL.filter(to => !LEGAL.some(([f, t]) => f === from && t === to)).map(to => [from, to]))

  it.each(LEGAL)('%s -> %s answers 200 and appends one history entry stamped by the actor', async (from, to) => {
    await seed('r1', from)
    const res = await request(app).put('/api/v1/requests/r1/status').set(as(STAFF)).send({ status: to, note: 'כי כך' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe(to)
    expect(res.body.statusHistory).toHaveLength(2)
    expect(res.body.statusHistory[1]).toEqual({ status: to, at: expect.any(Number), by: 'st1', byName: 'עובד', via: 'member', note: 'כי כך' })
  })

  it.each(ILLEGAL)('%s -> %s answers 409 BAD_STATUS and changes nothing', async (from, to) => {
    await seed('r1', from)
    const before = await raw('r1')
    const res = await request(app).put('/api/v1/requests/r1/status').set(as(OWNER)).send({ status: to })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'BAD_STATUS' })
    expect(await raw('r1')).toEqual(before)
  })

  it('an unknown status is 400 and another business\'s request is 404', async () => {
    await seed('r1', 'new')
    expect((await request(app).put('/api/v1/requests/r1/status').set(as(OWNER)).send({ status: 'bogus' })).status).toBe(400)
    expect((await request(app).put('/api/v1/requests/r1/status').set(as(OUTSIDER)).send({ status: 'cancelled' })).status).toBe(404)
  })
})

describe('PUT /:id/wanted', () => {
  it('re-qualifies: filling the missing answer moves needs_info to qualified with one history entry', async () => {
    const made = await post(OWNER, { ...NEW, answers: [] })
    expect(made.body.status).toBe('needs_info')
    const res = await request(app).put(`/api/v1/requests/${made.body._id}/wanted`).set(as(STAFF))
      .send({ wanted: { partySize: 3 }, answers: NEW.answers })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('qualified')
    expect(res.body.wanted).toEqual({ partySize: 3 })
    expect(res.body.qualification.by).toBe('rules')
    expect(res.body.statusHistory).toHaveLength(2)
  })

  it('an unchanged status adds no history entry', async () => {
    const made = await post(OWNER, NEW)
    const res = await request(app).put(`/api/v1/requests/${made.body._id}/wanted`).set(as(OWNER)).send({ wanted: { partySize: 2 } })
    expect(res.status).toBe(200)
    expect(res.body.statusHistory).toHaveLength(1)
    expect(res.body.wanted.partySize).toBe(2)
  })

  it('a decided request is 409 ALREADY_DECIDED', async () => {
    await seed('r1', 'approved')
    const res = await request(app).put('/api/v1/requests/r1/wanted').set(as(OWNER)).send({ wanted: { partySize: 2 } })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'ALREADY_DECIDED' })
  })
})

describe('the generic API reads but never writes requests and bookings', () => {
  it.each(['requests', 'bookings'])('POST, PUT, DELETE on %s answer 405 USE_ROUTER and write nothing', async type => {
    for (const [method, path] of [['post', ''], ['put', '/x1'], ['delete', '/x1'], ['delete', '/bulk'], ['put', '']]) {
      const res = await request(app)[method](`/api/v1/data/${type}${path}`).set(as(OWNER)).send({ status: 'approved' })
      expect(res.status).toBe(405)
      expect(res.body).toEqual({ error: 'USE_ROUTER' })
    }
    expect(await testDb().collection(type).countDocuments()).toBe(0)
  })

  it('GET lists the caller\'s business requests only', async () => {
    await seed('r1', 'qualified')
    const list = await request(app).get('/api/v1/data/requests').set(as(STAFF))
    expect(list.status).toBe(200)
    expect(list.body.map(d => d._id)).toEqual(['r1'])
    expect((await request(app).get('/api/v1/data/requests').set(as(OUTSIDER))).body).toEqual([])
  })
})
