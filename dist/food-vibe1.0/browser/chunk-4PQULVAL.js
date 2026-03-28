import {
  VersionHistoryPanelComponent
} from "./chunk-CLR4M7FF.js";
import {
  ConfirmModalService
} from "./chunk-QWCHAH6M.js";
import {
  LoaderComponent
} from "./chunk-G7HPFFIH.js";
import {
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-XDVMM5TS.js";
import {
  TranslatePipe
} from "./chunk-CH6HZ4GZ.js";
import {
  DishDataService,
  ProductDataService,
  RecipeDataService
} from "./chunk-V3KHFSXP.js";
import {
  UserMsgService
} from "./chunk-Z3W6FQFP.js";
import {
  LoggingService
} from "./chunk-ZMFT5D5F.js";
import {
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  Injectable,
  __async,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/trash.service.ts
var TrashService = class _TrashService {
  recipeData = inject(RecipeDataService);
  dishData = inject(DishDataService);
  productData = inject(ProductDataService);
  userMsg = inject(UserMsgService);
  trashDishes_ = signal([]);
  trashRecipes_ = signal([]);
  trashProducts_ = signal([]);
  trashDishes = this.trashDishes_.asReadonly();
  trashRecipes = this.trashRecipes_.asReadonly();
  trashProducts = this.trashProducts_.asReadonly();
  hasAnyTrash = computed(() => this.trashDishes_().length > 0 || this.trashRecipes_().length > 0 || this.trashProducts_().length > 0);
  loadTrash() {
    return __async(this, null, function* () {
      const [dishes, recipes, products] = yield Promise.all([
        this.dishData.getTrashDishes(),
        this.recipeData.getTrashRecipes(),
        this.productData.getTrashProducts()
      ]);
      this.trashDishes_.set(dishes);
      this.trashRecipes_.set(recipes);
      this.trashProducts_.set(products);
    });
  }
  restoreDish(_id) {
    return __async(this, null, function* () {
      yield this.dishData.restoreDish(_id);
      this.userMsg.onSetSuccessMsg("\u05D4\u05DE\u05E0\u05D4 \u05E9\u05D5\u05D7\u05D6\u05E8\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");
      yield this.loadTrash();
    });
  }
  restoreRecipe(_id) {
    return __async(this, null, function* () {
      yield this.recipeData.restoreRecipe(_id);
      this.userMsg.onSetSuccessMsg("\u05D4\u05DE\u05EA\u05DB\u05D5\u05DF \u05E9\u05D5\u05D7\u05D6\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");
      yield this.loadTrash();
    });
  }
  restoreProduct(_id) {
    return __async(this, null, function* () {
      yield this.productData.restoreProduct(_id);
      this.userMsg.onSetSuccessMsg("\u05D7\u05D5\u05DE\u05E8 \u05D4\u05D2\u05DC\u05DD \u05E9\u05D5\u05D7\u05D6\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");
      yield this.loadTrash();
    });
  }
  disposeDish(_id) {
    return __async(this, null, function* () {
      yield this.dishData.disposeDish(_id);
      this.userMsg.onSetSuccessMsg("\u05D4\u05DE\u05E0\u05D4 \u05E0\u05DE\u05D7\u05E7\u05D4 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA");
      yield this.loadTrash();
    });
  }
  disposeRecipe(_id) {
    return __async(this, null, function* () {
      yield this.recipeData.disposeRecipe(_id);
      this.userMsg.onSetSuccessMsg("\u05D4\u05DE\u05EA\u05DB\u05D5\u05DF \u05E0\u05DE\u05D7\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA");
      yield this.loadTrash();
    });
  }
  disposeProduct(_id) {
    return __async(this, null, function* () {
      yield this.productData.disposeProduct(_id);
      this.userMsg.onSetSuccessMsg("\u05D7\u05D5\u05DE\u05E8 \u05D4\u05D2\u05DC\u05DD \u05E0\u05DE\u05D7\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA");
      yield this.loadTrash();
    });
  }
  restoreAllDishes() {
    return __async(this, null, function* () {
      yield this.dishData.restoreAllDishes();
      this.userMsg.onSetSuccessMsg("\u05DB\u05DC \u05D4\u05DE\u05E0\u05D5\u05EA \u05E9\u05D5\u05D7\u05D6\u05E8\u05D5");
      yield this.loadTrash();
    });
  }
  restoreAllRecipes() {
    return __async(this, null, function* () {
      yield this.recipeData.restoreAllRecipes();
      this.userMsg.onSetSuccessMsg("\u05DB\u05DC \u05D4\u05DE\u05EA\u05DB\u05D5\u05E0\u05D9\u05DD \u05E9\u05D5\u05D7\u05D6\u05E8\u05D5");
      yield this.loadTrash();
    });
  }
  restoreAllProducts() {
    return __async(this, null, function* () {
      yield this.productData.restoreAllProducts();
      this.userMsg.onSetSuccessMsg("\u05DB\u05DC \u05D7\u05D5\u05DE\u05E8\u05D9 \u05D4\u05D2\u05DC\u05DD \u05E9\u05D5\u05D7\u05D6\u05E8\u05D5");
      yield this.loadTrash();
    });
  }
  disposeAllDishes() {
    return __async(this, null, function* () {
      yield this.dishData.disposeAllDishes();
      this.userMsg.onSetSuccessMsg("\u05DB\u05DC \u05D4\u05DE\u05E0\u05D5\u05EA \u05D1\u05D0\u05E9\u05E4\u05D4 \u05E0\u05DE\u05D7\u05E7\u05D5 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA");
      yield this.loadTrash();
    });
  }
  disposeAllRecipes() {
    return __async(this, null, function* () {
      yield this.recipeData.disposeAllRecipes();
      this.userMsg.onSetSuccessMsg("\u05DB\u05DC \u05D4\u05DE\u05EA\u05DB\u05D5\u05E0\u05D9\u05DD \u05D1\u05D0\u05E9\u05E4\u05D4 \u05E0\u05DE\u05D7\u05E7\u05D5 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA");
      yield this.loadTrash();
    });
  }
  disposeAllProducts() {
    return __async(this, null, function* () {
      yield this.productData.disposeAllProducts();
      this.userMsg.onSetSuccessMsg("\u05DB\u05DC \u05D7\u05D5\u05DE\u05E8\u05D9 \u05D4\u05D2\u05DC\u05DD \u05D1\u05D0\u05E9\u05E4\u05D4 \u05E0\u05DE\u05D7\u05E7\u05D5 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA");
      yield this.loadTrash();
    });
  }
  static \u0275fac = function TrashService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _TrashService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _TrashService, factory: _TrashService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(TrashService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/pages/trash/trash.page.ts
var _forTrack0 = ($index, $item) => $item._id;
function TrashPage_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 3);
  }
}
function TrashPage_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "button", 7);
    \u0275\u0275listener("click", function TrashPage_Conditional_10_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.refresh());
    });
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.loadError());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 2, "general.refresh_again"));
  }
}
function TrashPage_Conditional_11_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 10)(1, "button", 13);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_6_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onRestoreAllDishes());
    });
    \u0275\u0275element(2, "lucide-icon", 14);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 15);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_6_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onDisposeAllDishes());
    });
    \u0275\u0275element(6, "lucide-icon", 16);
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(4, 4, "trash_recover_all"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(8, 6, "trash_dispose_all"), " ");
  }
}
function TrashPage_Conditional_11_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 11);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "trash_empty"));
  }
}
function TrashPage_Conditional_11_Conditional_8_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "li", 17)(1, "span", 18);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 19);
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 20)(7, "button", 21);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_8_For_2_Template_button_click_7_listener() {
      const item_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openHistory("dish", item_r5._id, item_r5.name_hebrew));
    });
    \u0275\u0275text(8);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "button", 22);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_8_For_2_Template_button_click_10_listener() {
      const item_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.onRestoreDish(item_r5._id));
    });
    \u0275\u0275element(11, "lucide-icon", 14);
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "button", 23);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_8_For_2_Template_button_click_14_listener() {
      const item_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.onDisposeDish(item_r5._id));
    });
    \u0275\u0275element(15, "lucide-icon", 16);
    \u0275\u0275text(16);
    \u0275\u0275pipe(17, "translatePipe");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const item_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r5.name_hebrew);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(5, 8, "trash_deleted_at"), ": ", ctx_r1.formatDeletedAt(item_r5.deletedAt), "");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(9, 10, "history"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(13, 12, "trash_recover"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(17, 14, "trash_dispose"), " ");
  }
}
function TrashPage_Conditional_11_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "ul", 12);
    \u0275\u0275repeaterCreate(1, TrashPage_Conditional_11_Conditional_8_For_2_Template, 18, 16, "li", 17, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.dishes());
  }
}
function TrashPage_Conditional_11_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 10)(1, "button", 13);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_14_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onRestoreAllRecipes());
    });
    \u0275\u0275element(2, "lucide-icon", 14);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 15);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_14_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onDisposeAllRecipes());
    });
    \u0275\u0275element(6, "lucide-icon", 16);
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(4, 4, "trash_recover_all"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(8, 6, "trash_dispose_all"), " ");
  }
}
function TrashPage_Conditional_11_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 11);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "trash_empty"));
  }
}
function TrashPage_Conditional_11_Conditional_16_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "li", 17)(1, "span", 18);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 19);
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 20)(7, "button", 21);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_16_For_2_Template_button_click_7_listener() {
      const item_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openHistory("recipe", item_r8._id, item_r8.name_hebrew));
    });
    \u0275\u0275text(8);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "button", 22);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_16_For_2_Template_button_click_10_listener() {
      const item_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.onRestoreRecipe(item_r8._id));
    });
    \u0275\u0275element(11, "lucide-icon", 14);
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "button", 23);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_16_For_2_Template_button_click_14_listener() {
      const item_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.onDisposeRecipe(item_r8._id));
    });
    \u0275\u0275element(15, "lucide-icon", 16);
    \u0275\u0275text(16);
    \u0275\u0275pipe(17, "translatePipe");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const item_r8 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r8.name_hebrew);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(5, 8, "trash_deleted_at"), ": ", ctx_r1.formatDeletedAt(item_r8.deletedAt), "");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(9, 10, "history"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(13, 12, "trash_recover"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(17, 14, "trash_dispose"), " ");
  }
}
function TrashPage_Conditional_11_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "ul", 12);
    \u0275\u0275repeaterCreate(1, TrashPage_Conditional_11_Conditional_16_For_2_Template, 18, 16, "li", 17, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.recipes());
  }
}
function TrashPage_Conditional_11_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 10)(1, "button", 13);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_22_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onRestoreAllProducts());
    });
    \u0275\u0275element(2, "lucide-icon", 14);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 15);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_22_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onDisposeAllProducts());
    });
    \u0275\u0275element(6, "lucide-icon", 16);
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(4, 4, "trash_recover_all"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(8, 6, "trash_dispose_all"), " ");
  }
}
function TrashPage_Conditional_11_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 11);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "trash_empty"));
  }
}
function TrashPage_Conditional_11_Conditional_24_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "li", 17)(1, "span", 18);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 19);
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 20)(7, "button", 21);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_24_For_2_Template_button_click_7_listener() {
      const item_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openHistory("product", item_r11._id, item_r11.name_hebrew));
    });
    \u0275\u0275text(8);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "button", 22);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_24_For_2_Template_button_click_10_listener() {
      const item_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.onRestoreProduct(item_r11._id));
    });
    \u0275\u0275element(11, "lucide-icon", 14);
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "button", 23);
    \u0275\u0275listener("click", function TrashPage_Conditional_11_Conditional_24_For_2_Template_button_click_14_listener() {
      const item_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.onDisposeProduct(item_r11._id));
    });
    \u0275\u0275element(15, "lucide-icon", 16);
    \u0275\u0275text(16);
    \u0275\u0275pipe(17, "translatePipe");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const item_r11 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r11.name_hebrew);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(5, 8, "trash_deleted_at"), ": ", ctx_r1.formatDeletedAt(item_r11.deletedAt), "");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(9, 10, "history"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(13, 12, "trash_recover"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(17, 14, "trash_dispose"), " ");
  }
}
function TrashPage_Conditional_11_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "ul", 12);
    \u0275\u0275repeaterCreate(1, TrashPage_Conditional_11_Conditional_24_For_2_Template, 18, 16, "li", 17, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.products());
  }
}
function TrashPage_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4)(1, "section", 8)(2, "div", 9)(3, "h2");
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, TrashPage_Conditional_11_Conditional_6_Template, 9, 8, "div", 10);
    \u0275\u0275elementEnd();
    \u0275\u0275template(7, TrashPage_Conditional_11_Conditional_7_Template, 3, 3, "p", 11)(8, TrashPage_Conditional_11_Conditional_8_Template, 3, 0, "ul", 12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "section", 8)(10, "div", 9)(11, "h2");
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(14, TrashPage_Conditional_11_Conditional_14_Template, 9, 8, "div", 10);
    \u0275\u0275elementEnd();
    \u0275\u0275template(15, TrashPage_Conditional_11_Conditional_15_Template, 3, 3, "p", 11)(16, TrashPage_Conditional_11_Conditional_16_Template, 3, 0, "ul", 12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "section", 8)(18, "div", 9)(19, "h2");
    \u0275\u0275text(20);
    \u0275\u0275pipe(21, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(22, TrashPage_Conditional_11_Conditional_22_Template, 9, 8, "div", 10);
    \u0275\u0275elementEnd();
    \u0275\u0275template(23, TrashPage_Conditional_11_Conditional_23_Template, 3, 3, "p", 11)(24, TrashPage_Conditional_11_Conditional_24_Template, 3, 0, "ul", 12);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(5, 9, "trash_dishes"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.dishes().length > 0 ? 6 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.dishes().length === 0 ? 7 : 8);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(13, 11, "trash_recipes"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.recipes().length > 0 ? 14 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.recipes().length === 0 ? 15 : 16);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(21, 13, "trash_products"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.products().length > 0 ? 22 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.products().length === 0 ? 23 : 24);
  }
}
function TrashPage_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 24);
    \u0275\u0275listener("click", function TrashPage_Conditional_12_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeHistory());
    });
    \u0275\u0275elementStart(1, "div", 25);
    \u0275\u0275listener("click", function TrashPage_Conditional_12_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r12);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "app-version-history-panel", 26);
    \u0275\u0275listener("closed", function TrashPage_Conditional_12_Template_app_version_history_panel_closed_2_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeHistory());
    })("restored", function TrashPage_Conditional_12_Template_app_version_history_panel_restored_2_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.closeHistory();
      return \u0275\u0275resetView(ctx_r1.refresh());
    });
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const h_r13 = ctx;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275property("entityType", h_r13.entityType)("entityId", h_r13.entityId)("entityName", h_r13.entityName)("recoverBeforeRestore", ctx_r1.getRecoverBeforeRestore(h_r13));
  }
}
var TrashPage = class _TrashPage {
  trash = inject(TrashService);
  confirmModal = inject(ConfirmModalService);
  logging = inject(LoggingService);
  loading = signal(true);
  loadError = signal(null);
  dishes = this.trash.trashDishes;
  recipes = this.trash.trashRecipes;
  products = this.trash.trashProducts;
  historyFor_ = signal(null);
  ngOnInit() {
    return __async(this, null, function* () {
      yield this.loadTrashInternal();
    });
  }
  refresh() {
    return __async(this, null, function* () {
      this.loadError.set(null);
      yield this.loadTrashInternal();
    });
  }
  loadTrashInternal() {
    return __async(this, null, function* () {
      this.loading.set(true);
      this.loadError.set(null);
      try {
        yield this.trash.loadTrash();
      } catch (err) {
        this.logging.error({ event: "trash.load_error", message: "Trash load error", context: { err } });
        this.loadError.set(err instanceof Error ? err.message : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05D0\u05E9\u05E4\u05D4");
      } finally {
        this.loading.set(false);
      }
    });
  }
  formatDeletedAt(ts) {
    return new Date(ts).toLocaleString("he-IL", {
      dateStyle: "short",
      timeStyle: "short"
    });
  }
  onRestoreDish(id) {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_restore", {
        saveLabel: "trash_recover",
        variant: "warning"
      });
      if (ok)
        yield this.trash.restoreDish(id);
    });
  }
  onRestoreRecipe(id) {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_restore", {
        saveLabel: "trash_recover",
        variant: "warning"
      });
      if (ok)
        yield this.trash.restoreRecipe(id);
    });
  }
  onRestoreProduct(id) {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_restore", {
        saveLabel: "trash_recover",
        variant: "warning"
      });
      if (ok)
        yield this.trash.restoreProduct(id);
    });
  }
  onDisposeDish(id) {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_dispose", {
        saveLabel: "trash_dispose",
        variant: "danger"
      });
      if (ok)
        yield this.trash.disposeDish(id);
    });
  }
  onDisposeRecipe(id) {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_dispose", {
        saveLabel: "trash_dispose",
        variant: "danger"
      });
      if (ok)
        yield this.trash.disposeRecipe(id);
    });
  }
  onDisposeProduct(id) {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_dispose", {
        saveLabel: "trash_dispose",
        variant: "danger"
      });
      if (ok)
        yield this.trash.disposeProduct(id);
    });
  }
  onRestoreAllDishes() {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_restore", {
        saveLabel: "trash_recover_all",
        variant: "warning"
      });
      if (ok)
        yield this.trash.restoreAllDishes();
    });
  }
  onRestoreAllRecipes() {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_restore", {
        saveLabel: "trash_recover_all",
        variant: "warning"
      });
      if (ok)
        yield this.trash.restoreAllRecipes();
    });
  }
  onRestoreAllProducts() {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_restore", {
        saveLabel: "trash_recover_all",
        variant: "warning"
      });
      if (ok)
        yield this.trash.restoreAllProducts();
    });
  }
  onDisposeAllDishes() {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_dispose_all", {
        saveLabel: "trash_dispose_all",
        variant: "danger"
      });
      if (ok)
        yield this.trash.disposeAllDishes();
    });
  }
  onDisposeAllRecipes() {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_dispose_all", {
        saveLabel: "trash_dispose_all",
        variant: "danger"
      });
      if (ok)
        yield this.trash.disposeAllRecipes();
    });
  }
  onDisposeAllProducts() {
    return __async(this, null, function* () {
      const ok = yield this.confirmModal.open("trash_confirm_dispose_all", {
        saveLabel: "trash_dispose_all",
        variant: "danger"
      });
      if (ok)
        yield this.trash.disposeAllProducts();
    });
  }
  openHistory(entityType, entityId, entityName) {
    this.historyFor_.set({ entityType, entityId, entityName });
  }
  closeHistory() {
    this.historyFor_.set(null);
  }
  getRecoverBeforeRestore(h) {
    if (h.entityType === "dish")
      return () => this.trash.restoreDish(h.entityId);
    if (h.entityType === "recipe")
      return () => this.trash.restoreRecipe(h.entityId);
    return () => this.trash.restoreProduct(h.entityId);
  }
  static \u0275fac = function TrashPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _TrashPage)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _TrashPage, selectors: [["app-trash-page"]], decls: 13, vars: 11, consts: [["dir", "rtl", 1, "trash-page"], [1, "trash-header"], ["type", "button", 1, "btn-refresh", 3, "click", "disabled"], ["size", "medium", "label", "loader_loading"], [1, "trash-sections"], [1, "history-overlay"], [1, "trash-error"], ["type", "button", 1, "btn-refresh", 3, "click"], [1, "trash-section"], [1, "trash-section-header"], [1, "trash-section-actions"], [1, "trash-empty"], [1, "trash-list"], ["type", "button", 1, "btn-action", "btn-restore", 3, "click"], ["name", "rotate-ccw", 3, "size"], ["type", "button", 1, "btn-action", "btn-dispose", 3, "click"], ["name", "trash-2", 3, "size"], [1, "trash-item"], [1, "trash-item-name"], [1, "trash-item-meta"], [1, "trash-item-actions"], ["type", "button", 1, "btn-item", "btn-history", 3, "click"], ["type", "button", 1, "btn-item", "btn-restore", 3, "click"], ["type", "button", 1, "btn-item", "btn-dispose", 3, "click"], [1, "history-overlay", 3, "click"], [1, "history-overlay-panel", 3, "click"], [3, "closed", "restored", "entityType", "entityId", "entityName", "recoverBeforeRestore"]], template: function TrashPage_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "h1");
      \u0275\u0275text(3);
      \u0275\u0275pipe(4, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "button", 2);
      \u0275\u0275listener("click", function TrashPage_Template_button_click_5_listener() {
        return ctx.refresh();
      });
      \u0275\u0275text(6);
      \u0275\u0275pipe(7, "translatePipe");
      \u0275\u0275pipe(8, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(9, TrashPage_Conditional_9_Template, 1, 0, "app-loader", 3)(10, TrashPage_Conditional_10_Template, 5, 4)(11, TrashPage_Conditional_11_Template, 25, 15, "div", 4)(12, TrashPage_Conditional_12_Template, 3, 4, "div", 5);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_4_0;
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 5, "trash"));
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", ctx.loading());
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", ctx.loading() ? \u0275\u0275pipeBind1(7, 7, "pending") : \u0275\u0275pipeBind1(8, 9, "general.refresh"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.loading() ? 9 : ctx.loadError() ? 10 : 11);
      \u0275\u0275advance(3);
      \u0275\u0275conditional((tmp_4_0 = ctx.historyFor_()) ? 12 : -1, tmp_4_0);
    }
  }, dependencies: [CommonModule, LucideAngularModule, LucideAngularComponent, TranslatePipe, VersionHistoryPanelComponent, LoaderComponent], styles: ["\n\n.trash-page[_ngcontent-%COMP%] {\n  max-width: 45rem;\n  margin: 0 auto;\n  padding: 1.5rem;\n}\n.trash-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-block-end: 1.5rem;\n  gap: 1rem;\n}\n.trash-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n}\n.btn-refresh[_ngcontent-%COMP%] {\n  padding-inline: 1.25rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--color-text-secondary);\n  font-size: 0.875rem;\n  font-weight: 500;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.btn-refresh[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-strong);\n}\n.btn-refresh[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.trash-loading[_ngcontent-%COMP%] {\n  margin: 1rem 0;\n  color: var(--color-text-muted);\n}\n.trash-sections[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.trash-section[_ngcontent-%COMP%] {\n  padding: 1rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.trash-section-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n  margin-block-end: 0.75rem;\n}\n.trash-section-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: var(--color-text-main);\n}\n.trash-section-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n}\n.btn-action[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.35rem;\n  padding: 0.4rem 0.75rem;\n  border-radius: var(--radius-md);\n  font-size: 0.8125rem;\n  cursor: pointer;\n  border: 1px solid transparent;\n  backdrop-filter: var(--blur-glass);\n}\n.btn-action.btn-restore[_ngcontent-%COMP%] {\n  background: var(--bg-warning);\n  color: var(--text-warning);\n  border-color: var(--border-warning);\n}\n.btn-action.btn-restore[_ngcontent-%COMP%]:hover {\n  background: var(--bg-warning);\n}\n.btn-action.btn-dispose[_ngcontent-%COMP%] {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  border-color: var(--color-danger);\n}\n.btn-action.btn-dispose[_ngcontent-%COMP%]:hover {\n  background: var(--bg-danger-subtle);\n}\n.trash-empty[_ngcontent-%COMP%] {\n  margin: 0;\n  padding: 0.5rem 0;\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.trash-list[_ngcontent-%COMP%] {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n.trash-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n  padding: 0.6rem 0.75rem;\n  border-bottom: 1px solid var(--border-default);\n  background: var(--bg-pure);\n  border-radius: 6px;\n  margin-bottom: 0.35rem;\n}\n.trash-item[_ngcontent-%COMP%]:last-child {\n  margin-bottom: 0;\n  border-bottom: none;\n}\n.trash-item-name[_ngcontent-%COMP%] {\n  font-weight: 500;\n  min-width: 0;\n  flex: 1 1 120px;\n}\n.trash-item-meta[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  color: var(--color-text-muted);\n}\n.trash-item-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.35rem;\n  margin-right: auto;\n}\n.btn-item[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.3rem 0.6rem;\n  border-radius: 4px;\n  font-size: 0.75rem;\n  cursor: pointer;\n  border: 1px solid transparent;\n}\n.btn-item.btn-restore[_ngcontent-%COMP%] {\n  background: var(--bg-warning);\n  color: var(--text-warning);\n  border-color: var(--border-warning);\n}\n.btn-item.btn-restore[_ngcontent-%COMP%]:hover {\n  background: var(--bg-warning);\n}\n.btn-item.btn-dispose[_ngcontent-%COMP%] {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  border-color: var(--color-danger);\n}\n.btn-item.btn-dispose[_ngcontent-%COMP%]:hover {\n  background: var(--bg-danger-subtle);\n}\n.btn-item.btn-history[_ngcontent-%COMP%] {\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  border-color: var(--border-default);\n}\n.btn-item.btn-history[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-strong);\n}\n.history-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: var(--overlay-backdrop);\n  backdrop-filter: blur(6px);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.history-overlay-panel[_ngcontent-%COMP%] {\n  max-height: 90vh;\n  overflow: auto;\n}\n@media (max-width: 768px) {\n  .trash-page[_ngcontent-%COMP%] {\n    padding: 1rem;\n  }\n  .trash-header[_ngcontent-%COMP%] {\n    flex-direction: column;\n    align-items: stretch;\n    gap: 0.75rem;\n  }\n  .trash-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n    font-size: 1.25rem;\n    text-align: center;\n  }\n  .trash-header[_ngcontent-%COMP%]   .btn-refresh[_ngcontent-%COMP%] {\n    width: 100%;\n    justify-content: center;\n  }\n  .trash-section-header[_ngcontent-%COMP%] {\n    flex-direction: column;\n    align-items: stretch;\n    gap: 0.5rem;\n  }\n  .trash-section-actions[_ngcontent-%COMP%] {\n    display: flex;\n    gap: 0.5rem;\n  }\n  .trash-section-actions[_ngcontent-%COMP%]   .btn-action[_ngcontent-%COMP%] {\n    flex: 1;\n    justify-content: center;\n    font-size: 0.75rem;\n  }\n  .trash-item[_ngcontent-%COMP%] {\n    flex-direction: column;\n    align-items: stretch;\n    gap: 0.5rem;\n  }\n  .trash-item[_ngcontent-%COMP%]   .trash-item-actions[_ngcontent-%COMP%] {\n    display: flex;\n    gap: 0.25rem;\n    justify-content: flex-end;\n  }\n}\n/*# sourceMappingURL=trash.page.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(TrashPage, [{
    type: Component,
    args: [{ selector: "app-trash-page", standalone: true, imports: [CommonModule, LucideAngularModule, TranslatePipe, VersionHistoryPanelComponent, LoaderComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="trash-page" dir="rtl">\r
  <header class="trash-header">\r
    <h1>{{ 'trash' | translatePipe }}</h1>\r
    <button type="button" class="btn-refresh" (click)="refresh()" [disabled]="loading()">\r
      {{ loading() ? ('pending' | translatePipe) : ('general.refresh' | translatePipe) }}\r
    </button>\r
  </header>\r
\r
  @if (loading()) {\r
    <app-loader size="medium" label="loader_loading" />\r
  } @else if (loadError()) {\r
    <p class="trash-error">{{ loadError() }}</p>\r
    <button type="button" class="btn-refresh" (click)="refresh()">{{ 'general.refresh_again' | translatePipe }}</button>\r
  } @else {\r
    <div class="trash-sections">\r
      <!-- 1. Dishes -->\r
      <section class="trash-section">\r
        <div class="trash-section-header">\r
          <h2>{{ 'trash_dishes' | translatePipe }}</h2>\r
          @if (dishes().length > 0) {\r
            <div class="trash-section-actions">\r
              <button type="button" class="btn-action btn-restore" (click)="onRestoreAllDishes()">\r
                <lucide-icon name="rotate-ccw" [size]="16"></lucide-icon>\r
                {{ 'trash_recover_all' | translatePipe }}\r
              </button>\r
              <button type="button" class="btn-action btn-dispose" (click)="onDisposeAllDishes()">\r
                <lucide-icon name="trash-2" [size]="16"></lucide-icon>\r
                {{ 'trash_dispose_all' | translatePipe }}\r
              </button>\r
            </div>\r
          }\r
        </div>\r
        @if (dishes().length === 0) {\r
          <p class="trash-empty">{{ 'trash_empty' | translatePipe }}</p>\r
        } @else {\r
          <ul class="trash-list">\r
            @for (item of dishes(); track item._id) {\r
              <li class="trash-item">\r
                <span class="trash-item-name">{{ item.name_hebrew }}</span>\r
                <span class="trash-item-meta">{{ 'trash_deleted_at' | translatePipe }}: {{ formatDeletedAt(item.deletedAt) }}</span>\r
                <div class="trash-item-actions">\r
                  <button type="button" class="btn-item btn-history" (click)="openHistory('dish', item._id, item.name_hebrew)">\r
                    {{ 'history' | translatePipe }}\r
                  </button>\r
                  <button type="button" class="btn-item btn-restore" (click)="onRestoreDish(item._id)">\r
                    <lucide-icon name="rotate-ccw" [size]="14"></lucide-icon>\r
                    {{ 'trash_recover' | translatePipe }}\r
                  </button>\r
                  <button type="button" class="btn-item btn-dispose" (click)="onDisposeDish(item._id)">\r
                    <lucide-icon name="trash-2" [size]="14"></lucide-icon>\r
                    {{ 'trash_dispose' | translatePipe }}\r
                  </button>\r
                </div>\r
              </li>\r
            }\r
          </ul>\r
        }\r
      </section>\r
\r
      <!-- 2. Recipes -->\r
      <section class="trash-section">\r
        <div class="trash-section-header">\r
          <h2>{{ 'trash_recipes' | translatePipe }}</h2>\r
          @if (recipes().length > 0) {\r
            <div class="trash-section-actions">\r
              <button type="button" class="btn-action btn-restore" (click)="onRestoreAllRecipes()">\r
                <lucide-icon name="rotate-ccw" [size]="16"></lucide-icon>\r
                {{ 'trash_recover_all' | translatePipe }}\r
              </button>\r
              <button type="button" class="btn-action btn-dispose" (click)="onDisposeAllRecipes()">\r
                <lucide-icon name="trash-2" [size]="16"></lucide-icon>\r
                {{ 'trash_dispose_all' | translatePipe }}\r
              </button>\r
            </div>\r
          }\r
        </div>\r
        @if (recipes().length === 0) {\r
          <p class="trash-empty">{{ 'trash_empty' | translatePipe }}</p>\r
        } @else {\r
          <ul class="trash-list">\r
            @for (item of recipes(); track item._id) {\r
              <li class="trash-item">\r
                <span class="trash-item-name">{{ item.name_hebrew }}</span>\r
                <span class="trash-item-meta">{{ 'trash_deleted_at' | translatePipe }}: {{ formatDeletedAt(item.deletedAt) }}</span>\r
                <div class="trash-item-actions">\r
                  <button type="button" class="btn-item btn-history" (click)="openHistory('recipe', item._id, item.name_hebrew)">\r
                    {{ 'history' | translatePipe }}\r
                  </button>\r
                  <button type="button" class="btn-item btn-restore" (click)="onRestoreRecipe(item._id)">\r
                    <lucide-icon name="rotate-ccw" [size]="14"></lucide-icon>\r
                    {{ 'trash_recover' | translatePipe }}\r
                  </button>\r
                  <button type="button" class="btn-item btn-dispose" (click)="onDisposeRecipe(item._id)">\r
                    <lucide-icon name="trash-2" [size]="14"></lucide-icon>\r
                    {{ 'trash_dispose' | translatePipe }}\r
                  </button>\r
                </div>\r
              </li>\r
            }\r
          </ul>\r
        }\r
      </section>\r
\r
      <!-- 3. Products (last) -->\r
      <section class="trash-section">\r
        <div class="trash-section-header">\r
          <h2>{{ 'trash_products' | translatePipe }}</h2>\r
          @if (products().length > 0) {\r
            <div class="trash-section-actions">\r
              <button type="button" class="btn-action btn-restore" (click)="onRestoreAllProducts()">\r
                <lucide-icon name="rotate-ccw" [size]="16"></lucide-icon>\r
                {{ 'trash_recover_all' | translatePipe }}\r
              </button>\r
              <button type="button" class="btn-action btn-dispose" (click)="onDisposeAllProducts()">\r
                <lucide-icon name="trash-2" [size]="16"></lucide-icon>\r
                {{ 'trash_dispose_all' | translatePipe }}\r
              </button>\r
            </div>\r
          }\r
        </div>\r
        @if (products().length === 0) {\r
          <p class="trash-empty">{{ 'trash_empty' | translatePipe }}</p>\r
        } @else {\r
          <ul class="trash-list">\r
            @for (item of products(); track item._id) {\r
              <li class="trash-item">\r
                <span class="trash-item-name">{{ item.name_hebrew }}</span>\r
                <span class="trash-item-meta">{{ 'trash_deleted_at' | translatePipe }}: {{ formatDeletedAt(item.deletedAt) }}</span>\r
                <div class="trash-item-actions">\r
                  <button type="button" class="btn-item btn-history" (click)="openHistory('product', item._id, item.name_hebrew)">\r
                    {{ 'history' | translatePipe }}\r
                  </button>\r
                  <button type="button" class="btn-item btn-restore" (click)="onRestoreProduct(item._id)">\r
                    <lucide-icon name="rotate-ccw" [size]="14"></lucide-icon>\r
                    {{ 'trash_recover' | translatePipe }}\r
                  </button>\r
                  <button type="button" class="btn-item btn-dispose" (click)="onDisposeProduct(item._id)">\r
                    <lucide-icon name="trash-2" [size]="14"></lucide-icon>\r
                    {{ 'trash_dispose' | translatePipe }}\r
                  </button>\r
                </div>\r
              </li>\r
            }\r
          </ul>\r
        }\r
      </section>\r
    </div>\r
  }\r
\r
  @if (historyFor_(); as h) {\r
    <div class="history-overlay" (click)="closeHistory()">\r
      <div class="history-overlay-panel" (click)="$event.stopPropagation()">\r
        <app-version-history-panel\r
          [entityType]="h.entityType"\r
          [entityId]="h.entityId"\r
          [entityName]="h.entityName"\r
          [recoverBeforeRestore]="getRecoverBeforeRestore(h)"\r
          (closed)="closeHistory()"\r
          (restored)="closeHistory(); refresh()"\r
        />\r
      </div>\r
    </div>\r
  }\r
</div>\r
`, styles: ["/* src/app/pages/trash/trash.page.scss */\n.trash-page {\n  max-width: 45rem;\n  margin: 0 auto;\n  padding: 1.5rem;\n}\n.trash-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-block-end: 1.5rem;\n  gap: 1rem;\n}\n.trash-header h1 {\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n}\n.btn-refresh {\n  padding-inline: 1.25rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--color-text-secondary);\n  font-size: 0.875rem;\n  font-weight: 500;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.btn-refresh:hover:not(:disabled) {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-strong);\n}\n.btn-refresh:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.trash-loading {\n  margin: 1rem 0;\n  color: var(--color-text-muted);\n}\n.trash-sections {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.trash-section {\n  padding: 1rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.trash-section-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n  margin-block-end: 0.75rem;\n}\n.trash-section-header h2 {\n  margin: 0;\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: var(--color-text-main);\n}\n.trash-section-actions {\n  display: flex;\n  gap: 0.5rem;\n}\n.btn-action {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.35rem;\n  padding: 0.4rem 0.75rem;\n  border-radius: var(--radius-md);\n  font-size: 0.8125rem;\n  cursor: pointer;\n  border: 1px solid transparent;\n  backdrop-filter: var(--blur-glass);\n}\n.btn-action.btn-restore {\n  background: var(--bg-warning);\n  color: var(--text-warning);\n  border-color: var(--border-warning);\n}\n.btn-action.btn-restore:hover {\n  background: var(--bg-warning);\n}\n.btn-action.btn-dispose {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  border-color: var(--color-danger);\n}\n.btn-action.btn-dispose:hover {\n  background: var(--bg-danger-subtle);\n}\n.trash-empty {\n  margin: 0;\n  padding: 0.5rem 0;\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.trash-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n.trash-item {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n  padding: 0.6rem 0.75rem;\n  border-bottom: 1px solid var(--border-default);\n  background: var(--bg-pure);\n  border-radius: 6px;\n  margin-bottom: 0.35rem;\n}\n.trash-item:last-child {\n  margin-bottom: 0;\n  border-bottom: none;\n}\n.trash-item-name {\n  font-weight: 500;\n  min-width: 0;\n  flex: 1 1 120px;\n}\n.trash-item-meta {\n  font-size: 0.8125rem;\n  color: var(--color-text-muted);\n}\n.trash-item-actions {\n  display: flex;\n  gap: 0.35rem;\n  margin-right: auto;\n}\n.btn-item {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.3rem 0.6rem;\n  border-radius: 4px;\n  font-size: 0.75rem;\n  cursor: pointer;\n  border: 1px solid transparent;\n}\n.btn-item.btn-restore {\n  background: var(--bg-warning);\n  color: var(--text-warning);\n  border-color: var(--border-warning);\n}\n.btn-item.btn-restore:hover {\n  background: var(--bg-warning);\n}\n.btn-item.btn-dispose {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  border-color: var(--color-danger);\n}\n.btn-item.btn-dispose:hover {\n  background: var(--bg-danger-subtle);\n}\n.btn-item.btn-history {\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  border-color: var(--border-default);\n}\n.btn-item.btn-history:hover {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-strong);\n}\n.history-overlay {\n  position: fixed;\n  inset: 0;\n  background: var(--overlay-backdrop);\n  backdrop-filter: blur(6px);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.history-overlay-panel {\n  max-height: 90vh;\n  overflow: auto;\n}\n@media (max-width: 768px) {\n  .trash-page {\n    padding: 1rem;\n  }\n  .trash-header {\n    flex-direction: column;\n    align-items: stretch;\n    gap: 0.75rem;\n  }\n  .trash-header h1 {\n    font-size: 1.25rem;\n    text-align: center;\n  }\n  .trash-header .btn-refresh {\n    width: 100%;\n    justify-content: center;\n  }\n  .trash-section-header {\n    flex-direction: column;\n    align-items: stretch;\n    gap: 0.5rem;\n  }\n  .trash-section-actions {\n    display: flex;\n    gap: 0.5rem;\n  }\n  .trash-section-actions .btn-action {\n    flex: 1;\n    justify-content: center;\n    font-size: 0.75rem;\n  }\n  .trash-item {\n    flex-direction: column;\n    align-items: stretch;\n    gap: 0.5rem;\n  }\n  .trash-item .trash-item-actions {\n    display: flex;\n    gap: 0.25rem;\n    justify-content: flex-end;\n  }\n}\n/*# sourceMappingURL=trash.page.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(TrashPage, { className: "TrashPage", filePath: "src/app/pages/trash/trash.page.ts", lineNumber: 26 });
})();

export {
  TrashPage
};
//# sourceMappingURL=chunk-4PQULVAL.js.map
