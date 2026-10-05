import { Injectable, computed, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { LoggingService } from './logging.service'
import { LoadingService } from './loading.service'
import { KeyResolutionService } from './key-resolution.service'
import { UserMsgService } from './user-msg.service'
import { TaxonomyStore } from './taxonomy-store.service'

/** Plan 321 Phase 3 — menu section categories as a thin facade over TaxonomyStore (`sectionCategory` terms). */
@Injectable({ providedIn: 'root' })
export class MenuSectionCategoriesService {
  private readonly logging = inject(LoggingService)
  private readonly loading_ = inject(LoadingService)
  private readonly keyResolution = inject(KeyResolutionService)
  private readonly userMsgService = inject(UserMsgService)
  private readonly taxonomy = inject(TaxonomyStore)

  readonly sectionCategories_ = computed(() =>
    this.taxonomy
      .terms('sectionCategory')()
      .map((t) => t.key)
  )

  hasLoaded(): boolean {
    return this.taxonomy.isLoaded_()
  }

  async ensureLoaded(): Promise<void> {
    await this.loading_.track(this.taxonomy.ensureLoaded()).catch((err: unknown) => this.logError('hydrate', err))
  }

  /** Re-read from storage (e.g. after backup restore). */
  async reloadFromStorage(): Promise<void> {
    await this.taxonomy.reload().catch((err: unknown) => this.logError('hydrate', err))
  }

  /** Add a section category if not already present; resolves Hebrew to key, or opens translation-key modal for English key. */
  async addCategory(name: string): Promise<void> {
    const keyToUse = await this.keyResolution.ensureKeyForContext(name, 'section_category')
    if (!keyToUse || this.taxonomy.find('sectionCategory', keyToUse)) return
    await this.write(() => this.taxonomy.add('sectionCategory', keyToUse, {}))
  }

  async removeCategory(name: string): Promise<void> {
    await this.write(() => this.taxonomy.removeByKey('sectionCategory', name))
  }

  async renameCategory(oldName: string, newName: string): Promise<void> {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === oldName) return
    await this.write(() => this.taxonomy.updateByKey('sectionCategory', oldName, { key: trimmed }))
  }

  private async write(op: () => Promise<unknown>): Promise<void> {
    try {
      await op()
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      const msg = this.taxonomy.errorMessage(err)
      if (msg) this.userMsgService.onSetErrorMsg(msg)
      this.logError('persist', err)
    }
  }

  private logError(what: 'hydrate' | 'persist', err: unknown): void {
    this.logging.error({
      event: `crud.menuSectionCategories.${what}_error`,
      message: `Failed to ${what} menu section categories`,
      context: { err }
    })
  }
}
