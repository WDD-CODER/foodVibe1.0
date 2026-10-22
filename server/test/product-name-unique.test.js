'use strict';
/**
 * Plan 485 — one live product per name in a business, on every server write path.
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

const tokenA = () => signTestToken({ userId: 'userA', businessId: 'b_userA', role: 'user' });
const tokenB = () => signTestToken({ userId: 'userB', businessId: 'b_userB', role: 'user' });
const auth = (req, token = tokenA()) => req.set('Authorization', `Bearer ${token}`);
const products = () => testDb().collection('products');
const mine = (body, fields) => stored(productBody(body), { userId: 'userA', businessId: 'b_userA', ...fields });

describe('one product per name in a business', () => {
  it('POST with a taken name (other spaces / case) → 409 PRODUCT_NAME_TAKEN, nothing written', async () => {
    await products().insertOne(mine({ nameHebrew: 'Cucumber Pickled' }, { _id: 'p1' }));
    const res = await auth(request(app).post('/api/v1/data/products')).send(productBody({ nameHebrew: '  cucumber   pickled ' }));
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: 'PRODUCT_NAME_TAKEN', messageKey: 'product_duplicate_name_error' });
    expect(await products().countDocuments()).toBe(1);
  });

  it('another business may use the same name', async () => {
    await products().insertOne(mine({ nameHebrew: 'מלפפון' }, { _id: 'p1' }));
    const res = await auth(request(app).post('/api/v1/data/products'), tokenB()).send(productBody({ nameHebrew: 'מלפפון' }));
    expect(res.status).toBe(201);
  });

  it('a name only a trashed product has is free', async () => {
    await products().insertOne(mine({ nameHebrew: 'מלפפון' }, { _id: 'p1', deletedAt: 5, deletedBy: 'userA' }));
    const res = await auth(request(app).post('/api/v1/data/products')).send(productBody({ nameHebrew: 'מלפפון' }));
    expect(res.status).toBe(201);
  });

  it('PUT renaming to a taken name → 409; keeping its name → 200 even with an old twin', async () => {
    await products().insertMany([
      mine({ nameHebrew: 'מלפפון' }, { _id: 'p1' }),
      mine({ nameHebrew: 'מלפפון' }, { _id: 'p2' }),
      mine({ nameHebrew: 'כרובית' }, { _id: 'p3' }),
    ]);
    const rename = await auth(request(app).put('/api/v1/data/products/p3')).send(productBody({ nameHebrew: 'מלפפון ' }));
    expect(rename.status).toBe(409);
    expect(rename.body.error).toBe('PRODUCT_NAME_TAKEN');
    expect((await products().findOne({ _id: 'p3' })).nameHebrew).toBe('כרובית');

    const keep = await auth(request(app).put('/api/v1/data/products/p1')).send(productBody({ nameHebrew: 'מלפפון', minStockLevel: 3 }));
    expect(keep.status).toBe(200);
  });

  it('restore of a trashed product whose name is now taken → 409, stays in Trash', async () => {
    await products().insertMany([
      mine({ nameHebrew: 'מלפפון' }, { _id: 'p1', deletedAt: 5, deletedBy: 'userA' }),
      mine({ nameHebrew: 'מלפפון' }, { _id: 'p2' }),
    ]);
    const res = await auth(request(app).put('/api/v1/data/products/p1/restore'));
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('PRODUCT_NAME_TAKEN');
    expect((await products().findOne({ _id: 'p1' })).deletedAt).toBe(5);
  });

  it('restore-all brings back the free ones and reports the clashing ones', async () => {
    await products().insertMany([
      mine({ nameHebrew: 'מלפפון' }, { _id: 'p1', deletedAt: 5, deletedBy: 'userA' }),
      mine({ nameHebrew: 'מלפפון' }, { _id: 'p2', deletedAt: 6, deletedBy: 'userA' }),
      mine({ nameHebrew: 'בצל' }, { _id: 'p3', deletedAt: 7, deletedBy: 'userA' }),
      mine({ nameHebrew: 'בצל' }, { _id: 'p4' }),
    ]);
    const res = await auth(request(app).put('/api/v1/data/products/trash/restore-all'));
    expect(res.status).toBe(200);
    expect(res.body.restored).toBe(1);
    expect(res.body.skipped.map(s => s._id).sort()).toEqual(['p2', 'p3']);
    const live = await products().find({ deletedAt: { $exists: false } }).toArray();
    expect(live.map(d => d._id).sort()).toEqual(['p1', 'p4']);
  });
});
