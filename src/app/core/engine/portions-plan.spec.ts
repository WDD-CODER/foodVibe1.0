import { computeEventPlan } from './event-plan.engine'
import { computePortions } from './portions'
import {
  FIXTURE_IDS as ID,
  FIXTURE_UNITS,
  makeEvent,
  makeProduct,
  makeRecipe,
  productIng
} from './testing/event-plan.fixture'

describe('portions feed the engine (plan 441)', () => {
  it('a cocktail event gets portionsByItem from computePortions and a non-empty shopping list', () => {
    const tomato = makeProduct({
      _id: ID.tomato,
      nameHebrew: 'עגבנייה',
      baseUnit: 'kg',
      sources: [{ supplierId: ID.supplierA, price: 6 }]
    })
    const dish = makeRecipe({
      _id: ID.salad,
      nameHebrew: 'סלט',
      recipeType: 'dish',
      yieldAmount: 1,
      yieldUnit: 'portion',
      ingredients: [productIng(ID.tomato, 100, 'gram', 'עגבנייה')]
    })
    const base = makeEvent([{ recipeId: ID.salad, derivedPortions: 0 }])
    const event = {
      ...base,
      guestCount: 50,
      eventTypeSnapshot: { key: 'פרטי', name: 'פרטי', coefficient: 1.15 },
      servingTypeSnapshot: { key: 'cocktail_passed', name: 'קוקטייל', coefficient: 3 },
      sections: base.sections.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i, portionsPerDiner: 1 })) }))
    }
    const portions = computePortions(event, [dish])
    expect(portions.get(`${ID.section}|0`)?.portions).toBe(173)

    const portionsByItem = new Map([...portions].map(([key, p]) => [key, p.portions]))
    const plan = computeEventPlan({ event, portionsByItem, products: [tomato], recipes: [dish], units: FIXTURE_UNITS })
    expect(plan.rawLines.length).toBeGreaterThan(0)
  })
})
