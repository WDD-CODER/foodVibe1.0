import type { MenuEvent } from '@models/menu-event.model'
import type { EventPlan } from './event-plan.types'

/** Contract C-PRICING (plan 445): the only place profit, profit %, minimum price and safety margin are computed. */
export interface PricingEvent {
  guestCount: number
  pricePerGuest?: number
  extraCosts?: { amount: number; note?: string }
  targetsOverride?: { profitTargetPct?: number; safetyMarginPct?: number }
  items: { sellPrice?: number; portions: number }[]
}

export interface PricingSettings {
  profitTargetPct: number
  safetyMarginPct: number
}

export interface EventPricing {
  foodCost: number
  extraCost: number
  totalCost: number
  revenue: number
  revenueIsComputed: boolean
  /** The effective price per guest (typed, or revenue ÷ guests when computed). */
  pricePerGuest: number
  profit: number
  profitPct: number | null
  profitPerGuest: number
  minPricePerGuest: number
  safetyMarginAmount: number
  meetsTarget: boolean
  shortfallPerGuest: number
  partial: boolean
}

/** What is stored on the event on every save (server dashboards read this, never run the engine). */
export interface PricingCache {
  foodCost: number
  revenue: number
  profit: number
  profitPct: number | null
  partial: boolean
  computedAt: number
}

/** Business defaults used when the business has no settings yet. */
export const DEFAULT_PRICING_SETTINGS: PricingSettings = { profitTargetPct: 25, safetyMarginPct: 10 }

/** Maps every item by key `${section._id}|${itemIndex}` to its sell price and portions. */
export function toPricingEvent(
  event: Pick<MenuEvent, 'guestCount' | 'sections' | 'pricePerGuest' | 'extraCosts' | 'targetsOverride'>,
  portionsByItem: Map<string, { portions: number }>
): PricingEvent {
  const items: PricingEvent['items'] = []
  for (const section of event.sections ?? []) {
    ;(section.items ?? []).forEach((item, index) => {
      items.push({ sellPrice: item.sellPrice, portions: portionsByItem.get(`${section._id}|${index}`)?.portions ?? 0 })
    })
  }
  return {
    guestCount: event.guestCount ?? 0,
    ...(event.pricePerGuest != null && { pricePerGuest: event.pricePerGuest }),
    ...(event.extraCosts && { extraCosts: event.extraCosts }),
    ...(event.targetsOverride && { targetsOverride: event.targetsOverride }),
    items
  }
}

/** Pure: no rounding inside (display goes through `formatMoney` / `formatPct1`). Never changes its inputs. */
export function computeEventPricing(
  plan: Pick<EventPlan, 'eventFoodCost' | 'partial'>,
  event: PricingEvent,
  settings: PricingSettings
): EventPricing {
  const guests = event.guestCount > 0 ? event.guestCount : 0
  const foodCost = plan.eventFoodCost
  const extraCost = event.extraCosts?.amount ?? 0
  const totalCost = foodCost + extraCost
  const revenueIsComputed = event.pricePerGuest == null
  const revenue = revenueIsComputed
    ? event.items.reduce((sum, item) => sum + (item.sellPrice ?? 0) * item.portions, 0)
    : (event.pricePerGuest as number) * guests
  const pricePerGuest = guests > 0 ? revenue / guests : 0
  const profit = revenue - totalCost
  const profitPct = revenue > 0 ? (profit / revenue) * 100 : null
  const target = event.targetsOverride?.profitTargetPct ?? settings.profitTargetPct
  const margin = event.targetsOverride?.safetyMarginPct ?? settings.safetyMarginPct
  const minPricePerGuest = guests > 0 ? totalCost / (1 - target / 100) / guests : 0
  const meetsTarget = profitPct !== null && profitPct >= target
  return {
    foodCost,
    extraCost,
    totalCost,
    revenue,
    revenueIsComputed,
    pricePerGuest,
    profit,
    profitPct,
    profitPerGuest: guests > 0 ? profit / guests : 0,
    minPricePerGuest,
    safetyMarginAmount: (revenue * margin) / 100,
    meetsTarget,
    shortfallPerGuest: meetsTarget ? 0 : Math.max(0, minPricePerGuest - pricePerGuest),
    partial: plan.partial
  }
}

export function toPricingCache(result: EventPricing, now: number): PricingCache {
  return {
    foodCost: result.foodCost,
    revenue: result.revenue,
    profit: result.profit,
    profitPct: result.profitPct,
    partial: result.partial,
    computedAt: now
  }
}
