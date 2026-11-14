import { waLink } from './wa-link.util'

describe('waLink', () => {
  it('turns a leading 0 into 972 and keeps digits only', () => {
    expect(waLink('052-123 4567')).toBe('https://wa.me/972521234567')
  })

  it('keeps a leading 972', () => {
    expect(waLink('+972 52 123 4567')).toBe('https://wa.me/972521234567')
  })

  it('returns null under 9 digits', () => {
    expect(waLink('1234567')).toBeNull()
    expect(waLink('')).toBeNull()
    expect(waLink(undefined)).toBeNull()
  })

  it('encodes the text', () => {
    expect(waLink('0521234567', 'שלום & ברכה')).toBe(
      `https://wa.me/972521234567?text=${encodeURIComponent('שלום & ברכה')}`
    )
  })
})
