import type { Product } from '@models/product.model'
import { unitChoicesFor, unitForSpoken } from './spoken-unit'

const prod = (baseUnit: string, units: string[] = []): Pick<Product, 'baseUnit' | 'purchaseOptions'> =>
  ({ baseUnit, purchaseOptions: units.map((u) => ({ unitSymbol: u, conversionRate: 10 })) }) as never

describe('spoken-unit (plan 654)', () => {
  it('(a) no unit said is never the base unit', () => {
    expect(unitForSpoken(undefined, prod('gram'))).toBeNull()
    expect(unitForSpoken('', prod('gram', ['ארגז']))).toBeNull()
  })

  it('a said unit the product has fills the row (plural too); one it lacks is null', () => {
    expect(unitForSpoken('ארגזים', prod('gram', ['ארגז']))).toBe('ארגז')
    expect(unitForSpoken('ארגזים', prod('gram'))).toBeNull()
  })

  it('(c) the base unit is offered first only when it is a count unit', () => {
    expect(unitChoicesFor(prod('unit', ['ארגז']))[0]).toBe('unit')
    const gram = unitChoicesFor(prod('gram', ['ארגז']))
    expect(gram[0]).toBe('ארגז')
    expect(gram[gram.length - 1]).toBe('gram')
  })
})
