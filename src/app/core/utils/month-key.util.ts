import { MONTH_KEY_PATTERN, monthKeyOf, monthLabel, shiftMonth } from '@schemas/month/month-rules'

/**
 * Plan 726, rewritten plan 727: a month is named `YYYY-MM`. One month rule, not two: these are thin names over
 * `shared/schemas/month/month-rules.ts`, the same rules the server uses to open a month.
 */
export function isMonthKey(key: unknown): key is string {
  return typeof key === 'string' && MONTH_KEY_PATTERN.test(key)
}

/** The calendar month in Asia/Jerusalem. */
export function currentMonthKey(now: Date = new Date()): string {
  return monthKeyOf(now.getTime())
}

/** The month `n` months after (or before, when negative) `key`. */
export function shiftMonthKey(key: string, n: number): string {
  return shiftMonth(key, n)
}

/** «נובמבר 2026». */
export function monthKeyLabel(key: string): string {
  return monthLabel(key, 'he-IL')
}
