import { scalingRuleFrom, scalingRuleErrors } from './scaling-rule.util'

describe('scalingRuleFrom', () => {
  it('on without a maximum stores per guests and minimum', () => {
    expect(scalingRuleFrom({ scalingEnabled: true, perGuests: 10, minQuantity: 2, maxQuantity: null }, false)).toEqual({
      perGuests: 10,
      minQuantity: 2
    })
  })
  it('on with a maximum stores it', () => {
    expect(
      scalingRuleFrom({ scalingEnabled: true, perGuests: '20', minQuantity: '1', maxQuantity: '3' }, true)
    ).toEqual({
      perGuests: 20,
      minQuantity: 1,
      maxQuantity: 3
    })
  })
  it('off on an item that had a rule stores the zero rule', () => {
    expect(scalingRuleFrom({ scalingEnabled: false }, true)).toEqual({ perGuests: 0, minQuantity: 0 })
  })
  it('off on an item that never had one stores nothing', () => {
    expect(scalingRuleFrom({ scalingEnabled: false }, false)).toBeUndefined()
  })
})

describe('scalingRuleErrors', () => {
  it('is empty while off', () => {
    expect(scalingRuleErrors({ scalingEnabled: false, perGuests: null })).toEqual({})
  })
  it('asks for per guests (blank, zero, fraction)', () => {
    for (const per of [null, '', 0, 1.5]) {
      expect(scalingRuleErrors({ scalingEnabled: true, perGuests: per, minQuantity: 1 })['perGuests']).toBe(
        'scaling_per_guests_required'
      )
    }
  })
  it('asks for a minimum', () => {
    expect(scalingRuleErrors({ scalingEnabled: true, perGuests: 5, minQuantity: null })['minQuantity']).toBe(
      'scaling_min_required'
    )
  })
  it('refuses a maximum below the minimum', () => {
    expect(
      scalingRuleErrors({ scalingEnabled: true, perGuests: 5, minQuantity: 3, maxQuantity: 2 })['maxQuantity']
    ).toBe('scaling_max_below_min')
  })
  it('accepts a valid rule', () => {
    expect(scalingRuleErrors({ scalingEnabled: true, perGuests: 5, minQuantity: 0, maxQuantity: 4 })).toEqual({})
  })
})
