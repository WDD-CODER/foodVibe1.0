import { Product } from '@models/product.model'
import { getSupplierIds } from './product-source.util'

export type ProductValidationStatus = 'invalid' | 'incomplete' | 'valid'

/** Maps a missing-field key to its Lucide icon name. */
export const VALIDATION_FIELD_ICONS: Record<string, string> = {
  missing_name: 'type',
  missing_unit: 'ruler',
  missing_category: 'tag',
  missing_supplier: 'truck'
}

/**
 * True when no price > 0 exists anywhere: no supplier source price, no purchase-option price override
 * and no deprecated global price. A cost that uses such a product is partial ("לא סגור סופית").
 */
export function isProductUnpriced(product: Product): boolean {
  if ((product.sources ?? []).some((s) => s.price > 0)) return false
  if ((product.purchaseOptions ?? []).some((o) => (o.priceOverride ?? 0) > 0)) return false
  return !((product.buy_price_global_ ?? 0) > 0)
}

/**
 * Returns the validation tier for a product:
 * - `invalid`    → missing name or base unit (blocking — app cannot calculate with this product)
 * - `incomplete` → no category or no supplier (warning — works but data is degraded; a missing price is `isProductUnpriced`)
 * - `valid`      → all fields present
 */
export function getProductValidationStatus(product: Product): ProductValidationStatus {
  if (!product.nameHebrew?.trim() || !product.baseUnit?.trim()) return 'invalid'
  if (!product.categories?.length || !getSupplierIds(product).length) return 'incomplete'
  return 'valid'
}

/**
 * Returns an array of i18n keys for fields that are missing or zero.
 * Used to build tooltip chips on the validation badge.
 */
export function getProductMissingFields(product: Product): string[] {
  const missing: string[] = []
  if (!product.nameHebrew?.trim()) missing.push('missing_name')
  if (!product.baseUnit?.trim()) missing.push('missing_unit')
  if (!product.categories?.length) missing.push('missing_category')
  if (!getSupplierIds(product).length) missing.push('missing_supplier')
  return missing
}
