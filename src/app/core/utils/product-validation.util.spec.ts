import { Product } from '@models/product.model'
import {
  getProductMissingFields,
  getProductStatusFields,
  getProductValidationStatus,
  isProductUnpriced
} from './product-validation.util'

function product(patch: Partial<Product> = {}): Product {
  return {
    _id: 'p1',
    nameHebrew: 'עגבנייה',
    baseUnit: 'kg',
    sources: [{ supplierId: 's1', price: 5 }],
    purchaseOptions: [],
    categories: ['c1'],
    yieldFactor: 1,
    allergens: [],
    minStockLevel: 0,
    expiryDaysDefault: 0,
    ...patch
  } as Product
}

describe('isProductUnpriced', () => {
  it('is true with no sources and no purchase options', () => {
    expect(isProductUnpriced(product({ sources: [], purchaseOptions: [] }))).toBe(true)
  })

  it('is false with a source priced 5', () => {
    expect(isProductUnpriced(product())).toBe(false)
  })

  it('is false when sources are 0 but a purchase option has priceOverride 12', () => {
    const p = product({
      sources: [{ supplierId: 's1', price: 0 }],
      purchaseOptions: [{ unitSymbol: 'box', conversionRate: 10, priceOverride: 12 }]
    })
    expect(isProductUnpriced(p)).toBe(false)
  })

  it('is false with the deprecated buy_price_global_ 3', () => {
    expect(isProductUnpriced(product({ sources: [], buy_price_global_: 3 }))).toBe(false)
  })
})

describe('getProductValidationStatus', () => {
  it('a priced product with no category is incomplete', () => {
    expect(getProductValidationStatus(product({ categories: [] }))).toBe('incomplete')
  })

  it('an unpriced product with category and supplier is valid', () => {
    const p = product({ sources: [{ supplierId: 's1', price: 0 }] })
    expect(getProductValidationStatus(p)).toBe('valid')
  })

  it('missing name is invalid', () => {
    expect(getProductValidationStatus(product({ nameHebrew: ' ' }))).toBe('invalid')
  })
})

describe('getProductMissingFields', () => {
  it('never returns missing_price', () => {
    const p = product({ sources: [], categories: [] })
    expect(getProductMissingFields(p)).toEqual(['missing_category', 'missing_supplier'])
  })
})

describe('getProductStatusFields', () => {
  it('lists the price first, then category and supplier, for a product with nothing', () => {
    const p = product({ sources: [], categories: [] })
    expect(getProductStatusFields(p)).toEqual(['missing_price', 'missing_category', 'missing_supplier'])
  })

  it('lists only the supplier for a priced product without one', () => {
    const p = product({ sources: [], buy_price_global_: 4 })
    expect(getProductStatusFields(p)).toEqual(['missing_supplier'])
  })

  it('lists only the price for an unpriced product with category and supplier', () => {
    const p = product({ sources: [{ supplierId: 's1', price: 0 }] })
    expect(getProductStatusFields(p)).toEqual(['missing_price'])
  })

  it('is empty for a complete product', () => {
    expect(getProductStatusFields(product())).toEqual([])
  })

  it('puts the price before the name and unit gaps', () => {
    const p = product({ nameHebrew: '', baseUnit: '', sources: [{ supplierId: 's1', price: 0 }] })
    expect(getProductStatusFields(p)).toEqual(['missing_price', 'missing_name', 'missing_unit'])
  })
})
