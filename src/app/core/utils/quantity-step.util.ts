/**
 * Unified quantity step logic for +/- controls across the app.
 * - When continuousPress !== true (single click): whole-number step = 1. Plan 176.
 * - When continuousPress === true (hold): tiered increment 0→9 (+1), 10→100 (+10), 100→1000 (+100), 1000+ (+1000);
 *   decrement: step 1 to next multiple of 10, then step 10/100 by range (e.g. 99→90, 1090→1000, 1000→900).
 * - integerOnly / explicitStep / decimals unchanged.
 */

export interface QuantityStepOptions {
  /** Override: use this step instead of value-based. */
  explicitStep?: number;
  /** When true, step is always 1 (e.g. guest count, labor minutes). */
  integerOnly?: boolean;
  /** When true, use tiered steps (hold mode); when false/omit, use step 1 for whole numbers (single click). Plan 176. */
  continuousPress?: boolean;
}

const DECIMAL_PRECISION = 3;
const NORMALIZE_PRECISION = 6;
const EPS = 1e-9;

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
  if (v % 100 === 0) return 100;
  if (v % 10 === 0) return 10;
  return 1;
}

/**
 * Returns the step for the given value.
 * Whole numbers: legacy magnitude (see tiered logic in quantityIncrement/quantityDecrement when not integerOnly).
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
 * Returns value + step, optionally clamped to min. Plan 176: single-click step 1; hold = tiered.
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
 * Returns value - step, optionally clamped to min. Plan 176: single-click step 1; hold = tiered.
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
