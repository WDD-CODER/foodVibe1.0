import { computed, effect, inject, Injectable, Injector, untracked } from '@angular/core'
import { DEFAULT_MODULES, MODULE_OF_TYPE, modulesOf, type ModuleKey } from '@schemas/modules-pure'
import { BusinessService } from './business.service'

/** Plan 620: which modules the signed-in business has. The server is the gate; the browser only hides. */
@Injectable({ providedIn: 'root' })
export class ModuleService {
  private readonly business = inject(BusinessService)
  private readonly injector = inject(Injector)

  public readonly modules_ = computed<readonly ModuleKey[]>(() => {
    if (!this.business.loaded_()) return DEFAULT_MODULES
    return modulesOf(this.business.business_() ?? {})
  })

  /** True when any one of the keys is on. Before the business loaded it answers from the defaults. */
  has(keys: ModuleKey | readonly ModuleKey[]): boolean {
    const list = typeof keys === 'string' ? [keys] : keys
    const on = this.modules_()
    return list.some((key) => on.includes(key))
  }

  /** True when the entity type is not gated, else when its module (any of its keys) is on. */
  hasType(entityType: string): boolean {
    const keys = MODULE_OF_TYPE[entityType]
    return keys ? this.has(keys) : true
  }

  /** Resolves when the business load has answered (at once when it already has, or nobody is signed in). */
  ready(): Promise<void> {
    if (this.business.loaded_()) return Promise.resolve()
    return new Promise<void>((resolve) => {
      const ref = effect(
        () => {
          if (this.business.loaded_()) {
            untracked(() => resolve())
            ref.destroy()
          }
        },
        { injector: this.injector, manualCleanup: true }
      )
    })
  }
}
