'use strict';

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * Plan 456 â€” the one way a route builds a rate limiter. Every limiter sends the standard
 * `RateLimit-*` headers (no legacy `X-RateLimit-*`) and answers 429 with `{ error: message }`.
 * Each caller keeps its own window, budget and message; any other express-rate-limit option
 * (`keyGenerator`, `skip`, `validate`) passes through unchanged.
 *
 * @param {{ windowMs: number, max: number, message: string } & Record<string, unknown>} options
 */
function createRateLimiter({ windowMs, max, message, ...rest }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    ...rest,
  });
}

/**
 * Plan 528 — bucket key for a limiter that runs after `verifyToken`: `user:<id>`, else the
 * IPv6-safe IP key (a /56 subnet for IPv6, so rotating addresses does not dodge the budget).
 *
 * @param {{ user?: { userId?: string }, ip?: string }} req
 * @returns {string}
 */
function userOrIpKey(req) {
  const userId = req.user?.userId;
  if (userId) return `user:${userId}`;
  return ipKeyGenerator(req.ip);
}

module.exports = { createRateLimiter, userOrIpKey };
