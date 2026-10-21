const { ipKeyGenerator } = require('express-rate-limit');
const { verifyAccessToken } = require('./auth');
const { createRateLimiter } = require('./rate-limit');

// Plan 321 Phase 1 — moderate rate limit on writes (POST/PUT/DELETE); reads (GET) are
// skipped since master-catalog/search reads are meant to be cheap and frequent.
// Plan 385 — the bucket is per user (verified JWT), not per IP, so users behind one IP
// don't share a budget; anonymous writes fall back to the IP. DATA_WRITE_LIMIT_MAX sets
// the budget (default 1000); 0 turns the limiter off. Never gate this on NODE_ENV —
// `npm run dev` runs as NODE_ENV=production.
// Plan 442 — one shared instance: the data router and the events router draw on the same budget.
const DATA_WRITE_LIMIT_MAX = Number(process.env.DATA_WRITE_LIMIT_MAX ?? 1000);

/** Bucket key: `user:<id>` for a verified Bearer token, else the IPv6-safe IP key. */
function writeLimitKey(req) {
  // Invalid/expired token: verifyToken rejects the write anyway; bucket it by IP.
  const userId = verifyAccessToken(req)?.userId;
  if (userId) return `user:${userId}`;
  return ipKeyGenerator(req.ip);
}

const dataWriteLimiter = DATA_WRITE_LIMIT_MAX > 0
  ? createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: DATA_WRITE_LIMIT_MAX,
      keyGenerator: writeLimitKey,
      skip: (req) => req.method === 'GET',
      message: 'Too many requests, please try again later',
    })
  : (req, res, next) => next();

module.exports = { dataWriteLimiter, writeLimitKey };
