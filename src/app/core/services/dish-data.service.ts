import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './async-storage.service';
import { Recipe } from '../models/recipe.model';

const ENTITY = 'DISH_LIST';

@Injectable({ providedIn: 'root' })
export class DishDataService {
  private storage = inject(StorageService);

  private dishesStore_ = signal<Recipe[]>([]);
  readonly allDishes_ = this.dishesStore_.asReadonly();

  constructor() {
    this.loadInitialData();
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
    await this.storage.remove(ENTITY, _id);
    this.dishesStore_.update(dishes => dishes.filter(d => d._id !== _id));
  }
}
