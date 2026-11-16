import { FormArray, FormBuilder } from '@angular/forms'
import {
  blankMenuItemIndex,
  dateMenuName,
  pruneBlankMenuItems,
  uniqueMenuName,
  recipeIdValidators
} from './menu-form.util'

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

describe('menu-form.util unlinked dishes (plan 614)', () => {
  const fb = new FormBuilder()
  const row = (recipeId: string, unlinkedName = '') => fb.group({ recipeId: [recipeId], unlinkedName: [unlinkedName] })

  it('an unlinked row is not blank and is not pruned', () => {
    const items = fb.array([row('', 'קרפצ׳יו דג'), row(''), row('a')])
    expect(blankMenuItemIndex(items)).toBe(1)
    const sections = fb.array([fb.group({ items })]) as FormArray
    pruneBlankMenuItems(sections)
    const left = sections.at(0).get('items') as FormArray
    expect(left.length).toBe(2)
    expect(left.at(0).get('unlinkedName')?.value).toBe('קרפצ׳יו דג')
  })

  it('recipeId is required only when there is no unlinked name', () => {
    expect(recipeIdValidators('קרפצ׳יו')).toEqual([])
    expect(recipeIdValidators('')).toHaveSize(1)
    expect(recipeIdValidators(undefined)).toHaveSize(1)
  })
})

describe('dateMenuName (plan 614)', () => {
  const day = new Date(2026, 10, 16)

  it('the first menu of the day is named by the date', () => {
    expect(dateMenuName([], day)).toBe('16/11/2026')
    expect(dateMenuName(['אירוע', '15/11/2026'], day)).toBe('16/11/2026')
  })

  it('the second gets (2) and the third (3)', () => {
    expect(dateMenuName(['16/11/2026'], day)).toBe('16/11/2026 (2)')
    expect(dateMenuName(['16/11/2026', '16/11/2026 (2)'], day)).toBe('16/11/2026 (3)')
  })
})

describe('uniqueMenuName (plan 614)', () => {
  it('a free name stays as it is', () => {
    expect(uniqueMenuName('אירוע', [])).toBe('אירוע')
    expect(uniqueMenuName('  אירוע ', ['חתונה'])).toBe('אירוע')
  })

  it('a taken name gets (2), then (3), whoever wrote it', () => {
    expect(uniqueMenuName('אירוע', ['אירוע'])).toBe('אירוע (2)')
    expect(uniqueMenuName('אירוע', ['אירוע', 'אירוע (2)'])).toBe('אירוע (3)')
  })
})
