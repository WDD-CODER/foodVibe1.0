import {
  UserService
} from "./chunk-VOTRTAY7.js";
import {
  StorageService
} from "./chunk-WYZGJ7UG.js";
import {
  LoggingService
} from "./chunk-OYT4PDSG.js";
import {
  Injectable,
  __async,
  __objRest,
  __spreadProps,
  __spreadValues,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-GCYOWW7U.js";

// src/app/core/services/recipe-data.service.ts
var ENTITY = "RECIPE_LIST";
var TRASH_KEY = "TRASH_RECIPES";
var RecipeDataService = class _RecipeDataService {
  storage = inject(StorageService);
  logging = inject(LoggingService);
  userService = inject(UserService);
  recipesStore_ = signal([]);
  allRecipes_ = this.recipesStore_.asReadonly();
  constructor() {
    this.loadInitialData();
  }
  /** Re-read from storage and refresh the signal. Used by demo loader after replacing data. */
  reloadFromStorage() {
    return __async(this, null, function* () {
      yield this.loadInitialData();
    });
  }
  loadInitialData() {
    return __async(this, null, function* () {
      const data = yield this.storage.query(ENTITY);
      this.recipesStore_.set(data);
    });
  }
  getRecipeById(_id) {
    return __async(this, null, function* () {
      return this.storage.get(ENTITY, _id);
    });
  }
  addRecipe(newRecipe) {
    return __async(this, null, function* () {
      const now = Date.now();
      const userId = this.userService.user_()?._id;
      const toCreate = __spreadValues(__spreadProps(__spreadValues({}, newRecipe), { addedAt_: now, updatedAt_: now }), userId ? { createdBy: userId } : {});
      const saved = yield this.storage.post(ENTITY, toCreate);
      this.recipesStore_.update((recipes) => [...recipes, saved]);
      this.logging.info({ event: "crud.recipe.create", message: "Recipe created", context: { entityType: ENTITY, id: saved._id } });
      return saved;
    });
  }
  updateRecipe(recipe) {
    return __async(this, null, function* () {
      const existing = yield this.storage.get(ENTITY, recipe._id).catch(() => null);
      const toSave = __spreadProps(__spreadValues({}, recipe), {
        addedAt_: recipe.addedAt_ ?? existing?.addedAt_,
        updatedAt_: Date.now(),
        createdBy: existing?.createdBy ?? recipe.createdBy,
        hiddenBy: existing?.hiddenBy ?? recipe.hiddenBy
      });
      const updated = yield this.storage.put(ENTITY, toSave);
      this.recipesStore_.update((recipes) => recipes.map((r) => r._id === updated._id ? updated : r));
      this.logging.info({ event: "crud.recipe.update", message: "Recipe updated", context: { entityType: ENTITY, id: updated._id } });
      return updated;
    });
  }
  hideRecipe(_id) {
    return __async(this, null, function* () {
      const userId = this.userService.user_()?._id;
      if (!userId)
        throw new Error("NOT_AUTHENTICATED");
      const recipe = yield this.storage.get(ENTITY, _id);
      const hiddenBy = [.../* @__PURE__ */ new Set([...recipe.hiddenBy ?? [], userId])];
      const updated = yield this.storage.put(ENTITY, __spreadProps(__spreadValues({}, recipe), { hiddenBy }));
      this.recipesStore_.update((recipes) => recipes.map((r) => r._id === _id ? updated : r));
      this.logging.info({ event: "crud.recipe.hide", message: "Recipe hidden by user", context: { entityType: ENTITY, id: _id, userId } });
      return updated;
    });
  }
  permanentlyDeleteRecipe(_id) {
    return __async(this, null, function* () {
      yield this.storage.remove(ENTITY, _id);
      this.recipesStore_.update((recipes) => recipes.filter((r) => r._id !== _id));
      this.logging.info({ event: "crud.recipe.hardDelete", message: "Recipe permanently deleted", context: { entityType: ENTITY, id: _id } });
    });
  }
  deleteRecipe(_id) {
    return __async(this, null, function* () {
      const recipe = yield this.storage.get(ENTITY, _id);
      const withDeleted = __spreadProps(__spreadValues({}, recipe), { deletedAt: Date.now() });
      yield this.storage.appendExisting(TRASH_KEY, withDeleted);
      yield this.storage.remove(ENTITY, _id);
      this.recipesStore_.update((recipes) => recipes.filter((r) => r._id !== _id));
      this.logging.info({ event: "crud.recipe.delete", message: "Recipe deleted", context: { entityType: ENTITY, id: _id } });
    });
  }
  getTrashRecipes() {
    return __async(this, null, function* () {
      return this.storage.query(TRASH_KEY, 0);
    });
  }
  restoreRecipe(_id) {
    return __async(this, null, function* () {
      const trash = yield this.storage.query(TRASH_KEY, 0);
      const item = trash.find((r) => r._id === _id);
      if (!item)
        throw new Error(`Recipe ${_id} not found in trash`);
      const _a = item, { deletedAt: _ } = _a, recipe = __objRest(_a, ["deletedAt"]);
      const rest = trash.filter((r) => r._id !== _id);
      yield this.storage.replaceAll(TRASH_KEY, rest);
      yield this.storage.appendExisting(ENTITY, recipe);
      this.recipesStore_.update((recipes) => [...recipes, recipe]);
      return recipe;
    });
  }
  disposeRecipe(_id) {
    return __async(this, null, function* () {
      const trash = yield this.storage.query(TRASH_KEY, 0);
      const rest = trash.filter((r) => r._id !== _id);
      if (rest.length === trash.length)
        throw new Error(`Recipe ${_id} not found in trash`);
      yield this.storage.replaceAll(TRASH_KEY, rest);
    });
  }
  restoreAllRecipes() {
    return __async(this, null, function* () {
      const trash = yield this.storage.query(TRASH_KEY, 0);
      const restored = [];
      for (const item of trash) {
        const _a = item, { deletedAt: _ } = _a, recipe = __objRest(_a, ["deletedAt"]);
        yield this.storage.appendExisting(ENTITY, recipe);
        restored.push(recipe);
      }
      yield this.storage.replaceAll(TRASH_KEY, []);
      this.recipesStore_.update((recipes) => [...recipes, ...restored]);
      return restored;
    });
  }
  disposeAllRecipes() {
    return __async(this, null, function* () {
      yield this.storage.replaceAll(TRASH_KEY, []);
    });
  }
  static \u0275fac = function RecipeDataService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RecipeDataService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _RecipeDataService, factory: _RecipeDataService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RecipeDataService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

// src/app/core/services/dish-data.service.ts
var ENTITY2 = "DISH_LIST";
var TRASH_KEY2 = "TRASH_DISHES";
var DishDataService = class _DishDataService {
  storage = inject(StorageService);
  userService = inject(UserService);
  logging = inject(LoggingService);
  dishesStore_ = signal([]);
  allDishes_ = this.dishesStore_.asReadonly();
  constructor() {
    this.loadInitialData();
  }
  /** Re-read from storage and refresh the signal. Used by demo loader after replacing data. */
  reloadFromStorage() {
    return __async(this, null, function* () {
      yield this.loadInitialData();
    });
  }
  /** Normalize legacy mise_categories_ into prep_categories_ when loading from storage. */
  normalizeDish(d) {
    if (d.mise_categories_?.length && !d.prep_categories_?.length) {
      const _a = d, { mise_categories_ } = _a, rest2 = __objRest(_a, ["mise_categories_"]);
      return __spreadProps(__spreadValues({}, rest2), { prep_categories_: mise_categories_ });
    }
    const _b = d, { mise_categories_: _m } = _b, rest = __objRest(_b, ["mise_categories_"]);
    return rest;
  }
  loadInitialData() {
    return __async(this, null, function* () {
      const data = yield this.storage.query(ENTITY2);
      const normalized = data.map((d) => this.normalizeDish(d));
      this.dishesStore_.set(normalized);
    });
  }
  getDishById(_id) {
    return __async(this, null, function* () {
      return this.storage.get(ENTITY2, _id);
    });
  }
  addDish(newDish) {
    return __async(this, null, function* () {
      const now = Date.now();
      const userId = this.userService.user_()?._id;
      const toCreate = __spreadValues(__spreadProps(__spreadValues({}, newDish), { addedAt_: now, updatedAt_: now }), userId ? { createdBy: userId } : {});
      const saved = yield this.storage.post(ENTITY2, toCreate);
      this.dishesStore_.update((dishes) => [...dishes, saved]);
      return saved;
    });
  }
  updateDish(dish) {
    return __async(this, null, function* () {
      const existing = yield this.storage.get(ENTITY2, dish._id).catch(() => null);
      const toSave = __spreadProps(__spreadValues({}, dish), {
        addedAt_: dish.addedAt_ ?? existing?.addedAt_,
        updatedAt_: Date.now(),
        createdBy: existing?.createdBy ?? dish.createdBy,
        hiddenBy: existing?.hiddenBy ?? dish.hiddenBy
      });
      const updated = yield this.storage.put(ENTITY2, toSave);
      this.dishesStore_.update((dishes) => dishes.map((d) => d._id === updated._id ? updated : d));
      return updated;
    });
  }
  hideDish(_id) {
    return __async(this, null, function* () {
      const userId = this.userService.user_()?._id;
      if (!userId)
        throw new Error("NOT_AUTHENTICATED");
      const dish = yield this.storage.get(ENTITY2, _id);
      const hiddenBy = [.../* @__PURE__ */ new Set([...dish.hiddenBy ?? [], userId])];
      const updated = yield this.storage.put(ENTITY2, __spreadProps(__spreadValues({}, dish), { hiddenBy }));
      this.dishesStore_.update((dishes) => dishes.map((d) => d._id === _id ? updated : d));
      return updated;
    });
  }
  permanentlyDeleteDish(_id) {
    return __async(this, null, function* () {
      yield this.storage.remove(ENTITY2, _id);
      this.dishesStore_.update((dishes) => dishes.filter((d) => d._id !== _id));
      this.logging.info({ event: "crud.dish.hardDelete", message: "Dish permanently deleted", context: { entityType: ENTITY2, id: _id } });
    });
  }
  deleteDish(_id) {
    return __async(this, null, function* () {
      const dish = yield this.storage.get(ENTITY2, _id);
      const withDeleted = __spreadProps(__spreadValues({}, dish), { deletedAt: Date.now() });
      yield this.storage.appendExisting(TRASH_KEY2, withDeleted);
      yield this.storage.remove(ENTITY2, _id);
      this.dishesStore_.update((dishes) => dishes.filter((d) => d._id !== _id));
    });
  }
  getTrashDishes() {
    return __async(this, null, function* () {
      return this.storage.query(TRASH_KEY2, 0);
    });
  }
  restoreDish(_id) {
    return __async(this, null, function* () {
      const trash = yield this.storage.query(TRASH_KEY2, 0);
      const item = trash.find((d) => d._id === _id);
      if (!item)
        throw new Error(`Dish ${_id} not found in trash`);
      const _a = item, { deletedAt: _ } = _a, dish = __objRest(_a, ["deletedAt"]);
      const rest = trash.filter((d) => d._id !== _id);
      yield this.storage.replaceAll(TRASH_KEY2, rest);
      yield this.storage.appendExisting(ENTITY2, dish);
      this.dishesStore_.update((dishes) => [...dishes, dish]);
      return dish;
    });
  }
  disposeDish(_id) {
    return __async(this, null, function* () {
      const trash = yield this.storage.query(TRASH_KEY2, 0);
      const rest = trash.filter((d) => d._id !== _id);
      if (rest.length === trash.length)
        throw new Error(`Dish ${_id} not found in trash`);
      yield this.storage.replaceAll(TRASH_KEY2, rest);
    });
  }
  restoreAllDishes() {
    return __async(this, null, function* () {
      const trash = yield this.storage.query(TRASH_KEY2, 0);
      const restored = [];
      for (const item of trash) {
        const _a = item, { deletedAt: _ } = _a, dish = __objRest(_a, ["deletedAt"]);
        yield this.storage.appendExisting(ENTITY2, dish);
        restored.push(dish);
      }
      yield this.storage.replaceAll(TRASH_KEY2, []);
      this.dishesStore_.update((dishes) => [...dishes, ...restored]);
      return restored;
    });
  }
  disposeAllDishes() {
    return __async(this, null, function* () {
      yield this.storage.replaceAll(TRASH_KEY2, []);
    });
  }
  static \u0275fac = function DishDataService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _DishDataService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _DishDataService, factory: _DishDataService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DishDataService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

// src/app/core/services/product-data.service.ts
var ENTITY3 = "PRODUCT_LIST";
var TRASH_KEY3 = "TRASH_PRODUCTS";
var ProductDataService = class _ProductDataService {
  storage = inject(StorageService);
  logging = inject(LoggingService);
  // Signal now stores Product objects
  ProductsStore_ = signal([]);
  allProducts_ = this.ProductsStore_.asReadonly();
  allTopCategories_ = computed(() => {
    const Products = this.ProductsStore_();
    const categories = Products.flatMap((p) => p.categories_ ?? []).filter((cat) => !!cat);
    return Array.from(new Set(categories));
  });
  allAllergens_ = computed(() => {
    const Products = this.ProductsStore_();
    const allergens = Products.flatMap((Product) => Product.allergens_ || []);
    return Array.from(new Set(allergens));
  });
  constructor() {
    this.loadInitialData();
  }
  /** Re-read from storage and refresh the signal. Used by demo loader after replacing data. */
  reloadFromStorage() {
    return __async(this, null, function* () {
      yield this.loadInitialData();
    });
  }
  // LIST
  loadInitialData() {
    return __async(this, null, function* () {
      const raw = yield this.storage.query(ENTITY3);
      const products = raw.map((row) => this.normalizeProduct(row));
      this.ProductsStore_.set(products);
    });
  }
  normalizeProduct(row) {
    const legacy = row;
    let categories_ = legacy.categories_ ?? [];
    if (categories_.length === 0 && legacy.category_) {
      categories_ = [legacy.category_];
      if (legacy.is_dairy_ && !categories_.includes("dairy")) {
        categories_ = [...categories_, "dairy"];
      }
    }
    const supplierIds_ = legacy.supplierIds_ ?? (legacy.supplierId_ ? [legacy.supplierId_] : []);
    return {
      _id: legacy._id ?? "",
      name_hebrew: legacy.name_hebrew ?? "",
      base_unit_: legacy.base_unit_ ?? "gram",
      buy_price_global_: legacy.buy_price_global_ ?? 0,
      purchase_options_: legacy.purchase_options_ ?? [],
      categories_,
      supplierIds_,
      yield_factor_: legacy.yield_factor_ ?? 1,
      allergens_: legacy.allergens_ ?? [],
      min_stock_level_: legacy.min_stock_level_ ?? 0,
      expiry_days_default_: legacy.expiry_days_default_ ?? 0,
      addedAt_: legacy.addedAt_,
      updatedAt: legacy.updatedAt
    };
  }
  getProductById(_id) {
    return __async(this, null, function* () {
      const Product = yield this.storage.get(ENTITY3, _id);
      return Product;
    });
  }
  addProduct(newProduct) {
    return __async(this, null, function* () {
      const now = Date.now();
      const toCreate = __spreadProps(__spreadValues({}, newProduct), {
        addedAt_: newProduct.addedAt_ ?? now,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const saved = yield this.storage.post(ENTITY3, toCreate);
      this.ProductsStore_.update((products) => [...products, saved]);
      this.logging.info({ event: "crud.product.create", message: "Product created", context: { entityType: ENTITY3, id: saved._id } });
      return saved;
    });
  }
  updateProduct(product) {
    return __async(this, null, function* () {
      const existing = yield this.storage.get(ENTITY3, product._id).catch(() => null);
      const toSave = __spreadProps(__spreadValues({}, product), {
        addedAt_: product.addedAt_ ?? existing?.addedAt_,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const updated = yield this.storage.put(ENTITY3, toSave);
      this.ProductsStore_.update((products) => products.map((p) => p._id === updated._id ? updated : p));
      this.logging.info({ event: "crud.product.update", message: "Product updated", context: { entityType: ENTITY3, id: updated._id } });
    });
  }
  deleteProduct(_id) {
    return __async(this, null, function* () {
      const product = yield this.storage.get(ENTITY3, _id);
      const withDeleted = __spreadProps(__spreadValues({}, product), { deletedAt: Date.now() });
      yield this.storage.appendExisting(TRASH_KEY3, withDeleted);
      yield this.storage.remove(ENTITY3, _id);
      this.ProductsStore_.update((products) => products.filter((p) => p._id !== _id));
      this.logging.info({ event: "crud.product.delete", message: "Product deleted", context: { entityType: ENTITY3, id: _id } });
    });
  }
  getTrashProducts() {
    return __async(this, null, function* () {
      const raw = yield this.storage.query(TRASH_KEY3, 0);
      return raw.map((row) => this.normalizeTrashProduct(row));
    });
  }
  normalizeTrashProduct(row) {
    const legacy = row;
    const product = this.normalizeProduct(legacy);
    return __spreadProps(__spreadValues({}, product), { deletedAt: legacy.deletedAt });
  }
  restoreProduct(_id) {
    return __async(this, null, function* () {
      const trash = yield this.getTrashProducts();
      const item = trash.find((p) => p._id === _id);
      if (!item)
        throw new Error(`Product ${_id} not found in trash`);
      const _a = item, { deletedAt: _ } = _a, product = __objRest(_a, ["deletedAt"]);
      const rest = trash.filter((p) => p._id !== _id);
      yield this.storage.replaceAll(TRASH_KEY3, rest);
      yield this.storage.appendExisting(ENTITY3, product);
      this.ProductsStore_.update((products) => [...products, product]);
      return product;
    });
  }
  disposeProduct(_id) {
    return __async(this, null, function* () {
      const trash = yield this.getTrashProducts();
      const rest = trash.filter((p) => p._id !== _id);
      if (rest.length === trash.length)
        throw new Error(`Product ${_id} not found in trash`);
      yield this.storage.replaceAll(TRASH_KEY3, rest);
    });
  }
  restoreAllProducts() {
    return __async(this, null, function* () {
      const trash = yield this.getTrashProducts();
      const restored = [];
      for (const item of trash) {
        const _a = item, { deletedAt: _ } = _a, product = __objRest(_a, ["deletedAt"]);
        yield this.storage.appendExisting(ENTITY3, product);
        restored.push(product);
      }
      yield this.storage.replaceAll(TRASH_KEY3, []);
      this.ProductsStore_.update((products) => [...products, ...restored]);
      return restored;
    });
  }
  disposeAllProducts() {
    return __async(this, null, function* () {
      yield this.storage.replaceAll(TRASH_KEY3, []);
    });
  }
  static \u0275fac = function ProductDataService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ProductDataService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ProductDataService, factory: _ProductDataService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ProductDataService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

// src/app/core/services/version-history.service.ts
var VERSION_STORAGE_KEY = "VERSION_HISTORY";
var MAX_VERSIONS_PER_ENTITY = 20;
var VersionHistoryService = class _VersionHistoryService {
  storage = inject(StorageService);
  recipeData = inject(RecipeDataService);
  dishData = inject(DishDataService);
  productData = inject(ProductDataService);
  getVersions(entityType, entityId) {
    return __async(this, null, function* () {
      const all = yield this.storage.query(VERSION_STORAGE_KEY, 0);
      return all.filter((e) => e.entityType === entityType && e.entityId === entityId).sort((a, b) => b.versionAt - a.versionAt);
    });
  }
  getVersionEntry(entityType, entityId, versionAt) {
    return __async(this, null, function* () {
      const all = yield this.storage.query(VERSION_STORAGE_KEY, 0);
      return all.find((e) => e.entityType === entityType && e.entityId === entityId && e.versionAt === versionAt) ?? null;
    });
  }
  addVersion(entry) {
    return __async(this, null, function* () {
      const full = __spreadProps(__spreadValues({}, entry), { versionAt: Date.now() });
      const all = yield this.storage.query(VERSION_STORAGE_KEY, 0);
      all.push(full);
      const byEntity = /* @__PURE__ */ new Map();
      for (const e of all) {
        const key = `${e.entityType}:${e.entityId}`;
        if (!byEntity.has(key))
          byEntity.set(key, []);
        byEntity.get(key).push(e);
      }
      const trimmed = [];
      for (const arr of byEntity.values()) {
        const sorted = arr.sort((a, b) => b.versionAt - a.versionAt);
        trimmed.push(...sorted.slice(0, MAX_VERSIONS_PER_ENTITY));
      }
      yield this.storage.replaceAll(VERSION_STORAGE_KEY, trimmed);
    });
  }
  restoreVersion(entityType, entityId, versionAt) {
    return __async(this, null, function* () {
      const all = yield this.storage.query(VERSION_STORAGE_KEY, 0);
      const entry = all.find((e) => e.entityType === entityType && e.entityId === entityId && e.versionAt === versionAt);
      if (!entry)
        throw new Error("Version not found");
      const snapshot = entry.snapshot;
      if (entityType === "dish") {
        yield this.dishData.updateDish(snapshot);
      } else if (entityType === "recipe") {
        yield this.recipeData.updateRecipe(snapshot);
      } else {
        yield this.productData.updateProduct(snapshot);
      }
    });
  }
  /**
   * Create a new recipe/dish from a version snapshot (new _id, name with copy suffix).
   * Does not modify the current entity. Use for "Add as new" restore choice.
   */
  addVersionAsNewRecipe(entityType, entityId, versionAt) {
    return __async(this, null, function* () {
      const entry = yield this.getVersionEntry(entityType, entityId, versionAt);
      if (!entry)
        throw new Error("Version not found");
      const snapshot = entry.snapshot;
      if (entityType === "product") {
        throw new Error("addVersionAsNewRecipe only supports recipe and dish");
      }
      const recipe = snapshot;
      const copyName = `${recipe.name_hebrew} (\u05E2\u05D5\u05EA\u05E7)`;
      const _a = recipe, { _id: _ } = _a, rest = __objRest(_a, ["_id"]);
      const newRecipe = __spreadProps(__spreadValues({}, rest), {
        name_hebrew: copyName,
        recipe_type_: recipe.recipe_type_ ?? (entityType === "dish" ? "dish" : "preparation")
      });
      if (entityType === "dish") {
        return this.dishData.addDish(newRecipe);
      }
      return this.recipeData.addRecipe(newRecipe);
    });
  }
  static \u0275fac = function VersionHistoryService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _VersionHistoryService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _VersionHistoryService, factory: _VersionHistoryService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(VersionHistoryService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  ProductDataService,
  RecipeDataService,
  DishDataService,
  VersionHistoryService
};
//# sourceMappingURL=chunk-ACTKISJR.js.map
