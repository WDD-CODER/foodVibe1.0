'use strict'
/** Plan 675 - the one way in: idempotent, one client per phone, one live conversation, buttons, the wait, no PII in logs. */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const { captureLogs } = require('./helpers/log-capture')
const { seedBusiness, controllableWait, NOW } = require('./helpers/conversation-fixtures')
const {
  handleInbound, registerButton, setTurnHandler, setWaitForTest, resetInboundForTest,
} = require('../services/inbound')
const { closeConversation } = require('../services/conversations')

let logs
beforeAll(async () => { await buildTestApp(); logs = captureLogs() }, 60000)
afterAll(async () => { await teardownTestApp() })

const db = () => testDb()
const WA = '972521234567'
let n = 0
const inbound = (over = {}) => handleInbound(db(), {
  businessId: 'b1', channel: 'sim', waId: WA, text: 'hi', providerMessageId: 'p' + (++n), at: NOW, ...over,
})
const conv = () => db().collection('conversations').find({ businessId: 'b1' }).sort({ createdAt: 1 }).toArray()

beforeEach(async () => {
  for (const c of ['messages', 'conversations', 'clients']) await db().collection(c).deleteMany({})
  await seedBusiness(db())
  resetInboundForTest()
  setWaitForTest(async () => {})
})

describe('handleInbound', () => {
  it('uses the existing client by phone key and creates one for an unknown phone (R-01)', async () => {
    await db().collection('clients').insertOne({
      _id: 'c1', businessId: 'b1', name: 'Dana', phone: '052-1234567', phoneKey: '521234567',
      createdAt: 1, updatedAt: 1, createdBy: 'x',
    })
    const r = await inbound()
    await r.settled
    expect(await db().collection('clients').countDocuments({ businessId: 'b1' })).toBe(1)
    expect((await conv())[0].clientId).toBe('c1')
    await (await inbound({ waId: '972501112222' })).settled
    expect(await db().collection('clients').countDocuments({ businessId: 'b1' })).toBe(2)
    const created = await db().collection('clients').findOne({ phoneKey: '501112222' })
    expect(created).toMatchObject({ tags: ['test'], kinds: ['lead'], source: 'manual' })
  })

  it('stores one message for the same providerMessageId and counts unread once', async () => {
    const a = await inbound({ providerMessageId: 'same' })
    const b = await inbound({ providerMessageId: 'same' })
    await Promise.all([a.settled, b.settled])
    expect(b.duplicate).toBe(true)
    expect(a.duplicate).toBeUndefined()
    expect(await db().collection('messages').countDocuments({})).toBe(1)
    expect((await conv())[0].unread).toBe(1)
  })

  it('waits and joins a burst: one turn, after the second wait; none once the conversation is human (R-03)', async () => {
    const w = controllableWait()
    setWaitForTest(w.wait)
    const turn = vi.fn(async () => {})
    setTurnHandler(turn)
    const first = await inbound({ at: NOW })
    const second = await inbound({ at: NOW + 2000 })
    await new Promise(r => setTimeout(r, 20))
    expect(turn).not.toHaveBeenCalled()
    w.release()
    await Promise.all([first.settled, second.settled])
    expect(turn).toHaveBeenCalledTimes(1)

    turn.mockClear()
    const third = await inbound({ at: NOW + 9000 })
    await db().collection('conversations').updateOne({ businessId: 'b1' }, { $set: { status: 'human' } })
    w.release()
    await third.settled
    expect(turn).not.toHaveBeenCalled()
  })

  it('plan 752: the turn is told when the message came and how long it waited; a folded message adds no call', async () => {
    const w = controllableWait()
    setWaitForTest(w.wait)
    const turn = vi.fn(async () => {})
    setTurnHandler(turn)
    const first = await inbound({ at: NOW })
    const second = await inbound({ at: NOW + 2000 })
    await new Promise(r => setTimeout(r, 20))
    w.release()
    await Promise.all([first.settled, second.settled])
    expect(turn).toHaveBeenCalledTimes(1)
    const options = turn.mock.calls[0][2]
    expect(options.inbound).toEqual({ at: NOW + 2000, waitedMs: expect.any(Number) })
    expect(options.inbound.waitedMs).toBeGreaterThanOrEqual(0)
  })

  it('opens a bot conversation with the window; with no turn handler it ends human; closed starts a new one', async () => {
    const r = await inbound()
    await r.settled
    const [c] = await conv()
    expect(c).toMatchObject({ liveKey: 'sim:' + WA, windowExpiresAt: NOW + 86400000, lastInboundAt: NOW, test: true })
    expect(c.status).toBe('human')

    const turn = vi.fn()
    setTurnHandler(turn)
    await (await inbound()).settled
    expect(turn).not.toHaveBeenCalled()

    await closeConversation(db(), 'b1', c._id, NOW)
    setTurnHandler(async () => {})
    await (await inbound()).settled
    const all = await conv()
    expect(all).toHaveLength(2)
    expect(all[0].liveKey).toBeUndefined()
    expect(all[1].liveKey).toBe('sim:' + WA)
    expect(all[1].status).toBe('bot')
  })

  it('runs a registered button handler with its token and no turn; an unregistered prefix goes to the turn', async () => {
    const spy = vi.fn(async () => {})
    const turn = vi.fn(async () => {})
    registerButton('PING', spy)
    setTurnHandler(turn)
    await (await inbound({ text: undefined, buttonId: 'PING:abc' })).settled
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][1]).toMatchObject({ token: 'abc', at: NOW })
    expect(turn).not.toHaveBeenCalled()
    await (await inbound({ text: undefined, buttonId: 'OTHER:x', at: NOW + 1 })).settled
    expect(turn).toHaveBeenCalledTimes(1)
    const stored = await db().collection('messages').find({ buttonId: 'OTHER:x' }).toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0].kind).toBe('button')
  })

  it('a throwing turn handler is logged and sets the conversation human', async () => {
    setTurnHandler(async () => { throw new Error('boom') })
    await (await inbound()).settled
    expect((await conv())[0].status).toBe('human')
    expect(logs.byEvent('inbound.turn.failed')).toHaveLength(1)
  })

  it('logs carry no name, phone or text', async () => {
    const start = logs.records.length
    for (let i = 0; i < 3; i++) {
      await (await inbound({ guestName: 'Zebulon Quux', text: 'secret-words-' + i, at: NOW + i })).settled
    }
    const text = JSON.stringify(logs.records.slice(start))
    expect(logs.records.length).toBeGreaterThan(start)
    expect(text).not.toContain('Zebulon')
    expect(text).not.toContain(WA)
    expect(text).not.toContain('521234567')
    expect(text).not.toContain('secret-words')
  })
})

describe('back to the assistant (plan 719)', () => {
  const { HUMAN_IDLE_MS } = require('../services/inbound')
  const { conversationSchema } = require('../generated/schemas/entities/conversation.schema')
  const patch = (set, unset) => db().collection('conversations').updateOne(
    { businessId: 'b1' }, { $set: set, ...(unset && { $unset: unset }) }
  )
  const idleAgo = ms => Date.now() - ms
  // Opens a conversation with a no-op turn, then makes it human with the given fields.
  async function humanWith(set) {
    setTurnHandler(async () => {})
    await (await inbound({ at: NOW })).settled
    await patch({ status: 'human', ...set })
  }
  const next = async turn => {
    setTurnHandler(turn)
    await (await inbound({ at: NOW + 60000 })).settled
  }

  it('(a) a failed conversation with no member goes back and runs one turn', async () => {
    await humanWith({ assistantFailed: { at: 1, reason: 'busy' }, suggestion: 'old' })
    const turn = vi.fn(async () => {})
    await next(turn)
    expect(turn).toHaveBeenCalledTimes(1)
    const [c] = await conv()
    expect(c.status).toBe('bot')
    expect(c.suggestion).toBeUndefined()
    expect(conversationSchema.safeParse(c).success).toBe(true)
    expect(logs.byEvent('inbound.back_to_bot').at(-1)).toMatchObject({ why: 'failed' })
  })

  it('(b) a member idle for more than 2 h hands the chat back; (c) 1 h 59 min does not', async () => {
    await humanWith({ assignedTo: 'st1', heldAt: idleAgo(HUMAN_IDLE_MS + 60000) })
    const turn = vi.fn(async () => {})
    await next(turn)
    expect(turn).toHaveBeenCalledTimes(1)
    const [c] = await conv()
    expect(c.status).toBe('bot')
    expect(c.assignedTo).toBeUndefined()
    expect(c.heldAt).toBeUndefined()
    expect(conversationSchema.safeParse(c).success).toBe(true)
    expect(logs.byEvent('inbound.back_to_bot').at(-1)).toMatchObject({ why: 'idle' })

    await patch({ status: 'human', assignedTo: 'st1', heldAt: idleAgo(HUMAN_IDLE_MS - 60000) })
    turn.mockClear()
    await next(turn)
    expect(turn).not.toHaveBeenCalled()
    expect((await conv())[0].status).toBe('human')
  })

  it('(d) a guardrail handoff, (e) do-not-contact and (f) no heldAt stay human', async () => {
    const turn = vi.fn(async () => {})
    await humanWith({})
    await next(turn)
    expect((await conv())[0].status).toBe('human')

    await patch({ status: 'human', assignedTo: 'st1' })
    await next(turn)
    expect((await conv())[0].status).toBe('human')

    await patch({ status: 'human', assistantFailed: { at: 1, reason: 'busy' } }, { assignedTo: '' })
    await db().collection('clients').updateMany({ businessId: 'b1' }, { $set: { doNotContact: { at: 1, reason: 'asked', via: 'member' } } })
    await next(turn)
    expect((await conv())[0].status).toBe('human')
    expect(turn).not.toHaveBeenCalled()
  })

  it('(g) a conversation held by a member recently stays with them', async () => {
    await humanWith({ assignedTo: 'st1', heldAt: Date.now() })
    const turn = vi.fn(async () => {})
    await next(turn)
    expect(turn).not.toHaveBeenCalled()
  })

  it('(h) a burst of two guest messages to a failed conversation runs one turn', async () => {
    await humanWith({ assistantFailed: { at: 1, reason: 'busy' } })
    const w = controllableWait()
    setWaitForTest(w.wait)
    const turn = vi.fn(async () => {})
    setTurnHandler(turn)
    const first = await inbound({ at: NOW + 60000 })
    const second = await inbound({ at: NOW + 62000 })
    await new Promise(r => setTimeout(r, 20))
    w.release()
    await Promise.all([first.settled, second.settled])
    expect(turn).toHaveBeenCalledTimes(1)
  })

  it('(i) two guest messages stored at the same time to a failed conversation still run one turn', async () => {
    await humanWith({ assistantFailed: { at: 1, reason: 'busy' } })
    const turn = vi.fn(async () => {})
    setTurnHandler(turn)
    const [first, second] = await Promise.all([inbound({ at: NOW + 60000 }), inbound({ at: NOW + 62000 })])
    await Promise.all([first.settled, second.settled])
    expect(turn).toHaveBeenCalledTimes(1)
  })
})
