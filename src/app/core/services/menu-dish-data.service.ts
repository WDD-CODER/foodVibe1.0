import { Injectable, Signal, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { BaseEntityDataService } from './base-entity-data.service'
import type { MenuDish } from '@models/menu-dish.model'

const ENTITY = 'menuDishes'

/** Plan 725: the restaurant's standing menu. The server decides that only the owner may read money and write. */
@Injectable({ providedIn: 'root' })
export class MenuDishDataService extends BaseEntityDataService<MenuDish> {
  /** Domain alias for the base-class signal. */
  readonly allDishes_: Signal<MenuDish[]> = this.all_

  private readonly loadFailedState_ = signal(false)
  /** True when the last `load()` failed (the page shows a retry). */
  readonly loadFailed_ = this.loadFailedState_.asReadonly()

  constructor() {
    // Deferred: loaded by the page, which must tell a failed load from an empty menu.
    super(ENTITY, false, { errorEvent: 'crud.menu_dish.hydrate_error', errorMessage: 'Failed to load menu dishes' })
  }

  /** Reads the menu; a failure sets `loadFailed_` instead of showing an empty list as if it were the answer. */
  async load(): Promise<void> {
    this.loadFailedState_.set(false)
    try {
      const rows = await this.storage.query<MenuDish>(ENTITY)
      this.updateItems(() => (Array.isArray(rows) ? rows : []))
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.loadFailedState_.set(true)
      this.logging.error({
        event: 'crud.menu_dish.hydrate_error',
        message: 'Failed to load menu dishes',
        context: { err }
      })
    }
  }

  async addDish(body: Omit<MenuDish, '_id'>): Promise<MenuDish> {
    return this.write('create', async () => {
      const saved = await this.storage.post<MenuDish>(ENTITY, body as MenuDish)
      this.updateItems((items) => [...items, saved])
      return saved
    })
  }

  async updateDish(dish: MenuDish): Promise<MenuDish> {
    return this.write('update', async () => {
      const saved = await this.storage.put<MenuDish>(ENTITY, dish)
      this.updateItems((items) => items.map((d) => (d._id === saved._id ? saved : d)))
      return saved
    })
  }

  private async write<R>(action: string, run: () => Promise<R>): Promise<R> {
    try {
      return await run()
    } catch (err) {
      if (!(err instanceof HttpErrorResponse && err.status === 401)) {
        this.logging.error({
          event: `crud.menu_dish.${action}_error`,
          message: `Failed to ${action} menu dish`,
          context: { err }
        })
      }
      throw err
    }
  }
}
