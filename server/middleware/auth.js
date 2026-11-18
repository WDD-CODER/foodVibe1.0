const jwt = require('jsonwebtoken');
const { recordUsage } = require('./usage');
const { stillActing } = require('../services/access');

/** The Bearer token of the request's Authorization header, or '' when there is none. */
function bearerToken(req) {
  const header = req.headers['authorization'] || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

/**
 * Plan 456 — the one place an access token is checked. Returns the payload; throws when the
 * token is invalid or expired. The secret is read per call, as write-limit.js always did.
 */
function decodeAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

/**
 * Payload of the request's Bearer access token, or null when it is missing, invalid or expired.
 * Never throws and never answers: for callers that degrade to anonymous (log ingest, the
 * write-limit bucket key). Routes that must reject a bad token use verifyToken / optionalToken.
 */
function verifyAccessToken(req) {
  const token = bearerToken(req);
  if (!token) return null;
  try {
    return decodeAccessToken(token);
  } catch {
    return null;
  }
}

/** Plan 425: platform admin is the `isPlatformAdmin` flag only; the legacy `role` is never read. */
function isPlatformAdmin(req) {
  return req.user?.isPlatformAdmin === true;
}

/** An error that ends an acting session (plan 631): the grant was removed or the admin flag taken away. */
function accessEnded() {
  const err = new Error('ACCESS_ENDED');
  err.code = 'ACCESS_ENDED';
  return err;
}

/** A database failure while re-checking an acting token (plan 631): denied with 503, never passed on. */
function actingCheckFailed(cause) {
  const err = new Error('DB_UNAVAILABLE');
  err.code = 'DB_UNAVAILABLE';
  err.cause = cause;
  return err;
}

/**
 * Verifies the access token onto req.user and binds `userId` onto `req.log` — the pino-http
 * request logger, Plan 383 — so every handler log line after auth carries it. userId only.
 * Plan 631 (ADR 0032): a token with `acting` is re-checked here on every request (one indexed read);
 * a home token takes no read.
 */
async function attachUser(req, res, token) {
  const payload = decodeAccessToken(token);
  // Plan 425: a token without a business can't be scoped to any data. The client refreshes and retries.
  if (payload?.userId && !payload.businessId) throw new Error('NO_BUSINESS_IN_TOKEN');
  if (payload?.acting) {
    let live;
    try {
      live = await stillActing(payload);
    } catch (err) {
      throw actingCheckFailed(err);
    }
    if (!live) throw accessEnded();
  }
  req.user = payload;
  if (req.log && req.user?.userId) {
    req.log = req.log.child(req.user.acting
      ? { userId: req.user.userId, acting: req.user.acting, actingIn: req.user.businessId }
      : { userId: req.user.userId });
  }
  recordUsage(req, res); // Plan 430: non-blocking, runs after the response is sent
}

/** Plan 631: the answer for a failed attachUser. */
function rejectToken(req, res, err) {
  if (err?.code === 'ACCESS_ENDED') {
    req.log?.info({ event: 'auth.access_ended' });
    return res.status(401).json({ error: 'ACCESS_ENDED' });
  }
  if (err?.code === 'DB_UNAVAILABLE') {
    req.log?.error({ err: err.cause, event: 'auth.acting_check.failed' });
    return res.status(503).json({ error: 'DB_UNAVAILABLE' });
  }
  return res.status(401).json({ error: 'Invalid or expired token' });
}

/**
 * JWT verification middleware.
 * Reads Bearer token from the Authorization header, verifies it against JWT_ACCESS_SECRET,
 * and attaches the decoded payload to req.user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function verifyToken(req, res, next) {
  const token = bearerToken(req);

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    await attachUser(req, res, token);
  } catch (err) {
    return rejectToken(req, res, err);
  }
  next();
}

/**
 * Optional JWT verification middleware for public-read routes.
 *
 * Behavior:
 *   - No token provided    → req.user = null, next()  (anonymous — serve master data)
 *   - Valid token           → req.user = decoded, next()
 *   - Invalid/expired token → 401  (so the frontend interceptor can trigger refresh)
 *
 * This distinction prevents silently degrading an expired session to anonymous reads.
 */
async function optionalToken(req, res, next) {
  const token = bearerToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    await attachUser(req, res, token);
  } catch (err) {
    return rejectToken(req, res, err);
  }
  next();
}

/** Platform-admin gate (plan 425): only the `isPlatformAdmin` flag counts; the legacy `role` is never read. */
function requirePlatformAdmin(req, res, next) {
  if (!isPlatformAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { verifyToken, optionalToken, requirePlatformAdmin, verifyAccessToken, isPlatformAdmin };
