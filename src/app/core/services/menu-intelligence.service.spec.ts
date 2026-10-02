import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { MenuIntelligenceService } from './menu-intelligence.service'
import { KitchenStateService } from './kitchen-state.service'
import { RecipeCostService } from './recipe-cost.service'
import { MenuEvent } from '@models/menu-event.model'
import { Recipe } from '@models/recipe.model'

describe('MenuIntelligenceService', () => {
  let service: MenuIntelligenceService
  const recipesSignal = signal<Recipe[]>([])

  beforeEach(() => {
    recipesSignal.set([])
    const kitchenSpy = jasmine.createSpyObj('KitchenStateService', [], {
      recipes_: recipesSignal
    })
    const costSpy = jasmine.createSpyObj('RecipeCostService', ['computeRecipeCost'])
    TestBed.configureTestingModule({
      providers: [
        MenuIntelligenceService,
        { provide: KitchenStateService, useValue: kitchenSpy },
        { provide: RecipeCostService, useValue: costSpy }
      ]
    })
    service = TestBed.inject(MenuIntelligenceService)
  })

  describe('derivePortions', () => {
    it('should return guestCount * servingPortions for plated_course', () => {
      expect(service.derivePortions('plated_course', 50, 0.5, 2, 1)).toBe(50)
      expect(service.derivePortions('plated_course', 10, 0, 1, 2)).toBe(20)
    })

    it('should return guestCount * servingPortions for buffet_family', () => {
      expect(service.derivePortions('buffet_family', 30, 0.5, 3, 1)).toBe(30)
      expect(service.derivePortions('buffet_family', 20, 0, 1, 0.5)).toBe(10)
    })

    it('should support fractional serving portions for plated/buffet', () => {
      expect(service.derivePortions('plated_course', 4, 0, 1, 0.25)).toBe(1)
      expect(service.derivePortions('plated_course', 8, 0, 1, 0.5)).toBe(4)
    })

    it('should return round(guestCount * piecesPerPerson * takeRate) for cocktail_passed', () => {
      expect(service.derivePortions('cocktail_passed', 100, 0.4, 3, 1)).toBe(120) // 100*3*0.4
      expect(service.derivePortions('cocktail_passed', 50, 1, 2, 1)).toBe(100)
    })

    it('should clamp take rate to [0,1] for cocktail_passed', () => {
      expect(service.derivePortions('cocktail_passed', 10, 1.5, 1, 1)).toBe(10) // clamped to 1
      expect(service.derivePortions('cocktail_passed', 10, -0.1, 1, 1)).toBe(0)
    })

    it('should use 0 for piecesPerPerson when undefined in cocktail_passed', () => {
      expect(service.derivePortions('cocktail_passed', 10, 0.5, undefined, 1)).toBe(0)
    })

    it('should use 1 for servingPortions when undefined', () => {
      expect(service.derivePortions('plated_course', 5, 0, 1)).toBe(5)
    })

    it('should treat negative servingPortions as 0', () => {
      expect(service.derivePortions('plated_course', 10, 0, 1, -1)).toBe(0)
    })
  })

  describe('hydrateDerivedPortions', () => {
    it('should set derivedPortions on each item using derivePortions', () => {
      const event: MenuEvent = {
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
            items: [
              {
                recipeId: 'r1',
                recipeType: 'dish',
                predictedTakeRate: 0,
                derivedPortions: 0,
                servingPortions: 2
              }
            ]
          }
        ],
        financialTargets: { targetFoodCostPct: 0, targetRevenuePerGuest: 0 },
        performanceTags: { foodCostPct: 0, primaryServingStyle: 'plated_course' }
      }
      const out = service.hydrateDerivedPortions(event)
      expect(out.sections[0].items[0].derivedPortions).toBe(8) // 4 * 2
    })

    it('should apply cocktail_passed formula when servingType is cocktail_passed', () => {
      const event: MenuEvent = {
        _id: 'e1',
        name: 'Event',
        eventType: '',
        eventDate: '',
        servingType: 'cocktail_passed',
        guestCount: 100,
        piecesPerPerson: 3,
        sections: [
          {
            _id: 's1',
            name: 'Passed',
            sortOrder: 1,
            items: [
              {
                recipeId: 'r1',
                recipeType: 'dish',
                predictedTakeRate: 0.4,
                derivedPortions: 0,
                servingPortions: 1
              }
            ]
          }
        ],
        financialTargets: { targetFoodCostPct: 0, targetRevenuePerGuest: 0 },
        performanceTags: { foodCostPct: 0, primaryServingStyle: 'cocktail_passed' }
      }
      const out = service.hydrateDerivedPortions(event)
      expect(out.sections[0].items[0].derivedPortions).toBe(120) // round(100*3*0.4)
    })
  })

  describe('computeEventIngredientCost', () => {
    it('should sum scaled recipe costs for all items', () => {
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Dish',
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 100, unit: 'gram' }],
        steps: [],
        yieldAmount: 2,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      recipesSignal.set([recipe])
      const costService = TestBed.inject(RecipeCostService) as jasmine.SpyObj<RecipeCostService>
      costService.computeRecipeCost.and.returnValues(10, 15)

      const event: MenuEvent = {
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
            items: [
              {
                recipeId: 'r1',
                recipeType: 'dish',
                predictedTakeRate: 0,
                derivedPortions: 4,
                servingPortions: 1
              },
              {
                recipeId: 'r1',
                recipeType: 'dish',
                predictedTakeRate: 0,
                derivedPortions: 2,
                servingPortions: 0.5
              }
            ]
          }
        ],
        financialTargets: { targetFoodCostPct: 0, targetRevenuePerGuest: 0 },
        performanceTags: { foodCostPct: 0, primaryServingStyle: 'plated_course' }
      }
      const total = service.computeEventIngredientCost(event)
      expect(total).toBe(25)
      expect(costService.computeRecipeCost).toHaveBeenCalledTimes(2)
    })

    it('should skip items with missing recipe', () => {
      recipesSignal.set([])
      const costService = TestBed.inject(RecipeCostService) as jasmine.SpyObj<RecipeCostService>

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
                recipeId: 'missing',
                recipeType: 'dish',
                predictedTakeRate: 0,
                derivedPortions: 2,
                servingPortions: 1
              }
            ]
          }
        ],
        financialTargets: { targetFoodCostPct: 0, targetRevenuePerGuest: 0 },
        performanceTags: { foodCostPct: 0, primaryServingStyle: 'plated_course' }
      }
      const total = service.computeEventIngredientCost(event)
      expect(total).toBe(0)
      expect(costService.computeRecipeCost).not.toHaveBeenCalled()
    })
  })

  describe('computeFoodCostPct', () => {
    it('should return (cost / revenue) * 100', () => {
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Dish',
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      recipesSignal.set([recipe])
      const costService = TestBed.inject(RecipeCostService) as jasmine.SpyObj<RecipeCostService>
      costService.computeRecipeCost.and.returnValue(30)

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
                predictedTakeRate: 0,
                derivedPortions: 10,
                servingPortions: 1
              }
            ]
          }
        ],
        financialTargets: { targetFoodCostPct: 30, targetRevenuePerGuest: 100 },
        performanceTags: { foodCostPct: 0, primaryServingStyle: 'plated_course' }
      }
      const pct = service.computeFoodCostPct(event)
      expect(pct).toBe(3) // 30 / (10*100) * 100 = 3%
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
