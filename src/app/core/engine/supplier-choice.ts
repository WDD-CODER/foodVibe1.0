import type { Product } from '@models/product.model'

export interface SupplierChoice {
  supplierId: string | null
  pricePerBaseUnit: number | null
}

/**
 * Cheapest positive supplier price per base unit (a tie keeps the earlier source).
 * With no priced supplier, a source without a supplier id is the product's general price.
 */
export function chooseSupplier(product: Pick<Product, 'sources'>): SupplierChoice {
  let best: { supplierId: string; price: number } | null = null
  let general: number | null = null
  for (const s of product.sources ?? []) {
    if (!(s.price > 0)) continue
    if (!s.supplierId) {
      if (general == null) general = s.price
      continue
    }
    if (best == null || s.price < best.price) best = { supplierId: s.supplierId, price: s.price }
  }
  if (best) return { supplierId: best.supplierId, pricePerBaseUnit: best.price }
  if (general != null) return { supplierId: null, pricePerBaseUnit: general }
  return { supplierId: null, pricePerBaseUnit: null }
}
