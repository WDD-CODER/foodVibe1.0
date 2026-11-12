'use strict';
/** Plan 558 - erase one customer of one business by phone (planErase, parseArgs, runErase on the in-memory database). */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { planErase, parseArgs, runErase, formatResult } = require('../scripts/erase-client');
const { normalizePhone, phoneKey } = require('../utils/client-upsert');

const key = phoneKey(normalizePhone('0521234567'));
const OTHER = '0539999999';

const clients = [
  { _id: 'c_live', businessId: 'b1', phoneKey: key },
  { _id: 'c_trash', businessId: 'b1', phoneKey: key, deletedAt: 5 },
  { _id: 'c_merged', businessId: 'b1', phoneKey: 'zzz', mergedInto: 'c_live' },
  { _id: 'c_chain', businessId: 'b1', phoneKey: 'yyy', mergedInto: 'c_merged' },
  { _id: 'c_other', businessId: 'b1', phoneKey: phoneKey(normalizePhone(OTHER)) },
];
const requests = [
  { _id: 'r1', clientId: 'c_live', guestPhone: '' },
  { _id: 'r2', guestPhone: '+972 52 123 4567' },
  { _id: 'r3', clientId: 'c_other', guestPhone: OTHER },
];
const bookings = [
  { _id: 'k1', clientId: 'c_trash' },
  { _id: 'k2', guestPhone: '052-123 4567' },
  { _id: 'k3', guestPhone: OTHER },
];
const events = [
  { _id: 'e1', clientId: 'c_live', clientName: 'X', clientPhone: '0521234567' },
  { _id: 'e2', clientPhone: '972521234567' },
  { _id: 'e3', clientPhone: OTHER },
];

describe('planErase', () => {
  it('collects the person and what is theirs, nothing else', () => {
    const plan = planErase({
      key,
      clients,
      requests,
      bookings,
      events,
      conversations: [{ _id: 'v1', clientId: 'c_live' }, { _id: 'v2', clientId: 'c_other' }],
      messages: [{ _id: 'm1', conversationId: 'v1' }, { _id: 'm2', conversationId: 'v2' }],
    });
    expect([...plan.deleteClients].sort()).toEqual(['c_chain', 'c_live', 'c_merged', 'c_trash']);
    expect(plan.deleteRequests).toEqual(['r1', 'r2']);
    expect(plan.deleteBookings).toEqual(['k1', 'k2']);
    expect(plan.deleteConversations).toEqual(['v1']);
    expect(plan.deleteMessages).toEqual(['m1']);
    expect(plan.anonymiseEvents).toEqual(['e1', 'e2']);
  });

  it('three spellings of one phone find the same person', () => {
    for (const p of ['052-123 4567', '+972 52 123 4567', '972521234567']) {
      expect(phoneKey(normalizePhone(p))).toBe(key);
      const plan = planErase({ key: phoneKey(normalizePhone(p)), clients, requests });
      expect(plan.deleteRequests).toEqual(['r1', 'r2']);
    }
  });

  it('an empty key matches nothing', () => {
    const plan = planErase({ key: '', clients, requests, bookings, events });
    expect(plan.deleteClients).toEqual([]);
    expect(plan.deleteRequests).toEqual([]);
    expect(plan.anonymiseEvents).toEqual([]);
  });
});

describe('parseArgs', () => {
  const base = ['node', 'x', '--target=local', '--business=b1', '--phone=0521234567'];
  it('accepts the full set', () => {
    expect(parseArgs([...base, '--write', '--db=scratch'])).toMatchObject({ target: 'local', business: 'b1', write: true, db: 'scratch' });
    expect(parseArgs(base).write).toBe(false);
  });
  it('refuses missing or unknown arguments', () => {
    expect(() => parseArgs(['node', 'x', '--business=b1', '--phone=1'])).toThrow(/--target/);
    expect(() => parseArgs(['node', 'x', '--target=local', '--phone=1'])).toThrow(/--business/);
    expect(() => parseArgs(['node', 'x', '--target=local', '--business=b1'])).toThrow(/--phone/);
    expect(() => parseArgs([...base, '--bogus'])).toThrow(/Unknown/);
  });
  it('atlas without --confirm-host is refused by connect (before any connection to Atlas is kept)', async () => {
    const args = parseArgs(['node', 'x', '--target=atlas', '--business=b1', '--phone=1']);
    expect(args['confirm-host']).toBeUndefined();
    const mongodb = require('mongodb');
    const dbTarget = require('../utils/db-target');
    const connectSpy = vi.spyOn(mongodb.MongoClient.prototype, 'connect').mockResolvedValue(undefined);
    const closeSpy = vi.spyOn(mongodb.MongoClient.prototype, 'close').mockResolvedValue(undefined);
    const envSpy = vi.spyOn(dbTarget, 'loadServerEnv').mockImplementation(() => {});
    const uriSpy = vi.spyOn(dbTarget, 'mongoUri').mockReturnValue('mongodb://atlas-host.example:27017/');
    const connectPath = require.resolve('../migrations/tools/_connect');
    delete require.cache[connectPath];
    try {
      const { connect } = require('../migrations/tools/_connect');
      await expect(connect(args)).rejects.toThrow(/confirm-host/);
      expect(closeSpy).toHaveBeenCalled();
      await expect(connect({ ...args, 'confirm-host': 'wrong.example' })).rejects.toThrow(/confirm-host/);
      expect(connectSpy).toHaveBeenCalled();
    } finally {
      delete require.cache[connectPath];
      for (const spy of [connectSpy, closeSpy, envSpy, uriSpy]) spy.mockRestore();
    }
  });
});

describe('runErase', () => {
  let mongod;
  let client;
  let db;
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongod.getUri());
    db = client.db('erase_test');
  }, 60000);
  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });
  beforeEach(async () => {
    for (const c of ['clients', 'requests', 'bookings', 'menuEvents', 'decisionLog']) await db.collection(c).deleteMany({});
    const tag = (docs) => docs.map((d) => ({ businessId: 'b1', ...d }));
    await db.collection('clients').insertMany([...tag(clients), { _id: 'x_live', businessId: 'b2', phoneKey: key }]);
    await db.collection('requests').insertMany([...tag(requests), { _id: 'x_r', businessId: 'b2', guestPhone: '0521234567' }]);
    await db.collection('bookings').insertMany(tag(bookings));
    await db.collection('menuEvents').insertMany([...tag(events), { _id: 'x_e', businessId: 'b2', clientPhone: '0521234567' }]);
    await db.collection('decisionLog').insertOne({ _id: 'd1', businessId: 'b1' });
  });

  it('dry run changes nothing and the output lists counts only', async () => {
    const result = await runErase(db, { businessId: 'b1', phone: '+972 52 123 4567', write: false });
    expect(result.counts).toEqual({ clients: 4, requests: 2, bookings: 2, conversations: 0, messages: 0, events: 2 });
    expect(await db.collection('clients').countDocuments()).toBe(6);
    expect(await db.collection('menuEvents').countDocuments({ clientPhone: { $exists: true } })).toBe(4);
    const out = formatResult(result, false).join('\n');
    expect(out).toContain('would delete 4');
    expect(out).not.toMatch(/521234567|\+972|token/i);
  });

  it('--write applies the counts and leaves other business, other phone and decisionLog alone', async () => {
    const result = await runErase(db, { businessId: 'b1', phone: '0521234567', write: true });
    expect(result.counts.clients).toBe(4);
    expect((await db.collection('clients').find({}).toArray()).map((c) => c._id).sort()).toEqual(['c_other', 'x_live']);
    expect((await db.collection('requests').find({}).toArray()).map((c) => c._id).sort()).toEqual(['r3', 'x_r']);
    expect((await db.collection('bookings').find({}).toArray()).map((c) => c._id)).toEqual(['k3']);
    expect(await db.collection('menuEvents').findOne({ _id: 'e1' })).toEqual({ _id: 'e1', businessId: 'b1' });
    expect(await db.collection('menuEvents').findOne({ _id: 'e3' })).toMatchObject({ clientPhone: OTHER });
    expect(await db.collection('menuEvents').findOne({ _id: 'x_e' })).toMatchObject({ clientPhone: '0521234567' });
    expect(await db.collection('decisionLog').countDocuments()).toBe(1);
    expect(formatResult(result, true).join('\n')).not.toMatch(/521234567/);
  });

  it('a phone without digits is refused', async () => {
    await expect(runErase(db, { businessId: 'b1', phone: 'abc', write: true })).rejects.toThrow();
  });
});
