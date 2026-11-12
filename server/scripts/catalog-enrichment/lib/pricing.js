'use strict'
/**
 * Plan 583 A4: pure price helpers. A product's source price is the price per one base unit (gram, ml, kg, liter or
 * unit), stored without VAT.
 */

const VAT_RATE = 0.18

/** Chain unit words → [dimension, factor to gram / ml / unit]. */
const UNIT_WORDS = [
  [/^(גרם|גר'?|ג'?|gr|g)$/i, ['mass', 1]],
  [/^(קילוגרם|קילו|ק"ג|ק״ג|קג|kg)$/i, ['mass', 1000]],
  [/^(מיליליטר|מ"ל|מ״ל|מל|ml)$/i, ['volume', 1]],
  [/^(ליטר|ל'?|liter|l)$/i, ['volume', 1000]],
  [/^(יחידות|יחידה|יח'?|יח׳|unit|units)$/i, ['count', 1]]
]

const BASE = {
  gram: ['mass', 1], kg: ['mass', 1000], ml: ['volume', 1], liter: ['volume', 1000], unit: ['count', 1]
}

function unitOf(word) {
  const w = String(word ?? '').trim()
  for (const [re, v] of UNIT_WORDS) if (re.test(w)) return v
  return null
}

/** "100 גרם" / "1קילוגרם" / "ליטר" → { amount, dim, factor } or null. */
function measureOf(text) {
  const m = /^\s*(\d+(?:\.\d+)?)?\s*(.*?)\s*$/.exec(String(text ?? ''))
  const unit = unitOf(m?.[2])
  if (!unit) return null
  return { amount: m[1] ? Number(m[1]) : 1, dim: unit[0], factor: unit[1] }
}

/** Mass and volume are treated as one dimension for kitchen products (1 ml ≈ 1 g); count stays apart. */
const sameDim = (a, b) => a === b || (a !== 'count' && b !== 'count')

/**
 * Price of one base unit of the product for one chain item, VAT included as on the shelf.
 * Weighted items are priced per kilogram. A pack's size comes from `quantity` + `unit`; when it cannot be read, the
 * chain's own unit-of-measure price (`unitPrice` per `unitOfMeasure`) is used.
 * @returns {number | null} null when the size cannot be read or the dimensions do not fit
 */
function pricePerBaseUnit(item, baseUnit) {
  const base = BASE[baseUnit]
  if (!base || !(item?.price > 0)) return null
  let dim, amountInSmallUnits
  const unit = unitOf(item.unit)
  if (item.isWeighted) {
    dim = 'mass'
    // A weighted item's price is per kilogram (or per its stated measure).
    const m = measureOf(item.unitOfMeasure)
    amountInSmallUnits = m && m.dim !== 'count' ? m.amount * m.factor : 1000
    if (!(amountInSmallUnits > 0)) return null
    return scale(item.price / amountInSmallUnits, dim, base)
  }
  if (unit && item.quantity > 0) {
    dim = unit[0]
    amountInSmallUnits = item.quantity * unit[1]
    return scale(item.price / amountInSmallUnits, dim, base)
  }
  const m = measureOf(item.unitOfMeasure)
  if (m && item.unitPrice > 0) return scale(item.unitPrice / (m.amount * m.factor), m.dim, base)
  return null
}

function scale(perSmallUnit, dim, [baseDim, baseFactor]) {
  if (!sameDim(dim, baseDim)) return null
  const v = perSmallUnit * baseFactor
  return Number.isFinite(v) && v > 0 ? v : null
}

function withoutVat(price, vatExempt) {
  return vatExempt ? price : price / (1 + VAT_RATE)
}

/** A base-unit price → the price per kg, per liter or per unit, the scale the plausibility band is written in. */
function perKgLiterOrUnit(price, baseUnit) {
  return baseUnit === 'gram' || baseUnit === 'ml' ? price * 1000 : price
}

/** Plausibility band: per kg or liter 0.5–2000 ILS, per unit 0.05–500 ILS. */
function inBand(value, baseUnit) {
  if (!(value > 0)) return false
  return baseUnit === 'unit' ? value >= 0.05 && value <= 500 : value >= 0.5 && value <= 2000
}

function median(values) {
  const v = [...values].sort((a, b) => a - b)
  if (!v.length) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

const round6 = n => Math.round(n * 1e6) / 1e6

module.exports = { VAT_RATE, pricePerBaseUnit, withoutVat, perKgLiterOrUnit, inBand, median, round6, unitOf }
