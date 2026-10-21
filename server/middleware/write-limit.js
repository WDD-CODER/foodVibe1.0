const jwt = require('jsonwebtoken');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

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
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token) {
    try {
      const { userId } = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      if (userId) return `user:${userId}`;
    } catch {
      // Invalid/expired token: verifyToken rejects the write anyway; bucket it by IP.
    }
  }
  return ipKeyGenerator(req.ip);
}

const dataWriteLimiter = DATA_WRITE_LIMIT_MAX > 0
  ? rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: DATA_WRITE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: writeLimitKey,
      skip: (req) => req.method === 'GET',
      message: { error: 'Too many requests, please try again later' },
    })
  : (req, res, next) => next();

module.exports = { dataWriteLimiter, writeLimitKey };
