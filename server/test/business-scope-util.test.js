'use strict'
/** Plan 424 — server/utils/business-scope.js (contract C-SCOPE). */

const { MASTER_BUSINESS_ID, scopeFilter, readScope, stampNew } = require('../utils/business-scope')

const reqOf = user => ({ user })
const owner = { userId: 'u1', businessId: 'b1' }

describe('stampNew', () => {
  it('sets businessId from the token and createdBy from the user', () => {
    const doc = stampNew(reqOf(owner), { _id: 'x', nameHebrew: 'a' })
    expect(doc).toMatchObject({ _id: 'x', nameHebrew: 'a', businessId: 'b1', createdBy: 'u1' })
    expect(typeof doc.createdAt).toBe('number')
  })

  it('keeps an existing numeric createdAt', () => {
    expect(stampNew(reqOf(owner), { createdAt: 123 }).createdAt).toBe(123)
  })

  it('replaces a client-sent businessId / createdBy', () => {
    const doc = stampNew(reqOf(owner), { businessId: 'evil', createdBy: 'evil' })
    expect(doc).toMatchObject({ businessId: 'b1', createdBy: 'u1' })
  })

  it('leaves businessId off when the token has none (pre-migration user)', () => {
    const doc = stampNew(reqOf({ userId: 'u1' }), {})
    expect(doc.businessId).toBeUndefined()
    expect(doc.createdBy).toBe('u1')
  })
})

describe('scopeFilter / readScope', () => {
  it('scopes a signed-in caller to their business', () => {
    expect(scopeFilter(reqOf(owner))).toEqual({ businessId: 'b1' })
    expect(readScope(reqOf(owner), 'recipes')).toEqual({ businessId: 'b1' })
  })

  it('reads taxonomy as the business plus master', () => {
    expect(readScope(reqOf(owner), 'taxonomyTerms')).toEqual({ businessId: { $in: ['b1', MASTER_BUSINESS_ID] } })
  })

  it('anonymous callers see only master', () => {
    expect(scopeFilter(reqOf(null))).toEqual({ businessId: '__master__' })
    expect(readScope(reqOf(null), 'taxonomyTerms')).toEqual({ businessId: '__master__' })
  })

  it('throws when a signed-in token has no businessId', () => {
    expect(() => scopeFilter(reqOf({ userId: 'u1' }))).toThrow('NO_BUSINESS_IN_TOKEN')
    expect(() => readScope(reqOf({ userId: 'u1' }), 'taxonomyTerms')).toThrow('NO_BUSINESS_IN_TOKEN')
  })
})
