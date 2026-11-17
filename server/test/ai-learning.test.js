'use strict'
/** Plan 618 (C-LEARN) — the one consent test, and the retired owner switch in the schemas. */

const { mayLearnFrom } = require('../utils/ai-learning')
const entities = require('../generated/schemas/entities')

describe('mayLearnFrom', () => {
  it.each([
    ['an empty business', {}],
    ['aiPrivate false', { aiPrivate: false }],
    ['the old shareAiExamples false', { shareAiExamples: false }],
    ['undefined', undefined],
  ])('is true for %s', (_name, business) => {
    expect(mayLearnFrom(business)).toBe(true)
  })

  it('is false only for aiPrivate true', () => {
    expect(mayLearnFrom({ aiPrivate: true })).toBe(false)
    expect(mayLearnFrom({ aiPrivate: 'true' })).toBe(true)
  })

  it('exports nothing else', () => {
    expect(Object.keys(require('../utils/ai-learning'))).toEqual(['mayLearnFrom'])
  })
})

describe('the retired owner switch', () => {
  const stored = { _id: 'b1', name: 'Kitchen', ownerId: 'u1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0 }

  it('businessSchema still accepts a stored document with shareAiExamples true', () => {
    expect(entities.businessSchema.safeParse({ ...stored, shareAiExamples: true }).success).toBe(true)
  })

  it('the generated schemas no longer export shareAiExamplesInputSchema', () => {
    expect('shareAiExamplesInputSchema' in entities).toBe(false)
  })
})
