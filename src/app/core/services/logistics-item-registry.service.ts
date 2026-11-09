import { Injectable, Signal, computed, inject } from '@angular/core'
import type { TaxonomyTermOf } from '@models/v2'
import type { EnvironmentType } from '@models/venue.model'
import type { LogisticsPhase } from '@schemas/entities'
import { TaxonomyStore } from './taxonomy-store.service'

export type LogisticsItemTerm = TaxonomyTermOf<'logisticsItem'>

/** Plan 521 — event-logistics checklist items as a facade over TaxonomyStore (`logisticsItem` terms), filtered by phase and environment. */
@Injectable({ providedIn: 'root' })
export class LogisticsItemRegistryService {
  private readonly taxonomy = inject(TaxonomyStore)
  private readonly byArgs = new Map<string, Signal<LogisticsItemTerm[]>>()

  /** All items, shared first, then the user's own, each by `sortOrder`. */
  readonly items_ = this.taxonomy.terms('logisticsItem')

  /** Items of one phase that apply to the environment (no environment = every item). Same signal for the same arguments. */
  forPhase(phase: LogisticsPhase, environment: EnvironmentType | undefined): Signal<LogisticsItemTerm[]> {
    const cacheKey = `${phase}|${environment ?? ''}`
    let result = this.byArgs.get(cacheKey)
    if (!result) {
      result = computed(() =>
        this.items_().filter(
          (t) => t.phase === phase && (!t.environments?.length || !environment || t.environments.includes(environment))
        )
      )
      this.byArgs.set(cacheKey, result)
    }
    return result
  }

  loadSafely(options?: { track?: boolean }): Promise<void> {
    return this.taxonomy.loadSafely(
      { event: 'logistics_items.load.failed', message: 'Loading logistics items failed' },
      options
    )
  }
}
