import { Product } from '@models/product.model'
import { isValidQuickPrice, withQuickPrice } from './quick-price.util'

const base = (patch: Partial<Product>): Product =>
  ({ _id: 'p', nameHebrew: 'שמן', baseUnit: 'kg', sources: [], purchaseOptions: [], ...patch }) as Product

describe('withQuickPrice', () => {
  it('prices every zero source', () => {
    const p = base({
      sources: [
        { supplierId: 'a', price: 0 },
        { supplierId: 'b', price: 0 }
      ]
    })
    expect(withQuickPrice(p, 20).sources).toEqual([
      { supplierId: 'a', price: 20 },
      { supplierId: 'b', price: 20 }
    ])
  })

  it('adds a source without a supplier when there is none', () => {
    expect(withQuickPrice(base({}), 20).sources).toEqual([{ supplierId: '', price: 20 }])
  })

  it('leaves a source already priced above 0', () => {
    const p = base({
      sources: [
        { supplierId: 'a', price: 7 },
        { supplierId: 'b', price: 0 }
      ]
    })
    expect(withQuickPrice(p, 20).sources).toEqual([
      { supplierId: 'a', price: 7 },
      { supplierId: 'b', price: 20 }
    ])
  })

  it('does not mutate the input', () => {
    const p = base({ sources: [{ supplierId: 'a', price: 0 }] })
    withQuickPrice(p, 20)
    expect(p.sources[0].price).toBe(0)
  })
})

describe('isValidQuickPrice', () => {
  it('accepts a price above 0 with up to 2 decimals', () => {
    expect(isValidQuickPrice(20)).toBe(true)
    expect(isValidQuickPrice(12.5)).toBe(true)
    expect(isValidQuickPrice(0.01)).toBe(true)
  })

  it('rejects 0, empty, negative and more than 2 decimals', () => {
    expect(isValidQuickPrice(0)).toBe(false)
    expect(isValidQuickPrice(null)).toBe(false)
    expect(isValidQuickPrice(-3)).toBe(false)
    expect(isValidQuickPrice(1.234)).toBe(false)
  })
})
