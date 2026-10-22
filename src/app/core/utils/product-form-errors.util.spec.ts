import { FormControl, FormArray, FormGroup, Validators } from '@angular/forms'
import { failedSaveMessage, invalidFieldLabelKeys } from './product-form-errors.util'

describe('product-form-errors.util', () => {
  const dictionary: Record<string, string> = {
    form_has_errors: 'יש לתקן את השדות המסומנים',
    form_has_errors_fields: 'יש לתקן: {{fields}}',
    product_name: 'שם הפריט',
    base_unit: 'יחידת בסיס',
    purchase_units_section: 'יחידות רכש'
  }
  const translate = { translate: (key: string) => dictionary[key] ?? key }

  function makeForm(name: string, base: string, rows: number): FormGroup {
    return new FormGroup({
      productName: new FormControl(name, Validators.required),
      baseUnit: new FormControl(base, Validators.required),
      purchaseOptions: new FormArray(
        Array.from({ length: rows }, () => new FormGroup({ unitSymbol: new FormControl('', Validators.required) }))
      )
    })
  }

  it('lists the invalid fields in page order', () => {
    const form = makeForm('', '', 1)
    expect(invalidFieldLabelKeys(form.controls)).toEqual(['product_name', 'base_unit', 'purchase_units_section'])
  })

  it('names the invalid fields in the failed-save message', () => {
    const form = makeForm('', 'kg', 1)
    expect(failedSaveMessage(form.controls, translate)).toBe('יש לתקן: שם הפריט, יחידות רכש')
  })

  it('names only the name box for a duplicate name', () => {
    const form = makeForm('עגבניה', 'kg', 0)
    form.get('productName')?.setErrors({ duplicateName: true })
    expect(failedSaveMessage(form.controls, translate)).toBe('יש לתקן: שם הפריט')
  })

  it('falls back to the plain message when no known field is invalid', () => {
    const form = makeForm('עגבניה', 'kg', 0)
    expect(failedSaveMessage(form.controls, translate)).toBe('יש לתקן את השדות המסומנים')
  })

  it('names the name box when the save check rejected a name of only spaces', () => {
    const form = makeForm('   ', 'kg', 0)
    expect(failedSaveMessage(form.controls, translate)).toBe('יש לתקן: שם הפריט')
  })
})
