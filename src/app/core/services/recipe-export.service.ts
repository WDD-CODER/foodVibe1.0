/**
 * Recipe/dish export domain service.
 * Handles all recipe-scoped Excel exports and preview payloads.
 * Plan: refactor/split-export-service
 */

import { Injectable, inject } from '@angular/core'
import { Workbook } from 'exceljs'

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
  type ExportSection,
} from '../utils/export.util'
import {
  buildRecipeSheetBlock,
  downloadWorkbook,
  fillRecipeSheetWorksheet,
  heCategoryLabel,
  styleDataRow,
  styleHeaderRow,
} from './excel-workbook.util'

@Injectable({ providedIn: 'root' })
export class RecipeExportService {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly scaling_ = inject(ScalingService)
  private readonly recipeCost_ = inject(RecipeCostService)
  private readonly translation_ = inject(TranslationService)

  // ── Excel exports ────────────────────────────────────────────────────────────

  /**
   * Export recipe/dish info to Excel: single sheet (header, yield, ingredients, instructions, prep time). Plan 108.
   */
  async exportRecipeInfo(recipe: Recipe, quantity: number): Promise<void> {
    const wb = new Workbook()
    const ws = wb.addWorksheet(heHeader('info'), { views: [{ rightToLeft: true }] })
    fillRecipeSheetWorksheet(ws, recipe, quantity, { scaling: this.scaling_, recipeCost: this.recipeCost_ })
    const fileName = buildExportFileName('recipe-info', recipe.name_hebrew ?? 'recipe')
    await downloadWorkbook(wb, fileName)
  }

  /**
   * Export cooking steps: order, instruction, time; item info + export date.
   * Filename: cooking-steps_{recipeName}_{date}.xlsx
   */
  async exportCookingSteps(recipe: Recipe, quantity: number): Promise<void> {
    const steps = (recipe.steps_ ?? []) as RecipeStep[]
    const wb = new Workbook()
    const ws = wb.addWorksheet('Cooking steps', { views: [{ rightToLeft: true }] })
    ws.addRow([heHeader('exported_at'), exportDateStr(), '', recipe.name_hebrew ?? '', `${heHeader('yield')}: ${quantity} ${heUnit(recipe.yield_unit_ ?? 'unit')}`])
    styleHeaderRow(ws, 1)
    ws.addRow([heHeader('order'), heHeader('instruction'), heHeader('time_min')])
    styleHeaderRow(ws, 2)
    let rowNum = 3
    steps.forEach(s => {
      ws.addRow([s.order_, s.instruction_ ?? '', roundExportNumber(s.labor_time_minutes_ ?? 0)])
      styleDataRow(ws, rowNum++)
    })
    ws.getColumn(1).width = 8
    ws.getColumn(2).width = 50
    ws.getColumn(3).width = 12
    const fileName = buildExportFileName('cooking-steps', recipe.name_hebrew ?? 'recipe')
    await downloadWorkbook(wb, fileName)
  }

  /**
   * Export checklist for a single dish (prep/mise items, grouped by category then name).
   * Filename: check-list_by-category_{dishName}_{date}.xlsx
   */
  async exportDishChecklist(recipe: Recipe, quantity: number): Promise<void> {
    const factor = this.scaling_.getScaleFactor(recipe, quantity)
    const prepRows = this.scaling_.getScaledPrepItems(recipe, factor)
    const sortedPrep = [...prepRows].sort((a, b) => {
      const catA = a.category_name ?? ''
      const catB = b.category_name ?? ''
      return catA.localeCompare(catB) || a.name.localeCompare(b.name)
    })
    const wb = new Workbook()
    const ws = wb.addWorksheet('Checklist', { views: [{ rightToLeft: true }] })
    ws.addRow([recipe.name_hebrew ?? heHeader('dish'), `${heHeader('portions')}: ${quantity}`, `${heHeader('yield')}: ${recipe.yield_amount_ ?? 1} ${heUnit(recipe.yield_unit_ ?? 'unit')}`, `${heHeader('scale')}: x${roundExportNumber(factor)}`])
    styleHeaderRow(ws, 1)
    ws.addRow([heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')])
    styleHeaderRow(ws, 2)
    let rowNum = 3
    sortedPrep.forEach(pr => {
      ws.addRow([pr.name, heCategoryLabel(this.translation_, pr.category_name), roundExportNumber(pr.amount), heUnit(pr.unit)])
      styleDataRow(ws, rowNum++)
    })
    ws.getColumn(1).width = 28
    ws.getColumn(2).width = 14
    ws.getColumn(3).width = 12
    ws.getColumn(4).width = 10
    const fileName = buildExportFileName('check-list', recipe.name_hebrew ?? 'dish', { variant: 'by-category' })
    await downloadWorkbook(wb, fileName)
  }

  /**
   * Export shopping list: ingredients grouped by category; unit price and line total.
   * Filename: shopping-list_{name}_{date}.xlsx
   */
  async exportShoppingList(recipe: Recipe, quantity: number): Promise<void> {
    const factor = this.scaling_.getScaleFactor(recipe, quantity)
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor)
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients_: (recipe.ingredients_ ?? []).map(ing => ({
        ...ing,
        amount_: (ing.amount_ ?? 0) * factor,
      })),
    }
    const products = this.kitchenState_.products_()

    const categoryToRows = new Map<string, { name: string; amount: number; unit: string; unitPrice: number }[]>()
    scaledIngredients.forEach((row, i) => {
      const category =
        row.type === 'product'
          ? (products.find(p => p._id === row.referenceId) as Product | undefined)?.categories_?.[0] ?? 'כללי'
          : 'הכנות'
      const ing = scaledRecipe.ingredients_[i]
      const cost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0
      const unitPrice = row.amount > 0 ? cost / row.amount : 0
      const arr = categoryToRows.get(category) ?? []
      arr.push({ name: row.name, amount: row.amount, unit: row.unit, unitPrice })
      categoryToRows.set(category, arr)
    })

    const wb = new Workbook()
    const ws = wb.addWorksheet('Shopping list', { views: [{ rightToLeft: true }] })
    ws.addRow([heHeader('category'), heHeader('ingredient'), heHeader('amount'), heHeader('unit'), heHeader('unit_price'), heHeader('line_total')])
    styleHeaderRow(ws, 1)
    let rowNum = 2
    const sortedCategories = Array.from(categoryToRows.keys()).sort()
    for (const cat of sortedCategories) {
      const items = categoryToRows.get(cat) ?? []
      items.forEach(it => {
        const row = ws.getRow(rowNum)
        row.getCell(1).value = cat
        row.getCell(2).value = it.name
        row.getCell(3).value = roundExportNumber(it.amount)
        row.getCell(4).value = heUnit(it.unit)
        row.getCell(5).value = roundExportNumber(it.unitPrice)
        row.getCell(6).value = { formula: `C${rowNum}*E${rowNum}` }
        styleDataRow(ws, rowNum++)
      })
    }
    ws.getColumn(1).width = 18
    ws.getColumn(2).width = 28
    ws.getColumn(3).width = 12
    ws.getColumn(4).width = 10
    ws.getColumn(5).width = 12
    ws.getColumn(6).width = 12

    const fileName = buildExportFileName('shopping-list', recipe.name_hebrew ?? 'recipe')
    await downloadWorkbook(wb, fileName)
  }

  /**
   * Export all together (recipe/dish): sheet 1 = recipe sheet (Plan 108), sheet 2 = shopping list.
   * Filename: all_{recipeName}_{date}.xlsx
   */
  async exportAllTogetherRecipe(recipe: Recipe, quantity: number): Promise<void> {
    const factor = this.scaling_.getScaleFactor(recipe, quantity)
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor)
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients_: (recipe.ingredients_ ?? []).map(ing => ({ ...ing, amount_: (ing.amount_ ?? 0) * factor })),
    }

    const wb = new Workbook()
    const ws1 = wb.addWorksheet(heHeader('info'), { views: [{ rightToLeft: true }] })
    fillRecipeSheetWorksheet(ws1, recipe, quantity, { scaling: this.scaling_, recipeCost: this.recipeCost_ })

    const products = this.kitchenState_.products_()
    const categoryToRows = new Map<string, { name: string; amount: number; unit: string; unitPrice: number }[]>()
    scaledIngredients.forEach((row, i) => {
      const category =
        row.type === 'product'
          ? (products.find(p => p._id === row.referenceId) as Product | undefined)?.categories_?.[0] ?? 'כללי'
          : 'הכנות'
      const ing = scaledRecipe.ingredients_[i]
      const cost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0
      const unitPrice = row.amount > 0 ? cost / row.amount : 0
      const arr = categoryToRows.get(category) ?? []
      arr.push({ name: row.name, amount: row.amount, unit: row.unit, unitPrice })
      categoryToRows.set(category, arr)
    })

    const ws2 = wb.addWorksheet('Shopping list', { views: [{ rightToLeft: true }] })
    ws2.addRow([heHeader('category'), heHeader('ingredient'), heHeader('amount'), heHeader('unit'), heHeader('unit_price'), heHeader('line_total')])
    styleHeaderRow(ws2, 1)
    let rowNum2 = 2
    const sortedCategories = Array.from(categoryToRows.keys()).sort()
    for (const cat of sortedCategories) {
      (categoryToRows.get(cat) ?? []).forEach(it => {
        const row = ws2.getRow(rowNum2)
        row.getCell(1).value = cat
        row.getCell(2).value = it.name
        row.getCell(3).value = roundExportNumber(it.amount)
        row.getCell(4).value = heUnit(it.unit)
        row.getCell(5).value = roundExportNumber(it.unitPrice)
        row.getCell(6).value = { formula: `C${rowNum2}*E${rowNum2}` }
        styleDataRow(ws2, rowNum2++)
      })
    }
    ws2.getColumn(1).width = 18
    ws2.getColumn(2).width = 28
    ws2.getColumn(3).width = 12
    ws2.getColumn(4).width = 10
    ws2.getColumn(5).width = 12
    ws2.getColumn(6).width = 12

    const fileName = buildExportFileName('all', recipe.name_hebrew ?? 'recipe')
    await downloadWorkbook(wb, fileName)
  }

  // ── Preview payloads ─────────────────────────────────────────────────────────

  /** Build payload for recipe info preview (Plan 108: recipeSheet + ingredients with unit price). */
  getRecipeInfoPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const factor = this.scaling_.getScaleFactor(recipe, quantity)
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor)
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients_: (recipe.ingredients_ ?? []).map(ing => ({
        ...ing,
        amount_: (ing.amount_ ?? 0) * factor,
      })),
    }
    const recipeSheet = buildRecipeSheetBlock(recipe, quantity)
    const ingredientRows: (string | number)[][] = scaledIngredients.map((row, i) => {
      const ing = scaledRecipe.ingredients_[i]
      const cost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0
      const unitPrice = row.amount > 0 ? cost / row.amount : 0
      return [row.name, roundExportNumber(row.amount), heUnit(row.unit), roundExportNumber(unitPrice)]
    })

    return {
      title: `${recipe.name_hebrew ?? 'Recipe'} — ${heHeader('info')}`,
      subtitle: `× ${quantity} ${heUnit(recipe.yield_unit_ ?? 'unit')}`,
      exportedAt: new Date().toISOString(),
      recipeSheet,
      recipeSheetLabels: {
        date: heHeader('date'),
        recipeName: heHeader('recipe_name'),
        amount: heHeader('amount'),
        unit: heHeader('unit'),
        preparationInstructions: heHeader('preparation_instructions'),
        preparationTime: heHeader('preparation_time'),
        ingredients: heHeader('ingredients_header'),
      },
      sections: [
        {
          title: heHeader('ingredients_header'),
          headerRow: [heHeader('ingredients_header'), heHeader('amount'), heHeader('unit'), heHeader('unit_price')],
          rows: ingredientRows,
        },
      ],
    }
  }

  /** Build payload for cooking steps preview. */
  getCookingStepsPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const steps = (recipe.steps_ ?? []) as RecipeStep[]
    const rows: (string | number)[][] = steps.map(s => [
      s.order_,
      s.instruction_ ?? '',
      roundExportNumber(s.labor_time_minutes_ ?? 0),
    ])
    return {
      title: `${recipe.name_hebrew ?? 'Recipe'} — Cooking steps`,
      subtitle: `Yield: ${quantity} ${recipe.yield_unit_ ?? 'unit'}`,
      exportedAt: new Date().toISOString(),
      sections: [{ headerRow: ['Order', 'Instruction', 'Time (min)'], rows }],
    }
  }

  /** Build payload for single-dish checklist preview. */
  getDishChecklistPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const factor = this.scaling_.getScaleFactor(recipe, quantity)
    const prepRows = this.scaling_.getScaledPrepItems(recipe, factor)
    const sortedPrep = [...prepRows].sort((a, b) => {
      const catA = a.category_name ?? ''
      const catB = b.category_name ?? ''
      return catA.localeCompare(catB) || a.name.localeCompare(b.name)
    })
    const rows: (string | number)[][] = sortedPrep.map(pr => [
      pr.name,
      heCategoryLabel(this.translation_, pr.category_name),
      roundExportNumber(pr.amount),
      heUnit(pr.unit),
    ])
    return {
      title: `${recipe.name_hebrew ?? heHeader('dish')} — ${heHeader('checklist')}`,
      subtitle: `${heHeader('portions')}: ${quantity}`,
      exportedAt: new Date().toISOString(),
      sections: [
        { headerRow: [heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')], rows },
      ],
    }
  }

  /** Build payload for shopping list preview. */
  getShoppingListPreviewPayload(recipe: Recipe, quantity: number): ExportPayload {
    const factor = this.scaling_.getScaleFactor(recipe, quantity)
    const scaledIngredients = this.scaling_.getScaledIngredients(recipe, factor)
    const products = this.kitchenState_.products_()

    const categoryToRows = new Map<string, { name: string; amount: number; unit: string }[]>()
    scaledIngredients.forEach(row => {
      const category =
        row.type === 'product'
          ? (products.find(p => p._id === row.referenceId) as Product | undefined)?.categories_?.[0] ?? 'כללי'
          : 'הכנות'
      const arr = categoryToRows.get(category) ?? []
      arr.push({ name: row.name, amount: row.amount, unit: row.unit })
      categoryToRows.set(category, arr)
    })

    const sortedCategories = Array.from(categoryToRows.keys()).sort()
    const rows: (string | number)[][] = []
    for (const cat of sortedCategories) {
      const items = categoryToRows.get(cat) ?? []
      items.forEach(it => rows.push([cat, it.name, roundExportNumber(it.amount), heUnit(it.unit)]))
    }

    const sections: ExportSection[] = [
      {
        headerRow: [heHeader('category'), heHeader('ingredient'), heHeader('amount'), heHeader('unit')],
        rows,
      },
    ]

    return {
      title: `${recipe.name_hebrew ?? 'Recipe'} — ${heHeader('shopping_list')}`,
      subtitle: `× ${quantity} ${heUnit(recipe.yield_unit_ ?? 'unit')}`,
      exportedAt: new Date().toISOString(),
      sections,
    }
  }
}
