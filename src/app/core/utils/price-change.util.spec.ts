import { priceChangePct } from './price-change.util'

describe('priceChangePct', () => {
  it('is the change in percent with two decimals', () => {
    expect(priceChangePct(5, 5.3)).toBe(6)
    expect(priceChangePct(5, 4.8)).toBe(-4)
    expect(priceChangePct(3, 4)).toBe(33.33)
  })

  it('is null when a price is missing or the old price is not above 0', () => {
    expect(priceChangePct(null, 5)).toBeNull()
    expect(priceChangePct(5, null)).toBeNull()
    expect(priceChangePct(0, 5)).toBeNull()
    expect(priceChangePct(-1, 5)).toBeNull()
  })

  it('is 0 for the same price', () => {
    expect(priceChangePct(5, 5)).toBe(0)
  })
})
