import { Product } from '@models/product.model'

/**
 * Effective base price per base_unit.
 * Uses the lowest positive source price, falling back to deprecated buy_price_global_.
 */
export function getEffectivePrice(product: Product): number {
  const prices = (product.sources_ ?? []).map(s => s.price).filter(p => p > 0)
  if (prices.length) return Math.min(...prices)
  return product.buy_price_global_ ?? 0
}

/**
 * All unique supplier IDs from sources, falling back to deprecated supplierIds_.
 */
export function getSupplierIds(product: Product): string[] {
  if (product.sources_?.length) {
    return [...new Set(product.sources_.map(s => s.supplierId).filter(Boolean))]
  }
  return product.supplierIds_ ?? []
}
