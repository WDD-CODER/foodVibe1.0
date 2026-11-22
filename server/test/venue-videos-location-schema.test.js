'use strict';
/**
 * Plan 373 — a venue with tour video links and a saved location passes the shared schema.
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
  environmentType: 'outdoor_field',
  availableInfrastructure: []
};
const ok = extra => venueSchema.safeParse({ ...base, ...extra }).success;

describe('venue tour videos and location', () => {
  it('accepts videos and a location', () => {
    expect(ok({
      videos: [
        { url: 'https://youtu.be/abc', visitDate: 1700000000000, note: 'סיור ראשון' },
        { url: 'https://drive.google.com/file/d/x' }
      ],
      location: { lat: 32.0853, lng: 34.7818, accuracy: 15 }
    })).toBe(true);
  });

  it('still accepts a venue without either field', () => {
    expect(ok({})).toBe(true);
  });

  it('rejects a string lat, a missing lng and an unknown video field', () => {
    expect(ok({ location: { lat: '32.08', lng: 34.78 } })).toBe(false);
    expect(ok({ location: { lat: 32.08 } })).toBe(false);
    expect(ok({ videos: [{ url: 'https://x.y', title: 'a' }] })).toBe(false);
  });
});
