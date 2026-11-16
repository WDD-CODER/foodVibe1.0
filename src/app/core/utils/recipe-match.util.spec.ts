import { matchMenuDish, pickDishOptions, scoreDishName } from './recipe-match.util'

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
    expect(result.defaultChoice).toBe('d2')
  })

  it('an unknown dishId falls back to the name match', () => {
    const result = matchMenuDish({ nameHebrew: 'חומוס', dishId: 'nope' }, records)
    expect(result.status).toBe('matched')
    expect(result.bestMatch?.recipeId).toBe('d1')
  })
})

describe('scoreDishName (plan 614)', () => {
  const typed = "קרפצ'יו דג"
  const plain = "קרפצ'יו דג עם עלים"
  const long = "קרפצ'יו דג עם זרעי עגבניות ושמן זית"

  it('an identical name is 1', () => {
    expect(scoreDishName(typed, "קרפצ'יו דג")).toBe(1)
  })

  it('the shorter dish that starts the same scores higher than the long one, and neither is 100%', () => {
    const a = scoreDishName(typed, plain)
    const b = scoreDishName(typed, long)
    expect(a).toBeGreaterThan(b)
    expect(a).toBeLessThan(1)
    expect(b).toBeGreaterThanOrEqual(0.7)
  })

  it('a dish without the key word stays at or below 0.5', () => {
    expect(scoreDishName('מרק', 'תבשיל שעועית עם רוטב')).toBe(0)
    expect(scoreDishName('מרק עגבניות', 'סלט עגבניות')).toBeLessThanOrEqual(0.5)
  })

  it('a small spelling difference still counts as the same word', () => {
    expect(scoreDishName('קרפציו דג', plain)).toBeGreaterThan(0.8)
  })

  it('filler words do not count as a match', () => {
    expect(scoreDishName('דג עם לימון', 'סלט עם חומוס')).toBe(0)
  })
})

describe('matchMenuDish scoring (plan 614)', () => {
  const dishes = [
    { _id: 'c1', nameHebrew: "קרפצ'יו דג עם זרעי עגבניות ושמן זית" },
    { _id: 'c0', nameHebrew: "קרפצ'יו דג עם עלים" },
    { _id: 'c2', nameHebrew: 'תבשיל שעועית עם רוטב' },
    { _id: 'c3', nameHebrew: 'מרק עגבניות' }
  ]

  it('options are ordered by the word score: the shorter fish carpaccio first, different %', () => {
    const result = matchMenuDish({ nameHebrew: "קרפצ'יו דג" }, dishes)
    expect(result.candidates.map((c) => c.recipeId)).toEqual(['c0', 'c1'])
    expect(result.candidates[0].confidence).toBeGreaterThan(result.candidates[1].confidence)
    expect(result.defaultChoice).toBe('c0')
  })

  it('a dish only the AI listed (no shared word) is capped at 60% and never preselected', () => {
    const result = matchMenuDish({ nameHebrew: 'סלט', matches: [{ dishId: 'c2', confidence: 0.95 }] }, dishes)
    const bean = result.candidates.find((c) => c.recipeId === 'c2')
    expect(bean?.confidence).toBe(0.6)
    expect(result.defaultChoice).not.toBe('c2')
  })

  it('the AI confidence number is not used', () => {
    const low = matchMenuDish({ nameHebrew: 'סלט', matches: [{ dishId: 'c2', confidence: 0.61 }] }, dishes)
    const high = matchMenuDish({ nameHebrew: 'סלט', matches: [{ dishId: 'c2', confidence: 0.99 }] }, dishes)
    expect(low.candidates).toEqual(high.candidates)
  })

  it('nothing close → unmatched and the default is a new dish', () => {
    const result = matchMenuDish({ nameHebrew: 'פלאפל' }, dishes)
    expect(result.status).toBe('unmatched')
    expect(result.candidates).toEqual([])
    expect(result.defaultChoice).toBe('new')
  })
})

describe('pickDishOptions (plan 614)', () => {
  const cands = (...scores: number[]) =>
    scores.map((confidence, i) => ({ recipeId: `r${i + 1}`, name: `מנה ${i + 1}`, confidence }))
  const scores = (r: ReturnType<typeof pickDishOptions>) => r.options.map((o) => o.confidence)

  it('0.96 / 0.80 → only 0.96', () => {
    expect(scores(pickDishOptions(cands(0.96, 0.8)))).toEqual([0.96])
  })

  it('0.80 / 0.70 / 0.40 → 0.80 and 0.70', () => {
    expect(scores(pickDishOptions(cands(0.8, 0.7, 0.4)))).toEqual([0.8, 0.7])
  })

  it('0.90 / 0.65 / 0.62 → only 0.90', () => {
    expect(scores(pickDishOptions(cands(0.9, 0.65, 0.62)))).toEqual([0.9])
  })

  it('0.85 / 0.75 / 0.72 / 0.71 → exactly three', () => {
    expect(scores(pickDishOptions(cands(0.71, 0.85, 0.72, 0.75)))).toEqual([0.85, 0.75, 0.72])
  })

  it('0.65 / 0.62 → both', () => {
    expect(scores(pickDishOptions(cands(0.65, 0.62)))).toEqual([0.65, 0.62])
  })

  it('0.55 only → no options', () => {
    expect(pickDishOptions(cands(0.55))).toEqual({ options: [], defaultChoice: 'new' })
  })

  it('two dishes with the same name give one option, and fewer than 3 are shown when fewer fit', () => {
    const dup = [
      { recipeId: 'a', name: "קרפצ'יו דג ועלי חמציץ", confidence: 0.85 },
      { recipeId: 'b', name: 'קרפציו דג ועלי חמציץ', confidence: 0.85 },
      { recipeId: 'c', name: 'קרפצ׳יו דג עם זרעי עגבניות', confidence: 0.77 }
    ]
    expect(pickDishOptions(dup).options.map((o) => o.recipeId)).toEqual(['a', 'c'])
    expect(pickDishOptions(dup.slice(0, 2)).options.map((o) => o.recipeId)).toEqual(['a'])
  })

  it('the default is the top option at ≥ 0.70 and a new dish below', () => {
    expect(pickDishOptions(cands(0.7, 0.65)).defaultChoice).toBe('r1')
    expect(pickDishOptions(cands(0.69, 0.65)).defaultChoice).toBe('new')
  })
})
