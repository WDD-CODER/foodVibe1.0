import type { MenuEvent, TypeSnapshot } from '@models/menu-event.model'
import {
  computePortions,
  defaultCoefficient,
  formatCoefficient,
  isDefaultCoefficient,
  isValidCoefficient
} from './portions'
import { makeRecipe } from './testing/event-plan.fixture'

type ItemInput = {
  recipeId?: string
  recipeType?: 'dish' | 'preparation'
  portionsPerDiner?: number
  servingPortions?: number
  coefficientOverride?: number
}

const snap = (key: string, coefficient: number): TypeSnapshot => ({ key, name: key, coefficient })

function event(guests: number, items: ItemInput[], eventType?: TypeSnapshot, servingType?: TypeSnapshot): MenuEvent {
  return {
    _id: 'e1',
    name: 'test',
    eventType: eventType?.key ?? 'x',
    servingType: servingType?.key ?? 'buffet_family',
    eventTypeSnapshot: eventType,
    servingTypeSnapshot: servingType,
    guestCount: guests,
    sections: [
      {
        _id: 's1',
        name: 'main',
        sortOrder: 0,
        items: items.map((i) => ({
          recipeId: i.recipeId ?? 'r1',
          recipeType: i.recipeType ?? 'dish',
          derivedPortions: 0,
          portionsPerDiner: i.portionsPerDiner,
          servingPortions: i.servingPortions,
          coefficientOverride: i.coefficientOverride
        }))
      }
    ]
  }
}

const first = (e: MenuEvent) => computePortions(e, []).get('s1|0')!

describe('isDefaultCoefficient', () => {
  it('compares at the shown 2 decimals', () => {
    expect(isDefaultCoefficient(1.27, 1.265)).toBe(true)
    expect(isDefaultCoefficient(1.26, 1.265)).toBe(false)
    expect(isDefaultCoefficient(1.1, 1.1)).toBe(true)
    expect(isDefaultCoefficient(1.32, 1.2 * 1.1)).toBe(true)
  })
})

describe('computePortions', () => {
  it('an override equal to the default (1.27 on 1.265) is not manual', () => {
    const r = first(
      event(100, [{ portionsPerDiner: 1, coefficientOverride: 1.27 }], snap('private', 1.15), snap('buffet', 1.1))
    )
    expect(r.overridden).toBe(false)
    expect(r.coefficient).toBeCloseTo(1.265, 9)
    expect(r.portions).toBe(127)
    expect(r.defaultCoefficient).toBeCloseTo(1.265, 9)
  })

  it('an override of 1.1 on default 1.265 stays manual and reports the default', () => {
    const r = first(
      event(100, [{ portionsPerDiner: 1, coefficientOverride: 1.1 }], snap('private', 1.15), snap('buffet', 1.1))
    )
    expect(r.overridden).toBe(true)
    expect(r.portions).toBe(110)
    expect(r.defaultCoefficient).toBeCloseTo(1.265, 9)
  })

  it('private 1.15 x buffet 1.1, 100 guests -> coefficient 1.265 (not rounded), portions 127', () => {
    const r = first(event(100, [{ portionsPerDiner: 1 }], snap('private', 1.15), snap('buffet', 1.1)))
    expect(r.coefficient).toBeCloseTo(1.265, 9)
    expect(formatCoefficient(r.coefficient)).toBe('1.27')
    expect(r.portions).toBe(127)
    expect(r.overridden).toBe(false)
  })

  it('a per-dish override of 1.1 -> 110 and overridden', () => {
    const r = first(
      event(100, [{ portionsPerDiner: 1, coefficientOverride: 1.1 }], snap('private', 1.15), snap('buffet', 1.1))
    )
    expect(r.portions).toBe(110)
    expect(r.coefficient).toBe(1.1)
    expect(r.overridden).toBe(true)
  })

  it('switching the event to wedding 1.2: plain dish 132, overridden dish stays 110', () => {
    const e = event(
      100,
      [{ portionsPerDiner: 1 }, { portionsPerDiner: 1, coefficientOverride: 1.1 }],
      snap('wedding', 1.2),
      snap('buffet', 1.1)
    )
    const map = computePortions(e, [])
    expect(map.get('s1|0')!.coefficient).toBeCloseTo(1.32, 9)
    expect(map.get('s1|0')!.portions).toBe(132)
    expect(map.get('s1|1')!.portions).toBe(110)
  })

  it('cocktail 3 x private 1.15, 50 guests, 1 bite per diner -> 173', () => {
    expect(first(event(50, [{ portionsPerDiner: 1 }], snap('private', 1.15), snap('cocktail', 3))).portions).toBe(173)
  })

  it('a kg preparation, 0.05 per diner, 100 guests, coefficients 1 -> 5 (not rounded up)', () => {
    const sauce = makeRecipe({ _id: 'sauce', nameHebrew: 'רוטב', yieldUnit: 'kg', recipeType: 'preparation' })
    const e = event(
      100,
      [{ recipeId: 'sauce', recipeType: 'preparation', portionsPerDiner: 0.05 }],
      snap('a', 1),
      snap('b', 1)
    )
    expect(computePortions(e, [sauce]).get('s1|0')!.portions).toBeCloseTo(5, 6)
  })

  it('a kg preparation, 1 per diner, 100 guests, coefficient 1.1 -> exactly 110', () => {
    const sauce = makeRecipe({ _id: 'sauce', nameHebrew: 'רוטב', yieldUnit: 'kg', recipeType: 'preparation' })
    const e = event(
      100,
      [{ recipeId: 'sauce', recipeType: 'preparation', portionsPerDiner: 1 }],
      snap('a', 1.1),
      snap('b', 1)
    )
    expect(computePortions(e, [sauce]).get('s1|0')!.portions).toBe(110)
  })

  it('a kg preparation, 0.07 per diner, 100 guests -> exactly 7', () => {
    const sauce = makeRecipe({ _id: 'sauce', nameHebrew: 'רוטב', yieldUnit: 'kg', recipeType: 'preparation' })
    const e = event(
      100,
      [{ recipeId: 'sauce', recipeType: 'preparation', portionsPerDiner: 0.07 }],
      snap('a', 1),
      snap('b', 1)
    )
    expect(computePortions(e, [sauce]).get('s1|0')!.portions).toBe(7)
  })

  it('a weight or volume preparation keeps decimals, a per-unit preparation is rounded up', () => {
    const kg = makeRecipe({ _id: 'kg', nameHebrew: 'א', yieldUnit: 'kg' })
    const hebrewKg = makeRecipe({ _id: 'hkg', nameHebrew: 'ב', yieldUnit: 'ק"ג' })
    const unit = makeRecipe({ _id: 'unit', nameHebrew: 'ג', yieldUnit: 'unit' })
    const e = event(10, [
      { recipeId: 'kg', recipeType: 'preparation', portionsPerDiner: 0.033 },
      { recipeId: 'hkg', recipeType: 'preparation', portionsPerDiner: 0.033 },
      { recipeId: 'unit', recipeType: 'preparation', portionsPerDiner: 0.033 }
    ])
    const map = computePortions(e, [kg, hebrewKg, unit])
    expect(map.get('s1|0')!.portions).toBeCloseTo(0.33, 6)
    expect(map.get('s1|1')!.portions).toBeCloseTo(0.33, 6)
    expect(map.get('s1|2')!.portions).toBe(1)
  })

  it('bar mitzvah snapshot 1.25 x serving 1.0, 100 guests -> 125', () => {
    expect(first(event(100, [{ portionsPerDiner: 1 }], snap('bm', 1.25), snap('plated', 1))).portions).toBe(125)
  })

  it('business 1.1 x buffet 1.1, 100 guests -> 121, not 122', () => {
    expect(first(event(100, [{ portionsPerDiner: 1 }], snap('business', 1.1), snap('buffet', 1.1))).portions).toBe(121)
  })

  it('0 guests -> 0; portionsPerDiner 0 -> 0 (never silently 1)', () => {
    expect(first(event(0, [{ portionsPerDiner: 1 }], snap('a', 1.2))).portions).toBe(0)
    expect(first(event(-5, [{ portionsPerDiner: 1 }])).portions).toBe(0)
    expect(first(event(100, [{ portionsPerDiner: 0 }])).portions).toBe(0)
  })

  it('an event without snapshots -> coefficient 1.0, guests x portionsPerDiner', () => {
    const e = event(80, [{ portionsPerDiner: 2 }])
    expect(defaultCoefficient(e)).toBe(1)
    const r = first(e)
    expect(r.coefficient).toBe(1)
    expect(r.portions).toBe(160)
  })

  it('an item without portionsPerDiner uses legacy servingPortions, else 1', () => {
    expect(first(event(100, [{ servingPortions: 2 }])).portions).toBe(200)
    expect(first(event(100, [{}])).portions).toBe(100)
  })

  it('keys every item as sectionId|index', () => {
    const map = computePortions(event(10, [{}, {}, {}]), [])
    expect([...map.keys()]).toEqual(['s1|0', 's1|1', 's1|2'])
  })
})

describe('isValidCoefficient', () => {
  it('accepts up to 2 decimals above 0', () => {
    expect(isValidCoefficient(1.25)).toBe(true)
    expect(isValidCoefficient(0.9)).toBe(true)
    expect(isValidCoefficient(1.15)).toBe(true)
    expect(isValidCoefficient(1.255)).toBe(false)
    expect(isValidCoefficient(0)).toBe(false)
    expect(isValidCoefficient(-1)).toBe(false)
    expect(isValidCoefficient(Number.NaN)).toBe(false)
  })
})

describe('formatCoefficient', () => {
  it('rounds half up to 2 decimals without trailing zeros', () => {
    expect(formatCoefficient(1.265)).toBe('1.27')
    expect(formatCoefficient(1.32)).toBe('1.32')
    expect(formatCoefficient(1.1)).toBe('1.1')
    expect(formatCoefficient(1)).toBe('1')
    expect(formatCoefficient(1.1 * 1.15)).toBe('1.27')
  })
})
