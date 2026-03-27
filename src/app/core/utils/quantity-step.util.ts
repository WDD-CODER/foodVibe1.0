/**
 * Unified quantity step logic for +/- controls across the app.
 * - When continuousPress !== true (single click): whole-number step = 1. Plan 176.
 * - When continuousPress === true (hold): tiered increment 0→9 (+1), 10→100 (+10), 100→1000 (+100), 1000+ (+1000);
 *   decrement: step 1 to next multiple of 10, then step 10/100 by range (e.g. 99→90, 1090→1000, 1000→900).
 * - Unit-aware path (Plan 214): when a mass/volume unit is set, step is value-range-based (not tick-based).
 *   Single click: match value precision, cap at 0.1. Hold: snap to tier boundary then step by range tier.
 *   Special downward fine zone: value in (0.9, 1.0] → step 0.01.
 * - integerOnly / explicitStep unchanged.
 */

export interface QuantityStepOptions {
  /** Override: use this step instead of value-based. */
  explicitStep?: number;
  /** When true, step is always 1 (e.g. guest count, labor minutes). */
  integerOnly?: boolean;
  /** When true, use tiered steps (hold mode); when false/omit, use step 1 for whole numbers (single click). Plan 176. */
  continuousPress?: boolean;
  /** Mass/volume unit string — triggers unit-aware stepping (Plan 214). Any canonical unit name or symbol. */
  unit?: string;
}

const DECIMAL_PRECISION = 3;
const NORMALIZE_PRECISION = 6;
const EPS = 1e-9;

// ─── Plan 214: Unit-aware set ─────────────────────────────────────────────────

const UNIT_AWARE_SET = new Set([
  'kg', 'g', 'gram', 'gr', 'grams',
  'ml', 'liter', 'l',
  'ק"ג',
]);

function isUnitAware(unit?: string): boolean {
  if (!unit) return false;
  return UNIT_AWARE_SET.has(unit.toLowerCase().trim());
}

/** Single-click step for unit-aware: match value precision, cap at 0.1. */
function getSingleClickUnitStep(value: number): number {
  const r = roundToPrecision(value, NORMALIZE_PRECISION);
  const isWhole = Math.abs(r - Math.round(r)) < EPS;
  if (isWhole) return 0.1;
  if (Math.abs(r * 10 - Math.round(r * 10)) < EPS) return 0.1; // 1dp
  return 0.01; // 2dp or finer → cap at 0.01
}

/** Range-based hold step going UP. */
function getHoldIncrStep(value: number): number {
  if (value < 2)    return 0.1;
  if (value < 10)   return 1;
  if (value < 100)  return 10;
  if (value < 1000) return 100;
  return 1000;
}

/** Range-based hold step going DOWN. Boundary-inclusive so tier exit is clean. */
function getHoldDecrStep(value: number): number {
  if (value <= 2)    return 0.1;
  if (value <= 10)   return 1;
  if (value <= 100)  return 10;
  if (value <= 1000) return 100;
  return 1000;
}

/** True if value sits exactly on its tier boundary (0.1 / integer / 10 / 100 / 1000). */
function isOnTierBoundary(value: number): boolean {
  const r = roundToPrecision(value, NORMALIZE_PRECISION);
  if (value < 2)    return Math.abs(r * 10 - Math.round(r * 10)) < EPS;
  if (value < 10)   return Number.isInteger(r);
  if (value < 100)  return Number.isInteger(r) && Math.round(r) % 10 === 0;
  if (value < 1000) return Number.isInteger(r) && Math.round(r) % 100 === 0;
  return Number.isInteger(r) && Math.round(r) % 1000 === 0;
}

/** Snap value to nearest tier boundary in the given direction. */
function snapToTierBoundary(value: number, dir: 'up' | 'down'): number {
  const round = dir === 'up' ? Math.ceil : Math.floor;
  if (value < 2)    return roundToPrecision(round(value * 10) / 10, 1);
  if (value < 10)   return round(value);
  if (value < 100)  return round(value / 10) * 10;
  if (value < 1000) return round(value / 100) * 100;
  return round(value / 1000) * 1000;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function isWholeNumber(value: number): boolean {
  const r = roundToPrecision(value, NORMALIZE_PRECISION);
  const absR = Math.abs(r);
  return absR < 1e-15 || Math.abs(r - Math.round(r)) < EPS;
}

/** Hold-mode tiered step for increment. Plan 176: 0→9 +1, 10→100 +10, 100→1000 +100, 1000+ +1000. */
function getHoldStepIncrement(value: number): number {
  const v = Math.max(0, Math.floor(value));
  if (v <= 9) return 1;
  if (v <= 90) return 10;
  if (v <= 900) return 100;
  return 1000;
}

/** Hold-mode tiered step for decrement. Plan 176: step 1 to next mult of 10, then 10/100 by range. */
function getHoldStepDecrement(value: number): number {
  const v = Math.max(0, Math.ceil(value));
  if (v <= 10) return 1;
  if (v <= 100) {
    return v % 10 === 0 ? 10 : 1;
  }
  if (v <= 1000) {
    if (v % 100 === 0) return 100;
    if (v % 10 === 0) return 10;
    return 1;
  }
  if (v % 1000 === 0) return 1000;
  if (v % 100 === 0) return 100;
  if (v % 10 === 0) return 10;
  return 1;
}

/**
 * Returns the step for the given value.
 * Unit-aware: always 0.1 when unit is set (Plan 214).
 * Whole numbers: legacy magnitude.
 * Decimals: step = 0.1 | 0.01 | 0.001 by displayed precision.
 */
export function getQuantityStep(
  value: number,
  options?: QuantityStepOptions
): number {
  if (options?.explicitStep != null && options.explicitStep > 0) {
    return options.explicitStep;
  }
  if (options?.integerOnly) {
    return 1;
  }
  if (isUnitAware(options?.unit)) {
    return 0.1;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  const r = roundToPrecision(num, NORMALIZE_PRECISION);
  const absR = Math.abs(r);
  const isWhole =
    absR < 1e-15 || Math.abs(r - Math.round(r)) < EPS;
  if (isWhole) {
    if (absR < 1) return 1;
    return Math.pow(10, Math.floor(Math.log10(absR)));
  }
  if (Math.abs(r * 10 - Math.round(r * 10)) < EPS) return 0.1;
  if (Math.abs(r * 100 - Math.round(r * 100)) < EPS) return 0.01;
  return 0.001;
}

/**
 * Returns value + step, optionally clamped to min.
 * Plan 214: unit-aware path — value-range-based stepping.
 * Plan 176: single-click step 1; hold = tiered.
 */
export function quantityIncrement(
  value: number,
  min?: number,
  options?: QuantityStepOptions
): number {
  const num = Number(value);
  const base = Number.isFinite(num) ? num : 0;
  if (options?.explicitStep != null && options.explicitStep > 0) {
    const next = base + options.explicitStep;
    return min != null && next < min ? min : next;
  }
  if (options?.integerOnly) {
    const next = base + 1;
    return min != null && next < min ? min : next;
  }
  if (isUnitAware(options?.unit)) {
    let next: number;
    if (options?.continuousPress) {
      if (!isOnTierBoundary(base)) {
        next = snapToTierBoundary(base, 'up');
      } else {
        next = roundToPrecision(base + getHoldIncrStep(base), 2);
      }
    } else {
      next = roundToPrecision(base + getSingleClickUnitStep(base), 2);
    }
    next = Math.max(0, next);
    return min != null && next < min ? min : next;
  }
  if (!isWholeNumber(base)) {
    const step = getQuantityStep(base, options);
    let next = base + step;
    if (step < 1) next = roundToPrecision(next, DECIMAL_PRECISION);
    return min != null && next < min ? min : next;
  }
  const useHoldTiered = options?.continuousPress === true;
  const step = useHoldTiered ? getHoldStepIncrement(base) : 1;
  const next = base + step;
  return min != null && next < min ? min : next;
}

/**
 * Returns value - step, optionally clamped to min.
 * Plan 214: unit-aware path — value-range-based stepping with fine zone at (0.9, 1.0].
 * Plan 176: single-click step 1; hold = tiered.
 */
export function quantityDecrement(
  value: number,
  min?: number,
  options?: QuantityStepOptions
): number {
  const num = Number(value);
  const base = Number.isFinite(num) ? num : 0;
  if (options?.explicitStep != null && options.explicitStep > 0) {
    const next = base - options.explicitStep;
    return min != null && next < min ? min : next;
  }
  if (options?.integerOnly) {
    const next = base - 1;
    return min != null && next < min ? min : next;
  }
  if (isUnitAware(options?.unit)) {
    let next: number;
    if (options?.continuousPress) {
      if (base > 0.9 && base <= 1.0) {
        // Fine zone: step 0.01 from 1.0 down to 0.90
        next = roundToPrecision(base - 0.01, 2);
      } else if (!isOnTierBoundary(base)) {
        next = snapToTierBoundary(base, 'down');
      } else {
        next = roundToPrecision(base - getHoldDecrStep(base), 2);
      }
    } else {
      next = roundToPrecision(base - getSingleClickUnitStep(base), 2);
    }
    next = Math.max(0, next);
    return min != null && next < min ? min : next;
  }
  if (!isWholeNumber(base)) {
    const step = getQuantityStep(base, options);
    let next = base - step;
    if (step < 1) next = roundToPrecision(next, DECIMAL_PRECISION);
    return min != null && next < min ? min : next;
  }
  const useHoldTiered = options?.continuousPress === true;
  const step = useHoldTiered ? getHoldStepDecrement(base) : 1;
  const next = base - step;
  return min != null && next < min ? min : next;
}
