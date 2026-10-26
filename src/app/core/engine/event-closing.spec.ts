import type { EventClosing, PlanSnapshot } from '@models/menu-event.model'
import { computeClosingResult, initClosing, supplierVariance } from './event-closing'

/** Spec 08.1 acceptance numbers: revenue 10,000; suppliers A planned 1,000 and B planned 2,000; extra 1,000. */
const snapshot: PlanSnapshot = {
  at: 1,
  suppliers: [
    { supplierId: 'a', name: 'A', plannedCost: 1000 },
    { supplierId: 'b', name: 'B', plannedCost: 2000 }
  ],
  extraCosts: 1000,
  plannedRevenue: 10000,
  plannedProfit: 6000,
  plannedProfitPct: 60
}

function closingWith(actualA?: number, actualB?: number, extra?: number): EventClosing {
  const closing = initClosing(snapshot)
  closing.suppliers[0].actualPaid = actualA
  closing.suppliers[1].actualPaid = actualB
  if (extra !== undefined) closing.actualExtraCosts = extra
  return closing
}

describe('initClosing', () => {
  it('makes one untouched row per snapshot supplier', () => {
    expect(initClosing(snapshot).suppliers).toEqual([
      { supplierId: 'a', name: 'A', planned: 1000, arrived: false, hasInvoice: false, photos: [] },
      { supplierId: 'b', name: 'B', planned: 2000, arrived: false, hasInvoice: false, photos: [] }
    ])
  })
})

describe('supplierVariance', () => {
  it('flags 15 % over a 10 % threshold', () => {
    const v = supplierVariance(1000, 1150, 10)
    expect(v.kind).toBe('over')
    expect(v.pct).toBeCloseTo(15, 9)
    expect(v.diff).toBe(150)
  })

  it('shows a decrease as "under" with its minus percent', () => {
    const v = supplierVariance(2000, 1950, 10)
    expect(v.kind).toBe('under')
    expect(v.pct).toBeCloseTo(-2.5, 9)
    expect(v.diff).toBe(-50)
  })

  it('does not flag 8 % when the threshold is 10 %', () => {
    expect(supplierVariance(1000, 1080, 10).kind).toBe('within')
  })

  it('exactly the threshold is still within', () => {
    expect(supplierVariance(1000, 1100, 10).kind).toBe('within')
  })

  it('planned 0 gives the amount only', () => {
    expect(supplierVariance(0, 300, 10)).toEqual({ kind: 'none', pct: null, diff: 300 })
  })

  it('nothing typed gives nothing to compare', () => {
    expect(supplierVariance(1000, undefined, 10)).toEqual({ kind: 'none', pct: null, diff: 0 })
  })
})

describe('computeClosingResult', () => {
  it('with nothing typed, the result equals the plan', () => {
    const r = computeClosingResult(snapshot, initClosing(snapshot))
    expect(r.actualProfit).toBe(6000)
    expect(r.actualProfitPct).toBeCloseTo(60, 9)
    expect(r.plannedProfit).toBe(6000)
    expect(r.plannedProfitPct).toBe(60)
    expect(r.accuracyPts).toBeCloseTo(0, 9)
  })

  it('actual A 1,150, B 1,950, extra 1,000 gives profit 5,900, 59 %, accuracy -1 point', () => {
    const r = computeClosingResult(snapshot, closingWith(1150, 1950, 1000))
    expect(r.actualCosts).toBe(4100)
    expect(r.actualProfit).toBe(5900)
    expect(r.actualProfitPct).toBeCloseTo(59, 9)
    expect(r.profitDiff).toBe(-100)
    expect(r.accuracyPts).toBeCloseTo(-1, 9)
    expect(r.missingAmounts).toBe(0)
    expect(r.partial).toBe(false)
  })

  it('B left empty counts as planned (2,000) and the result is partial', () => {
    const r = computeClosingResult(snapshot, closingWith(1150, undefined, 1000))
    expect(r.actualCosts).toBe(4150)
    expect(r.actualProfit).toBe(5850)
    expect(r.partial).toBe(true)
    expect(r.missingAmounts).toBe(1)
  })

  it('a manually added supplier with planned 0 adds its actual amount', () => {
    const closing = closingWith(1000, 2000)
    closing.suppliers.push({
      supplierId: 'c',
      name: 'C',
      planned: 0,
      actualPaid: 300,
      arrived: false,
      hasInvoice: false,
      photos: []
    })
    const r = computeClosingResult(snapshot, closing)
    expect(r.actualProfit).toBe(5700)
    expect(r.missingAmounts).toBe(0)
  })

  it('a row planned at 0 and left empty is not a missing amount', () => {
    const closing = closingWith(1000, 2000)
    closing.suppliers.push({
      supplierId: null,
      name: 'no supplier',
      planned: 0,
      arrived: false,
      hasInvoice: false,
      photos: []
    })
    expect(computeClosingResult(snapshot, closing).missingAmounts).toBe(0)
  })

  it('uses the typed revenue and extra costs', () => {
    const closing = { ...closingWith(1000, 2000), actualRevenue: 12000, actualExtraCosts: 500 }
    const r = computeClosingResult(snapshot, closing)
    expect(r.actualProfit).toBe(8500)
    expect(r.actualProfitPct).toBeCloseTo((8500 / 12000) * 100, 9)
  })

  it('has no percent or accuracy when the revenue is 0', () => {
    const r = computeClosingResult(
      { ...snapshot, plannedRevenue: 0, plannedProfitPct: 0 },
      { ...initClosing(snapshot), actualRevenue: 0 }
    )
    expect(r.actualProfitPct).toBeNull()
    expect(r.accuracyPts).toBeNull()
  })
})
