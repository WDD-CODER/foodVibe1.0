'use strict';
/**
 * Plan 681: the assistant's suggestion on a request it creates (`request.suggested`), cleaned by the server, and carried
 * into the decision row the requests router writes. The model is a stubbed fetch; no key, no network.
 */
const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { seedBusiness, seedConversation } = require('./helpers/conversation-fixtures');
const { resetForTests } = require('../services/gemini-client');
const { clearCapCache } = require('../services/ai-cap');
const { clearModuleCache } = require('../middleware/require-module');
const { handleInbound } = require('../services/inbound');
const { runTurn } = require('../services/frontdesk-turn');
const { ROOM, ALL_WEEK_HOURS, tableKind } = require('../generated/schemas/testing/table-engine-fixtures');

process.env.GEMINI_API_KEY = 'test-key';
let app;
let fetchMock;
beforeAll(async () => { app = await buildTestApp(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const db = () => testDb();
const col = name => db().collection(name);
const NOW = Date.parse('2030-01-07T10:00:00+02:00');
const WA_ID = '972521234567';
const FULL = { date: '2030-01-08', time: '20:00', partySize: 4 };
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'b1', businessRole: 'owner' };
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` });
const modelAnswer = obj => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }) });
const BOOK = suggested => ({ reply: 'x', intent: 'book', collected: { table: FULL }, ...(suggested !== undefined && { suggested }) });

let seq = 0;
let tick = 0;
const clock = () => NOW + (++tick) * 1000;
const nextId = p => `${p}${++seq}`;

beforeEach(async () => {
  resetForTests(); clearCapCache();
  for (const c of ['messages', 'conversations', 'clients', 'aiUsage', 'GEMINI_USAGE', 'requests', 'businesses', 'frontDeskProfiles',
    'knowledgeItems', 'floorPlans', 'bookings', 'tableHolds', 'decisionLog', 'menuEvents']) await col(c).deleteMany({});
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); });

async function setup({ tables = true, kinds } = {}) {
  await seedBusiness(db());
  await col('businesses').updateOne({ _id: 'b1' }, { $set: { modules: tables ? ['frontdesk', 'tables'] : ['frontdesk'] } });
  clearModuleCache();
  await col('frontDeskProfiles').updateOne({ businessId: 'b1' }, {
    $set: {
      businessType: 'restaurant', hours: ALL_WEEK_HOURS, requestKinds: kinds ?? { table: tableKind() }, slug: 'one-one',
      displayName: 'One', assistant: { level: 1, tone: 'warm' }, tableService: { confirmMode: 'manual' },
    },
  });
  if (tables) await col('floorPlans').insertOne({ ...ROOM, _id: 'fp1', businessId: 'b1' });
  const { conversation } = await seedConversation(db(), { at: NOW });
  return conversation;
}

async function say(conversation, answer, now = clock()) {
  await col('messages').insertOne({
    _id: nextId('g'), businessId: 'b1', conversationId: conversation._id, direction: 'in', author: 'guest', kind: 'text',
    text: 'GUEST', at: now, providerMessageId: nextId('pm'), status: 'delivered',
  });
  fetchMock.mockResolvedValueOnce(modelAnswer(answer));
  return runTurn(db(), await col('conversations').findOne({ _id: conversation._id }), { now });
}

async function tap(buttonId, at = clock()) {
  const r = await handleInbound(db(), { businessId: 'b1', channel: 'sim', waId: WA_ID, text: '', buttonId, providerMessageId: nextId('tap'), at });
  await r.settled;
}

/** The guest books a table in manual mode; the model's answer carries `suggested`; the guest taps OK. */
async function chatToRequest(suggested) {
  const conversation = await setup();
  const at = clock();
  await say(conversation, BOOK(suggested), at);
  await tap('OK:1');
  const reqs = await col('requests').find({}).toArray();
  expect(reqs).toHaveLength(1);
  return { req: reqs[0], at };
}

describe('the suggestion on a request the assistant creates', () => {
  it('manual mode: a chat that ends with OK carries approve, a one-line text and the turn time', async () => {
    const { req, at } = await chatToRequest({ action: 'approve', text: 'שולחן פנוי, קבוצה בגודל רגיל' });
    expect(req.status).toBe('qualified');
    expect(req.suggested).toEqual({ action: 'approve', text: 'שולחן פנוי, קבוצה בגודל רגיל', at });
    expect(req.suggested.text.length).toBeLessThanOrEqual(600);
    expect(req.suggested.text).not.toMatch(/[\r\n]/);
  });

  it('an action outside the three stores no suggested at all', async () => {
    const { req } = await chatToRequest({ action: 'book', text: 'כן' });
    expect(req.suggested).toBeUndefined();
    expect(req.status).toBe('qualified');
  });

  it('a 700-character text is cut to 600', async () => {
    const { req } = await chatToRequest({ action: 'ask', text: 'א'.repeat(700) });
    expect(req.suggested.action).toBe('ask');
    expect(req.suggested.text).toBe('א'.repeat(600));
  });

  it('line breaks and tabs become one space', async () => {
    const { req } = await chatToRequest({ action: 'decline', text: 'שורה אחת\nשורה\t\tשתיים' });
    expect(req.suggested.text).toBe('שורה אחת שורה שתיים');
  });

  it('an empty text is dropped, the action is kept', async () => {
    const { req, at } = await chatToRequest({ action: 'approve', text: ' \n ' });
    expect(req.suggested).toEqual({ action: 'approve', at });
  });

  it('the plan 679 request path (no table service) carries the suggestion too, and changes nothing else', async () => {
    const conversation = await setup({ tables: false });
    const at = clock();
    await say(conversation, BOOK({ action: 'approve', text: 'מתאים' }), at);
    const reqs = await col('requests').find({}).toArray();
    expect(reqs).toHaveLength(1);
    expect(reqs[0]).toMatchObject({ status: 'qualified', suggested: { action: 'approve', text: 'מתאים', at } });
  });

  it('a request created by the public form or by a member has no suggested', async () => {
    await setup({ tables: false });
    await col('frontDeskProfiles').updateOne({ businessId: 'b1' }, { $set: { status: 'pilot' } });
    const form = await request(app).post('/api/v1/public/one-one/requests').send({
      kind: 'table', guestName: 'דנה', guestPhone: '052-765 4321', wanted: FULL, answers: [], consentTerms: true,
    });
    expect(form.status).toBe(201);
    const member = await request(app).post('/api/v1/requests').set(as(OWNER)).send({
      kind: 'table', guestName: 'רון', guestPhone: '052-111 2222', wanted: FULL,
    });
    expect(member.status).toBe(201);
    const reqs = await col('requests').find({}).toArray();
    expect(reqs).toHaveLength(2);
    expect(reqs.every(r => r.suggested === undefined)).toBe(true);
  });
});

describe('the decision row', () => {
  async function seeded() {
    const conversation = await setup({ tables: false });
    await say(conversation, BOOK({ action: 'approve', text: 'מתאים' }));
    const stored = await col('requests').findOne({ businessId: 'b1' });
    expect(stored.test).toBeUndefined();
    expect(stored.suggested.action).toBe('approve');
    return stored;
  }

  it('approving writes suggestion approve and decidedAction approve', async () => {
    const r = await seeded();
    const res = await request(app).post(`/api/v1/requests/${r._id}/approve`).set(as(OWNER)).send({});
    expect(res.status).toBe(200);
    const rows = await col('decisionLog').find({}).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ suggestion: 'approve', decidedAction: 'approve' });
  });

  it('declining writes suggestion approve and decidedAction decline', async () => {
    const r = await seeded();
    const res = await request(app).post(`/api/v1/requests/${r._id}/decline`).set(as(OWNER)).send({ reason: 'full' });
    expect(res.status).toBe(200);
    const rows = await col('decisionLog').find({}).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ suggestion: 'approve', decidedAction: 'decline' });
  });
});
