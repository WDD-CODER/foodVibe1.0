import { formatDateDigits, isoToDmy, parseDmy, todayIso } from './date-input.util'

describe('date-input.util', () => {
  describe('formatDateDigits', () => {
    it('inserts the slashes as digits are typed', () => {
      expect(formatDateDigits('25122026')).toBe('25/12/2026')
      expect(formatDateDigits('2')).toBe('2')
      expect(formatDateDigits('251')).toBe('25/1')
      expect(formatDateDigits('2512')).toBe('25/12')
      expect(formatDateDigits('25122')).toBe('25/12/2')
    })

    it('drops letters and extra digits', () => {
      expect(formatDateDigits('25a/12-2026999')).toBe('25/12/2026')
      expect(formatDateDigits('')).toBe('')
    })
  })

  describe('parseDmy', () => {
    it('returns the ISO date for a real date', () => {
      expect(parseDmy('25/12/2026')).toBe('2026-12-25')
      expect(parseDmy('01/01/1900')).toBe('1900-01-01')
    })

    it('accepts a leap day only in a leap year', () => {
      expect(parseDmy('29/02/2028')).toBe('2028-02-29')
      expect(parseDmy('29/02/2026')).toBeNull()
    })

    it('rejects impossible and incomplete dates', () => {
      expect(parseDmy('31/02/2026')).toBeNull()
      expect(parseDmy('31/04/2026')).toBeNull()
      expect(parseDmy('10/13/2026')).toBeNull()
      expect(parseDmy('00/10/2026')).toBeNull()
      expect(parseDmy('10/10/1899')).toBeNull()
      expect(parseDmy('25/12/20')).toBeNull()
      expect(parseDmy('')).toBeNull()
    })
  })

  describe('isoToDmy', () => {
    it('turns an ISO date into day/month/year', () => {
      expect(isoToDmy('2026-12-25')).toBe('25/12/2026')
    })

    it('gives an empty string for nothing or garbage', () => {
      expect(isoToDmy('')).toBe('')
      expect(isoToDmy(undefined)).toBe('')
      expect(isoToDmy('soon')).toBe('')
    })
  })

  describe('todayIso', () => {
    it('uses the local calendar day', () => {
      expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    })
  })
})
