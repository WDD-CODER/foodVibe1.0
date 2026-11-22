/**
 * Recipe/dish export domain service.
 * Handles all recipe-scoped Excel exports and preview payloads.
 * Plan: refactor/split-export-service; plan 471 (house style, Hebrew, builders).
 */

import { Injectable, inject } from '@angular/core'
// Type-only (erased): the runtime module is loaded on demand via `await import('exceljs')`, so the
// ~1 MB library stays out of the boot bundle for users who never click Export (plan 302 M4b).
import type { Workbook } from 'exceljs'

import { Recipe, RecipeStep } from '@models/recipe.model'
import { Product } from '@models/product.model'
import { KitchenStateService } from './kitchen-state.service'
import { ScalingService } from './scaling.service'
import { RecipeCostService } from './recipe-cost.service'
import { TranslationService } from './translation.service'
import {
  buildExportFileName,
  exportDateStr,
  heHeader,
  heUnit,
  roundExportNumber,
  type ExportPayload,
  type ExportSection
} from '../utils/export.util'
import {
  HOUSE_FIRST_DATA_ROW,
  addRecipeInfoSheet,
  addStyledTableSheet,
  buildRecipeSheetBlock,
  downloadWorkbook,
  heCategoryLabel
} from './excel-workbook.util'

/** One row of a recipe's shopping list: category already in Hebrew. */
interface RecipeShoppingRow {
  category: string
  name: string
  amount: number
  unit: string
  unitPrice: number
}

@Injectable({ providedIn: 'root' })
export class RecipeExportService {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly scaling_ = inject(ScalingService)
  private readonly recipeCost_ = inject(RecipeCostService)
  private readonly translation_ = inject(TranslationService)

  // ── Workbook builders (plan 471: testable, no download) ──────────────────────

  /** Recipe/dish info: single sheet (header, yield, ingredients, instructions, prep time). Plan 108. */
  async buildRecipeInfoWorkbook(recipe: Recipe, quantity: number): Promise<Workbook> {
    const wb = await this.newWorkbook_()
    this.addInfoSheet_(wb, recipe, quantity)
    return wb
  }

  /** Cooking steps: order, instruction, labor time, cooking time. */
  async buildCookingStepsWorkbook(recipe: Recipe, quantity: number): Promise<Workbook> {
    const steps = this.sortedSteps_(recipe)
    const wb = await this.newWorkbook_()
    const sheetName = this.t_('export_sheet_cooking_steps')
    addStyledTableSheet(wb, {
      name: sheetName,
      title: `${this.recipeName_(recipe)} — ${sheetName}`,
      meta: this.recipeMeta_(recipe, quantity),
      header: [
        heHeader('order'),
        heHeader('instruction'),
        this.t_('export_labor_time_min'),
        this.t_('export_cooking_time_sec')
      ],
      rows: steps.map((s) => [
        s.order,
        s.instruction ?? '',
        roundExportNumber(s.laborTimeMinutes ?? 0),
        roundExportNumber(s.cookingTimeSecs ?? 0)
      ]),
      widths: [8, 50, 12, 12]
    })
    return wb
  }

  /** Checklist for a single dish (prep/mise items, sorted by category then name). */
  async buildDishChecklistWorkbook(recipe: Recipe, quantity: number): Promise<Workbook> {
    const factor = this.scaling_.getScaleFactor(recipe, quantity)
    const sortedPrep = [...this.scaling_.getScaledPrepItems(recipe, factor)].sort((a, b) => {
      const catA = a.categoryName ?? ''
      const catB = b.categoryName ?? ''
      return catA.localeCompare(catB) || a.name.localeCompare(b.name)
    })
    const wb = await this.newWorkbook_()
    const sheetName = this.t_('export_sheet_checklist')
    addStyledTableSheet(wb, {
      name: sheetName,
      title: `${recipe.nameHebrew || heHeader('dish')} — ${sheetName}`,
      meta: this.recipeMeta_(recipe, quantity),
      header: [heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')],
      rows: sortedPrep.map((pr) => [
        pr.name,
        heCategoryLabel(this.translation_, pr.categoryName),
        roundExportNumber(pr.amount),
        heUnit(pr.unit)
      ]),
      widths: [28, 16, 12, 10]
    })
    return wb
  }

  /** Shopping list: ingredients grouped by Hebrew category; unit price, line total and a bold SUM total. */
  async buildShoppingListWorkbook(recipe: Recipe, quantity: number): Promise<Workbook> {
    const items = this.recipeShoppingRows_(recipe, quantity)
    const wb = await this.newWorkbook_()
    this.addShoppingSheet_(wb, recipe, quantity, items)
    return wb
  }

  /** Export all together (recipe/dish): sheet 1 = recipe info (Plan 108), sheet 2 = shopping list. */
  async buildAllTogetherRecipeWorkbook(recipe: Recipe, quantity: number): Promise<Workbook> {
    const items = this.recipeShoppingRows_(recipe, quantity)
    const wb = await this.newWorkbook_()
    this.addInfoSheet_(wb, recipe, quantity)
    this.addShoppingSheet_(wb, recipe, quantity, items)
    return wb
  }

  // ── Excel exports ────────────────────────────────────────────────────────────

  /** Filename: recipe-info_{recipeName}_{date}.xlsx */
  async exportRecipeInfo(recipe: Recipe, quantity: number): Promise<void> {
    const wb = await this.buildRecipeInfoWorkbook(recipe, quantity)
    await downloadWorkbook(wb, buildExportFileName('recipe-info', recipe.nameHebrew ?? 'recipe'))
  }

  /** Filename: cooking-steps_{recipeName}_{date}.xlsx */
  async exportCookingSteps(recipe: Recipe, quantity: number): Promise<void> {
    const wb = await this.buildCookingStepsWorkbook(recipe, quantity)
    await downloadWorkbook(wb, buildExportFileName('cooking-steps', recipe.nameHebrew ?? 'recipe'))
  }

  /** Filename: check-list_by-category_{dishName}_{date}.xlsx */
  async exportDishChecklist(recipe: Recipe, quantity: number): Promise<void> {
    const wb = await this.buildDishChecklistWorkbook(recipe, quantity)
    await downloadWorkbook(
      wb,
      buildExportFileName('check-list', recipe.nameHebrew ?? 'dish', { variant: 'by-category' })
    )
  }

  /** Filename: shopping-list_{name}_{date}.xlsx */
  async exportShoppingList(recipe: Recipe, quantity: number): Promise<void> {
    const wb = await this.buildShoppingListWorkbook(recipe, quantity)
    await downloadWorkbook(wb, buildExportFileName('shopping-list', recipe.nameHebrew ?? 'recipe'))
  }

  /** Filename: all_{recipeName}_{date}.xlsx */
  async exportAllTogetherRecipe(recipe: Recipe, quantity: number): Promise<void> {
    const wb = await this.buildAllTogetherRecipeWorkbook(recipe, quantity)
    await downloadWorkbook(wb, buildExportFileName('all', recipe.nameHebrew ?? 'recipe'))
  }

  // ── Preview payloads ─────────────────────────────────────────────────────────

  /** Build payload for recipe info preview (Plan 108: recipeSheet + ingredients with unit price). */
  getRecipeInfoPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const factor = this.scaling_.getScaleFactor(recipe, quantity)
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor)
    const scaledRecipe = this.scaledRecipe_(recipe, factor)
    const ingredientRows: (string | number)[][] = scaledIngredients.map((row, i) => {
      const ing = scaledRecipe.ingredients[i]
      const cost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0
      const unitPrice = row.amount > 0 ? cost / row.amount : 0
      return [row.name, roundExportNumber(row.amount), heUnit(row.unit), roundExportNumber(unitPrice)]
    })

    return {
      title: `${this.recipeName_(recipe)} — ${heHeader('info')}`,
      subtitle: `× ${quantity} ${heUnit(recipe.yieldUnit ?? 'unit')}`,
      exportedAt: new Date().toISOString(),
      recipeSheet: buildRecipeSheetBlock(recipe, quantity),
      recipeSheetLabels: this.recipeSheetLabels_(),
      sections: [
        {
          title: heHeader('ingredients_header'),
          headerRow: [heHeader('ingredients_header'), heHeader('amount'), heHeader('unit'), heHeader('unit_price')],
          rows: ingredientRows
        }
      ]
    }
  }

  /**
   * The whole recipe for the kitchen wall (plan 471): name, date, yield, ingredients without prices,
   * numbered steps with their minutes, and the total preparation time. Printed from the export preview.
   */
  getFullRecipePreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const factor = this.scaling_.getScaleFactor(recipe, quantity)
    const ingredientRows: (string | number)[][] = this.scaling_
      .getScaledIngredients(recipe, factor)
      .map((row) => [row.name, roundExportNumber(row.amount), heUnit(row.unit)])
    const steps = this.sortedSteps_(recipe).filter((s) => (s.instruction ?? '').trim())
    const stepRows: (string | number)[][] = steps.map((s, i) => [
      `${i + 1}.`,
      (s.instruction ?? '').trim(),
      s.laborTimeMinutes ? roundExportNumber(s.laborTimeMinutes) : ''
    ])
    const sheet = buildRecipeSheetBlock(recipe, quantity)

    const sections: ExportSection[] = [
      {
        title: heHeader('ingredients_header'),
        headerRow: [heHeader('ingredients_header'), heHeader('amount'), heHeader('unit')],
        rows: ingredientRows
      }
    ]
    if (stepRows.length) {
      sections.push({
        title: heHeader('preparation_instructions'),
        headerRow: [heHeader('row_num'), heHeader('instruction'), heHeader('time_min')],
        rows: stepRows
      })
    }

    return {
      title: `${this.recipeName_(recipe)} — ${this.t_('export_full_recipe')}`,
      subtitle: `× ${quantity} ${heUnit(recipe.yieldUnit ?? 'unit')}`,
      exportedAt: new Date().toISOString(),
      recipeSheet: { ...sheet, preparationInstructions: [] },
      recipeSheetLabels: this.recipeSheetLabels_(),
      recipeSheetStepsAsSection: true,
      sections,
      summary: [{ label: this.t_('export_total_prep_time'), value: roundExportNumber(sheet.preparationTime) }]
    }
  }

  /** Build payload for cooking steps preview. */
  getCookingStepsPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const rows: (string | number)[][] = this.sortedSteps_(recipe).map((s) => [
      s.order,
      s.instruction ?? '',
      roundExportNumber(s.laborTimeMinutes ?? 0)
    ])
    return {
      title: `${this.recipeName_(recipe)} — ${heHeader('steps')}`,
      subtitle: `${heHeader('yield')}: ${quantity} ${heUnit(recipe.yieldUnit ?? 'unit')}`,
      exportedAt: new Date().toISOString(),
      sections: [{ headerRow: [heHeader('order'), heHeader('instruction'), heHeader('time_min')], rows }]
    }
  }

  /** Build payload for single-dish checklist preview. */
  getDishChecklistPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const factor = this.scaling_.getScaleFactor(recipe, quantity)
    const prepRows = this.scaling_.getScaledPrepItems(recipe, factor)
    const sortedPrep = [...prepRows].sort((a, b) => {
      const catA = a.categoryName ?? ''
      const catB = b.categoryName ?? ''
      return catA.localeCompare(catB) || a.name.localeCompare(b.name)
    })
    const rows: (string | number)[][] = sortedPrep.map((pr) => [
      pr.name,
      heCategoryLabel(this.translation_, pr.categoryName),
      roundExportNumber(pr.amount),
      heUnit(pr.unit)
    ])
    return {
      title: `${recipe.nameHebrew || heHeader('dish')} — ${heHeader('checklist')}`,
      subtitle: `${heHeader('portions')}: ${quantity}`,
      exportedAt: new Date().toISOString(),
      sections: [
        { headerRow: [heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')], rows }
      ]
    }
  }

  /** Build payload for shopping list preview (the same rows the Excel writes, without prices). */
  getShoppingListPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const rows: (string | number)[][] = this.recipeShoppingRows_(recipe, quantity).map((it) => [
      it.category,
      it.name,
      roundExportNumber(it.amount),
      heUnit(it.unit)
    ])
    return {
      title: `${this.recipeName_(recipe)} — ${heHeader('shopping_list')}`,
      subtitle: `× ${quantity} ${heUnit(recipe.yieldUnit ?? 'unit')}`,
      exportedAt: new Date().toISOString(),
      sections: [
        { headerRow: [heHeader('category'), heHeader('ingredient'), heHeader('amount'), heHeader('unit')], rows }
      ]
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async newWorkbook_(): Promise<Workbook> {
    const ExcelJS = await import('exceljs')
    return new ExcelJS.Workbook()
  }

  private t_(key: string): string {
    return this.translation_.translate(key)
  }

  private recipeName_(recipe: Recipe): string {
    return recipe.nameHebrew || this.t_('recipe')
  }

  /** Meta line of every recipe sheet: yield and date. */
  private recipeMeta_(recipe: Recipe, quantity: number): string {
    return [`${heHeader('yield')}: ${quantity} ${heUnit(recipe.yieldUnit ?? 'unit')}`, exportDateStr()].join(' · ')
  }

  private sortedSteps_(recipe: Recipe): RecipeStep[] {
    return [...((recipe.steps ?? []) as RecipeStep[])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  private scaledRecipe_(recipe: Recipe, factor: number): Recipe {
    return {
      ...recipe,
      ingredients: (recipe.ingredients ?? []).map((ing) => ({ ...ing, amount: (ing.amount ?? 0) * factor }))
    }
  }

  private recipeSheetLabels_(): NonNullable<ExportPayload['recipeSheetLabels']> {
    return {
      date: heHeader('date'),
      recipeName: heHeader('recipe_name'),
      amount: heHeader('amount'),
      unit: heHeader('unit'),
      preparationInstructions: heHeader('preparation_instructions'),
      preparationTime: heHeader('preparation_time'),
      ingredients: heHeader('ingredients_header')
    }
  }

  private addInfoSheet_(wb: Workbook, recipe: Recipe, quantity: number): void {
    addRecipeInfoSheet(
      wb,
      recipe,
      quantity,
      { name: heHeader('info'), title: this.recipeName_(recipe), meta: this.recipeMeta_(recipe, quantity) },
      { scaling: this.scaling_, recipeCost: this.recipeCost_ }
    )
  }

  private addShoppingSheet_(wb: Workbook, recipe: Recipe, quantity: number, items: RecipeShoppingRow[]): void {
    const lastDataRow = HOUSE_FIRST_DATA_ROW + items.length - 1
    const sheetName = this.t_('export_shopping_list')
    addStyledTableSheet(wb, {
      name: sheetName,
      title: `${this.recipeName_(recipe)} — ${sheetName}`,
      meta: this.recipeMeta_(recipe, quantity),
      header: [
        heHeader('category'),
        heHeader('ingredient'),
        heHeader('amount'),
        heHeader('unit'),
        heHeader('unit_price'),
        heHeader('line_total')
      ],
      rows: items.map((it, i) => {
        const r = HOUSE_FIRST_DATA_ROW + i
        return [
          it.category,
          it.name,
          roundExportNumber(it.amount),
          heUnit(it.unit),
          roundExportNumber(it.unitPrice),
          { formula: `C${r}*E${r}` }
        ]
      }),
      // No rows → no total: a SUM over an empty range would point at the total cell itself.
      totalRow: items.length
        ? ['', this.t_('shopping_total'), '', '', '', { formula: `SUM(F${HOUSE_FIRST_DATA_ROW}:F${lastDataRow})` }]
        : undefined,
      widths: [18, 28, 12, 10, 12, 12]
    })
  }

  /**
   * The one shopping-list builder of a recipe (plan 471): ingredients grouped by Hebrew category
   * (products by their first category, else "general"; preparations under "preps"), groups sorted by label.
   */
  private recipeShoppingRows_(recipe: Recipe, quantity: number): RecipeShoppingRow[] {
    const factor = this.scaling_.getScaleFactor(recipe, quantity)
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor)
    const scaledRecipe = this.scaledRecipe_(recipe, factor)
    const products = this.kitchenState_.products_()

    const byCategory = new Map<string, RecipeShoppingRow[]>()
    scaledIngredients.forEach((row, i) => {
      const productCategory =
        row.type === 'product'
          ? (products.find((p) => p._id === row.referenceId) as Product | undefined)?.categories?.[0]
          : undefined
      const category =
        row.type === 'product'
          ? productCategory
            ? heCategoryLabel(this.translation_, productCategory)
            : this.t_('general_group')
          : this.t_('export_category_preps')
      const ing = scaledRecipe.ingredients[i]
      const cost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0
      const unitPrice = row.amount > 0 ? cost / row.amount : 0
      const list = byCategory.get(category) ?? []
      list.push({ category, name: row.name, amount: row.amount, unit: row.unit, unitPrice })
      byCategory.set(category, list)
    })

    return Array.from(byCategory.keys())
      .sort((a, b) => a.localeCompare(b, 'he'))
      .flatMap((cat) => byCategory.get(cat) ?? [])
  }
}
