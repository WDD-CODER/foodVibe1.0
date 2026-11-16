import type { MatchedDish } from '@models/ai-menu-draft.model'
import type { MenuEvent } from '@models/menu-event.model'
import { aiMenuNameOrEmpty, courseKeyForSection, linkUnlinkedMenuItem, resolveAiMenuDish } from './menu-unlinked.util'

const menu = (): MenuEvent =>
  ({
    _id: 'm1',
    name: 'אירוע',
    eventType: 'חתונה',
    servingType: 'buffet',
    guestCount: 50,
    sections: [
      {
        _id: 's1',
        name: 'ראשונות',
        sortOrder: 1,
        items: [
          { recipeId: 'd1', recipeType: 'dish', derivedPortions: 50 },
          { recipeId: '', recipeType: 'dish', derivedPortions: 0, unlinkedName: "קרפצ'יו דג" }
        ]
      },
      {
        _id: 's2',
        name: 'עיקריות',
        sortOrder: 2,
        items: [{ recipeId: '', recipeType: 'dish', derivedPortions: 0, unlinkedName: "קרפצ'יו דג" }]
      }
    ]
  }) as MenuEvent

describe('linkUnlinkedMenuItem (plan 614)', () => {
  it('links the matching unlinked item of that section only', () => {
    const out = linkUnlinkedMenuItem(menu(), 's1', "קרפצ'יו דג", 'new1', 'dish')
    expect(out).not.toBeNull()
    expect(out!.sections[0].items[1]).toEqual({ recipeId: 'new1', recipeType: 'dish', derivedPortions: 0 })
    expect(out!.sections[1].items[0].unlinkedName).toBe("קרפצ'יו דג")
    expect(out!.sections[0].items[0].recipeId).toBe('d1')
  })

  it('returns null when no item in the section has that name', () => {
    expect(linkUnlinkedMenuItem(menu(), 's1', 'אחר', 'new1', 'dish')).toBeNull()
    expect(linkUnlinkedMenuItem(menu(), 'nope', "קרפצ'יו דג", 'new1', 'dish')).toBeNull()
  })

  it('does not change the menu it was given', () => {
    const before = menu()
    linkUnlinkedMenuItem(before, 's1', "קרפצ'יו דג", 'new1', 'dish')
    expect(before.sections[0].items[1].recipeId).toBe('')
  })
})

describe('resolveAiMenuDish (plan 614)', () => {
  const dish = (over: Partial<MatchedDish> = {}): MatchedDish => ({
    nameHebrew: "קרפצ'יו דג",
    status: 'ambiguous',
    recipeId: null,
    candidates: [],
    ...over
  })

  it("'new' keeps the typed name as an unlinked dish", () => {
    expect(resolveAiMenuDish(dish(), 'new')).toEqual({ recipeId: '', unlinkedName: "קרפצ'יו דג" })
  })

  it("'skip' drops the dish", () => {
    expect(resolveAiMenuDish(dish(), 'skip')).toBeNull()
  })

  it('a picked id links the dish', () => {
    expect(resolveAiMenuDish(dish(), 'd9')).toEqual({ recipeId: 'd9' })
  })

  it('no resolution uses the default choice, and an unmatched dish stays unlinked', () => {
    expect(resolveAiMenuDish(dish({ defaultChoice: 'd2' }), undefined)).toEqual({ recipeId: 'd2' })
    expect(resolveAiMenuDish(dish({ status: 'unmatched' }), undefined)).toEqual({
      recipeId: '',
      unlinkedName: "קרפצ'יו דג"
    })
    expect(resolveAiMenuDish(dish({ status: 'matched', recipeId: 'd3' }), undefined)).toEqual({ recipeId: 'd3' })
  })
})

describe('courseKeyForSection (plan 614)', () => {
  const courses = [
    { key: 'starter', label: 'מנה ראשונה' },
    { key: 'main course', label: 'מנה עיקרית' },
    { key: 'dessert', label: 'קינוח' }
  ]

  it('matches a plural section name to the course label', () => {
    expect(courseKeyForSection('ראשונות', courses)).toBe('starter')
    expect(courseKeyForSection('עיקריות', courses)).toBe('main course')
    expect(courseKeyForSection('קינוחים', courses)).toBe('dessert')
  })

  it('a section that is no course gives nothing', () => {
    expect(courseKeyForSection('בר שתייה', courses)).toBe('')
    expect(courseKeyForSection('', courses)).toBe('')
  })
})

describe('aiMenuNameOrEmpty (plan 614)', () => {
  it('a generic AI name is no name', () => {
    expect(aiMenuNameOrEmpty('אירוע')).toBe('')
    expect(aiMenuNameOrEmpty('  תפריט חדש ')).toBe('')
    expect(aiMenuNameOrEmpty(null)).toBe('')
  })

  it('a real name stays', () => {
    expect(aiMenuNameOrEmpty('חתונה של דנה')).toBe('חתונה של דנה')
    expect(aiMenuNameOrEmpty('אירוע חברה')).toBe('אירוע חברה')
  })
})
