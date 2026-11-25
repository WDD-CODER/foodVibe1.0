'use strict'
/** Plan 727: the month and target rules (shared, no zod) and the monthly_plan module key. */

const R = require('../generated/schemas/month/month-rules')
const S = require('../generated/schemas')

describe('MONTH_KEY_PATTERN', () => {
  it('accepts 2000-01 … 2099-12 and nothing else', () => {
    for (const ok of ['2000-01', '2026-11', '2099-12']) expect(R.MONTH_KEY_PATTERN.test(ok), ok).toBe(true)
    for (const bad of ['1999-12', '2100-01', '2026-00', '2026-13', '2026-1', '26-11', '2026-11-01', '', 'abcd-ef']) {
      expect(R.MONTH_KEY_PATTERN.test(bad), bad).toBe(false)
    }
  })
})

describe('monthKeyOf', () => {
  it('names the Jerusalem calendar month, not the UTC one', () => {
    // 2026-11-30 22:30 UTC is already 2026-12-01 00:30 in Jerusalem (UTC+2 in winter).
    expect(R.monthKeyOf(Date.UTC(2026, 10, 30, 22, 30))).toBe('2026-12')
    expect(R.monthKeyOf(Date.UTC(2026, 10, 30, 21, 30))).toBe('2026-11')
    // Summer time (UTC+3): 2026-06-30 21:30 UTC is 2026-07-01 00:30.
    expect(R.monthKeyOf(Date.UTC(2026, 5, 30, 21, 30))).toBe('2026-07')
  })
})

describe('shiftMonth', () => {
  it('crosses the year in both directions', () => {
    expect(R.shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(R.shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(R.shiftMonth('2026-05', 0)).toBe('2026-05')
    expect(R.shiftMonth('2026-05', -17)).toBe('2024-12')
  })
})

describe('monthLabel', () => {
  it('gives the Hebrew month and year', () => {
    const label = R.monthLabel('2026-11', 'he-IL')
    expect(label).toContain('נובמבר')
    expect(label).toContain('2026')
  })
})

describe('targets', () => {
  it('the defaults add up to 100, prime is food + labour, and each default sits inside its band', () => {
    const d = R.MONTH_TARGET_DEFAULTS
    expect(R.MONTH_TARGET_KEYS).toEqual(['foodPct', 'labourPct', 'primePct', 'fixedPct', 'profitPct'])
    expect(d).toEqual({ foodPct: 32, labourPct: 33, primePct: 65, fixedPct: 25, profitPct: 10 })
    expect(d.foodPct + d.labourPct + d.fixedPct + d.profitPct).toBe(100)
    expect(d.primePct).toBe(d.foodPct + d.labourPct)
    for (const key of R.MONTH_TARGET_KEYS) {
      const [from, to] = R.MONTH_TARGET_BANDS[key]
      if (from !== null) expect(d[key], key).toBeGreaterThanOrEqual(from)
      expect(d[key], key).toBeLessThanOrEqual(to)
    }
    expect(R.MONTH_TARGET_BANDS.primePct).toEqual([null, 65])
  })
})

describe('the monthly_plan module', () => {
  it('is the last key, is off by default and the platform write accepts every key', () => {
    expect(S.MODULE_KEYS[S.MODULE_KEYS.length - 1]).toBe('monthly_plan')
    expect(S.DEFAULT_MODULES).not.toContain('monthly_plan')
    expect(S.modulesOf({})).not.toContain('monthly_plan')
    expect(S.modulesOf({ modules: ['monthly_plan'] })).toEqual(['monthly_plan'])
    expect(S.modulesFieldSchema.safeParse(S.MODULE_KEYS).success).toBe(true)
    expect(S.MODULE_OF_TYPE.monthPlans).toBeUndefined()
  })
})

describe('fixed lines and labour defaults (plan 729)', () => {
  it('the starter keys include kashrut, the cap is 40 and the factor is 1.25', () => {
    expect(R.FIXED_STARTER_KEYS).toEqual(['rent', 'arnona', 'electricity', 'water', 'gas', 'insurance', 'kashrut', 'marketing'])
    expect(R.FIXED_LINES_MAX).toBe(40)
    expect(R.LABOUR_FACTOR_DEFAULT).toBe(1.25)
  })

  it('defaultFixed is one blank line per starter key in lines mode; defaultLabour is employer mode at 1.25', () => {
    const fixed = R.defaultFixed()
    expect(fixed.mode).toBe('lines')
    expect(fixed.lines.map(l => l.id)).toEqual(R.FIXED_STARTER_KEYS)
    expect(fixed.lines.every(l => l.id === l.starterKey && l.plan === null && l.actual === null)).toBe(true)
    expect(fixed.rough).toEqual({ plan: null, actual: null })
    expect(R.defaultLabour()).toEqual({ mode: 'employer', factor: 1.25, plan: null, actual: null })
    expect(R.defaultFixed()).not.toBe(R.defaultFixed())
  })
})
