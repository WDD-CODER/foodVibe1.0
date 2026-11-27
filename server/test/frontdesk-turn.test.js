'use strict';
/**
 * Plan 679 (C-AI): the assistant's turn with the model faked by a stubbed fetch. No key, no network.
 * Covers levels 0/1/2, the request, a closed day (R-10), every failure with its holding message (R-04 as changed by
 * plan 733, R-22), the cap, test data, the simulator answering as level 1 (R-23) and logs.
 */
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');
const { seedBusiness, seedConversation } = require('./helpers/conversation-fixtures');
const { resetForTests } = require('../services/gemini-client');
const { _waitForUsageWritesForTests } = require('../services/ai-usage');
const { clearCapCache } = require('../services/ai-cap');
const { jerusalemDate } = require('../middleware/usage');
const { fixedText } = require('../utils/fixed-text');
const { setTurnHandler, resetInboundForTest } = require('../services/inbound');
const { runTurn, FRONTDESK_DAILY_TURNS } = require('../services/frontdesk-turn');

process.env.GEMINI_API_KEY = 'test-key';
let logs;
let fetchMock;
beforeAll(async () => { await buildTestApp(); logs = captureLogs(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const db = () => testDb();
const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const modelAnswer = obj => jsonResponse(200, {
  candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }],
});
const SMALL = { reply: 'שלום', intent: 'smalltalk' };
const DATE = '2030-01-07'; // a Monday
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
  reply: 'MODEL-REPLY', intent: 'request', kind: 'table', collected: { date: DATE, time: '19:00', party_size: '4' },
};

async function setup({ level = 1, test, status, hours = ALL_DAYS, assistant = {}, text = 'GUEST-SECRET-TEXT' } = {}) {
  await seedBusiness(db());
  await db().collection('frontDeskProfiles').updateOne({ businessId: 'b1' }, {
    $set: { assistant: { level, tone: 'warm', ...assistant }, requestKinds: { table: TABLE }, hours, slug: 'one-one' },
  });
  const { conversation, clientId } = await seedConversation(db(), { at: Date.now(), test });
  if (status) await db().collection('conversations').updateOne({ _id: conversation._id }, { $set: { status } });
  await db().collection('messages').insertOne({
    _id: 'g1', businessId: 'b1', conversationId: conversation._id, direction: 'in', author: 'guest', kind: 'text',
    text, at: Date.now(), providerMessageId: 'pm1', status: 'delivered',
  });
  return { conversation: await db().collection('conversations').findOne({ _id: conversation._id }), clientId };
}
const turn = (conversation, opts = {}) => runTurn(db(), conversation, { log: require('../logger').logger, ...opts });
const conv = id => db().collection('conversations').findOne({ _id: id });
const outbound = () => db().collection('messages').find({ direction: 'out' }).toArray();
const ledger = async () => { await _waitForUsageWritesForTests(); return db().collection('aiUsage').find({}).toArray(); };

beforeEach(async () => {
  resetForTests(); clearCapCache(); resetInboundForTest();
  for (const c of ['messages', 'conversations', 'clients', 'aiUsage', 'GEMINI_USAGE', 'requests', 'businesses', 'frontDeskProfiles', 'knowledgeItems', 'assistantRuns']) {
    await db().collection(c).deleteMany({});
  }
  logs.records.length = 0;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('level 1', () => {
  it('one model call, one outbound message by the assistant, one ledger row', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const out = await outbound();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ author: 'ai', text: 'שלום' });
    const rows = await ledger();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ feature: 'frontdesk_turn', businessId: 'b1' });
  });

  it('sends the guest text only in user parts, never in the system instruction', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(JSON.stringify(body.systemInstruction)).not.toContain('GUEST-SECRET-TEXT');
    expect(JSON.stringify(body.contents)).toContain('GUEST-SECRET-TEXT');
  });
});

describe('plan 753: the lease of a turn', () => {
  it('after a turn the stored conversation has no run field and passes its schema', async () => {
    const { conversationSchema } = require('../generated/schemas/entities/conversation.schema');
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    const stored = await conv(conversation._id);
    expect(stored.run).toBeUndefined();
    expect(conversationSchema.safeParse(stored).success).toBe(true);
  });
});

describe('level 0 and 2', () => {
  it('level 0 stores the suggestion, sends nothing and stays bot', async () => {
    const { conversation } = await setup({ level: 0 });
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    expect(await outbound()).toHaveLength(0);
    expect(await conv(conversation._id)).toMatchObject({ suggestion: 'שלום', status: 'bot' });
  });

  it('level 2 behaves as level 1', async () => {
    const { conversation } = await setup({ level: 2 });
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    expect((await outbound())[0]).toMatchObject({ author: 'ai', text: 'שלום' });
  });
});

describe('request', () => {
  it('a complete table request is written by the server and the guest gets the fixed sentence', async () => {
    const { conversation, clientId } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(COMPLETE));
    await turn(conversation);
    const requests = await db().collection('requests').find({}).toArray();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      channel: 'sim', status: 'qualified', clientId, kind: 'table', wanted: { date: DATE, time: '19:00', partySize: 4 },
    });
    expect(requests[0].statusHistory[0]).toMatchObject({ via: 'ai' });
    expect((await conv(conversation._id)).requestId).toBe(requests[0]._id);
    const out = await outbound();
    expect(out[0].text).toBe(fixedText('fd_ai_will_confirm'));
    expect(out[0].text).not.toContain('MODEL-REPLY');
  });

  it('plan 681: a malformed suggestion never fails the turn; the request is written without it', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ ...COMPLETE, suggested: { action: 'approve', text: 'x'.repeat(2500) } }));
    await turn(conversation);
    const requests = await db().collection('requests').find({}).toArray();
    expect(requests).toHaveLength(1);
    expect(requests[0].status).toBe('qualified');
    expect(requests[0].suggested).toBeUndefined();
    expect((await outbound())[0].text).toBe(fixedText('fd_ai_will_confirm'));
  });

  it('plan 681: a suggestion changes nothing the guest sees', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ ...COMPLETE, suggested: { action: 'decline', text: 'קבוצה גדולה' } }));
    await turn(conversation);
    const requests = await db().collection('requests').find({}).toArray();
    expect(requests[0]).toMatchObject({ status: 'qualified', suggested: { action: 'decline', text: 'קבוצה גדולה' } });
    expect((await outbound())[0].text).toBe(fixedText('fd_ai_will_confirm'));
  });

  it('a missing required answer writes nothing and sends the model reply', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ ...COMPLETE, collected: { date: DATE, time: '19:00' } }));
    await turn(conversation);
    expect(await db().collection('requests').countDocuments({})).toBe(0);
    expect((await outbound())[0].text).toBe('MODEL-REPLY');
  });

  it('plan 751: a date word of the model is resolved', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ ...COMPLETE, collected: { ...COMPLETE.collected, date: 'tomorrow' } }));
    await turn(conversation, { now: Date.parse('2030-01-07T10:00:00+02:00') });
    const requests = await db().collection('requests').find({}).toArray();
    expect(requests).toHaveLength(1);
    expect(requests[0].wanted.date).toBe('2030-01-08');
  });

  it('a date that cannot be resolved is dropped and counts as missing', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ ...COMPLETE, collected: { ...COMPLETE.collected, date: 'someday' } }));
    await turn(conversation);
    expect(await db().collection('requests').countDocuments({})).toBe(0);
  });

  it('a second complete answer in a conversation with a request writes no second request', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(COMPLETE));
    await turn(conversation);
    fetchMock.mockResolvedValue(modelAnswer(COMPLETE));
    await turn(await conv(conversation._id));
    expect(await db().collection('requests').countDocuments({})).toBe(1);
    expect((await conv(conversation._id)).status).toBe('human');
  });

  it('level 0 writes no request', async () => {
    const { conversation } = await setup({ level: 0 });
    fetchMock.mockResolvedValue(modelAnswer(COMPLETE));
    await turn(conversation);
    expect(await db().collection('requests').countDocuments({})).toBe(0);
  });
});

describe('R-10: a closed day', () => {
  it('writes no request and sends the rendered rule sentence with the open days', async () => {
    const hours = [{ days: 'x', time: 'y', dayIndexes: [3, 4], open: '09:00', close: '22:00' }];
    const { conversation } = await setup({ hours });
    fetchMock.mockResolvedValue(modelAnswer(COMPLETE));
    await turn(conversation);
    expect(await db().collection('requests').countDocuments({})).toBe(0);
    const out = await outbound();
    expect(out[0].text).toBe(fixedText('fd_reason_closed_day', { days: '3,4' }));
    expect(out[0].text).not.toContain('MODEL-REPLY');
  });
});

const HOLDING = () => fixedText('fd_ai_holding_default');
const holdingRows = async () => (await outbound()).filter(m => m.author === 'server');
const expectOneHolding = async (text = HOLDING()) => {
  const out = await outbound();
  expect(out).toHaveLength(1);
  expect(out[0]).toMatchObject({ author: 'server', text });
};

describe('R-04 as changed by plan 733', () => {
  const cases = {
    'a 500 answer': () => fetchMock.mockResolvedValue(jsonResponse(500, {})),
    'a timeout': () => fetchMock.mockRejectedValue(Object.assign(new Error('t'), { name: 'TimeoutError' })),
    'model_exhausted': () => fetchMock.mockResolvedValue(jsonResponse(429, {
      error: { details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel' }] }] },
    })),
    'business_cap': async () => {
      await db().collection('businesses').updateOne({ _id: 'b1' }, { $set: { aiMonthlyTokenCap: 0 } });
      fetchMock.mockResolvedValue(modelAnswer(SMALL));
    },
    'an answer that is not JSON': () => fetchMock.mockResolvedValue(modelAnswer('not json at all')),
    'an answer that fails the schema': () => fetchMock.mockResolvedValue(modelAnswer({ reply: 5, intent: 'nope' })),
  };
  const groups = {
    'a 500 answer': 'busy', 'a timeout': 'timeout', 'model_exhausted': 'quota', 'business_cap': 'quota',
    'an answer that is not JSON': 'other', 'an answer that fails the schema': 'other',
  };
  for (const [name, arrange] of Object.entries(cases)) {
    it(`${name}: one holding message, handed to a person, suggestion untouched`, async () => {
      const { conversation } = await setup({ level: 1 });
      await db().collection('conversations').updateOne({ _id: conversation._id }, { $set: { suggestion: 'KEEP' } });
      await arrange();
      await turn(conversation);
      await expectOneHolding();
      const after = await conv(conversation._id);
      expect(after).toMatchObject({ status: 'human', suggestion: 'KEEP', assistantFailed: { reason: groups[name] } });
      const holding = logs.byEvent('frontdesk.turn.holding');
      expect(holding).toHaveLength(1);
      expect(holding[0]).toMatchObject({ group: groups[name], sent: true });
      const text = JSON.stringify(logs.records);
      for (const secret of ['GUEST-SECRET-TEXT', HOLDING()]) expect(text).not.toContain(secret);
    });
  }
});

describe('plan 701: the reason a turn failed (staff only)', () => {
  const { conversationSchema } = require('../generated/schemas/entities');
  const { failureReason } = require('../services/frontdesk-turn');
  const failed = async arrange => {
    const { conversation } = await setup({ level: 1 });
    await arrange();
    await turn(conversation);
    expect(await holdingRows()).toHaveLength(1);
    return { conversation, after: await conv(conversation._id) };
  };

  it('failureReason maps kinds and statuses', () => {
    expect(failureReason('network')).toBe('busy');
    expect(failureReason('gemini_error', 503)).toBe('busy');
    expect(failureReason('gemini_error', 429)).toBe('busy');
    expect(failureReason('gemini_error', 400)).toBe('other');
    expect(failureReason('timeout')).toBe('timeout');
    for (const k of ['model_exhausted', 'all_exhausted', 'business_cap', 'cap']) expect(failureReason(k)).toBe('quota');
    for (const k of ['bad_json', 'bad_shape', 'model_removed']) expect(failureReason(k)).toBe('other');
  });

  it('503 on every model: human and assistantFailed busy, valid against the schema', async () => {
    const { after } = await failed(() => fetchMock.mockResolvedValue(jsonResponse(503, {})));
    expect(after.status).toBe('human');
    expect(after.assistantFailed).toMatchObject({ reason: 'busy' });
    expect(typeof after.assistantFailed.at).toBe('number');
    expect(conversationSchema.safeParse(after).success).toBe(true);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it('a timeout: reason timeout', async () => {
    const { after } = await failed(() => fetchMock.mockRejectedValue(Object.assign(new Error('t'), { name: 'TimeoutError' })));
    expect(after.assistantFailed.reason).toBe('timeout');
  });

  it('the daily turn cap: reason quota', async () => {
    const { conversation } = await setup({ level: 1 });
    await db().collection('aiUsage').insertMany(Array.from({ length: FRONTDESK_DAILY_TURNS }, (_, i) => ({
      businessId: 'b1', day: jerusalemDate(Date.now()), feature: 'frontdesk_turn', ok: true, at: Date.now(), i,
    })));
    await turn(conversation);
    expect((await conv(conversation._id)).assistantFailed.reason).toBe('quota');
  });

  it('a bad_json answer: reason other', async () => {
    const { after } = await failed(() => fetchMock.mockResolvedValue(modelAnswer('not json at all')));
    expect(after.assistantFailed.reason).toBe('other');
  });

  it('the next completed turn removes assistantFailed', async () => {
    const { conversation, after } = await failed(() => fetchMock.mockResolvedValue(jsonResponse(503, {})));
    expect(after.assistantFailed).toBeDefined();
    await db().collection('conversations').updateOne({ _id: conversation._id }, { $set: { status: 'bot' } });
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(await conv(conversation._id));
    const next = await conv(conversation._id);
    expect(next.assistantFailed).toBeUndefined();
    expect(conversationSchema.safeParse(next).success).toBe(true);
  });
});

describe('the daily cap', () => {
  const fill = (n, extra = {}) => db().collection('aiUsage').insertMany(Array.from({ length: n }, (_, i) => ({
    businessId: 'b1', day: jerusalemDate(Date.now()), feature: 'frontdesk_turn', ok: true, at: Date.now(), i, ...extra,
  })));

  it('at the limit: no call, one holding message (plan 733), human', async () => {
    const { conversation } = await setup();
    await fill(FRONTDESK_DAILY_TURNS);
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    expect(fetchMock).not.toHaveBeenCalled();
    await expectOneHolding();
    expect(logs.byEvent('frontdesk.turn.holding')[0]).toMatchObject({ group: 'quota', sent: true });
    expect((await conv(conversation._id)).status).toBe('human');
  });

  it('rows of the simulator do not count', async () => {
    const { conversation } = await setup();
    await fill(FRONTDESK_DAILY_TURNS, { userId: 'sim' });
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a test conversation is metered as sim and not stopped by the cap', async () => {
    const { conversation } = await setup({ test: true });
    await fill(FRONTDESK_DAILY_TURNS);
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const mine = (await ledger()).filter(r => r.userId === 'sim');
    expect(mine).toHaveLength(1);
  });
});

describe('not ours', () => {
  it('a human conversation makes no model call', async () => {
    const { conversation } = await setup({ status: 'human' });
    const result = await turn(await conv(conversation._id));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ skipped: 'not_bot' });
  });
});

describe('test data', () => {
  it('a request of a test conversation carries test: true and leaves the client counters alone', async () => {
    const { conversation, clientId } = await setup({ test: true });
    fetchMock.mockResolvedValue(modelAnswer(COMPLETE));
    await turn(conversation);
    const request = await db().collection('requests').findOne({});
    expect(request.test).toBe(true);
    const client = await db().collection('clients').findOne({ _id: clientId });
    expect(client.counters?.requests).toBeUndefined();
  });
});

describe('logs', () => {
  it('carry no guest text, name or phone', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(COMPLETE));
    await turn(conversation);
    const text = JSON.stringify(logs.records);
    expect(logs.byEvent('frontdesk.turn.done').length).toBe(1);
    for (const secret of ['GUEST-SECRET-TEXT', 'Guest', '972521234567', 'MODEL-REPLY']) expect(text).not.toContain(secret);
  });
});

describe('registration', () => {
  it('the turn is registered as the inbound handler when the module loads', () => {
    expect(typeof setTurnHandler).toBe('function');
    expect(typeof runTurn).toBe('function');
  });
});

describe('plan 689: guardrails in the turn', () => {
  const HANDOFF_TEXT = 'נעביר אותך לצוות';
  const guestSays = text => db().collection('messages').updateOne({ _id: 'g1' }, { $set: { text } });

  it('a complaint: no model call, handed to a person, the profile handoff sentence sent', async () => {
    const { conversation } = await setup({ assistant: { handoffText: HANDOFF_TEXT } });
    await guestSays('יש לי תלונה');
    await turn(conversation);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await conv(conversation._id)).status).toBe('human');
    const out = await outbound();
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe(HANDOFF_TEXT);
  });

  it('a deferred promise at level 1: not stored, the handoff sentence is, status human', async () => {
    const { conversation } = await setup({ assistant: { handoffText: HANDOFF_TEXT } });
    fetchMock.mockResolvedValue(modelAnswer({ reply: 'אבדוק ואחזור אליך', intent: 'smalltalk' }));
    await turn(conversation);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const texts = (await db().collection('messages').find({}).toArray()).map(m => m.text);
    expect(texts).not.toContain('אבדוק ואחזור אליך');
    expect(texts).toContain(HANDOFF_TEXT);
    expect((await conv(conversation._id)).status).toBe('human');
  });

  it('the same at level 0: the suggestion is the handoff sentence and the status stays bot', async () => {
    const { conversation } = await setup({ level: 0, assistant: { handoffText: HANDOFF_TEXT } });
    fetchMock.mockResolvedValue(modelAnswer({ reply: 'אבדוק ואחזור אליך', intent: 'smalltalk' }));
    await turn(conversation);
    expect(await conv(conversation._id)).toMatchObject({ suggestion: HANDOFF_TEXT, status: 'bot' });
    expect(await outbound()).toHaveLength(0);
  });

  it('a complete request answer is not checked: the model reply is not sent, the dictionary sentence is', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ ...COMPLETE, reply: 'ההזמנה אושרה' }));
    await turn(conversation);
    expect((await outbound())[0].text).toBe(fixedText('fd_ai_will_confirm'));
  });

  it('two empty turns in a row hand the conversation to a person', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ reply: 'לא הבנתי', intent: 'other' }));
    await turn(conversation);
    expect((await conv(conversation._id))).toMatchObject({ status: 'bot', lowTurns: 1 });
    await turn(await conv(conversation._id));
    expect((await conv(conversation._id)).status).toBe('human');
  });

  it('a useful turn clears lowTurns', async () => {
    const { conversation } = await setup();
    await db().collection('conversations').updateOne({ _id: conversation._id }, { $set: { lowTurns: 1 } });
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(await conv(conversation._id));
    expect((await conv(conversation._id)).lowTurns).toBeUndefined();
  });

  it('eight AI turns → handed to a person without a model call', async () => {
    const { conversation } = await setup();
    const rows = Array.from({ length: 8 }, (_v, i) => ({
      _id: 'ai' + i, businessId: 'b1', conversationId: conversation._id, direction: 'out', author: 'ai', kind: 'text',
      text: 'x', at: Date.now() - 1000 + i, status: 'sent', providerMessageId: 'ai-pm' + i,
    }));
    await db().collection('messages').insertMany(rows);
    await turn(conversation);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await conv(conversation._id)).status).toBe('human');
  });

  it('a blocked turn logs the reason only, no text', async () => {
    const { conversation } = await setup({ assistant: { handoffText: HANDOFF_TEXT } });
    fetchMock.mockResolvedValue(modelAnswer({ reply: 'אבדוק ואחזור אליך', intent: 'smalltalk' }));
    await turn(conversation);
    const blocked = logs.byEvent('frontdesk.turn.blocked');
    expect(blocked).toHaveLength(1);
    expect(blocked[0]).toMatchObject({ reason: 'deferred', stage: 'post', level: 1 });
    const text = JSON.stringify(logs.records);
    for (const secret of ['אבדוק', 'GUEST-SECRET-TEXT', HANDOFF_TEXT]) expect(text).not.toContain(secret);
  });
});

describe('plan 731: one more try on a malformed answer', () => {
  const { SHAPE_RETRY_LINE } = require('../services/frontdesk-prompt');
  const BAD = { reply: 'x', intent: 'weird' };
  const bodyOf = n => JSON.parse(fetchMock.mock.calls[n][1].body);

  it('a bad shape then a good answer: answered, two calls, the reminder ends the rules, paths logged', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValueOnce(modelAnswer(BAD)).mockResolvedValueOnce(modelAnswer(SMALL));
    await turn(conversation);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await outbound()).toHaveLength(1);
    const after = await conv(conversation._id);
    expect(after.status).toBe('bot');
    expect(after.assistantFailed).toBeUndefined();
    expect(bodyOf(1).systemInstruction.parts[0].text.endsWith(SHAPE_RETRY_LINE)).toBe(true);
    expect(bodyOf(1).contents).toEqual(bodyOf(0).contents);
    const bad = logs.byEvent('frontdesk.turn.bad_answer');
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatchObject({ reason: 'bad_shape', attempt: 1, paths: ['intent'] });
  });

  it('two bad shapes: two calls, handoff with one holding message (plan 733), privacy of the log', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ reply: 'MODEL-REPLY-TEXT', intent: 'weird' }));
    await turn(conversation);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expectOneHolding();
    const after = await conv(conversation._id);
    expect(after.status).toBe('human');
    expect(after.assistantFailed.reason).toBe('other');
    const failed = logs.byEvent('frontdesk.turn.failed');
    expect(failed).toHaveLength(1);
    expect(failed[0].reason).toBe('bad_shape');
    expect(logs.byEvent('frontdesk.turn.bad_answer').map(r => r.attempt)).toEqual([1, 2]);
    const text = JSON.stringify(logs.records);
    for (const secret of ['GUEST-SECRET-TEXT', 'MODEL-REPLY-TEXT', 'Invalid']) expect(text).not.toContain(secret);
  });

  it('a non-JSON answer then a good one: answered', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValueOnce(modelAnswer('not json at all')).mockResolvedValueOnce(modelAnswer(SMALL));
    await turn(conversation);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await outbound()).toHaveLength(1);
    expect(logs.byEvent('frontdesk.turn.bad_answer')[0]).toMatchObject({ reason: 'bad_json', attempt: 1, paths: [] });
  });

  it('less than 2000 ms of the budget left: no retry, the turn fails as before', async () => {
    const { conversation } = await setup();
    const realNow = Date.now.bind(Date);
    let jump = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => realNow() + jump);
    fetchMock.mockImplementation(async () => { jump = 34000; return modelAnswer(BAD); });
    try {
      await turn(conversation);
    } finally {
      vi.restoreAllMocks();
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expectOneHolding();
    expect(logs.byEvent('frontdesk.turn.failed')[0].reason).toBe('bad_shape');
  });

  it('a person request: no model call, the handoff sentence, status human, blocked by keyword', async () => {
    const { conversation } = await setup({ assistant: { handoffText: 'נעביר אותך לצוות' } });
    await db().collection('messages').updateOne({ _id: 'g1' }, { $set: { text: 'אפשר לדבר עם מישהו?' } });
    await turn(conversation);
    expect(fetchMock).not.toHaveBeenCalled();
    const out = await outbound();
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('נעביר אותך לצוות');
    expect((await conv(conversation._id)).status).toBe('human');
    const blocked = logs.byEvent('frontdesk.turn.blocked');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].reason).toBe('keyword');
  });
});

describe('plan 732: numbers and booleans in collected', () => {
  it('a numeric party_size is accepted, no bad_answer, the request keeps partySize 4', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ ...COMPLETE, collected: { party_size: 4, date: DATE, time: '19:00' } }));
    await turn(conversation);
    expect(logs.byEvent('frontdesk.turn.bad_answer')).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requests = await db().collection('requests').find({}).toArray();
    expect(requests).toHaveLength(1);
    expect(requests[0].wanted).toMatchObject({ date: DATE, time: '19:00', partySize: 4 });
  });

  it('the schema turns a number into "4" and a boolean into "true"; other values are refused', () => {
    const { turnAnswerSchema } = require('../generated/schemas/front-desk/turn-answer.schema');
    const parse = collected => turnAnswerSchema.safeParse({ reply: 'x', intent: 'request', collected });
    const ok = parse({ party_size: 4, flag: true });
    expect(ok.success).toBe(true);
    expect(ok.data.collected).toMatchObject({ party_size: '4', flag: 'true' });
    expect(parse({ a: { b: 1 } }).success).toBe(false);
    expect(parse({ a: [1] }).success).toBe(false);
    expect(parse({ a: null }).success).toBe(false);
    expect(parse({ a: 'x'.repeat(301) }).success).toBe(false);
  });

  it('an object under a collected key still fails the turn as bad_shape', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ ...COMPLETE, collected: { party_size: { n: 4 } } }));
    await turn(conversation);
    expect(logs.byEvent('frontdesk.turn.bad_answer')[0]).toMatchObject({ reason: 'bad_shape', paths: ['collected.party_size'] });
    await expectOneHolding();
  });
});

describe('plan 733: the simulator answers as level 1', () => {
  it('a test conversation at level 0 gets the model reply sent, no suggestion, still bot', async () => {
    const { conversation } = await setup({ level: 0, test: true });
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    const out = await outbound();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ author: 'ai', text: 'שלום' });
    const after = await conv(conversation._id);
    expect(after.suggestion).toBeUndefined();
    expect(after.status).toBe('bot');
  });

  it('a test conversation at level 0 with a full table request writes a test request and sends the sentence', async () => {
    const { conversation } = await setup({ level: 0, test: true });
    fetchMock.mockResolvedValue(modelAnswer(COMPLETE));
    await turn(conversation);
    const requests = await db().collection('requests').find({}).toArray();
    expect(requests).toHaveLength(1);
    expect(requests[0].test).toBe(true);
    const out = await outbound();
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe(fixedText('fd_ai_will_confirm'));
  });

  it('a real conversation at level 0 still only drafts', async () => {
    const { conversation } = await setup({ level: 0 });
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    expect(await outbound()).toHaveLength(0);
    expect(await conv(conversation._id)).toMatchObject({ suggestion: 'שלום', status: 'bot' });
  });

  it('a test conversation a member holds gets no answer', async () => {
    const { conversation } = await setup({ level: 0, test: true, status: 'human' });
    const result = await turn(await conv(conversation._id));
    expect(result).toEqual({ skipped: 'not_bot' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await outbound()).toHaveLength(0);
  });

  it('the stored profile is not changed', async () => {
    const { conversation } = await setup({ level: 0, test: true });
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    const profile = await db().collection('frontDeskProfiles').findOne({ businessId: 'b1' });
    expect(profile.assistant.level).toBe(0);
  });
});

describe('plan 733: one holding message on a technical failure', () => {
  const HANDOFF_TEXT = 'נעביר אותך לצוות';
  const fail503 = () => fetchMock.mockResolvedValue(jsonResponse(503, {}));

  it('the business handoff text is the holding message when set', async () => {
    const { conversation } = await setup({ assistant: { handoffText: HANDOFF_TEXT } });
    fail503();
    await turn(conversation);
    await expectOneHolding(HANDOFF_TEXT);
  });

  it('the daily cap sends one holding message', async () => {
    const { conversation } = await setup();
    await db().collection('aiUsage').insertMany(Array.from({ length: FRONTDESK_DAILY_TURNS }, (_, i) => ({
      businessId: 'b1', day: jerusalemDate(Date.now()), feature: 'frontdesk_turn', ok: true, at: Date.now(), i,
    })));
    await turn(conversation);
    await expectOneHolding();
    expect((await conv(conversation._id)).assistantFailed.reason).toBe('quota');
  });

  it('a test conversation at level 0 with a 503 answer gets the holding message', async () => {
    const { conversation } = await setup({ level: 0, test: true });
    fail503();
    await turn(conversation);
    await expectOneHolding();
    expect(await conv(conversation._id)).toMatchObject({ status: 'human', assistantFailed: { reason: 'busy' } });
  });

  it('no spam: one holding message until the guest writes again', async () => {
    const { conversation } = await setup();
    fail503();
    await turn(conversation);
    await db().collection('conversations').updateOne({ _id: conversation._id }, { $set: { status: 'bot' } });
    await turn(await conv(conversation._id));
    expect(await holdingRows()).toHaveLength(1);
    await db().collection('messages').insertOne({
      _id: 'g2', businessId: 'b1', conversationId: conversation._id, direction: 'in', author: 'guest', kind: 'text',
      text: 'GUEST-SECRET-TEXT', at: Date.now() + 1000, providerMessageId: 'pm2', status: 'delivered',
    });
    await db().collection('conversations').updateOne({ _id: conversation._id }, { $set: { status: 'bot' } });
    await turn(await conv(conversation._id));
    expect(await holdingRows()).toHaveLength(2);
  });

  it('no spam when the holding message has the same millisecond as the guest message', async () => {
    const { conversation } = await setup();
    const T = Date.now();
    await db().collection('messages').updateMany({ conversationId: conversation._id }, { $set: { at: T } });
    fail503();
    await turn(conversation, { now: T });
    await db().collection('conversations').updateOne({ _id: conversation._id }, { $set: { status: 'bot' } });
    await turn(await conv(conversation._id), { now: T });
    expect(await holdingRows()).toHaveLength(1);
  });

  it('a real conversation at level 0 with a 503 answer: nothing sent, human, busy', async () => {
    const { conversation } = await setup({ level: 0 });
    fail503();
    await turn(conversation);
    expect(await outbound()).toHaveLength(0);
    expect(await conv(conversation._id)).toMatchObject({ status: 'human', assistantFailed: { reason: 'busy' } });
    expect(logs.byEvent('frontdesk.turn.holding')).toHaveLength(0);
  });

  it('suggest mode with a 503 answer: nothing sent, status unchanged', async () => {
    const { conversation } = await setup();
    fail503();
    await turn(conversation, { mode: 'suggest' });
    expect(await outbound()).toHaveLength(0);
    expect((await conv(conversation._id)).status).toBe('bot');
  });

  it('a guardrail block still sends the handoff sentence by the assistant, no holding row', async () => {
    const { conversation } = await setup({ assistant: { handoffText: HANDOFF_TEXT } });
    await db().collection('messages').updateOne({ _id: 'g1' }, { $set: { text: 'יש לי תלונה' } });
    await turn(conversation);
    const out = await outbound();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ author: 'ai', text: HANDOFF_TEXT });
    expect(logs.byEvent('frontdesk.turn.holding')).toHaveLength(0);
  });
});

describe('plan 754: speed', () => {
  const { FIRST_MODEL_LIMIT_MS, TURN_BUDGET_MS } = require('../routes/ai/frontdesk');
  const { DEFAULT_MODELS } = require('../services/gemini-client');
  const { setChannelForTest, resetChannelsForTest } = require('../services/channels');
  const { HANDOFF } = require('../constants/frontdesk-guard-words');
  const [M0, M1] = DEFAULT_MODELS;
  const LOGGER_KEYS = ['level', 'time', 'service'];
  const timeoutError = () => Object.assign(new Error('t'), { name: 'TimeoutError' });

  beforeEach(async () => { await db().collection('assistantRuns').deleteMany({}); });
  afterEach(() => {
    resetChannelsForTest();
    vi.restoreAllMocks();
    const text = JSON.stringify(logs.records);
    for (const secret of ['GUEST-SECRET-TEXT', 'שלום']) expect(text).not.toContain(secret);
  });

  const oneRun = async () => {
    const all = await db().collection('assistantRuns').find({}).toArray();
    expect(all).toHaveLength(1);
    return all[0];
  };
  const stepOf = (run, key) => run.steps.find(s => s.key === key);
  /** The time limits of the model calls; other code may ask for its own. */
  const spyLimits = () => {
    const limits = [];
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => { limits.push(ms); return new AbortController().signal; });
    return () => limits.filter(ms => ms === 6000 || ms === 15000);
  };

  it('the first model is slow: cut after 6 s, the next one answers, both calls are recorded', async () => {
    const { conversation } = await setup();
    fetchMock.mockRejectedValueOnce(timeoutError()).mockResolvedValue(modelAnswer(SMALL));
    const limits = spyLimits();
    expect(await turn(conversation)).toEqual({ ok: true, sent: true });
    const out = await outbound();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ author: 'ai', text: 'שלום' });
    expect(limits()).toEqual([6000, 15000]);
    const run = await oneRun();
    expect(run).toMatchObject({ outcome: 'answered', fallbackUsed: true, model: M1 });
    expect(stepOf(run, 'ai').status).toBe('note');
    expect(stepOf(run, 'ai').out.attempts).toMatchObject([
      { model: M0, ok: false, reason: 'slow', limitMs: 6000, try: 1 }, { model: M1, ok: true, try: 1 },
    ]);
  });

  it('the first model is fast: one call, one attempt', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const ai = stepOf(await oneRun(), 'ai');
    expect(ai.status).toBe('ok');
    expect(ai.out.attempts).toHaveLength(1);
    expect(ai.out.attempts[0].ok).toBe(true);
  });

  it('every model is slow: failed as a timeout, one holding message, never a small bucket', async () => {
    const { conversation } = await setup();
    fetchMock.mockRejectedValue(timeoutError());
    expect(await turn(conversation)).toEqual({ ok: false, reason: 'timeout', group: 'timeout' });
    const out = await outbound();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ author: 'server', text: fixedText('fd_ai_holding_default') });
    expect((await conv(conversation._id)).status).toBe('human');
    const run = await oneRun();
    expect(run).toMatchObject({ outcome: 'failed', reason: 'timeout' });
    const { attempts } = stepOf(run, 'ai').out;
    expect(attempts.map(a => a.model)).toEqual([M0, M1, M0, M1]);
    expect(attempts.map(a => a.reason)).toEqual(['slow', 'timeout', 'timeout', 'timeout']);
  });

  it('a refusal that made no HTTP call is still one attempt', async () => {
    const { conversation } = await setup();
    const { askTurnModel } = require('../routes/ai/frontdesk');
    fetchMock.mockResolvedValue(jsonResponse(429, {
      error: { details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] },
    }));
    const args = {
      body: { contents: [] }, usage: { businessId: conversation.businessId, feature: 'frontdesk_turn' },
      log: require('../logger').logger,
    };
    await askTurnModel(args);
    await askTurnModel(args);
    fetchMock.mockClear();
    const asked = await askTurnModel(args);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(asked).toMatchObject({ ok: false, reason: 'all_exhausted' });
    expect(asked.trace.attempts).toMatchObject([{ ok: false, reason: 'all_exhausted', try: 1 }]);
  });

  it('the limit fits the budget', () => {
    expect(FIRST_MODEL_LIMIT_MS).toBe(6000);
    expect(FIRST_MODEL_LIMIT_MS + 15000 + 2000).toBeLessThanOrEqual(TURN_BUDGET_MS);
    expect(TURN_BUDGET_MS).toBe(35000);
  });

  describe('typing', () => {
    const spyTyping = (typing = vi.fn(async () => {})) => {
      setChannelForTest('sim', {
        name: 'sim', real: false, clientSource: 'manual',
        send: async () => ({ providerMessageId: 'sim:t', status: 'delivered' }), typing,
      });
      return typing;
    };
    const settle = () => new Promise(resolve => setTimeout(resolve, 20));

    it('a level-1 turn asks for the sign once, for the newest guest message', async () => {
      const typing = spyTyping();
      const { conversation } = await setup();
      fetchMock.mockResolvedValue(modelAnswer(SMALL));
      await turn(conversation);
      await vi.waitFor(() => expect(typing).toHaveBeenCalledTimes(1));
      expect(typing.mock.calls[0][2]).toEqual({ providerMessageId: 'pm1' });
    });

    it.each([
      ['a conversation a person holds', { status: 'human' }, {}],
      ['suggest mode', {}, { mode: 'suggest' }],
      ['a real guest at level 0', { level: 0 }, {}],
    ])('not for %s', async (_name, seed, options) => {
      const typing = spyTyping();
      const { conversation } = await setup(seed);
      fetchMock.mockResolvedValue(modelAnswer(SMALL));
      await turn(conversation, options);
      await settle();
      expect(typing).not.toHaveBeenCalled();
    });

    it('not for a turn the pre-check stops', async () => {
      const typing = spyTyping();
      const { conversation } = await setup();
      await db().collection('messages').updateOne({ _id: 'g1' }, { $set: { text: HANDOFF[0] } });
      await turn(conversation);
      await settle();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(typing).not.toHaveBeenCalled();
    });

    it('a sign that fails changes nothing: one warning with ids only', async () => {
      const typing = spyTyping(vi.fn(async () => { throw new Error('no'); }));
      const { conversation } = await setup();
      fetchMock.mockResolvedValue(modelAnswer(SMALL));
      expect(await turn(conversation)).toEqual({ ok: true, sent: true });
      await vi.waitFor(() => expect(logs.byEvent('outbound.typing.failed')).toHaveLength(1));
      expect(typing).toHaveBeenCalledTimes(1);
      const [record] = logs.byEvent('outbound.typing.failed');
      expect(Object.keys(record).filter(key => !LOGGER_KEYS.includes(key)).sort())
        .toEqual(['conversationId', 'errName', 'event']);
    });
  });

  describe('the timings in the record', () => {
    it('the wait numbers on the first step and the time to answer on the send step', async () => {
      const { conversation } = await setup();
      fetchMock.mockResolvedValue(modelAnswer(SMALL));
      await turn(conversation, {
        inbound: { at: 5, waitedMs: 2000, quietMs: 2000, capped: false, arrivedAt: Date.now() - 3000 },
      });
      const run = await oneRun();
      expect(stepOf(run, 'inbound').out).toEqual({ waitedMs: 2000, answers: 1, quietMs: 2000, capped: false });
      const { answerMs } = stepOf(run, 'send').out;
      expect(answerMs).toBeGreaterThanOrEqual(3000);
      expect(answerMs).toBeLessThan(60000);
    });

    it('a run that was not told them has neither', async () => {
      const { conversation } = await setup();
      fetchMock.mockResolvedValue(modelAnswer(SMALL));
      await turn(conversation, { inbound: { at: 5, waitedMs: 6000 } });
      const run = await oneRun();
      expect(stepOf(run, 'inbound').out).toEqual({ waitedMs: 6000, answers: 1 });
      expect(stepOf(run, 'send').out.answerMs).toBeUndefined();
    });
  });
});

describe('plan 752: every turn leaves a run record', () => {
  const { RUN_STEP_KEYS } = require('../generated/schemas/entities');
  const { DEFAULT_MODELS } = require('../services/gemini-client');
  const { _setInsertForTests } = require('../services/frontdesk-runs');
  const { HANDOFF, REMOVAL_WORDS } = require('../constants/frontdesk-guard-words');
  const RECORDED_KEYS = ['event', 'runId', 'conversationId', 'outcome', 'reason', 'ms', 'fallbackUsed'];
  const LOGGER_KEYS = ['level', 'time', 'service'];

  beforeEach(async () => { await db().collection('assistantRuns').deleteMany({}); });
  // Every case of this block: no log line carries run content, and the recorder's own line holds ids and enums only.
  afterEach(() => {
    _setInsertForTests(null);
    const text = JSON.stringify(logs.records);
    for (const secret of ['GUEST-SECRET-TEXT', 'שלום', 'evil.example']) expect(text).not.toContain(secret);
    for (const record of logs.byEvent('frontdesk.run.recorded')) {
      const expected = RECORDED_KEYS.filter(key => key !== 'reason' || record.reason !== undefined);
      expect(Object.keys(record).filter(key => !LOGGER_KEYS.includes(key)).sort()).toEqual(expected.sort());
    }
  });

  const runs = () => db().collection('assistantRuns').find({}).toArray();
  const oneRun = async () => {
    const all = await runs();
    expect(all).toHaveLength(1);
    return all[0];
  };
  const stepOf = (run, key) => run.steps.find(s => s.key === key);
  const statusOf = (run, ...keys) => keys.map(key => stepOf(run, key).status);
  const guestSays = text => db().collection('messages').updateOne({ _id: 'g1' }, { $set: { text } });

  it('an answered turn: one record with the 13 steps', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    const run = await oneRun();
    expect(run).toMatchObject({
      businessId: 'b1', conversationId: conversation._id, mode: 'turn', level: 1, outcome: 'answered',
      fallbackUsed: false, model: DEFAULT_MODELS[0], intent: 'smalltalk',
    });
    expect(run.trigger).toEqual({ messageIds: ['g1'], text: 'GUEST-SECRET-TEXT' });
    expect(run.prompt).toBeUndefined();
    expect(run.expiresAt).toBeInstanceOf(Date);
    expect(run.expiresAt.getTime() - run.startedAt).toBe(30 * 86400000);
    expect(run.steps.map(s => s.key)).toEqual([...RUN_STEP_KEYS]);
    for (const step of run.steps) {
      expect(step.status, step.key).toBe(['inbound', 'tables'].includes(step.key) ? 'skipped' : 'ok');
    }
    expect(stepOf(run, 'ai').out.raw).toContain('שלום');
    const [sent] = await outbound();
    expect(stepOf(run, 'send').out).toEqual({ action: 'sent', author: 'ai', messageId: sent._id, chars: 4 });
    expect(stepOf(run, 'setup').out).toMatchObject({ level: 1, storedLevel: 1, simulated: false, tone: 'warm', kinds: ['table'] });
    expect(stepOf(run, 'limit')).toMatchObject({ in: { limit: FRONTDESK_DAILY_TURNS }, out: { used: 0 } });
    expect(stepOf(run, 'history').out).toEqual({ messages: 1, messageIds: ['g1'], aiTurns: 0 });
    expect(stepOf(run, 'tables').out).toEqual({ why: 'tables_off' });
    expect(stepOf(run, 'decide').out).toEqual({ why: 'reply', requestWritten: false });
  });

  it('blocked by a guardrail: handover with the stopped step, the raw answer and the data block', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ reply: 'ראו https://evil.example/x', intent: 'question' }));
    await turn(conversation);
    const run = await oneRun();
    expect(run).toMatchObject({ outcome: 'handover', reason: 'invented_link' });
    expect(stepOf(run, 'guardrails')).toMatchObject({ status: 'stopped', out: { reason: 'invented_link' } });
    expect(statusOf(run, 'tables', 'decide')).toEqual(['skipped', 'skipped']);
    expect(stepOf(run, 'ai').out.raw).toContain('evil.example');
    expect(run.prompt.lead).toContain('=== FACTS (data) ===');
    expect(stepOf(run, 'send').out.action).toBe('sent');
  });

  it("the model's own handoff flag: handover with the reason model", async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ ...SMALL, handoff: true }));
    await turn(conversation);
    const run = await oneRun();
    expect(run).toMatchObject({ outcome: 'handover', reason: 'model' });
    expect(stepOf(run, 'guardrails').status).toBe('stopped');
  });

  it('a 503 answer on every call: failed, busy, the AI step stopped and a holding message', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(jsonResponse(503, {}));
    await turn(conversation);
    const run = await oneRun();
    expect(run).toMatchObject({ outcome: 'failed', reason: 'busy' });
    const ai = stepOf(run, 'ai');
    expect(ai.status).toBe('stopped');
    expect(ai.out.attempts.length).toBeGreaterThan(0);
    expect(ai.out.attempts.every(a => a.ok === false)).toBe(true);
    expect(stepOf(run, 'shape').status).toBe('skipped');
    expect(stepOf(run, 'send').out.action).toBe('holding');
  });

  it('an answer that is not JSON on every call: failed, other, the shape step stopped', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer('not json at all'));
    await turn(conversation);
    const run = await oneRun();
    expect(run).toMatchObject({ outcome: 'failed', reason: 'other' });
    expect(stepOf(run, 'ai').status).toBe('ok');
    expect(stepOf(run, 'ai').out.raw).toBe('not json at all');
    expect(stepOf(run, 'shape').status).toBe('stopped');
    expect(stepOf(run, 'shape').out).toEqual({ tries: 2, ok: false, issue: 'bad_json' });
  });

  it('a good answer on the second try: the AI and shape steps are notes', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValueOnce(modelAnswer('not json at all')).mockResolvedValueOnce(modelAnswer(SMALL));
    await turn(conversation);
    const run = await oneRun();
    expect(run.outcome).toBe('answered');
    expect(statusOf(run, 'ai', 'shape')).toEqual(['note', 'note']);
    expect(stepOf(run, 'ai').out.attempts).toHaveLength(2);
  });

  it('a pre-check keyword: no model call, the later steps skipped, no model', async () => {
    const { conversation } = await setup();
    await guestSays(HANDOFF[0]);
    await turn(conversation);
    expect(fetchMock).not.toHaveBeenCalled();
    const run = await oneRun();
    expect(run).toMatchObject({ outcome: 'handover', reason: 'keyword' });
    expect(stepOf(run, 'precheck')).toMatchObject({ status: 'stopped', out: { ok: false, reason: 'keyword' } });
    for (const key of ['facts', 'prompt', 'ai', 'shape', 'guardrails', 'tables', 'decide']) {
      expect(stepOf(run, key).status, key).toBe('skipped');
    }
    expect(run.model).toBeUndefined();
  });

  it('level 0 drafts; a suggestion skips the limit and the pre-check', async () => {
    const { conversation } = await setup({ level: 0 });
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    const draft = await oneRun();
    expect(draft).toMatchObject({ level: 0, outcome: 'draft' });
    expect(stepOf(draft, 'send')).toMatchObject({ status: 'note', out: { action: 'draft', chars: 4 } });

    await db().collection('assistantRuns').deleteMany({});
    await db().collection('frontDeskProfiles').updateOne({ businessId: 'b1' }, { $set: { 'assistant.level': 1 } });
    await turn(await conv(conversation._id), { mode: 'suggest' });
    const suggestion = await oneRun();
    expect(suggestion).toMatchObject({ mode: 'suggest', level: 1, outcome: 'draft' });
    expect(statusOf(suggestion, 'limit', 'precheck')).toEqual(['skipped', 'skipped']);
    expect(stepOf(suggestion, 'inbound').out).toEqual({ via: 'suggest' });
  });

  it('the daily cap: failed, quota, the limit step stopped', async () => {
    const { conversation } = await setup();
    await db().collection('aiUsage').insertMany(Array.from({ length: FRONTDESK_DAILY_TURNS }, (_, i) => ({
      businessId: 'b1', day: jerusalemDate(Date.now()), feature: 'frontdesk_turn', ok: true, at: Date.now(), i,
    })));
    await turn(conversation);
    const run = await oneRun();
    expect(run).toMatchObject({ outcome: 'failed', reason: 'quota', trigger: { messageIds: [], text: '' } });
    expect(stepOf(run, 'limit')).toMatchObject({ status: 'stopped', out: { used: 300 } });
    expect(stepOf(run, 'send').out.action).toBe('holding');
  });

  it('a removal word: removed, with the removal notice', async () => {
    const { conversation } = await setup();
    await guestSays(REMOVAL_WORDS[0]);
    await turn(conversation);
    const run = await oneRun();
    expect(run).toMatchObject({ outcome: 'removed', reason: 'removal' });
    expect(stepOf(run, 'send').out.action).toBe('removal_notice');
  });

  it('the measured wait is the first step; two unanswered messages make it a note', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation, { inbound: { at: 5, waitedMs: 6000 } });
    const first = await oneRun();
    expect(stepOf(first, 'inbound')).toMatchObject({ status: 'ok', ms: 6000, out: { waitedMs: 6000, answers: 1 } });

    await db().collection('assistantRuns').deleteMany({});
    await db().collection('messages').deleteMany({ direction: 'out' });
    await db().collection('messages').insertOne({
      _id: 'g2', businessId: 'b1', conversationId: conversation._id, direction: 'in', author: 'guest', kind: 'text',
      text: 'GUEST-SECRET-TEXT', at: Date.now() + 1000, providerMessageId: 'pm2', status: 'delivered',
    });
    await turn(await conv(conversation._id), { inbound: { at: 5, waitedMs: 6000 } });
    const both = await oneRun();
    expect(stepOf(both, 'inbound')).toMatchObject({ status: 'note', out: { answers: 2 } });
    expect(both.trigger.messageIds).toEqual(['g1', 'g2']);
  });

  it('nothing is recorded for a held conversation, a business with no profile or the eval', async () => {
    const { conversation } = await setup({ status: 'human' });
    expect(await turn(await conv(conversation._id))).toEqual({ skipped: 'not_bot' });
    await db().collection('conversations').updateOne({ _id: conversation._id }, { $set: { status: 'bot' } });
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(await conv(conversation._id), { feature: 'eval' });
    await db().collection('frontDeskProfiles').deleteMany({});
    expect(await turn(await conv(conversation._id))).toEqual({ skipped: 'no_profile' });
    expect(await runs()).toHaveLength(0);
  });

  it('a failed write of the record never fails the turn', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    _setInsertForTests(async () => { throw new Error('down'); });
    expect(await turn(conversation)).toEqual({ ok: true, sent: true });
    expect(await outbound()).toHaveLength(1);
    expect(await runs()).toHaveLength(0);
    const failed = logs.byEvent('frontdesk.run.record_failed');
    expect(failed).toHaveLength(1);
    expect(failed[0].reason).toBe('db');
  });

  it('a turn that throws is stored as failed, error, and still throws', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    const silent = () => {};
    const log = { info: () => { throw new Error('boom'); }, warn: silent, error: silent, debug: silent };
    await expect(turn(conversation, { log })).rejects.toThrow('boom');
    expect(await oneRun()).toMatchObject({ outcome: 'failed', reason: 'error' });
  });
});

describe('plan 755: the facts are picked', () => {
  const LOGGER_KEYS = ['level', 'time', 'service'];
  const PARKING = 'יש לכם חניה?';
  const nn = i => String(i).padStart(2, '0');
  const item = (i, topic, question, answer) => ({
    _id: 'k' + nn(i), businessId: 'b1', createdAt: i, topic, question, answer, status: 'approved', visibility: 'public',
  });
  const BIG = [
    ...Array.from({ length: 38 }, (_, i) => item(i + 1, 'faq', 'שאלה כללית ' + nn(i + 1), 'א'.repeat(300))),
    item(39, 'other', 'יש חניה ליד המסעדה?', 'יש חניון ציבורי במרחק 100 מטר, פתוח עד 23:30. ' + 'ג'.repeat(300)),
    item(40, 'other', 'אפשר להביא כלב?', 'ב'.repeat(300)),
  ];

  const askWith = async (options = {}) => {
    const made = await setup(options);
    await db().collection('knowledgeItems').insertMany(BIG);
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    return made;
  };
  const factsText = () => JSON.parse(fetchMock.mock.calls[0][1].body).contents[0].parts[0].text;
  const factsStep = async () => {
    const all = await db().collection('assistantRuns').find({}).toArray();
    expect(all).toHaveLength(1);
    return all[0].steps.find(s => s.key === 'facts');
  };
  const ownKeys = record => Object.keys(record).filter(key => !LOGGER_KEYS.includes(key)).sort();

  // Every case: one numbers-only line per turn, and no log line carries a fact's or the guest's words.
  afterEach(() => {
    const records = logs.byEvent('frontdesk.turn.facts');
    expect(records).toHaveLength(1);
    expect(ownKeys(records[0])).toEqual(['chars', 'conversationId', 'core', 'event', 'leftOut', 'pick', 'sent']);
    const dump = JSON.stringify(logs.records);
    for (const secret of ['חניה', 'שאלה כללית', 'GUEST-SECRET-TEXT']) expect(dump).not.toContain(secret);
  });
  const noCoreOver = () => expect(logs.byEvent('frontdesk.turn.facts_core_over')).toHaveLength(0);

  it('the item the guest asks about is sent, and the record names what was left out', async () => {
    const { conversation } = await askWith({ text: PARKING });
    await turn(conversation);
    const sent = factsText();
    expect(sent).toContain('[k39]');
    expect(sent).toContain('[profile.hours]');
    expect(sent).not.toContain('[k40]');
    expect(sent).not.toContain('[k38]');
    const step = await factsStep();
    expect(step.status).toBe('note');
    expect(step.out).toMatchObject({ pick: 'matched', core: 1, sent: 17, leftOut: 23, matchedLeftOut: 0, queryTokens: 1 });
    expect(step.out.factIds).toHaveLength(18);
    expect(step.out.leftOutIds).toHaveLength(23);
    expect(step.out.leftOutIds[0]).toBe('k17');
    expect(step.out.leftOutIds).toContain('k40');
    expect(step.out.leftOutTitles).toHaveLength(12);
    expect(step.out.leftOutTitles[0]).toBe('שאלה כללית 17');
    noCoreOver();
  });

  it('a question nothing matches gets the fixed order', async () => {
    const { conversation } = await askWith();
    await turn(conversation);
    expect(factsText()).toContain('[k17]');
    expect(factsText()).not.toContain('[k39]');
    const step = await factsStep();
    expect(step.out.pick).toBe('general');
    expect(step.out.leftOutIds).toContain('k39');
    noCoreOver();
  });

  it('a follow-up question is picked by the messages before it', async () => {
    const { conversation } = await askWith({ text: PARKING });
    const now = Date.now();
    const messages = db().collection('messages');
    const base = { businessId: 'b1', conversationId: conversation._id, kind: 'text', status: 'delivered' };
    await messages.updateOne({ _id: 'g1' }, { $set: { at: now - 2000 } });
    await messages.insertMany([
      { ...base, _id: 'o1', direction: 'out', author: 'ai', text: 'יש חניון ציבורי במרחק 100 מטר', at: now - 1000 },
      { ...base, _id: 'g2', direction: 'in', author: 'guest', text: 'וכמה זה עולה?', at: now, providerMessageId: 'pm2' },
    ]);
    await turn(conversation);
    expect(factsText()).toContain('[k39]');
    noCoreOver();
  });

  it("a member's suggestion picks the same way", async () => {
    const { conversation } = await askWith({ text: PARKING });
    await turn(conversation, { mode: 'suggest' });
    expect(factsText()).toContain('[k39]');
    noCoreOver();
  });

  it('knowledge that fits is recorded with no list of what was left out', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    const step = await factsStep();
    expect(step.status).toBe('ok');
    expect(step.out).toMatchObject({ pick: 'all', core: 1, sent: 0, leftOut: 0 });
    expect(step.out).not.toHaveProperty('leftOutIds');
    expect(step.out).not.toHaveProperty('leftOutTitles');
    noCoreOver();
  });

  it('profile lines longer than the budget are warned about and the turn still answers', async () => {
    const { conversation } = await askWith({ hours: [{ ...ALL_DAYS[0], time: 'x'.repeat(6100) }] });
    await turn(conversation);
    expect(await outbound()).toHaveLength(1);
    const warned = logs.byEvent('frontdesk.turn.facts_core_over');
    expect(warned).toHaveLength(1);
    expect(warned[0]).toMatchObject({ level: 40, budget: 6000 });
    expect(ownKeys(warned[0])).toEqual(['budget', 'conversationId', 'coreChars', 'event']);
    expect((await factsStep()).out.sent).toBe(0);
  });
});
