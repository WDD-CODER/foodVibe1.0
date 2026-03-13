/**
 * Unified quantity step logic for +/- controls across the app.
 * - Whole numbers: step by magnitude (1–9 → 1, 10–99 → 10, 100–999 → 100, …).
 * - Decimals: step by precision (1.2 → 0.1, 1.15 → 0.01, 1.001 → 0.001).
 */

export interface QuantityStepOptions {
  /** Override: use this step instead of value-based. */
  explicitStep?: number;
  /** When true, step is always 1 (e.g. guest count, labor minutes). */
  integerOnly?: boolean;
}

const DECIMAL_PRECISION = 3;
const NORMALIZE_PRECISION = 6;
const EPS = 1e-9;

function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Returns the step for the given value.
 * Whole numbers: step = 10^floor(log10(max(1,|value|))). Decimals: step = 0.1 | 0.01 | 0.001 by displayed precision.
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
 * Returns value + step, optionally clamped to min, rounded for decimal steps.
 */
export function quantityIncrement(
  value: number,
  min?: number,
  options?: QuantityStepOptions
): number {
  const num = Number(value);
  const step = getQuantityStep(Number.isFinite(num) ? num : 0, options);
  let next = (Number.isFinite(num) ? num : 0) + step;
  if (step < 1) {
    next = roundToPrecision(next, DECIMAL_PRECISION);
  }
  if (min != null && next < min) return min;
  return next;
}

/**
 * Returns value - step, optionally clamped to min, rounded for decimal steps.
 */
export function quantityDecrement(
  value: number,
  min?: number,
  options?: QuantityStepOptions
): number {
  const num = Number(value);
  const step = getQuantityStep(Number.isFinite(num) ? num : 0, options);
  let next = (Number.isFinite(num) ? num : 0) - step;
  if (step < 1) {
    next = roundToPrecision(next, DECIMAL_PRECISION);
  }
  if (min != null && next < min) return min;
  return next;
}
