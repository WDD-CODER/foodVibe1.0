'use strict'
/** Plan 675 - the one sender: do-not-contact, the window, the test rule, the button limit, a failed send. */

const fs = require('fs')
const path = require('path')
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const { seedBusiness, seedConversation, NOW } = require('./helpers/conversation-fixtures')
const { sendOut } = require('../services/outbound')
const { setChannelForTest, resetChannelsForTest } = require('../services/channels')

beforeAll(async () => { await buildTestApp() }, 60000)
afterAll(async () => { await teardownTestApp() })

const db = () => testDb()
const rows = () => db().collection('messages').find({}).toArray()
const TEXT = { kind: 'text', text: 'hello' }
const TPL = { kind: 'template', template: { name: 'request_received', params: ['Dana'] } }

async function setup(opts = {}, profileStatus = 'active') {
  for (const c of ['messages', 'conversations', 'clients']) await db().collection(c).deleteMany({})
  await seedBusiness(db(), { profileStatus })
  return seedConversation(db(), opts)
}

afterEach(() => resetChannelsForTest())

describe('sendOut', () => {
  it('refuses a client who asked not to be contacted and writes no row (R-02)', async () => {
    const { conversation } = await setup({ doNotContact: true })
    expect(await sendOut(db(), conversation, TEXT, 'server', { now: NOW })).toEqual({ ok: false, reason: 'DO_NOT_CONTACT' })
    expect(await rows()).toHaveLength(0)
  })

  it('keeps the 24-hour window: free text and buttons close, a template passes', async () => {
    const { conversation } = await setup()
    const late = conversation.windowExpiresAt + 1
    expect(await sendOut(db(), conversation, TEXT, 'ai', { now: late })).toEqual({ ok: false, reason: 'WINDOW_CLOSED' })
    const btn = { kind: 'button', text: 'x', buttons: [{ id: 'A:1', title: 'A' }] }
    expect(await sendOut(db(), conversation, btn, 'ai', { now: late })).toEqual({ ok: false, reason: 'WINDOW_CLOSED' })
    expect(await rows()).toHaveLength(0)
    const t = await sendOut(db(), conversation, TPL, 'server', { now: late })
    expect(t.ok).toBe(true)
    expect(t.message).toMatchObject({ kind: 'template', text: '', template: { name: 'request_received', params: ['Dana'] } })
    const ok = await sendOut(db(), conversation, TEXT, 'member', { now: conversation.windowExpiresAt - 1, memberId: 'u1' })
    expect(ok.ok).toBe(true)
    expect(ok.message.status).toBe('delivered')
    expect(ok.message.providerMessageId.startsWith('sim:')).toBe(true)
    expect(ok.message.memberId).toBe('u1')
  })

  it('refuses an unknown template', async () => {
    const { conversation } = await setup()
    const r = await sendOut(db(), conversation, { kind: 'template', template: { name: 'nope', params: [] } }, 'server', { now: NOW })
    expect(r).toEqual({ ok: false, reason: 'BAD_TEMPLATE' })
  })

  it('a real transport needs a pilot or active profile (R-19) and never serves a test conversation', async () => {
    const send = vi.fn(async () => ({ providerMessageId: 'w:1', status: 'sent' }))
    setChannelForTest('sim', { name: 'sim', real: true, clientSource: 'manual', send })
    for (const status of ['draft', 'suspended']) {
      const { conversation } = await setup({}, status)
      expect(await sendOut(db(), conversation, TEXT, 'server', { now: NOW })).toEqual({ ok: false, reason: 'NOT_LIVE' })
    }
    expect(send).not.toHaveBeenCalled()
    const { conversation } = await setup({}, 'pilot')
    expect((await sendOut(db(), conversation, TEXT, 'server', { now: NOW })).ok).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
    await db().collection('messages').deleteMany({})
    const test = await setup({ test: true }, 'active')
    expect(await sendOut(db(), test.conversation, TEXT, 'server', { now: NOW })).toEqual({ ok: false, reason: 'TEST_ONLY' })
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('the simulator sends for a draft profile', async () => {
    const { conversation } = await setup({ test: true }, 'draft')
    const r = await sendOut(db(), conversation, TEXT, 'ai', { now: NOW })
    expect(r.ok).toBe(true)
    expect(r.message.test).toBe(true)
  })

  it('more than three buttons become one numbered text; three stay buttons (R-12)', async () => {
    const { conversation } = await setup()
    const four = ['a', 'b', 'c', 'd'].map(t => ({ id: 'X:' + t, title: t }))
    const r4 = await sendOut(db(), conversation, { kind: 'button', text: 'pick', buttons: four }, 'ai', { now: NOW })
    expect(r4.message.kind).toBe('text')
    expect(r4.message.text.split('\n').slice(-4)).toEqual(['1. a', '2. b', '3. c', '4. d'])
    expect(r4.message.buttons).toBeUndefined()
    const r3 = await sendOut(db(), conversation, { kind: 'button', text: 'pick', buttons: four.slice(0, 3) }, 'ai', { now: NOW + 1 })
    expect(r3.message.kind).toBe('button')
    expect(r3.message.buttons).toHaveLength(3)
  })

  it('keeps a failed row when the transport throws, and moves lastMessageAt', async () => {
    const { conversation } = await setup()
    setChannelForTest('sim', { name: 'sim', real: false, clientSource: 'manual', send: async () => { throw new Error('boom') } })
    const r = await sendOut(db(), conversation, TEXT, 'ai', { now: NOW + 5000 })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('SEND_FAILED')
    const all = await rows()
    expect(all).toHaveLength(1)
    expect(all[0].status).toBe('failed')
    const c = await db().collection('conversations').findOne({ _id: conversation._id })
    expect(c.lastMessageAt).toBe(NOW + 5000)
  })

  it('no other service calls a transport send', () => {
    const root = path.join(__dirname, '..', 'services')
    const hits = []
    const walk = dir => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) { if (e.name !== 'channels') walk(p) } else if (/\.js$/.test(e.name) && e.name !== 'outbound.js') {
          if (/\.send\(db/.test(fs.readFileSync(p, 'utf8'))) hits.push(p)
        }
      }
    }
    walk(root)
    expect(hits).toEqual([])
  })
})
