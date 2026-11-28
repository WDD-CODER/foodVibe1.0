'use strict';
/**
 * Plan 736 — every user's lifetime AI allowance (the per-user twin of ai-cap.js). A user may make
 * `aiAllowance` counted AI requests in all (missing = AI_DEFAULT_ALLOWANCE); `aiCallsUsed` counts them
 * (missing = 0). Both live on the `users` record, so a restart loses nothing.
 *
 * One counted call per user request that reaches the model and ends with a status below 400:
 * - `trackAiAllowance` (mounted on the AI router) gives each request one holder `req.aiAllowance`.
 * - `callGemini` reserves through the holder right before it calls Google, at most once per request
 *   (retries inside one request and the recipe routes' second attempt reuse the same reservation).
 * - On `finish` a reserved request that answered 400 or more is refunded.
 * The check and the count are one atomic update, so parallel requests never spend more than the allowance.
 */
const { AI_DEFAULT_ALLOWANCE } = require('../generated/schemas/ai-allowance.schema');

const users = db => db.collection('users');

/** `{ allowance, used, remaining }` of one user record (or of a missing one: the defaults). */
function allowanceOf(user) {
  const allowance = Number.isInteger(user?.aiAllowance) ? user.aiAllowance : AI_DEFAULT_ALLOWANCE;
  const used = Number.isInteger(user?.aiCallsUsed) ? user.aiCallsUsed : 0;
  return { allowance, used, remaining: Math.max(0, allowance - used) };
}

/**
 * Takes one call from `userId`'s allowance and marks `holder.reserved`. Returns `'reserved'`, `'over'` (the user
 * has used the whole allowance; nothing changed) or `'no_user'` (no such user record: nothing to count against;
 * the caller lets the call go on). Throws on a database error.
 */
async function reserveAiCall(db, holder, userId) {
  if (holder.reserved) return 'reserved';
  const filter = {
    _id: userId,
    $expr: { $lt: [{ $ifNull: ['$aiCallsUsed', 0] }, { $ifNull: ['$aiAllowance', AI_DEFAULT_ALLOWANCE] }] },
  };
  // Driver v6: the matched document, or null when nothing matched.
  const doc = await users(db).findOneAndUpdate(filter, { $inc: { aiCallsUsed: 1 } }, { projection: { _id: 1 } });
  if (doc) {
    holder.reserved = true;
    holder.userId = userId;
    return 'reserved';
  }
  const exists = await users(db).findOne({ _id: userId }, { projection: { _id: 1 } });
  return exists ? 'over' : 'no_user';
}

/** Gives one call back (never below 0). Throws on a database error. */
async function refundAiCall(db, userId) {
  await users(db).updateOne({ _id: userId, aiCallsUsed: { $gt: 0 } }, { $inc: { aiCallsUsed: -1 } });
}

/**
 * Router middleware: one allowance holder per request; a reserved request that ended with 400 or more is refunded.
 * A request whose connection closed before the answer was sent keeps its reservation (the model was most likely
 * called).
 */
function trackAiAllowance(req, res, next) {
  const holder = { reserved: false };
  req.aiAllowance = holder;
  res.on('finish', () => {
    if (!holder.reserved || res.statusCode < 400) return;
    holder.reserved = false;
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) return;
    const done = refundAiCall(mongoose.connection.db, holder.userId).catch(() => {
      req.log?.warn({ event: 'ai.allowance.refund_failed', userId: holder.userId });
    });
    pending.add(done);
    done.finally(() => pending.delete(done));
  });
  next();
}

const pending = new Set();
/** Test-only: wait until every refund started on `finish` has been written. */
async function _waitForRefundsForTests() {
  while (pending.size > 0) await Promise.all([...pending]);
}

module.exports = { allowanceOf, reserveAiCall, refundAiCall, trackAiAllowance, _waitForRefundsForTests };
