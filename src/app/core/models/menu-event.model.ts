import type { EventLogistics } from './logistics.model'

/** Dynamic menu types from registry; legacy values buffet_family | plated_course | cocktail_passed still drive derivePortions logic. */
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
  financialTargets?: MenuFinancialTargets
  performanceTags?: MenuPerformanceTags
  cuisineTags?: string[]
  createdAt?: number
  updatedAt?: number
  createdFromTemplateId?: string
  /** Resolved equipment + venue context (contextual logistics) */
  logistics?: EventLogistics
}
