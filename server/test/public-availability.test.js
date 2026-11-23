'use strict'
/** Plan 669 (C-PUBAVAIL, C-TABLES): free times, automatic confirmation and the guest's own booking on the public door. */
const request = require('supertest')
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const { captureLogs } = require('./helpers/log-capture')
const { clearModuleCache } = require('../middleware/require-module')
const { profileWith, tableKind } = require('../generated/schemas/testing/table-engine-fixtures')
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')
const { wallOf } = require('../services/table-bookings')
const holds = require('../services/table-holds')

let app
let logs

beforeAll(async () => {
  app = await buildTestApp()
  logs = captureLogs()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const DAY = 86400000
const DATE = wallOf(Date.now() + 2 * DAY).date
const NEXT_DATE = wallOf(jerusalemEpoch(DATE, '12:00') + DAY).date
const PHONE = '052-123 4567'
const PHONE_DIGITS = '0521234567'
const NAME = 'דנה כהן'
const SMALL = 'tablea1x'
const BIG = 'tableb2x'
const OFFLINE = 'tablec3x'
const NUMBERS = ['Q17', 'Q18', 'Q19']
const HOURS = [{ days: 'א-ש', time: '08:00-23:00', dayIndexes: [0, 1, 2, 3, 4, 5, 6], open: '08:00', close: '23:00' }]
const col = name => testDb().collection(name)
const BODY = { kind: 'table', guestName: NAME, guestPhone: PHONE, wanted: { date: DATE, time: '19:00', partySize: 3 }, answers: [], consentTerms: true }
const send = (slug, body = BODY) => request(app).post(`/api/v1/public/${slug}/requests`).send(body)
const free = (slug, query = `date=${DATE}&partySize=3`) => request(app).get(`/api/v1/public/${slug}/availability?${query}`)
const seen = []
const keep = res => {
  seen.push(JSON.stringify(res.body))
  return res
}

const table = (key, number, areaKey, minSeats, maxSeats, online = true) => ({
  key, number, areaKey, shape: 'square', minSeats, maxSeats, x: 0, y: 0, w: 2, h: 2, turned: false, active: true, online,
})

async function seedBusiness(businessId, slug, modules, confirmMode, status = 'pilot') {
  await col('businesses').insertOne({ _id: businessId, name: slug, ownerId: 'own', createdAt: 1, modules })
  await col('frontDeskProfiles').insertOne({
    ...profileWith({
      businessId, slug, status, hours: HOURS, displayName: 'Place ' + slug, requestKinds: { table: tableKind() },
      tableService: { confirmMode, autoMaxParty: 4 },
    }),
    _id: 'p_' + slug,
  })
  if (!modules.includes('tables')) return
  await col('floorPlans').insertOne({
    _id: 'fp_' + businessId, schemaVersion: 2, businessId, createdBy: 'own', createdAt: 1, updatedAt: 1, grid: { cols: 20, rows: 20 },
    areas: [{ key: 'inside', name: 'Inside', order: 0 }, { key: 'outside', name: 'Outside', order: 1 }],
    tables: [
      table(SMALL, NUMBERS[0], 'inside', 1, 2),
      table(BIG, NUMBERS[1], 'outside', 2, 4),
      table(OFFLINE, NUMBERS[2], 'inside', 2, 4, false),
    ],
    joins: [],
  })
}

const AUTO = 'auto-place'
const MANUAL = 'manual-place'
const PLAIN = 'plain-place'

beforeEach(async () => {
  for (const c of ['businesses', 'frontDeskProfiles', 'floorPlans', 'requests', 'clients', 'bookings', 'tableHolds', 'decisionLog']) await col(c).deleteMany({})
  clearModuleCache()
  await seedBusiness('bAuto', AUTO, ['frontdesk', 'tables'], 'auto')
  await seedBusiness('bMan', MANUAL, ['frontdesk', 'tables'], 'manual')
  await seedBusiness('bPlain', PLAIN, ['frontdesk'], 'manual')
  await seedBusiness('bDraft', 'draft-place', ['frontdesk', 'tables'], 'auto', 'draft')
  seen.length = 0
})

/** Holds the big table for the whole of `date` (the offline table is free but never offered). */
const holdAllDay = (businessId, date) =>
  holds.claim(testDb(), { _id: 'blocker-' + date, businessId }, [BIG], jerusalemEpoch(date, '06:00'), jerusalemEpoch(date, '23:59'))

describe('GET /:slug/availability', () => {
  it('answers one slot per time of the day and marks a held time', async () => {
    const day = await free(AUTO)
    expect(day.status).toBe(200)
    expect(Object.keys(day.body)).toEqual(['slots'])
    expect(day.body.slots.length).toBeGreaterThan(20)
    expect(day.body.slots.every(s => Object.keys(s).sort().join() === 'available,time')).toBe(true)
    expect(day.body.slots.find(s => s.time === '19:00').available).toBe(true)
    await holds.claim(testDb(), { _id: 'x1', businessId: 'bAuto' }, [BIG], jerusalemEpoch(DATE, '19:00'), jerusalemEpoch(DATE, '21:00'))
    const held = await free(AUTO)
    expect(held.body.slots.find(s => s.time === '19:00').available).toBe(false)
    expect(held.body.slots.find(s => s.time === '12:00').available).toBe(true)
    expect(held.body.next).toBeUndefined()
  })

  it('never offers a table that is not online and gives the next free time when the day is full', async () => {
    await holdAllDay('bAuto', DATE)
    const res = await free(AUTO)
    expect(res.status).toBe(200)
    expect(res.body.slots.every(s => !s.available)).toBe(true)
    expect(res.body.next).toEqual({ date: NEXT_DATE, time: '08:00' })
  })

  it('answers 404 NOT_FOUND for tables off, a draft profile and an unknown slug; 400 for bad input', async () => {
    for (const slug of [PLAIN, 'draft-place', 'nobody-here']) {
      const res = await free(slug)
      expect(res.status).toBe(404)
      expect(res.body).toEqual({ error: 'NOT_FOUND' })
    }
    for (const query of ['date=2026-13-40&partySize=3', `date=${DATE}&partySize=0`, `date=${DATE}&partySize=31`, `date=${DATE}&partySize=x`, `date=${DATE}`, `date=${DATE}&partySize=2&area=A!`]) {
      const res = await free(AUTO, query)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('BAD_REQUEST_INPUT')
    }
  })
})

describe('GET /:slug (table block)', () => {
  it('shows the areas that have an online table, and nothing for a business without tables', async () => {
    const res = keep(await request(app).get(`/api/v1/public/${AUTO}`))
    expect(res.body.tableBooking).toEqual({ areas: [{ key: 'inside', name: 'Inside' }, { key: 'outside', name: 'Outside' }] })
    expect((await request(app).get(`/api/v1/public/${PLAIN}`)).body.tableBooking).toBeUndefined()
  })
})

describe('POST /:slug/requests with tables', () => {
  it('confirms at once in auto mode and writes the request, booking, holds and counter', async () => {
    const res = keep(await send(AUTO))
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ confirmed: true, booking: { date: DATE, time: '19:00', partySize: 3 } })
    expect(Object.keys(res.body).sort()).toEqual(['booking', 'confirmed', 'reference', 'token'])
    const stored = await col('requests').findOne({})
    const booking = await col('bookings').findOne({})
    expect(stored.status).toBe('approved')
    expect(stored.statusHistory.at(-1)).toMatchObject({ status: 'approved', via: 'server', by: 'server' })
    expect(stored.outcome).toEqual({ type: 'booking', id: booking._id })
    expect(booking).toMatchObject({ status: 'confirmed', source: 'request', requestId: stored._id, tableKeys: [BIG] })
    expect((await col('tableHolds').countDocuments({ bookingId: booking._id })) > 0).toBe(true)
    expect((await col('clients').findOne({})).counters.bookings).toBe(1)
    expect(await col('decisionLog').countDocuments({})).toBe(0)
  })

  it('leaves the request waiting in manual mode and over the party limit, and keeps the area as an answer', async () => {
    const manual = keep(await send(MANUAL, { ...BODY, areaKey: 'outside' }))
    expect(manual.status).toBe(201)
    expect(manual.body).toMatchObject({ confirmed: false })
    const over = keep(await send(AUTO, { ...BODY, wanted: { ...BODY.wanted, partySize: 5 } }))
    expect(over.status).toBe(201)
    expect(over.body.confirmed).toBe(false)
    const stored = await col('requests').find({}).toArray()
    expect(stored.map(r => r.status)).toEqual(['qualified', 'qualified'])
    expect(stored[0].answers).toContainEqual({ questionKey: 'seating', label: 'fd_q_seating', value: 'Outside' })
    expect(await col('bookings').countDocuments({})).toBe(0)
    expect(await col('tableHolds').countDocuments({})).toBe(0)
  })

  it('answers 409 NO_TABLE with alternatives and writes nothing when the time is taken', async () => {
    for (const slug of [AUTO, MANUAL]) {
      const businessId = slug === AUTO ? 'bAuto' : 'bMan'
      await holds.claim(testDb(), { _id: 'x-' + slug, businessId }, [BIG], jerusalemEpoch(DATE, '18:00'), jerusalemEpoch(DATE, '22:00'))
      const res = keep(await send(slug))
      expect(res.status).toBe(409)
      expect(res.body.error).toBe('NO_TABLE')
      expect(Array.isArray(res.body.alternatives)).toBe(true)
    }
    expect(await col('requests').countDocuments({})).toBe(0)
    expect(await col('clients').countDocuments({})).toBe(0)
    expect(await col('bookings').countDocuments({})).toBe(0)
    expect(await col('tableHolds').countDocuments({ bookingId: { $not: /^x-/ } })).toBe(0)
  })

  it('gives the last table to one of two guests at once', async () => {
    const [a, b] = await Promise.all([send(AUTO), send(AUTO, { ...BODY, guestName: 'Other Guest', guestPhone: '054-765 4321' })])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    const winner = [a, b].find(r => r.status === 201)
    expect(winner.body.confirmed).toBe(true)
    expect([a, b].find(r => r.status === 409).body.error).toBe('NO_TABLE')
    expect(await col('bookings').countDocuments({})).toBe(1)
  })

  it('answers 400 for an area the plan does not have', async () => {
    const res = await send(AUTO, { ...BODY, areaKey: 'nowhere1' })
    expect(res.status).toBe(400)
  })
})

describe('the guest manages the booking', () => {
  it('shows canCancel, confirms once, cancels before the cutoff and refuses after it', async () => {
    const made = (await send(AUTO)).body
    const link = `/api/v1/public/${AUTO}/requests/${made.token}`
    const view = keep(await request(app).get(link))
    expect(view.body.booking).toEqual({ date: DATE, time: '19:00', partySize: 3, status: 'confirmed', guestConfirmed: false, canCancel: true })

    const first = keep(await request(app).post(`${link}/confirm`))
    expect(first.status).toBe(200)
    expect(first.body.booking.guestConfirmed).toBe(true)
    const stamp = (await col('bookings').findOne({})).guestConfirmedAt
    expect(typeof stamp).toBe('number')
    await request(app).post(`${link}/confirm`)
    expect((await col('bookings').findOne({})).guestConfirmedAt).toBe(stamp)

    const cancelled = keep(await request(app).post(`${link}/cancel`))
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.status).toBe('cancelled')
    const booking = await col('bookings').findOne({})
    const stored = await col('requests').findOne({})
    expect(booking.status).toBe('cancelled')
    expect(stored.status).toBe('cancelled')
    expect(booking.statusHistory.at(-1)).toMatchObject({ status: 'cancelled', via: 'guest' })
    expect(stored.statusHistory.at(-1)).toMatchObject({ status: 'cancelled', via: 'guest' })
    expect(await col('tableHolds').countDocuments({})).toBe(0)

    const second = (await send(AUTO, { ...BODY, wanted: { ...BODY.wanted, time: '12:00' } })).body
    const late = `/api/v1/public/${AUTO}/requests/${second.token}`
    const startAt = Date.now() + 3600000
    await col('bookings').updateOne({ status: 'confirmed' }, { $set: { startAt, endAt: startAt + (await col('bookings').findOne({ status: 'confirmed' })).durationMinutes * 60000 } })
    const holdsBefore = await col('tableHolds').countDocuments({})
    const tooLate = keep(await request(app).post(`${late}/cancel`))
    expect(tooLate.status).toBe(409)
    expect(tooLate.body.error).toBe('TOO_LATE')
    expect((await col('bookings').findOne({ status: 'confirmed' })).status).toBe('confirmed')
    expect(await col('tableHolds').countDocuments({})).toBe(holdsBefore)
  })
})

describe('the unchanged door and the leaks', () => {
  it('a business without tables answers as before and has no confirm route', async () => {
    const res = keep(await send(PLAIN))
    expect(res.status).toBe(201)
    expect(Object.keys(res.body).sort()).toEqual(['reference', 'token'])
    const confirm = await request(app).post(`/api/v1/public/${PLAIN}/requests/${res.body.token}/confirm`)
    expect(confirm.status).toBe(404)
  })

  it('no answer shows a table, and no log line holds the phone, the name or the token', async () => {
    const made = keep(await send(AUTO))
    const link = `/api/v1/public/${AUTO}/requests/${made.body.token}`
    keep(await request(app).get(link))
    keep(await request(app).post(`${link}/confirm`))
    keep(await request(app).post(`${link}/cancel`))
    keep(await free(AUTO))
    keep(await request(app).get(`/api/v1/public/${AUTO}`))
    const text = seen.join('\n')
    for (const hidden of ['tableKeys', 'areaKey', SMALL, BIG, OFFLINE, ...NUMBERS]) expect(text).not.toContain(hidden)
    const logText = JSON.stringify(logs.records)
    for (const secret of [PHONE_DIGITS, '1234567', NAME, made.body.token]) expect(logText).not.toContain(secret)
    expect(logs.byEvent('public.request.created').some(r => r.confirmed === true)).toBe(true)
    expect(logs.byEvent('public.booking.confirmed').length).toBeGreaterThan(0)
    expect(logs.byEvent('public.booking.cancelled').length).toBeGreaterThan(0)
  })
})

describe('61 reads', () => {
  it('answers 429 on the 61st read of one slug and still serves another slug', async () => {
    for (let i = 0; i < 60; i++) expect((await free(MANUAL)).status).toBe(200)
    expect((await free(MANUAL)).status).toBe(429)
    expect((await free(AUTO)).status).toBe(200)
  })
})
