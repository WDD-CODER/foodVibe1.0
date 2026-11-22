/** Menu export domain service: all menu-scoped Excel exports and preview payloads (plan refactor/split-export-service, plan 471). */

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
import { addStyledTableSheet, downloadWorkbook } from './excel-workbook.util'

type ChecklistMode = 'by_dish' | 'by_category' | 'by_station'

@Injectable({ providedIn: 'root' })
export class MenuExportService {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly stations_ = inject(StationRegistryService)
  private readonly eventPlan_ = inject(EventPlanService)
  private readonly translation_ = inject(TranslationService)

  // ── Workbook builders (plan 471: testable, no download) ──────────────────────

  /** Menu info: cover sheet + one sheet per section. */
  async buildMenuInfoWorkbook(menu: MenuEvent, recipes: Recipe[]): Promise<Workbook> {
    const wb = await this.newWorkbook_()
    const recipeMap = new Map(recipes.map((r) => [r._id, r]))
    this.addCoverSheet_(wb, menu)
    this.sortedSections_(menu).forEach((section) => this.menuSectionSheet_(wb, section, recipeMap, menu))
    return wb
  }

  /** Menu shopping list: one table from the event plan (preps expanded, waste applied), grouped by category. */
  async buildMenuShoppingListWorkbook(menu: MenuEvent, _recipes: Recipe[], products: Product[]): Promise<Workbook> {
    const wb = await this.newWorkbook_()
    this.addMenuShoppingListSheetToWorkbook(wb, menu, products)
    return wb
  }

  /** The prep sheets (plan 437): one worksheet per dish / category / station, the same rows as the screen. */
  async buildChecklistWorkbook(menu: MenuEvent, recipes: Recipe[], mode: ChecklistMode): Promise<Workbook> {
    const wb = await this.newWorkbook_()
    this.addPrepSheetsToWorkbook(wb, menu, new Map(recipes.map((r) => [r._id, r])), mode)
    return wb
  }

  /** All together (menu): menu info + checklist (default by_category) + shopping list. */
  async buildAllTogetherMenuWorkbook(
    menu: MenuEvent,
    recipes: Recipe[],
    products: Product[],
    checklistMode: ChecklistMode = 'by_category'
  ): Promise<Workbook> {
    const wb = await this.newWorkbook_()
    const recipeMap = new Map(recipes.map((r) => [r._id, r]))
    this.addCoverSheet_(wb, menu)
    this.sortedSections_(menu).forEach((section) => this.menuSectionSheet_(wb, section, recipeMap, menu))
    this.addPrepSheetsToWorkbook(wb, menu, recipeMap, checklistMode)
    this.addMenuShoppingListSheetToWorkbook(wb, menu, products)
    return wb
  }

  // ── Excel exports ────────────────────────────────────────────────────────────

  /** Filename: menu-info_{menuName}.xlsx (no date for menu). */
  async exportMenuInfo(menu: MenuEvent, recipes: Recipe[]): Promise<void> {
    const wb = await this.buildMenuInfoWorkbook(menu, recipes)
    await downloadWorkbook(wb, buildExportFileName('menu-info', menu.name ?? 'menu', { includeDate: false }))
  }

  /** Filename: shopping-list_{menuName}.xlsx (no date for menu). */
  async exportMenuShoppingList(menu: MenuEvent, recipes: Recipe[], products: Product[]): Promise<void> {
    const wb = await this.buildMenuShoppingListWorkbook(menu, recipes, products)
    await downloadWorkbook(wb, buildExportFileName('shopping-list', menu.name ?? 'menu', { includeDate: false }))
  }

  /** Filename: check-list_{by-dish|by-category|by-station}_{menuName}.xlsx (no date for menu). */
  async exportChecklist(menu: MenuEvent, recipes: Recipe[], mode: ChecklistMode): Promise<void> {
    const wb = await this.buildChecklistWorkbook(menu, recipes, mode)
    const fileName = buildExportFileName('check-list', menu.name ?? 'menu', {
      includeDate: false,
      variant: this.modeVariant_(mode)
    })
    await downloadWorkbook(wb, fileName)
  }

  /** Filename: all_{checklistMode}_{menuName}.xlsx */
  async exportAllTogetherMenu(
    menu: MenuEvent,
    recipes: Recipe[],
    products: Product[],
    checklistMode: ChecklistMode = 'by_category'
  ): Promise<void> {
    const wb = await this.buildAllTogetherMenuWorkbook(menu, recipes, products, checklistMode)
    const fileName = buildExportFileName('all', menu.name ?? 'menu', {
      includeDate: false,
      variant: this.modeVariant_(checklistMode)
    })
    await downloadWorkbook(wb, fileName)
  }

  // ── Preview payloads ─────────────────────────────────────────────────────────

  /** Build payload for menu info preview (cover + sections). */
  getMenuInfoPreviewPayload(menu: MenuEvent, recipes: Recipe[]): ExportPayload {
    const recipeMap = new Map(recipes.map((r) => [r._id, r]))
    const exportSections: ExportSection[] = [
      { title: heHeader('menu_info'), headerRow: [heHeader('field'), heHeader('value')], rows: this.coverRows_(menu) }
    ]
    this.sortedSections_(menu).forEach((section: MenuSection) => {
      exportSections.push({
        title: section.name || this.t_('export_section_fallback'),
        headerRow: [heHeader('dish_name'), heHeader('portions'), heHeader('sell_price')],
        rows: this.sectionRows_(section, recipeMap)
      })
    })
    return {
      title: this.menuName_(menu),
      subtitle: [this.eventTypeName_(menu), menu.eventDate].filter(Boolean).join(' · ') || undefined,
      exportedAt: new Date().toISOString(),
      sections: exportSections
    }
  }

  /** Build payload for menu shopping list preview (the same table the Excel writes). */
  getMenuShoppingListPreviewPayload(menu: MenuEvent, _recipes: Recipe[], products: Product[]): ExportPayload {
    const table = this.shoppingListTable_(menu, products)
    return {
      title: `${this.menuName_(menu)} — ${this.t_('export_shopping_list')}`,
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
    const exportSections: ExportSection[] = [
      { title: heHeader('menu_info'), headerRow: [heHeader('field'), heHeader('value')], rows: this.coverRows_(menu) }
    ]

    for (const section of this.sortedSections_(menu)) {
      const sectionRows: (string | number)[][] = (section.items ?? []).map((item: MenuItemSelection, index) => {
        const name = recipeMap.get(item.recipeId)?.nameHebrew ?? item.unlinkedName ?? item.recipeId
        const portions = item.derivedPortions ?? 0
        const totalCost = costByItem.get(`${section._id}|${index}`) ?? 0
        const costPerPortion = portions >= 1 ? totalCost / portions : totalCost
        return [
          name,
          roundExportNumber(portions),
          roundExportNumber(totalCost),
          roundExportNumber(costPerPortion),
          this.sellPriceCell_(item)
        ]
      })
      exportSections.push({
        title: section.name || this.t_('export_section_fallback'),
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
      title: `${this.menuName_(menu)} — ${heHeader('info')}`,
      subtitle: [this.eventTypeName_(menu), menu.eventDate].filter(Boolean).join(' · ') || undefined,
      exportedAt: new Date().toISOString(),
      sections: exportSections
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

  private menuName_(menu: MenuEvent): string {
    return menu.name || this.t_('export_menu_fallback')
  }

  /** The event type's Hebrew name: the stored snapshot, else the dictionary entry of the key. */
  private eventTypeName_(menu: MenuEvent): string {
    return menu.eventTypeSnapshot?.name || (menu.eventType ? this.t_(menu.eventType) : '')
  }

  /** Meta line of every menu sheet: event type, date and guest count; empty parts are left out. */
  private menuMeta_(menu: MenuEvent): string {
    return [this.eventTypeName_(menu), menu.eventDate ?? '', `${heHeader('guest_count')}: ${menu.guestCount ?? 0}`]
      .filter(Boolean)
      .join(' · ')
  }

  private modeVariant_(mode: ChecklistMode): string {
    return mode === 'by_dish' ? 'by-dish' : mode === 'by_station' ? 'by-station' : 'by-category'
  }

  private sortedSections_(menu: MenuEvent): MenuSection[] {
    return (menu.sections ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }

  private coverRows_(menu: MenuEvent): (string | number)[][] {
    return [
      [heHeader('menu_name'), menu.name ?? ''],
      [heHeader('event_type'), this.eventTypeName_(menu)],
      [heHeader('date'), menu.eventDate ?? ''],
      [heHeader('guest_count'), menu.guestCount ?? 0]
    ]
  }

  private sellPriceCell_(item: MenuItemSelection): string | number {
    return item.sellPrice !== undefined && item.sellPrice !== null ? roundExportNumber(Number(item.sellPrice)) : ''
  }

  private sectionRows_(section: MenuSection, recipeMap: Map<string, Recipe>): (string | number)[][] {
    return (section.items ?? []).map((item: MenuItemSelection) => {
      const name = recipeMap.get(item.recipeId)?.nameHebrew ?? item.unlinkedName ?? item.recipeId
      return [name, roundExportNumber(item.derivedPortions ?? 0), this.sellPriceCell_(item)]
    })
  }

  /** The cover sheet ("menu info"): field / value table plus the export date. */
  private addCoverSheet_(wb: Workbook, menu: MenuEvent): void {
    const sheetName = this.t_('export_sheet_menu_info')
    addStyledTableSheet(wb, {
      name: sheetName,
      title: `${this.menuName_(menu)} — ${sheetName}`,
      meta: this.menuMeta_(menu),
      header: [heHeader('field'), heHeader('value')],
      rows: [...this.coverRows_(menu), [heHeader('exported_at'), exportDateStr()]],
      widths: [18, 28]
    })
  }

  /** One sheet per dish section (dish, portions, sell price). */
  private menuSectionSheet_(wb: Workbook, section: MenuSection, recipeMap: Map<string, Recipe>, menu: MenuEvent): void {
    const fallback = this.t_('export_section_fallback')
    addStyledTableSheet(wb, {
      name: section.name ?? '',
      fallbackName: fallback,
      title: section.name || fallback,
      meta: this.menuMeta_(menu),
      header: [heHeader('dish_name'), heHeader('portions'), heHeader('sell_price')],
      rows: this.sectionRows_(section, recipeMap),
      widths: [32, 12, 12]
    })
  }

  /** One worksheet per prep-sheet group, the same rows the prep sheets show on screen (plan 437). */
  private addPrepSheetsToWorkbook(
    wb: Workbook,
    menu: MenuEvent,
    recipeMap: Map<string, Recipe>,
    mode: ChecklistMode
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
    for (const group of groups) {
      const [header, ...rows] = prepSheetTableRows(group, t)
      const ws = addStyledTableSheet(wb, {
        name: group.title,
        fallbackName: t('export_sheet_fallback'),
        title: group.title,
        meta,
        header,
        rows
      })
      if (group.emptyText) ws.addRow([group.emptyText])
    }
    if (groups.length === 0) {
      addStyledTableSheet(wb, {
        name: t('prep_sheets'),
        title: t('prep_sheets'),
        meta,
        header: [t('prep_sheets_nothing')],
        rows: []
      })
    }
  }

  private addMenuShoppingListSheetToWorkbook(wb: Workbook, menu: MenuEvent, products: Product[]): void {
    const table = this.shoppingListTable_(menu, products)
    const sheetName = this.t_('export_shopping_list')
    const ws = addStyledTableSheet(wb, {
      name: sheetName,
      title: `${this.menuName_(menu)} — ${sheetName}`,
      meta: this.menuMeta_(menu),
      header: table.headerRow,
      rows: table.rows,
      totalRow: table.totalRow,
      widths: [18, 28, 14, 10, 14, 12, 28]
    })
    table.notes.forEach((note) => ws.addRow([note]))
  }

  /** The one shopping-list table every preview and Excel export of a menu reads (plan 434). */
  private shoppingListTable_(menu: MenuEvent, products: Product[]): ShoppingListTable & { missing: MissingItem[] } {
    const plan = this.eventPlan_.planFor(menu)
    const table = buildShoppingListTable(plan, products, (key) => this.translation_.translate(key))
    return { ...table, missing: plan.missing }
  }
}
