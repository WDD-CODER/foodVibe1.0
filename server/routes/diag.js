'use strict'
/**
 * Plan 633 (C-DIAG): a consultant's diagnosis record. The generic data API only reads `diagnoses`; every write is here.
 * The module gate reads the HOME business (the consultant's own); the data is the active (client's) business.
 * Logs carry ids and counts only: never a dish name, a product name or a price.
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { requireHomeModule } = require('../middleware/require-module')
const { checkStoredDoc } = require('../middleware/validate')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { scopeFilter } = require('../utils/business-scope')
const { assertCan } = require('../utils/permissions')
const { actorOf } = require('../utils/actor')
const { newId } = require('../utils/id')
const { LIVE } = require('../jobs/purge-deleted')
const { confirmAiDraft } = require('../services/ai-drafts')
const { diagCreateInputSchema, diagMenuInputSchema, diagInvoicesInputSchema, diagStatusInputSchema } = require('../generated/schemas/diag/diag-inputs')
const { menuKeptRatio } = require('../generated/schemas/diag/menu-draft')
const { priceVolatility } = require('../generated/schemas/diag/volatility')

const TYPE = 'diagnoses'
const HISTORY_CAP = 20000
const DAY_MS = 86400000
const router = Router()

router.use(verifyToken, requireHomeModule('consultant_diag'), (req, res, next) => {
  if (assertCan(req, res, 'editMoney', { type: TYPE })) next()
}, dataWriteLimiter)

const db = () => mongoose.connection.db
const scopeOf = req => ({ _id: req.params.id, ...scopeFilter(req) })

function invalid(req, res, event, parsed) {
  req.log.info({ event, reason: 'validation' })
  return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message })) })
}

function fail(req, res, event, err) {
  req.log.error({ err, event })
  return res.status(500).json({ error: 'Server error' })
}

function storeFailure(req, res, event, check) {
  req.log.warn({ event, reason: 'stored_doc', issues: check.issues.length })
  return res.status(400).json({ error: 'Validation failed', issues: check.issues })
}

// POST /api/v1/diag -> 201 the new diagnosis
router.post('/', async (req, res) => {
  const parsed = diagCreateInputSchema.safeParse(req.body)
  if (!parsed.success) return invalid(req, res, 'diag.created.failed', parsed)
  try {
    const now = Date.now()
    const doc = {
      _id: newId(),
      schemaVersion: 2,
      businessId: req.user.businessId,
      createdBy: actorOf(req).userId,
      createdAt: now,
      updatedAt: now,
      name: parsed.data.name,
      periodDays: parsed.data.periodDays ?? 60,
      menu: [],
      invoiceIds: [],
      homeBusinessId: req.user.homeBusinessId ?? req.user.businessId,
      status: 'open',
      pricesIncludeVat: parsed.data.pricesIncludeVat ?? true,
      vatPct: parsed.data.vatPct ?? 18
    }
    const check = checkStoredDoc(TYPE, doc)
    if (!check.ok) return storeFailure(req, res, 'diag.created.failed', check)
    await db().collection(TYPE).insertOne(doc)
    req.log.info({ event: 'diag.created', diagnosisId: doc._id })
    res.status(201).json(doc)
  } catch (err) {
    fail(req, res, 'diag.created.failed', err)
  }
})

/** Loads the diagnosis of the active business; answers 404 (and returns null) when it is not there. */
async function load(req, res) {
  const doc = await db().collection(TYPE).findOne(scopeOf(req))
  if (!doc) { res.status(404).json({ error: 'NOT_FOUND' }); return null }
  return doc
}

/** Checks the whole new document, writes `set`, answers the stored document. Returns true when it answered 2xx. */
async function save(req, res, doc, set, event) {
  const next = { ...doc, ...set, updatedAt: Date.now() }
  const check = checkStoredDoc(TYPE, next)
  if (!check.ok) { storeFailure(req, res, `${event}.failed`, check); return false }
  await db().collection(TYPE).updateOne(scopeOf(req), { $set: { ...set, updatedAt: next.updatedAt } })
  res.json(next)
  return true
}

router.put('/:id/menu', async (req, res) => {
  const parsed = diagMenuInputSchema.safeParse(req.body)
  if (!parsed.success) return invalid(req, res, 'diag.menu.failed', parsed)
  try {
    const doc = await load(req, res)
    if (!doc) return
    if (doc.status === 'done') return res.status(409).json({ error: 'DIAGNOSIS_DONE' })
    const { menu, draftId, pricesIncludeVat, vatPct } = parsed.data
    const dishIds = [...new Set(menu.map(m => m.dishId).filter(id => id !== undefined))]
    if (dishIds.length) {
      const found = await db().collection('dishes').countDocuments({ _id: { $in: dishIds }, ...scopeFilter(req), ...LIVE })
      if (found !== dishIds.length) return res.status(400).json({ error: 'UNKNOWN_DISH' })
    }
    const set = { menu }
    if (pricesIncludeVat !== undefined) set.pricesIncludeVat = pricesIncludeVat
    if (vatPct !== undefined) set.vatPct = vatPct
    if (!(await save(req, res, doc, set, 'diag.menu'))) return
    req.log.info({ event: 'diag.menu.saved', diagnosisId: doc._id, rows: menu.length })
    if (draftId) {
      try {
        await confirmAiDraft(req, draftId, { items: menu }, menuKeptRatio)
      } catch (err) {
        req.log.warn({ err, event: 'diag.menu.draft_confirm_failed' })
      }
    }
  } catch (err) {
    if (!res.headersSent) fail(req, res, 'diag.menu.failed', err)
  }
})

router.put('/:id/invoices', async (req, res) => {
  const parsed = diagInvoicesInputSchema.safeParse(req.body)
  if (!parsed.success) return invalid(req, res, 'diag.invoices.failed', parsed)
  try {
    const doc = await load(req, res)
    if (!doc) return
    if (doc.status === 'done') return res.status(409).json({ error: 'DIAGNOSIS_DONE' })
    const invoiceIds = [...new Set(parsed.data.invoiceIds)]
    if (invoiceIds.length) {
      const found = await db().collection('invoices').countDocuments({ _id: { $in: invoiceIds }, ...scopeFilter(req), ...LIVE })
      if (found !== invoiceIds.length) return res.status(400).json({ error: 'UNKNOWN_INVOICE' })
    }
    if (await save(req, res, doc, { invoiceIds }, 'diag.invoices')) {
      req.log.info({ event: 'diag.invoices.saved', diagnosisId: doc._id, count: invoiceIds.length })
    }
  } catch (err) {
    if (!res.headersSent) fail(req, res, 'diag.invoices.failed', err)
  }
})

router.put('/:id/status', async (req, res) => {
  const parsed = diagStatusInputSchema.safeParse(req.body)
  if (!parsed.success) return invalid(req, res, 'diag.status.failed', parsed)
  try {
    const doc = await load(req, res)
    if (!doc) return
    if (await save(req, res, doc, { status: parsed.data.status }, 'diag.status')) {
      req.log.info({ event: 'diag.status.saved', diagnosisId: doc._id, status: parsed.data.status })
    }
  } catch (err) {
    if (!res.headersSent) fail(req, res, 'diag.status.failed', err)
  }
})

// GET /api/v1/diag/:id/data -> { diagnosis, volatility } from priceHistory inside the period
router.get('/:id/data', async (req, res) => {
  try {
    const doc = await load(req, res)
    if (!doc) return
    const since = Date.now() - (doc.periodDays ?? 60) * DAY_MS
    const rows = await db().collection('priceHistory')
      .find({ businessId: req.user.businessId, at: { $gte: since } }, { projection: { _id: 0, productId: 1, supplierId: 1, price: 1 } })
      .limit(HISTORY_CAP)
      .toArray()
    if (rows.length >= HISTORY_CAP) req.log.warn({ event: 'diag.data.history_capped', count: rows.length })
    res.json({ diagnosis: doc, volatility: priceVolatility(rows) })
  } catch (err) {
    fail(req, res, 'diag.data.failed', err)
  }
})

module.exports = router
