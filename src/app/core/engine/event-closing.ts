import type { ClosingSupplier, EventClosing, PlanSnapshot } from '@models/menu-event.model'

/** Plan 446 (C-SNAPSHOT): overruns, actual profit and pricing accuracy. Pure: no rounding (display uses `formatMoney` / `formatPct1`). */

export type VarianceKind = 'over' | 'under' | 'within' | 'none'

export interface SupplierVariance {
  kind: VarianceKind
  /** Percent of the planned amount (negative for a decrease); null when there is nothing to compare */
  pct: number | null
  /** actual − planned */
  diff: number
}

export interface ClosingResult {
  actualRevenue: number
  actualCosts: number
  actualProfit: number
  actualProfitPct: number | null
  plannedProfit: number
  plannedProfitPct: number
  profitDiff: number
  /** actual profit % − planned profit % (points); null when either has no revenue */
  accuracyPts: number | null
  /** Rows with a planned amount and no typed payment */
  missingAmounts: number
  partial: boolean
}

/** One row per snapshot supplier: planned = its planned cost, nothing typed yet. */
export function initClosing(snapshot: PlanSnapshot): EventClosing {
  return {
    suppliers: snapshot.suppliers.map((s) => ({
      supplierId: s.supplierId,
      name: s.name,
      planned: s.plannedCost,
      arrived: false,
      hasInvoice: false,
      photos: []
    }))
  }
}

/**
 * Compares what was paid with the plan. Red ("over") only above the business threshold; a decrease is "under"
 * planned 0 or nothing typed gives "none" (amount only).
 */
export function supplierVariance(planned: number, actual: number | undefined, thresholdPct: number): SupplierVariance {
  if (actual === undefined) return { kind: 'none', pct: null, diff: 0 }
  const diff = actual - planned
  if (planned <= 0) return { kind: 'none', pct: null, diff }
  const pct = (diff / planned) * 100
  if (pct > thresholdPct) return { kind: 'over', pct, diff }
  if (diff < 0) return { kind: 'under', pct, diff }
  return { kind: 'within', pct, diff }
}

const isMissing = (row: ClosingSupplier): boolean => row.actualPaid === undefined && row.planned > 0

export function computeClosingResult(snapshot: PlanSnapshot, closing: EventClosing): ClosingResult {
  const actualRevenue = closing.actualRevenue ?? snapshot.plannedRevenue
  const supplierCosts = closing.suppliers.reduce((sum, row) => sum + (row.actualPaid ?? row.planned), 0)
  const actualCosts = supplierCosts + (closing.actualExtraCosts ?? snapshot.extraCosts)
  const actualProfit = actualRevenue - actualCosts
  const actualProfitPct = actualRevenue > 0 ? (actualProfit / actualRevenue) * 100 : null
  const hasPlannedPct = snapshot.plannedRevenue > 0
  const missingAmounts = closing.suppliers.filter(isMissing).length
  return {
    actualRevenue,
    actualCosts,
    actualProfit,
    actualProfitPct,
    plannedProfit: snapshot.plannedProfit,
    plannedProfitPct: snapshot.plannedProfitPct,
    profitDiff: actualProfit - snapshot.plannedProfit,
    accuracyPts: actualProfitPct !== null && hasPlannedPct ? actualProfitPct - snapshot.plannedProfitPct : null,
    missingAmounts,
    partial: missingAmounts > 0
  }
}
