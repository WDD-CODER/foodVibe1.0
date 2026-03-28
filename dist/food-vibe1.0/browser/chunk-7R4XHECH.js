import {
  ApproveStampComponent,
  CounterComponent,
  RecipeFormService,
  RecipeWorkflowComponent
} from "./chunk-6NQ7WT4T.js";
import "./chunk-QEXSSWBW.js";
import {
  ExportPreviewComponent,
  ExportService,
  ScalingService,
  quantityDecrement,
  quantityIncrement
} from "./chunk-2TO4KQLZ.js";
import "./chunk-JESWAVQP.js";
import {
  RecipeCostService
} from "./chunk-EQWFIXKS.js";
import "./chunk-L5OF4TL7.js";
import "./chunk-CORZEXIN.js";
import "./chunk-RXL6AQUB.js";
import {
  UnitRegistryService
} from "./chunk-UA66Z5WI.js";
import {
  ConfirmModalService
} from "./chunk-QWCHAH6M.js";
import "./chunk-7STEE3M4.js";
import {
  HeroFabService
} from "./chunk-6DTZ43TT.js";
import {
  useSavingState
} from "./chunk-I64HYR5B.js";
import {
  AuthModalService
} from "./chunk-WWCQSEYJ.js";
import {
  CustomSelectComponent
} from "./chunk-MG3FUR2W.js";
import {
  DefaultValueAccessor,
  FormBuilder,
  FormsModule,
  MinValidator,
  NgControlStatus,
  NgModel,
  NumberValueAccessor,
  ReactiveFormsModule,
  Validators
} from "./chunk-CA2J44DF.js";
import {
  LoaderComponent
} from "./chunk-G7HPFFIH.js";
import {
  takeUntilDestroyed
} from "./chunk-KJ2NCQHM.js";
import {
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-XDVMM5TS.js";
import {
  TranslatePipe,
  TranslationService
} from "./chunk-CH6HZ4GZ.js";
import {
  KitchenStateService
} from "./chunk-DRMAUDCM.js";
import "./chunk-ZDTM2BLR.js";
import "./chunk-V3KHFSXP.js";
import {
  UserService
} from "./chunk-NQ7PICSF.js";
import "./chunk-AB3R4JQV.js";
import {
  UserMsgService
} from "./chunk-Z3W6FQFP.js";
import "./chunk-ZMFT5D5F.js";
import {
  ActivatedRoute,
  CommonModule,
  Component,
  DecimalPipe,
  DestroyRef,
  Injectable,
  NavigationStart,
  Pipe,
  Router,
  RouterLink,
  __async,
  __spreadProps,
  __spreadValues,
  computed,
  filter,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵdefinePipe,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵpipeBind2,
  ɵɵproperty,
  ɵɵpureFunction1,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtextInterpolate4
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/cook-view-state.service.ts
var STORAGE_KEY = "cook_view_last_recipe_id";
var RECENT_IDS_KEY = "cook_view_recent_ids";
var MAX_RECENT = 3;
var CookViewStateService = class _CookViewStateService {
  lastRecipeId_ = signal(this.readStored());
  recentIds_ = signal(this.readRecentIds());
  lastRecipeId = computed(() => this.lastRecipeId_());
  recentIds = this.recentIds_.asReadonly();
  setLastViewedRecipeId(id) {
    this.lastRecipeId_.set(id);
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
    } catch {
    }
    const current = this.recentIds_();
    const updated = [id, ...current.filter((r) => r !== id)].slice(0, MAX_RECENT);
    this.recentIds_.set(updated);
    try {
      localStorage.setItem(RECENT_IDS_KEY, JSON.stringify(updated));
    } catch {
    }
  }
  clearLastViewed() {
    this.lastRecipeId_.set(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
    }
  }
  readStored() {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
  readRecentIds() {
    try {
      const raw = localStorage.getItem(RECENT_IDS_KEY);
      if (!raw)
        return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  static \u0275fac = function CookViewStateService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _CookViewStateService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _CookViewStateService, factory: _CookViewStateService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CookViewStateService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/core/pipes/format-quantity.pipe.ts
var KNOWN_FRACTIONS = [
  { value: 0.25, unicode: "\xBC" },
  { value: 1 / 3, unicode: "\u2153" },
  { value: 0.5, unicode: "\xBD" },
  { value: 2 / 3, unicode: "\u2154" },
  { value: 0.75, unicode: "\xBE" }
];
var FRACTION_TOLERANCE = 0.04;
var FormatQuantityPipe = class _FormatQuantityPipe {
  transform(value) {
    if (value == null || isNaN(value))
      return "";
    const whole = Math.floor(value);
    const frac = value - whole;
    const match = KNOWN_FRACTIONS.find((f) => Math.abs(frac - f.value) <= FRACTION_TOLERANCE);
    if (match) {
      if (whole > 0) {
        return `${whole} ${match.unicode}`;
      }
      return match.unicode;
    }
    if (frac === 0) {
      return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(value);
    }
    return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 3 }).format(value);
  }
  static \u0275fac = function FormatQuantityPipe_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _FormatQuantityPipe)();
  };
  static \u0275pipe = /* @__PURE__ */ \u0275\u0275definePipe({ name: "formatQuantity", type: _FormatQuantityPipe, pure: true });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(FormatQuantityPipe, [{
    type: Pipe,
    args: [{
      name: "formatQuantity",
      standalone: true
    }]
  }], null, null);
})();

// src/app/pages/cook-view/cook-view.page.ts
var _c0 = (a0) => ["/cook", a0];
var _forTrack0 = ($index, $item) => $item.referenceId + $item.unit + $item.amount;
var _forTrack1 = ($index, $item) => $item.factor;
var _forTrack2 = ($index, $item) => $item.name + $item.unit + $item.amount;
var _forTrack3 = ($index, $item) => $item.order_;
function CookViewPage_Conditional_1_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "edit_mode"));
  }
}
function CookViewPage_Conditional_1_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 5)(1, "span", 25);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275pipe(4, "formatQuantity");
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 26);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_2_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.resetToFullRecipe());
    });
    \u0275\u0275element(8, "lucide-icon", 27);
    \u0275\u0275text(9);
    \u0275\u0275pipe(10, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const scaledRow_r4 = ctx;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate4(" ", \u0275\u0275pipeBind1(3, 7, "scaled_to"), " ", \u0275\u0275pipeBind1(4, 9, ctx_r2.scaleByIngredientAmount_()), " ", \u0275\u0275pipeBind1(5, 11, scaledRow_r4.unit), " ", scaledRow_r4.name, " ");
    \u0275\u0275advance(4);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(7, 13, "back_to_full_recipe"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(10, 15, "back_to_full_recipe"), " ");
  }
}
function CookViewPage_Conditional_1_Conditional_7_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 29);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function CookViewPage_Conditional_1_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "button", 28);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_7_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.saveEdits());
    });
    \u0275\u0275template(3, CookViewPage_Conditional_1_Conditional_7_Conditional_3_Template, 1, 1, "app-loader", 29);
    \u0275\u0275element(4, "lucide-icon", 30);
    \u0275\u0275text(5);
    \u0275\u0275pipe(6, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 31);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_7_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.undoEdits());
    });
    \u0275\u0275element(9, "lucide-icon", 27);
    \u0275\u0275text(10);
    \u0275\u0275pipe(11, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r2.isSaving_());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(2, 8, "save_changes"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.isSaving_() ? 3 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(6, 10, "save_changes"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(8, 12, "undo_changes"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(11, 14, "undo_changes"), " ");
  }
}
function CookViewPage_Conditional_1_Conditional_8_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "span", 36);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 37);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_8_Conditional_26_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.onViewDishChecklist());
    });
    \u0275\u0275element(5, "lucide-icon", 38);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 39);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_8_Conditional_26_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.onExportDishChecklist());
    });
    \u0275\u0275element(8, "lucide-icon", 40);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 5, "export_checklist"));
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(4, 7, "view"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(7, 9, "export_checklist"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
  }
}
function CookViewPage_Conditional_1_Conditional_8_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "span", 36);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 37);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_8_Conditional_27_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.onViewCookingSteps());
    });
    \u0275\u0275element(5, "lucide-icon", 38);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 39);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_8_Conditional_27_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.onExportCookingSteps());
    });
    \u0275\u0275element(8, "lucide-icon", 40);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 5, "export_cooking_steps"));
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(4, 7, "view"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(7, 9, "export_cooking_steps"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
  }
}
function CookViewPage_Conditional_1_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 32);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_8_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.enterEditMode());
    });
    \u0275\u0275element(3, "lucide-icon", 33);
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 34);
    \u0275\u0275listener("mouseleave", function CookViewPage_Conditional_1_Conditional_8_Template_div_mouseleave_6_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.exportBarExpanded_.set(false));
    });
    \u0275\u0275elementStart(7, "div", 35)(8, "span", 36);
    \u0275\u0275text(9);
    \u0275\u0275pipe(10, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 37);
    \u0275\u0275pipe(12, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_8_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onViewRecipeInfo());
    });
    \u0275\u0275element(13, "lucide-icon", 38);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "button", 39);
    \u0275\u0275pipe(15, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_8_Template_button_click_14_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onExportInfo());
    });
    \u0275\u0275element(16, "lucide-icon", 40);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "span", 36);
    \u0275\u0275text(18);
    \u0275\u0275pipe(19, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "button", 37);
    \u0275\u0275pipe(21, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_8_Template_button_click_20_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onViewShoppingList());
    });
    \u0275\u0275element(22, "lucide-icon", 38);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "button", 39);
    \u0275\u0275pipe(24, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_8_Template_button_click_23_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onExportShoppingList());
    });
    \u0275\u0275element(25, "lucide-icon", 40);
    \u0275\u0275elementEnd();
    \u0275\u0275template(26, CookViewPage_Conditional_1_Conditional_8_Conditional_26_Template, 9, 11)(27, CookViewPage_Conditional_1_Conditional_8_Conditional_27_Template, 9, 11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "button", 41);
    \u0275\u0275pipe(29, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_8_Template_button_click_28_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.toggleExportBar());
    });
    \u0275\u0275element(30, "lucide-icon", 40);
    \u0275\u0275text(31);
    \u0275\u0275pipe(32, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", !ctx_r2.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(1, 22, "edit"))("title", !ctx_r2.isLoggedIn() ? \u0275\u0275pipeBind1(2, 24, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(5, 26, "edit"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275classProp("expanded", ctx_r2.exportBarExpanded_());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(10, 28, "export_recipe_info"));
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(12, 30, "view"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(15, 32, "export_recipe_info"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(19, 34, "export_shopping_list"));
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(21, 36, "view"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(24, 38, "export_shopping_list"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.isDish_() ? 26 : 27);
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(29, 40, "export"))("aria-expanded", ctx_r2.exportBarExpanded_());
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(32, 42, "export"), " ");
  }
}
function CookViewPage_Conditional_1_Conditional_9_Conditional_0_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 49);
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_9_Conditional_0_For_2_Template_button_click_0_listener() {
      const chip_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r2.selectMultiplier(chip_r11.factor));
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const chip_r11 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(4);
    \u0275\u0275classProp("cv-chip--active", ctx_r2.activeMultiplier_() === chip_r11.factor);
    \u0275\u0275attribute("aria-pressed", ctx_r2.activeMultiplier_() === chip_r11.factor);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 4, chip_r11.key), " ");
  }
}
function CookViewPage_Conditional_1_Conditional_9_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 42);
    \u0275\u0275repeaterCreate(1, CookViewPage_Conditional_1_Conditional_9_Conditional_0_For_2_Template, 3, 6, "button", 48, _forTrack1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r2.multiplierChips);
  }
}
function CookViewPage_Conditional_1_Conditional_9_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 47);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "number");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \xD7", \u0275\u0275pipeBind2(2, 1, ctx_r2.scaleFactor_(), "1.2-2"), " ");
  }
}
function CookViewPage_Conditional_1_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275template(0, CookViewPage_Conditional_1_Conditional_9_Conditional_0_Template, 3, 0, "div", 42);
    \u0275\u0275elementStart(1, "div", 43)(2, "span", 44);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "app-counter", 45);
    \u0275\u0275listener("valueChange", function CookViewPage_Conditional_1_Conditional_9_Template_app_counter_valueChange_5_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setQuantity($event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "app-custom-select", 46);
    \u0275\u0275listener("ngModelChange", function CookViewPage_Conditional_1_Conditional_9_Template_app_custom_select_ngModelChange_6_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onYieldUnitChange($event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275template(7, CookViewPage_Conditional_1_Conditional_9_Conditional_7_Template, 3, 4, "span", 47);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const recipe_r12 = \u0275\u0275nextContext();
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275conditional(!ctx_r2.editMode_() ? 0 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 9, "make_quantity"));
    \u0275\u0275advance(2);
    \u0275\u0275property("value", ctx_r2.targetQuantity_())("min", ctx_r2.isDish_() ? 1 : 0.01)("stepOptions", ctx_r2.cookViewStepOpts_());
    \u0275\u0275advance();
    \u0275\u0275property("ngModel", ctx_r2.selectedUnit_())("options", ctx_r2.yieldUnitOptions_())("typeToFilter", true);
    \u0275\u0275advance();
    \u0275\u0275conditional(recipe_r12.yield_unit_ !== ctx_r2.selectedUnit_() ? 7 : -1);
  }
}
function CookViewPage_Conditional_1_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 10);
    \u0275\u0275element(1, "lucide-icon", 50);
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275pipe(5, "number");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("size", 16);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(4, 3, "cost"), ": \u20AA", \u0275\u0275pipeBind2(5, 5, ctx_r2.scaledCost_(), "1.2-2"), "");
  }
}
function CookViewPage_Conditional_1_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 20);
  }
}
function CookViewPage_Conditional_1_For_30_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 17);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 52)(3, "button", 53);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_For_30_Conditional_1_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r15);
      const ctx_r15 = \u0275\u0275nextContext();
      const row_r17 = ctx_r15.$implicit;
      const \u0275$index_195_r14 = ctx_r15.$index;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setIngredientAmount(\u0275$index_195_r14, ctx_r2.getEditAmountStep(row_r17.amount, -1, row_r17.unit)));
    });
    \u0275\u0275element(5, "lucide-icon", 54);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "input", 55);
    \u0275\u0275listener("input", function CookViewPage_Conditional_1_For_30_Conditional_1_Template_input_input_6_listener($event) {
      let tmp_15_0;
      \u0275\u0275restoreView(_r15);
      const \u0275$index_195_r14 = \u0275\u0275nextContext().$index;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setIngredientAmount(\u0275$index_195_r14, (tmp_15_0 = $event.target.valueAsNumber) !== null && tmp_15_0 !== void 0 ? tmp_15_0 : 0));
    })("keydown", function CookViewPage_Conditional_1_For_30_Conditional_1_Template_input_keydown_6_listener($event) {
      \u0275\u0275restoreView(_r15);
      const ctx_r15 = \u0275\u0275nextContext();
      const row_r17 = ctx_r15.$implicit;
      const \u0275$index_195_r14 = ctx_r15.$index;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onEditAmountKeydown($event, \u0275$index_195_r14, row_r17.amount, row_r17.unit));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 56);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_For_30_Conditional_1_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r15);
      const ctx_r15 = \u0275\u0275nextContext();
      const row_r17 = ctx_r15.$implicit;
      const \u0275$index_195_r14 = ctx_r15.$index;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setIngredientAmount(\u0275$index_195_r14, ctx_r2.getEditAmountStep(row_r17.amount, 1, row_r17.unit)));
    });
    \u0275\u0275element(9, "lucide-icon", 57);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "div", 19)(11, "app-custom-select", 46);
    \u0275\u0275listener("ngModelChange", function CookViewPage_Conditional_1_For_30_Conditional_1_Template_app_custom_select_ngModelChange_11_listener($event) {
      \u0275\u0275restoreView(_r15);
      const \u0275$index_195_r14 = \u0275\u0275nextContext().$index;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setIngredientUnit(\u0275$index_195_r14, $event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 58);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_For_30_Conditional_1_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r15);
      const \u0275$index_195_r14 = \u0275\u0275nextContext().$index;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.removeIngredient(\u0275$index_195_r14));
    });
    \u0275\u0275element(14, "lucide-icon", 59);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const row_r17 = \u0275\u0275nextContext().$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(row_r17.name);
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(4, 13, "decrease"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275property("value", row_r17.amount)("min", 0)("step", ctx_r2.isDish_() ? 1 : 0.01);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(8, 15, "increase"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngModel", row_r17.unit)("options", ctx_r2.getUnitOptionsForRow(row_r17))("typeToFilter", true);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(13, 17, "remove"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
  }
}
function CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 17);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 60)(3, "input", 61);
    \u0275\u0275listener("ngModelChange", function CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_0_Template_input_ngModelChange_3_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r2 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r2.onSettingAmountChange($event));
    })("keydown", function CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_0_Template_input_keydown_3_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r2 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r2.onSettingAmountKeydown($event));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "div", 19)(5, "span");
    \u0275\u0275text(6);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 20)(9, "button", 62);
    \u0275\u0275pipe(10, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_0_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r18);
      const \u0275$index_195_r14 = \u0275\u0275nextContext(2).$index;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.confirmScaleByIngredient(\u0275$index_195_r14, ctx_r2.settingByIngredientAmount_()));
    });
    \u0275\u0275element(11, "lucide-icon", 50);
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "button", 63);
    \u0275\u0275pipe(15, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_0_Template_button_click_14_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r2 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r2.cancelSetByIngredient());
    });
    \u0275\u0275text(16);
    \u0275\u0275pipe(17, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const row_r17 = \u0275\u0275nextContext(2).$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(row_r17.name);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngModel", ctx_r2.settingByIngredientAmount_())("min", 0.01)("step", ctx_r2.isDish_() ? 1 : 0.1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 10, row_r17.unit));
    \u0275\u0275advance(3);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(10, 12, "convert"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(13, 14, "convert"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(15, 16, "cancel"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(17, 18, "cancel"), " ");
  }
}
function CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_1_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r20 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-custom-select", 46);
    \u0275\u0275listener("ngModelChange", function CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_1_Conditional_12_Template_app_custom_select_ngModelChange_0_listener($event) {
      \u0275\u0275restoreView(_r20);
      const \u0275$index_195_r14 = \u0275\u0275nextContext(3).$index;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setUnitOverride(\u0275$index_195_r14, $event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r15 = \u0275\u0275nextContext(3);
    const row_r17 = ctx_r15.$implicit;
    const \u0275$index_195_r14 = ctx_r15.$index;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275property("ngModel", ctx_r2.getDisplayUnit(\u0275$index_195_r14, row_r17))("options", ctx_r2.getUnitOptionsForRow(row_r17))("typeToFilter", true);
  }
}
function CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_1_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r15 = \u0275\u0275nextContext(3);
    const row_r17 = ctx_r15.$implicit;
    const \u0275$index_195_r14 = ctx_r15.$index;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, ctx_r2.getDisplayUnit(\u0275$index_195_r14, row_r17)));
  }
}
function CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 64)(1, "span", 65);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 66);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_1_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r19);
      const \u0275$index_195_r14 = \u0275\u0275nextContext(2).$index;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.startSetByIngredient(\u0275$index_195_r14));
    });
    \u0275\u0275element(5, "lucide-icon", 50);
    \u0275\u0275text(6);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 18);
    \u0275\u0275text(9);
    \u0275\u0275pipe(10, "formatQuantity");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 19);
    \u0275\u0275template(12, CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_1_Conditional_12_Template, 1, 3, "app-custom-select", 67)(13, CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_1_Conditional_13_Template, 3, 3, "span");
    \u0275\u0275elementEnd();
    \u0275\u0275element(14, "div", 20);
  }
  if (rf & 2) {
    const ctx_r15 = \u0275\u0275nextContext(2);
    const row_r17 = ctx_r15.$implicit;
    const \u0275$index_195_r14 = ctx_r15.$index;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(row_r17.name);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(4, 6, "set_recipe_by_this_item"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(7, 8, "set_recipe_by_this_item"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(10, 10, ctx_r2.getDisplayAmount(\u0275$index_195_r14, row_r17)));
    \u0275\u0275advance(3);
    \u0275\u0275conditional(row_r17.availableUnits.length > 1 ? 12 : 13);
  }
}
function CookViewPage_Conditional_1_For_30_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_0_Template, 18, 20)(1, CookViewPage_Conditional_1_For_30_Conditional_2_Conditional_1_Template, 15, 12);
  }
  if (rf & 2) {
    const \u0275$index_195_r14 = \u0275\u0275nextContext().$index;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275conditional(ctx_r2.settingByIngredientIndex_() === \u0275$index_195_r14 ? 0 : 1);
  }
}
function CookViewPage_Conditional_1_For_30_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 51);
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_For_30_Template_div_click_0_listener() {
      const \u0275$index_195_r14 = \u0275\u0275restoreView(_r13).$index;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(!ctx_r2.editMode_() && ctx_r2.settingByIngredientIndex_() !== \u0275$index_195_r14 ? ctx_r2.toggleIngredientCheck(\u0275$index_195_r14) : null);
    });
    \u0275\u0275template(1, CookViewPage_Conditional_1_For_30_Conditional_1_Template, 15, 19)(2, CookViewPage_Conditional_1_For_30_Conditional_2_Template, 2, 1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const \u0275$index_195_r14 = ctx.$index;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("field-changed", ctx_r2.editMode_() && ctx_r2.ingredientChanged(\u0275$index_195_r14))("view-mode-row", !ctx_r2.editMode_())("row-highlight", !ctx_r2.editMode_() && ctx_r2.settingByIngredientIndex_() === \u0275$index_195_r14)("setting-by", !ctx_r2.editMode_() && ctx_r2.settingByIngredientIndex_() === \u0275$index_195_r14)("cv-ingredient-row--checked", !ctx_r2.editMode_() && ctx_r2.checkedIngredients_().has(\u0275$index_195_r14));
    \u0275\u0275attribute("role", !ctx_r2.editMode_() ? "checkbox" : null)("aria-checked", !ctx_r2.editMode_() ? ctx_r2.checkedIngredients_().has(\u0275$index_195_r14) : null);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.editMode_() ? 1 : 2);
  }
}
function CookViewPage_Conditional_1_Conditional_31_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r21 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-recipe-workflow", 70);
    \u0275\u0275listener("addItem", function CookViewPage_Conditional_1_Conditional_31_Conditional_5_Template_app_recipe_workflow_addItem_0_listener() {
      \u0275\u0275restoreView(_r21);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.addWorkflowItem());
    })("removeItem", function CookViewPage_Conditional_1_Conditional_31_Conditional_5_Template_app_recipe_workflow_removeItem_0_listener($event) {
      \u0275\u0275restoreView(_r21);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.removeWorkflowItem($event));
    })("sortByCategory", function CookViewPage_Conditional_1_Conditional_31_Conditional_5_Template_app_recipe_workflow_sortByCategory_0_listener() {
      \u0275\u0275restoreView(_r21);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.sortPrepByCategory());
    })("focusRowDone", function CookViewPage_Conditional_1_Conditional_31_Conditional_5_Template_app_recipe_workflow_focusRowDone_0_listener() {
      \u0275\u0275restoreView(_r21);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.onWorkflowFocusRowDone());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275property("workflowFormArray", ctx_r2.workflowFormArray)("type", "dish")("resetTrigger", ctx_r2.workflowResetTrigger)("focusRowAt", ctx_r2.focusWorkflowRowAt_());
  }
}
function CookViewPage_Conditional_1_Conditional_31_Conditional_6_Conditional_0_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 73)(1, "span", 74);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 75);
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "formatQuantity");
    \u0275\u0275pipe(6, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const row_r22 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(row_r22.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(5, 3, row_r22.amount), " ", \u0275\u0275pipeBind1(6, 5, row_r22.unit), "");
  }
}
function CookViewPage_Conditional_1_Conditional_31_Conditional_6_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 71);
    \u0275\u0275repeaterCreate(1, CookViewPage_Conditional_1_Conditional_31_Conditional_6_Conditional_0_For_2_Template, 7, 7, "div", 73, _forTrack2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(4);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r2.scaledPrep_());
  }
}
function CookViewPage_Conditional_1_Conditional_31_Conditional_6_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 72);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "no_preparations_defined"));
  }
}
function CookViewPage_Conditional_1_Conditional_31_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, CookViewPage_Conditional_1_Conditional_31_Conditional_6_Conditional_0_Template, 3, 0, "div", 71)(1, CookViewPage_Conditional_1_Conditional_31_Conditional_6_Conditional_1_Template, 3, 3, "p", 72);
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275conditional(ctx_r2.scaledPrep_().length > 0 ? 0 : 1);
  }
}
function CookViewPage_Conditional_1_Conditional_31_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "section", 22)(1, "h2", 13);
    \u0275\u0275element(2, "lucide-icon", 68);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, CookViewPage_Conditional_1_Conditional_31_Conditional_5_Template, 1, 4, "app-recipe-workflow", 69)(6, CookViewPage_Conditional_1_Conditional_31_Conditional_6_Template, 2, 1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 20);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(4, 3, "prep_list_mise_en_place"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.editMode_() ? 5 : 6);
  }
}
function CookViewPage_Conditional_1_Conditional_32_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 77);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", ctx_r2.completedStepCount_(), "/", ctx_r2.totalStepCount_(), "");
  }
}
function CookViewPage_Conditional_1_Conditional_32_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r23 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-recipe-workflow", 70);
    \u0275\u0275listener("addItem", function CookViewPage_Conditional_1_Conditional_32_Conditional_6_Template_app_recipe_workflow_addItem_0_listener() {
      \u0275\u0275restoreView(_r23);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.addWorkflowItem());
    })("removeItem", function CookViewPage_Conditional_1_Conditional_32_Conditional_6_Template_app_recipe_workflow_removeItem_0_listener($event) {
      \u0275\u0275restoreView(_r23);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.removeWorkflowItem($event));
    })("sortByCategory", function CookViewPage_Conditional_1_Conditional_32_Conditional_6_Template_app_recipe_workflow_sortByCategory_0_listener() {
      \u0275\u0275restoreView(_r23);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.sortPrepByCategory());
    })("focusRowDone", function CookViewPage_Conditional_1_Conditional_32_Conditional_6_Template_app_recipe_workflow_focusRowDone_0_listener() {
      \u0275\u0275restoreView(_r23);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.onWorkflowFocusRowDone());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275property("workflowFormArray", ctx_r2.workflowFormArray)("type", "preparation")("resetTrigger", ctx_r2.workflowResetTrigger)("focusRowAt", ctx_r2.focusWorkflowRowAt_());
  }
}
function CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_For_2_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "lucide-icon", 82);
  }
  if (rf & 2) {
    \u0275\u0275property("size", 20);
  }
}
function CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_For_2_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "lucide-icon", 83);
  }
  if (rf & 2) {
    \u0275\u0275property("size", 20);
  }
}
function CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_For_2_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r26 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 87);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_For_2_Conditional_9_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r26);
      const step_r27 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext(5);
      return \u0275\u0275resetView(ctx_r2.onTimerHintTap(step_r27.labor_time_minutes_));
    });
    \u0275\u0275element(2, "lucide-icon", 76);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const step_r27 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(1, 4, "voice_timer_hint"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", step_r27.labor_time_minutes_, " ", \u0275\u0275pipeBind1(4, 6, "min"), " ");
  }
}
function CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r24 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "li", 80)(1, "button", 81);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_For_2_Template_button_click_1_listener() {
      const \u0275$index_335_r25 = \u0275\u0275restoreView(_r24).$index;
      const ctx_r2 = \u0275\u0275nextContext(5);
      return \u0275\u0275resetView(ctx_r2.toggleStepCheck(\u0275$index_335_r25));
    });
    \u0275\u0275template(3, CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_For_2_Conditional_3_Template, 1, 1, "lucide-icon", 82)(4, CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_For_2_Conditional_4_Template, 1, 1, "lucide-icon", 83);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 84);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 85);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275template(9, CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_For_2_Conditional_9_Template, 5, 8, "button", 86);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const step_r27 = ctx.$implicit;
    const \u0275$index_335_r25 = ctx.$index;
    const ctx_r2 = \u0275\u0275nextContext(5);
    \u0275\u0275classProp("cv-step-item--checked", ctx_r2.checkedSteps_().has(\u0275$index_335_r25));
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(2, 7, "ingredient_checked"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.checkedSteps_().has(\u0275$index_335_r25) ? 3 : 4);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(step_r27.order_);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(step_r27.instruction_);
    \u0275\u0275advance();
    \u0275\u0275conditional(step_r27.labor_time_minutes_ > 0 ? 9 : -1);
  }
}
function CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "ol", 78);
    \u0275\u0275repeaterCreate(1, CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_For_2_Template, 10, 9, "li", 79, _forTrack3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const recipe_r12 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275repeater(recipe_r12.steps_);
  }
}
function CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 72);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "no_steps_defined"));
  }
}
function CookViewPage_Conditional_1_Conditional_32_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_0_Template, 3, 0, "ol", 78)(1, CookViewPage_Conditional_1_Conditional_32_Conditional_7_Conditional_1_Template, 3, 3, "p", 72);
  }
  if (rf & 2) {
    const recipe_r12 = \u0275\u0275nextContext(2);
    \u0275\u0275conditional(recipe_r12.steps_ && recipe_r12.steps_.length ? 0 : 1);
  }
}
function CookViewPage_Conditional_1_Conditional_32_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "section", 23)(1, "h2", 13);
    \u0275\u0275element(2, "lucide-icon", 76);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275template(5, CookViewPage_Conditional_1_Conditional_32_Conditional_5_Template, 2, 2, "span", 77);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, CookViewPage_Conditional_1_Conditional_32_Conditional_6_Template, 1, 4, "app-recipe-workflow", 69)(7, CookViewPage_Conditional_1_Conditional_32_Conditional_7_Template, 2, 1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 20);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(4, 4, "prep_workflow"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.totalStepCount_() > 0 ? 5 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.editMode_() ? 6 : 7);
  }
}
function CookViewPage_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 3);
    \u0275\u0275template(1, CookViewPage_Conditional_1_Conditional_1_Template, 3, 3, "div", 4)(2, CookViewPage_Conditional_1_Conditional_2_Template, 11, 17, "div", 5);
    \u0275\u0275elementStart(3, "header", 6)(4, "div", 7)(5, "h1", 8);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275template(7, CookViewPage_Conditional_1_Conditional_7_Template, 12, 16, "div", 9)(8, CookViewPage_Conditional_1_Conditional_8_Template, 33, 44);
    \u0275\u0275elementEnd();
    \u0275\u0275template(9, CookViewPage_Conditional_1_Conditional_9_Template, 8, 11)(10, CookViewPage_Conditional_1_Conditional_10_Template, 6, 8, "div", 10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 11)(12, "section", 12)(13, "h2", 13);
    \u0275\u0275element(14, "lucide-icon", 14);
    \u0275\u0275text(15);
    \u0275\u0275pipe(16, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "div", 15)(18, "div", 16)(19, "div", 17);
    \u0275\u0275text(20);
    \u0275\u0275pipe(21, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "div", 18);
    \u0275\u0275text(23);
    \u0275\u0275pipe(24, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "div", 19);
    \u0275\u0275text(26);
    \u0275\u0275pipe(27, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(28, CookViewPage_Conditional_1_Conditional_28_Template, 1, 0, "div", 20);
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(29, CookViewPage_Conditional_1_For_30_Template, 3, 13, "div", 21, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(31, CookViewPage_Conditional_1_Conditional_31_Template, 7, 5, "section", 22)(32, CookViewPage_Conditional_1_Conditional_32_Template, 8, 6, "section", 23);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(33, "app-approve-stamp", 24);
    \u0275\u0275listener("approve", function CookViewPage_Conditional_1_Template_app_approve_stamp_approve_33_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onApproveStamp());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_5_0;
    const recipe_r12 = ctx;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("edit-mode", ctx_r2.editMode_())("scaled-view", ctx_r2.isScaledView_());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.editMode_() ? 1 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional((tmp_5_0 = !ctx_r2.editMode_() && ctx_r2.isScaledView_() && ctx_r2.scaledViewRow_()) ? 2 : -1, tmp_5_0);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(recipe_r12.name_hebrew);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.editMode_() ? 7 : 8);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(!ctx_r2.isScaledView_() ? 9 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.scaledCost_() > 0 ? 10 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("size", 20);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(16, 22, "ingredients_index"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275classProp("has-scale-action", !ctx_r2.editMode_());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(21, 24, "ingredient"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(24, 26, "quantity"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(27, 28, "unit"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(!ctx_r2.editMode_() ? 28 : -1);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r2.scaledIngredients_());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.isDish_() ? 31 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r2.isDish_() ? 32 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("approved", recipe_r12.is_approved_)("disabled", ctx_r2.isSaving_());
  }
}
function CookViewPage_Conditional_2_Conditional_8_For_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "a", 91);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const id_r28 = ctx.$implicit;
    \u0275\u0275property("routerLink", \u0275\u0275pureFunction1(2, _c0, id_r28));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(id_r28);
  }
}
function CookViewPage_Conditional_2_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 89)(1, "span", 90);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(4, CookViewPage_Conditional_2_Conditional_8_For_5_Template, 2, 4, "a", 91, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 1, "recent_recipes"));
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r2.cookViewState.recentIds());
  }
}
function CookViewPage_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 1);
    \u0275\u0275element(1, "lucide-icon", 68);
    \u0275\u0275elementStart(2, "p");
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "a", 88);
    \u0275\u0275text(6);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(8, CookViewPage_Conditional_2_Conditional_8_Template, 6, 3, "div", 89);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("size", 48);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 4, "pick_recipe_to_cook"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 6, "recipe_book"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.cookViewState.recentIds().length > 0 ? 8 : -1);
  }
}
var MULTIPLIER_CHIPS = [
  { factor: 0.5, key: "multiplier_half" },
  { factor: 1, key: "multiplier_1x" },
  { factor: 2, key: "multiplier_2x" },
  { factor: 3, key: "multiplier_3x" },
  { factor: 4, key: "multiplier_4x" }
];
var CookViewPage = class _CookViewPage {
  // ---- INJECTED SERVICES ----
  route = inject(ActivatedRoute);
  router = inject(Router);
  destroyRef = inject(DestroyRef);
  fb = inject(FormBuilder);
  scalingService = inject(ScalingService);
  cookViewState = inject(CookViewStateService);
  recipeCostService = inject(RecipeCostService);
  kitchenState = inject(KitchenStateService);
  confirmModal = inject(ConfirmModalService);
  unitRegistry = inject(UnitRegistryService);
  exportService = inject(ExportService);
  isLoggedIn = inject(UserService).isLoggedIn;
  userMsg = inject(UserMsgService);
  authModal = inject(AuthModalService);
  translation = inject(TranslationService);
  heroFab = inject(HeroFabService);
  recipeFormService = inject(RecipeFormService);
  // ---- SIGNALS & CONSTANTS ----
  recipe_ = signal(null);
  targetQuantity_ = signal(1);
  selectedUnit_ = signal("");
  /** Per-row unit override (index -> unit key). */
  unitOverrides_ = signal({});
  editMode_ = signal(false);
  /** Snapshot when entering edit mode; restored on Undo. */
  originalRecipe_ = signal(null);
  saving = useSavingState();
  isSaving_ = this.saving.isSaving_;
  /** Parent form for workflow_items FormArray; used in edit mode only. */
  workflowParentForm_ = this.fb.group({ workflow_items: this.fb.array([]) });
  /** Focus workflow row at index (for add step/prep); cleared after focus. */
  focusWorkflowRowAt_ = signal(null);
  workflowResetTrigger_ = 0;
  /** Scale-by-ingredient: index and amount we scaled by (null = normal view). */
  scaleByIngredientIndex_ = signal(null);
  scaleByIngredientAmount_ = signal(null);
  /** Row currently in "setting" state (amount input + Convert visible). */
  settingByIngredientIndex_ = signal(null);
  /** Current value in the inline amount input for the row in setting state. */
  settingByIngredientAmount_ = signal(0);
  /** Payload for export preview popup (null = closed). */
  exportPreviewPayload_ = signal(null);
  /** Which export type is shown in preview (so we know what to run on Export click). */
  exportPreviewType_ = null;
  /** Floating export bar expanded. */
  exportBarExpanded_ = signal(false);
  /**
   * Active multiplier chip factor (null = no chip selected, 1 = 1x selected by default).
   * Set to null when user manually adjusts quantity via stepper.
   */
  activeMultiplier_ = signal(1);
  /** Ingredient check-off state (session-only, keyed by row index). */
  checkedIngredients_ = signal(/* @__PURE__ */ new Set());
  /** Step check-off state (session-only, keyed by step index). */
  checkedSteps_ = signal(/* @__PURE__ */ new Set());
  /** Multiplier chip definitions exposed to template. */
  multiplierChips = MULTIPLIER_CHIPS;
  // ---- COMPUTED SIGNALS ----
  /** True when we are in special scaled view (show banner + Back to full recipe). */
  isScaledView_ = computed(() => this.scaleByIngredientIndex_() !== null);
  /** Scaled ingredient row for the banner when in special view (null otherwise). */
  scaledViewRow_ = computed(() => {
    const idx = this.scaleByIngredientIndex_();
    if (idx === null)
      return null;
    return this.getScaledIngredientAt(idx) ?? null;
  });
  yieldUnitOptions_ = computed(() => {
    const recipe = this.recipe_();
    if (!recipe)
      return [];
    const convs = recipe.yield_conversions_?.length ? recipe.yield_conversions_ : null;
    if (convs?.length) {
      const seen = /* @__PURE__ */ new Set();
      return convs.filter((c) => c?.unit && !seen.has(c.unit) && (seen.add(c.unit), true)).map((c) => ({ value: c.unit, label: c.unit }));
    }
    const u = recipe.yield_unit_ || "unit";
    return [{ value: u, label: u }];
  });
  convertedYieldAmount_ = computed(() => {
    const recipe = this.recipe_();
    if (!recipe)
      return 1;
    const baseAmount = recipe.yield_amount_ ?? 1;
    const baseUnit = recipe.yield_unit_ ?? "unit";
    const selUnit = this.selectedUnit_() || baseUnit;
    if (baseUnit === selUnit)
      return baseAmount;
    const convs = recipe.yield_conversions_;
    if (convs?.length) {
      const entry = convs.find((c) => c?.unit === selUnit);
      if (entry != null)
        return entry.amount;
    }
    const baseConv = this.unitRegistry.getConversion(baseUnit);
    const selConv = this.unitRegistry.getConversion(selUnit);
    if (!baseConv || !selConv)
      return baseAmount;
    return baseAmount * (baseConv / selConv);
  });
  scaleFactor_ = computed(() => {
    const recipe = this.recipe_();
    const qty = this.targetQuantity_();
    if (!recipe)
      return 1;
    return qty / this.convertedYieldAmount_();
  });
  scaledIngredients_ = computed(() => {
    const recipe = this.recipe_();
    const factor = this.scaleFactor_();
    if (!recipe)
      return [];
    return this.scalingService.getScaledIngredients(recipe, factor);
  });
  scaledPrep_ = computed(() => {
    const recipe = this.recipe_();
    const factor = this.scaleFactor_();
    if (!recipe)
      return [];
    return this.scalingService.getScaledPrepItems(recipe, factor);
  });
  scaledCost_ = computed(() => {
    const recipe = this.recipe_();
    const factor = this.scaleFactor_();
    if (!recipe?.ingredients_?.length)
      return 0;
    const scaledRecipe = __spreadProps(__spreadValues({}, recipe), {
      ingredients_: recipe.ingredients_.map((ing) => __spreadProps(__spreadValues({}, ing), {
        amount_: (ing.amount_ ?? 0) * factor
      }))
    });
    return this.recipeCostService.computeRecipeCost(scaledRecipe);
  });
  isDish_ = computed(() => {
    const r = this.recipe_();
    return !!(r?.recipe_type_ === "dish" || (r?.prep_items_?.length ?? 0) > 0 || (r?.prep_categories_?.length ?? 0) > 0);
  });
  cookViewStepOpts_ = computed(() => {
    if (this.isDish_())
      return { integerOnly: true };
    const unit = this.selectedUnit_();
    return unit ? { unit } : void 0;
  });
  /** Number of steps marked as done. */
  completedStepCount_ = computed(() => this.checkedSteps_().size);
  /** Total step count for the current recipe. */
  totalStepCount_ = computed(() => this.recipe_()?.steps_?.length ?? 0);
  get workflowFormArray() {
    return this.workflowParentForm_.get("workflow_items");
  }
  get workflowResetTrigger() {
    return this.workflowResetTrigger_;
  }
  ngOnInit() {
    this.router.events.pipe(filter((e) => e instanceof NavigationStart), takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (!e.url.startsWith("/cook")) {
        this.closeAllExportOverlays();
      }
    });
    const recipe = this.route.snapshot.data["recipe"];
    if (recipe) {
      this.recipe_.set(recipe);
      this.selectedUnit_.set(recipe.yield_unit_ || "unit");
      this.cookViewState.setLastViewedRecipeId(recipe._id);
      const base = recipe.yield_amount_ ?? 1;
      this.targetQuantity_.set(base);
    } else {
      const lastId = this.cookViewState.lastRecipeId();
      if (lastId) {
        this.router.navigate(["/cook", lastId]);
        return;
      }
    }
  }
  /** Close export bar and preview so state is clean when user navigates away. */
  closeAllExportOverlays() {
    this.exportBarExpanded_.set(false);
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
  }
  ngOnDestroy() {
    this.closeAllExportOverlays();
    this.heroFab.clearPageActions();
  }
  setQuantity(value) {
    const num = value != null && !Number.isNaN(value) ? Number(value) : this.recipe_()?.yield_amount_ ?? 1;
    const recipe = this.recipe_();
    const min = recipe?.yield_unit_ === "dish" ? 1 : 0.01;
    this.targetQuantity_.set(Math.max(min, num));
    this.scaleByIngredientIndex_.set(null);
    this.scaleByIngredientAmount_.set(null);
    this.activeMultiplier_.set(null);
  }
  /**
   * Apply a multiplier chip. Calculates the target quantity from the chip factor,
   * calls setQuantity (which clears activeMultiplier_), then re-sets activeMultiplier_
   * after so the chip stays highlighted.
   * NOTE: setQuantity clears activeMultiplier_ via signal update — re-set after calling it.
   * 0.5x chip on dish recipes: intentional — produces fractional yield (e.g. 1.5 dishes).
   * This is a conscious design choice per QA review; integerOnly is a stepper constraint only.
   */
  selectMultiplier(factor) {
    const newQty = this.convertedYieldAmount_() * factor;
    this.setQuantity(newQty);
    this.activeMultiplier_.set(factor);
  }
  /** When user changes the yield unit, convert quantity to equivalent in the new unit (e.g. 1 kg → 4 when switching to "unit"). */
  onYieldUnitChange(newUnit) {
    const prevYield = this.convertedYieldAmount_();
    this.selectedUnit_.set(newUnit);
    if (prevYield > 0) {
      const batches = this.targetQuantity_() / prevYield;
      const newYield = this.convertedYieldAmount_();
      const newQty = newYield > 0 ? batches * newYield : this.targetQuantity_();
      const recipe = this.recipe_();
      const min = recipe?.yield_unit_ === "dish" ? 1 : 0.01;
      this.targetQuantity_.set(Math.max(min, newQty));
    }
    this.scaleByIngredientIndex_.set(null);
    this.scaleByIngredientAmount_.set(null);
    this.activeMultiplier_.set(null);
  }
  incrementQuantity() {
    const min = this.isDish_() ? 1 : 0.01;
    const options = this.cookViewStepOpts_();
    this.targetQuantity_.update((q) => quantityIncrement(q, min, options));
    this.scaleByIngredientIndex_.set(null);
    this.scaleByIngredientAmount_.set(null);
    this.activeMultiplier_.set(null);
  }
  decrementQuantity() {
    const min = this.isDish_() ? 1 : 0.01;
    const options = this.cookViewStepOpts_();
    this.targetQuantity_.update((q) => quantityDecrement(q, min, options));
    this.scaleByIngredientIndex_.set(null);
    this.scaleByIngredientAmount_.set(null);
    this.activeMultiplier_.set(null);
  }
  onQuantityKeydown(e) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    e.preventDefault();
    if (e.key === "ArrowUp")
      this.incrementQuantity();
    else
      this.decrementQuantity();
  }
  onEditAmountKeydown(e, index, currentAmount, rowUnit) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    e.preventDefault();
    const opts = this.isDish_() ? { integerOnly: true } : rowUnit ? { unit: rowUnit } : void 0;
    const next = e.key === "ArrowUp" ? quantityIncrement(currentAmount, 0, opts) : quantityDecrement(currentAmount, 0, opts);
    this.setIngredientAmount(index, next);
  }
  onSettingAmountKeydown(e) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    e.preventDefault();
    const current = this.settingByIngredientAmount_();
    const options = this.isDish_() ? { integerOnly: true } : void 0;
    const next = e.key === "ArrowUp" ? quantityIncrement(current, 0.01, options) : quantityDecrement(current, 0.01, options);
    this.settingByIngredientAmount_.set(next);
  }
  /** Enter "setting by this ingredient" state for row at index; prefilled with current scaled amount. */
  startSetByIngredient(index) {
    const rows = this.scaledIngredients_();
    const row = rows[index];
    if (!row)
      return;
    this.settingByIngredientIndex_.set(index);
    this.settingByIngredientAmount_.set(row.amount);
  }
  /** Cancel setting state (clear inline amount row). */
  cancelSetByIngredient() {
    this.settingByIngredientIndex_.set(null);
  }
  /** Parse and set the inline "setting by ingredient" amount from input. */
  onSettingAmountChange(value) {
    const num = value != null && value !== "" ? Number(value) : 0;
    this.settingByIngredientAmount_.set(Number.isFinite(num) ? num : 0);
  }
  /** Open confirm dialog, then apply scale by ingredient or cancel. */
  confirmScaleByIngredient(index, userAmount) {
    const amount = Number(userAmount);
    if (!Number.isFinite(amount) || amount <= 0)
      return;
    const recipe = this.recipe_();
    if (!recipe?.ingredients_?.[index])
      return;
    const baseAmount = recipe.ingredients_[index].amount_ ?? 0;
    if (baseAmount <= 0)
      return;
    this.confirmModal.open("scale_recipe_confirm", { saveLabel: "convert" }).then((confirmed) => {
      if (!confirmed)
        return;
      this.applyScaleByIngredient(index, amount);
      this.settingByIngredientIndex_.set(null);
    });
  }
  /** Set targetQuantity_ so that ingredient at index has the given amount; enter special view. */
  applyScaleByIngredient(index, userAmount) {
    const amount = Number(userAmount);
    if (!Number.isFinite(amount) || amount <= 0)
      return;
    const recipe = this.recipe_();
    if (!recipe?.ingredients_?.[index])
      return;
    const baseAmount = recipe.ingredients_[index].amount_ ?? 0;
    if (baseAmount <= 0)
      return;
    const factor = amount / baseAmount;
    const yieldAmount = recipe.yield_amount_ ?? 1;
    this.targetQuantity_.set(yieldAmount * factor);
    this.scaleByIngredientIndex_.set(index);
    this.scaleByIngredientAmount_.set(amount);
  }
  /** Exit special scaled view: reset to recipe base yield. */
  resetToFullRecipe() {
    const recipe = this.recipe_();
    const base = recipe?.yield_amount_ ?? 1;
    this.targetQuantity_.set(base);
    this.scaleByIngredientIndex_.set(null);
    this.scaleByIngredientAmount_.set(null);
    this.activeMultiplier_.set(null);
  }
  /** Scaled ingredient row at index (for banner name/unit in special view). */
  getScaledIngredientAt(index) {
    return this.scaledIngredients_()[index];
  }
  enterEditMode() {
    if (!this.isLoggedIn()) {
      this.userMsg.onSetWarningMsg(this.translation.translate("sign_in_to_use"));
      this.authModal.open("sign-in");
      return;
    }
    const recipe = this.recipe_();
    if (!recipe)
      return;
    this.originalRecipe_.set(JSON.parse(JSON.stringify(recipe)));
    this.editMode_.set(true);
    this.unitOverrides_.set({});
    this.buildWorkflowFormFromRecipe(recipe);
  }
  saveEdits() {
    this.applyWorkflowFormToRecipe();
    this.confirmModal.open("save_changes", { saveLabel: "save_changes" }).then((confirmed) => {
      if (!confirmed)
        return;
      const recipe = this.recipe_();
      if (!recipe)
        return;
      this.saving.setSaving(true);
      this.kitchenState.saveRecipe(recipe).subscribe({
        next: () => {
          this.originalRecipe_.set(null);
          this.editMode_.set(false);
          this.saving.setSaving(false);
        },
        error: () => {
          this.saving.setSaving(false);
        }
      });
    });
  }
  undoEdits() {
    const orig = this.originalRecipe_();
    if (orig) {
      this.recipe_.set(orig);
      this.originalRecipe_.set(null);
      this.editMode_.set(false);
      this.unitOverrides_.set({});
    }
  }
  onApproveStamp() {
    const recipe = this.recipe_();
    if (!recipe)
      return;
    if (this.hasUnsavedEdits()) {
      this.applyWorkflowFormToRecipe();
      this.confirmModal.open("approve_stamp_unsaved_confirm", { saveLabel: "save_changes" }).then((confirmed) => {
        if (!confirmed)
          return;
        this.saveRecipeWithToggledApproval();
      });
      return;
    }
    this.saveRecipeWithToggledApproval();
  }
  saveRecipeWithToggledApproval() {
    const recipe = this.recipe_();
    if (!recipe)
      return;
    this.saving.setSaving(true);
    this.kitchenState.saveRecipe(__spreadProps(__spreadValues({}, recipe), { is_approved_: !recipe.is_approved_ })).subscribe({
      next: (saved) => {
        this.recipe_.set(saved);
        this.originalRecipe_.set(null);
        this.editMode_.set(false);
        this.saving.setSaving(false);
        this.userMsg.onSetSuccessMsg(this.translation.translate(saved.is_approved_ ? "approval_success" : "unapproval_success"));
      },
      error: () => {
        this.saving.setSaving(false);
        this.userMsg.onSetErrorMsg(this.translation.translate("approval_error"));
      }
    });
  }
  onExportInfo() {
    return __async(this, null, function* () {
      const recipe = this.recipe_();
      const qty = this.targetQuantity_();
      if (recipe)
        yield this.exportService.exportRecipeInfo(recipe, qty);
    });
  }
  onExportShoppingList() {
    return __async(this, null, function* () {
      const recipe = this.recipe_();
      const qty = this.targetQuantity_();
      if (recipe)
        yield this.exportService.exportShoppingList(recipe, qty);
    });
  }
  onViewRecipeInfo() {
    const recipe = this.recipe_();
    const qty = this.targetQuantity_();
    if (!recipe)
      return;
    const payload = this.exportService.getRecipeInfoPreviewPayload(recipe, qty);
    this.exportPreviewType_ = "recipe-info";
    this.exportPreviewPayload_.set(payload);
    this.exportBarExpanded_.set(false);
  }
  onViewShoppingList() {
    const recipe = this.recipe_();
    const qty = this.targetQuantity_();
    if (!recipe)
      return;
    const payload = this.exportService.getShoppingListPreviewPayload(recipe, qty);
    this.exportPreviewType_ = "shopping-list";
    this.exportPreviewPayload_.set(payload);
    this.exportBarExpanded_.set(false);
  }
  onExportPreviewClose() {
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
  }
  onExportFromPreview() {
    return __async(this, null, function* () {
      const recipe = this.recipe_();
      const qty = this.targetQuantity_();
      if (!recipe || !this.exportPreviewType_)
        return;
      if (this.exportPreviewType_ === "recipe-info") {
        yield this.exportService.exportRecipeInfo(recipe, qty);
      } else if (this.exportPreviewType_ === "shopping-list") {
        yield this.exportService.exportShoppingList(recipe, qty);
      } else if (this.exportPreviewType_ === "cooking-steps") {
        yield this.exportService.exportCookingSteps(recipe, qty);
      } else if (this.exportPreviewType_ === "dish-checklist") {
        yield this.exportService.exportDishChecklist(recipe, qty);
      }
      this.onExportPreviewClose();
    });
  }
  onPrintFromPreview() {
    window.print();
  }
  onViewCookingSteps() {
    const recipe = this.recipe_();
    const qty = this.targetQuantity_();
    if (!recipe)
      return;
    const payload = this.exportService.getCookingStepsPreviewPayload(recipe, qty);
    this.exportPreviewType_ = "cooking-steps";
    this.exportPreviewPayload_.set(payload);
    this.exportBarExpanded_.set(false);
  }
  onViewDishChecklist() {
    const recipe = this.recipe_();
    const qty = this.targetQuantity_();
    if (!recipe)
      return;
    const payload = this.exportService.getDishChecklistPreviewPayload(recipe, qty);
    this.exportPreviewType_ = "dish-checklist";
    this.exportPreviewPayload_.set(payload);
    this.exportBarExpanded_.set(false);
  }
  onExportCookingSteps() {
    return __async(this, null, function* () {
      const recipe = this.recipe_();
      const qty = this.targetQuantity_();
      if (recipe)
        yield this.exportService.exportCookingSteps(recipe, qty);
    });
  }
  onExportDishChecklist() {
    return __async(this, null, function* () {
      const recipe = this.recipe_();
      const qty = this.targetQuantity_();
      if (recipe)
        yield this.exportService.exportDishChecklist(recipe, qty);
    });
  }
  toggleExportBar() {
    this.exportBarExpanded_.update((v) => !v);
  }
  /** For route guard: true when in edit mode with unsaved changes. */
  hasUnsavedEdits() {
    const edit = this.editMode_();
    const orig = this.originalRecipe_();
    const current = this.recipe_();
    if (!edit || !orig || !current)
      return false;
    return JSON.stringify(current) !== JSON.stringify(orig);
  }
  getEditAmountStep(currentAmount, delta, rowUnit) {
    const options = this.isDish_() ? { integerOnly: true } : rowUnit ? { unit: rowUnit } : void 0;
    return delta > 0 ? quantityIncrement(currentAmount, 0, options) : quantityDecrement(currentAmount, 0, options);
  }
  setIngredientAmount(index, scaledAmount) {
    const recipe = this.recipe_();
    const factor = this.scaleFactor_();
    if (!recipe?.ingredients_?.length || factor <= 0)
      return;
    const base = Math.max(0, scaledAmount) / factor;
    this.recipe_.update((r) => {
      if (!r)
        return r;
      return __spreadProps(__spreadValues({}, r), {
        ingredients_: r.ingredients_.map((ing, i) => i === index ? __spreadProps(__spreadValues({}, ing), { amount_: base }) : ing)
      });
    });
  }
  setIngredientUnit(index, unit) {
    this.recipe_.update((r) => {
      if (!r)
        return r;
      return __spreadProps(__spreadValues({}, r), {
        ingredients_: r.ingredients_.map((ing, i) => i === index ? __spreadProps(__spreadValues({}, ing), { unit_: unit }) : ing)
      });
    });
  }
  replaceIngredient(index, item) {
    const recipe = this.recipe_();
    if (!recipe?.ingredients_?.[index])
      return;
    const type = item.item_type_ === "recipe" ? "recipe" : "product";
    const unit = item.base_unit_ ?? item.yield_unit_ ?? "unit";
    const current = recipe.ingredients_[index];
    this.recipe_.update((r) => {
      if (!r)
        return r;
      return __spreadProps(__spreadValues({}, r), {
        ingredients_: r.ingredients_.map((ing, i) => i === index ? __spreadProps(__spreadValues({}, current), { referenceId: item._id, type, unit_: unit }) : ing)
      });
    });
  }
  removeIngredient(index) {
    this.recipe_.update((r) => {
      if (!r)
        return r;
      return __spreadProps(__spreadValues({}, r), {
        ingredients_: r.ingredients_.filter((_, i) => i !== index)
      });
    });
  }
  ingredientChanged(index) {
    const orig = this.originalRecipe_();
    const current = this.recipe_();
    if (!orig?.ingredients_?.length || !current?.ingredients_?.[index])
      return false;
    const o = orig.ingredients_[index];
    const c = current.ingredients_[index];
    return o.amount_ !== c.amount_ || o.unit_ !== c.unit_ || o.referenceId !== c.referenceId;
  }
  /** Toggle check-off state for ingredient row at index (view mode only, session-only). */
  toggleIngredientCheck(index) {
    this.checkedIngredients_.update((s) => {
      const next = new Set(s);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }
  /** Toggle check-off state for cooking step at index (session-only). */
  toggleStepCheck(index) {
    this.checkedSteps_.update((s) => {
      const next = new Set(s);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }
  /** Show voice timer hint snackbar for the given step duration. */
  onTimerHintTap(minutes) {
    const hint = this.translation.translate("voice_timer_hint").replace("{0}", String(minutes));
    this.userMsg.onSetSuccessMsg(hint);
  }
  onEdit() {
    const recipe = this.recipe_();
    if (recipe)
      this.router.navigate(["/recipe-builder", recipe._id]);
  }
  setUnitOverride(rowIndex, unit) {
    this.unitOverrides_.update((m) => __spreadProps(__spreadValues({}, m), { [rowIndex]: unit }));
  }
  getDisplayUnit(rowIndex, row) {
    const overrides = this.unitOverrides_();
    return overrides[rowIndex] ?? row.unit;
  }
  getUnitOptionsForRow(row) {
    return (row.availableUnits || []).map((u) => ({ value: u, label: u }));
  }
  getDisplayAmount(rowIndex, row) {
    const overrides = this.unitOverrides_();
    const targetUnit = overrides[rowIndex];
    if (!targetUnit || targetUnit === row.unit)
      return row.amount;
    const baseFrom = this.recipeCostService.convertToBaseUnits(row.amount, row.unit);
    const basePerOne = this.recipeCostService.convertToBaseUnits(1, targetUnit);
    if (!basePerOne)
      return row.amount;
    return baseFrom / basePerOne;
  }
  addWorkflowItem() {
    const arr = this.workflowFormArray;
    const isDish = this.isDish_();
    if (isDish) {
      arr.push(this.recipeFormService.createPrepItemRow());
    } else {
      arr.push(this.recipeFormService.createStepGroup(arr.length + 1));
    }
    this.focusWorkflowRowAt_.set(arr.length - 1);
  }
  removeWorkflowItem(index) {
    const arr = this.workflowFormArray;
    arr.removeAt(index);
    if (!this.isDish_()) {
      arr.controls.forEach((group, i) => group.get("order")?.setValue(i + 1));
    }
  }
  sortPrepByCategory() {
    if (!this.isDish_())
      return;
    const arr = this.workflowFormArray;
    const controls = arr.controls;
    const sorted = [...controls].sort((a, b) => {
      const catA = a.get("category_name")?.value ?? "";
      const catB = b.get("category_name")?.value ?? "";
      return catA.localeCompare(catB);
    });
    arr.clear();
    sorted.forEach((c) => arr.push(c));
  }
  onWorkflowFocusRowDone() {
    this.focusWorkflowRowAt_.set(null);
  }
  buildWorkflowFormFromRecipe(recipe) {
    const arr = this.workflowFormArray;
    arr.clear();
    const isDish = this.isDish_();
    if (isDish) {
      const prepRows = this.recipeFormService.getPrepRowsFromRecipe(recipe);
      if (prepRows.length > 0) {
        prepRows.forEach((row) => arr.push(this.recipeFormService.createPrepItemRow(row)));
      } else {
        arr.push(this.recipeFormService.createPrepItemRow());
      }
    } else {
      const steps = recipe.steps_ ?? [];
      if (steps.length > 0) {
        steps.forEach((step, i) => {
          const group = this.recipeFormService.createStepGroup(step.order_ ?? i + 1);
          group.get("instruction")?.addValidators(Validators.required);
          group.patchValue({ instruction: step.instruction_ ?? "", labor_time: step.labor_time_minutes_ ?? 0 });
          arr.push(group);
        });
      } else {
        arr.push(this.recipeFormService.createStepGroup(1));
      }
    }
    this.workflowResetTrigger_ += 1;
  }
  applyWorkflowFormToRecipe() {
    const recipe = this.recipe_();
    if (!recipe || !this.editMode_())
      return;
    const raw = this.workflowFormArray.getRawValue();
    const isDish = this.isDish_();
    if (isDish) {
      const prepItems = (raw || []).filter((r) => !!r?.preparation_name?.trim()).map((r) => {
        const qty = typeof r.quantity === "number" ? r.quantity : Number(r.quantity) || 1;
        const item = {
          preparation_name: r.preparation_name ?? "",
          category_name: r.category_name ?? "",
          quantity: qty,
          unit: r.unit ?? "unit"
        };
        if (r.main_category_name !== void 0 && r.main_category_name !== "") {
          item.main_category_name = r.main_category_name;
        }
        return item;
      });
      const byCategory = /* @__PURE__ */ new Map();
      prepItems.forEach((p) => {
        const list = byCategory.get(p.category_name) ?? [];
        list.push({ item_name: p.preparation_name, unit: p.unit, quantity: p.quantity });
        byCategory.set(p.category_name, list);
      });
      const prepCategories = Array.from(byCategory.entries()).map(([category_name, items]) => ({
        category_name,
        items: items.map((it) => ({ item_name: it.item_name, unit: it.unit }))
      }));
      this.recipe_.update((r) => __spreadProps(__spreadValues({}, r), {
        prep_items_: prepItems,
        prep_categories_: prepCategories
      }));
    } else {
      const steps = (raw || []).filter((s) => !!s?.instruction?.trim()).map((step, i) => ({
        order_: step?.order ?? i + 1,
        instruction_: step?.instruction ?? "",
        labor_time_minutes_: step?.labor_time ?? 0
      }));
      this.recipe_.update((r) => __spreadProps(__spreadValues({}, r), { steps_: steps.length ? steps : [] }));
    }
  }
  static \u0275fac = function CookViewPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _CookViewPage)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _CookViewPage, selectors: [["app-cook-view-page"]], decls: 4, vars: 2, consts: [["dir", "rtl", 1, "cook-view-container"], [1, "cook-view-empty"], [3, "exportClick", "printClick", "close", "payload"], [1, "cook-view-shell"], [1, "edit-mode-banner"], [1, "scaled-view-banner"], [1, "cook-view-header"], [1, "header-top"], [1, "recipe-name"], [1, "edit-actions"], [1, "scaled-cost-badge"], [1, "cook-view-main"], [1, "cook-view-section", "ingredients-section"], [1, "section-title"], ["name", "flask-conical", 3, "size"], [1, "ingredients-table"], [1, "ingredients-table-header"], [1, "col-name"], [1, "col-amount"], [1, "col-unit"], [1, "col-scale-action"], [1, "ingredients-table-row", 3, "field-changed", "view-mode-row", "row-highlight", "setting-by", "cv-ingredient-row--checked"], [1, "cook-view-section", "prep-section"], [1, "cook-view-section", "steps-section"], [3, "approve", "approved", "disabled"], [1, "scaled-view-text"], ["type", "button", 1, "back-to-full-recipe-btn", 3, "click"], ["name", "rotate-ccw", 3, "size"], ["type", "button", 1, "edit-btn", "save-btn", 3, "click", "disabled"], ["size", "small", 3, "inline"], ["name", "save", 3, "size"], ["type", "button", 1, "edit-btn", "undo-btn", 3, "click"], ["type", "button", 1, "edit-btn", 3, "click", "disabled"], ["name", "pencil", 3, "size"], [1, "export-bar-wrap", 3, "mouseleave"], [1, "export-bar-actions"], [1, "export-bar-label"], ["type", "button", 1, "edit-btn", "export-view-btn", 3, "click"], ["name", "eye", 3, "size"], ["type", "button", 1, "edit-btn", "export-download-btn", 3, "click"], ["name", "download", 3, "size"], ["type", "button", 1, "edit-btn", "export-bar-main", 3, "click"], [1, "cv-multiplier-chips"], [1, "quantity-control-wrap"], [1, "quantity-label"], [3, "valueChange", "value", "min", "stepOptions"], ["placeholder", "unit", 1, "unit-select", 3, "ngModelChange", "ngModel", "options", "typeToFilter"], [1, "conversion-badge"], ["type", "button", 1, "c-chip", "cv-chip-btn", 3, "cv-chip--active"], ["type", "button", 1, "c-chip", "cv-chip-btn", 3, "click"], ["name", "scale", 3, "size"], [1, "ingredients-table-row", 3, "click"], [1, "col-amount", "edit-amount"], ["type", "button", 1, "qty-btn", "minus", "small", 3, "click"], ["name", "minus", 3, "size"], ["type", "number", 1, "amount-input", 3, "input", "keydown", "value", "min", "step"], ["type", "button", 1, "qty-btn", "plus", "small", 3, "click"], ["name", "plus", 3, "size"], ["type", "button", 1, "remove-ingredient-btn", 3, "click"], ["name", "trash-2", 3, "size"], [1, "col-amount", "set-by-amount"], ["type", "number", 1, "amount-input", 3, "ngModelChange", "keydown", "ngModel", "min", "step"], ["type", "button", 1, "convert-scale-btn", 3, "click"], ["type", "button", 1, "cancel-set-by-btn", 3, "click"], [1, "col-name", "col-name-with-set-by"], [1, "col-name-text"], ["type", "button", 1, "set-by-ingredient-btn", 3, "click"], ["placeholder", "unit", 1, "unit-select", 3, "ngModel", "options", "typeToFilter"], ["name", "utensils", 3, "size"], [3, "workflowFormArray", "type", "resetTrigger", "focusRowAt"], [3, "addItem", "removeItem", "sortByCategory", "focusRowDone", "workflowFormArray", "type", "resetTrigger", "focusRowAt"], [1, "prep-list"], [1, "empty-state-text"], [1, "prep-row"], [1, "prep-name"], [1, "prep-amount"], ["name", "timer", 3, "size"], [1, "cv-step-counter"], [1, "steps-list"], [1, "step-item", 3, "cv-step-item--checked"], [1, "step-item"], ["type", "button", 1, "cv-step-check-btn", 3, "click"], ["name", "circle-check", 3, "size"], ["name", "circle", 3, "size"], [1, "step-order"], [1, "step-instruction"], ["type", "button", 1, "step-time"], ["type", "button", 1, "step-time", 3, "click"], ["routerLink", "/recipe-book", 1, "c-btn-primary"], [1, "cv-recent-chips"], [1, "cv-recent-label"], [1, "c-chip", 3, "routerLink"]], template: function CookViewPage_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0);
      \u0275\u0275template(1, CookViewPage_Conditional_1_Template, 34, 30)(2, CookViewPage_Conditional_2_Template, 9, 8, "div", 1);
      \u0275\u0275elementStart(3, "app-export-preview", 2);
      \u0275\u0275listener("exportClick", function CookViewPage_Template_app_export_preview_exportClick_3_listener() {
        return ctx.onExportFromPreview();
      })("printClick", function CookViewPage_Template_app_export_preview_printClick_3_listener() {
        return ctx.onPrintFromPreview();
      })("close", function CookViewPage_Template_app_export_preview_close_3_listener() {
        return ctx.onExportPreviewClose();
      });
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      let tmp_0_0;
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_0_0 = ctx.recipe_()) ? 1 : 2, tmp_0_0);
      \u0275\u0275advance(2);
      \u0275\u0275property("payload", ctx.exportPreviewPayload_());
    }
  }, dependencies: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    DefaultValueAccessor,
    NumberValueAccessor,
    NgControlStatus,
    MinValidator,
    FormsModule,
    NgModel,
    RouterLink,
    LucideAngularModule,
    LucideAngularComponent,
    TranslatePipe,
    RecipeWorkflowComponent,
    LoaderComponent,
    CustomSelectComponent,
    FormatQuantityPipe,
    ExportPreviewComponent,
    ApproveStampComponent,
    CounterComponent
  ], styles: ['@charset "UTF-8";\n\n\n\n[_nghost-%COMP%] {\n  display: block;\n  min-height: 100vh;\n  min-height: 100dvh;\n  --cv-bg: var(--bg-body);\n  --cv-break-md: 56.25rem;\n  --cv-header-start: var(--color-primary-soft);\n  --cv-header-end: var(--bg-success);\n  --cv-shadow-card: var(--shadow-glass);\n  --cv-radius-xl: var(--radius-xl);\n  --cv-radius-2xl: var(--radius-lg);\n  --cv-radius-full: var(--radius-full);\n  --cv-radius-md: var(--radius-md);\n  --cv-radius-sm: var(--radius-sm);\n  --cv-accent: var(--color-primary);\n  --cv-section-bg: var(--bg-glass);\n  --cv-border-edit: var(--border-warning);\n  --cv-bg-banner: var(--bg-warning);\n  --cv-text-banner: var(--text-warning);\n  --cv-bg-success: var(--bg-success);\n  --cv-text-success: var(--text-success);\n  --cv-border-success: var(--color-success);\n  --cv-border-warning: var(--border-warning);\n  --cv-text-heading: var(--color-text-main);\n  --cv-border-accent: var(--border-focus);\n  --cv-border-accent-strong: rgba(20, 184, 166, 0.3);\n  --cv-accent-soft: var(--color-primary-soft);\n  --cv-shadow-accent: var(--shadow-glow);\n  --cv-shadow-badge: var(--shadow-glass);\n  --cv-border-light: var(--border-default);\n  --cv-bg-row-even: var(--bg-glass);\n  --cv-bg-changed: var(--bg-warning);\n  --cv-border-changed: var(--border-warning);\n  --cv-bg-prep: var(--color-primary-soft);\n  --cv-bg-step: var(--bg-glass);\n  --cv-border-step: var(--border-default);\n  --cv-shadow-setting: 0 0 0 2px rgba(245, 158, 11, 0.45);\n  --cv-shadow-glow: var(--shadow-glow);\n  --cv-border-amber: var(--border-warning);\n}\n.cook-view-container[_ngcontent-%COMP%] {\n  display: block;\n  max-width: 45rem;\n  min-height: 100vh;\n  min-height: 100dvh;\n  background: transparent;\n  margin: 0 auto;\n  padding: 1.25rem;\n}\n@media (min-width: 56.25rem) {\n  .cook-view-container[_ngcontent-%COMP%] {\n    max-width: 75rem;\n    padding: 1.5rem 2rem;\n  }\n}\n.cook-view-empty[_ngcontent-%COMP%] {\n  display: block;\n  background: var(--bg-glass-strong);\n  color: inherit;\n  font-size: inherit;\n  text-align: center;\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  padding: 3rem 2rem;\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n}\n.cook-view-empty[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  font-size: 1.1rem;\n  margin: 0 0 1rem;\n}\n.cook-view-empty[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n  font-weight: 600;\n  text-decoration: underline;\n}\n.cook-view-empty[_ngcontent-%COMP%]   lucide-icon[_ngcontent-%COMP%] {\n  display: block;\n  color: var(--color-primary);\n  opacity: 0.9;\n  margin: 0 auto 1rem;\n}\n.cook-view-shell[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.cook-view-shell.edit-mode[_ngcontent-%COMP%] {\n  background: var(--cv-section-bg);\n  border: 1px solid var(--cv-border-edit);\n  border-radius: var(--cv-radius-xl);\n  padding: 1rem;\n}\n.cook-view-shell.scaled-view[_ngcontent-%COMP%] {\n  background: var(--cv-accent-soft);\n  border: 2px solid var(--cv-border-accent-strong);\n  border-radius: var(--cv-radius-xl);\n  padding: 1rem;\n  box-shadow: var(--cv-shadow-glow);\n}\n@media (min-width: 56.25rem) {\n  .cook-view-shell[_ngcontent-%COMP%] {\n    display: grid;\n    grid-template-rows: auto 1fr;\n    grid-template-columns: 1fr;\n    gap: 1rem;\n    min-height: calc(100vh - 3rem);\n  }\n  .cook-view-shell[_ngcontent-%COMP%]   .cook-view-header[_ngcontent-%COMP%] {\n    top: 0;\n    z-index: 10;\n  }\n  .cook-view-shell[_ngcontent-%COMP%]   .cook-view-main[_ngcontent-%COMP%] {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    align-items: start;\n    gap: 1.5rem;\n  }\n  .cook-view-shell[_ngcontent-%COMP%]   .ingredients-section[_ngcontent-%COMP%], \n   .cook-view-shell[_ngcontent-%COMP%]   .prep-section[_ngcontent-%COMP%], \n   .cook-view-shell[_ngcontent-%COMP%]   .steps-section[_ngcontent-%COMP%] {\n    min-height: 0;\n  }\n}\n.edit-mode-banner[_ngcontent-%COMP%] {\n  display: block;\n  background: var(--cv-bg-banner);\n  color: var(--cv-text-banner);\n  font-size: 0.875rem;\n  font-weight: 600;\n  text-align: center;\n  border-radius: var(--cv-radius-2xl);\n  margin: 0 0 0.5rem;\n  padding: 0.5rem 1rem;\n}\n.edit-actions[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.save-btn[_ngcontent-%COMP%] {\n  background: var(--cv-bg-success);\n  color: var(--cv-text-success);\n  border-color: var(--cv-border-success);\n}\n.undo-btn[_ngcontent-%COMP%] {\n  background: var(--cv-bg-banner);\n  color: var(--cv-text-banner);\n  border-color: var(--cv-border-warning);\n}\n.cook-view-main[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.cook-view-header[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      var(--cv-header-start) 0%,\n      var(--cv-header-end) 100%);\n  border: 1px solid var(--cv-border-accent);\n  border-radius: var(--cv-radius-xl);\n  padding: 1.25rem 1.5rem;\n  box-shadow: var(--cv-shadow-card);\n}\n.cook-view-header[_ngcontent-%COMP%]   .header-top[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.75rem;\n  margin-block-end: 1rem;\n}\n.cook-view-header[_ngcontent-%COMP%]   .recipe-name[_ngcontent-%COMP%] {\n  font-size: 1.35rem;\n  font-weight: 700;\n  color: var(--cv-text-heading);\n  margin: 0;\n}\n.cook-view-header[_ngcontent-%COMP%]   .edit-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  background: var(--bg-pure);\n  color: var(--cv-accent);\n  font-size: 0.875rem;\n  border: 1px solid var(--cv-border-accent-strong);\n  border-radius: var(--cv-radius-2xl);\n  padding: 0.5rem 0.875rem;\n  cursor: pointer;\n  transition: background 0.2s, transform 0.15s;\n}\n.cook-view-header[_ngcontent-%COMP%]   .edit-btn[_ngcontent-%COMP%]:hover {\n  background: var(--cv-accent-soft);\n  transform: scale(1.02);\n}\n.cook-view-header[_ngcontent-%COMP%]   .export-bar-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.cook-view-header[_ngcontent-%COMP%]   .export-bar-actions[_ngcontent-%COMP%] {\n  display: none;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.cook-view-header[_ngcontent-%COMP%]   .export-bar-actions.expanded[_ngcontent-%COMP%] {\n  display: flex;\n}\n.cook-view-header[_ngcontent-%COMP%]   .export-bar-label[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  margin-inline-end: 0.25rem;\n}\n.cook-view-header[_ngcontent-%COMP%]   .export-bar-main[_ngcontent-%COMP%] {\n  display: inline-flex;\n}\n.cook-view-header[_ngcontent-%COMP%]   .quantity-control-wrap[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.875rem;\n}\n.cook-view-header[_ngcontent-%COMP%]   .quantity-label[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: var(--cv-text-heading);\n}\n.cook-view-header[_ngcontent-%COMP%]   .quantity-controls[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  overflow: hidden;\n  background: var(--bg-pure);\n  border: 0.125rem solid var(--cv-accent);\n  border-radius: var(--cv-radius-full);\n  box-shadow: var(--cv-shadow-accent);\n}\n.cook-view-header[_ngcontent-%COMP%]   .qty-btn[_ngcontent-%COMP%] {\n  background: transparent;\n  color: var(--cv-accent);\n  border: none;\n  padding: 0.5rem 0.875rem;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.cook-view-header[_ngcontent-%COMP%]   .qty-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--cv-accent-soft);\n}\n.cook-view-header[_ngcontent-%COMP%]   .qty-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.cook-view-header[_ngcontent-%COMP%]   .quantity-input[_ngcontent-%COMP%] {\n  background: transparent;\n  font-size: 1.05rem;\n  font-weight: 600;\n  text-align: center;\n  border: none;\n  border-inline: 1px solid var(--cv-border-light);\n  width: 4rem;\n  padding: 0.5rem;\n}\n.cook-view-header[_ngcontent-%COMP%]   .unit-label[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: var(--cv-text-heading);\n}\n.cook-view-header[_ngcontent-%COMP%]   .scaled-cost-badge[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  background: var(--cv-bg-success);\n  color: var(--cv-text-success);\n  font-size: 0.875rem;\n  font-weight: 600;\n  border-radius: var(--cv-radius-full);\n  margin-block-start: 0.875rem;\n  padding: 0.375rem 0.75rem;\n  box-shadow: var(--cv-shadow-badge);\n}\n.cook-view-header[_ngcontent-%COMP%]   .scaled-cost-badge[_ngcontent-%COMP%]   lucide-icon[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n}\n.cv-multiplier-chips[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  margin-block-end: 0.75rem;\n}\n.cv-chip-btn[_ngcontent-%COMP%] {\n  cursor: pointer;\n  border: 1px solid var(--cv-border-accent-strong);\n  transition: background 0.2s, color 0.2s;\n}\n.cv-chip--active[_ngcontent-%COMP%] {\n  background: var(--cv-accent);\n  color: var(--color-text-on-primary);\n  border-color: var(--cv-accent);\n}\n.cv-recent-chips[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n  margin-block-start: 1rem;\n}\n.cv-recent-label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-text-muted);\n}\n.cook-view-section[_ngcontent-%COMP%] {\n  background: var(--bg-pure);\n  border: 1px solid var(--cv-border-amber);\n  border-radius: var(--cv-radius-xl);\n  padding: 1rem 1.25rem;\n  box-shadow: var(--cv-shadow-card);\n}\n.cook-view-section[_ngcontent-%COMP%]   .section-title[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  font-size: 1.05rem;\n  font-weight: 700;\n  color: var(--cv-text-heading);\n  border: none;\n  margin: 0 0 0.875rem;\n}\n.cook-view-section[_ngcontent-%COMP%]   .section-title[_ngcontent-%COMP%]   lucide-icon[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  color: var(--cv-accent);\n}\n.ingredients-table[_ngcontent-%COMP%] {\n  overflow: hidden;\n  border: 1px solid var(--cv-border-light);\n  border-radius: var(--radius-md);\n}\n.ingredients-table-header[_ngcontent-%COMP%], \n.ingredients-table-row[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: minmax(120px, 1fr) minmax(60px, auto) minmax(60px, auto);\n  align-items: start;\n  gap: 0.375rem;\n  padding: 0.625rem 0.875rem;\n}\n.ingredients-table-header.has-scale-action[_ngcontent-%COMP%], \n.ingredients-table-row.view-mode-row[_ngcontent-%COMP%] {\n  grid-template-columns: minmax(120px, 1fr) minmax(60px, auto) minmax(60px, auto) minmax(80px, auto);\n}\n.ingredients-table-header[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      180deg,\n      var(--cv-header-end) 0%,\n      var(--cv-header-start) 100%);\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--cv-text-heading);\n}\n.ingredients-table-row[_ngcontent-%COMP%] {\n  background: var(--bg-pure);\n  border-block-start: 1px solid var(--bg-muted);\n}\n.ingredients-table-row[_ngcontent-%COMP%]:nth-child(even) {\n  background: var(--cv-bg-row-even);\n}\n.ingredients-table-row[_ngcontent-%COMP%]   .col-name[_ngcontent-%COMP%] {\n  font-weight: 500;\n}\n.ingredients-table-row[_ngcontent-%COMP%]   .col-amount[_ngcontent-%COMP%] {\n  font-size: 1.1rem;\n  font-weight: 700;\n  color: var(--cv-accent);\n}\n.ingredients-table-header[_ngcontent-%COMP%]    > .col-name[_ngcontent-%COMP%], \n.ingredients-table-header[_ngcontent-%COMP%]    > .col-amount[_ngcontent-%COMP%], \n.ingredients-table-header[_ngcontent-%COMP%]    > .col-unit[_ngcontent-%COMP%], \n.ingredients-table-header[_ngcontent-%COMP%]    > .col-scale-action[_ngcontent-%COMP%], \n.ingredients-table-row[_ngcontent-%COMP%]    > .col-name[_ngcontent-%COMP%], \n.ingredients-table-row[_ngcontent-%COMP%]    > .col-amount[_ngcontent-%COMP%], \n.ingredients-table-row[_ngcontent-%COMP%]    > .col-unit[_ngcontent-%COMP%], \n.ingredients-table-row[_ngcontent-%COMP%]    > .col-scale-action[_ngcontent-%COMP%] {\n  align-self: start;\n}\n.col-name[_ngcontent-%COMP%] {\n  min-width: 0;\n}\n.col-name-with-set-by[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-start;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.col-name-text[_ngcontent-%COMP%] {\n  min-width: 0;\n}\n.col-amount[_ngcontent-%COMP%], \n.col-unit[_ngcontent-%COMP%] {\n  white-space: nowrap;\n}\n@media (max-width: 56.25rem) {\n  .ingredients-table-row.view-mode-row[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr auto;\n    grid-template-rows: auto auto;\n  }\n  .ingredients-table-row.view-mode-row[_ngcontent-%COMP%]   .col-name[_ngcontent-%COMP%], \n   .ingredients-table-row.view-mode-row[_ngcontent-%COMP%]   .col-name-with-set-by[_ngcontent-%COMP%] {\n    grid-column: 1;\n    grid-row: 1;\n  }\n  .ingredients-table-row.view-mode-row[_ngcontent-%COMP%]   .col-amount[_ngcontent-%COMP%] {\n    grid-column: 2;\n    grid-row: 1;\n    text-align: end;\n  }\n  .ingredients-table-row.view-mode-row[_ngcontent-%COMP%]   .col-unit[_ngcontent-%COMP%] {\n    grid-column: 2;\n    grid-row: 2;\n    text-align: end;\n  }\n  .ingredients-table-row.view-mode-row[_ngcontent-%COMP%]   .col-scale-action[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n    grid-row: 2;\n  }\n}\n.unit-select[_ngcontent-%COMP%] {\n  min-width: 4rem;\n  width: 100px;\n  background: var(--bg-pure);\n  font-size: 0.875rem;\n  border: 1px solid var(--cv-border-light);\n  border-radius: var(--cv-radius-md);\n  margin-inline-end: 8px;\n  padding: 0.25rem 0.5rem;\n}\n.conversion-badge[_ngcontent-%COMP%] {\n  font-size: 0.8rem;\n  background: var(--color-primary-soft);\n  border-radius: var(--radius-sm);\n  margin-inline-end: 8px;\n  padding: 2px 6px;\n}\n.edit-amount[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-start;\n  gap: 0.25rem;\n}\n.edit-amount[_ngcontent-%COMP%]   .qty-btn.small[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.5rem;\n}\n.edit-amount[_ngcontent-%COMP%]   .amount-input[_ngcontent-%COMP%] {\n  background: transparent;\n  font-size: 0.9rem;\n  text-align: center;\n  border: 1px solid var(--cv-border-light);\n  border-radius: var(--cv-radius-md);\n  width: 3.5rem;\n  padding: 0.25rem 0.5rem;\n}\n.remove-ingredient-btn[_ngcontent-%COMP%] {\n  background: transparent;\n  color: var(--color-danger);\n  border: none;\n  border-radius: var(--cv-radius-sm);\n  margin-inline-start: 0.5rem;\n  padding: 0.25rem;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.remove-ingredient-btn[_ngcontent-%COMP%]:hover {\n  background: var(--bg-danger-subtle);\n}\n.ingredients-table-row.field-changed[_ngcontent-%COMP%] {\n  background: var(--cv-bg-changed);\n  border-inline-start: 0.1875rem solid var(--cv-border-changed);\n}\n.ingredients-table-row.view-mode-row[_ngcontent-%COMP%] {\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.ingredients-table-row.view-mode-row[_ngcontent-%COMP%]:hover, \n.ingredients-table-row.row-highlight[_ngcontent-%COMP%] {\n  box-shadow: 0 0 0 1px var(--cv-border-accent), var(--cv-shadow-accent);\n}\n.ingredients-table-row.setting-by[_ngcontent-%COMP%] {\n  background: var(--cv-accent-soft);\n  border: 1px solid var(--cv-border-accent-strong);\n  box-shadow: var(--cv-shadow-setting);\n}\n.ingredients-table-row.view-mode-row[_ngcontent-%COMP%]   .set-by-ingredient-btn[_ngcontent-%COMP%] {\n  opacity: 0;\n  transition: opacity 0.2s ease;\n}\n.ingredients-table-row.view-mode-row[_ngcontent-%COMP%]:hover   .set-by-ingredient-btn[_ngcontent-%COMP%], \n.ingredients-table-row.setting-by[_ngcontent-%COMP%]   .set-by-ingredient-btn[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.col-scale-action[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-start;\n  flex-wrap: wrap;\n  gap: 0.375rem;\n}\n.set-by-ingredient-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  background: transparent;\n  color: var(--cv-accent);\n  font-size: 0.75rem;\n  border: 1px solid var(--cv-border-accent-strong);\n  border-radius: var(--cv-radius-md);\n  padding: 0.25rem 0.5rem;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.set-by-ingredient-btn[_ngcontent-%COMP%]:hover {\n  background: var(--cv-accent-soft);\n}\n.set-by-amount[_ngcontent-%COMP%]   .amount-input[_ngcontent-%COMP%] {\n  background: var(--bg-pure);\n  font-size: 0.9rem;\n  text-align: center;\n  border: 1px solid var(--cv-border-light);\n  border-radius: var(--cv-radius-md);\n  width: 3.5rem;\n  padding: 0.25rem 0.5rem;\n}\n.convert-scale-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  background: var(--cv-accent);\n  color: var(--color-text-on-primary);\n  font-size: 0.8rem;\n  font-weight: 600;\n  border: none;\n  border-radius: var(--cv-radius-md);\n  padding: 0.25rem 0.5rem;\n  cursor: pointer;\n  transition: filter 0.2s;\n}\n.convert-scale-btn[_ngcontent-%COMP%]:hover {\n  filter: brightness(1.08);\n}\n.cancel-set-by-btn[_ngcontent-%COMP%] {\n  background: transparent;\n  color: var(--color-text-muted);\n  font-size: 0.8rem;\n  border: 1px solid var(--cv-border-light);\n  border-radius: var(--cv-radius-md);\n  padding: 0.25rem 0.5rem;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.cancel-set-by-btn[_ngcontent-%COMP%]:hover {\n  background: var(--bg-muted);\n}\n.cv-ingredient-row--checked[_ngcontent-%COMP%] {\n  opacity: 0.5;\n}\n.cv-ingredient-row--checked[_ngcontent-%COMP%]   .col-name[_ngcontent-%COMP%], \n.cv-ingredient-row--checked[_ngcontent-%COMP%]   .col-amount[_ngcontent-%COMP%], \n.cv-ingredient-row--checked[_ngcontent-%COMP%]   .col-unit[_ngcontent-%COMP%] {\n  text-decoration: line-through;\n}\n.scaled-view-banner[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex-wrap: wrap;\n  background: var(--cv-accent-soft);\n  border: 1px solid var(--cv-border-accent-strong);\n  border-radius: var(--cv-radius-md);\n  gap: 0.75rem;\n  padding: 0.625rem 1rem;\n}\n.scaled-view-text[_ngcontent-%COMP%] {\n  font-size: 0.9rem;\n  font-weight: 600;\n  color: var(--cv-text-heading);\n}\n.back-to-full-recipe-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.375rem;\n  background: var(--cv-accent);\n  color: var(--color-text-on-primary);\n  font-size: 0.875rem;\n  font-weight: 600;\n  border: none;\n  border-radius: var(--cv-radius-2xl);\n  padding: 0.375rem 0.75rem;\n  cursor: pointer;\n  transition: filter 0.2s;\n}\n.back-to-full-recipe-btn[_ngcontent-%COMP%]:hover {\n  filter: brightness(1.08);\n}\n.prep-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.prep-row[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  background: var(--cv-bg-prep);\n  border-inline-start: 0.1875rem solid var(--cv-accent);\n  border-radius: var(--cv-radius-2xl);\n  gap: 1rem;\n  padding: 0.625rem 0.875rem;\n}\n.prep-name[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: var(--cv-text-heading);\n}\n.steps-list[_ngcontent-%COMP%] {\n  margin: 0;\n  padding-inline-start: 1.5rem;\n}\n.cv-step-check-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-width: 3rem;\n  min-height: 3rem;\n  background: transparent;\n  color: var(--cv-accent);\n  border: none;\n  border-radius: var(--cv-radius-full);\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.cv-step-check-btn[_ngcontent-%COMP%]:hover {\n  background: var(--cv-accent-soft);\n}\n.cv-step-counter[_ngcontent-%COMP%] {\n  background: var(--cv-accent-soft);\n  color: var(--cv-accent);\n  font-size: 0.8rem;\n  font-weight: 600;\n  border-radius: var(--cv-radius-full);\n  margin-inline-start: auto;\n  padding-block: 0.125rem;\n  padding-inline: 0.5rem;\n}\n.step-item[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n  background: var(--cv-bg-step);\n  border: 1px solid var(--cv-border-step);\n  border-inline-start: 0.25rem solid var(--cv-accent);\n  border-radius: var(--cv-radius-2xl);\n  gap: 0.5rem;\n  margin-block-end: 0.5rem;\n  padding: 0.5rem 0.75rem;\n}\n@media (min-width: 56.25rem) {\n  .step-item[_ngcontent-%COMP%] {\n    margin-block-end: 0.375rem;\n    padding: 0.4rem 0.6rem;\n  }\n}\n.cv-step-item--checked[_ngcontent-%COMP%] {\n  opacity: 0.6;\n}\n.cv-step-item--checked[_ngcontent-%COMP%]   .step-instruction[_ngcontent-%COMP%] {\n  text-decoration: line-through;\n}\n.step-order[_ngcontent-%COMP%] {\n  min-width: 1.5rem;\n  font-weight: 700;\n  color: var(--cv-accent);\n}\n.step-instruction[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.step-time[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  background: var(--cv-accent-soft);\n  color: var(--cv-text-heading);\n  font-size: 0.8rem;\n  font-weight: 500;\n  border: none;\n  border-radius: var(--cv-radius-full);\n  padding-block: 0.2rem;\n  padding-inline: 0.5rem;\n  cursor: pointer;\n  transition: background 0.2s, color 0.2s;\n}\n.step-time[_ngcontent-%COMP%]:hover {\n  background: var(--cv-accent);\n  color: var(--color-text-on-primary);\n}\n.empty-state-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-style: italic;\n  margin: 0;\n  padding: 1rem;\n}\n/*# sourceMappingURL=cook-view.page.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CookViewPage, [{
    type: Component,
    args: [{ selector: "app-cook-view-page", standalone: true, imports: [
      CommonModule,
      ReactiveFormsModule,
      FormsModule,
      RouterLink,
      LucideAngularModule,
      TranslatePipe,
      RecipeWorkflowComponent,
      LoaderComponent,
      CustomSelectComponent,
      FormatQuantityPipe,
      ExportPreviewComponent,
      ApproveStampComponent,
      CounterComponent
    ], template: `<div class="cook-view-container" dir="rtl">
  @if (recipe_(); as recipe) {
    <div class="cook-view-shell" [class.edit-mode]="editMode_()" [class.scaled-view]="isScaledView_()">
      @if (editMode_()) {
        <div class="edit-mode-banner">{{ 'edit_mode' | translatePipe }}</div>
      }
      @if (!editMode_() && isScaledView_() && scaledViewRow_(); as scaledRow) {
        <div class="scaled-view-banner">
          <span class="scaled-view-text">
            {{ 'scaled_to' | translatePipe }} {{ scaleByIngredientAmount_()! | formatQuantity }} {{ scaledRow.unit | translatePipe }} {{ scaledRow.name }}
          </span>
          <button type="button" class="back-to-full-recipe-btn" (click)="resetToFullRecipe()" [attr.aria-label]="'back_to_full_recipe' | translatePipe">
            <lucide-icon name="rotate-ccw" [size]="18"></lucide-icon>
            {{ 'back_to_full_recipe' | translatePipe }}
          </button>
        </div>
      }
      <header class="cook-view-header">
        <div class="header-top">
          <h1 class="recipe-name">{{ recipe.name_hebrew }}</h1>
          @if (editMode_()) {
            <div class="edit-actions">
              <button type="button" class="edit-btn save-btn" (click)="saveEdits()" [disabled]="isSaving_()" [attr.aria-label]="'save_changes' | translatePipe">
                @if (isSaving_()) {
                  <app-loader size="small" [inline]="true" />
                }
                <lucide-icon name="save" [size]="18"></lucide-icon>
                {{ 'save_changes' | translatePipe }}
              </button>
              <button type="button" class="edit-btn undo-btn" (click)="undoEdits()" [attr.aria-label]="'undo_changes' | translatePipe">
                <lucide-icon name="rotate-ccw" [size]="18"></lucide-icon>
                {{ 'undo_changes' | translatePipe }}
              </button>
            </div>
          } @else {
            <button type="button" class="edit-btn" (click)="enterEditMode()"
              [attr.aria-label]="'edit' | translatePipe"
              [disabled]="!isLoggedIn()"
              [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
              <lucide-icon name="pencil" [size]="18"></lucide-icon>
              {{ 'edit' | translatePipe }}
            </button>
            <div class="export-bar-wrap" (mouseleave)="exportBarExpanded_.set(false)">
              <div class="export-bar-actions" [class.expanded]="exportBarExpanded_()">
                <span class="export-bar-label">{{ 'export_recipe_info' | translatePipe }}</span>
                <button type="button" class="edit-btn export-view-btn" (click)="onViewRecipeInfo()" [attr.aria-label]="'view' | translatePipe">
                  <lucide-icon name="eye" [size]="18"></lucide-icon>
                </button>
                <button type="button" class="edit-btn export-download-btn" (click)="onExportInfo()" [attr.aria-label]="'export_recipe_info' | translatePipe">
                  <lucide-icon name="download" [size]="18"></lucide-icon>
                </button>
                <span class="export-bar-label">{{ 'export_shopping_list' | translatePipe }}</span>
                <button type="button" class="edit-btn export-view-btn" (click)="onViewShoppingList()" [attr.aria-label]="'view' | translatePipe">
                  <lucide-icon name="eye" [size]="18"></lucide-icon>
                </button>
                <button type="button" class="edit-btn export-download-btn" (click)="onExportShoppingList()" [attr.aria-label]="'export_shopping_list' | translatePipe">
                  <lucide-icon name="download" [size]="18"></lucide-icon>
                </button>
                @if (isDish_()) {
                  <span class="export-bar-label">{{ 'export_checklist' | translatePipe }}</span>
                  <button type="button" class="edit-btn export-view-btn" (click)="onViewDishChecklist()" [attr.aria-label]="'view' | translatePipe">
                    <lucide-icon name="eye" [size]="18"></lucide-icon>
                  </button>
                  <button type="button" class="edit-btn export-download-btn" (click)="onExportDishChecklist()" [attr.aria-label]="'export_checklist' | translatePipe">
                    <lucide-icon name="download" [size]="18"></lucide-icon>
                  </button>
                } @else {
                  <span class="export-bar-label">{{ 'export_cooking_steps' | translatePipe }}</span>
                  <button type="button" class="edit-btn export-view-btn" (click)="onViewCookingSteps()" [attr.aria-label]="'view' | translatePipe">
                    <lucide-icon name="eye" [size]="18"></lucide-icon>
                  </button>
                  <button type="button" class="edit-btn export-download-btn" (click)="onExportCookingSteps()" [attr.aria-label]="'export_cooking_steps' | translatePipe">
                    <lucide-icon name="download" [size]="18"></lucide-icon>
                  </button>
                }
              </div>
              <button type="button" class="edit-btn export-bar-main" (click)="toggleExportBar()" [attr.aria-label]="'export' | translatePipe" [attr.aria-expanded]="exportBarExpanded_()">
                <lucide-icon name="download" [size]="18"></lucide-icon>
                {{ 'export' | translatePipe }}
              </button>
            </div>
          }
        </div>
        @if (!isScaledView_()) {
          @if (!editMode_()) {
            <!-- Multiplier chip row \u2014 hidden during edit and scale-by-ingredient mode -->
            <div class="cv-multiplier-chips">
              @for (chip of multiplierChips; track chip.factor) {
                <!-- 0.5x chip on dish recipes: intentional \u2014 produces fractional yield (e.g. 1.5 dishes). Conscious design choice per QA review. -->
                <button
                  type="button"
                  class="c-chip cv-chip-btn"
                  [class.cv-chip--active]="activeMultiplier_() === chip.factor"
                  (click)="selectMultiplier(chip.factor)"
                  [attr.aria-pressed]="activeMultiplier_() === chip.factor">
                  {{ chip.key | translatePipe }}
                </button>
              }
            </div>
          }
          <div class="quantity-control-wrap">
            <span class="quantity-label">{{ 'make_quantity' | translatePipe }}</span>
            <app-counter
              [value]="targetQuantity_()"
              [min]="isDish_() ? 1 : 0.01"
              [stepOptions]="cookViewStepOpts_()"
              (valueChange)="setQuantity($event)" />
            <app-custom-select
              class="unit-select"
              [ngModel]="selectedUnit_()"
              (ngModelChange)="onYieldUnitChange($event)"
              [options]="yieldUnitOptions_()"
              placeholder="unit"
              [typeToFilter]="true">
            </app-custom-select>
            @if (recipe.yield_unit_ !== selectedUnit_()) {
              <span class="conversion-badge">
                \xD7{{ scaleFactor_() | number:'1.2-2' }}
              </span>
            }
          </div>
        }
        @if (scaledCost_() > 0) {
          <div class="scaled-cost-badge">
            <lucide-icon name="scale" [size]="16"></lucide-icon>
            <span>{{ 'cost' | translatePipe }}: \u20AA{{ scaledCost_() | number:'1.2-2' }}</span>
          </div>
        }
      </header>

      <div class="cook-view-main">
      <section class="cook-view-section ingredients-section">
        <h2 class="section-title">
          <lucide-icon name="flask-conical" [size]="20"></lucide-icon>
          {{ 'ingredients_index' | translatePipe }}
        </h2>
        <div class="ingredients-table">
          <div class="ingredients-table-header" [class.has-scale-action]="!editMode_()">
            <div class="col-name">{{ 'ingredient' | translatePipe }}</div>
            <div class="col-amount">{{ 'quantity' | translatePipe }}</div>
            <div class="col-unit">{{ 'unit' | translatePipe }}</div>
            @if (!editMode_()) {
              <div class="col-scale-action"></div>
            }
          </div>
          @for (row of scaledIngredients_(); track row.referenceId + row.unit + row.amount; let i = $index) {
            <div
              class="ingredients-table-row"
              [class.field-changed]="editMode_() && ingredientChanged(i)"
              [class.view-mode-row]="!editMode_()"
              [class.row-highlight]="!editMode_() && (settingByIngredientIndex_() === i)"
              [class.setting-by]="!editMode_() && settingByIngredientIndex_() === i"
              [class.cv-ingredient-row--checked]="!editMode_() && checkedIngredients_().has(i)"
              [attr.role]="!editMode_() ? 'checkbox' : null"
              [attr.aria-checked]="!editMode_() ? checkedIngredients_().has(i) : null"
              (click)="!editMode_() && settingByIngredientIndex_() !== i ? toggleIngredientCheck(i) : null">
              @if (editMode_()) {
                <div class="col-name">{{ row.name }}</div>
                <div class="col-amount edit-amount">
                  <button type="button" class="qty-btn minus small" (click)="setIngredientAmount(i, getEditAmountStep(row.amount, -1, row.unit))" [attr.aria-label]="'decrease' | translatePipe">
                    <lucide-icon name="minus" [size]="14"></lucide-icon>
                  </button>
                  <input type="number" class="amount-input" [value]="row.amount"
                    (input)="setIngredientAmount(i, $any($event.target).valueAsNumber ?? 0)"
                    (keydown)="onEditAmountKeydown($event, i, row.amount, row.unit)"
                    [min]="0" [step]="isDish_() ? 1 : 0.01" />
                  <button type="button" class="qty-btn plus small" (click)="setIngredientAmount(i, getEditAmountStep(row.amount, 1, row.unit))" [attr.aria-label]="'increase' | translatePipe">
                    <lucide-icon name="plus" [size]="14"></lucide-icon>
                  </button>
                </div>
                <div class="col-unit">
                  <app-custom-select
                    class="unit-select"
                    [ngModel]="row.unit"
                    (ngModelChange)="setIngredientUnit(i, $event)"
                    [options]="getUnitOptionsForRow(row)"
                    placeholder="unit"
                    [typeToFilter]="true" />
                  <button type="button" class="remove-ingredient-btn" (click)="removeIngredient(i)" [attr.aria-label]="'remove' | translatePipe">
                    <lucide-icon name="trash-2" [size]="16"></lucide-icon>
                  </button>
                </div>
              } @else {
                @if (settingByIngredientIndex_() === i) {
                  <div class="col-name">{{ row.name }}</div>
                  <div class="col-amount set-by-amount">
                    <input type="number" class="amount-input" [ngModel]="settingByIngredientAmount_()"
                      (ngModelChange)="onSettingAmountChange($event)"
                      (keydown)="onSettingAmountKeydown($event)"
                      [min]="0.01" [step]="isDish_() ? 1 : 0.1" />
                  </div>
                  <div class="col-unit"><span>{{ row.unit | translatePipe }}</span></div>
                  <div class="col-scale-action">
                    <button type="button" class="convert-scale-btn" (click)="confirmScaleByIngredient(i, settingByIngredientAmount_())" [attr.aria-label]="'convert' | translatePipe">
                      <lucide-icon name="scale" [size]="16"></lucide-icon>
                      {{ 'convert' | translatePipe }}
                    </button>
                    <button type="button" class="cancel-set-by-btn" (click)="cancelSetByIngredient()" [attr.aria-label]="'cancel' | translatePipe">
                      {{ 'cancel' | translatePipe }}
                    </button>
                  </div>
                } @else {
                  <div class="col-name col-name-with-set-by">
                    <span class="col-name-text">{{ row.name }}</span>
                    <button type="button" class="set-by-ingredient-btn" (click)="startSetByIngredient(i)" [attr.aria-label]="'set_recipe_by_this_item' | translatePipe">
                      <lucide-icon name="scale" [size]="14"></lucide-icon>
                      {{ 'set_recipe_by_this_item' | translatePipe }}
                    </button>
                  </div>
                  <div class="col-amount">{{ getDisplayAmount(i, row) | formatQuantity }}</div>
                  <div class="col-unit">
                    @if (row.availableUnits.length > 1) {
                      <app-custom-select
                        class="unit-select"
                        [ngModel]="getDisplayUnit(i, row)"
                        (ngModelChange)="setUnitOverride(i, $event)"
                        [options]="getUnitOptionsForRow(row)"
                        placeholder="unit"
                        [typeToFilter]="true" />
                    } @else {
                      <span>{{ getDisplayUnit(i, row) | translatePipe }}</span>
                    }
                  </div>
                  <div class="col-scale-action"></div>
                }
              }
            </div>
          }
        </div>
      </section>

      @if (isDish_()) {
        <section class="cook-view-section prep-section">
          <h2 class="section-title">
            <lucide-icon name="utensils" [size]="20"></lucide-icon>
            {{ 'prep_list_mise_en_place' | translatePipe }}
          </h2>
          @if (editMode_()) {
            <app-recipe-workflow
              [workflowFormArray]="workflowFormArray"
              [type]="'dish'"
              [resetTrigger]="workflowResetTrigger"
              [focusRowAt]="focusWorkflowRowAt_()"
              (addItem)="addWorkflowItem()"
              (removeItem)="removeWorkflowItem($event)"
              (sortByCategory)="sortPrepByCategory()"
              (focusRowDone)="onWorkflowFocusRowDone()">
            </app-recipe-workflow>
          } @else {
            @if (scaledPrep_().length > 0) {
              <div class="prep-list">
                @for (row of scaledPrep_(); track row.name + row.unit + row.amount) {
                  <div class="prep-row">
                    <span class="prep-name">{{ row.name }}</span>
                    <span class="prep-amount">{{ row.amount | formatQuantity }} {{ row.unit | translatePipe }}</span>
                  </div>
                }
              </div>
            } @else {
              <p class="empty-state-text">{{ 'no_preparations_defined' | translatePipe }}</p>
            }
          }
        </section>
      }

      @if (!isDish_()) {
        <section class="cook-view-section steps-section">
          <h2 class="section-title">
            <lucide-icon name="timer" [size]="20"></lucide-icon>
            {{ 'prep_workflow' | translatePipe }}
            @if (totalStepCount_() > 0) {
              <span class="cv-step-counter">{{ completedStepCount_() }}/{{ totalStepCount_() }}</span>
            }
          </h2>
          @if (editMode_()) {
            <app-recipe-workflow
              [workflowFormArray]="workflowFormArray"
              [type]="'preparation'"
              [resetTrigger]="workflowResetTrigger"
              [focusRowAt]="focusWorkflowRowAt_()"
              (addItem)="addWorkflowItem()"
              (removeItem)="removeWorkflowItem($event)"
              (sortByCategory)="sortPrepByCategory()"
              (focusRowDone)="onWorkflowFocusRowDone()">
            </app-recipe-workflow>
          } @else {
            @if (recipe.steps_ && recipe.steps_.length) {
              <ol class="steps-list">
                @for (step of recipe.steps_; track step.order_; let si = $index) {
                  <li class="step-item" [class.cv-step-item--checked]="checkedSteps_().has(si)">
                    <button
                      type="button"
                      class="cv-step-check-btn"
                      (click)="toggleStepCheck(si)"
                      [attr.aria-label]="'ingredient_checked' | translatePipe">
                      @if (checkedSteps_().has(si)) {
                        <lucide-icon name="circle-check" [size]="20"></lucide-icon>
                      } @else {
                        <lucide-icon name="circle" [size]="20"></lucide-icon>
                      }
                    </button>
                    <span class="step-order">{{ step.order_ }}</span>
                    <span class="step-instruction">{{ step.instruction_ }}</span>
                    @if (step.labor_time_minutes_ > 0) {
                      <button
                        type="button"
                        class="step-time"
                        (click)="onTimerHintTap(step.labor_time_minutes_)"
                        [attr.aria-label]="'voice_timer_hint' | translatePipe">
                        <lucide-icon name="timer" [size]="14"></lucide-icon>
                        {{ step.labor_time_minutes_ }} {{ 'min' | translatePipe }}
                      </button>
                    }
                  </li>
                }
              </ol>
            } @else {
              <p class="empty-state-text">{{ 'no_steps_defined' | translatePipe }}</p>
            }
          }
        </section>
      }
      </div>
    </div>
    <app-approve-stamp
      [approved]="recipe.is_approved_"
      [disabled]="isSaving_()"
      (approve)="onApproveStamp()" />
  } @else {
    <!-- Enhanced empty state: friendly icon, CTA, recent recipe quick-picks -->
    <div class="cook-view-empty">
      <lucide-icon name="utensils" [size]="48"></lucide-icon>
      <p>{{ 'pick_recipe_to_cook' | translatePipe }}</p>
      <a routerLink="/recipe-book" class="c-btn-primary">{{ 'recipe_book' | translatePipe }}</a>
      @if (cookViewState.recentIds().length > 0) {
        <div class="cv-recent-chips">
          <span class="cv-recent-label">{{ 'recent_recipes' | translatePipe }}</span>
          @for (id of cookViewState.recentIds(); track id) {
            <a [routerLink]="['/cook', id]" class="c-chip">{{ id }}</a>
          }
        </div>
      }
    </div>
  }
  <app-export-preview
    [payload]="exportPreviewPayload_()"
    (exportClick)="onExportFromPreview()"
    (printClick)="onPrintFromPreview()"
    (close)="onExportPreviewClose()" />
</div>
`, styles: ['@charset "UTF-8";\n\n/* src/app/pages/cook-view/cook-view.page.scss */\n:host {\n  display: block;\n  min-height: 100vh;\n  min-height: 100dvh;\n  --cv-bg: var(--bg-body);\n  --cv-break-md: 56.25rem;\n  --cv-header-start: var(--color-primary-soft);\n  --cv-header-end: var(--bg-success);\n  --cv-shadow-card: var(--shadow-glass);\n  --cv-radius-xl: var(--radius-xl);\n  --cv-radius-2xl: var(--radius-lg);\n  --cv-radius-full: var(--radius-full);\n  --cv-radius-md: var(--radius-md);\n  --cv-radius-sm: var(--radius-sm);\n  --cv-accent: var(--color-primary);\n  --cv-section-bg: var(--bg-glass);\n  --cv-border-edit: var(--border-warning);\n  --cv-bg-banner: var(--bg-warning);\n  --cv-text-banner: var(--text-warning);\n  --cv-bg-success: var(--bg-success);\n  --cv-text-success: var(--text-success);\n  --cv-border-success: var(--color-success);\n  --cv-border-warning: var(--border-warning);\n  --cv-text-heading: var(--color-text-main);\n  --cv-border-accent: var(--border-focus);\n  --cv-border-accent-strong: rgba(20, 184, 166, 0.3);\n  --cv-accent-soft: var(--color-primary-soft);\n  --cv-shadow-accent: var(--shadow-glow);\n  --cv-shadow-badge: var(--shadow-glass);\n  --cv-border-light: var(--border-default);\n  --cv-bg-row-even: var(--bg-glass);\n  --cv-bg-changed: var(--bg-warning);\n  --cv-border-changed: var(--border-warning);\n  --cv-bg-prep: var(--color-primary-soft);\n  --cv-bg-step: var(--bg-glass);\n  --cv-border-step: var(--border-default);\n  --cv-shadow-setting: 0 0 0 2px rgba(245, 158, 11, 0.45);\n  --cv-shadow-glow: var(--shadow-glow);\n  --cv-border-amber: var(--border-warning);\n}\n.cook-view-container {\n  display: block;\n  max-width: 45rem;\n  min-height: 100vh;\n  min-height: 100dvh;\n  background: transparent;\n  margin: 0 auto;\n  padding: 1.25rem;\n}\n@media (min-width: 56.25rem) {\n  .cook-view-container {\n    max-width: 75rem;\n    padding: 1.5rem 2rem;\n  }\n}\n.cook-view-empty {\n  display: block;\n  background: var(--bg-glass-strong);\n  color: inherit;\n  font-size: inherit;\n  text-align: center;\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  padding: 3rem 2rem;\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n}\n.cook-view-empty p {\n  font-size: 1.1rem;\n  margin: 0 0 1rem;\n}\n.cook-view-empty a {\n  color: var(--color-primary);\n  font-weight: 600;\n  text-decoration: underline;\n}\n.cook-view-empty lucide-icon {\n  display: block;\n  color: var(--color-primary);\n  opacity: 0.9;\n  margin: 0 auto 1rem;\n}\n.cook-view-shell {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.cook-view-shell.edit-mode {\n  background: var(--cv-section-bg);\n  border: 1px solid var(--cv-border-edit);\n  border-radius: var(--cv-radius-xl);\n  padding: 1rem;\n}\n.cook-view-shell.scaled-view {\n  background: var(--cv-accent-soft);\n  border: 2px solid var(--cv-border-accent-strong);\n  border-radius: var(--cv-radius-xl);\n  padding: 1rem;\n  box-shadow: var(--cv-shadow-glow);\n}\n@media (min-width: 56.25rem) {\n  .cook-view-shell {\n    display: grid;\n    grid-template-rows: auto 1fr;\n    grid-template-columns: 1fr;\n    gap: 1rem;\n    min-height: calc(100vh - 3rem);\n  }\n  .cook-view-shell .cook-view-header {\n    top: 0;\n    z-index: 10;\n  }\n  .cook-view-shell .cook-view-main {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    align-items: start;\n    gap: 1.5rem;\n  }\n  .cook-view-shell .ingredients-section,\n  .cook-view-shell .prep-section,\n  .cook-view-shell .steps-section {\n    min-height: 0;\n  }\n}\n.edit-mode-banner {\n  display: block;\n  background: var(--cv-bg-banner);\n  color: var(--cv-text-banner);\n  font-size: 0.875rem;\n  font-weight: 600;\n  text-align: center;\n  border-radius: var(--cv-radius-2xl);\n  margin: 0 0 0.5rem;\n  padding: 0.5rem 1rem;\n}\n.edit-actions {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.save-btn {\n  background: var(--cv-bg-success);\n  color: var(--cv-text-success);\n  border-color: var(--cv-border-success);\n}\n.undo-btn {\n  background: var(--cv-bg-banner);\n  color: var(--cv-text-banner);\n  border-color: var(--cv-border-warning);\n}\n.cook-view-main {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.cook-view-header {\n  background:\n    linear-gradient(\n      135deg,\n      var(--cv-header-start) 0%,\n      var(--cv-header-end) 100%);\n  border: 1px solid var(--cv-border-accent);\n  border-radius: var(--cv-radius-xl);\n  padding: 1.25rem 1.5rem;\n  box-shadow: var(--cv-shadow-card);\n}\n.cook-view-header .header-top {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.75rem;\n  margin-block-end: 1rem;\n}\n.cook-view-header .recipe-name {\n  font-size: 1.35rem;\n  font-weight: 700;\n  color: var(--cv-text-heading);\n  margin: 0;\n}\n.cook-view-header .edit-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  background: var(--bg-pure);\n  color: var(--cv-accent);\n  font-size: 0.875rem;\n  border: 1px solid var(--cv-border-accent-strong);\n  border-radius: var(--cv-radius-2xl);\n  padding: 0.5rem 0.875rem;\n  cursor: pointer;\n  transition: background 0.2s, transform 0.15s;\n}\n.cook-view-header .edit-btn:hover {\n  background: var(--cv-accent-soft);\n  transform: scale(1.02);\n}\n.cook-view-header .export-bar-wrap {\n  position: relative;\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.cook-view-header .export-bar-actions {\n  display: none;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.cook-view-header .export-bar-actions.expanded {\n  display: flex;\n}\n.cook-view-header .export-bar-label {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  margin-inline-end: 0.25rem;\n}\n.cook-view-header .export-bar-main {\n  display: inline-flex;\n}\n.cook-view-header .quantity-control-wrap {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.875rem;\n}\n.cook-view-header .quantity-label {\n  font-weight: 600;\n  color: var(--cv-text-heading);\n}\n.cook-view-header .quantity-controls {\n  display: flex;\n  align-items: center;\n  overflow: hidden;\n  background: var(--bg-pure);\n  border: 0.125rem solid var(--cv-accent);\n  border-radius: var(--cv-radius-full);\n  box-shadow: var(--cv-shadow-accent);\n}\n.cook-view-header .qty-btn {\n  background: transparent;\n  color: var(--cv-accent);\n  border: none;\n  padding: 0.5rem 0.875rem;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.cook-view-header .qty-btn:hover:not(:disabled) {\n  background: var(--cv-accent-soft);\n}\n.cook-view-header .qty-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.cook-view-header .quantity-input {\n  background: transparent;\n  font-size: 1.05rem;\n  font-weight: 600;\n  text-align: center;\n  border: none;\n  border-inline: 1px solid var(--cv-border-light);\n  width: 4rem;\n  padding: 0.5rem;\n}\n.cook-view-header .unit-label {\n  font-weight: 600;\n  color: var(--cv-text-heading);\n}\n.cook-view-header .scaled-cost-badge {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  background: var(--cv-bg-success);\n  color: var(--cv-text-success);\n  font-size: 0.875rem;\n  font-weight: 600;\n  border-radius: var(--cv-radius-full);\n  margin-block-start: 0.875rem;\n  padding: 0.375rem 0.75rem;\n  box-shadow: var(--cv-shadow-badge);\n}\n.cook-view-header .scaled-cost-badge lucide-icon {\n  flex-shrink: 0;\n}\n.cv-multiplier-chips {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  margin-block-end: 0.75rem;\n}\n.cv-chip-btn {\n  cursor: pointer;\n  border: 1px solid var(--cv-border-accent-strong);\n  transition: background 0.2s, color 0.2s;\n}\n.cv-chip--active {\n  background: var(--cv-accent);\n  color: var(--color-text-on-primary);\n  border-color: var(--cv-accent);\n}\n.cv-recent-chips {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n  margin-block-start: 1rem;\n}\n.cv-recent-label {\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-text-muted);\n}\n.cook-view-section {\n  background: var(--bg-pure);\n  border: 1px solid var(--cv-border-amber);\n  border-radius: var(--cv-radius-xl);\n  padding: 1rem 1.25rem;\n  box-shadow: var(--cv-shadow-card);\n}\n.cook-view-section .section-title {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  font-size: 1.05rem;\n  font-weight: 700;\n  color: var(--cv-text-heading);\n  border: none;\n  margin: 0 0 0.875rem;\n}\n.cook-view-section .section-title lucide-icon {\n  flex-shrink: 0;\n  color: var(--cv-accent);\n}\n.ingredients-table {\n  overflow: hidden;\n  border: 1px solid var(--cv-border-light);\n  border-radius: var(--radius-md);\n}\n.ingredients-table-header,\n.ingredients-table-row {\n  display: grid;\n  grid-template-columns: minmax(120px, 1fr) minmax(60px, auto) minmax(60px, auto);\n  align-items: start;\n  gap: 0.375rem;\n  padding: 0.625rem 0.875rem;\n}\n.ingredients-table-header.has-scale-action,\n.ingredients-table-row.view-mode-row {\n  grid-template-columns: minmax(120px, 1fr) minmax(60px, auto) minmax(60px, auto) minmax(80px, auto);\n}\n.ingredients-table-header {\n  background:\n    linear-gradient(\n      180deg,\n      var(--cv-header-end) 0%,\n      var(--cv-header-start) 100%);\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--cv-text-heading);\n}\n.ingredients-table-row {\n  background: var(--bg-pure);\n  border-block-start: 1px solid var(--bg-muted);\n}\n.ingredients-table-row:nth-child(even) {\n  background: var(--cv-bg-row-even);\n}\n.ingredients-table-row .col-name {\n  font-weight: 500;\n}\n.ingredients-table-row .col-amount {\n  font-size: 1.1rem;\n  font-weight: 700;\n  color: var(--cv-accent);\n}\n.ingredients-table-header > .col-name,\n.ingredients-table-header > .col-amount,\n.ingredients-table-header > .col-unit,\n.ingredients-table-header > .col-scale-action,\n.ingredients-table-row > .col-name,\n.ingredients-table-row > .col-amount,\n.ingredients-table-row > .col-unit,\n.ingredients-table-row > .col-scale-action {\n  align-self: start;\n}\n.col-name {\n  min-width: 0;\n}\n.col-name-with-set-by {\n  display: flex;\n  align-items: flex-start;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.col-name-text {\n  min-width: 0;\n}\n.col-amount,\n.col-unit {\n  white-space: nowrap;\n}\n@media (max-width: 56.25rem) {\n  .ingredients-table-row.view-mode-row {\n    grid-template-columns: 1fr auto;\n    grid-template-rows: auto auto;\n  }\n  .ingredients-table-row.view-mode-row .col-name,\n  .ingredients-table-row.view-mode-row .col-name-with-set-by {\n    grid-column: 1;\n    grid-row: 1;\n  }\n  .ingredients-table-row.view-mode-row .col-amount {\n    grid-column: 2;\n    grid-row: 1;\n    text-align: end;\n  }\n  .ingredients-table-row.view-mode-row .col-unit {\n    grid-column: 2;\n    grid-row: 2;\n    text-align: end;\n  }\n  .ingredients-table-row.view-mode-row .col-scale-action {\n    grid-column: 1/-1;\n    grid-row: 2;\n  }\n}\n.unit-select {\n  min-width: 4rem;\n  width: 100px;\n  background: var(--bg-pure);\n  font-size: 0.875rem;\n  border: 1px solid var(--cv-border-light);\n  border-radius: var(--cv-radius-md);\n  margin-inline-end: 8px;\n  padding: 0.25rem 0.5rem;\n}\n.conversion-badge {\n  font-size: 0.8rem;\n  background: var(--color-primary-soft);\n  border-radius: var(--radius-sm);\n  margin-inline-end: 8px;\n  padding: 2px 6px;\n}\n.edit-amount {\n  display: flex;\n  align-items: flex-start;\n  gap: 0.25rem;\n}\n.edit-amount .qty-btn.small {\n  padding: 0.25rem 0.5rem;\n}\n.edit-amount .amount-input {\n  background: transparent;\n  font-size: 0.9rem;\n  text-align: center;\n  border: 1px solid var(--cv-border-light);\n  border-radius: var(--cv-radius-md);\n  width: 3.5rem;\n  padding: 0.25rem 0.5rem;\n}\n.remove-ingredient-btn {\n  background: transparent;\n  color: var(--color-danger);\n  border: none;\n  border-radius: var(--cv-radius-sm);\n  margin-inline-start: 0.5rem;\n  padding: 0.25rem;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.remove-ingredient-btn:hover {\n  background: var(--bg-danger-subtle);\n}\n.ingredients-table-row.field-changed {\n  background: var(--cv-bg-changed);\n  border-inline-start: 0.1875rem solid var(--cv-border-changed);\n}\n.ingredients-table-row.view-mode-row {\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.ingredients-table-row.view-mode-row:hover,\n.ingredients-table-row.row-highlight {\n  box-shadow: 0 0 0 1px var(--cv-border-accent), var(--cv-shadow-accent);\n}\n.ingredients-table-row.setting-by {\n  background: var(--cv-accent-soft);\n  border: 1px solid var(--cv-border-accent-strong);\n  box-shadow: var(--cv-shadow-setting);\n}\n.ingredients-table-row.view-mode-row .set-by-ingredient-btn {\n  opacity: 0;\n  transition: opacity 0.2s ease;\n}\n.ingredients-table-row.view-mode-row:hover .set-by-ingredient-btn,\n.ingredients-table-row.setting-by .set-by-ingredient-btn {\n  opacity: 1;\n}\n.col-scale-action {\n  display: flex;\n  align-items: flex-start;\n  flex-wrap: wrap;\n  gap: 0.375rem;\n}\n.set-by-ingredient-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  background: transparent;\n  color: var(--cv-accent);\n  font-size: 0.75rem;\n  border: 1px solid var(--cv-border-accent-strong);\n  border-radius: var(--cv-radius-md);\n  padding: 0.25rem 0.5rem;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.set-by-ingredient-btn:hover {\n  background: var(--cv-accent-soft);\n}\n.set-by-amount .amount-input {\n  background: var(--bg-pure);\n  font-size: 0.9rem;\n  text-align: center;\n  border: 1px solid var(--cv-border-light);\n  border-radius: var(--cv-radius-md);\n  width: 3.5rem;\n  padding: 0.25rem 0.5rem;\n}\n.convert-scale-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  background: var(--cv-accent);\n  color: var(--color-text-on-primary);\n  font-size: 0.8rem;\n  font-weight: 600;\n  border: none;\n  border-radius: var(--cv-radius-md);\n  padding: 0.25rem 0.5rem;\n  cursor: pointer;\n  transition: filter 0.2s;\n}\n.convert-scale-btn:hover {\n  filter: brightness(1.08);\n}\n.cancel-set-by-btn {\n  background: transparent;\n  color: var(--color-text-muted);\n  font-size: 0.8rem;\n  border: 1px solid var(--cv-border-light);\n  border-radius: var(--cv-radius-md);\n  padding: 0.25rem 0.5rem;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.cancel-set-by-btn:hover {\n  background: var(--bg-muted);\n}\n.cv-ingredient-row--checked {\n  opacity: 0.5;\n}\n.cv-ingredient-row--checked .col-name,\n.cv-ingredient-row--checked .col-amount,\n.cv-ingredient-row--checked .col-unit {\n  text-decoration: line-through;\n}\n.scaled-view-banner {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex-wrap: wrap;\n  background: var(--cv-accent-soft);\n  border: 1px solid var(--cv-border-accent-strong);\n  border-radius: var(--cv-radius-md);\n  gap: 0.75rem;\n  padding: 0.625rem 1rem;\n}\n.scaled-view-text {\n  font-size: 0.9rem;\n  font-weight: 600;\n  color: var(--cv-text-heading);\n}\n.back-to-full-recipe-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.375rem;\n  background: var(--cv-accent);\n  color: var(--color-text-on-primary);\n  font-size: 0.875rem;\n  font-weight: 600;\n  border: none;\n  border-radius: var(--cv-radius-2xl);\n  padding: 0.375rem 0.75rem;\n  cursor: pointer;\n  transition: filter 0.2s;\n}\n.back-to-full-recipe-btn:hover {\n  filter: brightness(1.08);\n}\n.prep-list {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.prep-row {\n  display: flex;\n  justify-content: space-between;\n  background: var(--cv-bg-prep);\n  border-inline-start: 0.1875rem solid var(--cv-accent);\n  border-radius: var(--cv-radius-2xl);\n  gap: 1rem;\n  padding: 0.625rem 0.875rem;\n}\n.prep-name {\n  font-weight: 600;\n  color: var(--cv-text-heading);\n}\n.steps-list {\n  margin: 0;\n  padding-inline-start: 1.5rem;\n}\n.cv-step-check-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-width: 3rem;\n  min-height: 3rem;\n  background: transparent;\n  color: var(--cv-accent);\n  border: none;\n  border-radius: var(--cv-radius-full);\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.cv-step-check-btn:hover {\n  background: var(--cv-accent-soft);\n}\n.cv-step-counter {\n  background: var(--cv-accent-soft);\n  color: var(--cv-accent);\n  font-size: 0.8rem;\n  font-weight: 600;\n  border-radius: var(--cv-radius-full);\n  margin-inline-start: auto;\n  padding-block: 0.125rem;\n  padding-inline: 0.5rem;\n}\n.step-item {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n  background: var(--cv-bg-step);\n  border: 1px solid var(--cv-border-step);\n  border-inline-start: 0.25rem solid var(--cv-accent);\n  border-radius: var(--cv-radius-2xl);\n  gap: 0.5rem;\n  margin-block-end: 0.5rem;\n  padding: 0.5rem 0.75rem;\n}\n@media (min-width: 56.25rem) {\n  .step-item {\n    margin-block-end: 0.375rem;\n    padding: 0.4rem 0.6rem;\n  }\n}\n.cv-step-item--checked {\n  opacity: 0.6;\n}\n.cv-step-item--checked .step-instruction {\n  text-decoration: line-through;\n}\n.step-order {\n  min-width: 1.5rem;\n  font-weight: 700;\n  color: var(--cv-accent);\n}\n.step-instruction {\n  flex: 1;\n  min-width: 0;\n}\n.step-time {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  background: var(--cv-accent-soft);\n  color: var(--cv-text-heading);\n  font-size: 0.8rem;\n  font-weight: 500;\n  border: none;\n  border-radius: var(--cv-radius-full);\n  padding-block: 0.2rem;\n  padding-inline: 0.5rem;\n  cursor: pointer;\n  transition: background 0.2s, color 0.2s;\n}\n.step-time:hover {\n  background: var(--cv-accent);\n  color: var(--color-text-on-primary);\n}\n.empty-state-text {\n  color: var(--color-text-muted);\n  font-style: italic;\n  margin: 0;\n  padding: 1rem;\n}\n/*# sourceMappingURL=cook-view.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(CookViewPage, { className: "CookViewPage", filePath: "src/app/pages/cook-view/cook-view.page.ts", lineNumber: 66 });
})();
export {
  CookViewPage
};
//# sourceMappingURL=chunk-7R4XHECH.js.map
