import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter, Router } from '@angular/router'
import { UserService } from './user.service'
import { environment } from '../../../environments/environment'
import type { User } from '../models/user.model'
import { APP_RELOAD } from '../utils/app-reload.util'

const LOGIN_URL = `${environment.authApiUrl}/api/v1/auth/login`
const SIGNUP_URL = `${environment.authApiUrl}/api/v1/auth/signup`
const SWITCH_URL = `${environment.authApiUrl}/api/v1/auth/switch-business`
const REFRESH_URL = `${environment.authApiUrl}/api/v1/auth/refresh`

const fakeToken = (claims: Record<string, unknown>): string => {
  const payload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_')
  return `h.${payload}.s`
}

describe('UserService (business model)', () => {
  let service: UserService
  let http: HttpTestingController
  let reload: jasmine.Spy

  beforeEach(() => {
    sessionStorage.clear()
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: APP_RELOAD, useFactory: () => (reload = jasmine.createSpy('reload')) }
      ]
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

  describe('acting and switching (plan 632)', () => {
    const HOME: User = {
      _id: 'u1',
      name: 'u',
      email: 'u@x',
      businessId: 'b1',
      homeBusinessId: 'b1',
      businessRole: 'owner'
    }
    const ACTING: User = {
      _id: 'u1',
      name: 'u',
      email: 'u@x',
      businessId: 'b2',
      homeBusinessId: 'b1',
      businessRole: 'consultant',
      acting: 'consultant',
      homeModules: ['m1']
    }

    it('exposes homeBusinessId_, acting_ and homeModules_', () => {
      service._saveUserLocal(ACTING)
      expect(service.homeBusinessId_()).toBe('b1')
      expect(service.acting_()).toBe('consultant')
      expect(service.homeModules_()).toEqual(['m1'])
      service._saveUserLocal({ _id: 'x', name: 'x', email: '', businessId: 'b7' })
      expect(service.homeBusinessId_()).toBe('b7')
      expect(service.acting_()).toBeNull()
      expect(service.homeModules_()).toEqual([])
    })

    it('tokenBusinessId reads the business of a token', () => {
      expect(service.tokenBusinessId(fakeToken({ userId: 'u1', businessId: 'b2' }))).toBe('b2')
      expect(service.tokenBusinessId('garbage')).toBeNull()
    })

    it('switchBusiness stores the new token and user, then reloads once at /dashboard', async () => {
      service._saveUserLocal(HOME)
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
      const done = service.switchBusiness('b2')
      await new Promise((r) => setTimeout(r))
      expect(navigate).toHaveBeenCalledWith(['/dashboard'])
      const req = http.expectOne(SWITCH_URL)
      expect(req.request.body).toEqual({ businessId: 'b2' })
      req.flush({ token: 'newtok', user: ACTING })
      expect(await done).toBeTrue()
      expect(service.getToken()).toBe('newtok')
      expect(service.user_()?.businessId).toBe('b2')
      expect(reload).toHaveBeenCalledOnceWith('/dashboard')
    })

    it('a failed switch changes nothing and returns false', async () => {
      service._saveUserLocal(HOME)
      service.storeToken('oldtok')
      spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
      const done = service.switchBusiness(null)
      await new Promise((r) => setTimeout(r))
      http.expectOne(SWITCH_URL).flush({ error: 'NO_ACCESS' }, { status: 403, statusText: 'Forbidden' })
      expect(await done).toBeFalse()
      expect(service.getToken()).toBe('oldtok')
      expect(service.user_()?.businessId).toBe('b1')
      expect(reload).not.toHaveBeenCalled()
    })

    it('a page that refuses to be left (unsaved changes) stops the switch', async () => {
      service._saveUserLocal(HOME)
      spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(false)
      expect(await service.switchBusiness('b2')).toBeFalse()
      http.expectNone(SWITCH_URL)
      expect(reload).not.toHaveBeenCalled()
    })

    it('a refresh that answers another business for the same user reloads', () => {
      service._saveUserLocal(HOME)
      service.refreshToken().subscribe()
      http.expectOne(REFRESH_URL).flush({ token: fakeToken({ userId: 'u1', businessId: 'b2' }), user: ACTING })
      expect(reload).toHaveBeenCalledOnceWith('/dashboard')
      expect(service.consumeAccessEndedNotice()).toBeFalse()
    })

    it('a refresh that ends an acting session sets the notice once', () => {
      service._saveUserLocal(ACTING)
      service.refreshToken().subscribe()
      http.expectOne(REFRESH_URL).flush({ token: fakeToken({ userId: 'u1', businessId: 'b1' }), user: HOME })
      expect(reload).toHaveBeenCalledOnceWith('/dashboard')
      expect(service.consumeAccessEndedNotice()).toBeTrue()
      expect(service.consumeAccessEndedNotice()).toBeFalse()
    })

    it('a refresh in the same business does not reload', () => {
      service._saveUserLocal(HOME)
      service.refreshToken().subscribe()
      http.expectOne(REFRESH_URL).flush({ token: fakeToken({ userId: 'u1', businessId: 'b1' }), user: HOME })
      expect(reload).not.toHaveBeenCalled()
    })
  })

  it('a refresh with no stored user and a response user sets user_() from it, terms version included', () => {
    service.refreshToken().subscribe()
    http.expectOne(REFRESH_URL).flush({
      token: fakeToken({ userId: 'u7', name: 'seven', isPlatformAdmin: false }),
      user: { _id: 'u7', name: 'seven', email: 's@x', termsAcceptedVersion: '2026-11-v2' }
    })
    expect(service.user_()?._id).toBe('u7')
    expect(service.user_()?.termsAcceptedVersion).toBe('2026-11-v2')
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
    service.signup({ name: 'neo', email: 'n@x.com' }, 'Password1', 'מטבח בדיקה', 'v-test').subscribe()
    await new Promise((r) => setTimeout(r, 500))
    const req = http.expectOne(SIGNUP_URL)
    expect(req.request.body.businessName).toBe('מטבח בדיקה')
    expect(req.request.body.termsVersion).toBe('v-test')
    req.flush({
      token: 'tok',
      user: { _id: 'n', name: 'neo', email: 'n@x.com', businessId: 'b', businessRole: 'owner' }
    })
  })

  it('signup maps BUSINESS_NAME_REQUIRED and BUSINESS_NAME_TOO_LONG', async () => {
    const run = async (code: string): Promise<string> => {
      let message = ''
      service
        .signup({ name: 'neo', email: 'n@x.com' }, 'Password1', 'x', 'v-test')
        .subscribe({ error: (e: Error) => (message = e.message) })
      await new Promise((r) => setTimeout(r, 500))
      http.expectOne(SIGNUP_URL).flush({ error: code }, { status: 400, statusText: 'Bad Request' })
      return message
    }
    expect(await run('BUSINESS_NAME_REQUIRED')).toBe('BUSINESS_NAME_REQUIRED')
    expect(await run('BUSINESS_NAME_TOO_LONG')).toBe('BUSINESS_NAME_TOO_LONG')
    expect(await run('TERMS_NOT_ACCEPTED')).toBe('TERMS_NOT_ACCEPTED')
  })

  describe('returning-visitor mark', () => {
    beforeEach(() => localStorage.removeItem('fv_returning'))

    it('is set after _saveUserLocal(user)', () => {
      service._saveUserLocal({ _id: 'r', name: 'r', email: 'r@x' } as User)
      expect(localStorage.getItem('fv_returning')).toBe('1')
    })

    it('stays set after _saveUserLocal(null)', () => {
      service._saveUserLocal({ _id: 'r', name: 'r', email: 'r@x' } as User)
      service._saveUserLocal(null)
      expect(localStorage.getItem('fv_returning')).toBe('1')
    })

    it('is cleared by logout()', () => {
      service._saveUserLocal({ _id: 'r', name: 'r', email: 'r@x' } as User)
      service.logout().subscribe()
      expect(localStorage.getItem('fv_returning')).toBeNull()
      http.match(() => true).forEach((r) => r.flush(null))
    })
  })
})
