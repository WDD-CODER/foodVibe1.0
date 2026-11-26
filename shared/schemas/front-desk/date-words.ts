/**
 * Plan 751 (R-24): a guest's date words as a date, in Asia/Jerusalem. A fallback for when the model left the date out —
 * it never guesses between two dates.
 */
import { jerusalemDateTime, weekdayOf } from './local-time'

const MAX_TEXT = 2000
const NIQQUD_RE = /[֑-ׇ]/g
const ISO_RE = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g
const DAY_MONTH_RE = /(?<![\d./:])(\d{1,2})[./](\d{1,2})(?:[./](\d{4}|\d{2}))?(?![\d:])/g
const NOT_WORD_RE = /[^\p{L}\p{N}]+/gu
const CLOCK_RE = /^\s*(\d{1,2})[:.](\d{2})(?::\d{2})?\s*$/

/** Days after today of a Hebrew word; each also counts with one prefix letter. */
const HEBREW_NEAR: Record<string, number> = { היום: 0, הערב: 0, הלילה: 0, מחר: 1, מחרתיים: 2 }
const NEAR_PREFIXES = ['ו', 'ל', 'ב', 'ש', 'מ']

const HEBREW_DAYS: Record<string, number> = {
  ראשון: 0, שני: 1, שלישי: 2, רביעי: 3, חמישי: 4, שישי: 5, ששי: 5, שבת: 6
}
const ENGLISH_DAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
}
/** Form A: the word before a weekday name. */
const DAY_WORDS = new Set(['יום', 'ביום', 'ליום', 'ויום', 'מיום'])
/** Form B: the word after a weekday name. */
const NEXT_WORDS = new Set(['הקרוב', 'הקרובה', 'הבא', 'הבאה', 'הזה', 'הזאת', 'הזו'])
const NEXT_PREFIXES = ['ב', 'ל', 'ו']
/** Form D: names that count bare or with the prefix ל. */
const PLAIN_DAYS = new Set(['שלישי', 'רביעי', 'חמישי', 'שישי', 'ששי'])
/** Friday evening, not Saturday. */
const EVE_WORDS = new Set(['ערב', 'בערב'])
const SABBATH_RE = /^[בלו]?ה?שבת$/

const own = (table: Record<string, number>, key: string): number | undefined =>
  Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined

/** `y-m-d` as YYYY-MM-DD when it is a real calendar date, else null. */
function realDate(y: number, m: number, d: number): string | null {
  const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const at = Date.parse(`${iso}T00:00:00Z`)
  return !Number.isNaN(at) && new Date(at).toISOString().startsWith(iso) ? iso : null
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** A day/month, with or without a year, as the date it means from `today`; null when it means none. */
function dayMonthDate(day: number, month: number, year: string | undefined, today: string): string | null {
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  if (year !== undefined) {
    const full = realDate(year.length === 2 ? 2000 + Number(year) : Number(year), month, day)
    return full && full >= today ? full : null
  }
  const thisYear = Number(today.slice(0, 4))
  const now = realDate(thisYear, month, day)
  return now && now >= today ? now : realDate(thisYear + 1, month, day)
}

/** The weekday (Sunday = 0) a Hebrew token names where it stands, in one of the forms A–D; else undefined. */
function hebrewDay(tokens: string[], i: number): number | undefined {
  const token = tokens[i]
  const before = tokens[i - 1] ?? ''
  if (SABBATH_RE.test(token) && EVE_WORDS.has(before)) return undefined
  const bare = own(HEBREW_DAYS, token)
  if (bare !== undefined && DAY_WORDS.has(before)) return bare
  const prefix = token.charAt(0)
  const rest = token.slice(1)
  const prefixed = own(HEBREW_DAYS, rest)
  if (NEXT_WORDS.has(tokens[i + 1] ?? '')) {
    if (bare !== undefined) return bare
    if (prefixed !== undefined && NEXT_PREFIXES.includes(prefix)) return prefixed
  }
  if (prefix === 'ב' && prefixed !== undefined && rest !== 'שני') return prefixed
  if (PLAIN_DAYS.has(token) || (prefix === 'ל' && PLAIN_DAYS.has(rest))) return own(HEBREW_DAYS, token) ?? prefixed
  if (token === 'שבת' || token === 'השבת') return HEBREW_DAYS['שבת']
  return undefined
}

/** The one date `text` names, as YYYY-MM-DD seen from `now` in Asia/Jerusalem; null for none or two different ones. */
export function dateFromWords(text: string, now: number): string | null {
  const today = jerusalemDateTime(now).date
  const found = new Set<string>()
  const clean = String(text ?? '').slice(0, MAX_TEXT).toLowerCase().replace(NIQQUD_RE, '')
  const rest = clean
    .replace(ISO_RE, (_match: string, y: string, m: string, d: string) => {
      const date = realDate(Number(y), Number(m), Number(d))
      if (date) found.add(date)
      return ' '
    })
    .replace(DAY_MONTH_RE, (_match: string, d: string, m: string, y: string | undefined) => {
      const date = dayMonthDate(Number(d), Number(m), y, today)
      if (date) found.add(date)
      return ' '
    })

  const tokens = rest.replace(NOT_WORD_RE, ' ').trim().split(' ')
  const weekday = (dow: number): string => addDays(today, ((dow - weekdayOf(today)) + 7) % 7 || 7)
  tokens.forEach((token, i) => {
    const near = own(HEBREW_NEAR, token) ??
      (NEAR_PREFIXES.includes(token.charAt(0)) ? own(HEBREW_NEAR, token.slice(1)) : undefined)
    if (near !== undefined) {
      found.add(addDays(today, near))
    } else if (token === 'today' || token === 'tonight') {
      found.add(today)
    } else if (token === 'tomorrow') {
      found.add(addDays(today, tokens[i - 2] === 'day' && tokens[i - 1] === 'after' ? 2 : 1))
    } else {
      const dow = own(ENGLISH_DAYS, token) ?? hebrewDay(tokens, i)
      if (dow !== undefined) found.add(weekday(dow))
    }
  })

  return found.size === 1 ? [...found][0] : null
}

/** A clock time (`8:00`, `20.30`, `20:00:00`) as HH:mm; anything else → null. */
export function clockTimeOf(value: string): string | null {
  const match = CLOCK_RE.exec(String(value ?? ''))
  if (!match) return null
  const hour = Number(match[1])
  if (hour > 23 || Number(match[2]) > 59) return null
  return `${String(hour).padStart(2, '0')}:${match[2]}`
}
