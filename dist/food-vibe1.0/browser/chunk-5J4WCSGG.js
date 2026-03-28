import {
  EmptyStateComponent
} from "./chunk-CBNLJQ6Y.js";
import {
  MetadataRegistryService
} from "./chunk-RXL6AQUB.js";
import {
  UnitRegistryService
} from "./chunk-UA66Z5WI.js";
import {
  ConfirmModalService
} from "./chunk-QWCHAH6M.js";
import "./chunk-7STEE3M4.js";
import {
  CarouselHeaderColumnDirective,
  CarouselHeaderComponent,
  CellCarouselComponent,
  CellCarouselSlideDirective,
  ListRowCheckboxComponent,
  ListSelectionState,
  ListShellComponent,
  SelectionBarComponent,
  getPanelOpen,
  setPanelOpen
} from "./chunk-WQAH7QWB.js";
import {
  BooleanParam,
  FilterRecordParam,
  NullableStringParam,
  StringParam,
  useListState
} from "./chunk-TM2E3L5G.js";
import {
  HeroFabService
} from "./chunk-6DTZ43TT.js";
import {
  EquipmentDataService
} from "./chunk-EYK2NP5M.js";
import {
  ClickOutSideDirective
} from "./chunk-MG3FUR2W.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel
} from "./chunk-CA2J44DF.js";
import {
  LoaderComponent
} from "./chunk-G7HPFFIH.js";
import "./chunk-KJ2NCQHM.js";
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
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  DecimalPipe,
  Router,
  RouterLink,
  RouterLinkActive,
  __async,
  __spreadProps,
  __spreadValues,
  afterNextRender,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementContainerEnd,
  ɵɵelementContainerStart,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵpipeBind2,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-FJPSXAXA.js";

// src/app/core/utils/product-price.util.ts
function getPricePerUnit(product, unit, unitRegistry) {
  const base = product.base_unit_ || "unit";
  if (unit === base)
    return product.buy_price_global_ ?? 0;
  const opt = (product.purchase_options_ || []).find((o) => o.unit_symbol_ === unit);
  if (opt?.conversion_rate_) {
    return (product.buy_price_global_ ?? 0) * opt.conversion_rate_;
  }
  const baseConv = unitRegistry.getConversion(base);
  const unitConv = unitRegistry.getConversion(unit);
  if (baseConv && unitConv) {
    return (product.buy_price_global_ ?? 0) * (unitConv / baseConv);
  }
  return product.buy_price_global_ ?? 0;
}
function calcBuyPriceGlobal(product, displayUnit, pricePerUnit, unitRegistry) {
  const base = product.base_unit_ || "unit";
  if (displayUnit === base)
    return pricePerUnit;
  const opt = (product.purchase_options_ || []).find((o) => o.unit_symbol_ === displayUnit);
  if (opt?.conversion_rate_) {
    return pricePerUnit / opt.conversion_rate_;
  }
  const baseConv = unitRegistry.getConversion(base);
  const unitConv = unitRegistry.getConversion(displayUnit);
  if (baseConv && unitConv)
    return pricePerUnit * (baseConv / unitConv);
  return pricePerUnit;
}

// src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
var _forTrack0 = ($index, $item) => $item._id;
var _forTrack1 = ($index, $item) => $item.name;
var _forTrack2 = ($index, $item) => $item.value;
function InventoryProductListComponent_Conditional_45_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-empty-state", 36);
    \u0275\u0275listener("ctaClick", function InventoryProductListComponent_Conditional_45_Conditional_1_Template_app_empty_state_ctaClick_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onAddProduct());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("ctaDisabled", !ctx_r1.isLoggedIn());
  }
}
function InventoryProductListComponent_Conditional_45_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "translatePipe");
  }
  if (rf & 2) {
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(1, 1, "no_products_match"), " ");
  }
}
function InventoryProductListComponent_Conditional_45_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 23);
    \u0275\u0275template(1, InventoryProductListComponent_Conditional_45_Conditional_1_Template, 1, 1, "app-empty-state", 35)(2, InventoryProductListComponent_Conditional_45_Conditional_2_Template, 2, 3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isEmptyList_() ? 1 : 2);
  }
}
function InventoryProductListComponent_For_47_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 39);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275attribute("title", \u0275\u0275pipeBind1(1, 2, "low_stock"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 4, "low_stock"));
  }
}
function InventoryProductListComponent_For_47_Conditional_10_Conditional_4_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 60);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const a_r6 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, a_r6));
  }
}
function InventoryProductListComponent_For_47_Conditional_10_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 59);
    \u0275\u0275repeaterCreate(1, InventoryProductListComponent_For_47_Conditional_10_Conditional_4_For_2_Template, 3, 3, "span", 60, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const product_r4 = \u0275\u0275nextContext(2).$implicit;
    \u0275\u0275advance();
    \u0275\u0275repeater(product_r4.allergens_);
  }
}
function InventoryProductListComponent_For_47_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 56);
    \u0275\u0275listener("clickOutside", function InventoryProductListComponent_For_47_Conditional_10_Template_div_clickOutside_0_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeAllergenView($event));
    });
    \u0275\u0275elementStart(1, "button", 57);
    \u0275\u0275listener("click", function InventoryProductListComponent_For_47_Conditional_10_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r5);
      const product_r4 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleAllergenPopover(product_r4._id));
    });
    \u0275\u0275element(2, "lucide-icon", 58);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275template(4, InventoryProductListComponent_For_47_Conditional_10_Conditional_4_Template, 3, 0, "div", 59);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const product_r4 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("allergen-expanded-open", ctx_r1.allergenExpandAll_() || ctx_r1.allergenPopoverProductId_() === product_r4._id);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", product_r4.allergens_.length, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.allergenExpandAll_() || ctx_r1.allergenPopoverProductId_() === product_r4._id ? 4 : -1);
  }
}
function InventoryProductListComponent_For_47_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 44);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function InventoryProductListComponent_For_47_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 53);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function InventoryProductListComponent_For_47_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 61);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function InventoryProductListComponent_For_47_Conditional_30_Template_button_click_0_listener($event) {
      \u0275\u0275restoreView(_r7);
      const product_r4 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.onDeleteProduct(product_r4._id);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(3, "lucide-icon", 62);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", !ctx_r1.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(1, 4, "delete"))("title", !ctx_r1.isLoggedIn() ? \u0275\u0275pipeBind1(2, 6, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
  }
}
function InventoryProductListComponent_For_47_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 37);
    \u0275\u0275listener("click", function InventoryProductListComponent_For_47_Template_div_click_0_listener($event) {
      const product_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onRowClick(product_r4, $event));
    })("keydown.enter", function InventoryProductListComponent_For_47_Template_div_keydown_enter_0_listener() {
      const product_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onEditProduct(product_r4._id));
    })("keydown.space", function InventoryProductListComponent_For_47_Template_div_keydown_space_0_listener($event) {
      const product_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      $event.preventDefault();
      return \u0275\u0275resetView(ctx_r1.onEditProduct(product_r4._id));
    });
    \u0275\u0275elementStart(1, "div", 38);
    \u0275\u0275template(2, InventoryProductListComponent_For_47_Conditional_2_Template, 4, 6, "span", 39);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "app-cell-carousel", 40)(5, "div", 41);
    \u0275\u0275pipe(6, "translatePipe");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 42);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275template(10, InventoryProductListComponent_For_47_Conditional_10_Template, 5, 5, "div", 43)(11, InventoryProductListComponent_For_47_Conditional_11_Template, 2, 0, "span", 44);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 45);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 46);
    \u0275\u0275text(16);
    \u0275\u0275pipe(17, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "div", 47)(19, "span", 48);
    \u0275\u0275text(20);
    \u0275\u0275pipe(21, "number");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "span", 49);
    \u0275\u0275text(23, "\u20AA");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(24, "div", 50)(25, "button", 51);
    \u0275\u0275pipe(26, "translatePipe");
    \u0275\u0275pipe(27, "translatePipe");
    \u0275\u0275listener("click", function InventoryProductListComponent_For_47_Template_button_click_25_listener($event) {
      const product_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.onEditProduct(product_r4._id);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(28, "lucide-icon", 52);
    \u0275\u0275elementEnd();
    \u0275\u0275template(29, InventoryProductListComponent_For_47_Conditional_29_Template, 1, 1, "app-loader", 53)(30, InventoryProductListComponent_For_47_Conditional_30_Template, 4, 8, "button", 54);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "div", 55)(32, "app-list-row-checkbox", 21);
    \u0275\u0275listener("toggle", function InventoryProductListComponent_For_47_Template_app_list_row_checkbox_toggle_32_listener() {
      const product_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.selection.toggle(product_r4._id));
    });
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const product_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.isLowStock(product_r4) ? 2 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", product_r4.name_hebrew, " ");
    \u0275\u0275advance();
    \u0275\u0275property("activeIndex", ctx_r1.carouselHeaderIndex_());
    \u0275\u0275advance();
    \u0275\u0275property("label", \u0275\u0275pipeBind1(6, 17, "category"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getCategoryDisplay(product_r4.categories_) || "\u2014");
    \u0275\u0275advance();
    \u0275\u0275property("label", \u0275\u0275pipeBind1(9, 19, "allergens"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(product_r4.allergens_.length ? 10 : 11);
    \u0275\u0275advance(2);
    \u0275\u0275property("label", \u0275\u0275pipeBind1(13, 21, "supplier"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getSupplierNames(product_r4.supplierIds_) || "\u2014");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(17, 23, product_r4.base_unit_));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(21, 25, ctx_r1.getPricePerUnit(product_r4, product_r4.base_unit_), "1.2-2"));
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", !ctx_r1.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(26, 28, "edit"))("title", !ctx_r1.isLoggedIn() ? \u0275\u0275pipeBind1(27, 30, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.deletingId_() === product_r4._id ? 29 : 30);
    \u0275\u0275advance(3);
    \u0275\u0275property("checked", ctx_r1.selection.isSelected(product_r4._id));
  }
}
function InventoryProductListComponent_Conditional_58_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 63);
    \u0275\u0275listener("click", function InventoryProductListComponent_Conditional_58_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.clearAllFilters());
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "clear_filters"));
  }
}
function InventoryProductListComponent_For_65_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 65);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const category_r10 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.selectedCountInCategory(category_r10));
  }
}
function InventoryProductListComponent_For_65_Conditional_7_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 68)(1, "input", 33);
    \u0275\u0275listener("change", function InventoryProductListComponent_For_65_Conditional_7_For_2_Template_input_change_1_listener() {
      const option_r12 = \u0275\u0275restoreView(_r11).$implicit;
      const category_r10 = \u0275\u0275nextContext(2).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleFilter(category_r10.name, option_r12.value));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const option_r12 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275property("checked", option_r12.checked_);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 2, option_r12.label));
  }
}
function InventoryProductListComponent_For_65_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 67);
    \u0275\u0275repeaterCreate(1, InventoryProductListComponent_For_65_Conditional_7_For_2_Template, 5, 4, "label", 68, _forTrack2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const category_r10 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275repeater(category_r10.options);
  }
}
function InventoryProductListComponent_For_65_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 34)(1, "button", 64);
    \u0275\u0275listener("click", function InventoryProductListComponent_For_65_Template_button_click_1_listener() {
      const category_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleFilterCategory(category_r10.name));
    });
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, InventoryProductListComponent_For_65_Conditional_5_Template, 2, 1, "span", 65);
    \u0275\u0275element(6, "lucide-icon", 66);
    \u0275\u0275elementEnd();
    \u0275\u0275template(7, InventoryProductListComponent_For_65_Conditional_7_Template, 3, 0, "div", 67);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const category_r10 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275classProp("expanded", ctx_r1.isCategoryExpanded(category_r10.name));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 7, category_r10.displayKey));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.selectedCountInCategory(category_r10) > 0 ? 5 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("name", ctx_r1.isCategoryExpanded(category_r10.name) ? "chevron-down" : "chevron-left")("size", 16);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isCategoryExpanded(category_r10.name) ? 7 : -1);
  }
}
var InventoryProductListComponent = class _InventoryProductListComponent {
  kitchenStateService = inject(KitchenStateService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  heroFab = inject(HeroFabService);
  translationService = inject(TranslationService);
  confirmModal = inject(ConfirmModalService);
  equipmentData = inject(EquipmentDataService);
  userMsg = inject(UserMsgService);
  unitRegistry = inject(UnitRegistryService);
  isLoggedIn = inject(UserService).isLoggedIn;
  metadataRegistry = inject(MetadataRegistryService);
  lastPriceEdit_ = { productId: "", unit: "", value: 0 };
  activeFilters_ = signal({});
  searchQuery_ = signal("");
  sortBy_ = signal(null);
  sortOrder_ = signal("asc");
  isPanelOpen_ = signal(getPanelOpen("inventory"));
  expandedFilterCategories_ = signal(/* @__PURE__ */ new Set());
  allergenPopoverProductId_ = signal(null);
  allergenExpandAll_ = signal(false);
  lowStockOnly_ = signal(false);
  deletingId_ = signal(null);
  savingPriceId_ = signal(null);
  carouselHeaderIndex_ = signal(0);
  selection = new ListSelectionState();
  editableFields_ = computed(() => [
    {
      key: "categories_",
      label: "category",
      options: this.metadataRegistry.allCategories_().map((c) => ({ value: c, label: c })),
      multi: true
    },
    {
      key: "supplierIds_",
      label: "supplier",
      options: this.kitchenStateService.suppliers_().map((s) => ({ value: s._id, label: s.name_hebrew })),
      multi: true
    },
    {
      key: "allergens_",
      label: "allergens",
      options: this.metadataRegistry.allAllergens_().map((a) => ({ value: a, label: a })),
      multi: true
    },
    {
      key: "base_unit_",
      label: "unit",
      options: this.unitRegistry.allUnitKeys_().map((u) => ({ value: u, label: u })),
      multi: false
    }
  ]);
  constructor() {
    useListState("inventory", [
      { urlParam: "q", signal: this.searchQuery_, serializer: StringParam },
      { urlParam: "sort", signal: this.sortBy_, serializer: NullableStringParam },
      { urlParam: "order", signal: this.sortOrder_, serializer: StringParam },
      { urlParam: "filters", signal: this.activeFilters_, serializer: FilterRecordParam },
      { urlParam: "lowStock", signal: this.lowStockOnly_, serializer: BooleanParam }
    ]);
    afterNextRender(() => {
      if (typeof window === "undefined")
        return;
      const q = window.matchMedia("(max-width: 768px)");
      if (q.matches)
        this.isPanelOpen_.set(false);
      q.addEventListener("change", (e) => {
        if (e.matches)
          this.isPanelOpen_.set(false);
      });
    });
  }
  ngOnInit() {
    this.heroFab.setPageActions([{ labelKey: "add_product", icon: "plus", run: () => this.router.navigate(["/inventory/add"]) }], "replace");
  }
  ngOnDestroy() {
    this.heroFab.clearPageActions();
  }
  // LISTING
  filterCategories_ = computed(() => {
    const products = this.kitchenStateService.products_();
    const filters = this.activeFilters_();
    const categories = {};
    products.forEach((product) => {
      if (product.allergens_?.length) {
        if (!categories["Allergens"])
          categories["Allergens"] = /* @__PURE__ */ new Set();
        product.allergens_.forEach((a) => categories["Allergens"].add(a));
      }
      const cats = product.categories_ ?? [];
      cats.forEach((cat) => {
        if (!categories["Category"])
          categories["Category"] = /* @__PURE__ */ new Set();
        categories["Category"].add(cat);
      });
      const supplierIds = product.supplierIds_ ?? [];
      supplierIds.forEach((id) => {
        if (!categories["Supplier"])
          categories["Supplier"] = /* @__PURE__ */ new Set();
        categories["Supplier"].add(id);
      });
    });
    return Object.keys(categories).map((name) => ({
      name,
      displayKey: this.categoryDisplayKey(name),
      options: Array.from(categories[name]).map((option) => ({
        label: name === "Supplier" ? this.getSupplierName(option) : option,
        value: option,
        checked_: (filters[name] || []).includes(option)
      }))
    }));
  });
  categoryDisplayKey(internalName) {
    const map = {
      "Category": "category",
      "Allergens": "allergens",
      "Supplier": "supplier"
    };
    return map[internalName] ?? internalName.toLowerCase();
  }
  toggleFilterCategory(name) {
    this.expandedFilterCategories_.update((set) => {
      const next = new Set(set);
      if (next.has(name))
        next.delete(name);
      else
        next.add(name);
      return next;
    });
  }
  isCategoryExpanded(name) {
    return this.expandedFilterCategories_().has(name);
  }
  onPanelToggled() {
    this.isPanelOpen_.update((v) => !v);
    setPanelOpen("inventory", this.isPanelOpen_());
  }
  onCarouselHeaderChange(index) {
    this.carouselHeaderIndex_.set(index);
  }
  isEmptyList_ = computed(() => this.kitchenStateService.products_().length === 0);
  filteredProducts_ = computed(() => {
    let products = this.kitchenStateService.products_();
    const filters = this.activeFilters_();
    const search = this.searchQuery_().trim().toLowerCase();
    const sortBy = this.sortBy_();
    const sortOrder = this.sortOrder_();
    const lowStockOnly = this.lowStockOnly_();
    if (lowStockOnly) {
      products = products.filter((p) => (p.min_stock_level_ ?? 0) > 0);
    }
    if (Object.keys(filters).length > 0) {
      products = products.filter((product) => {
        return Object.entries(filters).every(([category, selectedValues]) => {
          let productValues = [];
          if (category === "Allergens")
            productValues = product.allergens_ || [];
          else if (category === "Category")
            productValues = product.categories_ ?? [];
          else if (category === "Supplier")
            productValues = product.supplierIds_ ?? [];
          return selectedValues.some((v) => productValues.includes(v));
        });
      });
    }
    if (search) {
      products = products.filter((p) => (p.name_hebrew ?? "").toLowerCase().includes(search));
    }
    if (sortBy) {
      products = [...products].sort((a, b) => {
        const cmp = this.compareProducts(a, b, sortBy);
        return sortOrder === "asc" ? cmp : -cmp;
      });
    }
    return products;
  });
  /** Visible product IDs for header select-all. */
  filteredProductIds_ = computed(() => this.filteredProducts_().map((p) => p._id ?? "").filter(Boolean));
  compareProducts(a, b, field) {
    const hebrewCompare = (aStr, bStr) => (aStr || "").localeCompare(bStr || "", "he");
    switch (field) {
      case "name":
        return hebrewCompare(a.name_hebrew || "", b.name_hebrew || "");
      case "category": {
        const aStr = this.getCategoryDisplay(a.categories_ ?? []);
        const bStr = this.getCategoryDisplay(b.categories_ ?? []);
        return hebrewCompare(aStr, bStr);
      }
      case "allergens": {
        const aVal = this.translationService.translate(a.allergens_?.[0] ?? "");
        const bVal = this.translationService.translate(b.allergens_?.[0] ?? "");
        return hebrewCompare(aVal, bVal);
      }
      case "supplier":
        return hebrewCompare(this.getSupplierNames(a.supplierIds_ ?? []), this.getSupplierNames(b.supplierIds_ ?? []));
      case "date":
        return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
      default:
        return 0;
    }
  }
  setSort(field) {
    const current = this.sortBy_();
    if (current === field) {
      this.sortOrder_.update((o) => o === "asc" ? "desc" : "asc");
    } else {
      this.sortBy_.set(field);
      this.sortOrder_.set("asc");
    }
  }
  toggleAllergenExpandAll() {
    this.allergenExpandAll_.update((v) => !v);
    this.allergenPopoverProductId_.set(null);
  }
  toggleAllergenPopover(productId) {
    this.allergenExpandAll_.set(false);
    this.allergenPopoverProductId_.update((id) => id === productId ? null : productId);
  }
  closeAllergenView(clickTarget) {
    const el = clickTarget instanceof HTMLElement ? clickTarget : null;
    if (el?.closest("thead .col-allergens"))
      return;
    this.allergenPopoverProductId_.set(null);
    this.allergenExpandAll_.set(false);
  }
  sortIconFor_(field) {
    const current = this.sortBy_();
    if (current !== field)
      return "arrow-up-down";
    return this.sortOrder_() === "asc" ? "arrow-up" : "arrow-down";
  }
  // FILTERING
  toggleFilter(categoryName, optionValue) {
    this.activeFilters_.update((prev) => {
      const current = __spreadValues({}, prev);
      const values = current[categoryName] || [];
      if (values.includes(optionValue)) {
        current[categoryName] = values.filter((v) => v !== optionValue);
        if (current[categoryName].length === 0)
          delete current[categoryName];
      } else {
        current[categoryName] = [...values, optionValue];
      }
      return current;
    });
  }
  clearAllFilters() {
    this.lowStockOnly_.set(false);
    this.activeFilters_.set({});
  }
  isLowStock(product) {
    return (product.min_stock_level_ ?? 0) > 0;
  }
  hasActiveFilters_ = computed(() => this.lowStockOnly_() || Object.values(this.activeFilters_()).some((arr) => arr.length > 0));
  toggleLowStockOnly() {
    this.lowStockOnly_.update((v) => !v);
  }
  selectedCountInCategory(category) {
    return category.options.filter((o) => o.checked_).length;
  }
  onAddProduct() {
    this.router.navigate(["/inventory/add"]);
  }
  onEditProduct(_id) {
    this.router.navigate(["/inventory/edit", _id]);
  }
  onRowClick(product, event) {
    const el = event.target;
    if (el.closest("button") || el.closest("a") || el.closest(".allergen-btn-wrapper") || el.closest("app-list-row-checkbox"))
      return;
    if (this.selection.selectionMode()) {
      this.selection.toggle(product._id ?? "");
      return;
    }
    this.router.navigate(["/inventory/edit", product._id]);
  }
  // DELETE
  onDeleteProduct(_id) {
    if (confirm("\u05D4\u05D0\u05DD \u05D0\u05EA\u05D4 \u05D1\u05D8\u05D5\u05D7 \u05E9\u05D1\u05E8\u05E6\u05D5\u05E0\u05DA \u05DC\u05DE\u05D7\u05D5\u05E7 \u05D7\u05D5\u05DE\u05E8 \u05D2\u05DC\u05DD \u05D6\u05D4?")) {
      this.deletingId_.set(_id);
      this.kitchenStateService.deleteProduct(_id).subscribe({
        next: () => {
          this.deletingId_.set(null);
        },
        error: () => {
          this.deletingId_.set(null);
        }
      });
    }
  }
  onBulkDeleteSelected(ids) {
    if (ids.length === 0)
      return;
    if (!confirm(`\u05DC\u05DE\u05D7\u05D5\u05E7 ${ids.length} \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD?`))
      return;
    ids.forEach((id) => {
      this.kitchenStateService.deleteProduct(id).subscribe({ next: () => {
      }, error: () => {
      } });
    });
    this.selection.clear();
  }
  getSupplierName(supplierId) {
    if (!supplierId)
      return "";
    const supplier = this.kitchenStateService.suppliers_().find((s) => s._id === supplierId);
    return supplier?.name_hebrew ?? supplierId;
  }
  getSupplierNames(ids) {
    return (ids ?? []).map((id) => this.getSupplierName(id)).filter(Boolean).join(", ");
  }
  getCategoryDisplay(ids) {
    return (ids ?? []).map((id) => this.translationService.translate(id)).filter(Boolean).join(", ") || "";
  }
  /** Price per 1 of the given unit (converted from buy_price_global_ which is per base_unit) */
  getPricePerUnit(product, unit) {
    return getPricePerUnit(product, unit, this.unitRegistry);
  }
  // INLINE UPDATE
  onUnitChange(product, newUnit) {
    const oldBase = product.base_unit_ || "unit";
    const oldPrice = product.buy_price_global_ ?? 0;
    let newPrice = oldPrice;
    if (newUnit !== oldBase) {
      const opt = (product.purchase_options_ || []).find((o) => o.unit_symbol_ === newUnit);
      if (opt?.conversion_rate_) {
        newPrice = oldPrice * opt.conversion_rate_;
      } else {
        const baseConv = this.unitRegistry.getConversion(oldBase);
        const unitConv = this.unitRegistry.getConversion(newUnit);
        if (baseConv && unitConv)
          newPrice = oldPrice * (unitConv / baseConv);
      }
    }
    const updated = __spreadProps(__spreadValues({}, product), { base_unit_: newUnit, buy_price_global_: newPrice });
    this.kitchenStateService.saveProduct(updated).subscribe({ next: () => {
    }, error: () => {
    } });
  }
  onPriceFocus(product, displayUnit) {
    this.lastPriceEdit_ = {
      productId: product._id ?? "",
      unit: displayUnit,
      value: this.getPricePerUnit(product, displayUnit)
    };
  }
  onPriceBlur(product, displayUnit, event, inputEl) {
    return __async(this, null, function* () {
      const newValue = parseFloat(event.target.value) || 0;
      const originalValue = this.lastPriceEdit_.value;
      if (Math.abs(newValue - originalValue) < 1e-3)
        return;
      const confirmed = yield this.confirmModal.open("save_price_confirm", { saveLabel: "save_price" });
      if (confirmed) {
        this.onPriceChange(product, displayUnit, newValue);
      } else {
        inputEl.value = String(originalValue);
      }
    });
  }
  onBulkEdit(event) {
    const field = event.field;
    const products = this.kitchenStateService.products_();
    for (const id of event.ids) {
      const product = products.find((p) => p._id === id);
      if (!product)
        continue;
      let updated;
      if (field === "supplierIds_" || field === "categories_" || field === "allergens_") {
        const current = product[field] ?? [];
        if (current.includes(event.value))
          continue;
        updated = __spreadProps(__spreadValues({}, product), { [field]: [...current, event.value] });
      } else {
        updated = __spreadProps(__spreadValues({}, product), { base_unit_: event.value });
      }
      this.kitchenStateService.saveProduct(updated).subscribe({ next: () => {
      }, error: () => {
      } });
    }
  }
  onPriceChange(product, displayUnit, value) {
    const pricePerUnit = typeof value === "string" ? parseFloat(value) || 0 : value;
    const buyPriceGlobal = calcBuyPriceGlobal(product, displayUnit, pricePerUnit, this.unitRegistry);
    const updated = __spreadProps(__spreadValues({}, product), { buy_price_global_: buyPriceGlobal });
    this.savingPriceId_.set(product._id ?? "");
    this.kitchenStateService.saveProduct(updated).subscribe({
      next: () => {
        this.savingPriceId_.set(null);
      },
      error: () => {
        this.savingPriceId_.set(null);
      }
    });
  }
  static \u0275fac = function InventoryProductListComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _InventoryProductListComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _InventoryProductListComponent, selectors: [["inventory-product-list"]], decls: 66, vars: 60, consts: [[3, "panelToggle", "isPanelOpen", "gridTemplate", "mobileGridTemplate", "dir"], ["shell-title", "", 1, "page-title"], ["shell-search", ""], ["for", "product-search", 1, "visually-hidden"], [1, "c-input-wrapper"], ["name", "search", 3, "size"], ["id", "product-search", "type", "text", 3, "ngModelChange", "ngModel", "placeholder"], ["shell-actions", ""], [3, "bulkDelete", "bulkEdit", "selectionState", "editableFields"], ["type", "button", 1, "c-btn-primary", 3, "click", "disabled"], ["name", "plus", 3, "size"], ["shell-table-header", ""], ["role", "columnheader", "tabindex", "0", 1, "col-name", "c-grid-header-cell", "c-sortable-header", 3, "click", "keydown.enter", "keydown.space"], [3, "activeIndexChange", "activeIndex"], ["carouselHeaderColumn", "", "label", "category", "role", "button", "tabindex", "0", 1, "col-category", "c-grid-header-cell", "c-sortable-header", 3, "click", "keydown.enter", "keydown.space"], ["carouselHeaderColumn", "", "label", "allergens", "role", "button", "tabindex", "0", 1, "col-allergens", "c-grid-header-cell", "c-sortable-header", 3, "click", "keydown.enter", "keydown.space"], ["carouselHeaderColumn", "", "label", "supplier", "role", "button", "tabindex", "0", 1, "col-supplier", "c-grid-header-cell", "c-sortable-header", 3, "click", "keydown.enter", "keydown.space"], ["role", "columnheader", 1, "col-unit", "c-grid-header-cell"], ["role", "columnheader", 1, "col-price", "c-grid-header-cell"], ["role", "columnheader", 1, "c-col-actions", "c-grid-header-cell"], ["role", "columnheader", 1, "col-select", "c-grid-header-cell"], [3, "toggle", "checked"], ["shell-table-body", ""], [1, "no-results"], ["role", "button", "tabindex", "0", 1, "product-grid-row", "c-list-row"], ["shell-filters", ""], ["aria-label", "Inventory and logistics", 1, "control-nav"], ["routerLink", "/inventory/list", "routerLinkActive", "active", 1, "control-nav-link"], ["routerLink", "/inventory/equipment", "routerLinkActive", "active", 1, "control-nav-link"], [1, "c-filter-section"], [1, "c-filter-section-header"], ["type", "button", 1, "c-btn-ghost--sm"], [1, "c-filter-option", "low-stock-toggle"], ["type", "checkbox", 3, "change", "checked"], [1, "c-filter-category"], ["messageKey", "empty_inventory", "icon", "package", "ctaLabelKey", "add_first_product", 3, "ctaDisabled"], ["messageKey", "empty_inventory", "icon", "package", "ctaLabelKey", "add_first_product", 3, "ctaClick", "ctaDisabled"], ["role", "button", "tabindex", "0", 1, "product-grid-row", "c-list-row", 3, "click", "keydown.enter", "keydown.space"], ["role", "cell", 1, "col-name", "c-list-body-cell"], [1, "low-stock-badge"], ["role", "cell", 3, "activeIndex"], ["cellCarouselSlide", "", 1, "col-category", "c-list-body-cell", 3, "label"], ["cellCarouselSlide", "", 1, "col-allergens", "c-list-body-cell", 3, "label"], [1, "allergen-btn-wrapper", 3, "allergen-expanded-open"], [1, "placeholder-dash"], ["cellCarouselSlide", "", 1, "col-supplier", "c-list-body-cell", 3, "label"], ["role", "cell", 1, "col-unit", "c-list-body-cell"], ["role", "cell", 1, "col-price", "col-price-readonly", "c-list-body-cell"], [1, "price-value"], [1, "price-suffix"], ["role", "cell", 1, "c-col-actions", "c-list-body-cell"], ["type", "button", 1, "c-icon-btn", 3, "click", "disabled"], ["name", "pencil", 3, "size"], ["size", "small", 3, "inline"], ["type", "button", 1, "c-icon-btn", "danger", 3, "disabled"], ["role", "cell", 1, "col-select", "c-list-body-cell"], [1, "allergen-btn-wrapper", 3, "clickOutside"], ["type", "button", 1, "allergen-btn", 3, "click"], ["name", "shield-alert", 3, "size"], [1, "allergen-expanded", "dense-grid"], [1, "allergen-pill"], ["type", "button", 1, "c-icon-btn", "danger", 3, "click", "disabled"], ["name", "trash-2", 3, "size"], ["type", "button", 1, "c-btn-ghost--sm", 3, "click"], ["type", "button", 1, "c-filter-category-header", 3, "click"], ["aria-hidden", "true", 1, "c-filter-category-count"], [3, "name", "size"], [1, "c-filter-options"], [1, "c-filter-option"]], template: function InventoryProductListComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-list-shell", 0);
      \u0275\u0275listener("panelToggle", function InventoryProductListComponent_Template_app_list_shell_panelToggle_0_listener() {
        return ctx.onPanelToggled();
      });
      \u0275\u0275elementStart(1, "h2", 1);
      \u0275\u0275text(2);
      \u0275\u0275pipe(3, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementContainerStart(4, 2);
      \u0275\u0275elementStart(5, "label", 3);
      \u0275\u0275text(6);
      \u0275\u0275pipe(7, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "div", 4);
      \u0275\u0275element(9, "lucide-icon", 5);
      \u0275\u0275elementStart(10, "input", 6);
      \u0275\u0275pipe(11, "translatePipe");
      \u0275\u0275listener("ngModelChange", function InventoryProductListComponent_Template_input_ngModelChange_10_listener($event) {
        return ctx.searchQuery_.set($event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(12, 7);
      \u0275\u0275elementStart(13, "app-selection-bar", 8);
      \u0275\u0275listener("bulkDelete", function InventoryProductListComponent_Template_app_selection_bar_bulkDelete_13_listener($event) {
        return ctx.onBulkDeleteSelected($event);
      })("bulkEdit", function InventoryProductListComponent_Template_app_selection_bar_bulkEdit_13_listener($event) {
        return ctx.onBulkEdit($event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "button", 9);
      \u0275\u0275pipe(15, "translatePipe");
      \u0275\u0275listener("click", function InventoryProductListComponent_Template_button_click_14_listener() {
        return ctx.onAddProduct();
      });
      \u0275\u0275element(16, "lucide-icon", 10);
      \u0275\u0275text(17);
      \u0275\u0275pipe(18, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(19, 11);
      \u0275\u0275elementStart(20, "div", 12);
      \u0275\u0275listener("click", function InventoryProductListComponent_Template_div_click_20_listener() {
        return ctx.setSort("name");
      })("keydown.enter", function InventoryProductListComponent_Template_div_keydown_enter_20_listener() {
        return ctx.setSort("name");
      })("keydown.space", function InventoryProductListComponent_Template_div_keydown_space_20_listener($event) {
        $event.preventDefault();
        return ctx.setSort("name");
      });
      \u0275\u0275text(21);
      \u0275\u0275pipe(22, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(23, "app-carousel-header", 13);
      \u0275\u0275listener("activeIndexChange", function InventoryProductListComponent_Template_app_carousel_header_activeIndexChange_23_listener($event) {
        return ctx.onCarouselHeaderChange($event);
      });
      \u0275\u0275elementStart(24, "div", 14);
      \u0275\u0275listener("click", function InventoryProductListComponent_Template_div_click_24_listener() {
        return ctx.setSort("category");
      })("keydown.enter", function InventoryProductListComponent_Template_div_keydown_enter_24_listener() {
        return ctx.setSort("category");
      })("keydown.space", function InventoryProductListComponent_Template_div_keydown_space_24_listener($event) {
        $event.preventDefault();
        return ctx.setSort("category");
      });
      \u0275\u0275text(25);
      \u0275\u0275pipe(26, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(27, "div", 15);
      \u0275\u0275listener("click", function InventoryProductListComponent_Template_div_click_27_listener() {
        return ctx.toggleAllergenExpandAll();
      })("keydown.enter", function InventoryProductListComponent_Template_div_keydown_enter_27_listener() {
        return ctx.toggleAllergenExpandAll();
      })("keydown.space", function InventoryProductListComponent_Template_div_keydown_space_27_listener($event) {
        $event.preventDefault();
        return ctx.toggleAllergenExpandAll();
      });
      \u0275\u0275text(28);
      \u0275\u0275pipe(29, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(30, "div", 16);
      \u0275\u0275listener("click", function InventoryProductListComponent_Template_div_click_30_listener() {
        return ctx.setSort("supplier");
      })("keydown.enter", function InventoryProductListComponent_Template_div_keydown_enter_30_listener() {
        return ctx.setSort("supplier");
      })("keydown.space", function InventoryProductListComponent_Template_div_keydown_space_30_listener($event) {
        $event.preventDefault();
        return ctx.setSort("supplier");
      });
      \u0275\u0275text(31);
      \u0275\u0275pipe(32, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(33, "div", 17);
      \u0275\u0275text(34);
      \u0275\u0275pipe(35, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(36, "div", 18);
      \u0275\u0275text(37);
      \u0275\u0275pipe(38, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(39, "div", 19);
      \u0275\u0275text(40);
      \u0275\u0275pipe(41, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(42, "div", 20)(43, "app-list-row-checkbox", 21);
      \u0275\u0275listener("toggle", function InventoryProductListComponent_Template_app_list_row_checkbox_toggle_43_listener() {
        return ctx.selection.toggleSelectAll(ctx.filteredProductIds_());
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(44, 22);
      \u0275\u0275template(45, InventoryProductListComponent_Conditional_45_Template, 3, 1, "div", 23);
      \u0275\u0275repeaterCreate(46, InventoryProductListComponent_For_47_Template, 33, 32, "div", 24, _forTrack0);
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(48, 25);
      \u0275\u0275elementStart(49, "nav", 26)(50, "a", 27);
      \u0275\u0275text(51);
      \u0275\u0275pipe(52, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(53, "a", 28);
      \u0275\u0275text(54);
      \u0275\u0275pipe(55, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(56, "div", 29)(57, "div", 30);
      \u0275\u0275template(58, InventoryProductListComponent_Conditional_58_Template, 3, 3, "button", 31);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(59, "label", 32)(60, "input", 33);
      \u0275\u0275listener("change", function InventoryProductListComponent_Template_input_change_60_listener() {
        return ctx.toggleLowStockOnly();
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(61, "span");
      \u0275\u0275text(62);
      \u0275\u0275pipe(63, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275repeaterCreate(64, InventoryProductListComponent_For_65_Template, 8, 9, "div", 34, _forTrack1);
      \u0275\u0275elementEnd();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275property("isPanelOpen", ctx.isPanelOpen_())("gridTemplate", "2fr 1fr 1fr 1fr minmax(48px, 0.8fr) 0.8fr 80px minmax(44px, auto)")("mobileGridTemplate", "2fr 1fr 0.8fr 0.8fr 80px minmax(44px, auto)")("dir", "rtl");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 30, "product_list"));
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 32, "search"));
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275property("ngModel", ctx.searchQuery_())("placeholder", \u0275\u0275pipeBind1(11, 34, "search"));
      \u0275\u0275advance(3);
      \u0275\u0275property("selectionState", ctx.selection)("editableFields", ctx.editableFields_());
      \u0275\u0275advance();
      \u0275\u0275property("disabled", !ctx.isLoggedIn());
      \u0275\u0275attribute("title", !ctx.isLoggedIn() ? \u0275\u0275pipeBind1(15, 36, "sign_in_to_use") : null);
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(18, 38, "add_product"), " ");
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(22, 40, "product"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("activeIndex", ctx.carouselHeaderIndex_());
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(26, 42, "category"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(29, 44, "allergens"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(32, 46, "supplier"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(35, 48, "unit"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(38, 50, "price"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(41, 52, "actions"));
      \u0275\u0275advance(3);
      \u0275\u0275property("checked", ctx.filteredProductIds_().length > 0 && ctx.selection.allSelected(ctx.filteredProductIds_()));
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.filteredProducts_().length === 0 ? 45 : -1);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.filteredProducts_());
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(52, 54, "product_list"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(55, 56, "logistics"));
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.hasActiveFilters_() ? 58 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275property("checked", ctx.lowStockOnly_());
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(63, 58, "low_stock"));
      \u0275\u0275advance(2);
      \u0275\u0275repeater(ctx.filterCategories_());
    }
  }, dependencies: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    DefaultValueAccessor,
    NgControlStatus,
    NgModel,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    LucideAngularComponent,
    TranslatePipe,
    ClickOutSideDirective,
    LoaderComponent,
    ListShellComponent,
    CarouselHeaderComponent,
    CarouselHeaderColumnDirective,
    CellCarouselComponent,
    CellCarouselSlideDirective,
    ListRowCheckboxComponent,
    SelectionBarComponent,
    EmptyStateComponent
  ], styles: ["\n\n@layer components.inventory-product-list {\n  [_nghost-%COMP%] {\n    display: block;\n  }\n  .page-title[_ngcontent-%COMP%] {\n    flex-shrink: 0;\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 700;\n    color: var(--color-text-main);\n    letter-spacing: 0.02em;\n  }\n  .product-grid-row[_ngcontent-%COMP%] {\n    display: contents;\n  }\n  .product-grid-row[_ngcontent-%COMP%]   .c-list-body-cell[_ngcontent-%COMP%] {\n    cursor: pointer;\n  }\n  .product-grid-row[_ngcontent-%COMP%]   .col-allergens.c-list-body-cell[_ngcontent-%COMP%] {\n    align-items: flex-start;\n  }\n  .product-grid-row[_ngcontent-%COMP%]:hover   .c-icon-btn[_ngcontent-%COMP%] {\n    opacity: 1;\n  }\n  .c-col-actions[_ngcontent-%COMP%]   .c-icon-btn[_ngcontent-%COMP%] {\n    margin-inline-start: 0.25rem;\n  }\n  .no-results[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n    padding: 2rem 1rem;\n    text-align: center;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    border-block-end: 1px solid var(--border-default);\n    background: var(--bg-glass-strong);\n  }\n  .no-results.empty-state[_ngcontent-%COMP%] {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 1rem;\n    padding-block: 3rem;\n  }\n  .no-results.empty-state[_ngcontent-%COMP%]   .empty-state-icon[_ngcontent-%COMP%] {\n    color: var(--color-text-muted-light);\n  }\n  .no-results.empty-state[_ngcontent-%COMP%]   .empty-state-msg[_ngcontent-%COMP%] {\n    margin: 0;\n    font-size: 1rem;\n    color: var(--color-text-secondary);\n  }\n  .low-stock-badge[_ngcontent-%COMP%] {\n    display: inline-block;\n    margin-inline-end: 0.375rem;\n    padding-inline: 0.375rem;\n    padding-block: 0.125rem;\n    font-size: 0.6875rem;\n    font-weight: 600;\n    background: var(--bg-warning);\n    color: var(--text-warning);\n    border-radius: var(--radius-xs);\n  }\n  .col-price-readonly[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 0.25rem;\n  }\n  .col-price-readonly[_ngcontent-%COMP%]   .price-value[_ngcontent-%COMP%] {\n    font-variant-numeric: tabular-nums;\n  }\n  .col-price-readonly[_ngcontent-%COMP%]   .price-suffix[_ngcontent-%COMP%] {\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n  }\n  .control-nav[_ngcontent-%COMP%] {\n    display: flex;\n    flex-direction: column;\n    gap: 0.375rem;\n    margin-block-end: 1rem;\n    padding-block-end: 1rem;\n    border-block-end: 1px solid var(--border-default);\n  }\n  .control-nav-link[_ngcontent-%COMP%] {\n    display: block;\n    padding-inline: 0.75rem;\n    padding-block: 0.5rem;\n    color: var(--color-text-secondary);\n    font-size: 0.875rem;\n    font-weight: 500;\n    text-decoration: none;\n    border-radius: var(--radius-md);\n    transition: background 0.2s var(--ease-smooth), color 0.2s var(--ease-smooth);\n  }\n  .control-nav-link[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  .control-nav-link.active[_ngcontent-%COMP%] {\n    background: var(--color-primary-soft);\n    color: var(--color-primary-hover);\n  }\n  .low-stock-toggle[_ngcontent-%COMP%] {\n    margin-block-end: 0.5rem;\n  }\n  .allergen-btn-wrapper[_ngcontent-%COMP%] {\n    position: relative;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 0.25rem;\n    width: 100%;\n  }\n  .allergen-btn-wrapper.allergen-expanded-open[_ngcontent-%COMP%]   .allergen-btn[_ngcontent-%COMP%] {\n    position: absolute;\n    left: -9999px;\n    width: 1px;\n    height: 1px;\n    overflow: hidden;\n    opacity: 0;\n    pointer-events: none;\n  }\n  .allergen-btn[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding: 0.25rem 0.625rem;\n    background: var(--bg-warning);\n    color: var(--text-warning);\n    border: 1px solid var(--border-warning);\n    border-radius: var(--radius-sm);\n    font-size: 0.8125rem;\n    font-weight: 500;\n    cursor: pointer;\n    transition: background 0.2s var(--ease-smooth), transform 0.15s var(--ease-smooth);\n  }\n  .allergen-btn[_ngcontent-%COMP%]:hover {\n    background: rgba(254, 243, 199, 0.9);\n    transform: scale(1.02);\n  }\n  .allergen-expanded[_ngcontent-%COMP%] {\n    display: grid;\n    grid-auto-flow: dense;\n    gap: 0.25rem;\n    align-content: start;\n    justify-content: center;\n    width: 100%;\n  }\n  .allergen-expanded.dense-grid[_ngcontent-%COMP%] {\n    grid-template-columns: repeat(auto-fill, minmax(3.75rem, 1fr));\n  }\n  .allergen-pill[_ngcontent-%COMP%] {\n    padding: 0.125rem 0.5rem;\n    font-size: 0.75rem;\n    font-weight: 500;\n    background: rgba(254, 243, 199, 0.5);\n    color: var(--text-warning);\n    border-radius: var(--radius-xs);\n    backdrop-filter: var(--blur-glass);\n  }\n  .c-sortable-header[_ngcontent-%COMP%] {\n    cursor: pointer;\n    transition: background 0.2s ease, color 0.2s ease;\n  }\n  .c-sortable-header[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  @media (max-width: 768px) {\n    .product-grid-row[_ngcontent-%COMP%]   app-cell-carousel[_ngcontent-%COMP%] {\n      background: var(--bg-glass);\n      border-block-end: 1px solid rgba(241, 245, 249, 0.4);\n      transition: background 0.15s ease;\n    }\n    .product-grid-row[_ngcontent-%COMP%]:hover   app-cell-carousel[_ngcontent-%COMP%] {\n      background: var(--bg-glass-hover);\n    }\n  }\n}\n/*# sourceMappingURL=inventory-product-list.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(InventoryProductListComponent, [{
    type: Component,
    args: [{ selector: "inventory-product-list", standalone: true, imports: [
      CommonModule,
      FormsModule,
      RouterLink,
      RouterLinkActive,
      LucideAngularModule,
      TranslatePipe,
      ClickOutSideDirective,
      LoaderComponent,
      ListShellComponent,
      CarouselHeaderComponent,
      CarouselHeaderColumnDirective,
      CellCarouselComponent,
      CellCarouselSlideDirective,
      ListRowCheckboxComponent,
      SelectionBarComponent,
      EmptyStateComponent
    ], changeDetection: ChangeDetectionStrategy.OnPush, template: `<app-list-shell
  [isPanelOpen]="isPanelOpen_()"
  (panelToggle)="onPanelToggled()"
  [gridTemplate]="'2fr 1fr 1fr 1fr minmax(48px, 0.8fr) 0.8fr 80px minmax(44px, auto)'"
  [mobileGridTemplate]="'2fr 1fr 0.8fr 0.8fr 80px minmax(44px, auto)'"
  [dir]="'rtl'">

  <h2 shell-title class="page-title">{{ 'product_list' | translatePipe }}</h2>

  <ng-container shell-search>
    <label class="visually-hidden" for="product-search">{{ 'search' | translatePipe }}</label>
    <div class="c-input-wrapper">
      <lucide-icon name="search" [size]="18"></lucide-icon>
      <input
        id="product-search"
        type="text"
        [ngModel]="searchQuery_()"
        (ngModelChange)="searchQuery_.set($event)"
        [placeholder]="'search' | translatePipe"
      />
    </div>
  </ng-container>

  <ng-container shell-actions>
    <app-selection-bar
      [selectionState]="selection"
      [editableFields]="editableFields_()"
      (bulkDelete)="onBulkDeleteSelected($event)"
      (bulkEdit)="onBulkEdit($event)" />
    <button type="button" class="c-btn-primary" (click)="onAddProduct()"
      [disabled]="!isLoggedIn()"
      [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
      <lucide-icon name="plus" [size]="18"></lucide-icon>
      {{ 'add_product' | translatePipe }}
    </button>
  </ng-container>

  <ng-container shell-table-header>
    <div class="col-name c-grid-header-cell c-sortable-header" (click)="setSort('name')" (keydown.enter)="setSort('name')" (keydown.space)="$event.preventDefault(); setSort('name')" role="columnheader" tabindex="0">
      {{ 'product' | translatePipe }}
    </div>
    <app-carousel-header [activeIndex]="carouselHeaderIndex_()" (activeIndexChange)="onCarouselHeaderChange($event)">
      <div class="col-category c-grid-header-cell c-sortable-header" carouselHeaderColumn label="category" (click)="setSort('category')" (keydown.enter)="setSort('category')" (keydown.space)="$event.preventDefault(); setSort('category')" role="button" tabindex="0">
        {{ 'category' | translatePipe }}
      </div>
      <div class="col-allergens c-grid-header-cell c-sortable-header" carouselHeaderColumn label="allergens" (click)="toggleAllergenExpandAll()" (keydown.enter)="toggleAllergenExpandAll()" (keydown.space)="$event.preventDefault(); toggleAllergenExpandAll()" role="button" tabindex="0">
        {{ 'allergens' | translatePipe }}
      </div>
      <div class="col-supplier c-grid-header-cell c-sortable-header" carouselHeaderColumn label="supplier" (click)="setSort('supplier')" (keydown.enter)="setSort('supplier')" (keydown.space)="$event.preventDefault(); setSort('supplier')" role="button" tabindex="0">
        {{ 'supplier' | translatePipe }}
      </div>
    </app-carousel-header>
    <div class="col-unit c-grid-header-cell" role="columnheader">{{ 'unit' | translatePipe }}</div>
    <div class="col-price c-grid-header-cell" role="columnheader">{{ 'price' | translatePipe }}</div>
    <div class="c-col-actions c-grid-header-cell" role="columnheader">{{ 'actions' | translatePipe }}</div>
    <div class="col-select c-grid-header-cell" role="columnheader">
      <app-list-row-checkbox [checked]="filteredProductIds_().length > 0 && selection.allSelected(filteredProductIds_())" (toggle)="selection.toggleSelectAll(filteredProductIds_())" />
    </div>
  </ng-container>

  <ng-container shell-table-body>
    @if (filteredProducts_().length === 0) {
      <div class="no-results">
        @if (isEmptyList_()) {
          <app-empty-state messageKey="empty_inventory" icon="package"
            ctaLabelKey="add_first_product" [ctaDisabled]="!isLoggedIn()"
            (ctaClick)="onAddProduct()" />
        } @else {
          {{ 'no_products_match' | translatePipe }}
        }
      </div>
    }
    @for (product of filteredProducts_(); track product._id) {
      <div class="product-grid-row c-list-row" role="button" tabindex="0"
        (click)="onRowClick(product, $event)"
        (keydown.enter)="onEditProduct(product._id)"
        (keydown.space)="$event.preventDefault(); onEditProduct(product._id)">
        <div class="col-name c-list-body-cell" role="cell">
          @if (isLowStock(product)) {
            <span class="low-stock-badge" [attr.title]="'low_stock' | translatePipe">{{ 'low_stock' | translatePipe }}</span>
          }
          {{ product.name_hebrew }}
        </div>
        <app-cell-carousel [activeIndex]="carouselHeaderIndex_()" role="cell">
          <div class="col-category c-list-body-cell" cellCarouselSlide [label]="'category' | translatePipe">{{ getCategoryDisplay(product.categories_) || '\u2014' }}</div>
          <div class="col-allergens c-list-body-cell" cellCarouselSlide [label]="'allergens' | translatePipe">
            @if (product.allergens_.length) {
              <div class="allergen-btn-wrapper" [class.allergen-expanded-open]="allergenExpandAll_() || allergenPopoverProductId_() === product._id" (clickOutside)="closeAllergenView($event)">
                <button type="button" class="allergen-btn" (click)="toggleAllergenPopover(product._id)">
                  <lucide-icon name="shield-alert" [size]="16"></lucide-icon>
                  {{ product.allergens_.length }}
                </button>
                @if (allergenExpandAll_() || allergenPopoverProductId_() === product._id) {
                  <div class="allergen-expanded dense-grid">
                    @for (a of product.allergens_; track a) {
                      <span class="allergen-pill">{{ a | translatePipe }}</span>
                    }
                  </div>
                }
              </div>
            } @else {
              <span class="placeholder-dash">\u2014</span>
            }
          </div>
          <div class="col-supplier c-list-body-cell" cellCarouselSlide [label]="'supplier' | translatePipe">{{ getSupplierNames(product.supplierIds_) || '\u2014' }}</div>
        </app-cell-carousel>
        <div class="col-unit c-list-body-cell" role="cell">{{ product.base_unit_ | translatePipe }}</div>
        <div class="col-price col-price-readonly c-list-body-cell" role="cell">
          <span class="price-value">{{ getPricePerUnit(product, product.base_unit_) | number:'1.2-2' }}</span>
          <span class="price-suffix">\u20AA</span>
        </div>
        <div class="c-col-actions c-list-body-cell" role="cell">
          <button type="button" class="c-icon-btn" (click)="onEditProduct(product._id); $event.stopPropagation()"
            [attr.aria-label]="'edit' | translatePipe"
            [disabled]="!isLoggedIn()"
            [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
            <lucide-icon name="pencil" [size]="18"></lucide-icon>
          </button>
          @if (deletingId_() === product._id) {
            <app-loader size="small" [inline]="true" />
          } @else {
            <button type="button" class="c-icon-btn danger" (click)="onDeleteProduct(product._id); $event.stopPropagation()"
              [attr.aria-label]="'delete' | translatePipe"
              [disabled]="!isLoggedIn()"
              [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
              <lucide-icon name="trash-2" [size]="18"></lucide-icon>
            </button>
          }
        </div>
        <div class="col-select c-list-body-cell" role="cell">
          <app-list-row-checkbox [checked]="selection.isSelected(product._id)" (toggle)="selection.toggle(product._id)" />
        </div>
      </div>
    }
  </ng-container>

  <ng-container shell-filters>
    <nav class="control-nav" aria-label="Inventory and logistics">
      <a routerLink="/inventory/list" routerLinkActive="active" class="control-nav-link">{{ 'product_list' | translatePipe }}</a>
      <a routerLink="/inventory/equipment" routerLinkActive="active" class="control-nav-link">{{ 'logistics' | translatePipe }}</a>
    </nav>
    <div class="c-filter-section">
      <div class="c-filter-section-header">
        @if (hasActiveFilters_()) {
          <button type="button" class="c-btn-ghost--sm" (click)="clearAllFilters()">{{ 'clear_filters' | translatePipe }}</button>
        }
      </div>
      <label class="c-filter-option low-stock-toggle">
        <input type="checkbox" [checked]="lowStockOnly_()" (change)="toggleLowStockOnly()" />
        <span>{{ 'low_stock' | translatePipe }}</span>
      </label>
      @for (category of filterCategories_(); track category.name) {
        <div class="c-filter-category">
          <button type="button" class="c-filter-category-header" [class.expanded]="isCategoryExpanded(category.name)" (click)="toggleFilterCategory(category.name)">
            <span>{{ category.displayKey | translatePipe }}</span>
            @if (selectedCountInCategory(category) > 0) {
              <span class="c-filter-category-count" aria-hidden="true">{{ selectedCountInCategory(category) }}</span>
            }
            <lucide-icon [name]="isCategoryExpanded(category.name) ? 'chevron-down' : 'chevron-left'" [size]="16"></lucide-icon>
          </button>
          @if (isCategoryExpanded(category.name)) {
            <div class="c-filter-options">
              @for (option of category.options; track option.value) {
                <label class="c-filter-option">
                  <input type="checkbox" [checked]="option.checked_" (change)="toggleFilter(category.name, option.value)" />
                  <span>{{ option.label | translatePipe }}</span>
                </label>
              }
            </div>
          }
        </div>
      }
    </div>
  </ng-container>

</app-list-shell>
`, styles: ["/* src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss */\n@layer components.inventory-product-list {\n  :host {\n    display: block;\n  }\n  .page-title {\n    flex-shrink: 0;\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 700;\n    color: var(--color-text-main);\n    letter-spacing: 0.02em;\n  }\n  .product-grid-row {\n    display: contents;\n  }\n  .product-grid-row .c-list-body-cell {\n    cursor: pointer;\n  }\n  .product-grid-row .col-allergens.c-list-body-cell {\n    align-items: flex-start;\n  }\n  .product-grid-row:hover .c-icon-btn {\n    opacity: 1;\n  }\n  .c-col-actions .c-icon-btn {\n    margin-inline-start: 0.25rem;\n  }\n  .no-results {\n    grid-column: 1/-1;\n    padding: 2rem 1rem;\n    text-align: center;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    border-block-end: 1px solid var(--border-default);\n    background: var(--bg-glass-strong);\n  }\n  .no-results.empty-state {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 1rem;\n    padding-block: 3rem;\n  }\n  .no-results.empty-state .empty-state-icon {\n    color: var(--color-text-muted-light);\n  }\n  .no-results.empty-state .empty-state-msg {\n    margin: 0;\n    font-size: 1rem;\n    color: var(--color-text-secondary);\n  }\n  .low-stock-badge {\n    display: inline-block;\n    margin-inline-end: 0.375rem;\n    padding-inline: 0.375rem;\n    padding-block: 0.125rem;\n    font-size: 0.6875rem;\n    font-weight: 600;\n    background: var(--bg-warning);\n    color: var(--text-warning);\n    border-radius: var(--radius-xs);\n  }\n  .col-price-readonly {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 0.25rem;\n  }\n  .col-price-readonly .price-value {\n    font-variant-numeric: tabular-nums;\n  }\n  .col-price-readonly .price-suffix {\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n  }\n  .control-nav {\n    display: flex;\n    flex-direction: column;\n    gap: 0.375rem;\n    margin-block-end: 1rem;\n    padding-block-end: 1rem;\n    border-block-end: 1px solid var(--border-default);\n  }\n  .control-nav-link {\n    display: block;\n    padding-inline: 0.75rem;\n    padding-block: 0.5rem;\n    color: var(--color-text-secondary);\n    font-size: 0.875rem;\n    font-weight: 500;\n    text-decoration: none;\n    border-radius: var(--radius-md);\n    transition: background 0.2s var(--ease-smooth), color 0.2s var(--ease-smooth);\n  }\n  .control-nav-link:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  .control-nav-link.active {\n    background: var(--color-primary-soft);\n    color: var(--color-primary-hover);\n  }\n  .low-stock-toggle {\n    margin-block-end: 0.5rem;\n  }\n  .allergen-btn-wrapper {\n    position: relative;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 0.25rem;\n    width: 100%;\n  }\n  .allergen-btn-wrapper.allergen-expanded-open .allergen-btn {\n    position: absolute;\n    left: -9999px;\n    width: 1px;\n    height: 1px;\n    overflow: hidden;\n    opacity: 0;\n    pointer-events: none;\n  }\n  .allergen-btn {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding: 0.25rem 0.625rem;\n    background: var(--bg-warning);\n    color: var(--text-warning);\n    border: 1px solid var(--border-warning);\n    border-radius: var(--radius-sm);\n    font-size: 0.8125rem;\n    font-weight: 500;\n    cursor: pointer;\n    transition: background 0.2s var(--ease-smooth), transform 0.15s var(--ease-smooth);\n  }\n  .allergen-btn:hover {\n    background: rgba(254, 243, 199, 0.9);\n    transform: scale(1.02);\n  }\n  .allergen-expanded {\n    display: grid;\n    grid-auto-flow: dense;\n    gap: 0.25rem;\n    align-content: start;\n    justify-content: center;\n    width: 100%;\n  }\n  .allergen-expanded.dense-grid {\n    grid-template-columns: repeat(auto-fill, minmax(3.75rem, 1fr));\n  }\n  .allergen-pill {\n    padding: 0.125rem 0.5rem;\n    font-size: 0.75rem;\n    font-weight: 500;\n    background: rgba(254, 243, 199, 0.5);\n    color: var(--text-warning);\n    border-radius: var(--radius-xs);\n    backdrop-filter: var(--blur-glass);\n  }\n  .c-sortable-header {\n    cursor: pointer;\n    transition: background 0.2s ease, color 0.2s ease;\n  }\n  .c-sortable-header:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  @media (max-width: 768px) {\n    .product-grid-row app-cell-carousel {\n      background: var(--bg-glass);\n      border-block-end: 1px solid rgba(241, 245, 249, 0.4);\n      transition: background 0.15s ease;\n    }\n    .product-grid-row:hover app-cell-carousel {\n      background: var(--bg-glass-hover);\n    }\n  }\n}\n/*# sourceMappingURL=inventory-product-list.component.css.map */\n"] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(InventoryProductListComponent, { className: "InventoryProductListComponent", filePath: "src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts", lineNumber: 60 });
})();
export {
  InventoryProductListComponent
};
//# sourceMappingURL=chunk-5J4WCSGG.js.map
