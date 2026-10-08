'use strict';
/**
 * Plan 370 — offline unit tests for the Gemini recipe helpers (no Gemini, no Mongo).
 */

const {
  extractJsonPayload,
  validateRecipeDraft,
  normalizeIngredientUnits,
  computeSoftWarnings,
  estimateGramsPerPortion,
  IMPLAUSIBLE_PORTION_WEIGHT_WARNING,
  buildFewShotBlock,
  selectShots,
} = require('../services/ai-recipe-helpers');

function draft(overrides = {}) {
  return {
    nameHebrew: 'חביתה',
    recipe_type: 'dish',
    yield_amount: 1,
    yield_unit: 'portion',
    ingredients: [
      { name: 'ביצים', amount: 3, unit: 'unit' },
      { name: 'שמן', amount: 1, unit: 'tablespoon' },
      { name: 'מלח', amount: 1, unit: 'pinch' },
    ],
    steps: ['טורפים את הביצים', 'מטגנים במחבת'],
    ...overrides,
  };
}

describe('extractJsonPayload', () => {
  it('parses bare JSON', () => {
    expect(extractJsonPayload('{"a":1}')).toEqual({ value: { a: 1 } });
  });

  it('strips a markdown code fence', () => {
    expect(extractJsonPayload('```json\n{"a":2}\n```')).toEqual({ value: { a: 2 } });
  });

  it('falls back to the outermost {...} block when the model echoes a few-shot label', () => {
    expect(extractJsonPayload('פלט: {"nameHebrew":"x"} תודה')).toEqual({ value: { nameHebrew: 'x' } });
  });

  it('reports empty and invalid payloads', () => {
    expect(extractJsonPayload('   ')).toEqual({ error: 'empty' });
    expect(extractJsonPayload('not json')).toEqual({ error: 'invalid' });
    expect(extractJsonPayload('{ broken: }')).toEqual({ error: 'invalid' });
  });
});

describe('validateRecipeDraft', () => {
  it('accepts a well-formed draft', () => {
    expect(validateRecipeDraft(draft())).toEqual([]);
  });

  it('rejects a non-object', () => {
    expect(validateRecipeDraft(null)).toEqual(['recipe must be an object']);
  });

  it('lists every shape problem', () => {
    const errors = validateRecipeDraft({
      nameHebrew: '',
      recipe_type: 'soup',
      yield_amount: '2',
      yield_unit: '',
      ingredients: [{ name: '', amount: 'x', unit: 'clove' }],
      steps: [],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        'nameHebrew is required',
        'recipe_type must be "dish" or "preparation", got "soup"',
        'yield_amount must be a number',
        'yield_unit is required',
        'ingredients[0].name is required',
        'ingredients[0].amount must be a number',
        'ingredients[0].unit "clove" is not a canonical key',
        'steps must be a non-empty array',
      ])
    );
  });

  it('requires ingredients to be an array', () => {
    expect(validateRecipeDraft(draft({ ingredients: 'eggs' }))).toContain('ingredients must be an array');
  });
});

describe('normalizeIngredientUnits', () => {
  it('maps countable synonyms to "unit" and leaves canonical units alone', () => {
    const d = draft({
      ingredients: [
        { name: 'שום', amount: 4, unit: 'Cloves' },
        { name: 'פטרוזיליה', amount: 1, unit: 'bunch' },
        { name: 'קמח', amount: 200, unit: 'gram' },
      ],
    });
    normalizeIngredientUnits(d);
    expect(d.ingredients.map(i => i.unit)).toEqual(['unit', 'unit', 'gram']);
    expect(validateRecipeDraft(d)).toEqual([]);
  });

  it('tolerates a missing ingredients array', () => {
    expect(() => normalizeIngredientUnits({})).not.toThrow();
    expect(() => normalizeIngredientUnits(null)).not.toThrow();
  });
});

describe('computeSoftWarnings', () => {
  it('returns nothing for a plausible omelet', () => {
    expect(computeSoftWarnings(draft())).toEqual([]);
  });

  it('keeps the existing warnings', () => {
    const w = computeSoftWarnings({
      recipe_type: 'dish',
      yield_amount: 30,
      yield_unit: 'unit',
      ingredients: [{ name: 'x', amount: 1, unit: 'portion' }],
      steps: ['one'],
    });
    expect(w).toHaveLength(4);
  });

  it('flags too little food per portion (omelet for 10 from 3 eggs)', () => {
    expect(computeSoftWarnings(draft({ yield_amount: 10 }))).toContain(IMPLAUSIBLE_PORTION_WEIGHT_WARNING);
  });

  it('flags too much food per portion', () => {
    const d = draft({
      ingredients: [
        { name: 'ביצים', amount: 12, unit: 'unit' },
        { name: 'גבינה', amount: 0.5, unit: 'kg' },
        { name: 'שמן', amount: 1, unit: 'tablespoon' },
      ],
    });
    expect(computeSoftWarnings(d)).toContain(IMPLAUSIBLE_PORTION_WEIGHT_WARNING);
  });

  it('does not judge preparations or drafts with no weighable ingredient', () => {
    expect(computeSoftWarnings(draft({ recipe_type: 'preparation', yield_unit: 'gram', yield_amount: 10 })))
      .not.toContain(IMPLAUSIBLE_PORTION_WEIGHT_WARNING);
    const unweighable = draft({
      yield_amount: 10,
      ingredients: [
        { name: 'עגבניה', amount: 1, unit: 'unit' },
        { name: 'מלפפון', amount: 1, unit: 'unit' },
        { name: 'בצל', amount: 1, unit: 'unit' },
      ],
    });
    expect(computeSoftWarnings(unweighable)).not.toContain(IMPLAUSIBLE_PORTION_WEIGHT_WARNING);
  });
});

describe('estimateGramsPerPortion', () => {
  it('weighs eggs, spoons and metric units; skips unknown countables', () => {
    const d = draft({
      yield_amount: 2,
      ingredients: [
        { name: 'ביצים', amount: 4, unit: 'unit' }, // 220
        { name: 'חלב', amount: 0.1, unit: 'liter' }, // 100
        { name: 'חמאה', amount: 2, unit: 'teaspoon' }, // 10
        { name: 'עגבניה', amount: 1, unit: 'unit' }, // skipped
        { name: 'מלח', amount: 1, unit: 'pinch' }, // 0
      ],
    });
    expect(estimateGramsPerPortion(d)).toBe(165);
  });

  it('treats the "dish" yield unit the draft editor emits as portions', () => {
    expect(estimateGramsPerPortion(draft({ yield_unit: 'dish', yield_amount: 10 }))).toBe(18);
  });

  it('returns null when there is nothing to estimate', () => {
    expect(estimateGramsPerPortion(draft({ yield_amount: 0 }))).toBeNull();
    expect(estimateGramsPerPortion(draft({ yield_unit: 'unit' }))).toBeNull();
    expect(estimateGramsPerPortion(null)).toBeNull();
  });
});

describe('buildFewShotBlock', () => {
  it('returns an empty string for no shots', () => {
    expect(buildFewShotBlock([])).toBe('');
    expect(buildFewShotBlock(undefined)).toBe('');
  });

  it('formats shots and escapes quotes/newlines in the prompt', () => {
    const block = buildFewShotBlock([{ prompt: 'חביתה "גבינה"\nלשניים', draft: { nameHebrew: 'חביתה' } }]);
    expect(block.startsWith('## דוגמאות מאושרות מהמשתמש\n')).toBe(true);
    expect(block).toContain('קלט: "חביתה \\"גבינה\\"\\nלשניים"');
    expect(block).toContain('פלט: {"nameHebrew":"חביתה"}');
  });
});

describe('selectShots', () => {
  const shots = [
    { prompt: 'עוגת שוקולד', draft: { nameHebrew: 'עוגת שוקולד' } },
    { prompt: 'שקשוקה ל-4', draft: { nameHebrew: 'שקשוקה' } },
    { prompt: 'חֲבִיתָה עם גבינה', draft: { nameHebrew: 'חביתה גבינה' } },
    { prompt: 'מרק עוף', draft: { nameHebrew: 'מרק עוף' } },
    { prompt: 'חביתה ירוקה', draft: { nameHebrew: 'חביתה' } },
  ];

  it('picks only relevant shots, best match first, niqqud ignored', () => {
    const picked = selectShots(shots, 'חביתה גבינה', 2);
    expect(picked.map(s => s.prompt)).toEqual(['חֲבִיתָה עם גבינה', 'חביתה ירוקה']);
  });

  it('returns no shots when nothing overlaps (no unrelated examples)', () => {
    expect(selectShots(shots, 'סלט ירקות קצוץ', 2)).toEqual([]);
  });

  it('handles empty input', () => {
    expect(selectShots([], 'חביתה')).toEqual([]);
    expect(selectShots(shots, '')).toEqual([]);
    expect(selectShots(undefined, 'חביתה')).toEqual([]);
  });

  it('respects n', () => {
    expect(selectShots(shots, 'חביתה', 1)).toHaveLength(1);
  });

  it('ignores stop words and single letters', () => {
    expect(selectShots(shots, 'עם ל', 2)).toEqual([]);
  });
});
