import { FIXTURE_UNITS, makeProduct, makeRecipe } from './testing/event-plan.fixture'
import { toBase, toYield, unitFamily } from './units'

describe('units', () => {
  const kgProduct = makeProduct({
    _id: 'p',
    nameHebrew: 'עגבנייה',
    baseUnit: 'kg',
    purchaseOptions: [{ unitSymbol: 'ארגז', conversionRate: 10, uom: 'kg' }]
  })

  it('classifies unit families', () => {
    expect(unitFamily('gram')).toBe('mass')
    expect(unitFamily('g')).toBe('mass')
    expect(unitFamily('ml')).toBe('volume')
    expect(unitFamily('unit')).toBe('count')
    expect(unitFamily('ארגז')).toBe('custom')
  })

  it('converts inside a family and through a purchase option', () => {
    expect(toBase(500, 'gram', kgProduct, FIXTURE_UNITS)).toBe(0.5)
    expect(toBase(2, 'kg', kgProduct, FIXTURE_UNITS)).toBe(2)
    expect(toBase(3, 'ארגז', kgProduct, FIXTURE_UNITS)).toBe(30)
  })

  it('does not convert mass to volume or an unknown unit', () => {
    expect(toBase(1, 'liter', kgProduct, FIXTURE_UNITS)).toBeNull()
    expect(toBase(3, 'unit', kgProduct, FIXTURE_UNITS)).toBeNull()
  })

  it('converts into a prep yield unit, yield conversions first', () => {
    const sauce = makeRecipe({ _id: 'r', nameHebrew: 'רוטב', yieldAmount: 1, yieldUnit: 'kg' })
    expect(toYield(200, 'gram', sauce, FIXTURE_UNITS)).toBe(0.2)
    expect(toYield(1, 'liter', sauce, FIXTURE_UNITS)).toBeNull()
    const withConv = makeRecipe({
      _id: 'r2',
      nameHebrew: 'לחם',
      yieldAmount: 1,
      yieldUnit: 'kg',
      yieldConversions: [{ amount: 4, unit: 'unit' }]
    })
    expect(toYield(2, 'unit', withConv, FIXTURE_UNITS)).toBe(0.5)
  })
})
