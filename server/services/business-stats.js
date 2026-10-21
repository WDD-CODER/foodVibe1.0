'use strict'
/**
 * Plan 447 (spec 07.2): the dashboard numbers. Pure builders: every number is computed here, in MongoDB
 * aggregations scoped to one business, never in the browser. `routes/stats.js` is the only caller.
 * All arithmetic is unrounded; the client rounds only when it shows a number.
 */
const { LIVE } = require('../jobs/purge-deleted')
const { EVENT_STAGES } = require('../generated/schemas/entities/event-stage')
const { jerusalemDate } = require('../middleware/usage')

const DAY_MS = 86400000
const PERIODS = ['30', '90', 'all']
/** Stages the funnel shows: every stage an event is still being worked on (not finished, not lost). */
const FUNNEL_STAGES = EVENT_STAGES.filter(s => s !== 'finished' && s !== 'not_closed')
const UPCOMING_DAYS = 14
const UPCOMING_LIMIT = 50

const numeric = field => ({ $in: [{ $type: field }, ['double', 'int', 'long', 'decimal']] })
const notLegacy = { legacy: { $ne: true } }
const orZero = (field, fallback = 0) => ({ $ifNull: [field, fallback] })

/** Start of the period (epoch ms), its length in days and the Israel date of its first day. */
function periodBounds(period, nowMs, businessCreatedAt) {
  if (period === 'all') {
    const startMs = typeof businessCreatedAt === 'number' ? businessCreatedAt : nowMs
    const periodDays = Math.max(1, Math.ceil((nowMs - startMs) / DAY_MS))
    return { startMs, periodDays, startDateIL: jerusalemDate(startMs) }
  }
  const periodDays = Number(period)
  const startMs = nowMs - periodDays * DAY_MS
  return { startMs, periodDays, startDateIL: jerusalemDate(startMs) }
}

/** The one `$facet` over a business's live events. `scope` is `scopeFilter(req)`. */
function eventsPipeline(scope, bounds, todayIL, plus14IL, nowMs) {
  const inPeriod = field => ({ [field]: { $gte: bounds.startMs, $lte: nowMs } })
  const closedRevenue = {
    $cond: [
      numeric('$closing.finishedAt'),
      orZero('$closing.actualRevenue', orZero('$planSnapshot.plannedRevenue')),
      orZero('$pricing.revenue'),
    ],
  }
  const supplierCosts = {
    $reduce: {
      input: orZero('$closing.suppliers', []),
      initialValue: 0,
      in: { $add: ['$$value', orZero('$$this.actualPaid', orZero('$$this.planned'))] },
    },
  }
  return [
    { $match: { ...scope, ...LIVE } },
    { $facet: {
      inquiries: [{ $match: { ...notLegacy, ...inPeriod('createdAt') } }, { $count: 'n' }],
      closed: [{ $match: { ...notLegacy, ...inPeriod('closedAt') } }, { $count: 'n' }],
      notClosed: [{ $match: { ...notLegacy, stage: 'not_closed', ...inPeriod('notClosedAt') } }, { $count: 'n' }],
      revenue: [
        { $match: { ...notLegacy, ...inPeriod('closedAt') } },
        { $group: { _id: null, total: { $sum: closedRevenue } } },
      ],
      accuracy: [
        { $match: { ...notLegacy, 'closing.finishedAt': { $gte: bounds.startMs, $lte: nowMs }, 'planSnapshot.plannedRevenue': { $gt: 0 } } },
        { $addFields: {
          rev: orZero('$closing.actualRevenue', '$planSnapshot.plannedRevenue'),
          costs: { $add: [supplierCosts, orZero('$closing.actualExtraCosts', orZero('$planSnapshot.extraCosts'))] },
        } },
        { $match: { rev: { $gt: 0 }, 'planSnapshot.plannedProfitPct': { $type: 'number' } } },
        { $addFields: { actualPct: { $multiply: [{ $divide: [{ $subtract: ['$rev', '$costs'] }, '$rev'] }, 100] } } },
        { $group: {
          _id: null,
          n: { $sum: 1 },
          avgActualPct: { $avg: '$actualPct' },
          avgPts: { $avg: { $subtract: ['$actualPct', '$planSnapshot.plannedProfitPct'] } },
        } },
      ],
      funnel: [
        { $match: { ...notLegacy, stage: { $in: FUNNEL_STAGES } } },
        { $group: { _id: '$stage', n: { $sum: 1 } } },
      ],
      upcoming: [
        { $match: { eventDate: { $gte: todayIL, $lte: plus14IL }, stage: { $ne: 'not_closed' } } },
        { $sort: { eventDate: 1, name: 1 } },
        { $limit: UPCOMING_LIMIT },
        { $project: { _id: 1, name: 1, eventDate: 1, guestCount: 1, stage: 1, legacy: 1 } },
      ],
    } },
  ]
}

/** Distinct active dates of the business in the period (owner and staff on one day count once). */
function usagePipeline(scope, bounds, todayIL) {
  return [
    { $match: { ...scope, date: { $gte: bounds.startDateIL, $lte: todayIL } } },
    { $group: { _id: '$date' } },
    { $count: 'activeDays' },
  ]
}

const first = (rows, key) => (rows?.[0]?.[key] ?? 0)
const numOrNull = v => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** (value − baseline) ÷ baseline in percent; null without a usable baseline. */
const changePct = (value, baseline) => (baseline === null || baseline === 0 ? null : ((value - baseline) / baseline) * 100)

const BASELINE_FIELDS = ['inquiriesPerMonth', 'eventsClosedPerMonth', 'avgRevenuePerEvent', 'estProfitPct']

/** The response of `GET /api/v1/stats/business`. `cards` only for the owner. */
function shapeStats(facet, usage, business, isOwner, period, bounds) {
  const baseline = business?.baseline ?? null
  const hasBaseline = !!baseline && BASELINE_FIELDS.some(f => numOrNull(baseline[f]) !== null)
  const b = f => (hasBaseline ? numOrNull(baseline[f]) : null)
  const toMonth = value => (value / bounds.periodDays) * 30

  const funnelCounts = new Map((facet.funnel ?? []).map(r => [r._id, r.n]))
  const funnel = FUNNEL_STAGES.map(stage => ({ stage, count: funnelCounts.get(stage) ?? 0 }))
  const upcoming = (facet.upcoming ?? []).map(e => ({
    _id: e._id, name: e.name ?? '', eventDate: e.eventDate, guestCount: numOrNull(e.guestCount), stage: e.stage ?? null, legacy: e.legacy === true,
  }))
  const out = { period, periodDays: bounds.periodDays, hasBaseline, funnel, upcoming }
  if (!isOwner) return out

  const inquiries = first(facet.inquiries, 'n')
  const closed = first(facet.closed, 'n')
  const notClosed = first(facet.notClosed, 'n')
  const revenue = first(facet.revenue, 'total')
  const closedBase = b('eventsClosedPerMonth')
  const avgRevenueBase = b('avgRevenuePerEvent')
  const revenueBase = closedBase !== null && avgRevenueBase !== null ? closedBase * avgRevenueBase : null
  const inquiriesBase = b('inquiriesPerMonth')
  const acc = facet.accuracy?.[0]
  const avgActualProfitPct = acc ? numOrNull(acc.avgActualPct) : null
  const estProfitPct = b('estProfitPct')
  const activeDays = usage?.[0]?.activeDays ?? 0

  out.cards = {
    inquiries: { value: inquiries, monthly: toMonth(inquiries), baseline: inquiriesBase, changePct: changePct(toMonth(inquiries), inquiriesBase) },
    closed: {
      value: closed,
      notClosed,
      closeRatePct: closed + notClosed > 0 ? (closed / (closed + notClosed)) * 100 : null,
      monthly: toMonth(closed),
      baseline: closedBase,
      changePct: changePct(toMonth(closed), closedBase),
    },
    revenue: { value: revenue, monthly: toMonth(revenue), baseline: revenueBase, changePct: changePct(toMonth(revenue), revenueBase) },
    accuracy: {
      finishedCount: acc?.n ?? 0,
      avgAccuracyPts: acc ? numOrNull(acc.avgPts) : null,
      avgActualProfitPct,
      baselineEstProfitPct: estProfitPct,
      vsBaselinePts: avgActualProfitPct !== null && estProfitPct !== null ? avgActualProfitPct - estProfitPct : null,
    },
    usage: { activeDays, perWeek: activeDays / (bounds.periodDays / 7) },
  }
  return out
}

module.exports = {
  PERIODS, FUNNEL_STAGES, UPCOMING_DAYS, periodBounds, eventsPipeline, usagePipeline, shapeStats,
}
