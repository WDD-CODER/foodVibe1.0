import { computed, inject, Injectable, Injector } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { filter, firstValueFrom } from 'rxjs'
import { DEFAULT_MODULES, MODULE_OF_TYPE, modulesOf, type ModuleKey } from '@schemas/modules-pure'
import { BusinessService } from './business.service'

/** Plan 620: which modules the signed-in business has. The server is the gate; this only lets the browser hide and skip. */
@Injectable({ providedIn: 'root' })
export class ModuleService {
  private readonly business = inject(BusinessService)
  private readonly injector = inject(Injector)

  public readonly modules_ = computed(() => modulesOf(this.business.business_() ?? {}))

  /** True when any one of the keys is on. Before the business has loaded it answers from the default modules. */
  has(keys: ModuleKey | readonly ModuleKey[]): boolean {
    const list: readonly ModuleKey[] = typeof keys === 'string' ? [keys] : keys
    const on: readonly ModuleKey[] = this.business.loaded_() ? this.modules_() : DEFAULT_MODULES
    return list.some((key) => on.includes(key))
  }

  /** True when the entity type has no module, else `has` of its module list. */
  hasType(entityType: string): boolean {
    const keys = MODULE_OF_TYPE[entityType]
    return keys ? this.has(keys) : true
  }

  /** Resolves once the business has loaded (at once when it already has, or when nobody is signed in). */
  ready(): Promise<void> {
    if (this.business.loaded_()) return Promise.resolve()
    return firstValueFrom(toObservable(this.business.loaded_, { injector: this.injector }).pipe(filter(Boolean))).then(
      () => undefined
    )
  }
}
