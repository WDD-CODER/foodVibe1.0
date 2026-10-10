import { codeToEnglishChar, finalizeEnglishKey, liveEnglishKey } from './english-key.util'

describe('english-key.util', () => {
  describe('codeToEnglishChar', () => {
    it('maps letter key codes to lowercase letters', () => {
      expect(codeToEnglishChar('KeyA')).toBe('a')
      expect(codeToEnglishChar('KeyZ')).toBe('z')
    })

    it('maps digit key codes to digits', () => {
      expect(codeToEnglishChar('Digit0')).toBe('0')
      expect(codeToEnglishChar('Digit9')).toBe('9')
    })

    it('returns null for other codes', () => {
      expect(codeToEnglishChar('Space')).toBeNull()
      expect(codeToEnglishChar('Minus')).toBeNull()
      expect(codeToEnglishChar('Numpad1')).toBeNull()
      expect(codeToEnglishChar('Backspace')).toBeNull()
      expect(codeToEnglishChar('')).toBeNull()
    })
  })

  describe('liveEnglishKey', () => {
    it('turns whitespace into underscores and lowercases', () => {
      expect(liveEnglishKey('Olive Oil')).toBe('olive_oil')
      expect(liveEnglishKey('a\tb')).toBe('a_b')
    })

    it('keeps length so the caret can stay put', () => {
      expect(liveEnglishKey('olive  oil ').length).toBe('olive  oil '.length)
    })

    it('keeps non-English chars for validation to catch', () => {
      expect(liveEnglishKey('שמן zait')).toBe('שמן_zait')
    })
  })

  describe('finalizeEnglishKey', () => {
    it('collapses repeated underscores and trims them at both ends', () => {
      expect(finalizeEnglishKey('__olive___oil_')).toBe('olive_oil')
      expect(finalizeEnglishKey('  olive  oil  ')).toBe('olive_oil')
    })

    it('turns hyphens into underscores', () => {
      expect(finalizeEnglishKey('extra-virgin olive')).toBe('extra_virgin_olive')
    })

    it('does not strip leftover non-English chars', () => {
      expect(finalizeEnglishKey('olive שמן')).toBe('olive_שמן')
    })

    it('returns empty for underscores only', () => {
      expect(finalizeEnglishKey('___')).toBe('')
    })
  })
})
