import { Product } from '@models/product.model'

export type ProductValidationStatus = 'invalid' | 'incomplete' | 'valid'

/** RED: missing name_hebrew or base_unit_ — product cannot be used in calculations. */
export function getProductValidationStatus(product: Product): ProductValidationStatus {
  if (!product.name_hebrew || !product.base_unit_) return 'invalid'
  if (
    !product.buy_price_global_ ||
    !product.categories_?.length ||
    !product.supplierIds_?.length
  ) return 'incomplete'
  return 'valid'
}

/** Returns i18n keys for every missing field (used to populate tooltip chips). */
export function getProductMissingFields(product: Product): string[] {
  const fields: string[] = []
  if (!product.name_hebrew)             fields.push('missing_name')
  if (!product.base_unit_)              fields.push('missing_unit')
  if (!product.buy_price_global_)       fields.push('missing_price')
  if (!product.categories_?.length)     fields.push('missing_category')
  if (!product.supplierIds_?.length)    fields.push('missing_supplier')
  return fields
}
