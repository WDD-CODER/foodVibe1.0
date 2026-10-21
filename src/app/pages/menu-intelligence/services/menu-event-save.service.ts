import { Injectable, inject } from '@angular/core'
import type { MenuEvent } from '@models/menu-event.model'
import { BusinessService } from '@services/business.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { PlanSnapshotService, type LivePlan } from '@services/plan-snapshot.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import {
  computeEventPricing,
  DEFAULT_PRICING_SETTINGS,
  toPricingCache,
  toPricingEvent
} from '../../../core/engine/event-pricing'
import { shouldRefreshOnSave } from '../../../core/engine/plan-snapshot'
import { computePortions } from '../../../core/engine/portions'

type EventToSave = Omit<MenuEvent, '_id'>

/**
 * Plan 445 — everything the menu page adds to the event just before it is stored: the `pricing` cache (C-PRICING),
 * the food-cost % tag derived from it, and (for a stored event) the logistics the form has no control for.
 * Plan 446: and the planning snapshot, refreshed on every save until the server freezes it.
 */
@Injectable({ providedIn: 'root' })
export class MenuEventSaveService {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly business_ = inject(BusinessService)
  private readonly menuEventData_ = inject(MenuEventDataService)
  private readonly snapshots_ = inject(PlanSnapshotService)

  prepareForSave(event: EventToSave, plan: LivePlan, editingId: string | null): EventToSave {
    const portions = computePortions({ ...event, _id: editingId ?? '' }, this.kitchenState_.recipes_())
    const settings = this.business_.business_()?.settings ?? DEFAULT_PRICING_SETTINGS
    const pricing = computeEventPricing(plan, toPricingEvent(event, portions), settings)
    const stored = editingId ? this.menuEventData_.allMenuEvents_().find((e) => e._id === editingId) : undefined
    const logistics = stored?.logistics
    // A stored snapshot is never carried by the form; the fresh one replaces it, or the server keeps what it has.
    const { planSnapshot: _formSnapshot, ...rest } = event
    const refresh = !!stored && shouldRefreshOnSave(stored.stage, stored.planSnapshot)
    return {
      ...rest,
      ...(refresh && { planSnapshot: this.snapshots_.buildFor(event, plan) }),
      pricing: toPricingCache(pricing, Date.now()),
      performanceTags: event.performanceTags && {
        ...event.performanceTags,
        foodCostPct: pricing.revenue > 0 ? (pricing.foodCost / pricing.revenue) * 100 : 0
      },
      ...(logistics && { logistics })
    }
  }
}
