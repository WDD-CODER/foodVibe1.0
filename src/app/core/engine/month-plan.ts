/**
 * Monthly counterpart of C-PRICING (`event-pricing.ts`): the only place a month's profit, prime cost, break-even and
 * recommended dish price are computed. Pure, no Angular. A `null` input is "not entered" (N-M2), never a silent 0.
 */
import type { MonthPlan } from '@schemas/entities'
import { MONTH_TARGET_BANDS, type MonthTargetKey } from '@schemas/month/month-rules'
import { roundMoney } from './rounding'

export type MonthTargets = Record<MonthTargetKey, number>
export interface Pair {
  plan: number | null
  actual: number | null
}
export interface MonthInput {
  revenue: Pair
  foodCost: Pair
  labour: Pair & { estimate: boolean }
  fixed: Pair & { entered: number; lines: number }
  targets: MonthTargets
  vatRatePct: number
  dealerType: 'murshe' | 'patur'
}
export type MissingKey = 'revenue' | 'foodCost' | 'labour' | 'fixed'
export interface MonthColumn {
  revenue: number | null
  foodCost: number | null
  labour: number | null
  primeCost: number | null
  fixed: number | null
  profit: number | null
  roomForTeam: number | null
  breakEven: number | null
  foodPct: number | null
  labourPct: number | null
  primePct: number | null
  fixedPct: number | null
  profitPct: number | null
  /** The food cost came from `revenue × food target` (plan column only). */
  fromTarget: boolean
  /** Some input a figure rests on is not entered. */
  partial: boolean
  missing: MissingKey[]
}
export interface MonthFigures {
  plan: MonthColumn
  actual: MonthColumn
  completeness: { entered: number; of: 4 }
  /** The actual inputs that are not entered. */
  missing: MissingKey[]
}
export type Band = 'below' | 'in' | 'above'

const nullPair = (): Pair => ({ plan: null, actual: null })

export function monthInputOf(month: MonthPlan): MonthInput {
  return {
    revenue: { plan: month.revenue.plan, actual: month.revenue.actual },
    foodCost: nullPair(),
    labour: { ...nullPair(), estimate: false },
    fixed: { ...nullPair(), entered: 0, lines: 0 },
    targets: { ...month.targets },
    vatRatePct: month.vatRatePct,
    dealerType: month.dealerType
  }
}

const pct1 = (n: number): number => Math.round(n * 10) / 10
const money = (n: number | null): number | null => (n === null ? null : roundMoney(n))
const sum = (...values: (number | null)[]): number | null =>
  values.every((v) => v === null) ? null : values.reduce<number>((s, v) => s + (v ?? 0), 0)

/** Fixed costs ÷ (1 − variable %); `null` when the variable share is 100% or more. */
export function breakEven(fixedCosts: number, variablePct: number): number | null {
  if (variablePct >= 100) return null
  return roundMoney(fixedCosts / (1 - variablePct / 100))
}

function column(
  revenue: number | null,
  foodCost: number | null,
  labour: number | null,
  fixed: number | null,
  targets: MonthTargets,
  fromTarget: boolean
): MonthColumn {
  const missing: MissingKey[] = []
  if (revenue === null) missing.push('revenue')
  if (foodCost === null) missing.push('foodCost')
  if (labour === null) missing.push('labour')
  if (fixed === null) missing.push('fixed')
  const primeCost = sum(foodCost, labour)
  const profit =
    sum(revenue, foodCost, labour, fixed) === null
      ? null
      : (revenue ?? 0) - (foodCost ?? 0) - (labour ?? 0) - (fixed ?? 0)
  const roomForTeam =
    revenue === null ? null : revenue - (foodCost ?? 0) - (fixed ?? 0) - (revenue * targets.profitPct) / 100
  const ofRevenue = (v: number | null): number | null =>
    v === null || revenue === null || revenue === 0 ? null : pct1((v / revenue) * 100)
  const foodPct = ofRevenue(foodCost)
  const fixedCosts = sum(fixed, labour)
  return {
    revenue: money(revenue),
    foodCost: money(foodCost),
    labour: money(labour),
    primeCost: money(primeCost),
    fixed: money(fixed),
    profit: money(profit),
    roomForTeam: money(roomForTeam),
    breakEven: fixedCosts === null ? null : breakEven(fixedCosts, foodPct ?? targets.foodPct),
    foodPct,
    labourPct: ofRevenue(labour),
    primePct: ofRevenue(primeCost),
    fixedPct: ofRevenue(fixed),
    profitPct: ofRevenue(profit),
    fromTarget,
    partial: missing.length > 0,
    missing
  }
}

export function monthFigures(input: MonthInput): MonthFigures {
  const { revenue, foodCost, labour, fixed, targets } = input
  const fromTarget = foodCost.plan === null && revenue.plan !== null
  const planFood = foodCost.plan ?? (revenue.plan === null ? null : (revenue.plan * targets.foodPct) / 100)
  const plan = column(revenue.plan, planFood, labour.plan, fixed.plan, targets, fromTarget)
  const actual = column(revenue.actual, foodCost.actual, labour.actual, fixed.actual, targets, false)
  return { plan, actual, completeness: { entered: 4 - actual.missing.length, of: 4 }, missing: actual.missing }
}

export function bandOf(key: MonthTargetKey, pct: number | null): Band | null {
  if (pct === null) return null
  const [from, to] = MONTH_TARGET_BANDS[key]
  if (from !== null && pct < from) return 'below'
  return pct > to ? 'above' : 'in'
}

/** Menu price that keeps the food target: net, and with VAT for a `murshe` dealer (`patur` charges none). */
export function dishPrice(
  plateCost: number | null,
  foodTargetPct: number,
  vatRatePct: number,
  dealerType: 'murshe' | 'patur'
): { net: number; gross: number } | null {
  if (plateCost === null || !(foodTargetPct > 0)) return null
  const net = plateCost / (foodTargetPct / 100)
  const gross = dealerType === 'murshe' ? net * (1 + vatRatePct / 100) : net
  return { net: roundMoney(net), gross: roundMoney(gross) }
}
