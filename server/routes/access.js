'use strict';
/**
 * Plan 615 (C-REGISTRY) mounted this router at /api/v1/access; plan 631 (C-ACCESS, ADR 0032) fills it.
 * Grants are not business items: they live in the server-only `businessAccess` collection and are reachable only here.
 * Every query goes through `server/services/access.js`. Log lines carry ids only (no username, no business name).
 */
const { Router } = require('express');
const { createRateLimiter } = require('../middleware/rate-limit');
const { verifyToken, requirePlatformAdmin, isPlatformAdmin } = require('../middleware/auth');
const { checkStoredDoc } = require('../middleware/validate');
const { assertCan } = require('../utils/permissions');
const { actorOf } = require('../utils/actor');
const { scopeFilter, MASTER_BUSINESS_ID } = require('../utils/business-scope');
const { newId } = require('../utils/id');
const User = require('../models/user.model');
const { getBusiness } = require('../services/business');
const { liveGrant, listEnterable, createGrant, liveGrantById, removeGrant, grantsOfBusiness } = require('../services/access');

const router = Router();

const grantLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: req => String(req.user?.userId ?? 'anonymous'),
  validate: { keyGeneratorIpFallback: false },
  message: 'Too many access requests, please try again later',
});

const nonEmptyString = v => typeof v === 'string' && v.trim().length > 0;

// GET /api/v1/access/businesses — the businesses the signed-in user may enter: home first, then live grants by name.
router.get('/businesses', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('businessRole').lean();
    const rows = await listEnterable(req.user.userId, {
      homeBusinessId: req.user.homeBusinessId ?? req.user.businessId,
      homeRole: user?.businessRole ?? null,
    });
    res.json(rows);
  } catch (err) {
    req.log.error({ err, event: 'access.businesses.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/v1/access/grants — the platform admin gives a user consultant access to a business.
router.post('/grants', verifyToken, requirePlatformAdmin, grantLimiter, async (req, res) => {
  try {
    const { businessId, username } = req.body || {};
    if (!nonEmptyString(businessId) || !nonEmptyString(username)) return res.status(400).json({ error: 'INVALID_BODY' });
    if (businessId === MASTER_BUSINESS_ID || !(await getBusiness(businessId))) return res.status(404).json({ error: 'BUSINESS_NOT_FOUND' });
    const user = await User.findOne({ name: username }).select('_id name businessId removedAt').lean();
    if (!user || user.removedAt) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    if (user.businessId === businessId) return res.status(409).json({ error: 'ALREADY_MEMBER' });
    if (await liveGrant(user._id, businessId)) return res.status(409).json({ error: 'ALREADY_GRANTED' });

    const actor = actorOf(req);
    const row = {
      _id: newId(),
      userId: String(user._id),
      businessId,
      role: 'consultant',
      grantedBy: actor.userId,
      grantedByName: actor.name,
      grantedAt: Date.now(),
    };
    const check = checkStoredDoc('businessAccess', row);
    if (!check.ok) return res.status(400).json({ error: 'Validation failed', issues: check.issues });
    try {
      await createGrant(row);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'ALREADY_GRANTED' });
      throw err;
    }
    req.log.info({ event: 'access.grant.created', grantId: row._id, userId: row.userId, businessId });
    res.status(201).json({ _id: row._id, userId: row.userId, name: user.name, businessId, grantedAt: row.grantedAt });
  } catch (err) {
    req.log.error({ err, event: 'access.grant.create_failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/v1/access/grants/:id — the platform admin, or the owner of that business, removes a grant.
router.delete('/grants/:id', verifyToken, async (req, res) => {
  try {
    const grant = await liveGrantById(req.params.id);
    if (!grant) return res.status(404).json({ error: 'NOT_FOUND' });
    if (!isPlatformAdmin(req)) {
      if (grant.businessId !== scopeFilter(req).businessId) return res.status(404).json({ error: 'NOT_FOUND' });
      if (!assertCan(req, res, 'manageTeam', { type: 'businesses' })) return;
    }
    if (!(await removeGrant(grant._id, actorOf(req).userId))) return res.status(404).json({ error: 'NOT_FOUND' });
    req.log.info({ event: 'access.grant.removed', grantId: grant._id, userId: grant.userId, businessId: grant.businessId });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, event: 'access.grant.remove_failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/v1/access/grants — the owner's list of who has access to his business, newest first.
router.get('/grants', verifyToken, async (req, res) => {
  try {
    if (!assertCan(req, res, 'manageTeam', { type: 'businesses' })) return;
    res.json(await grantsOfBusiness(scopeFilter(req).businessId));
  } catch (err) {
    req.log.error({ err, event: 'access.grants.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
