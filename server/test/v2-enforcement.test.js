'use strict';
/**
 * Plan 321 Phase 2b — the generic data API enforces the v2 schema on the migrated collections
 * (products, recipes, dishes, suppliers, equipment, venues, menuEvents) and stamps the
 * server-owned fields; every other collection is untouched until its own phase.
 */

const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { productBody, stored } = require('./helpers/v2-docs');

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

describe('v2 schema enforcement', () => {
  it('POST of an invalid v2 body is rejected with 400 and Zod issues', async () => {
    const res = await request(app).post('/api/v1/data/products').set(auth()).send({ nameHebrew: 'incomplete' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues.map(i => i.path)).toContain('baseUnit');
  });

  it('POST rejects an unknown key (strict schema catches welded-on fields)', async () => {
    const res = await request(app)
      .post('/api/v1/data/products')
      .set(auth())
      .send(productBody({ name_hebrew: 'v1 leftover' }));
    expect(res.status).toBe(400);
  });

  it('server stamps schemaVersion, createdAt and updatedAt on POST', async () => {
    const res = await request(app).post('/api/v1/data/products').set(auth()).send(productBody());
    expect(res.status).toBe(201);
    expect(res.body.schemaVersion).toBe(2);
    expect(typeof res.body.createdAt).toBe('number');
    expect(res.body.updatedAt).toBe(res.body.createdAt);
  });

  it('PUT bumps updatedAt, never rewrites createdAt, and rejects an invalid merge', async () => {
    await testDb().collection('products').insertOne(stored(productBody(), { _id: 'p9', userId: 'userA' }));
    const ok = await request(app)
      .put('/api/v1/data/products/p9')
      .set(auth())
      .send({ nameHebrew: 'renamed', createdAt: 999 });
    expect(ok.status).toBe(200);
    expect(ok.body.createdAt).toBe(1);
    expect(ok.body.updatedAt).toBeGreaterThan(1);
    const bad = await request(app).put('/api/v1/data/products/p9').set(auth()).send({ yieldFactor: 'lots' });
    expect(bad.status).toBe(400);
  });

  it('collections without a v2 schema (activity_log) are not validated', async () => {
    const res = await request(app).post('/api/v1/data/activity_log').set(auth()).send({ items: ['x'] });
    expect(res.status).toBe(201);
  });

  it('old v1 collection names are no longer valid entity types', async () => {
    const res = await request(app).post('/api/v1/data/PRODUCT_LIST').set(auth()).send(productBody());
    expect(res.status).toBe(403);
  });
});
