'use strict';
/**
 * Plan 753 (R-26, R-27): the lease of the assistant run — taken once, ends by itself, notes the messages that arrive
 * meanwhile, given back or kept for a follow-up, removed when a person steps in.
 */
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');
const { seedBusiness, seedConversation } = require('./helpers/conversation-fixtures');
const {
  RUN_LEASE_MS, WAITING_MAX, leaseLive, takeLease, noteWaiting, leaseCheck, endLease, clearLease,
} = require('../services/frontdesk-lease');
const { conversationSchema } = require('../generated/schemas/entities/conversation.schema');

let logs;
beforeAll(async () => { await buildTestApp(); logs = captureLogs(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const db = () => testDb();
const col = () => db().collection('conversations');
let conversation;
const stored = () => col().findOne({ _id: conversation._id });
const NOW = 1_000_000;

beforeEach(async () => {
  for (const c of ['conversations', 'clients']) await db().collection(c).deleteMany({});
  await seedBusiness(db());
  ({ conversation } = await seedConversation(db()));
  logs.records.length = 0;
});

const taken = async (now = NOW) => takeLease(db(), conversation, { now });

describe('takeLease', () => {
  it('(a) writes the run with chain 0 and no waiting message; a second take answers null', async () => {
    const lease = await taken();
    expect(lease).toEqual({ id: expect.any(String), since: NOW });
    const { run } = await stored();
    expect(run).toEqual({ id: lease.id, since: NOW, until: NOW + RUN_LEASE_MS, chain: 0, waiting: [] });
    expect(run.until - run.since).toBe(RUN_LEASE_MS);
    expect(await taken(NOW + 1)).toBeNull();
    expect((await stored()).run.id).toBe(lease.id);
    expect(leaseLive(await stored(), NOW + 1)).toBe(true);
    expect(leaseLive(await stored(), NOW + RUN_LEASE_MS)).toBe(false);
    expect(leaseLive(conversation, NOW)).toBe(false);
    expect(leaseLive(null, NOW)).toBe(false);
  });

  it('(b) takes an expired lease and warns once with a number of age', async () => {
    await taken();
    logs.records.length = 0;
    const next = await taken(NOW + RUN_LEASE_MS + 5);
    expect(next).not.toBeNull();
    expect((await stored()).run.id).toBe(next.id);
    const warned = logs.byEvent('frontdesk.lease.expired');
    expect(warned).toHaveLength(1);
    expect(warned[0]).toMatchObject({ conversationId: conversation._id, ageMs: RUN_LEASE_MS + 5 });
  });

  it('(c) a human conversation is not taken', async () => {
    await col().updateOne({ _id: conversation._id }, { $set: { status: 'human' } });
    expect(await taken()).toBeNull();
    expect((await stored()).run).toBeUndefined();
  });
});

describe('noteWaiting', () => {
  it('(d) notes on a live lease only and keeps the 20 newest', async () => {
    expect(await noteWaiting(db(), conversation, 'm0', NOW)).toBe(false);
    await taken();
    expect(await noteWaiting(db(), conversation, '', NOW)).toBe(false);
    expect(await noteWaiting(db(), conversation, 'm1', NOW + 1)).toBe(true);
    expect((await stored()).run.waiting).toEqual(['m1']);
    expect(await noteWaiting(db(), conversation, 'late', NOW + RUN_LEASE_MS)).toBe(false);
    expect((await stored()).run.waiting).toEqual(['m1']);
    for (let i = 2; i <= 26; i++) await noteWaiting(db(), conversation, 'm' + i, NOW + 1);
    const { waiting } = (await stored()).run;
    expect(waiting).toHaveLength(WAITING_MAX);
    expect(waiting[0]).toBe('m7');
    expect(waiting.at(-1)).toBe('m26');
  });
});

describe('endLease', () => {
  it('(e) gives the lease back when every noted message was read', async () => {
    const lease = await taken();
    await noteWaiting(db(), conversation, 'm1', NOW);
    expect(await endLease(db(), conversation, lease, { seen: ['m1', 'm0'] })).toEqual({ follow: false });
    expect((await stored()).run).toBeUndefined();
  });

  it('(e) gives the lease back when nothing was noted, also with nothing read', async () => {
    const lease = await taken();
    expect(await endLease(db(), conversation, lease, { seen: [] })).toEqual({ follow: false });
    expect((await stored()).run).toBeUndefined();
  });

  it('(f) keeps it for a follow-up when a noted message was not read', async () => {
    const lease = await taken();
    await noteWaiting(db(), conversation, 'm2', NOW);
    const res = await endLease(db(), conversation, lease, { seen: ['m1'], graceMs: 6000, now: NOW + 100 });
    expect(res).toMatchObject({ follow: true, chain: 1 });
    expect(res.conversation._id).toBe(conversation._id);
    const { run } = await stored();
    expect(run).toEqual({ id: lease.id, since: NOW, until: NOW + 100 + 6000 + RUN_LEASE_MS, chain: 1, waiting: [] });
  });

  it('(g) a human conversation gets no follow-up and no lease', async () => {
    const lease = await taken();
    await noteWaiting(db(), conversation, 'm2', NOW);
    await col().updateOne({ _id: conversation._id }, { $set: { status: 'human' } });
    expect(await endLease(db(), conversation, lease, { seen: [] })).toEqual({ follow: false });
    expect((await stored()).run).toBeUndefined();
  });

  it('(h) follow false removes the lease whatever waits', async () => {
    const lease = await taken();
    await noteWaiting(db(), conversation, 'm2', NOW);
    expect(await endLease(db(), conversation, lease, { follow: false })).toEqual({ follow: false });
    expect((await stored()).run).toBeUndefined();
  });

  it('(i) another lease id changes nothing', async () => {
    const lease = await taken();
    await noteWaiting(db(), conversation, 'm2', NOW);
    const before = await stored();
    const other = { id: 'other', since: NOW };
    expect(await endLease(db(), conversation, other, { seen: [] })).toEqual({ follow: false });
    expect(await endLease(db(), conversation, other, { follow: false })).toEqual({ follow: false });
    expect(await leaseCheck(db(), conversation, other, [])).toEqual({ ok: false, reason: 'lease_lost' });
    expect(await stored()).toEqual(before);
    expect(before.run.id).toBe(lease.id);
  });
});

describe('leaseCheck', () => {
  it('(j) says ok with the unread notes, else why the run must stop', async () => {
    const lease = await taken();
    expect(await leaseCheck(db(), conversation, lease, [])).toEqual({ ok: true, overtaken: 0 });
    await noteWaiting(db(), conversation, 'm2', NOW);
    expect(await leaseCheck(db(), conversation, lease, ['m1'])).toEqual({ ok: true, overtaken: 1 });
    expect(await leaseCheck(db(), conversation, lease, ['m2'])).toEqual({ ok: true, overtaken: 0 });
    await col().updateOne({ _id: conversation._id }, { $set: { status: 'human' } });
    expect(await leaseCheck(db(), conversation, lease, [])).toEqual({ ok: false, reason: 'taken_over' });
    await col().updateOne({ _id: conversation._id }, { $set: { status: 'closed' } });
    expect(await leaseCheck(db(), conversation, lease, [])).toEqual({ ok: false, reason: 'closed' });
    await col().deleteMany({});
    expect(await leaseCheck(db(), conversation, lease, [])).toEqual({ ok: false, reason: 'closed' });
  });
});

describe('clearLease and the shapes', () => {
  it('(k) removes a lease once', async () => {
    await taken();
    expect(await clearLease(db(), conversation)).toBe(true);
    expect(await clearLease(db(), conversation)).toBe(false);
    expect((await stored()).run).toBeUndefined();
  });

  it('(l) the lease outlives the model budget by 30 seconds or more', () => {
    const { TURN_BUDGET_MS } = require('../routes/ai/frontdesk');
    expect(TURN_BUDGET_MS).toBeGreaterThan(0);
    expect(RUN_LEASE_MS).toBeGreaterThanOrEqual(TURN_BUDGET_MS + 30000);
  });

  it('(m) a conversation with a run passes its schema', async () => {
    await taken();
    await noteWaiting(db(), conversation, 'm1', NOW);
    const doc = await stored();
    expect(doc.run.waiting).toEqual(['m1']);
    expect(conversationSchema.safeParse(doc).success).toBe(true);
  });
});
