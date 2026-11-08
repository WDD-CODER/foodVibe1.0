import type { VenueOperatingHours } from '@models/venue.model'

export interface VenueHoursSummary {
  /** First block as "days · time" (or whichever half is filled), '' when there is nothing to show. */
  first: string
  /** How many more blocks exist beyond the first (shown as "+N"). */
  extra: number
}

/**
 * Compact one-line summary of a venue's opening hours for the card and detail page (plan 371).
 * Reads the free-text `days` / `time` strings; blocks with both empty are ignored.
 * Plan 372 (Venues B) extends this for structured hours.
 */
export function formatVenueHours(hours: readonly VenueOperatingHours[] | null | undefined): VenueHoursSummary {
  const lines = (hours ?? [])
    .map((h) => [h?.days?.trim(), h?.time?.trim()].filter(Boolean).join(' · '))
    .filter((line) => line.length > 0)
  if (lines.length === 0) return { first: '', extra: 0 }
  return { first: lines[0], extra: lines.length - 1 }
}

/** Every non-empty block as "days · time", for the detail page's full list. */
export function formatVenueHoursLines(hours: readonly VenueOperatingHours[] | null | undefined): string[] {
  return (hours ?? [])
    .map((h) => [h?.days?.trim(), h?.time?.trim()].filter(Boolean).join(' · '))
    .filter((line) => line.length > 0)
}

/** Plan 537: result of checking one opening-hours row in the venue form. */
export type HoursRowResult =
  'empty' | 'missing_days' | 'time_invalid' | 'missing_time' | 'same_time' | 'overnight' | 'ok'

export interface HoursRowInput {
  days: string
  open: string
  close: string
  openInvalid?: boolean
  closeInvalid?: boolean
}

const RANGE_RE = /^(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})$/

function padHm(text: string): string | null {
  const [h, m] = text.split(':')
  const padded = `${h.padStart(2, '0')}:${m}`
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(padded) ? padded : null
}

/** `08:00–23:00` (also `8:00 - 23:00`, `08:00—23:00`) to `{ open, close }`; `null` when it is not two times. */
export function parseTimeRange(time: string | null | undefined): { open: string; close: string } | null {
  const match = RANGE_RE.exec((time ?? '').trim())
  if (!match) return null
  const open = padHm(match[1])
  const close = padHm(match[2])
  return open && close ? { open, close } : null
}

/** The stored string: `08:00–23:00` (en dash, no spaces). */
export function formatTimeRange(open: string, close: string): string {
  return `${open}–${close}`
}

/** First match wins; see plan 537. `overnight` is valid: the venue closes the next day. */
export function checkHoursRow(row: HoursRowInput): HoursRowResult {
  const noDays = !row.days?.trim()
  const half = !!row.openInvalid || !!row.closeInvalid
  if (noDays && !row.open && !row.close && !half) return 'empty'
  if (noDays) return 'missing_days'
  if (half) return 'time_invalid'
  if (!row.open || !row.close) return 'missing_time'
  if (row.close === row.open) return 'same_time'
  if (row.close < row.open) return 'overnight'
  return 'ok'
}
