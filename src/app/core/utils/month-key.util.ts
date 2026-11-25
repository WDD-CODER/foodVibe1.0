import { MONTH_KEY_PATTERN } from '@schemas/entities'

/** Plan 726: a month is named `YYYY-MM` (the key of a `dishSalesMonths` document). */
export function isMonthKey(key: unknown): key is string {
  return typeof key === 'string' && MONTH_KEY_PATTERN.test(key)
}

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** The month `n` months after (or before, when negative) `key`. */
export function shiftMonthKey(key: string, n: number): string {
  const [year, month] = key.split('-').map(Number)
  const index = year * 12 + (month - 1) + n
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** «נובמבר 2026». */
export function monthKeyLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}
