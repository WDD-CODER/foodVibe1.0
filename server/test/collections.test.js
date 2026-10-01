'use strict';
/**
 * Plan 321 Phase 1 — server/constants/collections.js is now the single source of
 * truth every derived list (ALL_USER_ENTITY_TYPES, CLONEABLE_TYPES,
 * SEARCHABLE_ENTITY_TYPES, and the client's BACKUP_ENTITY_TYPES) comes from.
 */

const { COLLECTIONS, ALL_USER_ENTITY_TYPES, CLONEABLE_TYPES, SEARCHABLE_ENTITY_TYPES, BACKUP_ENTITY_TYPES } = require('../constants/collections');

describe('server/constants/collections.js', () => {
  it('every entry declares all four flags as booleans', () => {
    for (const entry of COLLECTIONS) {
      expect(typeof entry.name).toBe('string');
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.userData).toBe('boolean');
      expect(typeof entry.cloneable).toBe('boolean');
      expect(typeof entry.backup).toBe('boolean');
      expect(typeof entry.searchable).toBe('boolean');
    }
  });

  it('has no duplicate collection names', () => {
    const names = COLLECTIONS.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every cloneable/backup/searchable entry is also userData (no orphan flags)', () => {
    for (const entry of COLLECTIONS) {
      if (entry.cloneable || entry.backup || entry.searchable) {
        expect(entry.userData).toBe(true);
      }
    }
  });

  it('derived lists match the flags exactly', () => {
    expect(ALL_USER_ENTITY_TYPES).toEqual(COLLECTIONS.filter(c => c.userData).map(c => c.name));
    expect(CLONEABLE_TYPES).toEqual(COLLECTIONS.filter(c => c.cloneable).map(c => c.name));
    expect(SEARCHABLE_ENTITY_TYPES).toEqual(COLLECTIONS.filter(c => c.searchable).map(c => c.name));
    expect(BACKUP_ENTITY_TYPES).toEqual(COLLECTIONS.filter(c => c.backup).map(c => c.name));
  });

  it('suppliers precedes products in CLONEABLE_TYPES (supplierIdMap ordering)', () => {
    expect(CLONEABLE_TYPES.indexOf('suppliers')).toBeLessThan(CLONEABLE_TYPES.indexOf('products'));
  });
});
