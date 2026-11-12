'use strict'
/** Plan 568: the numbers behind the business report, in one tested place. */

/** Closed list of metrics, with how each is shown. kind: count | money | pct (percent or points). */
const REPORT_METRICS = Object.freeze([
  { key: 'inquiries', kind: 'count', rate: false },
  { key: 'eventsClosed', kind: 'count', rate: false },
  { key: 'closeRatePct', kind: 'pct', rate: true },
  { key: 'revenue', kind: 'money', rate: false },
  { key: 'revenuePerEvent', kind: 'money', rate: true },
  { key: 'foodCostPct', kind: 'pct', rate: true },
  { key: 'profitPct', kind: 'pct', rate: true },
  { key: 'profitPerGuest', kind: 'money', rate: true },
  { key: 'pricingAccuracyPts', kind: 'pct', rate: true },
  { key: 'supplierOverrunPct', kind: 'pct', rate: true },
  { key: 'partialPricesPct', kind: 'pct', rate: true },
  { key: 'activeDays', kind: 'count', rate: false },
])

const REPORT_MONTHS = Object.freeze([3, 6, 12])
const REPORT_DEFAULT_MONTHS = 6
/** A rate or an average built on fewer events than this is not shown (value null, enough false). */
const REPORT_MIN_EVENTS = 3
/** Length of the "first" and "latest" windows, in days; `comparable` needs twice this since the first event. */
const REPORT_WINDOW_DAYS = 30
const REPORT_COMPARABLE_DAYS = 60
const REPORT_MAX_FINDINGS = 3

const FINDING_THRESHOLDS = Object.freeze({
  belowProfitTargetMin: 2,
  closedWithPartialMin: 1,
  topNotClosedReasonMin: 2,
  supplierOverrunMinEvents: 2,
})

/** Priority order of the findings. */
const FINDING_KEYS = Object.freeze(['below_profit_target', 'closed_with_partial_prices', 'top_not_closed_reason', 'top_supplier_overrun'])

/** Stored baseline field → measured metric key. */
const BASELINE_TO_METRIC = Object.freeze({
  inquiriesPerMonth: 'inquiries',
  eventsClosedPerMonth: 'eventsClosed',
  avgRevenuePerEvent: 'revenuePerEvent',
  estProfitPct: 'profitPct',
  foodCostPct: 'foodCostPct',
  supplierOverrunPct: 'supplierOverrunPct',
})
/** Kitchen estimates with no measured twin. */
const ESTIMATES_ONLY_FIELDS = Object.freeze(['hoursPerWeekOrdering', 'hoursPerWeekQuotes', 'wastePct'])

module.exports = {
  REPORT_METRICS, REPORT_MONTHS, REPORT_DEFAULT_MONTHS, REPORT_MIN_EVENTS, REPORT_WINDOW_DAYS, REPORT_COMPARABLE_DAYS,
  REPORT_MAX_FINDINGS, FINDING_THRESHOLDS, FINDING_KEYS, BASELINE_TO_METRIC, ESTIMATES_ONLY_FIELDS,
}
