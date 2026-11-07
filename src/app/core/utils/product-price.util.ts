import { Product } from '@models/product.model'
import { UnitRegistryService } from '@services/unit-registry.service'
import { getEffectivePrice } from './product-source.util'
import { optionRateInBase } from './purchase-option-rate.util'

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
    return basePrice * optionRateInBase(product, opt, unitRegistry)
  }
  const baseConv = unitRegistry.getConversion(base)
  const unitConv = unitRegistry.getConversion(unit)
  if (baseConv && unitConv) {
    return basePrice * (unitConv / baseConv)
  }
  return basePrice
}
