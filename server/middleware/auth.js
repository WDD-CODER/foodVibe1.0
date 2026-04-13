const jwt = require('jsonwebtoken');

/**
 * JWT verification middleware.
 * Reads Bearer token from the Authorization header, verifies it against JWT_SECRET,
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
    req.user = jwt.verify(token, process.env.JWT_SECRET);
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
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken, optionalToken };
