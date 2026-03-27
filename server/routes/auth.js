const { Router } = require('express');
const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const Entity = require('../models/entity.model');

const router = Router();

/** localStorage key that holds the user registry — matches Angular's SIGNED_USERS constant. */
const AUTH_ENTITY_TYPE = 'signed-users-db';

/** JWT validity period — matches the "stay logged in" behaviour (plan 062). */
const JWT_EXPIRY = '30d';

// ---------------------------------------------------------------------------
// PBKDF2 helpers — mirror auth-crypto.ts parameters exactly so hashes
// produced on the server are verifiable by the Angular client and vice-versa.
//   iterations : 100 000
//   digest     : sha256
//   keylen     : 32 bytes (256 bits)
//   salt       : 16 random bytes
//   format     : "<saltHex>:<hashHex>"  (32 hex + ':' + 64 hex)
// Legacy bare-SHA-256 hashes (no colon) are still verified for users migrated
// from the localStorage-only era.
// ---------------------------------------------------------------------------

const pbkdf2Async = promisify(crypto.pbkdf2);

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';

/**
 * Hash a plaintext password using PBKDF2.
 * @param {string} plain
 * @returns {Promise<string>} "<saltHex>:<hashHex>"
 */
async function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const key = await pbkdf2Async(plain, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored hash.
 * Supports both PBKDF2 ("<saltHex>:<hashHex>") and legacy bare SHA-256 (no colon).
 * @param {string} plain
 * @param {string} stored
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plain, stored) {
  if (!stored.includes(':')) {
    // Legacy SHA-256 path — no salt, single digest comparison
    const legacyHash = crypto.createHash('sha256').update(plain).digest('hex');
    return legacyHash === stored;
  }
  const [saltHex, hashHex] = stored.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const key = await pbkdf2Async(plain, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  // Constant-time comparison to prevent timing attacks
  const computed = Buffer.from(key.toString('hex'));
  const expected = Buffer.from(hashHex);
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

/**
 * Generates a 5-char alphanumeric ID.
 * Matches Angular StorageService.makeId() so IDs are interchangeable during migration.
 * @param {number} [length=5]
 * @returns {string}
 */
function makeId(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/signup
 *
 * Body: { name: string, email: string, imgUrl?: string, password: string }
 * password is the plaintext password sent over HTTPS — the server hashes it
 * server-side using PBKDF2 before storing. The plaintext is never persisted.
 *
 * Returns: { token: string, user: { _id, name, email, imgUrl } }
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, imgUrl, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    const exists = await Entity.findOne({ entityType: AUTH_ENTITY_TYPE, 'data.name': name }).lean();
    if (exists) return res.status(409).json({ error: 'USERNAME_TAKEN' });

    const passwordHash = await hashPassword(password);
    const _id = makeId();
    const userData = { _id, name, email, imgUrl: imgUrl || '', passwordHash };
    await Entity.create({ _id, entityType: AUTH_ENTITY_TYPE, data: userData });

    const token = jwt.sign({ userId: _id, name }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
    const publicUser = { _id, name, email, imgUrl: userData.imgUrl };
    return res.status(201).json({ token, user: publicUser });
  } catch (err) {
    console.error('[auth/signup]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/login
 *
 * Body: { name: string, password: string }
 * password is the plaintext password sent over HTTPS — the server extracts the
 * stored salt and re-derives the PBKDF2 key for comparison. Plaintext is never stored.
 *
 * Returns: { token: string, user: { _id, name, email, imgUrl } }
 */
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'name and password are required' });
    }

    const doc = await Entity.findOne({ entityType: AUTH_ENTITY_TYPE, 'data.name': name }).lean();
    if (!doc) return res.status(401).json({ error: 'USER_NOT_FOUND' });

    const stored = doc.data;
    if (!stored.passwordHash) return res.status(401).json({ error: 'USER_NOT_FOUND' });

    const ok = await verifyPassword(password, stored.passwordHash);
    if (!ok) return res.status(401).json({ error: 'USER_NOT_FOUND' });

    const token = jwt.sign(
      { userId: stored._id, name: stored.name },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    const publicUser = { _id: stored._id, name: stored.name, email: stored.email, imgUrl: stored.imgUrl };
    return res.json({ token, user: publicUser });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
