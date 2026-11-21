/** Plan 633 (C-DIAG): how far each product's price moved inside a period. Pure; shared by the server and the browser. */
export interface VolatilityInputRow { productId: string; supplierId: string; price: number }
export interface VolatilityRow { productId: string; supplierId: string; min: number; max: number; movePct: number; points: number }

const round2 = (n: number): number => Math.round(n * 100) / 100

/** One row per (productId, supplierId) with at least two points and a minimum above 0, largest move first. */
export function priceVolatility(rows: VolatilityInputRow[], limit = 200): VolatilityRow[] {
  const groups = new Map<string, { productId: string; supplierId: string; min: number; max: number; points: number }>()
  for (const r of rows) {
    if (typeof r.price !== 'number' || !Number.isFinite(r.price)) continue
    const supplierId = r.supplierId ?? ''
    const key = `${r.productId}\u0000${supplierId}`
    const g = groups.get(key)
    if (!g) groups.set(key, { productId: r.productId, supplierId, min: r.price, max: r.price, points: 1 })
    else {
      g.min = Math.min(g.min, r.price)
      g.max = Math.max(g.max, r.price)
      g.points += 1
    }
  }
  const out: VolatilityRow[] = []
  for (const g of groups.values()) {
    if (g.points < 2 || !(g.min > 0)) continue
    out.push({ productId: g.productId, supplierId: g.supplierId, min: g.min, max: g.max, movePct: round2(((g.max - g.min) / g.min) * 100), points: g.points })
  }
  out.sort((a, b) => b.movePct - a.movePct || (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0))
  return out.slice(0, Math.max(0, limit))
}
