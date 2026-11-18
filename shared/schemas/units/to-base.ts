/**
 * Plan 635 — the one unit rule, shared by the browser (`@schemas/units/to-base`) and the server
 * (`server/generated/schemas/units/to-base`). Moved unchanged from the app's engine/utils files; no import from `src/app`.
 */

/** Normalizes unit keys for conversion lookup (e.g. 'gr' -> 'gram'). Includes Hebrew display names. */
export const UNIT_ALIASES: Record<string, string> = {
  gr: 'gram',
  grams: 'gram',
  g: 'gram',
  kg: 'kg',
  'ק"ג': 'kg',
  liter: 'liter',
  l: 'liter',
  ml: 'ml',
  unit: 'unit'
}

/** Units that have a direct conversion to grams in the registry (mass units). */
export const MASS_UNITS = new Set(['gram', 'gr', 'grams', 'g', 'kg'])

/** Units that have a direct conversion to milliliters in the registry (volume units). */
export const VOLUME_UNITS = new Set(['liter', 'l', 'ml', 'cup', 'tablespoon', 'teaspoon'])

/** System units: constant, non-removable, values never overwritten. */
export const SYSTEM_UNITS: Readonly<Record<string, number>> = {
  kg: 1000,
  liter: 1000,
  gram: 1,
  ml: 1,
  unit: 1,
  dish: 1,
  tablespoon: 15,
  teaspoon: 5,
  cup: 240,
  pinch: 1,
  portion: 1
}

export type UnitRates = { getConversion(key: string): number }

export type UnitProduct = {
  baseUnit?: string
  purchaseOptions?: { unitSymbol: string; conversionRate: number; uom?: string }[]
}

/**
 * Plan 423 — how many of the product's BASE unit one purchase unit holds.
 * `conversionRate` is typed relative to the option's own «:» unit (`uom`), so
 * "1 jar = 500 : gram" on a kg product reads as 0.5 kg. A missing or equal `uom`
 * means the rate is already in the base unit.
 */
export function optionRateInBase(
  product: { baseUnit?: string },
  opt: { conversionRate: number; uom?: string },
  registry: UnitRates
): number {
  const base = product.baseUnit || 'gram'
  const rate = opt.conversionRate
  if (!opt.uom || opt.uom === base) return rate
  const baseFactor = registry.getConversion(base) || 1
  const uomFactor = registry.getConversion(opt.uom) || 1
  return (rate * uomFactor) / baseFactor
}

export type UnitFamily = 'mass' | 'volume' | 'count' | 'custom'

export function normalizeUnit(unit: string): string {
  const u = (unit ?? '').trim()
  return UNIT_ALIASES[u] ?? u
}

export function unitFamily(unit: string): UnitFamily {
  const key = normalizeUnit(unit)
  if (MASS_UNITS.has(key)) return 'mass'
  if (VOLUME_UNITS.has(key)) return 'volume'
  if (key === 'unit') return 'count'
  return 'custom'
}

/** Same unit family (mass with mass, volume with volume) → amount in `to`; otherwise null. Never mass ↔ volume. */
export function convertWithinFamily(amount: number, from: string, to: string, units: UnitRates): number | null {
  const family = unitFamily(from)
  if ((family !== 'mass' && family !== 'volume') || family !== unitFamily(to)) return null
  const toRate = units.getConversion(to)
  if (!(toRate > 0)) return null
  return (amount * units.getConversion(from)) / toRate
}

/** The amount in the product's base unit, or null when the unit cannot be converted. */
export function toBase(amount: number, unit: string, product: UnitProduct, units: UnitRates): number | null {
  const base = normalizeUnit(product.baseUnit || 'gram')
  const key = normalizeUnit(unit)
  if (key === base) return amount
  const option = (product.purchaseOptions ?? []).find((o) => (o.unitSymbol ?? '').trim() === (unit ?? '').trim())
  if (option) {
    const rate = optionRateInBase(product, option, units)
    return rate > 0 ? amount * rate : null
  }
  return convertWithinFamily(amount, key, base, units)
}

/**
 * Unit rates from stored `unit` terms: a later term replaces an earlier one for the same key, the system units
 * replace both. An unknown key reads as 1 — the same rule as `UnitRegistryService.getConversion`.
 */
export function unitRatesFrom(terms: { key: string; gramRate: number }[]): UnitRates & { has(key: string): boolean } {
  const stored: Record<string, number> = {}
  for (const t of terms) stored[t.key] = t.gramRate
  const rates: Record<string, number> = { ...stored, ...SYSTEM_UNITS }
  return {
    getConversion: (key: string) => rates[key] || 1,
    has: (key: string) => key in rates
  }
}
