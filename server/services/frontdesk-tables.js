'use strict';
/**
 * Plan 680 (C-AI2, C-BOOK2): a guest books, changes and cancels a table by chat. The model only says what the guest
 * wants (`collected.table`); whether there is room, which times are offered and every sentence about it come from here:
 * the engine answers, the dictionary speaks, a tap on a button is handled with no model call (INV-6, INV-7).
 * A table is written only through `bookTable` and `changeWhen` of the booking service. Logs carry ids, enums and numbers
 * only — never a name, a phone, a text or a table key.
 */
const { LIVE } = require('../jobs/purge-deleted');
const { logger } = require('../logger');
const { newId } = require('../utils/id');
const { newPublicToken } = require('../utils/public-token');
const { fixedText, reasonText } = require('../utils/fixed-text');
const { createRequest, runQualify } = require('../utils/request-create');
const { businessModules } = require('../middleware/require-module');
const { sendOut } = require('./outbound');
const { registerButton } = require('./inbound');
const { loadConversation } = require('./conversations');
const holds = require('./table-holds');
const tb = require('./table-bookings');
const { assign, alternatives } = require('../generated/schemas/front-desk/table-engine');
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time');
const { templateMessage } = require('../generated/schemas/front-desk/message-templates');

const EXPIRE_MS = 30 * 60000;
const HOUR_MS = 3600000;
const MAX_PARTY = 30;
const MAX_PICK = 3;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const colOf = (db, name) => db.collection(name);
const levelOf = profile => (profile && profile.assistant && profile.assistant.level) || 0;
const ddmm = date => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const slotTitle = (date, time) => `${ddmm(date)} ${time}`;
const validDate = v => typeof v === 'string' && DATE_RE.test(v) && new Date(v + 'T00:00:00Z').toISOString().startsWith(v);
const fresh = (pending, kind, now) => !!pending && pending.kind === kind && now - pending.at < EXPIRE_MS;

const text = (key, params) => ({ kind: 'text', text: fixedText(key, params) });
const handoffRes = () => ({ handoff: true });

/** The table context (profile, plan, service) or `null` when the business has no table service or no floor plan. */
async function tablesFor(db, businessId) {
  const modules = await businessModules(businessId);
  if (!modules.includes('tables')) return null;
  const ctx = await tb.loadTableContext(db, businessId);
  return ctx.plan && ctx.profile ? ctx : null;
}

/** The valid fields of what the model collected; an invalid value is left out (counts as missing). */
function cleanTable(raw, plan) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  if (validDate(raw.date)) out.date = raw.date;
  if (typeof raw.time === 'string' && TIME_RE.test(raw.time)) out.time = raw.time;
  if (Number.isInteger(raw.partySize) && raw.partySize >= 1 && raw.partySize <= MAX_PARTY) out.partySize = raw.partySize;
  if (typeof raw.areaKey === 'string' && (plan.areas ?? []).some(a => a.key === raw.areaKey)) out.areaKey = raw.areaKey;
  return out;
}

const dataOf = d => {
  const out = {};
  for (const k of ['date', 'time', 'partySize', 'areaKey']) if (d[k] !== undefined) out[k] = d[k];
  return out;
};
const bookPending = (data, now) => ({ kind: 'book', data, at: now });

const templateOut = (name, values) => {
  const { buttons, ...t } = templateMessage(name, values);
  return { kind: 'template', template: t, ...(buttons && { buttons }) };
};

/**
 * The engine's answer to a complete ask, as a message: the one place that asks the engine for a table to offer.
 * Returns `{ outbound, pending }`, `{ handoff }` or `{ request }` (no plan to assign from).
 */
async function offer(db, conversation, data, tables, { now, log }) {
  const { businessId } = conversation;
  const { date, time, partySize, areaKey } = data;
  const startAt = jerusalemEpoch(date, time);
  const ask = { date, time, partySize, ...(areaKey && { areaKey }), onlineOnly: true, now };
  const day = await holds.holdsOf(db, businessId, startAt - 6 * HOUR_MS, startAt + 12 * HOUR_MS);
  const found = assign(tables.plan, tables.profile, day, ask);
  if (found.ok) {
    log.info({ event: 'frontdesk.table.offer', reason: 'ok', alternatives: 0 });
    return {
      outbound: {
        kind: 'button',
        text: fixedText('fd_ai_offer', { date: ddmm(date), time, party: partySize }),
        buttons: [
          { id: 'OK:1', title: fixedText('fd_ai_btn_confirm') },
          { id: 'OTHER', title: fixedText('fd_ai_btn_other') },
        ],
      },
      pending: bookPending({ ...data, offers: [{ date, time }] }, now),
    };
  }
  log.info({ event: 'frontdesk.table.offer', reason: found.reason, alternatives: 0 });
  if (found.reason === 'no_plan') return { request: true };
  if (found.reason === 'too_big' || found.reason === 'too_small') return handoffRes();
  if (found.reason === 'full') {
    const alts = alternatives(tables.plan, tables.profile, await tb.holdsByDate(db, businessId, date), ask).slice(0, MAX_PICK);
    log.info({ event: 'frontdesk.table.offer', reason: 'full', alternatives: alts.length });
    if (!alts.length) {
      const { time: _t, ...rest } = data;
      return { outbound: text('fd_ai_full_none'), pending: bookPending(rest, now) };
    }
    return {
      outbound: {
        kind: 'button',
        text: fixedText('fd_ai_alternatives'),
        buttons: alts.map((a, i) => ({ id: `ALT:${i + 1}`, title: slotTitle(a.date, a.time) })),
      },
      pending: bookPending({ ...data, offers: alts }, now),
    };
  }
  // closed, too_soon, too_far, too_late: a fixed sentence that asks for another time, and the refused field is dropped.
  const drop = found.reason === 'closed' || found.reason === 'too_far' ? 'date' : 'time';
  const { [drop]: _gone, ...rest } = data;
  return { outbound: text('fd_ai_reason_' + found.reason), pending: bookPending(rest, now) };
}

/** Book: merge what is pending with what the guest just said, ask for what is missing, else offer. */
async function bookStep(db, conversation, answer, tables, { now, log }) {
  const prior = fresh(conversation.pending, 'book', now) ? dataOf(conversation.pending.data) : {};
  const data = { ...prior, ...cleanTable(answer.collected && answer.collected.table, tables.plan) };
  const asks = [['date', 'fd_ai_ask_date'], ['partySize', 'fd_ai_ask_party'], ['time', 'fd_ai_ask_time']];
  const missing = asks.find(([field]) => data[field] === undefined);
  if (missing) return { outbound: text(missing[1]), pending: bookPending(data, now) };
  return offer(db, conversation, data, tables, { now, log });
}

/** The guest's own future confirmed table bookings, soonest first. */
const bookingsOf = (db, conversation, now) => colOf(db, 'bookings')
  .find({ businessId: conversation.businessId, clientId: conversation.clientId, kind: 'table', status: 'confirmed', endAt: { $gt: now }, ...LIVE })
  .sort({ startAt: 1 }).toArray();

/** Cancel or change one booking, inside the cancellation cutoff. */
async function act(db, kind, booking, tableRaw, tables, { now, log }) {
  if (now >= booking.startAt - tables.service.cancellationCutoffHours * HOUR_MS) return handoffRes();
  if (kind === 'cancel') {
    const moved = await tb.cancelByGuest(db, booking, { now });
    if (!moved.ok) return handoffRes();
    log.info({ event: 'frontdesk.table.cancelled' });
    return { outbound: text('fd_ai_cancelled'), clear: true };
  }
  const want = cleanTable(tableRaw, tables.plan);
  const change = {};
  for (const k of ['date', 'time', 'partySize']) if (want[k] !== undefined) change[k] = want[k];
  if (!Object.keys(change).length) {
    return {
      outbound: text('fd_ai_ask_change'),
      pending: { kind: 'change', data: { bookingIds: [booking._id], table: {} }, at: now },
    };
  }
  let r;
  try {
    r = await tb.changeWhen(db, tables, booking, change, { now, via: 'guest' });
  } catch (err) {
    log.info({ event: 'frontdesk.table.change_failed', code: err && err.code });
    return handoffRes();
  }
  if (!r.ok) {
    if (r.code !== 'NO_TABLE') return handoffRes();
    return { outbound: text('fd_ai_change_full'), clear: true };
  }
  log.info({ event: 'frontdesk.table.changed' });
  return {
    outbound: text('fd_ai_changed', { date: ddmm(r.set.date), time: r.set.time, party: r.set.partySize }),
    clear: true,
  };
}

/** Change or cancel: find the guest's bookings; none or many → a person or a pick; one → act. */
async function manageStep(db, conversation, answer, tables, { now, log, write }) {
  if (!write) return handoffRes();
  const kind = answer.intent;
  let list = await bookingsOf(db, conversation, now);
  const p = conversation.pending;
  if (fresh(p, kind, now) && Array.isArray(p.data.bookingIds) && p.data.bookingIds.length === 1) {
    list = list.filter(b => b._id === p.data.bookingIds[0]);
  }
  if (!list.length || list.length > MAX_PICK) return handoffRes();
  const table = (answer.collected && answer.collected.table) || {};
  if (list.length > 1) {
    return {
      outbound: {
        kind: 'button',
        text: fixedText('fd_ai_pick_booking'),
        buttons: list.map((b, i) => ({ id: `BK:${i + 1}`, title: slotTitle(b.date, b.time) })),
      },
      pending: { kind, data: { bookingIds: list.map(b => b._id), table: cleanTable(table, tables.plan) }, at: now },
    };
  }
  return act(db, kind, list[0], table, tables, { now, log });
}

/**
 * `book`, `change` or `cancel` with table service on. Returns `{ outbound?, pending?, clear?, handoff?, request? }`.
 * `ctx` is `{ tables, now, write, log }`; with `write: false` (level 0, suggest mode) nothing is changed here.
 */
async function handleTableIntent(db, conversation, answer, ctx) {
  const { tables, now, write, log = logger } = ctx;
  if (answer.intent === 'book') return bookStep(db, conversation, answer, tables, { now, log });
  return manageStep(db, conversation, answer, tables, { now, log, write });
}

/** The booking document of a guest's booking by chat; the tables are added by `bookTable`. */
async function bookingDoc(db, conversation, now) {
  const client = await colOf(db, 'clients').findOne({ _id: conversation.clientId, businessId: conversation.businessId });
  return {
    _id: newId(), schemaVersion: 2, businessId: conversation.businessId, createdBy: 'public:' + conversation.channel,
    createdAt: now, updatedAt: now, kind: 'table', status: 'confirmed', source: 'ai', clientId: conversation.clientId,
    guestName: (client && client.name) || '', guestPhone: (client && client.phone) || '',
    statusHistory: [{ status: 'confirmed', at: now, by: 'server', byName: '', via: 'server' }],
    publicToken: newPublicToken(),
    ...(conversation.test && { test: true }),
  };
}

/** The guest said yes to `data` (date, time, party): book it by the owner's confirm mode, or send it to the owner. */
async function confirm(db, conversation, data, tables, { now, log }) {
  const { businessId } = conversation;
  const { date, time, partySize, areaKey } = data;
  const service = tables.service;
  if (service.confirmMode === 'auto' && partySize <= service.autoMaxParty) {
    const doc = await bookingDoc(db, conversation, now);
    let r;
    try {
      r = await tb.bookTable(db, { doc, ctx: tables, date, time, partySize, areaKey, onlineOnly: true, now });
    } catch (err) {
      log.info({ event: 'frontdesk.table.book_failed', code: err && err.code });
      return handoffRes();
    }
    if (!r.ok) return offer(db, conversation, dataOf(data), tables, { now, log });
    if (!conversation.test) await tb.countBooking(db, businessId, conversation.clientId, now);
    log.info({ event: 'frontdesk.table.booked', partySize });
    return {
      outbound: templateOut('booking_confirmed', { name: doc.guestName, date, time, partySize }),
      clear: true, set: { bookingId: doc._id },
    };
  }
  const kindConfig = tables.profile.requestKinds && tables.profile.requestKinds.table;
  if (!kindConfig || !kindConfig.enabled) return handoffRes();
  const wanted = { date, time, partySize };
  const area = areaKey && (tables.plan.areas ?? []).find(a => a.key === areaKey);
  const answers = area && (kindConfig.questions ?? []).some(q => q.key === 'seating')
    ? [{ questionKey: 'seating', label: '', value: String(area.name).slice(0, 500) }] : [];
  const verdict = runQualify(tables.profile, 'table', wanted, answers, now);
  if (verdict.qualification.verdict === 'unfit') {
    return { outbound: { kind: 'text', text: verdict.qualification.reasons.map(reasonText).join(' ') }, clear: true };
  }
  const { request } = await createRequest(db, businessId, tables.profile, {
    kind: 'table', clientId: conversation.clientId, wanted, answers, ...(conversation.test && { test: true }),
  }, { channel: conversation.channel, actor: 'public:' + conversation.channel, via: 'ai', source: 'whatsapp' });
  log.info({ event: 'frontdesk.table.request', partySize });
  return { outbound: text('fd_ai_will_confirm'), clear: true, set: { requestId: request._id } };
}

/** Writes the pending state and the conversation links of a result, then sends its message (author `server`). */
async function deliver(db, conversation, res, { now, log = logger, profile }) {
  const { businessId } = conversation;
  const id = { _id: conversation._id, businessId };
  if (res.handoff) {
    await colOf(db, 'conversations').updateOne(id, { $set: { status: 'human', updatedAt: now }, $unset: { pending: '' } });
    const sentence = (profile && profile.assistant && profile.assistant.handoffText) || fixedText('fd_ai_handoff_default');
    const sent = await sendOut(db, conversation, { kind: 'text', text: sentence }, 'server', { now });
    if (!sent.ok) log.info({ event: 'frontdesk.turn.send_refused', reason: sent.reason, conversationId: conversation._id });
    return sent;
  }
  const set = { ...(res.set ?? {}), ...(res.pending && { pending: res.pending }), updatedAt: now };
  await colOf(db, 'conversations').updateOne(id, { $set: set, ...(res.clear && !res.pending && { $unset: { pending: '' } }) });
  const sent = await sendOut(db, conversation, res.outbound, 'server', { now });
  if (!sent.ok) log.info({ event: 'frontdesk.turn.send_refused', reason: sent.reason, conversationId: conversation._id });
  return sent;
}

const expired = () => ({ outbound: text('fd_ai_expired'), clear: true });

/** A tap, with no model call: only for a bot conversation at level 1 or 2 of a business with table service. */
async function onTap(db, conversation, at, fn) {
  const conv = await loadConversation(db, conversation.businessId, conversation._id);
  if (!conv || conv.status !== 'bot') return;
  const tables = await tablesFor(db, conv.businessId);
  if (!tables || levelOf(tables.profile) < 1) return;
  const res = await fn(conv, tables);
  if (!res) return;
  await deliver(db, conv, res, { now: at, profile: tables.profile });
}

const offerOf = (conv, token, at) => {
  const p = conv.pending;
  if (!fresh(p, 'book', at)) return null;
  const o = Array.isArray(p.data.offers) ? p.data.offers[Number(token) - 1] : null;
  return o ? { ...dataOf(p.data), date: o.date, time: o.time } : null;
};

const tapOk = (db, { conversation, token, at }) => onTap(db, conversation, at, async (conv, tables) => {
  const ask = offerOf(conv, token, at);
  if (!ask) {
    logger.info({ event: 'frontdesk.table.expired' });
    return expired();
  }
  return confirm(db, conv, ask, tables, { now: at, log: logger });
});

const tapOther = (db, { conversation, at }) => onTap(db, conversation, at, async conv => {
  if (!fresh(conv.pending, 'book', at)) {
    logger.info({ event: 'frontdesk.table.expired' });
    return expired();
  }
  const { time: _t, offers: _o, ...data } = conv.pending.data;
  return { outbound: text('fd_ai_ask_time'), pending: bookPending(data, at) };
});

const tapBooking = (db, { conversation, token, at }) => onTap(db, conversation, at, async (conv, tables) => {
  const p = conv.pending;
  if (!p || (p.kind !== 'change' && p.kind !== 'cancel') || at - p.at >= EXPIRE_MS) {
    logger.info({ event: 'frontdesk.table.expired' });
    return expired();
  }
  const id = Array.isArray(p.data.bookingIds) ? p.data.bookingIds[Number(token) - 1] : undefined;
  const booking = id && await colOf(db, 'bookings').findOne({
    _id: id, businessId: conv.businessId, clientId: conv.clientId, kind: 'table', status: 'confirmed', endAt: { $gt: at }, ...LIVE,
  });
  if (!booking) return handoffRes();
  return act(db, p.kind, booking, p.data.table, tables, { now: at, log: logger });
});

/** Registers the four buttons of the table dialogue (called at load; tests call it again after `resetInboundForTest`). */
function registerTableButtons(register = registerButton) {
  register('OK', tapOk);
  register('ALT', tapOk);
  register('OTHER', tapOther);
  register('BK', tapBooking);
}
registerTableButtons();

module.exports = { tablesFor, handleTableIntent, deliver, registerTableButtons, EXPIRE_MS };
