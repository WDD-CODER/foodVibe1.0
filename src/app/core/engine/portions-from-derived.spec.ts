import { portionsFromDerived } from './portions-from-derived'
import { makeEvent } from './testing/event-plan.fixture'

describe('portionsFromDerived', () => {
  it('maps section id and item index to the stored derivedPortions', () => {
    const event = makeEvent([
      { recipeId: 'a', derivedPortions: 100 },
      { recipeId: 'b', derivedPortions: 50 }
    ])
    const map = portionsFromDerived(event)
    expect(map.get('sec-1|0')).toBe(100)
    expect(map.get('sec-1|1')).toBe(50)
    expect(map.size).toBe(2)
  })

  it('reads a missing derivedPortions as 0', () => {
    const event = makeEvent([{ recipeId: 'a', derivedPortions: 1 }])
    delete (event.sections[0].items[0] as Partial<(typeof event.sections)[0]['items'][0]>).derivedPortions
    expect(portionsFromDerived(event).get('sec-1|0')).toBe(0)
  })
})
