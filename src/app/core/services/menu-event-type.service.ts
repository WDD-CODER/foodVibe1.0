import { Injectable, computed, inject } from '@angular/core'
import { LoggingService } from './logging.service'
import { TaxonomyStore } from './taxonomy-store.service'

/** Plan 321 Phase 3 — menu event types as a thin facade over TaxonomyStore (`eventType` terms). */
@Injectable({ providedIn: 'root' })
export class MenuEventTypeService {
  private readonly logging = inject(LoggingService)
  private readonly taxonomy = inject(TaxonomyStore)

  readonly allEventTypes_ = computed(() =>
    this.taxonomy
      .terms('eventType')()
      .map((t) => t.key)
  )

  constructor() {
    this.taxonomy.ensureLoaded().catch((err: unknown) => this.logError('load', err))
  }

  async reloadFromStorage(): Promise<void> {
    await this.taxonomy.reload().catch((err: unknown) => this.logError('load', err))
  }

  async addEventType(name: string): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed || this.taxonomy.find('eventType', trimmed)) return
    await this.taxonomy.add('eventType', trimmed, {}).catch((err: unknown) => this.logError('persist', err))
  }

  private logError(what: 'load' | 'persist', err: unknown): void {
    this.logging.error({
      event: `crud.menuEventTypes.${what}_error`,
      message: `Failed to ${what} menu event types`,
      context: { err }
    })
  }
}
