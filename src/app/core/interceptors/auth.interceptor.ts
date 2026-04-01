import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { BehaviorSubject, catchError, filter, switchMap, take, throwError, timeout } from 'rxjs'
import { LoggingService } from '@services/logging.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { environment } from '../../../environments/environment'

const REFRESH_URL = '/api/v1/auth/refresh'
const LOGIN_URL = '/api/v1/auth/login'
const REFRESH_TIMEOUT_MS = 10_000

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

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && environment.useBackendAuth) {
        // Do not attempt refresh for auth endpoints themselves — avoids infinite loop.
        // /login 401 means bad credentials — just propagate; no session to clear.
        // /refresh 401 means the refresh token is gone/expired — session truly dead, sign out.
        if (req.url.includes(LOGIN_URL)) {
          return throwError(() => err)
        }
        if (req.url.includes(REFRESH_URL)) {
          logging.info({ event: 'auth.session_expired', message: 'Session expired or unauthorized (401)' })
          signOut(userService, authModal, router)
          return throwError(() => err)
        }

        if (isRefreshing) {
          // A refresh is already in-flight — queue this request.
          // filter skips the clearing `undefined`; passes both token (retry) and null (fail).
          return refreshSubject$.pipe(
            filter((token): token is string | null => token !== undefined),
            take(1),
            switchMap(token => {
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
          catchError(refreshErr => {
            isRefreshing = false
            // Emit null so queued requests unblock and propagate their original 401 error
            refreshSubject$.next(null)
            logging.info({ event: 'auth.session_expired', message: 'Token refresh failed — signing out' })
            signOut(userService, authModal, router)
            return throwError(() => refreshErr)
          })
        )
      }

      if (err.status && err.status >= 400) {
        logging.error({
          event: 'http.error',
          message: `HTTP ${err.status}`,
          context: { method: req.method, url: req.url, status: err.status }
        })
      }
      return throwError(() => err)
    })
  )
}
