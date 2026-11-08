import { cheapestSupplier, chooseSupplier } from './supplier-choice'

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

describe('chooseSupplier with many suppliers and a chosen one (plan 536)', () => {
  const src = (prices: number[]) => prices.map((price, i) => ({ supplierId: 's' + i, price }))
  for (const prices of [
    [3, 4, 5],
    [5, 3, 4],
    [5, 4, 3],
    [6, 5, 4, 3],
    [3, 6, 5, 4],
    [5, 4, 3, 6, 7],
    [6, 7, 5, 3, 4]
  ]) {
    it('picks the cheapest of ' + prices.join(', '), () => {
      expect(chooseSupplier({ sources: src(prices) }).pricePerBaseUnit).toBe(3)
      expect(cheapestSupplier({ sources: src(prices) })?.price).toBe(3)
    })
  }
  it('keeps the earlier source on a tie among three', () => {
    expect(chooseSupplier({ sources: src([4, 3, 3]) }).supplierId).toBe('s1')
  })
  it('uses the chosen supplier even when dearer', () => {
    expect(chooseSupplier({ sources: src([3, 4, 5]) }, 's2')).toEqual({ supplierId: 's2', pricePerBaseUnit: 5 })
  })
  it('falls back to the cheapest when the chosen supplier has price 0 or is gone', () => {
    const sources = [...src([3, 4]), { supplierId: 'x', price: 0 }]
    expect(chooseSupplier({ sources }, 'x').supplierId).toBe('s0')
    expect(chooseSupplier({ sources }, 'gone').supplierId).toBe('s0')
  })
  it('no choice (null or undefined) = cheapest', () => {
    expect(chooseSupplier({ sources: src([4, 3]) }, null).supplierId).toBe('s1')
    expect(chooseSupplier({ sources: src([4, 3]) }, undefined).supplierId).toBe('s1')
  })
})
