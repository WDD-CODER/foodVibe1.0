import { FormControl } from '@angular/forms'
import { duplicateNameValidator, duplicateEntityNameValidator } from './item.validators'
import { Product } from '@models/product.model'

describe('duplicateNameValidator', () => {
  describe('plan 484: a product whose name already has a twin', () => {
    const twins = [
      { _id: 'p1', nameHebrew: 'מלפפון' },
      { _id: 'p2', nameHebrew: 'מלפפון' },
      { _id: 'p3', nameHebrew: 'כרובית' }
    ] as Product[]

    it('can keep its saved name (price-only edit)', () => {
      expect(
        duplicateNameValidator(
          () => twins,
          () => 'p1'
        )(new FormControl(' מלפפון '))
      ).toBeNull()
    })

    it('is still refused when renamed to a taken name', () => {
      expect(
        duplicateNameValidator(
          () => twins,
          () => 'p1'
        )(new FormControl('כרובית'))
      ).toEqual({ duplicateName: true })
    })

    it('a new product with that name is refused', () => {
      expect(
        duplicateNameValidator(
          () => twins,
          () => null
        )(new FormControl('מלפפון'))
      ).toEqual({ duplicateName: true })
    })
  })

  const products = [{ _id: 'p1', nameHebrew: 'Tomato' }] as Product[]
  const productsSignal = () => products

  it('should return error if name exists and ID is different', () => {
    const control = new FormControl('Tomato')
    const validator = duplicateNameValidator(productsSignal, 'p2')
    expect(validator(control)).toEqual({ duplicateName: true })
  })

  it('should return null if name exists but ID is the same (edit mode)', () => {
    const control = new FormControl('Tomato')
    const validator = duplicateNameValidator(productsSignal, 'p1')
    expect(validator(control)).toBeNull()
  })

  it('should be case-insensitive', () => {
    const control = new FormControl('tomato')
    const validator = duplicateNameValidator(productsSignal, 'p2')
    expect(validator(control)).toEqual({ duplicateName: true })
  })

  it('treats extra inner spaces as the same name (the one name rule)', () => {
    const spaced = [{ _id: 'p1', nameHebrew: 'עגבניה  שרי' }] as Product[]
    const control = new FormControl('  עגבניה   שרי ')
    expect(duplicateNameValidator(() => spaced, 'p2')(control)).toEqual({ duplicateName: true })
  })

  it('does not clash with its own product even with extra spaces', () => {
    const spaced = [{ _id: 'p1', nameHebrew: 'עגבניה שרי' }] as Product[]
    const control = new FormControl('עגבניה   שרי')
    expect(
      duplicateNameValidator(
        () => spaced,
        () => 'p1'
      )(control)
    ).toBeNull()
  })

  it('should return null for non-existent names', () => {
    const control = new FormControl('Cucumber')
    const validator = duplicateNameValidator(productsSignal)
    expect(validator(control)).toBeNull()
  })
})

describe('duplicateEntityNameValidator', () => {
  const items = [{ _id: 'v1', nameHebrew: 'Tel Aviv' }]
  const itemsSignal = () => items

  it('should return error if name exists and ID is different', () => {
    const control = new FormControl('Tel Aviv')
    const validator = duplicateEntityNameValidator(itemsSignal, 'v2')
    expect(validator(control)).toEqual({ duplicateName: true })
  })

  it('should return null if name exists but ID is the same (edit mode)', () => {
    const control = new FormControl('Tel Aviv')
    const validator = duplicateEntityNameValidator(itemsSignal, 'v1')
    expect(validator(control)).toBeNull()
  })

  it('should be case-insensitive and trim whitespace', () => {
    const control = new FormControl('  tel aviv  ')
    const validator = duplicateEntityNameValidator(itemsSignal, 'v2')
    expect(validator(control)).toEqual({ duplicateName: true })
  })

  it('should return null for empty value', () => {
    const control = new FormControl('')
    const validator = duplicateEntityNameValidator(itemsSignal)
    expect(validator(control)).toBeNull()
  })

  it('should accept a getter function for currentId', () => {
    let editId = 'v2'
    const control = new FormControl('Tel Aviv')
    const validator = duplicateEntityNameValidator(itemsSignal, () => editId)
    expect(validator(control)).toEqual({ duplicateName: true })
    editId = 'v1'
    expect(validator(control)).toBeNull()
  })
})
