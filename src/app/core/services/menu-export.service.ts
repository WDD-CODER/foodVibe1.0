/**
 * Menu export domain service.
 * Handles all menu-scoped Excel exports and preview payloads.
 * Plan: refactor/split-export-service
 */

import { Injectable, inject } from '@angular/core'
import { Workbook } from 'exceljs'

import { Recipe } from '@models/recipe.model'
import { MenuEvent, MenuSection, MenuItemSelection, ServingType } from '@models/menu-event.model'
import { Product } from '@models/product.model'
import { KitchenStateService } from './kitchen-state.service'
import { MenuIntelligenceService } from './menu-intelligence.service'
import { ScalingService } from './scaling.service'
import type { ScaledPrepRow } from './scaling.service'
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
  downloadWorkbook,
  heCategoryLabel,
  styleDataRow,
  styleExcelBlockBorder,
  styleExcelBlankRow,
  styleExcelColumnHeader,
  styleExcelDataRowBorders,
  styleExcelSeparator,
  styleExcelSubtitle,
  styleExcelTitle,
  styleHeaderRow,
} from './excel-workbook.util'

@Injectable({ providedIn: 'root' })
export class MenuExportService {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly menuIntelligence_ = inject(MenuIntelligenceService)
  private readonly scaling_ = inject(ScalingService)
  private readonly recipeCost_ = inject(RecipeCostService)
  private readonly translation_ = inject(TranslationService)

  // ── Excel exports ────────────────────────────────────────────────────────────

  /**
   * Export menu as Excel: cover sheet + one sheet per section.
   * Filename: menu-info_{menuName}.xlsx (no date for menu).
   */
  async exportMenuInfo(menu: MenuEvent, _recipes: Recipe[]): Promise<void> {
    const wb = new Workbook()

    const coverWs = wb.addWorksheet('Menu info')
    const coverData: (string | number)[][] = [
      [heHeader('menu_name'), menu.name_ ?? ''],
      [heHeader('event_type'), menu.event_type_ ?? ''],
      [heHeader('date'), menu.event_date_ ?? ''],
      [heHeader('guest_count'), menu.guest_count_ ?? 0],
      [heHeader('pieces_per_person'), menu.pieces_per_person_ ?? ''],
    ]
    coverData.forEach(row => coverWs.addRow(row))
    coverWs.getColumn(1).width = 18
    coverWs.getColumn(2).width = 24

    const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0))
    const recipeMap = new Map(_recipes.map(r => [r._id, r]))

    sections.forEach((section: MenuSection) => {
      const sheetName = (section.name_ ?? `Section_${section._id}`).slice(0, 31)
      const ws = wb.addWorksheet(sheetName)
      ws.addRow([heHeader('dish_name'), heHeader('portions'), heHeader('take_rate'), heHeader('sell_price')])
      styleHeaderRow(ws, 1)
      let rowNum = 2
      ;(section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_)
        const name = recipe?.name_hebrew ?? item.recipe_id_
        ws.addRow([
          name,
          roundExportNumber(item.derived_portions_ ?? 0),
          roundExportNumber(item.predicted_take_rate_ ?? 0),
          item.sell_price_ !== undefined && item.sell_price_ !== null
            ? roundExportNumber(Number(item.sell_price_))
            : '',
        ])
        styleDataRow(ws, rowNum++)
      })
      ws.getColumn(1).width = 32
      ws.getColumn(2).width = 12
      ws.getColumn(3).width = 12
      ws.getColumn(4).width = 12
    })

    const fileName = buildExportFileName('menu-info', menu.name_ ?? 'menu', { includeDate: false })
    await downloadWorkbook(wb, fileName)
  }

  /**
   * Export menu shopping list: all dishes' ingredients scaled by derived_portions_, grouped by category.
   * Filename: shopping-list_{menuName}.xlsx (no date for menu).
   */
  async exportMenuShoppingList(menu: MenuEvent, recipes: Recipe[], products: Product[]): Promise<void> {
    const recipeMap = new Map(recipes.map(r => [r._id, r]))
    const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string; cost: number }[]>()

    const addRow = (category: string, name: string, amount: number, unit: string, lineCost: number): void => {
      const arr = categoryToAggregate.get(category) ?? []
      const existing = arr.find(x => x.name === name && x.unit === unit)
      if (existing) {
        existing.amount += amount
        existing.cost += lineCost
      } else {
        arr.push({ name, amount, unit, cost: lineCost })
      }
      categoryToAggregate.set(category, arr)
    }

    ;(menu.sections_ ?? []).forEach((section: MenuSection) => {
      ;(section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_)
        if (!recipe?.ingredients_?.length) return
        const portions = item.derived_portions_ ?? 0
        const yieldAmount = recipe.yield_amount_ || 1
        const factor = yieldAmount > 0 ? portions / yieldAmount : 0
        const scaled = this.scaling_.getScaledIngredients(recipe, factor)
        const scaledRecipe: Recipe = {
          ...recipe,
          ingredients_: (recipe.ingredients_ ?? []).map(ing => ({
            ...ing,
            amount_: (ing.amount_ ?? 0) * factor,
          })),
        }
        scaled.forEach((row, i) => {
          const category =
            row.type === 'product'
              ? (products.find(p => p._id === row.referenceId)?.categories_?.[0] ?? 'כללי')
              : 'הכנות'
          const ing = scaledRecipe.ingredients_[i]
          const lineCost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0
          addRow(category, row.name, row.amount, row.unit, lineCost)
        })
      })
    })

    const wb = new Workbook()
    const ws = wb.addWorksheet('Shopping list', { views: [{ rightToLeft: true }] })
    ws.addRow(['Category', 'Ingredient', 'Amount', 'Unit', 'Unit price', 'Line total'])
    styleHeaderRow(ws, 1)
    let rowNum = 2
    const sortedCategories = Array.from(categoryToAggregate.keys()).sort()
    for (const cat of sortedCategories) {
      ;(categoryToAggregate.get(cat) ?? []).forEach(it => {
        const unitPrice = it.amount > 0 ? it.cost / it.amount : 0
        const row = ws.getRow(rowNum)
        row.getCell(1).value = cat
        row.getCell(2).value = it.name
        row.getCell(3).value = roundExportNumber(it.amount)
        row.getCell(4).value = heUnit(it.unit)
        row.getCell(5).value = roundExportNumber(unitPrice)
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

    const fileName = buildExportFileName('shopping-list', menu.name_ ?? 'menu', { includeDate: false })
    await downloadWorkbook(wb, fileName)
  }

  /**
   * Export menu checklist (mise en place / prep items). Mode: by_dish | by_category | by_station.
   * When by_dish: one sheet per dish. When by_category or by_station: one Accumulated sheet only.
   * Filename: check-list_{by-dish|by-category|by-station}_{menuName}.xlsx (no date for menu).
   */
  async exportChecklist(
    menu: MenuEvent,
    recipes: Recipe[],
    mode: 'by_dish' | 'by_category' | 'by_station'
  ): Promise<void> {
    const recipeMap = new Map(recipes.map(r => [r._id, r]))
    const wb = new Workbook()

    if (mode === 'by_dish') {
      const ws = wb.addWorksheet('Checklist', { views: [{ rightToLeft: true }] })
      const numCols = 4
      let rowNum = 1
      const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0))
      for (const section of sections) {
        for (const item of section.items_ ?? []) {
          const recipe = recipeMap.get(item.recipe_id_)
          if (!recipe) continue
          const portions = item.derived_portions_ ?? 0
          const yieldAmount = recipe.yield_amount_ || 1
          const factor = yieldAmount > 0 ? portions / yieldAmount : 0
          const prepRows: ScaledPrepRow[] = this.scaling_.getScaledPrepItems(recipe, factor)
          if (prepRows.length === 0) continue
          const sortedPrep = [...prepRows].sort((a, b) => {
            const catA = a.category_name ?? ''
            const catB = b.category_name ?? ''
            return catA.localeCompare(catB) || a.name.localeCompare(b.name)
          })

          ws.addRow([recipe.name_hebrew ?? item.recipe_id_])
          styleExcelTitle(ws, rowNum++, numCols)
          ws.addRow([`${heHeader('portions')}: ${portions}`])
          styleExcelSubtitle(ws, rowNum++, numCols)
          ws.addRow([heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')])
          styleExcelColumnHeader(ws, rowNum++, numCols)
          sortedPrep.forEach(pr => {
            ws.addRow([pr.name, heCategoryLabel(this.translation_, pr.category_name), roundExportNumber(pr.amount), heUnit(pr.unit)])
            styleExcelDataRowBorders(ws, rowNum++, numCols)
          })
          ws.addRow([])
          styleExcelBlankRow(ws, rowNum++)
        }
      }
      ws.getColumn(1).width = 28
      ws.getColumn(2).width = 14
      ws.getColumn(3).width = 12
      ws.getColumn(4).width = 10
    } else {
      const isByStation = mode === 'by_station'
      const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string; categoryName?: string }[]>()

      const addPrep = (key: string, name: string, amount: number, unit: string, categoryName?: string): void => {
        const arr = categoryToAggregate.get(key) ?? []
        const existing =
          isByStation && categoryName !== undefined
            ? arr.find(x => x.name === name && x.unit === unit && (x.categoryName ?? '') === categoryName)
            : arr.find(x => x.name === name && x.unit === unit)
        if (existing) existing.amount += amount
        else
          arr.push(
            isByStation && categoryName !== undefined ? { name, amount, unit, categoryName } : { name, amount, unit }
          )
        categoryToAggregate.set(key, arr)
      }

      ;(menu.sections_ ?? []).forEach((section: MenuSection) => {
        ;(section.items_ ?? []).forEach((item: MenuItemSelection) => {
          const recipe = recipeMap.get(item.recipe_id_)
          if (!recipe) return
          const portions = item.derived_portions_ ?? 0
          const yieldAmount = recipe.yield_amount_ || 1
          const factor = yieldAmount > 0 ? portions / yieldAmount : 0
          const prepRows = this.scaling_.getScaledPrepItems(recipe, factor)
          prepRows.forEach(pr => {
            const key = isByStation ? (recipe.default_station_ ?? 'כללי') : (pr.category_name ?? 'כללי')
            addPrep(key, pr.name, pr.amount, pr.unit, isByStation ? (pr.category_name ?? '') : undefined)
          })
        })
      })

      const sortedGroups = Array.from(categoryToAggregate.keys()).sort()
      const numCols = isByStation ? 4 : 3
      const sectionTitlePrefix = isByStation ? heHeader('station') : heHeader('category')

      const wsAcc = wb.addWorksheet('Accumulated', { views: [{ rightToLeft: true }] })
      let rowNumAcc = 1
      for (const cat of sortedGroups) {
        const blockStartRow = rowNumAcc
        const titleRow = isByStation
          ? [`${sectionTitlePrefix}: ${cat}`, '', '', '']
          : [`${sectionTitlePrefix}: ${cat}`, '', '']
        wsAcc.addRow(titleRow)
        styleExcelTitle(wsAcc, rowNumAcc, numCols, 'center')
        rowNumAcc++
        const headerRow = isByStation
          ? [heHeader('category'), heHeader('prep_item'), heHeader('quantity'), heHeader('unit')]
          : [heHeader('prep_item'), heHeader('quantity'), heHeader('unit')]
        wsAcc.addRow(headerRow)
        styleExcelColumnHeader(wsAcc, rowNumAcc, numCols)
        rowNumAcc++
        let items = categoryToAggregate.get(cat) ?? []
        items = items.slice().sort((a, b) => {
          if (isByStation) return (a.categoryName ?? '').localeCompare(b.categoryName ?? '', 'he')
          return (a.name ?? '').localeCompare(b.name ?? '', 'he')
        })
        items.forEach(it => {
          const dataRow = isByStation
            ? [heCategoryLabel(this.translation_, it.categoryName), it.name, roundExportNumber(it.amount), heUnit(it.unit)]
            : [it.name, roundExportNumber(it.amount), heUnit(it.unit)]
          wsAcc.addRow(dataRow)
          styleExcelDataRowBorders(wsAcc, rowNumAcc, numCols)
          rowNumAcc++
        })
        styleExcelBlockBorder(wsAcc, blockStartRow, rowNumAcc - 1, numCols)
      }
      wsAcc.getColumn(1).width = isByStation ? 20 : 28
      wsAcc.getColumn(2).width = isByStation ? 28 : 12
      wsAcc.getColumn(3).width = isByStation ? 12 : 10
      if (isByStation) wsAcc.getColumn(4).width = 10
    }

    const modeVariant = mode === 'by_dish' ? 'by-dish' : mode === 'by_station' ? 'by-station' : 'by-category'
    const fileName = buildExportFileName('check-list', menu.name_ ?? 'menu', { includeDate: false, variant: modeVariant })
    await downloadWorkbook(wb, fileName)
  }

  /**
   * Export all together (menu): menu info + checklist (default by_category) + shopping list.
   * Filename: all_{checklistMode}_{menuName}.xlsx
   */
  async exportAllTogetherMenu(
    menu: MenuEvent,
    recipes: Recipe[],
    products: Product[],
    checklistMode: 'by_dish' | 'by_category' | 'by_station' = 'by_category'
  ): Promise<void> {
    const wb = new Workbook()
    const recipeMap = new Map(recipes.map(r => [r._id, r]))

    const coverWs = wb.addWorksheet('Menu info', { views: [{ rightToLeft: true }] })
    coverWs.addRow([heHeader('exported_at'), exportDateStr()])
    coverWs.addRow([heHeader('menu_name'), menu.name_ ?? ''])
    coverWs.addRow([heHeader('event_type'), menu.event_type_ ?? ''])
    coverWs.addRow([heHeader('date'), menu.event_date_ ?? ''])
    coverWs.addRow([heHeader('guest_count'), menu.guest_count_ ?? 0])
    coverWs.addRow([heHeader('pieces_per_person'), menu.pieces_per_person_ ?? ''])
    styleHeaderRow(coverWs, 1)
    coverWs.getColumn(1).width = 18
    coverWs.getColumn(2).width = 24

    const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0))
    sections.forEach((section: MenuSection) => {
      const sheetName = (section.name_ ?? `Section_${section._id}`).slice(0, 31)
      const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: true }] })
      ws.addRow([heHeader('dish_name'), heHeader('portions'), heHeader('take_rate'), heHeader('sell_price')])
      styleHeaderRow(ws, 1)
      let rowNum = 2
      ;(section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_)
        const name = recipe?.name_hebrew ?? item.recipe_id_
        ws.addRow([
          name,
          roundExportNumber(item.derived_portions_ ?? 0),
          roundExportNumber(item.predicted_take_rate_ ?? 0),
          item.sell_price_ !== undefined && item.sell_price_ !== null
            ? roundExportNumber(Number(item.sell_price_))
            : '',
        ])
        styleDataRow(ws, rowNum++)
      })
      ws.getColumn(1).width = 32
      ws.getColumn(2).width = 12
      ws.getColumn(3).width = 12
      ws.getColumn(4).width = 12
    })

    this.addChecklistSheetsToWorkbook(wb, menu, recipeMap, checklistMode)
    this.addMenuShoppingListSheetToWorkbook(wb, menu, recipeMap, products)

    const checklistVariant =
      checklistMode === 'by_dish' ? 'by-dish' : checklistMode === 'by_station' ? 'by-station' : 'by-category'
    const fileName = buildExportFileName('all', menu.name_ ?? 'menu', { includeDate: false, variant: checklistVariant })
    await downloadWorkbook(wb, fileName)
  }

  // ── Preview payloads ─────────────────────────────────────────────────────────

  /** Build payload for menu info preview (cover + sections). */
  getMenuInfoPreviewPayload(menu: MenuEvent, recipes: Recipe[]): ExportPayload {
    const recipeMap = new Map(recipes.map(r => [r._id, r]))
    const coverRows: (string | number)[][] = [
      [heHeader('menu_name'), menu.name_ ?? ''],
      [heHeader('event_type'), menu.event_type_ ?? ''],
      [heHeader('date'), menu.event_date_ ?? ''],
      [heHeader('guest_count'), menu.guest_count_ ?? 0],
      [heHeader('pieces_per_person'), menu.pieces_per_person_ ?? ''],
    ]
    const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0))
    const exportSections: ExportSection[] = [
      { title: heHeader('menu_info'), headerRow: [heHeader('field'), heHeader('value')], rows: coverRows },
    ]
    sections.forEach((section: MenuSection) => {
      const sectionRows: (string | number)[][] = (section.items_ ?? []).map((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_)
        const name = recipe?.name_hebrew ?? item.recipe_id_
        return [
          name,
          roundExportNumber(item.derived_portions_ ?? 0),
          roundExportNumber(item.predicted_take_rate_ ?? 0),
          item.sell_price_ !== undefined && item.sell_price_ !== null
            ? roundExportNumber(Number(item.sell_price_))
            : '',
        ]
      })
      exportSections.push({
        title: section.name_ ?? 'Section',
        headerRow: [heHeader('dish_name'), heHeader('portions'), heHeader('take_rate'), heHeader('sell_price')],
        rows: sectionRows,
      })
    })
    return {
      title: menu.name_ ?? 'Menu',
      subtitle: [menu.event_type_, menu.event_date_].filter(Boolean).join(' · ') || undefined,
      exportedAt: new Date().toISOString(),
      sections: exportSections,
    }
  }

  /** Build payload for menu shopping list preview (same aggregation as export). */
  getMenuShoppingListPreviewPayload(menu: MenuEvent, recipes: Recipe[], products: Product[]): ExportPayload {
    const recipeMap = new Map(recipes.map(r => [r._id, r]))
    const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string; cost: number }[]>()

    const addRow = (category: string, name: string, amount: number, unit: string, lineCost: number): void => {
      const arr = categoryToAggregate.get(category) ?? []
      const existing = arr.find(x => x.name === name && x.unit === unit)
      if (existing) {
        existing.amount += amount
        existing.cost += lineCost
      } else {
        arr.push({ name, amount, unit, cost: lineCost })
      }
      categoryToAggregate.set(category, arr)
    }

    ;(menu.sections_ ?? []).forEach((section: MenuSection) => {
      ;(section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_)
        if (!recipe?.ingredients_?.length) return
        const portions = item.derived_portions_ ?? 0
        const yieldAmount = recipe.yield_amount_ || 1
        const factor = yieldAmount > 0 ? portions / yieldAmount : 0
        const scaled = this.scaling_.getScaledIngredients(recipe, factor)
        const scaledRecipe: Recipe = {
          ...recipe,
          ingredients_: (recipe.ingredients_ ?? []).map(ing => ({
            ...ing,
            amount_: (ing.amount_ ?? 0) * factor,
          })),
        }
        scaled.forEach((row, i) => {
          const category =
            row.type === 'product'
              ? (products.find(p => p._id === row.referenceId)?.categories_?.[0] ?? 'כללי')
              : 'הכנות'
          const ing = scaledRecipe.ingredients_[i]
          const lineCost = ing ? this.recipeCost_.getCostForIngredient(ing) : 0
          addRow(category, row.name, row.amount, row.unit, lineCost)
        })
      })
    })

    const rows: (string | number)[][] = []
    const sortedCategories = Array.from(categoryToAggregate.keys()).sort()
    for (const cat of sortedCategories) {
      ;(categoryToAggregate.get(cat) ?? []).forEach(it => {
        const unitPrice = it.amount > 0 ? it.cost / it.amount : 0
        const lineTotal = roundExportNumber(it.cost)
        rows.push([cat, it.name, roundExportNumber(it.amount), heUnit(it.unit), roundExportNumber(unitPrice), lineTotal])
      })
    }

    return {
      title: `${menu.name_ ?? 'Menu'} — Shopping list`,
      exportedAt: new Date().toISOString(),
      sections: [{ headerRow: ['Category', 'Ingredient', 'Amount', 'Unit', 'Unit price', 'Line total'], rows }],
    }
  }

  /** Build payload for menu checklist preview. */
  getMenuChecklistPreviewPayload(
    menu: MenuEvent,
    recipes: Recipe[],
    mode: 'by_dish' | 'by_category' | 'by_station'
  ): ExportPayload {
    const recipeMap = new Map(recipes.map(r => [r._id, r]))
    const modeLabel = mode === 'by_dish' ? 'by_dish' : mode === 'by_station' ? 'by_station' : 'by_category'

    if (mode === 'by_dish') {
      const sections: ExportSection[] = []
      const menuSections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0))
      for (const section of menuSections) {
        for (const item of section.items_ ?? []) {
          const recipe = recipeMap.get(item.recipe_id_)
          if (!recipe) continue
          const portions = item.derived_portions_ ?? 0
          const yieldAmount = recipe.yield_amount_ || 1
          const factor = yieldAmount > 0 ? portions / yieldAmount : 0
          const prepRows = this.scaling_.getScaledPrepItems(recipe, factor)
          if (prepRows.length === 0) continue
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
          sections.push({
            title: `${heHeader('dish')}: ${recipe.name_hebrew ?? item.recipe_id_} (${heHeader('portions')}: ${portions})`,
            headerRow: [heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')],
            rows,
          })
        }
      }
      return {
        title: `${menu.name_ ?? 'Menu'} — ${heHeader('checklist')}`,
        subtitle: modeLabel,
        exportedAt: new Date().toISOString(),
        sections,
      }
    }

    const isByStation = mode === 'by_station'
    const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string; categoryName?: string }[]>()

    const addPrep = (key: string, name: string, amount: number, unit: string, categoryName?: string): void => {
      const arr = categoryToAggregate.get(key) ?? []
      const existing =
        isByStation && categoryName !== undefined
          ? arr.find(x => x.name === name && x.unit === unit && (x.categoryName ?? '') === categoryName)
          : arr.find(x => x.name === name && x.unit === unit)
      if (existing) existing.amount += amount
      else
        arr.push(
          isByStation && categoryName !== undefined ? { name, amount, unit, categoryName } : { name, amount, unit }
        )
      categoryToAggregate.set(key, arr)
    }

    ;(menu.sections_ ?? []).forEach((section: MenuSection) => {
      ;(section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_)
        if (!recipe) return
        const portions = item.derived_portions_ ?? 0
        const yieldAmount = recipe.yield_amount_ || 1
        const factor = yieldAmount > 0 ? portions / yieldAmount : 0
        const prepRows = this.scaling_.getScaledPrepItems(recipe, factor)
        prepRows.forEach(pr => {
          const key = isByStation ? (recipe.default_station_ ?? 'כללי') : (pr.category_name ?? 'כללי')
          addPrep(key, pr.name, pr.amount, pr.unit, isByStation ? (pr.category_name ?? '') : undefined)
        })
      })
    })

    const sortedGroups = Array.from(categoryToAggregate.keys()).sort()
    const accRows: (string | number)[][] = []
    for (const cat of sortedGroups) {
      let items = categoryToAggregate.get(cat) ?? []
      items = items.slice().sort((a, b) => {
        if (isByStation) return (a.categoryName ?? '').localeCompare(b.categoryName ?? '', 'he')
        return (a.name ?? '').localeCompare(b.name ?? '', 'he')
      })
      items.forEach(it => {
        if (isByStation) accRows.push([heCategoryLabel(this.translation_, it.categoryName), it.name, roundExportNumber(it.amount), heUnit(it.unit)])
        else accRows.push([it.name, roundExportNumber(it.amount), heUnit(it.unit)])
      })
    }
    const headerAcc = isByStation
      ? [heHeader('category'), heHeader('prep_item'), heHeader('quantity'), heHeader('unit')]
      : [heHeader('prep_item'), heHeader('quantity'), heHeader('unit')]

    return {
      title: `${menu.name_ ?? 'Menu'} — ${heHeader('checklist')}`,
      subtitle: modeLabel,
      exportedAt: new Date().toISOString(),
      sections: [{ title: heHeader('accumulated'), headerRow: headerAcc, rows: accRows }],
    }
  }

  /** Build payload for menu "All" view: cover + sections with food cost data. */
  getMenuAllViewPreviewPayload(menu: MenuEvent, recipes: Recipe[]): ExportPayload {
    const recipeMap = new Map(recipes.map(r => [r._id, r]))
    const guestCount = Number(menu.guest_count_ ?? 0)
    const piecesPerPerson = Number((menu as { pieces_per_person_?: number }).pieces_per_person_ ?? 1)
    const servingType = (menu.serving_type_ ?? 'plated_course') as ServingType

    const coverRows: (string | number)[][] = [
      [heHeader('menu_name'), menu.name_ ?? ''],
      [heHeader('event_type'), menu.event_type_ ?? ''],
      [heHeader('date'), menu.event_date_ ?? ''],
      [heHeader('guest_count'), menu.guest_count_ ?? 0],
      [heHeader('pieces_per_person'), menu.pieces_per_person_ ?? ''],
    ]
    const exportSections: ExportSection[] = [
      { title: heHeader('menu_info'), headerRow: [heHeader('field'), heHeader('value')], rows: coverRows },
    ]

    const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0))
    for (const section of sections) {
      const sectionRows: (string | number)[][] = (section.items_ ?? []).map((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_)
        const name = recipe?.name_hebrew ?? item.recipe_id_
        const derivedPortions = this.menuIntelligence_.derivePortions(
          servingType,
          guestCount,
          Number(item.predicted_take_rate_ ?? 0),
          piecesPerPerson,
          Number(item.serving_portions_ ?? 1)
        )
        let totalCost = 0
        if (recipe?.ingredients_?.length) {
          const baseYield = Math.max(1, recipe.yield_amount_ || 1)
          const multiplier = derivedPortions / baseYield
          totalCost = this.recipeCost_.computeRecipeCost({
            ...recipe,
            ingredients_: recipe.ingredients_.map(ing => ({
              ...ing,
              amount_: (ing.amount_ || 0) * multiplier,
            })),
          })
        }
        const costPerPortion = derivedPortions >= 1 ? totalCost / derivedPortions : totalCost
        return [
          name,
          roundExportNumber(derivedPortions),
          roundExportNumber(totalCost),
          roundExportNumber(costPerPortion),
          item.sell_price_ !== undefined && item.sell_price_ !== null
            ? roundExportNumber(Number(item.sell_price_))
            : '',
        ]
      })
      exportSections.push({
        title: section.name_ ?? 'Section',
        headerRow: [
          heHeader('dish_name'),
          heHeader('portions'),
          heHeader('food_cost_money'),
          heHeader('dish_food_cost_per_portion'),
          heHeader('sell_price'),
        ],
        rows: sectionRows,
      })
    }
    return {
      title: `${menu.name_ ?? 'Menu'} — ${heHeader('info')}`,
      subtitle: [menu.event_type_, menu.event_date_].filter(Boolean).join(' · ') || undefined,
      exportedAt: new Date().toISOString(),
      sections: exportSections,
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private addChecklistSheetsToWorkbook(
    wb: Workbook,
    menu: MenuEvent,
    recipeMap: Map<string, Recipe>,
    mode: 'by_dish' | 'by_category' | 'by_station'
  ): void {
    if (mode === 'by_dish') {
      const ws = wb.addWorksheet('Checklist', { views: [{ rightToLeft: true }] })
      const numCols = 4
      let rowNum = 1
      const sections = (menu.sections_ ?? []).slice().sort((a, b) => (a.sort_order_ ?? 0) - (b.sort_order_ ?? 0))
      for (const section of sections) {
        for (const item of section.items_ ?? []) {
          const recipe = recipeMap.get(item.recipe_id_)
          if (!recipe) continue
          const portions = item.derived_portions_ ?? 0
          const yieldAmount = recipe.yield_amount_ || 1
          const factor = yieldAmount > 0 ? portions / yieldAmount : 0
          const prepRows = this.scaling_.getScaledPrepItems(recipe, factor)
          if (prepRows.length === 0) continue
          ws.addRow([recipe.name_hebrew ?? item.recipe_id_])
          styleExcelTitle(ws, rowNum++, numCols)
          ws.addRow([`${heHeader('portions')}: ${portions}`])
          styleExcelSubtitle(ws, rowNum++, numCols)
          ws.addRow([heHeader('prep_item'), heHeader('category'), heHeader('quantity'), heHeader('unit')])
          styleExcelColumnHeader(ws, rowNum++, numCols)
          prepRows.forEach(pr => {
            ws.addRow([pr.name, heCategoryLabel(this.translation_, pr.category_name), roundExportNumber(pr.amount), heUnit(pr.unit)])
            styleExcelDataRowBorders(ws, rowNum++, numCols)
          })
          ws.addRow([])
          styleExcelBlankRow(ws, rowNum++)
        }
      }
      ws.getColumn(1).width = 28
      ws.getColumn(2).width = 14
      ws.getColumn(3).width = 12
      ws.getColumn(4).width = 10
    } else {
      const isByStation = mode === 'by_station'
      const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string; categoryName?: string }[]>()
      const byDishRows: { groupKey: string; name: string; amount: number; unit: string; dishName: string }[] = []
      const addPrep = (key: string, name: string, amount: number, unit: string, dishName: string, categoryName?: string): void => {
        const arr = categoryToAggregate.get(key) ?? []
        const existing =
          isByStation && categoryName !== undefined
            ? arr.find(x => x.name === name && x.unit === unit && (x.categoryName ?? '') === categoryName)
            : arr.find(x => x.name === name && x.unit === unit)
        if (existing) existing.amount += amount
        else
          arr.push(
            isByStation && categoryName !== undefined ? { name, amount, unit, categoryName } : { name, amount, unit }
          )
        categoryToAggregate.set(key, arr)
        byDishRows.push({ groupKey: key, name, amount, unit, dishName })
      }
      ;(menu.sections_ ?? []).forEach((section: MenuSection) => {
        ;(section.items_ ?? []).forEach((item: MenuItemSelection) => {
          const recipe = recipeMap.get(item.recipe_id_)
          if (!recipe) return
          const portions = item.derived_portions_ ?? 0
          const factor = (recipe.yield_amount_ || 1) > 0 ? portions / (recipe.yield_amount_ || 1) : 0
          const prepRows = this.scaling_.getScaledPrepItems(recipe, factor)
          const dishName = recipe.name_hebrew ?? item.recipe_id_
          prepRows.forEach(pr => {
            const key = isByStation ? (recipe.default_station_ ?? 'כללי') : (pr.category_name ?? 'כללי')
            addPrep(key, pr.name, pr.amount, pr.unit, dishName, isByStation ? (pr.category_name ?? '') : undefined)
          })
        })
      })
      const sortedGroups = Array.from(categoryToAggregate.keys()).sort()
      const numColsAcc = isByStation ? 4 : 3
      const sectionTitlePrefix = isByStation ? heHeader('station') : heHeader('category')
      const wsAcc = wb.addWorksheet('Checklist Accumulated', { views: [{ rightToLeft: true }] })
      let r = 1
      for (const cat of sortedGroups) {
        const blockStartRow = r
        const titleRow = isByStation
          ? [`${sectionTitlePrefix}: ${cat}`, '', '', '']
          : [`${sectionTitlePrefix}: ${cat}`, '', '']
        wsAcc.addRow(titleRow)
        styleExcelTitle(wsAcc, r, numColsAcc, 'center')
        r++
        const headerRow = isByStation
          ? [heHeader('category'), heHeader('prep_item'), heHeader('quantity'), heHeader('unit')]
          : [heHeader('prep_item'), heHeader('quantity'), heHeader('unit')]
        wsAcc.addRow(headerRow)
        styleExcelColumnHeader(wsAcc, r, numColsAcc)
        r++
        let items = categoryToAggregate.get(cat) ?? []
        items = items.slice().sort((a, b) => {
          if (isByStation) return (a.categoryName ?? '').localeCompare(b.categoryName ?? '', 'he')
          return (a.name ?? '').localeCompare(b.name ?? '', 'he')
        })
        items.forEach(it => {
          const dataRow = isByStation
            ? [heCategoryLabel(this.translation_, it.categoryName), it.name, roundExportNumber(it.amount), heUnit(it.unit)]
            : [it.name, roundExportNumber(it.amount), heUnit(it.unit)]
          wsAcc.addRow(dataRow)
          styleExcelDataRowBorders(wsAcc, r, numColsAcc)
          r++
        })
        styleExcelBlockBorder(wsAcc, blockStartRow, r - 1, numColsAcc)
      }
      wsAcc.getColumn(1).width = isByStation ? 20 : 28
      wsAcc.getColumn(2).width = isByStation ? 28 : 12
      wsAcc.getColumn(3).width = isByStation ? 12 : 10
      if (isByStation) wsAcc.getColumn(4).width = 10
      const groupKeyLabel = isByStation ? heHeader('station') : heHeader('category')
      const wsByDish = wb.addWorksheet('Checklist By dish', { views: [{ rightToLeft: true }] })
      wsByDish.addRow([groupKeyLabel, heHeader('prep_item'), heHeader('quantity'), heHeader('unit'), heHeader('dish')])
      styleHeaderRow(wsByDish, 1)
      let r2 = 2
      for (const cat of sortedGroups) {
        byDishRows.filter(x => x.groupKey === cat).forEach(rr => {
          wsByDish.addRow([cat, rr.name, roundExportNumber(rr.amount), heUnit(rr.unit), rr.dishName])
          styleDataRow(wsByDish, r2++)
        })
      }
    }
  }

  private addMenuShoppingListSheetToWorkbook(
    wb: Workbook,
    menu: MenuEvent,
    recipeMap: Map<string, Recipe>,
    products: Product[]
  ): void {
    const categoryToAggregate = new Map<string, { name: string; amount: number; unit: string; cost: number }[]>()
    const addRow = (category: string, name: string, amount: number, unit: string, lineCost: number): void => {
      const arr = categoryToAggregate.get(category) ?? []
      const existing = arr.find(x => x.name === name && x.unit === unit)
      if (existing) {
        existing.amount += amount
        existing.cost += lineCost
      } else {
        arr.push({ name, amount, unit, cost: lineCost })
      }
      categoryToAggregate.set(category, arr)
    }
    ;(menu.sections_ ?? []).forEach((section: MenuSection) => {
      ;(section.items_ ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipe_id_)
        if (!recipe?.ingredients_?.length) return
        const portions = item.derived_portions_ ?? 0
        const factor = (recipe.yield_amount_ || 1) > 0 ? portions / (recipe.yield_amount_ || 1) : 0
        const scaled = this.scaling_.getScaledIngredients(recipe, factor)
        const scaledRecipe: Recipe = {
          ...recipe,
          ingredients_: (recipe.ingredients_ ?? []).map(ing => ({ ...ing, amount_: (ing.amount_ ?? 0) * factor })),
        }
        scaled.forEach((row, i) => {
          const category =
            row.type === 'product'
              ? (products.find(p => p._id === row.referenceId)?.categories_?.[0] ?? 'כללי')
              : 'הכנות'
          const ing = scaledRecipe.ingredients_[i]
          addRow(category, row.name, row.amount, row.unit, ing ? this.recipeCost_.getCostForIngredient(ing) : 0)
        })
      })
    })
    const ws = wb.addWorksheet('Shopping list', { views: [{ rightToLeft: true }] })
    ws.addRow([heHeader('category'), heHeader('ingredient'), heHeader('amount'), heHeader('unit'), heHeader('unit_price'), heHeader('line_total')])
    styleHeaderRow(ws, 1)
    let rowNum = 2
    for (const cat of Array.from(categoryToAggregate.keys()).sort()) {
      ;(categoryToAggregate.get(cat) ?? []).forEach(it => {
        const unitPrice = it.amount > 0 ? it.cost / it.amount : 0
        const row = ws.getRow(rowNum)
        row.getCell(1).value = cat
        row.getCell(2).value = it.name
        row.getCell(3).value = roundExportNumber(it.amount)
        row.getCell(4).value = heUnit(it.unit)
        row.getCell(5).value = roundExportNumber(unitPrice)
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
  }
}
