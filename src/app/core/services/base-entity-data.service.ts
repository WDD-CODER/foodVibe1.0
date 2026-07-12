import { Signal, signal, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'

/**
 * Abstract base for simple entity data services that:
 *  - store a flat array of T in a single storage collection
 *  - expose the array as a read-only signal (`all_`)
 *  - support reload from storage
 *
 * Subclasses provide the storage key and may alias `all_` under an entity-specific name.
 * Pass `autoLoad: false` to defer the initial network fetch until `ensureLoaded()`
 * (e.g. route resolver / first page visit).
 */
export abstract class BaseEntityDataService<T> {
  protected readonly storage = inject(StorageService)
  protected readonly logging = inject(LoggingService)

  private readonly store_ = signal<T[]>([])
  private loaded_ = false
  private loadPromise_: Promise<void> | null = null

  /** Read-only view of the entity list. Subclasses may alias this under a domain name. */
  readonly all_: Signal<T[]> = this.store_.asReadonly()

  constructor(
    private readonly storageKey: string,
    autoLoad = true
  ) {
    if (autoLoad) {
      void this.ensureLoaded()
    }
  }

  /** True after at least one successful (or attempted) hydrate. */
  hasLoaded(): boolean {
    return this.loaded_
  }

  /**
   * Loads from storage once. Safe to call repeatedly — concurrent callers share one promise.
   */
  async ensureLoaded(): Promise<void> {
    if (this.loaded_) return
    if (this.loadPromise_) return this.loadPromise_
    this.loadPromise_ = this.loadInitialData()
      .catch(() => {})
      .finally(() => {
        this.loaded_ = true
        this.loadPromise_ = null
      })
    return this.loadPromise_
  }

  /** Re-read from storage and refresh the signal (e.g. after demo data load). */
  async reloadFromStorage(): Promise<void> {
    this.loaded_ = false
    this.loadPromise_ = null
    await this.ensureLoaded()
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
    try {
      const data = await this.storage.query<T>(this.storageKey)
      this.store_.set(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.entity.hydrate_error', message: `Failed to load ${this.storageKey}`, context: { err } })
    }
  }
}
