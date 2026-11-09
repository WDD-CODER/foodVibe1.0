import {
  checkHoursRow,
  formatTimeRange,
  formatVenueHours,
  formatVenueHoursLines,
  hoursToDraft,
  parseTimeRange,
  toDisplay
} from './venue-hours.util'

describe('formatVenueHours', () => {
  it('returns the first block and the extra count', () => {
    expect(
      formatVenueHours([
        { days: 'א׳–ה׳', time: '08:00–23:00' },
        { days: 'ו׳', time: '08:00–14:00' }
      ])
    ).toEqual({ first: 'א׳–ה׳ · 08:00–23:00', extra: 1 })
  })

  it('handles a single block with no extra', () => {
    expect(formatVenueHours([{ days: 'א׳–ו׳', time: '10:00–18:00' }])).toEqual({
      first: 'א׳–ו׳ · 10:00–18:00',
      extra: 0
    })
  })

  it('shows whichever half is filled and skips empty blocks', () => {
    expect(
      formatVenueHours([
        { days: ' ', time: '' },
        { days: '', time: '09:00–17:00' }
      ])
    ).toEqual({
      first: '09:00–17:00',
      extra: 0
    })
  })

  it('returns an empty summary for missing or empty hours', () => {
    expect(formatVenueHours(undefined)).toEqual({ first: '', extra: 0 })
    expect(formatVenueHours([])).toEqual({ first: '', extra: 0 })
  })
})

describe('formatVenueHoursLines', () => {
  it('lists every non-empty block', () => {
    expect(
      formatVenueHoursLines([
        { days: 'א׳–ה׳', time: '08:00–23:00' },
        { days: '', time: '' },
        { days: 'ש׳', time: '' }
      ])
    ).toEqual(['א׳–ה׳ · 08:00–23:00', 'ש׳'])
  })
})
describe('venue-hours.util (plan 537)', () => {
  it('parses the accepted separators and widths', () => {
    expect(parseTimeRange('08:00–23:00')).toEqual({ open: '08:00', close: '23:00' })
    expect(parseTimeRange('8:00 - 23:00')).toEqual({ open: '08:00', close: '23:00' })
    expect(parseTimeRange('08:00—23:00')).toEqual({ open: '08:00', close: '23:00' })
  })

  it('returns null for text that is not a range', () => {
    expect(parseTimeRange('ערב')).toBeNull()
    expect(parseTimeRange('')).toBeNull()
    expect(parseTimeRange('25:00–26:00')).toBeNull()
  })

  it('writes an en dash with no spaces', () => {
    expect(formatTimeRange('18:00', '02:00')).toBe('18:00–02:00')
  })

  describe('checkHoursRow', () => {
    const base = { days: 'א׳', open: '08:00', close: '23:00' }
    it('empty', () => {
      expect(checkHoursRow({ days: '  ', open: '', close: '' })).toBe('empty')
    })
    it('missing_days', () => {
      expect(checkHoursRow({ ...base, days: ' ' })).toBe('missing_days')
      expect(checkHoursRow({ days: '', open: '', close: '', openInvalid: true })).toBe('missing_days')
    })
    it('time_invalid', () => {
      expect(checkHoursRow({ ...base, open: '', closeInvalid: true })).toBe('time_invalid')
    })
    it('missing_time', () => {
      expect(checkHoursRow({ ...base, close: '' })).toBe('missing_time')
      expect(checkHoursRow({ ...base, open: '' })).toBe('missing_time')
    })
    it('same_time', () => {
      expect(checkHoursRow({ ...base, open: '18:00', close: '18:00' })).toBe('same_time')
    })
    it('overnight', () => {
      expect(checkHoursRow({ ...base, open: '18:00', close: '02:00' })).toBe('overnight')
    })
    it('ok', () => {
      expect(checkHoursRow(base)).toBe('ok')
    })
  })
})

describe('toDisplay and structured hours (plan 372)', () => {
  it('compresses consecutive days', () => {
    expect(toDisplay([0, 1, 2, 3, 4], '08:00', '23:00')).toEqual({ days: 'א׳–ה׳', time: '08:00–23:00' })
  })
  it('writes a single day, a gap and the whole week', () => {
    expect(toDisplay([4], '18:00', '02:00')).toEqual({ days: 'ה׳', time: '18:00–02:00' })
    expect(toDisplay([0, 1, 3], '09:00', '10:00').days).toBe('א׳–ב׳, ד׳')
    expect(toDisplay([6, 0, 1, 2, 3, 4, 5], '09:00', '10:00').days).toBe('א׳–ש׳')
  })
  it('formatVenueHours prefers the structured fields', () => {
    const out = formatVenueHours([{ days: 'old', time: 'old', dayIndexes: [0, 1], open: '08:00', close: '12:00' }])
    expect(out.first).toBe('א׳–ב׳ · 08:00–12:00')
  })
  it('checkHoursRow reads dayIndexes', () => {
    expect(checkHoursRow({ dayIndexes: [], open: '08:00', close: '10:00' })).toBe('missing_days')
    expect(checkHoursRow({ dayIndexes: [2], open: '08:00', close: '10:00' })).toBe('ok')
  })
  it('hoursToDraft falls back to the time string', () => {
    expect(hoursToDraft({ days: 'א׳', time: '08:00–23:00' })).toEqual(
      jasmine.objectContaining({ dayIndexes: [], open: '08:00', close: '23:00' })
    )
  })
})
