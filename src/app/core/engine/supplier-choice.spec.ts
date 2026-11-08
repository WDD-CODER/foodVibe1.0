import { chooseSupplier } from './supplier-choice'

describe('chooseSupplier', () => {
  it('picks the cheapest positive price', () => {
    expect(
      chooseSupplier({
        sources: [
          { supplierId: 'a', price: 6 },
          { supplierId: 'b', price: 5 }
        ]
      })
    ).toEqual({
      supplierId: 'b',
      pricePerBaseUnit: 5
    })
  })

  it('keeps the first source on a tie', () => {
    expect(
      chooseSupplier({
        sources: [
          { supplierId: 'a', price: 5 },
          { supplierId: 'b', price: 5 }
        ]
      }).supplierId
    ).toBe('a')
  })

  it('never picks a source with price 0', () => {
    expect(
      chooseSupplier({
        sources: [
          { supplierId: 'a', price: 0 },
          { supplierId: 'b', price: 7 }
        ]
      })
    ).toEqual({
      supplierId: 'b',
      pricePerBaseUnit: 7
    })
  })

  it('falls back to the global price with no supplier', () => {
    expect(chooseSupplier({ sources: [{ supplierId: '', price: 4 }] })).toEqual({
      supplierId: null,
      pricePerBaseUnit: 4
    })
  })

  it('prefers a priced supplier over the global price', () => {
    expect(
      chooseSupplier({
        sources: [
          { supplierId: '', price: 4 },
          { supplierId: 'a', price: 9 }
        ]
      })
    ).toEqual({
      supplierId: 'a',
      pricePerBaseUnit: 9
    })
  })

  it('returns nulls when nothing is priced', () => {
    expect(chooseSupplier({ sources: [] })).toEqual({ supplierId: null, pricePerBaseUnit: null })
    expect(chooseSupplier({ sources: [{ supplierId: 'a', price: 0 }] })).toEqual({
      supplierId: null,
      pricePerBaseUnit: null
    })
  })
})

describe('chooseSupplier with a chosen supplier (plan 510)', () => {
  const sources = [
    { supplierId: 'a', price: 4 },
    { supplierId: 'b', price: 5 },
    { supplierId: 'c', price: 0 }
  ]
  it('uses the chosen supplier even when dearer', () => {
    expect(chooseSupplier({ sources, preferredSupplierId: 'b' })).toEqual({ supplierId: 'b', pricePerBaseUnit: 5 })
  })
  it('falls back to the cheapest when the chosen supplier has no price', () => {
    expect(chooseSupplier({ sources, preferredSupplierId: 'c' })).toEqual({ supplierId: 'a', pricePerBaseUnit: 4 })
  })
  it('falls back to the cheapest when the chosen supplier was removed', () => {
    expect(chooseSupplier({ sources, preferredSupplierId: 'gone' })).toEqual({ supplierId: 'a', pricePerBaseUnit: 4 })
  })
})
