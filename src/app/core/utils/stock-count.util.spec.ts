import type { Product } from '@models/product.model'
import { belowMinimum, countedAtFromIso, isoFromCountedAt, unitOptionsFor } from './stock-count.util'

const product = (id: string, min: number, extra: Partial<Product> = {}): Product =>
  ({ _id: id, nameHebrew: id, baseUnit: 'kg', purchaseOptions: [], minStockLevel: min, ...extra }) as unknown as Product

describe('stock-count.util', () => {
  describe('belowMinimum', () => {
    const products = [product('a', 10), product('b', 10), product('c', 10), product('d', 10), product('e', 0)]
    const onHand = [
      { productId: 'a', baseQuantity: 4, countedAt: 1 },
      { productId: 'b', baseQuantity: 10, countedAt: 1 },
      { productId: 'c', baseQuantity: 12, countedAt: 1 },
      { productId: 'e', baseQuantity: 0, countedAt: 1 }
    ]

    it('lists on-hand 4 under minimum 10, not 10, not 12', () => {
      expect(belowMinimum(products, onHand).rows.map((r) => r.product._id)).toEqual(['a'])
    })

    it('does not list a product with no on-hand row and counts it as uncounted', () => {
      const result = belowMinimum(products, onHand)
      expect(result.rows.some((r) => r.product._id === 'd')).toBeFalse()
      expect(result.uncounted).toBe(1)
    })

    it('orders by how empty the product is', () => {
      const result = belowMinimum(
        [product('x', 10), product('y', 10)],
        [
          { productId: 'x', baseQuantity: 6, countedAt: 1 },
          { productId: 'y', baseQuantity: 1, countedAt: 1 }
        ]
      )
      expect(result.rows.map((r) => r.product._id)).toEqual(['y', 'x'])
    })
  })

  describe('unitOptionsFor', () => {
    it('gives the base unit, the crate, then gram for a kg product', () => {
      const p = product('k', 1, { purchaseOptions: [{ unitSymbol: 'crate', conversionRate: 12 }] })
      expect(unitOptionsFor(p)).toEqual(['kg', 'crate', 'gram'])
    })

    it('skips a purchase option with no rate and gives ml and liter for a volume base', () => {
      const p = product('v', 1, { baseUnit: 'liter', purchaseOptions: [{ unitSymbol: 'bad', conversionRate: 0 }] })
      expect(unitOptionsFor(p)).toEqual(['liter', 'ml'])
    })
  })

  describe('countedAtFromIso', () => {
    it('returns now for today and noon local for another date', () => {
      const now = new Date(2026, 10, 19, 15, 30).getTime()
      expect(countedAtFromIso('2026-11-19', now)).toBe(now)
      expect(countedAtFromIso('2026-11-10', now)).toBe(new Date(2026, 10, 10, 12).getTime())
      expect(isoFromCountedAt(now)).toBe('2026-11-19')
    })
  })
})
