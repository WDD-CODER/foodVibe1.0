'use strict';
/**
 * Plan 675 (C-CONV): the one way in. Every inbound message, from the simulator or a phone, goes through
 * `handleInbound`: idempotent on `providerMessageId`, finds the guest by phone (R-01), keeps one live conversation,
 * stores the message, keeps the 24-hour window, runs a registered button handler, or waits (R-03) and calls the turn handler.
 * Logs carry ids and booleans only — never the text, the name or the phone.
 */
const { newId } = require('../utils/id');
const { logger } = require('../logger');
const { upsertClientByPhone } = require('../utils/client-upsert');
const { checkStoredDoc } = require('../middleware/validate');
const { channelFor, defaultActor } = require('./channels');
const { findOrCreateConversation, loadConversation } = require('./conversations');

const COALESCE_MS = 6000;
const DAY_MS = 86400000;
const HUMAN_IDLE_MS = 2 * 60 * 60 * 1000;

const defaultWait = ms => new Promise(resolve => { setTimeout(resolve, ms).unref(); });
const defaultTurn = async (db, conversation) => {
  await db.collection('conversations').updateOne(
    { _id: conversation._id, businessId: conversation.businessId },
    { $set: { status: 'human', updatedAt: Date.now() } }
  );
};

let wait = defaultWait;
let turnHandler = defaultTurn;
const buttons = new Map();

function registerButton(prefix, handler) { buttons.set(prefix, handler); }
function setTurnHandler(fn) { turnHandler = fn; }
function setWaitForTest(fn) { wait = fn; }
function resetInboundForTest() {
  wait = defaultWait; turnHandler = defaultTurn; buttons.clear();
  require('./booking-buttons').registerBookingButtons(registerButton);
}

/** Why a `human` conversation may go back to the assistant on a guest message (plan 719), or null. */
async function backReason(db, conversation, now) {
  let why;
  if (conversation.assistantFailed && !conversation.assignedTo) why = 'failed';
  else if (conversation.assignedTo && typeof conversation.heldAt === 'number' && conversation.heldAt < now - HUMAN_IDLE_MS) why = 'idle';
  else return null;
  const client = await db.collection('clients').findOne(
    { _id: conversation.clientId, businessId: conversation.businessId }, { projection: { doNotContact: 1 } }
  );
  return client && client.doNotContact ? null : why;
}

/** Plan 719: one conditional move human -> bot, written before the R-03 wait. True when it moved. */
async function backToBot(db, conversation, { now, log }) {
  const why = await backReason(db, conversation, now);
  if (!why) return false;
  const done = await db.collection('conversations').updateOne(
    { _id: conversation._id, businessId: conversation.businessId, status: 'human' },
    { $set: { status: 'bot', updatedAt: now }, $unset: { assignedTo: '', heldAt: '', suggestion: '' } }
  );
  if (!done.matchedCount) return false;
  log.info({ event: 'inbound.back_to_bot', conversationId: conversation._id, why });
  return true;
}

/** Plan 719: runs the turn for a guest message that waits for an answer (hand back); no R-03 wait. */
async function answerWaiting(db, conversation, { log = logger } = {}) {
  const [newest] = await db.collection('messages')
    .find({ businessId: conversation.businessId, conversationId: conversation._id })
    .sort({ at: -1, _id: -1 }).limit(1).toArray();
  if (!newest || newest.direction !== 'in' || newest.author !== 'guest') return undefined;
  return turnHandler(db, conversation, { log });
}

async function afterStored(db, conversation, { buttonId, at }, log) {
  if (buttonId) {
    const i = buttonId.indexOf(':');
    const prefix = i < 0 ? buttonId : buttonId.slice(0, i);
    const handler = buttons.get(prefix);
    if (handler) {
      await handler(db, { conversation, token: i < 0 ? '' : buttonId.slice(i + 1), at });
      return;
    }
  }
  if (conversation.status === 'human') {
    // A second guest message of a burst can lose the race to move the conversation back: read the status again,
    // so the message still waits and the burst gets its one turn.
    const moved = await backToBot(db, conversation, { now: Date.now(), log })
      || (await loadConversation(db, conversation.businessId, conversation._id))?.status === 'bot';
    if (moved) conversation = { ...conversation, status: 'bot' };
  }
  if (conversation.status !== 'bot') return;
  await wait(COALESCE_MS);
  const fresh = await loadConversation(db, conversation.businessId, conversation._id);
  if (!fresh || fresh.status !== 'bot' || fresh.lastInboundAt > at) {
    log.info({ event: 'inbound.coalesced', conversationId: conversation._id });
    return;
  }
  await turnHandler(db, fresh, { log });
}

async function handleInbound(db, input, { log = logger } = {}) {
  const { businessId, channel, waId, guestName, text, buttonId, providerMessageId, at, actor } = input;
  const messages = db.collection('messages');
  const duplicateAnswer = async () => {
    const m = await messages.findOne({ businessId, providerMessageId });
    log.info({ event: 'inbound.stored', duplicate: true });
    return { ok: true, duplicate: true, conversationId: m.conversationId, messageId: m._id, settled: Promise.resolve() };
  };
  if (await messages.findOne({ businessId, providerMessageId })) return duplicateAnswer();

  const transport = channelFor({ channel });
  const test = !transport.real;
  const { client, created: clientCreated } = await upsertClientByPhone(db, businessId, {
    name: guestName || waId, phone: waId, source: transport.clientSource, actor: actor ?? defaultActor(),
  });
  if (test && clientCreated) {
    await db.collection('clients').updateOne({ _id: client._id, businessId }, { $set: { tags: ['test'], kinds: ['lead'] } });
  }
  const { conversation, created } = await findOrCreateConversation(db, {
    businessId, channel, waId, clientId: client._id, at, test,
  });
  const row = {
    _id: newId(), businessId, conversationId: conversation._id, direction: 'in', author: 'guest',
    kind: buttonId ? 'button' : 'text', text: text ?? '', ...(buttonId && { buttonId }),
    at, providerMessageId, status: 'delivered', ...(test && { test: true }),
  };
  const check = checkStoredDoc('messages', row);
  if (!check.ok) throw Object.assign(new Error('BAD_MESSAGE'), { code: 'BAD_MESSAGE', issues: check.issues });
  try {
    await messages.insertOne(row);
  } catch (err) {
    if (err && err.code === 11000) return duplicateAnswer();
    throw err;
  }
  await db.collection('conversations').updateOne(
    { _id: conversation._id, businessId },
    // $max: two messages stored at the same time may write in either order; the newest time must win (R-03 coalescing).
    { $max: { lastInboundAt: at, lastMessageAt: at, windowExpiresAt: at + DAY_MS, updatedAt: at }, $inc: { unread: 1 } }
  );
  log.info({ event: 'inbound.stored', kind: row.kind, created, duplicate: false });

  const settled = afterStored(db, { ...conversation, lastInboundAt: at }, { buttonId, at }, log).catch(async err => {
    log.warn({ event: 'inbound.turn.failed', conversationId: conversation._id, errName: err && err.name });
    await db.collection('conversations').updateOne(
      { _id: conversation._id, businessId }, { $set: { status: 'human', updatedAt: Date.now() } }
    ).catch(() => {});
  });
  return { ok: true, conversationId: conversation._id, messageId: row._id, settled };
}

module.exports = { handleInbound, registerButton, setTurnHandler, setWaitForTest, resetInboundForTest, COALESCE_MS, HUMAN_IDLE_MS, answerWaiting };

require('./booking-buttons').registerBookingButtons(registerButton);
