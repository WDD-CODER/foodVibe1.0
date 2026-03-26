import { Product } from '@models/product.model'
import { UnitRegistryService } from '@services/unit-registry.service'

/** Units available for a product: base_unit + unique purchase option symbols. */
export function getProductUnits(product: Product): string[] {
  const base = product.base_unit_ || 'unit'
  const fromOptions = (product.purchase_options_ || []).map(o => o.unit_symbol_).filter(Boolean)
  return [...new Set([base, ...fromOptions])]
}

/**
 * Price per 1 of the given display unit.
 * Converts from buy_price_global_ (stored per base_unit) using purchase option rates
 * or unit-registry conversions as fallback.
 */
export function getPricePerUnit(
  product: Product,
  unit: string,
  unitRegistry: UnitRegistryService
): number {
  const base = product.base_unit_ || 'unit'
  if (unit === base) return product.buy_price_global_ ?? 0
  const opt = (product.purchase_options_ || []).find(o => o.unit_symbol_ === unit)
  if (opt?.conversion_rate_) {
    return (product.buy_price_global_ ?? 0) * opt.conversion_rate_
  }
  const baseConv = unitRegistry.getConversion(base)
  const unitConv = unitRegistry.getConversion(unit)
  if (baseConv && unitConv) {
    return (product.buy_price_global_ ?? 0) * (unitConv / baseConv)
  }
  return product.buy_price_global_ ?? 0
}

/**
 * Convert a price entered in displayUnit back to buy_price_global_ (per base_unit).
 * Inverse of getPricePerUnit: display-unit price → base-unit price.
 */
export function calcBuyPriceGlobal(
  product: Product,
  displayUnit: string,
  pricePerUnit: number,
  unitRegistry: UnitRegistryService
): number {
  const base = product.base_unit_ || 'unit'
  if (displayUnit === base) return pricePerUnit
  const opt = (product.purchase_options_ || []).find(o => o.unit_symbol_ === displayUnit)
  if (opt?.conversion_rate_) {
    return pricePerUnit / opt.conversion_rate_
  }
  const baseConv = unitRegistry.getConversion(base)
  const unitConv = unitRegistry.getConversion(displayUnit)
  if (baseConv && unitConv) return pricePerUnit * (baseConv / unitConv)
  return pricePerUnit
}
