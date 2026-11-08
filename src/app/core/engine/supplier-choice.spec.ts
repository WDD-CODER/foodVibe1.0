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

  describe('plan 510: the chosen supplier', () => {
    const sources = [
      { supplierId: 'david', price: 4 },
      { supplierId: 'grocery', price: 5 }
    ]

    it('uses the chosen supplier even when another is cheaper', () => {
      expect(chooseSupplier({ sources, preferredSupplierId: 'grocery' })).toEqual({
        supplierId: 'grocery',
        pricePerBaseUnit: 5
      })
    })

    it('falls back to the cheapest when the chosen supplier has no price', () => {
      expect(
        chooseSupplier({
          sources: [...sources, { supplierId: 'market', price: 0 }],
          preferredSupplierId: 'market'
        })
      ).toEqual({ supplierId: 'david', pricePerBaseUnit: 4 })
    })

    it('falls back to the cheapest when the chosen supplier was removed from the product', () => {
      expect(chooseSupplier({ sources, preferredSupplierId: 'gone' })).toEqual({
        supplierId: 'david',
        pricePerBaseUnit: 4
      })
    })

    it('an empty choice means automatic (the cheapest)', () => {
      expect(chooseSupplier({ sources, preferredSupplierId: '' }).supplierId).toBe('david')
    })
  })
})
