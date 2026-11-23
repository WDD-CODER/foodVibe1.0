import { stripTimes, tableStatesAt } from './table-state.util'

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
