import {
  checkHoursRow,
  formatTimeRange,
  formatVenueHours,
  formatVenueHoursLines,
  parseTimeRange
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
