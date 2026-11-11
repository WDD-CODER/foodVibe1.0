import { TestBed } from '@angular/core/testing'
import { Router, UrlTree, provideRouter } from '@angular/router'
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { UserService } from '@services/user.service'
import { welcomeGuard } from './welcome.guard'

describe('welcomeGuard', () => {
  const run = (loggedIn: boolean) => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: UserService, useValue: { isLoggedIn: () => loggedIn } }]
    })
    return TestBed.runInInjectionContext(() => welcomeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot))
  }

  it('signed in → UrlTree for /dashboard', () => {
    const result = run(true)
    expect(result instanceof UrlTree).toBe(true)
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard')
  })

  it('signed out → true', () => {
    expect(run(false)).toBe(true)
  })
})
