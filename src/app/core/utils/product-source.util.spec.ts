import type { Product } from '@models/product.model'
import { getEffectivePrice } from './product-source.util'

const product = (sources: { supplierId: string; price: number }[], global?: number): Product =>
  ({ sources: sources.map((s) => ({ ...s, addedAt: 0 })), buy_price_global_: global }) as unknown as Product

describe('getEffectivePrice', () => {
  it('is the cheapest priced supplier', () => {
    expect(
      getEffectivePrice(
        product([
          { supplierId: 'david', price: 4 },
          { supplierId: 'grocery', price: 5 }
        ])
      )
    ).toBe(4)
  })

  it('keeps the earlier supplier price on a tie', () => {
    expect(
      getEffectivePrice(
        product([
          { supplierId: 'a', price: 4 },
          { supplierId: 'b', price: 4 }
        ])
      )
    ).toBe(4)
  })

  it('ignores a supplier with price 0', () => {
    expect(
      getEffectivePrice(
        product([
          { supplierId: 'a', price: 0 },
          { supplierId: 'b', price: 7 }
        ])
      )
    ).toBe(7)
  })

  it('prefers a priced supplier over the no-supplier price, the same as chooseSupplier', () => {
    expect(
      getEffectivePrice(
        product([
          { supplierId: '', price: 2 },
          { supplierId: 'a', price: 6 }
        ])
      )
    ).toBe(6)
  })

  it('uses the no-supplier price when no supplier is priced', () => {
    expect(getEffectivePrice(product([{ supplierId: '', price: 3 }]))).toBe(3)
  })

  it('falls back to buy_price_global_, then 0', () => {
    expect(getEffectivePrice(product([], 9))).toBe(9)
    expect(getEffectivePrice(product([]))).toBe(0)
  })

  it('uses the chosen supplier when given, the cheapest when it is stale (plan 536)', () => {
    const p = product([
      { supplierId: 'a', price: 4 },
      { supplierId: 'b', price: 5 },
      { supplierId: 'c', price: 6 }
    ])
    expect(getEffectivePrice(p, 'c')).toBe(6)
    expect(getEffectivePrice(p, 'gone')).toBe(4)
    expect(getEffectivePrice(p, null)).toBe(4)
  })
})
