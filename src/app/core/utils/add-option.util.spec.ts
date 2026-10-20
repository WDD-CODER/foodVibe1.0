import {
  addOptionLabel,
  DEFAULT_ADD_NEW_LABEL_KEY,
  findOptionByLabel,
  resolveAddedKey,
  notifyItemAdded
} from './add-option.util'

const he: Record<string, string> = { dairy: 'חלבי', meat: 'בשרי', fish: 'דגים' }
const label = (k: string): string => he[k] ?? k

describe('add-option util', () => {
  describe('findOptionByLabel', () => {
    it('matches the translated label, not the stored key', () => {
      expect(findOptionByLabel('חלבי', ['dairy', 'meat'], label)).toBe('dairy')
      expect(findOptionByLabel('dairy', ['dairy', 'meat'], (k) => he[k])).toBeUndefined()
    })

    it('trims and ignores case; empty text matches nothing', () => {
      expect(findOptionByLabel('  Meat ', ['Meat'], (k) => k)).toBe('Meat')
      expect(findOptionByLabel('   ', ['a'], (k) => k)).toBeUndefined()
    })

    it('a prefix is not an exact match', () => {
      expect(findOptionByLabel('חל', ['dairy'], label)).toBeUndefined()
    })
  })

  describe('addOptionLabel', () => {
    it('typed new name → typed label with trimmed text', () => {
      expect(addOptionLabel(' פרווה ', ['dairy'], label, 'add_new_category')).toEqual({ kind: 'typed', text: 'פרווה' })
    })

    it('nothing typed → generic key', () => {
      expect(addOptionLabel('', ['dairy'], label, 'add_new_category')).toEqual({
        kind: 'generic',
        key: 'add_new_category'
      })
    })

    it('exact match by translated label → generic key', () => {
      expect(addOptionLabel('בשרי', ['dairy', 'meat'], label, 'add_new_category')).toEqual({
        kind: 'generic',
        key: 'add_new_category'
      })
    })

    it('falls back to the neutral key, never bare "add"', () => {
      const res = addOptionLabel('', [], label, '')
      expect(res).toEqual({ kind: 'generic', key: DEFAULT_ADD_NEW_LABEL_KEY })
      expect(DEFAULT_ADD_NEW_LABEL_KEY).not.toBe('add')
    })
  })

  describe('resolveAddedKey', () => {
    it('returns the stored key when it differs from the typed text', () => {
      expect(resolveAddedKey(['meat'], ['meat', 'fish'], 'דגים', label)).toBe('fish')
    })

    it('prefers the new key whose label matches the typed text', () => {
      expect(resolveAddedKey(['meat'], ['meat', 'dairy', 'fish'], 'דגים', label)).toBe('fish')
    })

    it('falls back to the first new key', () => {
      expect(resolveAddedKey([], ['x_key'], 'something else', label)).toBe('x_key')
    })

    it('cancel (nothing new) → null', () => {
      expect(resolveAddedKey(['meat'], ['meat'], 'דגים', label)).toBeNull()
    })
  })
})

describe('notifyItemAdded', () => {
  it('shows "<name>" + the added suffix, and nothing for an empty name', () => {
    const msgs: string[] = []
    const userMsg = { onSetSuccessMsg: (t: string) => msgs.push(t) }
    notifyItemAdded(userMsg, (k) => (k === 'item_added_suffix' ? 'נוסף' : k), ' ביצים ')
    notifyItemAdded(userMsg, (k) => k, '  ')
    expect(msgs).toEqual(['"ביצים" נוסף'])
  })
})
