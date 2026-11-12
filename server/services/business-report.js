'use strict'
/**
 * Plan 568: the business report. Read-only; every query is scoped to one business and the LIVE filter.
 * Numbers come from measured events only. Rates built on fewer than REPORT_MIN_EVENTS events are `null`.
 * The response holds aggregates and supplier names, never a client name or phone.
 */
const { LIVE } = require('../jobs/purge-deleted')
const { jerusalemDate } = require('../middleware/usage')
const C = require('../constants/report')

const DAY_MS = 86400000
const isNum = v => typeof v === 'number' && Number.isFinite(v)
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0)
const mean = (arr, f) => sum(arr, f) / arr.length

/** The same revenue rule as `business-stats.js` `eventsPipeline` (actual → planned → pricing), in JS. */
function closedRevenue(e) {
  if (isNum(e.closing?.finishedAt)) return e.closing.actualRevenue ?? e.planSnapshot?.plannedRevenue ?? 0
  return e.pricing?.revenue ?? 0
}
const supplierRows = e => (Array.isArray(e.closing?.suppliers) ? e.closing.suppliers : [])

/** The last `months` calendar months (Asia/Jerusalem), oldest first, as 'YYYY-MM'. */
function monthKeys(nowMs, months) {
  let [y, m] = jerusalemDate(nowMs).split('-').map(Number)
  const out = []
  for (let i = 0; i < months; i++) {
    out.unshift(`${y}-${String(m).padStart(2, '0')}`)
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
  }
  return out
}

const monthWindow = key => ({ hasMs: ms => jerusalemDate(ms).slice(0, 7) === key, hasDate: d => d.slice(0, 7) === key })
const rangeWindow = (fromMs, toMs) => {
  const fromD = jerusalemDate(fromMs)
  const toD = jerusalemDate(toMs)
  return { hasMs: ms => ms >= fromMs && ms <= toMs, hasDate: d => d >= fromD && d <= toD }
}

const rate = (n, value) => (n >= C.REPORT_MIN_EVENTS ? { value, enough: true, n } : { value: null, enough: false, n })
const count = n => ({ value: n, enough: true, n })

/** Every metric of one window: `{ [metric]: { value, enough, n } }`. */
function computeMetrics(events, usageDates, win) {
  const at = ms => isNum(ms) && win.hasMs(ms)
  const created = events.filter(e => at(e.createdAt))
  const closed = events.filter(e => at(e.closedAt))
  const notClosed = events.filter(e => e.stage === 'not_closed' && at(e.notClosedAt))
  const finished = events.filter(e => at(e.closing?.finishedAt))
  const priced = closed.filter(e => e.pricing?.partial !== true && isNum(e.pricing?.revenue) && e.pricing.revenue > 0)

  const withProfitPct = priced.filter(e => isNum(e.pricing.profitPct))
  const withProfit = priced.filter(e => isNum(e.pricing.profit))
  const guests = sum(withProfit, e => (isNum(e.guestCount) ? e.guestCount : 0))

  const accuracyRows = finished.flatMap(e => {
    const plannedRev = e.planSnapshot?.plannedRevenue
    const plannedPct = e.planSnapshot?.plannedProfitPct
    if (!(plannedRev > 0) || !isNum(plannedPct)) return []
    const rev = e.closing.actualRevenue ?? plannedRev
    if (!(rev > 0)) return []
    const costs = sum(supplierRows(e), r => r.actualPaid ?? r.planned ?? 0) + (e.closing.actualExtraCosts ?? e.planSnapshot?.extraCosts ?? 0)
    return [((rev - costs) / rev) * 100 - plannedPct]
  })
  const overrunEvents = finished.filter(e => supplierRows(e).some(r => isNum(r.actualPaid)))
  const overrunRows = overrunEvents.flatMap(e => supplierRows(e).filter(r => isNum(r.actualPaid)))
  const plannedSum = sum(overrunRows, r => r.planned ?? 0)

  const decided = closed.length + notClosed.length
  return {
    inquiries: count(created.length),
    eventsClosed: count(closed.length),
    closeRatePct: rate(decided, (closed.length / Math.max(decided, 1)) * 100),
    revenue: count(sum(closed, closedRevenue)),
    revenuePerEvent: rate(closed.length, closed.length ? mean(closed, closedRevenue) : 0),
    foodCostPct: rate(priced.length, priced.length ? mean(priced, e => ((e.pricing.foodCost ?? 0) / e.pricing.revenue) * 100) : 0),
    profitPct: rate(withProfitPct.length, withProfitPct.length ? mean(withProfitPct, e => e.pricing.profitPct) : 0),
    profitPerGuest: guests > 0
      ? rate(withProfit.length, sum(withProfit, e => e.pricing.profit) / guests)
      : { value: null, enough: false, n: withProfit.length },
    pricingAccuracyPts: rate(accuracyRows.length, accuracyRows.length ? accuracyRows.reduce((a, b) => a + b, 0) / accuracyRows.length : 0),
    supplierOverrunPct: plannedSum > 0
      ? rate(overrunEvents.length, ((sum(overrunRows, r => r.actualPaid) - plannedSum) / plannedSum) * 100)
      : { value: null, enough: false, n: overrunEvents.length },
    partialPricesPct: rate(closed.length, closed.length ? (closed.filter(e => e.pricing?.partial === true).length / closed.length) * 100 : 0),
    activeDays: count(usageDates.filter(win.hasDate).length),
  }
}

const seriesOf = (events, usageDates, keys) => {
  const perMonth = keys.map(k => ({ k, m: computeMetrics(events, usageDates, monthWindow(k)) }))
  return Object.fromEntries(C.REPORT_METRICS.map(({ key }) => [key, perMonth.map(({ k, m }) => ({ month: k, ...m[key] }))]))
}

function changeOf(start, latest) {
  const out = {}
  for (const { key, kind } of C.REPORT_METRICS) {
    const s = start[key]
    const l = latest[key]
    const ok = s.enough && l.enough && isNum(s.value) && isNum(l.value)
    if (kind === 'pct') out[key] = { changePts: ok ? l.value - s.value : null }
    else out[key] = { changePct: ok && s.value !== 0 ? ((l.value - s.value) / s.value) * 100 : null }
  }
  return out
}

function baselineOf(business) {
  const b = business?.baseline
  if (!b) return { baseline: null, estimatesOnly: null }
  const baseline = {}
  for (const [field, metric] of Object.entries(C.BASELINE_TO_METRIC)) if (isNum(b[field])) baseline[metric] = b[field]
  const only = {}
  for (const f of C.ESTIMATES_ONLY_FIELDS) if (isNum(b[f])) only[f] = b[f]
  return {
    baseline: Object.keys(baseline).length ? baseline : null,
    estimatesOnly: Object.keys(only).length ? only : null,
  }
}

/** Rule-based findings over the selected months, at most REPORT_MAX_FINDINGS, in priority order. */
function findingsOf(events, business, win) {
  const T = C.FINDING_THRESHOLDS
  const at = ms => isNum(ms) && win.hasMs(ms)
  const closed = events.filter(e => at(e.closedAt))
  const out = []

  const target = isNum(business?.settings?.profitTargetPct) ? business.settings.profitTargetPct : 25
  const withPct = closed.filter(e => isNum(e.pricing?.profitPct))
  const below = withPct.filter(e => e.pricing.profitPct < target)
  if (below.length >= T.belowProfitTargetMin) out.push({ key: 'below_profit_target', value: below.length, evidenceCount: withPct.length })

  const partial = closed.filter(e => e.pricing?.partial === true)
  if (partial.length >= T.closedWithPartialMin) out.push({ key: 'closed_with_partial_prices', value: partial.length, evidenceCount: partial.length })

  const reasons = new Map()
  for (const e of events) {
    if (e.stage === 'not_closed' && at(e.notClosedAt) && typeof e.notClosedReason === 'string') {
      reasons.set(e.notClosedReason, (reasons.get(e.notClosedReason) ?? 0) + 1)
    }
  }
  const topReason = [...reasons.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  if (topReason && topReason[1] >= T.topNotClosedReasonMin) out.push({ key: 'top_not_closed_reason', value: topReason[0], evidenceCount: topReason[1] })

  const threshold = isNum(business?.settings?.overrunThresholdPct) ? business.settings.overrunThresholdPct : 10
  const suppliers = new Map()
  for (const e of events.filter(ev => at(ev.closing?.finishedAt))) {
    const seen = new Set()
    for (const r of supplierRows(e)) {
      if (!isNum(r.actualPaid) || !r.supplierId) continue
      const s = suppliers.get(r.supplierId) ?? { name: r.name ?? '', planned: 0, actual: 0, events: 0 }
      s.planned += r.planned ?? 0
      s.actual += r.actualPaid
      if (r.name) s.name = r.name
      if (!seen.has(r.supplierId)) { s.events += 1; seen.add(r.supplierId) }
      suppliers.set(r.supplierId, s)
    }
  }
  const worst = [...suppliers.values()]
    .filter(s => s.events >= T.supplierOverrunMinEvents && s.planned > 0)
    .map(s => ({ ...s, pct: ((s.actual - s.planned) / s.planned) * 100 }))
    .filter(s => s.pct > threshold)
    .sort((a, b) => b.pct - a.pct)[0]
  if (worst) out.push({ key: 'top_supplier_overrun', value: { name: worst.name, overrunPct: worst.pct }, evidenceCount: worst.events })

  return out.slice(0, C.REPORT_MAX_FINDINGS)
}

const PROJECTION = {
  createdAt: 1, guestCount: 1, pricing: 1, 'planSnapshot.plannedRevenue': 1, 'planSnapshot.plannedProfitPct': 1,
  'planSnapshot.extraCosts': 1, 'closing.suppliers.supplierId': 1, 'closing.suppliers.name': 1, 'closing.suppliers.planned': 1,
  'closing.suppliers.actualPaid': 1, 'closing.actualExtraCosts': 1, 'closing.actualRevenue': 1, 'closing.finishedAt': 1,
  stage: 1, closedAt: 1, notClosedAt: 1, notClosedReason: 1,
}

/** Builds the report of one business. `db` is the native Mongo db. */
async function buildReport(db, business, months, nowMs = Date.now()) {
  const businessId = business._id
  const base = { businessId, ...LIVE, legacy: { $ne: true } }
  const keys = monthKeys(nowMs, months)
  // Start of the oldest month, with a day of slack for the Israel time zone; the per-month filter is exact.
  const rangeFrom = Date.parse(`${keys[0]}-01T00:00:00Z`) - DAY_MS
  const firstDoc = await db.collection('menuEvents').find(base).project({ createdAt: 1 }).sort({ createdAt: 1 }).limit(1).next()
  const firstEventAt = isNum(firstDoc?.createdAt) ? firstDoc.createdAt : null

  const ranges = [{ from: rangeFrom, to: nowMs }]
  if (firstEventAt !== null) ranges.push({ from: firstEventAt, to: firstEventAt + C.REPORT_WINDOW_DAYS * DAY_MS })
  const fields = ['createdAt', 'closedAt', 'notClosedAt', 'closing.finishedAt']
  const or = ranges.flatMap(r => fields.map(f => ({ [f]: { $gte: r.from, $lte: r.to } })))
  const events = await db.collection('menuEvents').find({ ...base, $or: or }).project(PROJECTION).toArray()

  const usageFrom = jerusalemDate(Math.min(rangeFrom, firstEventAt ?? rangeFrom))
  const usageDates = (await db.collection('usageDays')
    .find({ businessId, date: { $gte: usageFrom, $lte: jerusalemDate(nowMs) } }).project({ date: 1 }).toArray())
    .map(d => d.date)

  const series = seriesOf(events, usageDates, keys)
  const empty = Object.fromEntries(C.REPORT_METRICS.map(({ key }) => [key, { value: null, enough: false, n: 0 }]))
  const startWin = firstEventAt === null ? null : { from: firstEventAt, to: Math.min(nowMs, firstEventAt + C.REPORT_WINDOW_DAYS * DAY_MS) }
  const latestWin = { from: nowMs - C.REPORT_WINDOW_DAYS * DAY_MS, to: nowMs }
  const startMetrics = startWin ? computeMetrics(events, usageDates, rangeWindow(startWin.from, startWin.to)) : empty
  const latestMetrics = computeMetrics(events, usageDates, rangeWindow(latestWin.from, latestWin.to))
  const { baseline, estimatesOnly } = baselineOf(business)
  const selected = { hasMs: ms => ms <= nowMs && keys.includes(jerusalemDate(ms).slice(0, 7)) }

  return {
    months,
    businessName: business.name ?? '',
    firstEventAt,
    series,
    start: { from: startWin?.from ?? null, to: startWin?.to ?? null, metrics: startMetrics },
    latest: { from: latestWin.from, to: latestWin.to, metrics: latestMetrics },
    comparable: firstEventAt !== null && nowMs - firstEventAt >= C.REPORT_COMPARABLE_DAYS * DAY_MS,
    change: changeOf(startMetrics, latestMetrics),
    baseline,
    estimatesOnly,
    findings: findingsOf(events, business, selected),
  }
}

module.exports = { buildReport, computeMetrics, monthKeys, findingsOf, closedRevenue }
