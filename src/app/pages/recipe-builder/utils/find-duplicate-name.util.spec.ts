import type { Recipe } from '@models/recipe.model'
import { findDuplicateName } from './find-duplicate-name.util'

describe('findDuplicateName', () => {
  const list = [
    { _id: 'r1', nameHebrew: 'Soup', recipeType: 'preparation' },
    { _id: 'd1', nameHebrew: 'Stew', recipeType: 'dish', _masterId: 'm1' }
  ] as Recipe[]

  it('excludes the record being edited (same id)', () => {
    expect(findDuplicateName(list, 'Soup', 'r1')).toBeNull()
  })

  it('trims whitespace on both sides', () => {
    expect(findDuplicateName(list, '  Soup ', null)?._id).toBe('r1')
    expect(findDuplicateName([{ _id: 'r2', nameHebrew: ' Soup ' }] as Recipe[], 'Soup', null)?._id).toBe('r2')
  })

  it('finds a dish/recipe twin across types', () => {
    expect(findDuplicateName(list, 'Stew', 'r1')).toEqual(list[1])
  })

  it('returns null when nothing matches or the name is empty', () => {
    expect(findDuplicateName(list, 'Pasta', null)).toBeNull()
    expect(findDuplicateName(list, '   ', null)).toBeNull()
  })
})
