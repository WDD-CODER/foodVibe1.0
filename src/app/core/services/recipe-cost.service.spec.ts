import { TestBed } from '@angular/core/testing'
import { signal, computed } from '@angular/core'
import { RecipeCostService } from './recipe-cost.service'
import { KitchenStateService } from './kitchen-state.service'
import { UnitRegistryService } from './unit-registry.service'
import { Recipe } from '../models/recipe.model'
import { Product } from '../models/product.model'
import { Ingredient } from '../models/ingredient.model'

describe('RecipeCostService', () => {
  let service: RecipeCostService
  const productsSignal = signal<Product[]>([])
  const recipesSignal = signal<Recipe[]>([])

  function createProduct(overrides: Partial<Product> & { _id: string }): Product {
    const price = overrides.buy_price_global_ ?? 0
    return {
      _id: overrides._id,
      nameHebrew: overrides.nameHebrew ?? 'Product',
      baseUnit: overrides.baseUnit ?? 'gram',
      sources: overrides.sources ?? (price > 0 ? [{ supplierId: '', price, addedAt: Date.now() }] : []),
      purchaseOptions: overrides.purchaseOptions ?? [],
      categories: overrides.categories ?? [],
      yieldFactor: overrides.yieldFactor ?? 1,
      allergens: overrides.allergens ?? [],
      minStockLevel: overrides.minStockLevel ?? 0,
      expiryDaysDefault: overrides.expiryDaysDefault ?? 0
    }
  }

  function createRecipe(overrides: Partial<Recipe> & { _id: string }): Recipe {
    return {
      _id: overrides._id,
      nameHebrew: overrides.nameHebrew ?? 'Recipe',
      ingredients: overrides.ingredients ?? [],
      steps: overrides.steps ?? [],
      yieldAmount: overrides.yieldAmount ?? 1,
      yieldUnit: overrides.yieldUnit ?? 'unit',
      ...(overrides.yieldConversions != null && { yieldConversions: overrides.yieldConversions }),
      defaultStation: overrides.defaultStation ?? '',
      isApproved: overrides.isApproved ?? false
    }
  }

  beforeEach(() => {
    productsSignal.set([])
    recipesSignal.set([])
    const kitchenSpy = jasmine.createSpyObj('KitchenStateService', [], {
      products_: productsSignal,
      recipes_: recipesSignal,
      productsById_: computed(() => new Map(productsSignal().map((p) => [p._id, p]))),
      recipesById_: computed(() => new Map(recipesSignal().map((r) => [r._id, r])))
    })
    const unitRegistrySpy = jasmine.createSpyObj('UnitRegistryService', ['getConversion'])
    unitRegistrySpy.getConversion.and.callFake((key: string) => {
      const map: Record<string, number> = { gram: 1, g: 1, kg: 1000, liter: 1000, l: 1000, ml: 1, unit: 1 }
      return map[key] ?? 1
    })
    TestBed.configureTestingModule({
      providers: [
        RecipeCostService,
        { provide: KitchenStateService, useValue: kitchenSpy },
        { provide: UnitRegistryService, useValue: unitRegistrySpy }
      ]
    })
    service = TestBed.inject(RecipeCostService)
  })

  describe('computeRecipeCost and getCostForIngredient', () => {
    it('should return 0 for recipe with no ingredients', () => {
      const recipe = createRecipe({ _id: 'r1', ingredients: [] })
      expect(service.computeRecipeCost(recipe)).toBe(0)
    })

    it('should return 0 when product is missing', () => {
      productsSignal.set([])
      const recipe = createRecipe({
        _id: 'r1',
        ingredients: [{ _id: 'i1', referenceId: 'missing', type: 'product', amount: 100, unit: 'gram' }]
      })
      expect(service.computeRecipeCost(recipe)).toBe(0)
    })

    it('should compute product cost: (amount / yieldFactor) * buy_price_global_ in base unit', () => {
      const product = createProduct({
        _id: 'p1',
        buy_price_global_: 10,
        baseUnit: 'gram',
        yieldFactor: 1,
        purchaseOptions: []
      })
      productsSignal.set([product])
      const recipe = createRecipe({
        _id: 'r1',
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 500, unit: 'gram' }]
      })
      expect(service.computeRecipeCost(recipe)).toBe(5000) // 500g * 10 per gram
    })

    it('should use yieldFactor for product cost', () => {
      const product = createProduct({
        _id: 'p1',
        buy_price_global_: 100,
        baseUnit: 'gram',
        yieldFactor: 0.8,
        purchaseOptions: []
      })
      productsSignal.set([product])
      const recipe = createRecipe({
        _id: 'r1',
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 100, unit: 'gram' }]
      })
      // (100 / 0.8) * (100/1000) if buy_price_global_ is per kg? Recipe cost service: normalizedAmount = ing.amount / (unitOption.conversionRate || 1) when unitOption exists; else normalizedAmount = ing.amount. Then return (normalizedAmount / yieldFactor) * price. So price is buy_price_global_ - need to see what that is per. In the code it's just price = product.buy_price_global_. So (100/0.8)*100 = 12500. That seems like price is per unit (gram). So 100g at 100 per gram with 0.8 yield = 100/0.8 * 100 = 12500. So buy_price_global_ might be per baseUnit (per gram). Let me use smaller numbers: buy_price_global_: 1 (per gram), 100g, yield 0.8 → (100/0.8)*1 = 125.
      product.sources = [{ supplierId: '', price: 1, addedAt: Date.now() }]
      expect(service.computeRecipeCost(recipe)).toBeCloseTo(125, 0)
    })
  })

  describe('getRecipeCostPerUnit', () => {
    it('should return totalCost / yieldAmount', () => {
      const product = createProduct({ _id: 'p1', buy_price_global_: 2, yieldFactor: 1, purchaseOptions: [] })
      productsSignal.set([product])
      const recipe = createRecipe({
        _id: 'r1',
        yieldAmount: 4,
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 400, unit: 'gram' }]
      })
      const total = service.computeRecipeCost(recipe) // 400*2 = 800
      expect(total).toBe(800)
      expect(service.getRecipeCostPerUnit(recipe)).toBe(200) // 800/4
    })
  })

  describe('computeTotalWeightG', () => {
    it('should sum weight in grams for rows with mass units', () => {
      const rows = [
        { amount_net: 100, unit: 'gram', referenceId: '', item_type: undefined as string | undefined },
        { amount_net: 1, unit: 'kg', referenceId: '', item_type: undefined as string | undefined }
      ]
      expect(service.computeTotalWeightG(rows)).toBe(1100) // 100 + 1000
    })

    it('should convert purchase unit to base (conversionRate = base per 1 purchase unit)', () => {
      const product = createProduct({
        _id: 'p1',
        baseUnit: 'kg',
        purchaseOptions: [{ unitSymbol: 'unit', conversionRate: 0.3 }]
      })
      productsSignal.set([product])
      const rows = [{ amount_net: 1, unit: 'unit', referenceId: 'p1', item_type: 'product' }]
      // 1 unit * 0.3 kg/unit = 0.3 kg = 300 g
      expect(service.computeTotalWeightG(rows)).toBe(300)
    })

    it('should return 0 at max recursion depth', () => {
      const rows = [{ amount_net: 100, unit: 'gram' }]
      expect(service.computeTotalWeightG(rows, 5)).toBe(0)
    })
  })

  describe('computeTotalVolumeL and getUnconvertibleNamesForWeight', () => {
    it('should return totalL and unconvertibleNames', () => {
      const rows = [
        { amount_net: 500, unit: 'ml', nameHebrew: 'Milk' },
        { amount_net: 2, unit: 'liter', nameHebrew: 'Water' }
      ]
      const result = service.computeTotalVolumeL(rows)
      expect(result.totalL).toBeCloseTo(2.5, 4)
      expect(result.unconvertibleNames).toEqual([])
    })

    it('should list names that cannot be converted to volume', () => {
      const rows = [{ amount_net: 1, unit: 'portion', nameHebrew: 'Secret sauce' }]
      const result = service.computeTotalVolumeL(rows)
      expect(result.totalL).toBe(0)
      expect(result.unconvertibleNames).toContain('Secret sauce')
    })
  })

  describe('getCostForIngredient', () => {
    it('should return 0 for missing product', () => {
      productsSignal.set([])
      const ing: Ingredient = { _id: 'i1', referenceId: 'p1', type: 'product', amount: 100, unit: 'gram' }
      expect(service.getCostForIngredient(ing)).toBe(0)
    })

    it('should return 0 at max recursion depth', () => {
      const ing: Ingredient = { _id: 'i1', referenceId: 'p1', type: 'product', amount: 100, unit: 'gram' }
      expect(service.getCostForIngredient(ing, 5)).toBe(0)
    })

    it('should use purchase unit conversionRate as base per 1 unit (multiply)', () => {
      const product = createProduct({
        _id: 'p1',
        buy_price_global_: 10,
        baseUnit: 'kg',
        yieldFactor: 1,
        purchaseOptions: [{ unitSymbol: 'unit', conversionRate: 0.3 }]
      })
      productsSignal.set([product])
      const recipe = createRecipe({
        _id: 'r1',
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 1, unit: 'unit' }]
      })
      // 1 unit = 0.3 kg; cost = (0.3 / 1) * 10 = 3
      expect(service.computeRecipeCost(recipe)).toBe(3)
    })

    it('should use priceOverride as price per 1 purchase unit', () => {
      const product = createProduct({
        _id: 'p1',
        buy_price_global_: 10,
        baseUnit: 'kg',
        yieldFactor: 1,
        purchaseOptions: [{ unitSymbol: 'unit', conversionRate: 0.3, priceOverride: 4.9 }]
      })
      productsSignal.set([product])
      const recipe = createRecipe({
        _id: 'r1',
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 1, unit: 'unit' }]
      })
      expect(service.computeRecipeCost(recipe)).toBe(4.9)
    })
  })

  describe('amountInRecipeYieldUnit and yieldConversions', () => {
    it('should convert secondary units using yieldConversions (1 unit = 446g)', () => {
      const recipe = createRecipe({
        _id: 'r1',
        yieldAmount: 446,
        yieldUnit: 'gram',
        yieldConversions: [
          { amount: 446, unit: 'gram' },
          { amount: 1, unit: 'unit' },
          { amount: 1, unit: 'כפות' }
        ],
        ingredients: []
      })
      expect(service.amountInRecipeYieldUnit(1, 'unit', recipe)).toBe(446)
      expect(service.amountInRecipeYieldUnit(1, 'כפות', recipe)).toBe(446)
      expect(service.amountInRecipeYieldUnit(446, 'gram', recipe)).toBe(446)
      expect(service.amountInRecipeYieldUnit(2, 'unit', recipe)).toBe(892)
    })

    it('should fall back to registry when unit not in yieldConversions', () => {
      const recipe = createRecipe({
        _id: 'r1',
        yieldAmount: 446,
        yieldUnit: 'gram',
        yieldConversions: [
          { amount: 446, unit: 'gram' },
          { amount: 1, unit: 'unit' }
        ],
        ingredients: []
      })
      // kg not in conversions; registry has kg: 1000, gram: 1 → 1 kg = 1000 in gram terms
      expect(service.amountInRecipeYieldUnit(1, 'kg', recipe)).toBe(1000)
    })

    it('should give same cost for 1 unit as 446 gram when recipe has yieldConversions', () => {
      const product = createProduct({
        _id: 'p1',
        buy_price_global_: 0.01,
        baseUnit: 'gram',
        yieldFactor: 1,
        purchaseOptions: []
      })
      productsSignal.set([product])
      const subRecipe = createRecipe({
        _id: 'sub',
        yieldAmount: 446,
        yieldUnit: 'gram',
        yieldConversions: [
          { amount: 446, unit: 'gram' },
          { amount: 1, unit: 'unit' }
        ],
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 446, unit: 'gram' }]
      })
      recipesSignal.set([subRecipe])
      const costFor446Gram = service.getCostForIngredient({
        _id: 'i1',
        referenceId: 'sub',
        type: 'recipe',
        amount: 446,
        unit: 'gram'
      })
      const costFor1Unit = service.getCostForIngredient({
        _id: 'i2',
        referenceId: 'sub',
        type: 'recipe',
        amount: 1,
        unit: 'unit'
      })
      expect(costFor1Unit).toBe(costFor446Gram)
      expect(costFor446Gram).toBeCloseTo(4.46, 2) // 446 * 0.01
    })

    it('should give same row weight for 1 unit as 446 gram when recipe has yieldConversions', () => {
      const subRecipe = createRecipe({
        _id: 'sub',
        yieldAmount: 446,
        yieldUnit: 'gram',
        yieldConversions: [
          { amount: 446, unit: 'gram' },
          { amount: 1, unit: 'unit' }
        ],
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 446, unit: 'gram' }]
      })
      const product = createProduct({
        _id: 'p1',
        baseUnit: 'gram',
        purchaseOptions: []
      })
      productsSignal.set([product])
      recipesSignal.set([subRecipe])
      const rowGram = { amount_net: 446, unit: 'gram', referenceId: 'sub', item_type: 'recipe', nameHebrew: 'Sub' }
      const rowUnit = { amount_net: 1, unit: 'unit', referenceId: 'sub', item_type: 'recipe', nameHebrew: 'Sub' }
      const weightGram = service.computeTotalWeightG([rowGram])
      const weightUnit = service.computeTotalWeightG([rowUnit])
      expect(weightUnit).toBe(weightGram)
      expect(weightGram).toBe(446)
    })
  })
})
