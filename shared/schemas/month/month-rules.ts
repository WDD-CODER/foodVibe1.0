/**
 * Plan 727: the month and target rules the server (creating a month) and the browser (picker, bands) both need.
 * No zod, so the page does not pull the validation library twice.
 */

/** A month is named `YYYY-MM`, `2000-01` … `2099-12`. */
export const MONTH_KEY_PATTERN = /^(20\d\d)-(0[1-9]|1[0-2])$/

/** The calendar month of a moment in Asia/Jerusalem (the rule of `monthKeys` in server/services/business-report.js). */
export function monthKeyOf(nowMs: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit' }).formatToParts(new Date(nowMs))
  const year = parts.find(p => p.type === 'year')?.value ?? '1970'
  const month = parts.find(p => p.type === 'month')?.value ?? '01'
  return `${year}-${month}`
}

/** The month `n` months after (before, when negative) `key`. */
export function shiftMonth(key: string, n: number): string {
  const [year, month] = key.split('-').map(Number)
  const index = year * 12 + (month - 1) + n
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** «נובמבר 2026». */
export function monthLabel(key: string, locale = 'he-IL'): string {
  const [year, month] = key.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

export const MONTH_TARGET_KEYS = ['foodPct', 'labourPct', 'primePct', 'fixedPct', 'profitPct'] as const
export type MonthTargetKey = (typeof MONTH_TARGET_KEYS)[number]

/** Starter targets: food + labour + fixed + profit = 100, prime = food + labour, each inside its Israeli band (N-M4). */
export const MONTH_TARGET_DEFAULTS: Readonly<Record<MonthTargetKey, number>> = { foodPct: 32, labourPct: 33, primePct: 65, fixedPct: 25, profitPct: 10 }

/** The band that is usual in Israel, `[from, to]`; `null` = no lower bound. */
export const MONTH_TARGET_BANDS: Readonly<Record<MonthTargetKey, readonly [number | null, number]>> = {
  foodPct: [30, 35],
  labourPct: [30, 35],
  primePct: [null, 65],
  fixedPct: [20, 25],
  profitPct: [5, 10]
}
