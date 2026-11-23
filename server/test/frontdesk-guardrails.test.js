'use strict';
/**
 * Plan 689 (C-AI): the assistant's guardrails. The pure checks (`preCheck`, `applyGuardrails`) and the removal request
 * through `runTurn` with the model faked by a stubbed fetch (no key, no network).
 */
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');
const { seedBusiness, seedConversation } = require('./helpers/conversation-fixtures');
const { resetForTests } = require('../services/gemini-client');
const { clearCapCache } = require('../services/ai-cap');
const { fixedText } = require('../utils/fixed-text');
const { resetInboundForTest } = require('../services/inbound');
const { sendOut } = require('../services/outbound');
const { runTurn } = require('../services/frontdesk-turn');
const { applyGuardrails, preCheck } = require('../services/frontdesk-guardrails');

process.env.GEMINI_API_KEY = 'test-key';

const guest = text => ({ author: 'guest', direction: 'in', text });
const FACTS = '[f1] מנה עיקרית 120 ש״ח\n[f2] תפריט: https://example.com/menu\n[f3] הזמנה אושרה אצלנו תמיד';
const ctx = (over = {}) => ({
  profile: { assistant: { level: 1 } }, factIds: ['f1', 'f2', 'f3'], factsText: FACTS,
  history: [guest('מה יש לכם?')], aiTurns: 0, now: Date.parse('2030-01-07T10:00:00Z'), mode: 'turn', ...over,
});
const answer = (reply, over = {}) => ({ reply, intent: 'smalltalk', ...over });
const reasonOf = (reply, over, c) => applyGuardrails(answer(reply, over), ctx(c)).reason;

describe('preCheck', () => {
  it.each(['יש לי תלונה', 'רוצה החזר כספי', 'יש חשש הרעלה', 'אלרגיה חמורה לבוטנים'])('"%s" → keyword', text => {
    expect(preCheck(ctx({ history: [guest(text)] }))).toEqual({ ok: false, reason: 'keyword' });
  });
  it('a plain question passes', () => {
    expect(preCheck(ctx({ history: [guest('יש לכם מנות ללא גלוטן?')] }))).toEqual({ ok: true });
  });
  it('active hours: 20:00 Jerusalem blocks, 10:00 passes, none passes always', () => {
    const rows = [{ days: 'x', time: 'y', dayIndexes: [0, 1, 2, 3, 4, 5, 6], open: '09:00', close: '17:00' }];
    const profile = { assistant: { level: 1, activeHours: rows } };
    const at = (date, hh) => Date.parse(`${date}T${hh}:00:00+02:00`);
    expect(preCheck(ctx({ profile, now: at('2030-01-07', '20') }))).toEqual({ ok: false, reason: 'outside_hours' });
    expect(preCheck(ctx({ profile, now: at('2030-01-07', '10') }))).toEqual({ ok: true });
    expect(preCheck(ctx({ now: at('2030-01-07', '03') }))).toEqual({ ok: true });
  });
  it('eight AI turns → turn_limit, seven passes', () => {
    expect(preCheck(ctx({ aiTurns: 8 }))).toEqual({ ok: false, reason: 'turn_limit' });
    expect(preCheck(ctx({ aiTurns: 7 }))).toEqual({ ok: true });
  });
  it('is skipped in suggest mode', () => {
    expect(preCheck(ctx({ mode: 'suggest', aiTurns: 9, history: [guest('יש לי תלונה')] }))).toEqual({ ok: true });
  });
  it('a removal phrase is its own reason; "לא עכשיו" is not one', () => {
    expect(preCheck(ctx({ history: [guest('הסירו אותי בבקשה')] }))).toEqual({ ok: false, reason: 'removal' });
    expect(preCheck(ctx({ history: [guest('stop')] }))).toEqual({ ok: false, reason: 'removal' });
    expect(preCheck(ctx({ history: [guest('לא עכשיו')] }))).toEqual({ ok: true });
  });
});

describe('reply checks', () => {
  it.each(['אבדוק ואחזור אליך', 'אני אברר ואעדכן', 'נחזור אליך עם תשובה'])('R-05 "%s" → deferred', reply => {
    expect(reasonOf(reply)).toBe('deferred');
  });
  it('R-05: "אפשר לחזור אלינו בטלפון" passes', () => {
    expect(applyGuardrails(answer('אפשר לחזור אלינו בטלפון'), ctx()).ok).toBe(true);
  });
  it.each(['הוזמן', 'ההזמנה אושרה', 'שריינתי לכם', 'confirmed', 'booked'])('R-06 "%s" → completion_claim', reply => {
    expect(reasonOf(reply)).toBe('completion_claim');
  });
  it('R-06: a fact that contains the word does not unblock the reply', () => {
    expect(reasonOf('ההזמנה אושרה אצלנו תמיד', { usedFacts: ['f3'] })).toBe('completion_claim');
  });
  it('R-07: a link not in the facts is invented, verbatim in the facts it passes, www. is the same', () => {
    expect(reasonOf('הנה https://example.org/other', undefined, { factsText: '[f1] x' })).toBe('invented_link');
    expect(applyGuardrails(answer('התפריט: https://example.com/menu'), ctx()).ok).toBe(true);
    expect(reasonOf('www.made-up.com')).toBe('invented_link');
  });
  it('price: needs a used fact that holds the number', () => {
    expect(reasonOf('המנה עולה ₪120')).toBe('unsupported_price');
    expect(reasonOf('המנה עולה 120 ש״ח', { usedFacts: ['f2'] })).toBe('unsupported_price');
    expect(applyGuardrails(answer('המנה עולה 120 ש״ח', { usedFacts: ['f1'] }), ctx()).ok).toBe(true);
  });
  it.each(['questionKey', 'party_size', 'usedFacts', 'systemInstruction', 'ההנחיות שלי'])('R-20 "%s" → internals', word => {
    expect(reasonOf(`הנה ${word} שלי`)).toBe('internals');
  });
  it('order: R-20 wins over R-06', () => {
    expect(reasonOf('הוזמן, usedFacts')).toBe('internals');
  });
  it('R-18: a request after only greetings becomes smalltalk with nothing collected', () => {
    const req = answer('מתי?', { intent: 'request', kind: 'table', collected: { date: '2030-01-07' } });
    for (const g of ['היי', 'שלום', 'בוקר טוב', 'hello']) {
      const res = applyGuardrails(req, ctx({ history: [guest(g)] }));
      expect(res.ok).toBe(true);
      expect(res.answer).toMatchObject({ intent: 'smalltalk', collected: {} });
      expect(res.answer.kind).toBeUndefined();
    }
    expect(applyGuardrails(req, ctx({ history: [guest('היי'), guest('שולחן ל-4')] })).answer.intent).toBe('request');
  });
  it('low content twice in a row → low_content, once passes and is marked low', () => {
    const empty = answer('?', { intent: 'other' });
    const first = applyGuardrails(empty, ctx());
    expect(first.ok).toBe(true);
    expect(first.answer.low).toBe(true);
    expect(applyGuardrails(empty, ctx({ lastTurnLow: true }))).toEqual({ ok: false, reason: 'low_content' });
  });
  it('the reply checks are skipped when the reply is not sent', () => {
    expect(applyGuardrails(answer('הוזמן'), ctx({ replyWillBeSent: false })).ok).toBe(true);
  });
  it('the model handoff and unknown fact ids keep working', () => {
    expect(applyGuardrails(answer('x', { handoff: true }), ctx())).toEqual({ ok: false, reason: 'model' });
    expect(applyGuardrails(answer('x', { usedFacts: ['f1', 'nope'] }), ctx()).answer.usedFacts).toEqual(['f1']);
  });
});

describe('the removal request (R-02)', () => {
  let logs;
  let fetchMock;
  beforeAll(async () => { await buildTestApp(); logs = captureLogs(); }, 60000);
  afterAll(async () => { await teardownTestApp(); });
  const db = () => testDb();

  beforeEach(async () => {
    resetForTests(); clearCapCache(); resetInboundForTest();
    for (const c of ['messages', 'conversations', 'clients', 'aiUsage', 'businesses', 'frontDeskProfiles', 'knowledgeItems']) {
      await db().collection(c).deleteMany({});
    }
    logs.records.length = 0;
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  async function setup(text) {
    await seedBusiness(db());
    await db().collection('frontDeskProfiles').updateOne({ businessId: 'b1' }, { $set: { assistant: { level: 1, tone: 'warm' } } });
    const { conversation, clientId } = await seedConversation(db(), { at: Date.now() });
    await db().collection('messages').insertOne({
      _id: 'g1', businessId: 'b1', conversationId: conversation._id, direction: 'in', author: 'guest', kind: 'text',
      text, at: Date.now(), providerMessageId: 'pm1', status: 'delivered',
    });
    return { conversation: await db().collection('conversations').findOne({ _id: conversation._id }), clientId };
  }
  const outbound = () => db().collection('messages').find({ direction: 'out' }).toArray();

  it('sets do-not-contact, sends exactly one sentence, makes no model call, moves to a person', async () => {
    const { conversation, clientId } = await setup('הסירו אותי מהרשימה');
    await runTurn(db(), conversation, { log: require('../logger').logger });
    expect(fetchMock).not.toHaveBeenCalled();
    const out = await outbound();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ author: 'server', text: fixedText('fd_ai_removed') });
    expect((await db().collection('clients').findOne({ _id: clientId })).doNotContact)
      .toEqual({ at: expect.any(Number), reason: 'guest asked in chat', via: 'guest' });
    expect((await db().collection('conversations').findOne({ _id: conversation._id })).status).toBe('human');
    const text = JSON.stringify(logs.records);
    expect(text).not.toContain('הסירו');
    expect(text).not.toContain('972521234567');
  });

  it('a later message to the same guest is refused by sendOut (no new outbound row)', async () => {
    const { conversation } = await setup('stop');
    await runTurn(db(), conversation, { log: require('../logger').logger });
    const again = await sendOut(db(), conversation, { kind: 'text', text: 'hi' }, 'ai', { now: Date.now() });
    expect(again).toMatchObject({ ok: false, reason: 'DO_NOT_CONTACT' });
    expect(await outbound()).toHaveLength(1);
  });

  it('"לא עכשיו" sets nothing', async () => {
    const { conversation, clientId } = await setup('לא עכשיו');
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: 'בסדר', intent: 'smalltalk' }) }] } }] }),
    });
    await runTurn(db(), conversation, { log: require('../logger').logger });
    expect((await db().collection('clients').findOne({ _id: clientId })).doNotContact).toBeUndefined();
  });

  it('suggest mode writes and sends nothing', async () => {
    const { conversation, clientId } = await setup('תסירו אותי');
    const res = await runTurn(db(), conversation, { log: require('../logger').logger, mode: 'suggest' });
    expect(res).toEqual({ ok: true, handoff: 'removal' });
    expect(await outbound()).toHaveLength(0);
    expect((await db().collection('clients').findOne({ _id: clientId })).doNotContact).toBeUndefined();
  });
});
