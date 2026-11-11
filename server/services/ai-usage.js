'use strict';
/**
 * The AI usage ledger (plan 566, C-AIUSAGE): one `aiUsage` row per real Gemini HTTP call.
 * Never stores prompt text, reply text or phone. Writes are fire-and-forget: a failed insert
 * is logged and never changes the AI action's result.
 */
const mongoose = require('mongoose');
const { AI_PRICES } = require('../constants/ai-prices');
const { jerusalemDate } = require('../middleware/usage');

const COLLECTION = 'aiUsage';
const pending = new Set();
const warnedNoPrice = new Set();

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function estimateCostUsd(model, inputTokens, outputTokens, log) {
  const price = AI_PRICES[model];
  if (!price) {
    if (!warnedNoPrice.has(model)) {
      warnedNoPrice.add(model);
      log?.warn?.({ event: 'ai.usage.no_price', model });
    }
    return 0;
  }
  return round6((inputTokens * price.inputPerMTok + outputTokens * price.outputPerMTok) / 1e6);
}

function countImages(body) {
  let n = 0;
  const contents = Array.isArray(body?.contents) ? body.contents : [];
  for (const c of contents) {
    for (const p of Array.isArray(c?.parts) ? c.parts : []) {
      const mime = p?.inlineData?.mimeType;
      if (typeof mime === 'string' && mime.startsWith('image/')) n += 1;
    }
  }
  return n;
}

function buildRow({ usage, model, ok, errorCode, data, body, latencyMs, log }) {
  const meta = data?.usageMetadata ?? {};
  const inputTokens = meta.promptTokenCount ?? 0;
  const outputTokens = (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0);
  const totalTokens = meta.totalTokenCount ?? inputTokens + outputTokens;
  const at = Date.now();
  const row = {
    businessId: usage.businessId ?? '__platform__',
    feature: usage.feature,
    model,
    ok: !!ok,
    inputTokens,
    outputTokens,
    totalTokens,
    latencyMs,
    estCostUsd: estimateCostUsd(model, inputTokens, outputTokens, log),
    at,
    day: jerusalemDate(at),
  };
  if (usage.userId) row.userId = usage.userId;
  if (errorCode) row.errorCode = errorCode;
  const images = countImages(body);
  if (images > 0) row.imageCount = images;
  return row;
}

/** Fire-and-forget: builds and inserts the row; never throws, never awaited by callGemini. */
function recordAiUsage(args) {
  const { usage, model, log } = args;
  let promise;
  try {
    promise = mongoose.connection.db.collection(COLLECTION).insertOne(buildRow(args));
  } catch (err) {
    promise = Promise.reject(err);
  }
  const tracked = Promise.resolve(promise)
    .catch(() => {
      try {
        log?.warn?.({ event: 'ai.usage.write_failed', feature: usage?.feature, model });
      } catch {
        // logging must not throw
      }
    })
    .finally(() => pending.delete(tracked));
  pending.add(tracked);
  return tracked;
}

async function _waitForUsageWritesForTests() {
  while (pending.size > 0) await Promise.all([...pending]);
}

/** Totals per group key over `day` in [from, to]; `groupBy=business` adds the business name. */
async function aggregateAiUsage(db, { from, to, groupBy, businessId }) {
  const field = { business: '$businessId', feature: '$feature', model: '$model', day: '$day' }[groupBy];
  const match = { day: { $gte: from, $lte: to } };
  if (businessId) match.businessId = businessId;
  const groups = await db.collection(COLLECTION).aggregate([
    { $match: match },
    { $group: {
      _id: field,
      calls: { $sum: 1 },
      failedCalls: { $sum: { $cond: [{ $eq: ['$ok', false] }, 1, 0] } },
      inputTokens: { $sum: '$inputTokens' },
      outputTokens: { $sum: '$outputTokens' },
      totalTokens: { $sum: '$totalTokens' },
      estCostUsd: { $sum: '$estCostUsd' },
    } },
    { $sort: { estCostUsd: -1, _id: 1 } },
  ]).toArray();

  let names = new Map();
  if (groupBy === 'business' && groups.length) {
    const biz = await db.collection('businesses')
      .find({ _id: { $in: groups.map(g => g._id) } }, { projection: { name: 1 } }).toArray();
    names = new Map(biz.map(b => [b._id, b.name]));
  }
  const totals = { calls: 0, failedCalls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, estCostUsd: 0 };
  const rows = groups.map((g) => {
    const row = { key: g._id };
    if (groupBy === 'business') row.label = names.get(g._id) ?? g._id;
    row.calls = g.calls;
    row.failedCalls = g.failedCalls;
    row.inputTokens = g.inputTokens;
    row.outputTokens = g.outputTokens;
    row.totalTokens = g.totalTokens;
    row.estCostUsd = round6(g.estCostUsd);
    for (const k of Object.keys(totals)) totals[k] += row[k];
    return row;
  });
  totals.estCostUsd = round6(totals.estCostUsd);
  return { rows, totals };
}

module.exports = { estimateCostUsd, recordAiUsage, aggregateAiUsage, _waitForUsageWritesForTests };
