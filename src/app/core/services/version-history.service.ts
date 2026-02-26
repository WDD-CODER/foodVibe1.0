import { Injectable, inject } from '@angular/core';
import { StorageService } from './async-storage.service';
import { Recipe } from '../models/recipe.model';
import { Product } from '../models/product.model';
import { ActivityChange } from './activity-log.service';
import { RecipeDataService } from './recipe-data.service';
import { DishDataService } from './dish-data.service';
import { ProductDataService } from './product-data.service';

export type VersionEntityType = 'recipe' | 'dish' | 'product';

export interface VersionEntry {
  entityType: VersionEntityType;
  entityId: string;
  entityName: string;
  versionAt: number;
  snapshot: Recipe | Product;
  changes?: ActivityChange[];
}

const VERSION_STORAGE_KEY = 'VERSION_HISTORY';
const MAX_VERSIONS_PER_ENTITY = 20;

@Injectable({ providedIn: 'root' })
export class VersionHistoryService {
  private readonly storage = inject(StorageService);
  private readonly recipeData = inject(RecipeDataService);
  private readonly dishData = inject(DishDataService);
  private readonly productData = inject(ProductDataService);

  async getVersions(entityType: VersionEntityType, entityId: string): Promise<VersionEntry[]> {
    const all = await this.storage.query<VersionEntry>(VERSION_STORAGE_KEY, 0);
    return all
      .filter(e => e.entityType === entityType && e.entityId === entityId)
      .sort((a, b) => b.versionAt - a.versionAt);
  }

  async getVersionEntry(
    entityType: VersionEntityType,
    entityId: string,
    versionAt: number
  ): Promise<VersionEntry | null> {
    const all = await this.storage.query<VersionEntry>(VERSION_STORAGE_KEY, 0);
    return all.find(
      e => e.entityType === entityType && e.entityId === entityId && e.versionAt === versionAt
    ) ?? null;
  }

  async addVersion(entry: Omit<VersionEntry, 'versionAt'>): Promise<void> {
    const full: VersionEntry = { ...entry, versionAt: Date.now() };
    const all = await this.storage.query<VersionEntry>(VERSION_STORAGE_KEY, 0);
    all.push(full);
    const byEntity = new Map<string, VersionEntry[]>();
    for (const e of all) {
      const key = `${e.entityType}:${e.entityId}`;
      if (!byEntity.has(key)) byEntity.set(key, []);
      byEntity.get(key)!.push(e);
    }
    const trimmed: VersionEntry[] = [];
    for (const arr of byEntity.values()) {
      const sorted = arr.sort((a, b) => b.versionAt - a.versionAt);
      trimmed.push(...sorted.slice(0, MAX_VERSIONS_PER_ENTITY));
    }
    await this.storage.replaceAll(VERSION_STORAGE_KEY, trimmed);
  }

  async restoreVersion(
    entityType: VersionEntityType,
    entityId: string,
    versionAt: number
  ): Promise<void> {
    const all = await this.storage.query<VersionEntry>(VERSION_STORAGE_KEY, 0);
    const entry = all.find(
      e => e.entityType === entityType && e.entityId === entityId && e.versionAt === versionAt
    );
    if (!entry) throw new Error('Version not found');
    const snapshot = entry.snapshot;

    if (entityType === 'dish') {
      await this.dishData.updateDish(snapshot as Recipe);
    } else if (entityType === 'recipe') {
      await this.recipeData.updateRecipe(snapshot as Recipe);
    } else {
      await this.productData.updateProduct(snapshot as Product);
    }
  }

  /**
   * Create a new recipe/dish from a version snapshot (new _id, name with copy suffix).
   * Does not modify the current entity. Use for "Add as new" restore choice.
   */
  async addVersionAsNewRecipe(
    entityType: VersionEntityType,
    entityId: string,
    versionAt: number
  ): Promise<Recipe> {
    const entry = await this.getVersionEntry(entityType, entityId, versionAt);
    if (!entry) throw new Error('Version not found');
    const snapshot = entry.snapshot;
    if (entityType === 'product') {
      throw new Error('addVersionAsNewRecipe only supports recipe and dish');
    }
    const recipe = snapshot as Recipe;
    const copyName = `${recipe.name_hebrew} (עותק)`;
    const { _id: _, ...rest } = recipe;
    const newRecipe: Omit<Recipe, '_id'> = {
      ...rest,
      name_hebrew: copyName,
      recipe_type_: recipe.recipe_type_ ?? (entityType === 'dish' ? 'dish' : 'preparation'),
    };
    if (entityType === 'dish') {
      return this.dishData.addDish(newRecipe);
    }
    return this.recipeData.addRecipe(newRecipe);
  }
}
