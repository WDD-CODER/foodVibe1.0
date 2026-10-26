import type { MenuEvent } from '@models/menu-event.model'
import type { Recipe } from '@models/recipe.model'
import { UNIT_ALIASES, VOLUME_OR_WEIGHT_KEYS } from '../utils/recipe-cost.constants'
import { cleanFloat, roundPortions } from './rounding'

/** Contract C-PORTIONS (plan 440): the only place the portions of a menu item are computed. */
export type ItemPortions = { portions: number; coefficient: number; overridden: boolean; defaultCoefficient: number }

/** Float noise (126.49999999999999) is dropped before any rounding. */
function clean(n: number, decimals: number): number {
  return Number((n * 10 ** decimals).toPrecision(12))
}

/** Event type coefficient × serving type coefficient (a missing snapshot counts as 1.0). Not rounded. */
export function defaultCoefficient(event: MenuEvent): number {
  return (event.eventTypeSnapshot?.coefficient ?? 1) * (event.servingTypeSnapshot?.coefficient ?? 1)
}

/** A coefficient is a number above 0 with at most 2 decimals. */
export function isValidCoefficient(x: number): boolean {
  if (typeof x !== 'number' || !Number.isFinite(x) || x <= 0) return false
  const scaled = x * 100
  return Math.abs(Math.round(scaled) - scaled) < 1e-9
}

/** Display only: half-up to 2 decimals, no trailing zeros (1.265 -> '1.27', 1.1 -> '1.1', 1 -> '1'). */
export function formatCoefficient(x: number): string {
  return String(Math.round(clean(x, 2)) / 100)
}

/** A typed coefficient equals the default when both show the same 2-decimal value (1.27 matches 1.265). */
export function isDefaultCoefficient(value: number, fallback: number): boolean {
  return formatCoefficient(value) === formatCoefficient(fallback)
}

/** Weight or volume preparations are not whole portions; everything else (dishes, per-unit preparations) is. */
function isPortionUnitItem(recipeType: 'dish' | 'preparation', recipe: Recipe | undefined): boolean {
  if (recipeType === 'dish') return true
  if (!recipe) return true
  const unit = (recipe.yieldUnit ?? '').trim()
  return !VOLUME_OR_WEIGHT_KEYS.has(UNIT_ALIASES[unit] ?? unit)
}

/**
 * Portions of every item of an event, keyed `${section._id}|${itemIndex}`:
 * portionsPerDiner × guests × coefficient. The coefficient is the item's own override, else the event
 * type's times the serving type's. Portion-unit items are rounded up by `roundPortions`; weight and
 * volume preparations keep their decimals with float noise dropped by `cleanFloat` (display rounding is `formatQty`'s job).
 */
export function computePortions(event: MenuEvent, recipes: Recipe[]): Map<string, ItemPortions> {
  const out = new Map<string, ItemPortions>()
  const recipeById = new Map(recipes.map((r) => [r._id, r]))
  const guests = Math.max(0, event.guestCount ?? 0)
  const fallback = defaultCoefficient(event)
  for (const section of event.sections ?? []) {
    ;(section.items ?? []).forEach((item, index) => {
      const perDiner = item.portionsPerDiner ?? item.servingPortions ?? 1
      const override = item.coefficientOverride
      const overridden = override != null && override > 0 && !isDefaultCoefficient(override, fallback)
      const coefficient = overridden ? override : fallback
      const raw = perDiner * guests * coefficient
      const portions = isPortionUnitItem(item.recipeType, recipeById.get(item.recipeId))
        ? roundPortions(raw)
        : cleanFloat(raw)
      out.set(`${section._id}|${index}`, { portions, coefficient, overridden, defaultCoefficient: fallback })
    })
  }
  return out
}
