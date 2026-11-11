'use strict';
/**
 * Plan 512: the clients collection. Owner-only writes (staff get 403), staff reads trimmed to name + phone,
 * `phoneNormalized` derived by the server, and `menuEvents.clientId` accepted.
 * Plan 544: staff also read tags + kinds; the server-owned fields (CLIENT_SERVER_FIELDS) are dropped from every
 * generic write; `phoneKey` is derived; a delete goes to Trash and comes back.
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
const OWNER_ONLY_FIELDS = ['email', 'notes', 'source', 'clientType', 'companyName', 'consent', 'doNotContact', 'counters', 'phoneKey'];

// Plan 544: the CRM fields of a stored client, owner-only to read except tags and kinds.
const CRM_FIELDS = {
  phoneKey: '501234567',
  tags: ['vip'],
  kinds: ['event_client'],
  consent: { terms: 1 },
  doNotContact: { at: 1, reason: 'asked', via: 'guest' },
  counters: { events: 2 },
};

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

describe('clients: staff reads are trimmed to name, phone, tags and kinds', () => {
  it('staff GET / carries name, phone, tags, kinds and none of the owner-only fields', async () => {
    await seedClient('c1', CRM_FIELDS);
    const res = await request(app).get('/api/v1/data/clients').set(as(STAFF));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      _id: 'c1', name: 'דנה כהן', phone: '050-123 4567', tags: ['vip'], kinds: ['event_client'], businessId: 'b_userA',
    });
    for (const field of OWNER_ONLY_FIELDS) expect(res.body[0]).not.toHaveProperty(field);
    expect(res.body[0]).not.toHaveProperty('phoneNormalized');
  });

  it('staff GET /:id carries name, phone, tags, kinds and none of the owner-only fields', async () => {
    await seedClient('c1', CRM_FIELDS);
    const res = await request(app).get('/api/v1/data/clients/c1').set(as(STAFF));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ _id: 'c1', name: 'דנה כהן', phone: '050-123 4567', tags: ['vip'], kinds: ['event_client'] });
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

  it('owner PUT of another field keeps phoneNormalized', async () => {
    await seedClient();
    const edited = await request(app).put('/api/v1/data/clients/c1').set(as(OWNER)).send({ notes: 'חדש' });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ notes: 'חדש', phoneNormalized: '0501234567' });
  });

  it('the stored phoneKey of +972 52 123 4567 is 521234567, the same as for 052-1234567', async () => {
    const intl = await request(app).post('/api/v1/data/clients').set(as(OWNER)).send(clientBody({ phone: '+972 52 123 4567' }));
    const local = await request(app).post('/api/v1/data/clients').set(as(OWNER)).send(clientBody({ phone: '052-1234567' }));
    expect(intl.status).toBe(201);
    expect((await testDb().collection('clients').findOne({ _id: intl.body._id })).phoneKey).toBe('521234567');
    expect(local.body.phoneKey).toBe('521234567');
  });

  it('owner PUT of the phone re-derives phoneKey', async () => {
    await seedClient('c1', { phoneKey: '501234567' });
    const res = await request(app).put('/api/v1/data/clients/c1').set(as(OWNER)).send({ phone: '+972 52-765 4321' });
    expect(res.status).toBe(200);
    expect((await testDb().collection('clients').findOne({ _id: 'c1' })).phoneKey).toBe('527654321');
  });

  it('a client with only name and phone is accepted and stored with clientType private', async () => {
    const res = await request(app).post('/api/v1/data/clients').set(as(OWNER)).send({ name: 'דנה', phone: '050-123 4567' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'דנה', phoneNormalized: '0501234567', clientType: 'private' });
  });
});

// Plan 544: one value per CLIENT_SERVER_FIELDS key, each valid for the schema so only the strip can drop it.
const SENT_SERVER_VALUES = {
  phoneNormalized: '111',
  phoneKey: '111111111',
  kinds: ['lead'],
  lifecycle: 'dormant',
  firstSeenAt: 5,
  lastContactAt: 6,
  counters: { events: 99 },
  waId: '972500000000',
  mergedInto: 'other',
  doNotContact: { at: 7, reason: 'x', via: 'member' },
  liveKey: '999999999',
};

describe('clients: the server-owned fields are dropped from generic writes', () => {
  it('every server-owned field has a case', () => {
    const { CLIENT_SERVER_FIELDS } = require('../generated/schemas/entities/client.schema');
    expect(Object.keys(SENT_SERVER_VALUES).sort()).toEqual([...CLIENT_SERVER_FIELDS].sort());
  });

  for (const [field, value] of Object.entries(SENT_SERVER_VALUES)) {
    it(`POST with ${field} stores none of the sent value`, async () => {
      const res = await request(app).post('/api/v1/data/clients').set(as(OWNER)).send(clientBody({ [field]: value }));
      expect(res.status).toBe(201);
      const row = await testDb().collection('clients').findOne({ _id: res.body._id });
      expect(row.phoneNormalized).toBe('0501234567');
      expect(row.phoneKey).toBe('501234567');
      if (field === 'firstSeenAt') expect(row.firstSeenAt).not.toBe(value);
      else if (field === 'counters') expect(row.counters).toEqual({ requests: 0, bookings: 0, events: 0, noShows: 0, conversations: 0 });
      else if (field === 'liveKey') expect(row.liveKey).toBe('501234567');
      else if (field !== 'phoneNormalized' && field !== 'phoneKey') expect(row).not.toHaveProperty(field);
    });

    it(`PUT with ${field} keeps the stored value`, async () => {
      const before = await seedClient('c1', { phoneKey: '501234567', liveKey: '501234567', kinds: ['diner'], counters: { events: 1 } });
      const res = await request(app).put('/api/v1/data/clients/c1').set(as(OWNER)).send({ notes: 'חדש', [field]: value });
      expect(res.status).toBe(200);
      const row = await testDb().collection('clients').findOne({ _id: 'c1' });
      expect(row.notes).toBe('חדש');
      expect(row.phoneNormalized).toBe('0501234567');
      expect(row.phoneKey).toBe('501234567');
      expect(row[field]).toEqual(before[field]);
    });
  }
});

describe('clients: a delete goes to Trash', () => {
  it('owner DELETE -> gone from the list, listed in Trash, restore brings it back unchanged', async () => {
    const before = await seedClient('c1', CRM_FIELDS);
    const removed = await request(app).delete('/api/v1/data/clients/c1').set(as(OWNER));
    expect(removed.status).toBe(200);
    expect((await request(app).get('/api/v1/data/clients').set(as(OWNER))).body).toEqual([]);

    const trash = await request(app).get('/api/v1/data/clients/trash').set(as(OWNER));
    expect(trash.status).toBe(200);
    expect(trash.body.map(d => d._id)).toEqual(['c1']);

    const restored = await request(app).put('/api/v1/data/clients/c1/restore').set(as(OWNER));
    expect(restored.status).toBe(200);
    expect(await testDb().collection('clients').findOne({ _id: 'c1' })).toEqual({ ...before, liveKey: '501234567' });
    expect((await request(app).get('/api/v1/data/clients').set(as(OWNER))).body.map(d => d._id)).toEqual(['c1']);
  });

  it('staff cannot restore a trashed client, and their Trash read is trimmed', async () => {
    await seedClient('c1', { ...CRM_FIELDS, deletedAt: Date.now(), deletedBy: 'userA' });
    const restore = await request(app).put('/api/v1/data/clients/c1/restore').set(as(STAFF));
    expect(restore.status).toBe(403);
    const trash = await request(app).get('/api/v1/data/clients/trash').set(as(STAFF));
    expect(trash.status).toBe(200);
    expect(trash.body[0]).toMatchObject({ _id: 'c1', name: 'דנה כהן', tags: ['vip'] });
    for (const field of OWNER_ONLY_FIELDS) expect(trash.body[0]).not.toHaveProperty(field);
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

// Plan 545: one find-or-create by phone on the owner POST; PUT and restore refuse a second live client for a phone.
const clientsCol = () => testDb().collection('clients');
const PHONE_TAKEN_BODY = { error: 'PHONE_TAKEN', messageKey: 'client_phone_taken' };
const phoneBody = (phone, overrides = {}) => ({ name: 'דנה כהן', phone, ...overrides });
const postClient = (body, user = OWNER) => request(app).post('/api/v1/data/clients').set(as(user)).send(body);

describe('clients: one client per phone (plan 545)', () => {
  it('POST a new phone -> 201 with server defaults; the same phone in another format -> 200 with the same client', async () => {
    const first = await postClient(phoneBody('052-123 4567', { notes: 'x' }));
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ phoneKey: '521234567', liveKey: '521234567', source: 'manual', notes: 'x', counters: { events: 0 } });
    const again = await postClient(phoneBody('+972 52 123 4567', { name: 'שם אחר' }));
    expect(again.status).toBe(200);
    expect(again.body._id).toBe(first.body._id);
    expect(again.body.name).toBe('דנה כהן');
    expect(await clientsCol().countDocuments()).toBe(1);
  });

  it('POST finds an old client that has no liveKey yet (by phoneKey)', async () => {
    await seedClient('c1', { phoneKey: '501234567' });
    const res = await postClient(phoneBody('0501234567'));
    expect(res.status).toBe(200);
    expect(res.body._id).toBe('c1');
    expect(await clientsCol().countDocuments()).toBe(1);
  });

  it('a client in another business with the same phone is not matched', async () => {
    await postClient(phoneBody('0521234567'));
    const other = await postClient(phoneBody('0521234567'), { userId: 'userB', role: 'user' });
    expect(other.status).toBe(201);
  });

  it('a trashed client is not revived; its restore then answers 409 PHONE_TAKEN and it stays in Trash', async () => {
    const old = await postClient(phoneBody('0521234567'));
    expect((await request(app).delete(`/api/v1/data/clients/${old.body._id}`).set(as(OWNER))).status).toBe(200);
    expect(await clientsCol().findOne({ _id: old.body._id })).not.toHaveProperty('liveKey');
    const fresh = await postClient(phoneBody('+972 52 123 4567'));
    expect(fresh.status).toBe(201);
    expect(fresh.body._id).not.toBe(old.body._id);
    const restore = await request(app).put(`/api/v1/data/clients/${old.body._id}/restore`).set(as(OWNER));
    expect(restore.status).toBe(409);
    expect(restore.body).toEqual(PHONE_TAKEN_BODY);
    expect((await clientsCol().findOne({ _id: old.body._id })).deletedAt).toEqual(expect.any(Number));
  });

  it('restore-all skips a client whose phone is taken and restores the others', async () => {
    const a = await postClient(phoneBody('0521234567'));
    const b = await postClient(phoneBody('0547770000'));
    for (const c of [a, b]) await request(app).delete(`/api/v1/data/clients/${c.body._id}`).set(as(OWNER));
    await postClient(phoneBody('0521234567'));
    const res = await request(app).put('/api/v1/data/clients/trash/restore-all').set(as(OWNER));
    expect(res.status).toBe(200);
    expect(res.body.restored).toBe(1);
    expect(res.body.skipped.map(s => s._id)).toEqual([a.body._id]);
  });

  it('PUT that changes the phone to another live client phone -> 409 PHONE_TAKEN and nothing changes', async () => {
    await postClient(phoneBody('0521234567'));
    const other = await postClient(phoneBody('0547770000', { name: 'אבי' }));
    const before = await clientsCol().findOne({ _id: other.body._id });
    const res = await request(app).put(`/api/v1/data/clients/${other.body._id}`).set(as(OWNER)).send(phoneBody('+972 52 123 4567', { name: 'אבי' }));
    expect(res.status).toBe(409);
    expect(res.body).toEqual(PHONE_TAKEN_BODY);
    expect(await clientsCol().findOne({ _id: other.body._id })).toEqual(before);
  });

  it('PUT to a free phone moves the live key; PUT that keeps the phone fills a missing liveKey', async () => {
    const made = await postClient(phoneBody('0521234567'));
    const moved = await request(app).put(`/api/v1/data/clients/${made.body._id}`).set(as(OWNER)).send(phoneBody('0547770000'));
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({ phoneKey: '547770000', liveKey: '547770000' });
    await seedClient('old', { phone: '050-999 8888', phoneKey: '509998888' });
    const saved = await request(app).put('/api/v1/data/clients/old').set(as(OWNER)).send({ name: 'חדש', phone: '050-999 8888' });
    expect(saved.status).toBe(200);
    expect(saved.body.liveKey).toBe('509998888');
  });
});

describe('clients: events counter (plan 545)', () => {
  const eventBody = (clientId) => ({
    name: 'חתונה', eventType: 'wedding', servingType: 'buffet', guestCount: 100, sections: [],
    financialTargets: { targetFoodCostPct: 30 }, performanceTags: { foodCostPct: 0, primaryServingStyle: 'buffet' },
    clientId,
  });
  const state = async (id) => {
    const c = await clientsCol().findOne({ _id: id });
    const live = await testDb().collection('menuEvents').countDocuments({ clientId: id, deletedAt: { $exists: false } });
    return { events: c.counters.events, live, kind: (c.kinds ?? []).includes('event_client') };
  };

  it('stays equal to the live events through post, move, delete and restore', async () => {
    const c1 = (await postClient(phoneBody('0521234567'))).body._id;
    const c2 = (await postClient(phoneBody('0547770000'))).body._id;
    const ev = await request(app).post('/api/v1/data/menuEvents').set(as(OWNER)).send(eventBody(c1));
    expect(ev.status).toBe(201);
    expect(await state(c1)).toEqual({ events: 1, live: 1, kind: true });

    const moved = await request(app).put(`/api/v1/data/menuEvents/${ev.body._id}`).set(as(OWNER)).send(eventBody(c2));
    expect(moved.status).toBe(200);
    expect(await state(c1)).toEqual({ events: 0, live: 0, kind: false });
    expect(await state(c2)).toEqual({ events: 1, live: 1, kind: true });

    expect((await request(app).delete(`/api/v1/data/menuEvents/${ev.body._id}`).set(as(OWNER))).status).toBe(200);
    expect(await state(c2)).toEqual({ events: 0, live: 0, kind: false });

    expect((await request(app).put(`/api/v1/data/menuEvents/${ev.body._id}/restore`).set(as(OWNER))).status).toBe(200);
    expect(await state(c2)).toEqual({ events: 1, live: 1, kind: true });
  });
});
