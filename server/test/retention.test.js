'use strict';
/** Plan 558 - retention: old final requests and bookings are cleared lazily on the generic GET, once per business per day. */

const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { purgeRetained, resetRetentionThrottle, RETENTION } = require('../jobs/retention');
const { setFileStoreForTests, createMemoryFileStore } = require('../services/file-store');

let app;
beforeAll(async () => { app = await buildTestApp(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const as = (user) => ({ Authorization: `Bearer ${signTestToken(user)}` });
const OWNER = { userId: 'own1', name: 'owner', businessId: 'b1', businessRole: 'owner' };
const DAY = 86_400_000;
const NOW = Date.now();

const req = (id, businessId, status, ageDays) => ({ _id: id, businessId, status, createdAt: NOW - ageDays * DAY, updatedAt: NOW - ageDays * DAY });
const booking = (id, businessId, ageDays) => ({ _id: id, businessId, startAt: NOW - ageDays * DAY });
const ids = async (name) => (await testDb().collection(name).find({}).toArray()).map((d) => d._id).sort();

beforeEach(async () => {
  resetRetentionThrottle();
  for (const c of ['requests', 'bookings', 'decisionLog', 'messages', 'conversations']) await testDb().collection(c).deleteMany({});
});

describe('purgeRetained', () => {
  it('constants', () => {
    expect(RETENTION).toEqual({ requestsDays: 730, bookingsDays: 730, messagesDays: 365, conversationsDays: 365, voiceFilesDays: 730 });
  });

  it('deletes old final requests and old bookings; keeps 729-day ones, open requests and decisionLog', async () => {
    const db = testDb();
    await db.collection('requests').insertMany([
      req('r_old_approved', 'b1', 'approved', 731),
      req('r_old_declined', 'b1', 'declined', 800),
      req('r_old_cancelled', 'b1', 'cancelled', 800),
      req('r_old_expired', 'b1', 'expired', 800),
      req('r_729', 'b1', 'approved', 729),
      req('r_old_new', 'b1', 'new', 2000),
      req('r_other_biz', 'b2', 'approved', 2000),
      { _id: 'r_no_updated', businessId: 'b1', status: 'declined', createdAt: NOW - 900 * DAY },
    ]);
    await db.collection('bookings').insertMany([booking('b_old', 'b1', 731), booking('b_729', 'b1', 729), booking('b_other', 'b2', 900)]);
    await db.collection('decisionLog').insertOne({ _id: 'd1', businessId: 'b1', at: NOW - 3000 * DAY });
    const counts = await purgeRetained(db, 'b1', NOW);
    expect(counts).toEqual({ requests: 5, bookings: 1, messages: 0, conversations: 0, files: 0 });
    expect(await ids('requests')).toEqual(['r_729', 'r_old_new', 'r_other_biz']);
    expect(await ids('bookings')).toEqual(['b_729', 'b_other']);
    expect(await ids('decisionLog')).toEqual(['d1']);
  });

  it('a missing messages collection is a no-op; old messages go', async () => {
    const db = testDb();
    await db.collection('messages').drop().catch(() => {});
    expect((await purgeRetained(db, 'b1', NOW)).messages).toBe(0);
    resetRetentionThrottle();
    await db.collection('messages').insertMany([{ _id: 'm1', businessId: 'b1', at: NOW - 400 * DAY }, { _id: 'm2', businessId: 'b1', at: NOW - 100 * DAY }]);
    expect((await purgeRetained(db, 'b1', NOW)).messages).toBe(1);
    expect(await ids('messages')).toEqual(['m2']);
  });

  it('deletes closed conversations past 365 days with their messages; keeps younger, open and other-business ones (plan 687)', async () => {
    const db = testDb();
    const cv = (id, businessId, status, ageDays) => ({ _id: id, businessId, status, lastMessageAt: NOW - ageDays * DAY });
    await db.collection('conversations').insertMany([
      cv('c_old', 'b1', 'closed', 366), cv('c_364', 'b1', 'closed', 364), cv('c_open_old', 'b1', 'human', 900),
      cv('c_bot_old', 'b1', 'bot', 900), cv('c_other', 'b2', 'closed', 900),
    ]);
    await db.collection('messages').insertMany([
      { _id: 'm_old', businessId: 'b1', conversationId: 'c_old', at: NOW - 100 * DAY },
      { _id: 'm_364', businessId: 'b1', conversationId: 'c_364', at: NOW - 364 * DAY },
      { _id: 'm_other', businessId: 'b2', conversationId: 'c_other', at: NOW - 100 * DAY },
    ]);
    const counts = await purgeRetained(db, 'b1', NOW);
    expect(counts.conversations).toBe(1);
    expect(await ids('conversations')).toEqual(['c_364', 'c_bot_old', 'c_open_old', 'c_other']);
    expect(await ids('messages')).toEqual(['m_364', 'm_other']);
  });

  it('runs at most once per business per 24 hours', async () => {
    const db = testDb();
    expect(await purgeRetained(db, 'b1', NOW)).not.toBeNull();
    await db.collection('requests').insertOne(req('late', 'b1', 'approved', 900));
    expect(await purgeRetained(db, 'b1', NOW + DAY - 1000)).toBeNull();
    expect(await ids('requests')).toEqual(['late']);
    expect(await purgeRetained(db, 'b2', NOW)).not.toBeNull();
    expect((await purgeRetained(db, 'b1', NOW + DAY + 1000)).requests).toBe(1);
  });
});

describe('generic GET hook', () => {
  it('GET /data/requests runs the sweep for the caller\'s business only', async () => {
    await testDb().collection('requests').insertMany([req('old', 'b1', 'approved', 900), req('keep', 'b1', 'new', 1), req('other', 'b2', 'approved', 900)]);
    const res = await request(app).get('/api/v1/data/requests').set(as(OWNER));
    expect(res.status).toBe(200);
    expect(await ids('requests')).toEqual(['keep', 'other']);
  });

  it('GET /data/bookings runs the sweep too', async () => {
    await testDb().collection('bookings').insertMany([booking('old', 'b1', 900), booking('new', 'b1', 5), booking('other', 'b2', 900)]);
    const res = await request(app).get('/api/v1/data/bookings').set(as(OWNER));
    expect(res.status).toBe(200);
    expect(await ids('bookings')).toEqual(['new', 'other']);
  });
});

describe('stored files (plan 619)', () => {
  let store;
  const file = (id, businessId, kind, deleteAfter) => ({
    _id: id, businessId, kind, mimeType: kind === 'voice' ? 'audio/webm' : 'image/png', bytes: 3, provider: 'cloudinary',
    providerId: 'fv/' + id, resourceType: kind === 'voice' ? 'video' : 'image', createdBy: 'u', createdAt: NOW - 800 * DAY,
    ...(deleteAfter === undefined ? {} : { deleteAfter }),
  });
  beforeEach(async () => {
    store = createMemoryFileStore();
    setFileStoreForTests(store);
    await testDb().collection('storedFiles').deleteMany({});
  });
  afterEach(() => setFileStoreForTests(null));

  it('deletes a voice file past deleteAfter; keeps one a day early, another business, and an invoice with none', async () => {
    await testDb().collection('storedFiles').insertMany([
      file('v_old', 'b1', 'voice', NOW - 1),
      file('v_early', 'b1', 'voice', NOW + DAY),
      file('v_other', 'b2', 'voice', NOW - DAY),
      file('i_abandoned', 'b1', 'invoice', NOW - DAY),
      file('i_kept', 'b1', 'invoice'),
    ]);
    const counts = await purgeRetained(testDb(), 'b1', NOW);
    expect(counts.files).toBe(2);
    expect(await ids('storedFiles')).toEqual(['i_kept', 'v_early', 'v_other']);
  });

  it('a file whose provider delete fails keeps its document', async () => {
    await testDb().collection('storedFiles').insertOne(file('v_fail', 'b1', 'voice', NOW - 1));
    store.failNextDestroy = true;
    expect((await purgeRetained(testDb(), 'b1', NOW)).files).toBe(0);
    expect(await ids('storedFiles')).toEqual(['v_fail']);
  });
});
