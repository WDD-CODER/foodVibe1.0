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

  /** Food cost % using target revenue per guest (legacy). */
  computeFoodCostPct(event: MenuEventLike): number {
    const revenuePerGuest = event.financialTargets?.targetRevenuePerGuest ?? 0
    if (revenuePerGuest <= 0 || event.guestCount <= 0) return 0
    const revenue = revenuePerGuest * event.guestCount
    if (revenue <= 0) return 0
    return (this.computeEventIngredientCost(event) / revenue) * 100
  }
}
