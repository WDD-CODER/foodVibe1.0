import { currentMonthKey, isMonthKey, monthKeyLabel, shiftMonthKey } from './month-key.util'

describe('month-key.util (plan 726)', () => {
  it('currentMonthKey names the month of the date', () => {
    expect(currentMonthKey(new Date(2026, 10, 30))).toBe('2026-11')
    expect(currentMonthKey(new Date(2026, 0, 1))).toBe('2026-01')
  })

  it('shiftMonthKey crosses the year in both directions', () => {
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12')
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01')
    expect(shiftMonthKey('2026-05', 0)).toBe('2026-05')
    expect(shiftMonthKey('2026-05', -17)).toBe('2024-12')
  })

  it('isMonthKey accepts only YYYY-MM with a real month', () => {
    expect(isMonthKey('2026-11')).toBeTrue()
    expect(isMonthKey('2026-13')).toBeFalse()
    expect(isMonthKey('2026-1')).toBeFalse()
    expect(isMonthKey(null)).toBeFalse()
  })

  it('monthKeyLabel gives the Hebrew month and year', () => {
    const label = monthKeyLabel('2026-11')
    expect(label).toContain('2026')
    expect(label).toContain('נובמבר')
  })
})
