'use strict'
/** Plan 555 — redactUrl masks the guest read-back token. */
const { redactUrl } = require('../utils/redact-url')

const TOKEN = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6'

describe('redactUrl', () => {
  it('masks the token of the API read and cancel routes', () => {
    expect(redactUrl(`/api/v1/public/bistro/requests/${TOKEN}`)).toBe('/api/v1/public/bistro/requests/:token')
    expect(redactUrl(`/api/v1/public/bistro/requests/${TOKEN}/cancel`)).toBe('/api/v1/public/bistro/requests/:token/cancel')
  })

  it('masks the token of the page URL and keeps a query string', () => {
    expect(redactUrl(`/book/bistro/r/${TOKEN}`)).toBe('/book/bistro/r/:token')
    expect(redactUrl(`/book/bistro/r/${TOKEN}?x=1`)).toBe('/book/bistro/r/:token?x=1')
  })

  it('leaves other URLs and non-strings alone', () => {
    expect(redactUrl('/api/v1/public/bistro/requests')).toBe('/api/v1/public/bistro/requests')
    expect(redactUrl('/api/v1/requests/abc')).toBe('/api/v1/requests/abc')
    expect(redactUrl(undefined)).toBeUndefined()
  })
})
