import type { Product, PurchaseOption_ } from '@models/product.model'
import type { UnitRegistryService } from '@services/unit-registry.service'

/**
 * Plan 423 — how many of the product's BASE unit one purchase unit holds.
 * `conversionRate` is typed relative to the option's own «:» unit (`uom`), so
 * "1 jar = 500 : gram" on a kg product reads as 0.5 kg. A missing or equal `uom`
 * means the rate is already in the base unit.
 */
export function optionRateInBase(
  product: Pick<Product, 'baseUnit'>,
  opt: Pick<PurchaseOption_, 'conversionRate' | 'uom'>,
  registry: Pick<UnitRegistryService, 'getConversion'>
): number {
  const base = product.baseUnit || 'gram'
  const rate = opt.conversionRate
  if (!opt.uom || opt.uom === base) return rate
  const baseFactor = registry.getConversion(base) || 1
  const uomFactor = registry.getConversion(opt.uom) || 1
  return (rate * uomFactor) / baseFactor
}
