import { Injectable, signal, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'

const STORAGE_KEY = 'EQUIPMENT_CUSTOM_CATEGORIES'

interface EquipmentCustomCategoriesDoc {
  _id?: string
  items: string[]
}

@Injectable({ providedIn: 'root' })
export class EquipmentCategoryRegistryService {
  private readonly storage = inject(StorageService)
  private readonly logging = inject(LoggingService)

  private categories_ = signal<string[]>([])
  readonly customCategories_ = this.categories_.asReadonly()

  constructor() {
    this.load().catch(() => {})
  }

  async reloadFromStorage(): Promise<void> {
    await this.load()
  }

  private async load(): Promise<void> {
    try {
      const docs = await this.storage.query<EquipmentCustomCategoriesDoc>(STORAGE_KEY)
      const doc = docs[0]
      if (Array.isArray(doc?.items) && doc.items.length > 0) {
        this.categories_.set([...doc.items])
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.equipmentCategories.load_error', message: 'Failed to load equipment custom categories', context: { err } })
    }
  }

  async addCategory(key: string): Promise<void> {
    const trimmed = key.trim()
    if (!trimmed || this.categories_().includes(trimmed)) return
    await this.persist([...this.categories_(), trimmed])
  }

  private async persist(items: string[]): Promise<void> {
    try {
      const docs = await this.storage.query<EquipmentCustomCategoriesDoc>(STORAGE_KEY)
      const doc = docs[0]
      if (doc?._id) {
        await this.storage.put(STORAGE_KEY, { ...doc, items } as EquipmentCustomCategoriesDoc & { _id: string })
      } else {
        await this.storage.post(STORAGE_KEY, { items })
      }
      this.categories_.set(items)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.equipmentCategories.persist_error', message: 'Failed to persist equipment custom categories', context: { err } })
      this.categories_.set(items)
    }
  }
}
