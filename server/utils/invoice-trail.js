'use strict'
/**
 * Plan 625: pure rules of the invoice trail written by `POST /api/v1/product-import/apply` (no database).
 */
const { normalizeProductName } = require('./price-list-import')

/** Percent change from `prevPrice` to `price`, two decimals; undefined when `prevPrice` is not a number above 0. */
function changePct(prevPrice, price) {
  if (typeof prevPrice !== 'number' || !Number.isFinite(prevPrice) || prevPrice <= 0) return undefined
  return Math.round((price - prevPrice) / prevPrice * 10000) / 100
}

/** The stored invoice lines: printed fields as sent, `needsReview`, and what happened to the row (`outcomes[line.row]`). */
function buildInvoiceLines(invoiceLines, outcomes) {
  return invoiceLines.map(line => {
    const outcome = outcomes[line.row] ?? {}
    const stored = { printedName: line.printedName }
    for (const key of ['quantity', 'unit', 'unitPrice', 'lineTotal']) {
      if (line[key] !== undefined) stored[key] = line[key]
    }
    stored.needsReview = line.needsReview
    stored.price = typeof outcome.price === 'number' && outcome.price > 0 ? outcome.price : null
    stored.result = outcome.result
    if (outcome.productId) stored.productId = outcome.productId
    return stored
  })
}

const same = (a, b) => (a ?? null) === (b ?? null)

/** Closeness 0..1 of an invoice draft (`aiDraft.printed`) to the saved lines: lines saved unchanged / lines suggested. */
function invoiceKeptRatio(aiDraft, saved) {
  const printed = aiDraft?.printed
  if (!Array.isArray(printed)) return 0
  const byName = new Map()
  for (const item of printed) {
    const key = normalizeProductName(item?.name)
    if (!key) continue
    byName.delete(key) // the last printed line with a name wins
    byName.set(key, item)
  }
  if (byName.size === 0) return 0
  const savedLines = Array.isArray(saved) ? saved : Array.isArray(saved?.lines) ? saved.lines : []
  const used = new Set()
  let kept = 0
  for (const [key, item] of byName) {
    const index = savedLines.findIndex((line, i) => !used.has(i)
      && normalizeProductName(line?.printedName) === key
      && same(line.quantity, item.quantity) && same(line.unitPrice, item.unitPrice) && same(line.lineTotal, item.lineTotal))
    if (index >= 0) { used.add(index); kept += 1 }
  }
  return Math.min(1, Math.round(kept / byName.size * 10000) / 10000)
}

module.exports = { changePct, buildInvoiceLines, invoiceKeptRatio }
