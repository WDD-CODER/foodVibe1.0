/** Plan 633 (C-DIAG): the margin report. Pure and rule-based (no model writes into it); shared by the server and the browser. */
export interface MarginMenuRow { name: string; sellPrice: number; dishId?: string }
export interface MarginVolatilityRow { productId: string; supplierId: string; movePct: number; points: number }
export interface MarginDish {
  name: string
  sellPrice: number
  netPrice: number
  cost?: number
  marginPct?: number
  underTarget: boolean
  suggestedPrice?: number
}
export interface MarginFinding { key: string; value: number | { productId: string; supplierId: string; movePct: number }; evidenceCount: number }
export interface MarginReportInput {
  menu: MarginMenuRow[]
  costByDishId: Record<string, number | undefined>
  volatility: MarginVolatilityRow[]
  settings: { profitTargetPct: number; priceRiseAlertPct?: number }
  pricesIncludeVat: boolean
  vatPct: number
}

const round2 = (n: number): number => Math.round(n * 100) / 100

export function buildMarginReport(input: MarginReportInput): { dishes: MarginDish[]; findings: MarginFinding[] } {
  const { menu, costByDishId, volatility, settings, pricesIncludeVat, vatPct } = input
  const target = settings.profitTargetPct
  const dishes: MarginDish[] = menu.map(row => {
    const netPrice = pricesIncludeVat ? row.sellPrice / (1 + vatPct / 100) : row.sellPrice
    const rawCost = row.dishId !== undefined ? costByDishId[row.dishId] : undefined
    const hasCost = typeof rawCost === 'number' && Number.isFinite(rawCost) && rawCost > 0
    const dish: MarginDish = { name: row.name, sellPrice: row.sellPrice, netPrice: round2(netPrice), underTarget: false }
    if (hasCost) {
      dish.cost = round2(rawCost)
      if (netPrice > 0) {
        const marginPct = ((netPrice - rawCost) / netPrice) * 100
        dish.marginPct = round2(marginPct)
        dish.underTarget = marginPct < target
      }
      if (target < 100) {
        const base = rawCost / (1 - target / 100)
        dish.suggestedPrice = round2(pricesIncludeVat ? base * (1 + vatPct / 100) : base)
      }
    }
    return dish
  })

  const findings: MarginFinding[] = []
  const withMargin = dishes.filter(d => d.marginPct !== undefined).length
  const under = dishes.filter(d => d.underTarget).length
  if (under > 0) findings.push({ key: 'dishes_under_target', value: under, evidenceCount: withMargin })
  const without = dishes.length - withMargin
  if (without > 0) findings.push({ key: 'dishes_without_cost', value: without, evidenceCount: dishes.length })
  const top = volatility[0]
  if (top && top.movePct > 0 && top.movePct >= (settings.priceRiseAlertPct ?? 5)) {
    findings.push({ key: 'top_price_move', value: { productId: top.productId, supplierId: top.supplierId, movePct: top.movePct }, evidenceCount: top.points })
  }
  return { dishes, findings }
}
