import { Injectable, signal, inject, computed } from '@angular/core';
import { StorageService } from './async-storage.service';
import { Product } from '../models/product.model'; 

const ENTITY = 'PRODUCT_LIST';
const TRASH_KEY = 'TRASH_PRODUCTS';

@Injectable({ providedIn: 'root' })
export class ProductDataService {
  private storage = inject(StorageService);

  // Signal now stores Product objects
  private ProductsStore_ = signal<Product[]>([]);
  readonly allProducts_ = this.ProductsStore_.asReadonly();

  readonly allTopCategories_ = computed(() => {
    const Products = this.ProductsStore_();
    const categories = Products.flatMap(p => p.categories_ ?? []).filter((cat): cat is string => !!cat);
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

  /** Re-read from storage and refresh the signal. Used by demo loader after replacing data. */
  async reloadFromStorage(): Promise<void> {
    await this.loadInitialData();
  }

// LIST

  private async loadInitialData(): Promise<void> {
    const raw = await this.storage.query<Record<string, unknown>>(ENTITY);
    const products = raw.map(row => this.normalizeProduct(row));
    this.ProductsStore_.set(products);
  }

  private normalizeProduct(row: Record<string, unknown>): Product {
    const legacy = row as Partial<Product> & { category_?: string; is_dairy_?: boolean; supplierId_?: string };
    let categories_ = (legacy.categories_ ?? []) as string[];
    if (categories_.length === 0 && legacy.category_) {
      categories_ = [legacy.category_];
      if (legacy.is_dairy_ && !categories_.includes('dairy')) {
        categories_ = [...categories_, 'dairy'];
      }
    }
    const supplierIds_ = (legacy.supplierIds_ ?? (legacy.supplierId_ ? [legacy.supplierId_] : [])) as string[];
    return {
      _id: legacy._id ?? '',
      name_hebrew: legacy.name_hebrew ?? '',
      base_unit_: legacy.base_unit_ ?? 'gram',
      buy_price_global_: legacy.buy_price_global_ ?? 0,
      purchase_options_: (legacy.purchase_options_ ?? []) as Product['purchase_options_'],
      categories_,
      supplierIds_,
      yield_factor_: legacy.yield_factor_ ?? 1,
      allergens_: (legacy.allergens_ ?? []) as string[],
      min_stock_level_: legacy.min_stock_level_ ?? 0,
      expiry_days_default_: legacy.expiry_days_default_ ?? 0,
      updatedAt: legacy.updatedAt
    };
  }

  async getProductById(_id: string): Promise<Product> {
    const Product = await this.storage.get<Product>(ENTITY, _id); // Removed 'any'
    return Product;
  }

//CREATE
 async addProduct(newProduct: Omit<Product, '_id'>): Promise<Product> {
  const saved = await this.storage.post<Product>(ENTITY, newProduct as Product);
  this.ProductsStore_.update(products => [...products, saved]);
  return saved;
}

// UPDATE

 async updateProduct(product: Product): Promise<void> {
  const updated = await this.storage.put<Product>(ENTITY, product as Product);
  
  this.ProductsStore_.update(products => 
    products.map(p => p._id === updated._id ? updated : p)
  );
}

  // REMOVE (soft delete: move to trash)
  async deleteProduct(_id: string): Promise<void> {
    const product = await this.storage.get<Product>(ENTITY, _id);
    const withDeleted = { ...product, deletedAt: Date.now() } as Product & { deletedAt: number };
    await this.storage.appendExisting(TRASH_KEY, withDeleted);
    await this.storage.remove(ENTITY, _id);
    this.ProductsStore_.update(products => products.filter(p => p._id !== _id));
  }

  async getTrashProducts(): Promise<(Product & { deletedAt: number })[]> {
    const raw = await this.storage.query<Record<string, unknown>>(TRASH_KEY, 0);
    return raw.map(row => this.normalizeTrashProduct(row as Partial<Product> & { deletedAt: number }));
  }

  private normalizeTrashProduct(row: Partial<Product> & { deletedAt: number }): Product & { deletedAt: number } {
    const legacy = row as Partial<Product> & { category_?: string; is_dairy_?: boolean; supplierId_?: string; deletedAt: number };
    const product = this.normalizeProduct(legacy as Record<string, unknown>);
    return { ...product, deletedAt: legacy.deletedAt };
  }

  async restoreProduct(_id: string): Promise<Product> {
    const trash = await this.getTrashProducts();
    const item = trash.find(p => p._id === _id);
    if (!item) throw new Error(`Product ${_id} not found in trash`);
    const { deletedAt: _, ...product } = item;
    const rest = trash.filter(p => p._id !== _id);
    await this.storage.replaceAll(TRASH_KEY, rest);
    await this.storage.appendExisting(ENTITY, product);
    this.ProductsStore_.update(products => [...products, product]);
    return product;
  }

  async disposeProduct(_id: string): Promise<void> {
    const trash = await this.getTrashProducts();
    const rest = trash.filter(p => p._id !== _id);
    if (rest.length === trash.length) throw new Error(`Product ${_id} not found in trash`);
    await this.storage.replaceAll(TRASH_KEY, rest);
  }

  async restoreAllProducts(): Promise<Product[]> {
    const trash = await this.getTrashProducts();
    const restored: Product[] = [];
    for (const item of trash) {
      const { deletedAt: _, ...product } = item;
      await this.storage.appendExisting(ENTITY, product);
      restored.push(product);
    }
    await this.storage.replaceAll(TRASH_KEY, []);
    this.ProductsStore_.update(products => [...products, ...restored]);
    return restored;
  }

  async disposeAllProducts(): Promise<void> {
    await this.storage.replaceAll(TRASH_KEY, []);
  }
}