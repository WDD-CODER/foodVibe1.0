const { Router } = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createRateLimiter } = require('../middleware/rate-limit');
const User = require('../models/user.model');
const { cloneMasterDataToBusiness } = require('../services/clone-master');
const { syncMasterToBusiness } = require('../services/sync-master');
const { getMasterVersion } = require('../services/master-version');
const { newId } = require('../utils/id');
const { isValidUsername, isValidPasswordHash } = require('../utils/username');
const { NAME_MAX_LENGTH } = require('../generated/schemas/base.schema');
const { currentTermsVersion } = require('../utils/terms-version');
const { verifyToken } = require('../middleware/auth');
const { createBusinessFor, ensureBusinessForUser, getBusiness, setBusinessSyncedVersion } = require('../services/business');
const { resolveSession, canEnter } = require('../services/access');
const { modulesOf } = require('../generated/schemas/modules');

const router = Router();
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
// Browsers share cookies across ports, so local backends (main 3000, slots 3001-3003) would
// overwrite each other's session — a guest auto-login in one tab signed every other tab in as
// the guest admin. In development each port gets its own cookie; deployed stays `fv_refresh`.
const REFRESH_COOKIE = process.env.NODE_ENV === 'development'
  ? `fv_refresh_${process.env.PORT || 3000}`
  : 'fv_refresh';

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

// Development only: the live site runs NODE_ENV=production and keeps these per-IP limits. Local
// servers share one IP (the Human, Playwright, QA), so they skip them. The account lockout
// (5 wrong passwords -> 15 minutes) still applies in development.
const skipInDevelopment = () => process.env.NODE_ENV === 'development';

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skip: skipInDevelopment,
  message: 'Too many login attempts, please try again later',
});

const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  skip: skipInDevelopment,
  message: 'Too many signup attempts, please try again later',
});

const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  skip: skipInDevelopment,
  message: 'Too many refresh attempts, please try again later',
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * True for Mongo/Mongoose connectivity failures (unreachable cluster, IP not allow-listed,
 * serverSelectionTimeoutMS expiry, buffering timeout) as opposed to application-level errors.
 * Routes use this to report DB_UNAVAILABLE instead of a misleading business-rule rejection.
 */
function isDbUnavailableError(err) {
  return (
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoServerSelectionError' ||
    /buffering timed out/i.test(err.message || '')
  );
}

/**
 * The one place an access token is signed. Plan 426: no `role`; platform-admin power comes from the
 * `isPlatformAdmin` flag only. Plan 631 (C-ACCESS, ADR 0032): `businessId` is the ACTIVE business that
 * `resolveSession` decided, `homeBusinessId` the user's own, and `acting` is set only away from home.
 * Returns `{ token, session }`.
 */
async function signAccess(user) {
  const session = await resolveSession(user);
  const payload = {
    userId: String(user._id),
    name: user.name,
    businessId: session.businessId,
    businessRole: session.businessRole,
    isPlatformAdmin: user.isPlatformAdmin === true,
    homeBusinessId: user.businessId ?? null,
    ...(session.acting && { acting: session.acting }),
  };
  return { token: jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY }), session };
}

/**
 * The user object login/signup/guest/refresh/switch hand to the client. Business fields come from the session.
 * Plan 631: while acting it also carries `homeModules` (the home business's modules; the browser only sees the
 * client's business then).
 */
async function toPublicUser(user, session) {
  const out = {
    _id: user._id,
    name: user.name,
    email: user.email,
    imgUrl: user.imgUrl || '',
    businessId: session.businessId ?? null,
    businessRole: session.businessRole ?? null,
    homeBusinessId: user.businessId ?? null,
    isPlatformAdmin: user.isPlatformAdmin === true,
    termsAcceptedVersion: user.termsAcceptedVersion ?? null,
  };
  if (session.acting) {
    out.acting = session.acting;
    out.homeModules = modulesOf(await getBusiness(user.businessId));
  }
  return out;
}

/** Why this user may not hold a session, or null: no business yet, or removed from it. */
function blockedReason(user) {
  if (!user.businessId) return 'NO_BUSINESS';
  if (user.removedAt) return 'USER_REMOVED';
  return null;
}

/** Syncs the user's business with the master catalog and records the version on the business. */
async function syncBusinessOf(user, masterVersion) {
  const business = await getBusiness(user.businessId);
  if (!business) return;
  await syncMasterToBusiness(business._id, { createdBy: business.ownerId });
  await setBusinessSyncedVersion(business._id, masterVersion ?? await getMasterVersion());
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
    const { name, email, imgUrl, password, businessName, termsVersion } = req.body;

    // Plan 584: no account without accepting the current terms; checked before any write.
    if (termsVersion !== currentTermsVersion()) return res.status(400).json({ error: 'TERMS_NOT_ACCEPTED' });

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    // Validate username format: trimmed, 3–20 chars, alphanumeric + _ and -
    if (!isValidUsername(name)) {
      return res.status(400).json({ error: 'INVALID_USERNAME' });
    }

    // Validate email format
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'INVALID_EMAIL' });
    }

    // Plan 426/472: the business name is optional (max 200 chars after trim); empty falls back to the default name.
    const trimmedBusinessName = typeof businessName === 'string' ? businessName.trim() : '';
    if (trimmedBusinessName.length > NAME_MAX_LENGTH) return res.status(400).json({ error: 'BUSINESS_NAME_TOO_LONG' });

    // Note: password strength (min length, letter+digit, username/email check) is enforced
    // client-side only. The password arrives pre-hashed (saltHex:hashHex) from the Angular
    // client — plaintext strength cannot be validated here. The PBKDF2_FORMAT check below
    // ensures the hash format is correct, preventing raw string bypass attempts.

    // Check username uniqueness
    const nameExists = await User.findOne({ name }).lean();
    if (nameExists) return res.status(409).json({ error: 'USERNAME_TAKEN' });

    // Check email uniqueness
    const emailExists = await User.findOne({ email }).lean();
    if (emailExists) return res.status(409).json({ error: 'EMAIL_TAKEN' });

    // Angular already hashed the password client-side (PBKDF2 saltHex:hashHex).
    // Validate format before storing — reject anything that doesn't match.
    if (!isValidPasswordHash(password)) {
      return res.status(400).json({ error: 'INVALID_PASSWORD_FORMAT' });
    }
    const passwordHash = password;
    const _id = newId();
    const masterVersion = await getMasterVersion();
    const created = await User.create({
      _id, name, email, imgUrl: imgUrl || '', passwordHash,
      termsAcceptedVersion: termsVersion, termsAcceptedAt: Date.now(), termsAcceptedIp: req.ip || null,
    });
    const user = created.toObject();

    // Plan 424: every new user starts as the owner of their own business.
    const business = await createBusinessFor(user, { name: trimmedBusinessName || undefined, masterVersion });
    await cloneMasterDataToBusiness(business._id, { createdBy: String(_id) });

    const { token, session } = await signAccess(user);
    const refreshToken = jwt.sign({ userId: _id }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const publicUser = await toPublicUser(user, session);
    return res.status(201).json({ token, user: publicUser });
  } catch (err) {
    req.log.error({ err, event: 'auth.signup.failed' });
    // True duplicate-key race (the pre-checks above passed but another request won the insert).
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
      return res.status(409).json({ error: field === 'email' ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN' });
    }
    if (isDbUnavailableError(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
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

    let user = await User.findOne({ name }).lean();
    if (!user && typeof name === 'string') {
      // Plan 492: a removed cook's name is released; keep telling him he was removed.
      // Same lockout as a live user, so the removed record can't be used to guess passwords.
      const removed = await User.findOne({ removedName: name, removedAt: { $ne: null } }).sort({ removedAt: -1 }).lean();
      if (!removed?.passwordHash || (removed.lockedUntil && removed.lockedUntil > Date.now())) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (await verifyPbkdf2(password, removed.passwordHash)) {
        if (removed.failedAttempts) {
          await User.updateOne({ _id: removed._id }, { failedAttempts: 0, lockedUntil: null });
        }
        return res.status(403).json({ error: 'USER_REMOVED' });
      }
      const failedAttempts = (removed.failedAttempts || 0) + 1;
      const lockedUntil = failedAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : null;
      await User.updateOne({ _id: removed._id }, { failedAttempts, lockedUntil });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user || (user.lockedUntil && user.lockedUntil > Date.now())) {
      return res.status(401).json({ error: 'Invalid credentials' });
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

    // Plan 425: no session for a user without a business or removed from it (no token, no cookie).
    const blocked = blockedReason(user);
    if (blocked) return res.status(403).json({ error: blocked });

    const { token, session } = await signAccess(user);
    const refreshToken = jwt.sign({ userId: user._id }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    try {
      await syncBusinessOf(user);
    } catch (syncErr) { req.log.error({ err: syncErr, event: 'auth.login.sync_failed' }); }

    const publicUser = await toPublicUser(user, session);
    return res.json({ token, user: publicUser });
  } catch (err) {
    req.log.error({ err, event: 'auth.login.failed' });
    if (isDbUnavailableError(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /refresh
// Reads the fv_refresh httpOnly cookie, verifies it, issues a new 15m access token.
// ---------------------------------------------------------------------------

router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies[REFRESH_COOKIE];
    if (!refreshToken) return res.status(401).json({ error: 'NO_REFRESH_TOKEN' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });
    }

    const user = await User.findById(payload.userId).lean();
    if (!user) return res.status(401).json({ error: 'USER_NOT_FOUND' });

    // Plan 425: the existing client interceptor signs the user out on a 401 refresh.
    const blocked = blockedReason(user);
    if (blocked) {
      res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
      return res.status(401).json({ error: blocked });
    }

    // Plan 631: re-resolved on every refresh, so a removed grant lands the session at home.
    const { token, session } = await signAccess(user);

    const newRefreshToken = jwt.sign({ userId: user._id }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    res.cookie(REFRESH_COOKIE, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // Fire-and-forget — do not block the token response on sync.
    // Login awaits sync; refresh runs every 13 min and blocking here adds 3-8s latency.
    // Version-gated (plan 309 M2): master docs are only ever written by seed-master.js or a
    // manually-run fix script (see master-version.js) — never by a live user
    // flow — so most refreshes have nothing to sync. Skip the full multi-collection diff
    // when this user's business was last synced to the current version (plan 425: gate on the business).
    Promise.all([getMasterVersion(), getBusiness(user.businessId)])
      .then(async ([masterVersion, business]) => {
        if (!business) return;
        if ((business.lastSyncedMasterVersion || 0) === masterVersion) {
          req.log.debug({ event: 'auth.refresh.sync_skipped', userId: String(user._id) });
          return;
        }
        await syncMasterToBusiness(business._id, { createdBy: business.ownerId });
        await setBusinessSyncedVersion(business._id, masterVersion);
      })
      .catch(syncErr => req.log.error({ err: syncErr, event: 'auth.refresh.sync_failed' }));

    return res.json({ token, user: await toPublicUser(user, session) });
  } catch (err) {
    req.log.error({ err, event: 'auth.refresh.failed' });
    if (isDbUnavailableError(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /accept-terms
// Signed-in user records acceptance of the current terms (existing accounts, and everyone after a terms change).
// ---------------------------------------------------------------------------

router.post('/accept-terms', refreshLimiter, verifyToken, async (req, res) => {
  try {
    if (req.body?.termsVersion !== currentTermsVersion()) return res.status(400).json({ error: 'TERMS_NOT_ACCEPTED' });
    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      { termsAcceptedVersion: currentTermsVersion(), termsAcceptedAt: Date.now(), termsAcceptedIp: req.ip || null },
      { new: true }
    ).lean();
    if (!updated) return res.status(401).json({ error: 'USER_NOT_FOUND' });
    const session = { businessId: req.user.businessId, businessRole: req.user.businessRole, acting: req.user.acting };
    return res.json({ user: await toPublicUser(updated, session) });
  } catch (err) {
    req.log.error({ err, event: 'auth.accept_terms.failed' });
    if (isDbUnavailableError(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /switch-business
// Plan 631 (C-ACCESS): body { businessId: string | null } → { token, user }. null or the home id → home;
// anything else needs a live grant or the platform admin flag, else 403 NO_ACCESS and nothing is written.
// The refresh cookie is not touched: it carries only the userId, and /refresh re-resolves the active business.
// ---------------------------------------------------------------------------

router.post('/switch-business', refreshLimiter, verifyToken, async (req, res) => {
  try {
    const target = req.body?.businessId;
    const valid = target === null || (typeof target === 'string' && target.length >= 1 && target.length <= 64);
    if (!valid) return res.status(400).json({ error: 'INVALID_BODY' });

    const user = await User.findById(req.user.userId).lean();
    if (!user) return res.status(401).json({ error: 'USER_NOT_FOUND' });
    const blocked = blockedReason(user);
    if (blocked) return res.status(403).json({ error: blocked });

    let to = 'home';
    let activeBusinessId = null;
    if (target !== null && target !== user.businessId) {
      const how = await canEnter(user, target);
      if (!how) {
        req.log.info({ event: 'auth.switch_business.denied', businessId: target });
        return res.status(403).json({ error: 'NO_ACCESS' });
      }
      to = how;
      activeBusinessId = target;
    }
    await User.updateOne({ _id: user._id }, { $set: { activeBusinessId } });
    user.activeBusinessId = activeBusinessId;

    const { token, session } = await signAccess(user);
    req.log.info({ event: 'auth.switch_business', to, businessId: session.businessId });
    return res.json({ token, user: await toPublicUser(user, session) });
  } catch (err) {
    req.log.error({ err, event: 'auth.switch_business.failed' });
    if (isDbUnavailableError(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /logout
// Clears the httpOnly refresh cookie so the session cannot be silently renewed.
// ---------------------------------------------------------------------------

router.post('/logout', (req, res) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /guest
// Localhost-only endpoint — issues a JWT for the built-in guest account so the
// frontend can make authenticated backend requests without signing up.
// Blocked for any non-localhost origin regardless of NODE_ENV.
// ---------------------------------------------------------------------------

router.post('/guest', async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || '';
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!isLocalhost) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const guestDoc = await User.findOneAndUpdate(
      { _id: 'dev-guest' },
      { _id: 'dev-guest', name: 'Guest Admin', email: 'guest@dev.local', role: 'admin', isPlatformAdmin: true, passwordHash: null, activeBusinessId: null },
      { upsert: true, new: true }
    );
    const guest = guestDoc.toObject();
    await ensureBusinessForUser(guest);

    const { token, session } = await signAccess(guest);
    const refreshToken = jwt.sign({ userId: 'dev-guest' }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    try {
      await syncBusinessOf(guest);
    } catch (syncErr) { req.log.error({ err: syncErr, event: 'auth.guest.sync_failed' }); }

    return res.json({
      token,
      user: await toPublicUser(guest, session),
    });
  } catch (err) {
    req.log.error({ err, event: 'auth.guest.failed' });
    if (isDbUnavailableError(err)) return res.status(503).json({ error: 'DB_UNAVAILABLE' });
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
