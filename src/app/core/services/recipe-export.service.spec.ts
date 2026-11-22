import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import type { CellValue, Workbook, Worksheet } from 'exceljs'

import { RecipeExportService } from './recipe-export.service'
import { KitchenStateService } from './kitchen-state.service'
import { ScalingService, type ScaledIngredientRow, type ScaledPrepRow } from './scaling.service'
import { RecipeCostService } from './recipe-cost.service'
import { TranslationService } from './translation.service'
import { Recipe } from '../models/recipe.model'
import { Product } from '../models/product.model'

/**
 * The dictionary words these exports read (plan 471); any other key comes back as itself, like the real service.
 * The two fallback categories get test-only words so the plan's "no Hebrew literal" grep stays clean.
 */
const HE: Record<string, string> = {
  recipe: 'מתכון',
  dry: 'יבש',
  general_group: 'קבוצה כללית',
  shopping_total: 'סה״כ',
  export_shopping_list: 'רשימת קניות',
  export_sheet_cooking_steps: 'שלבי הכנה',
  export_sheet_checklist: 'רשימת הכנות',
  export_category_preps: 'הכנות המתכון',
  export_full_recipe: 'המתכון המלא',
  export_total_prep_time: 'זמן הכנה כולל (דקות)',
  export_labor_time_min: "זמן עבודה (דק')",
  export_cooking_time_sec: "זמן בישול (שנ')"
}

const LATIN = /[A-Za-z]/

function cell(ws: Worksheet, row: number, col: number): CellValue {
  return ws.getRow(row).getCell(col).value
}

function rowTexts(ws: Worksheet, row: number): string[] {
  const values = ws.getRow(row).values as CellValue[]
  return values.filter((v) => v !== undefined && v !== null).map((v) => String(v))
}

describe('RecipeExportService (plan 471: house style, Hebrew)', () => {
  let service: RecipeExportService
  let scalingSpy: jasmine.SpyObj<ScalingService>
  const productsSignal = signal<Product[]>([])

  const flour: Product = {
    _id: 'p1',
    nameHebrew: 'קמח',
    baseUnit: 'gram',
    sources: [],
    purchaseOptions: [],
    categories: ['Dry'],
    yieldFactor: 1,
    allergens: [],
    minStockLevel: 0,
    expiryDaysDefault: 0
  }

  const recipe: Recipe = {
    _id: 'r1',
    nameHebrew: 'לחם',
    ingredients: [
      { _id: 'i1', referenceId: 'p1', type: 'product', amount: 100, unit: 'gram' },
      { _id: 'i2', referenceId: 'r9', type: 'recipe', amount: 1, unit: 'unit' }
    ],
    steps: [
      { order: 2, instruction: 'לאפות', laborTimeMinutes: 30 },
      { order: 1, instruction: 'ללוש', laborTimeMinutes: 10 },
      { order: 3, instruction: '  ', laborTimeMinutes: 0 }
    ],
    yieldAmount: 2,
    yieldUnit: 'unit',
    defaultStation: '',
    isApproved: false
  }

  const scaledRows: ScaledIngredientRow[] = [
    { name: 'קמח', amount: 200, unit: 'gram', availableUnits: [], referenceId: 'p1', type: 'product' },
    { name: 'שאור', amount: 2, unit: 'unit', availableUnits: [], referenceId: 'r9', type: 'recipe' }
  ]
  const prepRows: ScaledPrepRow[] = [{ name: 'בצק', amount: 2, unit: 'kg', categoryName: 'dry' }]

  beforeEach(() => {
    productsSignal.set([flour])
    scalingSpy = jasmine.createSpyObj('ScalingService', [
      'getScaleFactor',
      'getScaledIngredients',
      'getScaledPrepItems'
    ])
    scalingSpy.getScaleFactor.and.returnValue(2)
    scalingSpy.getScaledIngredients.and.returnValue(scaledRows)
    scalingSpy.getScaledPrepItems.and.returnValue(prepRows)
    const costSpy = jasmine.createSpyObj('RecipeCostService', ['getCostForIngredient'])
    costSpy.getCostForIngredient.and.returnValue(10)
    const translation = { translate: (k: string | undefined) => HE[(k ?? '').trim().toLowerCase()] ?? k ?? '' }

    TestBed.configureTestingModule({
      providers: [
        RecipeExportService,
        { provide: KitchenStateService, useValue: { products_: productsSignal } },
        { provide: ScalingService, useValue: scalingSpy },
        { provide: RecipeCostService, useValue: costSpy },
        { provide: TranslationService, useValue: translation }
      ]
    })
    service = TestBed.inject(RecipeExportService)
  })

  const builders: [string, () => Promise<Workbook>][] = [
    ['buildRecipeInfoWorkbook', () => service.buildRecipeInfoWorkbook(recipe, 4)],
    ['buildCookingStepsWorkbook', () => service.buildCookingStepsWorkbook(recipe, 4)],
    ['buildDishChecklistWorkbook', () => service.buildDishChecklistWorkbook(recipe, 4)],
    ['buildShoppingListWorkbook', () => service.buildShoppingListWorkbook(recipe, 4)],
    ['buildAllTogetherRecipeWorkbook', () => service.buildAllTogetherRecipeWorkbook(recipe, 4)]
  ]

  for (const [label, build] of builders) {
    it(`${label}: Hebrew sheet names, right to left, title band and meta line, A4 one page wide`, async () => {
      const wb = await build()
      expect(wb.worksheets.length).toBeGreaterThan(0)
      for (const ws of wb.worksheets) {
        expect(LATIN.test(ws.name)).withContext(ws.name).toBeFalse()
        expect(ws.views[0]?.rightToLeft).withContext(ws.name).toBeTrue()
        expect(String(cell(ws, 1, 1)))
          .withContext(ws.name)
          .toContain('לחם')
        expect(String(cell(ws, 2, 1)))
          .withContext(ws.name)
          .toContain('4')
        for (const text of rowTexts(ws, 3)) expect(LATIN.test(text)).withContext(`${ws.name}: ${text}`).toBeFalse()
        expect(ws.pageSetup.paperSize).toBe(9)
        expect(ws.pageSetup.fitToWidth).toBe(1)
      }
    })
  }

  it('table sheets: row 3 is the grey header and rows 1–3 are frozen', async () => {
    const wb = await service.buildCookingStepsWorkbook(recipe, 4)
    const ws = wb.worksheets[0]
    expect(ws.name).toBe('שלבי הכנה')
    expect(rowTexts(ws, 3)).toEqual(['סדר', 'הנחיה', "זמן עבודה (דק')", "זמן בישול (שנ')"])
    expect(ws.views[0]).toEqual(jasmine.objectContaining({ state: 'frozen', ySplit: 3 }))
    expect(cell(ws, 4, 2)).toBe('ללוש')
  })

  it('shopping list: Hebrew category for an English category key, preps in their group, bold SUM total', async () => {
    const wb = await service.buildShoppingListWorkbook(recipe, 4)
    const ws = wb.worksheets[0]
    expect(ws.name).toBe('רשימת קניות')
    const categories = [cell(ws, 4, 1), cell(ws, 5, 1)]
    expect(categories).toContain('יבש')
    expect(categories).toContain('הכנות המתכון')
    expect(categories).not.toContain('Dry')
    expect(cell(ws, 4, 6)).toEqual({ formula: 'C4*E4' })
    expect(cell(ws, 6, 2)).toBe('סה״כ')
    expect(cell(ws, 6, 6)).toEqual({ formula: 'SUM(F4:F5)' })
    expect(ws.getRow(6).font?.bold).toBeTrue()
  })

  it('a product with no category goes under the general group', async () => {
    productsSignal.set([{ ...flour, categories: [] }])
    const ws = (await service.buildShoppingListWorkbook(recipe, 4)).worksheets[0]
    expect([cell(ws, 4, 1), cell(ws, 5, 1)]).toContain('קבוצה כללית')
  })

  it('"Export all" has the info sheet and the shopping sheet with the same total', async () => {
    const wb = await service.buildAllTogetherRecipeWorkbook(recipe, 4)
    expect(wb.worksheets.map((w) => w.name)).toEqual(['פרטים', 'רשימת קניות'])
    expect(cell(wb.worksheets[1], 6, 6)).toEqual({ formula: 'SUM(F4:F5)' })
  })

  it('the shopping preview reads the same Hebrew rows', () => {
    const rows = service.getShoppingListPreviewPayload(recipe, 4).sections[0].rows
    expect(rows.map((r) => r[0])).toContain('יבש')
    expect(rows.map((r) => r[0])).not.toContain('Dry')
  })

  describe('getFullRecipePreviewPayload', () => {
    it('numbers the steps in order, skips blank steps and has no price column', () => {
      const payload = service.getFullRecipePreviewPayload(recipe, 4)
      expect(payload.title).toContain('המתכון המלא')
      expect(payload.recipeSheet?.recipeName).toBe('לחם')
      expect(payload.recipeSheetStepsAsSection).toBeTrue()
      const [ingredients, steps] = payload.sections
      expect(ingredients.headerRow?.length).toBe(3)
      expect(ingredients.headerRow).not.toContain('מחיר ליחידה')
      expect(ingredients.rows[0]).toEqual(['קמח', 200, 'גרם'])
      expect(steps.rows).toEqual([
        ['1.', 'ללוש', 10],
        ['2.', 'לאפות', 30]
      ])
      expect(payload.summary).toEqual([{ label: 'זמן הכנה כולל (דקות)', value: 40 }])
    })

    it('a recipe with no steps shows the ingredients and no steps section', () => {
      const payload = service.getFullRecipePreviewPayload({ ...recipe, steps: [] }, 4)
      expect(payload.sections.length).toBe(1)
    })
  })
})
