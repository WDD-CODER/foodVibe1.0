import { TestBed } from '@angular/core/testing'
import { Router, UrlTree, provideRouter } from '@angular/router'
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { UserService } from '@services/user.service'
import { LoggingService } from '@services/logging.service'
import { UserMsgService } from '@services/user-msg.service'
import { authGuard } from './auth.guard'

describe('authGuard', () => {
  const warn = jasmine.createSpy()
  const run = (loggedIn: boolean, url = '/recipe-book') => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: { isLoggedIn: () => loggedIn } },
        { provide: LoggingService, useValue: { info: jasmine.createSpy() } },
        { provide: UserMsgService, useValue: { onSetWarningMsg: warn } }
      ]
    })
    return TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot))
  }

  it('signed in → true', () => {
    expect(run(true)).toBe(true)
  })

  it('signed out → UrlTree to /welcome with returnUrl, no toast', () => {
    const result = run(false, '/recipe-book')
    expect(result instanceof UrlTree).toBe(true)
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/welcome?returnUrl=%2Frecipe-book')
    expect(warn).not.toHaveBeenCalled()
  })
})
