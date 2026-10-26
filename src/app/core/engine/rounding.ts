import { UNIT_ALIASES } from '../utils/recipe-cost.constants'

/** Every decimal rounding goes through here (Number.EPSILON is too small: 93.745 * 100 is 9374.4999…). */
function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(Number((n * f).toPrecision(15))) / f
}

/** Portions of a dish are whole: float noise (1.1 * 1.1 * 100) is dropped first, then rounded up. */
export function roundPortions(x: number): number {
  return Math.ceil(roundTo(x, 6))
}

/** Drops float noise (110.00000000000001 -> 110) keeping real decimals (5.2 stays 5.2). */
export function cleanFloat(n: number, decimals = 6): number {
  return roundTo(n, decimals)
}

/** Money as a number with 2 decimals (Excel cells). */
export function roundMoney(n: number): number {
  return roundTo(n, 2)
}

/**
 * Display quantity: kg/liter up to 2 decimals, gram/ml whole, anything else rounded up.
 * More than 1000 gram becomes kg, more than 1000 ml becomes liter.
 */
export function formatQty(qty: number, unit: string): { qty: number; unit: string } {
  const trimmed = (unit ?? '').trim()
  let key = UNIT_ALIASES[trimmed] ?? trimmed
  let q = qty
  if (key === 'gram' && q > 1000) {
    q = q / 1000
    key = 'kg'
  } else if (key === 'ml' && q > 1000) {
    q = q / 1000
    key = 'liter'
  }
  if (key === 'kg' || key === 'liter') return { qty: roundTo(q, 2), unit: key }
  if (key === 'gram' || key === 'ml') return { qty: Math.round(q), unit: key }
  return { qty: Math.ceil(roundTo(q, 6)), unit: trimmed }
}

export function formatMoney(n: number): string {
  return '₪' + roundMoney(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatPct1(n: number): string {
  return roundTo(n, 1).toFixed(1) + '%'
}

export function formatPctInt(n: number): string {
  return Math.round(n) + '%'
}

/** One decimal, a trailing ".0" dropped (days per week: 3.5, 4). */
export function formatDecimal1(n: number): string {
  return String(roundTo(n, 1))
}
