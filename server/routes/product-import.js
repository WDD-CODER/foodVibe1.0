'use strict'
/**
 * Plan 432: the supplier price-list import, applied in ONE request (INV-3). Owner only (prices are money).
 * A dedicated router because one 200-row import must not eat the generic write limiter (300 writes / 15 min).
 *
 * POST /api/v1/product-import/apply  { supplierId: string | null, rows: ApplyRow[], invoice?: InvoiceApplyInput }
 *   ApplyRow = { name, baseUnit, price: number | null, category: string | null, purchaseUnit: string | null, purchaseQty: number | null }
 *   -> { created, updated, skipped, skippedRows: [{ name, reason: 'same_price' | 'no_price' | 'invalid' | 'duplicate' }], invoiceId? }
 * A matching product (same normalized name, same business) only gets its price/supplier updated; a new name is created.
 *
 * Plan 625: the body may carry `invoice` (header + lines, each line's `row` = index into `rows`; shape:
 * `invoiceApplyInputSchema` in shared/schemas/entities/invoice.schema.ts). A bad header, a line pointing at no row, or a
 * fileId / draftId of another business answers 400 INVALID_INVOICE / UNKNOWN_FILE / UNKNOWN_DRAFT before any write.
 * The answer then also has `invoiceId`: the invoice's id when the price history and the invoice were both written,
 * else null. Without `invoice` the key is absent.
 * Write order (no transaction): products, priceHistory (one row per created or changed price), invoices, the AI draft
 * confirm. A failure after the product write is logged (`product_import.apply.trail_failed`, ids and counts only) and
 * the answer is still 200: a failed trail NEVER rolls back or hides the prices the owner approved.
 *
 * Plan 627: after the supplier step a 'memory' trail step teaches the invoice-name memory (own aliases always, shared
 * aliases + supplier profile only for a business that may teach; see services/invoice-memory.js). Same failure rule.
 * POST /api/v1/product-import/resolve  { supplierKey, names: string[] (<= 200) } -> { matches: [{ i, productId, source: 'own' | 'shared' }] }
 *   Owner or consultant (editMoney on products). Answers printed names from memory: no model call, no write, no limiter.
 * No printed name, product name or supplier key value is logged.
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
const { actorOf } = require('../utils/actor')
const { changePct, buildInvoiceLines, invoiceKeptRatio } = require('../utils/invoice-trail')
const { confirmAiDraft } = require('../services/ai-drafts')
const { keepStoredFile } = require('../services/file-store')
const { invoiceApplyInputSchema } = require('../generated/schemas/entities/invoice.schema')
const { invoiceResolveRequestSchema } = require('../generated/schemas/entities/invoice-alias.schema')
const { learnFromApply, resolveNames } = require('../services/invoice-memory')
const { getBusiness } = require('../services/business')

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

    let invoice = null
    if (req.body.invoice !== undefined) {
      const parsed = invoiceApplyInputSchema.safeParse(req.body.invoice)
      if (!parsed.success || parsed.data.lines.some(line => line.row >= rows.length)) {
        return res.status(400).json({ error: 'INVALID_INVOICE' })
      }
      invoice = parsed.data
      if (invoice.fileId) {
        const file = await col('storedFiles').findOne({ _id: invoice.fileId, businessId: req.user.businessId, kind: 'invoice' }, { projection: { _id: 1 } })
        if (!file) return res.status(400).json({ error: 'UNKNOWN_FILE' })
      }
      if (invoice.draftId) {
        const draft = await col('aiDrafts').findOne({ _id: invoice.draftId, businessId: req.user.businessId }, { projection: { _id: 1 } })
        if (!draft) return res.status(400).json({ error: 'UNKNOWN_DRAFT' })
      }
    }

    const supplierId = typeof req.body.supplierId === 'string' && req.body.supplierId ? req.body.supplierId : null
    let chosenSupplier = null
    if (supplierId) {
      // Plan 626: the whole document is loaded only when a tax id may be set on it (it is checked as a whole).
      const projection = invoice?.supplierTaxId ? undefined : { _id: 1, taxId: 1 }
      chosenSupplier = await col('suppliers').findOne({ _id: supplierId, ...scopeFilter(req), ...LIVE }, projection ? { projection } : {})
      if (!chosenSupplier) return res.status(400).json({ error: 'UNKNOWN_SUPPLIER' })
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
    const outcomes = []
    const historyQueue = []

    for (const [index, row] of rows.entries()) {
      const name = typeof row?.name === 'string' ? row.name.trim().replace(/\s+/g, ' ') : ''
      const key = normalizeProductName(name)
      if (!key) { outcomes[index] = { result: 'invalid', price: positive(row?.price) }; skippedRows.push({ name, reason: 'invalid' }); continue }
      if (seen.has(key)) { outcomes[index] = { result: 'duplicate', price: positive(row?.price) }; skippedRows.push({ name, reason: 'duplicate' }); continue }
      seen.add(key)
      const price = positive(row.price)

      const match = byName.get(key)
      if (match) {
        if (price === null) { outcomes[index] = { result: 'no_price', productId: match._id, price }; skippedRows.push({ name, reason: 'no_price' }); continue }
        const sources = Array.isArray(match.sources) ? match.sources.map(source => ({ ...source })) : []
        const current = sources.find(source => source.supplierId === sourceKey)
        const oldPrice = current?.price
        if (current && current.price === price) { outcomes[index] = { result: 'same_price', productId: match._id, price }; skippedRows.push({ name, reason: 'same_price' }); continue }
        if (current) {
          current.price = price
        } else {
          sources.push({ supplierId: sourceKey, price, addedBy: userId, addedAt: now })
        }
        const next = { ...match, sources, updatedAt: now, _userModified: true }
        if (!checkStoredDoc('products', next).ok) { outcomes[index] = { result: 'invalid', price }; skippedRows.push({ name, reason: 'invalid' }); continue }
        const prevPrice = typeof oldPrice === 'number' && oldPrice > 0 ? oldPrice : undefined
        const entry = { productId: match._id, supplierId: sourceKey, price }
        if (prevPrice !== undefined) { entry.prevPrice = prevPrice; entry.changePct = changePct(prevPrice, price) }
        historyQueue.push(entry)
        outcomes[index] = { result: 'updated', productId: match._id, price }
        updates.push({ updateOne: { filter: { _id: match._id, ...scopeFilter(req), ...LIVE }, update: { $set: { sources, updatedAt: now, _userModified: true } } } })
        continue
      }

      const baseUnit = typeof row.baseUnit === 'string' ? row.baseUnit : ''
      if (!BASE_UNITS.includes(baseUnit)) { outcomes[index] = { result: 'invalid', price }; skippedRows.push({ name, reason: 'invalid' }); continue }
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
      if (!checkStoredDoc('products', doc).ok) { outcomes[index] = { result: 'invalid', price }; skippedRows.push({ name, reason: 'invalid' }); continue }
      created.push(doc)
      outcomes[index] = { result: 'created', productId: _id, price }
      if (price !== null) historyQueue.push({ productId: _id, supplierId: sourceKey, price })
    }

    if (created.length) await col('products').insertMany(created, { ordered: false })
    if (updates.length) await col('products').bulkWrite(updates, { ordered: false })

    // The trail: each step in its own try/catch; a failure is logged (ids and counts only) and never changes the answer.
    const invoiceId = invoice ? newId() : undefined
    const trailFailed = (stage, err) => req.log.error({ err, event: 'product_import.apply.trail_failed', stage, historyRows: historyQueue.length, invoiceId })
    let historySkipped = 0
    let historyOk = true
    try {
      const historyRows = []
      for (const entry of historyQueue) {
        const historyRow = {
          _id: newId(), businessId: req.user.businessId, ...entry, at: now, by: actorOf(req).userId,
          source: invoice ? 'invoice' : 'import',
        }
        if (invoiceId) historyRow.invoiceId = invoiceId
        if (checkStoredDoc('priceHistory', historyRow).ok) historyRows.push(historyRow)
        else historySkipped += 1
      }
      if (historyRows.length) await col('priceHistory').insertMany(historyRows, { ordered: false })
    } catch (err) {
      historyOk = false
      trailFailed('history', err)
    }

    let invoiceOk = false
    let supplierTaxSet = false
    let aliasesOwn = 0
    let aliasesShared = 0
    if (invoice) {
      const savedLines = buildInvoiceLines(invoice.lines, outcomes)
      if (historyOk) {
        try {
          const doc = stampNew(req, {
            _id: invoiceId,
            userId,
            schemaVersion: 2,
            ...(supplierId ? { supplierId } : {}),
            supplierName: invoice.supplierName,
            ...(invoice.supplierTaxId !== undefined ? { supplierTaxId: invoice.supplierTaxId } : {}),
            ...(invoice.invoiceNumber !== undefined ? { invoiceNumber: invoice.invoiceNumber } : {}),
            ...(invoice.invoiceDate !== undefined ? { invoiceDate: invoice.invoiceDate } : {}),
            ...(invoice.vatIncluded !== undefined ? { vatIncluded: invoice.vatIncluded } : {}),
            source: invoice.source,
            ...(invoice.fileId !== undefined ? { fileId: invoice.fileId } : {}),
            ...(invoice.draftId !== undefined ? { draftId: invoice.draftId } : {}),
            ...(invoice.supplierKey !== undefined ? { supplierKey: invoice.supplierKey } : {}),
            lines: savedLines,
            updatedAt: now,
          })
          if (!checkStoredDoc('invoices', doc).ok) throw new Error('invoice failed the schema')
          await col('invoices').insertOne(doc)
          invoiceOk = true
        } catch (err) {
          trailFailed('invoice', err)
        }
        if (invoiceOk && invoice.fileId) {
          try {
            await keepStoredFile(mongoose.connection.db, req.user.businessId, invoice.fileId)
          } catch (err) {
            trailFailed('invoice_file', err)
          }
        }
      }
      if (invoiceOk && supplierId && invoice.supplierTaxId && chosenSupplier && !chosenSupplier.taxId) {
        try {
          const taxId = invoice.supplierTaxId
          if (!checkStoredDoc('suppliers', { ...chosenSupplier, taxId, updatedAt: now }).ok) throw new Error('supplier failed the schema')
          const result = await col('suppliers').updateOne(
            { _id: supplierId, ...scopeFilter(req), ...LIVE, taxId: { $exists: false } },
            { $set: { taxId, updatedAt: now } },
          )
          supplierTaxSet = result.modifiedCount === 1
        } catch (err) {
          trailFailed('supplier', err)
        }
      }
      if (invoice.supplierKey) {
        try {
          const business = await getBusiness(req.user.businessId)
          const lines = savedLines.filter(line => line.productId).map(line => ({ printedName: line.printedName, productId: line.productId, unit: line.unit }))
          const learned = await learnFromApply(mongoose.connection.db, business ?? { _id: req.user.businessId }, {
            supplierKey: invoice.supplierKey, supplierName: invoice.supplierName, vatIncluded: invoice.vatIncluded, lines,
          })
          aliasesOwn = learned.own
          aliasesShared = learned.shared
        } catch (err) {
          trailFailed('memory', err)
        }
      }
      if (invoice.draftId) {
        try {
          await confirmAiDraft(req, invoice.draftId, savedLines, invoiceKeptRatio)
        } catch (err) {
          trailFailed('draft', err)
        }
      }
    }

    req.log.info({
      event: 'product_import.applied', created: created.length, updated: updates.length, skipped: skippedRows.length,
      historyRows: historyQueue.length - historySkipped, historySkipped, invoice: invoice !== null, supplierTaxSet, aliasesOwn, aliasesShared,
    })
    const answer = { created: created.length, updated: updates.length, skipped: skippedRows.length, skippedRows }
    if (invoice) answer.invoiceId = historyOk && invoiceOk ? invoiceId : null
    res.json(answer)
  } catch (err) {
    req.log.error({ err, event: 'product_import.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/resolve', verifyToken, (req, res, next) => {
  if (assertCan(req, res, 'editMoney', { type: 'products' })) next()
}, async (req, res) => {
  try {
    const parsed = invoiceResolveRequestSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_REQUEST' })
    const matches = await resolveNames(mongoose.connection.db, req.user.businessId, parsed.data)
    req.log.info({
      event: 'product_import.resolved', names: parsed.data.names.length,
      own: matches.filter(m => m.source === 'own').length, shared: matches.filter(m => m.source === 'shared').length,
    })
    res.json({ matches })
  } catch (err) {
    req.log.error({ err, event: 'product_import.resolve_failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
