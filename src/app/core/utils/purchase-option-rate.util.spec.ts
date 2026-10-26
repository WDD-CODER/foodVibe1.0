import { optionRateInBase } from './purchase-option-rate.util'
import { SYSTEM_UNITS } from '@services/unit-registry.service'

const registry = { getConversion: (key: string): number => SYSTEM_UNITS[key] || 1 }

describe('optionRateInBase', () => {
  it('reads 1 jar = 500 gram as 0.5 on a kg product', () => {
    expect(optionRateInBase({ baseUnit: 'kg' }, { conversionRate: 500, uom: 'gram' }, registry)).toBe(0.5)
  })

  it('reads the same option as 500 on a gram product', () => {
    expect(optionRateInBase({ baseUnit: 'gram' }, { conversionRate: 500, uom: 'gram' }, registry)).toBe(500)
  })

  it('returns conversionRate unchanged when uom is missing', () => {
    expect(optionRateInBase({ baseUnit: 'kg' }, { conversionRate: 0.33 }, registry)).toBe(0.33)
  })

  it('returns conversionRate unchanged when uom equals the base unit', () => {
    expect(optionRateInBase({ baseUnit: 'kg' }, { conversionRate: 2, uom: 'kg' }, registry)).toBe(2)
  })
})
