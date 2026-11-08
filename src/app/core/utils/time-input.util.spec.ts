import { formatTimeDigits, parseHm } from './time-input.util'

describe('time-input.util', () => {
  it('inserts the colon after two digits', () => {
    expect(formatTimeDigits('0830')).toBe('08:30')
    expect(formatTimeDigits('830')).toBe('830')
    expect(formatTimeDigits('08')).toBe('08')
    expect(formatTimeDigits('8')).toBe('8')
  })

  it('keeps digits only and at most four', () => {
    expect(formatTimeDigits('08:3a0999')).toBe('08:30')
    expect(formatTimeDigits('abc')).toBe('')
  })

  it('formats 2400 as typed but parseHm rejects it', () => {
    expect(formatTimeDigits('2400')).toBe('24:00')
    expect(parseHm('24:00')).toBeNull()
  })

  it('parses only a full 24-hour time', () => {
    expect(parseHm('08:30')).toBe('08:30')
    expect(parseHm('23:59')).toBe('23:59')
    expect(parseHm('00:00')).toBe('00:00')
    expect(parseHm('8:30')).toBeNull()
    expect(parseHm('08:60')).toBeNull()
    expect(parseHm('08:3')).toBeNull()
    expect(parseHm('')).toBeNull()
  })
})
