import { TestBed } from '@angular/core/testing'
import { MenuIntelligenceService } from './menu-intelligence.service'
import { EventPlanService } from '../engine/event-plan.service'
import { computeEventPlan } from '../engine/event-plan.engine'
import { buildFixtureInput } from '../engine/testing/event-plan.fixture'
import type { EventPlan } from '../engine/event-plan.types'
import { KitchenStateService } from '@services/kitchen-state.service'
import { MenuEvent } from '@models/menu-event.model'

describe('MenuIntelligenceService', () => {
  let service: MenuIntelligenceService
  let planSpy: jasmine.SpyObj<EventPlanService>
  const fixturePlan: EventPlan = computeEventPlan(buildFixtureInput())

  beforeEach(() => {
    planSpy = jasmine.createSpyObj('EventPlanService', ['planFor'])
    planSpy.planFor.and.returnValue(fixturePlan)
    TestBed.configureTestingModule({
      providers: [
        MenuIntelligenceService,
        { provide: EventPlanService, useValue: planSpy },
        { provide: KitchenStateService, useValue: { recipes_: () => [] } }
      ]
    })
    service = TestBed.inject(MenuIntelligenceService)
  })

  describe('hydrateDerivedPortions', () => {
    const baseEvent = (
      patch: Partial<MenuEvent>,
      itemPatch: Partial<MenuEvent['sections'][0]['items'][0]> = {}
    ): MenuEvent => ({
      _id: 'e1',
      name: 'Event',
      eventType: '',
      eventDate: '',
      servingType: 'plated_course',
      guestCount: 4,
      sections: [
        {
          _id: 's1',
          name: 'Main',
          sortOrder: 1,
          items: [{ recipeId: 'r1', recipeType: 'dish', derivedPortions: 0, ...itemPatch }]
        }
      ],
      ...patch
    })

    it('multiplies guests by portions per diner when there are no snapshots', () => {
      const out = service.hydrateDerivedPortions(baseEvent({ guestCount: 80 }, { portionsPerDiner: 2 }))
      expect(out.sections[0].items[0].derivedPortions).toBe(160)
    })

    it('applies event type 1.15 x cocktail 3 to 50 guests at 1 per diner -> 173', () => {
      const out = service.hydrateDerivedPortions(
        baseEvent(
          {
            guestCount: 50,
            eventTypeSnapshot: { key: 'private', name: 'פרטי', coefficient: 1.15 },
            servingTypeSnapshot: { key: 'cocktail_passed', name: 'קוקטייל', coefficient: 3 }
          },
          { portionsPerDiner: 1 }
        )
      )
      expect(out.sections[0].items[0].derivedPortions).toBe(173)
    })

    it('gives 0 when portions per diner is 0 (no 0 to 1 coercion)', () => {
      const out = service.hydrateDerivedPortions(baseEvent({ guestCount: 50 }, { portionsPerDiner: 0 }))
      expect(out.sections[0].items[0].derivedPortions).toBe(0)
    })

    it('uses the item override instead of the default coefficient', () => {
      const out = service.hydrateDerivedPortions(
        baseEvent(
          { guestCount: 100, eventTypeSnapshot: { key: 'a', name: 'a', coefficient: 1.15 } },
          { portionsPerDiner: 1, coefficientOverride: 1.1 }
        )
      )
      expect(out.sections[0].items[0].derivedPortions).toBe(110)
    })

    it('falls back to the legacy servingPortions on an old item', () => {
      const out = service.hydrateDerivedPortions(baseEvent({ guestCount: 4 }, { servingPortions: 2 }))
      expect(out.sections[0].items[0].derivedPortions).toBe(8)
    })
  })

  describe('computeEventIngredientCost', () => {
    it('returns the engine plan food cost of the event', () => {
      const event: MenuEvent = {
        _id: 'e1',
        name: 'Event',
        eventType: '',
        eventDate: '',
        servingType: 'plated_course',
        guestCount: 10,
        sections: [
          {
            _id: 's1',
            name: 'Main',
            sortOrder: 1,
            items: [
              {
                recipeId: 'r1',
                recipeType: 'dish',
                derivedPortions: 10,
                servingPortions: 1,
                sellPrice: 0
              }
            ]
          }
        ],
        financialTargets: { targetFoodCostPct: 30, targetRevenuePerGuest: 0 },
        performanceTags: { foodCostPct: 0, primaryServingStyle: 'plated_course' }
      }
      expect(service.computeEventIngredientCost(event)).toBe(157.75)
      expect(planSpy.planFor).toHaveBeenCalledOnceWith(event)
    })

    it('returns 0 when the plan has no cost', () => {
      planSpy.planFor.and.returnValue({ ...fixturePlan, eventFoodCost: 0 })
      const event: MenuEvent = {
        _id: 'e1',
        name: 'Event',
        eventType: '',
        eventDate: '',
        servingType: 'plated_course',
        guestCount: 2,
        sections: [
          {
            _id: 's1',
            name: 'Main',
            sortOrder: 1,
            items: [
              {
                recipeId: 'r1',
                recipeType: 'dish',
                derivedPortions: 10,
                servingPortions: 1,
                sellPrice: 0
              }
            ]
          }
        ],
        financialTargets: { targetFoodCostPct: 30, targetRevenuePerGuest: 0 },
        performanceTags: { foodCostPct: 0, primaryServingStyle: 'plated_course' }
      }
      expect(service.computeEventIngredientCost(event)).toBe(0)
    })
  })

  describe('computeFoodCostPct', () => {
    it('should return (cost / revenue) * 100 using the engine cost', () => {
      planSpy.planFor.and.returnValue({ ...fixturePlan, eventFoodCost: 30 })
      const event: MenuEvent = {
        _id: 'e1',
        name: 'Event',
        eventType: '',
        eventDate: '',
        servingType: 'plated_course',
        guestCount: 10,
        sections: [
          {
            _id: 's1',
            name: 'Main',
            sortOrder: 1,
            items: [
              {
                recipeId: 'r1',
                recipeType: 'dish',
                derivedPortions: 10,
                servingPortions: 1,
                sellPrice: 100
              }
            ]
          }
        ],
        financialTargets: { targetFoodCostPct: 30, targetRevenuePerGuest: 100 },
        performanceTags: { foodCostPct: 0, primaryServingStyle: 'plated_course' }
      }
      expect(service.computeFoodCostPct(event)).toBe(3) // 30 / (10*100) * 100 = 3%
    })

    it('should return 0 when revenue per guest is 0 or guest_count is 0', () => {
      const eventNoRevenue: MenuEvent = {
        _id: 'e1',
        name: 'Event',
        eventType: '',
        eventDate: '',
        servingType: 'plated_course',
        guestCount: 10,
        sections: [],
        financialTargets: { targetFoodCostPct: 0, targetRevenuePerGuest: 0 },
        performanceTags: { foodCostPct: 0, primaryServingStyle: 'plated_course' }
      }
      expect(service.computeFoodCostPct(eventNoRevenue)).toBe(0)

      const eventNoGuests: MenuEvent = {
        ...eventNoRevenue,
        guestCount: 0,
        financialTargets: { targetFoodCostPct: 0, targetRevenuePerGuest: 50 }
      }
      expect(service.computeFoodCostPct(eventNoGuests)).toBe(0)
    })
  })
})
