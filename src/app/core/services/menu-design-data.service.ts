import { Injectable, Signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { MenuDesign, NewMenuDesign } from '../models/menu-design.model'
import { BaseEntityDataService } from './base-entity-data.service'

const ENTITY = 'menuDesigns'

/** Plan 764: the business's menu designs. Loads on `ensureLoaded()` only (the module may be off). */
@Injectable({ providedIn: 'root' })
export class MenuDesignDataService extends BaseEntityDataService<MenuDesign> {
  /** Domain alias for the base-class signal. */
  readonly allDesigns_: Signal<MenuDesign[]> = this.all_

  constructor() {
    super(ENTITY, false)
  }

  async getDesignById(_id: string): Promise<MenuDesign> {
    try {
      return await this.storage.get<MenuDesign>(ENTITY, _id)
    } catch (err) {
      this.logFailure('crud.menu_design.get_error', 'Failed to get menu design', err)
      throw err
    }
  }

  async addDesign(design: NewMenuDesign): Promise<MenuDesign> {
    try {
      const saved = await this.storage.post<MenuDesign>(ENTITY, design as MenuDesign)
      this.updateItems((list) => [...list, saved])
      this.logging.info({
        event: 'crud.menu_design.create',
        message: 'Menu design created',
        context: { entityType: ENTITY, id: saved._id }
      })
      return saved
    } catch (err) {
      this.logFailure('crud.menu_design.create_error', 'Failed to add menu design', err)
      throw err
    }
  }

  async updateDesign(design: MenuDesign): Promise<MenuDesign> {
    try {
      const updated = await this.storage.put<MenuDesign>(ENTITY, design)
      this.updateItems((list) => list.map((d) => (d._id === updated._id ? updated : d)))
      this.logging.info({
        event: 'crud.menu_design.update',
        message: 'Menu design updated',
        context: { entityType: ENTITY, id: updated._id }
      })
      return updated
    } catch (err) {
      this.logFailure('crud.menu_design.update_error', 'Failed to update menu design', err)
      throw err
    }
  }

  async deleteDesign(_id: string): Promise<void> {
    try {
      // The server stamps deletedAt; the design now sits in Trash.
      await this.storage.remove(ENTITY, _id)
      this.updateItems((list) => list.filter((d) => d._id !== _id))
      this.logging.info({
        event: 'crud.menu_design.delete',
        message: 'Menu design deleted',
        context: { entityType: ENTITY, id: _id }
      })
    } catch (err) {
      this.logFailure('crud.menu_design.delete_error', 'Failed to delete menu design', err)
      throw err
    }
  }

  /** A signed-out answer (401) is handled by the auth interceptor, so it is not logged here. */
  private logFailure(event: string, message: string, err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status === 401) return
    this.logging.error({ event, message, context: { err } })
  }
}
