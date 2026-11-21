import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { AccessService } from './access.service'
import { LoggingService } from './logging.service'
import { TranslationService } from './translation.service'
import { UserMsgService } from './user-msg.service'
import { UserService } from './user.service'
import { environment } from '../../../environments/environment'

const URL = (p: string) => `${environment.apiUrl}/api/v1/access/${p}`

describe('AccessService', () => {
  let service: AccessService
  let http: HttpTestingController
  const acting_ = signal<'consultant' | 'platform' | null>(null)
  const success = jasmine.createSpy('success')
  const failure = jasmine.createSpy('failure')
  const warn = jasmine.createSpy('warn')

  beforeEach(() => {
    acting_.set(null)
    success.calls.reset()
    failure.calls.reset()
    warn.calls.reset()
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: { acting_ } },
        { provide: LoggingService, useValue: { warn, info: () => undefined, error: () => undefined } },
        { provide: UserMsgService, useValue: { onSetSuccessMsg: success, onSetErrorMsg: failure } },
        { provide: TranslationService, useValue: { translate: (k: string) => `T:${k}` } }
      ]
    })
    service = TestBed.inject(AccessService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('loadBusinesses fills the list; canSwitch_ needs more than one or an acting session', async () => {
    const done = service.loadBusinesses()
    http.expectOne(URL('businesses')).flush([{ businessId: 'b1', name: 'Mine', role: 'owner' }])
    await done
    expect(service.canSwitch_()).toBeFalse()
    acting_.set('platform')
    expect(service.canSwitch_()).toBeTrue()
    acting_.set(null)
    const again = service.loadBusinesses()
    http.expectOne(URL('businesses')).flush([
      { businessId: 'b1', name: 'Mine', role: 'owner' },
      { businessId: 'b2', name: 'Client', role: 'consultant' }
    ])
    await again
    expect(service.canSwitch_()).toBeTrue()
  })

  it('loadBusinesses logs a warning and leaves the list empty on an error', async () => {
    const done = service.loadBusinesses()
    http.expectOne(URL('businesses')).flush(null, { status: 500, statusText: 'x' })
    await done
    expect(service.businesses_()).toEqual([])
    expect(warn).toHaveBeenCalled()
  })

  it('loadGrants fills the list and clears the loading flag', async () => {
    const done = service.loadGrants()
    expect(service.grantsLoading_()).toBeTrue()
    http.expectOne(URL('grants')).flush([{ _id: 'g1', name: 'cons', grantedAt: 1 }])
    await done
    expect(service.grants_().length).toBe(1)
    expect(service.grantsLoading_()).toBeFalse()
  })

  it('removeGrant removes the row and toasts access_removed', async () => {
    const load = service.loadGrants()
    http.expectOne(URL('grants')).flush([{ _id: 'g1', name: 'cons', grantedAt: 1 }])
    await load
    const done = service.removeGrant('g1')
    http.expectOne(URL('grants/g1')).flush({ ok: true })
    expect(await done).toBeTrue()
    expect(service.grants_()).toEqual([])
    expect(success).toHaveBeenCalledWith('T:access_removed')
  })

  it('removeGrant error keeps the row and toasts server_error', async () => {
    const load = service.loadGrants()
    http.expectOne(URL('grants')).flush([{ _id: 'g1', name: 'cons', grantedAt: 1 }])
    await load
    const done = service.removeGrant('g1')
    http.expectOne(URL('grants/g1')).flush(null, { status: 500, statusText: 'x' })
    expect(await done).toBeFalse()
    expect(service.grants_().length).toBe(1)
    expect(failure).toHaveBeenCalledWith('T:server_error')
  })

  it('createGrant posts the body and maps the error codes to dictionary keys', async () => {
    const ok = service.createGrant('b2', 'cons')
    const req = http.expectOne(URL('grants'))
    expect(req.request.body).toEqual({ businessId: 'b2', username: 'cons' })
    req.flush({ _id: 'g' }, { status: 201, statusText: 'Created' })
    expect(await ok).toEqual({ ok: true })

    const cases: [number, string, string][] = [
      [404, 'USER_NOT_FOUND', 'access_err_user_not_found'],
      [409, 'ALREADY_MEMBER', 'access_err_already_member'],
      [409, 'ALREADY_GRANTED', 'access_err_already_granted'],
      [500, 'Server error', 'server_error']
    ]
    for (const [status, code, errorKey] of cases) {
      const p = service.createGrant('b2', 'cons')
      http.expectOne(URL('grants')).flush({ error: code }, { status, statusText: 'x' })
      expect(await p).toEqual({ ok: false, errorKey })
    }
  })
})
