/**
 * Unified quantity step logic for +/- controls across the app.
 * - Single click: whole-number step = 1 (plain numbers and g / ml); kg / l step by value precision, cap 0.1.
 * - Hold (continuousPress): the step grows with the repeat count of one press (plan 511):
 *   repeats 1-9 step by the base step, 10-18 by base x 10, 19+ by base x 100. When the tier goes up the value first
 *   snaps to a multiple of the new step (109 -> 110, 190 -> 200). Base step: 1 for g, ml and plain numbers; 0.1 for kg
 *   and l (0.01 when the value has 2 decimals).
 * - integerOnly / explicitStep unchanged.
 */

export interface QuantityStepOptions {
  /** Override: use this step instead of value-based. */
  explicitStep?: number
  /** When true, step is always 1 (e.g. guest count, labor minutes). */
  integerOnly?: boolean
  /** When true, use tiered steps (hold mode); when false/omit, use step 1 for whole numbers (single click). Plan 176. */
  continuousPress?: boolean
  /** Hold mode: 1-based repeat count within one press (plan 511). Omitted with continuousPress = 1. */
  holdRepeat?: number
  /** Mass/volume unit string — triggers unit-aware stepping (Plan 214). Any canonical unit name or symbol. */
  unit?: string
}

const DECIMAL_PRECISION = 3
const NORMALIZE_PRECISION = 6
const EPS = 1e-9

// ─── Plan 214: Unit-aware set ─────────────────────────────────────────────────

const UNIT_AWARE_SET = new Set(['kg', 'g', 'gram', 'gr', 'grams', 'ml', 'liter', 'l', 'ק"ג'])

function isUnitAware(unit?: string): boolean {
  if (!unit) return false
  return UNIT_AWARE_SET.has(unit.toLowerCase().trim())
}

const FINE_UNIT_SET = new Set(['kg', 'liter', 'l', 'ק"ג'])

/** Base step for hold: 1 for g / ml / plain numbers; 0.1 (0.01 for a 2-decimal value) for kg and l. */
function getBaseStep(value: number, unit?: string): number {
  if (!isUnitAware(unit) || !FINE_UNIT_SET.has(unit!.toLowerCase().trim())) return 1
  const r = roundToPrecision(value, NORMALIZE_PRECISION)
  return Math.abs(r * 10 - Math.round(r * 10)) < EPS ? 0.1 : 0.01
}

/** Single-click step for unit-aware: 1 for g / ml; kg / l match value precision, cap at 0.1. */
function getSingleClickUnitStep(value: number, unit?: string): number {
  return getBaseStep(value, unit)
}

/** Tier multiplier by 1-based repeat count: 1-9 x1, 10-18 x10, 19+ x100. */
function getTierMultiplier(repeat: number): number {
  const r = Math.max(1, Math.floor(repeat))
  if (r <= 9) return 1
  if (r <= 18) return 10
  return 100
}

/** Next multiple of the tier step strictly above (up) or below (down) the value. */
function holdStepValue(value: number, dir: 'up' | 'down', unit: string | undefined, repeat: number): number {
  const step = roundToPrecision(getBaseStep(value, unit) * getTierMultiplier(repeat), DECIMAL_PRECISION)
  const q = roundToPrecision(value / step, NORMALIZE_PRECISION)
  const n = dir === 'up' ? Math.floor(q + EPS) + 1 : Math.ceil(q - EPS) - 1
  return roundToPrecision(n * step, DECIMAL_PRECISION)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

function isWholeNumber(value: number): boolean {
  const r = roundToPrecision(value, NORMALIZE_PRECISION)
  const absR = Math.abs(r)
  return absR < 1e-15 || Math.abs(r - Math.round(r)) < EPS
}

/**
 * Returns the step for the given value.
 * Unit-aware: always 0.1 when unit is set (Plan 214).
 * Whole numbers: legacy magnitude.
 * Decimals: step = 0.1 | 0.01 | 0.001 by displayed precision.
 */
export function getQuantityStep(value: number, options?: QuantityStepOptions): number {
  if (options?.explicitStep != null && options.explicitStep > 0) {
    return options.explicitStep
  }
  if (options?.integerOnly) {
    return 1
  }
  if (isUnitAware(options?.unit)) {
    return 0.1
  }
  const num = Number(value)
  if (!Number.isFinite(num)) return 1
  const r = roundToPrecision(num, NORMALIZE_PRECISION)
  const absR = Math.abs(r)
  const isWhole = absR < 1e-15 || Math.abs(r - Math.round(r)) < EPS
  if (isWhole) {
    if (absR < 1) return 1
    return Math.pow(10, Math.floor(Math.log10(absR)))
  }
  if (Math.abs(r * 10 - Math.round(r * 10)) < EPS) return 0.1
  if (Math.abs(r * 100 - Math.round(r * 100)) < EPS) return 0.01
  return 0.001
}

/**
 * Returns value + step, optionally clamped to min.
 * Plan 214: unit-aware path — value-range-based stepping.
 * Plan 176: single-click step 1; hold = tiered.
 */
export function quantityIncrement(value: number, min?: number, options?: QuantityStepOptions): number {
  const num = Number(value)
  const base = Number.isFinite(num) ? num : 0
  if (options?.explicitStep != null && options.explicitStep > 0) {
    const next = base + options.explicitStep
    return min != null && next < min ? min : next
  }
  if (options?.integerOnly) {
    const next = base + 1
    return min != null && next < min ? min : next
  }
  if (isUnitAware(options?.unit)) {
    let next: number
    if (options?.continuousPress) {
      next = holdStepValue(base, 'up', options.unit, options.holdRepeat ?? 1)
    } else {
      next = roundToPrecision(base + getSingleClickUnitStep(base, options?.unit), 2)
    }
    next = Math.max(0, next)
    return min != null && next < min ? min : next
  }
  if (!isWholeNumber(base)) {
    const step = getQuantityStep(base, options)
    let next = base + step
    if (step < 1) next = roundToPrecision(next, DECIMAL_PRECISION)
    return min != null && next < min ? min : next
  }
  const next =
    options?.continuousPress === true ? holdStepValue(base, 'up', undefined, options.holdRepeat ?? 1) : base + 1
  return min != null && next < min ? min : next
}

/**
 * Returns value - step, optionally clamped to min.
 * Plan 214: unit-aware path — value-range-based stepping with fine zone at (0.9, 1.0].
 * Plan 176: single-click step 1; hold = tiered.
 */
export function quantityDecrement(value: number, min?: number, options?: QuantityStepOptions): number {
  const num = Number(value)
  const base = Number.isFinite(num) ? num : 0
  if (options?.explicitStep != null && options.explicitStep > 0) {
    const next = base - options.explicitStep
    return min != null && next < min ? min : next
  }
  if (options?.integerOnly) {
    const next = base - 1
    return min != null && next < min ? min : next
  }
  if (isUnitAware(options?.unit)) {
    let next: number
    if (options?.continuousPress) {
      next = holdStepValue(base, 'down', options.unit, options.holdRepeat ?? 1)
    } else {
      next = roundToPrecision(base - getSingleClickUnitStep(base, options?.unit), 2)
    }
    next = Math.max(0, next)
    return min != null && next < min ? min : next
  }
  if (!isWholeNumber(base)) {
    const step = getQuantityStep(base, options)
    let next = base - step
    if (step < 1) next = roundToPrecision(next, DECIMAL_PRECISION)
    return min != null && next < min ? min : next
  }
  const next =
    options?.continuousPress === true ? holdStepValue(base, 'down', undefined, options.holdRepeat ?? 1) : base - 1
  return min != null && next < min ? min : next
}
