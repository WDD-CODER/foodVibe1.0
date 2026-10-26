'use strict'
/**
 * Plan 432: the supplier price-list import, applied in ONE request (INV-3). Owner only (prices are money).
 * A dedicated router because one 200-row import must not eat the generic write limiter (300 writes / 15 min).
 *
 * POST /api/v1/product-import/apply  { supplierId: string | null, rows: ApplyRow[] }
 *   ApplyRow = { name, baseUnit, price: number | null, category: string | null, purchaseUnit: string | null, purchaseQty: number | null }
 *   -> { created, updated, skipped, skippedRows: [{ name, reason: 'same_price' | 'no_price' | 'invalid' | 'duplicate' }] }
 * A matching product (same normalized name, same business) only gets its price/supplier updated; a new name is created.
 */
const { Router } = require('express')
const { createRateLimiter } = require('../middleware/rate-limit')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { assertCan } = require('../utils/permissions')
const { scopeFilter, readScope, stampNew } = require('../utils/business-scope')
const { checkStoredDoc } = require('../middleware/validate')
const { LIVE } = require('../jobs/purge-deleted')
const { newId } = require('../utils/id')
const { MAX_IMPORT_ROWS, BASE_UNITS, normalizeProductName } = require('../utils/price-list-import')

const router = Router()

// IMPORT_LIMIT_MAX: tests raise or lower the budget; production keeps the plan's 10 per 15 minutes.
const IMPORT_LIMIT_MAX = Number(process.env.IMPORT_LIMIT_MAX ?? 10)
const importLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: IMPORT_LIMIT_MAX,
  keyGenerator: req => String(req.user?.userId ?? 'anonymous'),
  validate: { keyGeneratorIpFallback: false },
  message: 'Too many imports, please try again later',
})

const col = name => mongoose.connection.db.collection(name)
const positive = value => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null)

router.post('/apply', verifyToken, (req, res, next) => {
  if (assertCan(req, res, 'editMoney', { type: 'products' })) next()
}, importLimiter, async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null
    if (!rows) return res.status(400).json({ error: 'rows is required' })
    if (rows.length > MAX_IMPORT_ROWS) return res.status(400).json({ error: 'TOO_MANY_ROWS', max: MAX_IMPORT_ROWS })

    const supplierId = typeof req.body.supplierId === 'string' && req.body.supplierId ? req.body.supplierId : null
    if (supplierId) {
      const supplier = await col('suppliers').findOne({ _id: supplierId, ...scopeFilter(req), ...LIVE }, { projection: { _id: 1 } })
      if (!supplier) return res.status(400).json({ error: 'UNKNOWN_SUPPLIER' })
    }
    const sourceKey = supplierId ?? ''

    const existing = await col('products').find({ ...scopeFilter(req), ...LIVE }).toArray()
    const byName = new Map()
    for (const product of existing) {
      const nameKey = normalizeProductName(product.nameHebrew)
      if (!byName.has(nameKey)) byName.set(nameKey, product) // first one wins, same as the client preview
    }

    const unitTerms = await col('taxonomyTerms').find({ ...readScope(req, 'taxonomyTerms'), kind: 'unit' }, { projection: { key: 1 } }).toArray()
    const knownUnits = new Set([...BASE_UNITS, ...unitTerms.map(term => term.key)])

    const now = Date.now()
    const userId = req.user.userId
    const created = []
    const updates = []
    const skippedRows = []
    const seen = new Set()

    for (const row of rows) {
      const name = typeof row?.name === 'string' ? row.name.trim().replace(/\s+/g, ' ') : ''
      const key = normalizeProductName(name)
      if (!key) { skippedRows.push({ name, reason: 'invalid' }); continue }
      if (seen.has(key)) { skippedRows.push({ name, reason: 'duplicate' }); continue }
      seen.add(key)
      const price = positive(row.price)

      const match = byName.get(key)
      if (match) {
        if (price === null) { skippedRows.push({ name, reason: 'no_price' }); continue }
        const sources = Array.isArray(match.sources) ? match.sources.map(source => ({ ...source })) : []
        const current = sources.find(source => source.supplierId === sourceKey)
        if (current && current.price === price) { skippedRows.push({ name, reason: 'same_price' }); continue }
        if (current) {
          current.price = price
        } else {
          sources.push({ supplierId: sourceKey, price, addedBy: userId, addedAt: now })
        }
        const next = { ...match, sources, updatedAt: now, _userModified: true }
        if (!checkStoredDoc('products', next).ok) { skippedRows.push({ name, reason: 'invalid' }); continue }
        updates.push({ updateOne: { filter: { _id: match._id, ...scopeFilter(req), ...LIVE }, update: { $set: { sources, updatedAt: now, _userModified: true } } } })
        continue
      }

      const baseUnit = typeof row.baseUnit === 'string' ? row.baseUnit : ''
      if (!BASE_UNITS.includes(baseUnit)) { skippedRows.push({ name, reason: 'invalid' }); continue }
      const purchaseUnit = typeof row.purchaseUnit === 'string' ? row.purchaseUnit.trim() : ''
      const purchaseQty = positive(row.purchaseQty)
      const _id = newId()
      const doc = stampNew(req, {
        _id,
        userId,
        schemaVersion: 2,
        nameHebrew: name,
        baseUnit,
        sources: price !== null ? [{ supplierId: sourceKey, price, addedBy: userId, addedAt: now }] : [],
        purchaseOptions: purchaseUnit && purchaseQty !== null && knownUnits.has(purchaseUnit)
          ? [{ unitSymbol: purchaseUnit, conversionRate: purchaseQty, uom: baseUnit }]
          : [],
        categories: typeof row.category === 'string' && row.category.trim() ? [row.category.trim()] : [],
        yieldFactor: 1,
        allergens: [],
        minStockLevel: 0,
        expiryDaysDefault: 0,
        nameHebrewNormalized: key,
        _masterId: _id,
        _userModified: false,
        updatedAt: now,
      })
      if (!checkStoredDoc('products', doc).ok) { skippedRows.push({ name, reason: 'invalid' }); continue }
      created.push(doc)
    }

    if (created.length) await col('products').insertMany(created, { ordered: false })
    if (updates.length) await col('products').bulkWrite(updates, { ordered: false })

    req.log.info({ event: 'product_import.applied', created: created.length, updated: updates.length, skipped: skippedRows.length })
    res.json({ created: created.length, updated: updates.length, skipped: skippedRows.length, skippedRows })
  } catch (err) {
    req.log.error({ err, event: 'product_import.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
