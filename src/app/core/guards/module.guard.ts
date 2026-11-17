import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import type { ModuleKey } from '@schemas/modules-pure'
import { ModuleService } from '@services/module.service'
import { UserService } from '@services/user.service'

/** Plan 620: a screen of a module the business does not have goes back to the dashboard. The server stays the gate. */
export const moduleGuard =
  (keys: readonly ModuleKey[]): CanActivateFn =>
  async () => {
    const user = inject(UserService)
    const modules = inject(ModuleService)
    const router = inject(Router)
    if (!user.user_()) return true
    await modules.ready()
    return modules.has(keys) ? true : router.createUrlTree(['/dashboard'])
  }
