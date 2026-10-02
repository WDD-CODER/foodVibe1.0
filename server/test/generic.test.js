'use strict';
/**
 * CHARACTERIZATION: current behavior of server/routes/generic.js — the schemaless
 * CRUD pipe every entity type goes through. These tests lock in behavior as it
 * exists today, including known flaws (e.g. push-to-master's open admin guard is
 * tested separately in push-to-master.test.js). They are the regression oracle
 * for Plan 321 Phase 5, which will deliberately change some of this — those tests
 * get rewritten then, never silently deleted.
 */

const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { productBody, recipeBody, stored } = require('./helpers/v2-docs');

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

const USER_A = { userId: 'userA', role: 'user' };
const USER_B = { userId: 'userB', role: 'user' };
const tokenA = () => signTestToken(USER_A);
const tokenB = () => signTestToken(USER_B);

describe('GET /api/v1/data/:type', () => {
  it('CHARACTERIZATION: anonymous request returns __master__ documents', async () => {
    await testDb().collection('products').insertMany([
      { _id: 'm1', userId: '__master__', nameHebrew: 'מלח' },
      { _id: 'u1', userId: 'userA', nameHebrew: 'פלפל' },
    ]);
    const res = await request(app).get('/api/v1/data/products');
    expect(res.status).toBe(200);
    expect(res.body.map(d => d._id)).toEqual(['m1']);
  });

  it('CHARACTERIZATION: authenticated request returns only that user\'s own documents', async () => {
    await testDb().collection('products').insertMany([
      { _id: 'm1', userId: '__master__', nameHebrew: 'מלח' },
      { _id: 'a1', userId: 'userA', nameHebrew: 'פלפל' },
      { _id: 'b1', userId: 'userB', nameHebrew: 'סוכר' },
    ]);
    const res = await request(app)
      .get('/api/v1/data/products')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(200);
    expect(res.body.map(d => d._id)).toEqual(['a1']);
  });

  it('CHARACTERIZATION: _userDeleted tombstones are excluded from reads', async () => {
    await testDb().collection('products').insertMany([
      { _id: 'a1', userId: 'userA', nameHebrew: 'פלפל' },
      { _id: 'a2', userId: 'userA', nameHebrew: 'שום', _userDeleted: true },
    ]);
    const res = await request(app)
      .get('/api/v1/data/products')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.body.map(d => d._id)).toEqual(['a1']);
  });

  it('CHARACTERIZATION: unknown entity type is rejected with 403', async () => {
    const res = await request(app).get('/api/v1/data/NOT_A_REAL_TYPE');
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/data/:type/:id', () => {
  it('CHARACTERIZATION: returns 404 for a document that does not exist', async () => {
    const res = await request(app)
      .get('/api/v1/data/products/nope')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(404);
  });

  it('CHARACTERIZATION: does not return another user\'s document by id', async () => {
    await testDb().collection('products').insertOne({ _id: 'b1', userId: 'userB', nameHebrew: 'סוכר' });
    const res = await request(app)
      .get('/api/v1/data/products/b1')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/data/:type/search', () => {
  it('CHARACTERIZATION: 403 for a type not in SEARCHABLE_ENTITY_TYPES', async () => {
    const res = await request(app).get('/api/v1/data/suppliers/search?q=a');
    expect(res.status).toBe(403);
  });

  it('CHARACTERIZATION: case-insensitive Latin prefix match, lean projection only', async () => {
    await testDb().collection('products').insertOne({
      _id: 'a1', userId: 'userA', nameHebrew: 'Apple', baseUnit: 'kg', purchaseOptions: [], extra_field_: 'should not leak',
    });
    const res = await request(app)
      .get('/api/v1/data/products/search?q=app')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].extra_field_).toBeUndefined();
    expect(res.body[0].nameHebrew).toBe('Apple');
  });
});

describe('GET /api/v1/data/:type/count', () => {
  it('CHARACTERIZATION: filter=lowStock is rejected for a non-products type', async () => {
    const res = await request(app)
      .get('/api/v1/data/recipes/count?filter=lowStock')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(400);
  });

  it('CHARACTERIZATION: unknown filter name is rejected with 400', async () => {
    const res = await request(app)
      .get('/api/v1/data/products/count?filter=bogus')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(400);
  });

  it('CHARACTERIZATION: filter=unapproved counts only this user\'s unapproved recipes', async () => {
    await testDb().collection('recipes').insertMany([
      { _id: 'r1', userId: 'userA', isApproved: false },
      { _id: 'r2', userId: 'userA', isApproved: true },
      { _id: 'r3', userId: 'userB', isApproved: false },
    ]);
    const res = await request(app)
      .get('/api/v1/data/recipes/count?filter=unapproved')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.body).toEqual({ count: 1 });
  });
});

describe('POST /api/v1/data/:type', () => {
  it('Plan 321 Phase 1: server generates _id when the body omits one', async () => {
    const res = await request(app)
      .post('/api/v1/data/products')
      .set('Authorization', `Bearer ${tokenA()}`)
      .send(productBody({ nameHebrew: 'no id' }));
    expect(res.status).toBe(201);
    expect(typeof res.body._id).toBe('string');
    expect(res.body._id.length).toBeGreaterThan(0);
    expect(res.body._masterId).toBe(res.body._id); // self-referential, same as the client-id path
  });

  it('CHARACTERIZATION: stamps userId from the token, sets _masterId to the client id, _userModified false', async () => {
    const res = await request(app)
      .post('/api/v1/data/products')
      .set('Authorization', `Bearer ${tokenA()}`)
      .send(productBody({ _id: 'p1', userId: 'someone-else', _userModified: true }));
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('userA');
    expect(res.body._masterId).toBe('p1');
    expect(res.body._userModified).toBe(false);
  });

  it('Plan 321 Phase 1: a client-supplied _id is still honored (appendExisting / trash-restore relies on this)', async () => {
    const res = await request(app)
      .post('/api/v1/data/TRASH_PRODUCTS')
      .set('Authorization', `Bearer ${tokenA()}`)
      .send({ _id: 'restored-1', nameHebrew: 'x' });
    expect(res.status).toBe(201);
    expect(res.body._id).toBe('restored-1');
  });

  it('CHARACTERIZATION: duplicate _id for the same collection returns 409', async () => {
    await testDb().collection('products').insertOne(stored(productBody(), { _id: 'dup', userId: 'userA' }));
    const res = await request(app)
      .post('/api/v1/data/products')
      .set('Authorization', `Bearer ${tokenA()}`)
      .send(productBody({ _id: 'dup' }));
    expect(res.status).toBe(409);
  });

  it('CHARACTERIZATION: unauthenticated POST is rejected with 401', async () => {
    const res = await request(app).post('/api/v1/data/products').send({ _id: 'p2' });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/v1/data/:type/:id', () => {
  it('CHARACTERIZATION: updates fields and sets _userModified: true', async () => {
    await testDb().collection('products').insertOne(stored(productBody({ nameHebrew: 'old' }), { _id: 'p1', userId: 'userA', _userModified: false }));
    const res = await request(app)
      .put('/api/v1/data/products/p1')
      .set('Authorization', `Bearer ${tokenA()}`)
      .send({ nameHebrew: 'new' });
    expect(res.status).toBe(200);
    expect(res.body.nameHebrew).toBe('new');
    expect(res.body._userModified).toBe(true);
  });

  it('CHARACTERIZATION: client-supplied userId/_masterId/_userModified in the body are ignored', async () => {
    await testDb().collection('products').insertOne(stored(productBody(), { _id: 'p1', userId: 'userA', _masterId: 'm1', _userModified: false }));
    const res = await request(app)
      .put('/api/v1/data/products/p1')
      .set('Authorization', `Bearer ${tokenA()}`)
      .send({ userId: 'attacker', _masterId: 'spoofed', _userModified: false, nameHebrew: 'ok' });
    expect(res.body.userId).toBe('userA');
    expect(res.body._masterId).toBe('m1');
    expect(res.body._userModified).toBe(true);
  });

  it('CHARACTERIZATION: 404 when updating another user\'s document', async () => {
    await testDb().collection('products').insertOne({ _id: 'p1', userId: 'userB' });
    const res = await request(app)
      .put('/api/v1/data/products/p1')
      .set('Authorization', `Bearer ${tokenA()}`)
      .send({ nameHebrew: 'x' });
    expect(res.status).toBe(404);
  });

  it('CHARACTERIZATION: recipes/dishes reject an ingredient with referenceId but no nameSnapshot', async () => {
    await testDb().collection('recipes').insertOne(stored(recipeBody(), { _id: 'r1', userId: 'userA' }));
    const res = await request(app)
      .put('/api/v1/data/recipes/r1')
      .set('Authorization', `Bearer ${tokenA()}`)
      .send({ ingredients: [{ referenceId: 'p1' }] });
    expect(res.status).toBe(400);
    expect(res.body.referenceId).toBe('p1');
  });

  it('CHARACTERIZATION: an ingredient with referenceId AND nameSnapshot is accepted', async () => {
    await testDb().collection('recipes').insertOne(stored(recipeBody(), { _id: 'r1', userId: 'userA' }));
    const res = await request(app)
      .put('/api/v1/data/recipes/r1')
      .set('Authorization', `Bearer ${tokenA()}`)
      .send({ ingredients: [{ _id: 'i1', referenceId: 'p1', nameSnapshot: 'תפוח', amount: 1, unit: 'kg' }] });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/v1/data/:type/:id', () => {
  it('CHARACTERIZATION: hard-deletes a document with no _masterId (user-originated)', async () => {
    await testDb().collection('products').insertOne({ _id: 'p1', userId: 'userA' });
    const res = await request(app)
      .delete('/api/v1/data/products/p1')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(200);
    const remaining = await testDb().collection('products').findOne({ _id: 'p1' });
    expect(remaining).toBeNull();
  });

  it('CHARACTERIZATION: tombstones (does not hard-delete) a master clone', async () => {
    await testDb().collection('products').insertOne({ _id: 'p1', userId: 'userA', _masterId: 'm1', nameHebrew: 'x' });
    const res = await request(app)
      .delete('/api/v1/data/products/p1')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(200);
    const remaining = await testDb().collection('products').findOne({ _id: 'p1' });
    expect(remaining).toMatchObject({ _userDeleted: true, _userModified: true, _masterId: 'm1' });
    expect(remaining.nameHebrew).toBeUndefined();
  });

  it('CHARACTERIZATION: deleting a product referenced by a recipe ingredient is blocked with 409', async () => {
    await testDb().collection('products').insertOne({ _id: 'p1', userId: 'userA' });
    await testDb().collection('recipes').insertOne({
      _id: 'r1', userId: 'userA', nameHebrew: 'מרק', ingredients: [{ referenceId: 'p1', nameSnapshot: 'x' }],
    });
    const res = await request(app)
      .delete('/api/v1/data/products/p1')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(409);
    expect(res.body.referencedBy).toBe('מרק');
  });

  it('CHARACTERIZATION: an unreferenced product deletes normally', async () => {
    await testDb().collection('products').insertOne({ _id: 'p1', userId: 'userA' });
    const res = await request(app)
      .delete('/api/v1/data/products/p1')
      .set('Authorization', `Bearer ${tokenA()}`);
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/v1/data/:type/bulk', () => {
  it('CHARACTERIZATION: deletes only the ids owned by the caller', async () => {
    await testDb().collection('products').insertMany([
      { _id: 'a1', userId: 'userA' },
      { _id: 'a2', userId: 'userA' },
      { _id: 'b1', userId: 'userB' },
    ]);
    const res = await request(app)
      .delete('/api/v1/data/products/bulk')
      .set('Authorization', `Bearer ${tokenA()}`)
      .send({ ids: ['a1', 'a2', 'b1'] });
    expect(res.status).toBe(200);
    expect(res.body.deletedCount).toBe(2);
    const remaining = await testDb().collection('products').find({}).toArray();
    expect(remaining.map(d => d._id)).toEqual(['b1']);
  });
});

describe('PUT /api/v1/data/:type (whole-collection replace)', () => {
  it('Plan 321 Phase 1: rejects a type not on the REPLACEABLE_TYPES allowlist', async () => {
    const res = await request(app)
      .put('/api/v1/data/products')
      .set('Authorization', `Bearer ${tokenA()}`)
      .set('X-Confirm-Replace', 'true')
      .send([{ _id: 'p1' }]);
    expect(res.status).toBe(400);
  });

  it('CHARACTERIZATION: requires the X-Confirm-Replace header (on an allowlisted type)', async () => {
    const res = await request(app)
      .put('/api/v1/data/KITCHEN_PREPARATIONS')
      .set('Authorization', `Bearer ${tokenA()}`)
      .send([{ _id: 'u1' }]);
    expect(res.status).toBe(400);
  });

  it('CHARACTERIZATION: replaces the caller\'s entire collection, reassigns a colliding id', async () => {
    await testDb().collection('KITCHEN_PREPARATIONS').insertMany([
      { _id: 'old1', userId: 'userA' },
      { _id: 'taken', userId: 'userB' },
    ]);
    const res = await request(app)
      .put('/api/v1/data/KITCHEN_PREPARATIONS')
      .set('Authorization', `Bearer ${tokenA()}`)
      .set('X-Confirm-Replace', 'true')
      .send([{ _id: 'taken', nameHebrew: 'x' }]);
    expect(res.status).toBe(200);
    const mine = await testDb().collection('KITCHEN_PREPARATIONS').find({ userId: 'userA' }).toArray();
    expect(mine).toHaveLength(1);
    expect(mine[0]._id).not.toBe('taken'); // reassigned — 'taken' still belongs to userB
    const othersStillIntact = await testDb().collection('KITCHEN_PREPARATIONS').findOne({ _id: 'taken', userId: 'userB' });
    expect(othersStillIntact).not.toBeNull();
  });
});
