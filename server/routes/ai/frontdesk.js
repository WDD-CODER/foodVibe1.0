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
const { callGemini, responseText } = require('../../services/gemini-client');
const { extractJsonPayload } = require('../../services/ai-recipe-helpers');
const { scopeFilter } = require('../../utils/business-scope');
const { assertCan } = require('../../utils/permissions');
const { turnAnswerSchema } = require('../../generated/schemas/front-desk/turn-answer.schema');
const { runTurn } = require('../../services/frontdesk-turn');
const { knowledgeImportItemSchema } = require('../../generated/schemas/entities');
const { checkStoredDoc, badRequest } = require('../../middleware/validate');
const { newId } = require('../../utils/id');
const { buildCorrectionBody } = require('../../services/knowledge-correction-prompt');

const router = Router();

/**
 * One model call. `{ ok: true, answer }` or `{ ok: false, reason }`; `reason` is the failure kind of `callGemini`,
 * `bad_json` or `bad_shape`. Never throws.
 */
async function askTurnModel({ body, usage, log }) {
  // Plan 701: no user is there to pick another model, so an overloaded model moves on to the next free one.
  const call = await callGemini({
    body, timeoutMs: 15000, deadlineMs: 35000, fallback: true, log, eventPrefix: 'frontdesk.turn', usage,
  });
  if (call.kind !== 'ok') return { ok: false, reason: call.kind, status: call.status };
  const payload = extractJsonPayload(responseText(call.data));
  if (payload.error) return { ok: false, reason: 'bad_json' };
  const parsed = turnAnswerSchema.safeParse(payload.value);
  if (!parsed.success) return { ok: false, reason: 'bad_shape' };
  return { ok: true, answer: parsed.data };
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
