import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './async-storage.service';
import { Recipe } from '../models/recipe.model';

const ENTITY = 'RECIPE_LIST';
const TRASH_KEY = 'TRASH_RECIPES';

@Injectable({ providedIn: 'root' })
export class RecipeDataService {
  private storage = inject(StorageService);

  private recipesStore_ = signal<Recipe[]>([]);
  readonly allRecipes_ = this.recipesStore_.asReadonly();

  constructor() {
    this.loadInitialData();
  }

  /** Re-read from storage and refresh the signal. Used by demo loader after replacing data. */
  async reloadFromStorage(): Promise<void> {
    await this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<Recipe>(ENTITY);
    this.recipesStore_.set(data);
  }

  async getRecipeById(_id: string): Promise<Recipe> {
    return this.storage.get<Recipe>(ENTITY, _id);
  }

  async addRecipe(newRecipe: Omit<Recipe, '_id'>): Promise<Recipe> {
    const saved = await this.storage.post<Recipe>(ENTITY, newRecipe as Recipe);
    this.recipesStore_.update(recipes => [...recipes, saved]);
    return saved;
  }

  async updateRecipe(recipe: Recipe): Promise<Recipe> {
    const updated = await this.storage.put<Recipe>(ENTITY, recipe);
    this.recipesStore_.update(recipes =>
      recipes.map(r => (r._id === updated._id ? updated : r))
    );
    return updated;
  }

  async deleteRecipe(_id: string): Promise<void> {
    const recipe = await this.storage.get<Recipe>(ENTITY, _id);
    const withDeleted = { ...recipe, deletedAt: Date.now() } as Recipe & { deletedAt: number };
    await this.storage.appendExisting(TRASH_KEY, withDeleted);
    await this.storage.remove(ENTITY, _id);
    this.recipesStore_.update(recipes => recipes.filter(r => r._id !== _id));
  }

  async getTrashRecipes(): Promise<(Recipe & { deletedAt: number })[]> {
    return this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
  }

  async restoreRecipe(_id: string): Promise<Recipe> {
    const trash = await this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
    const item = trash.find(r => r._id === _id);
    if (!item) throw new Error(`Recipe ${_id} not found in trash`);
    const { deletedAt: _, ...recipe } = item;
    const rest = trash.filter(r => r._id !== _id);
    await this.storage.replaceAll(TRASH_KEY, rest);
    await this.storage.appendExisting(ENTITY, recipe);
    this.recipesStore_.update(recipes => [...recipes, recipe]);
    return recipe;
  }

  async disposeRecipe(_id: string): Promise<void> {
    const trash = await this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
    const rest = trash.filter(r => r._id !== _id);
    if (rest.length === trash.length) throw new Error(`Recipe ${_id} not found in trash`);
    await this.storage.replaceAll(TRASH_KEY, rest);
  }

  async restoreAllRecipes(): Promise<Recipe[]> {
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
  }

  async disposeAllRecipes(): Promise<void> {
    await this.storage.replaceAll(TRASH_KEY, []);
  }
}
