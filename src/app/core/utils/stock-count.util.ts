import type { Product } from '@models/product.model'
import type { OnHandRow } from '@schemas/stock/stock-count-input.schema'
import { unitFamily } from '@schemas/units/to-base'

/** Plan 636: the units a product can be counted in — exactly those the shared `toBase` rule can convert for it. */
export function unitOptionsFor(product: Pick<Product, 'baseUnit' | 'purchaseOptions'>): string[] {
  const out: string[] = []
  const add = (unit: string | undefined): void => {
    if (unit && !out.includes(unit)) out.push(unit)
  }
  add(product.baseUnit)
  for (const option of product.purchaseOptions ?? []) {
    if (option.conversionRate > 0) add(option.unitSymbol)
  }
  const family = unitFamily(product.baseUnit)
  if (family === 'mass') {
    add('gram')
    add('kg')
  } else if (family === 'volume') {
    add('ml')
    add('liter')
  }
  return out
}

export interface BelowMinimumRow {
  product: Product
  baseQuantity: number
  minStockLevel: number
  countedAt: number
}

export interface BelowMinimumResult {
  rows: BelowMinimumRow[]
  /** Products with a minimum that no final count lists yet. */
  uncounted: number
}

/** Products whose counted stock is under their minimum (both in the product's base unit), the emptiest first. */
export function belowMinimum(products: readonly Product[], onHand: readonly OnHandRow[]): BelowMinimumResult {
  const byId = new Map(onHand.map((row) => [row.productId, row]))
  const rows: BelowMinimumRow[] = []
  let uncounted = 0
  for (const product of products) {
    if (!(product.minStockLevel > 0)) continue
    const row = byId.get(product._id)
    if (!row) {
      uncounted++
      continue
    }
    if (row.baseQuantity < product.minStockLevel) {
      rows.push({
        product,
        baseQuantity: row.baseQuantity,
        minStockLevel: product.minStockLevel,
        countedAt: row.countedAt
      })
    }
  }
  rows.sort((a, b) => a.baseQuantity / a.minStockLevel - b.baseQuantity / b.minStockLevel)
  return { rows, uncounted }
}

function isoOf(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

/** Today's date → `now`; any other date → 12:00 local time of that date. */
export function countedAtFromIso(iso: string, now: number): number {
  if (iso === isoOf(new Date(now))) return now
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime()
}

/** The local ISO date (`yyyy-mm-dd`) of an epoch-ms value. */
export function isoFromCountedAt(ms: number): string {
  return isoOf(new Date(ms))
}
