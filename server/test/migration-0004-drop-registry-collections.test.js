'use strict';
/**
 * Plan 321 Phase 3 (P3.5) — 0004 planning step (pure, no DB): which registry terms have no
 * taxonomy term before the registry collections are dropped.
 */

const { findMissingTerms, REGISTRY_COLLECTIONS } = require('../migrations/0004-drop-registry-collections');

const M = '__master__';
const empty = Object.fromEntries(REGISTRY_COLLECTIONS.map(c => [c, []]));
const term = (kind, userId, key, extra = {}) => ({ _id: `api-${key}`, kind, userId, key, ...extra });

describe('0004 findMissingTerms', () => {
  test('covers every v1 registry collection', () => {
    expect(REGISTRY_COLLECTIONS).toEqual(expect.arrayContaining([
      'KITCHEN_CATEGORIES', 'KITCHEN_ALLERGENS', 'KITCHEN_LABELS', 'KITCHEN_COURSES', 'KITCHEN_UNITS',
      'KITCHEN_PREPARATIONS', 'MENU_TYPES', 'MENU_EVENT_TYPES', 'MENU_SECTION_CATEGORIES', 'EQUIPMENT_CUSTOM_CATEGORIES',
    ]));
    expect(REGISTRY_COLLECTIONS).toHaveLength(10);
  });

  test('matches by kind + key + owner, whatever the term _id is', () => {
    const registries = {
      ...empty,
      KITCHEN_CATEGORIES: [{ _id: 'a', userId: M, items: ['vegetables', 'dairy'] }],
      MENU_EVENT_TYPES: [{ _id: 'b', userId: 'userA', items: ['wedding'] }],
    };
    const stored = [term('ingredientCategory', M, 'vegetables'), term('eventType', 'userA', 'wedding')];
    expect(findMissingTerms(registries, stored)).toEqual([{ kind: 'ingredientCategory', userId: M, key: 'dairy' }]);
  });

  test('a term owned by someone else, or soft-deleted, does not count', () => {
    const registries = { ...empty, MENU_EVENT_TYPES: [{ _id: 'b', userId: 'userA', items: ['wedding', 'brit'] }] };
    const stored = [term('eventType', 'userB', 'wedding'), term('eventType', 'userA', 'brit', { deletedAt: 1 })];
    expect(findMissingTerms(registries, stored)).toEqual([
      { kind: 'eventType', userId: 'userA', key: 'wedding' },
      { kind: 'eventType', userId: 'userA', key: 'brit' },
    ]);
  });

  test('nothing is missing when the registries are empty', () => {
    expect(findMissingTerms(empty, [])).toEqual([]);
  });
});
