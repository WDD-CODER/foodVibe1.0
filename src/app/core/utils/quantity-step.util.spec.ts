import { getQuantityStep, quantityIncrement, quantityDecrement } from './quantity-step.util';

describe('quantity-step.util', () => {
  describe('getQuantityStep', () => {
    it('should return 1 when value >= 1', () => {
      expect(getQuantityStep(1)).toBe(1);
      expect(getQuantityStep(2)).toBe(1);
      expect(getQuantityStep(100)).toBe(1);
    });

    it('should return 0.001 when value < 1', () => {
      expect(getQuantityStep(0.5)).toBe(0.001);
      expect(getQuantityStep(0.004)).toBe(0.001);
      expect(getQuantityStep(0.999)).toBe(0.001);
    });

    it('should use explicitStep when provided and positive', () => {
      expect(getQuantityStep(5, { explicitStep: 0.25 })).toBe(0.25);
      expect(getQuantityStep(0.1, { explicitStep: 2 })).toBe(2);
    });

    it('should return 1 when integerOnly is true', () => {
      expect(getQuantityStep(0.5, { integerOnly: true })).toBe(1);
      expect(getQuantityStep(10, { integerOnly: true })).toBe(1);
    });

    it('should return 1 for non-finite values', () => {
      expect(getQuantityStep(NaN)).toBe(1);
      expect(getQuantityStep(Infinity)).toBe(1);
      expect(getQuantityStep(-Infinity)).toBe(1);
    });
  });

  describe('quantityIncrement', () => {
    it('should add step 1 when value >= 1', () => {
      expect(quantityIncrement(1)).toBe(2);
      expect(quantityIncrement(5)).toBe(6);
    });

    it('should add step 0.001 when value < 1 and round to 3 decimals', () => {
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

    it('should treat non-finite value as 0 for step calculation', () => {
      expect(quantityIncrement(NaN)).toBe(0.001);
    });
  });

  describe('quantityDecrement', () => {
    it('should subtract step 1 when value >= 1', () => {
      expect(quantityDecrement(2)).toBe(1);
      expect(quantityDecrement(6)).toBe(5);
    });

    it('should subtract step 0.001 when value < 1 and round to 3 decimals', () => {
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

    it('should treat non-finite value as 0 for step calculation', () => {
      expect(quantityDecrement(NaN)).toBe(-0.001);
    });
  });
});
