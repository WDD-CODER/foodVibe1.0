import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ExportService } from './export.service';
import { KitchenStateService } from './kitchen-state.service';
import { ScalingService } from './scaling.service';
import { RecipeCostService } from './recipe-cost.service';
import { Recipe } from '../models/recipe.model';
import { Product } from '../models/product.model';
import { MenuEvent } from '@models/menu-event.model';
import { ScaledIngredientRow } from './scaling.service';

describe('ExportService', () => {
  let service: ExportService;
  const productsSignal = signal<Product[]>([]);
  const recipesSignal = signal<Recipe[]>([]);
  let scalingSpy: jasmine.SpyObj<ScalingService>;

  beforeEach(() => {
    productsSignal.set([]);
    recipesSignal.set([]);
    scalingSpy = jasmine.createSpyObj('ScalingService', ['getScaleFactor', 'getScaledIngredients', 'getScaledPrepItems']);
    scalingSpy.getScaleFactor.and.callFake((recipe: Recipe, targetQty: number) => {
      const base = recipe.yield_amount_ ?? 1;
      return base > 0 ? targetQty / base : 1;
    });
    scalingSpy.getScaledIngredients.and.returnValue([]);
    scalingSpy.getScaledPrepItems.and.returnValue([]);

    const kitchenSpy = jasmine.createSpyObj('KitchenStateService', [], {
      products_: productsSignal,
      recipes_: recipesSignal,
    });
    const costSpy = jasmine.createSpyObj('RecipeCostService', ['getCostForIngredient', 'computeRecipeCost']);
    costSpy.getCostForIngredient.and.returnValue(0);
    costSpy.computeRecipeCost.and.returnValue(0);

    TestBed.configureTestingModule({
      providers: [
        ExportService,
        { provide: KitchenStateService, useValue: kitchenSpy },
        { provide: ScalingService, useValue: scalingSpy },
        { provide: RecipeCostService, useValue: costSpy },
      ],
    });
    service = TestBed.inject(ExportService);
  });

  describe('exportShoppingList (single recipe)', () => {
    it('should call getScaleFactor and getScaledIngredients with recipe and correct factor', async () => {
      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Test Recipe',
        ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 100, unit_: 'gram' }],
        steps_: [],
        yield_amount_: 2,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
      };
      await service.exportShoppingList(recipe, 4);

      expect(scalingSpy.getScaleFactor).toHaveBeenCalledWith(recipe, 4);
      expect(scalingSpy.getScaledIngredients).toHaveBeenCalledWith(recipe, 2); // 4/2
    });

    it('should use kitchen state products and recipes for category resolution', () => {
      const product: Product = {
        _id: 'p1',
        name_hebrew: 'Flour',
        base_unit_: 'gram',
        buy_price_global_: 0,
        purchase_options_: [],
        categories_: ['Dry'],
        supplierIds_: [],
        yield_factor_: 1,
        allergens_: [],
        min_stock_level_: 0,
        expiry_days_default_: 0,
      };
      productsSignal.set([product]);
      scalingSpy.getScaledIngredients.and.returnValue([
        { name: 'Flour', amount: 200, unit: 'gram', availableUnits: [], referenceId: 'p1', type: 'product' },
      ] as ScaledIngredientRow[]);

      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Test',
        ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 100, unit_: 'gram' }],
        steps_: [],
        yield_amount_: 2,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
      };
      expect(() => service.exportShoppingList(recipe, 4)).not.toThrow();
      expect(scalingSpy.getScaledIngredients).toHaveBeenCalledWith(recipe, 2);
    });
  });

  describe('exportMenuShoppingList', () => {
    it('should call getScaledIngredients per dish with factor = derived_portions_ / yield_amount_', async () => {
      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Dish',
        ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 100, unit_: 'gram' }],
        steps_: [],
        yield_amount_: 10,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
      };
      const product: Product = {
        _id: 'p1',
        name_hebrew: 'Flour',
        base_unit_: 'gram',
        buy_price_global_: 0,
        purchase_options_: [],
        categories_: ['Dry'],
        supplierIds_: [],
        yield_factor_: 1,
        allergens_: [],
        min_stock_level_: 0,
        expiry_days_default_: 0,
      };
      scalingSpy.getScaledIngredients.and.returnValue([
        { name: 'Flour', amount: 0, unit: 'gram', availableUnits: [], referenceId: 'p1', type: 'product' },
      ] as ScaledIngredientRow[]);

      const menu: MenuEvent = {
        _id: 'm1',
        name_: 'Menu',
        event_type_: '',
        event_date_: '',
        serving_type_: 'plated_course',
        guest_count_: 5,
        sections_: [
          {
            _id: 's1',
            name_: 'Main',
            sort_order_: 1,
            items_: [
              { recipe_id_: 'r1', recipe_type_: 'dish', predicted_take_rate_: 0, derived_portions_: 20, serving_portions_: 1 },
              { recipe_id_: 'r1', recipe_type_: 'dish', predicted_take_rate_: 0, derived_portions_: 5, serving_portions_: 0.5 },
            ],
          },
        ],
        financial_targets_: { target_food_cost_pct_: 0, target_revenue_per_guest_: 0 },
        performance_tags_: { food_cost_pct_: 0, primary_serving_style_: 'plated_course' },
      };
      await service.exportMenuShoppingList(menu, [recipe], [product]);

      expect(scalingSpy.getScaledIngredients).toHaveBeenCalledWith(recipe, 2); // 20/10
      expect(scalingSpy.getScaledIngredients).toHaveBeenCalledWith(recipe, 0.5); // 5/10
      expect(scalingSpy.getScaledIngredients).toHaveBeenCalledTimes(2);
    });

    it('should skip items with no recipe or no ingredients', async () => {
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
      const menu: MenuEvent = {
        _id: 'm1',
        name_: 'Menu',
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
              { recipe_id_: 'r1', recipe_type_: 'dish', predicted_take_rate_: 0, derived_portions_: 2, serving_portions_: 1 },
            ],
          },
        ],
        financial_targets_: { target_food_cost_pct_: 0, target_revenue_per_guest_: 0 },
        performance_tags_: { food_cost_pct_: 0, primary_serving_style_: 'plated_course' },
      };
      await service.exportMenuShoppingList(menu, [recipe], []);
      expect(scalingSpy.getScaledIngredients).not.toHaveBeenCalled();
    });
  });
});
