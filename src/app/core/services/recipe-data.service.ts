import { Injectable, signal, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { UserService } from './user.service'
import { Recipe } from '../models/recipe.model'

const ENTITY = 'RECIPE_LIST'
const TRASH_KEY = 'TRASH_RECIPES'

@Injectable({ providedIn: 'root' })
export class RecipeDataService {
  private storage = inject(StorageService)
  private logging = inject(LoggingService)
  private userService = inject(UserService)

  private recipesStore_ = signal<Recipe[]>([]);
  readonly allRecipes_ = this.recipesStore_.asReadonly();

  constructor() {
    this.loadInitialData().catch(() => {})
  }

  /** Re-read from storage and refresh the signal. Used by demo loader after replacing data. */
  async reloadFromStorage(): Promise<void> {
    this.recipesStore_.set([]);
    await this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    try {
      const data = await this.storage.query<Recipe>(ENTITY);
      this.recipesStore_.set(data);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.recipes.hydrate_error', message: 'Failed to load recipes', context: { err } })
    }
  }

  async getRecipeById(_id: string): Promise<Recipe> {
    try {
      return this.storage.get<Recipe>(ENTITY, _id);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.get_error', message: 'Failed to get recipe', context: { err } })
      throw err
    }
  }

  async addRecipe(newRecipe: Omit<Recipe, '_id'>): Promise<Recipe> {
    try {
      const now = Date.now()
      const userId = this.userService.user_()?._id
      const toCreate = { ...newRecipe, addedAt_: now, updatedAt_: now, ...(userId ? { createdBy: userId } : {}) } as Recipe
      const saved = await this.storage.post<Recipe>(ENTITY, toCreate)
      this.recipesStore_.update(recipes => [...recipes, saved])
      this.logging.info({ event: 'crud.recipe.create', message: 'Recipe created', context: { entityType: ENTITY, id: saved._id } })
      return saved
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.create_error', message: 'Failed to add recipe', context: { err } })
      throw err
    }
  }

  async updateRecipe(recipe: Recipe): Promise<Recipe> {
    try {
      const existing = await this.storage.get<Recipe>(ENTITY, recipe._id).catch(() => null)
      const toSave: Recipe = {
        ...recipe,
        addedAt_: recipe.addedAt_ ?? existing?.addedAt_,
        updatedAt_: Date.now(),
        createdBy: existing?.createdBy ?? recipe.createdBy,
        hiddenBy: existing?.hiddenBy ?? recipe.hiddenBy,
      }
      const updated = await this.storage.put<Recipe>(ENTITY, toSave)
      this.recipesStore_.update(recipes =>
        recipes.map(r => (r._id === updated._id ? updated : r))
      )
      this.logging.info({ event: 'crud.recipe.update', message: 'Recipe updated', context: { entityType: ENTITY, id: updated._id } })
      return updated
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.update_error', message: 'Failed to update recipe', context: { err } })
      throw err
    }
  }

  async hideRecipe(_id: string): Promise<Recipe> {
    try {
      const userId = this.userService.user_()?._id
      if (!userId) throw new Error('NOT_AUTHENTICATED')
      const recipe = await this.storage.get<Recipe>(ENTITY, _id)
      const hiddenBy = [...new Set([...(recipe.hiddenBy ?? []), userId])]
      const updated = await this.storage.put<Recipe>(ENTITY, { ...recipe, hiddenBy })
      this.recipesStore_.update(recipes => recipes.map(r => (r._id === _id ? updated : r)))
      this.logging.info({ event: 'crud.recipe.hide', message: 'Recipe hidden by user', context: { entityType: ENTITY, id: _id, userId } })
      return updated
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.hide_error', message: 'Failed to hide recipe', context: { err } })
      throw err
    }
  }

  async permanentlyDeleteRecipe(_id: string): Promise<void> {
    try {
      await this.storage.remove(ENTITY, _id)
      this.recipesStore_.update(recipes => recipes.filter(r => r._id !== _id))
      this.logging.info({ event: 'crud.recipe.hardDelete', message: 'Recipe permanently deleted', context: { entityType: ENTITY, id: _id } })
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.hardDelete_error', message: 'Failed to permanently delete recipe', context: { err } })
      throw err
    }
  }

  async deleteRecipe(_id: string): Promise<void> {
    try {
      const recipe = await this.storage.get<Recipe>(ENTITY, _id)
      const withDeleted = { ...recipe, deletedAt: Date.now() } as Recipe & { deletedAt: number }
      await this.storage.appendExisting(TRASH_KEY, withDeleted)
      await this.storage.remove(ENTITY, _id)
      this.recipesStore_.update(recipes => recipes.filter(r => r._id !== _id))
      this.logging.info({ event: 'crud.recipe.delete', message: 'Recipe deleted', context: { entityType: ENTITY, id: _id } })
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.delete_error', message: 'Failed to delete recipe', context: { err } })
      throw err
    }
  }

  async getTrashRecipes(): Promise<(Recipe & { deletedAt: number })[]> {
    try {
      return this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.getTrash_error', message: 'Failed to get trash recipes', context: { err } })
      throw err
    }
  }

  async restoreRecipe(_id: string): Promise<Recipe> {
    try {
      const trash = await this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
      const item = trash.find(r => r._id === _id);
      if (!item) throw new Error(`Recipe ${_id} not found in trash`);
      const { deletedAt: _, ...recipe } = item;
      const rest = trash.filter(r => r._id !== _id);
      await this.storage.replaceAll(TRASH_KEY, rest);
      await this.storage.appendExisting(ENTITY, recipe);
      this.recipesStore_.update(recipes => [...recipes, recipe]);
      return recipe;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.restore_error', message: 'Failed to restore recipe', context: { err } })
      throw err
    }
  }

  async disposeRecipe(_id: string): Promise<void> {
    try {
      const trash = await this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
      const rest = trash.filter(r => r._id !== _id);
      if (rest.length === trash.length) throw new Error(`Recipe ${_id} not found in trash`);
      await this.storage.replaceAll(TRASH_KEY, rest);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.dispose_error', message: 'Failed to dispose recipe', context: { err } })
      throw err
    }
  }

  async restoreAllRecipes(): Promise<Recipe[]> {
    try {
      const trash = await this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
      const restored: Recipe[] = [];
      for (const item of trash) {
        const { deletedAt: _, ...recipe } = item;
        await this.storage.appendExisting(ENTITY, recipe);
        restored.push(recipe);
      }
      await this.storage.replaceAll(TRASH_KEY, []);
      this.recipesStore_.update(recipes => [...recipes, ...restored]);
      return restored;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.restoreAll_error', message: 'Failed to restore all recipes', context: { err } })
      throw err
    }
  }

  async disposeAllRecipes(): Promise<void> {
    try {
      await this.storage.replaceAll(TRASH_KEY, []);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.recipe.disposeAll_error', message: 'Failed to dispose all recipes', context: { err } })
      throw err
    }
  }
}
