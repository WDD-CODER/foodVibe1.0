'use strict';
/**
 * Plan 440 — event type / serving type coefficients, event snapshots, per-item portionsPerDiner
 * and coefficientOverride are validated by the shared schemas (INV-4).
 */

const { taxonomyTermSchema, menuEventSchema } = require('../generated/schemas/entities');

const termBase = {
  _id: 't1',
  schemaVersion: 2,
  userId: '__master__',
  businessId: '__master__',
  createdBy: '__master__',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  sortOrder: 0,
  key: 'k'
};
const okTerm = doc => taxonomyTermSchema.safeParse(doc).success;

const item = extra => ({ recipeId: 'r1', recipeType: 'dish', derivedPortions: 10, ...extra });
const event = (itemExtra, eventExtra) => ({
  _id: 'e1',
  schemaVersion: 2,
  userId: 'u1',
  businessId: 'b_u1',
  createdBy: 'u1',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  name: 'Event',
  eventType: 'חתונה',
  servingType: 'buffet_family',
  guestCount: 100,
  sections: [{ _id: 's1', name: 'Main', sortOrder: 0, items: [item(itemExtra)] }],
  ...eventExtra
});
const okEvent = doc => menuEventSchema.safeParse(doc).success;

describe('eventType coefficient', () => {
  test('accepts 1.15, rejects 1.155 and 0, accepts none', () => {
    expect(okTerm({ ...termBase, kind: 'eventType', coefficient: 1.15 })).toBe(true);
    expect(okTerm({ ...termBase, kind: 'eventType', coefficient: 1.155 })).toBe(false);
    expect(okTerm({ ...termBase, kind: 'eventType', coefficient: 0 })).toBe(false);
    expect(okTerm({ ...termBase, kind: 'eventType', coefficient: -1 })).toBe(false);
    expect(okTerm({ ...termBase, kind: 'eventType' })).toBe(true);
  });
});

describe('menuType coefficient', () => {
  const menuType = extra => ({ ...termBase, kind: 'menuType', fields: ['sell_price'], ...extra });
  test('accepts 1.15, rejects 1.155 and 0, accepts none', () => {
    expect(okTerm(menuType({ coefficient: 1.15 }))).toBe(true);
    expect(okTerm(menuType({ coefficient: 1.155 }))).toBe(false);
    expect(okTerm(menuType({ coefficient: 0 }))).toBe(false);
    expect(okTerm(menuType({}))).toBe(true);
  });
});

describe('menu event', () => {
  test('accepts both snapshots, portionsPerDiner and coefficientOverride', () => {
    expect(okEvent(event(
      { portionsPerDiner: 0.5, coefficientOverride: 1.1 },
      {
        eventTypeSnapshot: { key: 'חתונה', name: 'חתונה', coefficient: 1.2 },
        servingTypeSnapshot: { key: 'buffet_family', name: 'בופה', coefficient: 1.1 }
      }
    ))).toBe(true);
  });
  test('an item without predictedTakeRate is valid', () => {
    expect(okEvent(event({}))).toBe(true);
  });
  test('portionsPerDiner 0 is valid, negative is not', () => {
    expect(okEvent(event({ portionsPerDiner: 0 }))).toBe(true);
    expect(okEvent(event({ portionsPerDiner: -1 }))).toBe(false);
  });
  test('coefficientOverride 1.111 and 0 are invalid', () => {
    expect(okEvent(event({ coefficientOverride: 1.111 }))).toBe(false);
    expect(okEvent(event({ coefficientOverride: 0 }))).toBe(false);
  });
  test('a snapshot needs a positive coefficient', () => {
    expect(okEvent(event({}, { eventTypeSnapshot: { key: 'a', name: 'a', coefficient: 0 } }))).toBe(false);
  });
});
