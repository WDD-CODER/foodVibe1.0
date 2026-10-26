import { HttpErrorResponse } from '@angular/common/http'
import type { Product } from '@models/product.model'
import { findProductByName, isProductNameTaken } from './product-name-error.util'

describe('product-name-error.util (plan 485)', () => {
  it('recognises the server name clash only', () => {
    expect(
      isProductNameTaken(new HttpErrorResponse({ status: 409, error: { error: 'PRODUCT_NAME_TAKEN' } }))
    ).toBeTrue()
    expect(isProductNameTaken(new HttpErrorResponse({ status: 409, error: { error: 'TERM_KEY_TAKEN' } }))).toBeFalse()
    expect(isProductNameTaken(new HttpErrorResponse({ status: 500 }))).toBeFalse()
    expect(isProductNameTaken(new Error('x'))).toBeFalse()
  })

  it('finds a product by the one name rule, never the excluded one', () => {
    const products = [
      { _id: 'p1', nameHebrew: 'Cucumber  Pickled' },
      { _id: 'p2', nameHebrew: 'בצל' }
    ] as Product[]
    expect(findProductByName(products, ' cucumber pickled ')?._id).toBe('p1')
    expect(findProductByName(products, 'cucumber pickled', 'p1')).toBeNull()
    expect(findProductByName(products, '   ')).toBeNull()
  })
})
