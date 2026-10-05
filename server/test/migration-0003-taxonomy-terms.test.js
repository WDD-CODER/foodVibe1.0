'use strict';
/**
 * Plan 321 Phase 3 (P3.2) — 0003 planning step (pure, no DB): registry docs -> taxonomyTerms.
 */

const { buildTerms } = require('../migrations/0003-taxonomy-terms');

const NOW = 1700000000000;
const M = '__master__';

const empty = {
  KITCHEN_CATEGORIES: [], KITCHEN_ALLERGENS: [], KITCHEN_LABELS: [], KITCHEN_COURSES: [], MENU_TYPES: [],
  MENU_EVENT_TYPES: [], MENU_SECTION_CATEGORIES: [], EQUIPMENT_CUSTOM_CATEGORIES: [], KITCHEN_UNITS: [], KITCHEN_PREPARATIONS: [],
};
const run = regs => buildTerms({ ...empty, ...regs }, NOW);
const ids = terms => terms.map(t => t._id);

describe('0003 buildTerms', () => {
  test('explodes every registry shape into valid terms with registry order as sortOrder', () => {
    const { terms, report } = run({
      KITCHEN_CATEGORIES: [{ _id: 'a', userId: M, items: ['vegetables', 'dairy'] }],
      KITCHEN_LABELS: [{ _id: 'b', userId: M, items: [{ key: 'vegan', color: '#10B981', autoTriggers: ['tofu'] }] }],
      KITCHEN_COURSES: [{ _id: 'c', userId: M, items: [{ key: 'starter', color: '#3B82F6' }] }],
      MENU_TYPES: [{ _id: 'd', userId: M, items: [{ key: 'buffet_family', fields: ['sell_price'] }] }],
      KITCHEN_UNITS: [{ _id: 'e', userId: M, units: { kg: 1000, gram: 1 } }],
      KITCHEN_PREPARATIONS: [{ _id: 'f', userId: M, categories: ['sauces'], preparations: [{ name: 'aioli', category: 'sauces' }] }],
    });
    expect(report.invalid).toEqual([]);
    expect(ids(terms)).toEqual([
      'ingredientCategory:__master__:vegetables', 'ingredientCategory:__master__:dairy',
      'label:__master__:vegan', 'course:__master__:starter', 'menuType:__master__:buffet_family',
      'unit:__master__:kg', 'unit:__master__:gram',
      'prepCategory:__master__:sauces', 'preparation:__master__:aioli',
    ]);
    expect(terms[1].sortOrder).toBe(1);
    expect(terms.find(t => t.kind === 'unit' && t.key === 'kg').gramRate).toBe(1000);
    expect(terms.find(t => t.kind === 'preparation')).toMatchObject({ categoryKey: 'sauces', sortOrder: 0 });
  });

  test('a user copy keeps only keys master lacks; identical copies are dropped, different ones reported', () => {
    const { terms, report } = run({
      KITCHEN_LABELS: [
        { _id: 'm', userId: M, items: [{ key: 'vegan', color: '#10B981' }, { key: 'spicy', color: '#EF4444' }] },
        { _id: 'u', userId: 'u1', items: [{ key: 'vegan', color: '#10B981' }, { key: 'spicy', color: '#000000' }, { key: 'kids', color: '#F59E0B' }] },
      ],
    });
    expect(ids(terms)).toEqual(['label:__master__:vegan', 'label:__master__:spicy', 'label:u1:kids']);
    expect(terms.find(t => t.key === 'kids').sortOrder).toBe(0);
    expect(report.dropped).toEqual([{ owner: 'u1', kind: 'label', key: 'vegan' }]);
    expect(report.differs.map(d => d.key)).toEqual(['spicy']);
  });

  test('only the first registry doc per owner is live; extra copies are skipped and differing ones flagged', () => {
    const { terms, report } = run({
      MENU_EVENT_TYPES: [
        { _id: 'a', userId: M, items: ['wedding'] },
        { _id: 'b', userId: M, items: ['wedding'] },
        { _id: 'c', userId: M, items: ['bar_mitzvah'] },
      ],
    });
    expect(ids(terms)).toEqual(['eventType:__master__:wedding']);
    expect(report.extraDocs).toEqual([
      { coll: 'MENU_EVENT_TYPES', owner: M, id: 'b', differs: false },
      { coll: 'MENU_EVENT_TYPES', owner: M, id: 'c', differs: true },
    ]);
  });

  test('reports invalid terms, duplicates, near-duplicates and docs without an owner', () => {
    const { terms, report } = run({
      KITCHEN_ALLERGENS: [
        { _id: 'm', userId: M, items: ['nuts', 'nuts', '', 'sea_food'] },
        { _id: 'u', userId: 'u1', items: ['seafood'] },
        { _id: 'x', items: ['gluten'] },
      ],
      KITCHEN_COURSES: [{ _id: 'c', userId: M, items: [{ key: 'main' }] }],
    });
    expect(ids(terms)).toEqual(['allergen:__master__:nuts', 'allergen:__master__:sea_food', 'allergen:u1:seafood']);
    expect(report.duplicates).toHaveLength(1);
    expect(report.invalid.map(i => i.key)).toEqual(['', 'main']);
    expect(report.skipped).toEqual([{ coll: 'KITCHEN_ALLERGENS', id: 'x', reason: 'no userId' }]);
    expect(report.nearDuplicates).toEqual([{ kind: 'allergen', owner: 'u1', keys: ['sea_food', 'seafood'] }]);
  });
});
