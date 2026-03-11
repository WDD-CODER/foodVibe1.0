import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ScalingService } from './scaling.service';
import { KitchenStateService } from './kitchen-state.service';
import { Recipe } from '../models/recipe.model';
import { Product } from '../models/product.model';

describe('ScalingService', () => {
  let service: ScalingService;
  const productsSignal = signal<Product[]>([]);
  const recipesSignal = signal<Recipe[]>([]);

  beforeEach(() => {
    productsSignal.set([]);
    recipesSignal.set([]);
    const kitchenSpy = jasmine.createSpyObj('KitchenStateService', [], {
      products_: productsSignal,
      recipes_: recipesSignal,
    });
    TestBed.configureTestingModule({
      providers: [
        ScalingService,
        { provide: KitchenStateService, useValue: kitchenSpy },
      ],
    });
    service = TestBed.inject(ScalingService);
  });

  describe('getScaleFactor', () => {
    it('should return targetQuantity / yield_amount_ when yield is positive', () => {
      const recipe = { yield_amount_: 4 } as Recipe;
      expect(service.getScaleFactor(recipe, 8)).toBe(2);
      expect(service.getScaleFactor(recipe, 2)).toBe(0.5);
    });

    it('should return 1 when yield_amount_ is zero or negative', () => {
      expect(service.getScaleFactor({ yield_amount_: 0 } as Recipe, 10)).toBe(1);
      expect(service.getScaleFactor({ yield_amount_: -1 } as Recipe, 10)).toBe(1);
    });

    it('should use 1 as base when yield_amount_ is undefined', () => {
      expect(service.getScaleFactor({} as Recipe, 5)).toBe(5);
    });
  });

  describe('getScaledIngredients', () => {
    it('should scale amounts by factor and resolve product name from KitchenState', () => {
      const product: Product = {
        _id: 'p1',
        name_hebrew: 'Flour',
        base_unit_: 'gram',
        buy_price_global_: 0,
        purchase_options_: [],
        categories_: [],
        supplierIds_: [],
        yield_factor_: 1,
        allergens_: [],
        min_stock_level_: 0,
        expiry_days_default_: 0,
      };
      productsSignal.set([product]);
      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Test',
        ingredients_: [
          { _id: 'i1', referenceId: 'p1', type: 'product', amount_: 100, unit_: 'gram' },
        ],
        steps_: [],
        yield_amount_: 1,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
      };
      const rows = service.getScaledIngredients(recipe, 2);
      expect(rows.length).toBe(1);
      expect(rows[0].name).toBe('Flour');
      expect(rows[0].amount).toBe(200);
      expect(rows[0].unit).toBe('gram');
      expect(rows[0].type).toBe('product');
      expect(rows[0].referenceId).toBe('p1');
    });

    it('should resolve recipe ingredient and scale amount', () => {
      const subRecipe: Recipe = {
        _id: 'sub1',
        name_hebrew: 'Prep',
        ingredients_: [],
        steps_: [],
        yield_amount_: 1,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
      };
      recipesSignal.set([subRecipe]);
      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Dish',
        ingredients_: [
          { _id: 'i1', referenceId: 'sub1', type: 'recipe', amount_: 2, unit_: 'unit' },
        ],
        steps_: [],
        yield_amount_: 1,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
      };
      const rows = service.getScaledIngredients(recipe, 3);
      expect(rows.length).toBe(1);
      expect(rows[0].name).toBe('Prep');
      expect(rows[0].amount).toBe(6);
      expect(rows[0].type).toBe('recipe');
    });

    it('should return "(לא נמצא)" when product or recipe is missing', () => {
      productsSignal.set([]);
      recipesSignal.set([]);
      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Dish',
        ingredients_: [
          { _id: 'i1', referenceId: 'missing', type: 'product', amount_: 50, unit_: 'gram' },
        ],
        steps_: [],
        yield_amount_: 1,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
      };
      const rows = service.getScaledIngredients(recipe, 1);
      expect(rows[0].name).toBe('(לא נמצא)');
      expect(rows[0].amount).toBe(50);
    });

    it('should return empty array when recipe has no ingredients', () => {
      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Empty',
        ingredients_: [],
        steps_: [],
        yield_amount_: 1,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
      };
      expect(service.getScaledIngredients(recipe, 2)).toEqual([]);
    });
  });

  describe('getScaledPrepItems', () => {
    it('should scale prep_items_ by factor', () => {
      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Dish',
        ingredients_: [],
        steps_: [],
        yield_amount_: 1,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
        prep_items_: [
          { preparation_name: 'Chop onions', quantity: 2, unit: 'unit', category_name: 'Veg' },
        ],
      };
      const rows = service.getScaledPrepItems(recipe, 3);
      expect(rows.length).toBe(1);
      expect(rows[0].name).toBe('Chop onions');
      expect(rows[0].amount).toBe(6);
      expect(rows[0].unit).toBe('unit');
      expect(rows[0].category_name).toBe('Veg');
    });

    it('should scale prep_categories_ items by factor', () => {
      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Dish',
        ingredients_: [],
        steps_: [],
        yield_amount_: 1,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
        prep_categories_: [
          {
            category_name: 'Mise',
            items: [{ item_name: 'Garlic', quantity: 1, unit: 'unit' }],
          },
        ],
      };
      const rows = service.getScaledPrepItems(recipe, 4);
      expect(rows.length).toBe(1);
      expect(rows[0].name).toBe('Garlic');
      expect(rows[0].amount).toBe(4);
    });

    it('should return empty array when recipe has no prep_items_ or prep_categories_', () => {
      const recipe: Recipe = {
        _id: 'r1',
        name_hebrew: 'Simple',
        ingredients_: [],
        steps_: [],
        yield_amount_: 1,
        yield_unit_: 'unit',
        default_station_: '',
        is_approved_: false,
      };
      expect(service.getScaledPrepItems(recipe, 1)).toEqual([]);
    });
  });
});
