import { inject } from '@angular/core'
import { CanActivateFn, Router, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router'
import { moduleGuard } from '../../core/guards/module.guard'
import { UserService } from '@services/user.service'

/**
 * Plan 634: the diagnosis screens belong to the consultant's own module. While acting inside a client's business the
 * client's modules say nothing about it, so the HOME modules decide; at home the module guard decides.
 * The server (`requireHomeModule`) is the real gate; this only hides.
 */
export const diagnosisGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const user = inject(UserService)
  if (user.acting_()) {
    return user.homeModules_().includes('consultant_diag') ? true : inject(Router).createUrlTree(['/dashboard'])
  }
  return moduleGuard(['consultant_diag'])(route, state)
}
