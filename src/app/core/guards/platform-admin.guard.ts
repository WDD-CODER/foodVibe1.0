import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { UserService } from '@services/user.service'

/** Plan 448: only the platform admin may open `/platform`; everyone else goes to the dashboard. */
export const platformAdminGuard: CanActivateFn = () => {
  const userService = inject(UserService)
  const router = inject(Router)
  return userService.isPlatformAdmin_() ? true : router.createUrlTree(['/dashboard'])
}
