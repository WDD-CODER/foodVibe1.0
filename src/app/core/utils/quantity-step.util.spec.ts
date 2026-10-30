import { getQuantityStep, quantityIncrement, quantityDecrement } from './quantity-step.util'

describe('quantity-step.util', () => {
  describe('getQuantityStep', () => {
    it('should return magnitude step for whole numbers (1–9 → 1, 10–99 → 10, 100+ → 100…)', () => {
      expect(getQuantityStep(1)).toBe(1)
      expect(getQuantityStep(2)).toBe(1)
      expect(getQuantityStep(9)).toBe(1)
      expect(getQuantityStep(10)).toBe(10)
      expect(getQuantityStep(99)).toBe(10)
      expect(getQuantityStep(100)).toBe(100)
      expect(getQuantityStep(500)).toBe(100)
      expect(getQuantityStep(1000)).toBe(1000)
    })

    it('should return precision step for decimals (one decimal → 0.1, two → 0.01, three → 0.001)', () => {
      expect(getQuantityStep(1.2)).toBe(0.1)
      expect(getQuantityStep(0.5)).toBe(0.1)
      expect(getQuantityStep(1.15)).toBe(0.01)
      expect(getQuantityStep(0.25)).toBe(0.01)
      expect(getQuantityStep(0.004)).toBe(0.001)
      expect(getQuantityStep(0.999)).toBe(0.001)
      expect(getQuantityStep(1.001)).toBe(0.001)
    })

    it('should use explicitStep when provided and positive', () => {
      expect(getQuantityStep(5, { explicitStep: 0.25 })).toBe(0.25)
      expect(getQuantityStep(0.1, { explicitStep: 2 })).toBe(2)
    })

    it('should return 1 when integerOnly is true', () => {
      expect(getQuantityStep(0.5, { integerOnly: true })).toBe(1)
      expect(getQuantityStep(10, { integerOnly: true })).toBe(1)
    })

    it('should return 1 for non-finite values and zero', () => {
      expect(getQuantityStep(NaN)).toBe(1)
      expect(getQuantityStep(Infinity)).toBe(1)
      expect(getQuantityStep(-Infinity)).toBe(1)
      expect(getQuantityStep(0)).toBe(1)
    })
  })

  describe('quantityIncrement', () => {
    it('should use step 1 for whole numbers when single-click (no continuousPress). Plan 176', () => {
      expect(quantityIncrement(0)).toBe(1)
      expect(quantityIncrement(5)).toBe(6)
      expect(quantityIncrement(9)).toBe(10)
      expect(quantityIncrement(10)).toBe(11)
      expect(quantityIncrement(99)).toBe(100)
      expect(quantityIncrement(100)).toBe(101)
      expect(quantityIncrement(1000)).toBe(1001)
    })

    it('hold on a plain number steps by 1 for repeats 1-9, then 10s, then 100s (plan 511)', () => {
      expect(quantityIncrement(0, undefined, { continuousPress: true, holdRepeat: 1 })).toBe(1)
      expect(quantityIncrement(9, undefined, { continuousPress: true, holdRepeat: 9 })).toBe(10)
      expect(quantityIncrement(9, undefined, { continuousPress: true, holdRepeat: 10 })).toBe(10)
      expect(quantityIncrement(10, undefined, { continuousPress: true, holdRepeat: 10 })).toBe(20)
      expect(quantityIncrement(95, undefined, { continuousPress: true, holdRepeat: 19 })).toBe(100)
      expect(quantityIncrement(100, undefined, { continuousPress: true })).toBe(101)
    })

    it('should add precision step for decimals (1.2→1.3, 1.15→1.16)', () => {
      expect(quantityIncrement(1.2)).toBe(1.3)
      expect(quantityIncrement(1.15)).toBe(1.16)
      expect(quantityIncrement(0.004)).toBe(0.005)
      expect(quantityIncrement(0.001)).toBe(0.002)
    })

    it('should respect min when provided', () => {
      expect(quantityIncrement(2, 5)).toBe(5)
      expect(quantityIncrement(3, 3)).toBe(4)
    })

    it('should use integerOnly option (step 1)', () => {
      expect(quantityIncrement(1, undefined, { integerOnly: true })).toBe(2)
      expect(quantityIncrement(0.5, undefined, { integerOnly: true })).toBe(1.5)
    })

    it('should treat non-finite value as 0 for step calculation (step 1)', () => {
      expect(quantityIncrement(NaN)).toBe(1)
    })
  })

  describe('quantityDecrement', () => {
    it('should use step 1 for whole numbers when single-click (no continuousPress). Plan 176', () => {
      expect(quantityDecrement(1000)).toBe(999)
      expect(quantityDecrement(100)).toBe(99)
      expect(quantityDecrement(10)).toBe(9)
      expect(quantityDecrement(2)).toBe(1)
    })

    it('hold on a plain number mirrors the tiers going down (plan 511)', () => {
      expect(quantityDecrement(99, undefined, { continuousPress: true, holdRepeat: 1 })).toBe(98)
      expect(quantityDecrement(91, undefined, { continuousPress: true, holdRepeat: 10 })).toBe(90)
      expect(quantityDecrement(90, undefined, { continuousPress: true, holdRepeat: 10 })).toBe(80)
      expect(quantityDecrement(1090, undefined, { continuousPress: true, holdRepeat: 19 })).toBe(1000)
      expect(quantityDecrement(3, 0, { continuousPress: true, holdRepeat: 19 })).toBe(0)
    })

    it('should subtract precision step for decimals (1.3→1.2, 1.16→1.15)', () => {
      expect(quantityDecrement(1.3)).toBe(1.2)
      expect(quantityDecrement(1.16)).toBe(1.15)
      expect(quantityDecrement(0.005)).toBe(0.004)
      expect(quantityDecrement(0.002)).toBe(0.001)
    })

    it('should respect min when provided', () => {
      expect(quantityDecrement(2, 2)).toBe(2)
      expect(quantityDecrement(3, 1)).toBe(2)
    })

    it('should use integerOnly option', () => {
      expect(quantityDecrement(2, undefined, { integerOnly: true })).toBe(1)
      expect(quantityDecrement(1.5, 0, { integerOnly: true })).toBe(0.5)
    })

    it('should treat non-finite value as 0 for step calculation (step 1)', () => {
      expect(quantityDecrement(NaN)).toBe(-1)
    })
  })

  describe('unit-aware stepping (Plan 214 — value-range-based)', () => {
    // ── Single click ──────────────────────────────────────────────────────────
    it('single click on whole number steps +0.1 (kg) or +1 (g)', () => {
      expect(quantityIncrement(1, 0, { unit: 'kg' })).toBe(1.1)
      expect(quantityIncrement(5, 0, { unit: 'g' })).toBe(6)
    })

    it('single click on 1dp value steps +0.1', () => {
      expect(quantityIncrement(1.5, 0, { unit: 'kg' })).toBe(1.6)
    })

    it('single click on 2dp value steps +0.01', () => {
      expect(quantityIncrement(1.51, 0, { unit: 'kg' })).toBe(1.52)
      expect(quantityIncrement(0.99, 0, { unit: 'kg' })).toBe(1)
    })

    it('single click decrement from whole number steps -0.1', () => {
      expect(quantityDecrement(1, 0, { unit: 'kg' })).toBe(0.9)
    })

    it('single click decrement on 2dp value steps -0.01', () => {
      expect(quantityDecrement(1.51, 0, { unit: 'kg' })).toBe(1.5)
    })

    // ── Hold: ones, then tens, then hundreds (plan 511) ───────────────────────
    const holdUp = (start: number, repeats: number, unit: string, min = 0): number[] => {
      const seen: number[] = []
      let v = start
      for (let n = 1; n <= repeats; n++) {
        v = quantityIncrement(v, min, { unit, continuousPress: true, holdRepeat: n })
        seen.push(v)
      }
      return seen
    }
    const holdDown = (start: number, repeats: number, unit: string, min = 0): number[] => {
      const seen: number[] = []
      let v = start
      for (let n = 1; n <= repeats; n++) {
        v = quantityDecrement(v, min, { unit, continuousPress: true, holdRepeat: n })
        seen.push(v)
      }
      return seen
    }

    it('hold + from 100 g: 101..109, then 110, 120..190, then 200, 300', () => {
      const seen = holdUp(100, 21, 'g')
      expect(seen.slice(0, 9)).toEqual([101, 102, 103, 104, 105, 106, 107, 108, 109])
      expect(seen.slice(9, 18)).toEqual([110, 120, 130, 140, 150, 160, 170, 180, 190])
      expect(seen.slice(18)).toEqual([200, 300, 400])
    })

    it('a new press starts at the ones digit again (repeat count restarts)', () => {
      expect(quantityIncrement(140, 0, { unit: 'g', continuousPress: true, holdRepeat: 1 })).toBe(141)
      expect(quantityIncrement(140, 0, { unit: 'g' })).toBe(141)
    })

    it('hold + on 100.1 g snaps to a whole gram first', () => {
      expect(quantityIncrement(100.1, 0, { unit: 'g', continuousPress: true, holdRepeat: 1 })).toBe(101)
      expect(quantityIncrement(100.15, 0, { unit: 'g', continuousPress: true, holdRepeat: 10 })).toBe(110)
    })

    it('hold - from 200 g mirrors the tiers and stops at the minimum', () => {
      expect(holdDown(205, 3, 'g')).toEqual([204, 203, 202])
      expect(quantityDecrement(105, 0, { unit: 'g', continuousPress: true, holdRepeat: 10 })).toBe(100)
      expect(quantityDecrement(200, 0, { unit: 'g', continuousPress: true, holdRepeat: 19 })).toBe(100)
      expect(holdDown(3, 6, 'g')).toEqual([2, 1, 0, 0, 0, 0])
      expect(holdDown(3, 4, 'g', 1)).toEqual([2, 1, 1, 1])
    })

    it('kg and l start at 0.1 and grow 1, 10', () => {
      const seen = holdUp(1, 20, 'kg')
      expect(seen[0]).toBe(1.1)
      expect(seen[8]).toBe(1.9)
      expect(seen[9]).toBe(2)
      expect(seen[10]).toBe(3)
      expect(seen[17]).toBe(10)
      expect(seen[18]).toBe(20)
      expect(quantityIncrement(0, 0, { unit: 'l', continuousPress: true, holdRepeat: 1 })).toBe(0.1)
      expect(quantityIncrement(1.55, 0, { unit: 'kg', continuousPress: true, holdRepeat: 1 })).toBe(1.56)
    })

    it('ml steps like g', () => {
      expect(quantityIncrement(100, 0, { unit: 'ml', continuousPress: true, holdRepeat: 1 })).toBe(101)
    })

    // ── Floor at 0 ───────────────────────────────────────────────────────────
    it('floors at 0 on decrement', () => {
      expect(quantityDecrement(0.01, 0, { unit: 'kg' })).toBe(0)
      expect(quantityDecrement(0.01, 0, { unit: 'kg', continuousPress: true })).toBe(0)
    })

    // ── getQuantityStep ───────────────────────────────────────────────────────
    it('getQuantityStep returns 0.1 for unit-aware (Plan 214)', () => {
      expect(getQuantityStep(5, { unit: 'kg' })).toBe(0.1)
    })

    // ── Non-unit-aware falls through ─────────────────────────────────────────
    it('non-unit-aware unit falls through to normal path', () => {
      expect(quantityIncrement(1, 0, { unit: 'unit' })).toBe(2)
    })
  })
})
