/**
 * Unified quantity step logic for +/- controls across the app.
 * Plus adds one "in" (step); minus subtracts it.
 * - Value >= 1: step = 1 (e.g. 1 → 2).
 * - Value < 1: step = 0.001 (e.g. 0.004 → 0.005).
 */

export interface QuantityStepOptions {
  /** Override: use this step instead of value-based. */
  explicitStep?: number;
  /** When true, step is always 1 (e.g. guest count, labor minutes). */
  integerOnly?: boolean;
}

const DECIMAL_PRECISION = 3;

function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Returns the step ("in") for the given value.
 * Default: value >= 1 → 1, value < 1 → 0.001.
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
  return num >= 1 ? 1 : 0.001;
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
