import { Product } from '@models/product.model'
import { chooseSupplier } from '../engine/supplier-choice'

/**
 * Effective base price per base_unit: the one price rule (`chooseSupplier`) — the cheapest priced supplier,
 * else the no-supplier price — then the deprecated buy_price_global_.
 */
export function getEffectivePrice(product: Product, chosenSupplierId?: string | null): number {
  return chooseSupplier(product, chosenSupplierId).pricePerBaseUnit ?? product.buy_price_global_ ?? 0
}

/**
 * All unique supplier IDs from sources, falling back to deprecated supplierIds_.
 */
export function getSupplierIds(product: Product): string[] {
  if (product.sources?.length) {
    return [...new Set(product.sources.map((s) => s.supplierId).filter(Boolean))]
  }
  return product.supplierIds_ ?? []
}
