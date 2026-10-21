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
import { EventPlanService } from '../engine/event-plan.service'
import { StationRegistryService } from './station-registry.service'
import { computeEventPlan } from '../engine/event-plan.engine'
import { buildFixtureInput } from '../engine/testing/event-plan.fixture'
import { buildShoppingListTable } from '../utils/shopping-list-table.util'

describe('ExportService', () => {
  let service: ExportService
  const productsSignal = signal<Product[]>([])
  const recipesSignal = signal<Recipe[]>([])
  let scalingSpy: jasmine.SpyObj<ScalingService>
  let planSpy: jasmine.SpyObj<EventPlanService>
  const fixtureInput = buildFixtureInput()
  const fixturePlan = computeEventPlan(fixtureInput)

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

    planSpy = jasmine.createSpyObj('EventPlanService', ['planFor'])
    planSpy.planFor.and.returnValue(fixturePlan)

    TestBed.configureTestingModule({
      providers: [
        ExportService,
        { provide: KitchenStateService, useValue: kitchenSpy },
        { provide: ScalingService, useValue: scalingSpy },
        { provide: RecipeCostService, useValue: costSpy },
        { provide: TranslationService, useValue: translationSpy },
        { provide: EventPlanService, useValue: planSpy },
        { provide: StationRegistryService, useValue: { stations_: signal(['קר']) } }
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

  describe('menu shopping list (engine plan)', () => {
    const menu: MenuEvent = {
      _id: 'm1',
      name: 'Menu',
      eventType: '',
      eventDate: '',
      servingType: 'plated_course',
      guestCount: 100,
      sections: [],
      financialTargets: { targetFoodCostPct: 0, targetRevenuePerGuest: 0 },
      performanceTags: { foodCostPct: 0, primaryServingStyle: 'plated_course' }
    }

    it('preview rows are exactly the table rows plus the total row', () => {
      const payload = service.getMenuShoppingListPreviewPayload(menu, [], fixtureInput.products)
      const table = buildShoppingListTable(fixturePlan, fixtureInput.products, (k) => k)
      expect(planSpy.planFor).toHaveBeenCalledWith(menu)
      expect(payload.sections.length).toBe(1)
      expect(payload.sections[0].headerRow).toEqual(table.headerRow)
      expect(payload.sections[0].rows).toEqual([...table.rows, table.totalRow])
      const total = payload.sections[0].rows[payload.sections[0].rows.length - 1]
      expect(total[5]).toBe(157.75)
    })

    it('carries the plan missing items so the preview can show the partial badge (plan 444)', () => {
      const payload = service.getMenuShoppingListPreviewPayload(menu, [], fixtureInput.products)
      expect(payload.missing).toEqual(fixturePlan.missing)
      expect(payload.missing?.some((m) => m.kind === 'unpriced' && m.name === 'לימון')).toBeTrue()
    })

    it('lists the prep products and no row named after the prep', () => {
      const rows = service.getMenuShoppingListPreviewPayload(menu, [], fixtureInput.products).sections[0].rows
      expect(rows.some((r) => r[1] === 'שמן זית')).toBeTrue()
      expect(rows.some((r) => r[1] === 'רוטב')).toBeFalse()
    })

    it('exports without reading the per-dish scaling or cost services', async () => {
      await service.exportMenuShoppingList(menu, [], fixtureInput.products)
      expect(planSpy.planFor).toHaveBeenCalledWith(menu)
      expect(scalingSpy.getScaledIngredients).not.toHaveBeenCalled()
    })
  })

  describe('prep sheets (plan 437)', () => {
    it('no longer has the flattened checklist preview', () => {
      expect((service as unknown as Record<string, unknown>)['getMenuChecklistPreviewPayload']).toBeUndefined()
    })

    it('exports every mode from the engine plan, never from the per-recipe scaling', async () => {
      for (const mode of ['by_dish', 'by_category', 'by_station'] as const) {
        await service.exportChecklist(fixtureInput.event, fixtureInput.recipes, mode)
      }
      await service.exportAllTogetherMenu(fixtureInput.event, fixtureInput.recipes, fixtureInput.products, 'by_station')
      expect(planSpy.planFor).toHaveBeenCalledWith(fixtureInput.event)
      expect(scalingSpy.getScaledPrepItems).not.toHaveBeenCalled()
    })
  })

  describe('menu info preview (plan 441: no take rate, no pieces per person)', () => {
    const menu: MenuEvent = {
      _id: 'm1',
      name: 'Menu',
      eventType: 'פרטי',
      eventDate: '',
      servingType: 'cocktail_passed',
      guestCount: 50,
      sections: [
        {
          _id: 's1',
          name: 'Passed',
          sortOrder: 0,
          items: [{ recipeId: 'r1', recipeType: 'dish', derivedPortions: 173, sellPrice: 12 }]
        }
      ],
      financialTargets: { targetFoodCostPct: 0, targetRevenuePerGuest: 0 },
      performanceTags: { foodCostPct: 0, primaryServingStyle: 'cocktail_passed' }
    }

    it('prints the portions and price per dish and no take-rate column or pieces-per-person row', () => {
      const payload = service.getMenuInfoPreviewPayload(menu, [])
      const cover = payload.sections[0]
      expect(cover.rows.map((r) => r[0])).not.toContain('פריטים לסועד')
      const dishes = payload.sections[1]
      expect(dishes.headerRow ?? []).not.toContain('שיעור לקיחה')
      expect(dishes.headerRow?.length).toBe(3)
      expect(dishes.rows[0][1]).toBe(173)
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
