import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RecipeCostService } from './recipe-cost.service';
import { KitchenStateService } from './kitchen-state.service';
import { UnitRegistryService } from './unit-registry.service';
import { Recipe } from '../models/recipe.model';
import { Product } from '../models/product.model';
import { Ingredient } from '../models/ingredient.model';

describe('RecipeCostService', () => {
  let service: RecipeCostService;
  const productsSignal = signal<Product[]>([]);
  const recipesSignal = signal<Recipe[]>([]);

  function createProduct(overrides: Partial<Product> & { _id: string }): Product {
    return {
      _id: overrides._id,
      name_hebrew: overrides.name_hebrew ?? 'Product',
      base_unit_: overrides.base_unit_ ?? 'gram',
      buy_price_global_: overrides.buy_price_global_ ?? 0,
      purchase_options_: overrides.purchase_options_ ?? [],
      categories_: overrides.categories_ ?? [],
      supplierIds_: overrides.supplierIds_ ?? [],
      yield_factor_: overrides.yield_factor_ ?? 1,
      allergens_: overrides.allergens_ ?? [],
      min_stock_level_: overrides.min_stock_level_ ?? 0,
      expiry_days_default_: overrides.expiry_days_default_ ?? 0,
    };
  }

  function createRecipe(overrides: Partial<Recipe> & { _id: string }): Recipe {
    return {
      _id: overrides._id,
      name_hebrew: overrides.name_hebrew ?? 'Recipe',
      ingredients_: overrides.ingredients_ ?? [],
      steps_: overrides.steps_ ?? [],
      yield_amount_: overrides.yield_amount_ ?? 1,
      yield_unit_: overrides.yield_unit_ ?? 'unit',
      ...(overrides.yield_conversions_ != null && { yield_conversions_: overrides.yield_conversions_ }),
      default_station_: overrides.default_station_ ?? '',
      is_approved_: overrides.is_approved_ ?? false,
    };
  }

  beforeEach(() => {
    productsSignal.set([]);
    recipesSignal.set([]);
    const kitchenSpy = jasmine.createSpyObj('KitchenStateService', [], {
      products_: productsSignal,
      recipes_: recipesSignal,
    });
    const unitRegistrySpy = jasmine.createSpyObj('UnitRegistryService', ['getConversion']);
    unitRegistrySpy.getConversion.and.callFake((key: string) => {
      const map: Record<string, number> = { gram: 1, g: 1, kg: 1000, liter: 1000, l: 1000, ml: 1, unit: 1 };
      return map[key] ?? 1;
    });
    TestBed.configureTestingModule({
      providers: [
        RecipeCostService,
        { provide: KitchenStateService, useValue: kitchenSpy },
        { provide: UnitRegistryService, useValue: unitRegistrySpy },
      ],
    });
    service = TestBed.inject(RecipeCostService);
  });

  describe('computeRecipeCost and getCostForIngredient', () => {
    it('should return 0 for recipe with no ingredients', () => {
      const recipe = createRecipe({ _id: 'r1', ingredients_: [] });
      expect(service.computeRecipeCost(recipe)).toBe(0);
    });

    it('should return 0 when product is missing', () => {
      productsSignal.set([]);
      const recipe = createRecipe({
        _id: 'r1',
        ingredients_: [{ _id: 'i1', referenceId: 'missing', type: 'product', amount_: 100, unit_: 'gram' }],
      });
      expect(service.computeRecipeCost(recipe)).toBe(0);
    });

    it('should compute product cost: (amount / yieldFactor) * buy_price_global_ in base unit', () => {
      const product = createProduct({
        _id: 'p1',
        buy_price_global_: 10,
        base_unit_: 'gram',
        yield_factor_: 1,
        purchase_options_: [],
      });
      productsSignal.set([product]);
      const recipe = createRecipe({
        _id: 'r1',
        ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 500, unit_: 'gram' }],
      });
      expect(service.computeRecipeCost(recipe)).toBe(5000); // 500g * 10 per gram
    });

    it('should use yield_factor_ for product cost', () => {
      const product = createProduct({
        _id: 'p1',
        buy_price_global_: 100,
        base_unit_: 'gram',
        yield_factor_: 0.8,
        purchase_options_: [],
      });
      productsSignal.set([product]);
      const recipe = createRecipe({
        _id: 'r1',
        ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 100, unit_: 'gram' }],
      });
      // (100 / 0.8) * (100/1000) if buy_price_global_ is per kg? Recipe cost service: normalizedAmount = ing.amount_ / (unitOption.conversion_rate_ || 1) when unitOption exists; else normalizedAmount = ing.amount_. Then return (normalizedAmount / yieldFactor) * price. So price is buy_price_global_ - need to see what that is per. In the code it's just price = product.buy_price_global_. So (100/0.8)*100 = 12500. That seems like price is per unit (gram). So 100g at 100 per gram with 0.8 yield = 100/0.8 * 100 = 12500. So buy_price_global_ might be per base_unit_ (per gram). Let me use smaller numbers: buy_price_global_: 1 (per gram), 100g, yield 0.8 → (100/0.8)*1 = 125.
      product.buy_price_global_ = 1;
      expect(service.computeRecipeCost(recipe)).toBeCloseTo(125, 0);
    });
  });

  describe('getRecipeCostPerUnit', () => {
    it('should return totalCost / yield_amount_', () => {
      const product = createProduct({ _id: 'p1', buy_price_global_: 2, yield_factor_: 1, purchase_options_: [] });
      productsSignal.set([product]);
      const recipe = createRecipe({
        _id: 'r1',
        yield_amount_: 4,
        ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 400, unit_: 'gram' }],
      });
      const total = service.computeRecipeCost(recipe); // 400*2 = 800
      expect(total).toBe(800);
      expect(service.getRecipeCostPerUnit(recipe)).toBe(200); // 800/4
    });
  });

  describe('computeTotalWeightG', () => {
    it('should sum weight in grams for rows with mass units', () => {
      const rows = [
        { amount_net: 100, unit: 'gram', referenceId: '', item_type: undefined as string | undefined },
        { amount_net: 1, unit: 'kg', referenceId: '', item_type: undefined as string | undefined },
      ];
      expect(service.computeTotalWeightG(rows)).toBe(1100); // 100 + 1000
    });

    it('should convert purchase unit to base (conversion_rate_ = base per 1 purchase unit)', () => {
      const product = createProduct({
        _id: 'p1',
        base_unit_: 'kg',
        purchase_options_: [{ unit_symbol_: 'unit', conversion_rate_: 0.3 }],
      });
      productsSignal.set([product]);
      const rows = [
        { amount_net: 1, unit: 'unit', referenceId: 'p1', item_type: 'product' },
      ];
      // 1 unit * 0.3 kg/unit = 0.3 kg = 300 g
      expect(service.computeTotalWeightG(rows)).toBe(300);
    });

    it('should return 0 at max recursion depth', () => {
      const rows = [{ amount_net: 100, unit: 'gram' }];
      expect(service.computeTotalWeightG(rows, 5)).toBe(0);
    });
  });

  describe('computeTotalVolumeL and getUnconvertibleNamesForWeight', () => {
    it('should return totalL and unconvertibleNames', () => {
      const rows = [
        { amount_net: 500, unit: 'ml', name_hebrew: 'Milk' },
        { amount_net: 2, unit: 'liter', name_hebrew: 'Water' },
      ];
      const result = service.computeTotalVolumeL(rows);
      expect(result.totalL).toBeCloseTo(2.5, 4);
      expect(result.unconvertibleNames).toEqual([]);
    });

    it('should list names that cannot be converted to volume', () => {
      const rows = [
        { amount_net: 1, unit: 'portion', name_hebrew: 'Secret sauce' },
      ];
      const result = service.computeTotalVolumeL(rows);
      expect(result.totalL).toBe(0);
      expect(result.unconvertibleNames).toContain('Secret sauce');
    });
  });

  describe('getCostForIngredient', () => {
    it('should return 0 for missing product', () => {
      productsSignal.set([]);
      const ing: Ingredient = { _id: 'i1', referenceId: 'p1', type: 'product', amount_: 100, unit_: 'gram' };
      expect(service.getCostForIngredient(ing)).toBe(0);
    });

    it('should return 0 at max recursion depth', () => {
      const ing: Ingredient = { _id: 'i1', referenceId: 'p1', type: 'product', amount_: 100, unit_: 'gram' };
      expect(service.getCostForIngredient(ing, 5)).toBe(0);
    });

    it('should use purchase unit conversion_rate_ as base per 1 unit (multiply)', () => {
      const product = createProduct({
        _id: 'p1',
        buy_price_global_: 10,
        base_unit_: 'kg',
        yield_factor_: 1,
        purchase_options_: [{ unit_symbol_: 'unit', conversion_rate_: 0.3 }],
      });
      productsSignal.set([product]);
      const recipe = createRecipe({
        _id: 'r1',
        ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 1, unit_: 'unit' }],
      });
      // 1 unit = 0.3 kg; cost = (0.3 / 1) * 10 = 3
      expect(service.computeRecipeCost(recipe)).toBe(3);
    });

    it('should use price_override_ as price per 1 purchase unit', () => {
      const product = createProduct({
        _id: 'p1',
        buy_price_global_: 10,
        base_unit_: 'kg',
        yield_factor_: 1,
        purchase_options_: [{ unit_symbol_: 'unit', conversion_rate_: 0.3, price_override_: 4.9 }],
      });
      productsSignal.set([product]);
      const recipe = createRecipe({
        _id: 'r1',
        ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 1, unit_: 'unit' }],
      });
      expect(service.computeRecipeCost(recipe)).toBe(4.9);
    });
  });

  describe('amountInRecipeYieldUnit and yield_conversions_', () => {
    it('should convert secondary units using yield_conversions_ (1 unit = 446g)', () => {
      const recipe = createRecipe({
        _id: 'r1',
        yield_amount_: 446,
        yield_unit_: 'gram',
        yield_conversions_: [
          { amount: 446, unit: 'gram' },
          { amount: 1, unit: 'unit' },
          { amount: 1, unit: 'כפות' },
        ],
        ingredients_: [],
      });
      expect(service.amountInRecipeYieldUnit(1, 'unit', recipe)).toBe(446);
      expect(service.amountInRecipeYieldUnit(1, 'כפות', recipe)).toBe(446);
      expect(service.amountInRecipeYieldUnit(446, 'gram', recipe)).toBe(446);
      expect(service.amountInRecipeYieldUnit(2, 'unit', recipe)).toBe(892);
    });

    it('should fall back to registry when unit not in yield_conversions_', () => {
      const recipe = createRecipe({
        _id: 'r1',
        yield_amount_: 446,
        yield_unit_: 'gram',
        yield_conversions_: [{ amount: 446, unit: 'gram' }, { amount: 1, unit: 'unit' }],
        ingredients_: [],
      });
      // kg not in conversions; registry has kg: 1000, gram: 1 → 1 kg = 1000 in gram terms
      expect(service.amountInRecipeYieldUnit(1, 'kg', recipe)).toBe(1000);
    });

    it('should give same cost for 1 unit as 446 gram when recipe has yield_conversions_', () => {
      const product = createProduct({
        _id: 'p1',
        buy_price_global_: 0.01,
        base_unit_: 'gram',
        yield_factor_: 1,
        purchase_options_: [],
      });
      productsSignal.set([product]);
      const subRecipe = createRecipe({
        _id: 'sub',
        yield_amount_: 446,
        yield_unit_: 'gram',
        yield_conversions_: [
          { amount: 446, unit: 'gram' },
          { amount: 1, unit: 'unit' },
        ],
        ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 446, unit_: 'gram' }],
      });
      recipesSignal.set([subRecipe]);
      const costFor446Gram = service.getCostForIngredient({
        _id: 'i1',
        referenceId: 'sub',
        type: 'recipe',
        amount_: 446,
        unit_: 'gram',
      });
      const costFor1Unit = service.getCostForIngredient({
        _id: 'i2',
        referenceId: 'sub',
        type: 'recipe',
        amount_: 1,
        unit_: 'unit',
      });
      expect(costFor1Unit).toBe(costFor446Gram);
      expect(costFor446Gram).toBeCloseTo(4.46, 2); // 446 * 0.01
    });

    it('should give same row weight for 1 unit as 446 gram when recipe has yield_conversions_', () => {
      const subRecipe = createRecipe({
        _id: 'sub',
        yield_amount_: 446,
        yield_unit_: 'gram',
        yield_conversions_: [
          { amount: 446, unit: 'gram' },
          { amount: 1, unit: 'unit' },
        ],
        ingredients_: [
          { _id: 'i1', referenceId: 'p1', type: 'product', amount_: 446, unit_: 'gram' },
        ],
      });
      const product = createProduct({
        _id: 'p1',
        base_unit_: 'gram',
        purchase_options_: [],
      });
      productsSignal.set([product]);
      recipesSignal.set([subRecipe]);
      const rowGram = { amount_net: 446, unit: 'gram', referenceId: 'sub', item_type: 'recipe', name_hebrew: 'Sub' };
      const rowUnit = { amount_net: 1, unit: 'unit', referenceId: 'sub', item_type: 'recipe', name_hebrew: 'Sub' };
      const weightGram = service.computeTotalWeightG([rowGram]);
      const weightUnit = service.computeTotalWeightG([rowUnit]);
      expect(weightUnit).toBe(weightGram);
      expect(weightGram).toBe(446);
    });
  });
});
