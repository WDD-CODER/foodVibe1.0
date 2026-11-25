import { aiCallsLeftLine, cacheServerGeminiUsage, getGeminiUsage } from './gemini-usage.util'

const tr = {
  translate: (k: string) =>
    ({ ai_calls_left: 'נשארו לך {{left}} מתוך {{total}} קריאות AI', ai_calls_unlimited: 'ללא הגבלה' })[k] ?? k
}
const today = new Date().toISOString().slice(0, 10)

describe('gemini-usage.util — the user allowance (plan 736)', () => {
  afterEach(() => localStorage.removeItem('FV_GEMINI_USAGE'))

  it('keeps mine from the server answer but never in the shared cache', () => {
    const usage = cacheServerGeminiUsage({
      date: today,
      budget: 10,
      mine: { allowance: 5, used: 3, remaining: 2, unlimited: false }
    })
    expect(usage.mine).toEqual({ allowance: 5, used: 3, remaining: 2, unlimited: false })
    expect(getGeminiUsage().mine).toBeUndefined()
  })

  it('drops a malformed mine', () => {
    const usage = cacheServerGeminiUsage({ date: today, mine: { allowance: 'x' } as never })
    expect(usage.mine).toBeUndefined()
  })

  it('writes the calls-left line, the unlimited line, or nothing', () => {
    const base = cacheServerGeminiUsage({ date: today })
    expect(aiCallsLeftLine(base, tr)).toBe('')
    expect(aiCallsLeftLine({ ...base, mine: { allowance: 2, used: 2, remaining: 0, unlimited: false } }, tr)).toBe(
      'נשארו לך 0 מתוך 2 קריאות AI'
    )
    expect(aiCallsLeftLine({ ...base, mine: { allowance: 100, used: 0, remaining: 100, unlimited: true } }, tr)).toBe(
      'ללא הגבלה'
    )
  })
})
