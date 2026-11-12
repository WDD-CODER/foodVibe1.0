'use strict'
/**
 * Plan 559: the front desk numbers. Read-only; every query is scoped to one business, the LIVE filter and
 * `test: { $ne: true }` (test requests never count). Aggregates only: no name, phone or free text leaves here.
 */
const { LIVE } = require('../jobs/purge-deleted')
const { REPORT_MIN_EVENTS } = require('../constants/report')
const { closedRevenue } = require('./business-stats')
const { jerusalemDate } = require('../middleware/usage')

const DAY_MS = 86400000
const TZ = 'Asia/Jerusalem'
const CHANNELS = ['manual', 'public_form', 'whatsapp']
const KINDS = ['table', 'event', 'tasting', 'consultation']
const REASONS = ['full', 'out_of_area', 'below_minimum', 'date_taken', 'other']
const WAITING = ['new', 'qualified', 'needs_info']
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const FD_ESTIMATE_FIELDS = ['phoneInquiriesPerDay', 'messagesPerDay', 'avgResponseMinutes', 'hostHoursPerWeek', 'noShowsPerWeek', 'missedInquiriesPerWeek']

const zeros = keys => Object.fromEntries(keys.map(k => [k, 0]))
const isNum = v => typeof v === 'number' && Number.isFinite(v)
const toMinutes = hhmm => {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const dayFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

/** Israel local day (0 = Sunday) and minutes since midnight of an instant. */
function israelClock(epochMs) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(epochMs)).map(x => [x.type, x.value]))
  return { day: WEEKDAYS[p.weekday], minutes: Number(p.hour) * 60 + Number(p.minute) }
}

/** True when the instant is outside every row of `hours` (a day with no row is closed). */
function isOutsideHours(hours, epochMs) {
  const { day, minutes } = israelClock(epochMs)
  const open = (hours ?? []).some(row => {
    if (!Array.isArray(row.dayIndexes) || !row.dayIndexes.includes(day)) return false
    const from = toMinutes(row.open)
    const to = toMinutes(row.close)
    return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to
  })
  return !open
}

/** Epoch ms of 00:00 Israel time of a 'YYYY-MM-DD' date. */
function israelDayStart(dateStr) {
  const guess = Date.parse(`${dateStr}T00:00:00Z`)
  let start = guess
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(dayFmt.formatToParts(new Date(start)).map(x => [x.type, x.value]))
    const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    start -= local - guess
  }
  return start
}

const median = values => {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function baselineOf(business, requests, medianMinutes, noShowCount, days) {
  const raw = business?.baseline
  if (!raw) return null
  const measured = {
    phoneInquiriesPerDay: requests.perDay,
    avgResponseMinutes: medianMinutes,
    noShowsPerWeek: noShowCount / (days / 7),
  }
  const out = {}
  for (const f of FD_ESTIMATE_FIELDS) {
    if (!isNum(raw[f])) continue
    out[f] = { estimate: raw[f], measured: f in measured ? measured[f] : null }
  }
  return Object.keys(out).length ? out : null
}

/** The numbers of one business over [fromMs, toMs]. */
async function frontDeskStats(db, businessId, { fromMs, toMs, nowMs = Date.now() }) {
  const days = Math.max(1, Math.round((toMs + 1 - fromMs) / DAY_MS))
  const live = { businessId, ...LIVE, test: { $ne: true } }
  const [requests, testIds, profile, business] = await Promise.all([
    db.collection('requests').find(
      { ...live, createdAt: { $gte: fromMs, $lte: toMs } },
      { projection: { channel: 1, kind: 1, status: 1, createdAt: 1, outcome: 1, decline: 1 } },
    ).toArray(),
    db.collection('requests').find({ businessId, test: true }, { projection: { _id: 1 } }).toArray(),
    db.collection('frontDeskProfiles').findOne({ businessId }, { projection: { hours: 1 } }),
    db.collection('businesses').findOne({ _id: businessId }, { projection: { baseline: 1 } }),
  ])

  const byChannel = zeros(CHANNELS)
  const byKind = zeros(KINDS)
  const outcomes = { approved: 0, declined: 0, expired: 0, cancelled: 0, waiting: 0 }
  const declinesByReason = zeros(REASONS)
  for (const r of requests) {
    if (r.channel in byChannel) byChannel[r.channel] += 1
    if (r.kind in byKind) byKind[r.kind] += 1
    if (WAITING.includes(r.status)) outcomes.waiting += 1
    else if (r.status in outcomes) outcomes[r.status] += 1
    if (r.status === 'declined' && r.decline?.reason in declinesByReason) declinesByReason[r.decline.reason] += 1
  }
  const reqStats = { total: requests.length, perDay: requests.length / days, byChannel, byKind }

  const guest = requests.filter(r => r.channel !== 'manual')
  const afterHoursPct = (profile?.hours ?? []).length > 0 && guest.length > 0
    ? (guest.filter(r => isOutsideHours(profile.hours, r.createdAt)).length / guest.length) * 100
    : null

  const eventIds = requests.filter(r => r.status === 'approved' && r.outcome?.type === 'menuEvent').map(r => r.outcome.id)
  const [log, bookings, events] = await Promise.all([
    db.collection('decisionLog').find(
      { businessId, at: { $gte: fromMs, $lte: toMs }, decidedAction: { $in: ['approve', 'decline'] }, requestId: { $nin: testIds.map(t => t._id) } },
      { projection: { secondsToDecision: 1 } },
    ).toArray(),
    db.collection('bookings').find(
      { businessId, ...LIVE, startAt: { $gte: fromMs, $lte: Math.min(toMs, nowMs - 1) } },
      { projection: { status: 1 } },
    ).toArray(),
    eventIds.length
      ? db.collection('menuEvents').find({ _id: { $in: eventIds }, businessId, ...LIVE }, { projection: { closedAt: 1, closing: 1, pricing: 1, planSnapshot: 1 } }).toArray()
      : Promise.resolve([]),
  ])

  const seconds = log.map(l => l.secondsToDecision).filter(isNum)
  const medianMinutesToDecision = seconds.length >= REPORT_MIN_EVENTS ? median(seconds) / 60 : null

  const noShow = bookings.filter(b => b.status === 'no_show').length
  const attended = bookings.filter(b => b.status === 'seated' || b.status === 'finished').length + noShow
  const enough = attended >= REPORT_MIN_EVENTS

  const revenue = events.filter(e => isNum(e.closedAt)).reduce((a, e) => a + closedRevenue(e), 0)

  return {
    requests: reqStats,
    afterHoursPct,
    outcomes,
    declinesByReason,
    medianMinutesToDecision,
    bookings: { total: bookings.length, noShowRatePct: enough ? (noShow / attended) * 100 : null, enough },
    eventsFromRequests: { count: eventIds.length, revenue },
    baseline: baselineOf(business, reqStats, medianMinutesToDecision, noShow, days),
  }
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_RANGE_DAYS = 366

/** Reads ?from&to (Israel dates). Default: the last defaultDays days, today included. { error } on a bad range. */
function resolveRange(query, defaultDays, nowMs) {
  const to = query.to === undefined ? jerusalemDate(nowMs) : query.to
  if (typeof to !== 'string' || !DAY_RE.test(to) || !Number.isFinite(Date.parse(to))) return { error: 'Bad range' }
  const from = query.from === undefined ? jerusalemDate(Date.parse(to + 'T12:00:00Z') - (defaultDays - 1) * DAY_MS) : query.from
  if (typeof from !== 'string' || !DAY_RE.test(from) || !Number.isFinite(Date.parse(from))) return { error: 'Bad range' }
  const days = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1
  if (days < 1 || days > MAX_RANGE_DAYS) return { error: 'Bad range' }
  const nextDay = jerusalemDate(Date.parse(to + 'T12:00:00Z') + DAY_MS)
  return { from, to, fromMs: israelDayStart(from), toMs: israelDayStart(nextDay) - 1 }
}

module.exports = { frontDeskStats, isOutsideHours, israelDayStart, resolveRange, DAY_MS }
