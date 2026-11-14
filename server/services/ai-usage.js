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
const pendingById = new Map();

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
    _id: new mongoose.Types.ObjectId(),
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
  if (ok) row.outcome = 'accepted';
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
  let rowId;
  try {
    const row = buildRow(args);
    rowId = row._id;
    if (Array.isArray(usage?.ids)) usage.ids.push(row._id);
    promise = mongoose.connection.db.collection(COLLECTION).insertOne(row);
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
    .finally(() => {
      pending.delete(tracked);
      if (rowId) pendingById.delete(String(rowId));
    });
  pending.add(tracked);
  if (rowId) pendingById.set(String(rowId), tracked);
  return tracked;
}

/** Plan 580: marks rows whose Gemini answer the route refused (ok stays true). Fire-and-forget. */
function markAiUsageRejected({ ids, code, log }) {
  if (!Array.isArray(ids) || ids.length === 0) return Promise.resolve();
  const tracked = (async () => {
    try {
      await Promise.all(ids.map(id => pendingById.get(String(id))).filter(Boolean));
      await mongoose.connection.db.collection(COLLECTION).updateMany(
        { _id: { $in: ids }, ok: true },
        { $set: { outcome: 'rejected', rejectCode: code } },
      );
    } catch {
      try {
        log?.warn?.({ event: 'ai.usage.outcome_failed', code });
      } catch {
        // logging must not throw
      }
    }
  })().finally(() => pending.delete(tracked));
  pending.add(tracked);
  return tracked;
}

/** Express middleware: ties the usage rows a request wrote to the route's final answer. */
function trackAiOutcome(req, res, next) {
  req.aiUsageIds = [];
  const origJson = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body.code === 'string') res.locals.aiRejectCode = body.code;
    return origJson(body);
  };
  res.on('finish', () => {
    const ids = req.aiUsageIds;
    if (!ids || ids.length === 0) return;
    if (res.statusCode >= 400) {
      markAiUsageRejected({ ids, code: res.locals.aiRejectCode ?? 'http_' + res.statusCode, log: req.log });
    } else if (ids.length > 1) {
      markAiUsageRejected({ ids: ids.slice(0, -1), code: 'retried', log: req.log });
    }
  });
  next();
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
      failedCalls: { $sum: { $cond: [{ $or: [{ $eq: ['$ok', false] }, { $eq: ['$outcome', 'rejected'] }] }, 1, 0] } },
      failReasons: { $push: { $cond: [{ $or: [{ $eq: ['$ok', false] }, { $eq: ['$outcome', 'rejected'] }] }, { $ifNull: ['$rejectCode', { $ifNull: ['$errorCode', 'unknown'] }] }, '$$REMOVE'] } },
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
    if (Array.isArray(g.failReasons) && g.failReasons.length) {
      row.failures = {};
      for (const r of g.failReasons) row.failures[r] = (row.failures[r] ?? 0) + 1;
    }
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

module.exports = { estimateCostUsd, recordAiUsage, markAiUsageRejected, trackAiOutcome, aggregateAiUsage, _waitForUsageWritesForTests };
