'use strict'
/** Plan 687 - the conversations router: list, thread, reply, take over, hand back, close; access; clean logs. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { captureLogs } = require('./helpers/log-capture')
const { seedBusiness, seedConversation } = require('./helpers/conversation-fixtures')
const { clearModuleCache } = require('../middleware/require-module')
const { setTurnHandler, resetInboundForTest } = require('../services/inbound')

let app
let logs
beforeAll(async () => { app = await buildTestApp(); logs = captureLogs() }, 60000)
afterAll(async () => { await teardownTestApp() })

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'o', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 's', businessId: 'b1', businessRole: 'staff' }
const OTHER = { userId: 'own2', name: 'o2', businessId: 'b2', businessRole: 'owner' }
const OFF = { userId: 'own3', name: 'o3', businessId: 'b3', businessRole: 'owner' }
const db = c => testDb().collection(c)
const COLS = ['messages', 'conversations', 'clients', 'businesses', 'frontDeskProfiles']
const BASE = '/api/v1/conversations'
const get = (path, who = OWNER) => request(app).get(BASE + path).set(as(who))
const post = (path, body, who = OWNER) => request(app).post(BASE + path).set(as(who)).send(body)
const put = (path, who = OWNER) => request(app).put(BASE + path).set(as(who)).send({})

const msg = (id, conversationId, at, extra = {}) => ({
  _id: id, businessId: 'b1', conversationId, direction: 'in', author: 'guest', kind: 'text', text: 'hi ' + id,
  at, providerMessageId: 'p_' + id, status: 'delivered', ...extra,
})

beforeEach(async () => {
  for (const c of COLS) await db(c).deleteMany({})
  await seedBusiness(testDb(), { businessId: 'b1' })
  await seedBusiness(testDb(), { businessId: 'b2' })
  await db('businesses').insertOne({ _id: 'b3', name: 'Off', ownerId: 'own3', createdAt: 3, modules: ['events'] })
  clearModuleCache()
})

/** A live conversation of b1 that last heard from the guest just now (inside the window). */
async function seed(opts = {}) {
  const now = Date.now()
  const seeded = await seedConversation(testDb(), { at: now, ...opts })
  return seeded
}

describe('access', () => {
  it('401 without a token, 403 MODULE_OFF without the module, 200 for owner and staff', async () => {
    const { conversation } = await seed()
    const id = conversation._id
    const calls = [
      () => request(app).get(BASE), () => request(app).get(`${BASE}/${id}/messages`),
      () => request(app).post(`${BASE}/${id}/messages`).send({ text: 'x' }),
      () => request(app).put(`${BASE}/${id}/takeover`), () => request(app).put(`${BASE}/${id}/release`), () => request(app).put(`${BASE}/${id}/close`),
    ]
    for (const c of calls) expect((await c()).status).toBe(401)
    for (const r of [get(`/${id}/messages`, OFF), post(`/${id}/messages`, { text: 'x' }, OFF), put(`/${id}/takeover`, OFF), put(`/${id}/release`, OFF), put(`/${id}/close`, OFF)]) {
      const res = await r
      expect(res.status).toBe(403)
    }
    expect((await get('', OFF)).body).toEqual({ error: 'MODULE_OFF', module: 'frontdesk' })
    expect((await get('', OWNER)).status).toBe(200)
    expect((await get('', STAFF)).status).toBe(200)
    expect((await get(`/${id}/messages`, STAFF)).status).toBe(200)
  })

  it('another business gets an empty list and 404 on each /:id route; nothing changes', async () => {
    const { conversation } = await seed()
    const id = conversation._id
    await db('messages').insertOne(msg('m1', id, Date.now()))
    const before = await db('conversations').findOne({ _id: id })
    expect((await get('', OTHER)).body.conversations).toEqual([])
    for (const res of [
      await get(`/${id}/messages`, OTHER), await post(`/${id}/messages`, { text: 'x' }, OTHER),
      await put(`/${id}/takeover`, OTHER), await put(`/${id}/release`, OTHER), await put(`/${id}/close`, OTHER),
    ]) expect(res.status).toBe(404)
    expect(await db('conversations').findOne({ _id: id })).toEqual(before)
    expect(await db('messages').countDocuments({ conversationId: id })).toBe(1)
  })
})

describe('GET /', () => {
  it('lists newest first with client, last and now; status, test, limit and before apply', async () => {
    const a = await seed({ waId: '972521110001' })
    const b = await seed({ waId: '972521110002' })
    const closed = await seed({ waId: '972521110003' })
    const t = await seed({ waId: '972521110004', test: true })
    const T = Date.now()
    await db('conversations').updateOne({ _id: a.conversation._id }, { $set: { lastMessageAt: T - 5000 } })
    await db('conversations').updateOne({ _id: b.conversation._id }, { $set: { lastMessageAt: T - 1000 } })
    await db('conversations').updateOne({ _id: closed.conversation._id }, { $set: { status: 'closed', lastMessageAt: T } })
    await db('messages').insertMany([msg('m1', a.conversation._id, T - 6000), msg('m2', a.conversation._id, T - 5000, { text: 'x'.repeat(200) }), msg('m3', b.conversation._id, T - 1000)])

    const res = await get('')
    expect(res.status).toBe(200)
    expect(typeof res.body.now).toBe('number')
    expect(res.body.conversations.map(c => c._id)).toEqual([b.conversation._id, a.conversation._id])
    expect(res.body.conversations[0].client).toMatchObject({ name: 'Guest' })
    expect(res.body.conversations[0].last).toMatchObject({ text: 'hi m3', direction: 'in', kind: 'text' })
    expect(res.body.conversations[1].last.text).toHaveLength(120)

    expect((await get('?status=closed')).body.conversations.map(c => c._id)).toEqual([closed.conversation._id])
    expect((await get('?test=1')).body.conversations.map(c => c._id)).toEqual([t.conversation._id])

    const first = await get('?limit=1')
    expect(first.body.conversations.map(c => c._id)).toEqual([b.conversation._id])
    const next = await get(`?limit=1&before=${first.body.conversations[0].lastMessageAt}`)
    expect(next.body.conversations.map(c => c._id)).toEqual([a.conversation._id])
    expect((await get('?limit=0')).status).toBe(400)
  })
})

describe('GET /:id/messages', () => {
  it('returns messages in time order and resets unread; peek=1 leaves it', async () => {
    const { conversation } = await seed()
    const id = conversation._id
    const T = Date.now()
    await db('messages').insertMany([msg('m2', id, T - 1000), msg('m1', id, T - 2000), msg('m3', id, T)])
    await db('conversations').updateOne({ _id: id }, { $set: { unread: 3 } })
    const peek = await get(`/${id}/messages?peek=1`)
    expect(peek.body.messages.map(m => m._id)).toEqual(['m1', 'm2', 'm3'])
    expect((await db('conversations').findOne({ _id: id })).unread).toBe(3)
    const res = await get(`/${id}/messages`)
    expect(res.body.messages.map(m => m._id)).toEqual(['m1', 'm2', 'm3'])
    expect(res.body.conversation.unread).toBe(0)
    expect(typeof res.body.now).toBe('number')
    expect((await db('conversations').findOne({ _id: id })).unread).toBe(0)
  })
})

describe('POST /:id/messages', () => {
  it('stores a text reply inside the window and takes a bot conversation over', async () => {
    const { conversation } = await seed()
    const res = await post(`/${conversation._id}/messages`, { text: '  Welcome  ' }, STAFF)
    expect(res.status).toBe(201)
    expect(res.body.conversation).toMatchObject({ status: 'human', assignedTo: 'st1' })
    const row = await db('messages').findOne({ conversationId: conversation._id })
    expect(row).toMatchObject({ author: 'member', memberId: 'st1', status: 'delivered', text: 'Welcome', direction: 'out' })
    expect(await db('conversations').findOne({ _id: conversation._id })).toMatchObject({ status: 'human', assignedTo: 'st1' })
  })

  it('after the window: text 409 WINDOW_CLOSED and nothing stored; a template is stored', async () => {
    const { conversation } = await seed()
    await db('conversations').updateOne({ _id: conversation._id }, { $set: { windowExpiresAt: Date.now() - 1000 } })
    const text = await post(`/${conversation._id}/messages`, { text: 'late' })
    expect(text.status).toBe(409)
    expect(text.body).toEqual({ error: 'WINDOW_CLOSED' })
    expect(await db('messages').countDocuments({ conversationId: conversation._id })).toBe(0)
    const tpl = await post(`/${conversation._id}/messages`, { template: { name: 'need_more_info', values: { text: 'which day?' } } })
    expect(tpl.status).toBe(201)
    expect(await db('messages').countDocuments({ conversationId: conversation._id, kind: 'template' })).toBe(1)
  })

  it('refuses a bad template, a button template, do-not-contact, bad bodies and a closed conversation', async () => {
    const { conversation } = await seed()
    const id = conversation._id
    const bad = await post(`/${id}/messages`, { template: { name: 'nope', values: {} } })
    expect(bad.status).toBe(400)
    expect(bad.body).toEqual({ error: 'BAD_TEMPLATE' })
    const withButtons = await post(`/${id}/messages`, { template: { name: 'booking_reminder', values: { name: 'D', time: '19:00', partySize: '4', token: 'abc' } } })
    expect(withButtons.body).toEqual({ error: 'BAD_TEMPLATE' })
    for (const body of [{ text: 'a', template: { name: 'need_more_info', values: {} } }, { text: '   ' }, { text: 'x'.repeat(4001) }, {}]) {
      const res = await post(`/${id}/messages`, body)
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: 'BAD_INPUT' })
    }
    expect(await db('messages').countDocuments({})).toBe(0)

    await db('clients').updateOne({ _id: conversation.clientId }, { $set: { doNotContact: { at: 1, reason: 'asked', via: 'member' } } })
    const dnc = await post(`/${id}/messages`, { text: 'hi' })
    expect(dnc.status).toBe(409)
    expect(dnc.body).toEqual({ error: 'DO_NOT_CONTACT' })

    await db('conversations').updateOne({ _id: id }, { $set: { status: 'closed' } })
    const closed = await post(`/${id}/messages`, { text: 'hi' })
    expect(closed.status).toBe(409)
    expect(closed.body).toEqual({ error: 'BAD_STATUS' })
  })
})

describe('take over, release, close', () => {
  it('moves a conversation through its states', async () => {
    const { conversation } = await seed()
    const id = conversation._id
    expect((await put(`/${id}/release`)).body).toEqual({ error: 'BAD_STATUS' })
    const t1 = await put(`/${id}/takeover`)
    expect(t1.status).toBe(200)
    expect(t1.body.conversation).toMatchObject({ status: 'human', assignedTo: 'own1' })
    const t2 = await put(`/${id}/takeover`, STAFF)
    expect(t2.body.conversation).toMatchObject({ status: 'human', assignedTo: 'st1' })
    await db('conversations').updateOne({ _id: id }, { $set: { suggestion: 'maybe' } })
    const rel = await put(`/${id}/release`)
    expect(rel.body.conversation.status).toBe('bot')
    const stored = await db('conversations').findOne({ _id: id })
    expect(stored.assignedTo).toBeUndefined()
    expect(stored.suggestion).toBeUndefined()
    await db('conversations').updateOne({ _id: id }, { $set: { suggestion: 'again' } })
    const closed = await put(`/${id}/close`)
    expect(closed.status).toBe(200)
    const after = await db('conversations').findOne({ _id: id })
    expect(after.status).toBe('closed')
    expect(after.liveKey).toBeUndefined()
    expect(after.suggestion).toBeUndefined()
    expect((await put(`/${id}/close`)).body).toEqual({ error: 'BAD_STATUS' })
    expect((await put(`/${id}/takeover`)).body).toEqual({ error: 'BAD_STATUS' })
  })
})

describe('heldAt and hand back (plan 719)', () => {
  it('a member reply and take over store heldAt; a second reply updates it', async () => {
    const { conversation } = await seed()
    const id = conversation._id
    const t0 = Date.now()
    await post(`/${id}/messages`, { text: 'one' })
    expect((await db('conversations').findOne({ _id: id })).heldAt).toBeGreaterThanOrEqual(t0)
    await db('conversations').updateOne({ _id: id }, { $set: { heldAt: 1 } })
    await post(`/${id}/messages`, { text: 'two' })
    expect((await db('conversations').findOne({ _id: id })).heldAt).toBeGreaterThanOrEqual(t0)
    await db('conversations').updateOne({ _id: id }, { $set: { status: 'bot' }, $unset: { heldAt: '', assignedTo: '' } })
    const t1 = Date.now()
    const res = await put(`/${id}/takeover`)
    expect(res.body.conversation.heldAt).toBeGreaterThanOrEqual(t1)
    expect(res.body.conversation.assignedTo).toBe('own1')
  })

  it('release removes heldAt and runs one turn when the newest message is the guest\'s', async () => {
    const { conversation } = await seed()
    const id = conversation._id
    const turn = vi.fn(async () => {})
    setTurnHandler(turn)
    await db('messages').insertOne(msg('g1', id, Date.now()))
    await put(`/${id}/takeover`)
    const res = await put(`/${id}/release`)
    expect(res.status).toBe(200)
    await vi.waitFor(() => expect(turn).toHaveBeenCalledTimes(1))
    expect(turn.mock.calls[0][1]._id).toBe(id)
    expect((await db('conversations').findOne({ _id: id })).heldAt).toBeUndefined()
    resetInboundForTest()
  })

  it('release runs no turn when the newest message is ours', async () => {
    const { conversation } = await seed()
    const id = conversation._id
    const turn = vi.fn(async () => {})
    setTurnHandler(turn)
    await db('messages').insertOne(msg('g1', id, Date.now() - 5000))
    await db('messages').insertOne(msg('o1', id, Date.now(), { direction: 'out', author: 'member' }))
    await put(`/${id}/takeover`)
    await put(`/${id}/release`)
    await new Promise(r => setTimeout(r, 50))
    expect(turn).not.toHaveBeenCalled()
    resetInboundForTest()
  })
})

describe('logs', () => {
  it('carry no name, phone or reply text', async () => {
    const { conversation } = await seed()
    const id = conversation._id
    await db('messages').insertOne(msg('m1', id, Date.now()))
    await get('')
    await get(`/${id}/messages`)
    await post(`/${id}/messages`, { text: 'secret reply text' })
    await put(`/${id}/release`)
    const all = JSON.stringify(logs.records)
    expect(all).not.toContain('Guest')
    expect(all).not.toContain('972521234567')
    expect(all).not.toContain('secret reply text')
    expect(logs.byEvent('conversations.listed').length).toBeGreaterThan(0)
    expect(logs.byEvent('conversations.replied').at(-1)).toMatchObject({ kind: 'text' })
    expect(logs.byEvent('conversations.moved').at(-1)).toMatchObject({ from: 'human', to: 'bot' })
  })
})
