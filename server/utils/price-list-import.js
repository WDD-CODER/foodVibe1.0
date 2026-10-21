'use strict'
/**
 * Plan 432: pure helpers for the supplier price-list import. No database, no AI call: they clean the rows the
 * AI returned into a safe preview list, and give the apply route the one name-matching rule.
 */

const MAX_IMPORT_ROWS = 200
const MAX_IMPORT_TEXT = 20000
const MAX_NAME_LENGTH = 200

/** The base units a product may have. */
const BASE_UNITS = Object.freeze(['gram', 'ml', 'kg', 'liter', 'unit'])

/** Hebrew unit words (and the canonical keys) -> base unit key. Keys are already passed through `unitWord`. */
const HEBREW_UNIT_MAP = Object.freeze({
  'ק"ג': 'kg', 'קג': 'kg', 'קילו': 'kg', 'קילוגרם': 'kg', 'ק״ג': 'kg',
  'גרם': 'gram', "ג'": 'gram', 'גר': 'gram',
  'ליטר': 'liter', "ל'": 'liter', 'ל': 'liter',
  'מ"ל': 'ml', 'מל': 'ml', 'מ״ל': 'ml', 'מיליליטר': 'ml',
  "יח'": 'unit', 'יח': 'unit', 'יחידה': 'unit', 'יחידות': 'unit', 'יח׳': 'unit',
  gram: 'gram', ml: 'ml', kg: 'kg', liter: 'liter', unit: 'unit',
})

/** Same rule as `nameHebrewNormalized` in the seed and `duplicateNameValidator` on the client. */
function normalizeProductName(s) {
  return String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/** A unit word as written (a leading "ל" as in «לק"ג» is dropped) -> a base unit key, or null when unknown. */
function toBaseUnit(raw) {
  if (typeof raw !== 'string') return null
  const word = raw.trim().replace(/^ל(?=ק"ג|ק״ג|קג|קילו|גרם|ליטר|מ"ל|מ״ל)/, '').replace(/\s+/g, ' ')
  return HEBREW_UNIT_MAP[word] ?? HEBREW_UNIT_MAP[word.toLowerCase()] ?? null
}

function positiveNumber(value) {
  const n = typeof value === 'string' ? Number(value.trim()) : value
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null
}

const round4 = n => Math.round(n * 10000) / 10000

function cleanText(value, max) {
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ').slice(0, max)
  return text || null
}

/**
 * @param {{ rows?: unknown[] }} payload what the AI returned
 * @returns {{ rows: ImportRow[], truncated: boolean }}
 *   ImportRow = { name, baseUnit, price: number | null, purchaseUnit: string | null, purchaseQty: number | null,
 *                 category: string | null, needsReview: boolean, duplicate: boolean }
 */
function normalizePriceListRows(payload) {
  const input = Array.isArray(payload?.rows) ? payload.rows : []
  const byKey = new Map()
  for (const item of input) {
    if (item === null || typeof item !== 'object') continue
    const name = cleanText(item.name, MAX_NAME_LENGTH)
    if (!name) continue

    const unitKey = toBaseUnit(item.unit)
    const purchaseUnit = cleanText(item.purchaseUnit, 40)
    const qty = positiveNumber(item.purchaseQty)
    const hasPurchase = purchaseUnit !== null && qty !== null
    let needsReview = unitKey === null
    let price = positiveNumber(item.price)
    if (price !== null && item.pricePer === 'purchaseUnit') {
      if (qty !== null) {
        price = round4(price / qty)
      } else {
        price = null
        needsReview = true
      }
    }

    const key = normalizeProductName(name)
    const duplicate = byKey.has(key)
    if (duplicate) byKey.delete(key) // last one wins and sits where it was last written
    byKey.set(key, {
      name,
      baseUnit: unitKey ?? 'unit',
      price,
      purchaseUnit: hasPurchase ? purchaseUnit : null,
      purchaseQty: hasPurchase ? qty : null,
      category: cleanText(item.category, 80),
      needsReview,
      duplicate,
    })
  }
  const all = [...byKey.values()]
  return { rows: all.slice(0, MAX_IMPORT_ROWS), truncated: all.length > MAX_IMPORT_ROWS }
}

module.exports = { MAX_IMPORT_ROWS, MAX_IMPORT_TEXT, MAX_NAME_LENGTH, BASE_UNITS, HEBREW_UNIT_MAP, normalizeProductName, toBaseUnit, normalizePriceListRows }
