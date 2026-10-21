import { FormBuilder } from '@angular/forms'
import { createMoneyGroup, moneyFieldsFromForm, moneyFormFromEvent } from './menu-money-form.util'

describe('menu money form', () => {
  const group = () => createMoneyGroup(new FormBuilder())

  it('a target of 100 gets the error targetTooHigh, 99.9 does not', () => {
    const form = group()
    form.controls.profitTargetPct.setValue(100)
    expect(form.controls.profitTargetPct.errors).toEqual({ targetTooHigh: true })
    form.controls.safetyMarginPct.setValue(100)
    expect(form.controls.safetyMarginPct.errors).toEqual({ targetTooHigh: true })
    form.controls.profitTargetPct.setValue(99.9)
    expect(form.controls.profitTargetPct.valid).toBe(true)
    expect(form.valid).toBe(false)
  })

  it('a negative extra cost gets the error min', () => {
    const form = group()
    form.controls.extraCostAmount.setValue(-1)
    expect(form.controls.extraCostAmount.errors?.['min']).toBeTruthy()
  })

  it('an empty form saves no money keys (an empty price is not 0)', () => {
    expect(moneyFieldsFromForm(group().getRawValue())).toEqual({})
  })

  it('a price of 0 is kept', () => {
    expect(moneyFieldsFromForm({ ...group().getRawValue(), pricePerGuest: 0 })).toEqual({ pricePerGuest: 0 })
  })

  it('builds the event fields and reads them back', () => {
    const fields = moneyFieldsFromForm({
      pricePerGuest: 200,
      extraCostAmount: 1000,
      extraCostNote: ' הובלה ',
      profitTargetPct: 15,
      safetyMarginPct: null
    })
    expect(fields).toEqual({
      pricePerGuest: 200,
      extraCosts: { amount: 1000, note: 'הובלה' },
      targetsOverride: { profitTargetPct: 15 }
    })
    expect(moneyFormFromEvent(fields)).toEqual({
      pricePerGuest: 200,
      extraCostAmount: 1000,
      extraCostNote: 'הובלה',
      profitTargetPct: 15,
      safetyMarginPct: null
    })
  })

  it('a note without an amount saves amount 0', () => {
    expect(moneyFieldsFromForm({ extraCostNote: 'x' })).toEqual({ extraCosts: { amount: 0, note: 'x' } })
  })
})
