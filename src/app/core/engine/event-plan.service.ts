import { Injectable, inject } from '@angular/core'
import type { MenuEvent } from '@models/menu-event.model'
import { KitchenStateService } from '@services/kitchen-state.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { computeEventPlan } from './event-plan.engine'
import type { EventPlan, EventPlanInput, UnitConversion } from './event-plan.types'
import { computePortions } from './portions'

/** Plan 433 — the Angular entry point to the engine: builds its input from the kitchen state and the unit registry. */
@Injectable({ providedIn: 'root' })
export class EventPlanService {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly unitRegistry_ = inject(UnitRegistryService)

  /** The full plan of an event; accepts the unsaved shape the menu page builds. */
  planFor(event: MenuEvent | Omit<MenuEvent, '_id'>): EventPlan {
    const full: MenuEvent = { ...event, _id: '_id' in event ? event._id : '' }
    const portions = computePortions(full, this.kitchenState_.recipes_())
    const portionsByItem = new Map([...portions].map(([key, p]) => [key, p.portions]))
    return computeEventPlan(this.buildInput(full, portionsByItem))
  }

  /** One dish alone for the given portions — its cost and whether it is partial. */
  costFor(recipeId: string, portions: number): { cost: number; partial: boolean } {
    const recipe = this.kitchenState_.recipes_().find((r) => r._id === recipeId)
    const event: MenuEvent = {
      _id: '',
      name: '',
      eventType: '',
      servingType: '',
      guestCount: 0,
      sections: [
        {
          _id: 'cost',
          name: '',
          sortOrder: 0,
          items: [
            {
              recipeId,
              recipeType: recipe?.recipeType ?? 'dish',
              derivedPortions: portions
            }
          ]
        }
      ]
    }
    const plan = computeEventPlan(this.buildInput(event, new Map([['cost|0', portions]])))
    const dish = plan.dishCosts[0]
    return dish ? { cost: dish.cost, partial: dish.partial } : { cost: 0, partial: true }
  }

  private buildInput(event: MenuEvent, portionsByItem: Map<string, number>): EventPlanInput {
    const registry = this.unitRegistry_
    const units: UnitConversion = {
      getConversion: (key) => registry.getConversion(key),
      has: (key) => key in registry.globalUnits_()
    }
    return {
      event,
      portionsByItem,
      products: this.kitchenState_.products_(),
      recipes: this.kitchenState_.recipes_(),
      units
    }
  }
}
