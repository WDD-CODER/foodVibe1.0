'use strict';

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * Plan 456 — the one way a route builds a rate limiter. Every limiter sends the standard
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

/**
 * Plan 543 (C-GUEST) — bucket key for a public (non-member) route: the IPv6-safe IP key plus the
 * business slug, so one visitor's budget on one business never blocks the same visitor on another.
 *
 * @param {{ ip?: string, params?: { slug?: string } }} req
 * @returns {string}
 */
function ipAndSlugKey(req) {
  return `${ipKeyGenerator(req.ip)}|${req.params?.slug ?? ''}`;
}

/**
 * Plan 543 — the one shared public write limiter (one store): 20 writes / 15 min per IP + slug.
 * Reads are not counted. Put it on the route itself (`router.post('/:slug/requests', publicLimiter, …)`)
 * so `req.params.slug` is set when the key is built.
 */
const publicLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many requests',
  keyGenerator: ipAndSlugKey,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD',
});

module.exports = { createRateLimiter, userOrIpKey, ipAndSlugKey, publicLimiter };
