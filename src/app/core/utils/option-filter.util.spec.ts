import { filterOptionsByLabel } from './option-filter.util'

describe('filterOptionsByLabel', () => {
  const opts = ['סיר 20 ליטר', 'מחבת', '20 ליטר דלי', 'Pan', 'sauce pan']
  const id = (s: string) => s

  it('returns every option for an empty query', () => {
    expect(filterOptionsByLabel(opts, '  ', id)).toEqual(opts)
  })

  it('matches by contains, with prefix matches first', () => {
    expect(filterOptionsByLabel(opts, '20 ליטר', id)).toEqual(['20 ליטר דלי', 'סיר 20 ליטר'])
  })

  it('is case-insensitive and trims the query', () => {
    expect(filterOptionsByLabel(opts, ' PAN ', id)).toEqual(['Pan', 'sauce pan'])
  })

  it('filters by the label function', () => {
    const items = [
      { k: 'meat', l: 'בשר' },
      { k: 'fish', l: 'דג' }
    ]
    expect(filterOptionsByLabel(items, 'בש', (i) => i.l)).toEqual([items[0]])
  })
})
