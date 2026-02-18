import { Injectable, signal, computed, inject } from '@angular/core'
import { StorageService } from './async-storage.service'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'

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
      console.error('Failed to load preparation registry:', err)
      this.userMsgService.onSetErrorMsg('שגיאה בטעינת רישום ההכנות')
    }
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
        const saved = await this.storageService.post(STORAGE_KEY, payload)
        if (saved.preparations) this.preparations_.set(saved.preparations)
      }
      this.categories_.set(updated)
      this.userMsgService.onSetSuccessMsg(`הקטגוריה "${label}" נוספה בהצלחה`)
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת הקטגוריה')
      console.error(err)
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
      console.error(err)
    }
  }

  async registerPreparation(name: string, category: string): Promise<void> {
    const sanitizedName = name.trim()
    const sanitizedCategory = category.trim()
    if (!sanitizedName) return

    const key = sanitizedCategory.toLowerCase().replace(/\s+/g, '_')
    const cats = this.categories_()
    const categoryExists = cats.includes(key)
    if (!categoryExists && key) {
      await this.registerCategory(key, sanitizedCategory)
    }

    const preps = this.preparations_()
    const exists = preps.some(
      p => p.name.toLowerCase() === sanitizedName.toLowerCase() && p.category === key
    )
    if (exists) return

    const entry: PreparationEntry = { name: sanitizedName, category: key }
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
        await this.storageService.post(STORAGE_KEY, payload)
      }
      this.preparations_.set(updated)
      this.userMsgService.onSetSuccessMsg(`ההכנה "${sanitizedName}" נוספה בהצלחה`)
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת ההכנה')
      console.error(err)
    }
  }
}
