'use strict'
/** Plan 425: the caller's business. Plan 428: the owner's team (list, add, remove). Plan 429: owner-only settings. Plan 431: owner-only opening baseline and setup status. */
const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const { verifyToken } = require('../middleware/auth')
const { getBusiness, setBusinessSettings } = require('../services/business')
const { assertCan } = require('../utils/permissions')
const { isValidUsername, isValidPasswordHash } = require('../utils/username')
const { newId } = require('../utils/id')
const User = require('../models/user.model')
const { businessSettingsSchema, baselineInputSchema, BUSINESS_SETTINGS_DEFAULTS } = require('../generated/schemas/entities')
const mongoose = require('mongoose')
const { lastActiveByUser } = require('../utils/usage-stats')
const { scopeFilter } = require('../utils/business-scope')
const { LIVE } = require('../jobs/purge-deleted')

const router = Router()

const STAFF_EMAIL_DOMAIN = '@staff.foodvibe.invalid'

// Team routes are not under the /api/v1/data write limiter, and POST creates accounts, so POST is rate limited.
const teamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => String(req.user?.userId ?? 'anonymous'),
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Too many team requests, please try again later' },
})

// GET /api/v1/business — the business document of the signed-in user; `settings` always has the defaults filled in (nothing is written on read). Any member may read it.
router.get('/', verifyToken, async (req, res) => {
  try {
    const business = await getBusiness(req.user.businessId)
    if (!business) return res.status(404).json({ error: 'Business not found' })
    res.json({ ...business, settings: { ...BUSINESS_SETTINGS_DEFAULTS, ...(business.settings ?? {}) } })
  } catch (err) {
    req.log.error({ err, event: 'business.get.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/v1/business/settings — the owner sets the three business numbers. Only ever writes the caller's own business.
router.put('/settings', verifyToken, async (req, res) => {
  try {
    if (!assertCan(req, res, 'editSettings', { type: 'businesses' })) return
    const parsed = businessSettingsSchema.safeParse(req.body)
    if (!parsed.success) {
      req.log.info({ event: 'business.settings.failed', reason: 'validation' })
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message })) })
    }
    const result = await setBusinessSettings(req.user.businessId, parsed.data)
    if (!result.matchedCount) return res.status(404).json({ error: 'Business not found' })
    req.log.info({ event: 'business.settings.saved' })
    res.json({ settings: parsed.data })
  } catch (err) {
    req.log.error({ err, event: 'business.settings.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/v1/business/baseline — the owner stores how the business ran before FoodVibe. Whole replace; `filledAt` is always server-set.
router.put('/baseline', verifyToken, async (req, res) => {
  try {
    if (!assertCan(req, res, 'editSettings', { type: 'businesses' })) return
    const { filledAt: _ignored, ...body } = req.body && typeof req.body === 'object' ? req.body : {}
    const parsed = baselineInputSchema.safeParse(body)
    if (!parsed.success) {
      req.log.info({ event: 'business.baseline.failed', reason: 'validation' })
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message })) })
    }
    const baseline = { ...parsed.data, filledAt: Date.now() }
    const result = await mongoose.connection.db.collection('businesses').updateOne({ _id: String(req.user.businessId) }, { $set: { baseline } })
    if (!result.matchedCount) return res.status(404).json({ error: 'Business not found' })
    req.log.info({ event: 'business.baseline.saved' })
    res.json({ baseline })
  } catch (err) {
    req.log.error({ err, event: 'business.baseline.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

/** Items created inside the business: no master lineage, or the lineage marker is the item's own id (not cloned from master). */
const OWN = { $or: [{ _masterId: { $exists: false } }, { _masterId: null }, { $expr: { $eq: ['$_masterId', '$_id'] } }] }
/** The card only needs "reached or not", so no count goes past this. */
const SETUP_COUNT_CAP = 10

// GET /api/v1/business/setup-status — what the owner has set up so far, counting only items made in this business.
router.get('/setup-status', verifyToken, async (req, res) => {
  try {
    if (!assertCan(req, res, 'editSettings', { type: 'businesses' })) return
    const db = mongoose.connection.db
    const base = { $and: [scopeFilter(req), LIVE, OWN] }
    const count = (name, extra) =>
      db.collection(name).countDocuments(extra ? { $and: [...base.$and, extra] } : base, { limit: SETUP_COUNT_CAP })
    const [pricedProducts, suppliers, recipes, dishes, events, staff] = await Promise.all([
      count('products', { $or: [{ 'sources.price': { $gt: 0 } }, { 'purchaseOptions.priceOverride': { $gt: 0 } }] }),
      count('suppliers'),
      count('recipes'),
      count('dishes'),
      count('menuEvents'),
      User.countDocuments({ businessId: req.user.businessId, businessRole: 'staff', removedAt: null }).limit(SETUP_COUNT_CAP)
    ])
    res.json({ pricedProducts, suppliers, recipes: recipes + dishes, events, staff })
  } catch (err) {
    req.log.error({ err, event: 'business.setup_status.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

/** Owner only: sends the 403 itself. Runs before the limiter so refused requests never use up the owner's quota. */
function ownerOnly(req, res, next) {
  if (assertCan(req, res, 'manageTeam', { type: 'businesses' })) next()
}

/** The row shape every team response uses. `lastActiveAt` is filled from usageDays by plan 430. */
const toTeamRow = (user, lastActive = null) => ({
  _id: user._id,
  name: user.name,
  businessRole: user.businessRole,
  createdAt: user.createdAt ?? null,
  lastActiveAt: lastActive,
})

// GET /api/v1/business/team — the owner and the active staff of the caller's business.
router.get('/team', verifyToken, ownerOnly, async (req, res) => {
  try {
    const users = await User.find({ businessId: req.user.businessId, removedAt: null })
      .select('_id name businessRole createdAt').lean()
    const rank = user => (user.businessRole === 'owner' ? 0 : 1)
    users.sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name)))
    const lastActive = await lastActiveByUser(mongoose.connection.db, req.user.businessId)
    res.json(users.map(u => toTeamRow(u, lastActive.get(u._id) ?? null)))
  } catch (err) {
    req.log.error({ err, event: 'business.team.failed', action: 'list' })
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/v1/business/team — add a staff member with a username and an initial (client-hashed) password.
router.post('/team', verifyToken, ownerOnly, teamLimiter, async (req, res) => {
  try {
    const { name, password } = req.body || {}
    if (!isValidUsername(name)) return res.status(400).json({ error: 'INVALID_USERNAME' })
    if (!isValidPasswordHash(password)) {
      return res.status(400).json({ error: 'INVALID_PASSWORD_FORMAT' })
    }
    const trimmed = name.trim()
    if (await User.findOne({ name: trimmed }).lean()) return res.status(409).json({ error: 'USERNAME_TAKEN' })

    const business = await getBusiness(req.user.businessId)
    if (!business) return res.status(404).json({ error: 'NOT_FOUND' })

    const _id = newId()
    // No clone: staff share the business's own copy of the data. The email is a reserved placeholder
    // (`users.email` is required + unique); the .invalid domain never receives mail and the UI never shows it.
    const created = await User.create({
      _id,
      name: trimmed,
      email: `${_id}${STAFF_EMAIL_DOMAIN}`,
      imgUrl: '',
      role: 'user',
      passwordHash: password,
      businessId: req.user.businessId,
      businessRole: 'staff',
      isPlatformAdmin: false,
      createdAt: Date.now(),
      lastSyncedMasterVersion: business.lastSyncedMasterVersion ?? 0,
    })
    req.log.info({ event: 'business.team.added', staffId: _id })
    res.status(201).json(toTeamRow(created.toObject()))
  } catch (err) {
    if (err.code === 11000) {
      req.log.info({ event: 'business.team.failed', action: 'add', reason: 'username_taken' })
      return res.status(409).json({ error: 'USERNAME_TAKEN' })
    }
    req.log.error({ err, event: 'business.team.failed', action: 'add' })
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/v1/business/team/:userId — block a staff member's login. Never deletes the user or their items.
router.delete('/team/:userId', verifyToken, ownerOnly, async (req, res) => {
  try {
    const targetId = String(req.params.userId)
    const target = await User.findOne({ _id: targetId, businessId: req.user.businessId }).lean()
    if (!target) return res.status(404).json({ error: 'NOT_FOUND' })
    if (targetId === String(req.user.userId)) return res.status(403).json({ error: 'CANNOT_REMOVE_SELF' })
    if (target.businessRole === 'owner') return res.status(403).json({ error: 'CANNOT_REMOVE_OWNER' })
    if (!target.removedAt) {
      await User.updateOne({ _id: targetId }, { $set: { removedAt: Date.now() } })
      req.log.info({ event: 'business.team.removed', staffId: targetId })
    }
    res.json({ ok: true })
  } catch (err) {
    req.log.error({ err, event: 'business.team.failed', action: 'remove' })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
