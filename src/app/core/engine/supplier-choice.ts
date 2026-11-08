import type { Product } from '@models/product.model'

export interface SupplierChoice {
  supplierId: string | null
  pricePerBaseUnit: number | null
}

/**
 * Plan 510: the owner's chosen supplier (`preferredSupplierId`) when it still has a positive price on the product.
 * Otherwise (no choice, chosen supplier unpriced or removed) the cheapest positive supplier price per base unit
 * (a tie keeps the earlier source). With no priced supplier, a source without a supplier id is the general price.
 */
export function chooseSupplier(product: Pick<Product, 'sources' | 'preferredSupplierId'>): SupplierChoice {
  const preferred = product.preferredSupplierId
  if (preferred) {
    const chosen = (product.sources ?? []).find((s) => s.supplierId === preferred && s.price > 0)
    if (chosen) return { supplierId: chosen.supplierId, pricePerBaseUnit: chosen.price }
  }
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
