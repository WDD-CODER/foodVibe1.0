import { matchMenuDish, matchRecipeName } from './recipe-match.util'

describe('matchMenuDish (plan 580)', () => {
  const records = [
    { _id: 'd1', nameHebrew: 'חומוס' },
    { _id: 'd2', nameHebrew: 'שניצל' }
  ]

  it('a known dishId is matched with that id and no candidates', () => {
    const result = matchMenuDish({ nameHebrew: 'שם אחר', dishId: 'd2' }, records)
    expect(result.status).toBe('matched')
    expect(result.bestMatch).toEqual({ recipeId: 'd2', name: 'שניצל', confidence: 1 })
    expect(result.candidates).toEqual([])
  })

  it('an unknown dishId falls back to the name match', () => {
    const result = matchMenuDish({ nameHebrew: 'חומוס', dishId: 'nope' }, records)
    expect(result).toEqual(matchRecipeName('חומוס', records))
  })

  it('no dishId gives the same result as matchRecipeName', () => {
    const result = matchMenuDish({ nameHebrew: 'שניצל' }, records)
    expect(result).toEqual(matchRecipeName('שניצל', records))
  })
})
