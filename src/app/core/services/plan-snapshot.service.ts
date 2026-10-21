import { inject, Injectable } from '@angular/core'
import type { MenuEvent, PlanSnapshot } from '@models/menu-event.model'
import { computeEventPricing, DEFAULT_PRICING_SETTINGS, toPricingEvent } from '../engine/event-pricing'
import type { EventPlan } from '../engine/event-plan.types'
import { EventPlanService } from '../engine/event-plan.service'
import { buildPlanSnapshot } from '../engine/plan-snapshot'
import { computePortions } from '../engine/portions'
import { buildSupplierOrders } from '../utils/supplier-orders.util'
import { BusinessService } from './business.service'
import { KitchenStateService } from './kitchen-state.service'
import { TranslationService } from './translation.service'

/** A plan the caller already computed; only a full one (with its raw lines) is used as is. */
export type LivePlan = Pick<EventPlan, 'eventFoodCost' | 'partial'> & Partial<Pick<EventPlan, 'rawLines'>>

const hasRawLines = (plan: LivePlan): plan is EventPlan => Array.isArray(plan.rawLines)

/**
 * Plan 446 (C-SNAPSHOT): builds the planning snapshot of an event from today's prices. The supplier rows come from
 * plan 435's supplier orders, so the snapshot, the order cards and the closing rows name and total suppliers alike.
 */
@Injectable({ providedIn: 'root' })
export class PlanSnapshotService {
  private readonly eventPlan_ = inject(EventPlanService)
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly business_ = inject(BusinessService)
  private readonly translation_ = inject(TranslationService)

  /** `plan` is the plan the caller already has (the menu page's live one); without it the engine runs here. */
  buildFor(event: MenuEvent | Omit<MenuEvent, '_id'>, plan?: LivePlan): PlanSnapshot {
    const full = plan && hasRawLines(plan) ? plan : this.eventPlan_.planFor(event)
    const portions = computePortions({ ...event, _id: '_id' in event ? event._id : '' }, this.kitchenState_.recipes_())
    const settings = this.business_.business_()?.settings ?? DEFAULT_PRICING_SETTINGS
    const pricing = computeEventPricing(full, toPricingEvent(event, portions), settings)
    const orders = buildSupplierOrders(
      full,
      this.kitchenState_.productsById_(),
      this.kitchenState_.suppliersById_(),
      (key) => this.translation_.translate(key)
    )
    return buildPlanSnapshot(orders.cards, pricing, Date.now())
  }
}
