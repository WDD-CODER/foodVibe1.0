'use strict';
/**
 * CHARACTERIZATION: behavior of PUT /:type/:id/push-to-master in
 * server/routes/generic.js. Admin-only (requireAdmin) since Plan 322; a non-admin
 * caller gets 403.
 */

const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');

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
  await Promise.all(
    collections
      .filter(c => c.type === 'collection')
      .map(c => db.collection(c.name).deleteMany({}))
  );
});

// push-to-master is admin-only since Plan 322 (requireAdmin); userA is the admin caller.
const USER_A = { userId: 'userA', role: 'admin' };
const tokenA = () => signTestToken(USER_A);
const tokenPlain = () => signTestToken({ userId: 'userA', role: 'user' });

describe('PUT /api/v1/data/:type/:id/push-to-master', () => {
  it('a plain non-admin user is rejected with 403 (admin-only since Plan 322)', async () => {
    await testDb().collection('PRODUCT_LIST').insertOne({
      _id: 'm1', userId: '__master__', name_hebrew: 'old master value',
    });
    await testDb().collection('PRODUCT_LIST').insertOne({
      _id: 'u1', userId: 'userA', _masterId: 'm1', _userModified: true, name_hebrew: 'my edit',
    });
    const res = await request(app)
      .put('/api/v1/data/PRODUCT_LIST/u1/push-to-master')
      .set('Authorization', `Bearer ${tokenPlain()}`);
    expect(res.status).toBe(403);
  });

  it('CHARACTERIZATION: pushing overwrites the linked master document\'s content', async () => {
    await testDb().collection('PRODUCT_LIST').insertOne({ _id: 'm1', userId: '__master__', name_hebrew: 'old' });
    await testDb().collection('PRODUCT_LIST').insertOne({ _id: 'u1', userId: 'userA', _masterId: 'm1', _userModified: true, name_hebrew: 'new' });
    await request(app).put('/api/v1/data/PRODUCT_LIST/u1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    const master = await testDb().collection('PRODUCT_LIST').findOne({ _id: 'm1', userId: '__master__' });
    expect(master.name_hebrew).toBe('new');
  });

  it('CHARACTERIZATION: pushing resets the caller\'s own _userModified back to false', async () => {
    await testDb().collection('PRODUCT_LIST').insertOne({ _id: 'm1', userId: '__master__', name_hebrew: 'old' });
    await testDb().collection('PRODUCT_LIST').insertOne({ _id: 'u1', userId: 'userA', _masterId: 'm1', _userModified: true, name_hebrew: 'new' });
    await request(app).put('/api/v1/data/PRODUCT_LIST/u1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    const mine = await testDb().collection('PRODUCT_LIST').findOne({ _id: 'u1' });
    expect(mine._userModified).toBe(false);
  });

  it('CHARACTERIZATION: pushing bumps the master version', async () => {
    await testDb().collection('PRODUCT_LIST').insertOne({ _id: 'm1', userId: '__master__' });
    await testDb().collection('PRODUCT_LIST').insertOne({ _id: 'u1', userId: 'userA', _masterId: 'm1', _userModified: true });
    const before = await testDb().collection('MASTER_META').findOne({ _id: 'version' });
    await request(app).put('/api/v1/data/PRODUCT_LIST/u1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    const after = await testDb().collection('MASTER_META').findOne({ _id: 'version' });
    expect(after.lastModified).toBeGreaterThan(before?.lastModified ?? 0);
  });

  it('CHARACTERIZATION: reverse-remaps ingredient referenceId from the user\'s product id back to the master product id', async () => {
    await testDb().collection('PRODUCT_LIST').insertMany([
      { _id: 'mp1', userId: '__master__', name_hebrew: 'קמח' },
      { _id: 'up1', userId: 'userA', _masterId: 'mp1', name_hebrew: 'קמח' },
    ]);
    await testDb().collection('RECIPE_LIST').insertMany([
      { _id: 'mr1', userId: '__master__', name_hebrew: 'לחם' },
      { _id: 'ur1', userId: 'userA', _masterId: 'mr1', _userModified: true, name_hebrew: 'לחם', ingredients_: [{ referenceId: 'up1', type: 'product', nameSnapshot: 'קמח' }] },
    ]);
    await request(app).put('/api/v1/data/RECIPE_LIST/ur1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    const master = await testDb().collection('RECIPE_LIST').findOne({ _id: 'mr1' });
    expect(master.ingredients_[0].referenceId).toBe('mp1');
  });

  it('CHARACTERIZATION: pushing an unsupported type is rejected with 400', async () => {
    const res = await request(app)
      .put('/api/v1/data/KITCHEN_UNITS/u1/push-to-master')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(400);
  });

  it('CHARACTERIZATION: pushing a document the caller does not own returns 404', async () => {
    await testDb().collection('PRODUCT_LIST').insertOne({ _id: 'u1', userId: 'userB', _masterId: 'm1' });
    const res = await request(app)
      .put('/api/v1/data/PRODUCT_LIST/u1/push-to-master')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(404);
  });

  it('CHARACTERIZATION: pushing a document with no linked master (_masterId not a string) is rejected with 400', async () => {
    await testDb().collection('PRODUCT_LIST').insertOne({ _id: 'u1', userId: 'userA', _masterId: null });
    const res = await request(app)
      .put('/api/v1/data/PRODUCT_LIST/u1/push-to-master')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(400);
  });
});
