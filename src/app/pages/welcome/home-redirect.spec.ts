import { TestBed } from '@angular/core/testing'
import { UserService } from '@services/user.service'
import { homeRedirect } from './home-redirect'

describe('homeRedirect', () => {
  const run = (loggedIn: boolean): string => {
    TestBed.configureTestingModule({ providers: [{ provide: UserService, useValue: { isLoggedIn: () => loggedIn } }] })
    return TestBed.runInInjectionContext(() => homeRedirect())
  }

  beforeEach(() => localStorage.removeItem('fv_returning'))
  afterEach(() => localStorage.removeItem('fv_returning'))

  it('signed out, first visit → welcome', () => {
    expect(run(false)).toBe('welcome')
  })

  it('signed out, returning visitor → dashboard', () => {
    localStorage.setItem('fv_returning', '1')
    expect(run(false)).toBe('dashboard')
  })

  it('signed in → dashboard', () => {
    expect(run(true)).toBe('dashboard')
  })
})
