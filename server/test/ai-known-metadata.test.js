'use strict';
/**
 * Plan 335 — /generate-product and /patch-product append the user's registered
 * category/allergen keys to the Gemini system prompt so the model reuses them.
 */

const { appendKnownMetadata } = require('../routes/ai');

const BASE = 'BASE PROMPT';

describe('appendKnownMetadata', () => {
  it('returns the prompt unchanged when no keys are sent', () => {
    expect(appendKnownMetadata(BASE, {})).toBe(BASE);
    expect(appendKnownMetadata(BASE, undefined)).toBe(BASE);
    expect(appendKnownMetadata(BASE, { knownCategories: [], knownAllergens: [] })).toBe(BASE);
  });

  it('appends both key lists and the prefer-existing instruction', () => {
    const out = appendKnownMetadata(BASE, { knownCategories: ['dairy', 'meat'], knownAllergens: ['gluten'] });
    expect(out.startsWith(`${BASE}\n`)).toBe(true);
    expect(out).toContain('- categories: ["dairy","meat"]');
    expect(out).toContain('- allergens: ["gluten"]');
    expect(out).toContain('prefer one of these existing names');
    expect(out).toContain('must be in Hebrew');
  });

  it('omits a list that is empty', () => {
    const out = appendKnownMetadata(BASE, { knownCategories: ['dairy'] });
    expect(out).toContain('- categories: ["dairy"]');
    expect(out).not.toContain('- allergens:');
  });

  it('ignores non-array and non-string input', () => {
    expect(appendKnownMetadata(BASE, { knownCategories: 'dairy', knownAllergens: { a: 1 } })).toBe(BASE);
    const out = appendKnownMetadata(BASE, { knownCategories: [1, null, '  ', ' dairy ', 'dairy'] });
    expect(out).toContain('- categories: ["dairy"]');
  });

  it('caps each list at 200 entries', () => {
    const many = Array.from({ length: 250 }, (_, i) => `cat_${i}`);
    const out = appendKnownMetadata(BASE, { knownCategories: many });
    expect(out).toContain('"cat_199"');
    expect(out).not.toContain('"cat_200"');
  });
});
