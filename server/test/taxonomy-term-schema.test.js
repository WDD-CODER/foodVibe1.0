'use strict';
/**
 * Plan 321 Phase 3 (P3.1) — taxonomyTerms schema: one doc per term, discriminated on `kind`.
 */

const { taxonomyTermSchema, TAXONOMY_KINDS, REGISTRY_KIND_BY_COLLECTION, SCHEMA_BY_COLLECTION } =
  require('../generated/schemas/entities');

const base = {
  _id: 't1',
  schemaVersion: 2,
  userId: '__master__',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  sortOrder: 0
};

const ok = doc => taxonomyTermSchema.safeParse(doc).success;

describe('taxonomyTermSchema', () => {
  test('is registered as the taxonomyTerms collection schema', () => {
    expect(SCHEMA_BY_COLLECTION.taxonomyTerms).toBe(taxonomyTermSchema);
  });

  test('accepts a plain term for every kind without extra fields', () => {
    for (const kind of ['ingredientCategory', 'allergen', 'protein', 'kosherType', 'prepCategory', 'eventType', 'sectionCategory', 'equipmentCategory']) {
      expect(ok({ ...base, kind, key: 'k' })).toBe(true);
    }
  });

  test('accepts each kind with its own fields', () => {
    expect(ok({ ...base, kind: 'label', key: 'vegan', color: '#10B981', autoTriggers: ['tofu'] })).toBe(true);
    expect(ok({ ...base, kind: 'course', key: 'starter', color: '#3B82F6' })).toBe(true);
    expect(ok({ ...base, kind: 'unit', key: 'kg', gramRate: 1000 })).toBe(true);
    expect(ok({ ...base, kind: 'preparation', key: 'aioli', categoryKey: 'sauces' })).toBe(true);
    expect(ok({ ...base, kind: 'menuType', key: 'buffet_family', fields: ['sell_price', 'serving_portions'] })).toBe(true);
  });

  test('rejects missing kind-specific fields and fields from another kind', () => {
    expect(ok({ ...base, kind: 'label', key: 'vegan' })).toBe(false);
    expect(ok({ ...base, kind: 'unit', key: 'kg' })).toBe(false);
    expect(ok({ ...base, kind: 'allergen', key: 'nuts', color: '#10B981' })).toBe(false);
    expect(ok({ ...base, kind: 'menuType', key: 'x', fields: ['not_a_field'] })).toBe(false);
  });

  test('rejects an unknown kind, an empty key and a bad color', () => {
    expect(ok({ ...base, kind: 'flavor', key: 'k' })).toBe(false);
    expect(ok({ ...base, kind: 'allergen', key: '' })).toBe(false);
    expect(ok({ ...base, kind: 'course', key: 'k', color: 'blue' })).toBe(false);
  });

  test('every v1 registry maps to known kinds', () => {
    for (const kinds of Object.values(REGISTRY_KIND_BY_COLLECTION)) {
      for (const kind of [].concat(kinds)) expect(TAXONOMY_KINDS).toContain(kind);
    }
  });
});
