import { TestBed } from '@angular/core/testing'
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { Router } from '@angular/router'
import { EMPTY, Subject } from 'rxjs'
import { authInterceptor } from './auth.interceptor'
import { LoggingService } from '@services/logging.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'

describe('authInterceptor — concurrent 401 refresh gate', () => {
  let http: HttpClient
  let backend: HttpTestingController
  let refresh$: Subject<{ token: string }>
  let refreshCalls: number
  let logoutCalls: number
  let storedToken: string | null

  beforeEach(() => {
    refreshCalls = 0
    logoutCalls = 0
    storedToken = 'old'
    refresh$ = new Subject<{ token: string }>()
    const userService = {
      getToken: () => storedToken,
      storeToken: (t: string) => {
        storedToken = t
      },
      isLoggedIn: () => true,
      tokenBusinessId: () => 'b1',
      refreshToken: () => EMPTY,
      callBackendRefresh: () => {
        refreshCalls++
        return refresh$
      },
      logout: () => {
        logoutCalls++
        return new Subject<void>()
      }
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: UserService, useValue: userService },
        { provide: LoggingService, useValue: { info: () => undefined, error: () => undefined } },
        { provide: AuthModalService, useValue: { open: () => undefined } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }
      ]
    })
    http = TestBed.inject(HttpClient)
    backend = TestBed.inject(HttpTestingController)
  })

  afterEach(() => backend.verify())

  const unauthorized = { status: 401, statusText: 'Unauthorized' }

  it('refreshes once for concurrent 401s and retries each with the new token', () => {
    const results: string[] = []
    http.get<string>('/a').subscribe((r) => results.push(r))
    http.get<string>('/b').subscribe((r) => results.push(r))
    backend.expectOne('/a').flush(null, unauthorized)
    backend.expectOne('/b').flush(null, unauthorized)

    expect(refreshCalls).toBe(1)
    refresh$.next({ token: 'new' })
    refresh$.complete()

    const retryA = backend.expectOne('/a')
    const retryB = backend.expectOne('/b')
    expect(retryA.request.headers.get('Authorization')).toBe('Bearer new')
    expect(retryB.request.headers.get('Authorization')).toBe('Bearer new')
    retryA.flush('A')
    retryB.flush('B')
    expect(results).toEqual(['A', 'B'])
    expect(storedToken).toBe('new')
  })

  it('fails every queued request and signs out once when the refresh fails', () => {
    const errors: number[] = []
    const onError = (e: HttpErrorResponse) => errors.push(e.status)
    http.get('/a').subscribe({ error: onError })
    http.get('/b').subscribe({ error: onError })
    backend.expectOne('/a').flush(null, unauthorized)
    backend.expectOne('/b').flush(null, unauthorized)

    refresh$.error(new HttpErrorResponse({ status: 403 }))
    expect(errors).toEqual(jasmine.arrayWithExactContents([403, 401]))
    expect(logoutCalls).toBe(1)
  })

  it('keeps the refresh alive for queued requests when the first caller unsubscribes', () => {
    const results: string[] = []
    const first = http.get('/a').subscribe()
    http.get<string>('/b').subscribe((r) => results.push(r))
    backend.expectOne('/a').flush(null, unauthorized)
    backend.expectOne('/b').flush(null, unauthorized)

    first.unsubscribe()
    refresh$.next({ token: 'new' })
    refresh$.complete()

    backend.expectOne('/b').flush('B')
    expect(results).toEqual(['B'])
  })

  it('starts a fresh refresh for a 401 after the previous one settled', () => {
    http.get('/a').subscribe()
    backend.expectOne('/a').flush(null, unauthorized)
    refresh$.next({ token: 'new' })
    refresh$.complete()
    backend.expectOne('/a').flush('A')

    refresh$ = new Subject<{ token: string }>()
    http.get('/c').subscribe()
    backend.expectOne('/c').flush(null, unauthorized)
    expect(refreshCalls).toBe(2)
    refresh$.next({ token: 'newer' })
    refresh$.complete()
    expect(backend.expectOne('/c').request.headers.get('Authorization')).toBe('Bearer newer')
  })
})

describe('authInterceptor — 403 no_permission (plan 428)', () => {
  let http: HttpClient
  let backend: HttpTestingController
  const errorMsg = jasmine.createSpy('onSetErrorMsg')
  const info = jasmine.createSpy('info')
  const error = jasmine.createSpy('error')

  beforeEach(() => {
    errorMsg.calls.reset()
    info.calls.reset()
    error.calls.reset()
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: UserService, useValue: { getToken: () => 't', isLoggedIn: () => true } },
        { provide: LoggingService, useValue: { info, error } },
        { provide: AuthModalService, useValue: { open: () => undefined } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: UserMsgService, useValue: { onSetErrorMsg: errorMsg } },
        { provide: TranslationService, useValue: { translate: (key: string) => `T:${key}` } }
      ]
    })
    http = TestBed.inject(HttpClient)
    backend = TestBed.inject(HttpTestingController)
  })

  afterEach(() => backend.verify())

  it('shows the Hebrew toast and logs at info, not as an http error', () => {
    http.put('/api/v1/data/recipes/r1', {}).subscribe({ error: () => undefined })
    backend
      .expectOne('/api/v1/data/recipes/r1')
      .flush({ error: 'FORBIDDEN', messageKey: 'no_permission' }, { status: 403, statusText: 'Forbidden' })
    expect(errorMsg).toHaveBeenCalledWith('T:no_permission')
    expect(info).toHaveBeenCalledWith(jasmine.objectContaining({ event: 'http.forbidden' }))
    expect(error).not.toHaveBeenCalled()
  })

  it('any other 403 still logs the http error and shows no toast', () => {
    http.get('/api/v1/business/team').subscribe({ error: () => undefined })
    backend
      .expectOne('/api/v1/business/team')
      .flush({ error: 'CANNOT_REMOVE_SELF' }, { status: 403, statusText: 'Forbidden' })
    expect(errorMsg).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(jasmine.objectContaining({ event: 'http.error' }))
  })

  it('plan 540: a refused write gets one toast and one save.refused log with the paths, no http.error', () => {
    http.put('/api/v1/data/products/x', {}).subscribe({ error: () => undefined })
    backend
      .expectOne('/api/v1/data/products/x')
      .flush(
        { error: 'Validation failed', issues: [{ path: 'nameHebrew', code: 'too_big', message: 'Too big' }] },
        { status: 400, statusText: 'Bad Request' }
      )
    expect(errorMsg).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledTimes(1)
    const arg = error.calls.mostRecent().args[0]
    expect(arg.event).toBe('save.refused')
    expect(arg.context.issues).toEqual([{ path: 'nameHebrew', code: 'too_big', message: 'Too big' }])
  })

  it('plan 540: a GET 400 shows no toast', () => {
    http.get('/api/v1/data/products?x=1').subscribe({ error: () => undefined })
    backend
      .expectOne('/api/v1/data/products?x=1')
      .flush({ error: 'Bad filter' }, { status: 400, statusText: 'Bad Request' })
    expect(errorMsg).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(jasmine.objectContaining({ event: 'http.error' }))
  })
})

describe('authInterceptor — never replays into another business (plan 632)', () => {
  let http: HttpClient
  let backend: HttpTestingController
  let refresh$: Subject<{ token: string }>
  let refreshToken: jasmine.Spy
  let refreshing$: Subject<unknown>
  let businessOf: Record<string, string>
  const unauthorized = { status: 401, statusText: 'Unauthorized' }

  beforeEach(() => {
    refresh$ = new Subject<{ token: string }>()
    refreshing$ = new Subject<unknown>()
    refreshToken = jasmine.createSpy('refreshToken').and.callFake(() => refreshing$)
    businessOf = { old: 'b1', same: 'b1', other: 'b2' }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: UserService,
          useValue: {
            getToken: () => 'old',
            storeToken: () => undefined,
            isLoggedIn: () => true,
            tokenBusinessId: (t: string) => businessOf[t] ?? null,
            callBackendRefresh: () => refresh$,
            refreshToken,
            logout: () => new Subject<void>()
          }
        },
        { provide: LoggingService, useValue: { info: () => undefined, error: () => undefined } },
        { provide: AuthModalService, useValue: { open: () => undefined } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }
      ]
    })
    http = TestBed.inject(HttpClient)
    backend = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    // Ends the pending refresh so the interceptor's one-refresh flag is free for the next case.
    refreshing$.complete()
    backend.verify()
  })

  it('a 401 ACCESS_ENDED is never replayed: one refresh of the user, the error is rethrown', () => {
    const errors: HttpErrorResponse[] = []
    http.get('/a').subscribe({ error: (e) => errors.push(e) })
    http.get('/b').subscribe({ error: (e) => errors.push(e) })
    backend.expectOne('/a').flush({ error: 'ACCESS_ENDED' }, unauthorized)
    backend.expectOne('/b').flush({ error: 'ACCESS_ENDED' }, unauthorized)
    expect(errors.length).toBe(2)
    expect(refreshToken).toHaveBeenCalledTimes(1)
  })

  it('a refresh that returns a token of another business does not replay the request', () => {
    const errors: number[] = []
    http.post('/a', {}).subscribe({ error: (e: HttpErrorResponse) => errors.push(e.status) })
    backend.expectOne('/a').flush(null, unauthorized)
    refresh$.next({ token: 'other' })
    refresh$.complete()
    backend.expectNone('/a')
    expect(errors).toEqual([401])
    expect(refreshToken).toHaveBeenCalledTimes(1)
  })

  it('a refresh that stays in the same business still replays the request', () => {
    const results: string[] = []
    http.get<string>('/a').subscribe((r) => results.push(r))
    backend.expectOne('/a').flush(null, unauthorized)
    refresh$.next({ token: 'same' })
    refresh$.complete()
    backend.expectOne('/a').flush('A')
    expect(results).toEqual(['A'])
    expect(refreshToken).not.toHaveBeenCalled()
  })
})
