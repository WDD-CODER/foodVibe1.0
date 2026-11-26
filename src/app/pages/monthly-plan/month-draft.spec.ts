import type { MonthPlan } from '@schemas/entities'
import { defaultFixed, defaultLabour } from '@schemas/month/month-rules'
import { monthFigures, monthInputOf } from '../../core/engine/month-plan'
import { draftOf, liveMonthOf } from './month-draft'

const month = (over: Partial<MonthPlan> = {}): MonthPlan =>
  ({
    month: '2026-11',
    status: 'open',
    targets: { foodPct: 32, labourPct: 33, primePct: 65, fixedPct: 25, profitPct: 10 },
    vatRatePct: 18,
    dealerType: 'murshe',
    revenue: { plan: null, actual: null },
    fixed: defaultFixed(),
    labour: defaultLabour(),
    purchases: { actual: null },
    ...over
  }) as MonthPlan

describe('month draft (plan 749)', () => {
  it('reads a stored employer total as gross pay, divided by the factor', () => {
    const stored = month({ labour: { mode: 'employer', factor: 1.25, plan: 50000, actual: 62500 } })
    expect(draftOf(stored).labour).toEqual({ mode: 'gross', factor: 1.25, plan: 40000, actual: 50000 })
    // The stored month itself is not touched.
    expect(stored.labour!.mode).toBe('employer')
  })

  it('keeps the employer cost within one agora and an empty side empty', () => {
    const stored = month({ labour: { mode: 'employer', factor: 1.3, plan: null, actual: 10000 } })
    const draft = draftOf(stored)
    expect(draft.labour.plan).toBeNull()
    const live = monthInputOf(liveMonthOf(stored, draft)).labour
    expect(Math.abs(live.actual! - 10000)).toBeLessThanOrEqual(0.01)
  })

  it('keeps a gross labour group as it is', () => {
    const labour = { mode: 'gross' as const, factor: 1.4, plan: 100, actual: null }
    expect(draftOf(month({ labour })).labour).toEqual(labour)
  })

  it('shows the defaults for a month stored without groups', () => {
    const older = month()
    delete older.fixed
    delete older.labour
    delete older.purchases
    const draft = draftOf(older)
    expect(draft.fixed).toEqual(defaultFixed())
    expect(draft.labour).toEqual(defaultLabour())
    expect(draft.purchases).toBeNull()
  })

  it('builds the live month from the typed revenue, purchases, fixed costs and labour', () => {
    const stored = month({ revenue: { plan: 1, actual: null } })
    const draft = draftOf(stored)
    draft.revenue = { plan: 100000, actual: 90000 }
    draft.purchases = 30000
    draft.fixed = { ...draft.fixed, mode: 'rough', rough: { plan: null, actual: 20000 } }
    draft.labour = { mode: 'gross', factor: 1.25, plan: null, actual: 16000 }
    const live = liveMonthOf(stored, draft)
    expect(live.revenue).toEqual({ plan: 100000, actual: 90000 })
    expect(live.purchases).toEqual({ actual: 30000 })
    expect(live.fixed).toEqual(draft.fixed)
    expect(live.labour).toEqual(draft.labour)
    expect(monthFigures(monthInputOf(live)).actual.profit).toBe(20000)
    expect(stored.revenue).toEqual({ plan: 1, actual: null })
  })

  it('falls back to the saved target for an empty target box', () => {
    const stored = month({ revenue: { plan: 100000, actual: null } })
    const draft = draftOf(stored)
    draft.targets = { ...draft.targets, foodPct: null, profitPct: 8 }
    const live = liveMonthOf(stored, draft)
    expect(live.targets.foodPct).toBe(32)
    expect(live.targets.profitPct).toBe(8)
    expect(monthFigures(monthInputOf(live)).plan.foodCost).toBe(32000)
  })
})
