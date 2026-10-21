import { TestBed } from '@angular/core/testing'
import { computeEventPlan } from '../engine/event-plan.engine'
import { EventPlanService } from '../engine/event-plan.service'
import { FIXTURE_SUPPLIERS, buildFixtureInput } from '../engine/testing/event-plan.fixture'
import { BusinessService } from './business.service'
import { KitchenStateService } from './kitchen-state.service'
import { PlanSnapshotService } from './plan-snapshot.service'
import { TranslationService } from './translation.service'

describe('PlanSnapshotService', () => {
  const input = buildFixtureInput()
  const plan = computeEventPlan(input)
  let planFor: jasmine.Spy

  beforeEach(() => {
    planFor = jasmine.createSpy('planFor').and.returnValue(plan)
    TestBed.configureTestingModule({
      providers: [
        { provide: EventPlanService, useValue: { planFor } },
        {
          provide: KitchenStateService,
          useValue: {
            recipes_: () => [],
            productsById_: () => new Map(input.products.map((p) => [p._id, p])),
            suppliersById_: () => new Map(FIXTURE_SUPPLIERS.map((s) => [s._id, s]))
          }
        },
        { provide: BusinessService, useValue: { business_: () => null } },
        {
          provide: TranslationService,
          useValue: { translate: (key: string) => (key === 'no_supplier' ? 'ללא ספק' : key) }
        }
      ]
    })
  })

  it('builds one row per supplier order card, adding up to the event food cost', () => {
    const snapshot = TestBed.inject(PlanSnapshotService).buildFor(input.event)
    expect(planFor).toHaveBeenCalledWith(input.event)
    expect(snapshot.suppliers.find((s) => s.name === 'ירקן')?.plannedCost).toBeCloseTo(157.75, 2)
    expect(snapshot.suppliers.some((s) => s.supplierId === null && s.name === 'ללא ספק')).toBeTrue()
    const total = snapshot.suppliers.reduce((sum, s) => sum + s.plannedCost, 0)
    expect(total).toBeCloseTo(plan.eventFoodCost, 6)
    expect(snapshot.frozenAt).toBeUndefined()
    expect(snapshot.at).toBeGreaterThan(0)
  })

  it('uses the live plan it is given instead of running the engine again', () => {
    const snapshot = TestBed.inject(PlanSnapshotService).buildFor(input.event, plan)
    expect(planFor).not.toHaveBeenCalled()
    expect(snapshot.suppliers.length).toBeGreaterThan(0)
  })

  it('runs the engine when the plan it is given has no raw lines', () => {
    TestBed.inject(PlanSnapshotService).buildFor(input.event, { eventFoodCost: 1, partial: false })
    expect(planFor).toHaveBeenCalledTimes(1)
  })
})
