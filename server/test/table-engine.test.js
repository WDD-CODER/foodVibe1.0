'use strict'
/** Plan 663 - the table engine: slots, turn, candidates, assign, alternatives, the day at a glance. */

const fs = require('fs')
const path = require('path')
const engine = require('../generated/schemas/front-desk/table-engine')
const { slotsFor, turnFor, candidates, assign, alternatives, dayAvailability, windowsOf } = engine
const { jerusalemEpoch, jerusalemDateTime } = require('../generated/schemas/front-desk/local-time')
const { tableServiceOf } = require('../generated/schemas/front-desk/table-service')
const { floorPlanSchema } = require('../generated/schemas/entities/floor-plan.schema')
const { frontDeskProfileSchema } = require('../generated/schemas/entities/front-desk-profile.schema')
const fx = require('../generated/schemas/testing/table-engine-fixtures')
const { ROOM, profileWith, tableKeyOf, tableKind, FRIDAY_SHORT, THURSDAY_OVERNIGHT, FREE_TEXT_HOURS, LADDER } = fx

// 2026-06-01 is a Monday; Jerusalem is on summer time. 2026-06-02 is a Tuesday, 06-04 a Thursday, 06-05 a Friday.
const NOW = jerusalemEpoch('2026-06-01', '10:00')
const TUE = '2026-06-02'
const THU = '2026-06-04'
const FRI = '2026-06-05'
const ask = (over = {}) => ({ date: TUE, time: '20:00', partySize: 2, onlineOnly: false, now: NOW, ...over })
const hold = (n, date, from, to) => ({ tableKey: tableKeyOf(n), startAt: jerusalemEpoch(date, from), endAt: jerusalemEpoch(date, to) })
const numbersOf = (list) => list.map((c) => c.tableKeys.map((k) => Number(k.slice(5))).join('+'))

describe('fixtures', () => {
  it('parse with the real schemas', () => {
    expect(floorPlanSchema.safeParse(ROOM).success).toBe(true)
    expect(frontDeskProfileSchema.safeParse(profileWith()).success).toBe(true)
    expect(ROOM.tables).toHaveLength(14)
  })
})

describe('slots', () => {
  it('Tuesday 12:00 to 22:00 in steps of 15', () => {
    const s = slotsFor(profileWith(), TUE, NOW)
    expect(s[0]).toBe('12:00')
    expect(s[s.length - 1]).toBe('22:00')
    expect(s).toHaveLength(41)
  })
  it('steps of 30', () => {
    expect(slotsFor(profileWith({ tableService: { slotMinutes: 30 } }), TUE, NOW)).toHaveLength(21)
  })
  it('a closed date, free-text hours', () => {
    expect(slotsFor(profileWith({ closedDates: [TUE] }), TUE, NOW)).toEqual([])
    expect(slotsFor(profileWith({ hours: FREE_TEXT_HOURS }), TUE, NOW)).toEqual([])
  })
  it('a short Friday', () => {
    const s = slotsFor(profileWith({ hours: FRIDAY_SHORT }), FRI, NOW)
    expect(s[0]).toBe('12:00')
    expect(s[s.length - 1]).toBe('14:00')
  })
  it('the lead time removes early starts', () => {
    const now = jerusalemEpoch(TUE, '17:00')
    const s = slotsFor(profileWith(), TUE, now)
    expect(s[0]).toBe('19:00')
  })
})

describe('overnight', () => {
  const profile = profileWith({ hours: THURSDAY_OVERNIGHT })
  it('Thursday ends at 23:45 and Friday carries the tail', () => {
    const thu = slotsFor(profile, THU, NOW)
    expect(thu[thu.length - 1]).toBe('23:45')
    const fri = slotsFor(profile, FRI, NOW)
    expect(fri[0]).toBe('00:00')
    expect(fri[fri.length - 1]).toBe('01:00')
    expect(fri).toHaveLength(5)
  })
  it('a closed Thursday takes its tail with it', () => {
    expect(slotsFor(profileWith({ hours: THURSDAY_OVERNIGHT, closedDates: [THU] }), FRI, NOW)).toEqual([])
  })
})

describe('daylight saving', () => {
  for (const date of ['2026-03-27', '2026-10-25']) {
    it(`${date}: every slot is a real wall time, none repeats`, () => {
      const now = jerusalemEpoch('2026-03-01', '10:00')
      const profile = profileWith({
        hours: [{ days: 'x', time: '00:00-23:00', dayIndexes: [0, 1, 2, 3, 4, 5, 6], open: '00:00', close: '23:00' }],
        requestKinds: { table: tableKind({ maxLeadDays: 400 }) }
      })
      const s = slotsFor(profile, date, now)
      expect(s.length).toBeGreaterThan(20)
      expect(new Set(s).size).toBe(s.length)
      for (const t of s) expect(jerusalemDateTime(jerusalemEpoch(date, t)).time).toBe(t)
      const a = assign(ROOM, profile, [], ask({ date, time: '20:00', now }))
      expect(a.ok).toBe(true)
      expect(a.endAt - a.startAt).toBe(turnFor(tableServiceOf(profile), 2) * 60000)
    })
  }
})

describe('turn', () => {
  const service = tableServiceOf(profileWith({ tableService: { turnMinutes: LADDER } }))
  it('follows the ladder', () => {
    expect([1, 2, 5, 9, 13].map((n) => turnFor(service, n))).toEqual([90, 90, 120, 150, 150])
  })
  it('falls back to the default duration', () => {
    expect(turnFor(tableServiceOf(profileWith()), 4)).toBe(120)
  })
})

describe('candidates', () => {
  it('a party of 2 gets a two-seat table first', () => {
    const c = candidates(ROOM, 2, undefined, false)
    expect(c[0].seats.max).toBe(2)
    expect(c.findIndex((x) => x.seats.max === 4)).toBeGreaterThan(0)
  })
  it('a party of 9 gets only the join; 13 gets none', () => {
    expect(numbersOf(candidates(ROOM, 9, undefined, false))).toEqual(['2+3'])
    expect(candidates(ROOM, 13, undefined, false)).toEqual([])
  })
  it('online only drops what is not online; inactive is never returned', () => {
    const all = numbersOf(candidates(ROOM, 2, undefined, false))
    expect(all).not.toContain('5')
    const online = numbersOf(candidates(ROOM, 2, undefined, true))
    expect(online).not.toContain('12')
    expect(online).not.toContain('8')
    expect(numbersOf(candidates(ROOM, 7, undefined, true))).not.toContain('8+9')
    expect(numbersOf(candidates(ROOM, 7, undefined, false))).toContain('8+9')
  })
  it('the asked area comes first among equal waste', () => {
    expect(numbersOf(candidates(ROOM, 4, 'outside', false))[0]).toBe('7')
    expect(numbersOf(candidates(ROOM, 4, undefined, false))[0]).toBe('2')
    expect(numbersOf(candidates(ROOM, 4, 'nowhere', false))[0]).toBe('2')
  })
  it('equal tables come in the order of their number', () => {
    const n = numbersOf(candidates(ROOM, 3, 'inside', false))
    expect(n.indexOf('2')).toBeLessThan(n.indexOf('10'))
  })
  it('a null plan has none', () => {
    expect(candidates(null, 2, undefined, false)).toEqual([])
  })
})

describe('assign', () => {
  const profile = profileWith()
  const reason = (r) => (r.ok ? 'ok' : r.reason)
  it('no_plan', () => {
    expect(reason(assign(null, profile, [], ask()))).toBe('no_plan')
  })
  it('closed', () => {
    expect(reason(assign(ROOM, profileWith({ closedDates: [TUE] }), [], ask()))).toBe('closed')
    expect(reason(assign(ROOM, profile, [], ask({ time: '03:00' })))).toBe('closed')
  })
  it('too_late', () => {
    expect(reason(assign(ROOM, profile, [], ask({ time: '22:30' })))).toBe('too_late')
  })
  it('too_soon and too_far', () => {
    expect(reason(assign(ROOM, profile, [], ask({ now: jerusalemEpoch(TUE, '19:00') })))).toBe('too_soon')
    expect(reason(assign(ROOM, profile, [], ask({ now: jerusalemEpoch('2026-03-01', '10:00') })))).toBe('too_far')
  })
  it('too_big', () => {
    expect(reason(assign(ROOM, profile, [], ask({ partySize: 13 })))).toBe('too_big')
    const small = profileWith({ requestKinds: { table: tableKind({ maxPartySize: 8 }) } })
    expect(reason(assign(ROOM, small, [], ask({ partySize: 9 })))).toBe('too_big')
  })
  it('too_small', () => {
    expect(reason(assign(ROOM, profile, [], ask({ partySize: 1 })))).toBe('too_small')
  })
  it('full', () => {
    const holds = ROOM.tables.map((t) => ({ tableKey: t.key, startAt: jerusalemEpoch(TUE, '19:00'), endAt: jerusalemEpoch(TUE, '22:00') }))
    expect(reason(assign(ROOM, profile, holds, ask()))).toBe('full')
  })
  it('a free time returns the first candidate', () => {
    const r = assign(ROOM, profile, [], ask())
    expect(r.ok).toBe(true)
    expect(r.tableKeys).toEqual(candidates(ROOM, 2, undefined, false)[0].tableKeys)
    expect(r.startAt).toBe(jerusalemEpoch(TUE, '20:00'))
    expect(r.endAt).toBe(r.startAt + 120 * 60000)
  })
})

describe('buffer', () => {
  const only1 = { ...ROOM, tables: ROOM.tables.filter((t) => t.number === '1'), joins: [] }
  it('a hold that ends at the start does not block', () => {
    const r = assign(only1, profileWith(), [hold(1, TUE, '18:00', '20:00')], ask())
    expect(r.ok).toBe(true)
  })
  it('a hold right after the turn blocks only with a buffer', () => {
    const holds = [hold(1, TUE, '22:00', '23:00')]
    expect(assign(only1, profileWith(), holds, ask()).ok).toBe(true)
    expect(assign(only1, profileWith({ tableService: { bufferMinutes: 15 } }), holds, ask()))
      .toEqual({ ok: false, reason: 'full' })
  })
  it('a hold on one table of a join makes the join busy', () => {
    const r = assign(ROOM, profileWith(), [hold(3, TUE, '19:00', '21:00')], ask({ partySize: 9 }))
    expect(r).toEqual({ ok: false, reason: 'full' })
  })
})

describe('alternatives', () => {
  const short = profileWith({ tableService: { turnMinutes: [{ maxParty: 30, minutes: 30 }] } })
  const a9 = ask({ partySize: 9, onlineOnly: true })
  it('the nearest free times on the day', () => {
    const holds = [
      hold(2, TUE, '19:00', '19:30'),
      hold(2, TUE, '20:00', '20:30'),
      hold(2, TUE, '21:00', '21:15')
    ]
    const r = alternatives(ROOM, short, { [TUE]: holds }, a9)
    expect(r).toEqual([
      { date: TUE, time: '19:30' },
      { date: TUE, time: '20:30' },
      { date: TUE, time: '21:15' }
    ])
    for (const x of r) expect(assign(ROOM, short, holds, { ...a9, ...x }).ok).toBe(true)
  })
  it('a full evening offers the next two open days', () => {
    const profile = profileWith({ closedDates: ['2026-06-03'] })
    const day = [hold(2, TUE, '12:00', '23:00')]
    const r = alternatives(ROOM, profile, { [TUE]: day }, a9)
    expect(r).toEqual([
      { date: '2026-06-04', time: '20:00' },
      { date: '2026-06-05', time: '20:00' }
    ])
  })
  it('never more than three', () => {
    expect(alternatives(ROOM, profileWith(), {}, ask()).length).toBeLessThanOrEqual(3)
  })
})

describe('day', () => {
  it('one row per slot, available equals assign', () => {
    const profile = profileWith()
    const holds = [hold(1, TUE, '19:00', '21:00')]
    const q = { date: TUE, partySize: 2, onlineOnly: false, now: NOW }
    const rows = dayAvailability(ROOM, profile, holds, q)
    expect(rows.map((r) => r.time)).toEqual(slotsFor(profile, TUE, NOW))
    for (const r of rows) expect(r.available).toBe(assign(ROOM, profile, holds, { ...q, time: r.time }).ok)
  })
})

describe('same answer', () => {
  it('is stable and does not depend on array order', () => {
    const profile = profileWith()
    const reversed = { ...ROOM, tables: [...ROOM.tables].reverse(), joins: [...ROOM.joins].reverse() }
    const holds = [hold(1, TUE, '19:00', '21:00')]
    for (const size of [2, 5, 9]) {
      const a = ask({ partySize: size })
      const first = JSON.stringify({ r: assign(ROOM, profile, holds, a), c: candidates(ROOM, size, undefined, false), alt: alternatives(ROOM, profile, { [TUE]: holds }, a) })
      for (let i = 0; i < 100; i++) {
        const again = JSON.stringify({ r: assign(reversed, profile, holds, a), c: candidates(reversed, size, undefined, false), alt: alternatives(reversed, profile, { [TUE]: holds }, a) })
        expect(again).toBe(first)
      }
    }
  })
})

describe('pure', () => {
  it('has no clock, database or network and few imports', () => {
    const text = fs.readFileSync(path.join(__dirname, '../../shared/schemas/front-desk/table-engine.ts'), 'utf8')
    for (const bad of ['Date.now', 'new Date()', 'require(', 'mongoose', 'fetch(']) expect(text.includes(bad), bad).toBe(false)
    const imports = text.split('\n').filter((l) => /^import /.test(l))
    for (const line of imports) {
      expect(/^import type /.test(line) || /from '\.\/(local-time|qualify|table-service)'/.test(line), line).toBe(true)
    }
  })
  it('windowsOf is exported for tests', () => {
    expect(windowsOf(profileWith(), TUE)).toHaveLength(1)
  })
})
