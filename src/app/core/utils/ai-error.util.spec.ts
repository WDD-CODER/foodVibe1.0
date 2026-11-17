import { HttpErrorResponse } from '@angular/common/http'
import { aiCapErrorKey } from './ai-error.util'

describe('aiCapErrorKey (plan 620)', () => {
  it('returns the key for the cap body', () => {
    const err = new HttpErrorResponse({
      status: 429,
      error: { error: 'ai_monthly_cap_reached', code: 'ai_monthly_cap_reached' }
    })
    expect(aiCapErrorKey(err)).toBe('ai_monthly_cap_reached')
  })

  it('returns null for another 429', () => {
    expect(aiCapErrorKey(new HttpErrorResponse({ status: 429, error: { error: 'daily_limit_reached' } }))).toBeNull()
  })

  it('returns null for a non-object and for a body that is a string', () => {
    expect(aiCapErrorKey(null)).toBeNull()
    expect(aiCapErrorKey('x')).toBeNull()
    expect(aiCapErrorKey({ error: 'ai_monthly_cap_reached' })).toBeNull()
  })
})
