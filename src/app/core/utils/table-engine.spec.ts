import { assign, candidates, slotsFor } from '@schemas/front-desk/table-engine'
import { jerusalemEpoch } from '@schemas/front-desk/local-time'
import { ROOM, profileWith, tableKeyOf } from '@schemas/testing/table-engine-fixtures'

describe('table engine (browser side)', () => {
  const now = jerusalemEpoch('2026-06-01', '10:00')
  const profile = profileWith()
  const keysFor = (partySize: number): string[] => {
    const r = assign(ROOM, profile, [], { date: '2026-06-02', time: '20:00', partySize, onlineOnly: false, now })
    return r.ok ? r.tableKeys : []
  }

  it('lists the same slots as the server', () => {
    const s = slotsFor(profile, '2026-06-02', now)
    expect(s.length).toBe(41)
    expect(s[0]).toBe('12:00')
  })

  it('assigns the same tables as the server test for a party of 2, 5 and 9', () => {
    expect(keysFor(2)).toEqual([tableKeyOf(1)])
    expect(keysFor(5)).toEqual([tableKeyOf(4)])
    expect(keysFor(9)).toEqual([tableKeyOf(2), tableKeyOf(3)])
  })

  it('a party of 13 has no candidate', () => {
    expect(candidates(ROOM, 13, undefined, false)).toEqual([])
  })
})
