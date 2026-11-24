'use strict';
/**
 * Plan 680 (C-AI2): a guest books, changes and cancels a table by chat. The model is a stubbed fetch, the transport is the
 * simulator's, the clock is injected. Every sentence about room is a dictionary sentence the server chose.
 */
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');
const { seedBusiness, seedConversation } = require('./helpers/conversation-fixtures');
const { resetForTests } = require('../services/gemini-client');
const { _waitForUsageWritesForTests } = require('../services/ai-usage');
const { clearCapCache } = require('../services/ai-cap');
const { clearModuleCache } = require('../middleware/require-module');
const { fixedText } = require('../utils/fixed-text');
const { handleInbound, resetInboundForTest } = require('../services/inbound');
const { registerTableButtons } = require('../services/frontdesk-tables');
const holds = require('../services/table-holds');
const tb = require('../services/table-bookings');
const { runTurn } = require('../services/frontdesk-turn');
const { ROOM, ALL_WEEK_HOURS, tableKind, tableKeyOf } = require('../generated/schemas/testing/table-engine-fixtures');
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time');

process.env.GEMINI_API_KEY = 'test-key';
let logs;
let fetchMock;
beforeAll(async () => { await buildTestApp(); logs = captureLogs(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const db = () => testDb();
const HOUR = 3600000;
const DAY = 86400000;
const NOW = Date.parse('2030-01-07T10:00:00+02:00'); // a Monday, Jerusalem
const TOMORROW = '2030-01-08';
const WA_ID = '972521234567';
const jsonResponse = body => ({ ok: true, status: 200, json: async () => body });
const modelAnswer = obj => jsonResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });
const BOOK = (table, over = {}) => ({ reply: 'MODEL-REPLY 20:00 שולחן 5 אושר', intent: 'book', collected: { table }, ...over });
const FULL_ASK = { date: TOMORROW, time: '20:00', partySize: 4 };
const ddmm = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const TABLE_ONE = tableKeyOf(2);

let seq = 0;
const nextId = p => `${p}${++seq}`;
const col = name => db().collection(name);
const conv = id => col('conversations').findOne({ _id: id });
const outs = () => col('messages').find({ direction: 'out' }).sort({ at: 1 }).toArray();
let tick = 0;
/** The injected clock: every step is one second later, so messages sort in the order they were sent. */
const clock = () => NOW + (++tick) * 1000;
const lastOut = async () => (await outs()).at(-1);
const bookings = () => col('bookings').find({}).toArray();
const holdRows = () => col('tableHolds').find({}).toArray();
const requests = () => col('requests').find({}).toArray();

beforeEach(async () => {
  resetForTests(); clearCapCache(); resetInboundForTest(); registerTableButtons();
  for (const c of ['messages', 'conversations', 'clients', 'aiUsage', 'GEMINI_USAGE', 'requests', 'businesses', 'frontDeskProfiles',
    'knowledgeItems', 'floorPlans', 'bookings', 'tableHolds']) await col(c).deleteMany({});
  logs.records.length = 0;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); });

/** A business with table service. `single` leaves one online table (table02, 2-4 seats) so a full room is cheap to make. */
async function setup({ mode = 'auto', level = 1, tables = true, test, autoMaxParty, rules, single = false, assistant = {}, closedDates } = {}) {
  await seedBusiness(db());
  await col('businesses').updateOne({ _id: 'b1' }, { $set: { modules: tables ? ['frontdesk', 'tables'] : ['frontdesk'] } });
  clearModuleCache();
  await col('frontDeskProfiles').updateOne({ businessId: 'b1' }, {
    $set: {
      hours: ALL_WEEK_HOURS, requestKinds: { table: tableKind(rules) }, slug: 'one-one', assistant: { level, tone: 'warm', ...assistant },
      tableService: { confirmMode: mode, ...(autoMaxParty !== undefined && { autoMaxParty }) },
      ...(closedDates && { closedDates }),
    },
  });
  const plan = single ? { ...ROOM, tables: ROOM.tables.filter(t => t.key === TABLE_ONE), joins: [] } : ROOM;
  await col('floorPlans').insertOne({ ...plan, _id: 'fp1', businessId: 'b1' });
  const { conversation, clientId } = await seedConversation(db(), { at: NOW, test });
  return { conversation, clientId };
}

/** The guest writes `text`, the model answers `answer`, the turn runs at `now`. */
async function say(conversation, answer, { text = 'GUEST-SECRET-TEXT', now = clock() } = {}) {
  await col('messages').insertOne({
    _id: nextId('g'), businessId: 'b1', conversationId: conversation._id, direction: 'in', author: 'guest', kind: 'text',
    text, at: now, providerMessageId: nextId('pm'), status: 'delivered',
  });
  fetchMock.mockResolvedValueOnce(modelAnswer(answer));
  return runTurn(db(), await conv(conversation._id), { log: require('../logger').logger, now });
}

/** A tap on a button, through the one inbound door. */
async function tap(buttonId, at = clock()) {
  const r = await handleInbound(db(), {
    businessId: 'b1', channel: 'sim', waId: WA_ID, text: '', buttonId, providerMessageId: nextId('tap'), at,
  });
  await r.settled;
  return r;
}

const holdWholeRange = async (from, to, key = TABLE_ONE) => holds.claim(db(), { _id: nextId('blk'), businessId: 'b1' }, [key], from, to);

describe('book, auto', () => {
  it('offers with OK:1 / OTHER, then books on the tap with no model call', async () => {
    const { conversation, clientId } = await setup();
    await say(conversation, BOOK(FULL_ASK));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const offer = await lastOut();
    expect(offer).toMatchObject({ kind: 'button', author: 'server', text: fixedText('fd_ai_offer', { date: ddmm(TOMORROW), time: '20:00', party: 4 }) });
    expect(offer.buttons.map(b => b.id)).toEqual(['OK:1', 'OTHER']);
    const all = await outs();
    expect(all.some(m => JSON.stringify(m).includes('MODEL-REPLY'))).toBe(false);
    expect((await conv(conversation._id)).pending.kind).toBe('book');

    fetchMock.mockClear();
    await tap('OK:1');
    expect(fetchMock).not.toHaveBeenCalled();
    const made = await bookings();
    expect(made).toHaveLength(1);
    expect(made[0]).toMatchObject({ source: 'ai', status: 'confirmed', kind: 'table', clientId, date: TOMORROW, time: '20:00', partySize: 4 });
    const online = new Set(ROOM.tables.filter(t => t.online).map(t => t.key));
    expect(made[0].tableKeys.every(k => online.has(k))).toBe(true);
    const rows = await holdRows();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(r => r.bookingId === made[0]._id)).toBe(true);
    const after = await conv(conversation._id);
    expect(after.bookingId).toBe(made[0]._id);
    expect(after.pending).toBeUndefined();
    const confirmed = await lastOut();
    expect(confirmed).toMatchObject({ kind: 'template', author: 'server', template: { name: 'booking_confirmed', params: ['Guest', TOMORROW, '20:00', '4'] } });
    expect((await col('clients').findOne({ _id: clientId })).counters.bookings).toBe(1);
  });
});

describe('plan 731: the table question of the end-to-end test', () => {
  const TEXT = 'אפשר שולחן לארבעה מחר ב-20:00?';
  const offerText = fixedText('fd_ai_offer', { date: ddmm(TOMORROW), time: '20:00', party: 4 });

  it('a well-shaped answer offers a table after one call', async () => {
    const { conversation } = await setup();
    await say(conversation, BOOK(FULL_ASK), { text: TEXT });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const offer = await lastOut();
    expect(offer).toMatchObject({ kind: 'button', text: offerText });
    expect(offer.buttons.map(b => b.id)).toEqual(['OK:1', 'OTHER']);
  });

  it('one bad shape first, then the same answer: the same offer after two calls', async () => {
    const { conversation } = await setup();
    fetchMock.mockResolvedValueOnce(modelAnswer({ reply: 'x', intent: 'weird' }));
    await say(conversation, BOOK(FULL_ASK), { text: TEXT });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const offer = await lastOut();
    expect(offer).toMatchObject({ kind: 'button', text: offerText });
    expect(offer.buttons.map(b => b.id)).toEqual(['OK:1', 'OTHER']);
  });
});

describe('book, manual and over the limit', () => {
  it('manual: a qualified request, no booking, no hold', async () => {
    const { conversation } = await setup({ mode: 'manual' });
    await say(conversation, BOOK({ ...FULL_ASK, areaKey: 'inside' }));
    await tap('OK:1');
    expect(await bookings()).toHaveLength(0);
    expect(await holdRows()).toHaveLength(0);
    const reqs = await requests();
    expect(reqs).toHaveLength(1);
    expect(reqs[0]).toMatchObject({ kind: 'table', status: 'qualified', channel: 'sim', wanted: { date: TOMORROW, time: '20:00', partySize: 4 } });
    expect(reqs[0].statusHistory[0].via).toBe('ai');
    expect(reqs[0].answers).toEqual([{ questionKey: 'seating', label: '', value: 'Inside' }]);
    expect((await lastOut()).text).toBe(fixedText('fd_ai_will_confirm'));
    const after = await conv(conversation._id);
    expect(after.requestId).toBe(reqs[0]._id);
    expect(after.pending).toBeUndefined();
  });

  it('auto with a party of 8 over autoMaxParty 6 goes to the owner', async () => {
    const { conversation } = await setup({ mode: 'auto', autoMaxParty: 6 });
    await say(conversation, BOOK({ ...FULL_ASK, partySize: 8 }));
    await tap('OK:1');
    expect(await bookings()).toHaveLength(0);
    expect(await holdRows()).toHaveLength(0);
    expect(await requests()).toHaveLength(1);
    expect((await lastOut()).text).toBe(fixedText('fd_ai_will_confirm'));
  });
});

describe('missing', () => {
  it('asks date, then time, then offers; pending keeps what was said', async () => {
    const { conversation } = await setup();
    await say(conversation, BOOK({ partySize: 4 }));
    expect((await lastOut()).text).toBe(fixedText('fd_ai_ask_date'));
    expect((await conv(conversation._id)).pending.data).toEqual({ partySize: 4 });
    await say(conversation, BOOK({ date: TOMORROW }));
    expect((await lastOut()).text).toBe(fixedText('fd_ai_ask_time'));
    expect((await conv(conversation._id)).pending.data).toEqual({ partySize: 4, date: TOMORROW });
    await say(conversation, BOOK({ time: '20:00' }));
    expect((await lastOut()).text).toBe(fixedText('fd_ai_offer', { date: ddmm(TOMORROW), time: '20:00', party: 4 }));
  });

  it('asks the party question and treats a bad value as missing', async () => {
    const { conversation } = await setup();
    await say(conversation, BOOK({ date: TOMORROW, time: '25:99' }));
    expect((await lastOut()).text).toBe(fixedText('fd_ai_ask_party'));
    expect((await conv(conversation._id)).pending.data).toEqual({ date: TOMORROW });
  });
});

describe('full', () => {
  it('offers up to three alternatives; ALT:2 books exactly that one', async () => {
    const { conversation } = await setup({ single: true });
    await holdWholeRange(jerusalemEpoch(TOMORROW, '19:00'), jerusalemEpoch(TOMORROW, '21:30'));
    await say(conversation, BOOK(FULL_ASK));
    const msg = await lastOut();
    expect(msg.text).toBe(fixedText('fd_ai_alternatives'));
    expect(msg.buttons.length).toBeGreaterThan(0);
    expect(msg.buttons.length).toBeLessThanOrEqual(3);
    expect(msg.buttons.map(b => b.id)).toEqual(msg.buttons.map((_, i) => `ALT:${i + 1}`));
    const offers = (await conv(conversation._id)).pending.data.offers;
    expect(msg.buttons.map(b => b.title)).toEqual(offers.map(o => `${ddmm(o.date)} ${o.time}`));
    expect(offers.length).toBeGreaterThan(1);
    await tap('ALT:2');
    const made = await bookings();
    expect(made).toHaveLength(1);
    expect([made[0].date, made[0].time]).toEqual([offers[1].date, offers[1].time]);
  });

  it('no alternative at all: fd_ai_full_none and no button', async () => {
    const { conversation } = await setup({ single: true });
    await holdWholeRange(jerusalemEpoch(TOMORROW, '00:00'), jerusalemEpoch(TOMORROW, '00:00') + 17 * DAY);
    await say(conversation, BOOK(FULL_ASK));
    const msg = await lastOut();
    expect(msg).toMatchObject({ kind: 'text', text: fixedText('fd_ai_full_none') });
    expect(msg.buttons).toBeUndefined();
    expect((await conv(conversation._id)).pending.data.time).toBeUndefined();
  });
});

describe('lost race', () => {
  it('another booking takes the table before OK:1: no booking, alternatives again, no hold of this guest', async () => {
    const { conversation } = await setup({ single: true });
    await say(conversation, BOOK(FULL_ASK));
    expect((await lastOut()).buttons[0].id).toBe('OK:1');
    await holdWholeRange(jerusalemEpoch(TOMORROW, '19:00'), jerusalemEpoch(TOMORROW, '21:30'));
    await tap('OK:1');
    expect(await bookings()).toHaveLength(0);
    expect((await lastOut()).text).toBe(fixedText('fd_ai_alternatives'));
    expect((await holdRows()).every(r => r.bookingId.startsWith('blk'))).toBe(true);
    expect((await conv(conversation._id)).bookingId).toBeUndefined();
  });
});

describe('other and expired', () => {
  it('OTHER asks for a time and drops it from pending', async () => {
    const { conversation } = await setup();
    await say(conversation, BOOK(FULL_ASK));
    await tap('OTHER');
    expect((await lastOut()).text).toBe(fixedText('fd_ai_ask_time'));
    const pending = (await conv(conversation._id)).pending;
    expect(pending.data).toEqual({ date: TOMORROW, partySize: 4 });
  });

  it('OK:1 with no pending: fd_ai_expired and nothing written', async () => {
    const { conversation } = await setup();
    await col('messages').insertOne({
      _id: 'x1', businessId: 'b1', conversationId: conversation._id, direction: 'in', author: 'guest', kind: 'text', text: 'hi',
      at: NOW, providerMessageId: 'pmx', status: 'delivered',
    });
    await tap('OK:1');
    expect((await lastOut()).text).toBe(fixedText('fd_ai_expired'));
    expect(await bookings()).toHaveLength(0);
    expect(await holdRows()).toHaveLength(0);
    expect(await requests()).toHaveLength(0);
  });

  it('an offer older than 30 minutes is expired', async () => {
    const { conversation } = await setup();
    await say(conversation, BOOK(FULL_ASK));
    await tap('OK:1', NOW + 31 * 60000);
    expect((await lastOut()).text).toBe(fixedText('fd_ai_expired'));
    expect(await bookings()).toHaveLength(0);
  });
});

describe('reasons', () => {
  it('a closed date → fd_ai_reason_closed, the date is dropped', async () => {
    const { conversation } = await setup({ closedDates: [TOMORROW] });
    await say(conversation, BOOK(FULL_ASK));
    expect((await lastOut()).text).toBe(fixedText('fd_ai_reason_closed'));
    expect((await conv(conversation._id)).pending.data).toEqual({ time: '20:00', partySize: 4 });
  });

  it('too soon → fd_ai_reason_too_soon', async () => {
    const { conversation } = await setup({ rules: { minLeadHours: 3 } });
    await say(conversation, BOOK({ date: '2030-01-07', time: '12:00', partySize: 2 }));
    expect((await lastOut()).text).toBe(fixedText('fd_ai_reason_too_soon'));
  });

  it('a party of 20 over maxPartySize 12 → a person, with the handoff sentence', async () => {
    const { conversation } = await setup();
    await say(conversation, BOOK({ ...FULL_ASK, partySize: 20 }));
    const after = await conv(conversation._id);
    expect(after.status).toBe('human');
    expect((await lastOut()).text).toBe(fixedText('fd_ai_handoff_default'));
    expect(await bookings()).toHaveLength(0);
  });
});

/** A confirmed booking of the guest, with its holds, `hoursAhead` after NOW. */
async function seedBooking(clientId, id, hoursAhead, over = {}) {
  const ctx = await tb.loadTableContext(db(), 'b1');
  const startAt = NOW + hoursAhead * HOUR;
  const wall = tb.wallOf(startAt);
  const doc = {
    _id: id, schemaVersion: 2, businessId: 'b1', createdBy: 'own1', createdAt: NOW, updatedAt: NOW, kind: 'table', status: 'confirmed',
    source: 'phone', clientId, guestName: 'Guest', guestPhone: WA_ID,
    statusHistory: [{ status: 'confirmed', at: NOW, by: 'own1', byName: '', via: 'member' }], publicToken: id.padEnd(32, 'x'), ...over,
  };
  const r = await tb.bookTable(db(), { doc, ctx, date: wall.date, time: wall.time, partySize: 2, onlineOnly: false, now: NOW });
  expect(r.ok).toBe(true);
  return r.booking;
}

describe('cancel', () => {
  it('5 hours before with a cutoff of 3: cancelled, request cancelled, holds gone, fd_ai_cancelled', async () => {
    const { conversation, clientId } = await setup();
    const b = await seedBooking(clientId, 'bk1', 5, { requestId: 'rq1' });
    await col('requests').insertOne({
      _id: 'rq1', businessId: 'b1', status: 'approved', statusHistory: [{ status: 'approved', at: NOW, by: 's', byName: '', via: 'server' }],
    });
    await say(conversation, { reply: 'x', intent: 'cancel', collected: {} });
    const after = await col('bookings').findOne({ _id: b._id });
    expect(after.status).toBe('cancelled');
    expect(after.statusHistory.at(-1)).toMatchObject({ status: 'cancelled', via: 'guest' });
    expect(await holdRows()).toHaveLength(0);
    expect((await col('requests').findOne({ _id: 'rq1' })).status).toBe('cancelled');
    expect((await lastOut()).text).toBe(fixedText('fd_ai_cancelled'));
  });

  it('2 hours before: nothing changes and the conversation is handed off', async () => {
    const { conversation, clientId } = await setup();
    const b = await seedBooking(clientId, 'bk1', 2);
    await say(conversation, { reply: 'x', intent: 'cancel', collected: {} });
    expect((await col('bookings').findOne({ _id: b._id })).status).toBe('confirmed');
    expect((await holdRows()).length).toBeGreaterThan(0);
    expect((await conv(conversation._id)).status).toBe('human');
  });

  it('no booking → handoff', async () => {
    const { conversation } = await setup();
    await say(conversation, { reply: 'x', intent: 'cancel', collected: {} });
    expect((await conv(conversation._id)).status).toBe('human');
  });

  it('two bookings → BK:1 / BK:2; BK:2 cancels the second', async () => {
    const { conversation, clientId } = await setup();
    await seedBooking(clientId, 'bk1', 27);
    await seedBooking(clientId, 'bk2', 51);
    await say(conversation, { reply: 'x', intent: 'cancel', collected: {} });
    const msg = await lastOut();
    expect(msg.text).toBe(fixedText('fd_ai_pick_booking'));
    expect(msg.buttons.map(b => b.id)).toEqual(['BK:1', 'BK:2']);
    await tap('BK:2');
    expect((await col('bookings').findOne({ _id: 'bk2' })).status).toBe('cancelled');
    expect((await col('bookings').findOne({ _id: 'bk1' })).status).toBe('confirmed');
    expect((await lastOut()).text).toBe(fixedText('fd_ai_cancelled'));
  });

  it('more than three bookings → handoff', async () => {
    const { conversation, clientId } = await setup();
    for (let i = 1; i <= 4; i++) await seedBooking(clientId, 'bk' + i, 24 * i + 3);
    await say(conversation, { reply: 'x', intent: 'cancel', collected: {} });
    expect((await conv(conversation._id)).status).toBe('human');
  });
});

describe('change', () => {
  it('a free table: the time moves and the holds move; fd_ai_changed', async () => {
    const { conversation, clientId } = await setup();
    const b = await seedBooking(clientId, 'bk1', 30);
    await say(conversation, { reply: 'x', intent: 'change', collected: { table: { time: '21:00' } } });
    const after = await col('bookings').findOne({ _id: b._id });
    expect(after.time).toBe('21:00');
    expect(after.startAt).toBe(jerusalemEpoch(after.date, '21:00'));
    const rows = await holdRows();
    expect(rows.every(r => r.cell >= after.startAt - 15 * 60000)).toBe(true);
    expect((await lastOut()).text).toBe(fixedText('fd_ai_changed', { date: ddmm(after.date), time: '21:00', party: 2 }));
  });

  it('21:00 full: the booking is unchanged and the text is fd_ai_change_full', async () => {
    const { conversation, clientId } = await setup({ single: true });
    const b = await seedBooking(clientId, 'bk1', 30);
    await holdWholeRange(jerusalemEpoch(b.date, '20:30'), jerusalemEpoch(b.date, '23:30'));
    const before = await col('bookings').findOne({ _id: b._id });
    expect(before.time).toBe('16:00');
    await say(conversation, { reply: 'x', intent: 'change', collected: { table: { time: '21:00' } } });
    const after = await col('bookings').findOne({ _id: b._id });
    expect(after).toEqual(before);
    expect((await lastOut()).text).toBe(fixedText('fd_ai_change_full'));
  });

  it('nothing in collected.table → fd_ai_ask_change', async () => {
    const { conversation, clientId } = await setup();
    await seedBooking(clientId, 'bk1', 30);
    await say(conversation, { reply: 'x', intent: 'change', collected: {} });
    expect((await lastOut()).text).toBe(fixedText('fd_ai_ask_change'));
    expect((await conv(conversation._id)).pending.kind).toBe('change');
  });
});

describe('level 0', () => {
  it('stores the offer as the suggestion, sends nothing, writes no pending; a tap writes nothing', async () => {
    const { conversation } = await setup({ level: 0 });
    await say(conversation, BOOK(FULL_ASK));
    expect(await outs()).toHaveLength(0);
    const after = await conv(conversation._id);
    expect(after.suggestion).toBe(fixedText('fd_ai_offer', { date: ddmm(TOMORROW), time: '20:00', party: 4 }));
    expect(after.pending).toBeUndefined();
    await tap('OK:1');
    expect(await bookings()).toHaveLength(0);
    expect(await holdRows()).toHaveLength(0);
    expect(await outs()).toHaveLength(0);
  });
});

describe('without tables', () => {
  it('book with all three fields takes the request path of plan 679', async () => {
    const { conversation } = await setup({ tables: false });
    const model = BOOK(FULL_ASK, { reply: 'MODEL-REPLY' });
    await say(conversation, model);
    const reqs = await requests();
    expect(reqs).toHaveLength(1);
    expect(reqs[0]).toMatchObject({ kind: 'table', status: 'qualified', wanted: { date: TOMORROW, time: '20:00', partySize: 4 } });
    expect((await lastOut()).text).toBe(fixedText('fd_ai_will_confirm'));
    expect(await holdRows()).toHaveLength(0);
  });
});

describe('test data and logs', () => {
  it('a test conversation books a test booking', async () => {
    const { conversation } = await setup({ test: true });
    await say(conversation, BOOK(FULL_ASK));
    await tap('OK:1');
    const made = await bookings();
    expect(made).toHaveLength(1);
    expect(made[0].test).toBe(true);
    expect((await holdRows()).every(r => r.test === true)).toBe(true);
  });

  it('a full booking by chat leaves no guest text, name, phone or table key in the logs', async () => {
    const { conversation } = await setup();
    await say(conversation, BOOK(FULL_ASK), { text: 'GUEST-SECRET-TEXT' });
    await tap('OK:1');
    await _waitForUsageWritesForTests();
    const made = (await bookings())[0];
    const dump = JSON.stringify(logs.records);
    for (const secret of ['GUEST-SECRET-TEXT', 'MODEL-REPLY', 'Guest', WA_ID, ...made.tableKeys]) expect(dump).not.toContain(secret);
    expect(logs.byEvent('frontdesk.table.booked')).toHaveLength(1);
    expect(logs.byEvent('frontdesk.table.offer').length).toBeGreaterThan(0);
  });
});
