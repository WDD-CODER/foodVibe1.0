import {
  SupplierDataService
} from "./chunk-IFJ5YUTT.js";
import {
  DishDataService,
  ProductDataService,
  RecipeDataService,
  VersionHistoryService
} from "./chunk-ACTKISJR.js";
import {
  UserService
} from "./chunk-VOTRTAY7.js";
import {
  ActivityLogService,
  UserMsgService
} from "./chunk-WYZGJ7UG.js";
import {
  Injectable,
  __async,
  __objRest,
  catchError,
  computed,
  from,
  inject,
  map,
  of,
  setClassMetadata,
  signal,
  switchMap,
  tap,
  throwError,
  ɵɵdefineInjectable
} from "./chunk-GCYOWW7U.js";

// src/app/core/services/kitchen-state.service.ts
var KitchenStateService = class _KitchenStateService {
  productDataService = inject(ProductDataService);
  recipeDataService = inject(RecipeDataService);
  dishDataService = inject(DishDataService);
  supplierDataService = inject(SupplierDataService);
  userMsgService = inject(UserMsgService);
  userService = inject(UserService);
  activityLogService = inject(ActivityLogService);
  versionHistoryService = inject(VersionHistoryService);
  // CORE SIGNALS
  products_ = computed(() => this.productDataService.allProducts_());
  /** Combined recipes (preparations) + dishes for ingredient search and lookup. */
  recipes_ = computed(() => [
    ...this.recipeDataService.allRecipes_(),
    ...this.dishDataService.allDishes_()
  ]);
  /** Recipes visible to the current user — hides entries where the user's id is in hiddenBy[]. */
  visibleRecipes_ = computed(() => {
    const userId = this.userService.user_()?._id;
    return this.recipes_().filter((r) => !userId || !(r.hiddenBy ?? []).includes(userId));
  });
  suppliers_ = computed(() => this.supplierDataService.allSuppliers_());
  selectedProductId_ = signal(null);
  isDrawerOpen_ = signal(false);
  // COMPUTED SIGNALS
  lowStockProducts_ = computed(() => this.products_().filter((p) => p.min_stock_level_ > 0));
  saveProduct(product) {
    const isUpdate = !!(product._id && product._id.trim() !== "");
    const isDuplicate = this.products_().some((p) => p.name_hebrew.trim() === product.name_hebrew.trim() && p._id !== product._id);
    if (isDuplicate) {
      this.userMsgService.onSetErrorMsg("\u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD \u05D7\u05D5\u05DE\u05E8 \u05D2\u05DC\u05DD \u05D1\u05E9\u05DD \u05D6\u05D4 - \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05DE\u05D5\u05E8");
      return throwError(() => new Error("Duplicate product name"));
    }
    if (isUpdate) {
      const previous = this.products_().find((p) => p._id === product._id) ?? null;
      const changes = previous ? this.buildProductChanges(previous, product) : [];
      return from(previous ? this.versionHistoryService.addVersion({
        entityType: "product",
        entityId: previous._id,
        entityName: previous.name_hebrew,
        snapshot: previous,
        changes
      }) : Promise.resolve()).pipe(switchMap(() => from(this.productDataService.updateProduct(product))), tap(() => {
        this.userMsgService.onSetSuccessMsg("\u05D4\u05DE\u05D5\u05E6\u05E8 \u05E2\u05D5\u05D3\u05DB\u05DF \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");
        this.activityLogService.recordActivity({
          action: "updated",
          entityType: "product",
          entityId: product._id,
          entityName: product.name_hebrew,
          changes
        });
      }), map(() => void 0), catchError((err) => {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05D4\u05DE\u05D5\u05E6\u05E8");
        return throwError(() => err);
      }));
    } else {
      return from(this.productDataService.addProduct(product)).pipe(tap((saved) => {
        this.userMsgService.onSetSuccessMsg("\u05D7\u05D5\u05DE\u05E8 \u05D2\u05DC\u05DD \u05E0\u05D5\u05E1\u05E3 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");
        this.activityLogService.recordActivity({
          action: "created",
          entityType: "product",
          entityId: saved._id,
          entityName: saved.name_hebrew,
          changes: []
        });
      }), map(() => void 0), catchError((err) => {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05D5\u05E1\u05E4\u05EA \u05D4\u05DE\u05D5\u05E6\u05E8");
        return throwError(() => err);
      }));
    }
  }
  /** Build structured change list between two products for activity log. */
  buildProductChanges(prev, next) {
    const changes = [];
    if (prev.name_hebrew !== next.name_hebrew) {
      changes.push({
        field: "name",
        label: "activity_field_name",
        from: prev.name_hebrew,
        to: next.name_hebrew
      });
    }
    if (prev.buy_price_global_ !== next.buy_price_global_) {
      changes.push({
        field: "price",
        label: "activity_field_price",
        from: `${prev.buy_price_global_} \u20AA`,
        to: `${next.buy_price_global_} \u20AA`
      });
    }
    if (prev.base_unit_ !== next.base_unit_) {
      changes.push({
        field: "unit",
        label: "activity_field_unit",
        from: prev.base_unit_,
        to: next.base_unit_
      });
    }
    const prevSupp = (prev.supplierIds_ ?? []).slice().sort().join(",");
    const nextSupp = (next.supplierIds_ ?? []).slice().sort().join(",");
    if (prevSupp !== nextSupp) {
      changes.push({
        field: "supplier",
        label: "activity_field_supplier",
        from: prevSupp || void 0,
        to: nextSupp || void 0
      });
    }
    const prevCat = (prev.categories_ ?? []).slice().sort().join(",");
    const nextCat = (next.categories_ ?? []).slice().sort().join(",");
    if (prevCat !== nextCat) {
      changes.push({
        field: "category",
        label: "activity_field_category",
        from: prevCat || void 0,
        to: nextCat || void 0
      });
    }
    const prevAll = (prev.allergens_ ?? []).slice().sort().join(",");
    const nextAll = (next.allergens_ ?? []).slice().sort().join(",");
    if (prevAll !== nextAll) {
      changes.push({
        field: "allergens",
        label: "activity_field_allergens",
        from: prevAll || void 0,
        to: nextAll || void 0
      });
    }
    if ((prev.min_stock_level_ ?? 0) !== (next.min_stock_level_ ?? 0)) {
      changes.push({
        field: "min_stock_level",
        label: "activity_field_min_stock",
        from: String(prev.min_stock_level_ ?? 0),
        to: String(next.min_stock_level_ ?? 0)
      });
    }
    if ((prev.expiry_days_default_ ?? 0) !== (next.expiry_days_default_ ?? 0)) {
      changes.push({
        field: "expiry_days_default",
        label: "activity_field_expiry_days",
        from: String(prev.expiry_days_default_ ?? 0),
        to: String(next.expiry_days_default_ ?? 0)
      });
    }
    if (Math.abs((prev.yield_factor_ ?? 1) - (next.yield_factor_ ?? 1)) > 1e-3) {
      changes.push({
        field: "yield_factor",
        label: "activity_field_yield_factor",
        from: String(prev.yield_factor_ ?? 1),
        to: String(next.yield_factor_ ?? 1)
      });
    }
    if ((prev.purchase_options_?.length ?? 0) !== (next.purchase_options_?.length ?? 0)) {
      const prevUnits = (prev.purchase_options_ ?? []).map((o) => o.unit_symbol_).join(", ");
      const nextUnits = (next.purchase_options_ ?? []).map((o) => o.unit_symbol_).join(", ");
      changes.push({
        field: "purchase_options",
        label: "activity_field_purchase_options",
        from: prevUnits || void 0,
        to: nextUnits || void 0
      });
    } else if ((prev.purchase_options_?.length ?? 0) > 0) {
      const prevOpts = JSON.stringify(prev.purchase_options_ ?? []);
      const nextOpts = JSON.stringify(next.purchase_options_ ?? []);
      if (prevOpts !== nextOpts) {
        const prevUnits = (prev.purchase_options_ ?? []).map((o) => o.unit_symbol_).join(", ");
        const nextUnits = (next.purchase_options_ ?? []).map((o) => o.unit_symbol_).join(", ");
        changes.push({
          field: "purchase_options",
          label: "activity_field_purchase_options",
          from: prevUnits || void 0,
          to: nextUnits || void 0
        });
      }
    }
    return changes;
  }
  deleteProduct(_id) {
    const existing = this.products_().find((p) => p._id === _id);
    const entityName = existing?.name_hebrew ?? _id;
    return of(null).pipe(switchMap(() => {
      const exists = this.products_().some((p) => p._id === _id);
      if (!exists)
        return throwError(() => new Error("NOT_FOUND"));
      return from(this.productDataService.deleteProduct(_id));
    }), tap(() => {
      this.userMsgService.onSetSuccessMsg("\u05D7\u05D5\u05DE\u05E8 \u05D4\u05D2\u05DC\u05DD \u05E0\u05DE\u05D7\u05E7 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");
      this.activityLogService.recordActivity({
        action: "deleted",
        entityType: "product",
        entityId: _id,
        entityName
      });
    }), catchError((err) => {
      const msg = err.message === "NOT_FOUND" ? "\u05D4\u05E4\u05E8\u05D9\u05D8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0" : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05EA \u05D4\u05DE\u05D7\u05D9\u05E7\u05D4";
      this.userMsgService.onSetErrorMsg(msg);
      return throwError(() => err);
    }));
  }
  // RECIPE / DISH CRUD
  deleteRecipe(recipe) {
    const isDish = recipe.recipe_type_ === "dish" || !!(recipe.prep_items_?.length || recipe.prep_categories_?.length);
    const operation$ = isDish ? from(this.dishDataService.deleteDish(recipe._id)) : from(this.recipeDataService.deleteRecipe(recipe._id));
    return operation$.pipe(tap(() => {
      const msg = isDish ? "\u05D4\u05DE\u05E0\u05D4 \u05E0\u05DE\u05D7\u05E7\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4" : "\u05D4\u05DE\u05EA\u05DB\u05D5\u05DF \u05E0\u05DE\u05D7\u05E7 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4";
      this.userMsgService.onSetSuccessMsg(msg);
      this.activityLogService.recordActivity({
        action: "deleted",
        entityType: isDish ? "dish" : "recipe",
        entityId: recipe._id,
        entityName: recipe.name_hebrew
      });
    }), catchError(() => {
      const errorMsg = isDish ? "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05D4\u05DE\u05E0\u05D4" : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05D4\u05DE\u05EA\u05DB\u05D5\u05DF";
      this.userMsgService.onSetErrorMsg(errorMsg);
      return throwError(() => new Error(errorMsg));
    }));
  }
  hideRecipe(recipe) {
    const isDish = recipe.recipe_type_ === "dish" || !!(recipe.prep_items_?.length || recipe.prep_categories_?.length);
    const operation$ = isDish ? from(this.dishDataService.hideDish(recipe._id)) : from(this.recipeDataService.hideRecipe(recipe._id));
    return operation$.pipe(catchError((err) => {
      const msg = err instanceof Error && err.message === "NOT_AUTHENTICATED" ? "\u05D9\u05E9 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05E1\u05EA\u05D9\u05E8 \u05DE\u05EA\u05DB\u05D5\u05DF" : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E1\u05EA\u05E8\u05EA \u05D4\u05DE\u05EA\u05DB\u05D5\u05DF";
      this.userMsgService.onSetErrorMsg(msg);
      return throwError(() => err);
    }));
  }
  permanentlyDeleteRecipe(recipe) {
    const user = this.userService.user_();
    if (!user)
      return throwError(() => new Error("NOT_AUTHENTICATED"));
    if (user.role !== "admin")
      return throwError(() => new Error("NOT_AUTHORIZED"));
    const isDish = recipe.recipe_type_ === "dish" || !!(recipe.prep_items_?.length || recipe.prep_categories_?.length);
    const operation$ = isDish ? from(this.dishDataService.permanentlyDeleteDish(recipe._id)) : from(this.recipeDataService.permanentlyDeleteRecipe(recipe._id));
    return operation$.pipe(tap(() => {
      this.userMsgService.onSetSuccessMsg(isDish ? "\u05D4\u05DE\u05E0\u05D4 \u05E0\u05DE\u05D7\u05E7\u05D4 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA" : "\u05D4\u05DE\u05EA\u05DB\u05D5\u05DF \u05E0\u05DE\u05D7\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA");
      this.activityLogService.recordActivity({
        action: "deleted",
        entityType: isDish ? "dish" : "recipe",
        entityId: recipe._id,
        entityName: recipe.name_hebrew
      });
    }), catchError(() => {
      this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05D4 \u05D4\u05E7\u05D1\u05D5\u05E2\u05D4");
      return throwError(() => new Error("permanentDelete failed"));
    }));
  }
  saveRecipe(recipe) {
    const isDish = recipe.recipe_type_ === "dish" || !!(recipe.prep_items_?.length || recipe.prep_categories_?.length);
    const isUpdate = !!(recipe._id && recipe._id.trim() !== "");
    const previous = isUpdate ? this.recipes_().find((r) => r._id === recipe._id) : null;
    const previousIsDish = previous ? previous.recipe_type_ === "dish" || !!(previous.prep_items_?.length || previous.prep_categories_?.length) : false;
    const typeChanged = isUpdate && !!previous && previousIsDish !== isDish;
    const entityType = isDish ? "dish" : "recipe";
    const previousEntityType = previousIsDish ? "dish" : "recipe";
    const recordVersion$ = isUpdate && previous ? from(this.versionHistoryService.addVersion({
      entityType: typeChanged ? previousEntityType : entityType,
      entityId: previous._id,
      entityName: previous.name_hebrew,
      snapshot: previous,
      changes: this.buildRecipeChanges(previous, recipe)
    })) : from(Promise.resolve());
    const operation$ = typeChanged ? recordVersion$.pipe(switchMap(() => this.deleteRecipe(previous)), switchMap(() => {
      const _a = recipe, { _id: _omit } = _a, payload = __objRest(_a, ["_id"]);
      return isDish ? from(this.dishDataService.addDish(payload)) : from(this.recipeDataService.addRecipe(payload));
    })) : recordVersion$.pipe(switchMap(() => isDish ? isUpdate ? from(this.dishDataService.updateDish(recipe)) : from(this.dishDataService.addDish(recipe)) : isUpdate ? from(this.recipeDataService.updateRecipe(recipe)) : from(this.recipeDataService.addRecipe(recipe))));
    const fallbackErrorMsg = isDish ? isUpdate ? "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05D4\u05DE\u05E0\u05D4" : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05DE\u05E0\u05D4" : isUpdate ? "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05D4\u05DE\u05EA\u05DB\u05D5\u05DF" : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05DE\u05EA\u05DB\u05D5\u05DF";
    return operation$.pipe(tap((saved) => {
      const msg = typeChanged ? "\u05D4\u05DE\u05EA\u05DB\u05D5\u05DF/\u05D4\u05DE\u05E0\u05D4 \u05E9\u05D5\u05E0\u05D4 \u05DC\u05E1\u05D5\u05D2 \u05D4\u05D7\u05D3\u05E9 \u05D5\u05E0\u05E9\u05DE\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4" : isDish ? isUpdate ? "\u05D4\u05DE\u05E0\u05D4 \u05E2\u05D5\u05D3\u05DB\u05E0\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4" : "\u05D4\u05DE\u05E0\u05D4 \u05E0\u05E9\u05DE\u05E8\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4" : isUpdate ? "\u05D4\u05DE\u05EA\u05DB\u05D5\u05DF \u05E2\u05D5\u05D3\u05DB\u05DF \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4" : "\u05D4\u05DE\u05EA\u05DB\u05D5\u05DF \u05E0\u05E9\u05DE\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4";
      this.userMsgService.onSetSuccessMsg(msg);
      const changes = isUpdate && previous ? this.buildRecipeChanges(previous, saved) : [];
      this.activityLogService.recordActivity({
        action: typeChanged ? "created" : isUpdate ? "updated" : "created",
        entityType: isDish ? "dish" : "recipe",
        entityId: saved._id,
        entityName: saved.name_hebrew,
        changes
      });
    }), catchError((err) => {
      const msg = err && typeof err === "object" && err.error?.message || (err instanceof Error ? err.message : null) || fallbackErrorMsg;
      this.userMsgService.onSetErrorMsg(String(msg));
      return throwError(() => err instanceof Error ? err : new Error(String(msg)));
    }));
  }
  /** Build structured change list between two recipes/dishes for activity log. */
  buildRecipeChanges(prev, next) {
    const changes = [];
    if (prev.name_hebrew !== next.name_hebrew) {
      changes.push({
        field: "name",
        label: "activity_field_name",
        from: prev.name_hebrew,
        to: next.name_hebrew
      });
    }
    if ((prev.ingredients_?.length ?? 0) !== (next.ingredients_?.length ?? 0)) {
      changes.push({
        field: "ingredients_count",
        label: "activity_field_ingredients_count",
        from: String(prev.ingredients_?.length ?? 0),
        to: String(next.ingredients_?.length ?? 0)
      });
    }
    if ((prev.steps_?.length ?? 0) !== (next.steps_?.length ?? 0)) {
      changes.push({
        field: "steps_count",
        label: "activity_field_steps_count",
        from: String(prev.steps_?.length ?? 0),
        to: String(next.steps_?.length ?? 0)
      });
    }
    if ((prev.yield_amount_ ?? 0) !== (next.yield_amount_ ?? 0) || (prev.yield_unit_ ?? "") !== (next.yield_unit_ ?? "")) {
      changes.push({
        field: "yield",
        label: "activity_field_yield",
        from: `${prev.yield_amount_ ?? 0} ${prev.yield_unit_ ?? ""}`.trim(),
        to: `${next.yield_amount_ ?? 0} ${next.yield_unit_ ?? ""}`.trim()
      });
    }
    if ((prev.prep_items_?.length ?? 0) !== (next.prep_items_?.length ?? 0)) {
      changes.push({
        field: "prep_items",
        label: "activity_field_prep_items",
        from: String(prev.prep_items_?.length ?? 0),
        to: String(next.prep_items_?.length ?? 0)
      });
    }
    return changes;
  }
  // SUPPLIER CRUD
  addSupplier(supplier) {
    return __async(this, null, function* () {
      return this.supplierDataService.addSupplier(supplier);
    });
  }
  static \u0275fac = function KitchenStateService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _KitchenStateService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _KitchenStateService, factory: _KitchenStateService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(KitchenStateService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

export {
  KitchenStateService
};
//# sourceMappingURL=chunk-ZA4PDXUK.js.map
