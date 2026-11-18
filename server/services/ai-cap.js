'use strict';
/**
 * The monthly AI cap per business (plan 617, C-AICAP). No second counter: the cap is an optional
 * `aiMonthlyTokenCap` on the business, compared with the sum of `totalTokens` in the `aiUsage` ledger for the
 * current Israel calendar month (the ledger's `day` field). `callGemini` asks `capState` before any request.
 *
 * The state is kept per business for 60 s. A capped business may therefore pass its cap by what it uses inside
 * that window, and by calls already in flight; that is accepted (C-AICAP allows the cache).
 * `capState` throws on a database error; the caller decides what that means.
 */
const { jerusalemDate } = require('../middleware/usage');

const TTL_MS = 60000;
const cache = new Map();

/** `{ from, to }` day strings (YYYY-MM-DD) covering the Israel month of `now`. */
function monthRangeOf(now) {
  const ym = jerusalemDate(now).slice(0, 7);
  return { from: `${ym}-01`, to: `${ym}-31` };
}

async function capState(db, businessId, now) {
  const { from } = monthRangeOf(now);
  const hit = cache.get(businessId);
  if (hit && hit.month === from && Date.now() - hit.at < TTL_MS) return hit.state;
  const { to } = monthRangeOf(now);
  const biz = await db.collection('businesses').findOne({ _id: businessId }, { projection: { aiMonthlyTokenCap: 1 } });
  const cap = typeof biz?.aiMonthlyTokenCap === 'number' ? biz.aiMonthlyTokenCap : null;
  const agg = await db.collection('aiUsage').aggregate([
    { $match: { businessId, day: { $gte: from, $lte: to } } },
    { $group: { _id: null, used: { $sum: '$totalTokens' } } },
  ]).toArray();
  const used = agg[0]?.used ?? 0;
  const state = { cap, used, over: cap !== null && used >= cap };
  cache.set(businessId, { month: from, at: Date.now(), state });
  return state;
}

/** Map<businessId, tokens this Israel month>; one grouped aggregation, not cached. */
async function monthTokensByBusiness(db, now) {
  const { from, to } = monthRangeOf(now);
  const rows = await db.collection('aiUsage').aggregate([
    { $match: { day: { $gte: from, $lte: to } } },
    { $group: { _id: '$businessId', used: { $sum: '$totalTokens' } } },
  ]).toArray();
  return new Map(rows.map(r => [r._id, r.used]));
}

function clearCapCache(businessId) {
  if (businessId === undefined) cache.clear();
  else cache.delete(businessId);
}

module.exports = { monthRangeOf, capState, monthTokensByBusiness, clearCapCache };
