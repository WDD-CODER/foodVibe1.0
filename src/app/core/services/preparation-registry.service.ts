import { Injectable, signal, computed, inject } from '@angular/core'
import { StorageService } from './async-storage.service'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'
import { TranslationKeyModalService, isTranslationKeyResult } from './translation-key-modal.service'
import { LoggingService } from './logging.service'

const STORAGE_KEY = 'KITCHEN_PREPARATIONS'

export interface PreparationEntry {
  name: string
  category: string
}

interface PreparationRegistryDoc {
  _id?: string
  categories: string[]
  preparations: PreparationEntry[]
}

@Injectable({ providedIn: 'root' })
export class PreparationRegistryService {
  private readonly storageService = inject(StorageService)
  private readonly userMsgService = inject(UserMsgService)
  private readonly translationService = inject(TranslationService)
  private readonly translationKeyModal = inject(TranslationKeyModalService)
  private readonly logging = inject(LoggingService)

  private categories_ = signal<string[]>([])
  private preparations_ = signal<PreparationEntry[]>([])

  readonly preparationCategories_ = this.categories_.asReadonly()
  readonly allPreparations_ = this.preparations_.asReadonly()

  getPreparationsByCategory_ = computed(() => {
    const preps = this.allPreparations_()
    const byCategory = new Map<string, PreparationEntry[]>()
    for (const p of preps) {
      const list = byCategory.get(p.category) ?? []
      list.push(p)
      byCategory.set(p.category, list)
    }
    return byCategory
  })

  constructor() {
    this.initRegistry()
  }

  /** Reload categories and preparations from storage (e.g. after demo data load). */
  async reloadFromStorage(): Promise<void> {
    await this.initRegistry()
  }

  private async initRegistry(): Promise<void> {
    try {
      const registries = await this.storageService.query<PreparationRegistryDoc>(STORAGE_KEY)
      const doc = registries[0]
      if (doc?.categories?.length !== undefined) {
        this.categories_.set(doc.categories)
      }
      if (doc?.preparations?.length !== undefined) {
        this.preparations_.set(doc.preparations)
      }
    } catch (err) {
      this.logging.error({ event: 'crud.preparations.load_error', message: 'Failed to load preparation registry', context: { err } });
      this.userMsgService.onSetErrorMsg('שגיאה בטעינת רישום ההכנות')
    }
  }

  /** Persist a single registry doc. Assigns _id if missing (e.g. after demo load) so future put() works. */
  private async persistDoc(payload: PreparationRegistryDoc): Promise<void> {
    const id = payload._id ?? this.storageService.makeId()
    await this.storageService.replaceAll(STORAGE_KEY, [{ ...payload, _id: id }])
  }

  /** Register category with English key (backend) and Hebrew label (dictionary). */
  async registerCategory(englishKey: string, hebrewLabel: string): Promise<void> {
    const key = englishKey.trim().toLowerCase().replace(/\s+/g, '_')
    const label = hebrewLabel.trim()
    if (!key) return
    if (this.categories_().includes(key)) return

    this.translationService.updateDictionary(key, label)
    const updated = [...this.categories_(), key]
    try {
      const registries = await this.storageService.query<PreparationRegistryDoc>(STORAGE_KEY)
      const doc = registries[0]
      const payload: PreparationRegistryDoc = doc
        ? { ...doc, categories: updated }
        : { categories: updated, preparations: [] }

      if (doc?._id) {
        await this.storageService.put(STORAGE_KEY, { ...payload, _id: doc._id })
      } else {
        await this.persistDoc(payload)
      }
      this.categories_.set(updated)
      this.userMsgService.onSetSuccessMsg(`הקטגוריה "${label}" נוספה בהצלחה`)
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת הקטגוריה')
      this.logging.error({ event: 'crud.preparations.category.save_error', message: 'Preparation category save error', context: { err } })
    }
  }

  /** Returns the first matching preparation by name (case-insensitive). */
  getPreparationByName(name: string): PreparationEntry | undefined {
    const q = name.trim().toLowerCase()
    return this.preparations_().find(p => p.name.toLowerCase() === q)
  }

  /** Updates a preparation's category in the registry. */
  async updatePreparationCategory(
    name: string,
    oldCategory: string,
    newCategory: string,
    options?: { silent?: boolean; onRevert?: () => void }
  ): Promise<void> {
    const preps = this.preparations_()
    const idx = preps.findIndex(
      p => p.name.toLowerCase() === name.trim().toLowerCase() && p.category === oldCategory.trim()
    )
    if (idx < 0) return

    const sanitizedNew = newCategory.trim().toLowerCase().replace(/\s+/g, '_')
    const updated = preps.map((p, i) =>
      i === idx ? { ...p, category: sanitizedNew } : p
    )

    try {
      const registries = await this.storageService.query<PreparationRegistryDoc>(STORAGE_KEY)
      const doc = registries[0]
      const payload: PreparationRegistryDoc = doc
        ? { ...doc, preparations: updated }
        : { categories: this.categories_(), preparations: updated }

      if (doc?._id) {
        await this.storageService.put(STORAGE_KEY, { ...payload, _id: doc._id })
      } else {
        await this.storageService.post(STORAGE_KEY, payload)
      }
      this.preparations_.set(updated)

      if (!options?.silent) {
        const onRevert = options?.onRevert
        const undo = () =>
          this.updatePreparationCategory(name, sanitizedNew, oldCategory, { silent: true }).then(
            () => onRevert?.()
          )
        this.userMsgService.onSetSuccessMsgWithUndo(`ההכנה "${name}" עודכנה בהצלחה`, undo)
      }
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בעדכון ההכנה')
      this.logging.error({ event: 'crud.preparations.update_error', message: 'Preparation update error', context: { err } })
    }
  }

  async deleteCategory(key: string): Promise<void> {
    const trimmed = key.trim().toLowerCase()
    const updated = this.categories_().filter(c => c !== trimmed)
    if (updated.length === this.categories_().length) return
    try {
      const registries = await this.storageService.query<PreparationRegistryDoc>(STORAGE_KEY)
      const doc = registries[0]
      const payload: PreparationRegistryDoc = doc ? { ...doc, categories: updated } : { categories: updated, preparations: [] }
      if (doc?._id) {
        await this.storageService.put(STORAGE_KEY, { ...payload, _id: doc._id })
      } else {
        await this.persistDoc(payload)
      }
      this.categories_.set(updated)
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה במחיקת הקטגוריה')
      this.logging.error({ event: 'crud.preparations.category.delete_error', message: 'Preparation category delete error', context: { err } })
    }
  }

  async renameCategory(oldKey: string, newKey: string, newLabel: string): Promise<void> {
    const sanitizedNew = newKey.trim().toLowerCase().replace(/\s+/g, '_')
    if (!sanitizedNew || sanitizedNew === oldKey) return
    const updatedCats = this.categories_().map(c => c === oldKey ? sanitizedNew : c)
    const updatedPreps = this.preparations_().map(p =>
      p.category === oldKey ? { ...p, category: sanitizedNew } : p
    )
    try {
      const registries = await this.storageService.query<PreparationRegistryDoc>(STORAGE_KEY)
      const doc = registries[0]
      const payload: PreparationRegistryDoc = doc
        ? { ...doc, categories: updatedCats, preparations: updatedPreps }
        : { categories: updatedCats, preparations: updatedPreps }
      if (doc?._id) {
        await this.storageService.put(STORAGE_KEY, { ...payload, _id: doc._id })
      } else {
        await this.persistDoc(payload)
      }
      this.categories_.set(updatedCats)
      this.preparations_.set(updatedPreps)
      this.translationService.updateDictionary(sanitizedNew, newLabel.trim())
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בעדכון הקטגוריה')
      this.logging.error({ event: 'crud.preparations.category.rename_error', message: 'Preparation category rename error', context: { err } })
    }
  }

  async registerPreparation(name: string, category: string): Promise<void> {
    const sanitizedName = name.trim()
    const sanitizedCategory = (category ?? '').trim()
    if (!sanitizedName) return

    let key: string | null = this.translationService.resolvePreparationCategory(sanitizedCategory);
    if (!key) {
      const modalResult = await this.translationKeyModal.open(sanitizedCategory, 'generic');
      if (isTranslationKeyResult(modalResult)) {
        this.translationService.addKeyAndHebrew(modalResult.englishKey, modalResult.hebrewLabel);
        key = modalResult.englishKey;
      } else {
        key = sanitizedCategory.toLowerCase().replace(/\s+/g, '_');
      }
    }
    const cats = this.categories_()
    const categoryExists = key != null && cats.includes(key)
    if (!categoryExists && key) {
      await this.registerCategory(key, sanitizedCategory)
    }

    const preps = this.preparations_()
    const exists = preps.some(
      p => p.name.toLowerCase() === sanitizedName.toLowerCase() && p.category === key
    )
    if (exists) return

    const entry: PreparationEntry = { name: sanitizedName, category: key ?? '' }
    const updated = [...preps, entry]

    try {
      const registries = await this.storageService.query<PreparationRegistryDoc>(STORAGE_KEY)
      const doc = registries[0]
      const payload: PreparationRegistryDoc = doc
        ? { ...doc, preparations: updated }
        : { categories: this.categories_(), preparations: updated }

      if (doc?._id) {
        await this.storageService.put(STORAGE_KEY, { ...payload, _id: doc._id })
      } else {
        await this.persistDoc(payload)
      }
      this.preparations_.set(updated)
      this.userMsgService.onSetSuccessMsg(`ההכנה "${sanitizedName}" נוספה בהצלחה`)
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת ההכנה')
      this.logging.error({ event: 'crud.preparations.save_error', message: 'Preparation save error', context: { err } })
    }
  }
}
