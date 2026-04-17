import { Injectable, inject, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { MenuEvent } from '@models/menu-event.model'

const ENTITY = 'MENU_EVENT_LIST'
const TRASH_KEY = 'TRASH_MENU_EVENTS'

@Injectable({ providedIn: 'root' })
export class MenuEventDataService {
  private readonly storage = inject(StorageService)
  private readonly logging = inject(LoggingService)

  private readonly eventsStore_ = signal<MenuEvent[]>([])
  readonly allMenuEvents_ = this.eventsStore_.asReadonly()

  constructor() {
    this.loadInitialData().catch(() => {})
  }

  async reloadFromStorage(): Promise<void> {
    await this.loadInitialData()
  }

  private async loadInitialData(): Promise<void> {
    try {
      const data = await this.storage.query<MenuEvent>(ENTITY)
      this.eventsStore_.set(data)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.menuEvents.hydrate_error', message: 'Failed to load menu events', context: { err } })
    }
  }

  async getMenuEventById(_id: string): Promise<MenuEvent> {
    try {
      return this.storage.get<MenuEvent>(ENTITY, _id)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.menuEvent.get_error', message: 'Failed to get menu event', context: { err } })
      throw err
    }
  }

  async addMenuEvent(newEvent: Omit<MenuEvent, '_id'>): Promise<MenuEvent> {
    try {
      const saved = await this.storage.post<MenuEvent>(ENTITY, newEvent as MenuEvent)
      this.eventsStore_.update(events => [...events, saved])
      return saved
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.menuEvent.create_error', message: 'Failed to add menu event', context: { err } })
      throw err
    }
  }

  async updateMenuEvent(event: MenuEvent): Promise<MenuEvent> {
    try {
      const updated = await this.storage.put<MenuEvent>(ENTITY, event)
      this.eventsStore_.update(events => events.map(e => (e._id === updated._id ? updated : e)))
      return updated
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.menuEvent.update_error', message: 'Failed to update menu event', context: { err } })
      throw err
    }
  }

  async deleteMenuEvent(_id: string): Promise<void> {
    try {
      const item = await this.storage.get<MenuEvent>(ENTITY, _id)
      const withDeleted = { ...item, deletedAt: Date.now() } as MenuEvent & { deletedAt: number }
      await this.storage.appendExisting(TRASH_KEY, withDeleted)
      await this.storage.remove(ENTITY, _id)
      this.eventsStore_.update(events => events.filter(e => e._id !== _id))
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.menuEvent.delete_error', message: 'Failed to delete menu event', context: { err } })
      throw err
    }
  }

  async cloneMenuEventAsNew(_id: string): Promise<MenuEvent> {
    const source = await this.getMenuEventById(_id)
    const { _id: _, ...rest } = source
    const cloned: Omit<MenuEvent, '_id'> = {
      ...rest,
      name_: `${source.name_} (Copy)`,
      created_from_template_id_: source._id,
    }
    return this.addMenuEvent(cloned)
  }

  /** Updates all menu events that use oldServingType to newServingType. */
  async updateServingTypeForAll(oldServingType: string, newServingType: string): Promise<void> {
    if (oldServingType === newServingType) return
    const events = this.eventsStore_()
    const toUpdate = events.filter(e => e.serving_type_ === oldServingType)
    for (const event of toUpdate) {
      await this.updateMenuEvent({ ...event, serving_type_: newServingType })
    }
  }
}
