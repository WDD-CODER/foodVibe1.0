'use strict';
/**
 * Plan 321 Phase 1 — server/constants/collections.js is now the single source of
 * truth every derived list (ALL_USER_ENTITY_TYPES, CLONEABLE_TYPES,
 * SEARCHABLE_ENTITY_TYPES, and BACKUP_ENTITY_TYPES) comes from.
 */

const { COLLECTIONS, ALL_USER_ENTITY_TYPES, CLONEABLE_TYPES, SEARCHABLE_ENTITY_TYPES, BACKUP_ENTITY_TYPES, ROUTER_WRITE_TYPES } = require('../constants/collections');

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

  it('routerWrites is a boolean when present and ROUTER_WRITE_TYPES matches it (requests, bookings, invoices, diagnoses, stockCounts)', () => {
    for (const entry of COLLECTIONS) {
      if ('routerWrites' in entry) expect(typeof entry.routerWrites).toBe('boolean');
    }
    expect(ROUTER_WRITE_TYPES).toEqual(COLLECTIONS.filter(c => c.routerWrites).map(c => c.name));
    expect(ROUTER_WRITE_TYPES).toEqual(['requests', 'bookings', 'invoices', 'diagnoses', 'stockCounts']);
  });

  it('plan 724: the three dish analysis types are plain userData, not cloneable, backed up, written through the generic API', () => {
    for (const name of ['menuDishes', 'dishSalesMonths', 'dishSalesAliases']) {
      expect(COLLECTIONS.find(c => c.name === name)).toEqual({ name, userData: true, cloneable: false, backup: true, searchable: false, softDelete: false });
      expect(ALL_USER_ENTITY_TYPES).toContain(name);
      expect(ROUTER_WRITE_TYPES).not.toContain(name);
    }
  });

  it('plan 727: monthPlans is server-only money data: no generic API, no clone, no backup', () => {
    expect(COLLECTIONS.find(c => c.name === 'monthPlans')).toEqual({ name: 'monthPlans', userData: false, cloneable: false, backup: false, searchable: false, softDelete: false });
    expect(ALL_USER_ENTITY_TYPES).not.toContain('monthPlans');
    expect(CLONEABLE_TYPES).not.toContain('monthPlans');
    expect(BACKUP_ENTITY_TYPES).not.toContain('monthPlans');
  });

  it('suppliers precedes products in CLONEABLE_TYPES (supplierIdMap ordering)', () => {
    expect(CLONEABLE_TYPES.indexOf('suppliers')).toBeLessThan(CLONEABLE_TYPES.indexOf('products'));
  });
});
