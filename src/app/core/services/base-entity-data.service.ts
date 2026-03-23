import { Signal, signal, inject } from '@angular/core'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'

/**
 * Abstract base for simple entity data services that:
 *  - store a flat array of T in a single storage collection
 *  - expose the array as a read-only signal (`all_`)
 *  - support reload from storage
 *
 * Subclasses provide the storage key and may alias `all_` under an entity-specific name.
 */
export abstract class BaseEntityDataService<T> {
  protected readonly storage = inject(StorageService)
  protected readonly logging = inject(LoggingService)

  private readonly store_ = signal<T[]>([]);

  /** Read-only view of the entity list. Subclasses may alias this under a domain name. */
  readonly all_: Signal<T[]> = this.store_.asReadonly()

  constructor(private readonly storageKey: string) {
    this.loadInitialData()
  }

  /** Re-read from storage and refresh the signal (e.g. after demo data load). */
  async reloadFromStorage(): Promise<void> {
    await this.loadInitialData()
  }

  protected setItems(items: T[]): void {
    this.store_.set(items)
  }

  protected updateItems(updater: (current: T[]) => T[]): void {
    this.store_.update(updater)
  }

  protected currentItems(): T[] {
    return this.store_()
  }

  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<T>(this.storageKey)
    this.store_.set(Array.isArray(data) ? data : [])
  }
}
