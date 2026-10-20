import { TestBed } from '@angular/core/testing'
import { KitchenStateService } from '@services/kitchen-state.service'
import { SYSTEM_UNITS, UnitRegistryService } from '@services/unit-registry.service'
import { computeEventPlan } from './event-plan.engine'
import { EventPlanService } from './event-plan.service'
import { FIXTURE_IDS as ID, buildFixtureInput } from './testing/event-plan.fixture'

describe('EventPlanService', () => {
  const input = buildFixtureInput()
  let service: EventPlanService

  beforeEach(() => {
    const kitchen = { products_: () => input.products, recipes_: () => input.recipes }
    const registry = {
      getConversion: (key: string): number => SYSTEM_UNITS[key] || 1,
      globalUnits_: () => ({ ...SYSTEM_UNITS })
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: KitchenStateService, useValue: kitchen },
        { provide: UnitRegistryService, useValue: registry }
      ]
    })
    service = TestBed.inject(EventPlanService)
  })

  it('planFor returns the same plan as the engine on the fixture input', () => {
    expect(service.planFor(input.event)).toEqual(computeEventPlan(input))
  })

  it('planFor accepts an unsaved event without an id', () => {
    const { _id, ...unsaved } = input.event
    expect(_id).toBe(ID.event)
    expect(service.planFor(unsaved).eventFoodCost).toBeCloseTo(157.75, 9)
  })

  it('costFor prices one dish alone', () => {
    const salad = service.costFor(ID.salad, 100)
    expect(salad.cost).toBeCloseTo(95.25, 9)
    expect(salad.partial).toBeTrue()
    const pasta = service.costFor(ID.pasta, 50)
    expect(pasta.cost).toBeCloseTo(62.5, 9)
    expect(pasta.partial).toBeFalse()
  })

  it('costFor flags an unknown recipe as partial', () => {
    expect(service.costFor('missing', 10)).toEqual({ cost: 0, partial: true })
  })
})
