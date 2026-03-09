import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MenuIntelligenceService } from './menu-intelligence.service';
import { KitchenStateService } from './kitchen-state.service';
import { RecipeCostService } from './recipe-cost.service';
import { MenuEvent, MenuItemSelection, MenuSection } from '@models/menu-event.model';
import { Recipe } from '@models/recipe.model';

describe('MenuIntelligenceService', () => {
  let service: MenuIntelligenceService;
  const recipesSignal = signal<Recipe[]>([]);

  beforeEach(() => {
    recipesSignal.set([]);
    const kitchenSpy = jasmine.createSpyObj('KitchenStateService', [], {
      recipes_: recipesSignal,
    });
    const costSpy = jasmine.createSpyObj('RecipeCostService', ['computeRecipeCost']);
    TestBed.configureTestingModule({
      providers: [
        MenuIntelligenceService,
        { provide: KitchenStateService, useValue: kitchenSpy },
        { provide: RecipeCostService, useValue: costSpy },
      ],
    });
    service = TestBed.inject(MenuIntelligenceService);
  });

  describe('derivePortions', () => {
    it('should return guestCount * servingPortions for plated_course', () => {
      expect(service.derivePortions('plated_course', 50, 0.5, 2, 1)).toBe(50);
      expect(service.derivePortions('plated_course', 10, 0, 1, 2)).toBe(20);
    });

    it('should return guestCount * servingPortions for buffet_family', () => {
      expect(service.derivePortions('buffet_family', 30, 0.5, 3, 1)).toBe(30);
      expect(service.derivePortions('buffet_family', 20, 0, 1, 0.5)).toBe(10);
    });

    it('should support fractional serving portions for plated/buffet', () => {
      expect(service.derivePortions('plated_course', 4, 0, 1, 0.25)).toBe(1);
      expect(service.derivePortions('plated_course', 8, 0, 1, 0.5)).toBe(4);
    });

    it('should return round(guestCount * piecesPerPerson * takeRate) for cocktail_passed', () => {
      expect(service.derivePortions('cocktail_passed', 100, 0.4, 3, 1)).toBe(120); // 100*3*0.4
      expect(service.derivePortions('cocktail_passed', 50, 1, 2, 1)).toBe(100);
    });

    it('should clamp take rate to [0,1] for cocktail_passed', () => {
      expect(service.derivePortions('cocktail_passed', 10, 1.5, 1, 1)).toBe(10); // clamped to 1
      expect(service.derivePortions('cocktail_passed', 10, -0.1, 1, 1)).toBe(0);
    });

    it('should use 0 for piecesPerPerson when undefined in cocktail_passed', () => {
      expect(service.derivePortions('cocktail_passed', 10, 0.5, undefined, 1)).toBe(0);
    });

    it('should use 1 for servingPortions when undefined', () => {
      expect(service.derivePortions('plated_course', 5, 0, 1)).toBe(5);
    });

    it('should treat negative servingPortions as 0', () => {
      expect(service.derivePortions('plated_course', 10, 0, 1, -1)).toBe(0);
    });
  });

  describe('hydrateDerivedPortions', () => {
    it('should set derived_portions_ on each item using derivePortions', () => {
      const event: MenuEvent = {
        _id: 'e1',
        name_: 'Event',
        event_type_: '',
        event_date_: '',
        serving_type_: 'plated_course',
        guest_count_: 4,
        sections_: [
          {
            _id: 's1',
            name_: 'Main',
            sort_order_: 1,
            items_: [
              { recipe_id_: 'r1', recipe_type_: 'dish', predicted_take_rate_: 0, derived_portions_: 0, serving_portions_: 2 },
            ],
          },
        ],
        financial_targets_: { target_food_cost_pct_: 0, target_revenue_per_guest_: 0 },
        performance_tags_: { food_cost_pct_: 0, primary_serving_style_: 'plated_course' },
      };
      const out = service.hydrateDerivedPortions(event);
      expect(out.sections_[0].items_[0].derived_portions_).toBe(8); // 4 * 2
    });

    it('should apply cocktail_passed formula when serving_type_ is cocktail_passed', () => {
      const event: MenuEvent = {
        _id: 'e1',
        name_: 'Event',
        event_type_: '',
        event_date_: '',
        serving_type_: 'cocktail_passed',
        guest_count_: 100,
        pieces_per_person_: 3,
        sections_: [
          {
            _id: 's1',
            name_: 'Passed',
            sort_order_: 1,
            items_: [
              { recipe_id_: 'r1', recipe_type_: 'dish', predicted_take_rate_: 0.4, derived_portions_: 0, serving_portions_: 1 },
            ],
          },
        ],
        financial_targets_: { target_food_cost_pct_: 0, target_revenue_per_guest_: 0 },
        performance_tags_: { food_cost_pct_: 0, primary_serving_style_: 'cocktail_passed' },
      };
      const out = service.hydrateDerivedPortions(event);
      expect(out.sections_[0].items_[0].derived_portions_).toBe(120); // round(100*3*0.4)
    });
  });

  describe('computeEventIngredientCost', () => {
    it('should sum scaled recipe costs for all items', () => {
      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Dish',
        ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 100, unit_: 'gram' }],
        steps_: [],
        yield_amount_: 2,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
      };
      recipesSignal.set([recipe]);
      const costService = TestBed.inject(RecipeCostService) as jasmine.SpyObj<RecipeCostService>;
      costService.computeRecipeCost.and.returnValues(10, 15);

      const event: MenuEvent = {
        _id: 'e1',
        name_: 'Event',
        event_type_: '',
        event_date_: '',
        serving_type_: 'plated_course',
        guest_count_: 4,
        sections_: [
          {
            _id: 's1',
            name_: 'Main',
            sort_order_: 1,
            items_: [
              { recipe_id_: 'r1', recipe_type_: 'dish', predicted_take_rate_: 0, derived_portions_: 4, serving_portions_: 1 },
              { recipe_id_: 'r1', recipe_type_: 'dish', predicted_take_rate_: 0, derived_portions_: 2, serving_portions_: 0.5 },
            ],
          },
        ],
        financial_targets_: { target_food_cost_pct_: 0, target_revenue_per_guest_: 0 },
        performance_tags_: { food_cost_pct_: 0, primary_serving_style_: 'plated_course' },
      };
      const total = service.computeEventIngredientCost(event);
      expect(total).toBe(25);
      expect(costService.computeRecipeCost).toHaveBeenCalledTimes(2);
    });

    it('should skip items with missing recipe', () => {
      recipesSignal.set([]);
      const costService = TestBed.inject(RecipeCostService) as jasmine.SpyObj<RecipeCostService>;

      const event: MenuEvent = {
        _id: 'e1',
        name_: 'Event',
        event_type_: '',
        event_date_: '',
        serving_type_: 'plated_course',
        guest_count_: 2,
        sections_: [
          {
            _id: 's1',
            name_: 'Main',
            sort_order_: 1,
            items_: [
              { recipe_id_: 'missing', recipe_type_: 'dish', predicted_take_rate_: 0, derived_portions_: 2, serving_portions_: 1 },
            ],
          },
        ],
        financial_targets_: { target_food_cost_pct_: 0, target_revenue_per_guest_: 0 },
        performance_tags_: { food_cost_pct_: 0, primary_serving_style_: 'plated_course' },
      };
      const total = service.computeEventIngredientCost(event);
      expect(total).toBe(0);
      expect(costService.computeRecipeCost).not.toHaveBeenCalled();
    });
  });

  describe('computeFoodCostPct', () => {
    it('should return (cost / revenue) * 100', () => {
      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Dish',
        ingredients_: [],
        steps_: [],
        yield_amount_: 1,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
      };
      recipesSignal.set([recipe]);
      const costService = TestBed.inject(RecipeCostService) as jasmine.SpyObj<RecipeCostService>;
      costService.computeRecipeCost.and.returnValue(30);

      const event: MenuEvent = {
        _id: 'e1',
        name_: 'Event',
        event_type_: '',
        event_date_: '',
        serving_type_: 'plated_course',
        guest_count_: 10,
        sections_: [
          { _id: 's1', name_: 'Main', sort_order_: 1, items_: [{ recipe_id_: 'r1', recipe_type_: 'dish', predicted_take_rate_: 0, derived_portions_: 10, serving_portions_: 1 }] },
        ],
        financial_targets_: { target_food_cost_pct_: 30, target_revenue_per_guest_: 100 },
        performance_tags_: { food_cost_pct_: 0, primary_serving_style_: 'plated_course' },
      };
      const pct = service.computeFoodCostPct(event);
      expect(pct).toBe(3); // 30 / (10*100) * 100 = 3%
    });

    it('should return 0 when revenue per guest is 0 or guest_count is 0', () => {
      const eventNoRevenue: MenuEvent = {
        _id: 'e1',
        name_: 'Event',
        event_type_: '',
        event_date_: '',
        serving_type_: 'plated_course',
        guest_count_: 10,
        sections_: [],
        financial_targets_: { target_food_cost_pct_: 0, target_revenue_per_guest_: 0 },
        performance_tags_: { food_cost_pct_: 0, primary_serving_style_: 'plated_course' },
      };
      expect(service.computeFoodCostPct(eventNoRevenue)).toBe(0);

      const eventNoGuests: MenuEvent = {
        ...eventNoRevenue,
        guest_count_: 0,
        financial_targets_: { target_food_cost_pct_: 0, target_revenue_per_guest_: 50 },
      };
      expect(service.computeFoodCostPct(eventNoGuests)).toBe(0);
    });
  });
});
