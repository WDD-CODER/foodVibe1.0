import type { Product } from '@models/product.model'

export interface SupplierChoice {
  supplierId: string | null
  pricePerBaseUnit: number | null
}

/**
 * Supplier price per base unit. The owner's chosen supplier (`preferredSupplierId`) wins when it has a positive
 * price on the product; otherwise the cheapest positive price (a tie keeps the earlier source), so a stale or
 * unpriced choice never breaks a cost. With no priced supplier, a source without a supplier id is the product's
 * general price.
 */
export function chooseSupplier(product: Pick<Product, 'sources' | 'preferredSupplierId'>): SupplierChoice {
  let best: { supplierId: string; price: number } | null = null
  let preferred: { supplierId: string; price: number } | null = null
  let general: number | null = null
  for (const s of product.sources ?? []) {
    if (!(s.price > 0)) continue
    if (!s.supplierId) {
      if (general == null) general = s.price
      continue
    }
    if (product.preferredSupplierId && s.supplierId === product.preferredSupplierId && preferred == null) {
      preferred = { supplierId: s.supplierId, price: s.price }
    }
    if (best == null || s.price < best.price) best = { supplierId: s.supplierId, price: s.price }
  }
  const pick = preferred ?? best
  if (pick) return { supplierId: pick.supplierId, pricePerBaseUnit: pick.price }
  if (general != null) return { supplierId: null, pricePerBaseUnit: general }
  return { supplierId: null, pricePerBaseUnit: null }
}

/** Cheapest positive price among the product's named suppliers, or null. */
export function cheapestSupplier(product: Pick<Product, 'sources'>): { supplierId: string; price: number } | null {
  const c = chooseSupplier({ sources: product.sources })
  return c.supplierId && c.pricePerBaseUnit != null ? { supplierId: c.supplierId, price: c.pricePerBaseUnit } : null
}
