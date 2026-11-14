import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { UserService } from '@services/user.service'
import { LoggingService } from '@services/logging.service'

/** Plan 589: a signed-out visitor goes to the welcome page, carrying the wanted URL as `returnUrl`. */
export const authGuard: CanActivateFn = (route, state) => {
  const userService = inject(UserService)
  const router = inject(Router)
  const logging = inject(LoggingService)

  if (userService.isLoggedIn()) return true

  logging.info({ event: 'auth.guard.denied', message: 'Route access denied: not logged in' })
  return router.createUrlTree(['/welcome'], { queryParams: { returnUrl: state.url } })
}
