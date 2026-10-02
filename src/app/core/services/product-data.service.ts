import { Injectable, signal, inject, computed } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { LoadingService } from './loading.service'
import { Product, ProductSource } from '../models/product.model'

const ENTITY = 'products'
const TRASH_KEY = 'TRASH_PRODUCTS'

@Injectable({ providedIn: 'root' })
export class ProductDataService {
  private storage = inject(StorageService)
  private logging = inject(LoggingService)
  private loading_ = inject(LoadingService)

  // Signal now stores Product objects
  private ProductsStore_ = signal<Product[]>([])
  readonly allProducts_ = this.ProductsStore_.asReadonly()

  readonly allTopCategories_ = computed(() => {
    const Products = this.ProductsStore_()
    const categories = Products.flatMap((p) => p.categories ?? []).filter((cat): cat is string => !!cat)
    return Array.from(new Set(categories))
  })

  readonly allAllergens_ = computed(() => {
    const Products = this.ProductsStore_()
    const allergens = Products.flatMap((Product) => Product.allergens || []) // Refactored
    return Array.from(new Set(allergens))
  })

  private loaded_ = false
  private loadPromise_: Promise<void> | null = null

  constructor() {
    void this.ensureLoaded()
  }

  /** True after at least one successful (or attempted) hydrate. */
  hasLoaded(): boolean {
    return this.loaded_
  }

  /** Loads from storage once. Safe to call repeatedly — concurrent callers share one promise. */
  async ensureLoaded(): Promise<void> {
    if (this.loaded_) return
    if (this.loadPromise_) return this.loadPromise_
    this.loadPromise_ = this.loadInitialData()
      .catch(() => {})
      .finally(() => {
        this.loaded_ = true
        this.loadPromise_ = null
      })
    return this.loadPromise_
  }

  /** Re-read from storage and refresh the signal. Used by demo loader after replacing data. */
  async reloadFromStorage(): Promise<void> {
    if (this.loadPromise_) {
      // A load is already in flight — e.g. this service was just constructed via
      // injector.get() and its constructor's ensureLoaded() hasn't resolved yet.
      // Await it instead of firing a redundant concurrent fetch for the same data.
      await this.loadPromise_
      return
    }
    this.loaded_ = false
    this.loadPromise_ = null
    await this.loadInitialData()
    this.loaded_ = true
  }

  // LIST

  private async loadInitialData(): Promise<void> {
    try {
      const raw = await this.loading_.track(this.storage.query<Record<string, unknown>>(ENTITY))
      const products = raw.map((row) => this.normalizeProduct(row))
      this.ProductsStore_.set(products)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) return
      this.logging.error({ event: 'crud.products.hydrate_error', message: 'Failed to load products', context: { err } })
    }
  }

  private normalizeProduct(row: Record<string, unknown>): Product {
    const legacy = row as Partial<Product> & { category?: string; is_dairy_?: boolean; supplierId_?: string }
    let categories = (legacy.categories ?? []) as string[]
    if (categories.length === 0 && legacy.category) {
      categories = [legacy.category]
      if (legacy.is_dairy_ && !categories.includes('dairy')) {
        categories = [...categories, 'dairy']
      }
    }

    // Migration: build sources from legacy flat fields if not present
    const legacySupplierIds = (legacy.supplierIds_ ?? (legacy.supplierId_ ? [legacy.supplierId_] : [])) as string[]
    let sources = (legacy.sources ?? []) as ProductSource[]
    if (sources.length === 0) {
      const price = legacy.buy_price_global_ ?? 0
      sources =
        legacySupplierIds.length > 0
          ? legacySupplierIds.map((sid) => ({ supplierId: sid, price, addedAt: legacy.createdAt }))
          : price > 0
            ? [{ supplierId: '', price, addedAt: legacy.createdAt }]
            : []
    }

    return {
      _id: legacy._id ?? '',
      nameHebrew: legacy.nameHebrew ?? '',
      baseUnit: legacy.baseUnit ?? 'gram',
      sources,
      purchaseOptions: (legacy.purchaseOptions ?? []) as Product['purchaseOptions'],
      categories,
      yieldFactor: legacy.yieldFactor ?? 1,
      allergens: (legacy.allergens ?? []) as string[],
      minStockLevel: legacy.minStockLevel ?? 0,
      expiryDaysDefault: legacy.expiryDaysDefault ?? 0,
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
      nameEnglish: legacy.nameEnglish,
      seeded: legacy.seeded,
      allergenSource: legacy.allergenSource,
      nutritionPer100g: legacy.nutritionPer100g,
      _masterId: legacy._masterId,
      _userModified: legacy._userModified
    }
  }

  /**
   * Server-side prefix search (plan 301, Milestone 1) — for typeahead components on large
   * catalogs. Returns lean results normalized through the same normalizeProduct() as the
   * full-collection load, so callers get a fully-typed Product with sane defaults for any
   * field the server's lean projection omitted (e.g. categories/allergens).
   */
  async searchProducts(query: string, limit = 25): Promise<Product[]> {
    try {
      const raw = await this.storage.search<Record<string, unknown>>(ENTITY, query, limit)
      return raw.map((row) => this.normalizeProduct(row))
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.products.search_error',
        message: 'Failed to search products',
        context: { err }
      })
      return []
    }
  }

  async getProductById(_id: string): Promise<Product> {
    try {
      const Product = await this.storage.get<Product>(ENTITY, _id)
      return Product
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
        createdAt: newProduct.createdAt ?? now,
        updatedAt: Date.now()
      } as Product
      const saved = await this.storage.post<Product & { _merged?: boolean }>(ENTITY, toCreate)
      const wasMerged = !!(saved as { _merged?: boolean })._merged
      if (wasMerged) {
        // Silent merge: update existing product in store instead of appending
        const normalized = this.normalizeProduct(saved as unknown as Record<string, unknown>)
        this.ProductsStore_.update((products) => {
          const idx = products.findIndex((p) => p._id === normalized._id)
          return idx >= 0 ? products.map((p, i) => (i === idx ? normalized : p)) : [...products, normalized]
        })
        this.logging.info({
          event: 'crud.product.merged',
          message: 'Product merged with existing',
          context: { entityType: ENTITY, id: saved._id }
        })
      } else {
        this.ProductsStore_.update((products) => [...products, saved])
        this.logging.info({
          event: 'crud.product.create',
          message: 'Product created',
          context: { entityType: ENTITY, id: saved._id }
        })
      }
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
        createdAt: product.createdAt ?? existing?.createdAt,
        updatedAt: Date.now()
      }
      const updated = await this.storage.put<Product>(ENTITY, toSave)
      this.ProductsStore_.update((products) => products.map((p) => (p._id === updated._id ? updated : p)))
      this.logging.info({
        event: 'crud.product.update',
        message: 'Product updated',
        context: { entityType: ENTITY, id: updated._id }
      })
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
      this.ProductsStore_.update((products) => products.filter((p) => p._id !== _id))
      this.logging.info({
        event: 'crud.product.delete',
        message: 'Product deleted',
        context: { entityType: ENTITY, id: _id }
      })
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({ event: 'crud.product.delete_error', message: 'Failed to delete product', context: { err } })
      throw err
    }
  }

  /** Plan 322 M9: publishes an already-saved product to __master__, same shape as
   *  RecipeDataService/DishDataService.pushToMaster. */
  async pushToMaster(productId: string): Promise<{ masterId: string }> {
    return this.storage.pushToMaster(ENTITY, productId)
  }

  /** Plan 322 bugfix: the server re-points a pushed doc's own _masterId to the
   *  resolved master id (see push-to-master route), but the local store never
   *  learned about it — so a delete right after a push still saw the OLD
   *  _masterId (or none) and silently skipped the admin ternary. Call this
   *  after pushToMaster resolves to keep the in-memory copy in sync. */
  patchMasterId(id: string, masterId: string): void {
    this.ProductsStore_.update((products) =>
      products.map((p) => (p._id === id ? { ...p, _masterId: masterId, _userModified: false } : p))
    )
  }

  /** Mirror of pushToMaster for the delete path (Plan 322 M6/M8): removes the
   *  caller's linked __master__ copy so future/unsynced users stop receiving it. */
  async deleteFromMaster(productId: string): Promise<void> {
    return this.storage.deleteFromMaster(ENTITY, productId)
  }

  /** Plan 322 M8: after deleteFromMaster, also strips this product's ingredient line
   *  from every OTHER user's own recipes/dishes that reference their own cloned copy
   *  of the same shared product. Explicitly Human-requested, dev-only, higher-risk
   *  than deleteFromMaster — reaches into other users' own documents. */
  async purgeIngredientEverywhere(productId: string): Promise<void> {
    return this.storage.purgeProductIngredientEverywhere(ENTITY, productId)
  }

  async getTrashProducts(): Promise<(Product & { deletedAt: number })[]> {
    try {
      const raw = await this.storage.query<Record<string, unknown>>(TRASH_KEY)
      return raw.map((row) => this.normalizeTrashProduct(row as Partial<Product> & { deletedAt: number }))
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.product.getTrash_error',
        message: 'Failed to get trash products',
        context: { err }
      })
      throw err
    }
  }

  private normalizeTrashProduct(row: Partial<Product> & { deletedAt: number }): Product & { deletedAt: number } {
    const legacy = row as Partial<Product> & {
      category?: string
      is_dairy_?: boolean
      supplierId_?: string
      deletedAt: number
    }
    const product = this.normalizeProduct(legacy as Record<string, unknown>)
    return { ...product, deletedAt: legacy.deletedAt }
  }

  async restoreProduct(_id: string): Promise<Product> {
    try {
      const trash = await this.getTrashProducts()
      const item = trash.find((p) => p._id === _id)
      if (!item) throw new Error(`Product ${_id} not found in trash`)
      const { deletedAt: _, ...product } = item
      const rest = trash.filter((p) => p._id !== _id)
      await this.storage.replaceAll(TRASH_KEY, rest)
      await this.storage.appendExisting(ENTITY, product)
      this.ProductsStore_.update((products) => [...products, product])
      return product
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.product.restore_error',
        message: 'Failed to restore product',
        context: { err }
      })
      throw err
    }
  }

  async disposeProduct(_id: string): Promise<void> {
    try {
      const trash = await this.getTrashProducts()
      const rest = trash.filter((p) => p._id !== _id)
      if (rest.length === trash.length) throw new Error(`Product ${_id} not found in trash`)
      await this.storage.replaceAll(TRASH_KEY, rest)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.product.dispose_error',
        message: 'Failed to dispose product',
        context: { err }
      })
      throw err
    }
  }

  async restoreAllProducts(): Promise<Product[]> {
    try {
      const trash = await this.getTrashProducts()
      const restored: Product[] = []
      for (const item of trash) {
        const { deletedAt: _, ...product } = item
        await this.storage.appendExisting(ENTITY, product)
        restored.push(product)
      }
      await this.storage.replaceAll(TRASH_KEY, [])
      this.ProductsStore_.update((products) => [...products, ...restored])
      return restored
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.product.restoreAll_error',
        message: 'Failed to restore all products',
        context: { err }
      })
      throw err
    }
  }

  async disposeAllProducts(): Promise<void> {
    try {
      await this.storage.replaceAll(TRASH_KEY, [])
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) throw err
      this.logging.error({
        event: 'crud.product.disposeAll_error',
        message: 'Failed to dispose all products',
        context: { err }
      })
      throw err
    }
  }
}
