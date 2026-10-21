import { Injectable, Signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { BaseEntityDataService } from './base-entity-data.service'
import { MenuEvent } from '@models/menu-event.model'

const ENTITY = 'menuEvents'

@Injectable({ providedIn: 'root' })
export class MenuEventDataService extends BaseEntityDataService<MenuEvent> {
  /** Domain alias for the base-class signal. */
  readonly allMenuEvents_: Signal<MenuEvent[]> = this.all_

  constructor() {
    // Deferred: load on ensureLoaded() via menu-library / menu-intelligence / metadata routes.
    super(ENTITY, false, { errorEvent: 'crud.menuEvents.hydrate_error', errorMessage: 'Failed to load menu events' })
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
      this.updateItems((events) => [...events, saved])
      return saved
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.menuEvent.create_error',
        message: 'Failed to add menu event',
        context: { err }
      })
      throw err
    }
  }

  async updateMenuEvent(event: MenuEvent): Promise<MenuEvent> {
    try {
      const updated = await this.storage.put<MenuEvent>(ENTITY, event)
      this.updateItems((events) => events.map((e) => (e._id === updated._id ? updated : e)))
      return updated
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.menuEvent.update_error',
        message: 'Failed to update menu event',
        context: { err }
      })
      throw err
    }
  }

  /**
   * Puts an event the server already saved (a stage move, a note, a new inquiry) into the store,
   * replacing the one with the same id or adding it. No request is made.
   */
  applyServerEvent(event: MenuEvent): void {
    this.updateItems((events) =>
      events.some((e) => e._id === event._id)
        ? events.map((e) => (e._id === event._id ? event : e))
        : [...events, event]
    )
  }

  async deleteMenuEvent(_id: string): Promise<void> {
    try {
      // Plan 407: the server stamps deletedAt; the item now sits in Trash.
      await this.storage.remove(ENTITY, _id)
      this.updateItems((events) => events.filter((e) => e._id !== _id))
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.menuEvent.delete_error',
        message: 'Failed to delete menu event',
        context: { err }
      })
      throw err
    }
  }

  async cloneMenuEventAsNew(_id: string): Promise<MenuEvent> {
    const source = await this.getMenuEventById(_id)
    const { _id: _, ...rest } = source
    const cloned: Omit<MenuEvent, '_id'> = {
      ...rest,
      name: `${source.name} (Copy)`,
      createdFromTemplateId: source._id
    }
    return this.addMenuEvent(cloned)
  }
}
