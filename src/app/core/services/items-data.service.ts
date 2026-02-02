import { Injectable, signal, inject, computed } from '@angular/core';
import type { ItemLedger } from '../models/ingredient.model';
import { AsyncStorageService } from './async-storage.service.service';

const ENTITY = 'item_list';

@Injectable({ providedIn: 'root' })
export class ItemDataService {
  private storage = inject(AsyncStorageService);

  // Signal naming convention: suffix _
  private itemsStore_ = signal<ItemLedger[]>([]);
  readonly allItems_ = this.itemsStore_.asReadonly();

  readonly allTopCategories_ = computed(() => {
    const items = this.itemsStore_();
    const categories = items
      .map(item => item.properties?.topCategory)
      .filter((cat): cat is string => !!cat); // Remove undefined/empty strings

    return Array.from(new Set(categories)); // Deduplicate
  });

  // Example: You can also compute allergens similarly
  readonly allAllergens_ = computed(() => {
    const items = this.itemsStore_();
    const allergens = items.flatMap(item => item.allergenIds || []);
    return Array.from(new Set(allergens));
  });

  constructor() {
    this.loadInitialData();
  }

  // Uses 'query'
  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<ItemLedger>(ENTITY);
    // console.log(data);
    // Map _id from storage to id for your ItemLedger model
    const mappedData = data.map((item: any) => ({ ...item, id: item._id }));
    this.itemsStore_.set(mappedData);
  }

  // Uses 'get'
  async getItem(id: string): Promise<ItemLedger> {
    const item = await this.storage.get<any>(ENTITY, id);
    return { ...item, id: item._id };
  }

  // Uses 'post'
  async addItem(newItem: Omit<ItemLedger, 'id'>): Promise<void> {
    const saved = await this.storage.post<any>(ENTITY, newItem);
    const itemWithId = { ...saved, id: saved._id };
    
    this.itemsStore_.update(items => [...items, itemWithId]);
  }

  // Uses 'put'
  async updateItem(item: ItemLedger): Promise<void> {
    const entity = { ...item, _id: item.id };
    const updated = await this.storage.put<any>(ENTITY, entity);
    
    this.itemsStore_.update(items => 
      items.map(i => i.id === updated._id ? { ...updated, id: updated._id } : i)
    );
  }

  // Uses 'remove'
  async deleteItem(id: string): Promise<void> {
    await this.storage.remove(ENTITY, id);
    this.itemsStore_.update(items => items.filter(i => i.id !== id));
  }
}