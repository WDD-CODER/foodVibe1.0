'use strict'
/** Plan 425: the caller's business. Plan 428: the owner's team (list, add, remove). Plan 429: owner-only settings. Plan 431: owner-only opening baseline and setup status. Plan 477: owner-only stages staff may see. */
const { Router } = require('express')
const { createRateLimiter } = require('../middleware/rate-limit')
const { verifyToken } = require('../middleware/auth')
const { getBusiness, setHiddenLogisticsKeys, setStaffVisibleStages, setBusinessName, setBusinessSettings, setBusinessBaseline } = require('../services/business')
const { assertCan } = require('../utils/permissions')
const { checkStoredDoc } = require('../middleware/validate')
const { actorOf } = require('../utils/actor')
const { frontDeskSetup } = require('../services/front-desk-setup')
const { frontDeskIntakeSchema } = require('../generated/schemas/front-desk-intake.schema')
const { templateFor } = require('../generated/schemas/front-desk-templates')
const { isValidUsername, isValidPasswordHash, releasedUsername } = require('../utils/username')
const { newId } = require('../utils/id')
const User = require('../models/user.model')
const { businessSettingsSchema, businessNameInputSchema, staffVisibleStagesInputSchema, logisticsHiddenInputSchema, baselineInputSchema, BUSINESS_SETTINGS_DEFAULTS } = require('../generated/schemas/entities')
const mongoose = require('mongoose')
const { lastActiveByUser } = require('../utils/usage-stats')
const { scopeFilter } = require('../utils/business-scope')
const { LIVE, NOT_MASTER_CLONE } = require('../jobs/purge-deleted')

const router = Router()

const STAFF_EMAIL_DOMAIN = '@staff.foodvibe.invalid'

// Team routes are not under the /api/v1/data write limiter, and POST creates accounts, so POST is rate limited.
const teamLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: req => String(req.user?.userId ?? 'anonymous'),
  validate: { keyGeneratorIpFallback: false },
  message: 'Too many team requests, please try again later',
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

// PUT /api/v1/business/name — the owner renames the business (plan 472). Only ever writes the caller's own business.
router.put('/name', verifyToken, async (req, res) => {
  try {
    if (!assertCan(req, res, 'editSettings', { type: 'businesses' })) return
    const parsed = businessNameInputSchema.safeParse(req.body)
    if (!parsed.success) {
      req.log.info({ event: 'business.name.failed', reason: 'validation' })
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message })) })
    }
    const result = await setBusinessName(req.user.businessId, parsed.data.name)
    if (!result.matchedCount) return res.status(404).json({ error: 'Business not found' })
    req.log.info({ event: 'business.name.saved' })
    res.json({ name: parsed.data.name })
  } catch (err) {
    req.log.error({ err, event: 'business.name.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/v1/business/staff-visible-stages — the owner picks the event stages staff may see (plan 477). Only the caller's own business.
router.put('/staff-visible-stages', verifyToken, async (req, res) => {
  try {
    if (!assertCan(req, res, 'editSettings', { type: 'businesses' })) return
    const parsed = staffVisibleStagesInputSchema.safeParse(req.body)
    if (!parsed.success) {
      req.log.info({ event: 'business.staff_stages.failed', reason: 'validation' })
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message })) })
    }
    const result = await setStaffVisibleStages(req.user.businessId, parsed.data.stages)
    if (!result.matchedCount) return res.status(404).json({ error: 'Business not found' })
    req.log.info({ event: 'business.staff_stages.saved', count: result.staffVisibleStages.length })
    res.json({ staffVisibleStages: result.staffVisibleStages })
  } catch (err) {
    req.log.error({ err, event: 'business.staff_stages.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/v1/business/logistics-hidden — the owner's whole list of hidden logistics questions (plan 579). Only the caller's own business.
router.put('/logistics-hidden', verifyToken, async (req, res) => {
  try {
    if (!assertCan(req, res, 'editSettings', { type: 'businesses' })) return
    const parsed = logisticsHiddenInputSchema.safeParse(req.body)
    if (!parsed.success) {
      req.log.info({ event: 'business.logistics_hidden.failed', reason: 'validation' })
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message })) })
    }
    const result = await setHiddenLogisticsKeys(req.user.businessId, parsed.data.keys)
    if (!result.matchedCount) return res.status(404).json({ error: 'Business not found' })
    req.log.info({ event: 'business.logistics_hidden.saved', count: result.hiddenLogisticsKeys.length })
    res.json({ hiddenLogisticsKeys: result.hiddenLogisticsKeys })
  } catch (err) {
    req.log.error({ err, event: 'business.logistics_hidden.failed' })
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
    const result = await setBusinessBaseline(req.user.businessId, baseline)
    if (!result.matchedCount) return res.status(404).json({ error: 'Business not found' })
    req.log.info({ event: 'business.baseline.saved' })
    res.json({ baseline })
  } catch (err) {
    req.log.error({ err, event: 'business.baseline.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

/** Plan 556: the kind config the intake starts from: the stored one, else the type's template, else a switched-off shell. */
function intakeKindBase(existing, template) {
  return JSON.parse(JSON.stringify(existing ?? template ?? { enabled: false, questions: [], rules: {}, expireAfterHours: 24 }))
}

/** Plan 556: the intake `requestKinds` merged over the stored kinds (enabled, rules, sitting length, event types only). */
function mergeIntakeKinds(stored, template, incoming) {
  const kinds = { ...stored }
  for (const kind of Object.keys(template)) if (!kinds[kind]) kinds[kind] = intakeKindBase(null, template[kind])
  for (const [kind, change] of Object.entries(incoming ?? {})) {
    const cfg = intakeKindBase(kinds[kind], template[kind])
    if (change.enabled !== undefined) cfg.enabled = change.enabled
    if (change.rules) cfg.rules = { ...cfg.rules, ...change.rules }
    if (change.defaultDurationMinutes !== undefined) cfg.defaultDurationMinutes = change.defaultDurationMinutes
    if (change.eventTypeOptions) {
      cfg.questions = cfg.questions.map(q => (q.key === 'event_type' ? { ...q, options: change.eventTypeOptions } : q))
    }
    kinds[kind] = cfg
  }
  return kinds
}

const hasBaselineValue = baseline => !!baseline && Object.values(baseline).some(v => v !== undefined)

// POST /api/v1/business/front-desk-intake — the owner's whole onboarding form in one save (plan 556): profile, draft knowledge items, optional baseline.
router.post('/front-desk-intake', verifyToken, async (req, res) => {
  try {
    if (!assertCan(req, res, 'editFrontDesk', { type: 'frontDeskProfiles' })) return
    const parsed = frontDeskIntakeSchema.safeParse(req.body)
    if (!parsed.success) {
      req.log.info({ event: 'business.front_desk_intake.failed', reason: 'validation' })
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message })) })
    }
    const { businessType, profile: input, knowledge, baseline } = parsed.data
    const { businessId } = scopeFilter(req)
    const db = mongoose.connection.db
    const actor = actorOf(req)
    const now = Date.now()
    const template = templateFor(businessType)
    const stored = await db.collection('frontDeskProfiles').findOne({ businessId, ...LIVE })
    if (!stored && !input.slug) return res.status(400).json({ error: 'SLUG_REQUIRED' })

    // 1. Profile: build the stored document, check it, write it later.
    const { requestKinds: incomingKinds, assistant: incomingAssistant, ...plain } = input
    const set = {}
    for (const [key, value] of Object.entries(plain)) if (value !== undefined) set[key] = value
    const base = stored ?? { _id: newId(), schemaVersion: 2, userId: actor.userId, businessId, createdBy: actor.userId, createdAt: now, ...template }
    const merged = {
      ...base,
      ...set,
      businessType,
      requestKinds: mergeIntakeKinds(stored?.requestKinds ?? {}, template.requestKinds, incomingKinds),
      assistant: { ...base.assistant, ...(incomingAssistant && Object.fromEntries(Object.entries(incomingAssistant).filter(([, v]) => v !== undefined))) },
      updatedAt: now,
    }
    const profileCheck = checkStoredDoc('frontDeskProfiles', merged)
    if (!profileCheck.ok) return res.status(400).json({ error: 'Validation failed', issues: profileCheck.issues })

    // 2. Knowledge: new items are drafts, a draft match is updated, an approved match is left alone.
    const items = db.collection('knowledgeItems')
    const existing = await items.find({ businessId, ...LIVE }, { projection: { _id: 1, question: 1, status: 1 } }).toArray()
    const byQuestion = new Map(existing.map(i => [i.question, i]))
    const writes = { create: [], update: [], skipped: 0 }
    for (const item of knowledge) {
      const match = byQuestion.get(item.question)
      if (!match) {
        const doc = { _id: newId(), schemaVersion: 2, userId: actor.userId, businessId, createdBy: actor.userId, createdAt: now, updatedAt: now, ...item, status: 'draft', source: 'manual' }
        const check = checkStoredDoc('knowledgeItems', doc)
        if (!check.ok) return res.status(400).json({ error: 'Validation failed', issues: check.issues })
        writes.create.push(doc)
        byQuestion.set(item.question, { _id: doc._id, question: item.question, status: 'draft' })
      } else if (match.status === 'draft') {
        writes.update.push({ _id: match._id, $set: { answer: item.answer, topic: item.topic, visibility: item.visibility, updatedAt: now } })
      } else {
        writes.skipped += 1
      }
    }

    try {
      if (stored) {
        const { _id, ...fields } = merged
        await db.collection('frontDeskProfiles').updateOne({ _id, businessId }, { $set: fields })
      } else {
        await db.collection('frontDeskProfiles').insertOne(merged)
      }
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'SLUG_TAKEN', messageKey: 'fd_slug_taken' })
      throw err
    }
    if (writes.create.length) await items.insertMany(writes.create)
    for (const u of writes.update) await items.updateOne({ _id: u._id, businessId }, { $set: u.$set })

    // 3. Baseline only when the owner filled at least one number (D15); otherwise it stays as it is.
    let baselineResult = 'skipped'
    if (hasBaselineValue(baseline)) {
      const clean = Object.fromEntries(Object.entries(baseline).filter(([, v]) => v !== undefined))
      await setBusinessBaseline(businessId, { ...clean, filledAt: now })
      baselineResult = 'saved'
    }
    const knowledgeCounts = { created: writes.create.length, updated: writes.update.length, skipped: writes.skipped }
    req.log.info({ event: 'business.front_desk_intake.saved', ...knowledgeCounts, baseline: baselineResult })
    res.json({ profileId: merged._id, knowledge: knowledgeCounts, baseline: baselineResult })
  } catch (err) {
    req.log.error({ err, event: 'business.front_desk_intake.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

/** The card shows at most "5 of 5" (priced-products goal, plan 469), so no count goes past this. */
const SETUP_COUNT_CAP = 5

// GET /api/v1/business/setup-status — what the owner has set up so far, counting only items made in this business.
router.get('/setup-status', verifyToken, async (req, res) => {
  try {
    if (!assertCan(req, res, 'editSettings', { type: 'businesses' })) return
    const db = mongoose.connection.db
    const base = { $and: [scopeFilter(req), LIVE, NOT_MASTER_CLONE] }
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
    const frontDesk = await frontDeskSetup(db, req.user.businessId)
    res.json({ pricedProducts, suppliers, recipes: recipes + dishes, events, staff, frontDesk })
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

// DELETE /api/v1/business/team/:userId — block a staff member's login and free his username (plan 492:
// the name moves to `removedName`, `name` becomes a tombstone). Never deletes the user or their items.
router.delete('/team/:userId', verifyToken, ownerOnly, async (req, res) => {
  try {
    const targetId = String(req.params.userId)
    const target = await User.findOne({ _id: targetId, businessId: req.user.businessId }).lean()
    if (!target) return res.status(404).json({ error: 'NOT_FOUND' })
    if (targetId === String(req.user.userId)) return res.status(403).json({ error: 'CANNOT_REMOVE_SELF' })
    if (target.businessRole === 'owner') return res.status(403).json({ error: 'CANNOT_REMOVE_OWNER' })
    if (!target.removedAt || !target.removedName) {
      const $set = { removedName: target.name, name: releasedUsername(target.name, targetId) }
      if (!target.removedAt) $set.removedAt = Date.now()
      await User.updateOne({ _id: targetId }, { $set })
      req.log.info({ event: 'business.team.removed', staffId: targetId })
    }
    res.json({ ok: true })
  } catch (err) {
    req.log.error({ err, event: 'business.team.failed', action: 'remove' })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
