import type { PlanSnapshot } from '@models/menu-event.model'
import { computeEventPlan } from './event-plan.engine'
import { FIXTURE_SUPPLIERS, buildFixtureInput } from './testing/event-plan.fixture'
import { buildSupplierOrders } from '../utils/supplier-orders.util'
import { buildPlanSnapshot, shouldRefreshOnSave, snapshotOnStageChange } from './plan-snapshot'

const pricing = { extraCost: 0, revenue: 1000, profit: 800, profitPct: 80 }
const open: PlanSnapshot = {
  at: 1,
  suppliers: [],
  extraCosts: 0,
  plannedRevenue: 0,
  plannedProfit: 0,
  plannedProfitPct: 0
}
const frozen: PlanSnapshot = { ...open, frozenAt: 2 }

describe('buildPlanSnapshot (plan-433 fixture)', () => {
  const input = buildFixtureInput()
  const plan = computeEventPlan(input)
  const orders = buildSupplierOrders(
    plan,
    new Map(input.products.map((p) => [p._id, p])),
    new Map(FIXTURE_SUPPLIERS.map((s) => [s._id, s])),
    (key) => (key === 'no_supplier' ? 'ללא ספק' : key)
  )
  const snapshot = buildPlanSnapshot(orders.cards, pricing, 123)

  it('has the greengrocer row and a "no supplier" row', () => {
    const greengrocer = snapshot.suppliers.find((s) => s.name === 'ירקן')
    expect(greengrocer?.plannedCost).toBeCloseTo(157.75, 2)
    expect(snapshot.suppliers.find((s) => s.supplierId === null)).toEqual({
      supplierId: null,
      name: 'ללא ספק',
      plannedCost: 0
    })
  })

  it('adds up to the food cost of the plan', () => {
    const total = snapshot.suppliers.reduce((sum, s) => sum + s.plannedCost, 0)
    expect(total).toBeCloseTo(plan.eventFoodCost, 6)
  })

  it('carries the pricing figures and the time', () => {
    expect(snapshot).toEqual(
      jasmine.objectContaining({
        at: 123,
        extraCosts: 0,
        plannedRevenue: 1000,
        plannedProfit: 800,
        plannedProfitPct: 80
      })
    )
    expect(snapshot.frozenAt).toBeUndefined()
  })

  it('stores 0 percent when the revenue is 0', () => {
    expect(buildPlanSnapshot([], { ...pricing, revenue: 0, profitPct: null }, 1).plannedProfitPct).toBe(0)
  })
})

describe('snapshotOnStageChange', () => {
  it('"ordering" with no snapshot stores', () => {
    expect(snapshotOnStageChange('ordering', undefined)).toBe('store')
    expect(snapshotOnStageChange('ordering', open)).toBe('store')
  })

  it('"execution" stores and freezes when there is none, else freezes', () => {
    expect(snapshotOnStageChange('execution', undefined)).toBe('store_and_freeze')
    expect(snapshotOnStageChange('execution', open)).toBe('freeze')
  })

  it('"post_production" with no snapshot stores and freezes', () => {
    expect(snapshotOnStageChange('post_production', undefined)).toBe('store_and_freeze')
  })

  it('any move while frozen does nothing, including back to "ordering"', () => {
    for (const stage of ['ordering', 'execution', 'post_production', 'quote_sent'] as const) {
      expect(snapshotOnStageChange(stage, frozen)).toBe('none')
    }
  })

  it('other stages do nothing', () => {
    expect(snapshotOnStageChange('quote_sent', undefined)).toBe('none')
    expect(snapshotOnStageChange('deposit_paid', open)).toBe('none')
    expect(snapshotOnStageChange('not_closed', undefined)).toBe('none')
  })
})

describe('shouldRefreshOnSave', () => {
  it('refreshes from "ordering" until frozen', () => {
    expect(shouldRefreshOnSave('ordering', undefined)).toBeTrue()
    expect(shouldRefreshOnSave('ordering', open)).toBeTrue()
    expect(shouldRefreshOnSave('ordering', frozen)).toBeFalse()
  })

  it('not before "ordering", and not for finished or lost events', () => {
    for (const stage of ['inquiry', 'quote_sent', 'deposit_paid', 'finished', 'not_closed'] as const) {
      expect(shouldRefreshOnSave(stage, undefined)).toBeFalse()
    }
    expect(shouldRefreshOnSave(undefined, undefined)).toBeFalse()
  })
})
