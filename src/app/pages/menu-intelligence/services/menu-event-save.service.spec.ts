import { TestBed } from '@angular/core/testing'
import type { MenuEvent } from '@models/menu-event.model'
import { BusinessService } from '@services/business.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { computeEventPricing, toPricingEvent } from '../../../core/engine/event-pricing'
import { computePortions } from '../../../core/engine/portions'
import { MenuEventSaveService } from './menu-event-save.service'

describe('MenuEventSaveService', () => {
  const logistics = { venueId: 'v1' } as unknown as MenuEvent['logistics']
  let settings: { profitTargetPct: number; safetyMarginPct: number } | undefined

  const event = (over: Partial<MenuEvent> = {}): Omit<MenuEvent, '_id'> => ({
    name: 'x',
    eventType: 'a',
    servingType: 'b',
    guestCount: 50,
    pricePerGuest: 200,
    extraCosts: { amount: 1000 },
    performanceTags: { foodCostPct: 0, primaryServingStyle: 'b' },
    sections: [
      {
        _id: 's1',
        name: '',
        sortOrder: 1,
        items: [{ recipeId: 'r1', recipeType: 'dish', derivedPortions: 0, sellPrice: 10, portionsPerDiner: 1 }]
      }
    ],
    ...over
  })

  beforeEach(() => {
    settings = { profitTargetPct: 25, safetyMarginPct: 10 }
    TestBed.configureTestingModule({
      providers: [
        { provide: KitchenStateService, useValue: { recipes_: () => [] } },
        { provide: BusinessService, useValue: { business_: () => (settings ? { settings } : null) } },
        { provide: MenuEventDataService, useValue: { allMenuEvents_: () => [{ _id: 'e1', logistics }] } }
      ]
    })
  })

  it('adds a pricing cache equal to computeEventPricing for the same inputs', () => {
    const plan = { eventFoodCost: 4000, partial: false }
    const e = event()
    const out = TestBed.inject(MenuEventSaveService).prepareForSave(e, plan, null)
    const expected = computeEventPricing(plan, toPricingEvent(e, computePortions({ ...e, _id: '' }, [])), {
      profitTargetPct: 25,
      safetyMarginPct: 10
    })
    expect(out.pricing).toEqual({
      foodCost: expected.foodCost,
      revenue: expected.revenue,
      profit: expected.profit,
      profitPct: expected.profitPct,
      partial: false,
      computedAt: jasmine.any(Number)
    })
    expect(out.pricing?.revenue).toBe(10000)
    expect(out.performanceTags?.foodCostPct).toBe(40)
  })

  it('stores partial and uses the defaults when the business has no settings', () => {
    settings = undefined
    const out = TestBed.inject(MenuEventSaveService).prepareForSave(event(), { eventFoodCost: 10, partial: true }, null)
    expect(out.pricing?.partial).toBe(true)
  })

  it('keeps the stored logistics of an edited event', () => {
    const service = TestBed.inject(MenuEventSaveService)
    expect(service.prepareForSave(event(), { eventFoodCost: 1, partial: false }, 'e1').logistics).toEqual(logistics)
    expect(service.prepareForSave(event(), { eventFoodCost: 1, partial: false }, null).logistics).toBeUndefined()
  })
})
