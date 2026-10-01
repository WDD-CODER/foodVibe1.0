import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { ScalingService } from './scaling.service'
import { KitchenStateService } from './kitchen-state.service'
import { Recipe } from '../models/recipe.model'
import { Product } from '../models/product.model'

describe('ScalingService', () => {
  let service: ScalingService
  const productsSignal = signal<Product[]>([])
  const recipesSignal = signal<Recipe[]>([])

  beforeEach(() => {
    productsSignal.set([])
    recipesSignal.set([])
    const kitchenSpy = jasmine.createSpyObj('KitchenStateService', [], {
      products_: productsSignal,
      recipes_: recipesSignal
    })
    TestBed.configureTestingModule({
      providers: [ScalingService, { provide: KitchenStateService, useValue: kitchenSpy }]
    })
    service = TestBed.inject(ScalingService)
  })

  describe('getScaleFactor', () => {
    it('should return targetQuantity / yieldAmount when yield is positive', () => {
      const recipe = { yieldAmount: 4 } as Recipe
      expect(service.getScaleFactor(recipe, 8)).toBe(2)
      expect(service.getScaleFactor(recipe, 2)).toBe(0.5)
    })

    it('should return 1 when yieldAmount is zero or negative', () => {
      expect(service.getScaleFactor({ yieldAmount: 0 } as Recipe, 10)).toBe(1)
      expect(service.getScaleFactor({ yieldAmount: -1 } as Recipe, 10)).toBe(1)
    })

    it('should use 1 as base when yieldAmount is undefined', () => {
      expect(service.getScaleFactor({} as Recipe, 5)).toBe(5)
    })
  })

  describe('getScaledIngredients', () => {
    it('should scale amounts by factor and resolve product name from KitchenState', () => {
      const product: Product = {
        _id: 'p1',
        nameHebrew: 'Flour',
        baseUnit: 'gram',
        sources: [],
        purchaseOptions: [],
        categories: [],
        yieldFactor: 1,
        allergens: [],
        minStockLevel: 0,
        expiryDaysDefault: 0
      }
      productsSignal.set([product])
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Test',
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 100, unit: 'gram' }],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      const rows = service.getScaledIngredients(recipe, 2)
      expect(rows.length).toBe(1)
      expect(rows[0].name).toBe('Flour')
      expect(rows[0].amount).toBe(200)
      expect(rows[0].unit).toBe('gram')
      expect(rows[0].type).toBe('product')
      expect(rows[0].referenceId).toBe('p1')
    })

    it('should resolve recipe ingredient and scale amount', () => {
      const subRecipe: Recipe = {
        _id: 'sub1',
        nameHebrew: 'Prep',
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      recipesSignal.set([subRecipe])
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Dish',
        ingredients: [{ _id: 'i1', referenceId: 'sub1', type: 'recipe', amount: 2, unit: 'unit' }],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      const rows = service.getScaledIngredients(recipe, 3)
      expect(rows.length).toBe(1)
      expect(rows[0].name).toBe('Prep')
      expect(rows[0].amount).toBe(6)
      expect(rows[0].type).toBe('recipe')
    })

    it('should mark orphaned references as unlinked when product or recipe is missing', () => {
      productsSignal.set([])
      recipesSignal.set([])
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Dish',
        ingredients: [
          { _id: 'i1', referenceId: 'missing', type: 'product', amount: 50, unit: 'gram', nameSnapshot: 'Gone' }
        ],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      const rows = service.getScaledIngredients(recipe, 1)
      expect(rows[0].name).toBe('Gone')
      expect(rows[0].isUnlinked).toBe(true)
      expect(rows[0].amount).toBe(50)
    })

    it('should return empty array when recipe has no ingredients', () => {
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Empty',
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      expect(service.getScaledIngredients(recipe, 2)).toEqual([])
    })
  })

  describe('getScaledPrepItems', () => {
    it('should scale prepItems by factor', () => {
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Dish',
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false,
        prepItems: [{ preparationName: 'Chop onions', quantity: 2, unit: 'unit', categoryName: 'Veg' }]
      }
      const rows = service.getScaledPrepItems(recipe, 3)
      expect(rows.length).toBe(1)
      expect(rows[0].name).toBe('Chop onions')
      expect(rows[0].amount).toBe(6)
      expect(rows[0].unit).toBe('unit')
      expect(rows[0].categoryName).toBe('Veg')
    })

    it('should scale prepCategories items by factor', () => {
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Dish',
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false,
        prepCategories: [
          {
            categoryName: 'Mise',
            items: [{ itemName: 'Garlic', quantity: 1, unit: 'unit' }]
          }
        ]
      }
      const rows = service.getScaledPrepItems(recipe, 4)
      expect(rows.length).toBe(1)
      expect(rows[0].name).toBe('Garlic')
      expect(rows[0].amount).toBe(4)
    })

    it('should return empty array when recipe has no prepItems or prepCategories', () => {
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Simple',
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      expect(service.getScaledPrepItems(recipe, 1)).toEqual([])
    })
  })
})
