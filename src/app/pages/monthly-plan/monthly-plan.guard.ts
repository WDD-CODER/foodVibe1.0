import { inject } from '@angular/core'
import { CanActivateFn, Router, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router'
import { moduleGuard } from '../../core/guards/module.guard'
import { PermissionService } from '@services/permission.service'

/**
 * Plan 727: the monthly plan is the business's own module and its numbers are money. Staff never see the page; everyone
 * else needs the module. The server (`requireModule` + `editMoney`) is the real gate; this only hides.
 */
export const monthlyPlanGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  if (inject(PermissionService).isStaff_()) return inject(Router).createUrlTree(['/dashboard'])
  return moduleGuard(['monthly_plan'])(route, state)
}
