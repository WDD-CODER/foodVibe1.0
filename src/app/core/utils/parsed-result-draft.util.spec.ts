import { parsedResultToDraft } from './parsed-result-draft.util'
import type { ParsedResult } from '@models/parsed-result.model'

const resolveUnit = (t: string): string | null => ({ 'ק"ג': 'kg', kg: 'kg', גרם: 'gram' })[t] ?? null

describe('parsedResultToDraft', () => {
  it('maps name, ingredients and ordered steps', () => {
    const result: ParsedResult = {
      type: 'recipe',
      confidence: 0.9,
      data: {
        nameHebrew: 'רוטב עגבניות',
        serving_portions: 4,
        labels: [],
        ingredients: [
          { nameHebrew: 'עגבניות', amount_net: 2, unit: 'kg' },
          { nameHebrew: 'מלח', amount_net: null, unit: null }
        ],
        steps: [
          { order: 2, instruction: 'מבשלים' },
          { order: 1, instruction: 'חותכים' }
        ]
      }
    }
    expect(parsedResultToDraft(result, resolveUnit)).toEqual({
      nameHebrew: 'רוטב עגבניות',
      recipe_type: 'preparation',
      yield_amount: 4,
      yield_unit: 'portion',
      ingredients: [
        { name: 'עגבניות', amount: 2, unit: 'kg' },
        { name: 'מלח', amount: 0, unit: 'unit' }
      ],
      steps: ['חותכים', 'מבשלים']
    })
  })

  it('uses recipe_type dish for a dish and 1 portion when none is stated', () => {
    const draft = parsedResultToDraft(
      {
        type: 'dish',
        confidence: 1,
        data: {
          nameHebrew: 'פסטה',
          serving_portions: null,
          labels: [],
          ingredients: [{ nameHebrew: 'פסטה', amount_net: 100, unit: 'gram' }],
          steps: []
        } as never
      },
      resolveUnit
    )
    expect(draft?.recipe_type).toBe('dish')
    expect(draft?.yield_amount).toBe(1)
  })

  it('returns null when there are no ingredients and no steps', () => {
    expect(
      parsedResultToDraft(
        {
          type: 'recipe',
          confidence: 0.1,
          data: { nameHebrew: 'שלום', serving_portions: null, labels: [], ingredients: [], steps: [] }
        },
        resolveUnit
      )
    ).toBeNull()
    expect(parsedResultToDraft(null, resolveUnit)).toBeNull()
  })

  it('resolves Hebrew unit words to canonical keys and keeps an unknown unit as raw text', () => {
    const draft = parsedResultToDraft(
      {
        type: 'recipe',
        confidence: 0.9,
        data: {
          nameHebrew: 'רוטב',
          serving_portions: 2,
          labels: [],
          ingredients: [
            { nameHebrew: 'עגבניות', amount_net: 2, unit: 'ק"ג' },
            { nameHebrew: 'סוכר', amount_net: 100, unit: 'גרם' },
            { nameHebrew: 'שימורים', amount_net: 1, unit: 'קופסה' }
          ],
          steps: []
        } as never
      },
      resolveUnit
    )
    expect(draft?.ingredients.map((i) => i.unit)).toEqual(['kg', 'gram', 'קופסה'])
  })
})
