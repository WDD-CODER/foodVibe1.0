import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './async-storage.service';
import { Recipe, PrepCategory } from '../models/recipe.model';

const ENTITY = 'DISH_LIST';
const TRASH_KEY = 'TRASH_DISHES';

@Injectable({ providedIn: 'root' })
export class DishDataService {
  private storage = inject(StorageService);

  private dishesStore_ = signal<Recipe[]>([]);
  readonly allDishes_ = this.dishesStore_.asReadonly();

  constructor() {
    this.loadInitialData();
  }

  /** Re-read from storage and refresh the signal. Used by demo loader after replacing data. */
  async reloadFromStorage(): Promise<void> {
    await this.loadInitialData();
  }

  /** Normalize legacy mise_categories_ into prep_categories_ when loading from storage. */
  private normalizeDish(d: Recipe & { mise_categories_?: PrepCategory[] }): Recipe {
    if (d.mise_categories_?.length && !d.prep_categories_?.length) {
      const { mise_categories_, ...rest } = d;
      return { ...rest, prep_categories_: mise_categories_ };
    }
    const { mise_categories_: _m, ...rest } = d;
    return rest as Recipe;
  }

  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<Recipe & { mise_categories_?: PrepCategory[] }>(ENTITY);
    const normalized = data.map(d => this.normalizeDish(d));
    this.dishesStore_.set(normalized);
  }

  async getDishById(_id: string): Promise<Recipe> {
    return this.storage.get<Recipe>(ENTITY, _id);
  }

  async addDish(newDish: Omit<Recipe, '_id'>): Promise<Recipe> {
    const now = Date.now();
    const toCreate = { ...newDish, addedAt_: now, updatedAt_: now } as Recipe;
    const saved = await this.storage.post<Recipe>(ENTITY, toCreate);
    this.dishesStore_.update(dishes => [...dishes, saved]);
    return saved;
  }

  async updateDish(dish: Recipe): Promise<Recipe> {
    const existing = await this.storage.get<Recipe>(ENTITY, dish._id).catch(() => null);
    const toSave: Recipe = {
      ...dish,
      addedAt_: dish.addedAt_ ?? existing?.addedAt_,
      updatedAt_: Date.now(),
    };
    const updated = await this.storage.put<Recipe>(ENTITY, toSave);
    this.dishesStore_.update(dishes =>
      dishes.map(d => (d._id === updated._id ? updated : d))
    );
    return updated;
  }

  async deleteDish(_id: string): Promise<void> {
    const dish = await this.storage.get<Recipe>(ENTITY, _id);
    const withDeleted = { ...dish, deletedAt: Date.now() } as Recipe & { deletedAt: number };
    await this.storage.appendExisting(TRASH_KEY, withDeleted);
    await this.storage.remove(ENTITY, _id);
    this.dishesStore_.update(dishes => dishes.filter(d => d._id !== _id));
  }

  async getTrashDishes(): Promise<(Recipe & { deletedAt: number })[]> {
    return this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
  }

  async restoreDish(_id: string): Promise<Recipe> {
    const trash = await this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
    const item = trash.find(d => d._id === _id);
    if (!item) throw new Error(`Dish ${_id} not found in trash`);
    const { deletedAt: _, ...dish } = item;
    const rest = trash.filter(d => d._id !== _id);
    await this.storage.replaceAll(TRASH_KEY, rest);
    await this.storage.appendExisting(ENTITY, dish);
    this.dishesStore_.update(dishes => [...dishes, dish]);
    return dish;
  }

  async disposeDish(_id: string): Promise<void> {
    const trash = await this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
    const rest = trash.filter(d => d._id !== _id);
    if (rest.length === trash.length) throw new Error(`Dish ${_id} not found in trash`);
    await this.storage.replaceAll(TRASH_KEY, rest);
  }

  async restoreAllDishes(): Promise<Recipe[]> {
    const trash = await this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
    const restored: Recipe[] = [];
    for (const item of trash) {
      const { deletedAt: _, ...dish } = item;
      await this.storage.appendExisting(ENTITY, dish);
      restored.push(dish);
    }
    await this.storage.replaceAll(TRASH_KEY, []);
    this.dishesStore_.update(dishes => [...dishes, ...restored]);
    return restored;
  }

  async disposeAllDishes(): Promise<void> {
    await this.storage.replaceAll(TRASH_KEY, []);
  }
}
