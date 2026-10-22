import { foldProductName, matchProductName } from './product-name-match.util'

const mk = (...names: string[]) => names.map((nameHebrew, i) => ({ _id: `p${i}`, nameHebrew }))
const products = mk('עגבנייה', 'פטרוזיליה', 'מלח', 'ביצה', 'בצל ירוק', 'מלפפון', 'חלב', 'חלבה')
const hit = (name: string, list = products) => {
  const m = matchProductName(name, list)
  return m && m.kind !== 'ambiguous' ? m.product.nameHebrew : (m?.kind ?? null)
}

describe('matchProductName', () => {
  it('links plural, spelling variants and trailing space to עגבנייה', () => {
    expect(hit('עגבניות')).toBe('עגבנייה')
    expect(hit('עגבניה')).toBe('עגבנייה')
    expect(hit('עגבנייה ')).toBe('עגבנייה')
  })

  it('links a missing vowel letter and niqqud to פטרוזיליה', () => {
    expect(hit('פטרוזליה')).toBe('פטרוזיליה')
    expect(hit('פְּטְרוֹזִיליָה')).toBe('פטרוזיליה')
  })

  it('links plurals of one and several words', () => {
    expect(hit('ביצים')).toBe('ביצה')
    expect(hit('בצלים ירוקים')).toBe('בצל ירוק')
    expect(hit('מלפפונים')).toBe('מלפפון')
  })

  it('never merges חלב and חלבה', () => {
    expect(hit('חלבה')).toBe('חלבה')
    expect(hit('חלב')).toBe('חלב')
    expect(matchProductName('חלבה', mk('חלב'))).toBeNull()
    expect(matchProductName('חלב', mk('חלבה'))).toBeNull()
  })

  it('does not link a letter typo (that is the AI step)', () => {
    expect(matchProductName('פטרוזיליא', products)).toBeNull()
  })

  it('reports exact vs variant', () => {
    expect(matchProductName('מלח', products)?.kind).toBe('exact')
    expect(matchProductName('ביצים', products)?.kind).toBe('variant')
  })

  it('is ambiguous when two products fold to the same key, but exact still wins', () => {
    const twins = mk('עגבנייה', 'עגבניה')
    expect(matchProductName('עגבניות', twins)?.kind).toBe('ambiguous')
    const exact = matchProductName('עגבנייה', twins)
    expect(exact?.kind).toBe('exact')
    expect(exact && exact.kind === 'exact' && exact.product._id).toBe('p0')
  })

  it('returns null for an empty name or empty list', () => {
    expect(matchProductName('   ', products)).toBeNull()
    expect(matchProductName('מלח', [])).toBeNull()
  })

  it('does not match when the word counts differ', () => {
    expect(matchProductName('בצל', products)).toBeNull()
  })
})

describe('foldProductName', () => {
  it('gives stem and stem+ה for a plural word', () => {
    expect(foldProductName('ביצים')).toEqual([['בצ', 'בצה']])
  })
})
