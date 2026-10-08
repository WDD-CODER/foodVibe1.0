import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { GeminiShotsService, estimateGramsPerPortion } from './gemini-shots.service'
import type { AiRecipeDraft } from './ai-recipe-draft.service'

const IMPLAUSIBLE = 'כמויות הרכיבים לא סבירות ביחס למספר המנות'

function draft(overrides: Partial<AiRecipeDraft> = {}): AiRecipeDraft {
  return {
    nameHebrew: 'חביתה',
    recipe_type: 'dish',
    yield_amount: 1,
    yield_unit: 'portion',
    ingredients: [
      { name: 'ביצים', amount: 3, unit: 'unit' },
      { name: 'שמן', amount: 1, unit: 'tablespoon' },
      { name: 'מלח', amount: 1, unit: 'pinch' }
    ],
    steps: ['טורפים', 'מטגנים'],
    ...overrides
  }
}

describe('GeminiShotsService.computeWarnings', () => {
  let service: GeminiShotsService

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(GeminiShotsService)
  })

  it('has no warnings for a plausible omelet', () => {
    expect(service.computeWarnings(draft())).toEqual([])
  })

  it('flags too little food per portion', () => {
    expect(service.computeWarnings(draft({ yield_amount: 10 }))).toContain(IMPLAUSIBLE)
  })

  it('flags too much food per portion', () => {
    const d = draft({
      ingredients: [
        { name: 'ביצים', amount: 12, unit: 'unit' },
        { name: 'גבינה', amount: 0.5, unit: 'kg' },
        { name: 'שמן', amount: 1, unit: 'tablespoon' }
      ]
    })
    expect(service.computeWarnings(d)).toContain(IMPLAUSIBLE)
  })

  it('flags an approved draft whose yield unit is "dish" (what the draft editor emits)', () => {
    expect(service.computeWarnings(draft({ yield_unit: 'dish', yield_amount: 10 }))).toContain(IMPLAUSIBLE)
  })

  it('does not judge preparations', () => {
    const d = draft({ recipe_type: 'preparation', yield_unit: 'gram', yield_amount: 10 })
    expect(service.computeWarnings(d)).not.toContain(IMPLAUSIBLE)
  })
})

describe('estimateGramsPerPortion (client mirror)', () => {
  it('matches the server estimate', () => {
    const d = draft({
      yield_amount: 2,
      ingredients: [
        { name: 'ביצים', amount: 4, unit: 'unit' },
        { name: 'חלב', amount: 0.1, unit: 'liter' },
        { name: 'חמאה', amount: 2, unit: 'teaspoon' },
        { name: 'עגבניה', amount: 1, unit: 'unit' },
        { name: 'מלח', amount: 1, unit: 'pinch' }
      ]
    })
    expect(estimateGramsPerPortion(d)).toBe(165)
  })

  it('returns null when nothing is weighable', () => {
    expect(estimateGramsPerPortion(draft({ ingredients: [{ name: 'עגבניה', amount: 1, unit: 'unit' }] }))).toBeNull()
  })
})
