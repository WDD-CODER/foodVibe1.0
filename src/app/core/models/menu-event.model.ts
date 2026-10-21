import type { EventLogistics } from './logistics.model'

/** Plan 442: pipeline stage keys (mirror of shared/schemas/entities/event-stage.ts). */
export type EventStage =
  'inquiry' | 'quote_sent' | 'deposit_paid' | 'ordering' | 'execution' | 'post_production' | 'finished' | 'not_closed'

export type NotClosedReason = 'price' | 'date_taken' | 'no_reply' | 'other'

export interface EventStageEntry {
  stage: EventStage
  at: number
  by: string
  byName: string
  reason?: NotClosedReason
  reasonText?: string
}

export interface EventNote {
  _id: string
  /** 1 to 2,000 characters, plain text */
  text: string
  at: number
  by: string
  byName: string
  editedAt?: number
}

/** Dynamic menu types from registry; legacy values buffet_family | plated_course | cocktail_passed still name the serving styles. */
export type ServingType = string

export type DishFieldKey =
  'sell_price' | 'food_cost_money' | 'food_cost_pct' | 'serving_portions' | 'serving_portions_pct'

export const ALL_DISH_FIELDS: { key: DishFieldKey; labelKey: string; inputType: 'number' | 'select' }[] = [
  { key: 'sell_price', labelKey: 'dish_sell_price', inputType: 'number' },
  { key: 'food_cost_money', labelKey: 'dish_food_cost_money', inputType: 'number' },
  { key: 'food_cost_pct', labelKey: 'dish_food_cost_pct', inputType: 'number' },
  { key: 'serving_portions', labelKey: 'dish_serving_portions', inputType: 'number' },
  { key: 'serving_portions_pct', labelKey: 'dish_serving_portions_pct', inputType: 'number' }
]

export const DEFAULT_DISH_FIELDS: DishFieldKey[] = ['sell_price', 'food_cost_money', 'serving_portions']

export interface MenuTypeDefinition {
  key: string
  fields: DishFieldKey[]
}

export interface MenuFinancialTargets {
  targetFoodCostPct: number
  targetRevenuePerGuest?: number
}

/** Plan 445: the summary stored on every save (C-PRICING); other screens read it, never the engine. */
export interface MenuPricingCache {
  foodCost: number
  revenue: number
  profit: number
  profitPct: number | null
  partial: boolean
  computedAt: number
}

export interface MenuPerformanceTags {
  foodCostPct: number
  primaryServingStyle: ServingType
}

/** Plan 440: the name and coefficient of an event type / serving type, copied when it was selected. */
export interface TypeSnapshot {
  key: string
  name: string
  coefficient: number
}

export interface MenuItemSelection {
  recipeId: string
  recipeType: 'dish' | 'preparation'
  /** @deprecated legacy since plan 440, unused */
  predictedTakeRate?: number
  derivedPortions: number
  sellPrice?: number
  foodCostOverride?: number
  /** @deprecated replaced by portionsPerDiner (plan 440); read only as a fallback */
  servingPortions?: number
  /** Plan 440: portions of this item per diner (before the coefficient) */
  portionsPerDiner?: number
  /** Plan 440: replaces the event's default coefficient for this item (> 0, at most 2 decimals) */
  coefficientOverride?: number
}

export interface MenuSection {
  _id: string
  name: string
  sortOrder: number
  items: MenuItemSelection[]
}

/** Plan 446 (C-SNAPSHOT): the plan as it stood when the event went into execution. */
export interface PlanSnapshot {
  at: number
  /** Set by the server when the snapshot is frozen */
  frozenAt?: number
  suppliers: { supplierId: string | null; name: string; plannedCost: number }[]
  extraCosts: number
  plannedRevenue: number
  plannedProfit: number
  plannedProfitPct: number
}

export interface ClosingSupplier {
  supplierId: string | null
  name: string
  planned: number
  /** Empty = not typed yet; counts as the planned amount */
  actualPaid?: number
  arrived: boolean
  hasInvoice: boolean
  /** Cloudinary URLs, at most 10 */
  photos: string[]
}

/** Plan 446 (C-SNAPSHOT): what was really paid. Written only through `/api/v1/events/:id/closing`. */
export interface EventClosing {
  suppliers: ClosingSupplier[]
  actualExtraCosts?: number
  actualRevenue?: number
  finishedAt?: number
  finishedBy?: string
}

export interface MenuEvent {
  _id: string
  name: string
  eventType: string
  eventDate?: string
  servingType: ServingType
  eventTypeSnapshot?: TypeSnapshot
  servingTypeSnapshot?: TypeSnapshot
  guestCount: number
  /** @deprecated legacy since plan 440, unused */
  piecesPerPerson?: number
  sections: MenuSection[]
  /** @deprecated legacy since plan 445: no longer written */
  financialTargets?: MenuFinancialTargets
  /** Plan 445 money fields (owner only) */
  pricePerGuest?: number
  extraCosts?: { amount: number; note?: string }
  targetsOverride?: { profitTargetPct?: number; safetyMarginPct?: number }
  /** Plan 445: derived on every save */
  pricing?: MenuPricingCache
  performanceTags?: MenuPerformanceTags
  cuisineTags?: string[]
  createdAt?: number
  updatedAt?: number
  createdFromTemplateId?: string
  /** Resolved equipment + venue context (contextual logistics) */
  logistics?: EventLogistics
  /** Plan 442: set and changed only by the server (`/api/v1/events`) */
  stage?: EventStage
  stageHistory?: EventStageEntry[]
  /** First move to deposit_paid or later; never changes */
  closedAt?: number
  notClosedAt?: number
  notClosedReason?: NotClosedReason
  notClosedText?: string
  /** Events that existed before stages ("ישן"); dashboards never count them */
  legacy?: boolean
  notes?: EventNote[]
  /** Plan 446 */
  planSnapshot?: PlanSnapshot
  closing?: EventClosing
  clientName?: string
  clientPhone?: string
  deposit?: { amount?: number; date?: string }
}
