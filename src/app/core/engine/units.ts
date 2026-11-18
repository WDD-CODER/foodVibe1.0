import type { Recipe } from '@models/recipe.model'
import { convertWithinFamily, normalizeUnit } from '@schemas/units/to-base'
import type { UnitConversion } from './event-plan.types'

// Plan 635: the unit rule lives in the shared package; the browser re-exports it (one rule, no copy).
export { normalizeUnit, unitFamily, toBase } from '@schemas/units/to-base'
export type { UnitFamily } from '@schemas/units/to-base'

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
