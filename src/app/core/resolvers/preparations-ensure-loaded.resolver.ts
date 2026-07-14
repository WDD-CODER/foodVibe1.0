import { inject } from '@angular/core'
import { ResolveFn } from '@angular/router'
import { PreparationRegistryService } from '../services/preparation-registry.service'

/** Ensures KITCHEN_PREPARATIONS is hydrated before recipe-builder (and related) routes render. */
export const preparationsEnsureLoadedResolver: ResolveFn<boolean> = () => {
  const prepRegistry = inject(PreparationRegistryService)
  return prepRegistry.ensureLoaded().then(() => true)
}
