/** Read model of `GET API.stats('report')` (plan 568). Every number is measured by the server; `null` where there is not enough data. */
export type ReportMonths = 3 | 6 | 12

export type ReportMetricKey =
  | 'inquiries'
  | 'eventsClosed'
  | 'closeRatePct'
  | 'revenue'
  | 'revenuePerEvent'
  | 'foodCostPct'
  | 'profitPct'
  | 'profitPerGuest'
  | 'pricingAccuracyPts'
  | 'supplierOverrunPct'
  | 'partialPricesPct'
  | 'activeDays'

export interface ReportValue {
  value: number | null
  /** False when a rate was built on fewer than 3 events: the page shows "no data", never a number. */
  enough: boolean
  n: number
}

export interface ReportPoint extends ReportValue {
  /** 'YYYY-MM' */
  month: string
}

export interface ReportWindow {
  from: number | null
  to: number | null
  metrics: Record<ReportMetricKey, ReportValue>
}

export type ReportFindingKey =
  'below_profit_target' | 'closed_with_partial_prices' | 'top_not_closed_reason' | 'top_supplier_overrun'

export interface ReportFinding {
  key: ReportFindingKey
  /** A count, a reason key, or `{ name, overrunPct }` for the supplier finding. */
  value: number | string | { name: string; overrunPct: number }
  evidenceCount: number
}

export interface BusinessReport {
  months: ReportMonths
  businessName: string
  firstEventAt: number | null
  series: Record<ReportMetricKey, ReportPoint[]>
  start: ReportWindow
  latest: ReportWindow
  /** False until the first event is 60 days old: the page then shows the start window only. */
  comparable: boolean
  change: Record<ReportMetricKey, { changePct?: number | null; changePts?: number | null }>
  /** The owner's own estimates, by measured metric; `null` without any. */
  baseline: Partial<Record<ReportMetricKey, number>> | null
  estimatesOnly: { hoursPerWeekOrdering?: number; hoursPerWeekQuotes?: number; wastePct?: number } | null
  findings: ReportFinding[]
}
