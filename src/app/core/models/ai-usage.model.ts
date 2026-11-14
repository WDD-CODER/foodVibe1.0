/** One group of the platform admin's AI usage report (plan 566): totals only, never a prompt or a reply. */
export interface AiUsageRow {
  key: string
  /** The business name, when grouped by business. */
  label?: string
  calls: number
  failedCalls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estCostUsd: number
  /** plan 580: failed calls per reason (rejectCode or Gemini errorCode) */
  failures?: Record<string, number>
}

export type AiUsageGroupBy = 'business' | 'feature' | 'model' | 'day'

export interface AiUsageReport {
  from: string
  to: string
  groupBy: AiUsageGroupBy
  /** Date of the price table the estimate uses. */
  pricesAsOf: string
  rows: AiUsageRow[]
  totals: Omit<AiUsageRow, 'key' | 'label' | 'failures'>
}

export interface AiUsageParams {
  groupBy?: AiUsageGroupBy
  from?: string
  to?: string
  businessId?: string
}
