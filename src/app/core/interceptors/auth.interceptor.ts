import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, throwError } from 'rxjs'
import { LoggingService } from '@services/logging.service'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { environment } from '../../../environments/environment'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const logging = inject(LoggingService)
  const userService = inject(UserService)
  const authModal = inject(AuthModalService)
  const router = inject(Router)

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && environment.useBackendAuth) {
        logging.info({ event: 'auth.session_expired', message: 'Session expired or unauthorized (401)' })
        userService.logout().subscribe()
        authModal.open('sign-in')
        router.navigate(['/dashboard'])
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
