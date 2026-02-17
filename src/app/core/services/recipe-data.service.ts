import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './async-storage.service';
import { Recipe } from '../models/recipe.model';

const ENTITY = 'RECIPE_LIST';

@Injectable({ providedIn: 'root' })
export class RecipeDataService {
  private storage = inject(StorageService);

  private recipesStore_ = signal<Recipe[]>([]);
  readonly allRecipes_ = this.recipesStore_.asReadonly();

  constructor() {
    this.loadInitialData();
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
    await this.storage.remove(ENTITY, _id);
    this.recipesStore_.update(recipes => recipes.filter(r => r._id !== _id));
  }
}
