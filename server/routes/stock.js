'use strict'
/**
 * Plan 635 (contract C-STOCK): stock counts. The generic data API only reads `stockCounts` (writes answer 405 USE_ROUTER);
 * this router computes `baseQuantity` on the server and moves a count from draft to final, one way.
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { checkStoredDoc } = require('../middleware/validate')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { scopeFilter, stampNew } = require('../utils/business-scope')
const { assertCan } = require('../utils/permissions')
const { actorOf } = require('../utils/actor')
const { newId } = require('../utils/id')
const { loadUnitRates } = require('../utils/unit-rates')
const { LIVE } = require('../jobs/purge-deleted')
const { confirmAiDraft } = require('../services/ai-drafts')
const { stockKeptRatio } = require('../utils/stock-extract')
const { toBase } = require('../generated/schemas/units/to-base')
const { stockCountInputSchema } = require('../generated/schemas/stock/stock-count-input.schema')

const TYPE = 'stockCounts'
const router = Router()
const NOT_FOUND = { error: 'Count not found' }
const DAY = 24 * 3_600_000

router.use(dataWriteLimiter)

const db = () => mongoose.connection.db
const scopeOf = req => ({ _id: req.params.id, ...scopeFilter(req), ...LIVE })

function fail(req, res, name, err) {
  req.log.error({ err, event: `stock.${name}.failed` })
  res.status(500).json({ error: 'Server error' })
}

/** Returns `{ lines }` with the base amounts, or `{ error }` (a body for a 400) when a line fails. Nothing is stored here. */
async function convertLines(req, lines) {
  const ids = [...new Set(lines.map(l => l.productId))]
  const products = ids.length
    ? await db().collection('products')
      .find({ _id: { $in: ids }, ...scopeFilter(req), ...LIVE }, { projection: { baseUnit: 1, purchaseOptions: 1 } })
      .toArray()
    : []
  const byId = new Map(products.map(p => [String(p._id), p]))
  const rates = await loadUnitRates(req)
  const seen = new Set()
  const out = []
  for (let line = 0; line < lines.length; line++) {
    const l = lines[line]
    if (seen.has(l.productId)) return { error: { error: 'DUPLICATE_PRODUCT', line } }
    seen.add(l.productId)
    const product = byId.get(l.productId)
    if (!product) return { error: { error: 'UNKNOWN_PRODUCT', line } }
    const result = toBase(l.quantity, l.unit, product, rates)
    if (result === null || !Number.isFinite(result) || result < 0) return { error: { error: 'UNIT_NOT_CONVERTIBLE', line } }
    out.push({ productId: l.productId, quantity: l.quantity, unit: l.unit, baseQuantity: Math.round(result * 1e6) / 1e6 })
  }
  return { lines: out }
}

/** Parses the body; answers the 400 itself and returns null when it is not a valid count. */
function readInput(req, res) {
  const parsed = stockCountInputSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'BAD_COUNT_INPUT', issues: parsed.error.issues })
    return null
  }
  if (parsed.data.countedAt > Date.now() + DAY) {
    res.status(400).json({ error: 'BAD_COUNTED_AT' })
    return null
  }
  return parsed.data
}

// POST /api/v1/stock/counts
router.post('/counts', verifyToken, async (req, res) => {
  try {
    const input = readInput(req, res)
    if (!input) return
    if (!assertCan(req, res, 'create', { type: TYPE })) return
    const converted = await convertLines(req, input.lines)
    if (converted.error) return res.status(400).json(converted.error)
    const now = Date.now()
    const doc = stampNew(req, {
      _id: newId(), schemaVersion: 2, updatedAt: now, countedAt: input.countedAt, status: 'draft',
      source: input.source ?? 'manual',
      ...(input.draftIds && { draftIds: input.draftIds }),
      ...(input.note !== undefined && { note: input.note }),
      lines: converted.lines,
    })
    const check = checkStoredDoc(TYPE, doc)
    if (!check.ok) return res.status(400).json({ error: 'Validation failed', issues: check.issues })
    await db().collection(TYPE).insertOne(doc)
    req.log.info({ event: 'stock.count.created', lines: doc.lines.length })
    res.status(201).json(doc)
  } catch (err) {
    fail(req, res, 'create', err)
  }
})

// PUT /api/v1/stock/counts/:id  (draft only)
router.put('/counts/:id', verifyToken, async (req, res) => {
  try {
    const input = readInput(req, res)
    if (!input) return
    const current = await db().collection(TYPE).findOne(scopeOf(req))
    if (!current) return res.status(404).json(NOT_FOUND)
    if (!assertCan(req, res, 'edit', { type: TYPE, doc: current })) return
    if (current.status !== 'draft') return res.status(409).json({ error: 'COUNT_FINAL' })
    const converted = await convertLines(req, input.lines)
    if (converted.error) return res.status(400).json(converted.error)
    const now = Date.now()
    const next = { ...current, countedAt: input.countedAt, lines: converted.lines, updatedAt: now }
    if (input.note === undefined) delete next.note
    else next.note = input.note
    if (input.source) next.source = input.source
    if (input.draftIds) next.draftIds = input.draftIds
    const check = checkStoredDoc(TYPE, next)
    if (!check.ok) return res.status(400).json({ error: 'Validation failed', issues: check.issues })
    const $set = { countedAt: next.countedAt, lines: next.lines, updatedAt: now }
    if (input.source) $set.source = input.source
    if (input.draftIds) $set.draftIds = input.draftIds
    const update = { $set }
    if (input.note === undefined) update.$unset = { note: '' }
    else $set.note = input.note
    const result = await db().collection(TYPE).findOneAndUpdate(
      { ...scopeOf(req), status: 'draft' }, update, { returnDocument: 'after' })
    if (!result) return res.status(409).json({ error: 'COUNT_FINAL' })
    req.log.info({ event: 'stock.count.updated', lines: next.lines.length })
    res.json(result)
  } catch (err) {
    fail(req, res, 'update', err)
  }
})

// POST /api/v1/stock/counts/:id/finalize
router.post('/counts/:id/finalize', verifyToken, async (req, res) => {
  try {
    const current = await db().collection(TYPE).findOne(scopeOf(req))
    if (!current) return res.status(404).json(NOT_FOUND)
    if (!assertCan(req, res, 'edit', { type: TYPE, doc: current })) return
    if (current.status !== 'draft') return res.status(409).json({ error: 'COUNT_FINAL' })
    if (!current.lines?.length) return res.status(400).json({ error: 'EMPTY_COUNT' })
    const converted = await convertLines(req, current.lines)
    if (converted.error) return res.status(400).json(converted.error)
    const now = Date.now()
    const set = { status: 'final', finalAt: now, finalBy: actorOf(req).userId, lines: converted.lines, updatedAt: now }
    const check = checkStoredDoc(TYPE, { ...current, ...set })
    if (!check.ok) return res.status(400).json({ error: 'Validation failed', issues: check.issues })
    const result = await db().collection(TYPE).findOneAndUpdate(
      { ...scopeOf(req), status: 'draft' }, { $set: set }, { returnDocument: 'after' })
    if (!result) return res.status(409).json({ error: 'COUNT_FINAL' })
    // Plan 637: each pending draft is scored against its own suggested lines. A failure never fails the finalise.
    const saved = { lines: converted.lines.map(l => ({ productId: l.productId, quantity: l.quantity, unit: l.unit })) }
    for (const draftId of current.draftIds ?? []) {
      try {
        await confirmAiDraft(req, draftId, saved, stockKeptRatio)
      } catch {
        req.log.warn({ event: 'stock.count.draft_confirm_failed' })
      }
    }
    req.log.info({ event: 'stock.count.finalized', lines: converted.lines.length })
    res.json(result)
  } catch (err) {
    fail(req, res, 'finalize', err)
  }
})

// GET /api/v1/stock/counts?status=draft|final|all&limit=
router.get('/counts', verifyToken, async (req, res) => {
  try {
    if (!assertCan(req, res, 'create', { type: TYPE })) return
    const { status, limit } = req.query
    // Plan 651: `status=all` lists drafts and finished counts together (the past-counts list).
    if (status !== 'draft' && status !== 'final' && status !== 'all') return res.status(400).json({ error: 'BAD_STATUS' })
    let n = 20
    if (limit !== undefined) {
      if (typeof limit !== 'string' || !/^\d+$/.test(limit)) return res.status(400).json({ error: 'BAD_LIMIT' })
      n = Number(limit)
      if (n < 1 || n > 100) return res.status(400).json({ error: 'BAD_LIMIT' })
    }
    const counts = await db().collection(TYPE)
      .find({ ...scopeFilter(req), ...LIVE, ...(status !== 'all' && { status }) })
      .sort({ countedAt: -1, updatedAt: -1 })
      .limit(n)
      .toArray()
    res.json(counts)
  } catch (err) {
    fail(req, res, 'list', err)
  }
})

// GET /api/v1/stock/on-hand -> [{ productId, baseQuantity, countedAt }]
router.get('/on-hand', verifyToken, async (req, res) => {
  try {
    if (!assertCan(req, res, 'create', { type: TYPE })) return
    const rows = await db().collection(TYPE).aggregate([
      { $match: { ...scopeFilter(req), ...LIVE, status: 'final' } },
      { $sort: { countedAt: -1, finalAt: -1 } },
      { $unwind: '$lines' },
      { $group: { _id: '$lines.productId', baseQuantity: { $first: '$lines.baseQuantity' }, countedAt: { $first: '$countedAt' } } },
      { $sort: { _id: 1 } },
    ]).toArray()
    res.json(rows.map(r => ({ productId: r._id, baseQuantity: r.baseQuantity, countedAt: r.countedAt })))
  } catch (err) {
    fail(req, res, 'on_hand', err)
  }
})

module.exports = router
