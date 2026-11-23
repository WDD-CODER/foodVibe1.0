import {
  arrivingNext,
  firstWaitingFit,
  freeTablesFor,
  nextOnTable,
  stripTimes,
  tableStatesAt
} from './table-state.util'

const MIN = 60000
const NOW = 1_000_000_000_000
const plan = {
  tables: [
    { key: 't1', active: true },
    { key: 't2', active: true },
    { key: 't3', active: false },
    { key: 't4', active: true }
  ]
} as unknown as Parameters<typeof tableStatesAt>[0]

const b = (status: string, startAt: number, tableKeys: string[], over: object = {}) =>
  ({
    _id: 'b' + startAt + status,
    kind: 'table',
    status,
    startAt,
    endAt: startAt + 90 * MIN,
    tableKeys,
    guestName: 'כהן',
    time: '19:00',
    ...over
  }) as unknown as Parameters<typeof tableStatesAt>[1][number]

const live = { live: true, holdMinutes: 15 }
const state = (bookings: Parameters<typeof tableStatesAt>[1], moment: number, opts = live, key = 't1') =>
  tableStatesAt(plan, bookings, moment, opts)[key].state

describe('tableStatesAt', () => {
  it('an inactive table is not_active', () => {
    expect(state([], NOW, live, 't3')).toBe('not_active')
  })

  it('seated, and over_time once the moment is past its end', () => {
    const seated = b('seated', NOW - 30 * MIN, ['t1'])
    expect(state([seated], NOW)).toBe('seated')
    expect(state([seated], seated.endAt + 1)).toBe('over_time')
  })

  it('late after the hold, reserved_soon before it', () => {
    const c = b('confirmed', NOW, ['t1'])
    expect(state([c], NOW + 16 * MIN)).toBe('late')
    expect(state([c], NOW + 14 * MIN)).toBe('reserved_soon')
  })

  it('reserved_soon 90 minutes ahead, free at 91', () => {
    expect(state([b('confirmed', NOW + 90 * MIN, ['t1'])], NOW)).toBe('reserved_soon')
    expect(state([b('confirmed', NOW + 91 * MIN, ['t1'])], NOW)).toBe('free')
  })

  it('finished, cancelled and no_show hold nothing', () => {
    for (const status of ['finished', 'cancelled', 'no_show']) expect(state([b(status, NOW, ['t1'])], NOW)).toBe('free')
  })

  it('a join marks every table of its tableKeys, with the name and time', () => {
    const states = tableStatesAt(plan, [b('confirmed', NOW + 10 * MIN, ['t1', 't2'])], NOW, live)
    expect(states['t1']).toEqual(jasmine.objectContaining({ state: 'reserved_soon', name: 'כהן', time: '19:00' }))
    expect(states['t2'].state).toBe('reserved_soon')
    expect(states['t4'].state).toBe('free')
  })

  it('a non-live moment never returns late or over_time', () => {
    const off = { live: false, holdMinutes: 15 }
    const seated = b('seated', NOW - 120 * MIN, ['t1'])
    expect(state([seated], NOW, off)).toBe('free')
    expect(state([seated], seated.startAt + MIN, off)).toBe('seated')
    expect(state([b('confirmed', NOW - 60 * MIN, ['t1'])], NOW, off)).toBe('reserved_soon')
  })

  it('the earlier booking gives the name, and a walk-in gets the fallback name', () => {
    const early = b('confirmed', NOW + 10 * MIN, ['t1'], { guestName: 'לוי', _id: 'e' })
    const later = b('confirmed', NOW + 20 * MIN, ['t1'], { guestName: 'כהן', _id: 'l' })
    expect(tableStatesAt(plan, [later, early], NOW, live)['t1'].name).toBe('לוי')
    const walk = b('seated', NOW - MIN, ['t1'], { guestName: '' })
    expect(tableStatesAt(plan, [walk], NOW, { ...live, walkInName: 'מזדמנים' })['t1'].name).toBe('מזדמנים')
  })
})

describe('stripTimes', () => {
  it('lists 30-minute steps of each range', () => {
    expect(stripTimes([{ open: '18:00', close: '20:00', overnight: false }], 30).map((t) => t.time)).toEqual([
      '18:00',
      '18:30',
      '19:00',
      '19:30'
    ])
  })

  it('an overnight range runs to its end and flags the times after midnight', () => {
    const times = stripTimes([{ open: '22:00', close: '01:00', overnight: true }], 30)
    expect(times.map((t) => [t.time, t.nextDay])).toEqual([
      ['22:00', false],
      ['22:30', false],
      ['23:00', false],
      ['23:30', false],
      ['00:00', true],
      ['00:30', true]
    ])
  })
})

describe('nextOnTable (plan 686)', () => {
  it('none when the table has no later booking', () => {
    expect(nextOnTable([], 't1', NOW)).toBeNull()
    expect(nextOnTable([b('confirmed', NOW - MIN, ['t1'])], 't1', NOW)).toBeNull()
  })

  it('the earliest later confirmed booking on that table', () => {
    const late = b('confirmed', NOW + 120 * MIN, ['t1'])
    const soon = b('confirmed', NOW + 30 * MIN, ['t1'])
    expect(nextOnTable([late, soon, b('confirmed', NOW + 10 * MIN, ['t2'])], 't1', NOW)).toBe(soon)
  })

  it('leaves the now booking out', () => {
    const now = b('confirmed', NOW + 10 * MIN, ['t1'])
    const next = b('confirmed', NOW + 200 * MIN, ['t1'])
    expect(nextOnTable([now, next], 't1', NOW, now._id)).toBe(next)
  })

  it('ignores cancelled, no-show, finished and seated bookings', () => {
    const others = ['cancelled', 'no_show', 'finished', 'seated'].map((s) => b(s, NOW + 30 * MIN, ['t1']))
    expect(nextOnTable(others, 't1', NOW)).toBeNull()
  })
})

describe('arrivingNext (plan 672)', () => {
  it('lists confirmed table bookings that start within 90 minutes, earliest first', () => {
    const later = b('confirmed', NOW + 80 * MIN, ['t1'])
    const sooner = b('confirmed', NOW + 10 * MIN, ['t2'])
    const tooFar = b('confirmed', NOW + 91 * MIN, ['t4'])
    const rows = arrivingNext([later, tooFar, sooner], NOW, 90)
    expect(rows.map((r) => r.booking)).toEqual([sooner, later])
    expect(rows.every((r) => !r.late)).toBe(true)
  })

  it('keeps a booking whose time passed, and flags it late once the hold is over', () => {
    const past = b('confirmed', NOW - 10 * MIN, ['t1'])
    const wayPast = b('confirmed', NOW - 20 * MIN, ['t2'])
    const rows = arrivingNext([past, wayPast], NOW, 90, 15)
    expect(rows.map((r) => [r.booking, r.late])).toEqual([
      [wayPast, true],
      [past, false]
    ])
  })

  it('leaves out seated, finished, cancelled and no-show bookings and other kinds', () => {
    const others = ['seated', 'finished', 'cancelled', 'no_show'].map((s) => b(s, NOW + 10 * MIN, ['t1']))
    const tasting = b('confirmed', NOW + 10 * MIN, [], { kind: 'tasting' })
    expect(arrivingNext([...others, tasting], NOW, 90)).toEqual([])
  })
})

describe('freeTablesFor (plan 672)', () => {
  const seatPlan = {
    tables: [
      { key: 't1', active: true, minSeats: 2, maxSeats: 4 },
      { key: 't2', active: true, minSeats: 2, maxSeats: 2 },
      { key: 't3', active: false, minSeats: 2, maxSeats: 4 },
      { key: 't4', active: true, minSeats: 1, maxSeats: 6 }
    ]
  } as unknown as Parameters<typeof freeTablesFor>[1]
  const states = {
    t1: { state: 'free' },
    t2: { state: 'free' },
    t3: { state: 'free' },
    t4: { state: 'seated' }
  } as Parameters<typeof freeTablesFor>[0]

  it('keeps free, active tables whose seat range holds the party', () => {
    expect(freeTablesFor(states, seatPlan, 2)).toEqual(['t1', 't2'])
    expect(freeTablesFor(states, seatPlan, 4)).toEqual(['t1'])
    expect(freeTablesFor(states, seatPlan, 7)).toEqual([])
  })
})

describe('firstWaitingFit (plan 673)', () => {
  const table = { minSeats: 2, maxSeats: 4, areaKey: 'in' }
  const entry = (over: Record<string, unknown>) => ({
    status: 'waiting' as const,
    partySize: 3,
    areaKey: undefined as string | undefined,
    joinedAt: 100,
    ...over
  })

  it('returns the earliest waiting or notified entry that fits the seat range', () => {
    const early = entry({ joinedAt: 10, status: 'notified' })
    const late = entry({ joinedAt: 20 })
    expect(firstWaitingFit([late, early], table)).toBe(early)
  })

  it('skips a party that is too big or too small and an entry that already left or sat', () => {
    const list = [
      entry({ joinedAt: 1, partySize: 6 }),
      entry({ joinedAt: 2, partySize: 1 }),
      entry({ joinedAt: 3, status: 'seated' }),
      entry({ joinedAt: 4, status: 'left' }),
      entry({ joinedAt: 5, status: 'expired' })
    ]
    expect(firstWaitingFit(list, table)).toBeNull()
  })

  it('an entry with an area fits only a table of that area; an entry with no area fits any', () => {
    const outside = entry({ joinedAt: 1, areaKey: 'out' })
    const anywhere = entry({ joinedAt: 2 })
    const inside = entry({ joinedAt: 3, areaKey: 'in' })
    expect(firstWaitingFit([outside, anywhere, inside], table)).toBe(anywhere)
    expect(firstWaitingFit([outside, inside], table)).toBe(inside)
    expect(firstWaitingFit([outside], table)).toBeNull()
  })

  it('returns null for an empty list', () => {
    expect(firstWaitingFit([], table)).toBeNull()
  })
})
