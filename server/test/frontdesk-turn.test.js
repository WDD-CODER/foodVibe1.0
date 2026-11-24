'use strict';
/**
 * Plan 679 (C-AI): the assistant's turn with the model faked by a stubbed fetch. No key, no network.
 * Covers levels 0/1/2, the request, a closed day (R-10), every silent failure (R-04), the cap, test data and logs.
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

async function setup({ level = 1, test, status, hours = ALL_DAYS, assistant = {} } = {}) {
  await seedBusiness(db());
  await db().collection('frontDeskProfiles').updateOne({ businessId: 'b1' }, {
    $set: { assistant: { level, tone: 'warm', ...assistant }, requestKinds: { table: TABLE }, hours, slug: 'one-one' },
  });
  const { conversation, clientId } = await seedConversation(db(), { at: Date.now(), test });
  if (status) await db().collection('conversations').updateOne({ _id: conversation._id }, { $set: { status } });
  await db().collection('messages').insertOne({
    _id: 'g1', businessId: 'b1', conversationId: conversation._id, direction: 'in', author: 'guest', kind: 'text',
    text: 'GUEST-SECRET-TEXT', at: Date.now(), providerMessageId: 'pm1', status: 'delivered',
  });
  return { conversation: await db().collection('conversations').findOne({ _id: conversation._id }), clientId };
}
const turn = (conversation, opts = {}) => runTurn(db(), conversation, { log: require('../logger').logger, ...opts });
const conv = id => db().collection('conversations').findOne({ _id: id });
const outbound = () => db().collection('messages').find({ direction: 'out' }).toArray();
const ledger = async () => { await _waitForUsageWritesForTests(); return db().collection('aiUsage').find({}).toArray(); };

beforeEach(async () => {
  resetForTests(); clearCapCache(); resetInboundForTest();
  for (const c of ['messages', 'conversations', 'clients', 'aiUsage', 'GEMINI_USAGE', 'requests', 'businesses', 'frontDeskProfiles', 'knowledgeItems']) {
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

  it('a date that is not YYYY-MM-DD is dropped and counts as missing', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValue(modelAnswer({ ...COMPLETE, collected: { ...COMPLETE.collected, date: 'tomorrow' } }));
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

describe('R-04: a failure is silent', () => {
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
  for (const [name, arrange] of Object.entries(cases)) {
    it(`${name}: nothing sent, handed to a person, suggestion untouched`, async () => {
      const { conversation } = await setup({ level: 1 });
      await db().collection('conversations').updateOne({ _id: conversation._id }, { $set: { suggestion: 'KEEP' } });
      await arrange();
      await turn(conversation);
      expect(await outbound()).toHaveLength(0);
      expect(await conv(conversation._id)).toMatchObject({ status: 'human', suggestion: 'KEEP' });
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
    expect(await outbound()).toHaveLength(0);
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

  it('at the limit: no call, nothing sent, human', async () => {
    const { conversation } = await setup();
    await fill(FRONTDESK_DAILY_TURNS);
    fetchMock.mockResolvedValue(modelAnswer(SMALL));
    await turn(conversation);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await outbound()).toHaveLength(0);
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
