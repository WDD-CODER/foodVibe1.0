import { formatVenueHours, formatVenueHoursLines } from './venue-hours.util'

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
    expect(formatVenueHours([{ days: ' ', time: '' }, { days: '', time: '09:00–17:00' }])).toEqual({
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
