import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { ExportService } from './export.service'
import { KitchenStateService } from './kitchen-state.service'
import { ScalingService } from './scaling.service'
import { RecipeCostService } from './recipe-cost.service'
import { TranslationService } from './translation.service'
import { Recipe } from '../models/recipe.model'
import { Product } from '../models/product.model'
import { MenuEvent } from '@models/menu-event.model'
import { ScaledIngredientRow } from './scaling.service'

describe('ExportService', () => {
  let service: ExportService
  const productsSignal = signal<Product[]>([])
  const recipesSignal = signal<Recipe[]>([])
  let scalingSpy: jasmine.SpyObj<ScalingService>

  beforeEach(() => {
    productsSignal.set([])
    recipesSignal.set([])
    scalingSpy = jasmine.createSpyObj('ScalingService', [
      'getScaleFactor',
      'getScaledIngredients',
      'getScaledPrepItems'
    ])
    scalingSpy.getScaleFactor.and.callFake((recipe: Recipe, targetQty: number) => {
      const base = recipe.yieldAmount ?? 1
      return base > 0 ? targetQty / base : 1
    })
    scalingSpy.getScaledIngredients.and.returnValue([])
    scalingSpy.getScaledPrepItems.and.returnValue([])

    const kitchenSpy = jasmine.createSpyObj('KitchenStateService', [], {
      products_: productsSignal,
      recipes_: recipesSignal
    })
    const costSpy = jasmine.createSpyObj('RecipeCostService', ['getCostForIngredient', 'computeRecipeCost'])
    costSpy.getCostForIngredient.and.returnValue(0)
    costSpy.computeRecipeCost.and.returnValue(0)
    const translationSpy = jasmine.createSpyObj('TranslationService', ['translate'])
    translationSpy.translate.and.callFake((k: string) => k ?? '')

    TestBed.configureTestingModule({
      providers: [
        ExportService,
        { provide: KitchenStateService, useValue: kitchenSpy },
        { provide: ScalingService, useValue: scalingSpy },
        { provide: RecipeCostService, useValue: costSpy },
        { provide: TranslationService, useValue: translationSpy }
      ]
    })
    service = TestBed.inject(ExportService)
  })

  describe('exportShoppingList (single recipe)', () => {
    it('should call getScaleFactor and getScaledIngredients with recipe and correct factor', async () => {
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Test Recipe',
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 100, unit: 'gram' }],
        steps: [],
        yieldAmount: 2,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      await service.exportShoppingList(recipe, 4)

      expect(scalingSpy.getScaleFactor).toHaveBeenCalledWith(recipe, 4)
      expect(scalingSpy.getScaledIngredients).toHaveBeenCalledWith(recipe, 2) // 4/2
    })

    it('should use kitchen state products and recipes for category resolution', () => {
      const product: Product = {
        _id: 'p1',
        nameHebrew: 'Flour',
        baseUnit: 'gram',
        sources: [],
        purchaseOptions: [],
        categories: ['Dry'],
        yieldFactor: 1,
        allergens: [],
        minStockLevel: 0,
        expiryDaysDefault: 0
      }
      productsSignal.set([product])
      scalingSpy.getScaledIngredients.and.returnValue([
        { name: 'Flour', amount: 200, unit: 'gram', availableUnits: [], referenceId: 'p1', type: 'product' }
      ] as ScaledIngredientRow[])

      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Test',
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 100, unit: 'gram' }],
        steps: [],
        yieldAmount: 2,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      expect(() => service.exportShoppingList(recipe, 4)).not.toThrow()
      expect(scalingSpy.getScaledIngredients).toHaveBeenCalledWith(recipe, 2)
    })
  })

  describe('exportMenuShoppingList', () => {
    it('should call getScaledIngredients per dish with factor = derivedPortions / yieldAmount', async () => {
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Dish',
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 100, unit: 'gram' }],
        steps: [],
        yieldAmount: 10,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      const product: Product = {
        _id: 'p1',
        nameHebrew: 'Flour',
        baseUnit: 'gram',
        sources: [],
        purchaseOptions: [],
        categories: ['Dry'],
        yieldFactor: 1,
        allergens: [],
        minStockLevel: 0,
        expiryDaysDefault: 0
      }
      scalingSpy.getScaledIngredients.and.returnValue([
        { name: 'Flour', amount: 0, unit: 'gram', availableUnits: [], referenceId: 'p1', type: 'product' }
      ] as ScaledIngredientRow[])

      const menu: MenuEvent = {
        _id: 'm1',
        name: 'Menu',
        eventType: '',
        eventDate: '',
        servingType: 'plated_course',
        guestCount: 5,
        sections: [
          {
            _id: 's1',
            name: 'Main',
            sortOrder: 1,
            items: [
              { recipeId: 'r1', recipeType: 'dish', predictedTakeRate: 0, derivedPortions: 20, servingPortions: 1 },
              { recipeId: 'r1', recipeType: 'dish', predictedTakeRate: 0, derivedPortions: 5, servingPortions: 0.5 }
            ]
          }
        ],
        financialTargets: { targetFoodCostPct: 0, targetRevenuePerGuest: 0 },
        performanceTags: { foodCostPct: 0, primaryServingStyle: 'plated_course' }
      }
      await service.exportMenuShoppingList(menu, [recipe], [product])

      expect(scalingSpy.getScaledIngredients).toHaveBeenCalledWith(recipe, 2) // 20/10
      expect(scalingSpy.getScaledIngredients).toHaveBeenCalledWith(recipe, 0.5) // 5/10
      expect(scalingSpy.getScaledIngredients).toHaveBeenCalledTimes(2)
    })

    it('should skip items with no recipe or no ingredients', async () => {
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
      const menu: MenuEvent = {
        _id: 'm1',
        name: 'Menu',
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
              { recipeId: 'r1', recipeType: 'dish', predictedTakeRate: 0, derivedPortions: 2, servingPortions: 1 }
            ]
          }
        ],
        financialTargets: { targetFoodCostPct: 0, targetRevenuePerGuest: 0 },
        performanceTags: { foodCostPct: 0, primaryServingStyle: 'plated_course' }
      }
      await service.exportMenuShoppingList(menu, [recipe], [])
      expect(scalingSpy.getScaledIngredients).not.toHaveBeenCalled()
    })
  })

  describe('getRecipeInfoPreviewPayload and exportRecipeInfo (Plan 108)', () => {
    it('should return payload with recipeSheet, recipeSheetLabels, and ingredients section', () => {
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Test Recipe',
        ingredients: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount: 100, unit: 'gram' }],
        steps: [{ order: 1, instruction: 'Mix', laborTimeMinutes: 10 }],
        yieldAmount: 2,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      scalingSpy.getScaledIngredients.and.returnValue([
        { name: 'Flour', amount: 200, unit: 'gram', availableUnits: [], referenceId: 'p1', type: 'product' }
      ] as ScaledIngredientRow[])

      const payload = service.getRecipeInfoPreviewPayload(recipe, 4)

      expect(payload.recipeSheet).toBeDefined()
      expect(payload.recipeSheet?.date).toBeDefined()
      expect(payload.recipeSheet?.recipeName).toBe('Test Recipe')
      expect(payload.recipeSheet?.yieldQty).toBe(4)
      expect(payload.recipeSheet?.preparationInstructions).toEqual(['Mix'])
      expect(payload.recipeSheet?.preparationTime).toBe(10)
      expect(payload.recipeSheetLabels).toBeDefined()
      expect(payload.sections.length).toBe(1)
      expect(payload.sections[0].headerRow?.length).toBe(4)
    })

    it('should export recipe info without throwing (single sheet)', async () => {
      const recipe: Recipe = {
        _id: 'r1',
        nameHebrew: 'Test',
        ingredients: [],
        steps: [],
        yieldAmount: 1,
        yieldUnit: 'unit',
        defaultStation: '',
        isApproved: false
      }
      await service.exportRecipeInfo(recipe, 1)
      expect(scalingSpy.getScaleFactor).toHaveBeenCalledWith(recipe, 1)
    })
  })
})
