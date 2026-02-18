import { Injectable, signal, computed, inject } from '@angular/core'
import { StorageService } from './async-storage.service'
import { UserMsgService } from './user-msg.service'

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

  async registerCategory(name: string): Promise<void> {
    const sanitized = name.trim()
    if (!sanitized || this.categories_().includes(sanitized)) return

    const updated = [...this.categories_(), sanitized]
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
      this.userMsgService.onSetSuccessMsg(`הקטגוריה "${sanitized}" נוספה בהצלחה`)
    } catch (err) {
      this.userMsgService.onSetErrorMsg('שגיאה בשמירת הקטגוריה')
      console.error(err)
    }
  }

  async registerPreparation(name: string, category: string): Promise<void> {
    const sanitizedName = name.trim()
    const sanitizedCategory = category.trim()
    if (!sanitizedName) return

    const cats = this.categories_()
    const categoryExists = cats.includes(sanitizedCategory)
    if (!categoryExists && sanitizedCategory) {
      await this.registerCategory(sanitizedCategory)
    }

    const preps = this.preparations_()
    const exists = preps.some(
      p => p.name.toLowerCase() === sanitizedName.toLowerCase() && p.category === sanitizedCategory
    )
    if (exists) return

    const entry: PreparationEntry = { name: sanitizedName, category: sanitizedCategory }
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
