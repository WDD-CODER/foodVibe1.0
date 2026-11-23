'use strict'
/** Plan 676 (C-CONV): the Confirm and Cancel taps of the reminder, through the one way in. */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const { seedBusiness, NOW } = require('./helpers/conversation-fixtures')
const { handleInbound, setTurnHandler, setWaitForTest, resetInboundForTest } = require('../services/inbound')

beforeAll(async () => { await buildTestApp() }, 60000)
afterAll(async () => { await teardownTestApp() })

const db = () => testDb()
const col = name => db().collection(name)
const WA = '972521234567'
const OTHER_WA = '972507654321'
let n = 0
const tap = (buttonId, over = {}) => handleInbound(db(), {
  businessId: 'b1', channel: 'sim', waId: WA, text: undefined, buttonId, providerMessageId: 'p' + (++n), at: NOW, ...over,
})
const say = (waId = WA) => handleInbound(db(), { businessId: 'b1', channel: 'sim', waId, text: 'hi', providerMessageId: 'p' + (++n), at: NOW })
const templates = name => col('messages').find({ 'template.name': name }).toArray()
const token = id => id.padEnd(32, 'T')
let turn

async function seedBooking(id, clientId, startAt) {
  await col('bookings').insertOne({
    _id: id, schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: 1, updatedAt: 1, kind: 'table', status: 'confirmed',
    source: 'phone', date: '2026-03-02', time: '20:00', startAt, endAt: startAt + 5400000, durationMinutes: 90, partySize: 2,
    tableKeys: ['table01'], clientId, guestName: 'Dana', guestPhone: '0521234567',
    statusHistory: [{ status: 'confirmed', at: 1, by: 'own1', byName: 'O', via: 'member' }], publicToken: token(id),
  })
  await col('tableHolds').insertOne({ _id: id + 'h', businessId: 'b1', tableKey: 'table01', cell: startAt, bookingId: id })
}

const conversationOf = () => col('conversations').findOne({ waId: WA })

beforeEach(async () => {
  for (const c of ['messages', 'conversations', 'clients', 'bookings', 'tableHolds']) await col(c).deleteMany({})
  await seedBusiness(db())
  resetInboundForTest()
  setWaitForTest(async () => {})
  turn = vi.fn(async () => {})
  setTurnHandler(turn)
})

/** The guest writes once (so the client and the conversation exist), then the conversation is put back to `bot`. */
async function guest() {
  await (await say()).settled
  turn.mockClear()
  const conversation = await conversationOf()
  await col('conversations').updateOne({ _id: conversation._id }, { $set: { status: 'bot' } })
  return conversation.clientId
}

describe('Confirm', () => {
  it('stamps guestConfirmedAt and answers once; a second tap changes and sends nothing', async () => {
    const clientId = await guest()
    await seedBooking('bk1', clientId, NOW + 5 * 3600000)
    await (await tap('CONFIRM:' + token('bk1'))).settled
    const first = (await col('bookings').findOne({ _id: 'bk1' })).guestConfirmedAt
    expect(first).toBe(NOW)
    expect(await templates('booking_confirmed')).toHaveLength(1)
    await (await tap('CONFIRM:' + token('bk1'), { at: NOW + 1000 })).settled
    expect((await col('bookings').findOne({ _id: 'bk1' })).guestConfirmedAt).toBe(first)
    expect(await templates('booking_confirmed')).toHaveLength(1)
    expect(turn).not.toHaveBeenCalled()
  })
})

describe('Cancel', () => {
  it('five hours before the start (cutoff 3): cancelled by the guest, holds gone, one cancelled message', async () => {
    const clientId = await guest()
    await seedBooking('bk1', clientId, NOW + 5 * 3600000)
    await (await tap('CANCEL:' + token('bk1'))).settled
    const b = await col('bookings').findOne({ _id: 'bk1' })
    expect(b.status).toBe('cancelled')
    expect(b.statusHistory.at(-1)).toMatchObject({ status: 'cancelled', via: 'guest' })
    expect(await col('tableHolds').countDocuments({ bookingId: 'bk1' })).toBe(0)
    expect(await templates('booking_cancelled')).toHaveLength(1)
    expect(turn).not.toHaveBeenCalled()
  })

  it('two hours before the start: nothing changes and the conversation is human', async () => {
    const clientId = await guest()
    await seedBooking('bk1', clientId, NOW + 2 * 3600000)
    await (await tap('CANCEL:' + token('bk1'))).settled
    expect((await col('bookings').findOne({ _id: 'bk1' })).status).toBe('confirmed')
    expect(await col('tableHolds').countDocuments({ bookingId: 'bk1' })).toBe(1)
    expect(await templates('booking_cancelled')).toHaveLength(0)
    expect((await conversationOf()).status).toBe('human')
    expect(turn).not.toHaveBeenCalled()
  })

  it('a token of another client\'s booking changes nothing and hands over to a person', async () => {
    const clientId = await guest()
    await (await say(OTHER_WA)).settled
    const other = (await col('clients').findOne({ phoneKey: OTHER_WA.slice(-9) }))._id
    turn.mockClear()
    await seedBooking('bk2', other, NOW + 5 * 3600000)
    await col('conversations').updateOne({ waId: WA }, { $set: { status: 'bot' } })
    for (const prefix of ['CANCEL', 'CONFIRM']) {
      await (await tap(`${prefix}:${token('bk2')}`)).settled
      expect((await conversationOf()).status).toBe('human')
      await col('conversations').updateOne({ waId: WA }, { $set: { status: 'bot' } })
    }
    const b = await col('bookings').findOne({ _id: 'bk2' })
    expect(b.status).toBe('confirmed')
    expect(b.guestConfirmedAt).toBeUndefined()
    expect(clientId).not.toBe(other)
    expect(await col('messages').countDocuments({ direction: 'out' })).toBe(0)
    expect(turn).not.toHaveBeenCalled()
  })
})
