import { Product } from '@models/product.model'
import { UnitRegistryService } from '@services/unit-registry.service'
import { getEffectivePrice } from './product-source.util'

/** Units available for a product: base_unit + unique purchase option symbols. */
export function getProductUnits(product: Product): string[] {
  const base = product.baseUnit || 'unit'
  const fromOptions = (product.purchaseOptions || []).map((o) => o.unitSymbol).filter(Boolean)
  return [...new Set([base, ...fromOptions])]
}

/**
 * Price per 1 of the given display unit.
 * Converts from effective price (stored per base_unit) using purchase option rates
 * or unit-registry conversions as fallback.
 */
export function getPricePerUnit(product: Product, unit: string, unitRegistry: UnitRegistryService): number {
  const basePrice = getEffectivePrice(product)
  const base = product.baseUnit || 'unit'
  if (unit === base) return basePrice
  const opt = (product.purchaseOptions || []).find((o) => o.unitSymbol === unit)
  if (opt?.conversionRate) {
    return basePrice * opt.conversionRate
  }
  const baseConv = unitRegistry.getConversion(base)
  const unitConv = unitRegistry.getConversion(unit)
  if (baseConv && unitConv) {
    return basePrice * (unitConv / baseConv)
  }
  return basePrice
}

/**
 * Convert a price entered in displayUnit back to base-unit price.
 * Inverse of getPricePerUnit: display-unit price → base-unit price.
 */
export function calcBuyPriceGlobal(
  product: Product,
  displayUnit: string,
  pricePerUnit: number,
  unitRegistry: UnitRegistryService
): number {
  const base = product.baseUnit || 'unit'
  if (displayUnit === base) return pricePerUnit
  const opt = (product.purchaseOptions || []).find((o) => o.unitSymbol === displayUnit)
  if (opt?.conversionRate) {
    return pricePerUnit / opt.conversionRate
  }
  const baseConv = unitRegistry.getConversion(base)
  const unitConv = unitRegistry.getConversion(displayUnit)
  if (baseConv && unitConv) return pricePerUnit * (baseConv / unitConv)
  return pricePerUnit
}
