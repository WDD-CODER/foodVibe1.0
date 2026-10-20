import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'
import { optionRateInBase } from '../utils/purchase-option-rate.util'
import { MASS_UNITS, UNIT_ALIASES, VOLUME_UNITS } from '../utils/recipe-cost.constants'
import type { UnitConversion } from './event-plan.types'

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
function convertWithinFamily(amount: number, from: string, to: string, units: UnitConversion): number | null {
  const family = unitFamily(from)
  if ((family !== 'mass' && family !== 'volume') || family !== unitFamily(to)) return null
  const toRate = units.getConversion(to)
  if (!(toRate > 0)) return null
  return (amount * units.getConversion(from)) / toRate
}

/** The amount in the product's base unit, or null when the unit cannot be converted. */
export function toBase(
  amount: number,
  unit: string,
  product: Pick<Product, 'baseUnit' | 'purchaseOptions'>,
  units: UnitConversion
): number | null {
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

/** The amount in the prep's yield unit (its own yield conversions first), or null when it cannot be converted. */
export function toYield(
  amount: number,
  unit: string,
  prep: Pick<Recipe, 'yieldAmount' | 'yieldUnit' | 'yieldConversions'>,
  units: UnitConversion
): number | null {
  const u = (unit ?? '').trim().toLowerCase()
  const entry = prep.yieldConversions?.find((c) => (c?.unit ?? '').trim().toLowerCase() === u)
  if (entry != null && entry.amount > 0) return amount * ((prep.yieldAmount ?? 1) / entry.amount)
  const target = normalizeUnit(prep.yieldUnit || 'unit')
  const key = normalizeUnit(unit)
  if (key === target) return amount
  return convertWithinFamily(amount, key, target, units)
}
