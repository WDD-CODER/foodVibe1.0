import { getQuantityStep, quantityIncrement, quantityDecrement, QuantityStepOptions } from './quantity-step.util';

describe('quantity-step.util', () => {
  describe('getQuantityStep', () => {
    it('should return magnitude step for whole numbers (1–9 → 1, 10–99 → 10, 100+ → 100…)', () => {
      expect(getQuantityStep(1)).toBe(1);
      expect(getQuantityStep(2)).toBe(1);
      expect(getQuantityStep(9)).toBe(1);
      expect(getQuantityStep(10)).toBe(10);
      expect(getQuantityStep(99)).toBe(10);
      expect(getQuantityStep(100)).toBe(100);
      expect(getQuantityStep(500)).toBe(100);
      expect(getQuantityStep(1000)).toBe(1000);
    });

    it('should return precision step for decimals (one decimal → 0.1, two → 0.01, three → 0.001)', () => {
      expect(getQuantityStep(1.2)).toBe(0.1);
      expect(getQuantityStep(0.5)).toBe(0.1);
      expect(getQuantityStep(1.15)).toBe(0.01);
      expect(getQuantityStep(0.25)).toBe(0.01);
      expect(getQuantityStep(0.004)).toBe(0.001);
      expect(getQuantityStep(0.999)).toBe(0.001);
      expect(getQuantityStep(1.001)).toBe(0.001);
    });

    it('should use explicitStep when provided and positive', () => {
      expect(getQuantityStep(5, { explicitStep: 0.25 })).toBe(0.25);
      expect(getQuantityStep(0.1, { explicitStep: 2 })).toBe(2);
    });

    it('should return 1 when integerOnly is true', () => {
      expect(getQuantityStep(0.5, { integerOnly: true })).toBe(1);
      expect(getQuantityStep(10, { integerOnly: true })).toBe(1);
    });

    it('should return 1 for non-finite values and zero', () => {
      expect(getQuantityStep(NaN)).toBe(1);
      expect(getQuantityStep(Infinity)).toBe(1);
      expect(getQuantityStep(-Infinity)).toBe(1);
      expect(getQuantityStep(0)).toBe(1);
    });
  });

  describe('quantityIncrement', () => {
    it('should use step 1 for whole numbers when single-click (no continuousPress). Plan 176', () => {
      expect(quantityIncrement(0)).toBe(1);
      expect(quantityIncrement(5)).toBe(6);
      expect(quantityIncrement(9)).toBe(10);
      expect(quantityIncrement(10)).toBe(11);
      expect(quantityIncrement(99)).toBe(100);
      expect(quantityIncrement(100)).toBe(101);
      expect(quantityIncrement(1000)).toBe(1001);
    });

    it('should use tiered steps when continuousPress (hold). Plan 176: 0→9 +1, 10→100 +10, 100→1000 +100, 1000+ +1000', () => {
      const hold = { continuousPress: true };
      expect(quantityIncrement(0, undefined, hold)).toBe(1);
      expect(quantityIncrement(9, undefined, hold)).toBe(10);
      expect(quantityIncrement(10, undefined, hold)).toBe(20);
      expect(quantityIncrement(90, undefined, hold)).toBe(100);
      expect(quantityIncrement(100, undefined, hold)).toBe(200);
      expect(quantityIncrement(900, undefined, hold)).toBe(1000);
      expect(quantityIncrement(1000, undefined, hold)).toBe(2000);
    });

    it('should add precision step for decimals (1.2→1.3, 1.15→1.16)', () => {
      expect(quantityIncrement(1.2)).toBe(1.3);
      expect(quantityIncrement(1.15)).toBe(1.16);
      expect(quantityIncrement(0.004)).toBe(0.005);
      expect(quantityIncrement(0.001)).toBe(0.002);
    });

    it('should respect min when provided', () => {
      expect(quantityIncrement(2, 5)).toBe(5);
      expect(quantityIncrement(3, 3)).toBe(4);
    });

    it('should use integerOnly option (step 1)', () => {
      expect(quantityIncrement(1, undefined, { integerOnly: true })).toBe(2);
      expect(quantityIncrement(0.5, undefined, { integerOnly: true })).toBe(1.5);
    });

    it('should treat non-finite value as 0 for step calculation (step 1)', () => {
      expect(quantityIncrement(NaN)).toBe(1);
    });
  });

  describe('quantityDecrement', () => {
    it('should use step 1 for whole numbers when single-click (no continuousPress). Plan 176', () => {
      expect(quantityDecrement(1000)).toBe(999);
      expect(quantityDecrement(100)).toBe(99);
      expect(quantityDecrement(10)).toBe(9);
      expect(quantityDecrement(2)).toBe(1);
    });

    it('should use tiered steps when continuousPress (hold). Plan 176: step 1 to mult of 10, then 10/100', () => {
      const hold = { continuousPress: true };
      expect(quantityDecrement(99, undefined, hold)).toBe(98);
      expect(quantityDecrement(91, undefined, hold)).toBe(90);
      expect(quantityDecrement(90, undefined, hold)).toBe(80);
      expect(quantityDecrement(100, undefined, hold)).toBe(90);
      expect(quantityDecrement(10, undefined, hold)).toBe(9);
      expect(quantityDecrement(1099, undefined, hold)).toBe(1098);
      expect(quantityDecrement(1090, undefined, hold)).toBe(1080);
      expect(quantityDecrement(1000, undefined, hold)).toBe(900);
    });

    it('should subtract precision step for decimals (1.3→1.2, 1.16→1.15)', () => {
      expect(quantityDecrement(1.3)).toBe(1.2);
      expect(quantityDecrement(1.16)).toBe(1.15);
      expect(quantityDecrement(0.005)).toBe(0.004);
      expect(quantityDecrement(0.002)).toBe(0.001);
    });

    it('should respect min when provided', () => {
      expect(quantityDecrement(2, 2)).toBe(2);
      expect(quantityDecrement(3, 1)).toBe(2);
    });

    it('should use integerOnly option', () => {
      expect(quantityDecrement(2, undefined, { integerOnly: true })).toBe(1);
      expect(quantityDecrement(1.5, 0, { integerOnly: true })).toBe(0.5);
    });

    it('should treat non-finite value as 0 for step calculation (step 1)', () => {
      expect(quantityDecrement(NaN)).toBe(-1);
    });
  });

  describe('unit-aware stepping (Plan 214 — value-range-based)', () => {
    // ── Single click ──────────────────────────────────────────────────────────
    it('single click on whole number steps +0.1', () => {
      expect(quantityIncrement(1, 0, { unit: 'kg' })).toBe(1.1);
      expect(quantityIncrement(5, 0, { unit: 'g' })).toBe(5.1);
    });

    it('single click on 1dp value steps +0.1', () => {
      expect(quantityIncrement(1.5, 0, { unit: 'kg' })).toBe(1.6);
    });

    it('single click on 2dp value steps +0.01', () => {
      expect(quantityIncrement(1.51, 0, { unit: 'kg' })).toBe(1.52);
      expect(quantityIncrement(0.99, 0, { unit: 'kg' })).toBe(1);
    });

    it('single click decrement from whole number steps -0.1', () => {
      expect(quantityDecrement(1, 0, { unit: 'kg' })).toBe(0.9);
    });

    it('single click decrement on 2dp value steps -0.01', () => {
      expect(quantityDecrement(1.51, 0, { unit: 'kg' })).toBe(1.5);
    });

    // ── Hold — snap to tier boundary first ───────────────────────────────────
    it('hold incr on dirty value snaps to tier boundary (1.55 → 1.6)', () => {
      expect(quantityIncrement(1.55, 0, { unit: 'kg', continuousPress: true })).toBe(1.6);
    });

    it('hold incr on tier boundary steps by range (1.9 → 2.0, tier exit)', () => {
      expect(quantityIncrement(1.9, 0, { unit: 'kg', continuousPress: true })).toBe(2);
    });

    it('hold incr tier transitions: 2→3, 9→10, 10→20, 90→100', () => {
      const h = { unit: 'kg', continuousPress: true } as QuantityStepOptions;
      expect(quantityIncrement(2, 0, h)).toBe(3);
      expect(quantityIncrement(9, 0, h)).toBe(10);
      expect(quantityIncrement(10, 0, h)).toBe(20);
      expect(quantityIncrement(90, 0, h)).toBe(100);
    });

    // ── Hold decrement — fine zone ────────────────────────────────────────────
    it('hold decr fine zone: 1.0 → 0.99', () => {
      expect(quantityDecrement(1.0, 0, { unit: 'kg', continuousPress: true })).toBe(0.99);
    });

    it('hold decr fine zone: 0.91 → 0.90', () => {
      expect(quantityDecrement(0.91, 0, { unit: 'kg', continuousPress: true })).toBe(0.90);
    });

    it('hold decr exits fine zone at 0.90 → 0.80 (back to 0.1 steps)', () => {
      expect(quantityDecrement(0.9, 0, { unit: 'kg', continuousPress: true })).toBe(0.8);
    });

    it('hold decr tier transitions: 2.0→1.9, 3→2, 10→9, 20→10', () => {
      const h = { unit: 'kg', continuousPress: true } as QuantityStepOptions;
      expect(quantityDecrement(2.0, 0, h)).toBe(1.9);
      expect(quantityDecrement(3, 0, h)).toBe(2);
      expect(quantityDecrement(10, 0, h)).toBe(9);
      expect(quantityDecrement(20, 0, h)).toBe(10);
    });

    // ── Floor at 0 ───────────────────────────────────────────────────────────
    it('floors at 0 on decrement', () => {
      expect(quantityDecrement(0.01, 0, { unit: 'kg' })).toBe(0);
      expect(quantityDecrement(0.05, 0, { unit: 'kg', continuousPress: true })).toBe(0);
    });

    // ── getQuantityStep ───────────────────────────────────────────────────────
    it('getQuantityStep returns 0.1 for unit-aware (Plan 214)', () => {
      expect(getQuantityStep(5, { unit: 'kg' })).toBe(0.1);
    });

    // ── Non-unit-aware falls through ─────────────────────────────────────────
    it('non-unit-aware unit falls through to normal path', () => {
      expect(quantityIncrement(1, 0, { unit: 'unit' })).toBe(2);
    });
  });
});
