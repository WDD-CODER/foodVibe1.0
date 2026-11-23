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

const router = Router();

/**
 * One model call. `{ ok: true, answer }` or `{ ok: false, reason }`; `reason` is the failure kind of `callGemini`,
 * `bad_json` or `bad_shape`. Never throws.
 */
async function askTurnModel({ body, usage, log }) {
  const call = await callGemini({ body, timeoutMs: 20000, log, eventPrefix: 'frontdesk.turn', usage });
  if (call.kind !== 'ok') return { ok: false, reason: call.kind };
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
    if (!result || !result.ok) return res.status(502).json({ error: 'AI_FAILED' });
    return res.json({ suggestion: result.suggestion });
  } catch (err) {
    req.log.error({ err, event: 'frontdesk.suggest.failed' });
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.askTurnModel = askTurnModel;
