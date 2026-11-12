/** Plan 559: the front desk numbers of `GET /stats/frontdesk` (aggregates only; test requests never count). */
export type FrontDeskChannel = 'manual' | 'public_form' | 'whatsapp'

/** An owner's estimate beside the measured twin (null when the estimate has none). */
export interface FrontDeskBaselineRow {
  estimate: number
  measured: number | null
}

export interface FrontDeskStats {
  from: string
  to: string
  requests: {
    total: number
    perDay: number
    byChannel: Record<FrontDeskChannel, number>
    byKind: Record<'table' | 'event' | 'tasting' | 'consultation', number>
  }
  /** Share of non-manual requests created outside opening hours; null without hours or such requests. */
  afterHoursPct: number | null
  outcomes: { approved: number; declined: number; expired: number; cancelled: number; waiting: number }
  declinesByReason: Record<'full' | 'out_of_area' | 'below_minimum' | 'date_taken' | 'other', number>
  medianMinutesToDecision: number | null
  bookings: { total: number; noShowRatePct: number | null; enough: boolean }
  eventsFromRequests: { count: number; revenue: number }
  baseline: Record<string, FrontDeskBaselineRow> | null
}

/** One row of the platform admin's front desk table (`GET /admin/frontdesk-stats`). */
export interface FrontDeskAdminRow {
  businessId: string
  name: string
  requests: number
  afterHoursPct: number | null
  approved: number
  declined: number
  medianMinutesToDecision: number | null
  noShowRatePct: number | null
  eventsFromRequests: number
}
