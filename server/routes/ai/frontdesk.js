'use strict';
/**
 * Plan 679 (C-AI, INV-6): the assistant's one model call, and the inbox's "suggest" route. `frontdesk-turn.js` calls
 * `askTurnModel` and never `callGemini` itself. This file requires the turn at its top so the turn handler is
 * registered with the inbound handler when the server starts.
 * ai.js requires this file before it sets its own module.exports, so `aiLimiter` is read with require('../ai')
 * INSIDE a handler, never at the top.
 */
const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken } = require('../../middleware/auth');
const { requireModule } = require('../../middleware/require-module');
const { createRateLimiter } = require('../../middleware/rate-limit');
const { callGemini, responseText, modelChain } = require('../../services/gemini-client');
const { RAW_MAX } = require('../../services/frontdesk-runs');
const { performance } = require('node:perf_hooks');
const { extractJsonPayload } = require('../../services/ai-recipe-helpers');
const { scopeFilter } = require('../../utils/business-scope');
const { assertCan } = require('../../utils/permissions');
const { turnAnswerSchema } = require('../../generated/schemas/front-desk/turn-answer.schema');
const { runTurn } = require('../../services/frontdesk-turn');
const { knowledgeImportItemSchema } = require('../../generated/schemas/entities');
const { checkStoredDoc, badRequest } = require('../../middleware/validate');
const { newId } = require('../../utils/id');
const { withShapeReminder } = require('../../services/frontdesk-prompt');
const { buildCorrectionBody } = require('../../services/knowledge-correction-prompt');
const { ENGINE_DEFAULTS, engineNow } = require('../../services/assistant-engine-settings');

const router = Router();

/** The default of the longest one turn may spend on the model (`turnBudgetMs`). */
const TURN_BUDGET_MS = ENGINE_DEFAULTS.turnBudgetMs;
const MIN_RETRY_MS = 2000; // the floor of plan 701's MIN_CALL_MS
// Plan 754 (R-30): the first model gets 6 s, then the next one is tried. From the simulator tests of 2026-11-23..25:
// 71 % of the first model's good answers came within 6 s; 13 % of its calls ran into the 15 s limit. Tune it from
// `aiUsage` (`errorCode: 'slow'`, `latencyMs`) — see plan 754, Technical Considerations. Plan 760: both limits are
// engine settings; these are their defaults.
const FIRST_MODEL_LIMIT_MS = ENGINE_DEFAULTS.firstModelMs;
const issuePaths = issues => issues.slice(0, 10).map(i => (i.path.length ? i.path.join('.') : '(root)'));
const issueCodes = issues => issues.slice(0, 10).map(i => i.code);

/**
 * One model call, and one retry on a malformed answer, inside one budget (`turnBudgetMs`). `{ ok: true, answer }` or
 * `{ ok: false, reason }`; `reason` is the failure kind of `callGemini`, `bad_json` or `bad_shape`. Never throws.
 * `trace` (plan 752) tells the run record which model answered, each try and the raw text; it never goes to a log.
 */
async function askTurnModel({ body, usage, log, engine = engineNow() }) {
  const { turnBudgetMs, firstModelMs } = engine;
  const startedAt = Date.now();
  const trace = { attempts: [], model: null, raw: '', rawChars: 0, shapeTries: 1 };
  const attempt = async (reqBody, deadlineMs, n) => {
    trace.shapeTries = n;
    const calledAt = performance.now();
    const before = trace.attempts.length;
    // Plan 701: no user is there to pick another model, so an overloaded model moves on to the next free one.
    // Plan 754: a slow first model does too; the trace gets one entry per HTTP call.
    const call = await callGemini({
      body: reqBody, timeoutMs: 15000, deadlineMs, fallback: true, log, eventPrefix: 'frontdesk.turn', usage,
      firstLimitMs: firstModelMs, onCall: c => trace.attempts.push({ ...c, try: n }),
    });
    // A refusal made no HTTP call (all exhausted, the business's cap, a removed model): it still shows as one entry.
    if (trace.attempts.length === before) {
      const ms = Math.round(performance.now() - calledAt);
      trace.attempts.push({ model: call.model ?? null, ms, ok: false, reason: call.kind, try: n });
    }
    if (call.kind !== 'ok') return { ok: false, reason: call.kind, status: call.status, retry: false };
    const text = String(responseText(call.data));
    Object.assign(trace, { model: call.model ?? null, raw: text.slice(0, RAW_MAX), rawChars: text.length });
    const payload = extractJsonPayload(text);
    if (payload.error) {
      log.warn({ event: 'frontdesk.turn.bad_answer', reason: 'bad_json', attempt: n, paths: [], codes: [] });
      return { ok: false, reason: 'bad_json', retry: true };
    }
    const parsed = turnAnswerSchema.safeParse(payload.value);
    if (!parsed.success) {
      log.warn({
        event: 'frontdesk.turn.bad_answer', reason: 'bad_shape', attempt: n,
        paths: issuePaths(parsed.error.issues), codes: issueCodes(parsed.error.issues),
      });
      return { ok: false, reason: 'bad_shape', retry: true };
    }
    return { ok: true, answer: parsed.data };
  };
  const strip = ({ retry: _retry, ...rest }) => ({ ...rest, trace: { ...trace, firstModel: modelChain()[0] ?? null } });
  const first = await attempt(body, turnBudgetMs, 1);
  if (!first.retry) return strip(first);
  const left = turnBudgetMs - (Date.now() - startedAt);
  if (left < MIN_RETRY_MS) return strip(first);
  return strip(await attempt(withShapeReminder(body), left, 2));
}

const suggestLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: req => `business:${req.user?.businessId}`,
  message: 'Too many suggestions, please try again later',
});

router.post('/suggest', verifyToken, requireModule('frontdesk'), suggestLimiter, async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI generation is not configured on this server' });
  }
  const id = req.body && req.body.conversationId;
  if (typeof id !== 'string' || !id) return res.status(400).json({ error: 'INVALID_REQUEST' });
  try {
    if (!assertCan(req, res, 'manageConversations', { type: 'conversations' })) return;
    const db = mongoose.connection.db;
    const conversation = await db.collection('conversations').findOne({ _id: id, ...scopeFilter(req) });
    if (!conversation) return res.status(404).json({ error: 'NOT_FOUND' });
    const result = await runTurn(db, conversation, { log: req.log, mode: 'suggest' });
    if (!result || !result.ok) return res.status(502).json({ error: 'AI_FAILED', reason: (result && result.group) || 'other' });
    return res.json({ suggestion: result.suggestion });
  } catch (err) {
    req.log.error({ err, event: 'frontdesk.suggest.failed' });
    return res.status(500).json({ error: 'Server error' });
  }
});

const FIX_ISSUES = ['wrong_info', 'missing_info', 'outdated', 'misunderstood', 'other'];
const FIX_ANSWER_MAX = 1200;
const nonEmpty = v => typeof v === 'string' && v.length > 0;

const fixLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: req => `business:${req.user?.businessId}`,
  message: 'Too many corrections, please try again later',
});

/** Plan 682 (R-14): a member's correction of a wrong assistant message becomes one draft knowledge item. */
router.post('/fix', verifyToken, requireModule('frontdesk'), fixLimiter, async (req, res) => {
  const { conversationId, messageId, issue } = req.body || {};
  const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim() : '';
  if (!nonEmpty(conversationId) || !nonEmpty(messageId) || !FIX_ISSUES.includes(issue)
    || answer.length < 1 || answer.length > FIX_ANSWER_MAX) {
    return badRequest(res, 'Validation failed');
  }
  try {
    if (!assertCan(req, res, 'manageConversations', { type: 'conversations' })) return;
    const db = mongoose.connection.db;
    const scope = scopeFilter(req);
    const conversation = await db.collection('conversations').findOne({ _id: conversationId, ...scope });
    if (!conversation) return res.status(404).json({ error: 'NOT_FOUND' });
    const message = await db.collection('messages').findOne({ _id: messageId, conversationId, ...scope });
    if (!message) return res.status(404).json({ error: 'NOT_FOUND' });
    if (message.author !== 'ai') return res.status(400).json({ error: 'NOT_AI_MESSAGE' });

    const guest = await db.collection('messages')
      .find({ conversationId, ...scope, direction: 'in', at: { $lte: message.at } })
      .sort({ at: -1 }).limit(1).toArray();
    const guestText = guest[0] && typeof guest[0].text === 'string' ? guest[0].text : '';

    let fields = null;
    if (process.env.GEMINI_API_KEY) {
      const body = buildCorrectionBody({ guestText, wrongText: message.text, answer, issue });
      const call = await callGemini({
        body, timeoutMs: 20000, deadlineMs: 35000, fallback: true, log: req.log, eventPrefix: 'frontdesk.fix',
        usage: { businessId: req.user.businessId, userId: req.user.userId, feature: 'knowledge_correction' },
      });
      if (call.kind === 'ok') {
        const payload = extractJsonPayload(responseText(call.data));
        const parsed = payload.error ? null : knowledgeImportItemSchema.safeParse(payload.value);
        if (parsed && parsed.success) fields = parsed.data;
      }
    }
    const drafted = !!fields;
    if (!fields) fields = { topic: 'faq', question: (guestText || answer).slice(0, 200), answer };

    const now = Date.now();
    const item = {
      _id: newId(), schemaVersion: 2, businessId: req.user.businessId, createdBy: req.user.userId,
      createdAt: now, updatedAt: now,
      topic: fields.topic, question: fields.question, answer: fields.answer,
      ...(fields.variations && fields.variations.length ? { variations: fields.variations } : {}),
      status: 'draft', source: 'correction', visibility: 'public',
    };
    if (!checkStoredDoc('knowledgeItems', item).ok) return badRequest(res, 'Validation failed');
    await db.collection('knowledgeItems').insertOne(item);
    req.log.info({
      event: 'frontdesk.fix', issue, drafted, conversationId, messageId,
      answerLength: answer.length, questionLength: item.question.length,
    });
    return res.json({ item, drafted });
  } catch (err) {
    req.log.error({ err, event: 'frontdesk.fix.failed' });
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.askTurnModel = askTurnModel;
module.exports.TURN_BUDGET_MS = TURN_BUDGET_MS;
module.exports.FIRST_MODEL_LIMIT_MS = FIRST_MODEL_LIMIT_MS;
