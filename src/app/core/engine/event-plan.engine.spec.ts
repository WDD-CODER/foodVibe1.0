import { computeEventPlan } from './event-plan.engine'
import type { EventPlanInput, RawLine } from './event-plan.types'
import { formatQty } from './rounding'
import {
  FIXTURE_IDS as ID,
  buildFixtureInput,
  makeEvent,
  makeInput,
  makeProduct,
  makeRecipe,
  productIng,
  recipeIng
} from './testing/event-plan.fixture'

const line = (lines: RawLine[], productId: string): RawLine[] => lines.filter((l) => l.productId === productId)

describe('computeEventPlan', () => {
  describe('04.1 fixture', () => {
    const plan = computeEventPlan(buildFixtureInput())

    it('merges tomato from both dishes into one line with waste applied', () => {
      const tomato = line(plan.rawLines, ID.tomato)
      expect(tomato.length).toBe(1)
      expect(tomato[0].status).toBe('ok')
      expect(tomato[0].unit).toBe('kg')
      expect(tomato[0].netQty).toBeCloseTo(15, 9)
      expect(tomato[0].buyQty).toBeCloseTo(18.75, 9)
      expect(tomato[0].dishIds.sort()).toEqual([ID.pasta, ID.salad].sort())
    })

    it('expands the prep into oil and lemon, with no raw line for the prep itself', () => {
      expect(line(plan.rawLines, ID.oliveOil)[0].netQty).toBeCloseTo(1.6, 9)
      expect(line(plan.rawLines, ID.lemon)[0].netQty).toBeCloseTo(0.4, 9)
      expect(plan.rawLines.some((l) => l.name === 'רוטב')).toBeFalse()
      expect(plan.rawLines.length).toBe(3)
    })

    it('returns one prep line for the sauce, owned by the salad', () => {
      expect(plan.prepLines.length).toBe(1)
      const p = plan.prepLines[0]
      expect(p.prepId).toBe(ID.sauce)
      expect(p.name).toBe('רוטב')
      expect(p.qty).toBeCloseTo(2, 9)
      expect(p.unit).toBe('kg')
      expect(p.dishId).toBe(ID.salad)
      expect(p.source).toBe('prep')
      expect(p.station).toBe('')
    })

    it('chooses the cheaper supplier and prices each line', () => {
      const tomato = line(plan.rawLines, ID.tomato)[0]
      expect(tomato.supplierId).toBe(ID.supplierB)
      expect(tomato.lineCost).toBeCloseTo(93.75, 9)
      const oil = line(plan.rawLines, ID.oliveOil)[0]
      expect(oil.supplierId).toBe(ID.supplierB)
      expect(oil.lineCost).toBeCloseTo(64, 9)
    })

    it('leaves the unpriced lemon without a cost and marks the plan partial', () => {
      const lemon = line(plan.rawLines, ID.lemon)[0]
      expect(lemon.lineCost).toBeNull()
      expect(lemon.supplierId).toBeNull()
      expect(plan.partial).toBeTrue()
      expect(plan.missing.length).toBe(1)
      expect(plan.missing[0]).toEqual(
        jasmine.objectContaining({ kind: 'unpriced', name: 'לימון', recipeIds: [ID.sauce] })
      )
      expect(plan.missing[0].productId).toBe(ID.lemon)
      expect(plan.errors).toEqual([])
    })

    it('costs each dish and the event', () => {
      const salad = plan.dishCosts.find((d) => d.recipeId === ID.salad)
      const pasta = plan.dishCosts.find((d) => d.recipeId === ID.pasta)
      expect(salad?.cost).toBeCloseTo(95.25, 9)
      expect(salad?.partial).toBeTrue()
      expect(pasta?.cost).toBeCloseTo(62.5, 9)
      expect(pasta?.partial).toBeFalse()
      expect(plan.eventFoodCost).toBeCloseTo(157.75, 9)
      expect(plan.eventFoodCost).toBe(plan.dishCosts.reduce((s, d) => s + d.cost, 0))
      const lineSum = plan.rawLines.reduce((s, l) => s + (l.lineCost ?? 0), 0)
      expect(lineSum).toBeCloseTo(plan.eventFoodCost, 9)
    })

    it('does not mutate its input', () => {
      const input = buildFixtureInput()
      const before = JSON.stringify([input.event, input.products, input.recipes])
      computeEventPlan(input)
      expect(JSON.stringify([input.event, input.products, input.recipes])).toBe(before)
    })
  })

  it('stops on a cycle between two preps and flags the plan', () => {
    const x = makeRecipe({ _id: 'x', nameHebrew: 'X', ingredients: [recipeIng('y', 100, 'gram', 'Y')] })
    const y = makeRecipe({ _id: 'y', nameHebrew: 'Y', ingredients: [recipeIng('x', 100, 'gram', 'X')] })
    const event = makeEvent([{ recipeId: 'x', derivedPortions: 1, recipeType: 'preparation' }])
    const plan = computeEventPlan(makeInput(event, [], [x, y]))
    expect(plan.errors.some((e) => e.kind === 'cycle' && (e.name === 'X' || e.name === 'Y'))).toBeTrue()
    expect(plan.partial).toBeTrue()
  })

  it('puts a unit it cannot convert on its own no_conversion line', () => {
    const input = buildFixtureInput()
    const pasta = input.recipes.find((r) => r._id === ID.pasta)
    pasta?.ingredients.push(productIng(ID.tomato, 3, 'unit', 'עגבנייה'))
    const plan = computeEventPlan(input)
    const tomato = line(plan.rawLines, ID.tomato)
    expect(tomato.length).toBe(2)
    const ok = tomato.find((l) => l.status === 'ok')
    const bad = tomato.find((l) => l.status === 'no_conversion')
    expect(ok?.unit).toBe('kg')
    expect(bad?.unit).toBe('unit')
    expect(bad?.lineCost).toBeNull()
    expect(plan.partial).toBeTrue()
  })

  it('flags an ingredient whose product was deleted', () => {
    const input = buildFixtureInput()
    const pasta = input.recipes.find((r) => r._id === ID.pasta)
    pasta?.ingredients.push(productIng('gone', 1, 'kg', 'פלפל'))
    const plan = computeEventPlan(input)
    const deleted = plan.rawLines.find((l) => l.status === 'deleted')
    expect(deleted?.name).toBe('פלפל')
    expect(deleted?.lineCost).toBeNull()
    expect(plan.missing.some((m) => m.kind === 'deleted' && m.name === 'פלפל')).toBeTrue()
    expect(plan.dishCosts.find((d) => d.recipeId === ID.pasta)?.partial).toBeTrue()
  })

  it('keeps a free-text row apart from the linked product of the same name', () => {
    const input = buildFixtureInput()
    const pasta = input.recipes.find((r) => r._id === ID.pasta)
    pasta?.ingredients.push({ _id: 'free', amount: 2, unit: 'kg', nameSnapshot: 'עגבנייה' })
    const plan = computeEventPlan(input)
    const tomatoNamed = plan.rawLines.filter((l) => l.name === 'עגבנייה')
    expect(tomatoNamed.length).toBe(2)
    const free = tomatoNamed.find((l) => l.status === 'unlinked')
    expect(free?.productId).toBeNull()
    expect(free?.unit).toBe('kg')
    expect(free?.lineCost).toBeNull()
    expect(plan.missing.some((m) => m.kind === 'unlinked' && m.name === 'עגבנייה')).toBeTrue()
  })

  it('buys exactly the net quantity when the waste factor is 0 or missing', () => {
    for (const yieldFactor of [0, undefined]) {
      const input = buildFixtureInput()
      const tomato = input.products.find((p) => p._id === ID.tomato)
      if (tomato) tomato.yieldFactor = yieldFactor as number
      const l = line(computeEventPlan(input).rawLines, ID.tomato)[0]
      expect(l.buyQty).toBe(l.netQty)
    }
  })

  it('reports crates for a product with a purchase unit and counts a crate as 10 kg', () => {
    const plan = computeEventPlan(buildFixtureInput())
    const tomato = line(plan.rawLines, ID.tomato)[0]
    expect(tomato.purchase?.unit).toBe('ארגז')
    expect(tomato.purchase?.count).toBeCloseTo(1.875, 9)
    expect(formatQty(tomato.purchase?.count ?? 0, 'ארגז')).toEqual({ qty: 2, unit: 'ארגז' })

    const input = buildFixtureInput()
    const pasta = input.recipes.find((r) => r._id === ID.pasta)
    if (pasta) pasta.ingredients = [productIng(ID.tomato, 1, 'ארגז', 'עגבנייה')]
    const crate = computeEventPlan(input)
    // 50 portions / 5 = factor 10 → 10 crates = 100 kg; plus 5 kg from the salad
    expect(line(crate.rawLines, ID.tomato)[0].netQty).toBeCloseTo(105, 9)
  })

  it('reports no_yield for a prep with yield 0 and adds none of its ingredients', () => {
    const input = buildFixtureInput()
    const sauce = input.recipes.find((r) => r._id === ID.sauce)
    if (sauce) sauce.yieldAmount = 0
    const plan = computeEventPlan(input)
    expect(plan.errors).toContain({ kind: 'no_yield', name: 'רוטב' })
    expect(line(plan.rawLines, ID.oliveOil).length).toBe(0)
    expect(line(plan.rawLines, ID.lemon).length).toBe(0)
    expect(plan.prepLines.length).toBe(0)
    expect(plan.partial).toBeTrue()
  })

  it('reports no_yield for a dish with yield 0 instead of dividing by 1', () => {
    const input = buildFixtureInput()
    const pasta = input.recipes.find((r) => r._id === ID.pasta)
    if (pasta) pasta.yieldAmount = 0
    const plan = computeEventPlan(input)
    expect(plan.errors).toContain({ kind: 'no_yield', name: 'פסטה' })
    expect(line(plan.rawLines, ID.tomato)[0].netQty).toBeCloseTo(5, 9)
    expect(plan.dishCosts.find((d) => d.recipeId === ID.pasta)?.partial).toBeTrue()
  })

  it('reports no_ingredients for a dish without ingredients and adds nothing for it', () => {
    const input = buildFixtureInput()
    const pasta = input.recipes.find((r) => r._id === ID.pasta)
    if (pasta) pasta.ingredients = []
    const plan = computeEventPlan(input)
    expect(plan.errors).toContain({ kind: 'no_ingredients', name: 'פסטה' })
    expect(line(plan.rawLines, ID.tomato)[0].netQty).toBeCloseTo(5, 9)
    expect(plan.dishCosts.find((d) => d.recipeId === ID.pasta)?.cost).toBe(0)
  })

  it('falls back to a purchase-option price converted to the base unit, with no supplier', () => {
    const input = buildFixtureInput()
    const lemon = input.products.find((p) => p._id === ID.lemon)
    if (lemon) lemon.purchaseOptions = [{ unitSymbol: 'ארגז', conversionRate: 10, uom: 'kg', priceOverride: 50 }]
    const plan = computeEventPlan(input)
    const l = line(plan.rawLines, ID.lemon)[0]
    expect(l.supplierId).toBeNull()
    expect(l.lineCost).toBeCloseTo(0.4 * 5, 9)
    expect(plan.partial).toBeFalse()
    expect(plan.missing).toEqual([])
  })

  it('scales a dish item by whole portions but a prep item by its own quantity', () => {
    const tomato = makeProduct({ _id: 't', nameHebrew: 'עגבנייה', baseUnit: 'kg' })
    const dish = makeRecipe({
      _id: 'd',
      nameHebrew: 'מנה',
      recipeType: 'dish',
      yieldAmount: 1,
      yieldUnit: 'portion',
      ingredients: [productIng('t', 1, 'kg')]
    })
    const prep = makeRecipe({
      _id: 'p',
      nameHebrew: 'הכנה',
      yieldAmount: 1,
      yieldUnit: 'kg',
      ingredients: [productIng('t', 1, 'kg')]
    })
    const net = (portions: number, recipeId: string, recipeType: 'dish' | 'preparation'): number =>
      line(
        computeEventPlan(
          makeInput(makeEvent([{ recipeId, derivedPortions: portions, recipeType }]), [tomato], [dish, prep])
        ).rawLines,
        't'
      )[0].netQty
    expect(net(126.0000001, 'd', 'dish')).toBe(126)
    expect(net(126.4, 'd', 'dish')).toBe(127)
    expect(net(5.5, 'p', 'preparation')).toBe(5.5)
  })

  it('lists a prep menu item once for itself and a dish mise row with its category and station', () => {
    const tomato = makeProduct({ _id: 't', nameHebrew: 'עגבנייה', baseUnit: 'kg' })
    const dish = makeRecipe({
      _id: 'd',
      nameHebrew: 'מנה',
      recipeType: 'dish',
      yieldAmount: 10,
      yieldUnit: 'portion',
      defaultStation: ' גריל ',
      ingredients: [productIng('t', 1, 'kg')],
      prepItems: [{ preparationName: 'חיתוך', categoryName: 'ירקות', quantity: 2, unit: 'kg' }],
      prepCategories: [
        {
          categoryName: 'ירקות',
          items: [
            { itemName: 'חיתוך', unit: 'kg', quantity: 2 },
            { itemName: 'קילוף', unit: 'unit', quantity: 1 }
          ]
        }
      ]
    })
    const plan = computeEventPlan(makeInput(makeEvent([{ recipeId: 'd', derivedPortions: 100 }]), [tomato], [dish]))
    expect(plan.prepLines.map((p) => p.prepId)).toEqual(['mise:חיתוך', 'mise:קילוף'])
    expect(plan.prepLines[0]).toEqual(
      jasmine.objectContaining({ qty: 20, unit: 'kg', category: 'ירקות', source: 'mise', station: 'גריל', dishId: 'd' })
    )
  })

  it('reports a deleted menu item instead of throwing', () => {
    const input: EventPlanInput = makeInput(makeEvent([{ recipeId: 'nope', derivedPortions: 5 }]), [], [])
    const plan = computeEventPlan(input)
    expect(plan.missing[0]).toEqual(jasmine.objectContaining({ kind: 'deleted', recipeIds: ['nope'] }))
    expect(plan.dishCosts.length).toBe(1)
    expect(plan.partial).toBeTrue()
  })
})
