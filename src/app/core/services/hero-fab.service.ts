import { Injectable, signal } from '@angular/core'
import type { ModuleKey } from '@schemas/modules'

export interface HeroFabAction {
  labelKey: string
  icon: string
  run: () => void
  /** Plan 620: the action is left out while the business lacks this module. */
  module?: ModuleKey
}

export type HeroFabPageMode = 'replace' | 'append'

export interface HeroFabPageState {
  actions: HeroFabAction[]
  mode: HeroFabPageMode
}

@Injectable({ providedIn: 'root' })
export class HeroFabService {
  private readonly pageState_ = signal<HeroFabPageState | null>(null)

  readonly pageActions = this.pageState_.asReadonly()

  setPageActions(actions: HeroFabAction[], mode: HeroFabPageMode): void {
    this.pageState_.set({ actions, mode })
  }

  clearPageActions(): void {
    this.pageState_.set(null)
  }
}
