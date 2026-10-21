const jwt = require('jsonwebtoken');
const { recordUsage } = require('./usage');

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

/**
 * Verifies the access token onto req.user and binds `userId` onto `req.log` — the pino-http
 * request logger, Plan 383 — so every handler log line after auth carries it. userId only.
 */
function attachUser(req, res, token) {
  const payload = decodeAccessToken(token);
  // Plan 425: a token without a business can't be scoped to any data. The client refreshes and retries.
  if (payload?.userId && !payload.businessId) throw new Error('NO_BUSINESS_IN_TOKEN');
  req.user = payload;
  if (req.log && req.user?.userId) req.log = req.log.child({ userId: req.user.userId });
  recordUsage(req, res); // Plan 430: non-blocking, runs after the response is sent
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
function verifyToken(req, res, next) {
  const token = bearerToken(req);

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    attachUser(req, res, token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
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
function optionalToken(req, res, next) {
  const token = bearerToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    attachUser(req, res, token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Platform-admin gate (plan 425): only the `isPlatformAdmin` flag counts; the legacy `role` is never read. */
function requirePlatformAdmin(req, res, next) {
  if (!isPlatformAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { verifyToken, optionalToken, requirePlatformAdmin, verifyAccessToken, isPlatformAdmin };
