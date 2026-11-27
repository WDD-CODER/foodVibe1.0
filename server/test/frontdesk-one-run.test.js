'use strict';
/**
 * Plan 753 (R-26, R-27, R-28): one assistant run per conversation, end to end. The messages come in through
 * `handleInbound`, the real turn answers them, and the model is a stubbed fetch that a test can hold open. Covers the
 * burst, the follow-up, take over and a member's reply mid-run, hand back, a crashed run, a failure, the superseded
 * write, the follow-up limit, button taps, level 0 and the logs. No key, no network.
 */
const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');
const { seedBusiness, seedConversation, controllableWait } = require('./helpers/conversation-fixtures');
const { resetForTests } = require('../services/gemini-client');
const { _waitForUsageWritesForTests } = require('../services/ai-usage');
const { clearCapCache } = require('../services/ai-cap');
const { clearModuleCache } = require('../middleware/require-module');
const { fixedText } = require('../utils/fixed-text');
const {
  handleInbound, registerButton, setTurnHandler, setWaitForTest, resetInboundForTest, answerWaiting,
} = require('../services/inbound');
const { runTurn } = require('../services/frontdesk-turn');
const { conversationSchema } = require('../generated/schemas/entities/conversation.schema');

process.env.GEMINI_API_KEY = 'test-key';
let app;
let logs;
let fetchMock;
let mark;
let sent;
beforeAll(async () => { app = await buildTestApp(); logs = captureLogs(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const db = () => testDb();
const WA = '972521234567';
const OWNER = { userId: 'own1', name: 'o', businessId: 'b1', businessRole: 'owner' };
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` });
const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const modelAnswer = obj => jsonResponse(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });
const say = reply => modelAnswer({ reply, intent: 'smalltalk' });
const TABLE = {
  enabled: true, expireAfterHours: 24, rules: {},
  questions: [
    { key: 'date', label: 'תאריך', type: 'date', required: true },
    { key: 'time', label: 'שעה', type: 'time', required: true },
    { key: 'party_size', label: 'כמה אנשים', type: 'number', required: true },
  ],
};
const ALL_DAYS = [{ days: 'all', time: 'all', dayIndexes: [0, 1, 2, 3, 4, 5, 6], open: '00:00', close: '23:59' }];
const COMPLETE = {
  reply: 'MODEL-REPLY', intent: 'request', kind: 'table',
  collected: { date: '2030-01-07', time: '19:00', party_size: '4' },
};

async function setLevel(level) {
  await db().collection('frontDeskProfiles').updateOne({ businessId: 'b1' }, {
    $set: { assistant: { level, tone: 'warm' }, requestKinds: { table: TABLE }, hours: ALL_DAYS, slug: 'one-one' },
  });
}

beforeEach(async () => {
  resetForTests(); clearCapCache(); clearModuleCache();
  await _waitForUsageWritesForTests();
  for (const c of ['messages', 'conversations', 'clients', 'aiUsage', 'GEMINI_USAGE', 'requests', 'businesses', 'frontDeskProfiles', 'knowledgeItems', 'assistantRuns']) {
    await db().collection(c).deleteMany({});
  }
  await seedBusiness(db());
  await setLevel(1);
  resetInboundForTest();
  setTurnHandler(runTurn);
  setWaitForTest(async () => {});
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  mark = logs.records.length;
  sent = 0;
  lastAt = 0;
});
afterEach(() => { vi.unstubAllGlobals(); });

let n = 0;
let lastAt = 0;
/** A guest message as the simulator route sends it; each one is later than the one before. */
function send(text, { at, ...over } = {}) {
  lastAt = at ?? Math.max(Date.now(), lastAt + 1);
  sent += 1;
  return handleInbound(db(), {
    businessId: 'b1', channel: 'sim', waId: WA, text, providerMessageId: 'one-run-' + (++n), at: lastAt, ...over,
  });
}
/** Sends a message and waits until it (and any run it started) is done. */
async function sendSettled(text, over) {
  const r = await send(text, over);
  await r.settled;
  return r;
}
/** The next model call stays open until the test answers it. */
function holdCall() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  fetchMock.mockImplementationOnce(() => promise);
  return { answer: obj => resolve(modelAnswer(obj)), respond: response => resolve(response) };
}
const inFlight = count => vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(count), { timeout: 10000 });
const conv = async () => (await db().collection('conversations').find({ businessId: 'b1' }).toArray())[0];
const outbound = () => db().collection('messages').find({ direction: 'out' }).sort({ at: 1, _id: 1 }).toArray();
const outTexts = async () => (await outbound()).map(m => m.text);
const runs = () => db().collection('assistantRuns').find({}).toArray();
const requests = () => db().collection('requests').countDocuments({});
const stepOf = (doc, key) => doc.steps.find(s => s.key === key);
const logged = event => logs.records.slice(mark).filter(r => r.event === event);
const bodyOf = call => JSON.parse(fetchMock.mock.calls[call][1].body);
const asOwner = (method, path, body = {}) => request(app)[method](`/api/v1/conversations/${path}`).set(as(OWNER)).send(body);
/** The two runs of a run and its follow-up. */
async function firstAndFollowUp() {
  const all = await runs();
  expect(all).toHaveLength(2);
  return { first: all.find(r => !r.followsRunId), next: all.find(r => r.followsRunId) };
}
async function expectNoRun() {
  const stored = await conv();
  expect(stored.run).toBeUndefined();
  expect(conversationSchema.safeParse(stored).success).toBe(true);
}
/** A seeded live conversation with a guest message already stored. */
async function seeded({ run, test = true } = {}) {
  const { conversation } = await seedConversation(db(), { at: Date.now(), test });
  if (run) await db().collection('conversations').updateOne({ _id: conversation._id }, { $set: { run } });
  return conversation;
}
const leaseUntil = until => ({ id: 'dead', since: 1, until, chain: 0, waiting: [] });

describe('one run per conversation', () => {
  it('two messages one second apart get one run and one answer', async () => {
    const w = controllableWait();
    setWaitForTest(w.wait);
    fetchMock.mockResolvedValue(say('A1'));
    const T = Date.now();
    const m1 = await send('GUEST-SECRET-ONE', { at: T });
    const m2 = await send('GUEST-SECRET-TWO', { at: T + 1000 });
    await vi.waitFor(() => expect(w.calls).toHaveLength(2));
    w.release();
    await Promise.all([m1.settled, m2.settled]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const out = await outbound();
    expect(out).toHaveLength(1);
    expect(out[0].author).toBe('ai');
    const all = await runs();
    expect(all).toHaveLength(1);
    expect(all[0].trigger.messageIds).toEqual([m1.messageId, m2.messageId]);
    await expectNoRun();
  });

  it('a message during a run starts no run and is answered by one follow-up', async () => {
    const held = holdCall();
    fetchMock.mockResolvedValueOnce(say('A2'));
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    const m2 = await sendSettled('GUEST-SECRET-TWO');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logged('inbound.left_to_run')).toHaveLength(1);
    expect((await conv()).run.waiting).toEqual([m2.messageId]);
    held.answer({ reply: 'A1', intent: 'smalltalk' });
    await m1.settled;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await outTexts()).toEqual(['A1', 'A2']);
    const { first, next } = await firstAndFollowUp();
    expect(stepOf(first, 'send').out.overtaken).toBe(1);
    expect(first.followsRunId).toBeUndefined();
    expect(next.followsRunId).toBe(first._id);
    expect(next.trigger.messageIds).toEqual([m2.messageId]);
    expect(stepOf(next, 'inbound').out.via).toBe('follow_up');
    const turns = bodyOf(1).contents.map(c => `${c.role}:${c.parts[0].text}`);
    expect(turns.indexOf('model:A1')).toBeGreaterThan(-1);
    expect(turns.indexOf('model:A1')).toBeLessThan(turns.indexOf('user:GUEST-SECRET-TWO'));
    expect(logged('frontdesk.turn.follow_up')).toHaveLength(1);
    await expectNoRun();
  });

  it('plan 754: the follow-up waits what is left of 3 seconds', async () => {
    const calls = [];
    setWaitForTest(async ms => { calls.push(ms); });
    const held = holdCall();
    fetchMock.mockResolvedValueOnce(say('A2'));
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    await sendSettled('GUEST-SECRET-TWO');
    held.answer({ reply: 'A1', intent: 'smalltalk' });
    await m1.settled;
    expect(calls).toHaveLength(2);
    expect(calls[0]).toBe(3000);
    expect(calls[1]).toBeGreaterThanOrEqual(0);
    expect(calls[1]).toBeLessThanOrEqual(3000);
    const { next } = await firstAndFollowUp();
    expect(stepOf(next, 'inbound').out).toMatchObject({ via: 'follow_up', quietMs: calls[1], capped: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([[3, 3], [7, 5]])('%i messages during a run get exactly one follow-up', async (count, counted) => {
    const held = holdCall();
    fetchMock.mockResolvedValueOnce(say('A2'));
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    const ids = [];
    for (let i = 0; i < count; i++) ids.push((await sendSettled('GUEST-SECRET-MORE-' + i)).messageId);
    held.answer({ reply: 'A1', intent: 'smalltalk' });
    await m1.settled;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const { next } = await firstAndFollowUp();
    expect(next.trigger.messageIds).toEqual(ids.slice(-counted));
    const lead = bodyOf(1).contents[0].parts[0].text;
    expect(lead).toContain('=== UNANSWERED (data) ===');
    expect(lead).toContain(`no answer yet: ${counted}`);
    await expectNoRun();
  });
});

describe('a person steps in', () => {
  it('take over mid-run: nothing is sent or written and no follow-up starts', async () => {
    const held = holdCall();
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    await sendSettled('GUEST-SECRET-TWO');
    const id = (await conv())._id;
    expect((await asOwner('put', `${id}/takeover`)).status).toBe(200);
    held.answer(COMPLETE);
    await m1.settled;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await outbound()).toHaveLength(0);
    expect(await requests()).toBe(0);
    const stored = await conv();
    expect(stored.status).toBe('human');
    for (const field of ['requestId', 'suggestion', 'lowTurns', 'assistantFailed', 'run']) {
      expect(stored[field], field).toBeUndefined();
    }
    const all = await runs();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ outcome: 'dropped', reason: 'taken_over' });
    expect(stepOf(all[0], 'ai').status).toBe('ok');
    for (const key of ['guardrails', 'tables', 'decide']) expect(stepOf(all[0], key).status, key).toBe('skipped');
    expect(stepOf(all[0], 'send')).toMatchObject({ status: 'stopped', out: { action: 'none' } });
    expect(logged('frontdesk.turn.dropped')).toHaveLength(1);
    expect(logged('frontdesk.turn.dropped')[0].reason).toBe('taken_over');
  });

  it('a member replies mid-run: only the member\'s message goes out', async () => {
    const held = holdCall();
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    const id = (await conv())._id;
    expect((await asOwner('post', `${id}/messages`, { text: 'אני כאן' })).status).toBe(201);
    held.answer({ reply: 'A1', intent: 'smalltalk' });
    await m1.settled;
    expect(await outTexts()).toEqual(['אני כאן']);
    expect((await runs())[0]).toMatchObject({ outcome: 'dropped', reason: 'taken_over' });
    await expectNoRun();
  });

  it('the lease cleared with the status still bot: the answer is dropped as lease_lost', async () => {
    const held = holdCall();
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    await db().collection('conversations').updateOne({ businessId: 'b1' }, { $unset: { run: '' } });
    held.answer({ reply: 'A1', intent: 'smalltalk' });
    await m1.settled;
    expect((await conv()).status).toBe('bot');
    expect(await outbound()).toHaveLength(0);
    expect((await runs())[0]).toMatchObject({ outcome: 'dropped', reason: 'lease_lost' });
  });

  it('a conversation closed mid-run: the answer is dropped as closed', async () => {
    const held = holdCall();
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    const id = (await conv())._id;
    expect((await asOwner('put', `${id}/close`)).status).toBe(200);
    held.answer({ reply: 'A1', intent: 'smalltalk' });
    await m1.settled;
    expect(await outbound()).toHaveLength(0);
    expect((await runs())[0]).toMatchObject({ outcome: 'dropped', reason: 'closed' });
  });
});

describe('hand back while a run is live', () => {
  it('(a) a live lease takes the waiting message: busy, no model call', async () => {
    const conversation = await seeded({ run: leaseUntil(Date.now() + 60000) });
    await db().collection('messages').insertOne({
      _id: 'g1', businessId: 'b1', conversationId: conversation._id, direction: 'in', author: 'guest', kind: 'text',
      text: 'GUEST-SECRET-ONE', at: Date.now(), providerMessageId: 'pm-g1', status: 'delivered', test: true,
    });
    expect(await answerWaiting(db(), await conv())).toEqual({ skipped: 'busy' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await conv()).run.waiting).toEqual(['g1']);
    expect(logged('frontdesk.turn.busy')).toHaveLength(1);
  });

  it('(b) take over and release during a held run: the new run answers, the old answer is dropped', async () => {
    const held = holdCall();
    fetchMock.mockResolvedValueOnce(say('B1'));
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    const id = (await conv())._id;
    expect((await asOwner('put', `${id}/takeover`)).status).toBe(200);
    expect((await asOwner('put', `${id}/release`)).status).toBe(200);
    await vi.waitFor(async () => expect(await runs()).toHaveLength(1), { timeout: 10000 });
    held.answer({ reply: 'A1', intent: 'smalltalk' });
    await m1.settled;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await outTexts()).toEqual(['B1']);
    const all = await runs();
    expect(all).toHaveLength(2);
    expect(all.find(r => r.outcome === 'dropped')).toMatchObject({ reason: 'lease_lost' });
    expect(all.find(r => r.outcome === 'answered')).toBeDefined();
    await expectNoRun();
  });
});

describe('a crashed run', () => {
  it('an expired lease is taken by the next message, with one warning', async () => {
    await seeded({ run: leaseUntil(Date.now() - 1) });
    fetchMock.mockResolvedValue(say('A1'));
    await sendSettled('GUEST-SECRET-ONE');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await outbound()).toHaveLength(1);
    const warned = logged('frontdesk.lease.expired');
    expect(warned).toHaveLength(1);
    expect(warned[0].level).toBe(40);
    await expectNoRun();
  });

  it('a live lease takes the note and no model is called', async () => {
    await seeded({ run: leaseUntil(Date.now() + 60000) });
    const r = await sendSettled('GUEST-SECRET-ONE');
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await conv()).run.waiting).toEqual([r.messageId]);
  });
});

describe('under the lock', () => {
  it('a failure gives one holding message, hands over and starts no follow-up', async () => {
    const unavailable = jsonResponse(503, { error: { message: 'overloaded' } });
    const held = holdCall();
    fetchMock.mockResolvedValue(unavailable);
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    await sendSettled('GUEST-SECRET-TWO');
    held.respond(unavailable);
    await m1.settled;
    const out = await outbound();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ author: 'server', text: fixedText('fd_ai_holding_default') });
    expect((await conv()).status).toBe('human');
    const all = await runs();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ outcome: 'failed', reason: 'busy' });
    await expectNoRun();
  }, 30000);

  it('a first run that was about to write a request writes nothing; the follow-up answers everything', async () => {
    const held = holdCall();
    fetchMock.mockResolvedValueOnce(say('A2'));
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    const m2 = await sendSettled('GUEST-SECRET-TWO');
    held.answer(COMPLETE);
    await m1.settled;
    expect(await requests()).toBe(0);
    expect(await outTexts()).toEqual(['A2']);
    const { first, next } = await firstAndFollowUp();
    expect(first).toMatchObject({ outcome: 'superseded', reason: 'overtaken' });
    expect(stepOf(first, 'send')).toMatchObject({ status: 'stopped', out: { action: 'none', overtaken: 1 } });
    expect(next.trigger.messageIds).toEqual([m1.messageId, m2.messageId]);
    expect(logged('frontdesk.turn.superseded')).toHaveLength(1);
    await expectNoRun();
  });

  it('a guest who never stops is handed to a person after three follow-ups', async () => {
    fetchMock.mockImplementation(async () => {
      const call = fetchMock.mock.calls.length;
      await sendSettled('GUEST-SECRET-MORE-' + call);
      return say('A' + call);
    });
    await sendSettled('GUEST-SECRET-ONE');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(sent).toBe(5);
    const all = await runs();
    expect(all).toHaveLength(5);
    expect(all.filter(r => r.outcome === 'handover')).toEqual([expect.objectContaining({ reason: 'follow_up_limit' })]);
    expect((await outTexts()).at(-1)).toBe(fixedText('fd_ai_handoff_default'));
    expect((await conv()).status).toBe('human');
    await expectNoRun();
  }, 30000);

  it('a button tap with a handler runs at once and leaves the lease alone; one without is left to the run', async () => {
    const tap = vi.fn(async () => {});
    registerButton('PING', tap);
    const held = holdCall();
    fetchMock.mockResolvedValueOnce(say('A2'));
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    const before = (await conv()).run;
    await sendSettled('', { buttonId: 'PING:abc' });
    expect(tap).toHaveBeenCalledTimes(1);
    expect((await conv()).run).toEqual(before);
    expect(before.waiting).toEqual([]);
    const other = await sendSettled('', { buttonId: 'NOPE:abc' });
    expect((await conv()).run.waiting).toEqual([other.messageId]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    held.answer({ reply: 'A1', intent: 'smalltalk' });
    await m1.settled;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expectNoRun();
  });

  it('a turn that throws leaves no run field and gives its own error', async () => {
    const conversation = await seeded();
    const boom = new Error('boom');
    const broken = {
      collection: name => {
        if (name === 'frontDeskProfiles') throw boom;
        return db().collection(name);
      },
    };
    await expect(runTurn(broken, conversation)).rejects.toBe(boom);
    await expectNoRun();
  });

  it('level 0: no message goes out and the follow-up\'s draft replaces the first', async () => {
    await setLevel(0);
    await seeded({ test: false });
    const held = holdCall();
    fetchMock.mockResolvedValueOnce(say('A2'));
    const m1 = await send('GUEST-SECRET-ONE');
    await inFlight(1);
    await sendSettled('GUEST-SECRET-TWO');
    held.answer({ reply: 'A1', intent: 'smalltalk' });
    await m1.settled;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await outbound()).toHaveLength(0);
    expect(await conv()).toMatchObject({ status: 'bot', suggestion: 'A2' });
    await expectNoRun();
  });
});

describe('logs', () => {
  it('of all the cases carry no guest text and no answer of the model', () => {
    const text = JSON.stringify(logs.records);
    expect(logs.records.map(r => r.event)).toEqual(expect.arrayContaining([
      'inbound.left_to_run', 'frontdesk.turn.busy', 'frontdesk.turn.follow_up', 'frontdesk.turn.dropped',
      'frontdesk.turn.superseded', 'frontdesk.lease.expired', 'conversations.replied',
    ]));
    for (const secret of ['GUEST-SECRET', 'A1', 'A2', 'B1']) expect(text).not.toContain(secret);
  });
});
