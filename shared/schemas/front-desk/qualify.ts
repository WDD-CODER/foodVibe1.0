import type { OperatingHoursRow } from '../entities/common.schema'
import type { FrontDeskRequestKind, RequestKindConfig } from '../entities/front-desk-profile.schema'
import { WANTED_QUESTION_KEYS } from '../front-desk-templates'
import { jerusalemEpoch, weekdayOf } from './local-time'

/** What the customer asked for, in the fields the rules read. */
export interface Wanted {
  date?: string
  time?: string
  partySize?: number
  eventTypeKey?: string
  budgetPerGuest?: number
  location?: string
}

export type Verdict = 'fit' | 'borderline' | 'unfit'
export interface Qualification {
  verdict: Verdict
  reasons: string[]
}

export interface QualifyContext {
  now?: number
  hours?: OperatingHoursRow[]
  closedDates?: string[]
  kind?: FrontDeskRequestKind
}

export type HoursCheck =
  | { ok: true }
  | { ok: true; unchecked: true }
  | { ok: false; reason: 'closed_day'; openDays: number[] }
  | { ok: false; reason: 'outside_hours'; open: string; close: string }

const MAX_REASONS = 8
const MARGIN = 0.1
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/** Splits `key|a=1;b=2` into its dictionary key and params. */
export function parseReason(reason: string): { key: string; params: Record<string, string> } {
  const bar = reason.indexOf('|')
  if (bar < 0) return { key: reason, params: {} }
  const params: Record<string, string> = {}
  for (const part of reason.slice(bar + 1).split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0) params[part.slice(0, eq)] = part.slice(eq + 1)
  }
  return { key: reason.slice(0, bar), params }
}

const checkable = (row: OperatingHoursRow): boolean =>
  Array.isArray(row.dayIndexes) && typeof row.open === 'string' && typeof row.close === 'string'

/** Is `time` inside [open, close]? A close at or before the open runs past midnight. */
function within(time: string, open: string, close: string): boolean {
  return close > open ? time >= open && time <= close : time >= open || time <= close
}

/** The opening-hours rule on its own (plan 559 reuses it for "after hours"). */
export function hoursCheck(hours: OperatingHoursRow[], date: string, time?: string): HoursCheck {
  const rows = hours.filter(checkable)
  if (!rows.length) return { ok: true, unchecked: true }
  const day = weekdayOf(date)
  const todays = rows.filter(r => r.dayIndexes!.includes(day))
  if (!todays.length) {
    const openDays = [...new Set(rows.flatMap(r => r.dayIndexes!))].sort((a, b) => a - b)
    return { ok: false, reason: 'closed_day', openDays }
  }
  if (!time) return { ok: true }
  if (todays.some(r => within(time, r.open!, r.close!))) return { ok: true }
  return { ok: false, reason: 'outside_hours', open: todays[0].open!, close: todays[0].close! }
}

const isBlank = (v: unknown): boolean => v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v))

/** Fits a customer's request against one request kind's rules. Pure; reasons are dictionary keys (`key|name=value`). */
export function qualify(
  kindConfig: RequestKindConfig,
  wanted: Wanted,
  answers: Record<string, unknown> = {},
  ctx: QualifyContext = {}
): Qualification {
  if (!kindConfig.enabled) return { verdict: 'unfit', reasons: ['fd_reason_kind_disabled'] }
  const reasons: string[] = []
  let unfit = false
  const rules = kindConfig.rules ?? {}

  for (const q of kindConfig.questions) {
    if (!q.required) continue
    const field = (WANTED_QUESTION_KEYS as Record<string, keyof Wanted>)[q.key]
    const value = field ? wanted[field] : answers[q.key]
    if (isBlank(value)) reasons.push(`fd_reason_missing_answer|q=${q.key}`)
  }

  const size = wanted.partySize
  if (typeof size === 'number') {
    if (rules.minPartySize !== undefined && size < rules.minPartySize) {
      reasons.push(`fd_reason_party_too_small|min=${rules.minPartySize}`)
      if (size < rules.minPartySize * (1 - MARGIN)) unfit = true
    }
    if (rules.maxPartySize !== undefined && size > rules.maxPartySize) {
      reasons.push(`fd_reason_party_too_large|max=${rules.maxPartySize}`)
      if (size > rules.maxPartySize * (1 + MARGIN)) unfit = true
    }
  }

  const budget = wanted.budgetPerGuest
  if (typeof budget === 'number' && rules.minBudgetPerGuest !== undefined && budget < rules.minBudgetPerGuest) {
    reasons.push(`fd_reason_budget_low|min=${rules.minBudgetPerGuest}`)
    if (budget < rules.minBudgetPerGuest * (1 - MARGIN)) unfit = true
  }

  if (rules.areas?.length && wanted.location) {
    const place = wanted.location.toLowerCase()
    if (!rules.areas.some(a => a.trim() && place.includes(a.trim().toLowerCase()))) {
      reasons.push('fd_reason_out_of_area')
      unfit = true
    }
  }

  const date = wanted.date
  if (date && ctx.closedDates?.includes(date)) {
    reasons.push('fd_reason_closed_date')
    unfit = true
  }

  // An event happens at the customer's place and time, so the opening hours do not apply to it.
  if (date && ctx.hours && ctx.kind !== 'event') {
    const res = hoursCheck(ctx.hours, date, wanted.time)
    if ('reason' in res) {
      reasons.push(res.reason === 'closed_day'
        ? `fd_reason_closed_day|days=${res.openDays.join(',')}`
        : `fd_reason_outside_hours|open=${res.open};close=${res.close}`)
      unfit = true
    }
  }

  if (date && ctx.now !== undefined) {
    const lead = jerusalemEpoch(date, wanted.time ?? '12:00') - ctx.now
    if (rules.minLeadHours !== undefined && lead < rules.minLeadHours * HOUR_MS) {
      reasons.push(`fd_reason_too_soon|hours=${rules.minLeadHours}`)
      unfit = true
    }
    if (rules.maxLeadDays !== undefined && lead > rules.maxLeadDays * DAY_MS) {
      reasons.push(`fd_reason_too_far|days=${rules.maxLeadDays}`)
      unfit = true
    }
  }

  const kept = reasons.slice(0, MAX_REASONS).map(r => r.slice(0, 80))
  return { verdict: unfit ? 'unfit' : kept.length ? 'borderline' : 'fit', reasons: kept }
}
