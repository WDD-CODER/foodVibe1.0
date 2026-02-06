import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../models/product.model';
import { Recipe } from '../models/recipe.model';
import { Supplier } from '@models/supplier.model';

@Injectable({
  providedIn: 'root'
})
export class KitchenStateService {
  // 1. Core Signals (The Data Store)
  products_ = signal<Product[]>([]); 
  recipes_ = signal<Recipe[]>([]); 
  suppliers_ = signal<Supplier[]>([]); 

  // 2. Computed Signals (Real-time Insights)
  // Automatically identifies items below their minimum stock level [cite: 306]
  lowStockItems_ = computed(() => 
    this.products_().filter(p => p.min_stock_level_ > 0) // Logic for day 3 [cite: 305, 307]
  );

  // 3. State Actions
  addProduct(product: Product) {
    this.products_.update(prev => [...prev, product]);
  }

  addRecipe(recipe: Recipe) {
    this.recipes_.update(prev => [...prev, recipe]);
  }

  addSupplier(supplier: Supplier) {
    this.suppliers_.update(prev => [...prev, supplier]);
  }

  // Recursive Costing Logic will be injected here in Day 6 [cite: 337]
}