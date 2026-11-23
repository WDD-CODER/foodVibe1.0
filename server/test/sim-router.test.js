'use strict'
/** Plan 675 - the simulator routes: write as a test guest, and wipe the test data. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { seedBusiness, controllableWait } = require('./helpers/conversation-fixtures')
const { setWaitForTest, resetInboundForTest } = require('../services/inbound')
const { clearModuleCache } = require('../middleware/require-module')

let app
beforeAll(async () => { app = await buildTestApp() }, 60000)
afterAll(async () => { await teardownTestApp() })

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'o', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 's', businessId: 'b1', businessRole: 'staff' }
const ADMIN = { userId: 'boss', role: 'admin', businessId: 'b1', businessRole: 'owner', isPlatformAdmin: true }
const OFF = { userId: 'own3', name: 'o3', businessId: 'b3', businessRole: 'owner' }
const db = c => testDb().collection(c)
const post = (body, who = OWNER) => request(app).post('/api/v1/sim/inbound').set(as(who)).send(body)
const COLS = ['messages', 'conversations', 'clients', 'requests', 'bookings', 'waitlistEntries', 'tableHolds', 'businesses', 'frontDeskProfiles']

beforeEach(async () => {
  for (const c of COLS) await db(c).deleteMany({})
  await seedBusiness(testDb(), { businessId: 'b1' })
  await db('businesses').insertOne({ _id: 'b3', name: 'Off', ownerId: 'own3', createdAt: 3, modules: ['events'] })
  clearModuleCache()
  resetInboundForTest()
})

describe('POST /sim/inbound', () => {
  it('refuses a missing token, staff, a business without the module, and a bad body', async () => {
    expect((await request(app).post('/api/v1/sim/inbound').send({ phone: '0521234567', text: 'x' })).status).toBe(401)
    expect((await post({ phone: '0521234567', text: 'x' }, STAFF)).status).toBe(403)
    const off = await post({ phone: '0521234567', text: 'x' }, OFF)
    expect(off.status).toBe(403)
    expect(off.body).toEqual({ error: 'MODULE_OFF', module: 'frontdesk' })
    expect((await post({ text: 'x' })).body).toEqual({ error: 'BAD_INPUT' })
    expect((await post({ phone: '12', text: 'x' })).status).toBe(400)
    expect((await post({ phone: '0521234567' })).body).toEqual({ error: 'BAD_INPUT' })
  })

  it('refuses the phone of a real client with 409 REAL_CLIENT', async () => {
    await db('clients').insertOne({
      _id: 'c1', businessId: 'b1', name: 'Real', phone: '0521234567', phoneKey: '521234567', createdAt: 1, updatedAt: 1, createdBy: 'x',
    })
    const res = await post({ phone: '052-123-4567', text: 'x' })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'REAL_CLIENT' })
  })

  it('answers before the wait resolves and stores a test client, conversation and message', async () => {
    const w = controllableWait()
    setWaitForTest(w.wait)
    for (const who of [OWNER, ADMIN]) {
      const res = await post({ phone: who === OWNER ? '0521234567' : '0507654321', name: 'Dana', text: 'hello' }, who)
      expect(res.status).toBe(200)
      expect(Object.keys(res.body).sort()).toEqual(['conversationId', 'messageId'])
      expect(await db('conversations').findOne({ _id: res.body.conversationId })).toMatchObject({ test: true, businessId: 'b1' })
      expect(await db('messages').findOne({ _id: res.body.messageId })).toMatchObject({ test: true, direction: 'in', text: 'hello' })
    }
    const client = await db('clients').findOne({ phoneKey: '521234567' })
    expect(client).toMatchObject({ tags: ['test'], kinds: ['lead'], name: 'Dana' })
    w.release()
  })
})

describe('DELETE /sim/test-data', () => {
  it('removes this business\'s test rows only and answers the counts', async () => {
    const t = { businessId: 'b1', test: true }
    await db('conversations').insertMany([{ _id: 'cv1', ...t }, { _id: 'cv2', businessId: 'b1' }])
    await db('messages').insertMany([{ _id: 'm1', providerMessageId: 'p1', ...t }, { _id: 'm2', providerMessageId: 'p2', businessId: 'b1' }, { _id: 'm3', providerMessageId: 'p3', businessId: 'b2', test: true }])
    await db('requests').insertOne({ _id: 'r1', ...t })
    await db('bookings').insertMany([{ _id: 'bk1', ...t }, { _id: 'bk2', businessId: 'b1' }])
    await db('waitlistEntries').insertOne({ _id: 'w1', ...t })
    await db('tableHolds').insertMany([
      { _id: 'h1', businessId: 'b1', bookingId: 'bk1', tableKey: 't', cell: 1 },
      { _id: 'h2', businessId: 'b1', bookingId: 'bk2', tableKey: 't', cell: 2 },
    ])
    await db('clients').insertMany([
      { _id: 'k1', businessId: 'b1', tags: ['test'] }, { _id: 'k2', businessId: 'b1' }, { _id: 'k3', businessId: 'b2', tags: ['test'] },
    ])
    expect((await request(app).delete('/api/v1/sim/test-data').set(as(STAFF))).status).toBe(403)
    const res = await request(app).delete('/api/v1/sim/test-data').set(as(OWNER))
    expect(res.status).toBe(200)
    expect(res.body.deleted).toEqual({
      tableHolds: 1, messages: 1, conversations: 1, requests: 1, bookings: 1, waitlistEntries: 1, clients: 1,
    })
    expect((await db('conversations').find({}).toArray()).map(d => d._id)).toEqual(['cv2'])
    expect((await db('messages').find({}).toArray()).map(d => d._id).sort()).toEqual(['m2', 'm3'])
    expect((await db('bookings').find({}).toArray()).map(d => d._id)).toEqual(['bk2'])
    expect((await db('tableHolds').find({}).toArray()).map(d => d._id)).toEqual(['h2'])
    expect((await db('clients').find({}).toArray()).map(d => d._id).sort()).toEqual(['k2', 'k3'])
  })
})

describe('POST /sim/clock (plan 676)', () => {
  const { seedConversation } = require('./helpers/conversation-fixtures')
  const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')
  const clock = (body, who = OWNER) => request(app).post('/api/v1/sim/clock').set(as(who)).send(body)

  async function setup({ autoNoShow = true, test = true } = {}) {
    await db('frontDeskProfiles').updateOne({ businessId: 'b1' }, { $set: { tableService: { autoNoShow, holdMinutes: 15 } } })
    const { clientId, conversation } = await seedConversation(testDb(), { waId: '972521234567', test })
    const startAt = jerusalemEpoch('2026-03-02', '20:00')
    await db('bookings').insertOne({
      _id: 'bkT', schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: 1, updatedAt: 1, kind: 'table', status: 'confirmed',
      source: 'phone', date: '2026-03-02', time: '20:00', startAt, endAt: startAt + 5400000, durationMinutes: 90, partySize: 2,
      tableKeys: ['table01'], clientId, guestName: 'Dana', guestPhone: '0521234567', test: true,
      statusHistory: [{ status: 'confirmed', at: 1, by: 'own1', byName: 'O', via: 'member' }], publicToken: 'bkT'.padEnd(32, 'T'),
    })
    return conversation
  }

  it('reminder stores the reminder message once; the second call answers ALREADY', async () => {
    const c = await setup()
    const first = await clock({ conversationId: c._id, job: 'reminder' })
    expect([first.status, first.body]).toEqual([200, { job: 'reminder', done: true }])
    expect(await db('messages').countDocuments({ 'template.name': 'booking_reminder' })).toBe(1)
    const again = await clock({ conversationId: c._id, job: 'reminder' })
    expect(again.body).toEqual({ job: 'reminder', done: false, reason: 'ALREADY' })
  })

  it('late moves the test booking to no_show when autoNoShow is on, and answers AUTO_NO_SHOW_OFF when off', async () => {
    const c = await setup()
    expect((await clock({ conversationId: c._id, job: 'late' })).body).toEqual({ job: 'late', done: true })
    expect((await db('bookings').findOne({ _id: 'bkT' })).status).toBe('no_show')
    await db('bookings').deleteMany({})
    await db('conversations').deleteMany({})
    await db('clients').deleteMany({})
    const off = await setup({ autoNoShow: false })
    expect((await clock({ conversationId: off._id, job: 'late' })).body).toEqual({ job: 'late', done: false, reason: 'AUTO_NO_SHOW_OFF' })
    expect((await db('bookings').findOne({ _id: 'bkT' })).status).toBe('confirmed')
  })

  it('refuses a bad body, a real conversation, another business, and staff', async () => {
    const real = await setup({ test: false })
    expect((await clock({ conversationId: real._id, job: 'reminder' })).body).toEqual({ error: 'NOT_TEST' })
    expect((await clock({ conversationId: real._id, job: 'reminder' })).status).toBe(409)
    expect((await clock({ job: 'reminder' })).body).toEqual({ error: 'BAD_INPUT' })
    expect((await clock({ conversationId: real._id, job: 'jump' })).status).toBe(400)
    expect((await clock({ conversationId: 'nope', job: 'late' })).status).toBe(404)
    expect((await clock({ conversationId: real._id, job: 'late' }, STAFF)).status).toBe(403)
  })
})
