import type { EventPlan, PrepLine } from '../engine/event-plan.types'
import { formatQty } from '../engine/rounding'
import type { MenuEvent } from '@models/menu-event.model'
import type { Recipe } from '@models/recipe.model'
import { describeOrderLine, unitLabel, type SupplierOrders } from './supplier-orders.util'

/**
 * Plan 437 — the printed prep sheets: one group per dish / category / station / supplier. The screen, the paper
 * and the Excel export all read these groups (and `prepSheetTableRows`), so they cannot differ.
 */
export type PrepSheetMode = 'by_dish' | 'by_category' | 'by_station'

export interface PrepSheetRow {
  name: string
  qty: number
  /** Unit key (`kg`, `unit`, …); shown through `unitLabel`. */
  unit: string
  /** The dishes that need this row, in menu order. */
  forDishes: string[]
  note?: string
  /** Supplier pages only: the purchase unit text, e.g. '2 ארגז'. */
  purchase?: string
}

export interface PrepSheetGroup {
  key: string
  title: string
  /** 'prep' = by dish (no "for dish" column), 'prep_dish' = category / station, 'supplier' = product pages. */
  columns: 'prep' | 'prep_dish' | 'supplier'
  rows: PrepSheetRow[]
  /** Set on a by-dish group that has no preps. */
  emptyText?: string
}

type Translate = (key: string) => string

const byName = (a: string, b: string): number => a.localeCompare(b, 'he')

interface DishRef {
  id: string
  name: string
}

/** Distinct dishes of the event in menu order (sections by sortOrder, then item order). */
function dishesInMenuOrder(event: MenuEvent, recipesById: Map<string, Recipe>): DishRef[] {
  const out: DishRef[] = []
  const seen = new Set<string>()
  const sections = [...(event.sections ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  for (const section of sections) {
    for (const item of section.items ?? []) {
      if (seen.has(item.recipeId)) continue
      seen.add(item.recipeId)
      out.push({ id: item.recipeId, name: recipesById.get(item.recipeId)?.nameHebrew ?? item.recipeId })
    }
  }
  return out
}

/** Merges lines with the same prep id and unit into one row: summed, then rounded once by the engine. */
function mergeRows(
  lines: PrepLine[],
  dishOrder: Map<string, number>,
  dishName: (id: string) => string
): PrepSheetRow[] {
  const merged = new Map<string, { line: PrepLine; qty: number; dishIds: Set<string>; notes: Set<string> }>()
  for (const line of lines) {
    const key = `${line.prepId}|${line.unit}`
    const entry = merged.get(key) ?? { line, qty: 0, dishIds: new Set<string>(), notes: new Set<string>() }
    entry.qty += line.qty
    entry.dishIds.add(line.dishId)
    if (line.note) entry.notes.add(line.note)
    merged.set(key, entry)
  }
  return [...merged.values()]
    .map((entry) => {
      const shown = formatQty(entry.qty, entry.line.unit)
      const dishIds = [...entry.dishIds].sort((a, b) => (dishOrder.get(a) ?? 0) - (dishOrder.get(b) ?? 0))
      const row: PrepSheetRow = {
        name: entry.line.name,
        qty: shown.qty,
        unit: shown.unit,
        forDishes: dishIds.map(dishName)
      }
      if (entry.notes.size > 0) row.note = [...entry.notes].join('; ')
      return row
    })
    .sort((a, b) => byName(a.name, b.name))
}

/**
 * Prep sheet groups of an event plan.
 * - by dish: menu order, a dish without preps keeps its group with `emptyText`
 * - by category / station: alphabetical categories, stations in `stationOrder`; "general" last; empty groups dropped.
 * A prep row belongs to the serving dish's station (`PrepLine.station`), never to the prep's own station.
 */
export function buildPrepSheetGroups(
  plan: EventPlan,
  event: MenuEvent,
  recipesById: Map<string, Recipe>,
  mode: PrepSheetMode,
  t: Translate,
  stationOrder: readonly string[] = []
): PrepSheetGroup[] {
  const dishes = dishesInMenuOrder(event, recipesById)
  const dishOrder = new Map(dishes.map((d, i) => [d.id, i]))
  const dishName = (id: string): string => recipesById.get(id)?.nameHebrew ?? id

  if (mode === 'by_dish') {
    return dishes.map((dish) => {
      const rows = mergeRows(
        plan.prepLines.filter((l) => l.dishId === dish.id),
        dishOrder,
        dishName
      )
      const group: PrepSheetGroup = { key: dish.id, title: dish.name, columns: 'prep', rows }
      if (rows.length === 0) group.emptyText = t('prep_sheets_no_preps')
      return group
    })
  }

  const isStation = mode === 'by_station'
  const general = t('general_group')
  const buckets = new Map<string, PrepLine[]>()
  for (const line of plan.prepLines) {
    const raw = (isStation ? line.station : line.category).trim()
    const list = buckets.get(raw) ?? []
    list.push(line)
    buckets.set(raw, list)
  }
  const keys = [...buckets.keys()]
  const rank = (key: string): number => {
    if (key === '') return Number.MAX_SAFE_INTEGER
    const i = stationOrder.indexOf(key)
    return i >= 0 ? i : stationOrder.length
  }
  const titleOf = (key: string): string => (key === '' ? general : isStation ? key : t(key))
  keys.sort((a, b) => {
    if (a === '' || b === '') return a === '' ? 1 : -1
    if (isStation) return rank(a) - rank(b) || byName(a, b)
    return byName(titleOf(a), titleOf(b))
  })
  return keys.map((key) => ({
    key: key || 'general',
    title: titleOf(key),
    columns: 'prep_dish',
    rows: mergeRows(buckets.get(key) ?? [], dishOrder, dishName)
  }))
}

/** Supplier pages: one group per order card (review lines excluded), product · qty · unit · purchase, no prices. */
export function buildSupplierSheetGroups(orders: SupplierOrders, t: Translate): PrepSheetGroup[] {
  return orders.cards
    .filter((card) => card.lines.length > 0)
    .map((card) => ({
      key: card.supplierId ?? 'none',
      title: card.name,
      columns: 'supplier' as const,
      rows: card.lines.map((line) => {
        const shown = formatQty(line.buyQty, line.unit)
        const row: PrepSheetRow = { name: line.name, qty: shown.qty, unit: shown.unit, forDishes: [] }
        const purchase = describeOrderLine(line, t).purchase
        if (purchase) row.purchase = purchase
        return row
      })
    }))
}

/** Header row, then one array per row: exactly what the template shows and the Excel sheet writes. */
export function prepSheetTableRows(group: PrepSheetGroup, t: Translate): (string | number)[][] {
  const unit = (key: string): string => unitLabel(key, t)
  if (group.columns === 'supplier') {
    return [
      [
        t('prep_sheets_col_product'),
        t('prep_sheets_col_qty'),
        t('prep_sheets_col_unit'),
        t('prep_sheets_col_purchase')
      ],
      ...group.rows.map((r) => [r.name, r.qty, unit(r.unit), r.purchase ?? ''])
    ]
  }
  const withDish = group.columns === 'prep_dish'
  const header = [t('prep_sheets_col_prep'), t('prep_sheets_col_qty'), t('prep_sheets_col_unit')]
  if (withDish) header.push(t('prep_sheets_for_dish'))
  header.push(t('prep_sheets_col_note'))
  const rows = group.rows.map((r) => {
    const cells: (string | number)[] = [r.name, r.qty, unit(r.unit)]
    if (withDish) cells.push(r.forDishes.join(', '))
    cells.push(r.note ?? '')
    return cells
  })
  return [header, ...rows]
}
