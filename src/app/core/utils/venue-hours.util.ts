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
