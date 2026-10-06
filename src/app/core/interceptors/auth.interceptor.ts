import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http'
import { inject, Injector } from '@angular/core'
import { Router } from '@angular/router'
import { BehaviorSubject, catchError, filter, switchMap, take, throwError, timeout } from 'rxjs'
import { LoggingService } from '@services/logging.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { environment } from '../../../environments/environment'

const REFRESH_URL = '/api/v1/auth/refresh'
const LOGIN_URL = '/api/v1/auth/login'
const LOG_PATH = '/api/v1/log'
const REFRESH_TIMEOUT_MS = 10_000
// Generic data API: its write limiter (server/routes/generic.js) answers 429. Auth and AI
// endpoints show their own 429 messages, so the toast is limited to this path.
const DATA_API_PATH = '/api/v1/data/'

// Guard against concurrent 401s: only one refresh call in-flight at a time.
// Subsequent 401s queue here and replay once the new token is emitted.
//
// Sentinel values:
//   undefined — no refresh in progress (initial state / clearing before refresh)
//   null      — most recent refresh failed; queued requests should propagate error
//   string    — new access token; queued requests should retry with this token
let isRefreshing = false
const refreshSubject$ = new BehaviorSubject<string | null | undefined>(undefined)

function signOut(userService: UserService, authModal: AuthModalService, router: Router) {
  userService.logout().subscribe()
  authModal.open('sign-in')
  router.navigate(['/dashboard'])
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const logging = inject(LoggingService)
  const userService = inject(UserService)
  const authModal = inject(AuthModalService)
  const router = inject(Router)
  // Resolved only on a 429: TranslationService loads its dictionary over HttpClient, so
  // injecting it eagerly here would be a circular dependency during its own construction.
  const injector = inject(Injector)

  // Only our own backend should ever see this token — third-party APIs called directly
  // from the browser (e.g. CloudinaryService's direct upload) must never get it, and
  // sending it cross-origin triggers a CORS preflight that provider won't allow anyway.
  // Same-origin deployments (e.g. Render) set apiUrl/authApiUrl to '' — '' .startsWith('')
  // is always true, so an empty base can't be used to test absolute third-party URLs
  // treat any relative request as our own backend instead.
  const isAbsolute = /^https?:\/\//i.test(req.url)
  const isOwnBackendRequest = isAbsolute
    ? (!!environment.apiUrl && req.url.startsWith(environment.apiUrl)) ||
      (!!environment.authApiUrl && req.url.startsWith(environment.authApiUrl))
    : true
  const token = userService.getToken()
  const outgoing = token && isOwnBackendRequest ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        // Do not attempt refresh for auth endpoints themselves — avoids infinite loop.
        // /login 401 means bad credentials — just propagate; no session to clear.
        // /refresh 401 means the refresh token is gone/expired — session truly dead, sign out.
        if (req.url.includes(LOGIN_URL)) {
          return throwError(() => err)
        }
        if (req.url.includes(REFRESH_URL)) {
          logging.info({ event: 'auth.session_expired', message: 'Session expired or unauthorized (401)' })
          if (userService.isLoggedIn()) {
            signOut(userService, authModal, router)
          }
          return throwError(() => err)
        }

        if (isRefreshing) {
          // A refresh is already in-flight — queue this request.
          // filter skips the clearing `undefined`; passes both token (retry) and null (fail).
          return refreshSubject$.pipe(
            filter((token): token is string | null => token !== undefined),
            take(1),
            switchMap((token) => {
              if (token === null) return throwError(() => err)
              const retried = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
              return next(retried)
            })
          )
        }

        // Silent token refresh: call /auth/refresh (10s timeout), retry original request once
        isRefreshing = true
        refreshSubject$.next(undefined)

        return userService.callBackendRefresh().pipe(
          timeout(REFRESH_TIMEOUT_MS),
          switchMap(({ token }) => {
            isRefreshing = false
            userService.storeToken(token)
            refreshSubject$.next(token)
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
            return next(retried)
          }),
          catchError((refreshErr) => {
            isRefreshing = false
            // Emit null so queued requests unblock and propagate their original 401 error
            refreshSubject$.next(null)
            logging.info({ event: 'auth.session_expired', message: 'Token refresh failed — signing out' })
            if (userService.isLoggedIn()) {
              signOut(userService, authModal, router)
            }
            return throwError(() => refreshErr)
          })
        )
      }

      if (err.status === 429 && req.url.includes(DATA_API_PATH)) {
        injector.get(UserMsgService).onSetErrorMsg(injector.get(TranslationService).translate('rate_limited'))
      }

      // LoggingService posts with plain fetch, so a failing log call never reaches here; the
      // check is a guard against ever logging a log failure in a loop.
      if (err.status && err.status >= 400 && err.status !== 404 && !req.url.endsWith(LOG_PATH)) {
        // The server echoes its request id on every response (Plan 383) — the same id is on
        // the server's own log line for this failure, so the two join in app_logs.
        const requestId = err.headers?.get('X-Request-Id') ?? undefined
        logging.error({
          event: 'http.error',
          message: `HTTP ${err.status}`,
          // Query strings can carry search text — keep only the path.
          context: { method: req.method, url: req.url.split('?')[0], status: err.status },
          ...(requestId ? { requestId } : {})
        })
      }
      return throwError(() => err)
    })
  )
}
