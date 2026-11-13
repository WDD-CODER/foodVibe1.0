/** Read model of `GET API.stats('frontdesk')` and `GET API.admin('frontdesk-stats')` (plan 559). Measured by the server; test requests never count. */
export type FrontDeskChannel = 'manual' | 'public_form' | 'whatsapp'

/** An owner's estimate, with the measured twin where there is one (plan 567 fields). */
export interface FrontDeskBaselineValue {
  estimate: number
  measured?: number | null
}

export interface FrontDeskStats {
  from: number
  to: number
  requests: {
    total: number
    perDay: number
    byChannel: Record<FrontDeskChannel, number>
    byKind: Record<'table' | 'event' | 'tasting' | 'consultation', number>
  }
  /** Share of guest-channel requests created outside opening hours; null without hours or guest requests. */
  afterHoursPct: number | null
  outcomes: { approved: number; declined: number; expired: number; cancelled: number; waiting: number }
  declinesByReason: Record<'full' | 'out_of_area' | 'below_minimum' | 'date_taken' | 'other', number>
  medianMinutesToDecision: number | null
  bookings: { total: number; noShowRatePct: number | null; enough: boolean }
  eventsFromRequests: { count: number; revenue: number }
  baseline: Record<string, FrontDeskBaselineValue> | null
}

/** One business line of the platform admin's front desk table. */
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

export interface FrontDeskAdminStats {
  from: string
  to: string
  rows: FrontDeskAdminRow[]
}
