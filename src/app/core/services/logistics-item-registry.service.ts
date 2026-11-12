import { Injectable, Injector, Signal, computed, inject } from '@angular/core'
import type { TaxonomyTermOf } from '@models/v2'
import type { EnvironmentType } from '@models/venue.model'
import { LOGISTICS_SECTIONS, type LogisticsPhase } from '@schemas/entities'
import { BusinessService } from './business.service'
import { TaxonomyStore } from './taxonomy-store.service'

export type LogisticsItemTerm = TaxonomyTermOf<'logisticsItem'>

const MASTER = '__master__'
const isBuiltInSection = (s: string): boolean => (LOGISTICS_SECTIONS as readonly string[]).includes(s)
const isRemoved = (t: LogisticsItemTerm): boolean => !!t.removedAt && t.removedAt > 0

/** Plan 521 — event-logistics checklist items as a facade over TaxonomyStore (`logisticsItem` terms), filtered by phase and environment. */
@Injectable({ providedIn: 'root' })
export class LogisticsItemRegistryService {
  private readonly taxonomy = inject(TaxonomyStore)
  /** Resolved on first use of `hiddenAt_`, so a consumer that never reads the business hide list needs no HttpClient. */
  private readonly injector = inject(Injector)
  private readonly byArgs = new Map<string, Signal<LogisticsItemTerm[]>>()

  /** Plan 579: every `logisticsItem` term, including removed and folded ones (the date rule needs their dates). */
  readonly allItems_ = this.taxonomy.terms('logisticsItem')

  /** The live items (used by the card and new events): no `removedAt > 0`, no `foldedAt`. Shared first, then own, each by `sortOrder`. */
  readonly items_ = computed(() => this.allItems_().filter((t) => !isRemoved(t) && !t.foldedAt))

  /** Plan 579: the business's hidden question keys with the time it hid each. */
  readonly hiddenAt_ = computed(
    () =>
      new Map(
        (this.injector.get(BusinessService).business_()?.hiddenLogisticsKeys ?? []).map((e) => [e.key, e.at] as const)
      )
  )

  /** Live items the business has not hidden. */
  readonly defaultItems_ = computed(() => {
    const hidden = this.hiddenAt_()
    return this.items_().filter((t) => !hidden.has(t.key))
  })

  /** The nine built-in sections, then shared `logisticsSection` terms, then own (the store sorts by `sortOrder`). */
  readonly sections_ = computed<string[]>(() => {
    const own = this.taxonomy
      .terms('logisticsSection')()
      .map((t) => t.key)
    return [...new Set<string>([...LOGISTICS_SECTIONS, ...own])]
  })

  /** Dictionary key for a built-in section, the key itself for a business's own. */
  sectionLabel(section: string): string {
    return isBuiltInSection(section) ? `logistics_section_${section}` : section
  }

  /** Items of one phase that apply to the environment (no environment = every item). Same signal for the same arguments. */
  forPhase(phase: LogisticsPhase, environment: EnvironmentType | undefined): Signal<LogisticsItemTerm[]> {
    const cacheKey = `${phase}|${environment ?? ''}`
    let result = this.byArgs.get(cacheKey)
    if (!result) {
      result = computed(() => this.defaultItems_().filter((t) => this.matches(t, phase, environment)))
      this.byArgs.set(cacheKey, result)
    }
    return result
  }

  /**
   * Plan 579: the questions an event shows, by date. A key counts from the earliest `since` of its terms (a master
   * seed term = always; else `createdAt`, so a promoted question keeps its folded own copy's date) until the earliest
   * removal date or the business's hide date. One term per key; the row data comes from the live term, else the newest removed.
   * Reads signals, so call it inside a `computed`. Answered questions are the caller's job.
   */
  forEvent(
    createdAt: number | undefined,
    phase: LogisticsPhase,
    environment: EnvironmentType | undefined
  ): LogisticsItemTerm[] {
    const at = createdAt ?? Date.now()
    const hidden = this.hiddenAt_()
    const all = this.allItems_()
    const byKey = new Map<string, LogisticsItemTerm[]>()
    for (const t of all) byKey.set(t.key, [...(byKey.get(t.key) ?? []), t])
    const rows: LogisticsItemTerm[] = []
    for (const [key, terms] of byKey) {
      const real = terms.filter((t) => !t.foldedAt)
      const removed = real.filter(isRemoved).sort((a, b) => (b.removedAt ?? 0) - (a.removedAt ?? 0))
      const row = real.find((t) => !isRemoved(t)) ?? removed[0]
      if (!row) continue
      const start = Math.min(...terms.map((t) => (t.createdBy === MASTER ? 0 : t.createdAt)))
      const hideAt = hidden.get(key)
      const ends = [...removed.map((t) => t.removedAt as number), ...(hideAt !== undefined ? [hideAt] : [])]
      const end = ends.length ? Math.min(...ends) : undefined
      if (start <= at && (end === undefined || at < end) && this.matches(row, phase, environment)) rows.push(row)
    }
    // keep the store's order (shared first, then own, by sortOrder)
    return rows.sort((a, b) => all.indexOf(a) - all.indexOf(b))
  }

  loadSafely(options?: { track?: boolean }): Promise<void> {
    return this.taxonomy.loadSafely(
      { event: 'logistics_items.load.failed', message: 'Loading logistics items failed' },
      options
    )
  }

  private matches(t: LogisticsItemTerm, phase: LogisticsPhase, environment: EnvironmentType | undefined): boolean {
    return t.phase === phase && (!t.environments?.length || !environment || t.environments.includes(environment))
  }
}
