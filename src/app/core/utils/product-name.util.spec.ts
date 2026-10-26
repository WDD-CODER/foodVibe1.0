import { normalizeProductName } from './product-name.util'

describe('normalizeProductName', () => {
  it('trims, collapses spaces and lower-cases Latin (same results as the server)', () => {
    expect(normalizeProductName('  שמנת   32% ')).toBe('שמנת 32%')
    expect(normalizeProductName(' Olive  OIL ')).toBe('olive oil')
    expect(normalizeProductName('עגבנייה')).toBe('עגבנייה')
  })

  it('gives an empty string for nothing', () => {
    expect(normalizeProductName(null)).toBe('')
    expect(normalizeProductName(undefined)).toBe('')
    expect(normalizeProductName('   ')).toBe('')
  })
})
