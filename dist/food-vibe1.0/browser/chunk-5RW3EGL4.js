import {
  MenuSectionCategoriesService
} from "./chunk-EQABVZPY.js";
import {
  ExportToolbarOverlayComponent
} from "./chunk-NDFOX7UA.js";
import {
  MenuEventDataService
} from "./chunk-RJCMGBVB.js";
import {
  ExportPreviewComponent,
  ExportService,
  quantityDecrement,
  quantityIncrement
} from "./chunk-C7ILH7PA.js";
import {
  MenuIntelligenceService
} from "./chunk-R7QO6CSG.js";
import {
  RecipeCostService
} from "./chunk-7Z6ZOB5G.js";
import {
  SelectOnFocusDirective
} from "./chunk-W2XHIWHI.js";
import {
  ALL_DISH_FIELDS,
  DEFAULT_DISH_FIELDS,
  MetadataRegistryService
} from "./chunk-AEBXA76L.js";
import "./chunk-HKRWTH4Y.js";
import {
  AddItemModalService
} from "./chunk-44QAIIDK.js";
import "./chunk-KNQKKPOG.js";
import {
  HeroFabService
} from "./chunk-QBY7FUTT.js";
import {
  useSavingState
} from "./chunk-6VNIKYJO.js";
import {
  ClickOutSideDirective,
  CustomSelectComponent,
  ScrollableDropdownComponent,
  filterOptionsByStartsWith
} from "./chunk-KKA4TBVQ.js";
import {
  DefaultValueAccessor,
  FormArrayName,
  FormBuilder,
  FormControlName,
  FormGroupDirective,
  FormGroupName,
  FormsModule,
  MinValidator,
  NgControlStatus,
  NgControlStatusGroup,
  NgModel,
  NumberValueAccessor,
  ReactiveFormsModule,
  Validators
} from "./chunk-UNNU6L7T.js";
import {
  LoaderComponent
} from "./chunk-TR2OKVKA.js";
import {
  takeUntilDestroyed
} from "./chunk-4LOKEQAU.js";
import {
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-JROUPDH4.js";
import {
  TranslatePipe
} from "./chunk-Z6OI3YDQ.js";
import {
  KitchenStateService
} from "./chunk-ZA4PDXUK.js";
import "./chunk-IFJ5YUTT.js";
import "./chunk-ACTKISJR.js";
import "./chunk-VOTRTAY7.js";
import "./chunk-7WUWXC4O.js";
import {
  UserMsgService
} from "./chunk-WYZGJ7UG.js";
import "./chunk-OYT4PDSG.js";
import {
  ActivatedRoute,
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  DecimalPipe,
  DestroyRef,
  HostListener,
  NavigationStart,
  Router,
  __async,
  __spreadProps,
  __spreadValues,
  computed,
  filter,
  inject,
  input,
  output,
  setClassMetadata,
  signal,
  startWith,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
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
  ɵɵpureFunction0,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵrepeaterTrackByIndex,
  ɵɵresetView,
  ɵɵresolveDocument,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-GCYOWW7U.js";

// src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.ts
var _c0 = () => ({ standalone: true });
var _forTrack0 = ($index, $item) => $item._id;
function MenuDishRowComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 4)(1, "div", 5)(2, "span", 6)(3, "button", 7);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275listener("click", function MenuDishRowComponent_Conditional_2_Template_button_click_3_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.startEditName.emit();
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 8);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275listener("click", function MenuDishRowComponent_Conditional_2_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.metaToggle.emit());
    });
    \u0275\u0275element(9, "lucide-icon", 9);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(10, "span", 10)(11, "span", 11);
    \u0275\u0275text(12, "\u20AA");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "input", 12);
    \u0275\u0275listener("click", function MenuDishRowComponent_Conditional_2_Template_input_click_13_listener($event) {
      \u0275\u0275restoreView(_r1);
      return \u0275\u0275resetView($event.stopPropagation());
    })("keydown", function MenuDishRowComponent_Conditional_2_Template_input_keydown_13_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.sellPriceKeydown.emit($event));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "button", 13);
    \u0275\u0275listener("click", function MenuDishRowComponent_Conditional_2_Template_button_click_14_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.remove.emit());
    });
    \u0275\u0275element(15, "lucide-icon", 14);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_3_0;
    let tmp_7_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275property("id", "dish-name-" + ctx_r1.sectionIndex() + "-" + ctx_r1.itemIndex());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(4, 10, "change_dish"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r1.getRecipeName((tmp_3_0 = ctx_r1.itemGroup().get("recipe_id_")) == null ? null : tmp_3_0.value), " ");
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", ctx_r1.isMetaExpanded() ? \u0275\u0275pipeBind1(7, 12, "hide_metadata") : \u0275\u0275pipeBind1(8, 14, "show_metadata"));
    \u0275\u0275advance(3);
    \u0275\u0275property("name", ctx_r1.isMetaExpanded() ? "chevron-up" : "info")("size", 16);
    \u0275\u0275advance(4);
    \u0275\u0275styleProp("width", ctx_r1.getInputWidth((tmp_7_0 = ctx_r1.itemGroup().get("sell_price")) == null ? null : tmp_7_0.value));
    \u0275\u0275property("id", "dish-sell-" + ctx_r1.sectionIndex() + "-" + ctx_r1.itemIndex());
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
  }
}
function MenuDishRowComponent_Conditional_3_Conditional_3_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 20);
    \u0275\u0275listener("click", function MenuDishRowComponent_Conditional_3_Conditional_3_For_2_Template_button_click_0_listener() {
      const recipe_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.selectRecipe.emit({ recipe: recipe_r5 }));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const recipe_r5 = ctx.$implicit;
    const \u0275$index_42_r6 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("highlighted", ctx_r1.highlightedIndex() === \u0275$index_42_r6);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", recipe_r5.name_hebrew, " ");
  }
}
function MenuDishRowComponent_Conditional_3_Conditional_3_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 19);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "no_recipes_match"));
  }
}
function MenuDishRowComponent_Conditional_3_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "app-scrollable-dropdown", 17);
    \u0275\u0275repeaterCreate(1, MenuDishRowComponent_Conditional_3_Conditional_3_For_2_Template, 2, 3, "button", 18, _forTrack0);
    \u0275\u0275template(3, MenuDishRowComponent_Conditional_3_Conditional_3_Conditional_3_Template, 3, 3, "span", 19);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("maxHeight", 200);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.getFilteredRecipes());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.getFilteredRecipes().length === 0 ? 3 : -1);
  }
}
function MenuDishRowComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 15);
    \u0275\u0275listener("clickOutside", function MenuDishRowComponent_Conditional_3_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.clearSearch.emit());
    });
    \u0275\u0275elementStart(1, "input", 16);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("ngModelChange", function MenuDishRowComponent_Conditional_3_Template_input_ngModelChange_1_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.searchQueryChange.emit($event));
    })("keydown", function MenuDishRowComponent_Conditional_3_Template_input_keydown_1_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.dishSearchKeydown.emit($event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275template(3, MenuDishRowComponent_Conditional_3_Conditional_3_Template, 4, 2, "app-scrollable-dropdown", 17);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("id", "dish-search-" + ctx_r1.sectionIndex() + "-" + ctx_r1.itemIndex())("ngModel", ctx_r1.dishSearchQuery())("ngModelOptions", \u0275\u0275pureFunction0(7, _c0))("placeholder", \u0275\u0275pipeBind1(2, 5, "menu_search_dish"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.dishSearchQuery().trim() ? 3 : -1);
  }
}
function MenuDishRowComponent_Conditional_4_For_2_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 24);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_12_0;
    const fieldKey_r8 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(fieldKey_r8 === "food_cost_money" ? ctx_r1.getAutoFoodCost() : (tmp_12_0 = (tmp_12_0 = ctx_r1.itemGroup().get(fieldKey_r8)) == null ? null : tmp_12_0.value) !== null && tmp_12_0 !== void 0 ? tmp_12_0 : "");
  }
}
function MenuDishRowComponent_Conditional_4_For_2_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "input", 27);
    \u0275\u0275listener("blur", function MenuDishRowComponent_Conditional_4_For_2_Conditional_5_Template_input_blur_0_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.editDishFieldCommit.emit());
    })("keydown.enter", function MenuDishRowComponent_Conditional_4_For_2_Conditional_5_Template_input_keydown_enter_0_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.editDishFieldCommit.emit());
    })("keydown", function MenuDishRowComponent_Conditional_4_For_2_Conditional_5_Template_input_keydown_0_listener($event) {
      \u0275\u0275restoreView(_r9);
      const fieldKey_r8 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.dishFieldKeydown.emit({ fieldKey: fieldKey_r8, event: $event }));
    })("click", function MenuDishRowComponent_Conditional_4_For_2_Conditional_5_Template_input_click_0_listener($event) {
      \u0275\u0275restoreView(_r9);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_12_0;
    const fieldKey_r8 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275styleProp("width", ctx_r1.getInputWidth((tmp_12_0 = ctx_r1.itemGroup().get(fieldKey_r8)) == null ? null : tmp_12_0.value));
    \u0275\u0275property("id", "dish-" + ctx_r1.sectionIndex() + "-" + ctx_r1.itemIndex() + "-" + fieldKey_r8)("formControlName", fieldKey_r8);
  }
}
function MenuDishRowComponent_Conditional_4_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 25);
    \u0275\u0275listener("click", function MenuDishRowComponent_Conditional_4_For_2_Template_div_click_0_listener() {
      const fieldKey_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(!ctx_r1.isDishFieldReadOnly(fieldKey_r8) && !ctx_r1.isEditingField(fieldKey_r8) && ctx_r1.editDishFieldStart.emit(fieldKey_r8));
    });
    \u0275\u0275elementStart(1, "span", 23);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(4, MenuDishRowComponent_Conditional_4_For_2_Conditional_4_Template, 2, 1, "span", 24)(5, MenuDishRowComponent_Conditional_4_For_2_Conditional_5_Template, 1, 4, "input", 26);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const fieldKey_r8 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 2, ctx_r1.getDishFieldLabelKey(fieldKey_r8)));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.isDishFieldReadOnly(fieldKey_r8) || !ctx_r1.isEditingField(fieldKey_r8) ? 4 : 5);
  }
}
function MenuDishRowComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 3);
    \u0275\u0275repeaterCreate(1, MenuDishRowComponent_Conditional_4_For_2_Template, 6, 4, "div", 21, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementStart(3, "div", 22)(4, "span", 23);
    \u0275\u0275text(5);
    \u0275\u0275pipe(6, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 24);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.activeFields());
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(6, 2, "dish_food_cost_per_portion"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("\u20AA", ctx_r1.getFoodCostPerPortion(), "");
  }
}
var MenuDishRowComponent = class _MenuDishRowComponent {
  // ── Injected ──────────────────────────────────────────────────────────────
  recipeCostService = inject(RecipeCostService);
  menuIntelligence = inject(MenuIntelligenceService);
  // ── Inputs ────────────────────────────────────────────────────────────────
  itemGroup = input.required();
  sectionIndex = input.required();
  itemIndex = input.required();
  recipes = input([]);
  activeFields = input([]);
  dishSearchQuery = input("");
  highlightedIndex = input(0);
  isMetaExpanded = input(false);
  editingDishField = input(null);
  servingType = input("plated_course");
  guestCount = input(0);
  piecesPerPerson = input(1);
  // ── Outputs ───────────────────────────────────────────────────────────────
  remove = output();
  selectRecipe = output();
  startEditName = output();
  searchQueryChange = output();
  metaToggle = output();
  editDishFieldStart = output();
  editDishFieldCommit = output();
  sellPriceKeydown = output();
  dishFieldKeydown = output();
  dishSearchKeydown = output();
  clearSearch = output();
  // ── Read ──────────────────────────────────────────────────────────────────
  getRecipeName(recipeId) {
    return this.recipes().find((r) => r._id === recipeId)?.name_hebrew || "";
  }
  getInputWidth(value) {
    const len = String(value ?? "").length;
    return `${Math.max(4, len + 2)}ch`;
  }
  isDishFieldReadOnly(fieldKey) {
    return fieldKey === "food_cost_money";
  }
  getDishFieldLabelKey(fieldKey) {
    return ALL_DISH_FIELDS.find((f) => f.key === fieldKey)?.labelKey ?? fieldKey;
  }
  isEditingField(fieldKey) {
    return this.editingDishField() === `${this.sectionIndex()}-${this.itemIndex()}-${fieldKey}`;
  }
  getAutoFoodCost() {
    const item = this.itemGroup();
    const recipeId = item?.get("recipe_id_")?.value;
    if (!recipeId)
      return 0;
    const recipe = this.recipes().find((r) => r._id === recipeId);
    if (!recipe)
      return 0;
    const derivedPortions = this.menuIntelligence.derivePortions(this.servingType(), this.guestCount(), Number(item.get("predicted_take_rate_")?.value ?? 0), this.piecesPerPerson(), Number(item.get("serving_portions")?.value ?? 1));
    const baseYield = Math.max(1, recipe.yield_amount_ || 1);
    const multiplier = derivedPortions / baseYield;
    const scaledCost = this.recipeCostService.computeRecipeCost(__spreadProps(__spreadValues({}, recipe), {
      ingredients_: recipe.ingredients_.map((ing) => __spreadProps(__spreadValues({}, ing), {
        amount_: (ing.amount_ || 0) * multiplier
      }))
    }));
    return Math.round(scaledCost * 100) / 100;
  }
  getFoodCostPerPortion() {
    const total = this.getAutoFoodCost();
    const derivedPortions = this.getDerivedPortions();
    return Math.round(total / Math.max(1, derivedPortions) * 100) / 100;
  }
  getDerivedPortions() {
    const item = this.itemGroup();
    return this.menuIntelligence.derivePortions(this.servingType(), this.guestCount(), Number(item.get("predicted_take_rate_")?.value ?? 0), this.piecesPerPerson(), Number(item.get("serving_portions")?.value ?? 1));
  }
  getFilteredRecipes() {
    const raw = this.dishSearchQuery().trim();
    if (!raw)
      return [];
    const filtered = filterOptionsByStartsWith(this.recipes(), raw, (r) => r.name_hebrew ?? "");
    return filtered.slice(0, 12);
  }
  static \u0275fac = function MenuDishRowComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MenuDishRowComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _MenuDishRowComponent, selectors: [["app-menu-dish-row"]], inputs: { itemGroup: [1, "itemGroup"], sectionIndex: [1, "sectionIndex"], itemIndex: [1, "itemIndex"], recipes: [1, "recipes"], activeFields: [1, "activeFields"], dishSearchQuery: [1, "dishSearchQuery"], highlightedIndex: [1, "highlightedIndex"], isMetaExpanded: [1, "isMetaExpanded"], editingDishField: [1, "editingDishField"], servingType: [1, "servingType"], guestCount: [1, "guestCount"], piecesPerPerson: [1, "piecesPerPerson"] }, outputs: { remove: "remove", selectRecipe: "selectRecipe", startEditName: "startEditName", searchQueryChange: "searchQueryChange", metaToggle: "metaToggle", editDishFieldStart: "editDishFieldStart", editDishFieldCommit: "editDishFieldCommit", sellPriceKeydown: "sellPriceKeydown", dishFieldKeydown: "dishFieldKeydown", dishSearchKeydown: "dishSearchKeydown", clearSearch: "clearSearch" }, decls: 5, vars: 3, consts: [[1, "dish-row", 3, "formGroup"], [1, "dish-name-cell"], [1, "dish-search-wrap"], [1, "dish-data"], [1, "dish-name-meta-wrap"], [1, "dish-name-meta"], [1, "dish-name-meta-inner"], ["type", "button", 1, "dish-name", "dish-name-btn", 3, "click", "id"], ["type", "button", 1, "dish-meta-toggle", "no-print", 3, "click"], [3, "name", "size"], [1, "dish-sell-price", "no-print"], [1, "dish-sell-currency"], ["type", "number", "formControlName", "sell_price", "min", "0", "step", "1", "SelectOnFocus", "", 1, "dish-sell-input", 3, "click", "keydown", "id"], ["type", "button", 1, "dish-remove", "no-print", 3, "click"], ["name", "trash-2", 3, "size"], [1, "dish-search-wrap", 3, "clickOutside"], ["type", "text", "autocomplete", "off", 1, "dish-search-input", 3, "ngModelChange", "keydown", "id", "ngModel", "ngModelOptions", "placeholder"], [3, "maxHeight"], ["type", "button", 1, "dropdown-item", 3, "highlighted"], [1, "dropdown-empty"], ["type", "button", 1, "dropdown-item", 3, "click"], [1, "dish-field"], [1, "dish-field", "read-only"], [1, "dish-field-label"], [1, "dish-field-value"], [1, "dish-field", 3, "click"], ["type", "number", "min", "0", "step", "0.01", "SelectOnFocus", "", 1, "dish-field-input-inline", 3, "id", "formControlName", "width"], ["type", "number", "min", "0", "step", "0.01", "SelectOnFocus", "", 1, "dish-field-input-inline", 3, "blur", "keydown.enter", "keydown", "click", "id", "formControlName"]], template: function MenuDishRowComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1);
      \u0275\u0275template(2, MenuDishRowComponent_Conditional_2_Template, 16, 16)(3, MenuDishRowComponent_Conditional_3_Template, 4, 8, "div", 2);
      \u0275\u0275elementEnd();
      \u0275\u0275template(4, MenuDishRowComponent_Conditional_4_Template, 9, 4, "div", 3);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_1_0;
      let tmp_2_0;
      \u0275\u0275property("formGroup", ctx.itemGroup());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(((tmp_1_0 = ctx.itemGroup().get("recipe_id_")) == null ? null : tmp_1_0.value) ? 2 : 3);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(((tmp_2_0 = ctx.itemGroup().get("recipe_id_")) == null ? null : tmp_2_0.value) && ctx.isMetaExpanded() ? 4 : -1);
    }
  }, dependencies: [
    CommonModule,
    ReactiveFormsModule,
    DefaultValueAccessor,
    NumberValueAccessor,
    NgControlStatus,
    NgControlStatusGroup,
    MinValidator,
    FormGroupDirective,
    FormControlName,
    FormsModule,
    NgModel,
    LucideAngularModule,
    LucideAngularComponent,
    TranslatePipe,
    ClickOutSideDirective,
    SelectOnFocusDirective,
    ScrollableDropdownComponent
  ], styles: ["\n\n[_nghost-%COMP%] {\n  display: contents;\n}\n.dish-row[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n  align-items: stretch;\n  min-width: 0;\n}\n.dish-name-cell[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n  padding: 0.375rem 0;\n  min-height: 2.25rem;\n  transition: opacity 0.2s ease;\n}\n.dish-name-cell[_ngcontent-%COMP%]:hover   .dish-remove[_ngcontent-%COMP%], \n.dish-name-cell[_ngcontent-%COMP%]:hover   .dish-meta-toggle[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.dish-name-meta-wrap[_ngcontent-%COMP%] {\n  flex: 1;\n  overflow: hidden;\n  min-width: 0;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n.dish-name-meta[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-width: 0;\n  text-align: center;\n}\n.dish-name-meta-inner[_ngcontent-%COMP%] {\n  position: relative;\n  display: inline-block;\n}\n.dish-meta-toggle[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 50%;\n  transform: translateY(-50%);\n  inset-inline-start: 100%;\n  margin-inline-start: 0.5rem;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 20px;\n  padding: 0;\n  background: transparent;\n  border: none;\n  border-radius: var(--radius-xs);\n  color: var(--color-text-muted);\n  opacity: 0.7;\n  cursor: pointer;\n  transition: opacity 0.2s ease, color 0.2s ease;\n}\n.dish-meta-toggle[_ngcontent-%COMP%]:hover {\n  color: var(--color-primary);\n  opacity: 1;\n}\n.dish-meta-toggle[_ngcontent-%COMP%]:focus-visible {\n  outline: none;\n  box-shadow: var(--shadow-focus);\n}\n.dish-name[_ngcontent-%COMP%] {\n  font-family: var(--font-serif);\n  font-size: 1.05rem;\n  color: var(--color-ink);\n  text-align: start;\n  min-width: 0;\n}\n.dish-name-btn[_ngcontent-%COMP%] {\n  display: inline;\n  margin: 0;\n  padding: 0;\n  border: none;\n  background: transparent;\n  font: inherit;\n  color: inherit;\n  text-align: inherit;\n  cursor: pointer;\n  transition: color 0.15s ease, text-decoration 0.15s ease;\n}\n.dish-name-btn[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n  color: var(--color-ornament);\n}\n.dish-name-btn[_ngcontent-%COMP%]:focus-visible {\n  outline: none;\n  box-shadow: var(--shadow-focus);\n}\n.dish-remove[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 50%;\n  transform: translateY(-50%);\n  inset-inline-end: 0.25rem;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  opacity: 0;\n  background: transparent;\n  border: none;\n  padding: 0.25rem;\n  color: var(--color-text-muted-light);\n  cursor: pointer;\n  transition: opacity 0.2s ease, color 0.2s ease;\n}\n.dish-name-cell[_ngcontent-%COMP%]:hover   .dish-remove[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.dish-remove[_ngcontent-%COMP%]:hover {\n  color: var(--color-danger);\n}\n.dish-data[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: nowrap;\n  align-items: center;\n  justify-content: center;\n  gap: 0.75rem;\n  padding: 0.375rem 0;\n  padding-inline-start: 0;\n  min-height: 2.25rem;\n  width: 100%;\n  min-width: 0;\n  overflow-x: auto;\n  overflow-y: hidden;\n  scroll-snap-type: x mandatory;\n  -webkit-overflow-scrolling: touch;\n}\n.dish-field[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.125rem 0.25rem;\n  border-radius: var(--radius-xs);\n  cursor: pointer;\n  transition: background-color 0.15s ease;\n  flex: 0 0 auto;\n  min-width: 5.5rem;\n  scroll-snap-align: start;\n  scroll-snap-stop: always;\n}\n.dish-field[_ngcontent-%COMP%]:hover {\n  background-color: var(--bg-muted);\n}\n.dish-field.read-only[_ngcontent-%COMP%] {\n  cursor: default;\n}\n.dish-field.read-only[_ngcontent-%COMP%]:hover {\n  background-color: transparent;\n}\n.dish-field-label[_ngcontent-%COMP%] {\n  font-family: var(--font-serif);\n  font-size: 0.75rem;\n  color: var(--color-ink);\n  white-space: nowrap;\n  text-align: center;\n}\n.dish-field-value[_ngcontent-%COMP%] {\n  font-family: var(--font-serif);\n  font-size: 0.875rem;\n  color: var(--color-ink);\n  text-align: center;\n  min-width: 2ch;\n}\n.dish-field-input-inline[_ngcontent-%COMP%] {\n  padding: 0.125rem 0.375rem;\n  font-family: var(--font-serif);\n  font-size: 0.875rem;\n  color: var(--color-ink);\n  background: transparent;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-xs);\n  text-align: right;\n  min-width: 4ch;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.dish-field-input-inline[type=number][_ngcontent-%COMP%] {\n  -moz-appearance: textfield;\n}\n.dish-field-input-inline[_ngcontent-%COMP%]::-webkit-outer-spin-button, \n.dish-field-input-inline[_ngcontent-%COMP%]::-webkit-inner-spin-button {\n  -webkit-appearance: none;\n  margin: 0;\n}\n.dish-field-input-inline[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--border-focus);\n  box-shadow: none;\n}\n.dish-search-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  flex: 1;\n  min-width: 0;\n  text-align: center;\n}\n.dish-search-wrap[_ngcontent-%COMP%]   app-scrollable-dropdown[_ngcontent-%COMP%] {\n  width: 80%;\n  margin-inline: auto;\n}\n.dish-search-input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 4px 8px;\n  text-align: center;\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  color: var(--color-ink);\n  background: transparent;\n  border: none;\n  outline: none;\n}\n.dish-search-input[_ngcontent-%COMP%]::placeholder {\n  color: var(--color-text-muted);\n}\n.dish-search-input[_ngcontent-%COMP%]:focus {\n  border-radius: var(--radius-xs);\n  box-shadow: none;\n}\n.dish-sell-price[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 50%;\n  transform: translateY(-50%);\n  inset-inline-end: 2.25rem;\n  display: inline-flex;\n  align-items: center;\n  gap: 0.125rem;\n}\n.dish-sell-currency[_ngcontent-%COMP%] {\n  font-family: var(--font-serif);\n  font-size: 0.8rem;\n  color: var(--color-text-muted);\n}\n.dish-sell-input[_ngcontent-%COMP%] {\n  padding: 0.125rem 0.25rem;\n  font-family: var(--font-serif);\n  font-size: 0.875rem;\n  color: var(--color-ink);\n  background: transparent;\n  text-align: right;\n  border: none;\n  border-bottom: 1px solid transparent;\n  outline: none;\n  -moz-appearance: textfield;\n  appearance: none;\n  transition: border-color 0.2s ease;\n}\n.dish-sell-input[_ngcontent-%COMP%]::-webkit-outer-spin-button, \n.dish-sell-input[_ngcontent-%COMP%]::-webkit-inner-spin-button {\n  -webkit-appearance: none;\n  margin: 0;\n}\n.dish-sell-input[_ngcontent-%COMP%]:focus {\n  border-bottom-color: var(--border-focus);\n}\n.dropdown-item[_ngcontent-%COMP%] {\n  display: block;\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  text-align: right;\n  font-family: var(--font-serif);\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n  background: none;\n  border: none;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.dropdown-item[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n}\n.dropdown-item.highlighted[_ngcontent-%COMP%] {\n  background: var(--color-primary-soft);\n  box-shadow: inset 0 0 0 1px var(--border-focus);\n}\n.dropdown-item.add-new[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n  font-weight: 600;\n  border-top: 1px solid var(--border-default);\n}\n.dropdown-empty[_ngcontent-%COMP%] {\n  display: block;\n  padding: 8px 12px;\n  font-size: 0.8125rem;\n  color: var(--color-text-muted-light);\n  text-align: center;\n}\n/*# sourceMappingURL=menu-dish-row.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MenuDishRowComponent, [{
    type: Component,
    args: [{ selector: "app-menu-dish-row", standalone: true, imports: [
      CommonModule,
      ReactiveFormsModule,
      FormsModule,
      LucideAngularModule,
      TranslatePipe,
      ClickOutSideDirective,
      SelectOnFocusDirective,
      ScrollableDropdownComponent
    ], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="dish-row" [formGroup]="itemGroup()">\r
  <div class="dish-name-cell">\r
    @if (itemGroup().get('recipe_id_')?.value) {\r
      <div class="dish-name-meta-wrap">\r
        <div class="dish-name-meta">\r
          <span class="dish-name-meta-inner">\r
            <button type="button" class="dish-name dish-name-btn"\r
              [id]="'dish-name-' + sectionIndex() + '-' + itemIndex()"\r
              [attr.aria-label]="'change_dish' | translatePipe"\r
              (click)="startEditName.emit(); $event.stopPropagation()">\r
              {{ getRecipeName(itemGroup().get('recipe_id_')?.value) }}\r
            </button>\r
            <button type="button" class="dish-meta-toggle no-print"\r
              [attr.aria-label]="isMetaExpanded() ? ('hide_metadata' | translatePipe) : ('show_metadata' | translatePipe)"\r
              (click)="metaToggle.emit()">\r
              <lucide-icon [name]="isMetaExpanded() ? 'chevron-up' : 'info'" [size]="16"></lucide-icon>\r
            </button>\r
          </span>\r
        </div>\r
      </div>\r
      <span class="dish-sell-price no-print">\r
        <span class="dish-sell-currency">\u20AA</span>\r
        <input type="number" formControlName="sell_price" min="0" step="1"\r
          [id]="'dish-sell-' + sectionIndex() + '-' + itemIndex()"\r
          class="dish-sell-input" SelectOnFocus\r
          [style.width]="getInputWidth(itemGroup().get('sell_price')?.value)"\r
          (click)="$event.stopPropagation()"\r
          (keydown)="sellPriceKeydown.emit($event)" />\r
      </span>\r
      <button type="button" class="dish-remove no-print" (click)="remove.emit()">\r
        <lucide-icon name="trash-2" [size]="14"></lucide-icon>\r
      </button>\r
    } @else {\r
      <div class="dish-search-wrap" (clickOutside)="clearSearch.emit()">\r
        <input type="text" class="dish-search-input"\r
          autocomplete="off"\r
          [id]="'dish-search-' + sectionIndex() + '-' + itemIndex()"\r
          [ngModel]="dishSearchQuery()"\r
          [ngModelOptions]="{ standalone: true }"\r
          (ngModelChange)="searchQueryChange.emit($event)"\r
          [placeholder]="'menu_search_dish' | translatePipe"\r
          (keydown)="dishSearchKeydown.emit($event)" />\r
        @if (dishSearchQuery().trim()) {\r
          <app-scrollable-dropdown [maxHeight]="200">\r
            @for (recipe of getFilteredRecipes(); track recipe._id; let i = $index) {\r
              <button type="button" class="dropdown-item"\r
                [class.highlighted]="highlightedIndex() === i"\r
                (click)="selectRecipe.emit({ recipe })">\r
                {{ recipe.name_hebrew }}\r
              </button>\r
            }\r
            @if (getFilteredRecipes().length === 0) {\r
              <span class="dropdown-empty">{{ 'no_recipes_match' | translatePipe }}</span>\r
            }\r
          </app-scrollable-dropdown>\r
        }\r
      </div>\r
    }\r
  </div>\r
  @if (itemGroup().get('recipe_id_')?.value && isMetaExpanded()) {\r
    <div class="dish-data">\r
      @for (fieldKey of activeFields(); track fieldKey) {\r
        <div class="dish-field"\r
          (click)="!isDishFieldReadOnly(fieldKey) && !isEditingField(fieldKey) && editDishFieldStart.emit(fieldKey)">\r
          <span class="dish-field-label">{{ getDishFieldLabelKey(fieldKey) | translatePipe }}</span>\r
          @if (isDishFieldReadOnly(fieldKey) || !isEditingField(fieldKey)) {\r
            <span class="dish-field-value">{{ fieldKey === 'food_cost_money' ? getAutoFoodCost() : (itemGroup().get(fieldKey)?.value ?? '') }}</span>\r
          } @else {\r
            <input [id]="'dish-' + sectionIndex() + '-' + itemIndex() + '-' + fieldKey"\r
              type="number" [formControlName]="fieldKey" min="0" step="0.01"\r
              class="dish-field-input-inline" SelectOnFocus\r
              [style.width]="getInputWidth(itemGroup().get(fieldKey)?.value)"\r
              (blur)="editDishFieldCommit.emit()"\r
              (keydown.enter)="editDishFieldCommit.emit()"\r
              (keydown)="dishFieldKeydown.emit({ fieldKey: fieldKey, event: $event })"\r
              (click)="$event.stopPropagation()" />\r
          }\r
        </div>\r
      }\r
      <div class="dish-field read-only">\r
        <span class="dish-field-label">{{ 'dish_food_cost_per_portion' | translatePipe }}</span>\r
        <span class="dish-field-value">\u20AA{{ getFoodCostPerPortion() }}</span>\r
      </div>\r
    </div>\r
  }\r
</div>\r
`, styles: ["/* src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.scss */\n:host {\n  display: contents;\n}\n.dish-row {\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n  align-items: stretch;\n  min-width: 0;\n}\n.dish-name-cell {\n  position: relative;\n  display: flex;\n  align-items: center;\n  padding: 0.375rem 0;\n  min-height: 2.25rem;\n  transition: opacity 0.2s ease;\n}\n.dish-name-cell:hover .dish-remove,\n.dish-name-cell:hover .dish-meta-toggle {\n  opacity: 1;\n}\n.dish-name-meta-wrap {\n  flex: 1;\n  overflow: hidden;\n  min-width: 0;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n.dish-name-meta {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-width: 0;\n  text-align: center;\n}\n.dish-name-meta-inner {\n  position: relative;\n  display: inline-block;\n}\n.dish-meta-toggle {\n  position: absolute;\n  top: 50%;\n  transform: translateY(-50%);\n  inset-inline-start: 100%;\n  margin-inline-start: 0.5rem;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 20px;\n  padding: 0;\n  background: transparent;\n  border: none;\n  border-radius: var(--radius-xs);\n  color: var(--color-text-muted);\n  opacity: 0.7;\n  cursor: pointer;\n  transition: opacity 0.2s ease, color 0.2s ease;\n}\n.dish-meta-toggle:hover {\n  color: var(--color-primary);\n  opacity: 1;\n}\n.dish-meta-toggle:focus-visible {\n  outline: none;\n  box-shadow: var(--shadow-focus);\n}\n.dish-name {\n  font-family: var(--font-serif);\n  font-size: 1.05rem;\n  color: var(--color-ink);\n  text-align: start;\n  min-width: 0;\n}\n.dish-name-btn {\n  display: inline;\n  margin: 0;\n  padding: 0;\n  border: none;\n  background: transparent;\n  font: inherit;\n  color: inherit;\n  text-align: inherit;\n  cursor: pointer;\n  transition: color 0.15s ease, text-decoration 0.15s ease;\n}\n.dish-name-btn:hover {\n  text-decoration: underline;\n  color: var(--color-ornament);\n}\n.dish-name-btn:focus-visible {\n  outline: none;\n  box-shadow: var(--shadow-focus);\n}\n.dish-remove {\n  position: absolute;\n  top: 50%;\n  transform: translateY(-50%);\n  inset-inline-end: 0.25rem;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  opacity: 0;\n  background: transparent;\n  border: none;\n  padding: 0.25rem;\n  color: var(--color-text-muted-light);\n  cursor: pointer;\n  transition: opacity 0.2s ease, color 0.2s ease;\n}\n.dish-name-cell:hover .dish-remove {\n  opacity: 1;\n}\n.dish-remove:hover {\n  color: var(--color-danger);\n}\n.dish-data {\n  display: flex;\n  flex-wrap: nowrap;\n  align-items: center;\n  justify-content: center;\n  gap: 0.75rem;\n  padding: 0.375rem 0;\n  padding-inline-start: 0;\n  min-height: 2.25rem;\n  width: 100%;\n  min-width: 0;\n  overflow-x: auto;\n  overflow-y: hidden;\n  scroll-snap-type: x mandatory;\n  -webkit-overflow-scrolling: touch;\n}\n.dish-field {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.125rem 0.25rem;\n  border-radius: var(--radius-xs);\n  cursor: pointer;\n  transition: background-color 0.15s ease;\n  flex: 0 0 auto;\n  min-width: 5.5rem;\n  scroll-snap-align: start;\n  scroll-snap-stop: always;\n}\n.dish-field:hover {\n  background-color: var(--bg-muted);\n}\n.dish-field.read-only {\n  cursor: default;\n}\n.dish-field.read-only:hover {\n  background-color: transparent;\n}\n.dish-field-label {\n  font-family: var(--font-serif);\n  font-size: 0.75rem;\n  color: var(--color-ink);\n  white-space: nowrap;\n  text-align: center;\n}\n.dish-field-value {\n  font-family: var(--font-serif);\n  font-size: 0.875rem;\n  color: var(--color-ink);\n  text-align: center;\n  min-width: 2ch;\n}\n.dish-field-input-inline {\n  padding: 0.125rem 0.375rem;\n  font-family: var(--font-serif);\n  font-size: 0.875rem;\n  color: var(--color-ink);\n  background: transparent;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-xs);\n  text-align: right;\n  min-width: 4ch;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.dish-field-input-inline[type=number] {\n  -moz-appearance: textfield;\n}\n.dish-field-input-inline::-webkit-outer-spin-button,\n.dish-field-input-inline::-webkit-inner-spin-button {\n  -webkit-appearance: none;\n  margin: 0;\n}\n.dish-field-input-inline:focus {\n  outline: none;\n  border-color: var(--border-focus);\n  box-shadow: none;\n}\n.dish-search-wrap {\n  position: relative;\n  flex: 1;\n  min-width: 0;\n  text-align: center;\n}\n.dish-search-wrap app-scrollable-dropdown {\n  width: 80%;\n  margin-inline: auto;\n}\n.dish-search-input {\n  width: 100%;\n  padding: 4px 8px;\n  text-align: center;\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  color: var(--color-ink);\n  background: transparent;\n  border: none;\n  outline: none;\n}\n.dish-search-input::placeholder {\n  color: var(--color-text-muted);\n}\n.dish-search-input:focus {\n  border-radius: var(--radius-xs);\n  box-shadow: none;\n}\n.dish-sell-price {\n  position: absolute;\n  top: 50%;\n  transform: translateY(-50%);\n  inset-inline-end: 2.25rem;\n  display: inline-flex;\n  align-items: center;\n  gap: 0.125rem;\n}\n.dish-sell-currency {\n  font-family: var(--font-serif);\n  font-size: 0.8rem;\n  color: var(--color-text-muted);\n}\n.dish-sell-input {\n  padding: 0.125rem 0.25rem;\n  font-family: var(--font-serif);\n  font-size: 0.875rem;\n  color: var(--color-ink);\n  background: transparent;\n  text-align: right;\n  border: none;\n  border-bottom: 1px solid transparent;\n  outline: none;\n  -moz-appearance: textfield;\n  appearance: none;\n  transition: border-color 0.2s ease;\n}\n.dish-sell-input::-webkit-outer-spin-button,\n.dish-sell-input::-webkit-inner-spin-button {\n  -webkit-appearance: none;\n  margin: 0;\n}\n.dish-sell-input:focus {\n  border-bottom-color: var(--border-focus);\n}\n.dropdown-item {\n  display: block;\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  text-align: right;\n  font-family: var(--font-serif);\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n  background: none;\n  border: none;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.dropdown-item:hover {\n  background: var(--bg-glass-hover);\n}\n.dropdown-item.highlighted {\n  background: var(--color-primary-soft);\n  box-shadow: inset 0 0 0 1px var(--border-focus);\n}\n.dropdown-item.add-new {\n  color: var(--color-primary);\n  font-weight: 600;\n  border-top: 1px solid var(--border-default);\n}\n.dropdown-empty {\n  display: block;\n  padding: 8px 12px;\n  font-size: 0.8125rem;\n  color: var(--color-text-muted-light);\n  text-align: center;\n}\n/*# sourceMappingURL=menu-dish-row.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(MenuDishRowComponent, { className: "MenuDishRowComponent", filePath: "src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.ts", lineNumber: 38 });
})();

// src/app/pages/menu-intelligence/menu-intelligence.page.ts
var _c02 = () => ({ standalone: true });
function _forTrack02($index, $item) {
  let tmp_0_0;
  return (tmp_0_0 = $item.get("_id")) == null ? null : tmp_0_0.value;
}
function MenuIntelligencePage_Conditional_1_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 50);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_7_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r3);
      return \u0275\u0275resetView($event.stopPropagation());
    })("clickOutside", function MenuIntelligencePage_Conditional_1_Conditional_7_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275elementStart(1, "button", 51);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_7_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onViewMenuInfo();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(2, "lucide-icon", 52);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 51);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_7_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onExportMenuInfo();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(6, "lucide-icon", 53);
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(4, 4, "view"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(8, 6, "export"), " ");
  }
}
function MenuIntelligencePage_Conditional_1_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 50);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_14_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r4);
      return \u0275\u0275resetView($event.stopPropagation());
    })("clickOutside", function MenuIntelligencePage_Conditional_1_Conditional_14_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275elementStart(1, "button", 51);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_14_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onViewMenuShoppingList();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(2, "lucide-icon", 52);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 51);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_14_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onExportMenuShoppingList();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(6, "lucide-icon", 53);
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(4, 4, "view"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(8, 6, "export"), " ");
  }
}
function MenuIntelligencePage_Conditional_1_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 54);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_22_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("clickOutside", function MenuIntelligencePage_Conditional_1_Conditional_22_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeExportChecklistDropdown());
    });
    \u0275\u0275elementStart(1, "div", 55)(2, "span", 56);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 57);
    \u0275\u0275pipe(6, "translatePipe");
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_22_Template_button_click_5_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onViewChecklist("by_dish");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(7, "lucide-icon", 52);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "button", 57);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_22_Template_button_click_8_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onExportChecklist("by_dish");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(10, "lucide-icon", 53);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 55)(12, "span", 56);
    \u0275\u0275text(13);
    \u0275\u0275pipe(14, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "button", 57);
    \u0275\u0275pipe(16, "translatePipe");
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_22_Template_button_click_15_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onViewChecklist("by_category");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(17, "lucide-icon", 52);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "button", 57);
    \u0275\u0275pipe(19, "translatePipe");
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_22_Template_button_click_18_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onExportChecklist("by_category");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(20, "lucide-icon", 53);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "div", 55)(22, "span", 56);
    \u0275\u0275text(23);
    \u0275\u0275pipe(24, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "button", 57);
    \u0275\u0275pipe(26, "translatePipe");
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_22_Template_button_click_25_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onViewChecklist("by_station");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(27, "lucide-icon", 52);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "button", 57);
    \u0275\u0275pipe(29, "translatePipe");
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_22_Template_button_click_28_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onExportChecklist("by_station");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(30, "lucide-icon", 53);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 15, "export_checklist_by_dish"));
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(6, 17, "view"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 12);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(9, 19, "export"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 12);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(14, 21, "export_checklist_by_category"));
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(16, 23, "view"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 12);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(19, 25, "export"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 12);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(24, 27, "export_checklist_by_station"));
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(26, 29, "view"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 12);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(29, 31, "export"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 12);
  }
}
function MenuIntelligencePage_Conditional_1_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 50);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_29_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r6);
      return \u0275\u0275resetView($event.stopPropagation());
    })("clickOutside", function MenuIntelligencePage_Conditional_1_Conditional_29_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275elementStart(1, "button", 51);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_29_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onViewAll();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(2, "lucide-icon", 52);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 51);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Conditional_29_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onExportAllTogether();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(6, "lucide-icon", 53);
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(4, 4, "view"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(8, 6, "export"), " ");
  }
}
function MenuIntelligencePage_Conditional_1_Conditional_34_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 48);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function MenuIntelligencePage_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-export-toolbar-overlay", 35);
    \u0275\u0275listener("closeRequest", function MenuIntelligencePage_Conditional_1_Template_app_export_toolbar_overlay_closeRequest_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeToolbar());
    });
    \u0275\u0275elementStart(1, "div", 36)(2, "button", 37);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Template_button_click_2_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.openViewExportModal("menu-info");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(4, "lucide-icon", 38);
    \u0275\u0275text(5);
    \u0275\u0275pipe(6, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(7, MenuIntelligencePage_Conditional_1_Conditional_7_Template, 9, 8, "div", 39);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 36)(9, "button", 37);
    \u0275\u0275pipe(10, "translatePipe");
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Template_button_click_9_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.openViewExportModal("shopping-list");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(11, "lucide-icon", 40);
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(14, MenuIntelligencePage_Conditional_1_Conditional_14_Template, 9, 8, "div", 39);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 41)(16, "button", 37);
    \u0275\u0275pipe(17, "translatePipe");
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Template_button_click_16_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.toggleExportChecklistDropdown();
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(18, "lucide-icon", 42);
    \u0275\u0275text(19);
    \u0275\u0275pipe(20, "translatePipe");
    \u0275\u0275element(21, "lucide-icon", 43);
    \u0275\u0275elementEnd();
    \u0275\u0275template(22, MenuIntelligencePage_Conditional_1_Conditional_22_Template, 31, 33, "div", 44);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 36)(24, "button", 37);
    \u0275\u0275pipe(25, "translatePipe");
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Template_button_click_24_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.openViewExportModal("all");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(26, "lucide-icon", 45);
    \u0275\u0275text(27);
    \u0275\u0275pipe(28, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(29, MenuIntelligencePage_Conditional_1_Conditional_29_Template, 9, 8, "div", 39);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(30, "button", 37);
    \u0275\u0275pipe(31, "translatePipe");
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Template_button_click_30_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.printMenu());
    });
    \u0275\u0275element(32, "lucide-icon", 46);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "button", 47);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_1_Template_button_click_33_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.save());
    });
    \u0275\u0275template(34, MenuIntelligencePage_Conditional_1_Conditional_34_Template, 1, 1, "app-loader", 48);
    \u0275\u0275element(35, "lucide-icon", 49);
    \u0275\u0275text(36);
    \u0275\u0275pipe(37, "translatePipe");
    \u0275\u0275pipe(38, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(3, 27, "export_menu_info"))("aria-expanded", ctx_r1.viewExportModal_() === "menu-info");
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(6, 29, "toolbar_menu"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.viewExportModal_() === "menu-info" ? 7 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(10, 31, "export_menu_shopping_list"))("aria-expanded", ctx_r1.viewExportModal_() === "shopping-list");
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(13, 33, "toolbar_shopping"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.viewExportModal_() === "shopping-list" ? 14 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(17, 35, "export_checklist"))("aria-expanded", ctx_r1.exportChecklistDropdownOpen_());
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(20, 37, "toolbar_checklist"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 12);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.exportChecklistDropdownOpen_() ? 22 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(25, 39, "export_all_together"))("aria-expanded", ctx_r1.viewExportModal_() === "all");
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(28, 41, "toolbar_all"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.viewExportModal_() === "all" ? 29 : -1);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(31, 43, "menu_export_customer"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r1.isSaving_());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isSaving_() ? 34 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.isSaving_() ? \u0275\u0275pipeBind1(37, 45, "saving") : \u0275\u0275pipeBind1(38, 47, "menu_save"), " ");
  }
}
function MenuIntelligencePage_Conditional_16_For_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 62);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_16_For_5_Template_button_click_0_listener() {
      const t_r9 = \u0275\u0275restoreView(_r8).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectEventType(t_r9));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const t_r9 = ctx.$implicit;
    const \u0275$index_187_r10 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("highlighted", ctx_r1.eventTypeHighlightedIndex_() === \u0275$index_187_r10);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(t_r9);
  }
}
function MenuIntelligencePage_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 10)(1, "input", 58);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("ngModelChange", function MenuIntelligencePage_Conditional_16_Template_input_ngModelChange_1_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.eventTypeSearch_.set($event);
      return \u0275\u0275resetView(ctx_r1.eventTypeHighlightedIndex_.set(0));
    })("keydown", function MenuIntelligencePage_Conditional_16_Template_input_keydown_1_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onEventTypeSearchKeydown($event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "app-scrollable-dropdown", 59);
    \u0275\u0275repeaterCreate(4, MenuIntelligencePage_Conditional_16_For_5_Template, 2, 3, "button", 60, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementStart(6, "button", 61);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_16_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.addNewEventType());
    });
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("ngModel", ctx_r1.eventTypeSearch_())("ngModelOptions", \u0275\u0275pureFunction0(11, _c02))("placeholder", \u0275\u0275pipeBind1(2, 7, "search"));
    \u0275\u0275advance(2);
    \u0275\u0275property("maxHeight", 200);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.getFilteredEventTypes());
    \u0275\u0275advance(2);
    \u0275\u0275classProp("highlighted", ctx_r1.eventTypeHighlightedIndex_() === ctx_r1.getFilteredEventTypes().length);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" + ", \u0275\u0275pipeBind1(8, 9, "add_new_category"), " ");
  }
}
function MenuIntelligencePage_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 63);
    \u0275\u0275listener("click", function MenuIntelligencePage_Conditional_17_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openEventTypeDropdown());
    })("keydown", function MenuIntelligencePage_Conditional_17_Template_button_keydown_0_listener($event) {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onMetaKeydown("event_type_", $event));
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.form_.value.event_type_ || \u0275\u0275pipeBind1(2, 1, "menu_event_type"), " ");
  }
}
function MenuIntelligencePage_For_48_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 64);
  }
}
function MenuIntelligencePage_For_48_Conditional_3_For_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 62);
    \u0275\u0275listener("click", function MenuIntelligencePage_For_48_Conditional_3_For_5_Template_button_click_0_listener() {
      const cat_r16 = \u0275\u0275restoreView(_r15).$implicit;
      const \u0275$index_247_r14 = \u0275\u0275nextContext(2).$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.selectSectionCategory(\u0275$index_247_r14, cat_r16));
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const cat_r16 = ctx.$implicit;
    const \u0275$index_263_r17 = ctx.$index;
    const \u0275$index_247_r14 = \u0275\u0275nextContext(2).$index;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("highlighted", ctx_r1.getSectionCategoryHighlightedIndex(\u0275$index_247_r14) === \u0275$index_263_r17);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 3, cat_r16), " ");
  }
}
function MenuIntelligencePage_For_48_Conditional_3_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 61);
    \u0275\u0275listener("click", function MenuIntelligencePage_For_48_Conditional_3_Conditional_6_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r18);
      const \u0275$index_247_r14 = \u0275\u0275nextContext(2).$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.addNewSectionCategory(\u0275$index_247_r14));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const \u0275$index_247_r14 = \u0275\u0275nextContext(2).$index;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("highlighted", ctx_r1.getSectionCategoryHighlightedIndex(\u0275$index_247_r14) === ctx_r1.getFilteredSectionCategories(\u0275$index_247_r14).length);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" + ", ctx_r1.getSectionSearchQuery(\u0275$index_247_r14), " ");
  }
}
function MenuIntelligencePage_For_48_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 73);
    \u0275\u0275listener("clickOutside", function MenuIntelligencePage_For_48_Conditional_3_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeSectionSearch());
    });
    \u0275\u0275elementStart(1, "input", 74);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("ngModelChange", function MenuIntelligencePage_For_48_Conditional_3_Template_input_ngModelChange_1_listener($event) {
      \u0275\u0275restoreView(_r13);
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onSectionSearchQueryChange(\u0275$index_247_r14, $event));
    })("keydown", function MenuIntelligencePage_For_48_Conditional_3_Template_input_keydown_1_listener($event) {
      \u0275\u0275restoreView(_r13);
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onSectionSearchKeydown(\u0275$index_247_r14, $event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "app-scrollable-dropdown", 59);
    \u0275\u0275repeaterCreate(4, MenuIntelligencePage_For_48_Conditional_3_For_5_Template, 3, 5, "button", 60, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275template(6, MenuIntelligencePage_For_48_Conditional_3_Conditional_6_Template, 2, 3, "button", 75);
    \u0275\u0275elementStart(7, "button", 61);
    \u0275\u0275listener("click", function MenuIntelligencePage_For_48_Conditional_3_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r13);
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openAddCategoryModal(\u0275$index_247_r14));
    });
    \u0275\u0275text(8);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("ngModel", ctx_r1.getSectionSearchQuery(\u0275$index_247_r14))("ngModelOptions", \u0275\u0275pureFunction0(12, _c02))("placeholder", \u0275\u0275pipeBind1(2, 8, "menu_search_category"));
    \u0275\u0275advance(2);
    \u0275\u0275property("maxHeight", 200);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.getFilteredSectionCategories(\u0275$index_247_r14));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.getSectionSearchQuery(\u0275$index_247_r14).trim() ? 6 : -1);
    \u0275\u0275advance();
    \u0275\u0275classProp("highlighted", ctx_r1.getSectionCategoryHighlightedIndex(\u0275$index_247_r14) === ctx_r1.getSectionCategoryOptionCount(\u0275$index_247_r14) - 1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" + ", \u0275\u0275pipeBind1(9, 10, "add_new_category"), " ");
  }
}
function MenuIntelligencePage_For_48_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 76);
    \u0275\u0275listener("click", function MenuIntelligencePage_For_48_Conditional_4_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r19);
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openSectionSearch(\u0275$index_247_r14));
    })("keydown.space", function MenuIntelligencePage_For_48_Conditional_4_Template_button_keydown_space_0_listener($event) {
      \u0275\u0275restoreView(_r19);
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      $event.preventDefault();
      return \u0275\u0275resetView(ctx_r1.openSectionSearch(\u0275$index_247_r14));
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_13_0;
    const ctx_r19 = \u0275\u0275nextContext();
    const section_r21 = ctx_r19.$implicit;
    const \u0275$index_247_r14 = ctx_r19.$index;
    \u0275\u0275property("id", "section-title-" + \u0275$index_247_r14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 2, (tmp_13_0 = (tmp_13_0 = section_r21.get("name_")) == null ? null : tmp_13_0.value) !== null && tmp_13_0 !== void 0 ? tmp_13_0 : "") || \u0275\u0275pipeBind1(3, 4, "menu_section_placeholder"), " ");
  }
}
function MenuIntelligencePage_For_48_For_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r22 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-menu-dish-row", 77);
    \u0275\u0275listener("remove", function MenuIntelligencePage_For_48_For_9_Template_app_menu_dish_row_remove_0_listener() {
      const \u0275$index_288_r23 = \u0275\u0275restoreView(_r22).$index;
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.removeItem(\u0275$index_247_r14, \u0275$index_288_r23));
    })("selectRecipe", function MenuIntelligencePage_For_48_For_9_Template_app_menu_dish_row_selectRecipe_0_listener($event) {
      const \u0275$index_288_r23 = \u0275\u0275restoreView(_r22).$index;
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.selectRecipe(\u0275$index_247_r14, \u0275$index_288_r23, $event.recipe));
    })("startEditName", function MenuIntelligencePage_For_48_For_9_Template_app_menu_dish_row_startEditName_0_listener() {
      const \u0275$index_288_r23 = \u0275\u0275restoreView(_r22).$index;
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.startEditDishName(\u0275$index_247_r14, \u0275$index_288_r23));
    })("searchQueryChange", function MenuIntelligencePage_For_48_For_9_Template_app_menu_dish_row_searchQueryChange_0_listener($event) {
      const \u0275$index_288_r23 = \u0275\u0275restoreView(_r22).$index;
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onDishSearchQueryChange(\u0275$index_247_r14, \u0275$index_288_r23, $event));
    })("metaToggle", function MenuIntelligencePage_For_48_For_9_Template_app_menu_dish_row_metaToggle_0_listener() {
      const \u0275$index_288_r23 = \u0275\u0275restoreView(_r22).$index;
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleDishMeta(\u0275$index_247_r14, \u0275$index_288_r23));
    })("editDishFieldStart", function MenuIntelligencePage_For_48_For_9_Template_app_menu_dish_row_editDishFieldStart_0_listener($event) {
      const \u0275$index_288_r23 = \u0275\u0275restoreView(_r22).$index;
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.startEditDishField(\u0275$index_247_r14, \u0275$index_288_r23, $event));
    })("editDishFieldCommit", function MenuIntelligencePage_For_48_For_9_Template_app_menu_dish_row_editDishFieldCommit_0_listener() {
      \u0275\u0275restoreView(_r22);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.commitEditDishField());
    })("sellPriceKeydown", function MenuIntelligencePage_For_48_For_9_Template_app_menu_dish_row_sellPriceKeydown_0_listener($event) {
      const \u0275$index_288_r23 = \u0275\u0275restoreView(_r22).$index;
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onSellPriceKeydown(\u0275$index_247_r14, \u0275$index_288_r23, $event));
    })("dishFieldKeydown", function MenuIntelligencePage_For_48_For_9_Template_app_menu_dish_row_dishFieldKeydown_0_listener($event) {
      const \u0275$index_288_r23 = \u0275\u0275restoreView(_r22).$index;
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onDishFieldKeydown(\u0275$index_247_r14, \u0275$index_288_r23, $event.fieldKey, $event.event));
    })("dishSearchKeydown", function MenuIntelligencePage_For_48_For_9_Template_app_menu_dish_row_dishSearchKeydown_0_listener($event) {
      const \u0275$index_288_r23 = \u0275\u0275restoreView(_r22).$index;
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onDishSearchKeydown(\u0275$index_247_r14, \u0275$index_288_r23, $event));
    })("clearSearch", function MenuIntelligencePage_For_48_For_9_Template_app_menu_dish_row_clearSearch_0_listener() {
      const \u0275$index_288_r23 = \u0275\u0275restoreView(_r22).$index;
      const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.clearDishSearch(\u0275$index_247_r14, \u0275$index_288_r23));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r24 = ctx.$implicit;
    const \u0275$index_288_r23 = ctx.$index;
    const \u0275$index_247_r14 = \u0275\u0275nextContext().$index;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275property("itemGroup", item_r24)("sectionIndex", \u0275$index_247_r14)("itemIndex", \u0275$index_288_r23)("recipes", ctx_r1.recipes_())("activeFields", ctx_r1.activeMenuTypeFields_())("dishSearchQuery", ctx_r1.getDishSearchQuery(\u0275$index_247_r14, \u0275$index_288_r23))("highlightedIndex", ctx_r1.getDishSearchHighlightedIndex(\u0275$index_247_r14, \u0275$index_288_r23))("isMetaExpanded", ctx_r1.isDishMetaExpanded(\u0275$index_247_r14, \u0275$index_288_r23))("editingDishField", ctx_r1.editingDishField_())("servingType", ctx_r1.form_.value.serving_type_ || "plated_course")("guestCount", ctx_r1.getGuestCount())("piecesPerPerson", ctx_r1.getPiecesPerPerson());
  }
}
function MenuIntelligencePage_For_48_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 27);
    \u0275\u0275template(1, MenuIntelligencePage_For_48_Conditional_1_Template, 1, 0, "div", 64);
    \u0275\u0275elementStart(2, "div", 65);
    \u0275\u0275template(3, MenuIntelligencePage_For_48_Conditional_3_Template, 10, 13, "div", 66)(4, MenuIntelligencePage_For_48_Conditional_4_Template, 4, 6, "button", 67);
    \u0275\u0275elementStart(5, "button", 68);
    \u0275\u0275listener("click", function MenuIntelligencePage_For_48_Template_button_click_5_listener() {
      const \u0275$index_247_r14 = \u0275\u0275restoreView(_r12).$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.removeSection(\u0275$index_247_r14));
    });
    \u0275\u0275element(6, "lucide-icon", 69);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 70);
    \u0275\u0275repeaterCreate(8, MenuIntelligencePage_For_48_For_9_Template, 1, 12, "app-menu-dish-row", 71, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "button", 72);
    \u0275\u0275listener("click", function MenuIntelligencePage_For_48_Template_button_click_10_listener() {
      const \u0275$index_247_r14 = \u0275\u0275restoreView(_r12).$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.addItem(\u0275$index_247_r14));
    });
    \u0275\u0275text(11);
    \u0275\u0275pipe(12, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const \u0275$index_247_r14 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275property("formGroupName", \u0275$index_247_r14);
    \u0275\u0275advance();
    \u0275\u0275conditional(\u0275$index_247_r14 > 0 ? 1 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.sectionSearchOpen_() === \u0275$index_247_r14 ? 3 : 4);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.getItemsArray(\u0275$index_247_r14).controls);
    \u0275\u0275advance(2);
    \u0275\u0275property("id", "add-dish-" + \u0275$index_247_r14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" + ", \u0275\u0275pipeBind1(12, 6, "menu_add_dish"), " ");
  }
}
function MenuIntelligencePage_Conditional_66_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "number");
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind2(1, 1, ctx_r1.foodCostPct_(), "1.1-1"), "% ");
  }
}
function MenuIntelligencePage_Conditional_67_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u2014 ");
  }
}
function MenuIntelligencePage_Conditional_82_Template(rf, ctx) {
  if (rf & 1) {
    const _r25 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-export-preview", 78);
    \u0275\u0275listener("exportClick", function MenuIntelligencePage_Conditional_82_Template_app_export_preview_exportClick_0_listener() {
      \u0275\u0275restoreView(_r25);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onExportFromPreview());
    })("printClick", function MenuIntelligencePage_Conditional_82_Template_app_export_preview_printClick_0_listener() {
      \u0275\u0275restoreView(_r25);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onPrintFromPreview());
    })("close", function MenuIntelligencePage_Conditional_82_Template_app_export_preview_close_0_listener() {
      \u0275\u0275restoreView(_r25);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onCloseExportPreview());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275property("payload", ctx);
  }
}
var MenuIntelligencePage = class _MenuIntelligencePage {
  fb = inject(FormBuilder);
  router = inject(Router);
  route = inject(ActivatedRoute);
  kitchenState = inject(KitchenStateService);
  menuEventData = inject(MenuEventDataService);
  menuIntelligence = inject(MenuIntelligenceService);
  userMsg = inject(UserMsgService);
  addItemModal = inject(AddItemModalService);
  metadataRegistry = inject(MetadataRegistryService);
  menuSectionCategories = inject(MenuSectionCategoriesService);
  recipeCostService = inject(RecipeCostService);
  exportService = inject(ExportService);
  heroFab = inject(HeroFabService);
  destroyRef = inject(DestroyRef);
  /** Bumped when form value changes so footer computeds re-run (form is not a signal). */
  formValueVersion_ = signal(0);
  editingId_ = signal(null);
  ALL_DISH_FIELDS = ALL_DISH_FIELDS;
  recipes_ = this.kitchenState.recipes_;
  products_ = this.kitchenState.products_;
  saving = useSavingState();
  isSaving_ = this.saving.isSaving_;
  showExport_ = signal(false);
  toolbarOpen_ = signal(false);
  menuFabExpanded_ = signal(false);
  /** Export preview (View before export). */
  exportPreviewPayload_ = signal(null);
  exportPreviewType_ = null;
  exportChecklistMode_ = null;
  /** Per-section dish search query signals keyed by section index */
  dishSearchQueries_ = signal({});
  /** Per-section header search query signals */
  sectionSearchQueries_ = signal({});
  sectionSearchOpen_ = signal(null);
  /** Currently active dish search (for keyboard nav); null when none focused/has query. */
  activeDishSearch_ = signal(null);
  /** Dish row being edited (for restoring recipe_id_ on cancel). */
  editingDishAt_ = signal(null);
  /** Highlighted index for keyboard nav in dropdowns (-1 = none). */
  eventTypeHighlightedIndex_ = signal(0);
  sectionCategoryHighlightedIndex_ = signal({});
  dishSearchHighlightedIndex_ = signal({});
  sectionCategories_ = this.menuSectionCategories.sectionCategories_;
  /** Track saved snapshot for dirty detection */
  savedSnapshot_ = "";
  form_ = this.fb.group({
    name_: [""],
    event_type_: ["", Validators.required],
    event_date_: [(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)],
    serving_type_: ["plated_course", Validators.required],
    guest_count_: [50, [Validators.required, Validators.min(0)]],
    sections_: this.fb.array([])
  });
  /** Inline-edit state for metadata fields */
  editingField_ = signal(null);
  /** Which dish rows have metadata expanded (key: "sectionIndex-itemIndex") */
  expandedMetaKeys_ = signal(/* @__PURE__ */ new Set());
  /** Which dish field is in edit mode (key: "sectionIndex-itemIndex-fieldKey") */
  editingDishField_ = signal(null);
  /** Event type dropdown open + search query for filtering */
  eventTypeDropdownOpen_ = signal(false);
  eventTypeSearch_ = signal("");
  /** Focus order for keyboard navigation */
  FOCUS_ORDER = ["name_", "event_type_", "serving_type_", "guest_count_", "event_date_"];
  eventCost_ = computed(() => {
    this.formValueVersion_();
    const event = this.buildEventFromForm();
    return this.menuIntelligence.computeEventIngredientCost(event);
  });
  foodCostPct_ = computed(() => {
    this.formValueVersion_();
    const revenue = this.totalRevenue_();
    const cost = this.eventCost_();
    if (revenue <= 0)
      return 0;
    return cost / revenue * 100;
  });
  totalRevenue_ = computed(() => {
    this.formValueVersion_();
    const guestCount = Number(this.form_.get("guest_count_")?.value ?? 0);
    let total = 0;
    const sections = this.sectionsArray;
    for (let si = 0; si < sections.length; si++) {
      const items = this.getItemsArray(si);
      for (let ii = 0; ii < items.length; ii++) {
        const item = items.at(ii);
        const price = Number(item.get("sell_price")?.value ?? 0);
        const sp = Number(item.get("serving_portions")?.value ?? 1);
        total += price * sp * guestCount;
      }
    }
    return total;
  });
  costPerGuest_ = computed(() => {
    this.formValueVersion_();
    const guestCount = this.getGuestCount();
    if (guestCount <= 0)
      return 0;
    return this.eventCost_() / guestCount;
  });
  menuTypeOptions_ = computed(() => this.metadataRegistry.allMenuTypes_().map((t) => t.key));
  servingTypeOptions_ = computed(() => this.menuTypeOptions_().map((key) => ({ value: key, label: key })));
  activeMenuTypeFields_ = computed(() => {
    const key = this.form_.value.serving_type_;
    if (!key)
      return [...DEFAULT_DISH_FIELDS];
    const fields = this.metadataRegistry.getMenuTypeFields(key);
    const all = fields.length > 0 ? fields : [...DEFAULT_DISH_FIELDS];
    return all.filter((f) => f !== "sell_price");
  });
  constructor() {
    this.form_.valueChanges.pipe(startWith(null), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.formValueVersion_.update((v) => v + 1));
    const id = this.route.snapshot.paramMap.get("id");
    if (id) {
      this.editingId_.set(id);
      void this.loadEvent(id);
    } else {
      this.addSection();
      this.savedSnapshot_ = JSON.stringify(this.form_.getRawValue());
    }
  }
  ngOnInit() {
    this.heroFab.setPageActions([{ labelKey: "menu_toolbar_open", icon: "printer", run: () => this.openToolbar() }], "replace");
    this.router.events.pipe(filter((e) => e instanceof NavigationStart), takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (!e.url.startsWith("/menu-intelligence")) {
        this.closeAllExportOverlays();
      }
    });
  }
  /** Close export toolbar and all sub-modals so state is clean when user navigates away. */
  closeAllExportOverlays() {
    this.showExport_.set(false);
    this.toolbarOpen_.set(false);
    this.menuFabExpanded_.set(false);
    this.viewExportModal_.set(null);
    this.exportChecklistDropdownOpen_.set(false);
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
  }
  ngOnDestroy() {
    this.closeAllExportOverlays();
    this.heroFab.clearPageActions();
  }
  ngAfterViewInit() {
    setTimeout(() => this.focusField("name_"), 0);
  }
  /** Focus a field by name; 'name_' = menu name, then event_type_, serving_type_, guest_count_, event_date_, then 'section_0' */
  focusField(field) {
    const el = document.getElementById(`menu-focus-${field}`);
    if (el && typeof el.focus === "function") {
      el.focus();
      if (field === "event_date_" && typeof el.showPicker === "function") {
        el.showPicker();
      }
    } else if (el)
      el.focus();
  }
  /** Open date picker and focus the date input (called from clickable date label). */
  openDatePicker() {
    this.dateDigitBuffer_.set("");
    this.focusField("event_date_");
  }
  /** Format event_date_ for display (DD/MM/YYYY or placeholder). */
  getEventDateDisplay() {
    const raw = this.form_.get("event_date_")?.value;
    if (!raw)
      return "";
    const d = /* @__PURE__ */ new Date(raw + "T12:00:00");
    if (Number.isNaN(d.getTime()))
      return raw;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  dateDigitBuffer_ = signal("");
  /** Handle digit-only input for date: first 2 = day, next 2 = month, then 4 = year. */
  onDateKeydown(e) {
    if (e.key === "Enter" || e.key === "Tab" || e.key === "ArrowDown" || e.key === "ArrowUp") {
      this.onMetaKeydown("event_date_", e);
      return;
    }
    if (e.key.length === 1 && /\d/.test(e.key)) {
      const buf = this.dateDigitBuffer_().slice(0, 8) + e.key;
      if (buf.length <= 8) {
        e.preventDefault();
        this.dateDigitBuffer_.set(buf);
        if (buf.length === 8) {
          const dStr = buf.slice(0, 2);
          const mStr = buf.slice(2, 4);
          const yStr = buf.slice(4, 8);
          const dNum = Math.min(31, Math.max(1, parseInt(dStr, 10) || 1));
          const mNum = Math.min(12, Math.max(1, parseInt(mStr, 10) || 1));
          const yNum = Math.max(1900, Math.min(2100, parseInt(yStr, 10) || (/* @__PURE__ */ new Date()).getFullYear()));
          const iso = `${yNum}-${String(mNum).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
          this.form_.patchValue({ event_date_: iso });
          this.dateDigitBuffer_.set("");
        }
      }
    } else if (e.key === "Backspace") {
      const current = this.dateDigitBuffer_();
      if (current.length > 0) {
        e.preventDefault();
        this.dateDigitBuffer_.set(current.slice(0, -1));
      }
    }
  }
  incrementGuests() {
    const ctrl = this.form_.get("guest_count_");
    const v = Number(ctrl?.value ?? 0);
    ctrl?.setValue(quantityIncrement(v, 0, { integerOnly: true }));
  }
  decrementGuests() {
    const ctrl = this.form_.get("guest_count_");
    const v = Number(ctrl?.value ?? 0);
    ctrl?.setValue(quantityDecrement(v, 0, { integerOnly: true }));
  }
  getGuestCount() {
    return Number(this.form_.get("guest_count_")?.value ?? 0);
  }
  onMetaKeydown(field, e) {
    if (field === "event_type_") {
      if (e.key === "Enter" || e.key === "Tab" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        this.openEventTypeDropdown();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.moveFocus(field, -1);
        return;
      }
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      this.moveFocus(field, 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      this.moveFocus(field, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.moveFocus(field, -1);
    }
  }
  moveFocus(currentField, direction) {
    const order = [...this.FOCUS_ORDER];
    if (this.sectionsArray.length > 0)
      order.push("section_0");
    const idx = order.indexOf(currentField);
    if (idx < 0)
      return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= order.length)
      return;
    const next = order[nextIdx];
    if (next === "section_0") {
      this.stopEditField();
      this.closeEventTypeDropdown();
      this.openSectionSearch(0);
      setTimeout(() => {
        const input2 = document.querySelector(".section-search-input");
        input2?.focus();
      }, 50);
      return;
    }
    this.stopEditField();
    this.closeEventTypeDropdown();
    this.focusField(next);
  }
  goBack() {
    this.router.navigate(["/menu-library"]);
  }
  /** Event types: from existing menus + allow add new via AddItemModal */
  eventTypeOptions_ = computed(() => {
    const set = /* @__PURE__ */ new Set();
    this.menuEventData.allMenuEvents_().forEach((ev) => {
      if (ev.event_type_)
        set.add(ev.event_type_);
    });
    return Array.from(set);
  });
  getFilteredEventTypes() {
    const raw = this.eventTypeSearch_().trim();
    const list = this.eventTypeOptions_();
    if (!raw)
      return list;
    return filterOptionsByStartsWith(list, raw, (t) => t);
  }
  openEventTypeDropdown() {
    this.eventTypeDropdownOpen_.set(true);
    this.eventTypeSearch_.set("");
    this.eventTypeHighlightedIndex_.set(0);
    this.startEditField("event_type");
    setTimeout(() => document.getElementById("menu-focus-event_type_search")?.focus(), 50);
  }
  closeEventTypeDropdown() {
    this.eventTypeDropdownOpen_.set(false);
    this.eventTypeSearch_.set("");
    this.eventTypeHighlightedIndex_.set(-1);
  }
  onEventTypeSearchKeydown(e) {
    const list = this.getFilteredEventTypes();
    const addNewIndex = list.length;
    const maxIndex = addNewIndex;
    let idx = this.eventTypeHighlightedIndex_();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      idx = Math.min(idx + 1, maxIndex);
      this.eventTypeHighlightedIndex_.set(idx);
      this.scrollDropdownHighlightIntoView(".event-type-dropdown");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      idx = Math.max(0, idx - 1);
      this.eventTypeHighlightedIndex_.set(idx);
      this.scrollDropdownHighlightIntoView(".event-type-dropdown");
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      if (idx >= 0 && idx < list.length) {
        this.selectEventType(list[idx]);
      } else if (idx === addNewIndex) {
        void this.addNewEventType();
      } else {
        this.focusField("serving_type_");
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.closeEventTypeDropdown();
      this.focusField("event_type_");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      this.closeEventTypeDropdown();
      this.focusField("serving_type_");
    }
  }
  scrollDropdownHighlightIntoView(containerClass) {
    setTimeout(() => {
      const el = document.querySelector(`${containerClass} .dropdown-item.highlighted`);
      el?.scrollIntoView({ block: "nearest" });
    }, 0);
  }
  onDocumentKeydown(e) {
    const key = e.key;
    if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Enter")
      return;
    const el = e.target;
    if (el.closest(".event-type-dropdown") && this.eventTypeDropdownOpen_()) {
      e.preventDefault();
      e.stopPropagation();
      this.onEventTypeSearchKeydown(e);
      return;
    }
    const sectionOpen = this.sectionSearchOpen_();
    if (el.closest(".section-search-wrap") && sectionOpen !== null) {
      e.preventDefault();
      e.stopPropagation();
      this.onSectionSearchKeydown(sectionOpen, e);
      return;
    }
    const activeDish = this.activeDishSearch_();
    if (el.closest(".dish-search-wrap") && activeDish !== null) {
      e.preventDefault();
      e.stopPropagation();
      this.onDishSearchKeydown(activeDish.sectionIndex, activeDish.itemIndex, e);
    }
  }
  selectEventType(value) {
    this.form_.patchValue({ event_type_: value });
    this.closeEventTypeDropdown();
    this.stopEditField();
    this.focusField("serving_type_");
  }
  addNewEventType() {
    return __async(this, null, function* () {
      const result = yield this.addItemModal.open({
        title: "add_new_category",
        label: "menu_event_type",
        placeholder: "menu_event_type",
        saveLabel: "save"
      });
      if (result?.trim()) {
        this.form_.patchValue({ event_type_: result.trim() });
        this.closeEventTypeDropdown();
        this.stopEditField();
        this.focusField("serving_type_");
      }
    });
  }
  /** For pendingChangesGuard */
  hasUnsavedEdits() {
    return JSON.stringify(this.form_.getRawValue()) !== this.savedSnapshot_;
  }
  get sectionsArray() {
    return this.form_.get("sections_");
  }
  addSection() {
    this.sectionsArray.push(this.fb.group({
      _id: [crypto.randomUUID()],
      name_: [""],
      sort_order_: [this.sectionsArray.length + 1],
      items_: this.fb.array([])
    }));
  }
  removeSection(index) {
    this.sectionsArray.removeAt(index);
  }
  getItemsArray(sectionIndex) {
    return this.sectionsArray.at(sectionIndex).get("items_");
  }
  addItem(sectionIndex) {
    const items = this.getItemsArray(sectionIndex);
    items.push(this.fb.group({
      recipe_id_: ["", Validators.required],
      recipe_type_: ["dish"],
      predicted_take_rate_: [0.4, [Validators.required, Validators.min(0), Validators.max(1)]],
      sell_price: [0],
      food_cost_money: [0],
      food_cost_pct: [0],
      serving_portions: [1],
      serving_portions_pct: [0]
    }));
    const newItemIndex = items.length - 1;
    this.setDishSearchQuery(sectionIndex, newItemIndex, "");
    this.focusDishSearchInput(sectionIndex, newItemIndex);
  }
  removeItem(sectionIndex, itemIndex) {
    this.getItemsArray(sectionIndex).removeAt(itemIndex);
  }
  isRecipeDish(recipe) {
    return recipe.recipe_type_ === "dish" || !!(recipe.prep_items_?.length || recipe.prep_categories_?.length);
  }
  getPiecesPerPerson() {
    return this.form_.value.pieces_per_person_ ?? 1;
  }
  getAutoFoodCost(sectionIndex, itemIndex) {
    const item = this.getItemsArray(sectionIndex).at(itemIndex);
    const recipeId = item?.get("recipe_id_")?.value;
    if (!recipeId)
      return 0;
    const recipe = this.recipes_().find((r) => r._id === recipeId);
    if (!recipe)
      return 0;
    const derivedPortions = this.menuIntelligence.derivePortions(this.form_.value.serving_type_, this.getGuestCount(), Number(item.get("predicted_take_rate_")?.value ?? 0), this.getPiecesPerPerson(), Number(item.get("serving_portions")?.value ?? 1));
    const baseYield = Math.max(1, recipe.yield_amount_ || 1);
    const multiplier = derivedPortions / baseYield;
    const scaledCost = this.recipeCostService.computeRecipeCost(__spreadProps(__spreadValues({}, recipe), {
      ingredients_: recipe.ingredients_.map((ing) => __spreadProps(__spreadValues({}, ing), {
        amount_: (ing.amount_ || 0) * multiplier
      }))
    }));
    return Math.round(scaledCost * 100) / 100;
  }
  getDishSearchKey(sectionIndex, itemIndex) {
    return `${sectionIndex}-${itemIndex}`;
  }
  getDishMetaKey(sectionIndex, itemIndex) {
    return `${sectionIndex}-${itemIndex}`;
  }
  isDishMetaExpanded(sectionIndex, itemIndex) {
    return this.expandedMetaKeys_().has(this.getDishMetaKey(sectionIndex, itemIndex));
  }
  toggleDishMeta(sectionIndex, itemIndex) {
    const key = this.getDishMetaKey(sectionIndex, itemIndex);
    this.expandedMetaKeys_.update((set) => {
      const next = new Set(set);
      if (next.has(key))
        next.delete(key);
      else
        next.add(key);
      return next;
    });
  }
  getDishFieldEditKey(sectionIndex, itemIndex, fieldKey) {
    return `${sectionIndex}-${itemIndex}-${fieldKey}`;
  }
  isEditingDishField(sectionIndex, itemIndex, fieldKey) {
    return this.editingDishField_() === this.getDishFieldEditKey(sectionIndex, itemIndex, fieldKey);
  }
  startEditDishField(sectionIndex, itemIndex, fieldKey) {
    this.editingDishField_.set(this.getDishFieldEditKey(sectionIndex, itemIndex, fieldKey));
  }
  commitEditDishField() {
    this.editingDishField_.set(null);
  }
  onSellPriceKeydown(sectionIndex, itemIndex, e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const s = sectionIndex;
      const i = itemIndex;
      const items = this.getItemsArray(s);
      setTimeout(() => {
        if (e.shiftKey) {
          document.getElementById("dish-name-" + s + "-" + i)?.focus();
        } else {
          const nextSearch = document.getElementById("dish-search-" + s + "-" + (i + 1));
          const nextSell = document.getElementById("dish-sell-" + s + "-" + (i + 1));
          const addDish = document.getElementById("add-dish-" + s);
          (nextSearch ?? nextSell ?? addDish)?.focus();
        }
      }, 0);
      return;
    }
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    e.preventDefault();
    const item = this.getItemsArray(sectionIndex).at(itemIndex);
    const ctrl = item.get("sell_price");
    const v = Number(ctrl?.value ?? 0);
    const next = e.key === "ArrowUp" ? quantityIncrement(v, 0, { integerOnly: true }) : quantityDecrement(v, 0, { integerOnly: true });
    ctrl?.setValue(next);
  }
  onDishFieldKeydown(sectionIndex, itemIndex, fieldKey, e) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    e.preventDefault();
    const item = this.getItemsArray(sectionIndex).at(itemIndex);
    const ctrl = item.get(fieldKey);
    if (!ctrl)
      return;
    const v = Number(ctrl.value ?? 0);
    const isPortionField = fieldKey === "serving_portions" || fieldKey === "serving_portions_pct";
    const options = isPortionField ? { explicitStep: 0.25 } : { explicitStep: 0.01 };
    const next = e.key === "ArrowUp" ? quantityIncrement(v, 0, options) : quantityDecrement(v, 0, options);
    ctrl.setValue(next);
  }
  getDishSearchQuery(sectionIndex, itemIndex) {
    const key = this.getDishSearchKey(sectionIndex, itemIndex);
    const queries = this.dishSearchQueries_();
    return queries[key] ?? "";
  }
  setDishSearchQuery(sectionIndex, itemIndex, value) {
    this.dishSearchQueries_.update((q) => __spreadProps(__spreadValues({}, q), {
      [this.getDishSearchKey(sectionIndex, itemIndex)]: value
    }));
  }
  onDishSearchQueryChange(sectionIndex, itemIndex, value) {
    this.setDishSearchQuery(sectionIndex, itemIndex, value);
    const key = this.getDishSearchHighlightKey(sectionIndex, itemIndex);
    this.dishSearchHighlightedIndex_.update((m) => __spreadProps(__spreadValues({}, m), { [key]: 0 }));
    if (value.trim().length > 0) {
      this.activeDishSearch_.set({ sectionIndex, itemIndex });
    } else {
      this.activeDishSearch_.set(null);
      const edit = this.editingDishAt_();
      if (edit && edit.sectionIndex === sectionIndex && edit.itemIndex === itemIndex && edit.previousRecipeId) {
        this.getItemsArray(sectionIndex).at(itemIndex).patchValue({ recipe_id_: edit.previousRecipeId });
        this.editingDishAt_.set(null);
      }
    }
  }
  selectRecipe(sectionIndex, itemIndex, recipe) {
    const items = this.getItemsArray(sectionIndex);
    const group = items.at(itemIndex);
    const derivedPortions = this.menuIntelligence.derivePortions(this.form_.value.serving_type_, Number(this.form_.value.guest_count_ || 0), Number(group.get("predicted_take_rate_")?.value ?? 0.4), Number(this.form_.value.pieces_per_person_ ?? 1), Number(group.get("serving_portions")?.value ?? 1));
    const baseYield = Math.max(1, recipe.yield_amount_ || 1);
    const multiplier = derivedPortions / baseYield;
    const autoCost = this.recipeCostService.computeRecipeCost(__spreadProps(__spreadValues({}, recipe), {
      ingredients_: recipe.ingredients_.map((ing) => __spreadProps(__spreadValues({}, ing), {
        amount_: (ing.amount_ || 0) * multiplier
      }))
    }));
    group.patchValue({
      recipe_id_: recipe._id,
      recipe_type_: this.isRecipeDish(recipe) ? "dish" : "preparation",
      food_cost_money: Math.round(autoCost * 100) / 100,
      serving_portions: 1
    });
    this.setDishSearchQuery(sectionIndex, itemIndex, "");
    this.activeDishSearch_.set(null);
    const editing = this.editingDishAt_();
    if (editing && editing.sectionIndex === sectionIndex && editing.itemIndex === itemIndex) {
      this.editingDishAt_.set(null);
      return;
    }
    this.addItem(sectionIndex);
  }
  /** Click on dish name: switch row to search and replace (select will replace, not add). */
  startEditDishName(sectionIndex, itemIndex) {
    const group = this.getItemsArray(sectionIndex).at(itemIndex);
    const recipeId = group.get("recipe_id_")?.value;
    if (!recipeId)
      return;
    const currentName = this.recipes_().find((r) => r._id === recipeId)?.name_hebrew || "";
    this.editingDishAt_.set({ sectionIndex, itemIndex, previousRecipeId: recipeId });
    group.patchValue({ recipe_id_: "" });
    this.setDishSearchQuery(sectionIndex, itemIndex, currentName);
    this.activeDishSearch_.set({ sectionIndex, itemIndex });
    this.dishSearchHighlightedIndex_.update((m) => __spreadProps(__spreadValues({}, m), {
      [this.getDishSearchHighlightKey(sectionIndex, itemIndex)]: 0
    }));
    this.focusDishSearchInput(sectionIndex, itemIndex);
  }
  /** Focus the dish search input for a given section/item (e.g. after add or select). */
  focusDishSearchInput(sectionIndex, itemIndex) {
    setTimeout(() => {
      const el = document.getElementById(`dish-search-${sectionIndex}-${itemIndex}`);
      el?.focus();
    }, 50);
  }
  /** Clear dish search query (closes dropdown); used by clickOutside and Escape. */
  clearDishSearch(sectionIndex, itemIndex) {
    this.setDishSearchQuery(sectionIndex, itemIndex, "");
    this.activeDishSearch_.set(null);
    const edit = this.editingDishAt_();
    if (edit && edit.sectionIndex === sectionIndex && edit.itemIndex === itemIndex && edit.previousRecipeId) {
      const group = this.getItemsArray(sectionIndex).at(itemIndex);
      group.patchValue({ recipe_id_: edit.previousRecipeId });
      this.editingDishAt_.set(null);
    }
  }
  /** Enter in dish search: select first recipe if any, else keep focus. */
  getDishSearchHighlightKey(sectionIndex, itemIndex) {
    return `${sectionIndex}-${itemIndex}`;
  }
  getDishSearchHighlightedIndex(sectionIndex, itemIndex) {
    return this.dishSearchHighlightedIndex_()[this.getDishSearchHighlightKey(sectionIndex, itemIndex)] ?? 0;
  }
  getFilteredRecipes(sectionIndex, itemIndex) {
    const raw = this.getDishSearchQuery(sectionIndex, itemIndex).trim();
    if (!raw)
      return [];
    const filtered = filterOptionsByStartsWith(this.recipes_(), raw, (r) => r.name_hebrew ?? "");
    return filtered.slice(0, 12);
  }
  onDishSearchKeydown(sectionIndex, itemIndex, e) {
    const ke = e;
    const recipes = this.getFilteredRecipes(sectionIndex, itemIndex);
    const key = this.getDishSearchHighlightKey(sectionIndex, itemIndex);
    let idx = this.getDishSearchHighlightedIndex(sectionIndex, itemIndex);
    const maxIndex = Math.max(0, recipes.length - 1);
    if (ke.key === "ArrowDown") {
      ke.preventDefault();
      ke.stopPropagation();
      idx = recipes.length ? Math.min(idx + 1, maxIndex) : 0;
      this.dishSearchHighlightedIndex_.update((m) => __spreadProps(__spreadValues({}, m), { [key]: idx }));
      this.scrollDropdownHighlightIntoView(".dish-search-wrap");
      return;
    }
    if (ke.key === "ArrowUp") {
      ke.preventDefault();
      ke.stopPropagation();
      idx = Math.max(0, idx - 1);
      this.dishSearchHighlightedIndex_.update((m) => __spreadProps(__spreadValues({}, m), { [key]: idx }));
      this.scrollDropdownHighlightIntoView(".dish-search-wrap");
      return;
    }
    if (ke.key === "Enter" || ke.key === " ") {
      if (recipes.length > 0) {
        ke.preventDefault();
        ke.stopPropagation();
        const i = Math.min(idx, recipes.length - 1);
        this.selectRecipe(sectionIndex, itemIndex, recipes[i]);
      }
      return;
    }
    if (ke.key === "Escape") {
      ke.preventDefault();
      ke.stopPropagation();
      this.clearDishSearch(sectionIndex, itemIndex);
      return;
    }
    if (ke.key === "Tab") {
      ke.preventDefault();
      ke.stopPropagation();
      const s = sectionIndex;
      const i = itemIndex;
      const items = this.getItemsArray(s);
      const hasRecipe = (items.at(i)?.get("recipe_id_")?.value ?? "") !== "";
      setTimeout(() => {
        if (ke.shiftKey) {
          const prev = document.getElementById("dish-search-" + s + "-" + (i - 1));
          const sectionTitle = document.getElementById("section-title-" + s);
          (prev ?? sectionTitle)?.focus();
        } else {
          if (hasRecipe) {
            document.getElementById("dish-sell-" + s + "-" + i)?.focus();
          } else {
            const next = document.getElementById("dish-search-" + s + "-" + (i + 1));
            const addDish = document.getElementById("add-dish-" + s);
            (next ?? addDish)?.focus();
          }
        }
      }, 0);
    }
  }
  openSectionSearch(index) {
    this.sectionSearchOpen_.set(index);
    this.sectionSearchQueries_.update((q) => __spreadProps(__spreadValues({}, q), { [index]: "" }));
    this.sectionCategoryHighlightedIndex_.update((m) => __spreadProps(__spreadValues({}, m), { [index]: 0 }));
    setTimeout(() => {
      const input2 = document.querySelector(".section-search-wrap .section-search-input");
      input2?.focus();
    }, 0);
  }
  closeSectionSearch() {
    this.sectionSearchOpen_.set(null);
  }
  getSectionCategoryHighlightedIndex(sectionIndex) {
    return this.sectionCategoryHighlightedIndex_()[sectionIndex] ?? 0;
  }
  getSectionCategoryOptionCount(sectionIndex) {
    const cats = this.getFilteredSectionCategories(sectionIndex);
    const hasQuery = this.getSectionSearchQuery(sectionIndex).trim().length > 0;
    return cats.length + (hasQuery ? 2 : 1);
  }
  onSectionSearchKeydown(sectionIndex, e) {
    const maxIndex = this.getSectionCategoryOptionCount(sectionIndex) - 1;
    let idx = this.getSectionCategoryHighlightedIndex(sectionIndex);
    const cats = this.getFilteredSectionCategories(sectionIndex);
    const hasQuery = this.getSectionSearchQuery(sectionIndex).trim().length > 0;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      idx = Math.min(idx + 1, maxIndex);
      this.sectionCategoryHighlightedIndex_.update((m) => __spreadProps(__spreadValues({}, m), { [sectionIndex]: idx }));
      this.scrollDropdownHighlightIntoView(".section-search-wrap");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      idx = Math.max(0, idx - 1);
      this.sectionCategoryHighlightedIndex_.update((m) => __spreadProps(__spreadValues({}, m), { [sectionIndex]: idx }));
      this.scrollDropdownHighlightIntoView(".section-search-wrap");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (idx >= 0 && idx < cats.length) {
        this.selectSectionCategory(sectionIndex, cats[idx]);
        this.closeSectionSearch();
      } else if (hasQuery && idx === cats.length) {
        void this.addNewSectionCategory(sectionIndex);
        this.closeSectionSearch();
      } else if (idx === cats.length + (hasQuery ? 1 : 0)) {
        void this.openAddCategoryModal(sectionIndex);
        this.closeSectionSearch();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.closeSectionSearch();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      this.closeSectionSearch();
      const sectionIdx = sectionIndex;
      setTimeout(() => {
        if (e.shiftKey) {
          document.getElementById("section-title-" + sectionIdx)?.focus();
        } else {
          const firstDish = document.getElementById("dish-search-" + sectionIdx + "-0");
          const addDish = document.getElementById("add-dish-" + sectionIdx);
          (firstDish ?? addDish)?.focus();
        }
      }, 0);
    }
  }
  getSectionSearchQuery(index) {
    return this.sectionSearchQueries_()[index] || "";
  }
  setSectionSearchQuery(index, value) {
    this.sectionSearchQueries_.update((q) => __spreadProps(__spreadValues({}, q), { [index]: value }));
  }
  onSectionSearchQueryChange(sectionIndex, value) {
    this.setSectionSearchQuery(sectionIndex, value);
    this.sectionCategoryHighlightedIndex_.update((m) => __spreadProps(__spreadValues({}, m), { [sectionIndex]: 0 }));
  }
  getFilteredSectionCategories(index) {
    const raw = this.getSectionSearchQuery(index).trim();
    if (!raw)
      return this.sectionCategories_();
    return filterOptionsByStartsWith(this.sectionCategories_(), raw, (c) => c);
  }
  selectSectionCategory(index, category) {
    this.sectionsArray.at(index).get("name_")?.setValue(category);
    this.closeSectionSearch();
  }
  addNewSectionCategory(index) {
    return __async(this, null, function* () {
      const name = this.getSectionSearchQuery(index).trim();
      if (!name)
        return;
      yield this.menuSectionCategories.addCategory(name);
      this.selectSectionCategory(index, name);
    });
  }
  openAddCategoryModal(sectionIndex) {
    return __async(this, null, function* () {
      const result = yield this.addItemModal.open({
        title: "add_new_category",
        label: "menu_search_category",
        placeholder: "menu_search_category",
        saveLabel: "save"
      });
      if (result?.trim()) {
        const name = result.trim();
        yield this.menuSectionCategories.addCategory(name);
        this.selectSectionCategory(sectionIndex, name);
      }
    });
  }
  startEditField(field) {
    this.editingField_.set(field);
  }
  stopEditField() {
    this.editingField_.set(null);
  }
  getServingTypeLabel() {
    const map = {
      buffet_family: "Buffet / Family Style",
      plated_course: "Plated / Course Based",
      cocktail_passed: "Cocktail / Passed"
    };
    return map[this.form_.value.serving_type_ || "plated_course"] || "";
  }
  save() {
    return __async(this, null, function* () {
      if (this.form_.invalid) {
        this.form_.markAllAsTouched();
        this.userMsg.onSetErrorMsg("Please fill all required fields");
        return;
      }
      if (!this.form_.value.name_?.trim()) {
        this.form_.patchValue({ name_: this.generateDateName() });
      }
      yield this.saving.withSaving(() => __async(this, null, function* () {
        const event = this.menuIntelligence.hydrateDerivedPortions(this.buildEventFromForm());
        const now = Date.now();
        const id = this.editingId_();
        if (id) {
          yield this.menuEventData.updateMenuEvent(__spreadProps(__spreadValues({}, event), { _id: id, updated_at_: now }));
        } else {
          const created = yield this.menuEventData.addMenuEvent(__spreadProps(__spreadValues({}, event), { created_at_: now, updated_at_: now }));
          this.editingId_.set(created._id);
        }
        this.savedSnapshot_ = JSON.stringify(this.form_.getRawValue());
        this.userMsg.onSetSuccessMsg("Menu saved successfully");
        this.router.navigate(["/menu-library"]);
      }));
    });
  }
  generateDateName() {
    const today = /* @__PURE__ */ new Date();
    const base = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const existing = this.menuEventData.allMenuEvents_().map((e) => e.name_).filter((n) => n === base || n.startsWith(`${base} (`));
    if (!existing.includes(base))
      return base;
    let i = 1;
    while (existing.includes(`${base} (${i})`))
      i++;
    return `${base} (${i})`;
  }
  openToolbar() {
    this.toolbarOpen_.set(true);
    this.menuFabExpanded_.set(false);
  }
  closeToolbar() {
    this.toolbarOpen_.set(false);
  }
  expandMenuFab() {
    this.menuFabExpanded_.set(true);
  }
  collapseMenuFab() {
    this.menuFabExpanded_.set(false);
  }
  toggleExport() {
    this.showExport_.update((v) => !v);
  }
  printMenu() {
    window.print();
  }
  loadEvent(id) {
    return __async(this, null, function* () {
      const event = yield this.menuEventData.getMenuEventById(id);
      this.form_.patchValue({
        name_: event.name_,
        event_type_: event.event_type_,
        event_date_: event.event_date_ || "",
        serving_type_: event.serving_type_,
        guest_count_: event.guest_count_
      });
      this.sectionsArray.clear();
      event.sections_.forEach((section) => {
        const sectionGroup = this.fb.group({
          _id: [section._id],
          name_: [section.name_, Validators.required],
          sort_order_: [section.sort_order_],
          items_: this.fb.array([])
        });
        const items = sectionGroup.get("items_");
        section.items_.forEach((item) => {
          items.push(this.fb.group({
            recipe_id_: [item.recipe_id_, Validators.required],
            recipe_type_: [item.recipe_type_],
            predicted_take_rate_: [item.predicted_take_rate_, [Validators.required, Validators.min(0), Validators.max(1)]],
            sell_price: [item.sell_price_ ?? 0],
            food_cost_money: [item.food_cost_override_ ?? 0],
            food_cost_pct: [0],
            serving_portions: [item.serving_portions_ ?? 0],
            serving_portions_pct: [0]
          }));
        });
        this.sectionsArray.push(sectionGroup);
      });
      this.savedSnapshot_ = JSON.stringify(this.form_.getRawValue());
    });
  }
  buildEventFromForm() {
    const raw = this.form_.getRawValue();
    const servingType = raw.serving_type_;
    const guestCount = Number(raw.guest_count_ || 0);
    const sections = (raw.sections_ || []).map((section, sectionIndex) => ({
      _id: section._id ?? "",
      name_: section.name_ ?? "",
      sort_order_: sectionIndex + 1,
      items_: (section.items_ || []).map((item, itemIndex) => {
        const sp = Number(item.serving_portions || 1);
        return {
          recipe_id_: item.recipe_id_,
          recipe_type_: item.recipe_type_,
          predicted_take_rate_: Number(item.predicted_take_rate_ || 0),
          derived_portions_: sp * guestCount,
          sell_price_: item.sell_price ?? void 0,
          food_cost_override_: this.getAutoFoodCost(sectionIndex, itemIndex) || void 0,
          serving_portions_: sp
        };
      })
    }));
    const hydrated = this.menuIntelligence.hydrateDerivedPortions({
      _id: "",
      name_: raw.name_ || "Untitled Event",
      event_type_: raw.event_type_ || "General Event",
      event_date_: raw.event_date_ || "",
      serving_type_: servingType,
      guest_count_: guestCount,
      sections_: sections,
      financial_targets_: {
        target_food_cost_pct_: 30,
        target_revenue_per_guest_: 0
      },
      performance_tags_: {
        food_cost_pct_: 0,
        primary_serving_style_: servingType
      }
    });
    return __spreadProps(__spreadValues({}, hydrated), {
      performance_tags_: {
        food_cost_pct_: this.menuIntelligence.computeFoodCostPctFromActualRevenue(hydrated),
        primary_serving_style_: servingType
      }
    });
  }
  /** Build current menu event for export (includes _id). */
  getCurrentMenuForExport() {
    const built = this.buildEventFromForm();
    return __spreadProps(__spreadValues({}, built), { _id: this.editingId_() ?? "" });
  }
  onViewAll() {
    const menu = this.getCurrentMenuForExport();
    this.exportPreviewPayload_.set(this.exportService.getMenuAllViewPreviewPayload(menu, this.recipes_()));
    this.exportPreviewType_ = "menu-all";
    this.closeViewExportModal();
  }
  onViewMenuInfo() {
    const menu = this.getCurrentMenuForExport();
    this.exportPreviewPayload_.set(this.exportService.getMenuInfoPreviewPayload(menu, this.recipes_()));
    this.exportPreviewType_ = "menu-info";
  }
  onExportMenuInfo() {
    return __async(this, null, function* () {
      const menu = this.getCurrentMenuForExport();
      yield this.exportService.exportMenuInfo(menu, this.recipes_());
    });
  }
  onViewMenuShoppingList() {
    const menu = this.getCurrentMenuForExport();
    this.exportPreviewPayload_.set(this.exportService.getMenuShoppingListPreviewPayload(menu, this.recipes_(), this.products_()));
    this.exportPreviewType_ = "menu-shopping-list";
  }
  onExportMenuShoppingList() {
    return __async(this, null, function* () {
      const menu = this.getCurrentMenuForExport();
      yield this.exportService.exportMenuShoppingList(menu, this.recipes_(), this.products_());
    });
  }
  onExportFromPreview() {
    const type = this.exportPreviewType_;
    const mode = this.exportChecklistMode_;
    if (!type)
      return;
    const menu = this.getCurrentMenuForExport();
    if (type === "menu-info")
      this.exportService.exportMenuInfo(menu, this.recipes_());
    else if (type === "menu-shopping-list")
      this.exportService.exportMenuShoppingList(menu, this.recipes_(), this.products_());
    else if (type === "menu-checklist" && mode)
      this.exportService.exportChecklist(menu, this.recipes_(), mode);
    else if (type === "menu-all")
      this.exportService.exportAllTogetherMenu(menu, this.recipes_(), this.products_(), "by_category");
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
    this.exportChecklistMode_ = null;
  }
  onPrintFromPreview() {
    window.print();
  }
  onCloseExportPreview() {
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
    this.exportChecklistMode_ = null;
  }
  onViewChecklist(mode) {
    const menu = this.getCurrentMenuForExport();
    this.exportPreviewPayload_.set(this.exportService.getMenuChecklistPreviewPayload(menu, this.recipes_(), mode));
    this.exportPreviewType_ = "menu-checklist";
    this.exportChecklistMode_ = mode;
    this.closeExportChecklistDropdown();
  }
  exportChecklistDropdownOpen_ = signal(false);
  /** Which view/export modal is open: menu-info (תפריט), shopping-list (קניות), or all. */
  viewExportModal_ = signal(null);
  toggleExportChecklistDropdown() {
    this.exportChecklistDropdownOpen_.update((v) => !v);
    this.viewExportModal_.set(null);
  }
  closeExportChecklistDropdown() {
    this.exportChecklistDropdownOpen_.set(false);
  }
  openViewExportModal(type) {
    this.viewExportModal_.update((current) => current === type ? null : type);
    this.exportChecklistDropdownOpen_.set(false);
  }
  closeViewExportModal() {
    this.viewExportModal_.set(null);
  }
  onExportChecklist(mode) {
    return __async(this, null, function* () {
      const menu = this.getCurrentMenuForExport();
      yield this.exportService.exportChecklist(menu, this.recipes_(), mode);
      this.closeExportChecklistDropdown();
    });
  }
  onExportAllTogether() {
    return __async(this, null, function* () {
      const menu = this.getCurrentMenuForExport();
      yield this.exportService.exportAllTogetherMenu(menu, this.recipes_(), this.products_(), "by_category");
    });
  }
  static \u0275fac = function MenuIntelligencePage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MenuIntelligencePage)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _MenuIntelligencePage, selectors: [["app-menu-intelligence-page"]], hostBindings: function MenuIntelligencePage_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("keydown", function MenuIntelligencePage_keydown_HostBindingHandler($event) {
        return ctx.onDocumentKeydown($event);
      }, false, \u0275\u0275resolveDocument);
    }
  }, decls: 83, vars: 68, consts: [["dir", "rtl", 1, "menu-editor-shell"], [1, "paper-outer"], [1, "paper", 3, "formGroup"], [1, "paper-inner"], [1, "paper-ornament", "top"], [1, "meta-row"], ["id", "menu-focus-name_", "type", "text", "formControlName", "name_", 1, "meta-input", "menu-name-input", 3, "keydown", "placeholder"], [1, "meta-column"], [1, "meta-label"], [1, "meta-value-wrap", 3, "clickOutside"], [1, "event-type-dropdown"], ["type", "button", "id", "menu-focus-event_type_", 1, "meta-trigger"], [1, "meta-row", 3, "keydown"], ["triggerId", "menu-focus-serving_type_", "formControlName", "serving_type_", 3, "options", "placeholder", "typeToFilter"], [1, "meta-row", "guest-row"], [1, "counter-pill"], ["type", "button", "tabindex", "-1", 1, "counter-pill-btn", 3, "click", "disabled"], ["name", "minus", 3, "size"], ["id", "menu-focus-guest_count_", "type", "number", "formControlName", "guest_count_", "min", "0", 1, "counter-pill-input", 3, "keydown"], ["type", "button", "tabindex", "-1", 1, "counter-pill-btn", 3, "click"], ["name", "plus", 3, "size"], [1, "meta-row", "date-row"], ["role", "button", "tabindex", "0", 1, "meta-date-wrap", 3, "click", "keydown.enter", "keydown.space"], [1, "meta-date-display"], ["id", "menu-focus-event_date_", "type", "date", "formControlName", "event_date_", 1, "meta-date-input", 3, "keydown"], [1, "info-menu-divider"], ["formArrayName", "sections_", 1, "sections-area"], [1, "menu-section", 3, "formGroupName"], ["type", "button", 1, "add-section-btn", "no-print", 3, "click"], [1, "paper-ornament", "bottom"], [1, "financial-bar", "no-print"], [1, "fin-metric"], [1, "fin-label"], [1, "fin-value"], [3, "payload"], [3, "closeRequest"], [1, "view-export-wrap"], ["type", "button", 1, "toolbar-glass-btn", 3, "click"], ["name", "table-2", 3, "size"], [1, "view-export-modal"], ["name", "shopping-cart", 3, "size"], [1, "checklist-export-wrap"], ["name", "clipboard-list", 3, "size"], ["name", "chevron-down", 3, "size"], [1, "checklist-export-dropdown"], ["name", "package", 3, "size"], ["name", "printer", 3, "size"], ["type", "button", 1, "toolbar-glass-btn", "save", 3, "click", "disabled"], ["size", "small", 3, "inline"], ["name", "save", 3, "size"], [1, "view-export-modal", 3, "click", "clickOutside"], ["type", "button", 1, "view-export-option", 3, "click"], ["name", "eye", 3, "size"], ["name", "download", 3, "size"], [1, "checklist-export-dropdown", 3, "click", "clickOutside"], [1, "checklist-export-option-row"], [1, "checklist-export-option-label"], ["type", "button", 1, "toolbar-glass-btn", "icon", 3, "click"], ["id", "menu-focus-event_type_search", "type", "text", "autocomplete", "off", 1, "meta-input", "event-type-search", 3, "ngModelChange", "keydown", "ngModel", "ngModelOptions", "placeholder"], [3, "maxHeight"], ["type", "button", 1, "dropdown-item", 3, "highlighted"], ["type", "button", 1, "dropdown-item", "add-new", 3, "click"], ["type", "button", 1, "dropdown-item", 3, "click"], ["type", "button", "id", "menu-focus-event_type_", 1, "meta-trigger", 3, "click", "keydown"], [1, "section-divider"], [1, "section-header"], [1, "section-search-wrap"], ["type", "button", 1, "section-title-plain", 3, "id"], ["type", "button", 1, "section-remove", "no-print", 3, "click"], ["name", "trash-2", 3, "size"], ["formArrayName", "items_", 1, "dish-list"], [3, "itemGroup", "sectionIndex", "itemIndex", "recipes", "activeFields", "dishSearchQuery", "highlightedIndex", "isMetaExpanded", "editingDishField", "servingType", "guestCount", "piecesPerPerson"], ["type", "button", 1, "add-dish-btn", "no-print", 3, "click", "id"], [1, "section-search-wrap", 3, "clickOutside"], ["type", "text", "autocomplete", "off", 1, "section-search-input", 3, "ngModelChange", "keydown", "ngModel", "ngModelOptions", "placeholder"], ["type", "button", 1, "dropdown-item", "add-new", 3, "highlighted"], ["type", "button", 1, "section-title-plain", 3, "click", "keydown.space", "id"], [3, "remove", "selectRecipe", "startEditName", "searchQueryChange", "metaToggle", "editDishFieldStart", "editDishFieldCommit", "sellPriceKeydown", "dishFieldKeydown", "dishSearchKeydown", "clearSearch", "itemGroup", "sectionIndex", "itemIndex", "recipes", "activeFields", "dishSearchQuery", "highlightedIndex", "isMetaExpanded", "editingDishField", "servingType", "guestCount", "piecesPerPerson"], [3, "exportClick", "printClick", "close", "payload"]], template: function MenuIntelligencePage_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0);
      \u0275\u0275template(1, MenuIntelligencePage_Conditional_1_Template, 39, 49, "app-export-toolbar-overlay");
      \u0275\u0275elementStart(2, "div", 1)(3, "div", 2)(4, "div", 3);
      \u0275\u0275element(5, "div", 4);
      \u0275\u0275elementStart(6, "div", 5)(7, "input", 6);
      \u0275\u0275pipe(8, "translatePipe");
      \u0275\u0275pipe(9, "translatePipe");
      \u0275\u0275listener("keydown", function MenuIntelligencePage_Template_input_keydown_7_listener($event) {
        return ctx.onMetaKeydown("name_", $event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(10, "div", 7)(11, "div", 5)(12, "span", 8);
      \u0275\u0275text(13);
      \u0275\u0275pipe(14, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(15, "div", 9);
      \u0275\u0275listener("clickOutside", function MenuIntelligencePage_Template_div_clickOutside_15_listener() {
        return ctx.closeEventTypeDropdown();
      });
      \u0275\u0275template(16, MenuIntelligencePage_Conditional_16_Template, 9, 12, "div", 10)(17, MenuIntelligencePage_Conditional_17_Template, 3, 3, "button", 11);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(18, "div", 12);
      \u0275\u0275listener("keydown", function MenuIntelligencePage_Template_div_keydown_18_listener($event) {
        return ctx.onMetaKeydown("serving_type_", $event);
      });
      \u0275\u0275elementStart(19, "span", 8);
      \u0275\u0275text(20);
      \u0275\u0275pipe(21, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(22, "app-custom-select", 13);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(23, "div", 14)(24, "span", 8);
      \u0275\u0275text(25);
      \u0275\u0275pipe(26, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(27, "div", 15)(28, "button", 16);
      \u0275\u0275pipe(29, "translatePipe");
      \u0275\u0275listener("click", function MenuIntelligencePage_Template_button_click_28_listener() {
        return ctx.decrementGuests();
      });
      \u0275\u0275element(30, "lucide-icon", 17);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(31, "input", 18);
      \u0275\u0275listener("keydown", function MenuIntelligencePage_Template_input_keydown_31_listener($event) {
        return ctx.onMetaKeydown("guest_count_", $event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(32, "button", 19);
      \u0275\u0275pipe(33, "translatePipe");
      \u0275\u0275listener("click", function MenuIntelligencePage_Template_button_click_32_listener() {
        return ctx.incrementGuests();
      });
      \u0275\u0275element(34, "lucide-icon", 20);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(35, "div", 21)(36, "span", 8);
      \u0275\u0275text(37);
      \u0275\u0275pipe(38, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(39, "div", 22);
      \u0275\u0275pipe(40, "translatePipe");
      \u0275\u0275listener("click", function MenuIntelligencePage_Template_div_click_39_listener() {
        return ctx.openDatePicker();
      })("keydown.enter", function MenuIntelligencePage_Template_div_keydown_enter_39_listener() {
        return ctx.openDatePicker();
      })("keydown.space", function MenuIntelligencePage_Template_div_keydown_space_39_listener($event) {
        $event.preventDefault();
        return ctx.openDatePicker();
      });
      \u0275\u0275elementStart(41, "span", 23);
      \u0275\u0275text(42);
      \u0275\u0275pipe(43, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(44, "input", 24);
      \u0275\u0275listener("keydown", function MenuIntelligencePage_Template_input_keydown_44_listener($event) {
        return ctx.onDateKeydown($event);
      });
      \u0275\u0275elementEnd()()()();
      \u0275\u0275element(45, "div", 25);
      \u0275\u0275elementStart(46, "div", 26);
      \u0275\u0275repeaterCreate(47, MenuIntelligencePage_For_48_Template, 13, 8, "div", 27, _forTrack02);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(49, "button", 28);
      \u0275\u0275listener("click", function MenuIntelligencePage_Template_button_click_49_listener() {
        return ctx.addSection();
      });
      \u0275\u0275text(50);
      \u0275\u0275pipe(51, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(52, "div", 29);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(53, "footer", 30)(54, "div", 31)(55, "span", 32);
      \u0275\u0275text(56);
      \u0275\u0275pipe(57, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(58, "span", 33);
      \u0275\u0275text(59);
      \u0275\u0275pipe(60, "number");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(61, "div", 31)(62, "span", 32);
      \u0275\u0275text(63);
      \u0275\u0275pipe(64, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(65, "span", 33);
      \u0275\u0275template(66, MenuIntelligencePage_Conditional_66_Template, 2, 4)(67, MenuIntelligencePage_Conditional_67_Template, 1, 0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(68, "div", 31)(69, "span", 32);
      \u0275\u0275text(70);
      \u0275\u0275pipe(71, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(72, "span", 33);
      \u0275\u0275text(73);
      \u0275\u0275pipe(74, "number");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(75, "div", 31)(76, "span", 32);
      \u0275\u0275text(77);
      \u0275\u0275pipe(78, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(79, "span", 33);
      \u0275\u0275text(80);
      \u0275\u0275pipe(81, "number");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(82, MenuIntelligencePage_Conditional_82_Template, 1, 1, "app-export-preview", 34);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_29_0;
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.toolbarOpen_() ? 1 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275property("formGroup", ctx.form_);
      \u0275\u0275advance(4);
      \u0275\u0275property("placeholder", \u0275\u0275pipeBind1(8, 29, "menu_name_placeholder"));
      \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(9, 31, "menu_name_placeholder"));
      \u0275\u0275advance(6);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(14, 33, "menu_event_type"));
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.eventTypeDropdownOpen_() ? 16 : 17);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(21, 35, "menu_serving_style"));
      \u0275\u0275advance(2);
      \u0275\u0275property("options", ctx.servingTypeOptions_())("placeholder", "menu_serving_style")("typeToFilter", true);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(26, 37, "menu_guests"));
      \u0275\u0275advance(3);
      \u0275\u0275property("disabled", ctx.getGuestCount() <= 0);
      \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(29, 39, "decrease"));
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 14);
      \u0275\u0275advance(2);
      \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(33, 41, "increase"));
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 14);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(38, 43, "menu_set_date"));
      \u0275\u0275advance(2);
      \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(40, 45, "menu_set_date"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(ctx.getEventDateDisplay() || \u0275\u0275pipeBind1(43, 47, "menu_no_date"));
      \u0275\u0275advance(5);
      \u0275\u0275repeater(ctx.sectionsArray.controls);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" + ", \u0275\u0275pipeBind1(51, 49, "menu_add_section"), " ");
      \u0275\u0275advance(6);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(57, 51, "menu_total_cost"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1("\u20AA", \u0275\u0275pipeBind2(60, 53, ctx.eventCost_(), "1.2-2"), "");
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate1("", \u0275\u0275pipeBind1(64, 56, "menu_food_cost"), " %");
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.totalRevenue_() > 0 ? 66 : 67);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(71, 58, "menu_total_revenue"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1("\u20AA", \u0275\u0275pipeBind2(74, 60, ctx.totalRevenue_(), "1.2-2"), "");
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(78, 63, "menu_cost_per_guest"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1("\u20AA", \u0275\u0275pipeBind2(81, 65, ctx.costPerGuest_(), "1.2-2"), "");
      \u0275\u0275advance(2);
      \u0275\u0275conditional((tmp_29_0 = ctx.exportPreviewPayload_()) ? 82 : -1, tmp_29_0);
    }
  }, dependencies: [CommonModule, DecimalPipe, ReactiveFormsModule, DefaultValueAccessor, NumberValueAccessor, NgControlStatus, NgControlStatusGroup, MinValidator, FormGroupDirective, FormControlName, FormGroupName, FormArrayName, FormsModule, NgModel, LucideAngularModule, LucideAngularComponent, TranslatePipe, LoaderComponent, ClickOutSideDirective, ScrollableDropdownComponent, CustomSelectComponent, ExportPreviewComponent, ExportToolbarOverlayComponent, MenuDishRowComponent], styles: ['@charset "UTF-8";\n\n\n\n[_nghost-%COMP%] {\n  --color-ink: var(--color-text-main);\n  --font-serif: "Heebo", sans-serif;\n  --color-ornament: var(--color-primary);\n  --color-frame-ink: var(--color-text-main);\n  --border-warm: var(--border-default);\n  display: block;\n  min-height: 100vh;\n  min-height: 100dvh;\n  background: var(--bg-body);\n}\n.menu-editor-shell[_ngcontent-%COMP%] {\n  padding: 1rem 1.25rem 6rem;\n  max-width: 860px;\n  margin: 0 auto;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n.paper-outer[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 720px;\n  margin: 0 auto;\n  flex-shrink: 0;\n}\n.paper[_ngcontent-%COMP%] {\n  position: relative;\n  width: 100%;\n  margin: 0 auto;\n  padding: 0.75rem;\n  background: var(--bg-pure);\n  border: 3px solid var(--color-text-main);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-card);\n}\n.paper-inner[_ngcontent-%COMP%] {\n  position: relative;\n  min-height: 320px;\n  padding: 14px 20px 14px 20px;\n  border: 1px solid #1a1a1a;\n  border-radius: var(--radius-lg);\n  background: transparent;\n}\n@media (max-width: 600px) {\n  .paper-inner[_ngcontent-%COMP%] {\n    padding: 24px 20px 32px;\n  }\n}\n.paper-ornament[_ngcontent-%COMP%] {\n  position: relative;\n  height: 28px;\n  margin: 0 auto 24px;\n  text-align: center;\n}\n.paper-ornament[_ngcontent-%COMP%]::before {\n  content: "\\2014  \\2726  \\2014";\n  font-size: 0.9rem;\n  color: var(--color-ornament);\n  letter-spacing: 6px;\n  font-weight: 600;\n}\n.paper-ornament.bottom[_ngcontent-%COMP%] {\n  margin: 32px auto 0;\n}\n.paper-divider[_ngcontent-%COMP%] {\n  width: 70%;\n  height: 2px;\n  margin: 16px auto 24px;\n  background:\n    linear-gradient(\n      to right,\n      transparent,\n      var(--color-frame-ink),\n      transparent);\n  opacity: 0.4;\n}\n.info-menu-divider[_ngcontent-%COMP%] {\n  width: 50%;\n  height: 2px;\n  margin: 18px auto 22px;\n  background:\n    linear-gradient(\n      to right,\n      transparent,\n      var(--color-frame-ink),\n      transparent);\n  opacity: 0.35;\n}\n.meta-column[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  margin-bottom: 16px;\n  width: fit-content;\n  min-width: 200px;\n  margin-inline-start: 0;\n  margin-inline-end: auto;\n}\n.meta-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: flex-start;\n  gap: 6px;\n  font-family: var(--font-serif);\n}\n.meta-label[_ngcontent-%COMP%] {\n  flex: 0 0 auto;\n  font-size: 1rem;\n  font-weight: 600;\n  color: var(--color-ink);\n  min-width: 100px;\n  text-align: right;\n}\n.counter-pill[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  height: 2.25rem;\n  border: 1px solid rgba(226, 232, 240, 0.35);\n  border-radius: var(--radius-full);\n}\n.counter-pill-btn[_ngcontent-%COMP%] {\n  display: grid;\n  place-content: center;\n  width: 2rem;\n  height: 100%;\n  padding: 0;\n  background: transparent;\n  color: var(--color-text-muted);\n  border: none;\n  cursor: pointer;\n  transition: color 0.2s ease;\n}\n.counter-pill-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  color: var(--color-ink);\n}\n.counter-pill-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.35;\n  cursor: not-allowed;\n}\n.counter-pill-input[_ngcontent-%COMP%] {\n  width: 3.5rem;\n  height: 100%;\n  padding: 0;\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  color: var(--color-ink);\n  background: transparent;\n  text-align: center;\n  border: none;\n  border-inline-start: 1px solid rgba(226, 232, 240, 0.25);\n  border-inline-end: 1px solid rgba(226, 232, 240, 0.25);\n  outline: none;\n  -moz-appearance: textfield;\n  appearance: none;\n}\n.counter-pill-input[_ngcontent-%COMP%]::-webkit-inner-spin-button, \n.counter-pill-input[_ngcontent-%COMP%]::-webkit-outer-spin-button {\n  opacity: 0;\n  pointer-events: none;\n}\n.meta-date-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n  min-width: 8rem;\n  padding: 0.375rem 0.5rem;\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  color: var(--color-ink);\n  background: transparent;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.meta-date-wrap[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass);\n}\n.meta-date-display[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.meta-date-input[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  width: 100%;\n  height: 100%;\n  opacity: 0;\n  cursor: pointer;\n  font-size: 1rem;\n}\n.meta-value-wrap[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  position: relative;\n}\n.meta-input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 6px 10px;\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  color: var(--color-ink);\n  background: transparent;\n  border: none;\n  outline: none;\n  transition: border-color 0.15s;\n}\n.meta-input[_ngcontent-%COMP%]::placeholder {\n  color: var(--color-text-muted);\n}\n.meta-input[_ngcontent-%COMP%]:focus {\n  box-shadow: none;\n}\n.meta-input.meta-number[_ngcontent-%COMP%] {\n  width: 80px;\n  text-align: right;\n  -moz-appearance: textfield;\n  appearance: none;\n}\n.meta-input.meta-number[_ngcontent-%COMP%]::-webkit-inner-spin-button, \n.meta-input.meta-number[_ngcontent-%COMP%]::-webkit-outer-spin-button {\n  opacity: 0;\n  pointer-events: none;\n}\n.meta-input.meta-date[_ngcontent-%COMP%] {\n  font-family: inherit;\n  font-size: 0.9rem;\n  min-width: 140px;\n}\n.meta-input.meta-select[_ngcontent-%COMP%] {\n  cursor: pointer;\n  background: transparent;\n  min-width: 180px;\n}\n.meta-input.menu-name-input[_ngcontent-%COMP%] {\n  font-size: 1.75rem;\n  font-weight: 700;\n  text-align: center;\n  border-bottom: none;\n}\n.meta-input.menu-name-input[_ngcontent-%COMP%]::placeholder {\n  color: rgba(var(--color-ink), 0.5);\n}\n.meta-input.menu-name-input[_ngcontent-%COMP%]:focus {\n  border-bottom: none;\n  box-shadow: none;\n}\n.meta-trigger[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 6px 0;\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  color: var(--color-ink);\n  background: transparent;\n  border: none;\n  outline: none;\n  cursor: pointer;\n  text-align: right;\n  transition: color 0.15s;\n}\n.meta-trigger[_ngcontent-%COMP%]:hover {\n  color: var(--color-primary);\n}\n.meta-trigger[_ngcontent-%COMP%]:focus {\n  box-shadow: none;\n}\n.event-type-dropdown[_ngcontent-%COMP%] {\n  position: relative;\n  width: 100%;\n}\n.event-type-search[_ngcontent-%COMP%] {\n  border: none;\n}\n.meta-column[_ngcontent-%COMP%]     .custom-select-trigger {\n  background: transparent;\n  border: none;\n}\n.meta-column[_ngcontent-%COMP%]     .custom-select-trigger:hover:not(:disabled) {\n  border: none;\n}\n.meta-column[_ngcontent-%COMP%]     .custom-select-trigger:focus {\n  box-shadow: none;\n}\n.sections-area[_ngcontent-%COMP%] {\n  margin-top: 8px;\n}\n.menu-section[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 0.5rem;\n  align-items: start;\n  margin-bottom: 1.25rem;\n}\n.section-header[_ngcontent-%COMP%] {\n  grid-column: 1/-1;\n  position: relative;\n  text-align: center;\n  margin-bottom: 12px;\n}\n.section-divider[_ngcontent-%COMP%] {\n  grid-column: 1/-1;\n  width: 70%;\n  height: 1px;\n  margin: 14px auto 18px;\n  background:\n    linear-gradient(\n      to right,\n      transparent,\n      var(--color-frame-ink),\n      transparent);\n  opacity: 0.25;\n}\n.section-title-plain[_ngcontent-%COMP%] {\n  font-family: var(--font-serif);\n  font-size: 1.25rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.1em;\n  color: var(--color-ink);\n  margin: 0;\n  padding: 4px 0;\n  background: transparent;\n  border: none;\n  outline: none;\n  cursor: pointer;\n  transition: color 0.15s;\n  text-align: center;\n  width: 100%;\n}\n.section-title-plain[_ngcontent-%COMP%]:hover {\n  color: var(--color-ornament);\n}\n.section-title-plain[_ngcontent-%COMP%]:focus {\n  border-radius: 2px;\n  box-shadow: 0 0 0 2px rgba(var(--color-ornament), 0.25);\n}\n.section-title[_ngcontent-%COMP%] {\n  font-family: var(--font-serif);\n  font-size: 1.3rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.12em;\n  color: var(--color-ink);\n  margin: 0;\n  cursor: pointer;\n  transition: color 0.15s;\n}\n.section-title[_ngcontent-%COMP%]:hover {\n  color: var(--color-ornament);\n}\n.section-remove[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 0;\n  top: 50%;\n  transform: translateY(-50%);\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  color: var(--color-text-muted-light);\n  opacity: 0;\n  transition: opacity 0.2s, color 0.2s;\n  padding: 4px;\n}\n.section-remove[_ngcontent-%COMP%]:hover {\n  color: var(--color-danger);\n}\n.section-header[_ngcontent-%COMP%]:hover   .section-remove[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.section-search-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  display: inline-block;\n  width: 280px;\n}\n.section-search-input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 6px 12px;\n  text-align: center;\n  font-family: var(--font-serif);\n  font-size: 1.1rem;\n  color: var(--color-ink);\n  background: var(--bg-glass);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  outline: none;\n  backdrop-filter: var(--blur-glass);\n}\n.section-search-input[_ngcontent-%COMP%]:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.dropdown-item[_ngcontent-%COMP%] {\n  display: block;\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  text-align: right;\n  font-family: var(--font-serif);\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n  background: none;\n  border: none;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.dropdown-item[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n}\n.dropdown-item.highlighted[_ngcontent-%COMP%] {\n  background: var(--color-primary-soft);\n  box-shadow: inset 0 0 0 1px var(--border-focus);\n}\n.dropdown-item.add-new[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n  font-weight: 600;\n  border-top: 1px solid var(--border-default);\n}\n.dropdown-empty[_ngcontent-%COMP%] {\n  display: block;\n  padding: 8px 12px;\n  font-size: 0.8125rem;\n  color: var(--color-text-muted-light);\n  text-align: center;\n}\n.dish-list[_ngcontent-%COMP%] {\n  grid-column: 1/-1;\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n  align-items: stretch;\n  min-width: 0;\n  max-width: 100%;\n}\n.add-dish-btn[_ngcontent-%COMP%] {\n  grid-column: 1/-1;\n  display: block;\n  margin: 8px auto;\n  padding: 4px 16px;\n  font-family: var(--font-serif);\n  font-size: 0.9rem;\n  color: var(--color-ornament);\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  transition: color 0.2s;\n}\n.add-dish-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-accent-gold);\n}\n.add-section-btn[_ngcontent-%COMP%] {\n  display: block;\n  margin: 8px auto;\n  padding: 4px 16px;\n  font-family: var(--font-serif);\n  font-size: 0.9rem;\n  color: var(--color-ornament);\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  transition: color 0.2s;\n}\n.add-section-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-accent-gold);\n}\n.add-section-btn[_ngcontent-%COMP%] {\n  margin-top: 20px;\n  font-size: 1rem;\n}\n.financial-bar[_ngcontent-%COMP%] {\n  position: fixed;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  display: flex;\n  justify-content: center;\n  gap: 40px;\n  padding: 12px 20px;\n  background: var(--bg-pure);\n  border-top: 2px solid var(--border-warm);\n  box-shadow: 0 -2px 12px rgba(74, 60, 46, 0.08);\n  z-index: 100;\n}\n.fin-metric[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 2px;\n}\n.fin-label[_ngcontent-%COMP%] {\n  font-family: var(--font-serif);\n  font-size: 0.8rem;\n  font-weight: 600;\n  color: var(--color-text-muted);\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n}\n.fin-value[_ngcontent-%COMP%] {\n  font-family: var(--font-serif);\n  font-size: 1.15rem;\n  font-weight: 700;\n  color: var(--color-ink);\n}\n.fin-value.over-target[_ngcontent-%COMP%] {\n  color: var(--color-danger);\n}\n@media (max-width: 768px) {\n  .financial-bar[_ngcontent-%COMP%] {\n    gap: 16px;\n    padding: 10px 12px;\n  }\n  .fin-label[_ngcontent-%COMP%] {\n    font-size: 0.7rem;\n  }\n  .fin-value[_ngcontent-%COMP%] {\n    font-size: 1rem;\n  }\n}\n@media print {\n  .no-print[_ngcontent-%COMP%] {\n    display: none !important;\n  }\n  [_nghost-%COMP%] {\n    background: var(--bg-pure) !important;\n  }\n  .menu-editor-shell[_ngcontent-%COMP%] {\n    padding: 0;\n    max-width: none;\n  }\n  .paper-outer[_ngcontent-%COMP%] {\n    max-width: none;\n  }\n  .paper[_ngcontent-%COMP%] {\n    box-shadow: none;\n    padding: 10px;\n  }\n  .paper-inner[_ngcontent-%COMP%] {\n    border: 1px solid var(--color-text-main);\n    padding: 32px;\n  }\n  .dish-qty[_ngcontent-%COMP%] {\n    display: none;\n  }\n}\n/*# sourceMappingURL=menu-intelligence.page.css.map */'], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MenuIntelligencePage, [{
    type: Component,
    args: [{ selector: "app-menu-intelligence-page", standalone: true, imports: [CommonModule, ReactiveFormsModule, FormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, ClickOutSideDirective, ScrollableDropdownComponent, CustomSelectComponent, ExportPreviewComponent, ExportToolbarOverlayComponent, MenuDishRowComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="menu-editor-shell" dir="rtl">
  <!-- Toolbar overlay (fixed at top, toggled) - shared component with transparent blur -->
  @if (toolbarOpen_()) {
    <app-export-toolbar-overlay (closeRequest)="closeToolbar()">
        <div class="view-export-wrap">
          <button type="button" class="toolbar-glass-btn" (click)="openViewExportModal('menu-info'); $event.stopPropagation()" [attr.aria-label]="'export_menu_info' | translatePipe" [attr.aria-expanded]="viewExportModal_() === 'menu-info'">
            <lucide-icon name="table-2" [size]="14"></lucide-icon>
            {{ 'toolbar_menu' | translatePipe }}
          </button>
          @if (viewExportModal_() === 'menu-info') {
            <div class="view-export-modal" (click)="$event.stopPropagation()" (clickOutside)="closeViewExportModal()">
              <button type="button" class="view-export-option" (click)="onViewMenuInfo(); closeViewExportModal()">
                <lucide-icon name="eye" [size]="14"></lucide-icon>
                {{ 'view' | translatePipe }}
              </button>
              <button type="button" class="view-export-option" (click)="onExportMenuInfo(); closeViewExportModal()">
                <lucide-icon name="download" [size]="14"></lucide-icon>
                {{ 'export' | translatePipe }}
              </button>
            </div>
          }
        </div>
        <div class="view-export-wrap">
          <button type="button" class="toolbar-glass-btn" (click)="openViewExportModal('shopping-list'); $event.stopPropagation()" [attr.aria-label]="'export_menu_shopping_list' | translatePipe" [attr.aria-expanded]="viewExportModal_() === 'shopping-list'">
            <lucide-icon name="shopping-cart" [size]="14"></lucide-icon>
            {{ 'toolbar_shopping' | translatePipe }}
          </button>
          @if (viewExportModal_() === 'shopping-list') {
            <div class="view-export-modal" (click)="$event.stopPropagation()" (clickOutside)="closeViewExportModal()">
              <button type="button" class="view-export-option" (click)="onViewMenuShoppingList(); closeViewExportModal()">
                <lucide-icon name="eye" [size]="14"></lucide-icon>
                {{ 'view' | translatePipe }}
              </button>
              <button type="button" class="view-export-option" (click)="onExportMenuShoppingList(); closeViewExportModal()">
                <lucide-icon name="download" [size]="14"></lucide-icon>
                {{ 'export' | translatePipe }}
              </button>
            </div>
          }
        </div>
        <div class="checklist-export-wrap">
          <button type="button" class="toolbar-glass-btn" (click)="toggleExportChecklistDropdown(); $event.stopPropagation()" [attr.aria-label]="'export_checklist' | translatePipe" [attr.aria-expanded]="exportChecklistDropdownOpen_()">
            <lucide-icon name="clipboard-list" [size]="14"></lucide-icon>
            {{ 'toolbar_checklist' | translatePipe }}
            <lucide-icon name="chevron-down" [size]="12"></lucide-icon>
          </button>
          @if (exportChecklistDropdownOpen_()) {
            <div class="checklist-export-dropdown" (click)="$event.stopPropagation()" (clickOutside)="closeExportChecklistDropdown()">
              <div class="checklist-export-option-row">
                <span class="checklist-export-option-label">{{ 'export_checklist_by_dish' | translatePipe }}</span>
                <button type="button" class="toolbar-glass-btn icon" (click)="onViewChecklist('by_dish'); $event.stopPropagation()" [attr.aria-label]="'view' | translatePipe">
                  <lucide-icon name="eye" [size]="12"></lucide-icon>
                </button>
                <button type="button" class="toolbar-glass-btn icon" (click)="onExportChecklist('by_dish'); $event.stopPropagation()" [attr.aria-label]="'export' | translatePipe">
                  <lucide-icon name="download" [size]="12"></lucide-icon>
                </button>
              </div>
              <div class="checklist-export-option-row">
                <span class="checklist-export-option-label">{{ 'export_checklist_by_category' | translatePipe }}</span>
                <button type="button" class="toolbar-glass-btn icon" (click)="onViewChecklist('by_category'); $event.stopPropagation()" [attr.aria-label]="'view' | translatePipe">
                  <lucide-icon name="eye" [size]="12"></lucide-icon>
                </button>
                <button type="button" class="toolbar-glass-btn icon" (click)="onExportChecklist('by_category'); $event.stopPropagation()" [attr.aria-label]="'export' | translatePipe">
                  <lucide-icon name="download" [size]="12"></lucide-icon>
                </button>
              </div>
              <div class="checklist-export-option-row">
                <span class="checklist-export-option-label">{{ 'export_checklist_by_station' | translatePipe }}</span>
                <button type="button" class="toolbar-glass-btn icon" (click)="onViewChecklist('by_station'); $event.stopPropagation()" [attr.aria-label]="'view' | translatePipe">
                  <lucide-icon name="eye" [size]="12"></lucide-icon>
                </button>
                <button type="button" class="toolbar-glass-btn icon" (click)="onExportChecklist('by_station'); $event.stopPropagation()" [attr.aria-label]="'export' | translatePipe">
                  <lucide-icon name="download" [size]="12"></lucide-icon>
                </button>
              </div>
            </div>
          }
        </div>
        <div class="view-export-wrap">
          <button type="button" class="toolbar-glass-btn" (click)="openViewExportModal('all'); $event.stopPropagation()" [attr.aria-label]="'export_all_together' | translatePipe" [attr.aria-expanded]="viewExportModal_() === 'all'">
            <lucide-icon name="package" [size]="14"></lucide-icon>
            {{ 'toolbar_all' | translatePipe }}
          </button>
          @if (viewExportModal_() === 'all') {
            <div class="view-export-modal" (click)="$event.stopPropagation()" (clickOutside)="closeViewExportModal()">
              <button type="button" class="view-export-option" (click)="onViewAll(); closeViewExportModal()">
                <lucide-icon name="eye" [size]="14"></lucide-icon>
                {{ 'view' | translatePipe }}
              </button>
              <button type="button" class="view-export-option" (click)="onExportAllTogether(); closeViewExportModal()">
                <lucide-icon name="download" [size]="14"></lucide-icon>
                {{ 'export' | translatePipe }}
              </button>
            </div>
          }
        </div>
        <button type="button" class="toolbar-glass-btn" (click)="printMenu()" [attr.aria-label]="'menu_export_customer' | translatePipe">
          <lucide-icon name="printer" [size]="14"></lucide-icon>
        </button>
        <button type="button" class="toolbar-glass-btn save" (click)="save()" [disabled]="isSaving_()">
          @if (isSaving_()) {
            <app-loader size="small" [inline]="true" />
          }
          <lucide-icon name="save" [size]="14"></lucide-icon>
          {{ isSaving_() ? ('saving' | translatePipe) : ('menu_save' | translatePipe) }}
        </button>
    </app-export-toolbar-overlay>
  }

  <!-- Paper in the middle of the screen -->
  <div class="paper-outer">
    <div class="paper" [formGroup]="form_">
      <div class="paper-inner">
    <div class="paper-ornament top"></div>
    
    <div class="meta-row">
      <input
        id="menu-focus-name_"
        type="text"
        class="meta-input menu-name-input"
        formControlName="name_"
        [attr.aria-label]="'menu_name_placeholder' | translatePipe"
        [placeholder]="'menu_name_placeholder' | translatePipe"
        (keydown)="onMetaKeydown('name_', $event)"
      />
    </div>

    <!-- Metadata column: title stays, value to the left (RTL: value on right) -->
    <div class="meta-column">
      <!-- Menu Name: h1-style input, no label -->

      <!-- Event Type: label + value/trigger; click opens dropdown with search + add new -->
      <div class="meta-row">
        <span class="meta-label">{{ 'menu_event_type' | translatePipe }}</span>
        <div class="meta-value-wrap" (clickOutside)="closeEventTypeDropdown()">
          @if (eventTypeDropdownOpen_()) {
            <div class="event-type-dropdown">
              <input
                id="menu-focus-event_type_search"
                type="text"
                class="meta-input event-type-search"
                autocomplete="off"
                [ngModel]="eventTypeSearch_()"
                [ngModelOptions]="{ standalone: true }"
                (ngModelChange)="eventTypeSearch_.set($event); eventTypeHighlightedIndex_.set(0)"
                [placeholder]="'search' | translatePipe"
                (keydown)="onEventTypeSearchKeydown($event)"
              />
              <app-scrollable-dropdown [maxHeight]="200">
                @for (t of getFilteredEventTypes(); track t; let i = $index) {
                  <button type="button" class="dropdown-item" [class.highlighted]="eventTypeHighlightedIndex_() === i" (click)="selectEventType(t)">{{ t }}</button>
                }
                <button type="button" class="dropdown-item add-new" [class.highlighted]="eventTypeHighlightedIndex_() === getFilteredEventTypes().length" (click)="addNewEventType()">
                  + {{ 'add_new_category' | translatePipe }}
                </button>
              </app-scrollable-dropdown>
            </div>
          } @else {
            <button type="button" id="menu-focus-event_type_" class="meta-trigger"
              (click)="openEventTypeDropdown()"
              (keydown)="onMetaKeydown('event_type_', $event)">
              {{ form_.value.event_type_ || ('menu_event_type' | translatePipe) }}
            </button>
          }
        </div>
      </div>

      <!-- Serving Type (menu type from registry) -->
      <div class="meta-row" (keydown)="onMetaKeydown('serving_type_', $event)">
        <span class="meta-label">{{ 'menu_serving_style' | translatePipe }}</span>
        <app-custom-select
          triggerId="menu-focus-serving_type_"
          formControlName="serving_type_"
          [options]="servingTypeOptions_()"
          [placeholder]="'menu_serving_style'"
          [typeToFilter]="true" />
      </div>

      <!-- Guest Count -->
      <div class="meta-row guest-row">
        <span class="meta-label">{{ 'menu_guests' | translatePipe }}</span>
        <div class="counter-pill">
          <button type="button" class="counter-pill-btn" tabindex="-1" (click)="decrementGuests()" [disabled]="getGuestCount() <= 0" [attr.aria-label]="'decrease' | translatePipe">
            <lucide-icon name="minus" [size]="14"></lucide-icon>
          </button>
          <input id="menu-focus-guest_count_" type="number" class="counter-pill-input" formControlName="guest_count_" min="0"
            (keydown)="onMetaKeydown('guest_count_', $event)" />
          <button type="button" class="counter-pill-btn" tabindex="-1" (click)="incrementGuests()" [attr.aria-label]="'increase' | translatePipe">
            <lucide-icon name="plus" [size]="14"></lucide-icon>
          </button>
        </div>
      </div>

      <!-- Event Date -->
      <div class="meta-row date-row">
        <span class="meta-label">{{ 'menu_set_date' | translatePipe }}</span>
        <div class="meta-date-wrap" (click)="openDatePicker()" role="button" tabindex="0" (keydown.enter)="openDatePicker()" (keydown.space)="$event.preventDefault(); openDatePicker()" [attr.aria-label]="'menu_set_date' | translatePipe">
          <span class="meta-date-display">{{ getEventDateDisplay() || ('menu_no_date' | translatePipe) }}</span>
          <input id="menu-focus-event_date_" type="date" class="meta-date-input" formControlName="event_date_"
            (keydown)="onDateKeydown($event)" />
        </div>
      </div>
    </div>

    <div class="info-menu-divider"></div>

    <!-- Sections: category looks like plain text; dropdown only on click -->
    <div class="sections-area" formArrayName="sections_">
      @for (section of sectionsArray.controls; track section.get('_id')?.value; let sectionIndex = $index) {
        <div class="menu-section" [formGroupName]="sectionIndex">
          @if (sectionIndex > 0) {
            <div class="section-divider"></div>
          }

          <div class="section-header">
            @if (sectionSearchOpen_() === sectionIndex) {
              <div class="section-search-wrap" (clickOutside)="closeSectionSearch()">
                <input
                  type="text"
                  class="section-search-input"
                  autocomplete="off"
                  [ngModel]="getSectionSearchQuery(sectionIndex)"
                  [ngModelOptions]="{ standalone: true }"
                  (ngModelChange)="onSectionSearchQueryChange(sectionIndex, $event)"
                  [placeholder]="'menu_search_category' | translatePipe"
                  (keydown)="onSectionSearchKeydown(sectionIndex, $event)"
                />
                <app-scrollable-dropdown [maxHeight]="200">
                  @for (cat of getFilteredSectionCategories(sectionIndex); track cat; let ci = $index) {
                    <button type="button" class="dropdown-item" [class.highlighted]="getSectionCategoryHighlightedIndex(sectionIndex) === ci" (click)="selectSectionCategory(sectionIndex, cat)">
                      {{ cat | translatePipe }}
                    </button>
                  }
                  @if (getSectionSearchQuery(sectionIndex).trim()) {
                    <button type="button" class="dropdown-item add-new" [class.highlighted]="getSectionCategoryHighlightedIndex(sectionIndex) === getFilteredSectionCategories(sectionIndex).length" (click)="addNewSectionCategory(sectionIndex)">
                      + {{ getSectionSearchQuery(sectionIndex) }}
                    </button>
                  }
                  <button type="button" class="dropdown-item add-new" [class.highlighted]="getSectionCategoryHighlightedIndex(sectionIndex) === getSectionCategoryOptionCount(sectionIndex) - 1" (click)="openAddCategoryModal(sectionIndex)">
                    + {{ 'add_new_category' | translatePipe }}
                  </button>
                </app-scrollable-dropdown>
              </div>
            } @else {
              <button type="button" class="section-title-plain" [id]="'section-title-' + sectionIndex"
                (click)="openSectionSearch(sectionIndex)"
                (keydown.space)="$event.preventDefault(); openSectionSearch(sectionIndex)">
                {{ ((section.get('name_')?.value ?? '') | translatePipe) || ('menu_section_placeholder' | translatePipe) }}
              </button>
            }
            <button type="button" class="section-remove no-print" (click)="removeSection(sectionIndex)">
              <lucide-icon name="trash-2" [size]="14"></lucide-icon>
            </button>
          </div>

          <div class="dish-list" formArrayName="items_">
            @for (item of getItemsArray(sectionIndex).controls; track $index; let itemIndex = $index) {
              <app-menu-dish-row
                [itemGroup]="item"
                [sectionIndex]="sectionIndex"
                [itemIndex]="itemIndex"
                [recipes]="recipes_()"
                [activeFields]="activeMenuTypeFields_()"
                [dishSearchQuery]="getDishSearchQuery(sectionIndex, itemIndex)"
                [highlightedIndex]="getDishSearchHighlightedIndex(sectionIndex, itemIndex)"
                [isMetaExpanded]="isDishMetaExpanded(sectionIndex, itemIndex)"
                [editingDishField]="editingDishField_()"
                [servingType]="form_.value.serving_type_ || 'plated_course'"
                [guestCount]="getGuestCount()"
                [piecesPerPerson]="getPiecesPerPerson()"
                (remove)="removeItem(sectionIndex, itemIndex)"
                (selectRecipe)="selectRecipe(sectionIndex, itemIndex, $event.recipe)"
                (startEditName)="startEditDishName(sectionIndex, itemIndex)"
                (searchQueryChange)="onDishSearchQueryChange(sectionIndex, itemIndex, $event)"
                (metaToggle)="toggleDishMeta(sectionIndex, itemIndex)"
                (editDishFieldStart)="startEditDishField(sectionIndex, itemIndex, $event)"
                (editDishFieldCommit)="commitEditDishField()"
                (sellPriceKeydown)="onSellPriceKeydown(sectionIndex, itemIndex, $event)"
                (dishFieldKeydown)="onDishFieldKeydown(sectionIndex, itemIndex, $event.fieldKey, $event.event)"
                (dishSearchKeydown)="onDishSearchKeydown(sectionIndex, itemIndex, $event)"
                (clearSearch)="clearDishSearch(sectionIndex, itemIndex)"
              />
            }
          </div>

          <button type="button" class="add-dish-btn no-print" [id]="'add-dish-' + sectionIndex" (click)="addItem(sectionIndex)">
            + {{ 'menu_add_dish' | translatePipe }}
          </button>
        </div>
      }
    </div>

    <button type="button" class="add-section-btn no-print" (click)="addSection()">
      + {{ 'menu_add_section' | translatePipe }}
    </button>

    <div class="paper-ornament bottom"></div>
      </div>
    </div>
  </div>

  <footer class="financial-bar no-print">
    <div class="fin-metric">
      <span class="fin-label">{{ 'menu_total_cost' | translatePipe }}</span>
      <span class="fin-value">\u20AA{{ eventCost_() | number:'1.2-2' }}</span>
    </div>
    <div class="fin-metric">
      <span class="fin-label">{{ 'menu_food_cost' | translatePipe }} %</span>
      <span class="fin-value">
        @if (totalRevenue_() > 0) {
          {{ foodCostPct_() | number:'1.1-1' }}%
        } @else {
          \u2014
        }
      </span>
    </div>
    <div class="fin-metric">
      <span class="fin-label">{{ 'menu_total_revenue' | translatePipe }}</span>
      <span class="fin-value">\u20AA{{ totalRevenue_() | number:'1.2-2' }}</span>
    </div>
    <div class="fin-metric">
      <span class="fin-label">{{ 'menu_cost_per_guest' | translatePipe }}</span>
      <span class="fin-value">\u20AA{{ costPerGuest_() | number:'1.2-2' }}</span>
    </div>
  </footer>

  @if (exportPreviewPayload_(); as payload) {
    <app-export-preview [payload]="payload"
      (exportClick)="onExportFromPreview()"
      (printClick)="onPrintFromPreview()"
      (close)="onCloseExportPreview()" />
  }
</div>
`, styles: ['@charset "UTF-8";\n\n/* src/app/pages/menu-intelligence/menu-intelligence.page.scss */\n:host {\n  --color-ink: var(--color-text-main);\n  --font-serif: "Heebo", sans-serif;\n  --color-ornament: var(--color-primary);\n  --color-frame-ink: var(--color-text-main);\n  --border-warm: var(--border-default);\n  display: block;\n  min-height: 100vh;\n  min-height: 100dvh;\n  background: var(--bg-body);\n}\n.menu-editor-shell {\n  padding: 1rem 1.25rem 6rem;\n  max-width: 860px;\n  margin: 0 auto;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n.paper-outer {\n  width: 100%;\n  max-width: 720px;\n  margin: 0 auto;\n  flex-shrink: 0;\n}\n.paper {\n  position: relative;\n  width: 100%;\n  margin: 0 auto;\n  padding: 0.75rem;\n  background: var(--bg-pure);\n  border: 3px solid var(--color-text-main);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-card);\n}\n.paper-inner {\n  position: relative;\n  min-height: 320px;\n  padding: 14px 20px 14px 20px;\n  border: 1px solid #1a1a1a;\n  border-radius: var(--radius-lg);\n  background: transparent;\n}\n@media (max-width: 600px) {\n  .paper-inner {\n    padding: 24px 20px 32px;\n  }\n}\n.paper-ornament {\n  position: relative;\n  height: 28px;\n  margin: 0 auto 24px;\n  text-align: center;\n}\n.paper-ornament::before {\n  content: "\\2014  \\2726  \\2014";\n  font-size: 0.9rem;\n  color: var(--color-ornament);\n  letter-spacing: 6px;\n  font-weight: 600;\n}\n.paper-ornament.bottom {\n  margin: 32px auto 0;\n}\n.paper-divider {\n  width: 70%;\n  height: 2px;\n  margin: 16px auto 24px;\n  background:\n    linear-gradient(\n      to right,\n      transparent,\n      var(--color-frame-ink),\n      transparent);\n  opacity: 0.4;\n}\n.info-menu-divider {\n  width: 50%;\n  height: 2px;\n  margin: 18px auto 22px;\n  background:\n    linear-gradient(\n      to right,\n      transparent,\n      var(--color-frame-ink),\n      transparent);\n  opacity: 0.35;\n}\n.meta-column {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  margin-bottom: 16px;\n  width: fit-content;\n  min-width: 200px;\n  margin-inline-start: 0;\n  margin-inline-end: auto;\n}\n.meta-row {\n  display: flex;\n  align-items: center;\n  justify-content: flex-start;\n  gap: 6px;\n  font-family: var(--font-serif);\n}\n.meta-label {\n  flex: 0 0 auto;\n  font-size: 1rem;\n  font-weight: 600;\n  color: var(--color-ink);\n  min-width: 100px;\n  text-align: right;\n}\n.counter-pill {\n  display: inline-flex;\n  align-items: center;\n  height: 2.25rem;\n  border: 1px solid rgba(226, 232, 240, 0.35);\n  border-radius: var(--radius-full);\n}\n.counter-pill-btn {\n  display: grid;\n  place-content: center;\n  width: 2rem;\n  height: 100%;\n  padding: 0;\n  background: transparent;\n  color: var(--color-text-muted);\n  border: none;\n  cursor: pointer;\n  transition: color 0.2s ease;\n}\n.counter-pill-btn:hover:not(:disabled) {\n  color: var(--color-ink);\n}\n.counter-pill-btn:disabled {\n  opacity: 0.35;\n  cursor: not-allowed;\n}\n.counter-pill-input {\n  width: 3.5rem;\n  height: 100%;\n  padding: 0;\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  color: var(--color-ink);\n  background: transparent;\n  text-align: center;\n  border: none;\n  border-inline-start: 1px solid rgba(226, 232, 240, 0.25);\n  border-inline-end: 1px solid rgba(226, 232, 240, 0.25);\n  outline: none;\n  -moz-appearance: textfield;\n  appearance: none;\n}\n.counter-pill-input::-webkit-inner-spin-button,\n.counter-pill-input::-webkit-outer-spin-button {\n  opacity: 0;\n  pointer-events: none;\n}\n.meta-date-wrap {\n  position: relative;\n  display: flex;\n  align-items: center;\n  min-width: 8rem;\n  padding: 0.375rem 0.5rem;\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  color: var(--color-ink);\n  background: transparent;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.meta-date-wrap:hover {\n  background: var(--bg-glass);\n}\n.meta-date-display {\n  flex: 1;\n  min-width: 0;\n}\n.meta-date-input {\n  position: absolute;\n  inset: 0;\n  width: 100%;\n  height: 100%;\n  opacity: 0;\n  cursor: pointer;\n  font-size: 1rem;\n}\n.meta-value-wrap {\n  flex: 1;\n  min-width: 0;\n  position: relative;\n}\n.meta-input {\n  width: 100%;\n  padding: 6px 10px;\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  color: var(--color-ink);\n  background: transparent;\n  border: none;\n  outline: none;\n  transition: border-color 0.15s;\n}\n.meta-input::placeholder {\n  color: var(--color-text-muted);\n}\n.meta-input:focus {\n  box-shadow: none;\n}\n.meta-input.meta-number {\n  width: 80px;\n  text-align: right;\n  -moz-appearance: textfield;\n  appearance: none;\n}\n.meta-input.meta-number::-webkit-inner-spin-button,\n.meta-input.meta-number::-webkit-outer-spin-button {\n  opacity: 0;\n  pointer-events: none;\n}\n.meta-input.meta-date {\n  font-family: inherit;\n  font-size: 0.9rem;\n  min-width: 140px;\n}\n.meta-input.meta-select {\n  cursor: pointer;\n  background: transparent;\n  min-width: 180px;\n}\n.meta-input.menu-name-input {\n  font-size: 1.75rem;\n  font-weight: 700;\n  text-align: center;\n  border-bottom: none;\n}\n.meta-input.menu-name-input::placeholder {\n  color: rgba(var(--color-ink), 0.5);\n}\n.meta-input.menu-name-input:focus {\n  border-bottom: none;\n  box-shadow: none;\n}\n.meta-trigger {\n  width: 100%;\n  padding: 6px 0;\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  color: var(--color-ink);\n  background: transparent;\n  border: none;\n  outline: none;\n  cursor: pointer;\n  text-align: right;\n  transition: color 0.15s;\n}\n.meta-trigger:hover {\n  color: var(--color-primary);\n}\n.meta-trigger:focus {\n  box-shadow: none;\n}\n.event-type-dropdown {\n  position: relative;\n  width: 100%;\n}\n.event-type-search {\n  border: none;\n}\n.meta-column ::ng-deep .custom-select-trigger {\n  background: transparent;\n  border: none;\n}\n.meta-column ::ng-deep .custom-select-trigger:hover:not(:disabled) {\n  border: none;\n}\n.meta-column ::ng-deep .custom-select-trigger:focus {\n  box-shadow: none;\n}\n.sections-area {\n  margin-top: 8px;\n}\n.menu-section {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 0.5rem;\n  align-items: start;\n  margin-bottom: 1.25rem;\n}\n.section-header {\n  grid-column: 1/-1;\n  position: relative;\n  text-align: center;\n  margin-bottom: 12px;\n}\n.section-divider {\n  grid-column: 1/-1;\n  width: 70%;\n  height: 1px;\n  margin: 14px auto 18px;\n  background:\n    linear-gradient(\n      to right,\n      transparent,\n      var(--color-frame-ink),\n      transparent);\n  opacity: 0.25;\n}\n.section-title-plain {\n  font-family: var(--font-serif);\n  font-size: 1.25rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.1em;\n  color: var(--color-ink);\n  margin: 0;\n  padding: 4px 0;\n  background: transparent;\n  border: none;\n  outline: none;\n  cursor: pointer;\n  transition: color 0.15s;\n  text-align: center;\n  width: 100%;\n}\n.section-title-plain:hover {\n  color: var(--color-ornament);\n}\n.section-title-plain:focus {\n  border-radius: 2px;\n  box-shadow: 0 0 0 2px rgba(var(--color-ornament), 0.25);\n}\n.section-title {\n  font-family: var(--font-serif);\n  font-size: 1.3rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.12em;\n  color: var(--color-ink);\n  margin: 0;\n  cursor: pointer;\n  transition: color 0.15s;\n}\n.section-title:hover {\n  color: var(--color-ornament);\n}\n.section-remove {\n  position: absolute;\n  left: 0;\n  top: 50%;\n  transform: translateY(-50%);\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  color: var(--color-text-muted-light);\n  opacity: 0;\n  transition: opacity 0.2s, color 0.2s;\n  padding: 4px;\n}\n.section-remove:hover {\n  color: var(--color-danger);\n}\n.section-header:hover .section-remove {\n  opacity: 1;\n}\n.section-search-wrap {\n  position: relative;\n  display: inline-block;\n  width: 280px;\n}\n.section-search-input {\n  width: 100%;\n  padding: 6px 12px;\n  text-align: center;\n  font-family: var(--font-serif);\n  font-size: 1.1rem;\n  color: var(--color-ink);\n  background: var(--bg-glass);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  outline: none;\n  backdrop-filter: var(--blur-glass);\n}\n.section-search-input:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.dropdown-item {\n  display: block;\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  text-align: right;\n  font-family: var(--font-serif);\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n  background: none;\n  border: none;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.dropdown-item:hover {\n  background: var(--bg-glass-hover);\n}\n.dropdown-item.highlighted {\n  background: var(--color-primary-soft);\n  box-shadow: inset 0 0 0 1px var(--border-focus);\n}\n.dropdown-item.add-new {\n  color: var(--color-primary);\n  font-weight: 600;\n  border-top: 1px solid var(--border-default);\n}\n.dropdown-empty {\n  display: block;\n  padding: 8px 12px;\n  font-size: 0.8125rem;\n  color: var(--color-text-muted-light);\n  text-align: center;\n}\n.dish-list {\n  grid-column: 1/-1;\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n  align-items: stretch;\n  min-width: 0;\n  max-width: 100%;\n}\n.add-dish-btn {\n  grid-column: 1/-1;\n  display: block;\n  margin: 8px auto;\n  padding: 4px 16px;\n  font-family: var(--font-serif);\n  font-size: 0.9rem;\n  color: var(--color-ornament);\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  transition: color 0.2s;\n}\n.add-dish-btn:hover {\n  color: var(--color-accent-gold);\n}\n.add-section-btn {\n  display: block;\n  margin: 8px auto;\n  padding: 4px 16px;\n  font-family: var(--font-serif);\n  font-size: 0.9rem;\n  color: var(--color-ornament);\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  transition: color 0.2s;\n}\n.add-section-btn:hover {\n  color: var(--color-accent-gold);\n}\n.add-section-btn {\n  margin-top: 20px;\n  font-size: 1rem;\n}\n.financial-bar {\n  position: fixed;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  display: flex;\n  justify-content: center;\n  gap: 40px;\n  padding: 12px 20px;\n  background: var(--bg-pure);\n  border-top: 2px solid var(--border-warm);\n  box-shadow: 0 -2px 12px rgba(74, 60, 46, 0.08);\n  z-index: 100;\n}\n.fin-metric {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 2px;\n}\n.fin-label {\n  font-family: var(--font-serif);\n  font-size: 0.8rem;\n  font-weight: 600;\n  color: var(--color-text-muted);\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n}\n.fin-value {\n  font-family: var(--font-serif);\n  font-size: 1.15rem;\n  font-weight: 700;\n  color: var(--color-ink);\n}\n.fin-value.over-target {\n  color: var(--color-danger);\n}\n@media (max-width: 768px) {\n  .financial-bar {\n    gap: 16px;\n    padding: 10px 12px;\n  }\n  .fin-label {\n    font-size: 0.7rem;\n  }\n  .fin-value {\n    font-size: 1rem;\n  }\n}\n@media print {\n  .no-print {\n    display: none !important;\n  }\n  :host {\n    background: var(--bg-pure) !important;\n  }\n  .menu-editor-shell {\n    padding: 0;\n    max-width: none;\n  }\n  .paper-outer {\n    max-width: none;\n  }\n  .paper {\n    box-shadow: none;\n    padding: 10px;\n  }\n  .paper-inner {\n    border: 1px solid var(--color-text-main);\n    padding: 32px;\n  }\n  .dish-qty {\n    display: none;\n  }\n}\n/*# sourceMappingURL=menu-intelligence.page.css.map */\n'] }]
  }], () => [], { onDocumentKeydown: [{
    type: HostListener,
    args: ["document:keydown", ["$event"]]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(MenuIntelligencePage, { className: "MenuIntelligencePage", filePath: "src/app/pages/menu-intelligence/menu-intelligence.page.ts", lineNumber: 56 });
})();
export {
  MenuIntelligencePage
};
//# sourceMappingURL=chunk-5RW3EGL4.js.map
