/** Menu export domain service: all menu-scoped Excel exports and preview payloads (plan refactor/split-export-service). */

import { Injectable, inject } from '@angular/core'
// Type-only (erased): a value import would drag the ~1 MB library into the boot bundle (plan 302 M4b)
// the runtime module comes from `await import('exceljs')` at each point of use.
import type { Workbook } from 'exceljs'

import { Recipe } from '@models/recipe.model'
import { MenuEvent, MenuSection, MenuItemSelection } from '@models/menu-event.model'
import { Product } from '@models/product.model'
import { KitchenStateService } from './kitchen-state.service'
import { StationRegistryService } from './station-registry.service'
import { EventPlanService } from '../engine/event-plan.service'
import type { MissingItem } from '../engine/event-plan.types'
import { TranslationService } from './translation.service'
import {
  buildExportFileName,
  exportDateStr,
  heHeader,
  roundExportNumber,
  type ExportPayload,
  type ExportSection
} from '../utils/export.util'
import { buildPrepSheetGroups, prepSheetMetaLine, prepSheetTableRows } from '../utils/prep-sheet-groups.util'
import { buildShoppingListTable, type ShoppingListTable } from '../utils/shopping-list-table.util'
import {
  downloadWorkbook,
  styleDataRow,
  styleExcelColumnHeader,
  styleExcelDataRowBorders,
  styleExcelSubtitle,
  styleExcelTitle,
  styleHeaderRow
} from './excel-workbook.util'

@Injectable({ providedIn: 'root' })
export class MenuExportService {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly stations_ = inject(StationRegistryService)
  private readonly eventPlan_ = inject(EventPlanService)
  private readonly translation_ = inject(TranslationService)

  // ── Excel exports ────────────────────────────────────────────────────────────

  /**
   * Export menu as Excel: cover sheet + one sheet per section.
   * Filename: menu-info_{menuName}.xlsx (no date for menu).
   */
  async exportMenuInfo(menu: MenuEvent, _recipes: Recipe[]): Promise<void> {
    const ExcelJS = await import('exceljs')
    const wb = new ExcelJS.Workbook()

    const coverWs = wb.addWorksheet('Menu info')
    const coverData: (string | number)[][] = [
      [heHeader('menu_name'), menu.name ?? ''],
      [heHeader('event_type'), menu.eventType ?? ''],
      [heHeader('date'), menu.eventDate ?? ''],
      [heHeader('guest_count'), menu.guestCount ?? 0]
    ]
    coverData.forEach((row) => coverWs.addRow(row))
    coverWs.getColumn(1).width = 18
    coverWs.getColumn(2).width = 24

    const sections = (menu.sections ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const recipeMap = new Map(_recipes.map((r) => [r._id, r]))

    sections.forEach((section: MenuSection) => {
      const sheetName = (section.name ?? `Section_${section._id}`).slice(0, 31)
      const ws = wb.addWorksheet(sheetName)
      ws.addRow([heHeader('dish_name'), heHeader('portions'), heHeader('sell_price')])
      styleHeaderRow(ws, 1)
      let rowNum = 2
      ;(section.items ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipeId)
        const name = recipe?.nameHebrew ?? item.recipeId
        ws.addRow([
          name,
          roundExportNumber(item.derivedPortions ?? 0),
          item.sellPrice !== undefined && item.sellPrice !== null ? roundExportNumber(Number(item.sellPrice)) : ''
        ])
        styleDataRow(ws, rowNum++)
      })
      ws.getColumn(1).width = 32
      ws.getColumn(2).width = 12
      ws.getColumn(3).width = 12
    })

    const fileName = buildExportFileName('menu-info', menu.name ?? 'menu', { includeDate: false })
    await downloadWorkbook(wb, fileName)
  }

  /**
   * Export menu shopping list: one table from the event plan (preps expanded, waste applied), grouped by category.
   * Filename: shopping-list_{menuName}.xlsx (no date for menu).
   */
  async exportMenuShoppingList(menu: MenuEvent, _recipes: Recipe[], products: Product[]): Promise<void> {
    const ExcelJS = await import('exceljs')
    const wb = new ExcelJS.Workbook()
    this.addMenuShoppingListSheetToWorkbook(wb, menu, products)
    const fileName = buildExportFileName('shopping-list', menu.name ?? 'menu', { includeDate: false })
    await downloadWorkbook(wb, fileName)
  }

  /**
   * Export the prep sheets (plan 437): one worksheet per dish / category / station, the same rows as the screen.
   * Filename: check-list_{by-dish|by-category|by-station}_{menuName}.xlsx (no date for menu).
   */
  async exportChecklist(
    menu: MenuEvent,
    recipes: Recipe[],
    mode: 'by_dish' | 'by_category' | 'by_station'
  ): Promise<void> {
    const ExcelJS = await import('exceljs')
    const wb = new ExcelJS.Workbook()
    this.addPrepSheetsToWorkbook(wb, menu, new Map(recipes.map((r) => [r._id, r])), mode)
    const modeVariant = mode === 'by_dish' ? 'by-dish' : mode === 'by_station' ? 'by-station' : 'by-category'
    const fileName = buildExportFileName('check-list', menu.name ?? 'menu', {
      includeDate: false,
      variant: modeVariant
    })
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
    const ExcelJS = await import('exceljs')
    const wb = new ExcelJS.Workbook()
    const recipeMap = new Map(recipes.map((r) => [r._id, r]))

    const coverWs = wb.addWorksheet('Menu info', { views: [{ rightToLeft: true }] })
    coverWs.addRow([heHeader('exported_at'), exportDateStr()])
    coverWs.addRow([heHeader('menu_name'), menu.name ?? ''])
    coverWs.addRow([heHeader('event_type'), menu.eventType ?? ''])
    coverWs.addRow([heHeader('date'), menu.eventDate ?? ''])
    coverWs.addRow([heHeader('guest_count'), menu.guestCount ?? 0])
    styleHeaderRow(coverWs, 1)
    coverWs.getColumn(1).width = 18
    coverWs.getColumn(2).width = 24

    const sections = (menu.sections ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    sections.forEach((section: MenuSection) => {
      const sheetName = (section.name ?? `Section_${section._id}`).slice(0, 31)
      const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: true }] })
      ws.addRow([heHeader('dish_name'), heHeader('portions'), heHeader('sell_price')])
      styleHeaderRow(ws, 1)
      let rowNum = 2
      ;(section.items ?? []).forEach((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipeId)
        const name = recipe?.nameHebrew ?? item.recipeId
        ws.addRow([
          name,
          roundExportNumber(item.derivedPortions ?? 0),
          item.sellPrice !== undefined && item.sellPrice !== null ? roundExportNumber(Number(item.sellPrice)) : ''
        ])
        styleDataRow(ws, rowNum++)
      })
      ws.getColumn(1).width = 32
      ws.getColumn(2).width = 12
      ws.getColumn(3).width = 12
    })

    this.addPrepSheetsToWorkbook(wb, menu, recipeMap, checklistMode)
    this.addMenuShoppingListSheetToWorkbook(wb, menu, products)

    const checklistVariant =
      checklistMode === 'by_dish' ? 'by-dish' : checklistMode === 'by_station' ? 'by-station' : 'by-category'
    const fileName = buildExportFileName('all', menu.name ?? 'menu', { includeDate: false, variant: checklistVariant })
    await downloadWorkbook(wb, fileName)
  }

  // ── Preview payloads ─────────────────────────────────────────────────────────

  /** Build payload for menu info preview (cover + sections). */
  getMenuInfoPreviewPayload(menu: MenuEvent, recipes: Recipe[]): ExportPayload {
    const recipeMap = new Map(recipes.map((r) => [r._id, r]))
    const coverRows: (string | number)[][] = [
      [heHeader('menu_name'), menu.name ?? ''],
      [heHeader('event_type'), menu.eventType ?? ''],
      [heHeader('date'), menu.eventDate ?? ''],
      [heHeader('guest_count'), menu.guestCount ?? 0]
    ]
    const sections = (menu.sections ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const exportSections: ExportSection[] = [
      { title: heHeader('menu_info'), headerRow: [heHeader('field'), heHeader('value')], rows: coverRows }
    ]
    sections.forEach((section: MenuSection) => {
      const sectionRows: (string | number)[][] = (section.items ?? []).map((item: MenuItemSelection) => {
        const recipe = recipeMap.get(item.recipeId)
        const name = recipe?.nameHebrew ?? item.recipeId
        return [
          name,
          roundExportNumber(item.derivedPortions ?? 0),
          item.sellPrice !== undefined && item.sellPrice !== null ? roundExportNumber(Number(item.sellPrice)) : ''
        ]
      })
      exportSections.push({
        title: section.name ?? 'Section',
        headerRow: [heHeader('dish_name'), heHeader('portions'), heHeader('sell_price')],
        rows: sectionRows
      })
    })
    return {
      title: menu.name ?? 'Menu',
      subtitle: [menu.eventType, menu.eventDate].filter(Boolean).join(' · ') || undefined,
      exportedAt: new Date().toISOString(),
      sections: exportSections
    }
  }

  /** Build payload for menu shopping list preview (the same table the Excel writes). */
  getMenuShoppingListPreviewPayload(menu: MenuEvent, _recipes: Recipe[], products: Product[]): ExportPayload {
    const table = this.shoppingListTable_(menu, products)
    return {
      title: `${menu.name ?? 'Menu'} — Shopping list`,
      exportedAt: new Date().toISOString(),
      sections: [{ headerRow: table.headerRow, rows: [...table.rows, table.totalRow] }],
      summary: table.notes.map((note) => ({ label: note, value: '' })),
      missing: table.missing
    }
  }

  /** Build payload for menu "All" view: cover + sections with food cost data. */
  getMenuAllViewPreviewPayload(menu: MenuEvent, recipes: Recipe[]): ExportPayload {
    const recipeMap = new Map(recipes.map((r) => [r._id, r]))
    const costByItem = new Map(this.eventPlan_.planFor(menu).dishCosts.map((d) => [d.itemKey, d.cost]))

    const coverRows: (string | number)[][] = [
      [heHeader('menu_name'), menu.name ?? ''],
      [heHeader('event_type'), menu.eventType ?? ''],
      [heHeader('date'), menu.eventDate ?? ''],
      [heHeader('guest_count'), menu.guestCount ?? 0]
    ]
    const exportSections: ExportSection[] = [
      { title: heHeader('menu_info'), headerRow: [heHeader('field'), heHeader('value')], rows: coverRows }
    ]

    const sections = (menu.sections ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    for (const section of sections) {
      const sectionRows: (string | number)[][] = (section.items ?? []).map((item: MenuItemSelection, index) => {
        const name = recipeMap.get(item.recipeId)?.nameHebrew ?? item.recipeId
        const portions = item.derivedPortions ?? 0
        const totalCost = costByItem.get(`${section._id}|${index}`) ?? 0
        const costPerPortion = portions >= 1 ? totalCost / portions : totalCost
        return [
          name,
          roundExportNumber(portions),
          roundExportNumber(totalCost),
          roundExportNumber(costPerPortion),
          item.sellPrice !== undefined && item.sellPrice !== null ? roundExportNumber(Number(item.sellPrice)) : ''
        ]
      })
      exportSections.push({
        title: section.name ?? 'Section',
        headerRow: [
          heHeader('dish_name'),
          heHeader('portions'),
          heHeader('food_cost_money'),
          heHeader('dish_food_cost_per_portion'),
          heHeader('sell_price')
        ],
        rows: sectionRows
      })
    }
    return {
      title: `${menu.name ?? 'Menu'} — ${heHeader('info')}`,
      subtitle: [menu.eventType, menu.eventDate].filter(Boolean).join(' · ') || undefined,
      exportedAt: new Date().toISOString(),
      sections: exportSections
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /** One worksheet per prep-sheet group, the same rows the prep sheets show on screen (plan 437). */
  private addPrepSheetsToWorkbook(
    wb: Workbook,
    menu: MenuEvent,
    recipeMap: Map<string, Recipe>,
    mode: 'by_dish' | 'by_category' | 'by_station'
  ): void {
    const t = (key: string): string => this.translation_.translate(key)
    const groups = buildPrepSheetGroups(
      this.eventPlan_.planFor(menu),
      menu,
      recipeMap,
      mode,
      t,
      this.stations_.stations_()
    )
    const meta = prepSheetMetaLine(menu, t)
    const used = new Set<string>()
    for (const group of groups) {
      const ws = wb.addWorksheet(this.uniqueSheetName_(group.title, used), { views: [{ rightToLeft: true }] })
      const [header, ...rows] = prepSheetTableRows(group, t)
      const numCols = header.length
      ws.addRow([group.title])
      styleExcelTitle(ws, 1, numCols)
      ws.addRow([meta])
      styleExcelSubtitle(ws, 2, numCols)
      ws.addRow(header)
      styleExcelColumnHeader(ws, 3, numCols)
      rows.forEach((row, i) => {
        ws.addRow(row)
        styleExcelDataRowBorders(ws, 4 + i, numCols)
      })
      if (group.emptyText) ws.addRow([group.emptyText])
      header.forEach((_, i) => (ws.getColumn(i + 1).width = i === 0 ? 28 : 14))
    }
    if (groups.length === 0) wb.addWorksheet(t('prep_sheets')).addRow([t('prep_sheets_nothing')])
  }

  /** An Excel-safe sheet name: no `\ / * ? : [ ]`, at most 31 characters, unique within the workbook. */
  private uniqueSheetName_(title: string, used: Set<string>): string {
    const base =
      title
        .replace(/[\\/*?:[\]]/g, ' ')
        .trim()
        .slice(0, 27) || 'Sheet'
    let name = base
    for (let n = 2; used.has(name); n++) name = `${base} ${n}`
    used.add(name)
    return name
  }

  private addMenuShoppingListSheetToWorkbook(wb: Workbook, menu: MenuEvent, products: Product[]): void {
    const table = this.shoppingListTable_(menu, products)
    const ws = wb.addWorksheet('Shopping list', { views: [{ rightToLeft: true }] })
    ws.addRow(table.headerRow)
    styleHeaderRow(ws, 1)
    let rowNum = 2
    for (const row of [...table.rows, table.totalRow]) {
      ws.addRow(row)
      styleDataRow(ws, rowNum++)
    }
    ws.getRow(rowNum - 1).font = { bold: true }
    table.notes.forEach((note) => ws.addRow([note]))
    const widths = [18, 28, 14, 10, 14, 12, 28]
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w))
  }

  /** The one shopping-list table every preview and Excel export of a menu reads (plan 434). */
  private shoppingListTable_(menu: MenuEvent, products: Product[]): ShoppingListTable & { missing: MissingItem[] } {
    const plan = this.eventPlan_.planFor(menu)
    const table = buildShoppingListTable(plan, products, (key) => this.translation_.translate(key))
    return { ...table, missing: plan.missing }
  }
}
