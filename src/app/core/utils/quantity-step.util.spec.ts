import { getQuantityStep, quantityIncrement, quantityDecrement } from './quantity-step.util';

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
    it('should add magnitude step for whole numbers (1→2, 10→20, 100→200)', () => {
      expect(quantityIncrement(1)).toBe(2);
      expect(quantityIncrement(5)).toBe(6);
      expect(quantityIncrement(9)).toBe(10);
      expect(quantityIncrement(10)).toBe(20);
      expect(quantityIncrement(100)).toBe(200);
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
    it('should subtract magnitude step for whole numbers (2→1, 20→10, 200→100)', () => {
      expect(quantityDecrement(2)).toBe(1);
      expect(quantityDecrement(6)).toBe(5);
      expect(quantityDecrement(10)).toBe(0);
      expect(quantityDecrement(20)).toBe(10);
      expect(quantityDecrement(200)).toBe(100);
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
});
