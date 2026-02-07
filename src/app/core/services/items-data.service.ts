import { Injectable, signal, inject, computed } from '@angular/core';
import type { ItemLedger } from '../models/ingredient.model';
import { StorageService } from './async-storage.service';

const ENTITY = 'item_list';

@Injectable({ providedIn: 'root' })
export class ItemDataService {
  private storage = inject(StorageService);

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
    // ItemLedger now uses _id directly from storage
    this.itemsStore_.set(data);
  }

  // Uses 'get'
  async getItem(_id: string): Promise<ItemLedger> {
    const item = await this.storage.get<any>(ENTITY, _id);
    return item;
  }

  // Uses 'post'
  async addItem(newItem: Omit<ItemLedger, '_id'>): Promise<void> {
    console.log("🚀 ~ ItemDataService ~ addItem ~ newItem:", newItem)
    const saved = await this.storage.post<any>(ENTITY, newItem);
    
    this.itemsStore_.update(items => [...items, saved]);
  }

  // Uses 'put'
  async updateItem(item: ItemLedger): Promise<void> {
    const updated = await this.storage.put<any>(ENTITY, item);
    
    this.itemsStore_.update(items => 
      items.map(i => i._id === updated._id ? updated : i)
    );
  }

  // Uses 'remove'
  async deleteItem(_id: string): Promise<void> {
    await this.storage.remove(ENTITY, _id);
    this.itemsStore_.update(items => items.filter(i => i._id !== _id));
  }
}