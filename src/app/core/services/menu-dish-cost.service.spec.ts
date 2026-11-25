import { TestBed } from '@angular/core/testing'
import { signal, computed } from '@angular/core'
import { MenuDishCostService } from './menu-dish-cost.service'
import { RecipeCostService } from './recipe-cost.service'
import { KitchenStateService } from './kitchen-state.service'
import { UnitRegistryService } from './unit-registry.service'
import { BusinessService } from './business.service'
import type { Recipe } from '../models/recipe.model'
import type { Product } from '../models/product.model'
import type { MenuDish } from '../models/menu-dish.model'

describe('MenuDishCostService', () => {
  const productsSignal = signal<Product[]>([])
  const recipesSignal = signal<Recipe[]>([])
  const businessSignal = signal<{ settings?: { vatRatePct?: number; dealerType?: 'murshe' | 'patur' } } | null>(null)
  let service: MenuDishCostService

  const product = (_id: string, price: number, baseUnit = 'liter'): Product =>
    ({
      _id,
      nameHebrew: 'p' + _id,
      baseUnit,
      sources: price > 0 ? [{ supplierId: '', price, addedAt: 0 }] : [],
      purchaseOptions: [],
      categories: [],
      yieldFactor: 1,
      allergens: [],
      minStockLevel: 0,
      expiryDaysDefault: 0
    }) as Product

  const recipe = (_id: string, productId: string, yieldAmount = 2): Recipe =>
    ({
      _id,
      nameHebrew: 'r' + _id,
      ingredients: [{ _id: 'i', referenceId: productId, type: 'product', amount: 1000, unit: 'gram' }],
      steps: [],
      yieldAmount,
      yieldUnit: 'unit',
      defaultStation: '',
      isApproved: true
    }) as Recipe

  const dish = (overrides: Partial<MenuDish>): MenuDish =>
    ({ _id: 'd1', name: 'dish', costSource: 'units', active: true, ...overrides }) as MenuDish

  beforeEach(() => {
    productsSignal.set([])
    recipesSignal.set([])
    businessSignal.set(null)
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
        MenuDishCostService,
        RecipeCostService,
        { provide: KitchenStateService, useValue: kitchenSpy },
        { provide: UnitRegistryService, useValue: unitRegistrySpy },
        { provide: BusinessService, useValue: { business_: businessSignal.asReadonly() } }
      ]
    })
    service = TestBed.inject(MenuDishCostService)
  })

  it('a recipe dish with every product priced is costed with the recipe cost per unit', () => {
    productsSignal.set([product('p1', 0.01, 'gram')])
    recipesSignal.set([recipe('r1', 'p1', 2)])
    const cost = service.costOf(dish({ costSource: 'recipe', recipeId: 'r1' }))
    const recipeCost = TestBed.inject(RecipeCostService).getRecipeCostPerUnit(recipesSignal()[0])
    expect(cost.state).toBe('costed')
    expect(cost.costPerPortion).toBe(recipeCost)
    expect(cost.costPerPortion).toBe(5)
    expect(cost.missing).toEqual([])
  })

  it('one unpriced ingredient makes the dish partial with the missing list', () => {
    productsSignal.set([product('p1', 0, 'gram')])
    recipesSignal.set([recipe('r1', 'p1')])
    const cost = service.costOf(dish({ costSource: 'recipe', recipeId: 'r1' }))
    expect(cost.state).toBe('partial')
    expect(cost.missing.length).toBe(1)
    expect(cost.missing[0].kind).toBe('unpriced')
  })

  it('a deleted recipe or product is missing with no number', () => {
    expect(service.costOf(dish({ costSource: 'recipe', recipeId: 'gone' }))).toEqual({
      state: 'missing',
      costPerPortion: null,
      missing: []
    })
    const gone = service.costOf(
      dish({ costSource: 'product', productId: 'gone', productAmount: 1, productUnit: 'liter' })
    )
    expect(gone.state).toBe('missing')
    expect(gone.costPerPortion).toBeNull()
  })

  it('0.33 of a 1-litre bottle at 12 costs 3.96', () => {
    productsSignal.set([product('juice', 12)])
    const cost = service.costOf(
      dish({ costSource: 'product', productId: 'juice', productAmount: 0.33, productUnit: 'liter' })
    )
    expect(cost.state).toBe('costed')
    expect(cost.costPerPortion).toBeCloseTo(3.96, 6)
  })

  it('an unpriced bought product is partial', () => {
    productsSignal.set([product('juice', 0)])
    const cost = service.costOf(
      dish({ costSource: 'product', productId: 'juice', productAmount: 1, productUnit: 'liter' })
    )
    expect(cost.state).toBe('partial')
    expect(cost.missing[0].productId).toBe('juice')
  })

  it('a typed dish costs its typed number; a units-only dish has no cost', () => {
    expect(service.costOf(dish({ costSource: 'typed', typedCost: 7.5 }))).toEqual({
      state: 'costed',
      costPerPortion: 7.5,
      missing: []
    })
    expect(service.costOf(dish({ costSource: 'units' }))).toEqual({ state: 'units', costPerPortion: null, missing: [] })
  })

  it('netPrice uses 18% murshe by default, the stored rate, and the price itself for patur', () => {
    expect(service.netPrice(dish({ priceWithVat: 118 }))).toBe(100)
    expect(service.netPrice(dish({}))).toBeNull()
    businessSignal.set({ settings: { vatRatePct: 17, dealerType: 'murshe' } })
    expect(service.netPrice(dish({ priceWithVat: 117 }))).toBe(100)
    businessSignal.set({ settings: { dealerType: 'patur' } })
    expect(service.netPrice(dish({ priceWithVat: 118 }))).toBe(118)
  })

  it('leftPerDish is net price − cost only for a costed dish', () => {
    expect(service.leftPerDish(dish({ costSource: 'typed', typedCost: 30, priceWithVat: 118 }))).toBe(70)
    expect(service.leftPerDish(dish({ costSource: 'units', priceWithVat: 118 }))).toBeNull()
    expect(service.leftPerDish(dish({ costSource: 'typed', typedCost: 30 }))).toBeNull()
    productsSignal.set([product('p1', 0, 'gram')])
    recipesSignal.set([recipe('r1', 'p1')])
    expect(service.leftPerDish(dish({ costSource: 'recipe', recipeId: 'r1', priceWithVat: 118 }))).toBeNull()
  })
})
