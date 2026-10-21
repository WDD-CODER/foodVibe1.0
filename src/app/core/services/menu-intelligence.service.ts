import { Injectable, inject } from '@angular/core'
import { EventPlanService } from '../engine/event-plan.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { MenuEvent } from '@models/menu-event.model'
import { computePortions } from '../engine/portions'

type MenuEventLike = Omit<MenuEvent, '_id'> | MenuEvent

@Injectable({ providedIn: 'root' })
export class MenuIntelligenceService {
  private readonly eventPlan_ = inject(EventPlanService)
  private readonly kitchenState_ = inject(KitchenStateService)

  /** Stores each item's portions from the one formula (`computePortions`). */
  hydrateDerivedPortions(event: MenuEventLike): MenuEventLike {
    const portions = computePortions({ ...event, _id: '_id' in event ? event._id : '' }, this.kitchenState_.recipes_())
    return {
      ...event,
      sections: event.sections.map((section) => ({
        ...section,
        items: section.items.map((item, index) => ({
          ...item,
          derivedPortions: portions.get(`${section._id}|${index}`)?.portions ?? 0
        }))
      }))
    }
  }

  /** Food cost of the whole event, read from the engine plan (plan 434). */
  computeEventIngredientCost(event: MenuEventLike): number {
    return this.eventPlan_.planFor(event).eventFoodCost
  }

  /** Total revenue from sell prices: sum of (sell_price × derived_portions) per item. */
  computeEventRevenue(event: MenuEventLike): number {
    let total = 0
    event.sections.forEach((section) => {
      section.items.forEach((item) => {
        const price = item.sellPrice ?? 0
        const portions = item.derivedPortions ?? 0
        total += price * portions
      })
    })
    return total
  }

  /** Food cost % using target revenue per guest (legacy). */
  computeFoodCostPct(event: MenuEventLike): number {
    const revenuePerGuest = event.financialTargets?.targetRevenuePerGuest ?? 0
    if (revenuePerGuest <= 0 || event.guestCount <= 0) return 0
    const revenue = revenuePerGuest * event.guestCount
    if (revenue <= 0) return 0
    return (this.computeEventIngredientCost(event) / revenue) * 100
  }

  /** Food cost % from actual revenue (sell prices × portions). Use when saving so list shows correct %. */
  computeFoodCostPctFromActualRevenue(event: MenuEventLike): number {
    const revenue = this.computeEventRevenue(event)
    if (revenue <= 0) return 0
    return (this.computeEventIngredientCost(event) / revenue) * 100
  }
}
