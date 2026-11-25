import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { firstValueFrom } from 'rxjs'
import { UserAdminService } from './user-admin.service'

describe('UserAdminService.deleteUser (plan 639)', () => {
  let service: UserAdminService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(UserAdminService)
    http = TestBed.inject(HttpTestingController)
  })

  it('sends no query by default', async () => {
    const done = firstValueFrom(service.deleteUser('u1'))
    const req = http.expectOne((r) => r.url.endsWith('/admin/users/u1'))
    expect(req.request.method).toBe('DELETE')
    req.flush({ ok: true })
    await done
    http.verify()
  })

  it('plan 736: setAiAllowance sends one PUT with the number', async () => {
    const done = firstValueFrom(service.setAiAllowance('u1', 7))
    const req = http.expectOne((r) => r.url.endsWith('/admin/users/u1/ai-allowance'))
    expect(req.request.method).toBe('PUT')
    expect(req.request.body).toEqual({ aiAllowance: 7 })
    req.flush({ ok: true, aiAllowance: 7, aiCallsUsed: 3 })
    expect(await done).toEqual({ ok: true, aiAllowance: 7, aiCallsUsed: 3 })
    http.verify()
  })

  it('adds ?eraseLearned=true only when true', async () => {
    const done = firstValueFrom(service.deleteUser('u1', true))
    http.expectOne((r) => r.urlWithParams.endsWith('/admin/users/u1?eraseLearned=true')).flush({ ok: true })
    await done
    const second = firstValueFrom(service.deleteUser('u2', false))
    http.expectOne((r) => r.urlWithParams.endsWith('/admin/users/u2')).flush({ ok: true })
    await second
    http.verify()
  })
})
