import { clearReturningVisitor, isReturningVisitor, markReturningVisitor } from './returning-visitor.util'

describe('returning-visitor.util', () => {
  beforeEach(() => localStorage.removeItem('fv_returning'))

  it('is false by default', () => {
    expect(isReturningVisitor()).toBe(false)
  })

  it('sets and reads the mark', () => {
    markReturningVisitor()
    expect(isReturningVisitor()).toBe(true)
    expect(localStorage.getItem('fv_returning')).toBe('1')
  })

  it('clears the mark', () => {
    markReturningVisitor()
    clearReturningVisitor()
    expect(isReturningVisitor()).toBe(false)
  })

  it('returns false when storage throws', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('blocked')
    expect(isReturningVisitor()).toBe(false)
  })
})
