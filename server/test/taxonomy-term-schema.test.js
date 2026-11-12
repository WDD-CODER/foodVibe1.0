'use strict';
/**
 * Plan 321 Phase 3 (P3.1) — taxonomyTerms schema: one doc per term, discriminated on `kind`.
 */

const { taxonomyTermSchema, TAXONOMY_KINDS, REGISTRY_KIND_BY_COLLECTION, SCHEMA_BY_COLLECTION } =
  require('../generated/schemas/entities');

const { logisticsItemBody } = require('./helpers/v2-docs');

const base = {
  _id: 't1',
  schemaVersion: 2,
  userId: '__master__',
  businessId: '__master__',
  createdBy: '__master__',
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

  test('a dish type needs no color, but a stored one is still accepted (plan 438)', () => {
    expect(ok({ ...base, kind: 'course', key: 'starter' })).toBe(true);
    expect(ok({ ...base, kind: 'course', key: 'starter', color: '#3B82F6' })).toBe(true);
    expect(ok({ ...base, kind: 'course', key: 'k', color: 'blue' })).toBe(false);
  });

  test('rejects missing kind-specific fields and fields from another kind', () => {
    expect(ok({ ...base, kind: 'label', key: 'vegan' })).toBe(false);
    expect(ok({ ...base, kind: 'unit', key: 'kg' })).toBe(false);
    expect(ok({ ...base, kind: 'allergen', key: 'nuts', color: '#10B981' })).toBe(false);
    expect(ok({ ...base, kind: 'menuType', key: 'x', fields: ['not_a_field'] })).toBe(false);
  });

  test('a station is a plain term: no color allowed (plan 436)', () => {
    expect(ok({ ...base, kind: 'station', key: 'חם' })).toBe(true);
    expect(ok({ ...base, kind: 'station', key: 'חם', color: '#10B981' })).toBe(false);
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

  describe('logisticsItem (plan 518)', () => {
    const item = { ...base, ...logisticsItemBody({ environments: ['client_home'], hint: 'רמז' }) };
    test('accepts every field', () => {
      expect(ok(item)).toBe(true);
      expect(TAXONOMY_KINDS).toContain('logisticsItem');
    });
    test('accepts environments absent', () => {
      const { environments, ...rest } = item;
      expect(ok(rest)).toBe(true);
    });
    test('rejects an unknown environment and an unknown phase', () => {
      expect(ok({ ...item, environments: ['moon'] })).toBe(false);
      expect(ok({ ...item, phase: 'later' })).toBe(false);
    });
    test('plan 579: own section, removedAt 0 and foldedAt validate; a 121-char section fails', () => {
      expect(ok({ ...item, section: 'סעיף שלי', removedAt: 0, foldedAt: 5 })).toBe(true);
      expect(ok({ ...item, section: 'א'.repeat(121) })).toBe(false);
    });
    test('plan 579: logisticsSection is a plain kind', () => {
      expect(TAXONOMY_KINDS).toContain('logisticsSection');
      expect(ok({ ...base, kind: 'logisticsSection', key: 'סעיף שלי' })).toBe(true);
    });
  });
});
