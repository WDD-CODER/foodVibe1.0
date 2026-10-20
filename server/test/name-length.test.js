'use strict';
/**
 * Plan 417 — every entity's own name is limited to 200 characters (shared/schemas nameField).
 * Found by plan 414's nightly API checks: a 200 kB name was saved (201) on every entity.
 */

const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const {
  productBody, recipeBody, supplierBody, equipmentBody, venueBody, menuEventBody, stored,
} = require('./helpers/v2-docs');

const LIMIT = 200;

/** type → [name field, minimal valid body]. dishes share the recipe schema. */
const CASES = [
  ['products', 'nameHebrew', productBody],
  ['products', 'nameEnglish', productBody],
  ['recipes', 'nameHebrew', recipeBody],
  ['dishes', 'nameHebrew', recipeBody],
  ['suppliers', 'nameHebrew', supplierBody],
  ['equipment', 'nameHebrew', equipmentBody],
  ['venues', 'nameHebrew', venueBody],
  ['menuEvents', 'name', menuEventBody],
];

let app;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

beforeEach(async () => {
  const db = testDb();
  const collections = await db.listCollections().toArray();
  await Promise.all(collections.filter(c => c.type === 'collection').map(c => db.collection(c.name).deleteMany({})));
});

const auth = () => ({ Authorization: `Bearer ${signTestToken({ userId: 'userA', role: 'user' })}` });

describe('name length limit', () => {
  it.each(CASES)('%s: POST with a %s over the limit is refused with 400', async (type, field, body) => {
    const res = await request(app).post(`/api/v1/data/${type}`).set(auth()).send(body({ [field]: 'א'.repeat(LIMIT + 1) }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues.map(i => i.path)).toContain(field);
  });

  it.each(CASES)('%s: POST with a %s at the limit is saved', async (type, field, body) => {
    const res = await request(app).post(`/api/v1/data/${type}`).set(auth()).send(body({ [field]: 'א'.repeat(LIMIT) }));
    expect(res.status).toBe(201);
  });

  it.each(CASES)('%s: PUT that sets a %s over the limit is refused and the record is unchanged', async (type, field, body) => {
    const doc = stored(body(), { _id: 'n1', userId: 'userA' });
    await testDb().collection(type).insertOne(doc);
    const res = await request(app).put(`/api/v1/data/${type}/n1`).set(auth()).send({ [field]: 'x'.repeat(LIMIT + 1) });
    expect(res.status).toBe(400);
    const after = await testDb().collection(type).findOne({ _id: 'n1' });
    expect(after[field]).toBe(doc[field]);
  });
});
