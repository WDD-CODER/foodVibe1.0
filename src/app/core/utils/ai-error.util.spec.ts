import { HttpErrorResponse } from '@angular/common/http'
import {
  AI_BUDGET_CONTACT_EMAIL,
  aiBudgetContactEmail,
  aiBudgetMessage,
  aiCapErrorKey,
  isAiBudgetExhausted
} from './ai-error.util'

const budget = (body: unknown = { error: 'AI_BUDGET_EXHAUSTED', code: 'AI_BUDGET_EXHAUSTED' }) =>
  new HttpErrorResponse({ status: 402, error: body })

describe('aiCapErrorKey', () => {
  it('returns the key for the monthly cap body', () => {
    const err = new HttpErrorResponse({
      status: 429,
      error: { error: 'ai_monthly_cap_reached', code: 'ai_monthly_cap_reached' }
    })
    expect(aiCapErrorKey(err)).toBe('ai_monthly_cap_reached')
  })

  it('returns null for any other 429', () => {
    expect(aiCapErrorKey(new HttpErrorResponse({ status: 429, error: { error: 'daily_limit_reached' } }))).toBeNull()
  })

  it('returns null for a non-object or an error without a body', () => {
    expect(aiCapErrorKey('boom')).toBeNull()
    expect(aiCapErrorKey(null)).toBeNull()
    expect(aiCapErrorKey(new HttpErrorResponse({ status: 500 }))).toBeNull()
  })

  it('plan 736: returns the short budget key for the 402 AI_BUDGET_EXHAUSTED, null for another 402', () => {
    expect(aiCapErrorKey(budget())).toBe('ai_budget_exhausted_short')
    expect(aiCapErrorKey(budget({ code: 'OTHER' }))).toBeNull()
    expect(aiCapErrorKey(new HttpErrorResponse({ status: 429, error: { code: 'AI_BUDGET_EXHAUSTED' } }))).toBeNull()
  })
})

describe('the AI budget answer (plan 736)', () => {
  it('isAiBudgetExhausted reads status 402 and the code', () => {
    expect(isAiBudgetExhausted(budget())).toBeTrue()
    expect(isAiBudgetExhausted(budget({ code: 'OTHER' }))).toBeFalse()
    expect(isAiBudgetExhausted(null)).toBeFalse()
  })

  it('takes the contact email from the answer, else the default', () => {
    expect(aiBudgetContactEmail(budget({ code: 'AI_BUDGET_EXHAUSTED', contactEmail: 'ops@example.test' }))).toBe(
      'ops@example.test'
    )
    expect(aiBudgetContactEmail(budget())).toBe(AI_BUDGET_CONTACT_EMAIL)
    expect(AI_BUDGET_CONTACT_EMAIL).toBe('dan.weibren@gmail.com')
  })

  it('fills {{email}} in the toast line', () => {
    const tr = { translate: (k: string) => (k === 'ai_budget_exhausted' ? 'פנו אל {{email}}' : k) }
    expect(aiBudgetMessage(budget(), tr)).toBe('פנו אל dan.weibren@gmail.com')
  })
})
