import type { EventStage } from '@schemas/entities'

/** Periods the dashboard offers: last 30 days, last 90 days, or since the business was created. */
export type StatsPeriod = '30' | '90' | 'all'

/** Read model of `GET /api/v1/stats/business` (plan 447). `null` where a value cannot be computed. */
export interface BusinessStats {
  period: StatsPeriod
  periodDays: number
  hasBaseline: boolean
  /** Owner only: the server leaves it out for staff. */
  cards?: BusinessStatsCards
  funnel: FunnelStage[]
  upcoming: UpcomingEvent[]
}

export interface BusinessStatsCards {
  inquiries: CountCard
  closed: CountCard & { notClosed: number; closeRatePct: number | null }
  revenue: CountCard
  accuracy: {
    finishedCount: number
    avgAccuracyPts: number | null
    avgActualProfitPct: number | null
    baselineEstProfitPct: number | null
    vsBaselinePts: number | null
  }
  usage: { activeDays: number; perWeek: number }
}

/** A number for the period, its per-month equivalent, the opening baseline and the change against it. */
export interface CountCard {
  value: number
  monthly: number
  baseline: number | null
  changePct: number | null
}

export interface FunnelStage {
  stage: EventStage
  count: number
}

export interface UpcomingEvent {
  _id: string
  name: string
  eventDate: string
  guestCount: number | null
  stage: EventStage | null
  legacy: boolean
}
