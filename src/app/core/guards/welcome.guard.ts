import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { UserService } from '@services/user.service'

/** The welcome screen is for signed-out visitors; a signed-in user goes to the dashboard. */
export const welcomeGuard: CanActivateFn = () =>
  inject(UserService).isLoggedIn() ? inject(Router).createUrlTree(['/dashboard']) : true
