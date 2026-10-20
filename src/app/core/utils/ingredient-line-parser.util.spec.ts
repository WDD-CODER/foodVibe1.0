import { createUnitWordResolver, parseIngredientLines } from './ingredient-line-parser.util'

const UNITS: Record<string, string> = {
  'ק"ג': 'kg',
  kg: 'kg',
  גרם: 'gram',
  ליטר: 'liter',
  כוס: 'cup'
}
const resolve = (t: string): string | null => UNITS[t] ?? null

describe('parseIngredientLines', () => {
  it('reads amount, unit and name, and keeps an unreadable line as text', () => {
    expect(parseIngredientLines('2 ק"ג עגבניות\n200 גרם מלח\nקצת פטרוזיליה', resolve)).toEqual([
      { kind: 'parsed', amount: 2, unit: 'kg', name: 'עגבניות' },
      { kind: 'parsed', amount: 200, unit: 'gram', name: 'מלח' },
      { kind: 'text', text: 'קצת פטרוזיליה' }
    ])
  })

  it('reads a decimal amount', () => {
    expect(parseIngredientLines('1.5 ליטר חלב', resolve)).toEqual([
      { kind: 'parsed', amount: 1.5, unit: 'liter', name: 'חלב' }
    ])
  })

  it('reads a vulgar fraction', () => {
    expect(parseIngredientLines('½ כוס סוכר', resolve)).toEqual([
      { kind: 'parsed', amount: 0.5, unit: 'cup', name: 'סוכר' }
    ])
  })

  it('reads a slash fraction and a mixed number', () => {
    expect(parseIngredientLines('1/4 כוס סוכר', resolve)[0]).toEqual({
      kind: 'parsed',
      amount: 0.25,
      unit: 'cup',
      name: 'סוכר'
    })
    expect(parseIngredientLines('1 1/2 כוס סוכר', resolve)[0]).toEqual({
      kind: 'parsed',
      amount: 1.5,
      unit: 'cup',
      name: 'סוכר'
    })
  })

  it('reads gershayim and a comma decimal', () => {
    expect(parseIngredientLines('2,5 ק״ג קמח', resolve)).toEqual([
      { kind: 'parsed', amount: 2.5, unit: 'kg', name: 'קמח' }
    ])
  })

  it('uses unit "unit" and the whole rest as the name when the first word is not a unit', () => {
    expect(parseIngredientLines('3 ביצים', resolve)).toEqual([
      { kind: 'parsed', amount: 3, unit: 'unit', name: 'ביצים' }
    ])
    expect(parseIngredientLines('2 קופסאות שימורים', resolve)).toEqual([
      { kind: 'parsed', amount: 2, unit: 'unit', name: 'קופסאות שימורים' }
    ])
  })

  it('keeps a number and unit with no name as text', () => {
    expect(parseIngredientLines('2 ק"ג', resolve)).toEqual([{ kind: 'text', text: '2 ק"ג' }])
  })

  it('skips blank lines', () => {
    expect(parseIngredientLines('\n  \n3 ביצים\n\n', resolve).length).toBe(1)
    expect(parseIngredientLines('   ', resolve)).toEqual([])
  })

  it('handles Windows line breaks and leading bullets', () => {
    expect(parseIngredientLines('- 3 ביצים\r\n• 200 גרם מלח', resolve).map((l) => l.kind)).toEqual(['parsed', 'parsed'])
  })

  it('reads a mixed vulgar fraction', () => {
    expect(parseIngredientLines('1½ כוס סוכר', resolve)).toEqual([
      { kind: 'parsed', amount: 1.5, unit: 'cup', name: 'סוכר' }
    ])
  })
})

describe('createUnitWordResolver', () => {
  const resolver = createUnitWordResolver({
    aliases: { 'ק"ג': 'kg' },
    translate: (t) => (t === 'גרם' ? 'gram' : t === 'ק״מ' ? 'km' : null),
    knownKeys: () => ['cup']
  })

  it('tries aliases, then the dictionary (also with gershayim), then a key as typed', () => {
    expect(resolver('ק"ג')).toBe('kg')
    expect(resolver('גרם')).toBe('gram')
    expect(resolver('ק"מ')).toBe('km')
    expect(resolver('Cup')).toBe('cup')
    expect(resolver('קופסה')).toBeNull()
  })
})
