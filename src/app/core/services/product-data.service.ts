import { Injectable, signal, inject, computed } from '@angular/core';
import { StorageService } from './async-storage.service';
import { Product } from '../models/product.model'; 

const ENTITY = 'Product_list';

@Injectable({ providedIn: 'root' })
export class ProductDataService {
  private storage = inject(StorageService);

  // Signal now stores Product objects
  private ProductsStore_ = signal<Product[]>([]);
  readonly allProducts_ = this.ProductsStore_.asReadonly();

  readonly allTopCategories_ = computed(() => {
    const Products = this.ProductsStore_();
    const categories = Products
      .map(Product => Product.category_) // Refactored for Product property name
      .filter((cat): cat is string => !!cat);

    return Array.from(new Set(categories));
  });

  readonly allAllergens_ = computed(() => {
    const Products = this.ProductsStore_();
    const allergens = Products.flatMap(Product => Product.allergens_ || []); // Refactored
    return Array.from(new Set(allergens));
  });

  constructor() {
    this.loadInitialData();
  }
  
// LIST

  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<Product>(ENTITY); // Explicit Product type
    this.ProductsStore_.set(data);
  }

  async getProductById(_id: string): Promise<Product> {
    const Product = await this.storage.get<Product>(ENTITY, _id); // Removed 'any'
    return Product;
  }

//CREATE
 async addProduct(newProduct: Omit<Product, '_id'>): Promise<void> {
  const saved = await this.storage.post<Product>(ENTITY, newProduct as Product);
  console.log("🚀 ~ ProductDataService ~ addProduct ~ saved:", saved)
  this.ProductsStore_.update(products => [...products, saved]);
}

// UPDATE

 async updateProduct(product: Product): Promise<void> {
  const updated = await this.storage.put<Product>(ENTITY, product as Product);
  
  this.ProductsStore_.update(products => 
    products.map(p => p._id === updated._id ? updated : p)
  );
}

  // REMOVE
  async deleteProduct(_id: string): Promise<void> {
    await this.storage.remove(ENTITY, _id);
    this.ProductsStore_.update(Products => Products.filter(i => i._id !== _id));
  }
}