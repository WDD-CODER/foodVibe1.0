'use strict'
/**
 * Plan 559: the front desk numbers of one business. Read-only; every query is scoped to one businessId and the LIVE
 * filter, and test requests (`test: true`) never count. Aggregates only: no name, phone or answer text leaves here.
 */
const { LIVE } = require('../jobs/purge-deleted')
const { closedRevenueOf } = require('./business-stats')
const { REPORT_MIN_EVENTS } = require('../constants/report')

const DAY_MS = 86400000
const CHANNELS = ['manual', 'public_form', 'whatsapp']
const KINDS = ['table', 'event', 'tasting', 'consultation']
const REASONS = ['full', 'out_of_area', 'below_minimum', 'date_taken', 'other']
const WAITING = ['new', 'qualified', 'needs_info']
const BASELINE_FIELDS = ['phoneInquiriesPerDay', 'messagesPerDay', 'avgResponseMinutes', 'hostHoursPerWeek', 'noShowsPerWeek', 'missedInquiriesPerWeek']
const isNum = v => typeof v === 'number' && Number.isFinite(v)
const zeros = keys => Object.fromEntries(keys.map(k => [k, 0]))

const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hourCycle: 'h23', weekday: 'short', hour: '2-digit', minute: '2-digit' })
const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Israel local day index (0 = Sunday) and minutes since midnight of an instant. */
function israelClock(epochMs) {
  const p = Object.fromEntries(clockFmt.formatToParts(new Date(epochMs)).map(x => [x.type, x.value]))
  return { day: WEEKDAY[p.weekday], minutes: Number(p.hour) * 60 + Number(p.minute) }
}

const toMinutes = hhmm => {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

/** True when the instant falls outside every row of `hours` (a day with no row is closed). */
function isOutsideHours(hours, epochMs) {
  const { day, minutes } = israelClock(epochMs)
  return !hours.some(row => (row.dayIndexes ?? []).includes(day) && minutes >= toMinutes(row.open) && minutes < toMinutes(row.close))
}

const median = nums => {
  const s = [...nums].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Epoch ms of the first instant of an Israel calendar day 'YYYY-MM-DD'. */
function dayStartMs(date) {
  const [y, m, d] = date.split('-').map(Number)
  const utc = Date.UTC(y, m - 1, d)
  const probe = utc - 3 * 3600000
  const local = new Date(probe)
  let diff = israelClock(probe).minutes - (local.getUTCHours() * 60 + local.getUTCMinutes())
  if (diff < -12 * 60) diff += 24 * 60
  if (diff > 12 * 60) diff -= 24 * 60
  return utc - diff * 60000
}
const nextDate = date => new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10)

/** The inclusive millisecond range of the Israel dates `from`..`to`, and its length in days. */
function rangeOf(from, to) {
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1
  return { fromMs: dayStartMs(from), toMs: dayStartMs(nextDate(to)) - 1, days }
}

const { jerusalemDate } = require('../middleware/usage')
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_RANGE_DAYS = 366

/** Reads `from` / `to` (Israel dates) from a query; default the last `defaultDays` days, today included. `null` when invalid. */
function parseRange(query, defaultDays, nowMs = Date.now()) {
  const to = query.to === undefined ? jerusalemDate(nowMs) : query.to
  const from = query.from === undefined ? jerusalemDate(Date.parse(`${to}T12:00:00Z`) - (defaultDays - 1) * DAY_MS) : query.from
  if (typeof from !== 'string' || typeof to !== 'string' || !DATE_RE.test(from) || !DATE_RE.test(to)) return null
  if (Number.isNaN(Date.parse(`${from}T00:00:00Z`)) || Number.isNaN(Date.parse(`${to}T00:00:00Z`))) return null
  const r = rangeOf(from, to)
  if (r.days < 1 || r.days > MAX_RANGE_DAYS) return null
  return { from, to, ...r }
}

/** Each filled front desk estimate, with its measured twin where there is one; null when none is filled. */
function baselineOf(business, measured) {
  const b = business?.baseline ?? {}
  const twins = { phoneInquiriesPerDay: measured.perDay, avgResponseMinutes: measured.median, noShowsPerWeek: measured.noShowsPerWeek }
  const out = {}
  for (const f of BASELINE_FIELDS) {
    if (!isNum(b[f])) continue
    out[f] = f in twins ? { estimate: b[f], measured: twins[f] } : { estimate: b[f] }
  }
  return Object.keys(out).length ? out : null
}

/** `{ fromMs, toMs, days }` comes from `rangeOf`; `business` is the stored business doc (for its baseline). */
async function frontDeskStats(db, businessId, { fromMs, toMs, days, nowMs = Date.now() }, business = null) {
  const live = { businessId, ...LIVE }
  const inRange = { $gte: fromMs, $lte: toMs }
  const [requests, profile, testIds, bookings] = await Promise.all([
    db.collection('requests').find({ ...live, test: { $ne: true }, createdAt: inRange })
      .project({ kind: 1, status: 1, channel: 1, createdAt: 1, decline: 1, outcome: 1 }).toArray(),
    db.collection('frontDeskProfiles').findOne({ businessId, ...LIVE }, { projection: { hours: 1 } }),
    db.collection('requests').find({ ...live, test: true }).project({ _id: 1 }).toArray(),
    db.collection('bookings').find({ ...live, startAt: { $gte: fromMs, $lte: Math.min(toMs, nowMs - 1) } }).project({ status: 1 }).toArray(),
  ])
  const decisions = await db.collection('decisionLog')
    .find({ ...live, at: inRange, decidedAction: { $in: ['approve', 'decline'] }, requestId: { $nin: testIds.map(r => r._id) } })
    .project({ secondsToDecision: 1 }).toArray()

  const byChannel = zeros(CHANNELS)
  const byKind = zeros(KINDS)
  const outcomes = { approved: 0, declined: 0, expired: 0, cancelled: 0, waiting: 0 }
  const declinesByReason = zeros(REASONS)
  for (const r of requests) {
    if (r.channel in byChannel) byChannel[r.channel] += 1
    if (r.kind in byKind) byKind[r.kind] += 1
    if (r.status === 'approved') outcomes.approved += 1
    else if (r.status === 'declined') {
      outcomes.declined += 1
      if (r.decline?.reason in declinesByReason) declinesByReason[r.decline.reason] += 1
    } else if (r.status === 'expired') outcomes.expired += 1
    else if (r.status === 'cancelled') outcomes.cancelled += 1
    else if (WAITING.includes(r.status)) outcomes.waiting += 1
  }

  const hours = Array.isArray(profile?.hours) ? profile.hours : []
  const guest = requests.filter(r => r.channel !== 'manual')
  const afterHoursPct = hours.length && guest.length
    ? (guest.filter(r => isOutsideHours(hours, r.createdAt)).length / guest.length) * 100
    : null

  const minutes = decisions.filter(d => isNum(d.secondsToDecision)).map(d => d.secondsToDecision / 60)
  const medianMinutesToDecision = minutes.length >= REPORT_MIN_EVENTS ? median(minutes) : null

  const count = s => bookings.filter(b => b.status === s).length
  const noShow = count('no_show')
  const attended = count('seated') + count('finished') + noShow
  const enough = attended >= REPORT_MIN_EVENTS

  const eventIds = requests.filter(r => r.status === 'approved' && r.outcome?.type === 'menuEvent').map(r => r.outcome.id)
  const events = eventIds.length ? await db.collection('menuEvents').find({ businessId, ...LIVE, _id: { $in: eventIds } }).toArray() : []
  const revenue = events.filter(e => isNum(e.closedAt)).reduce((a, e) => a + closedRevenueOf(e), 0)

  const perDay = requests.length / Math.max(days, 1)
  return {
    from: fromMs,
    to: toMs,
    requests: { total: requests.length, perDay, byChannel, byKind },
    afterHoursPct,
    outcomes,
    declinesByReason,
    medianMinutesToDecision,
    bookings: { total: bookings.length, noShowRatePct: enough ? (noShow / attended) * 100 : null, enough },
    eventsFromRequests: { count: eventIds.length, revenue },
    baseline: baselineOf(business, { perDay, median: medianMinutesToDecision, noShowsPerWeek: noShow / Math.max(days / 7, 1 / 7) }),
  }
}

module.exports = { parseRange, frontDeskStats, isOutsideHours, rangeOf, dayStartMs }
