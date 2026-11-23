'use strict'
/** Plan 676 (C-JOBS): the scheduler and its four jobs, each run twice to prove it happens once. */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const { captureLogs } = require('./helpers/log-capture')
const { seedConversation } = require('./helpers/conversation-fixtures')
const { clearModuleCache } = require('../middleware/require-module')
const { profileWith } = require('../generated/schemas/testing/table-engine-fixtures')
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')
const { setChannelForTest, resetChannelsForTest } = require('../services/channels')
const { runDue, startScheduler, stopScheduler } = require('../jobs/scheduler')
const { resetOrphanHoldsForTest } = require('../jobs/orphan-holds')

let logs
beforeAll(async () => {
  await buildTestApp()
  logs = captureLogs()
}, 60000)
afterAll(async () => { await teardownTestApp() })

const db = () => testDb()
const col = name => db().collection(name)
const DATE = '2026-03-02'
const YESTERDAY = '2026-03-01'
const at = time => jerusalemEpoch(DATE, time)
const DAY = 86400000
const COLS = ['businesses', 'frontDeskProfiles', 'clients', 'conversations', 'messages', 'bookings', 'tableHolds', 'waitlistEntries']
const GUEST = 'Zzyzx Qwerty'
const PHONE = '972521234567'

async function seedBusiness(businessId = 'b1', { modules = ['frontdesk', 'tables'], status = 'pilot', tableService } = {}) {
  await col('businesses').insertOne({ _id: businessId, name: businessId, ownerId: 'own1', createdAt: 1, modules })
  await col('frontDeskProfiles').insertOne({
    ...profileWith({ status, ...(tableService && { tableService }) }), _id: 'p_' + businessId, businessId, slug: 'slug-' + businessId,
  })
  clearModuleCache()
}

let seq = 0
async function seedBooking(over = {}) {
  const id = over._id ?? 'bk' + ++seq
  const startAt = over.startAt ?? at('20:00')
  const doc = {
    _id: id, schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: 1, updatedAt: 1, kind: 'table', status: 'confirmed',
    source: 'phone', date: DATE, time: '20:00', startAt, endAt: startAt + 5400000, durationMinutes: 90, partySize: 2,
    tableKeys: ['table01'], clientId: 'c_' + PHONE, guestName: GUEST, guestPhone: '0521234567',
    statusHistory: [{ status: 'confirmed', at: 1, by: 'own1', byName: 'O', via: 'member' }], publicToken: id.padEnd(32, 'T'), ...over,
  }
  await col('bookings').insertOne(Object.fromEntries(Object.entries(doc).filter(([, v]) => v !== undefined)))
  return doc
}

const holdFor = (bookingId, cell) => ({ _id: `${bookingId}-${cell}`, businessId: 'b1', tableKey: 'table01', cell, bookingId })
const reminderMessages = () => col('messages').find({ 'template.name': 'booking_reminder' }).toArray()

beforeEach(async () => {
  for (const c of COLS) await col(c).deleteMany({})
  resetChannelsForTest()
  resetOrphanHoldsForTest()
})

describe('reminders', () => {
  const TS = { reminderHour: '10:00' }
  async function twoGuests() {
    await seedBusiness('b1', { tableService: TS })
    const a = await seedConversation(db(), { waId: PHONE, test: true })
    const b = await seedConversation(db(), { waId: '972521230000', test: true })
    await seedBooking({ _id: 'bkA', clientId: a.clientId })
    await seedBooking({ _id: 'bkB', clientId: b.clientId, startAt: at('21:00'), time: '21:00' })
  }

  it('sends nothing at 09:59, one reminder per booking at 10:00, nothing more at 10:01, and once for two concurrent runs', async () => {
    await twoGuests()
    await runDue(db(), at('09:59'))
    expect(await reminderMessages()).toHaveLength(0)
    await Promise.all([runDue(db(), at('10:00')), runDue(db(), at('10:00'))])
    const sent = await reminderMessages()
    expect(sent).toHaveLength(2)
    const tok = id => id.padEnd(32, 'T')
    expect(sent.flatMap(m => m.buttons.map(x => x.id)).sort()).toEqual(
      ['CANCEL:' + tok('bkA'), 'CANCEL:' + tok('bkB'), 'CONFIRM:' + tok('bkA'), 'CONFIRM:' + tok('bkB')].sort())
    expect((await col('bookings').find({}).toArray()).every(b => typeof b.remindedAt === 'number')).toBe(true)
    await runDue(db(), at('10:01'))
    expect(await reminderMessages()).toHaveLength(2)
  })

  it('leaves out tomorrow, seated, test, no tables module and no tableKeys', async () => {
    await twoGuests()
    await seedBusiness('b2', { modules: ['frontdesk'] })
    const c = await seedConversation(db(), { businessId: 'b2', waId: '972521239999', test: true })
    await seedBooking({ _id: 'bkOther', businessId: 'b2', clientId: c.clientId })
    await col('bookings').deleteMany({ _id: { $in: ['bkA', 'bkB'] } })
    const { clientId } = { clientId: 'c_' + PHONE }
    await seedBooking({ date: '2026-03-03', clientId })
    await seedBooking({ status: 'seated', clientId })
    await seedBooking({ test: true, clientId })
    await seedBooking({ tableKeys: undefined, clientId })
    await runDue(db(), at('10:30'))
    expect(await col('messages').countDocuments({})).toBe(0)
    expect(await col('bookings').countDocuments({ remindedAt: { $exists: true } })).toBe(0)
  })

  it('stamps and counts a do-not-contact client, a booking with no conversation, and a draft profile on a real transport', async () => {
    await seedBusiness('b1', { tableService: TS })
    await seedConversation(db(), { waId: PHONE, test: true, doNotContact: true })
    await seedBooking({ _id: 'bkD', clientId: 'c_' + PHONE })
    await seedBooking({ _id: 'bkN', clientId: 'nobody' })
    const first = await runDue(db(), at('10:00'))
    expect(first.reminders).toEqual({ sent: 0, noConversation: 1, refused: 1 })
    expect(await col('bookings').countDocuments({ remindedAt: { $exists: true } })).toBe(2)
    expect(await col('messages').countDocuments({})).toBe(0)

    await col('clients').deleteMany({})
    await col('conversations').deleteMany({})
    await col('bookings').deleteMany({})
    await col('frontDeskProfiles').updateOne({ businessId: 'b1' }, { $set: { status: 'draft' } })
    setChannelForTest('sim', { name: 'sim', real: true, clientSource: 'manual', send: async () => ({ providerMessageId: 'x', status: 'sent' }) })
    await seedConversation(db(), { waId: PHONE })
    await seedBooking({ _id: 'bkR', clientId: 'c_' + PHONE })
    const second = await runDue(db(), at('10:00'))
    expect(second.reminders).toEqual({ sent: 0, noConversation: 0, refused: 1 })
    expect(await col('messages').countDocuments({})).toBe(0)
    expect((await col('bookings').findOne({ _id: 'bkR' })).remindedAt).toBe(at('10:00'))
  })
})

describe('no-show', () => {
  async function late(autoNoShow) {
    await seedBusiness('b1', { tableService: { autoNoShow, holdMinutes: 15 } })
    await col('clients').insertOne({ _id: 'c_' + PHONE, businessId: 'b1', name: 'G', counters: { noShows: 0 } })
    const b = await seedBooking({ _id: 'bkL', remindedAt: 1 })
    await col('tableHolds').insertMany([holdFor('bkL', b.startAt), holdFor('bkL', b.startAt + 900000 * 4)])
    return b
  }

  it('waits for the hold, then marks a no-show once, frees the holds and counts it', async () => {
    const b = await late(true)
    await runDue(db(), b.startAt + 14 * 60000)
    expect((await col('bookings').findOne({ _id: 'bkL' })).status).toBe('confirmed')
    await runDue(db(), b.startAt + 16 * 60000)
    const done = await col('bookings').findOne({ _id: 'bkL' })
    expect(done.status).toBe('no_show')
    expect(done.statusHistory.at(-1)).toMatchObject({ status: 'no_show', via: 'server', by: 'server' })
    expect(await col('tableHolds').countDocuments({ bookingId: 'bkL', cell: { $gte: b.startAt + 14 * 60000 } })).toBe(0)
    expect((await col('clients').findOne({})).counters.noShows).toBe(1)
    await runDue(db(), b.startAt + 17 * 60000)
    expect((await col('clients').findOne({})).counters.noShows).toBe(1)
  })

  it('does nothing when autoNoShow is off', async () => {
    const b = await late(false)
    await runDue(db(), b.startAt + 60 * 60000)
    expect((await col('bookings').findOne({ _id: 'bkL' })).status).toBe('confirmed')
  })
})

describe('waiting list', () => {
  it('expires yesterday\'s waiting and notified entries only', async () => {
    await seedBusiness('b1')
    const row = (id, date, status) => ({ _id: id, businessId: 'b1', date, status })
    await col('waitlistEntries').insertMany([
      row('w1', YESTERDAY, 'waiting'), row('w2', YESTERDAY, 'notified'), row('w3', DATE, 'waiting'), row('w4', YESTERDAY, 'seated'),
    ])
    const r = await runDue(db(), at('12:00'))
    expect(r.waitlist).toEqual({ expired: 2 })
    const status = async id => (await col('waitlistEntries').findOne({ _id: id })).status
    expect([await status('w1'), await status('w2'), await status('w3'), await status('w4')]).toEqual(['expired', 'expired', 'waiting', 'seated'])
  })
})

describe('orphan holds', () => {
  it('removes holds with no booking on the second run only; a booking written in between saves them', async () => {
    await seedBusiness('b1')
    await seedBooking({ _id: 'real' })
    await col('tableHolds').insertMany([
      holdFor('real', 1000), holdFor('gone', 2000), holdFor('gone', 3000), holdFor('late', 4000),
    ])
    const first = await runDue(db(), at('12:00'))
    expect(first.orphanHolds).toEqual({ removed: 0 })
    expect(await col('tableHolds').countDocuments({})).toBe(4)
    await seedBooking({ _id: 'late' })
    const second = await runDue(db(), at('12:01'))
    expect(second.orphanHolds).toEqual({ removed: 2 })
    expect((await col('tableHolds').find({}).toArray()).map(h => h.bookingId).sort()).toEqual(['late', 'real'])
  })
})

describe('the timer', () => {
  afterEach(() => stopScheduler())

  it('starts nothing under vitest, ticks when forced, stops cleanly, and never starts twice', async () => {
    const timeouts = () => process.getActiveResourcesInfo().filter(r => r === 'Timeout').length
    const base = timeouts()
    startScheduler(db())
    let calls = 0
    const now = () => { calls++; return at('03:00') }
    startScheduler(db(), { force: true, every: 20, now })
    startScheduler(db(), { force: true, every: 20, now }) // a second call is a no-op
    expect(timeouts()).toBeLessThanOrEqual(base + 1)
    await new Promise(r => setTimeout(r, 100))
    expect(calls).toBeGreaterThanOrEqual(2)
    stopScheduler()
    const stopped = calls
    await new Promise(r => setTimeout(r, 80))
    expect(calls).toBe(stopped)
  })

  it('logs a throwing job as jobs.failed and still runs the others', async () => {
    const waitlist = require('../jobs/waitlist-expire')
    const orig = waitlist.run
    waitlist.run = async () => { throw new Error('boom') }
    try {
      await col('waitlistEntries').insertOne({ _id: 'w9', businessId: 'b1', date: YESTERDAY, status: 'waiting' })
      const r = await runDue(db(), at('12:00'))
      expect(r.waitlist).toEqual({})
      expect(Object.keys(r).sort()).toEqual(['noShow', 'orphanHolds', 'reminders', 'waitlist'])
      expect(logs.byEvent('jobs.failed').some(l => l.job === 'waitlist')).toBe(true)
    } finally {
      waitlist.run = orig
    }
  })
})

describe('logs', () => {
  it('carry counts only: no name, no phone digits', async () => {
    await seedBusiness('b1', { tableService: { reminderHour: '10:00' } })
    const { clientId } = await seedConversation(db(), { waId: PHONE, test: true })
    await seedBooking({ clientId })
    await col('waitlistEntries').insertOne({ _id: 'w1', businessId: 'b1', date: YESTERDAY, status: 'waiting', guestName: GUEST })
    const before = logs.records.length
    await runDue(db(), at('10:00'))
    const lines = logs.records.slice(before)
    const ran = lines.filter(l => l.event === 'jobs.ran')
    expect(ran).toHaveLength(1)
    expect(ran[0].reminders).toEqual({ sent: 1, noConversation: 0, refused: 0 })
    const text = JSON.stringify(lines)
    expect(text).not.toContain(GUEST)
    expect(text).not.toContain('521234567')
  })
})
