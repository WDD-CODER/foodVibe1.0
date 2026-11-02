'use strict';
/**
 * Plan 512: the clients collection. Owner-only writes (staff get 403), staff reads trimmed to name + phone,
 * `phoneNormalized` derived by the server, and `menuEvents.clientId` accepted.
 */

const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { stored } = require('./helpers/v2-docs');

let app;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

beforeEach(async () => {
  const db = testDb();
  for (const c of ['clients', 'menuEvents']) await db.collection(c).deleteMany({});
});

const as = (user) => ({ Authorization: `Bearer ${signTestToken(user)}` });
const OWNER = { userId: 'userA', role: 'user' };
const STAFF = { userId: 'staffA', role: 'user', businessId: 'b_userA', businessRole: 'staff' };
const OWNER_ONLY_FIELDS = ['email', 'notes', 'source', 'clientType', 'companyName'];

const clientBody = (overrides = {}) => ({
  name: 'דנה כהן',
  phone: '050-123 4567',
  clientType: 'business',
  companyName: 'כהן הפקות',
  email: 'dana@example.com',
  notes: 'מעדיפה בוקר',
  source: 'friend',
  ...overrides,
});

// A stored client of the owner's business, inserted straight into Mongo (no lineage fields).
async function seedClient(_id = 'c1', overrides = {}) {
  const doc = stored(
    { ...clientBody(), phoneNormalized: '0501234567', ...overrides },
    { _id, userId: 'userA' },
  );
  await testDb().collection('clients').insertOne(doc);
  return doc;
}

describe('clients: staff cannot write', () => {
  it('staff POST -> 403 and nothing stored', async () => {
    const res = await request(app).post('/api/v1/data/clients').set(as(STAFF)).send(clientBody());
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'FORBIDDEN', messageKey: 'no_permission' });
    expect(await testDb().collection('clients').countDocuments()).toBe(0);
  });

  it("staff PUT on an owner's client -> 403 and unchanged", async () => {
    const before = await seedClient();
    const res = await request(app).put('/api/v1/data/clients/c1').set(as(STAFF)).send({ name: 'אחר' });
    expect(res.status).toBe(403);
    expect(await testDb().collection('clients').findOne({ _id: 'c1' })).toEqual(before);
  });

  it("staff DELETE on an owner's client -> 403 and still stored", async () => {
    await seedClient();
    const res = await request(app).delete('/api/v1/data/clients/c1').set(as(STAFF));
    expect(res.status).toBe(403);
    expect(await testDb().collection('clients').countDocuments({ _id: 'c1' })).toBe(1);
  });

  it('staff bulk delete of an owner client -> 403 and still stored', async () => {
    await seedClient();
    const res = await request(app).delete('/api/v1/data/clients/bulk').set(as(STAFF)).send({ ids: ['c1'] });
    expect(res.status).toBe(403);
    expect(await testDb().collection('clients').countDocuments({ _id: 'c1' })).toBe(1);
  });

  it('staff PUT on a client the staff member created -> still 403 (owner-only type)', async () => {
    await testDb().collection('clients').insertOne(stored(
      { ...clientBody(), phoneNormalized: '0501234567' },
      { _id: 'mine', userId: 'staffA', businessId: 'b_userA', createdBy: 'staffA' },
    ));
    const res = await request(app).put('/api/v1/data/clients/mine').set(as(STAFF)).send({ name: 'אחר' });
    expect(res.status).toBe(403);
  });
});

describe('clients: staff reads are trimmed to name and phone', () => {
  it('staff GET / carries name + phone and none of the owner-only fields', async () => {
    await seedClient();
    const res = await request(app).get('/api/v1/data/clients').set(as(STAFF));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ _id: 'c1', name: 'דנה כהן', phone: '050-123 4567', businessId: 'b_userA' });
    for (const field of OWNER_ONLY_FIELDS) expect(res.body[0]).not.toHaveProperty(field);
    expect(res.body[0]).not.toHaveProperty('phoneNormalized');
  });

  it('staff GET /:id carries name + phone and none of the owner-only fields', async () => {
    await seedClient();
    const res = await request(app).get('/api/v1/data/clients/c1').set(as(STAFF));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ _id: 'c1', name: 'דנה כהן', phone: '050-123 4567' });
    for (const field of OWNER_ONLY_FIELDS) expect(res.body).not.toHaveProperty(field);
  });

  it('owner GET / and GET /:id carry the owner-only fields', async () => {
    await seedClient();
    const list = await request(app).get('/api/v1/data/clients').set(as(OWNER));
    const one = await request(app).get('/api/v1/data/clients/c1').set(as(OWNER));
    for (const body of [list.body[0], one.body]) {
      expect(body).toMatchObject({
        email: 'dana@example.com', notes: 'מעדיפה בוקר', source: 'friend', clientType: 'business', companyName: 'כהן הפקות',
      });
    }
  });

  it("another business never sees the client", async () => {
    await seedClient();
    const other = await request(app).get('/api/v1/data/clients').set(as({ userId: 'userB', role: 'user' }));
    expect(other.body).toEqual([]);
  });

  it('staff reads of other types are not trimmed', async () => {
    await testDb().collection('menuEvents').insertOne(stored(
      {
        name: 'חתונה', eventType: 'wedding', servingType: 'buffet', guestCount: 10, sections: [],
        financialTargets: { targetFoodCostPct: 30 }, performanceTags: { foodCostPct: 0, primaryServingStyle: 'buffet' },
        stage: 'inquiry', clientName: 'דנה',
      },
      { _id: 'e1', userId: 'staffA', businessId: 'b_userA', createdBy: 'staffA', _masterId: 'e1', _userModified: false },
    ));
    const res = await request(app).get('/api/v1/data/menuEvents/e1').set(as(STAFF));
    expect(res.status).toBe(200);
    expect(res.body.clientName).toBe('דנה');
  });
});

describe('clients: owner writes and the derived phone', () => {
  it('owner POST stores the client without clone lineage and derives phoneNormalized', async () => {
    const res = await request(app).post('/api/v1/data/clients').set(as(OWNER)).send(clientBody());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ businessId: 'b_userA', createdBy: 'userA', phone: '050-123 4567', phoneNormalized: '0501234567' });
    expect(res.body).not.toHaveProperty('_masterId');
    expect(res.body).not.toHaveProperty('_userModified');
    const row = await testDb().collection('clients').findOne({ _id: res.body._id });
    expect(row.phoneNormalized).toBe('0501234567');
  });

  it('owner POST with phone "abc" -> 400 Validation failed', async () => {
    const res = await request(app).post('/api/v1/data/clients').set(as(OWNER)).send(clientBody({ phone: 'abc' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(await testDb().collection('clients').countDocuments()).toBe(0);
  });

  it('a phoneNormalized sent by the client is ignored on POST', async () => {
    const res = await request(app).post('/api/v1/data/clients').set(as(OWNER)).send(clientBody({ phoneNormalized: '999' }));
    expect(res.status).toBe(201);
    expect(res.body.phoneNormalized).toBe('0501234567');
  });

  it('owner PUT of the phone re-derives phoneNormalized; a client-sent value is ignored', async () => {
    await seedClient();
    const res = await request(app).put('/api/v1/data/clients/c1').set(as(OWNER)).send({ phone: '+972 52-765 4321', phoneNormalized: '999' });
    expect(res.status).toBe(200);
    expect(res.body.phoneNormalized).toBe('972527654321');
    expect(res.body).not.toHaveProperty('_userModified');
    expect((await testDb().collection('clients').findOne({ _id: 'c1' })).phoneNormalized).toBe('972527654321');
  });

  it('owner PUT of another field keeps phoneNormalized; owner DELETE removes the client', async () => {
    await seedClient();
    const edited = await request(app).put('/api/v1/data/clients/c1').set(as(OWNER)).send({ notes: 'חדש' });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ notes: 'חדש', phoneNormalized: '0501234567' });
    const removed = await request(app).delete('/api/v1/data/clients/c1').set(as(OWNER));
    expect(removed.status).toBe(200);
    expect(await testDb().collection('clients').countDocuments()).toBe(0);
  });

  it('a client with only name and phone is accepted (clientType is optional on write)', async () => {
    const res = await request(app).post('/api/v1/data/clients').set(as(OWNER)).send({ name: 'דנה', phone: '050-123 4567' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'דנה', phoneNormalized: '0501234567' });
  });
});

describe('menuEvents: clientId', () => {
  it('a menuEvents POST with clientId is accepted and keeps the snapshot fields', async () => {
    const res = await request(app).post('/api/v1/data/menuEvents').set(as(OWNER)).send({
      name: 'חתונה', eventType: 'wedding', servingType: 'buffet', guestCount: 100, sections: [],
      financialTargets: { targetFoodCostPct: 30 }, performanceTags: { foodCostPct: 0, primaryServingStyle: 'buffet' },
      clientId: 'c1', clientName: 'דנה כהן', clientPhone: '050-123 4567',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ clientId: 'c1', clientName: 'דנה כהן', clientPhone: '050-123 4567' });
  });
});
