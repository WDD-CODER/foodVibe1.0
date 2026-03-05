import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { UserService } from '@services/user.service'
import { AuthModalService } from '@services/auth-modal.service'
import { LoggingService } from '@services/logging.service'

export const authGuard: CanActivateFn = () => {
  const userService = inject(UserService)
  const authModal = inject(AuthModalService)
  const router = inject(Router)
  const logging = inject(LoggingService)

  if (userService.isLoggedIn()) return true

  logging.info({ event: 'auth.guard.denied', message: 'Route access denied: not logged in' })
  authModal.open('sign-in')
  return router.createUrlTree(['/dashboard'])
}
