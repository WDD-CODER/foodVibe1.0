'use strict';
/** Plan 545: the one find-or-create of a client by phone (R-01) — vectors, concurrency, trash, other businesses. */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { PHONE_VECTORS } = require('../generated/schemas/testing/phone-vectors');
const {
  normalizePhone, phoneKey, upsertClientByPhone, findLiveClientByPhoneKey, refreshClientEvents,
} = require('../utils/client-upsert');

const ACTOR = { userId: 'userA', name: 'Owner' };

beforeAll(async () => {
  await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

beforeEach(async () => {
  for (const c of ['clients', 'menuEvents']) await testDb().collection(c).deleteMany({});
});

const upsert = (businessId, phone, extra = {}) =>
  upsertClientByPhone(testDb(), businessId, { name: 'דנה', phone, source: 'manual', actor: ACTOR, ...extra });

describe('shared phone vectors', () => {
  it.each(PHONE_VECTORS.map((v) => [v.input, v]))('%s -> normalized and key match the shared rule', (_label, v) => {
    expect(normalizePhone(v.input)).toBe(v.normalized);
    expect(phoneKey(normalizePhone(v.input))).toBe(v.key);
  });
});

describe('upsertClientByPhone', () => {
  it('creates a client, then returns it unchanged for the same person in another format', async () => {
    const first = await upsert('b_A', '052-123 4567');
    expect(first.created).toBe(true);
    expect(first.client).toMatchObject({ phoneNormalized: '0521234567', phoneKey: '521234567', liveKey: '521234567', source: 'manual', userId: 'userA' });
    const again = await upsert('b_A', '+972 52 123 4567', { name: 'שם אחר' });
    expect(again.created).toBe(false);
    expect(again.client._id).toBe(first.client._id);
    expect(again.client.name).toBe('דנה');
    expect(await testDb().collection('clients').countDocuments()).toBe(1);
  });

  it('5 parallel calls leave exactly 1 live client: 1 created, 4 joined with the same _id', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => upsert('b_A', '052-123 4567')));
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(results.filter((r) => !r.created)).toHaveLength(4);
    expect(new Set(results.map((r) => r.client._id)).size).toBe(1);
    expect(await testDb().collection('clients').countDocuments({ deletedAt: { $exists: false } })).toBe(1);
  });

  it('a soft-deleted client is not revived: a new client is created', async () => {
    const old = await upsert('b_A', '0521234567');
    await testDb().collection('clients').updateOne({ _id: old.client._id }, { $set: { deletedAt: 1 }, $unset: { liveKey: '' } });
    const fresh = await upsert('b_A', '+972 52 123 4567');
    expect(fresh.created).toBe(true);
    expect(fresh.client._id).not.toBe(old.client._id);
  });

  it('a merged client is not matched', async () => {
    const old = await upsert('b_A', '0521234567');
    await testDb().collection('clients').updateOne({ _id: old.client._id }, { $set: { mergedInto: 'x' }, $unset: { liveKey: '' } });
    expect(await findLiveClientByPhoneKey(testDb(), 'b_A', '521234567')).toBeNull();
  });

  it('never matches a client of another business', async () => {
    const a = await upsert('b_A', '0521234567');
    const b = await upsert('b_B', '0521234567');
    expect(b.created).toBe(true);
    expect(b.client._id).not.toBe(a.client._id);
  });

  it('a guest actor string stamps createdBy and no userId', async () => {
    const r = await upsert('b_A', '0521234567', { source: 'public_form', actor: 'public:form' });
    expect(r.client.createdBy).toBe('public:form');
    expect(r.client).not.toHaveProperty('userId');
  });

  it('refuses a bad phone and an unknown source with BAD_CLIENT', async () => {
    await expect(upsert('b_A', 'abc')).rejects.toMatchObject({ code: 'BAD_CLIENT' });
    await expect(upsert('b_A', '0521234567', { source: 'telepathy' })).rejects.toMatchObject({ code: 'BAD_CLIENT' });
    expect(await testDb().collection('clients').countDocuments()).toBe(0);
  });
});

describe('refreshClientEvents', () => {
  it('counts live events and keeps the event_client kind exactly while the count is > 0', async () => {
    const { client } = await upsert('b_A', '0521234567');
    const events = testDb().collection('menuEvents');
    await events.insertMany([
      { _id: 'e1', businessId: 'b_A', clientId: client._id },
      { _id: 'e2', businessId: 'b_A', clientId: client._id, deletedAt: 5 },
    ]);
    await refreshClientEvents(testDb(), 'b_A', [client._id, client._id, '', undefined]);
    let doc = await testDb().collection('clients').findOne({ _id: client._id });
    expect(doc.counters.events).toBe(1);
    expect(doc.kinds).toEqual(['event_client']);
    await events.deleteMany({});
    await refreshClientEvents(testDb(), 'b_A', [client._id, 'missing']);
    doc = await testDb().collection('clients').findOne({ _id: client._id });
    expect(doc.counters.events).toBe(0);
    expect(doc.kinds).toEqual([]);
  });
});
