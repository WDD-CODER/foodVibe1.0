'use strict';
// Plan 637 (C-STOCK): a spoken or typed stock count → a draft of count lines. Never writes a count: the person saves
// it through /api/v1/stock/counts, and finalise confirms the draft so the accuracy can be measured.
// ai.js requires this file before it sets its own module.exports, so respondFromGeminiFailure, usageOf, requestedModel
// and aiLimiter are read with require('../ai') INSIDE a handler (or the lazy limit below), never at the top of this file.
const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken } = require('../../middleware/auth');
const { callGemini, responseText } = require('../../services/gemini-client');
const { extractJsonPayload } = require('../../services/ai-recipe-helpers');
const { saveAiDraft } = require('../../services/ai-drafts');
const { scopeFilter, readScope } = require('../../utils/business-scope');
const { assertCan } = require('../../utils/permissions');
const { loadUnitRates } = require('../../utils/unit-rates');
const { LIVE } = require('../../jobs/purge-deleted');
const {
  STOCK_EXTRACT_SYSTEM_PROMPT, unitList, userPart, cleanStockLines,
} = require('../../utils/stock-extract');
const {
  stockExtractRequestSchema,
} = require('../../generated/schemas/ai-stock-extract.schema');

const router = Router();

const limit = (req, res, next) => require('../ai').aiLimiter(req, res, next);

router.post('/extract', verifyToken, limit, async (req, res) => {
  const { usageOf, requestedModel, respondFromGeminiFailure } = require('../ai');
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI generation is not configured on this server' });
  }
  const body = stockExtractRequestSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_REQUEST' });
  const { text, fileId } = body.data;

  try {
    if (!assertCan(req, res, 'create', { type: 'stockCounts' })) return;
    const db = mongoose.connection.db;
    const found = await db.collection('products')
      .find({ ...scopeFilter(req), ...LIVE }, { projection: { nameHebrew: 1, baseUnit: 1, purchaseOptions: 1, minStockLevel: 1 } })
      .toArray();
    if (found.length === 0) return res.json({ draftId: null, lines: [], unmatched: [] });
    const products = found.sort((a, b) =>
      String(a.nameHebrew ?? '').localeCompare(String(b.nameHebrew ?? '')) || String(a._id).localeCompare(String(b._id)));

    // Plan 650: a product counted before ranks above an equal-scoring one.
    const countedRows = await db.collection('stockCounts').aggregate([
      { $match: { ...scopeFilter(req), ...LIVE } },
      { $unwind: '$lines' },
      { $group: { _id: '$lines.productId' } },
    ]).toArray();
    const countedIds = new Set(countedRows.map(r => String(r._id)));

    const rates = await loadUnitRates(req);
    const terms = await db.collection('taxonomyTerms')
      .find({ ...readScope(req, 'taxonomyTerms'), kind: 'unit', ...LIVE }, { projection: { key: 1 } })
      .toArray();
    const units = unitList(products, terms.map(t => t.key));

    const call = await callGemini({
      body: {
        system_instruction: { parts: [{ text: STOCK_EXTRACT_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPart(units, text) }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8192 },
      },
      timeoutMs: 30000,
      log: req.log,
      eventPrefix: 'ai.stock_extract',
      usage: { ...usageOf(req), feature: 'stock_extract' },
      model: requestedModel(req),
    });
    if (call.kind !== 'ok') return respondFromGeminiFailure(res, call);

    const raw = responseText(call.data);
    const payload = extractJsonPayload(raw);
    const cleaned = payload.error ? null : cleanStockLines(payload.value, products, units, rates, countedIds, text);
    if (!cleaned) {
      // Length only: the raw answer repeats the product names and the count text.
      req.log.error({ event: 'ai.stock_extract.parse_failed', rawLength: raw.length });
      return res.status(502).json({ error: 'Gemini returned invalid JSON' });
    }
    const { lines, unmatched } = cleaned;

    const draftId = await saveAiDraft(req, {
      feature: 'stock_extract',
      subject: { type: 'stockCount' },
      input: { text, ...(fileId && { fileId }) },
      // Plan 654: the model's raw lines stay next to the cleaned answer, for tracing.
      aiDraft: { lines, unmatched, modelLines: payload.value.lines },
      model: call.model,
    });

    req.log.info({
      event: 'ai.stock_extract.done',
      products: products.length, units: units.length, textLength: text.length,
      lines: lines.length, unmatched: unmatched.length,
    });
    res.json({ draftId, lines, unmatched });
  } catch (err) {
    req.log.error({ err, event: 'ai.stock_extract.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
