import type { ScalingRule } from '@models/equipment.model'

/** The loading-rule fields of an equipment form (the full form and the list's quick-edit popup share them). */
export interface ScalingRuleValues {
  scalingEnabled?: unknown
  perGuests?: unknown
  minQuantity?: unknown
  maxQuantity?: unknown
}

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || v === ''
}

/** The rule to store: on = the three numbers; off on an item that had one = `perGuests: 0` (a PUT keeps a field left out). */
export function scalingRuleFrom(values: ScalingRuleValues, hadRule: boolean): ScalingRule | undefined {
  if (values.scalingEnabled) {
    return {
      perGuests: Number(values.perGuests),
      minQuantity: Number(values.minQuantity),
      ...(!isBlank(values.maxQuantity) && { maxQuantity: Number(values.maxQuantity) })
    }
  }
  return hadRule ? { perGuests: 0, minQuantity: 0 } : undefined
}

/** Field name -> dictionary key; empty when the rule is off or valid. */
export function scalingRuleErrors(values: ScalingRuleValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!values.scalingEnabled) return errors
  const per = Number(values.perGuests)
  if (isBlank(values.perGuests) || !Number.isInteger(per) || per < 1)
    errors['perGuests'] = 'scaling_per_guests_required'
  const min = Number(values.minQuantity)
  if (isBlank(values.minQuantity) || !Number.isFinite(min) || min < 0) errors['minQuantity'] = 'scaling_min_required'
  else if (!isBlank(values.maxQuantity) && Number(values.maxQuantity) < min)
    errors['maxQuantity'] = 'scaling_max_below_min'
  return errors
}
