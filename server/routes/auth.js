const { Router } = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Entity = require('../models/entity.model');

const router = Router();

const AUTH_ENTITY_TYPE = 'signed-users-db';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts, please try again later' },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a 5-char alphanumeric ID.
 */
function makeId(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/**
 * Constant-time string comparison. Returns false if lengths differ (no timing leak via length).
 * Used to compare Angular's PBKDF2 hash (saltHex:hashHex) directly against the stored hash.
 */
function safeCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ---------------------------------------------------------------------------
// POST /signup
// ---------------------------------------------------------------------------

router.post('/signup', signupLimiter, async (req, res) => {
  try {
    const { name, email, imgUrl, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    // Check username uniqueness
    const nameExists = await Entity.findOne({ entityType: AUTH_ENTITY_TYPE, 'data.name': name }).lean();
    if (nameExists) return res.status(409).json({ error: 'USERNAME_TAKEN' });

    // Check email uniqueness
    const emailExists = await Entity.findOne({ entityType: AUTH_ENTITY_TYPE, 'data.email': email }).lean();
    if (emailExists) return res.status(409).json({ error: 'EMAIL_TAKEN' });

    // Angular already hashed the password client-side (PBKDF2 saltHex:hashHex).
    // Store it as-is — never re-hash.
    const passwordHash = password;
    const _id = makeId();
    const userData = { _id, name, email, imgUrl: imgUrl || '', passwordHash };
    await Entity.create({ _id, entityType: AUTH_ENTITY_TYPE, data: userData });

    const token = jwt.sign({ userId: _id, name }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign({ userId: _id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    res.cookie('fv_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const publicUser = { _id, name, email, imgUrl: userData.imgUrl };
    return res.status(201).json({ token, user: publicUser });
  } catch (err) {
    console.error('[auth/signup]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'name and password are required' });
    }

    const doc = await Entity.findOne({ entityType: AUTH_ENTITY_TYPE, 'data.name': name }).lean();
    if (!doc) return res.status(401).json({ error: 'USER_NOT_FOUND' });

    const stored = doc.data;

    // Account lockout check
    if (stored.lockedUntil && stored.lockedUntil > Date.now()) {
      return res.status(423).json({ error: 'ACCOUNT_LOCKED' });
    }

    if (!stored.passwordHash) return res.status(401).json({ error: 'USER_NOT_FOUND' });

    // Angular sends the PBKDF2 hash (saltHex:hashHex) as the password field.
    // Compare directly against the stored hash using constant-time comparison.
    // Legacy bare-SHA-256 hashes (no colon, 64 chars) are also compared this way.
    const ok = safeCompare(password, stored.passwordHash);

    if (!ok) {
      // Increment failed attempts; lock after 5 consecutive failures for 15 minutes
      const failedAttempts = (stored.failedAttempts || 0) + 1;
      const lockedUntil = failedAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : null;
      await Entity.updateOne(
        { _id: doc._id },
        { 'data.failedAttempts': failedAttempts, 'data.lockedUntil': lockedUntil }
      );
      return res.status(401).json({ error: 'USER_NOT_FOUND' });
    }

    // Reset failed attempts on success
    if (stored.failedAttempts) {
      await Entity.updateOne({ _id: doc._id }, { 'data.failedAttempts': 0, 'data.lockedUntil': null });
    }

    const token = jwt.sign(
      { userId: stored._id, name: stored.name },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    const refreshToken = jwt.sign({ userId: stored._id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    res.cookie('fv_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const publicUser = { _id: stored._id, name: stored.name, email: stored.email, imgUrl: stored.imgUrl };
    return res.json({ token, user: publicUser });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /refresh
// Reads the fv_refresh httpOnly cookie, verifies it, issues a new 15m access token.
// ---------------------------------------------------------------------------

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies.fv_refresh;
    if (!refreshToken) return res.status(401).json({ error: 'NO_REFRESH_TOKEN' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });
    }

    const doc = await Entity.findOne({ entityType: AUTH_ENTITY_TYPE, 'data._id': payload.userId }).lean();
    if (!doc) return res.status(401).json({ error: 'USER_NOT_FOUND' });

    const stored = doc.data;
    const token = jwt.sign(
      { userId: stored._id, name: stored.name },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const newRefreshToken = jwt.sign({ userId: stored._id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    res.cookie('fv_refresh', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ token });
  } catch (err) {
    console.error('[auth/refresh]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
