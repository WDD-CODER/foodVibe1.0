'use strict'
/** Plan 635 - the shared unit rule as the server loads it. */
const { toBase, unitRatesFrom } = require('../generated/schemas/units/to-base')

const rates = unitRatesFrom([])
const kgProduct = {
  baseUnit: 'kg',
  purchaseOptions: [
    { unitSymbol: 'ארגז', conversionRate: 10, uom: 'kg' },
    { unitSymbol: 'צנצנת', conversionRate: 500, uom: 'gram' },
  ],
}
const gramProduct = { baseUnit: 'gram', purchaseOptions: [] }

describe('toBase', () => {
  it('converts gram to kg', () => expect(toBase(500, 'gram', kgProduct, rates)).toBe(0.5))
  it('converts kg to gram', () => expect(toBase(2, 'kg', gramProduct, rates)).toBe(2000))
  it('converts a crate', () => expect(toBase(3, 'ארגז', kgProduct, rates)).toBe(30))
  it('converts a jar typed in grams on a kilo product', () => expect(toBase(2, 'צנצנת', kgProduct, rates)).toBe(1))
  it('never converts mass to volume', () => expect(toBase(1, 'liter', kgProduct, rates)).toBeNull())
  it('answers null for an unknown unit', () => expect(toBase(1, 'zzz', kgProduct, rates)).toBeNull())
})

describe('unitRatesFrom', () => {
  it('keeps the system units over a stored term', () => {
    expect(unitRatesFrom([{ key: 'kg', gramRate: 5 }]).getConversion('kg')).toBe(1000)
  })
  it('lets a later term replace an earlier one (own over master)', () => {
    const r = unitRatesFrom([{ key: 'crate', gramRate: 100 }, { key: 'crate', gramRate: 250 }])
    expect(r.getConversion('crate')).toBe(250)
  })
  it('reads an unknown key as 1', () => {
    const r = unitRatesFrom([])
    expect(r.getConversion('nope')).toBe(1)
    expect(r.has('nope')).toBe(false)
  })
})
