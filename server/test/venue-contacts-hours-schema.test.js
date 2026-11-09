'use strict';
/**
 * Plan 372 — a venue with several contacts and structured opening hours passes the shared schema.
 */

const { venueSchema } = require('../generated/schemas/entities');

const base = {
  _id: 'v1',
  schemaVersion: 2,
  userId: 'u1',
  businessId: 'b_u1',
  createdBy: 'u1',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  nameHebrew: 'אולם',
  environmentType: 'professional_kitchen',
  availableInfrastructure: []
};
const ok = extra => venueSchema.safeParse({ ...base, ...extra }).success;

describe('venue contacts and structured hours', () => {
  it('accepts two contacts and structured hours', () => {
    expect(ok({
      contacts: [{ name: 'דנה', phone: '050-1234567', role: 'מנהלת' }, { name: 'רון' }],
      operatingHours: [{ days: 'א׳–ה׳', time: '08:00–23:00', dayIndexes: [0, 1, 2, 3, 4], open: '08:00', close: '23:00' }]
    })).toBe(true);
  });

  it('still accepts hours with only days and time', () => {
    expect(ok({ operatingHours: [{ days: 'א׳', time: '08:00–09:00' }] })).toBe(true);
  });

  it('rejects a bad day index, a bad time and an unknown contact field', () => {
    expect(ok({ operatingHours: [{ days: 'x', time: 'y', dayIndexes: [7] }] })).toBe(false);
    expect(ok({ operatingHours: [{ days: 'x', time: 'y', open: '8:00' }] })).toBe(false);
    expect(ok({ contacts: [{ name: 'דנה', email: 'a@b.c' }] })).toBe(false);
  });
});
