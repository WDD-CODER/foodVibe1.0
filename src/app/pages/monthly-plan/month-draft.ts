import type { MonthPlan } from '@schemas/entities'
import {
  MONTH_TARGET_KEYS,
  defaultFixed,
  defaultLabour,
  type FixedGroup,
  type LabourGroup,
  type MonthTargetKey
} from '@schemas/month/month-rules'
import { roundMoney } from '../../core/engine/rounding'

export type RevenueKey = 'plan' | 'actual'

/** What the page's boxes hold, saved or not. */
export interface Draft {
  revenue: Record<RevenueKey, number | null>
  targets: Record<MonthTargetKey, number | null>
  fixed: FixedGroup
  labour: LabourGroup
  purchases: number | null
}

/** Plan 749: staff cost is typed as gross pay; a stored employer total is divided back, so its cost stays the same. */
function grossLabourOf(labour: LabourGroup): LabourGroup {
  if (labour.mode !== 'employer') return { ...labour }
  const gross = (n: number | null): number | null => (n === null ? null : roundMoney(n / labour.factor))
  return { mode: 'gross', factor: labour.factor, plan: gross(labour.plan), actual: gross(labour.actual) }
}

/** A month stored before plan 729 shows the defaults; they are stored on its first save. */
export function draftOf(month: MonthPlan): Draft {
  return {
    revenue: { ...month.revenue },
    targets: { ...month.targets },
    fixed: structuredClone(month.fixed ?? defaultFixed()),
    labour: grossLabourOf(month.labour ?? defaultLabour()),
    purchases: month.purchases?.actual ?? null
  }
}

/** The month as typed right now: what the figures show. An emptied target box keeps the saved target. */
export function liveMonthOf(month: MonthPlan, draft: Draft): MonthPlan {
  const targets = { ...month.targets }
  for (const key of MONTH_TARGET_KEYS) targets[key] = draft.targets[key] ?? month.targets[key]
  return {
    ...month,
    revenue: { ...draft.revenue },
    targets,
    fixed: draft.fixed,
    labour: draft.labour,
    purchases: { actual: draft.purchases }
  }
}
