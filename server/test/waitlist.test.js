'use strict'
/** Plan 673 (C-WAIT): the waiting list routes: modules, roles, validation, status moves, seat, scope, logs. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { captureLogs } = require('./helpers/log-capture')
const { clearModuleCache } = require('../middleware/require-module')
const { ROOM, profileWith, tableKeyOf } = require('../generated/schemas/testing/table-engine-fixtures')
const { wallOf } = require('../services/table-bookings')

let app
let logs

beforeAll(async () => {
  app = await buildTestApp()
  logs = captureLogs()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'Owner', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'Staff', businessId: 'b1', businessRole: 'staff' }
const FD_ONLY = { userId: 'own2', name: 'Owner2', businessId: 'bFd', businessRole: 'owner' }
const OTHER = { userId: 'own3', name: 'Owner3', businessId: 'b3', businessRole: 'owner' }
const TODAY = wallOf(Date.now()).date
const T1 = tableKeyOf(1)
const T2 = tableKeyOf(2)
const dbc = name => testDb().collection(name)
const NAME = 'Zzyzx Qwerty'
const PHONE = '0587654321'

beforeEach(async () => {
  for (const c of ['businesses', 'frontDeskProfiles', 'floorPlans', 'bookings', 'tableHolds', 'clients', 'waitlistEntries']) await dbc(c).deleteMany({})
  await dbc('businesses').insertMany([
    { _id: 'b1', name: 'one', ownerId: 'own1', createdAt: 1, modules: ['frontdesk', 'tables'] },
    { _id: 'bFd', name: 'fd', ownerId: 'own2', createdAt: 1, modules: ['frontdesk'] },
    { _id: 'b3', name: 'three', ownerId: 'own3', createdAt: 1, modules: ['frontdesk', 'tables'] },
  ])
  clearModuleCache()
  await dbc('frontDeskProfiles').insertOne({ ...profileWith(), _id: 'p1', businessId: 'b1' })
  await dbc('floorPlans').insertOne({ ...ROOM, _id: 'fp1', businessId: 'b1' })
})

const add = (over = {}, user = OWNER) => request(app).post('/api/v1/waitlist').set(as(user))
  .send({ date: TODAY, guestName: NAME, guestPhone: PHONE, partySize: 2, ...over })
const put = (id, action, body, user = OWNER) => request(app).put(`/api/v1/waitlist/${id}/${action}`).set(as(user)).send(body)
const entryOf = id => dbc('waitlistEntries').findOne({ _id: id })

describe('modules, roles and auth', () => {
  it('a member of frontdesk + tables gets 201, the entry is waiting and stamped; staff too', async () => {
    const res = await add()
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ status: 'waiting', businessId: 'b1', createdBy: 'own1', partySize: 2, guestName: NAME })
    expect(typeof res.body.joinedAt).toBe('number')
    expect((await add({}, STAFF)).status).toBe(201)
  })

  it('a business without tables gets 403 MODULE_OFF on all five routes; no token gets 401', async () => {
    const calls = [
      request(app).get(`/api/v1/waitlist?date=${TODAY}`).set(as(FD_ONLY)),
      add({}, FD_ONLY),
      put('x', 'notify', {}, FD_ONLY),
      put('x', 'seat', { tableKeys: [T1] }, FD_ONLY),
      put('x', 'left', {}, FD_ONLY),
    ]
    for (const c of calls) {
      const res = await c
      expect([res.status, res.body.error]).toEqual([403, 'MODULE_OFF'])
    }
    const open = [
      request(app).get(`/api/v1/waitlist?date=${TODAY}`),
      request(app).post('/api/v1/waitlist').send({}),
      request(app).put('/api/v1/waitlist/x/notify').send({}),
      request(app).put('/api/v1/waitlist/x/seat').send({ tableKeys: [T1] }),
      request(app).put('/api/v1/waitlist/x/left').send({}),
    ]
    for (const c of open) expect((await c).status).toBe(401)
  })
})

describe('POST /', () => {
  it('refuses a party of 0 and of 31, a missing name, a date that is not today and an unknown key', async () => {
    expect((await add({ partySize: 0 })).status).toBe(400)
    expect((await add({ partySize: 31 })).status).toBe(400)
    expect((await add({ guestName: '   ' })).status).toBe(400)
    const noName = await request(app).post('/api/v1/waitlist').set(as(OWNER)).send({ date: TODAY, guestPhone: '', partySize: 2 })
    expect(noName.status).toBe(400)
    const other = await add({ date: wallOf(Date.now() + 3 * 86400000).date })
    expect([other.status, other.body.error]).toEqual([400, 'BAD_DATE'])
    expect((await add({ surprise: 1 })).status).toBe(400)
    expect(await dbc('waitlistEntries').countDocuments({})).toBe(0)
  })
})

describe('GET /', () => {
  it('returns the date entries in joinedAt order with a numeric now and never another business', async () => {
    const a = (await add({ guestName: 'A' })).body
    const b = (await add({ guestName: 'B' })).body
    await add({ guestName: 'C' }, OTHER)
    await dbc('waitlistEntries').updateOne({ _id: a._id }, { $set: { joinedAt: b.joinedAt + 10 } })
    const res = await request(app).get(`/api/v1/waitlist?date=${TODAY}`).set(as(OWNER))
    expect(res.status).toBe(200)
    expect(res.body.entries.map(e => e.guestName)).toEqual(['B', 'A'])
    expect(typeof res.body.now).toBe('number')
    const bad = await request(app).get('/api/v1/waitlist?date=nope').set(as(OWNER))
    expect([bad.status, bad.body.error]).toEqual([400, 'BAD_DATE'])
  })
})

describe('notify and left', () => {
  it('notify moves waiting to notified, stamps notifiedAt, a second call is 409 BAD_STATUS, nothing else is written', async () => {
    const id = (await add()).body._id
    const before = { bookings: await dbc('bookings').countDocuments({}), clients: await dbc('clients').countDocuments({}) }
    const res = await put(id, 'notify')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('notified')
    expect(typeof (await entryOf(id)).notifiedAt).toBe('number')
    const again = await put(id, 'notify')
    expect([again.status, again.body.error]).toEqual([409, 'BAD_STATUS'])
    expect({ bookings: await dbc('bookings').countDocuments({}), clients: await dbc('clients').countDocuments({}) }).toEqual(before)
    expect(await dbc('conversations').countDocuments({})).toBe(0)
  })

  it('left moves waiting or notified to left; a seated entry answers 409 BAD_STATUS', async () => {
    const a = (await add()).body._id
    const b = (await add()).body._id
    await put(b, 'notify')
    expect((await put(a, 'left')).status).toBe(200)
    expect((await put(b, 'left')).status).toBe(200)
    expect((await entryOf(b)).status).toBe('left')
    const c = (await add()).body._id
    expect((await put(c, 'seat', { tableKeys: [T1] })).status).toBe(200)
    const res = await put(c, 'left')
    expect([res.status, res.body.error]).toEqual([409, 'BAD_STATUS'])
  })
})

describe('seat', () => {
  it('on a free table: the entry is seated with a bookingId and the walk-in booking exists', async () => {
    const id = (await add()).body._id
    const res = await put(id, 'seat', { tableKeys: [T1] })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('seated')
    const stored = await entryOf(id)
    expect(stored.status).toBe('seated')
    const booking = await dbc('bookings').findOne({ _id: stored.bookingId })
    expect(booking).toMatchObject({ status: 'seated', source: 'walk_in', partySize: 2, guestName: NAME, guestPhone: PHONE, tableKeys: [T1] })
  })

  it('without a phone: the booking is the placeholder client with the name', async () => {
    const id = (await add({ guestPhone: '' })).body._id
    expect((await put(id, 'seat', { tableKeys: [T1] })).status).toBe(200)
    const booking = await dbc('bookings').findOne({ _id: (await entryOf(id)).bookingId })
    expect(booking).toMatchObject({ clientId: '__walk_in__', guestName: NAME })
  })

  it('on a taken table: 409 with the walk-in code, the entry is still waiting and no second booking exists', async () => {
    const first = (await add()).body._id
    await put(first, 'seat', { tableKeys: [T1] })
    const id = (await add({ guestName: 'Next' })).body._id
    const res = await put(id, 'seat', { tableKeys: [T1] })
    expect([res.status, res.body.error]).toEqual([409, 'NO_TABLE'])
    const stored = await entryOf(id)
    expect(stored.status).toBe('waiting')
    expect(stored.bookingId).toBeUndefined()
    expect(await dbc('bookings').countDocuments({})).toBe(1)
  })

  it('a table that is not in the plan: 400 BAD_TABLES, the entry is put back', async () => {
    const id = (await add()).body._id
    const res = await put(id, 'seat', { tableKeys: ['nosuchtable'] })
    expect([res.status, res.body.error]).toEqual([400, 'BAD_TABLES'])
    expect((await entryOf(id)).status).toBe('waiting')
  })

  it('two seat calls for one entry at the same time create exactly one booking', async () => {
    const id = (await add()).body._id
    const results = await Promise.all([put(id, 'seat', { tableKeys: [T1] }), put(id, 'seat', { tableKeys: [T2] })])
    expect(results.map(r => r.status).filter(s => s === 200)).toHaveLength(1)
    expect(await dbc('bookings').countDocuments({})).toBe(1)
    expect((await entryOf(id)).status).toBe('seated')
  })
})

describe('scope and logs', () => {
  it('every route answers 404 for an entry of another business', async () => {
    const id = (await add({}, OTHER)).body._id
    for (const [action, body] of [['notify', {}], ['left', {}], ['seat', { tableKeys: [T1] }]]) {
      expect((await put(id, action, body)).status, action).toBe(404)
    }
    expect((await entryOf(id)).status).toBe('waiting')
  })

  it('the log lines of the five routes hold no name and no phone', async () => {
    const a = (await add()).body._id
    const b = (await add()).body._id
    await request(app).get(`/api/v1/waitlist?date=${TODAY}`).set(as(OWNER))
    await put(a, 'notify')
    await put(a, 'notify')
    await put(a, 'seat', { tableKeys: [T1] })
    await put(b, 'left')
    const text = JSON.stringify(logs.records.filter(r => String(r.event ?? '').startsWith('waitlist.')))
    expect(text).toContain('waitlist.added')
    expect(text).toContain('waitlist.seated')
    expect(text).not.toContain(NAME)
    expect(text).not.toContain(PHONE)
    const all = JSON.stringify(logs.records)
    expect(all).not.toContain(PHONE)
  })
})

describe('notify sends the table-ready message (plan 676)', () => {
  const { seedConversation } = require('./helpers/conversation-fixtures')
  const messages = () => dbc('messages').find({ 'template.name': 'waitlist_table_ready' }).toArray()

  it('sends one template through the open conversation of the entry\'s client and answers sent: true', async () => {
    await dbc('conversations').deleteMany({})
    await dbc('messages').deleteMany({})
    await seedConversation(testDb(), { waId: '972587654321', test: true })
    const id = (await add()).body._id
    const res = await put(id, 'notify')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'notified', sent: true })
    expect(await messages()).toHaveLength(1)
  })

  it('answers sent: false and still stamps notifiedAt with no conversation, and with a do-not-contact client', async () => {
    await dbc('conversations').deleteMany({})
    await dbc('messages').deleteMany({})
    const none = (await add()).body._id
    const r1 = await put(none, 'notify')
    expect([r1.status, r1.body.sent]).toEqual([200, false])
    expect(typeof (await entryOf(none)).notifiedAt).toBe('number')
    await seedConversation(testDb(), { waId: '972587654321', test: true, doNotContact: true })
    const dnc = (await add()).body._id
    const r2 = await put(dnc, 'notify')
    expect([r2.status, r2.body.sent]).toEqual([200, false])
    expect(typeof (await entryOf(dnc)).notifiedAt).toBe('number')
    expect(await messages()).toHaveLength(0)
  })
})
