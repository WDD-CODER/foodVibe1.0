import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { UserService } from './user.service'
import { environment } from '../../../environments/environment'
import type { User } from '../models/user.model'

const LOGIN_URL = `${environment.authApiUrl}/api/v1/auth/login`
const SIGNUP_URL = `${environment.authApiUrl}/api/v1/auth/signup`
const REFRESH_URL = `${environment.authApiUrl}/api/v1/auth/refresh`

const fakeToken = (claims: Record<string, unknown>): string => {
  const payload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_')
  return `h.${payload}.s`
}

describe('UserService (business model)', () => {
  let service: UserService
  let http: HttpTestingController

  beforeEach(() => {
    sessionStorage.clear()
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    service = TestBed.inject(UserService)
    http = TestBed.inject(HttpTestingController)
    service._saveUserLocal(null)
    // Login / signup reload every data service through dynamic imports; not under test here.
    spyOn(service as unknown as { _reloadDataServices: () => Promise<void> }, '_reloadDataServices').and.resolveTo()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  const loginAs = (user: User) => {
    service.login({ name: user.name, password: 'pw' }).subscribe()
    http.expectOne(LOGIN_URL).flush({ token: 'tok', user })
  }

  it('a platform-admin login sets isPlatformAdmin_ and the deprecated isAdmin_ alias', () => {
    loginAs({ _id: 'a', name: 'a', email: 'a@x', isPlatformAdmin: true })
    expect(service.isPlatformAdmin_()).toBeTrue()
    expect(service.isAdmin_()).toBeTrue()
  })

  it('an owner login sets isOwner_ and businessRole_ and is not a platform admin', () => {
    loginAs({ _id: 'o', name: 'o', email: 'o@x', businessId: 'b1', businessRole: 'owner', isPlatformAdmin: false })
    expect(service.isOwner_()).toBeTrue()
    expect(service.businessRole_()).toBe('owner')
    expect(service.isPlatformAdmin_()).toBeFalse()
    expect(service.isAdmin_()).toBeFalse()
  })

  it('a refreshed token for another user puts its business claims into user_()', () => {
    service._saveUserLocal({ _id: 'old', name: 'old', email: 'o@x' })
    service.refreshToken().subscribe()
    http.expectOne(REFRESH_URL).flush({
      token: fakeToken({ userId: 'new', name: 'neo', businessId: 'b9', businessRole: 'staff', isPlatformAdmin: false })
    })
    expect(service.user_()).toEqual(
      jasmine.objectContaining({
        _id: 'new',
        name: 'neo',
        businessId: 'b9',
        businessRole: 'staff',
        isPlatformAdmin: false
      })
    )
  })

  it('login 403 NO_BUSINESS -> Error NO_BUSINESS', () => {
    let message = ''
    service.login({ name: 'x', password: 'pw' }).subscribe({ error: (e: Error) => (message = e.message) })
    http.expectOne(LOGIN_URL).flush({ error: 'NO_BUSINESS' }, { status: 403, statusText: 'Forbidden' })
    expect(message).toBe('NO_BUSINESS')
  })

  it('login 403 USER_REMOVED -> Error USER_REMOVED', () => {
    let message = ''
    service.login({ name: 'x', password: 'pw' }).subscribe({ error: (e: Error) => (message = e.message) })
    http.expectOne(LOGIN_URL).flush({ error: 'USER_REMOVED' }, { status: 403, statusText: 'Forbidden' })
    expect(message).toBe('USER_REMOVED')
  })

  it('signup posts businessName', async () => {
    service.signup({ name: 'neo', email: 'n@x.com' }, 'Password1', 'מטבח בדיקה').subscribe()
    await new Promise((r) => setTimeout(r, 500))
    const req = http.expectOne(SIGNUP_URL)
    expect(req.request.body.businessName).toBe('מטבח בדיקה')
    req.flush({
      token: 'tok',
      user: { _id: 'n', name: 'neo', email: 'n@x.com', businessId: 'b', businessRole: 'owner' }
    })
  })

  it('signup maps BUSINESS_NAME_REQUIRED and BUSINESS_NAME_TOO_LONG', async () => {
    const run = async (code: string): Promise<string> => {
      let message = ''
      service
        .signup({ name: 'neo', email: 'n@x.com' }, 'Password1', 'x')
        .subscribe({ error: (e: Error) => (message = e.message) })
      await new Promise((r) => setTimeout(r, 500))
      http.expectOne(SIGNUP_URL).flush({ error: code }, { status: 400, statusText: 'Bad Request' })
      return message
    }
    expect(await run('BUSINESS_NAME_REQUIRED')).toBe('BUSINESS_NAME_REQUIRED')
    expect(await run('BUSINESS_NAME_TOO_LONG')).toBe('BUSINESS_NAME_TOO_LONG')
  })
})
