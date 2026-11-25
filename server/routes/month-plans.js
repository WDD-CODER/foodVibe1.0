'use strict'
/**
 * Plan 727 (monthly plan): one document per business and month. Every route is money: the owner and a consultant with a
 * live grant pass, staff are refused (reads too). The module gate reads the ACTIVE business.
 * Logs carry the month id and key only, never an amount.
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { requireModule } = require('../middleware/require-module')
const { checkStoredDoc } = require('../middleware/validate')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { scopeFilter } = require('../utils/business-scope')
const { assertCan } = require('../utils/permissions')
const { actorOf } = require('../utils/actor')
const { newId } = require('../utils/id')
const { getBusiness } = require('../services/business')
const { BUSINESS_SETTINGS_DEFAULTS, monthPlanCreateInputSchema, monthPlanUpdateInputSchema } = require('../generated/schemas/entities')
const { MONTH_KEY_PATTERN, MONTH_TARGET_DEFAULTS } = require('../generated/schemas/month/month-rules')

const TYPE = 'monthPlans'
const LIST_CAP = 120
const router = Router()

router.use(verifyToken, requireModule('monthly_plan'), (req, res, next) => {
  if (assertCan(req, res, 'editMoney', { type: TYPE })) next()
}, dataWriteLimiter)

const col = () => mongoose.connection.db.collection(TYPE)

function invalid(req, res, event, parsed) {
  req.log.info({ event, reason: 'validation' })
  return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message })) })
}

function fail(req, res, event, err) {
  req.log.error({ err, event })
  return res.status(500).json({ error: 'Server error' })
}

const monthOf = req => (MONTH_KEY_PATTERN.test(req.params.month) ? req.params.month : null)

// GET /api/v1/month-plans -> { months } newest first
router.get('/', async (req, res) => {
  try {
    const months = await col().find(scopeFilter(req)).sort({ month: -1 }).limit(LIST_CAP).toArray()
    res.json({ months })
  } catch (err) {
    fail(req, res, 'month.list.failed', err)
  }
})

// GET /api/v1/month-plans/:month
router.get('/:month', async (req, res) => {
  const month = monthOf(req)
  if (!month) return res.status(400).json({ error: 'INVALID_MONTH' })
  try {
    const doc = await col().findOne({ ...scopeFilter(req), month })
    if (!doc) return res.status(404).json({ error: 'MONTH_NOT_FOUND' })
    res.json(doc)
  } catch (err) {
    fail(req, res, 'month.get.failed', err)
  }
})

// POST /api/v1/month-plans { month } -> 201 the new month (targets and VAT copied from the business settings)
router.post('/', async (req, res) => {
  const parsed = monthPlanCreateInputSchema.safeParse(req.body)
  if (!parsed.success) return invalid(req, res, 'month.created.failed', parsed)
  const { month } = parsed.data
  try {
    if (await col().findOne({ ...scopeFilter(req), month }, { projection: { _id: 1 } })) return res.status(409).json({ error: 'MONTH_EXISTS' })
    const settings = { ...BUSINESS_SETTINGS_DEFAULTS, ...((await getBusiness(req.user.businessId))?.settings ?? {}) }
    const now = Date.now()
    const doc = {
      _id: newId(),
      schemaVersion: 2,
      businessId: req.user.businessId,
      createdBy: actorOf(req).userId,
      createdAt: now,
      updatedAt: now,
      month,
      status: 'open',
      targets: { ...MONTH_TARGET_DEFAULTS, ...(settings.monthTargets ?? {}) },
      vatRatePct: settings.vatRatePct,
      dealerType: settings.dealerType,
      revenue: { plan: null, actual: null }
    }
    const check = checkStoredDoc(TYPE, doc)
    if (!check.ok) {
      req.log.warn({ event: 'month.created.failed', reason: 'stored_doc', issues: check.issues.length })
      return res.status(400).json({ error: 'Validation failed', issues: check.issues })
    }
    await col().insertOne(doc)
    req.log.info({ event: 'month.created', monthId: doc._id, month })
    res.status(201).json(doc)
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: 'MONTH_EXISTS' })
    fail(req, res, 'month.created.failed', err)
  }
})

// PUT /api/v1/month-plans/:month -> 200 the stored month; sets only the named paths
router.put('/:month', async (req, res) => {
  const month = monthOf(req)
  if (!month) return res.status(400).json({ error: 'INVALID_MONTH' })
  const parsed = monthPlanUpdateInputSchema.safeParse(req.body)
  if (!parsed.success) return invalid(req, res, 'month.saved.failed', parsed)
  try {
    const scope = { ...scopeFilter(req), month }
    const doc = await col().findOne(scope)
    if (!doc) return res.status(404).json({ error: 'MONTH_NOT_FOUND' })
    if (doc.status === 'closed') return res.status(409).json({ error: 'MONTH_CLOSED' })
    const set = {}
    for (const [key, value] of Object.entries(parsed.data.revenue ?? {})) if (value !== undefined) set[`revenue.${key}`] = value
    for (const [key, value] of Object.entries(parsed.data.targets ?? {})) if (value !== undefined) set[`targets.${key}`] = value
    const updatedAt = Date.now()
    const next = { ...doc, revenue: { ...doc.revenue }, targets: { ...doc.targets }, updatedAt }
    for (const [path, value] of Object.entries(set)) {
      const [group, key] = path.split('.')
      next[group][key] = value
    }
    const check = checkStoredDoc(TYPE, next)
    if (!check.ok) {
      req.log.warn({ event: 'month.saved.failed', reason: 'stored_doc', issues: check.issues.length })
      return res.status(400).json({ error: 'Validation failed', issues: check.issues })
    }
    await col().updateOne({ _id: doc._id, ...scopeFilter(req), status: 'open' }, { $set: { ...set, updatedAt } })
    req.log.info({ event: 'month.saved', monthId: doc._id, month })
    res.json(next)
  } catch (err) {
    fail(req, res, 'month.saved.failed', err)
  }
})

module.exports = router
