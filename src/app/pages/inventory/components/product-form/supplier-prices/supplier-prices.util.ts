import type { Product, ProductSource } from '@models/product.model'
import { getEffectivePrice, getSupplierIds } from '@utils/product-source.util'

/** Price per base unit by supplier id; `null` is a row still waiting for a price. */
export type SupplierPrices = Record<string, number | null>

/**
 * One row per selected supplier. A supplier that already has a row keeps it; the first supplier starts from `seed`
 * (the product's existing price) and every later one copies the first row's price. Removed suppliers lose their row.
 */
export function fillSupplierPrices(ids: string[], prices: SupplierPrices, seed: number): SupplierPrices {
  const out: SupplierPrices = {}
  ids.forEach((id, index) => {
    if (id in prices) out[id] = prices[id]
    else if (index === 0) out[id] = seed > 0 ? seed : null
    else out[id] = out[ids[0]] ?? null
  })
  return out
}

/** Cheapest positive row price, or 0 when no row has a price. */
export function cheapestPrice(prices: SupplierPrices): number {
  const positive = Object.values(prices).filter((p): p is number => typeof p === 'number' && p > 0)
  return positive.length ? Math.min(...positive) : 0
}

/** The rows a saved product opens with: each supplier's own price; a legacy supplier without a source gets the product's price. */
export function pricesFromProduct(product: Product): SupplierPrices {
  const out: SupplierPrices = {}
  for (const id of getSupplierIds(product)) {
    const source = (product.sources ?? []).find((s) => s.supplierId === id)
    const price = source ? source.price : getEffectivePrice(product)
    out[id] = price > 0 ? price : null
  }
  return out
}

/** Sources to save: each supplier keeps its own price; without suppliers the single price is the product's general price. */
export function buildSources(
  value: { supplierIds_?: string[]; supplierPrices_?: SupplierPrices; buy_price_global_?: number },
  existing: ProductSource[]
): ProductSource[] {
  const ids = value.supplierIds_ ?? []
  const prices = value.supplierPrices_ ?? {}
  const generalPrice = value.buy_price_global_ ?? 0
  if (!ids.length) return generalPrice > 0 ? [{ supplierId: '', price: generalPrice, addedAt: Date.now() }] : []
  return ids.map((supplierId) => {
    const was = existing.find((s) => s.supplierId === supplierId)
    const price = prices[supplierId] ?? 0
    return { supplierId, price: price > 0 ? price : 0, addedBy: was?.addedBy, addedAt: was?.addedAt ?? Date.now() }
  })
}
