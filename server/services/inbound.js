'use strict';
/**
 * Plan 675 (C-CONV): the one way in. Every inbound message, from the simulator or a phone, goes through
 * `handleInbound`: idempotent on `providerMessageId`, finds the guest by phone (R-01), keeps one live conversation,
 * stores the message, keeps the 24-hour window, runs a registered button handler, or waits (R-03) and calls the turn handler.
 * Plan 753 (R-26): a message that arrives while a run holds the conversation's lease starts no run; it is noted on the
 * lease and the run answers it in a follow-up.
 * Logs carry ids and booleans only — never the text, the name or the phone.
 */
const { newId } = require('../utils/id');
const { logger } = require('../logger');
const { upsertClientByPhone } = require('../utils/client-upsert');
const { checkStoredDoc } = require('../middleware/validate');
const { channelFor, defaultActor } = require('./channels');
const { findOrCreateConversation, loadConversation } = require('./conversations');
const { leaseLive, noteWaiting } = require('./frontdesk-lease');

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

/** The wait before a turn; a follow-up run waits through it too, so `setWaitForTest` covers both. */
const waitFor = ms => wait(ms);

/**
 * Plan 753 (R-26): the one place that decides what a guest message does next — start a run, wait, or leave it to the
 * run that is working. Plan 754 changes the timing here and nowhere else.
 * `at` is the message's time, `waited` says the burst wait is over, `holder` is the run that already holds the lease
 * and is about to start a follow-up. Pure.
 */
function nextStep({ conversation, at, now, waited, holder = false }) {
  if (!conversation || conversation.status !== 'bot') return { do: 'stop', why: 'not_bot' };
  if (!holder && leaseLive(conversation, now)) return { do: 'leave', why: 'running' };
  if (!holder && waited && conversation.lastInboundAt > at) return { do: 'leave', why: 'newer' };
  if (!waited) return { do: 'wait', ms: holder ? Math.max(0, COALESCE_MS - Math.max(0, now - at)) : COALESCE_MS };
  return { do: 'run' };
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
  return turnHandler(db, conversation, { log, messageId: newest._id });
}

/** Notes the message on the live lease; true when the working run will answer it, so this message starts nothing. */
async function leftToRun(db, conversation, messageId, log) {
  if (!await noteWaiting(db, conversation, messageId, Date.now())) return false;
  log.info({ event: 'inbound.left_to_run', conversationId: conversation._id });
  return true;
}

async function afterStored(db, conversation, { buttonId, at, messageId }, log) {
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
  let step = nextStep({ conversation, at, now: Date.now(), waited: false });
  if (step.do === 'stop') return;
  // A lease that ended between the read and the note takes none: this message goes on as any other.
  if (step.do === 'leave' && await leftToRun(db, conversation, messageId, log)) return;
  const waitStarted = Date.now();
  await wait(COALESCE_MS);
  const waitedMs = Date.now() - waitStarted;
  const fresh = await loadConversation(db, conversation.businessId, conversation._id);
  step = nextStep({ conversation: fresh, at, now: Date.now(), waited: true });
  if (step.do === 'stop' || step.why === 'newer') {
    log.info({ event: 'inbound.coalesced', conversationId: conversation._id });
    return;
  }
  if (step.why === 'running' && await leftToRun(db, fresh, messageId, log)) return;
  // Plan 752: the turn's run record shows how long this message waited for a second one.
  await turnHandler(db, fresh, { log, inbound: { at, waitedMs }, messageId });
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

  const stored = { ...conversation, lastInboundAt: at };
  const settled = afterStored(db, stored, { buttonId, at, messageId: row._id }, log).catch(async err => {
    log.warn({ event: 'inbound.turn.failed', conversationId: conversation._id, errName: err && err.name });
    await db.collection('conversations').updateOne(
      { _id: conversation._id, businessId }, { $set: { status: 'human', updatedAt: Date.now() } }
    ).catch(() => {});
  });
  return { ok: true, conversationId: conversation._id, messageId: row._id, settled };
}

module.exports = {
  handleInbound, registerButton, setTurnHandler, setWaitForTest, resetInboundForTest, COALESCE_MS, HUMAN_IDLE_MS,
  answerWaiting, nextStep, waitFor,
};

require('./booking-buttons').registerBookingButtons(registerButton);
