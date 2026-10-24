import { FormArray, FormBuilder } from '@angular/forms'
import { blankMenuItemIndex, pruneBlankMenuItems } from './menu-form.util'

describe('menu-form.util blank rows (plan 496)', () => {
  const fb = new FormBuilder()
  const row = (recipeId: string) => fb.group({ recipeId: [recipeId] })
  const items = (...ids: string[]) => fb.array(ids.map(row))

  it('returns -1 when no row is blank', () => {
    expect(blankMenuItemIndex(items('a', 'b'))).toBe(-1)
  })

  it('returns the index of the blank row', () => {
    expect(blankMenuItemIndex(items('a', '', 'b'))).toBe(1)
  })

  it('ignores the skipped (renamed) row', () => {
    expect(blankMenuItemIndex(items('a', ''), 1)).toBe(-1)
  })

  it('finds the next blank row when the first is skipped', () => {
    expect(blankMenuItemIndex(items('', 'a', ''), 0)).toBe(2)
  })

  it('pruneBlankMenuItems removes every blank row', () => {
    const sections = fb.array([fb.group({ items: items('', 'a', '', '') })]) as FormArray
    pruneBlankMenuItems(sections)
    const left = sections.at(0).get('items') as FormArray
    expect(left.length).toBe(1)
    expect(left.at(0).get('recipeId')?.value).toBe('a')
  })
})
