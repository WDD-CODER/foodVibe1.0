import { Injectable, computed, inject } from '@angular/core'
import { LoggingService } from './logging.service'
import { TaxonomyStore } from './taxonomy-store.service'

const LOAD_LOG = { event: 'crud.menuEventTypes.load_error', message: 'Failed to load menu event types' }

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
    void this.taxonomy.loadSafely(LOAD_LOG)
  }

  async reloadFromStorage(): Promise<void> {
    await this.taxonomy.reloadSafely(LOAD_LOG)
  }

  /** Adds an event type with its coefficient (plan 441; 1 = a normal amount). False when it was not saved. */
  async addEventType(name: string, coefficient = 1): Promise<boolean> {
    const trimmed = name.trim()
    if (!trimmed || this.taxonomy.find('eventType', trimmed)) return false
    return this.taxonomy
      .add('eventType', trimmed, { coefficient })
      .then(() => true)
      .catch((err: unknown) => {
        this.logError('persist', err)
        return false
      })
  }

  private logError(what: 'persist', err: unknown): void {
    this.logging.error({
      event: `crud.menuEventTypes.${what}_error`,
      message: `Failed to ${what} menu event types`,
      context: { err }
    })
  }
}
