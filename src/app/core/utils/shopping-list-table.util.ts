import type { EventPlan, RawLine } from '../engine/event-plan.types'
import { formatQty, roundMoney } from '../engine/rounding'
import type { Product } from '@models/product.model'
import { heHeader, heUnit, type ExportSectionRow } from './export.util'

/** Plan 434 — the one shopping-list table, built from the engine plan. Preview and both Excel exports read it. */
export interface ShoppingListTable {
  headerRow: string[]
  /** Grouped by category (unlinked and deleted groups last); each row is category, product, qty, unit, purchase units, line total, note. */
  rows: ExportSectionRow[]
  /** The last "total" row; the line total cell is `eventFoodCost`. */
  totalRow: ExportSectionRow
  /** Engine errors, one text each, shown under the table. */
  notes: string[]
}

type Translate = (key: string) => string

const GROUP_RANK = { category: 0, unlinked: 1, deleted: 2 } as const

function groupOf(line: RawLine, productsById: Map<string, Product>, t: Translate): { rank: number; label: string } {
  if (line.status === 'unlinked') return { rank: GROUP_RANK.unlinked, label: t('line_status_unlinked') }
  if (line.status === 'deleted') return { rank: GROUP_RANK.deleted, label: t('line_status_deleted') }
  const first = line.productId ? productsById.get(line.productId)?.categories?.[0] : undefined
  return { rank: GROUP_RANK.category, label: first ? t(first) : t('general_group') }
}

export function buildShoppingListTable(plan: EventPlan, products: Product[], t: Translate): ShoppingListTable {
  const productsById = new Map(products.map((p) => [p._id, p]))

  const entries = plan.rawLines.map((line) => ({ line, group: groupOf(line, productsById, t) }))
  entries.sort(
    (a, b) =>
      a.group.rank - b.group.rank ||
      a.group.label.localeCompare(b.group.label, 'he') ||
      a.line.name.localeCompare(b.line.name, 'he')
  )

  const rows: ExportSectionRow[] = entries.map(({ line, group }) => {
    const buy = formatQty(line.buyQty, line.unit)
    const purchase = line.purchase ? formatQty(line.purchase.count, line.purchase.unit) : null
    return [
      group.label,
      line.name,
      buy.qty,
      heUnit(buy.unit),
      purchase && line.purchase ? `${purchase.qty} ${heUnit(line.purchase.unit)}` : '',
      line.lineCost == null ? '' : roundMoney(line.lineCost),
      line.status === 'no_conversion' ? t('line_status_no_conversion') : ''
    ]
  })

  const totalRow: ExportSectionRow = [
    '',
    t('shopping_total'),
    '',
    '',
    '',
    roundMoney(plan.eventFoodCost),
    plan.partial ? t('partial_total') : ''
  ]

  return {
    headerRow: [
      heHeader('category'),
      heHeader('ingredient'),
      heHeader('buy_qty'),
      heHeader('unit'),
      heHeader('purchase_units'),
      heHeader('line_total'),
      heHeader('note')
    ],
    rows,
    totalRow,
    notes: plan.errors.map((e) => t(`engine_error_${e.kind}`).replace('{name}', e.name))
  }
}
