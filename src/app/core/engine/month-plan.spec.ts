import type { MonthPlan } from '@schemas/entities'
import { bandOf, breakEven, dishPrice, monthFigures, monthInputOf, type MonthInput } from './month-plan'

const input = (over: Partial<MonthInput> = {}): MonthInput => ({
  revenue: { plan: null, actual: null },
  foodCost: { plan: null, actual: null },
  labour: { plan: null, actual: null, estimate: false },
  fixed: { plan: null, actual: null, entered: 0, lines: 0 },
  targets: { foodPct: 30, labourPct: 33, primePct: 63, fixedPct: 25, profitPct: 10 },
  vatRatePct: 18,
  dealerType: 'murshe',
  ...over
})

describe('month-plan engine (plan 728)', () => {
  it('break-even: 4000 fixed at 30% variable is 5714.29', () => {
    expect(breakEven(4000, 30)).toBe(5714.29)
  })

  it('food % of 100 or more gives no break-even', () => {
    expect(breakEven(4000, 100)).toBeNull()
    const f = monthFigures(
      input({
        revenue: { plan: 1000, actual: 1000 },
        foodCost: { plan: null, actual: 1200 },
        fixed: { plan: null, actual: 100, entered: 0, lines: 0 }
      })
    )
    expect(f.actual.breakEven).toBeNull()
  })

  it('dish price: plate 5.00 at 30% is 16.67 net, 19.67 with 18% VAT, patur 16.67', () => {
    expect(dishPrice(5, 30, 18, 'murshe')).toEqual({ net: 16.67, gross: 19.67 })
    expect(dishPrice(5, 30, 18, 'patur')).toEqual({ net: 16.67, gross: 16.67 })
    expect(dishPrice(5, 0, 18, 'murshe')).toBeNull()
    expect(dishPrice(null, 30, 18, 'murshe')).toBeNull()
  })

  it('null revenue makes every percent null', () => {
    const f = monthFigures(
      input({ foodCost: { plan: 10, actual: 10 }, labour: { plan: 5, actual: 5, estimate: false } })
    )
    for (const col of [f.plan, f.actual])
      expect([col.foodPct, col.labourPct, col.primePct, col.fixedPct, col.profitPct]).toEqual([
        null,
        null,
        null,
        null,
        null
      ])
  })

  it('an entered 0 counts as entered; revenue 0 gives null percents', () => {
    const f = monthFigures(input({ revenue: { plan: null, actual: 0 } }))
    expect(f.completeness).toEqual({ entered: 1, of: 4 })
    expect(f.missing).toEqual(['foodCost', 'labour', 'fixed'])
    expect(f.actual.revenue).toBe(0)
    expect(f.actual.foodPct).toBeNull()
  })

  it('a null input marks the column partial and is listed in missing', () => {
    const f = monthFigures(input({ revenue: { plan: 100000, actual: null } }))
    expect(f.completeness).toEqual({ entered: 0, of: 4 })
    expect(f.missing).toEqual(['revenue', 'foodCost', 'labour', 'fixed'])
    expect(f.actual.partial).toBeTrue()
    expect(f.actual.profit).toBeNull()
    expect(f.plan.partial).toBeTrue()
    expect(f.plan.foodCost).toBe(30000)
    expect(f.plan.fromTarget).toBeTrue()
    expect(f.plan.profit).toBe(70000)
  })

  it('prime cost, profit and room for the team from entered numbers', () => {
    const f = monthFigures(
      input({
        revenue: { plan: null, actual: 10000 },
        foodCost: { plan: null, actual: 3000 },
        labour: { plan: null, actual: 3500, estimate: false },
        fixed: { plan: null, actual: 2000, entered: 1, lines: 1 }
      })
    )
    expect(f.actual.primeCost).toBe(6500)
    expect(f.actual.profit).toBe(1500)
    expect(f.actual.profitPct).toBe(15)
    expect(f.actual.roomForTeam).toBe(4000)
    expect(f.actual.partial).toBeFalse()
    expect(f.completeness.entered).toBe(4)
  })

  it('bandOf uses the Israeli bands', () => {
    expect(bandOf('foodPct', 32)).toBe('in')
    expect(bandOf('foodPct', 28)).toBe('below')
    expect(bandOf('primePct', 70)).toBe('above')
    expect(bandOf('primePct', 10)).toBe('in')
    expect(bandOf('foodPct', null)).toBeNull()
  })

  it('monthInputOf maps the stored month with null cost pairs', () => {
    const month = {
      revenue: { plan: 5, actual: 0 },
      targets: input().targets,
      vatRatePct: 18,
      dealerType: 'patur'
    } as MonthPlan
    const i = monthInputOf(month)
    expect(i.revenue).toEqual({ plan: 5, actual: 0 })
    expect(i.foodCost).toEqual({ plan: null, actual: null })
    expect(i.dealerType).toBe('patur')
  })
})
