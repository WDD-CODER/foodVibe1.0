/** Plan 749: the hover texts that say what a «חלקי» figure is missing. Pure; the caller passes `translate`. */
import type { FixedGroup } from '@schemas/month/month-rules'
import type { MissingKey } from '../../core/engine/month-plan'

type Translate = (key: string) => string

const MISSING_LABEL: Record<'plan' | 'actual', Record<MissingKey, string>> = {
  plan: {
    revenue: 'mp_missing_plan_revenue',
    foodCost: 'mp_missing_plan_food',
    labour: 'mp_missing_plan_labour',
    fixed: 'mp_missing_plan_fixed'
  },
  actual: {
    revenue: 'mp_missing_revenue',
    foodCost: 'mp_missing_food',
    labour: 'mp_missing_labour',
    fixed: 'mp_missing_fixed'
  }
}

/** «חסר: הכנסה בפועל, עלות צוות בפועל»; '' when nothing is missing. */
export function missingHint(missing: readonly MissingKey[], side: 'plan' | 'actual', translate: Translate): string {
  if (missing.length === 0) return ''
  const list = missing.map((key) => translate(MISSING_LABEL[side][key])).join(', ')
  return translate('mp_missing').replace('{{list}}', () => list)
}

/** «לא הוזנו בפועל: חשמל, מים»: the lines without an actual; '' in the estimated mode or when all are entered. */
export function unenteredLinesHint(fixed: FixedGroup, translate: Translate): string {
  if (fixed.mode !== 'lines') return ''
  const names = fixed.lines
    .filter((line) => line.actual === null)
    .map((line) =>
      line.starterKey ? translate(`mp_fixed_${line.starterKey}`) : line.name?.trim() || translate('mp_fixed_unnamed')
    )
  if (names.length === 0) return ''
  return translate('mp_fixed_missing_lines').replace('{{list}}', () => names.join(', '))
}
