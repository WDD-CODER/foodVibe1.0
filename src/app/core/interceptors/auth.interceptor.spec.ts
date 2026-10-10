import { TestBed } from '@angular/core/testing'
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { Router } from '@angular/router'
import { Subject } from 'rxjs'
import { authInterceptor } from './auth.interceptor'
import { LoggingService } from '@services/logging.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'

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
