import { EVENT_STAGES, snapshotActionOnStage } from '@schemas/entities'
import type { SnapshotAction } from '@schemas/entities'
import type { EventStage, PlanSnapshot } from '@models/menu-event.model'
import type { SupplierOrderCard } from '../utils/supplier-orders.util'
import type { EventPricing } from './event-pricing'

/** Plan 446 (C-SNAPSHOT): the planning snapshot and its freeze rules. Pure: no rounding, no Angular. */

/** One row per supplier card (the "ללא ספק" card included); review lines carry no cost and are left out. */
export function buildPlanSnapshot(
  cards: readonly SupplierOrderCard[],
  pricing: Pick<EventPricing, 'extraCost' | 'revenue' | 'profit' | 'profitPct'>,
  at: number
): PlanSnapshot {
  return {
    at,
    suppliers: cards.map((card) => ({ supplierId: card.supplierId, name: card.name, plannedCost: card.total })),
    extraCosts: pricing.extraCost,
    plannedRevenue: pricing.revenue,
    plannedProfit: pricing.profit,
    plannedProfitPct: pricing.profitPct ?? 0
  }
}

/** What entering `nextStage` does to the stored snapshot (the same rule the server applies). */
export function snapshotOnStageChange(nextStage: EventStage, stored?: PlanSnapshot): SnapshotAction {
  return snapshotActionOnStage(nextStage, stored)
}

/** True when a save of an event in `stage` refreshes its snapshot: from "הזמנות" on, not finished, not frozen. */
export function shouldRefreshOnSave(stage: EventStage | undefined, stored?: PlanSnapshot): boolean {
  if (!stage || stage === 'finished' || stage === 'not_closed') return false
  if (stored?.frozenAt !== undefined) return false
  return EVENT_STAGES.indexOf(stage) >= EVENT_STAGES.indexOf('ordering')
}
