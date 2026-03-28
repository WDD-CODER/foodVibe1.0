import {
  SelectOnFocusDirective
} from "./chunk-W2XHIWHI.js";
import {
  MetadataRegistryService
} from "./chunk-AEBXA76L.js";
import {
  UnitRegistryService
} from "./chunk-HKRWTH4Y.js";
import {
  AddItemModalService
} from "./chunk-44QAIIDK.js";
import {
  ConfirmModalService
} from "./chunk-OMWRJF5J.js";
import {
  TranslationKeyModalService,
  isTranslationKeyResult
} from "./chunk-KNQKKPOG.js";
import {
  duplicateNameValidator
} from "./chunk-6FJWTD4F.js";
import {
  useSavingState
} from "./chunk-6VNIKYJO.js";
import {
  ClickOutSideDirective,
  CustomSelectComponent,
  ScrollableDropdownComponent
} from "./chunk-KKA4TBVQ.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormArrayName,
  FormBuilder,
  FormControlName,
  FormGroupDirective,
  FormGroupName,
  FormsModule,
  MaxValidator,
  MinValidator,
  NgControlStatus,
  NgControlStatusGroup,
  NumberValueAccessor,
  ReactiveFormsModule,
  Validators,
  ɵNgNoValidate
} from "./chunk-UNNU6L7T.js";
import {
  LoaderComponent
} from "./chunk-TR2OKVKA.js";
import {
  takeUntilDestroyed,
  toSignal
} from "./chunk-4LOKEQAU.js";
import {
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-JROUPDH4.js";
import {
  TranslatePipe,
  TranslationService
} from "./chunk-Z6OI3YDQ.js";
import {
  KitchenStateService
} from "./chunk-ZA4PDXUK.js";
import {
  SupplierDataService
} from "./chunk-IFJ5YUTT.js";
import "./chunk-ACTKISJR.js";
import "./chunk-VOTRTAY7.js";
import "./chunk-7WUWXC4O.js";
import {
  UserMsgService
} from "./chunk-WYZGJ7UG.js";
import {
  LoggingService
} from "./chunk-OYT4PDSG.js";
import {
  ActivatedRoute,
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  DecimalPipe,
  DestroyRef,
  Injectable,
  Injector,
  NgForOf,
  NgIf,
  Router,
  ViewChild,
  ViewChildren,
  __async,
  __objRest,
  __spreadProps,
  __spreadValues,
  computed,
  effect,
  inject,
  input,
  output,
  runInInjectionContext,
  setClassMetadata,
  signal,
  take,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵloadQuery,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵpipeBind2,
  ɵɵproperty,
  ɵɵqueryRefresh,
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
  ɵɵviewQuery
} from "./chunk-GCYOWW7U.js";

// src/app/core/services/conversion.service.ts
var ConversionService = class _ConversionService {
  /**
   * Calculates the Net Cost per base unit (gram/ml)
   * Formula: Gross Price / (Total Quantity * Yield Factor)
   */
  calculateNetCost(grossPrice, convFactor, wastePercent) {
    if (!grossPrice || convFactor <= 0)
      return 0;
    const yieldFactor = 1 - wastePercent / 100;
    const netQuantity = convFactor * yieldFactor;
    return netQuantity > 0 ? grossPrice / netQuantity : 0;
  }
  /**
   * Translates waste percentage to quantity based on total scaling amount
   */
  getWasteQuantity(percent, total) {
    return percent / 100 * total;
  }
  /**
   * Translates waste quantity to percentage based on total scaling amount
   */
  getWastePercent(quantity, total) {
    return total > 0 ? quantity / total * 100 : 0;
  }
  /**
   * Calculates scaling chain logic (e.g., 1 Case = 6 Buckets)
   */
  getChainConversion(amount, factor) {
    return amount * factor;
  }
  /** * Logic to sync Waste % and Yield Factor
   */
  handleWasteChange(wastePercent) {
    if (wastePercent === null || wastePercent === "") {
      return { yieldFactor: 1 };
    }
    const val = parseFloat(String(wastePercent));
    if (isNaN(val))
      return { yieldFactor: 1 };
    const yieldFactor = Math.max(0, (100 - val) / 100);
    return { yieldFactor: parseFloat(yieldFactor.toFixed(4)) };
  }
  handleYieldChange(yieldFactor) {
    const val = parseFloat(String(yieldFactor));
    if (isNaN(val))
      return { wastePercent: 0 };
    const wastePercent = Math.max(0, 100 - val * 100);
    return { wastePercent: Math.round(wastePercent) };
  }
  /**
   * Calculates suggested price for a purchase unit based on global price and conversion rate
   */
  getSuggestedPurchasePrice(globalPrice, conversionRate) {
    if (!globalPrice)
      return 0;
    return globalPrice;
  }
  static \u0275fac = function ConversionService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ConversionService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ConversionService, factory: _ConversionService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ConversionService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/core/services/util.service.ts
var UtilService = class _UtilService {
  makeId(length = 6) {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    return result;
  }
  getEmptyProduct() {
    return {
      _id: "",
      name_hebrew: "",
      categories_: [],
      supplierIds_: [],
      buy_price_global_: 0,
      base_unit_: "gram",
      purchase_options_: [],
      yield_factor_: 1,
      allergens_: [],
      min_stock_level_: 0,
      expiry_days_default_: 0,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  static \u0275fac = function UtilService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _UtilService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _UtilService, factory: _UtilService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UtilService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/app/core/services/add-supplier-flow.service.ts
var AddSupplierFlowService = class _AddSupplierFlowService {
  supplierDataService = inject(SupplierDataService);
  userMsgService = inject(UserMsgService);
  translationService = inject(TranslationService);
  translationKeyModal = inject(TranslationKeyModalService);
  addItemModal = inject(AddItemModalService);
  open() {
    return __async(this, null, function* () {
      const nameHebrew = yield this.addItemModal.open({
        title: "add_supplier",
        label: "supplier",
        saveLabel: "save_supplier"
      });
      if (!nameHebrew?.trim())
        return null;
      if (!this.translationService.isHebrewLabelDuplicate(nameHebrew)) {
        const result = yield this.translationKeyModal.open(nameHebrew, "supplier");
        if (!isTranslationKeyResult(result))
          return null;
        this.translationService.updateDictionary(result.englishKey, result.hebrewLabel);
      }
      try {
        const saved = yield this.supplierDataService.addSupplier({
          name_hebrew: nameHebrew,
          min_order_mov_: 0,
          lead_time_days_: 0,
          delivery_days_: []
        });
        this.userMsgService.onSetSuccessMsg(`\u05D4\u05E1\u05E4\u05E7 "${nameHebrew}" \u05E0\u05D5\u05E1\u05E3 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`);
        return saved;
      } catch {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05D5\u05E1\u05E4\u05EA \u05D4\u05E1\u05E4\u05E7");
        return null;
      }
    });
  }
  static \u0275fac = function AddSupplierFlowService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AddSupplierFlowService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AddSupplierFlowService, factory: _AddSupplierFlowService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AddSupplierFlowService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/shared/chip-search-dropdown/chip-search-dropdown.component.ts
var _c0 = ["searchInput"];
var _c1 = ["dropdownItem"];
function ChipSearchDropdownComponent_For_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "span", 7);
    \u0275\u0275listener("click", function ChipSearchDropdownComponent_For_3_Template_span_click_0_listener($event) {
      const item_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext();
      ctx_r3.remove.emit(item_r3);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(1);
    \u0275\u0275element(2, "lucide-icon", 8);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r3 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275classMap(ctx_r3.chipClass());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r3.displayFn()(item_r3), " ");
  }
}
function ChipSearchDropdownComponent_Conditional_6_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 13, 1);
    \u0275\u0275listener("click", function ChipSearchDropdownComponent_Conditional_6_For_2_Template_div_click_0_listener($event) {
      const opt_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      ctx_r3.add.emit(opt_r7);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const opt_r7 = ctx.$implicit;
    const \u0275$index_16_r8 = ctx.$index;
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("dropdown-item--highlight", ctx_r3.highlightIndex_() === \u0275$index_16_r8);
    \u0275\u0275property("id", "csd-option-" + \u0275$index_16_r8);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r3.displayFn()(opt_r7), " ");
  }
}
function ChipSearchDropdownComponent_Conditional_6_Conditional_3_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275textInterpolate1(' "', ctx_r3.searchQuery_(), '" ');
  }
}
function ChipSearchDropdownComponent_Conditional_6_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 14, 1);
    \u0275\u0275listener("click", function ChipSearchDropdownComponent_Conditional_6_Conditional_3_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r3 = \u0275\u0275nextContext(2);
      ctx_r3.emitAddNew();
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(2);
    \u0275\u0275template(3, ChipSearchDropdownComponent_Conditional_6_Conditional_3_Conditional_3_Template, 1, 1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("dropdown-item--highlight", ctx_r3.highlightIndex_() === ctx_r3.filteredOptions_().length);
    \u0275\u0275property("id", "csd-option-" + ctx_r3.filteredOptions_().length);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" + ", ctx_r3.addNewLabel(), "");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r3.searchQuery_().trim() ? 3 : -1);
  }
}
function ChipSearchDropdownComponent_Conditional_6_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 12);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r3.noOptionsLabel());
  }
}
function ChipSearchDropdownComponent_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-scrollable-dropdown", 9);
    \u0275\u0275listener("keydown", function ChipSearchDropdownComponent_Conditional_6_Template_app_scrollable_dropdown_keydown_0_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onDropdownKeydown($event));
    });
    \u0275\u0275repeaterCreate(1, ChipSearchDropdownComponent_Conditional_6_For_2_Template, 3, 4, "div", 10, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275template(3, ChipSearchDropdownComponent_Conditional_6_Conditional_3_Template, 4, 5, "div", 11)(4, ChipSearchDropdownComponent_Conditional_6_Conditional_4_Template, 2, 1, "div", 12);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275property("maxHeight", 200);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r3.filteredOptions_());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r3.hasAddNew_() ? 3 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r3.noOptionsLabel() && ctx_r3.filteredOptions_().length === 0 && !ctx_r3.searchQuery_().trim() ? 4 : -1);
  }
}
var ChipSearchDropdownComponent = class _ChipSearchDropdownComponent {
  // ── Inputs ──────────────────────────────────────────────────────────────────
  options = input([]);
  selected = input([]);
  displayFn = input((k) => k);
  searchFilterFn = input(null);
  placeholder = input("");
  addNewLabel = input(null);
  showAddNewAlways = input(false);
  chipClass = input("chipe");
  noOptionsLabel = input(null);
  // ── Outputs ─────────────────────────────────────────────────────────────────
  add = output();
  remove = output();
  addNew = output();
  blurred = output();
  // ── View refs ────────────────────────────────────────────────────────────────
  dropdownItems;
  searchInputRef;
  // ── Internal state ───────────────────────────────────────────────────────────
  searchQuery_ = signal("");
  showDropdown_ = signal(false);
  highlightIndex_ = signal(-1);
  focusPending_ = false;
  // ── Computed ─────────────────────────────────────────────────────────────────
  filteredOptions_ = computed(() => {
    const raw = this.searchQuery_().trim();
    const opts = this.options();
    if (!raw)
      return opts;
    const customFilter = this.searchFilterFn();
    if (customFilter)
      return opts.filter((o) => customFilter(o, raw));
    const qLower = raw.toLowerCase();
    const isHebrew = /[\u0590-\u05FF]/.test(raw);
    const isLatin = /[a-zA-Z]/.test(raw);
    const display = this.displayFn();
    return opts.filter((o) => {
      const label = display(o);
      if (isHebrew)
        return label.startsWith(raw);
      if (isLatin)
        return /[a-zA-Z]/.test(label) && label.toLowerCase().startsWith(qLower);
      return label.toLowerCase().startsWith(qLower);
    });
  });
  hasAddNew_ = computed(() => {
    if (this.addNewLabel() == null)
      return false;
    const query = this.searchQuery_().trim();
    if (!query)
      return this.showAddNewAlways();
    const display = this.displayFn();
    const inOptions = this.options().some((o) => display(o).toLowerCase() === query.toLowerCase());
    const inSelected = this.selected().some((s) => display(s).toLowerCase() === query.toLowerCase());
    return !inOptions && !inSelected;
  });
  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngAfterViewChecked() {
    if (this.focusPending_ && this.showDropdown_()) {
      this.focusPending_ = false;
      const idx = this.highlightIndex_();
      const items = this.dropdownItems;
      if (items?.length && idx >= 0 && idx < items.length) {
        items.get(idx)?.nativeElement?.focus();
      }
    }
  }
  // ── Protected methods ─────────────────────────────────────────────────────────
  openDropdown() {
    this.showDropdown_.set(true);
    this.highlightIndex_.set(-1);
  }
  closeDropdown() {
    this.showDropdown_.set(false);
    this.searchQuery_.set("");
    this.highlightIndex_.set(-1);
  }
  onBoxClick(ev) {
    if (ev.target.closest?.(".chipe"))
      return;
    this.openDropdown();
    setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 0);
  }
  onBlurred() {
    this.closeDropdown();
    this.blurred.emit();
  }
  onInputKeydown(ev) {
    const key = ev.key;
    if (key === "ArrowDown") {
      ev.preventDefault();
      if (!this.showDropdown_())
        this.openDropdown();
      this.highlightIndex_.set(0);
      this.focusPending_ = true;
    } else if (key === "ArrowUp") {
      ev.preventDefault();
      if (!this.showDropdown_())
        this.openDropdown();
      const total = this.filteredOptions_().length + (this.hasAddNew_() ? 1 : 0);
      this.highlightIndex_.set(Math.max(0, total - 1));
      this.focusPending_ = true;
    } else if (key === "Escape") {
      this.closeDropdown();
    }
  }
  onDropdownKeydown(ev) {
    if (!this.showDropdown_())
      return;
    const key = ev.key;
    const filtered = this.filteredOptions_();
    const hasAddNew = this.hasAddNew_();
    const total = filtered.length + (hasAddNew ? 1 : 0);
    if (key === "Escape") {
      ev.preventDefault();
      this.closeDropdown();
      this.searchInputRef?.nativeElement?.focus();
      return;
    }
    if (total === 0)
      return;
    if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Enter" && key !== " ")
      return;
    ev.preventDefault();
    let idx = this.highlightIndex_();
    if (key === "ArrowDown") {
      idx = idx < total - 1 ? idx + 1 : 0;
      this.highlightIndex_.set(idx);
      this.focusItem(idx);
    } else if (key === "ArrowUp") {
      idx = idx > 0 ? idx - 1 : total - 1;
      this.highlightIndex_.set(idx);
      this.focusItem(idx);
    } else if (key === "Enter" || key === " ") {
      if (idx >= 0 && idx < filtered.length) {
        this.add.emit(filtered[idx]);
      } else if (hasAddNew && idx === filtered.length) {
        this.emitAddNew();
      }
      this.searchInputRef?.nativeElement?.focus();
    }
  }
  emitAddNew() {
    this.addNew.emit(this.searchQuery_().trim());
    this.searchQuery_.set("");
    this.highlightIndex_.set(-1);
  }
  // ── Private methods ───────────────────────────────────────────────────────────
  focusItem(index) {
    setTimeout(() => {
      const items = this.dropdownItems;
      if (items?.length && index >= 0 && index < items.length) {
        items.get(index)?.nativeElement?.focus();
      }
    }, 0);
  }
  static \u0275fac = function ChipSearchDropdownComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ChipSearchDropdownComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ChipSearchDropdownComponent, selectors: [["app-chip-search-dropdown"]], viewQuery: function ChipSearchDropdownComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuery(_c0, 5);
      \u0275\u0275viewQuery(_c1, 5);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.searchInputRef = _t.first);
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.dropdownItems = _t);
    }
  }, inputs: { options: [1, "options"], selected: [1, "selected"], displayFn: [1, "displayFn"], searchFilterFn: [1, "searchFilterFn"], placeholder: [1, "placeholder"], addNewLabel: [1, "addNewLabel"], showAddNewAlways: [1, "showAddNewAlways"], chipClass: [1, "chipClass"], noOptionsLabel: [1, "noOptionsLabel"] }, outputs: { add: "add", remove: "remove", addNew: "addNew", blurred: "blurred" }, decls: 7, vars: 5, consts: [["searchInput", ""], ["dropdownItem", ""], [1, "csd-box", 3, "clickOutside", "click"], [1, "csd-chips-and-input"], [3, "class"], ["type", "text", 1, "csd-input", "form-input--no-focus-ring", 3, "input", "focus", "keydown", "value", "placeholder"], ["role", "listbox", 3, "maxHeight"], [3, "click"], ["name", "x", 1, "icon"], ["role", "listbox", 3, "keydown", "maxHeight"], ["tabindex", "-1", "role", "option", 1, "dropdown-item", 3, "id", "dropdown-item--highlight"], ["tabindex", "-1", "role", "option", 1, "dropdown-item", "dropdown-item--add-new", 3, "id", "dropdown-item--highlight"], [1, "dropdown-item", "dropdown-item--empty"], ["tabindex", "-1", "role", "option", 1, "dropdown-item", 3, "click", "id"], ["tabindex", "-1", "role", "option", 1, "dropdown-item", "dropdown-item--add-new", 3, "click", "id"]], template: function ChipSearchDropdownComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "div", 2);
      \u0275\u0275listener("clickOutside", function ChipSearchDropdownComponent_Template_div_clickOutside_0_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onBlurred());
      })("click", function ChipSearchDropdownComponent_Template_div_click_0_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onBoxClick($event));
      });
      \u0275\u0275elementStart(1, "div", 3);
      \u0275\u0275repeaterCreate(2, ChipSearchDropdownComponent_For_3_Template, 3, 3, "span", 4, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275elementStart(4, "input", 5, 0);
      \u0275\u0275listener("input", function ChipSearchDropdownComponent_Template_input_input_4_listener($event) {
        \u0275\u0275restoreView(_r1);
        ctx.searchQuery_.set($event.target.value);
        return \u0275\u0275resetView(ctx.highlightIndex_.set(-1));
      })("focus", function ChipSearchDropdownComponent_Template_input_focus_4_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.openDropdown());
      })("keydown", function ChipSearchDropdownComponent_Template_input_keydown_4_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onInputKeydown($event));
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275template(6, ChipSearchDropdownComponent_Conditional_6_Template, 5, 3, "app-scrollable-dropdown", 6);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275classProp("no-chips", ctx.selected().length === 0);
      \u0275\u0275advance(2);
      \u0275\u0275repeater(ctx.selected());
      \u0275\u0275advance(2);
      \u0275\u0275property("value", ctx.searchQuery_())("placeholder", ctx.placeholder());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.showDropdown_() ? 6 : -1);
    }
  }, dependencies: [CommonModule, LucideAngularModule, LucideAngularComponent, ClickOutSideDirective, ScrollableDropdownComponent], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n  position: relative;\n}\n.csd-box[_ngcontent-%COMP%] {\n  position: relative;\n  border: 1px solid var(--border-strong);\n  border-radius: var(--radius-sm);\n  padding: 0.25rem 0.75rem;\n  min-height: 2.5rem;\n  background: var(--bg-pure);\n  cursor: text;\n}\n.csd-box[_ngcontent-%COMP%]   .csd-chips-and-input[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.4rem;\n  min-height: 1.5rem;\n}\n.csd-box[_ngcontent-%COMP%]   .csd-input[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 6rem;\n  padding: 0.2rem 0;\n  border: none;\n  border-radius: 0;\n  font-size: 0.9rem;\n  outline: none;\n  background: transparent;\n}\n.csd-box.no-chips[_ngcontent-%COMP%]   .csd-chips-and-input[_ngcontent-%COMP%] {\n  min-height: auto;\n}\n.csd-box[_ngcontent-%COMP%]   app-scrollable-dropdown[_ngcontent-%COMP%]     .dropdown-item {\n  padding: 0.6rem 1rem;\n  cursor: pointer;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  transition: background 0.2s ease;\n}\n.csd-box[_ngcontent-%COMP%]   app-scrollable-dropdown[_ngcontent-%COMP%]     .dropdown-item:hover {\n  background: var(--bg-glass);\n}\n.csd-box[_ngcontent-%COMP%]   app-scrollable-dropdown[_ngcontent-%COMP%]     .dropdown-item.dropdown-item--highlight {\n  background: var(--border-default);\n}\n.csd-box[_ngcontent-%COMP%]   app-scrollable-dropdown[_ngcontent-%COMP%]     .dropdown-item.selected {\n  color: var(--color-primary);\n  font-weight: 600;\n}\n.csd-box[_ngcontent-%COMP%]   app-scrollable-dropdown[_ngcontent-%COMP%]     .dropdown-item.dropdown-item--add-new {\n  color: var(--text-success);\n  font-weight: 700;\n}\n.csd-box[_ngcontent-%COMP%]   app-scrollable-dropdown[_ngcontent-%COMP%]     .dropdown-item.dropdown-item--empty {\n  color: var(--color-text-muted);\n  font-style: italic;\n}\n/*# sourceMappingURL=chip-search-dropdown.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ChipSearchDropdownComponent, [{
    type: Component,
    args: [{ selector: "app-chip-search-dropdown", standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [CommonModule, LucideAngularModule, ClickOutSideDirective, ScrollableDropdownComponent], template: `<div class="csd-box"\r
     [class.no-chips]="selected().length === 0"\r
     (clickOutside)="onBlurred()"\r
     (click)="onBoxClick($event)">\r
\r
  <div class="csd-chips-and-input">\r
    @for (item of selected(); track item) {\r
      <span [class]="chipClass()" (click)="remove.emit(item); $event.stopPropagation()">\r
        {{ displayFn()(item) }}\r
        <lucide-icon name="x" class="icon"></lucide-icon>\r
      </span>\r
    }\r
    <input #searchInput\r
           type="text"\r
           class="csd-input form-input--no-focus-ring"\r
           [value]="searchQuery_()"\r
           (input)="searchQuery_.set($any($event.target).value); highlightIndex_.set(-1)"\r
           (focus)="openDropdown()"\r
           (keydown)="onInputKeydown($event)"\r
           [placeholder]="placeholder()" />\r
  </div>\r
\r
  @if (showDropdown_()) {\r
    <app-scrollable-dropdown [maxHeight]="200"\r
                             (keydown)="onDropdownKeydown($event)"\r
                             role="listbox">\r
      @for (opt of filteredOptions_(); track opt; let i = $index) {\r
        <div class="dropdown-item"\r
             #dropdownItem\r
             [id]="'csd-option-' + i"\r
             [class.dropdown-item--highlight]="highlightIndex_() === i"\r
             tabindex="-1"\r
             role="option"\r
             (click)="add.emit(opt); $event.stopPropagation()">\r
          {{ displayFn()(opt) }}\r
        </div>\r
      }\r
      @if (hasAddNew_()) {\r
        <div class="dropdown-item dropdown-item--add-new"\r
             #dropdownItem\r
             [id]="'csd-option-' + filteredOptions_().length"\r
             [class.dropdown-item--highlight]="highlightIndex_() === filteredOptions_().length"\r
             tabindex="-1"\r
             role="option"\r
             (click)="emitAddNew(); $event.stopPropagation()">\r
          + {{ addNewLabel() }}@if (searchQuery_().trim()) { "{{ searchQuery_() }}" }\r
        </div>\r
      }\r
      @if (noOptionsLabel() && filteredOptions_().length === 0 && !searchQuery_().trim()) {\r
        <div class="dropdown-item dropdown-item--empty">{{ noOptionsLabel() }}</div>\r
      }\r
    </app-scrollable-dropdown>\r
  }\r
</div>\r
`, styles: ["/* src/app/shared/chip-search-dropdown/chip-search-dropdown.component.scss */\n:host {\n  display: block;\n  position: relative;\n}\n.csd-box {\n  position: relative;\n  border: 1px solid var(--border-strong);\n  border-radius: var(--radius-sm);\n  padding: 0.25rem 0.75rem;\n  min-height: 2.5rem;\n  background: var(--bg-pure);\n  cursor: text;\n}\n.csd-box .csd-chips-and-input {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.4rem;\n  min-height: 1.5rem;\n}\n.csd-box .csd-input {\n  flex: 1;\n  min-width: 6rem;\n  padding: 0.2rem 0;\n  border: none;\n  border-radius: 0;\n  font-size: 0.9rem;\n  outline: none;\n  background: transparent;\n}\n.csd-box.no-chips .csd-chips-and-input {\n  min-height: auto;\n}\n.csd-box app-scrollable-dropdown ::ng-deep .dropdown-item {\n  padding: 0.6rem 1rem;\n  cursor: pointer;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  transition: background 0.2s ease;\n}\n.csd-box app-scrollable-dropdown ::ng-deep .dropdown-item:hover {\n  background: var(--bg-glass);\n}\n.csd-box app-scrollable-dropdown ::ng-deep .dropdown-item.dropdown-item--highlight {\n  background: var(--border-default);\n}\n.csd-box app-scrollable-dropdown ::ng-deep .dropdown-item.selected {\n  color: var(--color-primary);\n  font-weight: 600;\n}\n.csd-box app-scrollable-dropdown ::ng-deep .dropdown-item.dropdown-item--add-new {\n  color: var(--text-success);\n  font-weight: 700;\n}\n.csd-box app-scrollable-dropdown ::ng-deep .dropdown-item.dropdown-item--empty {\n  color: var(--color-text-muted);\n  font-style: italic;\n}\n/*# sourceMappingURL=chip-search-dropdown.component.css.map */\n"] }]
  }], null, { dropdownItems: [{
    type: ViewChildren,
    args: ["dropdownItem"]
  }], searchInputRef: [{
    type: ViewChild,
    args: ["searchInput"]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ChipSearchDropdownComponent, { className: "ChipSearchDropdownComponent", filePath: "src/app/shared/chip-search-dropdown/chip-search-dropdown.component.ts", lineNumber: 27 });
})();

// src/app/pages/inventory/components/product-form/product-form.component.ts
var _c02 = ["productNameInput"];
function ProductFormComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "h2", 4);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(2, 2, "edit_product_title"), ": ", (tmp_2_0 = (tmp_2_0 = (tmp_2_0 = ctx_r1.productForm_.get("productName")) == null ? null : tmp_2_0.value) !== null && tmp_2_0 !== void 0 ? tmp_2_0 : (tmp_2_0 = ctx_r1.initialProduct_()) == null ? null : tmp_2_0.name_hebrew) !== null && tmp_2_0 !== void 0 ? tmp_2_0 : "", "");
  }
}
function ProductFormComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "h2", 4);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p", 50);
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 2, "add_product_inventory_title"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(5, 4, "add_product_subtitle"));
  }
}
function ProductFormComponent_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 8);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "duplicate_product_name_error"));
  }
}
function ProductFormComponent_div_41_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "input", 65);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275listener("blur", function ProductFormComponent_div_41_Conditional_23_Template_input_blur_0_listener() {
      \u0275\u0275restoreView(_r5);
      const option_r6 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onPriceOverrideBlur(option_r6));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 56);
    \u0275\u0275text(3, "\u20AA");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275property("placeholder", \u0275\u0275pipeBind1(1, 1, "price"));
  }
}
function ProductFormComponent_div_41_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 64);
    \u0275\u0275element(1, "lucide-icon", 66);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(3, 1, "purchase_unit_details_invalid"), " ");
  }
}
function ProductFormComponent_div_41_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 51)(1, "div", 52)(2, "div", 53)(3, "app-custom-select", 54);
    \u0275\u0275listener("valueChange", function ProductFormComponent_div_41_Template_app_custom_select_valueChange_3_listener($event) {
      const idx_r4 = \u0275\u0275restoreView(_r3).index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onUnitSymbolValueChange($event, idx_r4));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "div", 53)(5, "label", 55)(6, "span", 56);
    \u0275\u0275text(7, "=");
    \u0275\u0275elementEnd();
    \u0275\u0275element(8, "input", 57);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275pipe(10, "translatePipe");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 53)(12, "label", 55)(13, "span", 56);
    \u0275\u0275text(14, ":");
    \u0275\u0275elementEnd();
    \u0275\u0275element(15, "app-custom-select", 58);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "div", 59)(17, "span", 56);
    \u0275\u0275text(18);
    \u0275\u0275pipe(19, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "label", 60);
    \u0275\u0275element(21, "input", 61);
    \u0275\u0275pipe(22, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(23, ProductFormComponent_div_41_Conditional_23_Template, 4, 3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "button", 62);
    \u0275\u0275pipe(25, "translatePipe");
    \u0275\u0275listener("click", function ProductFormComponent_div_41_Template_button_click_24_listener() {
      const idx_r4 = \u0275\u0275restoreView(_r3).index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onDeletePurchaseOption(idx_r4));
    });
    \u0275\u0275element(26, "lucide-icon", 63);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(27, ProductFormComponent_div_41_Conditional_27_Template, 4, 3, "div", 64);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_6_0;
    let tmp_10_0;
    let tmp_13_0;
    let tmp_15_0;
    let tmp_19_0;
    const option_r6 = ctx.$implicit;
    const idx_r4 = ctx.index;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("row-invalid", option_r6.invalid && (option_r6.dirty || ctx_r1.isSubmitted));
    \u0275\u0275property("formGroupName", idx_r4);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("field-error", ((tmp_6_0 = option_r6.get("unit_symbol_")) == null ? null : tmp_6_0.invalid) && (((tmp_6_0 = option_r6.get("unit_symbol_")) == null ? null : tmp_6_0.dirty) || ctx_r1.isSubmitted));
    \u0275\u0275advance();
    \u0275\u0275property("options", ctx_r1.unitSymbolOptions_())("typeToFilter", true)("addNewValue", "NEW_UNIT");
    \u0275\u0275advance();
    \u0275\u0275classProp("field-error", ((tmp_10_0 = option_r6.get("conversion_rate_")) == null ? null : tmp_10_0.invalid) && (((tmp_10_0 = option_r6.get("conversion_rate_")) == null ? null : tmp_10_0.dirty) || ctx_r1.isSubmitted));
    \u0275\u0275advance(4);
    \u0275\u0275property("placeholder", \u0275\u0275pipeBind1(9, 22, "quantity"));
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(10, 24, "quantity"));
    \u0275\u0275advance(3);
    \u0275\u0275classProp("field-error", ((tmp_13_0 = option_r6.get("uom")) == null ? null : tmp_13_0.invalid) && (((tmp_13_0 = option_r6.get("uom")) == null ? null : tmp_13_0.dirty) || ctx_r1.isSubmitted));
    \u0275\u0275advance(4);
    \u0275\u0275property("options", ctx_r1.uomOptions_())("placeholder", ((tmp_15_0 = ctx_r1.productForm_.get("base_unit_")) == null ? null : tmp_15_0.value) || "compare_to_unit")("typeToFilter", true);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(19, 26, "special_purchase_price"));
    \u0275\u0275advance(3);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(22, 28, "special_purchase_price"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(((tmp_19_0 = option_r6.get("show_special_price_")) == null ? null : tmp_19_0.value) ? 23 : -1);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(25, 30, "remove"));
    \u0275\u0275advance(3);
    \u0275\u0275conditional(option_r6.invalid && (option_r6.dirty || ctx_r1.isSubmitted) ? 27 : -1);
  }
}
function ProductFormComponent_div_100_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 67)(1, "span", 68);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 69);
    \u0275\u0275text(5);
    \u0275\u0275pipe(6, "number");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 2, "net_cost_calculated_with_waste"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("\u20AA", \u0275\u0275pipeBind2(6, 4, ctx_r1.netUnitCost_(), "1.2-2"), "");
  }
}
function ProductFormComponent_Conditional_136_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 48);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
var ProductFormComponent = class _ProductFormComponent {
  initialProduct_ = input(null);
  productNameInputRef;
  fb_ = inject(FormBuilder);
  conversionService = inject(ConversionService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  kitchenStateService = inject(KitchenStateService);
  utilService = inject(UtilService);
  metadataRegistry = inject(MetadataRegistryService);
  translationService = inject(TranslationService);
  translationKeyModal = inject(TranslationKeyModalService);
  addSupplierFlowService = inject(AddSupplierFlowService);
  userMsgService = inject(UserMsgService);
  injector = inject(Injector);
  confirmModal = inject(ConfirmModalService);
  destroyRef = inject(DestroyRef);
  logging = inject(LoggingService);
  unitRegistry = inject(UnitRegistryService);
  categoryOptions_ = computed(() => this.metadataRegistry.allCategories_());
  suppliers_ = computed(() => this.kitchenStateService.suppliers_());
  availableUnits_ = computed(() => this.unitRegistry.allUnitKeys_());
  baseUnitOptions_ = computed(() => [
    ...this.unitRegistry.allUnitKeys_().map((k) => ({ value: k, label: k })),
    { value: "NEW_UNIT", label: "add_new_unit" }
  ]);
  unitSymbolOptions_ = computed(() => [
    { value: "", label: "choose_unit" },
    ...this.availableUnits_().map((u) => ({ value: u, label: u })),
    { value: "NEW_UNIT", label: "add_new_unit" }
  ]);
  uomOptions_ = computed(() => this.availableUnits_().map((u) => ({ value: u, label: u })));
  allergenOptions_ = computed(() => this.metadataRegistry.allAllergens_());
  isEditMode_ = signal(false);
  saving = useSavingState();
  isSaving_ = this.saving.isSaving_;
  curProduct_ = signal(null);
  isBaseUnitMode_ = signal(false);
  //SIMPLE VALUES
  formValue_;
  productForm_;
  /** Snapshot of form value when user entered the item (for hasRealChanges). */
  initialFormSnapshot_ = null;
  isSubmitted = false;
  // Tracks per-row state for purchase options (e.g., whether a manual override was confirmed)
  purchaseOptionState_ = /* @__PURE__ */ new WeakMap();
  //COMPUTED
  netUnitCost_ = computed(() => {
    if (!this.formValue_)
      return 0;
    const currentForm = this.formValue_();
    const price = currentForm?.buy_price_global_ || 0;
    const yieldFactor = currentForm?.yield_factor_ || 1;
    return yieldFactor > 0 ? price / yieldFactor : 0;
  });
  selectedAllergensSignal_ = computed(() => {
    return this.formValue_()?.allergens_ || [];
  });
  activeRowIndex_ = signal(null);
  filteredAllergenOptions_ = computed(() => {
    const all = this.metadataRegistry.allAllergens_();
    const selected = this.selectedAllergensSignal_() || [];
    return all.filter((allergen) => !selected.includes(allergen));
  });
  filteredCategoryOptions_ = computed(() => {
    const all = this.metadataRegistry.allCategories_();
    const selected = this.formValue_?.()?.categories_ ?? [];
    return all.filter((c) => !selected.includes(c));
  });
  filteredSupplierOptions_ = computed(() => {
    const all = this.kitchenStateService.suppliers_();
    const selectedIds = this.formValue_?.()?.supplierIds_ ?? [];
    return all.filter((s) => !selectedIds.includes(s._id));
  });
  filteredSupplierIds_ = computed(() => this.filteredSupplierOptions_().map((s) => s._id));
  translateFn = (key) => this.translationService.translate(key);
  supplierDisplayFn = (id) => this.getSupplierName(id);
  expandedMinStock_ = signal(false);
  expandedExpiryDays_ = signal(false);
  expandedWasteYield_ = signal(false);
  expandedAllergens_ = signal(false);
  expandedSupplier_ = signal(false);
  toggleMinStock() {
    this.expandedMinStock_.update((v) => !v);
  }
  toggleExpiryDays() {
    this.expandedExpiryDays_.update((v) => !v);
  }
  toggleWasteYield() {
    this.expandedWasteYield_.update((v) => !v);
  }
  toggleAllergens() {
    this.expandedAllergens_.update((v) => !v);
  }
  toggleSupplier() {
    this.expandedSupplier_.update((v) => !v);
  }
  onSupplierBlur(clickTarget) {
    if (clickTarget?.closest?.(".collapsible-field__header--btn"))
      return;
    if (this.selectedSupplierIds_().length === 0) {
      this.expandedSupplier_.set(false);
    }
  }
  onMinStockBlur(clickTarget) {
    if (clickTarget?.closest?.(".collapsible-field__header--btn"))
      return;
    const val = this.productForm_.get("min_stock_level_")?.value;
    if (val == null || val === 0 || val === "") {
      this.expandedMinStock_.set(false);
    }
  }
  onExpiryDaysBlur(clickTarget) {
    if (clickTarget?.closest?.(".collapsible-field__header--btn"))
      return;
    const val = this.productForm_.get("expiry_days_default_")?.value;
    if (val == null || val === 0 || val === "") {
      this.expandedExpiryDays_.set(false);
    }
  }
  onAllergensBlur(clickTarget) {
    if (clickTarget?.closest?.(".collapsible-field__header--btn"))
      return;
    const allergens = this.productForm_.get("allergens_")?.value || [];
    if (allergens.length === 0) {
      this.expandedAllergens_.set(false);
    }
  }
  onWasteYieldBlur(clickTarget) {
    if (clickTarget?.closest?.(".collapsible-field__header--btn"))
      return;
    const waste = this.productForm_.get("waste_percent_")?.value;
    const yieldVal = this.productForm_.get("yield_factor_")?.value;
    const isDefault = (waste == null || waste === 0) && (yieldVal == null || yieldVal === 1);
    if (isDefault) {
      this.expandedWasteYield_.set(false);
    }
  }
  ngAfterViewInit() {
    setTimeout(() => this.productNameInputRef?.nativeElement?.focus(), 0);
  }
  constructor() {
    effect(() => {
      const allUnits = this.unitRegistry.allUnitKeys_();
      const isCreatorOpen = this.unitRegistry.isCreatorOpen_();
      const index = this.activeRowIndex_();
      const isBase = this.isBaseUnitMode_();
      if (!isCreatorOpen) {
        const lastUnitName = Array.from(allUnits.keys()).pop();
        if (!lastUnitName)
          return;
        if (isBase) {
          this.productForm_.get("base_unit_")?.setValue(lastUnitName);
          this.isBaseUnitMode_.set(false);
        } else if (index !== null) {
          const row = this.purchaseOptions_.at(index);
          const currentBase = this.productForm_.get("base_unit_")?.value;
          row.patchValue({
            unit_symbol_: lastUnitName,
            uom: currentBase
          });
          this.activeRowIndex_.set(null);
        }
      }
    });
  }
  ngOnInit() {
    this.unitRegistry.refreshFromStorage();
    this.initForm();
    runInInjectionContext(this.injector, () => {
      this.formValue_ = toSignal(this.productForm_.valueChanges, {
        initialValue: this.productForm_.getRawValue()
      });
    });
    const productData = this.initialProduct_();
    if (productData) {
      this.hydrateForm(productData);
    } else {
      this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ product }) => {
        if (product) {
          this.hydrateForm(product);
        } else {
          this.isEditMode_.set(false);
          this.curProduct_.set(this.utilService.getEmptyProduct());
          this.productForm_.patchValue({ base_unit_: "kg" });
          this.initialFormSnapshot_ = this.getFormSnapshotForComparison();
        }
      });
    }
    this.unitRegistry.unitAdded$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((unitKey) => {
      const idx = this.activeRowIndex_();
      if (idx === null || idx === void 0)
        return;
      const baseUnit = this.productForm_.get("base_unit_")?.value ?? "";
      const baseFactor = this.unitRegistry.getConversion(baseUnit) || 1;
      const unitFactor = this.unitRegistry.getConversion(unitKey) || 1;
      const conversion_rate_ = baseFactor > 0 && unitFactor > 0 ? unitFactor / baseFactor : 1;
      const suggestedPrice = this.conversionService.getSuggestedPurchasePrice(this.productForm_.get("buy_price_global_")?.value || 0, conversion_rate_);
      const row = this.purchaseOptions_.at(idx);
      if (row) {
        row.patchValue({
          unit_symbol_: unitKey,
          uom: baseUnit,
          conversion_rate_,
          price_override_: suggestedPrice
        }, { emitEvent: false });
        this.productForm_.markAsDirty();
      }
      this.activeRowIndex_.set(null);
    });
  }
  initForm() {
    this.productForm_ = this.fb_.group({
      productName: ["", [
        Validators.required,
        duplicateNameValidator(() => this.kitchenStateService.products_(), () => this.curProduct_()?._id ?? null)
      ]],
      base_unit_: ["", Validators.required],
      buy_price_global_: [0, [Validators.required, Validators.min(0)]],
      categories_: [[], [Validators.required, Validators.minLength(1)]],
      supplierIds_: [[]],
      min_stock_level_: [0, [Validators.min(0)]],
      expiry_days_default_: [0, [Validators.min(0)]],
      yield_factor_: [1, [Validators.required]],
      waste_percent_: [0, [Validators.min(0), Validators.max(99)]],
      allergens_: [[]],
      purchase_options_: this.fb_.array([])
    });
    this.setupWasteLogic();
  }
  // RESTORED WASTE LOGIC
  setupWasteLogic() {
    const percentCtrl = this.productForm_.get("waste_percent_");
    const yieldCtrl = this.productForm_.get("yield_factor_");
    percentCtrl?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pct) => {
      const { yieldFactor } = this.conversionService.handleWasteChange(pct);
      if (yieldCtrl?.value !== yieldFactor) {
        yieldCtrl?.setValue(yieldFactor, { emitEvent: false });
        this.productForm_.get("buy_price_global_")?.updateValueAndValidity();
      }
    });
    yieldCtrl?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((y) => {
      if (y === null || y === void 0)
        return;
      const { wastePercent } = this.conversionService.handleYieldChange(y);
      if (percentCtrl?.value !== wastePercent) {
        percentCtrl?.setValue(wastePercent, { emitEvent: false });
        this.productForm_.get("buy_price_global_")?.updateValueAndValidity();
      }
    });
  }
  // RESTORED MODAL ACTIONS
  onCategoryChange(event) {
    return __async(this, null, function* () {
      const select = event.target;
      const value = select.value;
      if (value === "NEW_CATEGORY") {
        yield this.openAddNewCategory();
      } else if (value) {
        this.addCategory(value);
      }
      select.value = "";
    });
  }
  openAddNewCategory() {
    return __async(this, null, function* () {
      try {
        const result = yield this.translationKeyModal.open("", "category");
        if (!isTranslationKeyResult(result))
          return;
        this.translationService.updateDictionary(result.englishKey, result.hebrewLabel);
        yield this.metadataRegistry.registerCategory(result.hebrewLabel);
        this.addCategory(result.englishKey);
      } catch (err) {
        this.logging.error({ event: "inventory.product.add_category_error", message: "Failed to add category", context: { err } });
      }
    });
  }
  onSupplierChange(event) {
    return __async(this, null, function* () {
      const select = event.target;
      const value = select.value;
      if (value === "ADD_SUPPLIER") {
        yield this.openAddSupplier();
      } else if (value) {
        const ctrl = this.productForm_.get("supplierIds_");
        const current = ctrl?.value || [];
        if (!current.includes(value)) {
          ctrl?.setValue([...current, value]);
        }
      }
      select.value = "";
    });
  }
  openAddSupplier() {
    return __async(this, null, function* () {
      const supplier = yield this.addSupplierFlowService.open();
      if (supplier?._id) {
        const ctrl = this.productForm_.get("supplierIds_");
        const current = ctrl?.value || [];
        if (!current.includes(supplier._id)) {
          ctrl?.setValue([...current, supplier._id]);
        }
      }
    });
  }
  onAddNewAllergen(hebrewLabel) {
    return __async(this, null, function* () {
      if (!hebrewLabel?.trim())
        return;
      const trimmed = hebrewLabel.trim();
      try {
        let englishKey;
        const resolved = this.translationService.resolveAllergen(trimmed);
        if (resolved) {
          englishKey = resolved;
        } else {
          const result = yield this.translationKeyModal.open(trimmed, "allergen");
          if (!isTranslationKeyResult(result))
            return;
          englishKey = result.englishKey;
          yield this.metadataRegistry.registerAllergen(englishKey);
          this.translationService.updateDictionary(englishKey, result.hebrewLabel);
        }
        const current = this.productForm_.get("allergens_")?.value || [];
        if (current.includes(englishKey)) {
          this.userMsgService.onSetErrorMsg(this.translationService.translate("allergen_already_on_product"));
          return;
        }
        this.toggleAllergen(englishKey);
      } catch (err) {
        this.logging.error({ event: "inventory.product.add_allergen_error", message: "Failed to add allergen", context: { err } });
      }
    });
  }
  onBaseUnitValueChange(value) {
    if (value === "NEW_UNIT") {
      this.activeRowIndex_.set(null);
      this.isBaseUnitMode_.set(true);
      this.unitRegistry.openUnitCreator();
      this.productForm_.patchValue({ base_unit_: "" });
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe((newUnit) => {
        this.productForm_.patchValue({ base_unit_: newUnit });
      });
    }
  }
  onUnitSymbolValueChange(value, index) {
    if (value === "NEW_UNIT") {
      this.activeRowIndex_.set(index);
      this.isBaseUnitMode_.set(false);
      const existingSymbols = this.purchaseOptions_.value?.map((o) => o?.unit_symbol_)?.filter(Boolean) ?? [];
      this.unitRegistry.openUnitCreator({ existingUnitSymbols: existingSymbols });
      this.productForm_.get("purchase_options_")?.at(index)?.patchValue({ unit_symbol_: "" });
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe((newUnit) => {
        this.productForm_.get("purchase_options_")?.at(index)?.patchValue({ unit_symbol_: newUnit });
      });
    }
  }
  toggleAllergen(allergen) {
    const ctrl = this.productForm_.get("allergens_");
    const current = ctrl?.value || [];
    const updated = current.includes(allergen) ? current.filter((a) => a !== allergen) : [...current, allergen];
    ctrl?.setValue(updated);
    ctrl?.markAsDirty();
  }
  addCategory(cat) {
    if (!cat?.trim())
      return;
    const ctrl = this.productForm_.get("categories_");
    const current = ctrl?.value || [];
    if (current.includes(cat)) {
      this.userMsgService.onSetErrorMsg(this.translationService.translate("category_already_on_product"));
      return;
    }
    ctrl?.setValue([...current, cat]);
    ctrl?.markAsDirty();
  }
  removeCategory(cat) {
    const ctrl = this.productForm_.get("categories_");
    const current = ctrl?.value || [];
    ctrl?.setValue(current.filter((c) => c !== cat));
    ctrl?.markAsDirty();
  }
  removeSupplierId(id) {
    const ctrl = this.productForm_.get("supplierIds_");
    const current = ctrl?.value || [];
    ctrl?.setValue(current.filter((s) => s !== id));
    ctrl?.markAsDirty();
  }
  addSupplierId(id) {
    if (!id?.trim())
      return;
    const ctrl = this.productForm_.get("supplierIds_");
    const current = ctrl?.value || [];
    if (!current.includes(id)) {
      ctrl?.setValue([...current, id]);
      ctrl?.markAsDirty();
    }
  }
  selectedSupplierIds_() {
    return this.productForm_.get("supplierIds_")?.value || [];
  }
  selectedCategories_() {
    return this.productForm_.get("categories_")?.value || [];
  }
  getSupplierName(supplierId) {
    const supplier = this.kitchenStateService.suppliers_().find((s) => s._id === supplierId);
    return supplier?.name_hebrew ?? supplierId;
  }
  //GETERS
  get purchaseOptions_() {
    return this.productForm_.get("purchase_options_");
  }
  get readProductForm_() {
    return this.productForm_;
  }
  /** For pendingChangesGuard: values on this item (categories, allergens) that are not in the dictionary so we ask for English key in a modal before leaving. */
  getValuesNeedingTranslation() {
    if (!this.productForm_)
      return [];
    const raw = this.productForm_.getRawValue();
    const categories = raw?.categories_ ?? [];
    const allergens = raw?.allergens_ ?? [];
    const combined = [...categories, ...allergens].map((v) => v != null ? String(v).trim() : "").filter((v) => v !== "");
    const unique = [...new Set(combined)];
    return unique.filter((v) => !this.translationService.hasKey(v));
  }
  /** For pendingChangesGuard: remove untranslated values from categories_ and allergens_ when user chooses "continue without saving". */
  removeValuesNeedingTranslation() {
    if (!this.productForm_)
      return;
    const toRemove = this.getValuesNeedingTranslation();
    if (toRemove.length === 0)
      return;
    const catCtrl = this.productForm_.get("categories_");
    const allCtrl = this.productForm_.get("allergens_");
    const currentCat = (catCtrl?.value ?? []).filter((v) => !toRemove.includes(String(v).trim()));
    const currentAll = (allCtrl?.value ?? []).filter((v) => !toRemove.includes(String(v).trim()));
    catCtrl?.setValue(currentCat);
    allCtrl?.setValue(currentAll);
    catCtrl?.markAsDirty();
    allCtrl?.markAsDirty();
  }
  /** For pendingChangesGuard: true when current form value differs from initial state when user entered the item. */
  hasRealChanges() {
    if (!this.productForm_ || this.initialFormSnapshot_ === null)
      return this.productForm_?.dirty ?? false;
    return this.getFormSnapshotForComparison() !== this.initialFormSnapshot_;
  }
  /** Normalized form value for comparison (sorted arrays, comparable purchase_options_). */
  getFormSnapshotForComparison() {
    const raw = this.productForm_.getRawValue();
    const opts = raw?.purchase_options_ ?? [];
    const normalized = {
      productName: raw?.productName ?? "",
      base_unit_: raw?.base_unit_ ?? "",
      buy_price_global_: Number(raw?.buy_price_global_) || 0,
      categories_: [...raw?.categories_ ?? []].sort(),
      supplierIds_: [...raw?.supplierIds_ ?? []].sort(),
      min_stock_level_: Number(raw?.min_stock_level_) ?? 0,
      expiry_days_default_: Number(raw?.expiry_days_default_) ?? 0,
      yield_factor_: Number(raw?.yield_factor_) ?? 1,
      waste_percent_: Number(raw?.waste_percent_) ?? 0,
      allergens_: [...raw?.allergens_ ?? []].sort(),
      purchase_options_: opts.map((o) => ({
        unit_symbol_: o?.unit_symbol_ ?? "",
        conversion_rate_: Number(o?.conversion_rate_) ?? 0,
        uom: o?.uom ?? "",
        price_override_: Number(o?.price_override_) ?? 0
      })).sort((a, b) => (a.unit_symbol_ || "").localeCompare(b.unit_symbol_ || ""))
    };
    return JSON.stringify(normalized);
  }
  addPurchaseOption(opt) {
    const unit = opt?.unit_symbol_ || "";
    const conv = opt ? opt.conversion_rate_ : null;
    const baseUnit = this.productForm_.get("base_unit_")?.value ?? "";
    const uomValue = opt?.uom ?? baseUnit;
    const globalPrice = this.productForm_.get("buy_price_global_")?.value || 0;
    const group = this.fb_.group({
      unit_symbol_: [unit, Validators.required],
      conversion_rate_: [conv, [Validators.required, Validators.min(1e-4)]],
      uom: [uomValue, Validators.required],
      show_special_price_: [!!(opt?.price_override_ != null && Number(opt?.price_override_) !== 0)],
      price_override_: [opt?.price_override_ || 0]
    });
    this.purchaseOptionState_.set(group, { overrideConfirmed: false });
    group.get("unit_symbol_")?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((newUnit) => {
      if (!newUnit || newUnit === "NEW_UNIT") {
        group.patchValue({
          conversion_rate_: null,
          uom: "",
          price_override_: 0
        }, { emitEvent: false });
        return;
      }
      const baseUnitKey = this.productForm_.get("base_unit_")?.value ?? "";
      const baseFactor = this.unitRegistry.getConversion(baseUnitKey) || 1;
      const unitFactor = this.unitRegistry.getConversion(newUnit) || 1;
      const suggestedConv = baseFactor > 0 && unitFactor > 0 ? unitFactor / baseFactor : 1;
      const currentGlobal = this.productForm_.get("buy_price_global_")?.value || 0;
      const currentBaseUnit = this.productForm_.get("base_unit_")?.value ?? "";
      const suggestedPrice = this.conversionService.getSuggestedPurchasePrice(currentGlobal, suggestedConv);
      group.patchValue({
        conversion_rate_: suggestedConv,
        uom: currentBaseUnit,
        // 👈 This fills the empty slot next to 5000
        price_override_: suggestedPrice
      }, { emitEvent: false });
      const state = this.purchaseOptionState_.get(group) || { overrideConfirmed: false };
      state.overrideConfirmed = false;
      this.purchaseOptionState_.set(group, state);
      group.get("price_override_")?.markAsDirty();
    });
    group.get("conversion_rate_")?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((newConv) => {
      if (newConv === null || newConv === void 0)
        return;
      const state = this.purchaseOptionState_.get(group) || { overrideConfirmed: false };
      if (state.overrideConfirmed) {
        return;
      }
      const conventional = this.getConventionalPriceForGroup_(group);
      group.get("price_override_")?.setValue(conventional, { emitEvent: false });
    });
    group.get("show_special_price_")?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((checked) => {
      if (!checked) {
        group.get("price_override_")?.setValue(0, { emitEvent: false });
      }
    });
    this.purchaseOptions_.push(group);
  }
  /** Computes the conventional (auto) price for a row, based on base price and conversion rate. */
  getConventionalPriceForGroup_(group) {
    const basePrice = this.productForm_.get("buy_price_global_")?.value || 0;
    const conv = group.get("conversion_rate_")?.value;
    if (!basePrice || !conv)
      return 0;
    return this.conversionService.getSuggestedPurchasePrice(basePrice, conv);
  }
  /** Called on blur of price_override_ to confirm manual overrides that differ from the conventional value. */
  onPriceOverrideBlur(control) {
    return __async(this, null, function* () {
      const group = control;
      if (!group)
        return;
      const state = this.purchaseOptionState_.get(group) || { overrideConfirmed: false };
      const conventional = this.getConventionalPriceForGroup_(group);
      const current = group.get("price_override_")?.value;
      const epsilon = 1e-4;
      if (current === null || current === "" || isNaN(Number(current))) {
        group.get("price_override_")?.setValue(conventional, { emitEvent: false });
        state.overrideConfirmed = false;
        this.purchaseOptionState_.set(group, state);
        return;
      }
      const numericCurrent = Number(current);
      if (Math.abs(numericCurrent - conventional) <= epsilon) {
        state.overrideConfirmed = false;
        this.purchaseOptionState_.set(group, state);
        return;
      }
      const confirmed = yield this.confirmModal.open("save_price_confirm", {
        title: "save_price"
      });
      if (confirmed) {
        state.overrideConfirmed = true;
        this.purchaseOptionState_.set(group, state);
      } else {
        group.get("price_override_")?.setValue(conventional, { emitEvent: false });
        state.overrideConfirmed = false;
        this.purchaseOptionState_.set(group, state);
      }
    });
  }
  hydrateForm(data) {
    this.isEditMode_.set(true);
    this.curProduct_.set(data);
    const legacy = data;
    const categories_ = data.categories_ ?? (legacy.category_ ? [legacy.category_] : []);
    const withDairy = legacy.is_dairy_ && !categories_.includes("dairy") ? [...categories_, "dairy"] : categories_;
    this.productForm_.patchValue({
      productName: data.name_hebrew,
      base_unit_: data.base_unit_,
      buy_price_global_: data.buy_price_global_,
      categories_: withDairy,
      supplierIds_: data.supplierIds_ ?? [],
      min_stock_level_: data.min_stock_level_ ?? 0,
      expiry_days_default_: data.expiry_days_default_ ?? 0,
      yield_factor_: data.yield_factor_,
      waste_percent_: Math.round((1 - data.yield_factor_) * 100),
      allergens_: data.allergens_ || []
    });
    if ((data.min_stock_level_ ?? 0) > 0)
      this.expandedMinStock_.set(true);
    if ((data.expiry_days_default_ ?? 0) > 0)
      this.expandedExpiryDays_.set(true);
    if (Math.abs((data.yield_factor_ ?? 1) - 1) > 1e-3)
      this.expandedWasteYield_.set(true);
    if ((data.allergens_?.length ?? 0) > 0)
      this.expandedAllergens_.set(true);
    if ((data.supplierIds_?.length ?? 0) > 0)
      this.expandedSupplier_.set(true);
    this.purchaseOptions_.clear();
    if (data.purchase_options_ && data.purchase_options_.length > 0) {
      const baseUom = data.base_unit_ ?? "gram";
      data.purchase_options_.forEach((opt) => {
        this.addPurchaseOption(__spreadProps(__spreadValues({}, opt), { uom: opt.uom ?? baseUom }));
      });
    }
    this.initialFormSnapshot_ = this.getFormSnapshotForComparison();
  }
  onSubmit() {
    if (!this.productForm_.valid) {
      this.productForm_.markAllAsTouched();
      this.userMsgService.onSetErrorMsg("\u05D9\u05E9 \u05DC\u05DE\u05DC\u05D0 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E9\u05D3\u05D5\u05EA \u05D4\u05E0\u05D3\u05E8\u05E9\u05D9\u05DD (\u05E9\u05DD \u05D4\u05E4\u05E8\u05D9\u05D8, \u05D9\u05D7\u05D9\u05D3\u05D4, \u05DE\u05D7\u05D9\u05E8)");
      return;
    }
    const val = this.productForm_.getRawValue();
    const categories = val.categories_ ?? [];
    categories.forEach((cat) => this.metadataRegistry.registerCategory(cat));
    const purchaseOptions = (val.purchase_options_ ?? []).map((opt) => {
      const _a = opt, { show_special_price_: _ } = _a, rest = __objRest(_a, ["show_special_price_"]);
      return rest;
    });
    const productToSave = __spreadProps(__spreadValues({}, this.curProduct_()), {
      name_hebrew: val.productName,
      base_unit_: val.base_unit_,
      buy_price_global_: val.buy_price_global_,
      categories_: categories,
      supplierIds_: val.supplierIds_ ?? [],
      min_stock_level_: val.min_stock_level_ ?? 0,
      expiry_days_default_: val.expiry_days_default_ ?? 0,
      yield_factor_: val.yield_factor_,
      allergens_: val.allergens_,
      purchase_options_: purchaseOptions
    });
    this.saving.setSaving(true);
    this.kitchenStateService.saveProduct(productToSave).subscribe({
      next: () => {
        this.saving.setSaving(false);
        this.isSubmitted = true;
        this.router.navigate(["/inventory/list"]);
      },
      error: () => {
        this.saving.setSaving(false);
        this.isSubmitted = false;
      }
    });
  }
  onCancel() {
    this.router.navigate(["/inventory/list"]);
  }
  //DELETE
  onDeletePurchaseOption(idx) {
    this.purchaseOptions_.removeAt(idx);
    this.productForm_.markAsDirty();
  }
  static \u0275fac = function ProductFormComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ProductFormComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ProductFormComponent, selectors: [["product-form"]], viewQuery: function ProductFormComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuery(_c02, 5);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.productNameInputRef = _t.first);
    }
  }, inputs: { initialProduct_: [1, "initialProduct_"] }, decls: 141, vars: 133, consts: [["productNameInput", ""], [1, "product-form-container"], ["dir", "rtl", 1, "form-container", 3, "ngSubmit", "formGroup"], [1, "form-header"], [1, "form-header__title"], [1, "form-section", "form-section--mandatory"], [1, "form-group"], ["formControlName", "productName", "type", "text", 3, "placeholder"], [1, "form-error"], [1, "label-row", "collapsible-field__label-with-icon"], ["name", "tags", 1, "icon-xs", "icon-muted"], ["chipClass", "chipe category", 3, "add", "remove", "addNew", "options", "selected", "displayFn", "placeholder", "addNewLabel", "showAddNewAlways"], [1, "relative-input"], ["SelectOnFocus", "", "type", "number", "formControlName", "buy_price_global_", "placeholder", "0.00"], [1, "prefix"], ["formControlName", "base_unit_", "placeholder", "choose_unit", 3, "valueChange", "options", "typeToFilter", "addNewValue"], ["formArrayName", "purchase_options_", 1, "form-section", "form-section--purchase", "border-top"], [1, "section-header"], ["type", "button", 1, "c-btn-ghost", 3, "click"], ["name", "plus", 1, "icon-xs"], ["class", "form-group scaling-box", 3, "formGroupName", "row-invalid", 4, "ngFor", "ngForOf"], [1, "form-section", "form-section--optional", "border-top"], [1, "form-group", "collapsible-field"], [1, "collapsible-field__content", 3, "clickOutside"], [1, "collapsible-field__label-with-icon"], ["name", "truck", 1, "icon-xs", "icon-muted"], ["chipClass", "chipe supplier", 3, "add", "remove", "addNew", "options", "selected", "displayFn", "placeholder", "addNewLabel", "showAddNewAlways"], ["role", "button", "tabindex", "0", 1, "collapsible-field__header", "collapsible-field__header--btn", 3, "click", "keydown.enter", "keydown.space"], [1, "form-group", "allergen-container", "collapsible-field"], ["name", "shield-alert", 1, "icon-xs", "icon-warning"], ["chipClass", "chipe allergen", 3, "add", "remove", "addNew", "options", "selected", "displayFn", "placeholder", "addNewLabel", "noOptionsLabel"], ["name", "flask-conical", 1, "icon-xs", "icon-primary"], [1, "label-text"], [1, "two-col-grid"], [1, "form-group", "yield-logic"], ["SelectOnFocus", "", "type", "number", "formControlName", "waste_percent_", "placeholder", "0", "min", "0", "max", "99"], [1, "helper-text"], ["SelectOnFocus", "", "type", "number", "formControlName", "yield_factor_", "step", "0.001", "placeholder", "1.00", 1, "yield-factor-input"], ["class", "cost-impact-alert", 4, "ngIf"], ["role", "button", "tabindex", "0", 1, "collapsible-field__header", "collapsible-field__header--btn", 3, "click", "keydown.enter"], ["name", "package", 1, "icon-xs", "icon-muted"], ["type", "number", "formControlName", "min_stock_level_", "min", "0", "placeholder", "0"], ["name", "calendar-clock", 1, "icon-xs", "icon-muted"], ["type", "number", "formControlName", "expiry_days_default_", "min", "0", "placeholder", "0"], [1, "form-actions"], ["type", "button", 1, "c-btn-primary", 3, "click"], ["name", "arrow-right", 1, "icon-sm"], ["type", "submit", 1, "c-btn-primary", 3, "disabled"], ["size", "small", 3, "inline"], [1, "icon-sm", 3, "name"], [1, "subtitle"], [1, "form-group", "scaling-box", 3, "formGroupName"], [1, "scaling-row"], [1, "input-wrapper"], ["formControlName", "unit_symbol_", "placeholder", "choose_unit", 3, "valueChange", "options", "typeToFilter", "addNewValue"], [1, "label-row"], [1, "math-text"], ["type", "number", "formControlName", "conversion_rate_", "step", "any", "min", "0.0001", 3, "placeholder"], ["formControlName", "uom", 3, "options", "placeholder", "typeToFilter"], [1, "price-override-wrapper"], [1, "price-override-label"], ["type", "checkbox", "formControlName", "show_special_price_"], ["type", "button", 1, "c-icon-btn", "danger", 3, "click"], ["name", "trash-2", 1, "icon-sm"], [1, "error-message-row"], ["type", "number", "formControlName", "price_override_", "step", "0.01", 1, "override-input", 3, "blur", "placeholder"], ["name", "alert-circle", 1, "icon-xs"], [1, "cost-impact-alert"], [1, "cost-alert__label"], [1, "cost-alert__value"]], template: function ProductFormComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "div", 1)(1, "form", 2);
      \u0275\u0275listener("ngSubmit", function ProductFormComponent_Template_form_ngSubmit_1_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onSubmit());
      });
      \u0275\u0275elementStart(2, "header", 3);
      \u0275\u0275template(3, ProductFormComponent_Conditional_3_Template, 3, 4, "h2", 4)(4, ProductFormComponent_Conditional_4_Template, 6, 6);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "div", 5)(6, "div", 6)(7, "label");
      \u0275\u0275text(8);
      \u0275\u0275pipe(9, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(10, "input", 7, 0);
      \u0275\u0275pipe(12, "translatePipe");
      \u0275\u0275template(13, ProductFormComponent_Conditional_13_Template, 3, 3, "span", 8);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "div", 6)(15, "label", 9);
      \u0275\u0275element(16, "lucide-icon", 10);
      \u0275\u0275text(17);
      \u0275\u0275pipe(18, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(19, "app-chip-search-dropdown", 11);
      \u0275\u0275pipe(20, "translatePipe");
      \u0275\u0275pipe(21, "translatePipe");
      \u0275\u0275listener("add", function ProductFormComponent_Template_app_chip_search_dropdown_add_19_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.addCategory($event));
      })("remove", function ProductFormComponent_Template_app_chip_search_dropdown_remove_19_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.removeCategory($event));
      })("addNew", function ProductFormComponent_Template_app_chip_search_dropdown_addNew_19_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.openAddNewCategory());
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(22, "div", 6)(23, "label");
      \u0275\u0275text(24);
      \u0275\u0275pipe(25, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(26, "div", 12);
      \u0275\u0275element(27, "input", 13);
      \u0275\u0275elementStart(28, "span", 14);
      \u0275\u0275text(29, "\u20AA");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(30, "div", 6)(31, "label");
      \u0275\u0275text(32);
      \u0275\u0275pipe(33, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(34, "app-custom-select", 15);
      \u0275\u0275listener("valueChange", function ProductFormComponent_Template_app_custom_select_valueChange_34_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onBaseUnitValueChange($event));
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(35, "div", 16)(36, "label", 17)(37, "button", 18);
      \u0275\u0275listener("click", function ProductFormComponent_Template_button_click_37_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.addPurchaseOption());
      });
      \u0275\u0275element(38, "lucide-icon", 19);
      \u0275\u0275text(39);
      \u0275\u0275pipe(40, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(41, ProductFormComponent_div_41_Template, 28, 32, "div", 20);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(42, "div", 21)(43, "div", 22)(44, "div", 23);
      \u0275\u0275listener("clickOutside", function ProductFormComponent_Template_div_clickOutside_44_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onSupplierBlur($event));
      });
      \u0275\u0275elementStart(45, "label", 24);
      \u0275\u0275element(46, "lucide-icon", 25);
      \u0275\u0275text(47);
      \u0275\u0275pipe(48, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(49, "app-chip-search-dropdown", 26);
      \u0275\u0275pipe(50, "translatePipe");
      \u0275\u0275pipe(51, "translatePipe");
      \u0275\u0275listener("add", function ProductFormComponent_Template_app_chip_search_dropdown_add_49_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.addSupplierId($event));
      })("remove", function ProductFormComponent_Template_app_chip_search_dropdown_remove_49_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.removeSupplierId($event));
      })("addNew", function ProductFormComponent_Template_app_chip_search_dropdown_addNew_49_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.openAddSupplier());
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(52, "div", 27);
      \u0275\u0275listener("click", function ProductFormComponent_Template_div_click_52_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleSupplier());
      })("keydown.enter", function ProductFormComponent_Template_div_keydown_enter_52_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleSupplier());
      })("keydown.space", function ProductFormComponent_Template_div_keydown_space_52_listener($event) {
        \u0275\u0275restoreView(_r1);
        ctx.toggleSupplier();
        return \u0275\u0275resetView($event.preventDefault());
      });
      \u0275\u0275element(53, "lucide-icon", 25);
      \u0275\u0275elementStart(54, "span");
      \u0275\u0275text(55);
      \u0275\u0275pipe(56, "translatePipe");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(57, "div", 28)(58, "div", 23);
      \u0275\u0275listener("clickOutside", function ProductFormComponent_Template_div_clickOutside_58_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onAllergensBlur($event));
      });
      \u0275\u0275elementStart(59, "label", 24);
      \u0275\u0275element(60, "lucide-icon", 29);
      \u0275\u0275text(61);
      \u0275\u0275pipe(62, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(63, "app-chip-search-dropdown", 30);
      \u0275\u0275pipe(64, "translatePipe");
      \u0275\u0275pipe(65, "translatePipe");
      \u0275\u0275pipe(66, "translatePipe");
      \u0275\u0275listener("add", function ProductFormComponent_Template_app_chip_search_dropdown_add_63_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleAllergen($event));
      })("remove", function ProductFormComponent_Template_app_chip_search_dropdown_remove_63_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleAllergen($event));
      })("addNew", function ProductFormComponent_Template_app_chip_search_dropdown_addNew_63_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onAddNewAllergen($event));
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(67, "div", 27);
      \u0275\u0275listener("click", function ProductFormComponent_Template_div_click_67_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleAllergens());
      })("keydown.enter", function ProductFormComponent_Template_div_keydown_enter_67_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleAllergens());
      })("keydown.space", function ProductFormComponent_Template_div_keydown_space_67_listener($event) {
        \u0275\u0275restoreView(_r1);
        ctx.toggleAllergens();
        return \u0275\u0275resetView($event.preventDefault());
      });
      \u0275\u0275element(68, "lucide-icon", 29);
      \u0275\u0275elementStart(69, "span");
      \u0275\u0275text(70);
      \u0275\u0275pipe(71, "translatePipe");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(72, "div", 22)(73, "div", 23);
      \u0275\u0275listener("clickOutside", function ProductFormComponent_Template_div_clickOutside_73_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onWasteYieldBlur($event));
      });
      \u0275\u0275elementStart(74, "div", 24);
      \u0275\u0275element(75, "lucide-icon", 31);
      \u0275\u0275elementStart(76, "span", 32);
      \u0275\u0275text(77);
      \u0275\u0275pipe(78, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(79, "div", 33)(80, "div", 34)(81, "label");
      \u0275\u0275text(82);
      \u0275\u0275pipe(83, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(84, "div", 12);
      \u0275\u0275element(85, "input", 35);
      \u0275\u0275elementStart(86, "span", 14);
      \u0275\u0275text(87, "%");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(88, "p", 36);
      \u0275\u0275text(89);
      \u0275\u0275pipe(90, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(91, "div", 34)(92, "label");
      \u0275\u0275text(93);
      \u0275\u0275pipe(94, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(95, "div", 12);
      \u0275\u0275element(96, "input", 37);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(97, "p", 36);
      \u0275\u0275text(98);
      \u0275\u0275pipe(99, "translatePipe");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(100, ProductFormComponent_div_100_Template, 7, 7, "div", 38);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(101, "div", 39);
      \u0275\u0275listener("click", function ProductFormComponent_Template_div_click_101_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleWasteYield());
      })("keydown.enter", function ProductFormComponent_Template_div_keydown_enter_101_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleWasteYield());
      });
      \u0275\u0275element(102, "lucide-icon", 31);
      \u0275\u0275elementStart(103, "span");
      \u0275\u0275text(104);
      \u0275\u0275pipe(105, "translatePipe");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(106, "div", 22)(107, "div", 23);
      \u0275\u0275listener("clickOutside", function ProductFormComponent_Template_div_clickOutside_107_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onMinStockBlur($event));
      });
      \u0275\u0275elementStart(108, "label", 24);
      \u0275\u0275element(109, "lucide-icon", 40);
      \u0275\u0275text(110);
      \u0275\u0275pipe(111, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(112, "input", 41);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(113, "div", 27);
      \u0275\u0275listener("click", function ProductFormComponent_Template_div_click_113_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleMinStock());
      })("keydown.enter", function ProductFormComponent_Template_div_keydown_enter_113_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleMinStock());
      })("keydown.space", function ProductFormComponent_Template_div_keydown_space_113_listener($event) {
        \u0275\u0275restoreView(_r1);
        ctx.toggleMinStock();
        return \u0275\u0275resetView($event.preventDefault());
      });
      \u0275\u0275element(114, "lucide-icon", 40);
      \u0275\u0275elementStart(115, "span");
      \u0275\u0275text(116);
      \u0275\u0275pipe(117, "translatePipe");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(118, "div", 22)(119, "div", 23);
      \u0275\u0275listener("clickOutside", function ProductFormComponent_Template_div_clickOutside_119_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onExpiryDaysBlur($event));
      });
      \u0275\u0275elementStart(120, "label", 24);
      \u0275\u0275element(121, "lucide-icon", 42);
      \u0275\u0275text(122);
      \u0275\u0275pipe(123, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(124, "input", 43);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(125, "div", 27);
      \u0275\u0275listener("click", function ProductFormComponent_Template_div_click_125_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleExpiryDays());
      })("keydown.enter", function ProductFormComponent_Template_div_keydown_enter_125_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleExpiryDays());
      })("keydown.space", function ProductFormComponent_Template_div_keydown_space_125_listener($event) {
        \u0275\u0275restoreView(_r1);
        ctx.toggleExpiryDays();
        return \u0275\u0275resetView($event.preventDefault());
      });
      \u0275\u0275element(126, "lucide-icon", 42);
      \u0275\u0275elementStart(127, "span");
      \u0275\u0275text(128);
      \u0275\u0275pipe(129, "translatePipe");
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(130, "div", 44)(131, "button", 45);
      \u0275\u0275listener("click", function ProductFormComponent_Template_button_click_131_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onCancel());
      });
      \u0275\u0275element(132, "lucide-icon", 46);
      \u0275\u0275text(133);
      \u0275\u0275pipe(134, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(135, "button", 47);
      \u0275\u0275template(136, ProductFormComponent_Conditional_136_Template, 1, 1, "app-loader", 48);
      \u0275\u0275element(137, "lucide-icon", 49);
      \u0275\u0275text(138);
      \u0275\u0275pipe(139, "translatePipe");
      \u0275\u0275pipe(140, "translatePipe");
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_6_0;
      let tmp_47_0;
      \u0275\u0275classProp("edit-mode", ctx.isEditMode_());
      \u0275\u0275advance();
      \u0275\u0275property("formGroup", ctx.productForm_);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.isEditMode_() ? 3 : 4);
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(9, 73, "product_name"));
      \u0275\u0275advance(2);
      \u0275\u0275property("placeholder", \u0275\u0275pipeBind1(12, 75, "product_name_example_placeholder"));
      \u0275\u0275advance(3);
      \u0275\u0275conditional(((tmp_6_0 = ctx.productForm_.get("productName")) == null ? null : tmp_6_0.invalid) && ((tmp_6_0 = ctx.productForm_.get("productName")) == null ? null : tmp_6_0.touched) && ((tmp_6_0 = ctx.productForm_.get("productName")) == null ? null : tmp_6_0.errors == null ? null : tmp_6_0.errors["duplicateName"]) ? 13 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(18, 77, "category"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("options", ctx.filteredCategoryOptions_())("selected", ctx.selectedCategories_())("displayFn", ctx.translateFn)("placeholder", \u0275\u0275pipeBind1(20, 79, "choose_category"))("addNewLabel", \u0275\u0275pipeBind1(21, 81, "add_new_category"))("showAddNewAlways", true);
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(25, 83, "buy_price"));
      \u0275\u0275advance(8);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(33, 85, "base_unit"));
      \u0275\u0275advance(2);
      \u0275\u0275property("options", ctx.baseUnitOptions_())("typeToFilter", true)("addNewValue", "NEW_UNIT");
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(40, 87, "add_purchase_unit"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("ngForOf", ctx.purchaseOptions_.controls);
      \u0275\u0275advance(3);
      \u0275\u0275classProp("collapsible-field__content--hidden", !ctx.expandedSupplier_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(48, 89, "supplier"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("options", ctx.filteredSupplierIds_())("selected", ctx.selectedSupplierIds_())("displayFn", ctx.supplierDisplayFn)("placeholder", \u0275\u0275pipeBind1(50, 91, "choose_supplier"))("addNewLabel", \u0275\u0275pipeBind1(51, 93, "add_supplier"))("showAddNewAlways", true);
      \u0275\u0275advance(3);
      \u0275\u0275classProp("collapsible-field__header--hidden", ctx.expandedSupplier_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(56, 95, "supplier"));
      \u0275\u0275advance(3);
      \u0275\u0275classProp("collapsible-field__content--hidden", !ctx.expandedAllergens_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(62, 97, "allergens"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("options", ctx.filteredAllergenOptions_())("selected", ctx.selectedAllergensSignal_())("displayFn", ctx.translateFn)("placeholder", \u0275\u0275pipeBind1(64, 99, "search_or_choose_allergen"))("addNewLabel", \u0275\u0275pipeBind1(65, 101, "add_new_allergen"))("noOptionsLabel", \u0275\u0275pipeBind1(66, 103, "all_allergens_selected"));
      \u0275\u0275advance(4);
      \u0275\u0275classProp("collapsible-field__header--hidden", ctx.expandedAllergens_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(71, 105, "allergens"));
      \u0275\u0275advance(3);
      \u0275\u0275classProp("collapsible-field__content--hidden", !ctx.expandedWasteYield_());
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(78, 107, "waste_yield_logic"));
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(83, 109, "waste_percent"));
      \u0275\u0275advance(7);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(90, 111, "waste_percent_help_text"));
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(94, 113, "yield_factor"));
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(99, 115, "yield_factor_help_text"));
      \u0275\u0275advance(2);
      \u0275\u0275property("ngIf", ((tmp_47_0 = ctx.productForm_.get("buy_price_global_")) == null ? null : tmp_47_0.value) > 0);
      \u0275\u0275advance();
      \u0275\u0275classProp("collapsible-field__header--hidden", ctx.expandedWasteYield_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(105, 117, "waste_yield_logic"));
      \u0275\u0275advance(3);
      \u0275\u0275classProp("collapsible-field__content--hidden", !ctx.expandedMinStock_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(111, 119, "min_stock_level"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275classProp("collapsible-field__header--hidden", ctx.expandedMinStock_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(117, 121, "min_stock_level"));
      \u0275\u0275advance(3);
      \u0275\u0275classProp("collapsible-field__content--hidden", !ctx.expandedExpiryDays_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(123, 123, "expiry_days_default"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275classProp("collapsible-field__header--hidden", ctx.expandedExpiryDays_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(129, 125, "expiry_days_default"));
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(134, 127, "back_to_list"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", ctx.productForm_.invalid || ctx.isSaving_());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.isSaving_() ? 136 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("name", ctx.isEditMode_() ? "save" : "plus");
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", ctx.isEditMode_() ? \u0275\u0275pipeBind1(139, 129, "update_product") : \u0275\u0275pipeBind1(140, 131, "save_product"), " ");
    }
  }, dependencies: [
    CommonModule,
    NgForOf,
    NgIf,
    DecimalPipe,
    ReactiveFormsModule,
    \u0275NgNoValidate,
    DefaultValueAccessor,
    NumberValueAccessor,
    CheckboxControlValueAccessor,
    NgControlStatus,
    NgControlStatusGroup,
    MinValidator,
    MaxValidator,
    FormGroupDirective,
    FormControlName,
    FormGroupName,
    FormArrayName,
    LucideAngularModule,
    LucideAngularComponent,
    FormsModule,
    ClickOutSideDirective,
    SelectOnFocusDirective,
    TranslatePipe,
    LoaderComponent,
    CustomSelectComponent,
    ChipSearchDropdownComponent
  ], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n  padding: 1.5rem;\n}\n.product-form-container[_ngcontent-%COMP%] {\n  display: grid;\n  width: 100%;\n  min-height: 100px;\n  max-width: 50rem;\n  margin: 0 auto;\n  background: transparent;\n}\n.product-form-container.edit-mode[_ngcontent-%COMP%]   .form-container[_ngcontent-%COMP%]   .form-header[_ngcontent-%COMP%]   .form-header__title[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n}\n.form-container[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n  background: var(--bg-glass-strong);\n  padding: 2rem;\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.form-container[_ngcontent-%COMP%]   .form-header[_ngcontent-%COMP%] {\n  display: block;\n  margin-block-end: 1.25rem;\n  padding-block-end: 1rem;\n  border-block-end: 1px solid var(--border-default);\n  text-align: center;\n}\n.form-container[_ngcontent-%COMP%]   .form-header[_ngcontent-%COMP%]   .form-header__title[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 700;\n  margin: 0 0 0.25rem 0;\n  color: var(--color-text-main);\n}\n.form-container[_ngcontent-%COMP%]   .form-header[_ngcontent-%COMP%]   .subtitle[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  margin-block-start: 0.25rem;\n  font-size: 0.875rem;\n}\n.form-container[_ngcontent-%COMP%]   .form-section[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));\n  grid-auto-flow: dense;\n  gap: 1.5rem;\n}\n.form-container[_ngcontent-%COMP%]   .form-section[_ngcontent-%COMP%]   .section-header[_ngcontent-%COMP%] {\n  width: fit-content;\n  display: flex;\n  grid-column: 1/-1;\n}\n.form-container[_ngcontent-%COMP%]   .form-section[_ngcontent-%COMP%]   .section-header[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: flex;\n  place-items: center;\n  padding: 0.4rem 0.75rem;\n  gap: 0.5em;\n  border: 1px solid var(--border-strong);\n  cursor: pointer;\n  border-radius: var(--radius-md);\n  box-shadow: var(--shadow-glass);\n}\n.form-container[_ngcontent-%COMP%]   .form-section[_ngcontent-%COMP%]   .section-header[_ngcontent-%COMP%]   .c-btn-ghost[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.form-container[_ngcontent-%COMP%]   .form-section.form-section--purchase[_ngcontent-%COMP%] {\n  position: relative;\n  z-index: 1;\n  overflow: visible;\n}\n.form-container[_ngcontent-%COMP%]   .form-section.form-section--purchase.border-top[_ngcontent-%COMP%] {\n  background: var(--color-primary-soft);\n  border-radius: var(--radius-md);\n  padding: 1.25rem;\n}\n.form-container[_ngcontent-%COMP%]   .form-section.form-section--purchase[_ngcontent-%COMP%]   .section-header[_ngcontent-%COMP%] {\n  grid-column: 1/-1;\n}\n.form-container[_ngcontent-%COMP%]   .form-section.form-section--purchase[_ngcontent-%COMP%]   .form-group.scaling-box[_ngcontent-%COMP%] {\n  grid-column: 1/-1;\n  overflow: visible;\n}\n.form-container[_ngcontent-%COMP%]   .form-section.product-info[_ngcontent-%COMP%] {\n  grid-template-columns: repeat(4, minmax(0, 1fr));\n  gap: 1.5rem;\n}\n.form-container[_ngcontent-%COMP%]   .form-section.border-top[_ngcontent-%COMP%] {\n  border-block-start: 1px solid var(--border-default);\n  padding-block-start: 1.5rem;\n}\n.form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  place-content: baseline;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-text-secondary);\n  height: 24px;\n  text-align: center;\n}\n.form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   label.danger-label[_ngcontent-%COMP%] {\n  color: var(--color-danger);\n}\n.form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   input[type=number][_ngcontent-%COMP%] {\n  -moz-appearance: textfield;\n}\n.form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   input[type=number][_ngcontent-%COMP%]::-webkit-inner-spin-button, \n.form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   input[type=number][_ngcontent-%COMP%]::-webkit-outer-spin-button {\n  -webkit-appearance: none;\n  margin: 0;\n}\n.form-container[_ngcontent-%COMP%]   .form-group.yield-logic[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-rows: repeat(auto-fit, minmax(24px, 1fr));\n  place-content: center;\n}\n.form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:not(.form-input--no-focus-ring), \n.form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  padding-inline: 0.75rem;\n  padding-block: 0.5rem;\n  outline: none;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n  background: var(--bg-glass);\n}\n.form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:not(.form-input--no-focus-ring):focus, \n.form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.form-container[_ngcontent-%COMP%]   .relative-input[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.form-container[_ngcontent-%COMP%]   .relative-input[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding-inline-start: 1.2rem;\n}\n.form-container[_ngcontent-%COMP%]   .relative-input[_ngcontent-%COMP%]   input.yield-factor-input[_ngcontent-%COMP%] {\n  padding-inline-start: 1rem;\n}\n.form-container[_ngcontent-%COMP%]   .relative-input[_ngcontent-%COMP%]   .prefix[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 0.55rem;\n  color: var(--color-text-muted-light);\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%] {\n  margin-block-end: 1rem;\n  background: var(--bg-glass);\n  padding: 1.25rem;\n  border-radius: var(--radius-md);\n  border: 1px dashed var(--border-default);\n  transition: border-color 0.2s ease, background 0.2s ease;\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box.row-invalid[_ngcontent-%COMP%] {\n  border-inline-end: 3px solid var(--color-danger);\n  background: var(--bg-danger-subtle);\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .input-wrapper.field-error[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], \n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .input-wrapper.field-error[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  border-color: var(--color-danger);\n  background-color: var(--bg-pure);\n  color: var(--color-danger);\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .input-wrapper.field-error[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .input-wrapper.field-error[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  box-shadow: var(--shadow-focus);\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .error-message-row[_ngcontent-%COMP%] {\n  color: var(--color-danger);\n  font-size: 0.75rem;\n  margin-block-start: 0.5rem;\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n  font-weight: 500;\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .price-override-wrapper[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n  margin-inline-end: 1rem;\n  padding-inline-end: 0.5rem;\n  border-inline-end: 1px solid var(--border-default);\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .price-override-wrapper[_ngcontent-%COMP%]   .price-override-label[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.35rem;\n  cursor: pointer;\n  font-weight: 600;\n  color: var(--color-text-secondary);\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .price-override-wrapper[_ngcontent-%COMP%]   .price-override-label[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%] {\n  width: 1rem;\n  height: 1rem;\n  accent-color: var(--color-primary);\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .price-override-wrapper[_ngcontent-%COMP%]   .override-input[_ngcontent-%COMP%] {\n  width: 85px;\n  font-weight: 600;\n  color: var(--color-success);\n  text-align: center;\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .price-override-wrapper[_ngcontent-%COMP%]   .override-input[_ngcontent-%COMP%]:focus {\n  border-block-end-color: var(--color-success);\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .scaling-row[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%]:hover {\n  transform: scale(1.1);\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .scaling-row[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: minmax(90px, 9rem) auto minmax(90px, 1fr) minmax(auto, 12rem) min-content;\n  align-items: center;\n  gap: 0.75rem;\n  margin-block-start: 0.5rem;\n  overflow: visible;\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .scaling-row[_ngcontent-%COMP%]   app-custom-select[_ngcontent-%COMP%] {\n  min-width: 90px;\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .scaling-row[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  width: auto;\n  min-width: 90px;\n  max-width: none;\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .scaling-row[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 70px;\n  text-align: center;\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .scaling-row[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]::-webkit-inner-spin-button {\n  display: none;\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .scaling-row[_ngcontent-%COMP%]   .math-text[_ngcontent-%COMP%] {\n  text-align: center;\n  font-weight: 700;\n  color: var(--color-text-muted);\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .scaling-row[_ngcontent-%COMP%]   lucide-icon[_ngcontent-%COMP%] {\n  color: var(--color-text-muted-light);\n  width: 1.25rem;\n  height: 1.25rem;\n}\n.form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .scaling-row[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  min-width: 2rem;\n}\n.form-container[_ngcontent-%COMP%]   .form-actions[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  gap: 1rem;\n  border-block-start: 1px solid var(--border-default);\n  padding-block-start: 1.5rem;\n}\n.form-container[_ngcontent-%COMP%]   .form-actions[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  display: flex;\n  min-width: 10rem;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.6rem 1.5rem;\n  border-radius: var(--radius-sm);\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.form-container[_ngcontent-%COMP%]   .form-actions[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.form-container[_ngcontent-%COMP%]   .form-actions[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]   .icon-sm[_ngcontent-%COMP%] {\n  width: 1.1rem;\n  height: 1.1rem;\n}\n.form-container[_ngcontent-%COMP%]   .form-section__heading[_ngcontent-%COMP%] {\n  margin-bottom: 0.75rem;\n}\n.form-container[_ngcontent-%COMP%]   .collapsible-field[_ngcontent-%COMP%]   .collapsible-field__header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  border: 1px solid var(--border-strong);\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  background: var(--bg-muted);\n  transition: background 0.2s;\n  flex-direction: row-reverse;\n}\n.form-container[_ngcontent-%COMP%]   .collapsible-field[_ngcontent-%COMP%]   .collapsible-field__header[_ngcontent-%COMP%]:hover {\n  background: var(--bg-muted);\n}\n.form-container[_ngcontent-%COMP%]   .collapsible-field[_ngcontent-%COMP%]   .collapsible-field__header[_ngcontent-%COMP%]   .icon-xs[_ngcontent-%COMP%] {\n  width: 1rem;\n  height: 1rem;\n  margin-inline-end: auto;\n}\n.form-container[_ngcontent-%COMP%]   .collapsible-field[_ngcontent-%COMP%]   .collapsible-field__header--btn[_ngcontent-%COMP%] {\n  display: flex;\n  place-items: baseline;\n}\n.form-container[_ngcontent-%COMP%]   .collapsible-field[_ngcontent-%COMP%]   .collapsible-field__header--hidden[_ngcontent-%COMP%] {\n  display: none !important;\n}\n.form-container[_ngcontent-%COMP%]   .collapsible-field[_ngcontent-%COMP%]   .collapsible-field__content[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-container[_ngcontent-%COMP%]   .collapsible-field[_ngcontent-%COMP%]   .collapsible-field__content--hidden[_ngcontent-%COMP%] {\n  display: none !important;\n}\n.form-container[_ngcontent-%COMP%]   .collapsible-field[_ngcontent-%COMP%]   .collapsible-field__content[_ngcontent-%COMP%]   .collapsible-field__label-with-icon[_ngcontent-%COMP%] {\n  display: flex;\n  place-content: baseline;\n  align-items: center;\n  gap: 0.5rem;\n  flex-direction: row-reverse;\n}\n.form-container[_ngcontent-%COMP%]   .btn-add-option[_ngcontent-%COMP%] {\n  margin-block-start: 0.35rem;\n  background: none;\n  border: none;\n  cursor: pointer;\n  padding: 0.25rem 0;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-success);\n}\n.form-container[_ngcontent-%COMP%]   select[multiple][_ngcontent-%COMP%] {\n  min-height: 4.5rem;\n}\n@media (max-width: 900px) {\n  .form-container[_ngcontent-%COMP%]   .form-container[_ngcontent-%COMP%]   .form-section[_ngcontent-%COMP%] {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n  .form-container[_ngcontent-%COMP%]   .form-container[_ngcontent-%COMP%]   .form-section.grid-2[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n  .form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .scaling-row[_ngcontent-%COMP%] {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n  }\n  .form-container[_ngcontent-%COMP%]   .scaling-box[_ngcontent-%COMP%]   .scaling-row[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%] {\n    margin-inline-start: auto;\n  }\n}\n@media (max-width: 768px) {\n  .form-container[_ngcontent-%COMP%]   .product-form-container[_ngcontent-%COMP%] {\n    max-width: none;\n  }\n  .form-container[_ngcontent-%COMP%]   .form-container[_ngcontent-%COMP%] {\n    padding: 1.25rem;\n  }\n  .form-container[_ngcontent-%COMP%]   .form-container[_ngcontent-%COMP%]   .form-section[_ngcontent-%COMP%], \n   .form-container[_ngcontent-%COMP%]   .form-container[_ngcontent-%COMP%]   .form-section.product-info[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n  .form-container[_ngcontent-%COMP%]   .form-actions[_ngcontent-%COMP%] {\n    gap: 0.75rem;\n  }\n}\n.icon-muted[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n}\n.icon-primary[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n}\n.icon-warning[_ngcontent-%COMP%] {\n  color: var(--text-warning);\n}\n.label-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  flex-direction: row-reverse;\n}\n.label-text[_ngcontent-%COMP%] {\n  font-weight: 500;\n  color: var(--color-text-main);\n}\n.two-col-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.helper-text[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  margin-block-start: 0.25rem;\n}\n.cost-impact-alert[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-block-start: 1rem;\n  padding: 0.75rem;\n  background: var(--bg-success);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n}\n.cost-impact-alert[_ngcontent-%COMP%]   .cost-alert__label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-success);\n}\n.cost-impact-alert[_ngcontent-%COMP%]   .cost-alert__value[_ngcontent-%COMP%] {\n  font-size: 1.125rem;\n  font-weight: 700;\n  color: var(--text-success);\n}\n/*# sourceMappingURL=product-form.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ProductFormComponent, [{
    type: Component,
    args: [{ selector: "product-form", standalone: true, imports: [
      CommonModule,
      ReactiveFormsModule,
      LucideAngularModule,
      FormsModule,
      ClickOutSideDirective,
      SelectOnFocusDirective,
      TranslatePipe,
      LoaderComponent,
      CustomSelectComponent,
      ChipSearchDropdownComponent
    ], template: `<div class="product-form-container" [class.edit-mode]="isEditMode_()">

  <form [formGroup]="productForm_" (ngSubmit)="onSubmit()" class="form-container" dir="rtl">

    <header class="form-header">
      @if (isEditMode_()) {
      <h2 class="form-header__title">{{ 'edit_product_title' | translatePipe }}: {{ productForm_.get('productName')?.value ?? initialProduct_()?.name_hebrew ?? '' }}</h2>
      } @else {
      <h2 class="form-header__title">{{ 'add_product_inventory_title' | translatePipe }}</h2>
      <p class="subtitle">{{ 'add_product_subtitle' | translatePipe }}</p>
      }
    </header>

    <div class="form-section form-section--mandatory">
      <div class="form-group">
        <label>{{ 'product_name' | translatePipe }}</label>
        <input #productNameInput formControlName="productName" type="text" [placeholder]="'product_name_example_placeholder' | translatePipe">
        @if (productForm_.get('productName')?.invalid && productForm_.get('productName')?.touched && productForm_.get('productName')?.errors?.['duplicateName']) {
          <span class="form-error">{{ 'duplicate_product_name_error' | translatePipe }}</span>
        }
      </div>

      <div class="form-group">
        <label class="label-row collapsible-field__label-with-icon">
          <lucide-icon name="tags" class="icon-xs icon-muted"></lucide-icon>
          {{ 'category' | translatePipe }}
        </label>
        <app-chip-search-dropdown
          [options]="filteredCategoryOptions_()"
          [selected]="selectedCategories_()"
          [displayFn]="translateFn"
          [placeholder]="'choose_category' | translatePipe"
          [addNewLabel]="'add_new_category' | translatePipe"
          [showAddNewAlways]="true"
          chipClass="chipe category"
          (add)="addCategory($event)"
          (remove)="removeCategory($event)"
          (addNew)="openAddNewCategory()" />
      </div>

      <div class="form-group">
        <label>{{ 'buy_price' | translatePipe }}</label>
        <div class="relative-input">
          <input SelectOnFocus type="number" formControlName="buy_price_global_" placeholder="0.00">
          <span class="prefix">\u20AA</span>
        </div>
      </div>

      <div class="form-group">
        <label>{{ 'base_unit' | translatePipe }}</label>
        <app-custom-select
          formControlName="base_unit_"
          [options]="baseUnitOptions_()"
          placeholder="choose_unit"
          [typeToFilter]="true"
          [addNewValue]="'NEW_UNIT'"
          (valueChange)="onBaseUnitValueChange($event)" />
      </div>
    </div>

    <div class="form-section form-section--purchase border-top" formArrayName="purchase_options_">
      <label class="section-header">
        <button type="button" class="c-btn-ghost" (click)="addPurchaseOption()">
          <lucide-icon name="plus" class="icon-xs"></lucide-icon> {{ 'add_purchase_unit' | translatePipe }}
        </button>
      </label>

      <div *ngFor="let option of purchaseOptions_.controls; let idx = index" [formGroupName]="idx"
        class="form-group scaling-box" [class.row-invalid]="option.invalid && (option.dirty || isSubmitted)">

        <div class="scaling-row">
          <div class="input-wrapper"
            [class.field-error]="option.get('unit_symbol_')?.invalid && (option.get('unit_symbol_')?.dirty || isSubmitted)">
            <app-custom-select
              formControlName="unit_symbol_"
              [options]="unitSymbolOptions_()"
              placeholder="choose_unit"
              [typeToFilter]="true"
              [addNewValue]="'NEW_UNIT'"
              (valueChange)="onUnitSymbolValueChange($event, idx)" />
          </div>

          <div class="input-wrapper"
            [class.field-error]="option.get('conversion_rate_')?.invalid && (option.get('conversion_rate_')?.dirty || isSubmitted)">
            <label class="label-row">
              <span class="math-text">=</span>
              <input type="number" formControlName="conversion_rate_" [placeholder]="'quantity' | translatePipe" [attr.aria-label]="'quantity' | translatePipe" step="any" min="0.0001">
            </label>
          </div>

          <div class="input-wrapper"
            [class.field-error]="option.get('uom')?.invalid && (option.get('uom')?.dirty || isSubmitted)">
            <label class="label-row">
              <span class="math-text">:</span>

              <app-custom-select
                formControlName="uom"
                [options]="uomOptions_()"
                [placeholder]="productForm_.get('base_unit_')?.value || 'compare_to_unit'"
                [typeToFilter]="true"
                />
            </label>
          </div>

          <div class="price-override-wrapper">
            <span class="math-text">{{ 'special_purchase_price' | translatePipe }}</span>

            <label class="price-override-label">
              <input type="checkbox" formControlName="show_special_price_" [attr.aria-label]="'special_purchase_price' | translatePipe">
            </label>
            @if (option.get('show_special_price_')?.value) {
              <input type="number" formControlName="price_override_" [placeholder]="'price' | translatePipe"
                class="override-input" step="0.01"
                (blur)="onPriceOverrideBlur(option)">
              <span class="math-text">\u20AA</span>
            }
          </div>

          <button type="button" class="c-icon-btn danger" (click)="onDeletePurchaseOption(idx)" [attr.aria-label]="'remove' | translatePipe">
            <lucide-icon name="trash-2" class="icon-sm"></lucide-icon>
          </button>
        </div>

        @if (option.invalid && (option.dirty || isSubmitted)) {
        <div class="error-message-row">
          <lucide-icon name="alert-circle" class="icon-xs"></lucide-icon>
          {{ 'purchase_unit_details_invalid' | translatePipe }}
        </div>
        }
      </div>

    </div>

    <div class="form-section form-section--optional border-top">
      <!-- Optional fields heading kept hidden by design -->

      <div class="form-group collapsible-field">
        <div class="collapsible-field__content" [class.collapsible-field__content--hidden]="!expandedSupplier_()" (clickOutside)="onSupplierBlur($event)">
          <label class="collapsible-field__label-with-icon">
            <lucide-icon name="truck" class="icon-xs icon-muted"></lucide-icon>
            {{ 'supplier' | translatePipe }}
          </label>
          <app-chip-search-dropdown
            [options]="filteredSupplierIds_()"
            [selected]="selectedSupplierIds_()"
            [displayFn]="supplierDisplayFn"
            [placeholder]="'choose_supplier' | translatePipe"
            [addNewLabel]="'add_supplier' | translatePipe"
            [showAddNewAlways]="true"
            chipClass="chipe supplier"
            (add)="addSupplierId($event)"
            (remove)="removeSupplierId($event)"
            (addNew)="openAddSupplier()" />
        </div>
        <div class="collapsible-field__header collapsible-field__header--btn" [class.collapsible-field__header--hidden]="expandedSupplier_()" (click)="toggleSupplier()" (keydown.enter)="toggleSupplier()" (keydown.space)="toggleSupplier(); $event.preventDefault()" role="button" tabindex="0">
          <lucide-icon name="truck" class="icon-xs icon-muted"></lucide-icon>
          <span>{{ 'supplier' | translatePipe }}</span>
        </div>
      </div>

      <div class="form-group allergen-container collapsible-field">
        <div class="collapsible-field__content" [class.collapsible-field__content--hidden]="!expandedAllergens_()" (clickOutside)="onAllergensBlur($event)">
          <label class="collapsible-field__label-with-icon">
            <lucide-icon name="shield-alert" class="icon-xs icon-warning"></lucide-icon>
            {{ 'allergens' | translatePipe }}
          </label>
          <app-chip-search-dropdown
            [options]="filteredAllergenOptions_()"
            [selected]="selectedAllergensSignal_()"
            [displayFn]="translateFn"
            [placeholder]="'search_or_choose_allergen' | translatePipe"
            [addNewLabel]="'add_new_allergen' | translatePipe"
            [noOptionsLabel]="'all_allergens_selected' | translatePipe"
            chipClass="chipe allergen"
            (add)="toggleAllergen($event)"
            (remove)="toggleAllergen($event)"
            (addNew)="onAddNewAllergen($event)" />
        </div>
        <div class="collapsible-field__header collapsible-field__header--btn" [class.collapsible-field__header--hidden]="expandedAllergens_()" (click)="toggleAllergens()" (keydown.enter)="toggleAllergens()" (keydown.space)="toggleAllergens(); $event.preventDefault()" role="button" tabindex="0">
          <lucide-icon name="shield-alert" class="icon-xs icon-warning"></lucide-icon>
          <span>{{ 'allergens' | translatePipe }}</span>
        </div>
      </div>



      <div class="form-group collapsible-field">
        <div class="collapsible-field__content" [class.collapsible-field__content--hidden]="!expandedWasteYield_()" (clickOutside)="onWasteYieldBlur($event)">
          <div class="collapsible-field__label-with-icon">
            <lucide-icon name="flask-conical" class="icon-xs icon-primary"></lucide-icon>
            <span class="label-text">{{ 'waste_yield_logic' | translatePipe }}</span>
          </div>
          <div class="two-col-grid">
            <div class="form-group yield-logic">
              <label>{{ 'waste_percent' | translatePipe }}</label>
              <div class="relative-input">
                <input SelectOnFocus type="number" formControlName="waste_percent_" placeholder="0" min="0" max="99">
                <span class="prefix">%</span>
              </div>
              <p class="helper-text">{{ 'waste_percent_help_text' | translatePipe }}</p>
            </div>

            <div class="form-group yield-logic ">
              <label>{{ 'yield_factor' | translatePipe }}</label>
              <div class="relative-input">
                <input class="yield-factor-input" SelectOnFocus type="number" formControlName="yield_factor_" step="0.001" placeholder="1.00">
              </div>
              <p class="helper-text">{{ 'yield_factor_help_text' | translatePipe }}</p>
            </div>
          </div>

          <div class="cost-impact-alert"
            *ngIf="productForm_.get('buy_price_global_')?.value > 0">
            <span class="cost-alert__label">{{ 'net_cost_calculated_with_waste' | translatePipe }}</span>
            <span class="cost-alert__value">\u20AA{{ netUnitCost_() | number:'1.2-2' }}</span>
          </div>
        </div>


        <div class="collapsible-field__header collapsible-field__header--btn" [class.collapsible-field__header--hidden]="expandedWasteYield_()" (click)="toggleWasteYield()" (keydown.enter)="toggleWasteYield()" role="button" tabindex="0">
          <lucide-icon name="flask-conical" class="icon-xs icon-primary"></lucide-icon>
          <span>{{ 'waste_yield_logic' | translatePipe }}</span>
        </div>
      </div>
      <div class="form-group collapsible-field">
        <div class="collapsible-field__content" [class.collapsible-field__content--hidden]="!expandedMinStock_()" (clickOutside)="onMinStockBlur($event)">
          <label class="collapsible-field__label-with-icon">
            <lucide-icon name="package" class="icon-xs icon-muted"></lucide-icon>
            {{ 'min_stock_level' | translatePipe }}
          </label>
          <input type="number" formControlName="min_stock_level_" min="0" placeholder="0" />
        </div>
        <div class="collapsible-field__header collapsible-field__header--btn" [class.collapsible-field__header--hidden]="expandedMinStock_()" (click)="toggleMinStock()" (keydown.enter)="toggleMinStock()" (keydown.space)="toggleMinStock(); $event.preventDefault()" role="button" tabindex="0">
          <lucide-icon name="package" class="icon-xs icon-muted"></lucide-icon>
          <span>{{ 'min_stock_level' | translatePipe }}</span>
        </div>
      </div>

      <div class="form-group collapsible-field">
        <div class="collapsible-field__content" [class.collapsible-field__content--hidden]="!expandedExpiryDays_()" (clickOutside)="onExpiryDaysBlur($event)">
          <label class="collapsible-field__label-with-icon">
            <lucide-icon name="calendar-clock" class="icon-xs icon-muted"></lucide-icon>
            {{ 'expiry_days_default' | translatePipe }}
          </label>
          <input type="number" formControlName="expiry_days_default_" min="0" placeholder="0" />
        </div>
        <div class="collapsible-field__header collapsible-field__header--btn" [class.collapsible-field__header--hidden]="expandedExpiryDays_()" (click)="toggleExpiryDays()" (keydown.enter)="toggleExpiryDays()" (keydown.space)="toggleExpiryDays(); $event.preventDefault()" role="button" tabindex="0">
          <lucide-icon name="calendar-clock" class="icon-xs icon-muted"></lucide-icon>
          <span>{{ 'expiry_days_default' | translatePipe }}</span>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="c-btn-primary" (click)="onCancel()">
        <lucide-icon name="arrow-right" class="icon-sm"></lucide-icon>
        {{ 'back_to_list' | translatePipe }}
      </button>
      <button type="submit" [disabled]="productForm_.invalid || isSaving_()" class="c-btn-primary">
        @if (isSaving_()) {
          <app-loader size="small" [inline]="true" />
        }
        <lucide-icon [name]="isEditMode_() ? 'save' : 'plus'" class="icon-sm"></lucide-icon>
        {{ isEditMode_() ? ('update_product' | translatePipe) : ('save_product' | translatePipe) }}
      </button>
    </div>
  </form>

</div>
`, styles: ["/* src/app/pages/inventory/components/product-form/product-form.component.scss */\n:host {\n  display: block;\n  padding: 1.5rem;\n}\n.product-form-container {\n  display: grid;\n  width: 100%;\n  min-height: 100px;\n  max-width: 50rem;\n  margin: 0 auto;\n  background: transparent;\n}\n.product-form-container.edit-mode .form-container .form-header .form-header__title {\n  color: var(--color-primary);\n}\n.form-container {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n  background: var(--bg-glass-strong);\n  padding: 2rem;\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.form-container .form-header {\n  display: block;\n  margin-block-end: 1.25rem;\n  padding-block-end: 1rem;\n  border-block-end: 1px solid var(--border-default);\n  text-align: center;\n}\n.form-container .form-header .form-header__title {\n  font-size: 1.5rem;\n  font-weight: 700;\n  margin: 0 0 0.25rem 0;\n  color: var(--color-text-main);\n}\n.form-container .form-header .subtitle {\n  color: var(--color-text-muted);\n  margin-block-start: 0.25rem;\n  font-size: 0.875rem;\n}\n.form-container .form-section {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));\n  grid-auto-flow: dense;\n  gap: 1.5rem;\n}\n.form-container .form-section .section-header {\n  width: fit-content;\n  display: flex;\n  grid-column: 1/-1;\n}\n.form-container .form-section .section-header label {\n  display: flex;\n  place-items: center;\n  padding: 0.4rem 0.75rem;\n  gap: 0.5em;\n  border: 1px solid var(--border-strong);\n  cursor: pointer;\n  border-radius: var(--radius-md);\n  box-shadow: var(--shadow-glass);\n}\n.form-container .form-section .section-header .c-btn-ghost {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.form-container .form-section.form-section--purchase {\n  position: relative;\n  z-index: 1;\n  overflow: visible;\n}\n.form-container .form-section.form-section--purchase.border-top {\n  background: var(--color-primary-soft);\n  border-radius: var(--radius-md);\n  padding: 1.25rem;\n}\n.form-container .form-section.form-section--purchase .section-header {\n  grid-column: 1/-1;\n}\n.form-container .form-section.form-section--purchase .form-group.scaling-box {\n  grid-column: 1/-1;\n  overflow: visible;\n}\n.form-container .form-section.product-info {\n  grid-template-columns: repeat(4, minmax(0, 1fr));\n  gap: 1.5rem;\n}\n.form-container .form-section.border-top {\n  border-block-start: 1px solid var(--border-default);\n  padding-block-start: 1.5rem;\n}\n.form-container .form-group {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-container .form-group label {\n  place-content: baseline;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-text-secondary);\n  height: 24px;\n  text-align: center;\n}\n.form-container .form-group label.danger-label {\n  color: var(--color-danger);\n}\n.form-container .form-group input[type=number] {\n  -moz-appearance: textfield;\n}\n.form-container .form-group input[type=number]::-webkit-inner-spin-button,\n.form-container .form-group input[type=number]::-webkit-outer-spin-button {\n  -webkit-appearance: none;\n  margin: 0;\n}\n.form-container .form-group.yield-logic {\n  display: grid;\n  grid-template-rows: repeat(auto-fit, minmax(24px, 1fr));\n  place-content: center;\n}\n.form-container .form-group input:not(.form-input--no-focus-ring),\n.form-container .form-group select {\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  padding-inline: 0.75rem;\n  padding-block: 0.5rem;\n  outline: none;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n  background: var(--bg-glass);\n}\n.form-container .form-group input:not(.form-input--no-focus-ring):focus,\n.form-container .form-group select:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.form-container .relative-input {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.form-container .relative-input input {\n  width: 100%;\n  padding-inline-start: 1.2rem;\n}\n.form-container .relative-input input.yield-factor-input {\n  padding-inline-start: 1rem;\n}\n.form-container .relative-input .prefix {\n  position: absolute;\n  left: 0.55rem;\n  color: var(--color-text-muted-light);\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n.form-container .scaling-box {\n  margin-block-end: 1rem;\n  background: var(--bg-glass);\n  padding: 1.25rem;\n  border-radius: var(--radius-md);\n  border: 1px dashed var(--border-default);\n  transition: border-color 0.2s ease, background 0.2s ease;\n}\n.form-container .scaling-box.row-invalid {\n  border-inline-end: 3px solid var(--color-danger);\n  background: var(--bg-danger-subtle);\n}\n.form-container .scaling-box .input-wrapper.field-error input,\n.form-container .scaling-box .input-wrapper.field-error select {\n  border-color: var(--color-danger);\n  background-color: var(--bg-pure);\n  color: var(--color-danger);\n}\n.form-container .scaling-box .input-wrapper.field-error input:focus,\n.form-container .scaling-box .input-wrapper.field-error select:focus {\n  box-shadow: var(--shadow-focus);\n}\n.form-container .scaling-box .error-message-row {\n  color: var(--color-danger);\n  font-size: 0.75rem;\n  margin-block-start: 0.5rem;\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n  font-weight: 500;\n}\n.form-container .scaling-box .price-override-wrapper {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n  margin-inline-end: 1rem;\n  padding-inline-end: 0.5rem;\n  border-inline-end: 1px solid var(--border-default);\n}\n.form-container .scaling-box .price-override-wrapper .price-override-label {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.35rem;\n  cursor: pointer;\n  font-weight: 600;\n  color: var(--color-text-secondary);\n}\n.form-container .scaling-box .price-override-wrapper .price-override-label input[type=checkbox] {\n  width: 1rem;\n  height: 1rem;\n  accent-color: var(--color-primary);\n}\n.form-container .scaling-box .price-override-wrapper .override-input {\n  width: 85px;\n  font-weight: 600;\n  color: var(--color-success);\n  text-align: center;\n}\n.form-container .scaling-box .price-override-wrapper .override-input:focus {\n  border-block-end-color: var(--color-success);\n}\n.form-container .scaling-box .scaling-row .c-icon-btn.danger:hover {\n  transform: scale(1.1);\n}\n.form-container .scaling-box .scaling-row {\n  display: grid;\n  grid-template-columns: minmax(90px, 9rem) auto minmax(90px, 1fr) minmax(auto, 12rem) min-content;\n  align-items: center;\n  gap: 0.75rem;\n  margin-block-start: 0.5rem;\n  overflow: visible;\n}\n.form-container .scaling-box .scaling-row app-custom-select {\n  min-width: 90px;\n}\n.form-container .scaling-box .scaling-row select {\n  width: auto;\n  min-width: 90px;\n  max-width: none;\n}\n.form-container .scaling-box .scaling-row input {\n  width: 70px;\n  text-align: center;\n}\n.form-container .scaling-box .scaling-row input::-webkit-inner-spin-button {\n  display: none;\n}\n.form-container .scaling-box .scaling-row .math-text {\n  text-align: center;\n  font-weight: 700;\n  color: var(--color-text-muted);\n}\n.form-container .scaling-box .scaling-row lucide-icon {\n  color: var(--color-text-muted-light);\n  width: 1.25rem;\n  height: 1.25rem;\n}\n.form-container .scaling-box .scaling-row .c-icon-btn.danger {\n  flex-shrink: 0;\n  min-width: 2rem;\n}\n.form-container .form-actions {\n  display: flex;\n  justify-content: center;\n  gap: 1rem;\n  border-block-start: 1px solid var(--border-default);\n  padding-block-start: 1.5rem;\n}\n.form-container .form-actions button {\n  display: flex;\n  min-width: 10rem;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.6rem 1.5rem;\n  border-radius: var(--radius-sm);\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.form-container .form-actions button:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.form-container .form-actions button .icon-sm {\n  width: 1.1rem;\n  height: 1.1rem;\n}\n.form-container .form-section__heading {\n  margin-bottom: 0.75rem;\n}\n.form-container .collapsible-field .collapsible-field__header {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  border: 1px solid var(--border-strong);\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  background: var(--bg-muted);\n  transition: background 0.2s;\n  flex-direction: row-reverse;\n}\n.form-container .collapsible-field .collapsible-field__header:hover {\n  background: var(--bg-muted);\n}\n.form-container .collapsible-field .collapsible-field__header .icon-xs {\n  width: 1rem;\n  height: 1rem;\n  margin-inline-end: auto;\n}\n.form-container .collapsible-field .collapsible-field__header--btn {\n  display: flex;\n  place-items: baseline;\n}\n.form-container .collapsible-field .collapsible-field__header--hidden {\n  display: none !important;\n}\n.form-container .collapsible-field .collapsible-field__content {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-container .collapsible-field .collapsible-field__content--hidden {\n  display: none !important;\n}\n.form-container .collapsible-field .collapsible-field__content .collapsible-field__label-with-icon {\n  display: flex;\n  place-content: baseline;\n  align-items: center;\n  gap: 0.5rem;\n  flex-direction: row-reverse;\n}\n.form-container .btn-add-option {\n  margin-block-start: 0.35rem;\n  background: none;\n  border: none;\n  cursor: pointer;\n  padding: 0.25rem 0;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-success);\n}\n.form-container select[multiple] {\n  min-height: 4.5rem;\n}\n@media (max-width: 900px) {\n  .form-container .form-container .form-section {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n  .form-container .form-container .form-section.grid-2 {\n    grid-template-columns: 1fr;\n  }\n  .form-container .scaling-box .scaling-row {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n  }\n  .form-container .scaling-box .scaling-row .c-icon-btn.danger {\n    margin-inline-start: auto;\n  }\n}\n@media (max-width: 768px) {\n  .form-container .product-form-container {\n    max-width: none;\n  }\n  .form-container .form-container {\n    padding: 1.25rem;\n  }\n  .form-container .form-container .form-section,\n  .form-container .form-container .form-section.product-info {\n    grid-template-columns: 1fr;\n  }\n  .form-container .form-actions {\n    gap: 0.75rem;\n  }\n}\n.icon-muted {\n  color: var(--color-text-muted);\n}\n.icon-primary {\n  color: var(--color-primary);\n}\n.icon-warning {\n  color: var(--text-warning);\n}\n.label-row {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  flex-direction: row-reverse;\n}\n.label-text {\n  font-weight: 500;\n  color: var(--color-text-main);\n}\n.two-col-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.helper-text {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  margin-block-start: 0.25rem;\n}\n.cost-impact-alert {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-block-start: 1rem;\n  padding: 0.75rem;\n  background: var(--bg-success);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n}\n.cost-impact-alert .cost-alert__label {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-success);\n}\n.cost-impact-alert .cost-alert__value {\n  font-size: 1.125rem;\n  font-weight: 700;\n  color: var(--text-success);\n}\n/*# sourceMappingURL=product-form.component.css.map */\n"] }]
  }], () => [], { productNameInputRef: [{
    type: ViewChild,
    args: ["productNameInput"]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ProductFormComponent, { className: "ProductFormComponent", filePath: "src/app/pages/inventory/components/product-form/product-form.component.ts", lineNumber: 49 });
})();
export {
  ProductFormComponent
};
//# sourceMappingURL=chunk-TUMK3THK.js.map
