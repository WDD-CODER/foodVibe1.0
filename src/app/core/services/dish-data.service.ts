import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './async-storage.service';
import { Recipe } from '../models/recipe.model';

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

  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<Recipe>(ENTITY);
    this.dishesStore_.set(data);
  }

  async getDishById(_id: string): Promise<Recipe> {
    return this.storage.get<Recipe>(ENTITY, _id);
  }

  async addDish(newDish: Omit<Recipe, '_id'>): Promise<Recipe> {
    const saved = await this.storage.post<Recipe>(ENTITY, newDish as Recipe);
    this.dishesStore_.update(dishes => [...dishes, saved]);
    return saved;
  }

  async updateDish(dish: Recipe): Promise<Recipe> {
    const updated = await this.storage.put<Recipe>(ENTITY, dish);
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
