import { formatDecimal1, formatMoney, formatPct1, formatPctInt, formatQty, roundMoney, roundPortions } from './rounding'

describe('rounding', () => {
  it('roundPortions drops float noise before rounding up', () => {
    expect(roundPortions(1.1 * 1.1 * 100)).toBe(121)
    expect(roundPortions(126.5)).toBe(127)
    expect(roundPortions(126.0000001)).toBe(126)
    expect(roundPortions(126.4)).toBe(127)
  })

  it('formatQty switches gram to kg only above 1000', () => {
    expect(formatQty(1500, 'gram')).toEqual({ qty: 1.5, unit: 'kg' })
    expect(formatQty(1000, 'gram')).toEqual({ qty: 1000, unit: 'gram' })
    expect(formatQty(499.6, 'g')).toEqual({ qty: 500, unit: 'gram' })
  })

  it('formatQty keeps kg and liter to 2 decimals and switches ml to liter above 1000', () => {
    expect(formatQty(18.754, 'kg')).toEqual({ qty: 18.75, unit: 'kg' })
    expect(formatQty(1500, 'ml')).toEqual({ qty: 1.5, unit: 'liter' })
    expect(formatQty(2.346, 'liter')).toEqual({ qty: 2.35, unit: 'liter' })
  })

  it('formatQty rounds countable units up and keeps the unit label', () => {
    expect(formatQty(2.1, 'unit')).toEqual({ qty: 3, unit: 'unit' })
    expect(formatQty(1.875, 'ארגז')).toEqual({ qty: 2, unit: 'ארגז' })
    expect(formatQty(3.0000001, 'unit')).toEqual({ qty: 3, unit: 'unit' })
  })

  it('formats money, percents and numeric money', () => {
    expect(formatMoney(1234.5)).toBe('₪1,234.50')
    expect(formatPct1(16.666)).toBe('16.7%')
    expect(formatPctInt(57.14)).toBe('57%')
    expect(roundMoney(93.745)).toBe(93.75)
  })

  it('formatDecimal1 keeps one decimal and drops a trailing .0', () => {
    expect(formatDecimal1(2.345)).toBe('2.3')
    expect(formatDecimal1(3)).toBe('3')
    expect(formatDecimal1(0.7)).toBe('0.7')
    expect(formatDecimal1(6.96)).toBe('7')
  })
})
