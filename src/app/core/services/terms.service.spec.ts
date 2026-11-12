import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { TERMS_URL, TermsService } from './terms.service'
import { UserService } from './user.service'
import { environment } from '../../../environments/environment'

describe('TermsService (plan 584)', () => {
  let service: TermsService
  let http: HttpTestingController
  let users: UserService

  beforeEach(() => {
    sessionStorage.clear()
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] })
    service = TestBed.inject(TermsService)
    http = TestBed.inject(HttpTestingController)
    users = TestBed.inject(UserService)
  })

  afterEach(() => sessionStorage.clear())

  it('load fetches the one terms file', () => {
    let version = ''
    service.load().subscribe((t) => (version = t.version))
    http.expectOne(TERMS_URL).flush({ version: 'v1', title: 't', updated: 'd', sectionsHash: 'h', sections: [] })
    expect(version).toBe('v1')
  })

  it('accept posts the version and replaces the stored user with the answer', () => {
    service.accept('v1').subscribe()
    const req = http.expectOne(`${environment.authApiUrl}/api/v1/auth/accept-terms`)
    expect(req.request.body).toEqual({ termsVersion: 'v1' })
    req.flush({ user: { _id: 'u1', name: 'a', email: 'a@x.com', termsAcceptedVersion: 'v1' } })
    expect(users.user_()?.termsAcceptedVersion).toBe('v1')
  })
})
