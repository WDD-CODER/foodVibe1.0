import { Injectable, signal, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { LoadingService } from './loading.service'
import { UserService } from './user.service'
import { Recipe } from '../models/recipe.model'

const ENTITY = 'recipes'

@Injectable({ providedIn: 'root' })
export class RecipeDataService {
  private storage = inject(StorageService)
  private logging = inject(LoggingService)
  private loading_ = inject(LoadingService)
  private userService = inject(UserService)

  private recipesStore_ = signal<Recipe[]>([])
  readonly allRecipes_ = this.recipesStore_.asReadonly()

  private loaded_ = false
  private loadPromise_: Promise<void> | null = null

  // Deferred: load on ensureLoaded() via kitchenDataEnsureLoadedResolver (recipe-builder,
  // recipe-book, cook, menu-library, menu-intelligence routes) — see plan 304 M2.
  constructor() {}

  /** True after at least one successful (or attempted) hydrate. */
  hasLoaded(): boolean {
    return this.loaded_
  }

  /** Lightweight count — does not require the full collection to be loaded (plan 304 M2). */
  async getCount(filter?: 'unapproved'): Promise<number> {
    return this.storage.count(ENTITY, filter)
  }

  /** Loads from storage once. Safe to call repeatedly — concurrent callers share one promise. */
  async ensureLoaded(): Promise<void> {
    if (this.loaded_) return
    if (this.loadPromise_) return this.loadPromise_
    this.loadPromise_ = this.loadInitialData()
      .catch(() => {})
      .finally(() => {
        this.loaded_ = true
        this.loadPromise_ = null
      })
    return this.loadPromise_
  }

  /** Re-read from storage and refresh the signal. Used by demo loader after replacing data. */
  async reloadFromStorage(): Promise<void> {
    if (this.loadPromise_) {
      // A load is already in flight — e.g. this service was just constructed via
      // injector.get() and its constructor's ensureLoaded() hasn't resolved yet.
      // Await it instead of firing a redundant concurrent fetch for the same data.
      await this.loadPromise_
      return
    }
    this.loaded_ = false
    this.loadPromise_ = null
    this.recipesStore_.set([])
    await this.loadInitialData()
    this.loaded_ = true
  }

  private async loadInitialData(): Promise<void> {
    try {
      const data = await this.loading_.track(this.storage.query<Recipe>(ENTITY))
      this.recipesStore_.set(data)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.recipes.hydrate_error', message: 'Failed to load recipes', context: { err } })
    }
  }

  /**
   * Server-side prefix search (plan 301, Milestone 1) — for typeahead components on large
   * catalogs. Returns the server's lean projection (not the full Recipe shape); callers
   * must only rely on the fields the /search endpoint actually returns for recipes
   * (_id, nameHebrew, yieldUnit).
   */
  async searchRecipes(query: string, limit = 25): Promise<Recipe[]> {
    try {
      return await this.storage.search<Recipe>(ENTITY, query, limit)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipes.search_error', message: 'Failed to search recipes', context: { err } })
      return []
    }
  }

  async getRecipeById(_id: string): Promise<Recipe> {
    try {
      return this.storage.get<Recipe>(ENTITY, _id)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      if (err instanceof HttpErrorResponse && err.status === 404) throw err
      this.logging.error({ event: 'crud.recipe.get_error', message: 'Failed to get recipe', context: { err } })
      throw err
    }
  }

  async addRecipe(newRecipe: Omit<Recipe, '_id'>): Promise<Recipe> {
    try {
      const now = Date.now()
      const userId = this.userService.user_()?._id
      const toCreate = {
        ...newRecipe,
        createdAt: now,
        updatedAt: now,
        ...(userId ? { createdBy: userId } : {})
      } as Recipe
      const saved = await this.storage.post<Recipe>(ENTITY, toCreate)
      this.recipesStore_.update((recipes) => [...recipes, saved])
      this.logging.info({
        event: 'crud.recipe.create',
        message: 'Recipe created',
        context: { entityType: ENTITY, id: saved._id }
      })
      return saved
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.create_error', message: 'Failed to add recipe', context: { err } })
      throw err
    }
  }

  /** TEMPORARY (dev-process-only, see chat 2026-09-26). */
  async pushToMaster(recipeId: string): Promise<{ masterId: string }> {
    return this.storage.pushToMaster(ENTITY, recipeId)
  }

  /** Plan 322 bugfix: keep the local store's _masterId in sync with what the
   *  server just resolved it to (see product-data.service.ts's patchMasterId
   *  for the full reasoning — same fix, recipe side). */
  patchMasterId(id: string, masterId: string): void {
    this.recipesStore_.update((recipes) =>
      recipes.map((r) => (r._id === id ? { ...r, _masterId: masterId, _userModified: false } : r))
    )
  }

  /** Mirror of pushToMaster for the delete path (Plan 322 M6). */
  async deleteFromMaster(recipeId: string): Promise<void> {
    return this.storage.deleteFromMaster(ENTITY, recipeId)
  }

  async updateRecipe(recipe: Recipe): Promise<Recipe> {
    try {
      const existing = await this.storage.get<Recipe>(ENTITY, recipe._id).catch(() => null)
      const rest = recipe
      const toSave: Recipe = {
        ...rest,
        createdAt: recipe.createdAt ?? existing?.createdAt,
        updatedAt: Date.now(),
        createdBy: existing?.createdBy ?? recipe.createdBy
      }
      const updated = await this.storage.put<Recipe>(ENTITY, toSave)
      this.recipesStore_.update((recipes) => recipes.map((r) => (r._id === updated._id ? updated : r)))
      this.logging.info({
        event: 'crud.recipe.update',
        message: 'Recipe updated',
        context: { entityType: ENTITY, id: updated._id }
      })
      return updated
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.update_error', message: 'Failed to update recipe', context: { err } })
      throw err
    }
  }

  async permanentlyDeleteRecipe(_id: string): Promise<void> {
    try {
      await this.storage.removePermanently(ENTITY, _id)
      this.recipesStore_.update((recipes) => recipes.filter((r) => r._id !== _id))
      this.logging.info({
        event: 'crud.recipe.hardDelete',
        message: 'Recipe permanently deleted',
        context: { entityType: ENTITY, id: _id }
      })
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.recipe.hardDelete_error',
        message: 'Failed to permanently delete recipe',
        context: { err }
      })
      throw err
    }
  }

  async deleteRecipe(_id: string): Promise<void> {
    try {
      // Plan 407: the server stamps deletedAt; the item now sits in Trash.
      await this.storage.remove(ENTITY, _id)
      this.recipesStore_.update((recipes) => recipes.filter((r) => r._id !== _id))
      this.logging.info({
        event: 'crud.recipe.delete',
        message: 'Recipe deleted',
        context: { entityType: ENTITY, id: _id }
      })
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.delete_error', message: 'Failed to delete recipe', context: { err } })
      throw err
    }
  }
}
