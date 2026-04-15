import { Injectable, signal, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'

const STORAGE_KEY = 'MENU_EVENT_TYPES'

interface MenuEventTypesDoc {
  _id?: string
  items: string[]
}

@Injectable({ providedIn: 'root' })
export class MenuEventTypeService {
  private readonly storage = inject(StorageService)
  private readonly logging = inject(LoggingService)

  private types_ = signal<string[]>([])
  readonly allEventTypes_ = this.types_.asReadonly()

  constructor() {
    this.load().catch(() => {})
  }

  async reloadFromStorage(): Promise<void> {
    await this.load()
  }

  private async load(): Promise<void> {
    try {
      const docs = await this.storage.query<MenuEventTypesDoc>(STORAGE_KEY)
      const doc = docs[0]
      if (Array.isArray(doc?.items) && doc.items.length > 0) {
        this.types_.set([...doc.items])
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.menuEventTypes.load_error', message: 'Failed to load menu event types', context: { err } })
    }
  }

  async addEventType(name: string): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed || this.types_().includes(trimmed)) return
    await this.persist([...this.types_(), trimmed])
  }

  private async persist(items: string[]): Promise<void> {
    try {
      const docs = await this.storage.query<MenuEventTypesDoc>(STORAGE_KEY)
      const doc = docs[0]
      if (doc?._id) {
        await this.storage.put(STORAGE_KEY, { ...doc, items } as MenuEventTypesDoc & { _id: string })
      } else {
        await this.storage.post(STORAGE_KEY, { items })
      }
      this.types_.set(items)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.menuEventTypes.persist_error', message: 'Failed to persist menu event types', context: { err } })
      this.types_.set(items)
    }
  }
}
