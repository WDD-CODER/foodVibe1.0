import { Injectable, computed, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'
import { KeyResolutionService } from './key-resolution.service'
import { LoggingService } from './logging.service'
import { DishDataService } from './dish-data.service'
import { TaxonomyStore } from './taxonomy-store.service'
import type { FlatPrepItem, PrepCategory } from '../models/recipe.model'

const PREPARATION_LOAD_LOG = {
  event: 'crud.preparations.load_error',
  message: 'Failed to load preparation registry'
}

export interface PreparationEntry {
  name: string
  category: string
}

/**
 * Plan 321 Phase 3 — preparation categories (`prepCategory` terms) and named preparations
 * (`preparation` terms, `categoryKey` -> their category) as a thin facade over TaxonomyStore.
 * A preparation name is unique per owner (the term key), so the same name can no longer sit
 * in two categories at once.
 */
@Injectable({ providedIn: 'root' })
export class PreparationRegistryService {
  private readonly userMsgService = inject(UserMsgService)
  private readonly translationService = inject(TranslationService)
  private readonly keyResolution = inject(KeyResolutionService)
  private readonly logging = inject(LoggingService)
  private readonly dishDataService = inject(DishDataService)
  private readonly taxonomy = inject(TaxonomyStore)

  readonly preparationCategories_ = computed(() =>
    this.taxonomy
      .terms('prepCategory')()
      .map((t) => t.key)
  )
  readonly allPreparations_ = computed<PreparationEntry[]>(() =>
    this.taxonomy
      .terms('preparation')()
      .map((t) => ({ name: t.key, category: t.categoryKey ?? '' }))
  )

  getPreparationsByCategory_ = computed(() => {
    const byCategory = new Map<string, PreparationEntry[]>()
    for (const p of this.allPreparations_()) {
      const list = byCategory.get(p.category) ?? []
      list.push(p)
      byCategory.set(p.category, list)
    }
    return byCategory
  })

  hasLoaded(): boolean {
    return this.taxonomy.isLoaded_()
  }

  async ensureLoaded(): Promise<void> {
    await this.taxonomy.loadSafely(PREPARATION_LOAD_LOG, { track: true })
  }

  /** Reload categories and preparations from storage (e.g. after demo data load). */
  async reloadFromStorage(): Promise<void> {
    await this.taxonomy.reloadSafely(PREPARATION_LOAD_LOG)
  }

  /** Register category with English key (backend) and Hebrew label (dictionary). */
  async registerCategory(englishKey: string, hebrewLabel: string): Promise<void> {
    const key = englishKey.trim().toLowerCase().replace(/\s+/g, '_')
    const label = hebrewLabel.trim()
    if (!key || this.taxonomy.find('prepCategory', key)) return
    this.translationService.updateDictionary(key, label)
    await this.run('category.save', 'category_save_error', async () => {
      await this.taxonomy.add('prepCategory', key, {})
      this.userMsgService.onSetSuccessMsg(this.translationService.translate('category_added').replace('{name}', label))
    })
  }

  /**
   * Updates all dishes that contain this preparation with the old category to use the new category.
   * Only dishes is updated (per plan 165 recommendation).
   */
  private async propagateCategoryToDishes(
    preparationName: string,
    oldCategory: string,
    newCategory: string
  ): Promise<void> {
    // DishDataService is deferred (plan 304 M2) — this admin flow isn't necessarily
    // reached from a route that gates it, so ensure it's hydrated before reading.
    await this.dishDataService.ensureLoaded()
    const nameLower = preparationName.toLowerCase()
    const dishes = this.dishDataService.allDishes_()
    for (const dish of dishes) {
      const items = dish.prepItems
      if (!items?.length) continue
      let changed = false
      const updatedItems: FlatPrepItem[] = items.map((p) => {
        const match =
          p.preparationName.trim().toLowerCase() === nameLower && (p.categoryName?.trim() ?? '') === oldCategory
        if (!match) return p
        changed = true
        return {
          ...p,
          categoryName: newCategory,
          ...(p.mainCategoryName !== undefined && { mainCategoryName: newCategory })
        }
      })
      if (!changed) continue
      const byCategory = new Map<string, { itemName: string; unit: string; quantity?: number }[]>()
      updatedItems.forEach((p) => {
        const list = byCategory.get(p.categoryName) ?? []
        list.push({
          itemName: p.preparationName,
          unit: p.unit,
          quantity: p.quantity
        })
        byCategory.set(p.categoryName, list)
      })
      const prepCategories: PrepCategory[] = Array.from(byCategory.entries()).map(([categoryName, items]) => ({
        categoryName,
        items: items.map((it) => ({ itemName: it.itemName, unit: it.unit }))
      }))
      await this.dishDataService.updateDish({
        ...dish,
        prepItems: updatedItems,
        prepCategories: prepCategories
      })
    }
  }

  /** Returns the first matching preparation by name (case-insensitive). */
  getPreparationByName(name: string): PreparationEntry | undefined {
    const q = name.trim().toLowerCase()
    return this.allPreparations_().find((p) => p.name.toLowerCase() === q)
  }

  /** Updates a preparation's category in the registry. */
  async updatePreparationCategory(
    name: string,
    oldCategory: string,
    newCategory: string,
    options?: { silent?: boolean; onRevert?: () => void }
  ): Promise<void> {
    const entry = this.getPreparationByName(name)
    if (!entry || entry.category !== oldCategory.trim()) return
    const sanitizedNew = newCategory.trim().toLowerCase().replace(/\s+/g, '_')

    await this.run('update', 'preparation_update_error', async () => {
      await this.taxonomy.updateByKey('preparation', entry.name, { categoryKey: sanitizedNew || undefined })
      if (!options?.silent) {
        await this.propagateCategoryToDishes(name.trim(), oldCategory.trim(), sanitizedNew)
        const onRevert = options?.onRevert
        const undo = () =>
          this.updatePreparationCategory(name, sanitizedNew, oldCategory, { silent: true }).then(() => onRevert?.())
        const text = this.translationService.translate('preparation_updated_named').replace('{name}', name)
        this.userMsgService.onSetSuccessMsgWithUndo(text, undo)
      }
    })
  }

  async deleteCategory(key: string): Promise<void> {
    const trimmed = key.trim().toLowerCase()
    await this.run('category.delete', 'prep_category_delete_error', async () => {
      await this.taxonomy.removeByKey('prepCategory', trimmed)
    })
  }

  async renameCategory(oldKey: string, newKey: string, newLabel: string): Promise<void> {
    const sanitizedNew = newKey.trim().toLowerCase().replace(/\s+/g, '_')
    if (!sanitizedNew || sanitizedNew === oldKey) return
    await this.run('category.rename', 'prep_category_update_error', async () => {
      // The server carries the new key into recipes/dishes; the preparations filed under the
      // category are taxonomy terms themselves, so they are moved here.
      await this.taxonomy.updateByKey('prepCategory', oldKey, { key: sanitizedNew })
      for (const prep of this.taxonomy.terms('preparation')()) {
        if (prep.categoryKey === oldKey && this.taxonomy.canEdit(prep)) {
          await this.taxonomy.update(prep, { categoryKey: sanitizedNew })
        }
      }
      this.translationService.updateDictionary(sanitizedNew, newLabel.trim())
    })
  }

  async registerPreparation(name: string, category: string): Promise<void> {
    const sanitizedName = name.trim()
    const sanitizedCategory = (category ?? '').trim()
    if (!sanitizedName) return

    const key = await this.keyResolution.ensureKeyForContext(sanitizedCategory, 'preparation_category')
    if (sanitizedCategory && !key) return
    if (key && !this.taxonomy.find('prepCategory', key)) {
      await this.registerCategory(key, sanitizedCategory)
    }
    if (this.getPreparationByName(sanitizedName)) return

    await this.run('save', 'preparation_save_error', async () => {
      await this.taxonomy.add('preparation', sanitizedName, key ? { categoryKey: key } : {})
      this.userMsgService.onSetSuccessMsg(
        this.translationService.translate('preparation_added_named').replace('{name}', sanitizedName)
      )
    })
  }

  /** Runs a write; logs a failure, then shows the store's own message (read-only / in use) or the
   *  `fallbackKey` dictionary text. */
  private async run(event: string, fallbackKey: string, write: () => Promise<void>): Promise<void> {
    try {
      await write()
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({
        event: `crud.preparations.${event}_error`,
        message: `Preparation ${event} error`,
        context: { err }
      })
      this.userMsgService.onSetErrorMsg(
        this.taxonomy.errorMessage(err) ?? this.translationService.translate(fallbackKey)
      )
    }
  }
}
