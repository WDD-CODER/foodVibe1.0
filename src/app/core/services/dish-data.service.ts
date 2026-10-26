import { Injectable, Signal, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { BaseEntityDataService } from './base-entity-data.service'
import { UserService } from './user.service'
import { Recipe, PrepCategory } from '../models/recipe.model'

const ENTITY = 'dishes'

@Injectable({ providedIn: 'root' })
export class DishDataService extends BaseEntityDataService<Recipe> {
  private userService = inject(UserService)

  /** Domain alias for the base-class signal. */
  readonly allDishes_: Signal<Recipe[]> = this.all_

  // Deferred: load on ensureLoaded() via kitchenDataEnsureLoadedResolver (recipe-builder,
  // recipe-book, cook, menu-library, menu-intelligence routes) — see plan 304 M2.
  // A reload empties the list before re-reading (kept by plan 454).
  constructor() {
    super(ENTITY, false, {
      errorEvent: 'crud.dishes.hydrate_error',
      errorMessage: 'Failed to load dishes',
      clearOnReload: true
    })
  }

  /** Lightweight count — does not require the full collection to be loaded (plan 304 M2). */
  async getCount(filter?: 'unapproved'): Promise<number> {
    return this.storage.count(ENTITY, filter)
  }

  /** Normalize legacy mise_categories_ into prepCategories when loading from storage. */
  protected override normalizeRow(row: Recipe): Recipe {
    const d = row as Recipe & { mise_categories_?: PrepCategory[] }
    if (d.mise_categories_?.length && !d.prepCategories?.length) {
      const { mise_categories_, ...rest } = d
      return { ...rest, prepCategories: mise_categories_ }
    }
    const { mise_categories_: _m, ...rest } = d
    return rest as Recipe
  }

  async getDishById(_id: string): Promise<Recipe> {
    try {
      return this.storage.get<Recipe>(ENTITY, _id)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      if (err instanceof HttpErrorResponse && err.status === 404) throw err
      this.logging.error({ event: 'crud.dish.get_error', message: 'Failed to get dish', context: { err } })
      throw err
    }
  }

  async addDish(newDish: Omit<Recipe, '_id'>): Promise<Recipe> {
    try {
      const now = Date.now()
      const userId = this.userService.user_()?._id
      const toCreate = {
        ...newDish,
        createdAt: now,
        updatedAt: now,
        ...(userId ? { createdBy: userId } : {})
      } as Recipe
      const saved = await this.storage.post<Recipe>(ENTITY, toCreate)
      this.updateItems((dishes) => [...dishes, saved])
      return saved
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.create_error', message: 'Failed to add dish', context: { err } })
      throw err
    }
  }

  /** TEMPORARY (dev-process-only, see chat 2026-09-26). */
  async pushToMaster(dishId: string): Promise<{ masterId: string }> {
    return this.storage.pushToMaster(ENTITY, dishId)
  }

  /** Plan 322 bugfix: keep the local store's _masterId in sync with what the
   *  server just resolved it to (see product-data.service.ts's patchMasterId
   *  for the full reasoning — same fix, dish side). */
  patchMasterId(id: string, masterId: string): void {
    this.updateItems((dishes) =>
      dishes.map((d) => (d._id === id ? { ...d, _masterId: masterId, _userModified: false } : d))
    )
  }

  /** Mirror of pushToMaster for the delete path (Plan 322 M6). */
  async deleteFromMaster(dishId: string): Promise<void> {
    return this.storage.deleteFromMaster(ENTITY, dishId)
  }

  async updateDish(dish: Recipe): Promise<Recipe> {
    try {
      const existing = await this.storage.get<Recipe>(ENTITY, dish._id).catch(() => null)
      const rest = dish
      const toSave: Recipe = {
        ...rest,
        createdAt: dish.createdAt ?? existing?.createdAt,
        updatedAt: Date.now(),
        createdBy: existing?.createdBy ?? dish.createdBy
      }
      const updated = await this.storage.put<Recipe>(ENTITY, toSave)
      this.updateItems((dishes) => dishes.map((d) => (d._id === updated._id ? updated : d)))
      return updated
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.update_error', message: 'Failed to update dish', context: { err } })
      throw err
    }
  }

  async permanentlyDeleteDish(_id: string): Promise<void> {
    try {
      await this.storage.removePermanently(ENTITY, _id)
      this.updateItems((dishes) => dishes.filter((d) => d._id !== _id))
      this.logging.info({
        event: 'crud.dish.hardDelete',
        message: 'Dish permanently deleted',
        context: { entityType: ENTITY, id: _id }
      })
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.dish.hardDelete_error',
        message: 'Failed to permanently delete dish',
        context: { err }
      })
      throw err
    }
  }

  async deleteDish(_id: string): Promise<void> {
    try {
      // Plan 407: the server stamps deletedAt; the item now sits in Trash.
      await this.storage.remove(ENTITY, _id)
      this.updateItems((dishes) => dishes.filter((d) => d._id !== _id))
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.delete_error', message: 'Failed to delete dish', context: { err } })
      throw err
    }
  }
}
