import { Injectable, computed, inject } from '@angular/core'
import { LoggingService } from './logging.service'
import { TaxonomyStore } from './taxonomy-store.service'

/** Plan 436 — kitchen stations as a thin facade over TaxonomyStore (`station` terms, keyed by their Hebrew names). */
@Injectable({ providedIn: 'root' })
export class StationRegistryService {
  private readonly logging = inject(LoggingService)
  private readonly taxonomy = inject(TaxonomyStore)

  /** Station keys in display order (shared defaults first, then the user's own). */
  readonly stations_ = computed(() =>
    this.taxonomy
      .terms('station')()
      .map((t) => t.key)
  )

  constructor() {
    this.taxonomy.ensureLoaded().catch((err: unknown) => this.logError('load', err))
  }

  /** Adds a station and returns its stored key; a name that already exists returns the existing key. '' when blank. */
  async addStation(name: string): Promise<string> {
    const trimmed = name.trim()
    if (!trimmed) return ''
    const existing = this.taxonomy.find('station', trimmed)
    if (existing) return existing.key
    const created = await this.taxonomy.add('station', trimmed, {})
    return created.key
  }

  /** Re-keys a station; the server re-keys `defaultStation` on the owner's recipes and dishes in the same request. */
  async renameStation(oldKey: string, newKey: string): Promise<boolean> {
    return this.taxonomy.updateByKey('station', oldKey, { key: newKey.trim() })
  }

  /** Removes a station. Throws when it is still used (TermInUseError) or shared (TermReadOnlyError). */
  async removeStation(key: string): Promise<boolean> {
    return this.taxonomy.removeByKey('station', key)
  }

  hasStation(key: string): boolean {
    return !!this.taxonomy.find('station', key)
  }

  /** Shared stations are read-only except for an admin; own ones (and unknown keys) are editable. */
  canEdit(key: string): boolean {
    const term = this.taxonomy.find('station', key)
    return !term || this.taxonomy.canEdit(term)
  }

  private logError(what: 'load' | 'persist', err: unknown): void {
    this.logging.error({
      event: `crud.stations.${what}_error`,
      message: `Failed to ${what} stations`,
      context: { err }
    })
  }
}
