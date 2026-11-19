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
const USER_A = { userId: 'userA', businessId: 'b_userA', role: 'admin' };
const tokenA = () => signTestToken(USER_A);
const tokenPlain = () => signTestToken({ userId: 'userA', businessId: 'b_userA', role: 'user' });

describe('PUT /api/v1/data/:type/:id/push-to-master', () => {
  it('a plain non-admin user is rejected with 403 (admin-only since Plan 322)', async () => {
    await testDb().collection('products').insertOne({
      _id: 'm1', userId: '__master__', businessId: '__master__', nameHebrew: 'old master value',
    });
    await testDb().collection('products').insertOne({
      _id: 'u1', userId: 'userA', businessId: 'b_userA', _masterId: 'm1', _userModified: true, nameHebrew: 'my edit',
    });
    const res = await request(app)
      .put('/api/v1/data/products/u1/push-to-master')
      .set('Authorization', `Bearer ${tokenPlain()}`);
    expect(res.status).toBe(403);
  });

  it('CHARACTERIZATION: pushing overwrites the linked master document\'s content', async () => {
    await testDb().collection('products').insertOne({ _id: 'm1', userId: '__master__', businessId: '__master__', nameHebrew: 'old' });
    await testDb().collection('products').insertOne({ _id: 'u1', userId: 'userA', businessId: 'b_userA', _masterId: 'm1', _userModified: true, nameHebrew: 'new' });
    await request(app).put('/api/v1/data/products/u1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    const master = await testDb().collection('products').findOne({ _id: 'm1', userId: '__master__', businessId: '__master__' });
    expect(master.nameHebrew).toBe('new');
  });

  it('CHARACTERIZATION: pushing resets the caller\'s own _userModified back to false', async () => {
    await testDb().collection('products').insertOne({ _id: 'm1', userId: '__master__', businessId: '__master__', nameHebrew: 'old' });
    await testDb().collection('products').insertOne({ _id: 'u1', userId: 'userA', businessId: 'b_userA', _masterId: 'm1', _userModified: true, nameHebrew: 'new' });
    await request(app).put('/api/v1/data/products/u1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    const mine = await testDb().collection('products').findOne({ _id: 'u1' });
    expect(mine._userModified).toBe(false);
  });

  it('CHARACTERIZATION: pushing bumps the master version', async () => {
    await testDb().collection('products').insertOne({ _id: 'm1', userId: '__master__', businessId: '__master__' });
    await testDb().collection('products').insertOne({ _id: 'u1', userId: 'userA', businessId: 'b_userA', _masterId: 'm1', _userModified: true });
    const before = await testDb().collection('MASTER_META').findOne({ _id: 'version' });
    await request(app).put('/api/v1/data/products/u1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    const after = await testDb().collection('MASTER_META').findOne({ _id: 'version' });
    expect(after.lastModified).toBeGreaterThan(before?.lastModified ?? 0);
  });

  it('CHARACTERIZATION: reverse-remaps ingredient referenceId from the user\'s product id back to the master product id', async () => {
    await testDb().collection('products').insertMany([
      { _id: 'mp1', userId: '__master__', businessId: '__master__', nameHebrew: 'קמח' },
      { _id: 'up1', userId: 'userA', businessId: 'b_userA', _masterId: 'mp1', nameHebrew: 'קמח' },
    ]);
    await testDb().collection('recipes').insertMany([
      { _id: 'mr1', userId: '__master__', businessId: '__master__', nameHebrew: 'לחם' },
      { _id: 'ur1', userId: 'userA', businessId: 'b_userA', _masterId: 'mr1', _userModified: true, nameHebrew: 'לחם', ingredients: [{ referenceId: 'up1', type: 'product', nameSnapshot: 'קמח' }] },
    ]);
    await request(app).put('/api/v1/data/recipes/ur1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    const master = await testDb().collection('recipes').findOne({ _id: 'mr1' });
    expect(master.ingredients[0].referenceId).toBe('mp1');
  });

  it('plan 536: the master copy has no line supplierId while the caller own recipe keeps it', async () => {
    await testDb().collection('products').insertMany([
      { _id: 'mp1', userId: '__master__', businessId: '__master__', nameHebrew: 'בצל' },
      { _id: 'up1', userId: 'userA', businessId: 'b_userA', _masterId: 'mp1', nameHebrew: 'בצל' },
    ]);
    await testDb().collection('recipes').insertMany([
      { _id: 'mr1', userId: '__master__', businessId: '__master__', nameHebrew: 'מרק' },
      { _id: 'ur1', userId: 'userA', businessId: 'b_userA', _masterId: 'mr1', _userModified: true, nameHebrew: 'מרק', ingredients: [{ _id: 'l1', referenceId: 'up1', type: 'product', supplierId: 'sup1' }] },
    ]);
    await request(app).put('/api/v1/data/recipes/ur1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    const master = await testDb().collection('recipes').findOne({ _id: 'mr1' });
    expect(master.ingredients[0].referenceId).toBe('mp1');
    expect(master.ingredients[0]).not.toHaveProperty('supplierId');
    const mine = await testDb().collection('recipes').findOne({ _id: 'ur1' });
    expect(mine.ingredients[0].supplierId).toBe('sup1');
  });

  it('pushing a product never adds an ingredients field to the master copy (update path)', async () => {
    await testDb().collection('products').insertOne({ _id: 'm1', userId: '__master__', businessId: '__master__', nameHebrew: 'old' });
    await testDb().collection('products').insertOne({ _id: 'u1', userId: 'userA', businessId: 'b_userA', _masterId: 'm1', _userModified: true, nameHebrew: 'new' });
    await request(app).put('/api/v1/data/products/u1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    const master = await testDb().collection('products').findOne({ _id: 'm1', userId: '__master__', businessId: '__master__' });
    expect(master.nameHebrew).toBe('new');
    expect(master).not.toHaveProperty('ingredients');
  });

  it('pushing a self-linked product never adds an ingredients field to the new master copy (first-push path)', async () => {
    await testDb().collection('products').insertOne({ _id: 'u1', userId: 'userA', businessId: 'b_userA', _masterId: 'u1', nameHebrew: 'חדש' });
    await request(app).put('/api/v1/data/products/u1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    const mine = await testDb().collection('products').findOne({ _id: 'u1' });
    const master = await testDb().collection('products').findOne({ _id: mine._masterId, userId: '__master__', businessId: '__master__' });
    expect(master).toBeTruthy();
    expect(master).not.toHaveProperty('ingredients');
  });

  it('first push of a recipe whose name a master dish already has is rejected with 409, master unchanged (plan 379)', async () => {
    await testDb().collection('dishes').insertOne({ _id: 'md1', userId: '__master__', businessId: '__master__', nameHebrew: 'רוטב' });
    await testDb().collection('recipes').insertOne({ _id: 'u1', userId: 'userA', businessId: 'b_userA', _masterId: 'u1', nameHebrew: ' רוטב ' });
    const res = await request(app).put('/api/v1/data/recipes/u1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(409);
    expect(await testDb().collection('recipes').countDocuments({ userId: '__master__', businessId: '__master__' })).toBe(0);
    const mine = await testDb().collection('recipes').findOne({ _id: 'u1' });
    expect(mine._masterId).toBe('u1');
  });

  it('first push of a product whose name master already has is rejected with 409 (plan 379)', async () => {
    await testDb().collection('products').insertOne({ _id: 'mp1', userId: '__master__', businessId: '__master__', nameHebrew: 'טחינה' });
    await testDb().collection('products').insertOne({ _id: 'u1', userId: 'userA', businessId: 'b_userA', _masterId: 'u1', nameHebrew: 'טחינה' });
    const res = await request(app).put('/api/v1/data/products/u1/push-to-master').set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(409);
    expect(await testDb().collection('products').countDocuments({ userId: '__master__', businessId: '__master__' })).toBe(1);
  });

  it('CHARACTERIZATION: pushing an unsupported type is rejected with 400', async () => {
    const res = await request(app)
      .put('/api/v1/data/venues/u1/push-to-master')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(400);
  });

  it('CHARACTERIZATION: pushing a document the caller does not own returns 404', async () => {
    await testDb().collection('products').insertOne({ _id: 'u1', userId: 'userB', businessId: 'b_userB', _masterId: 'm1' });
    const res = await request(app)
      .put('/api/v1/data/products/u1/push-to-master')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(404);
  });

  it('CHARACTERIZATION: pushing a document with no linked master (_masterId not a string) is rejected with 400', async () => {
    await testDb().collection('products').insertOne({ _id: 'u1', userId: 'userA', businessId: 'b_userA', _masterId: null });
    const res = await request(app)
      .put('/api/v1/data/products/u1/push-to-master')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(400);
  });
});

describe('plan 649 — a shared product carries shared suppliers only', () => {
  const push = (id) => request(app).put(`/api/v1/data/products/${id}/push-to-master`).set('Authorization', `Bearer ${tokenA()}`);
  const src = (supplierId) => [{ supplierId, price: 5, addedAt: 1 }];

  it('a source whose supplier has a master copy is stored with the master supplier id', async () => {
    const db = testDb();
    await db.collection('suppliers').insertMany([
      { _id: 'ms1', userId: '__master__', businessId: '__master__', nameHebrew: 'ספק' },
      { _id: 'us1', userId: 'userA', businessId: 'b_userA', _masterId: 'ms1', nameHebrew: 'ספק' },
    ]);
    await db.collection('products').insertMany([
      { _id: 'm1', userId: '__master__', businessId: '__master__', nameHebrew: 'old' },
      { _id: 'u1', userId: 'userA', businessId: 'b_userA', _masterId: 'm1', nameHebrew: 'new', sources: src('us1') },
    ]);
    expect((await push('u1')).status).toBe(200);
    expect((await db.collection('products').findOne({ _id: 'm1' })).sources[0]).toMatchObject({ supplierId: 'ms1', price: 5 });
    expect((await db.collection('products').findOne({ _id: 'u1' })).sources[0].supplierId).toBe('us1');
  });

  it('a supplier with no master copy is pushed to master first, and its master id is stored', async () => {
    const db = testDb();
    await db.collection('suppliers').insertOne({ _id: 'us2', userId: 'userA', businessId: 'b_userA', _masterId: 'us2', nameHebrew: 'ספק חדש' });
    await db.collection('products').insertOne({ _id: 'u2', userId: 'userA', businessId: 'b_userA', _masterId: 'u2', nameHebrew: 'מוצר חדש', sources: src('us2') });
    expect((await push('u2')).status).toBe(200);
    const masterSupplier = await db.collection('suppliers').findOne({ businessId: '__master__', nameHebrew: 'ספק חדש' });
    expect(masterSupplier).toBeTruthy();
    const masterProduct = await db.collection('products').findOne({ businessId: '__master__', nameHebrew: 'מוצר חדש' });
    expect(masterProduct.sources[0].supplierId).toBe(masterSupplier._id);
  });

  it('a foreign or unknown supplier id is refused with 400 BAD_SUPPLIER_REF and nothing is written', async () => {
    const db = testDb();
    await db.collection('suppliers').insertOne({ _id: 'other', userId: 'userB', businessId: 'b_userB', _masterId: 'other', nameHebrew: 'זר' });
    await db.collection('products').insertMany([
      { _id: 'm3', userId: '__master__', businessId: '__master__', nameHebrew: 'old3' },
      { _id: 'u3', userId: 'userA', businessId: 'b_userA', _masterId: 'm3', nameHebrew: 'new3', sources: src('other') },
      { _id: 'm4', userId: '__master__', businessId: '__master__', nameHebrew: 'old4' },
      { _id: 'u4', userId: 'userA', businessId: 'b_userA', _masterId: 'm4', nameHebrew: 'new4', sources: src('nowhere') },
    ]);
    for (const id of ['u3', 'u4']) {
      const res = await push(id);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('BAD_SUPPLIER_REF');
    }
    expect((await db.collection('products').findOne({ _id: 'm3' })).nameHebrew).toBe('old3');
    expect(await db.collection('suppliers').countDocuments({ businessId: '__master__' })).toBe(0);
  });
});
