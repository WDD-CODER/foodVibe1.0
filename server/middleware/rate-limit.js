'use strict';

const { rateLimit } = require('express-rate-limit');

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

module.exports = { createRateLimiter };
