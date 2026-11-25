'use strict'
/** Plan 674 - the demo restaurant: its data's counts, schemas and tables, the clocks, the dry run, the holds, the second run, local only. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { clearModuleCache } = require('../middleware/require-module')
const { buildDemoRestaurant } = require('../scripts/lib/demo-restaurant-data')
const { seedDemoRestaurant } = require('../scripts/seed-demo-restaurant')
const { parseArgs } = require('../scripts/seed-demo-business')
const { parseV2 } = require('../utils/schema-check')
const { jerusalemDate } = require('../middleware/usage')
const { modulesOf } = require('../generated/schemas/modules')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const CLOCKS = ['2026-11-12T21:21:00Z', '2026-03-27T21:30:00Z', '2026-10-25T00:30:00Z']
const HASH = 'a'.repeat(32) + ':' + 'b'.repeat(64)
const COLLECTIONS = ['floorPlans', 'frontDeskProfiles', 'clients', 'bookings', 'waitlistEntries']
const quiet = () => vi.spyOn(console, 'log').mockImplementation(() => {})
const addDays = (date, n) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

describe('buildDemoRestaurant', () => {
  it.each(CLOCKS)('returns the planned counts, valid documents and seven dates at %s', iso => {
    const now = Date.parse(iso)
    const data = buildDemoRestaurant({ now })
    expect(data.floorPlans).toHaveLength(1)
    expect(data.floorPlans[0].tables).toHaveLength(14)
    expect(data.floorPlans[0].areas).toHaveLength(3)
    expect(data.floorPlans[0].joins).toHaveLength(2)
    expect(data.frontDeskProfiles).toHaveLength(1)
    expect(data.clients).toHaveLength(6)
    expect(data.bookings).toHaveLength(40)
    expect(data.waitlistEntries).toHaveLength(4)
    const today = jerusalemDate(now)
    expect([...new Set(data.bookings.map(b => b.date))].sort()).toEqual([-1, 0, 1, 2, 3, 4, 5].map(n => addDays(today, n)))
    for (const name of COLLECTIONS) {
      for (const doc of data[name]) {
        const result = parseV2(name, doc)
        expect({ name, id: doc._id, issues: result.issues }).toEqual({ name, id: doc._id, issues: [] })
      }
    }
    expect(data.waitlistEntries.map(w => w.status)).toEqual(['waiting', 'waiting', 'notified', 'left'])
    expect(data.waitlistEntries.map(w => w.partySize)).toEqual([2, 4, 2, 5])
  })

  it.each(CLOCKS)('shares no table at one time and seats every party within its seats at %s', iso => {
    const data = buildDemoRestaurant({ now: Date.parse(iso) })
    const plan = data.floorPlans[0]
    const seatsOf = new Map([
      ...plan.tables.map(t => [t.key, t]),
      ...plan.joins.map(j => [[...j.tableKeys].sort().join('|'), j]),
    ])
    const live = data.bookings.filter(b => ['confirmed', 'seated'].includes(b.status))
    for (const b of data.bookings) {
      const range = seatsOf.get(b.tableKeys.length === 1 ? b.tableKeys[0] : [...b.tableKeys].sort().join('|'))
      expect(range).toBeTruthy()
      expect(b.partySize).toBeGreaterThanOrEqual(range.minSeats)
      expect(b.partySize).toBeLessThanOrEqual(range.maxSeats)
    }
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i]
        const b = live[j]
        const shared = a.tableKeys.some(k => b.tableKeys.includes(k))
        expect(shared && a.startAt < b.endAt && b.startAt < a.endAt).toBe(false)
      }
    }
  })

  it('gives the same documents for the same clock, three times over', () => {
    for (const iso of CLOCKS) {
      const now = Date.parse(iso)
      expect(buildDemoRestaurant({ now })).toEqual(buildDemoRestaurant({ now }))
    }
  })
})

describe('demo assistant level (plan 719)', () => {
  it('builds the demo profile at level 1', () => {
    expect(buildDemoRestaurant({ now: Date.now() }).frontDeskProfiles[0].assistant.level).toBe(1)
  })
})

describe('seedDemoRestaurant', () => {
  const holdCount = () => testDb().collection('tableHolds').countDocuments({ businessId: 'demo_restaurant' })

  it('writes nothing without write', async () => {
    const log = quiet()
    const result = await seedDemoRestaurant(testDb(), { write: false, now: Date.now() })
    const lines = log.mock.calls.map(c => c[0])
    log.mockRestore()
    expect(result.inserted).toBe(0)
    expect(lines.some(l => /^would claim tables for \d+ bookings$/.test(l))).toBe(true)
    for (const name of [...COLLECTIONS, 'tableHolds', 'users', 'businesses']) {
      expect(await testDb().collection(name).countDocuments({ businessId: 'demo_restaurant' })).toBe(0)
    }
    expect(await testDb().collection('users').countDocuments({ _id: 'demo_rest_owner' })).toBe(0)
  })

  it('inserts the restaurant with its holds, serves it through the API, and a second run adds nothing', async () => {
    const log = quiet()
    const now = Date.now()
    const first = await seedDemoRestaurant(testDb(), { write: true, now, passwordHash: HASH })
    expect(first.inserted).toBe(2 + 1 + 1 + 6 + 4 + 40)
    const business = await testDb().collection('businesses').findOne({ _id: 'demo_restaurant' })
    expect(business.internal).toBe(true)
    expect(modulesOf(business)).toContain('tables')
    const owner = await testDb().collection('users').findOne({ _id: 'demo_rest_owner' })
    expect(owner).toMatchObject({ name: 'demo_host', email: 'demo-restaurant@foodco.invalid', businessId: 'demo_restaurant', businessRole: 'owner' })

    const bookings = await testDb().collection('bookings').find({ businessId: 'demo_restaurant' }).toArray()
    const live = bookings.filter(b => ['confirmed', 'seated'].includes(b.status))
    expect(live.length).toBeGreaterThan(0)
    const rows = await testDb().collection('tableHolds').find({ businessId: 'demo_restaurant' }).toArray()
    for (const b of live) {
      const mine = rows.filter(r => r.bookingId === b._id)
      expect(new Set(mine.map(r => r.tableKey))).toEqual(new Set(b.tableKeys))
      expect(mine.length).toBeGreaterThanOrEqual(b.tableKeys.length)
    }
    expect(rows.every(r => live.some(b => b._id === r.bookingId))).toBe(true)

    clearModuleCache()
    const token = signTestToken({ userId: 'demo_rest_owner', businessId: 'demo_restaurant', businessRole: 'owner' })
    const auth = { Authorization: `Bearer ${token}` }
    const day = await request(app).get('/api/v1/bookings/day').query({ date: jerusalemDate(now) }).set(auth)
    expect(day.status).toBe(200)
    expect(day.body.bookings.length).toBeGreaterThan(0)
    expect(day.body.bookings.every(b => Array.isArray(b.tableKeys) && b.tableKeys.length > 0)).toBe(true)
    const floor = await request(app).get('/api/v1/floor-plan').set(auth)
    expect(floor.status).toBe(200)
    expect(floor.body.plan.tables).toHaveLength(14)

    const holdsBefore = await holdCount()
    log.mockClear()
    const second = await seedDemoRestaurant(testDb(), { write: true, now, passwordHash: HASH })
    expect(second.inserted).toBe(0)
    expect(log.mock.calls.map(c => c[0])).toContain('already seeded')
    expect(await holdCount()).toBe(holdsBefore)
    log.mockRestore()
  })

  describe('raising a stored level-0 profile (plan 719)', () => {
    const profiles = () => testDb().collection('frontDeskProfiles')
    const seeded = async () => {
      const log = quiet()
      await seedDemoRestaurant(testDb(), { write: true, now: Date.now(), passwordHash: HASH })
      log.mockRestore()
    }
    const run = async write => {
      const log = quiet()
      await seedDemoRestaurant(testDb(), { write, now: Date.now(), passwordHash: HASH })
      const lines = log.mock.calls.map(c => c[0])
      log.mockRestore()
      return lines
    }
    const levelOf = async () => (await profiles().findOne({ _id: 'demo_rest_profile' })).assistant.level

    it('raises level 0 with no adminHistory, and a dry run changes nothing', async () => {
      await seeded()
      await profiles().updateOne({ _id: 'demo_rest_profile' }, { $set: { 'assistant.level': 0 } })
      const dry = await run(false)
      expect(dry).toContain('would raise the demo assistant to level 1')
      expect(await levelOf()).toBe(0)
      const lines = await run(true)
      expect(lines).toContain('raised the demo assistant to level 1')
      expect(await levelOf()).toBe(1)
    })

    it('leaves a profile with adminHistory or level 1 or 2 as it is', async () => {
      await seeded()
      await profiles().updateOne({ _id: 'demo_rest_profile' }, { $set: { 'assistant.level': 0, adminHistory: [{ at: 1 }] } })
      expect(await run(true)).not.toContain('raised the demo assistant to level 1')
      expect(await levelOf()).toBe(0)
      await profiles().updateOne({ _id: 'demo_rest_profile' }, { $set: { 'assistant.level': 2 }, $unset: { adminHistory: '' } })
      await run(true)
      expect(await levelOf()).toBe(2)
    })

    it('leaves a level the owner chose (a levelHistory row) as it is (plan 734)', async () => {
      await seeded()
      await profiles().updateOne({ _id: 'demo_rest_profile' }, { $set: { 'assistant.level': 0, levelHistory: [{ at: 1, by: 'o', byName: 'o', from: 1, to: 0 }] } })
      expect(await run(true)).not.toContain('raised the demo assistant to level 1')
      expect(await levelOf()).toBe(0)
    })
  })
})

describe('parseArgs', () => {
  it('is local only', () => {
    expect(parseArgs(['node', 's', '--target=local', '--db=scratch_demo', '--write'])).toEqual({ write: true, target: 'local', db: 'scratch_demo' })
    expect(() => parseArgs(['node', 's', '--target=atlas'])).toThrow('demo seed is local only')
    expect(() => parseArgs(['node', 's', '--target=local', '--confirm-host=x'])).toThrow('demo seed is local only')
    expect(() => parseArgs(['node', 's'])).toThrow("--target must be 'local'")
    expect(() => parseArgs(['node', 's', '--target=local', '--nope'])).toThrow('Unknown argument')
  })
})
