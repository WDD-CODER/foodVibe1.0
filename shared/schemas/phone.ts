/**
 * Plan 544 (R-01): the one phone rule for server, browser and migrations. Pure, no imports.
 */

/** The digits of a phone as typed (`+972 52-123 4567` → `972521234567`). */
export function normalizePhone(s: string): string {
  return String(s ?? '').replace(/\D/g, '')
}

/**
 * The match key for one person across channels: the last 9 digits when there are at least 9, else all of them
 * (`0521234567` and `972521234567` → `521234567`).
 */
export function phoneKey(digits: string): string {
  return digits.length >= 9 ? digits.slice(-9) : digits
}
