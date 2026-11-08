import { HttpErrorResponse } from '@angular/common/http'
import { API } from '@services/http-storage.adapter'
import {
  readServerRefusal,
  refusalShownToUser,
  saveRefusalMessage,
  serverFieldErrors,
  type ServerRefusal
} from './server-refusal.util'

const DATA_URL = API.data('products/x')
const makeErr = (status: number, error: unknown = null, url: string = DATA_URL) =>
  new HttpErrorResponse({ status, error, url })
const dict: Record<string, string> = {
  name: 'שם',
  phone: 'טלפון',
  save_refused_fields: 'יש לתקן: {{fields}}',
  save_refused_hidden: 'HIDDEN',
  save_refused_generic: 'GENERIC'
}
const tr = { translate: (k: string) => dict[k] ?? k }
const issue = (path: string, code = 'too_big', message = 'x') => ({ path, code, message })

describe('server-refusal.util', () => {
  describe('readServerRefusal', () => {
    it('reads issues of a data-API 400', () => {
      const r = readServerRefusal(makeErr(400, { error: 'Validation failed', issues: [issue('nameHebrew')] }))
      expect(r?.error).toBe('Validation failed')
      expect(r?.issues).toEqual([issue('nameHebrew')])
    })
    it('gives empty issues when the body has none', () => {
      expect(readServerRefusal(makeErr(400, { error: 'Bad' }))?.issues).toEqual([])
      expect(readServerRefusal(makeErr(400))?.issues).toEqual([])
    })
    it('is null for other statuses, urls and values', () => {
      expect(readServerRefusal(makeErr(500))).toBeNull()
      expect(readServerRefusal(makeErr(400, {}, '/api/v1/ai/x'))).toBeNull()
      expect(readServerRefusal(new Error('x'))).toBeNull()
    })
  })

  describe('refusalShownToUser', () => {
    it('is true for data 400, 403 no_permission, data 429', () => {
      expect(refusalShownToUser(makeErr(400))).toBe(true)
      expect(refusalShownToUser(makeErr(403, { messageKey: 'no_permission' }))).toBe(true)
      expect(refusalShownToUser(makeErr(429))).toBe(true)
    })
    it('is false for 409, 500, plain 403, non-data 400 and non-http errors', () => {
      expect(refusalShownToUser(makeErr(409))).toBe(false)
      expect(refusalShownToUser(makeErr(500))).toBe(false)
      expect(refusalShownToUser(makeErr(403, {}))).toBe(false)
      expect(refusalShownToUser(makeErr(400, {}, '/api/v1/ai/x'))).toBe(false)
      expect(refusalShownToUser(new Error('x'))).toBe(false)
    })
  })

  describe('saveRefusalMessage', () => {
    const mk = (issues: ServerRefusal['issues']): ServerRefusal => ({ issues, error: '' })
    it('names unique labelled fields', () => {
      expect(saveRefusalMessage(mk([issue('nameHebrew'), issue('nameHebrew'), issue('phone')]), tr)).toBe(
        'יש לתקן: שם, טלפון'
      )
    })
    it('uses the hidden text for unrecognized_keys and unlabelled paths', () => {
      expect(saveRefusalMessage(mk([issue('', 'unrecognized_keys')]), tr)).toBe('HIDDEN')
      expect(saveRefusalMessage(mk([issue('mystery')]), tr)).toBe('HIDDEN')
    })
    it('uses the generic text without issues', () => {
      expect(saveRefusalMessage(mk([]), tr)).toBe('GENERIC')
    })
    it('names the labelled field when another issue is unknown', () => {
      expect(saveRefusalMessage(mk([issue('', 'unrecognized_keys'), issue('phone')]), tr)).toBe('יש לתקן: טלפון')
    })
  })

  describe('serverFieldErrors', () => {
    const map = { nameHebrew: 'productName', yieldAmount: 'yield_amount' }
    it('maps too_big, missing and other codes', () => {
      const e = makeErr(400, {
        issues: [
          issue('nameHebrew', 'too_big'),
          issue('yieldAmount', 'invalid_type', 'Invalid input: expected number, received undefined')
        ]
      })
      expect(serverFieldErrors(e, map)).toEqual({
        productName: 'server_field_too_long',
        yield_amount: 'field_required'
      })
      expect(serverFieldErrors(makeErr(400, { issues: [issue('nameHebrew', 'custom')] }), map)).toEqual({
        productName: 'server_field_invalid'
      })
    })
    it('uses the first segment of a nested path', () => {
      expect(serverFieldErrors(makeErr(400, { issues: [issue('nameHebrew.0', 'too_big')] }), map)).toEqual({
        productName: 'server_field_too_long'
      })
    })
    it('skips unmapped paths and non-refusals', () => {
      expect(serverFieldErrors(makeErr(400, { issues: [issue('phone')] }), map)).toEqual({})
      expect(serverFieldErrors(makeErr(500), map)).toEqual({})
    })
  })
})
