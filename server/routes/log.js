/**
 * POST /api/v1/log — client log ingest (Plan 382). One event per request, fire-and-forget:
 * 202 accepted, 400 invalid body, 413 body over 16 kb, 429 over the rate limit. Never 401:
 * a missing, expired or invalid token just records the event as anonymous (userId null),
 * so pre-login and stale-session errors are still captured.
 *
 * Mounted in app.js BEFORE the global express.json (2 mb) so the 16 kb cap here applies.
 */

'use strict';

const { Router, json } = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { logEventSchema } = require('../generated/schemas/entities/log-event.schema');
const sink = require('../services/log-sink');

const router = Router();
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

const logLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many log events, please slow down' },
});

/** Like optionalToken, but a bad token degrades to anonymous instead of 401. */
function lenientUser(req, _res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  req.user = null;
  if (token) {
    try {
      req.user = jwt.verify(token, ACCESS_SECRET);
    } catch {
      // expired/invalid → anonymous
    }
  }
  next();
}

router.post('/', logLimiter, json({ limit: '16kb' }), lenientUser, (req, res) => {
  const parsed = logEventSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({ error: 'Invalid log event', issues });
  }
  const { level, event, message, context, timestamp, requestId, url } = parsed.data;
  // Not awaited: the client never waits on storage, and write() swallows its own errors.
  sink.write({
    source: 'client',
    level,
    event,
    message,
    context,
    userId: req.user?.userId ?? null,
    requestId,
    url,
    clientTs: timestamp,
  });
  return res.status(202).end();
});

// Body-parser errors (oversized / malformed JSON) stay on this route instead of reaching the
// global 500 handler.
router.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Log event too large' });
  return res.status(400).json({ error: 'Invalid log event' });
});

module.exports = router;
