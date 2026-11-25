import { MONTH_TARGET_BANDS, type MonthTargetKey } from '@schemas/month/month-rules'

/** Plan 727: the five month targets in screen order, with the dictionary key of each label. */
export const MONTH_TARGET_FIELDS: readonly { key: MonthTargetKey; labelKey: string }[] = [
  { key: 'foodPct', labelKey: 'mp_target_food' },
  { key: 'labourPct', labelKey: 'mp_target_labour' },
  { key: 'primePct', labelKey: 'mp_target_prime' },
  { key: 'fixedPct', labelKey: 'mp_target_fixed' },
  { key: 'profitPct', labelKey: 'mp_target_profit' }
]

/** The band line under a target: «מקובל בישראל: 30–35%», or «עד 65%» when there is no lower bound. */
export function bandLine(translate: (key: string) => string, key: MonthTargetKey): string {
  const [from, to] = MONTH_TARGET_BANDS[key]
  if (from === null) return translate('mp_band_max').replace('{{to}}', String(to))
  return translate('mp_band').replace('{{from}}', String(from)).replace('{{to}}', String(to))
}

/** True when a typed value sits outside its Israeli band; an empty box is never outside. */
export function isOutOfBand(key: MonthTargetKey, value: number | null): boolean {
  if (value === null) return false
  const [from, to] = MONTH_TARGET_BANDS[key]
  return (from !== null && value < from) || value > to
}
