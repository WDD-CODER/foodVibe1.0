/** Plan 537: 24-hour time typing helpers. The value is always `HH:MM` or an empty string. */

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Keeps digits only (max 4) and inserts `:` after the hour: `0830` becomes `08:30`. */
export function formatTimeDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 3) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

/** `HH:MM` (00:00-23:59) returns the text; anything else (half-typed, `24:00`, `8:30`) returns `null`. */
export function parseHm(text: string): string | null {
  const trimmed = text.trim()
  return TIME_RE.test(trimmed) ? trimmed : null
}
