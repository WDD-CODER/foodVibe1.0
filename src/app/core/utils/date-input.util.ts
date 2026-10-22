/** Plan 467: day/month/year typing helpers. The stored value is always an ISO date (`yyyy-mm-dd`). */

const MIN_YEAR = 1900
const MAX_YEAR = 2999

/** Keeps digits only (max 8) and inserts `/` after the day and the month: `25122026` becomes `25/12/2026`. */
export function formatDateDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** `dd/mm/yyyy` to `yyyy-mm-dd`; `null` while incomplete or for an impossible day (`31/02/2026`, month 13, year < 1900). */
export function parseDmy(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim())
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1) return null
  if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

/** `yyyy-mm-dd` to `dd/mm/yyyy`; an empty or malformed value gives an empty string. */
export function isoToDmy(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

/** Today in the user's own timezone as `yyyy-mm-dd` (not UTC, which can be yesterday in Israel). */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
