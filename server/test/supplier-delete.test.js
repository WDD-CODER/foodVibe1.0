'use strict';
/**
 * Plan 366: deleting a supplier never leaves dangling `sources[].supplierId` links, and an
 * admin's "delete for everyone" (delete-from-master on a supplier) also removes every other
 * user's clone and its links. Runs against the in-memory test DB (helpers/app), never a real one.
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

const ADMIN = { userId: 'admin1', role: 'admin' };
const tokenAdmin = () => signTestToken(ADMIN);
const tokenUser = (userId) => signTestToken({ userId, role: 'user' });

const source = (supplierId) => ({ supplierId, price: 10 });
const product = (_id, userId, supplierIds) => ({ _id, userId, nameHebrew: _id, sources: supplierIds.map(source) });

async function sourcesOf(_id) {
  const doc = await testDb().collection('products').findOne({ _id });
  return doc.sources.map(s => s.supplierId);
}

describe('DELETE /api/v1/data/suppliers/:id — own products unlinked', () => {
  it('pulls the deleted supplier from the caller\'s products only', async () => {
    await testDb().collection('suppliers').insertOne({ _id: 's1', userId: 'userA', nameHebrew: 'ספק' });
    await testDb().collection('products').insertMany([
      product('pA1', 'userA', ['s1', 's2']),
      product('pA2', 'userA', ['s1']),
      product('pB1', 'userB', ['s1']),
    ]);

    const res = await request(app)
      .delete('/api/v1/data/suppliers/s1')
      .set('Authorization', `Bearer ${tokenUser('userA')}`);

    expect(res.status).toBe(200);
    expect(await sourcesOf('pA1')).toEqual(['s2']);
    expect(await sourcesOf('pA2')).toEqual([]);
    expect(await sourcesOf('pB1')).toEqual(['s1']);
  });

  it('unlinks a master clone too (tombstoned, not hard-deleted)', async () => {
    await testDb().collection('suppliers').insertOne({ _id: 's1', userId: 'userA', _masterId: 'm1', nameHebrew: 'ספק' });
    await testDb().collection('products').insertOne(product('pA1', 'userA', ['s1']));

    await request(app)
      .delete('/api/v1/data/suppliers/s1')
      .set('Authorization', `Bearer ${tokenUser('userA')}`);

    expect(await sourcesOf('pA1')).toEqual([]);
    const tomb = await testDb().collection('suppliers').findOne({ _id: 's1' });
    expect(tomb).toMatchObject({ _userDeleted: true, _masterId: 'm1' });
  });

  it('bulk delete unlinks every deleted supplier from the caller\'s products', async () => {
    await testDb().collection('suppliers').insertMany([
      { _id: 's1', userId: 'userA' },
      { _id: 's2', userId: 'userA' },
    ]);
    await testDb().collection('products').insertOne(product('pA1', 'userA', ['s1', 's2', 's3']));

    const res = await request(app)
      .delete('/api/v1/data/suppliers/bulk')
      .set('Authorization', `Bearer ${tokenUser('userA')}`)
      .send({ ids: ['s1', 's2'] });

    expect(res.status).toBe(200);
    expect(await sourcesOf('pA1')).toEqual(['s3']);
  });
});

describe('PUT /api/v1/data/suppliers/:id/delete-from-master — delete for everyone', () => {
  async function seedShared() {
    await testDb().collection('suppliers').insertMany([
      { _id: 'm1', userId: '__master__', nameHebrew: 'ספק' },
      { _id: 'sAdmin', userId: 'admin1', _masterId: 'm1', nameHebrew: 'ספק' },
      { _id: 'sB', userId: 'userB', _masterId: 'm1', nameHebrew: 'ספק' },
      { _id: 'sC', userId: 'userC', _masterId: 'm1', _userDeleted: true },
      { _id: 'other', userId: 'userB', _masterId: 'm2', nameHebrew: 'אחר' },
    ]);
    await testDb().collection('products').insertMany([
      product('pMaster', '__master__', ['m1']),
      product('pAdmin', 'admin1', ['sAdmin']),
      product('pB', 'userB', ['sB', 'other']),
    ]);
  }

  it('non-admin gets 403 and nothing changes', async () => {
    await seedShared();
    const res = await request(app)
      .put('/api/v1/data/suppliers/sB/delete-from-master')
      .set('Authorization', `Bearer ${tokenUser('userB')}`);

    expect(res.status).toBe(403);
    expect(await testDb().collection('suppliers').countDocuments()).toBe(5);
    expect(await sourcesOf('pB')).toEqual(['sB', 'other']);
  });

  it('trashes the master and other users\' clones and unlinks them from their products', async () => {
    await seedShared();
    const res = await request(app)
      .put('/api/v1/data/suppliers/sAdmin/delete-from-master')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, usersAffected: 2 });

    const remaining = await testDb().collection('suppliers').find({}).toArray();
    // The caller's own copy is left for the normal DELETE route; unrelated suppliers stay.
    expect(remaining.map(d => d._id).sort()).toEqual(['other', 'sAdmin']);

    const trash = await testDb().collection('TRASH_SUPPLIERS').find({}).toArray();
    expect(trash.map(d => `${d._id}:${d.userId}`).sort()).toEqual(['m1:__master__', 'sB:userB']);
    expect(trash.every(d => typeof d.deletedAt === 'number')).toBe(true);

    expect(await sourcesOf('pB')).toEqual(['other']);
    expect(await sourcesOf('pMaster')).toEqual([]);
    expect(await sourcesOf('pAdmin')).toEqual(['sAdmin']);
  });

  it('then the admin\'s own DELETE finishes the job — no product anywhere links the supplier', async () => {
    await seedShared();
    await request(app)
      .put('/api/v1/data/suppliers/sAdmin/delete-from-master')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    await request(app)
      .delete('/api/v1/data/suppliers/sAdmin')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    const linked = await testDb().collection('products')
      .countDocuments({ 'sources.supplierId': { $in: ['m1', 'sAdmin', 'sB'] } });
    expect(linked).toBe(0);
  });

  it('is safe to retry after the master is already gone', async () => {
    await seedShared();
    await testDb().collection('suppliers').deleteOne({ _id: 'm1' });

    const res = await request(app)
      .put('/api/v1/data/suppliers/sAdmin/delete-from-master')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body.usersAffected).toBe(2);
    expect(await sourcesOf('pB')).toEqual(['other']);
  });

  it('a supplier with no master link is a 400', async () => {
    await testDb().collection('suppliers').insertOne({ _id: 'own', userId: 'admin1' });
    const res = await request(app)
      .put('/api/v1/data/suppliers/own/delete-from-master')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(400);
  });
});
