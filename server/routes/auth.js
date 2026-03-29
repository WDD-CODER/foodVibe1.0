const { Router } = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/user.model');
const { cloneMasterDataToUser } = require('../services/clone-master');
const { syncMasterToUser } = require('../services/sync-master');

const router = Router();
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

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts, please try again later' },
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
 */
function safeCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a plain-text password against a stored PBKDF2 hash of the form "saltHex:hashHex".
 * Mirrors the client-side hashPassword() in auth-crypto.ts (100 000 iterations, SHA-256, 256-bit key).
 * Legacy bare SHA-256 hashes (no colon, 64 chars) are also handled for backwards compatibility.
 */
function verifyPbkdf2(plain, stored) {
  return new Promise((resolve, reject) => {
    if (!stored.includes(':')) {
      // Legacy SHA-256 (no salt) path
      const digest = crypto.createHash('sha256').update(plain).digest('hex');
      return resolve(safeCompare(digest, stored));
    }
    const [saltHex, hashHex] = stored.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    crypto.pbkdf2(plain, salt, 100_000, 32, 'sha256', (err, derivedKey) => {
      if (err) return reject(err);
      resolve(safeCompare(derivedKey.toString('hex'), hashHex));
    });
  });
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
    const nameExists = await User.findOne({ name }).lean();
    if (nameExists) return res.status(409).json({ error: 'USERNAME_TAKEN' });

    // Check email uniqueness
    const emailExists = await User.findOne({ email }).lean();
    if (emailExists) return res.status(409).json({ error: 'EMAIL_TAKEN' });

    // Angular already hashed the password client-side (PBKDF2 saltHex:hashHex).
    // Validate format before storing — reject anything that doesn't match.
    const PBKDF2_FORMAT = /^[0-9a-f]{32}:[0-9a-f]{64}$/;
    if (!PBKDF2_FORMAT.test(password)) {
      return res.status(400).json({ error: 'INVALID_PASSWORD_FORMAT' });
    }
    const passwordHash = password;
    const _id = makeId();
    await User.create({ _id, name, email, imgUrl: imgUrl || '', passwordHash });

    await cloneMasterDataToUser(_id);

    const token = jwt.sign({ userId: _id, name }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign({ userId: _id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    res.cookie('fv_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const publicUser = { _id, name, email, imgUrl: imgUrl || '' };
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

    const user = await User.findOne({ name }).lean();
    if (!user) return res.status(401).json({ error: 'USER_NOT_FOUND' });

    // Account lockout check
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      return res.status(423).json({ error: 'ACCOUNT_LOCKED' });
    }

    if (!user.passwordHash) return res.status(401).json({ error: 'USER_NOT_FOUND' });

    // Re-derive using the salt embedded in the stored PBKDF2 hash, then constant-time compare.
    const ok = await verifyPbkdf2(password, user.passwordHash);

    if (!ok) {
      // Increment failed attempts; lock after 5 consecutive failures for 15 minutes
      const failedAttempts = (user.failedAttempts || 0) + 1;
      const lockedUntil = failedAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : null;
      await User.updateOne({ _id: user._id }, { failedAttempts, lockedUntil });
      return res.status(401).json({ error: 'USER_NOT_FOUND' });
    }

    // Reset failed attempts on success
    if (user.failedAttempts) {
      await User.updateOne({ _id: user._id }, { failedAttempts: 0, lockedUntil: null });
    }

    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    res.cookie('fv_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    try { await syncMasterToUser(user._id); } catch (syncErr) { console.error('[auth/login] sync error:', syncErr.message); }

    const publicUser = { _id: user._id, name: user.name, email: user.email, imgUrl: user.imgUrl };
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

router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies.fv_refresh;
    if (!refreshToken) return res.status(401).json({ error: 'NO_REFRESH_TOKEN' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });
    }

    const user = await User.findById(payload.userId).lean();
    if (!user) return res.status(401).json({ error: 'USER_NOT_FOUND' });

    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const newRefreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    res.cookie('fv_refresh', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    try { await syncMasterToUser(user._id); } catch (syncErr) { console.error('[auth/refresh] sync error:', syncErr.message); }

    return res.json({ token });
  } catch (err) {
    console.error('[auth/refresh]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /logout
// Clears the httpOnly refresh cookie so the session cannot be silently renewed.
// ---------------------------------------------------------------------------

router.post('/logout', (req, res) => {
  res.clearCookie('fv_refresh', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return res.json({ ok: true });
});

module.exports = router;
