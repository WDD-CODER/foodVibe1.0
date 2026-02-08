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

  private async loadInitialData(): Promise<void> {
    const data = await this.storage.query<Product>(ENTITY); // Explicit Product type
    console.log("🚀 ~ ProductDataService ~ loadInitialData ~ data:", data)
    this.ProductsStore_.set(data);
  }

  // GET: Returns a Product
  async getProductById(_id: string): Promise<Product> {
    const Product = await this.storage.get<Product>(ENTITY, _id); // Removed 'any'
    return Product;
  }

// async saveProduct(product: Product | Omit<Product, '_id'>): Promise<void> {
//   // 1. Determine the condition: Does the product have a valid ID?
//   if ('_id' in product && product._id && product._id.trim() !== '') {
    
//     // 2. Condition Met: Pass it to the update station
//     console.log("🛠️ Dispatching to Update Product:", product._id);
//     await this.updateProduct(product as Product);

//   } else {
    
//     // 3. Condition Not Met: It's a new item, pass it to the add station
//     console.log("🆕 Dispatching to Add Product");
    
//     // We remove the _id (even if it's an empty string) to keep the data clean
//     const { _id, ...newProductData } = product as any;
//     await this.addProduct(newProductData);
//   }
// }


  // POST: Change parameter to Product
// Inside ProductDataService
 async addProduct(newProduct: Omit<Product, '_id'>): Promise<void> {
  // Tell TS it's okay, the storage will provide the _id
  const saved = await this.storage.post<Product>(ENTITY, newProduct as Product);
  this.ProductsStore_.update(products => [...products, saved]);
}

  // PUT: Change parameter to Product
// Inside ProductDataService
 async updateProduct(product: Product): Promise<void> {
  // Use 'as any' to bypass the strict EntityId string constraint
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