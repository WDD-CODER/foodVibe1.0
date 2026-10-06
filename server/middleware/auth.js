const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

/**
 * Verifies the access token onto req.user and binds `userId` onto `req.log` — the pino-http
 * request logger, Plan 383 — so every handler log line after auth carries it. userId only.
 */
function attachUser(req, token) {
  req.user = jwt.verify(token, ACCESS_SECRET);
  if (req.log && req.user?.userId) req.log = req.log.child({ userId: req.user.userId });
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
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    attachUser(req, token);
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
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    attachUser(req, token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { verifyToken, optionalToken, requireAdmin };
