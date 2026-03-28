import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, switchMap, throwError } from 'rxjs'
import { LoggingService } from '@services/logging.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { environment } from '../../../environments/environment'

const AUTH_URLS = ['/api/v1/auth/refresh', '/api/v1/auth/login']

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
        // Do not attempt refresh for auth endpoints themselves — avoids infinite loop
        if (AUTH_URLS.some(url => req.url.includes(url))) {
          logging.info({ event: 'auth.session_expired', message: 'Session expired or unauthorized (401)' })
          signOut(userService, authModal, router)
          return throwError(() => err)
        }

        // Silent token refresh: call /auth/refresh, retry original request once
        return userService.callBackendRefresh().pipe(
          switchMap(({ token }) => {
            userService.storeToken(token)
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
            return next(retried)
          }),
          catchError(() => {
            logging.info({ event: 'auth.session_expired', message: 'Token refresh failed — signing out' })
            signOut(userService, authModal, router)
            return throwError(() => err)
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
