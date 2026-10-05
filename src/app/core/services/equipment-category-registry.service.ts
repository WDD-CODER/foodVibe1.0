import { Injectable, computed, inject } from '@angular/core'
import { LoggingService } from './logging.service'
import { TaxonomyStore } from './taxonomy-store.service'

/** Plan 321 Phase 3 — custom equipment categories as a thin facade over TaxonomyStore (`equipmentCategory` terms). */
@Injectable({ providedIn: 'root' })
export class EquipmentCategoryRegistryService {
  private readonly logging = inject(LoggingService)
  private readonly taxonomy = inject(TaxonomyStore)

  readonly customCategories_ = computed(() =>
    this.taxonomy
      .terms('equipmentCategory')()
      .map((t) => t.key)
  )

  constructor() {
    this.taxonomy.ensureLoaded().catch((err: unknown) => this.logError('load', err))
  }

  async reloadFromStorage(): Promise<void> {
    await this.taxonomy.reload().catch((err: unknown) => this.logError('load', err))
  }

  async addCategory(key: string): Promise<void> {
    const trimmed = key.trim()
    if (!trimmed || this.taxonomy.find('equipmentCategory', trimmed)) return
    await this.taxonomy.add('equipmentCategory', trimmed, {}).catch((err: unknown) => this.logError('persist', err))
  }

  private logError(what: 'load' | 'persist', err: unknown): void {
    this.logging.error({
      event: `crud.equipmentCategories.${what}_error`,
      message: `Failed to ${what} equipment custom categories`,
      context: { err }
    })
  }
}
