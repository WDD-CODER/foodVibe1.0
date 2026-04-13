import { Product } from '@models/product.model'
import { getEffectivePrice, getSupplierIds } from './product-source.util'

export type ProductValidationStatus = 'invalid' | 'incomplete' | 'valid'

/** Maps a missing-field key to its Lucide icon name. */
export const VALIDATION_FIELD_ICONS: Record<string, string> = {
  missing_name: 'type',
  missing_unit: 'ruler',
  missing_price: 'coins',
  missing_category: 'tag',
  missing_supplier: 'truck',
}

/**
 * Returns the validation tier for a product:
 * - `invalid`    → missing name or base unit (blocking — app cannot calculate with this product)
 * - `incomplete` → price = 0, no category, or no supplier (warning — works but data is degraded)
 * - `valid`      → all fields present
 */
export function getProductValidationStatus(product: Product): ProductValidationStatus {
  if (!product.name_hebrew?.trim() || !product.base_unit_?.trim()) return 'invalid'
  if (
    !getEffectivePrice(product) ||
    !product.categories_?.length ||
    !getSupplierIds(product).length
  ) return 'incomplete'
  return 'valid'
}

/**
 * Returns an array of i18n keys for fields that are missing or zero.
 * Used to build tooltip chips on the validation badge.
 */
export function getProductMissingFields(product: Product): string[] {
  const missing: string[] = []
  if (!product.name_hebrew?.trim()) missing.push('missing_name')
  if (!product.base_unit_?.trim()) missing.push('missing_unit')
  if (!getEffectivePrice(product)) missing.push('missing_price')
  if (!product.categories_?.length) missing.push('missing_category')
  if (!getSupplierIds(product).length) missing.push('missing_supplier')
  return missing
}
