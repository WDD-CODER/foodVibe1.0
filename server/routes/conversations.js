'use strict';
/**
 * Plan 687 (C-CONV, routes part): what a member does with the guests' conversations — the list, one thread, a reply,
 * take over, hand back and close. Both conversation collections are server-only (map delta 11), so guest message text
 * has this one read path. The business always comes from the signed token. Logs carry ids, counts and enums only.
 */
const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken } = require('../middleware/auth');
const { requireModule } = require('../middleware/require-module');
const { dataWriteLimiter } = require('../middleware/write-limit');
const { scopeFilter } = require('../utils/business-scope');
const { assertCan } = require('../utils/permissions');
const { actorOf } = require('../utils/actor');
const { logger } = require('../logger');
const { listConversations, loadConversation, closeConversation } = require('../services/conversations');
const { sendOut } = require('../services/outbound');
const { answerWaiting } = require('../services/inbound');
const { clearLease } = require('../services/frontdesk-lease');
const { MESSAGE_TEMPLATES, MESSAGE_TEMPLATE_NAMES, templateMessage } = require('../generated/schemas/front-desk/message-templates');

const router = Router();
const db = () => mongoose.connection.db;
const NOT_FOUND = { error: 'Conversation not found' };
const TEXT_MAX = 4000;
const LIST_DEFAULT = 50;
const LIST_MAX = 100;
const THREAD_MAX = 200;
const STATUS_QUERY = ['open', 'bot', 'human', 'closed'];
const REFUSAL_STATUS = { DO_NOT_CONTACT: 409, WINDOW_CLOSED: 409, NOT_LIVE: 409, TEST_ONLY: 409, BAD_TEMPLATE: 400, SEND_FAILED: 502 };

const logOf = req => req.log || logger;
const isString = v => typeof v === 'string';
const badInput = res => res.status(400).json({ error: 'BAD_INPUT' });
const badStatus = res => res.status(409).json({ error: 'BAD_STATUS' });
const failed = (req, res, event, err) => {
  logOf(req).error({ err, event });
  return res.status(500).json({ error: 'Server error' });
};

/** A query number: a finite integer inside [min, max], or `undefined` when absent, `null` when malformed. */
function queryInt(v, min, max) {
  if (v === undefined) return undefined;
  if (!isString(v) || !/^\d{1,16}$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

router.use(verifyToken, requireModule('frontdesk'), dataWriteLimiter);

/** Reads the conversation of a `/:id` route for the caller's business and authorizes it; sends the 404 / 403 and returns null otherwise. */
async function loadFor(req, res) {
  const doc = await db().collection('conversations').findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!doc) { res.status(404).json(NOT_FOUND); return null; }
  if (!assertCan(req, res, 'manageConversations', { type: 'conversations', doc })) return null;
  return doc;
}

router.get('/', async (req, res) => {
  try {
    const { businessId } = scopeFilter(req);
    if (!assertCan(req, res, 'manageConversations', { type: 'conversations' })) return;
    const status = req.query.status === undefined ? 'open' : req.query.status;
    if (!STATUS_QUERY.includes(status)) return badInput(res);
    const limit = queryInt(req.query.limit, 1, LIST_MAX);
    const before = queryInt(req.query.before, 0, Number.MAX_SAFE_INTEGER);
    if (limit === null || before === null) return badInput(res);
    const conversations = await listConversations(db(), businessId, {
      status, test: req.query.test === '1', limit: limit === undefined ? LIST_DEFAULT : limit, before,
    });
    logOf(req).info({ event: 'conversations.listed', count: conversations.length });
    return res.json({ conversations, now: Date.now() });
  } catch (err) {
    return failed(req, res, 'conversations.list.failed', err);
  }
});

router.get('/:id/messages', async (req, res) => {
  try {
    const conversation = await loadFor(req, res);
    if (!conversation) return;
    const before = queryInt(req.query.before, 0, Number.MAX_SAFE_INTEGER);
    if (before === null) return badInput(res);
    const filter = { businessId: conversation.businessId, conversationId: conversation._id, ...(before !== undefined && { at: { $lt: before } }) };
    const newest = await db().collection('messages').find(filter).sort({ at: -1 }).limit(THREAD_MAX).toArray();
    const messages = newest.reverse();
    let shown = conversation;
    if (req.query.peek !== '1') {
      try {
        await db().collection('conversations').updateOne({ _id: conversation._id, businessId: conversation.businessId }, { $set: { unread: 0 } });
        shown = { ...conversation, unread: 0 };
      } catch (err) {
        logOf(req).warn({ err, event: 'conversations.unread.failed', conversationId: conversation._id });
      }
    }
    logOf(req).info({ event: 'conversations.read', count: messages.length });
    return res.json({ conversation: shown, messages, now: Date.now() });
  } catch (err) {
    return failed(req, res, 'conversations.read.failed', err);
  }
});

/** The outbound message of a reply body, or `{ error }` (400 code). */
function outboundOf(body) {
  const { text, template } = body || {};
  if ((text === undefined) === (template === undefined)) return { error: 'BAD_INPUT' };
  if (text !== undefined) {
    if (!isString(text)) return { error: 'BAD_INPUT' };
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > TEXT_MAX) return { error: 'BAD_INPUT' };
    return { outbound: { kind: 'text', text: trimmed } };
  }
  if (!template || typeof template !== 'object' || Array.isArray(template) || !isString(template.name)) return { error: 'BAD_INPUT' };
  const values = template.values === undefined ? {} : template.values;
  if (!values || typeof values !== 'object' || Array.isArray(values) || !Object.values(values).every(isString)) return { error: 'BAD_INPUT' };
  if (!MESSAGE_TEMPLATE_NAMES.includes(template.name)) return { error: 'BAD_TEMPLATE' };
  if (MESSAGE_TEMPLATES[template.name].buttons) return { error: 'BAD_TEMPLATE' };
  try {
    return { outbound: { kind: 'template', template: templateMessage(template.name, values) } };
  } catch {
    return { error: 'BAD_TEMPLATE' };
  }
}

router.post('/:id/messages', async (req, res) => {
  try {
    const conversation = await loadFor(req, res);
    if (!conversation) return;
    const built = outboundOf(req.body);
    if (built.error) return res.status(400).json({ error: built.error });
    if (conversation.status === 'closed') return badStatus(res);
    const actor = actorOf(req);
    // Plan 753 (R-27): before the send, so a working assistant run cannot answer while the member's message is on its way.
    if (conversation.status === 'bot' && await clearLease(db(), conversation)) {
      logOf(req).info({ event: 'conversations.run_cancelled', by: 'reply' });
    }
    const result = await sendOut(db(), conversation, built.outbound, 'member', { memberId: actor.userId });
    if (!result.ok) return res.status(REFUSAL_STATUS[result.reason] || 409).json({ error: result.reason });
    const heldAt = Date.now();
    if (conversation.status === 'bot') {
      await db().collection('conversations').updateOne(
        { _id: conversation._id, businessId: conversation.businessId, status: 'bot' },
        { $set: { status: 'human', assignedTo: actor.userId, heldAt, updatedAt: heldAt } }
      );
    } else if (conversation.status === 'human') {
      await db().collection('conversations').updateOne(
        { _id: conversation._id, businessId: conversation.businessId, status: 'human' }, { $set: { heldAt } }
      );
    }
    logOf(req).info({ event: 'conversations.replied', kind: built.outbound.kind });
    return res.status(201).json({ message: result.message, conversation: await loadConversation(db(), conversation.businessId, conversation._id) });
  } catch (err) {
    return failed(req, res, 'conversations.reply.failed', err);
  }
});

/** One move, conditional on the status that was read; a lost race or a move that does not apply is 409 BAD_STATUS. */
async function move(req, res, allowedFrom, to, apply, after) {
  try {
    const conversation = await loadFor(req, res);
    if (!conversation) return;
    if (!allowedFrom.includes(conversation.status)) return badStatus(res);
    const { _id, businessId } = conversation;
    const now = Date.now();
    let updated;
    if (to === 'closed') {
      const claimed = await db().collection('conversations').findOne({ _id, businessId, status: conversation.status });
      if (!claimed) return badStatus(res);
      updated = await closeConversation(db(), businessId, _id, now);
      await db().collection('conversations').updateOne({ _id, businessId }, { $unset: { suggestion: '' } });
      delete updated.suggestion;
    } else {
      const done = await db().collection('conversations').updateOne({ _id, businessId, status: conversation.status }, { ...apply(req, now) });
      if (!done.matchedCount) return badStatus(res);
      updated = await loadConversation(db(), businessId, _id);
    }
    logOf(req).info({ event: 'conversations.moved', from: conversation.status, to });
    res.json({ conversation: updated });
    if (after) after(req, updated);
    return;
  } catch (err) {
    return failed(req, res, 'conversations.move.failed', err);
  }
}

router.put('/:id/takeover', (req, res) => move(req, res, ['bot', 'human'], 'human',
  // Plan 753 (R-27): a take over removes the lease of a working run.
  (r, now) => ({ $set: { status: 'human', assignedTo: actorOf(r).userId, heldAt: now, updatedAt: now }, $unset: { run: '' } })));
router.put('/:id/release', (req, res) => move(req, res, ['human'], 'bot',
  (_r, now) => ({ $set: { status: 'bot', updatedAt: now }, $unset: { assignedTo: '', heldAt: '', suggestion: '' } }),
  (r, updated) => {
    const log = logOf(r);
    answerWaiting(db(), updated, { log }).catch(err => {
      log.warn({ event: 'conversations.release.turn_failed', conversationId: updated._id, errName: err && err.name });
    });
  }));
router.put('/:id/close', (req, res) => move(req, res, ['bot', 'human'], 'closed'));

module.exports = router;
