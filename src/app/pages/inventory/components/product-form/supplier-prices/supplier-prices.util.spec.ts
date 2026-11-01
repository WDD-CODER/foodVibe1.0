import type { Product } from '@models/product.model'
import { buildSources, cheapestPrice, fillSupplierPrices, pricesFromProduct } from './supplier-prices.util'

describe('fillSupplierPrices', () => {
  it('starts the first supplier from the existing price', () => {
    expect(fillSupplierPrices(['a'], {}, 4)).toEqual({ a: 4 })
  })

  it('leaves the first row empty (waiting for price) when there is no price', () => {
    expect(fillSupplierPrices(['a'], {}, 0)).toEqual({ a: null })
  })

  it('copies the first row price into a new supplier and keeps filled rows', () => {
    expect(fillSupplierPrices(['a', 'b', 'c'], { a: 4, b: 5 }, 4)).toEqual({ a: 4, b: 5, c: 4 })
  })

  it('does not change filled rows when row 1 changes later', () => {
    expect(fillSupplierPrices(['a', 'b'], { a: 9, b: 5 }, 9)).toEqual({ a: 9, b: 5 })
  })

  it('drops a removed supplier and copies row 1 again when it is re-added', () => {
    const afterRemove = fillSupplierPrices(['a'], { a: 4, b: 5 }, 4)
    expect(afterRemove).toEqual({ a: 4 })
    expect(fillSupplierPrices(['a', 'b'], afterRemove, 4)).toEqual({ a: 4, b: 4 })
  })
})

describe('cheapestPrice', () => {
  it('is the lowest positive row, or 0', () => {
    expect(cheapestPrice({ a: 4, b: 5, c: null })).toBe(4)
    expect(cheapestPrice({ a: null })).toBe(0)
    expect(cheapestPrice({})).toBe(0)
  })
})

describe('pricesFromProduct', () => {
  it('reads each supplier its own price', () => {
    const product = {
      sources: [
        { supplierId: 'a', price: 4, addedAt: 0 },
        { supplierId: 'b', price: 5, addedAt: 0 }
      ]
    } as unknown as Product
    expect(pricesFromProduct(product)).toEqual({ a: 4, b: 5 })
  })

  it('shows a source with no price as waiting', () => {
    const product = { sources: [{ supplierId: 'a', price: 0, addedAt: 0 }] } as unknown as Product
    expect(pricesFromProduct(product)).toEqual({ a: null })
  })
})

describe('buildSources', () => {
  it('saves each supplier its own price and keeps who added it', () => {
    const existing = [{ supplierId: 'a', price: 1, addedBy: 'u1', addedAt: 7 }]
    const out = buildSources({ supplierIds_: ['a', 'b'], supplierPrices_: { a: 4, b: 5 } }, existing)
    expect(out.map((s) => [s.supplierId, s.price])).toEqual([
      ['a', 4],
      ['b', 5]
    ])
    expect(out[0].addedBy).toBe('u1')
    expect(out[0].addedAt).toBe(7)
  })

  it('saves an empty row as no price', () => {
    expect(buildSources({ supplierIds_: ['a'], supplierPrices_: { a: null } }, [])[0].price).toBe(0)
  })

  it('without suppliers keeps the single price as the general price', () => {
    expect(buildSources({ buy_price_global_: 6 }, []).map((s) => [s.supplierId, s.price])).toEqual([['', 6]])
    expect(buildSources({}, [])).toEqual([])
  })
})
