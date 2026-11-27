import type { MonthPlan } from '@schemas/entities'
import { bandOf, breakEven, dishPrice, monthFigures, monthInputOf, type FigureKey, type MonthInput } from './month-plan'

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
    expect(i.fixed).toEqual({ plan: null, actual: null, entered: 0, lines: 0 })
    expect(i.labour).toEqual({ plan: null, actual: null, estimate: false })
  })
})

describe('the actual column filled from the forecast (plan 759)', () => {
  const forecast = {
    revenue: { plan: 120000, actual: 100000 },
    labour: { plan: 40000, actual: null, estimate: false },
    fixed: { plan: 20000, actual: null, entered: 0, lines: 1 }
  }

  it('only revenue typed: food, labour and fixed come from the forecast and the derived rows use the mix', () => {
    const f = monthFigures(input(forecast))
    // The food forecast is the forecast column's own figure: forecast revenue × the 30% food target.
    expect(f.actual.revenue).toBe(100000)
    expect(f.actual.foodCost).toBe(36000)
    expect(f.actual.labour).toBe(40000)
    expect(f.actual.fixed).toBe(20000)
    expect(f.actual.primeCost).toBe(76000)
    expect(f.actual.profit).toBe(4000)
    expect(f.actual.roomForTeam).toBe(34000)
    expect(f.actual.breakEven).toBe(breakEven(60000, 36))
    expect(f.actual.partial).toBeFalse()
    expect(f.actual.fromTarget).toBeFalse()
    const marked: FigureKey[] = ['breakEven', 'fixed', 'foodCost', 'labour', 'primeCost', 'profit', 'roomForTeam']
    expect([...f.actual.fromForecast].sort()).toEqual(marked)
    // Filled figures are not entered.
    expect(f.completeness).toEqual({ entered: 1, of: 4 })
    expect(f.missing).toEqual(['foodCost', 'labour', 'fixed'])
    expect(f.plan.fromForecast).toEqual([])
  })

  it('every actual typed: nothing is marked, even when it equals the forecast', () => {
    const f = monthFigures(
      input({
        revenue: { plan: 100000, actual: 100000 },
        foodCost: { plan: null, actual: 30000 },
        labour: { plan: 40000, actual: 40000, estimate: false },
        fixed: { plan: 20000, actual: 20000, entered: 1, lines: 1 }
      })
    )
    expect(f.actual.fromForecast).toEqual([])
    expect(f.actual.profit).toBe(10000)
  })

  it('a derived row is marked only when one of its own parts is filled', () => {
    const f = monthFigures(
      input({
        revenue: { plan: 1, actual: 100000 },
        foodCost: { plan: null, actual: 30000 },
        labour: { plan: 40000, actual: null, estimate: false },
        fixed: { plan: 5, actual: 20000, entered: 1, lines: 1 }
      })
    )
    expect([...f.actual.fromForecast].sort()).toEqual(['breakEven', 'labour', 'primeCost', 'profit'])
  })

  it('no actual at all leaves the actual column empty', () => {
    const f = monthFigures(input({ ...forecast, revenue: { plan: 120000, actual: null } }))
    expect(f.actual.revenue).toBeNull()
    expect(f.actual.foodCost).toBeNull()
    expect(f.actual.labour).toBeNull()
    expect(f.actual.fixed).toBeNull()
    expect(f.actual.profit).toBeNull()
    expect(f.actual.fromForecast).toEqual([])
  })

  it('a typed 0 is an actual: it starts the fill and is not replaced', () => {
    const f = monthFigures(input({ ...forecast, revenue: { plan: 120000, actual: 0 } }))
    expect(f.actual.revenue).toBe(0)
    expect(f.actual.labour).toBe(40000)
    expect(f.actual.fromForecast).not.toContain('revenue')
  })

  it('each fixed line takes its own forecast: the sum is marked as partly from the forecast', () => {
    const line = (id: string, plan: number | null, actual: number | null) => ({ id, name: id, plan, actual })
    const fixed = monthInputOf({
      revenue: { plan: null, actual: null },
      targets: input().targets,
      vatRatePct: 18,
      dealerType: 'murshe',
      fixed: {
        mode: 'lines',
        lines: [line('a', 1000, null), line('b', 700, 500), line('c', null, null)],
        rough: { plan: null, actual: null }
      }
    } as unknown as MonthPlan).fixed
    const f = monthFigures(input({ fixed }))
    expect(f.actual.fixed).toBe(1500)
    expect(f.actual.fromForecast).toContain('fixed')
    // Typed completeness is unchanged by the fill.
    expect(f.missing).toEqual(['revenue', 'foodCost', 'labour'])
  })

  it('an input with neither forecast nor actual stays empty, listed and partial', () => {
    const f = monthFigures(input({ revenue: { plan: null, actual: 100000 } }))
    expect(f.actual.foodCost).toBeNull()
    expect(f.actual.labour).toBeNull()
    expect(f.actual.profit).toBe(100000)
    expect(f.actual.partial).toBeTrue()
    expect(f.actual.missing).toEqual(['foodCost', 'labour', 'fixed'])
    expect(f.actual.fromForecast).toEqual([])
  })
})

describe('monthInputOf fixed, labour and purchases (plan 729)', () => {
  const base = { revenue: { plan: null, actual: null }, targets: input().targets, vatRatePct: 18, dealerType: 'murshe' }
  const line = (id: string, plan: number | null, actual: number | null) => ({ id, name: id, plan, actual })
  const rough = { plan: 30000, actual: 31000 }

  it('lines mode sums only entered lines and counts entered of all', () => {
    const i = monthInputOf({
      ...base,
      fixed: { mode: 'lines', lines: [line('a', 100, 120), line('b', null, null), line('c', 50, 0)], rough }
    } as unknown as MonthPlan)
    expect(i.fixed).toEqual(jasmine.objectContaining({ plan: 150, actual: 120, entered: 2, lines: 3 }))
    expect(i.fixed.parts).toEqual([
      { plan: 100, actual: 120 },
      { plan: null, actual: null },
      { plan: 50, actual: 0 }
    ])
  })

  it('lines mode with every line null is null, not 0', () => {
    const i = monthInputOf({
      ...base,
      fixed: { mode: 'lines', lines: [line('a', null, null)], rough }
    } as unknown as MonthPlan)
    expect(i.fixed).toEqual(jasmine.objectContaining({ plan: null, actual: null, entered: 0, lines: 1 }))
  })

  it('rough mode uses only the rough total even when lines hold numbers', () => {
    const i = monthInputOf({
      ...base,
      fixed: { mode: 'rough', lines: [line('a', 100, 120)], rough }
    } as unknown as MonthPlan)
    expect(i.fixed).toEqual({ plan: 30000, actual: 31000, entered: 1, lines: 1 })
    const empty = monthInputOf({
      ...base,
      fixed: { mode: 'rough', lines: [line('a', 100, 120)], rough: { plan: null, actual: null } }
    } as unknown as MonthPlan)
    expect(empty.fixed).toEqual({ plan: null, actual: null, entered: 0, lines: 1 })
  })

  it('gross 10000 × 1.25 is 12500 and an estimate; employer mode is as typed and not an estimate', () => {
    const gross = monthInputOf({
      ...base,
      labour: { mode: 'gross', factor: 1.25, plan: null, actual: 10000 }
    } as unknown as MonthPlan)
    expect(gross.labour).toEqual({ plan: null, actual: 12500, estimate: true })
    const zero = monthInputOf({
      ...base,
      labour: { mode: 'gross', factor: 1.25, plan: null, actual: 0 }
    } as unknown as MonthPlan)
    expect(zero.labour.actual).toBe(0)
    const employer = monthInputOf({
      ...base,
      labour: { mode: 'employer', factor: 1.25, plan: 9000, actual: 10000 }
    } as unknown as MonthPlan)
    expect(employer.labour).toEqual({ plan: 9000, actual: 10000, estimate: false })
  })

  it('purchases are the actual food cost; the plan food cost stays null (target-based)', () => {
    const i = monthInputOf({ ...base, purchases: { actual: 4200 } } as unknown as MonthPlan)
    expect(i.foodCost).toEqual({ plan: null, actual: 4200 })
  })

  it('a month stored before this plan (no groups) still maps to null pairs', () => {
    const i = monthInputOf(base as unknown as MonthPlan)
    expect(i.foodCost).toEqual({ plan: null, actual: null })
    expect(i.labour).toEqual({ plan: null, actual: null, estimate: false })
    expect(i.fixed).toEqual({ plan: null, actual: null, entered: 0, lines: 0 })
  })
})
