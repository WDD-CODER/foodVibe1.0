import { HttpErrorResponse } from '@angular/common/http'
import { aiCapErrorKey } from './ai-error.util'

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
})
