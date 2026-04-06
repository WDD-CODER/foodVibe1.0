import { Injectable, signal, inject, computed } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { Product } from '../models/product.model'

const ENTITY = 'PRODUCT_LIST'
const TRASH_KEY = 'TRASH_PRODUCTS'

@Injectable({ providedIn: 'root' })
export class ProductDataService {
  private storage = inject(StorageService)
  private logging = inject(LoggingService)

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
    this.loadInitialData().catch(() => {})
  }

  /** Re-read from storage and refresh the signal. Used by demo loader after replacing data. */
  async reloadFromStorage(): Promise<void> {
    await this.loadInitialData();
  }

// LIST

  private async loadInitialData(): Promise<void> {
    try {
      const raw = await this.storage.query<Record<string, unknown>>(ENTITY)
      const products = raw.map(row => this.normalizeProduct(row))
      this.ProductsStore_.set(products)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.products.hydrate_error', message: 'Failed to load products', context: { err } })
    }
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
      addedAt_: legacy.addedAt_,
      updatedAt: legacy.updatedAt,
      name_english: legacy.name_english,
      seeded_: legacy.seeded_,
      allergen_source_: legacy.allergen_source_,
    };
  }

  async getProductById(_id: string): Promise<Product> {
    try {
      const Product = await this.storage.get<Product>(ENTITY, _id);
      return Product;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.product.get_error', message: 'Failed to get product', context: { err } })
      throw err
    }
  }

  async addProduct(newProduct: Omit<Product, '_id'>): Promise<Product> {
    try {
      const now = Date.now()
      const toCreate = {
        ...newProduct,
        addedAt_: newProduct.addedAt_ ?? now,
        updatedAt: new Date().toISOString(),
      } as Product
      const saved = await this.storage.post<Product>(ENTITY, toCreate)
      this.ProductsStore_.update(products => [...products, saved])
      this.logging.info({ event: 'crud.product.create', message: 'Product created', context: { entityType: ENTITY, id: saved._id } })
      return saved
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.product.create_error', message: 'Failed to add product', context: { err } })
      throw err
    }
  }

  async updateProduct(product: Product): Promise<void> {
    try {
      const existing = await this.storage.get<Product>(ENTITY, product._id).catch(() => null)
      const toSave: Product = {
        ...product,
        addedAt_: product.addedAt_ ?? existing?.addedAt_,
        updatedAt: new Date().toISOString(),
      }
      const updated = await this.storage.put<Product>(ENTITY, toSave)
      this.ProductsStore_.update(products =>
        products.map(p => p._id === updated._id ? updated : p)
      )
      this.logging.info({ event: 'crud.product.update', message: 'Product updated', context: { entityType: ENTITY, id: updated._id } })
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.product.update_error', message: 'Failed to update product', context: { err } })
      throw err
    }
  }

  async deleteProduct(_id: string): Promise<void> {
    try {
      const product = await this.storage.get<Product>(ENTITY, _id)
      const withDeleted = { ...product, deletedAt: Date.now() } as Product & { deletedAt: number }
      await this.storage.appendExisting(TRASH_KEY, withDeleted)
      await this.storage.remove(ENTITY, _id)
      this.ProductsStore_.update(products => products.filter(p => p._id !== _id))
      this.logging.info({ event: 'crud.product.delete', message: 'Product deleted', context: { entityType: ENTITY, id: _id } })
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.product.delete_error', message: 'Failed to delete product', context: { err } })
      throw err
    }
  }

  async getTrashProducts(): Promise<(Product & { deletedAt: number })[]> {
    try {
      const raw = await this.storage.query<Record<string, unknown>>(TRASH_KEY, 0);
      return raw.map(row => this.normalizeTrashProduct(row as Partial<Product> & { deletedAt: number }));
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.product.getTrash_error', message: 'Failed to get trash products', context: { err } })
      throw err
    }
  }

  private normalizeTrashProduct(row: Partial<Product> & { deletedAt: number }): Product & { deletedAt: number } {
    const legacy = row as Partial<Product> & { category_?: string; is_dairy_?: boolean; supplierId_?: string; deletedAt: number };
    const product = this.normalizeProduct(legacy as Record<string, unknown>);
    return { ...product, deletedAt: legacy.deletedAt };
  }

  async restoreProduct(_id: string): Promise<Product> {
    try {
      const trash = await this.getTrashProducts();
      const item = trash.find(p => p._id === _id);
      if (!item) throw new Error(`Product ${_id} not found in trash`);
      const { deletedAt: _, ...product } = item;
      const rest = trash.filter(p => p._id !== _id);
      await this.storage.replaceAll(TRASH_KEY, rest);
      await this.storage.appendExisting(ENTITY, product);
      this.ProductsStore_.update(products => [...products, product]);
      return product;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.product.restore_error', message: 'Failed to restore product', context: { err } })
      throw err
    }
  }

  async disposeProduct(_id: string): Promise<void> {
    try {
      const trash = await this.getTrashProducts();
      const rest = trash.filter(p => p._id !== _id);
      if (rest.length === trash.length) throw new Error(`Product ${_id} not found in trash`);
      await this.storage.replaceAll(TRASH_KEY, rest);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.product.dispose_error', message: 'Failed to dispose product', context: { err } })
      throw err
    }
  }

  async restoreAllProducts(): Promise<Product[]> {
    try {
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
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.product.restoreAll_error', message: 'Failed to restore all products', context: { err } })
      throw err
    }
  }

  async disposeAllProducts(): Promise<void> {
    try {
      await this.storage.replaceAll(TRASH_KEY, []);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.product.disposeAll_error', message: 'Failed to dispose all products', context: { err } })
      throw err
    }
  }
}