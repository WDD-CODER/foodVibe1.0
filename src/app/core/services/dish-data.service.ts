import { Injectable, signal, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { StorageService } from './async-storage.service';
import { UserService } from './user.service';
import { LoggingService } from './logging.service';
import { Recipe, PrepCategory } from '../models/recipe.model';

const ENTITY = 'DISH_LIST';
const TRASH_KEY = 'TRASH_DISHES';

@Injectable({ providedIn: 'root' })
export class DishDataService {
  private storage = inject(StorageService);
  private userService = inject(UserService);
  private logging = inject(LoggingService);

  private dishesStore_ = signal<Recipe[]>([]);
  readonly allDishes_ = this.dishesStore_.asReadonly();

  constructor() {
    this.loadInitialData().catch(() => {})
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
    try {
      const data = await this.storage.query<Recipe & { mise_categories_?: PrepCategory[] }>(ENTITY);
      const normalized = data.map(d => this.normalizeDish(d));
      this.dishesStore_.set(normalized);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.dishes.hydrate_error', message: 'Failed to load dishes', context: { err } })
    }
  }

  async getDishById(_id: string): Promise<Recipe> {
    try {
      return this.storage.get<Recipe>(ENTITY, _id);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.get_error', message: 'Failed to get dish', context: { err } })
      throw err
    }
  }

  async addDish(newDish: Omit<Recipe, '_id'>): Promise<Recipe> {
    try {
      const now = Date.now();
      const userId = this.userService.user_()?._id;
      const toCreate = { ...newDish, addedAt_: now, updatedAt_: now, ...(userId ? { createdBy: userId } : {}) } as Recipe;
      const saved = await this.storage.post<Recipe>(ENTITY, toCreate);
      this.dishesStore_.update(dishes => [...dishes, saved]);
      return saved;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.create_error', message: 'Failed to add dish', context: { err } })
      throw err
    }
  }

  async updateDish(dish: Recipe): Promise<Recipe> {
    try {
      const existing = await this.storage.get<Recipe>(ENTITY, dish._id).catch(() => null);
      const toSave: Recipe = {
        ...dish,
        addedAt_: dish.addedAt_ ?? existing?.addedAt_,
        updatedAt_: Date.now(),
        createdBy: existing?.createdBy ?? dish.createdBy,
        hiddenBy: existing?.hiddenBy ?? dish.hiddenBy,
      };
      const updated = await this.storage.put<Recipe>(ENTITY, toSave);
      this.dishesStore_.update(dishes =>
        dishes.map(d => (d._id === updated._id ? updated : d))
      );
      return updated;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.update_error', message: 'Failed to update dish', context: { err } })
      throw err
    }
  }

  async hideDish(_id: string): Promise<Recipe> {
    try {
      const userId = this.userService.user_()?._id;
      if (!userId) throw new Error('NOT_AUTHENTICATED');
      const dish = await this.storage.get<Recipe>(ENTITY, _id);
      const hiddenBy = [...new Set([...(dish.hiddenBy ?? []), userId])];
      const updated = await this.storage.put<Recipe>(ENTITY, { ...dish, hiddenBy });
      this.dishesStore_.update(dishes => dishes.map(d => (d._id === _id ? updated : d)));
      return updated;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.hide_error', message: 'Failed to hide dish', context: { err } })
      throw err
    }
  }

  async permanentlyDeleteDish(_id: string): Promise<void> {
    try {
      await this.storage.remove(ENTITY, _id);
      this.dishesStore_.update(dishes => dishes.filter(d => d._id !== _id));
      this.logging.info({ event: 'crud.dish.hardDelete', message: 'Dish permanently deleted', context: { entityType: ENTITY, id: _id } });
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.hardDelete_error', message: 'Failed to permanently delete dish', context: { err } })
      throw err
    }
  }

  async deleteDish(_id: string): Promise<void> {
    try {
      const dish = await this.storage.get<Recipe>(ENTITY, _id);
      const withDeleted = { ...dish, deletedAt: Date.now() } as Recipe & { deletedAt: number };
      await this.storage.appendExisting(TRASH_KEY, withDeleted);
      await this.storage.remove(ENTITY, _id);
      this.dishesStore_.update(dishes => dishes.filter(d => d._id !== _id));
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.delete_error', message: 'Failed to delete dish', context: { err } })
      throw err
    }
  }

  async getTrashDishes(): Promise<(Recipe & { deletedAt: number })[]> {
    try {
      return this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.getTrash_error', message: 'Failed to get trash dishes', context: { err } })
      throw err
    }
  }

  async restoreDish(_id: string): Promise<Recipe> {
    try {
      const trash = await this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
      const item = trash.find(d => d._id === _id);
      if (!item) throw new Error(`Dish ${_id} not found in trash`);
      const { deletedAt: _, ...dish } = item;
      const rest = trash.filter(d => d._id !== _id);
      await this.storage.replaceAll(TRASH_KEY, rest);
      await this.storage.appendExisting(ENTITY, dish);
      this.dishesStore_.update(dishes => [...dishes, dish]);
      return dish;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.restore_error', message: 'Failed to restore dish', context: { err } })
      throw err
    }
  }

  async disposeDish(_id: string): Promise<void> {
    try {
      const trash = await this.storage.query<Recipe & { deletedAt: number }>(TRASH_KEY, 0);
      const rest = trash.filter(d => d._id !== _id);
      if (rest.length === trash.length) throw new Error(`Dish ${_id} not found in trash`);
      await this.storage.replaceAll(TRASH_KEY, rest);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.dispose_error', message: 'Failed to dispose dish', context: { err } })
      throw err
    }
  }

  async restoreAllDishes(): Promise<Recipe[]> {
    try {
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
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.restoreAll_error', message: 'Failed to restore all dishes', context: { err } })
      throw err
    }
  }

  async disposeAllDishes(): Promise<void> {
    try {
      await this.storage.replaceAll(TRASH_KEY, []);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.dish.disposeAll_error', message: 'Failed to dispose all dishes', context: { err } })
      throw err
    }
  }
}
