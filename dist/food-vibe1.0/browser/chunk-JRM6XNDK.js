import {
  ExportToolbarOverlayComponent
} from "./chunk-NDFOX7UA.js";
import {
  ApproveStampComponent,
  CdkDrag,
  CdkDragHandle,
  CdkDropList,
  CounterComponent,
  RecipeFormService,
  RecipeWorkflowComponent
} from "./chunk-MU66SC65.js";
import "./chunk-YMZSD6NM.js";
import {
  ExportPreviewComponent,
  ExportService,
  quantityDecrement,
  quantityIncrement
} from "./chunk-C7ILH7PA.js";
import "./chunk-R7QO6CSG.js";
import {
  RecipeCostService
} from "./chunk-7Z6ZOB5G.js";
import {
  AddEquipmentModalService,
  AiRecipeDraftService,
  QuickAddProductModalService,
  RecipeTextImportModalService
} from "./chunk-JVT65QLQ.js";
import {
  LabelCreationModalService
} from "./chunk-AORWB3NT.js";
import "./chunk-EKVDVKBE.js";
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
  ConfirmModalService
} from "./chunk-OMWRJF5J.js";
import "./chunk-KNQKKPOG.js";
import {
  HeroFabService
} from "./chunk-QBY7FUTT.js";
import {
  useSavingState
} from "./chunk-6VNIKYJO.js";
import {
  ERR_DUPLICATE_EQUIPMENT_NAME,
  EquipmentDataService
} from "./chunk-YEG5WWUX.js";
import {
  ClickOutSideDirective,
  CustomSelectComponent,
  ScrollIndicatorsDirective,
  ScrollableDropdownComponent,
  filterOptionsByStartsWith
} from "./chunk-KKA4TBVQ.js";
import {
  DefaultValueAccessor,
  FormArrayName,
  FormBuilder,
  FormControl,
  FormControlDirective,
  FormControlName,
  FormGroupDirective,
  FormGroupName,
  NG_VALUE_ACCESSOR,
  NgControlStatus,
  NgControlStatusGroup,
  NumberValueAccessor,
  ReactiveFormsModule,
  Validators
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
import "./chunk-IFJ5YUTT.js";
import {
  DishDataService,
  RecipeDataService,
  VersionHistoryService
} from "./chunk-ACTKISJR.js";
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
  ChangeDetectorRef,
  CommonModule,
  Component,
  DecimalPipe,
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  Injector,
  NavigationStart,
  Router,
  ViewChild,
  ViewChildren,
  __async,
  __spreadProps,
  __spreadValues,
  afterNextRender,
  computed,
  effect,
  filter,
  inject,
  input,
  map,
  of,
  output,
  runInInjectionContext,
  setClassMetadata,
  signal,
  startWith,
  switchMap,
  take,
  timer,
  viewChild,
  ɵsetClassDebugInfo,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdeclareLet,
  ɵɵdefineComponent,
  ɵɵdefineDirective,
  ɵɵdirectiveInject,
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
  ɵɵpureFunction0,
  ɵɵpureFunction1,
  ɵɵqueryAdvance,
  ɵɵqueryRefresh,
  ɵɵreadContextLet,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵrepeaterTrackByIndex,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵstoreLet,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵviewQuery,
  ɵɵviewQuerySignal
} from "./chunk-GCYOWW7U.js";

// src/app/shared/custom-multi-select/custom-multi-select.component.ts
var _c0 = ["triggerRef"];
var _forTrack0 = ($index, $item) => $item.value;
function CustomMultiSelectComponent_For_6_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "translatePipe");
  }
  if (rf & 2) {
    \u0275\u0275nextContext();
    const opt_r2 = \u0275\u0275readContextLet(0);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(1, 1, opt_r2.label), " ");
  }
}
function CustomMultiSelectComponent_For_6_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    \u0275\u0275nextContext();
    const opt_r2 = \u0275\u0275readContextLet(0);
    \u0275\u0275textInterpolate1(" ", opt_r2.label, " ");
  }
}
function CustomMultiSelectComponent_For_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275declareLet(0);
    \u0275\u0275elementStart(1, "span", 9);
    \u0275\u0275template(2, CustomMultiSelectComponent_For_6_Conditional_2_Template, 2, 3)(3, CustomMultiSelectComponent_For_6_Conditional_3_Template, 1, 1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const key_r3 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext();
    const opt_r5 = \u0275\u0275storeLet(ctx_r3.getOptionForValue(key_r3));
    \u0275\u0275advance();
    \u0275\u0275styleProp("background-color", opt_r5.color || null)("color", opt_r5.color ? ctx_r3.getChipTextColor(opt_r5.color) : null);
    \u0275\u0275classProp("custom-multi-select-chip--colored", opt_r5.color);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r3.translateLabels() ? 2 : 3);
  }
}
function CustomMultiSelectComponent_For_8_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "translatePipe");
  }
  if (rf & 2) {
    \u0275\u0275nextContext();
    const opt_r8 = \u0275\u0275readContextLet(0);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(1, 1, opt_r8.label), " ");
  }
}
function CustomMultiSelectComponent_For_8_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    \u0275\u0275nextContext();
    const opt_r8 = \u0275\u0275readContextLet(0);
    \u0275\u0275textInterpolate1(" ", opt_r8.label, " ");
  }
}
function CustomMultiSelectComponent_For_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275declareLet(0);
    \u0275\u0275elementStart(1, "button", 10);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function CustomMultiSelectComponent_For_8_Template_button_click_1_listener($event) {
      const key_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r3 = \u0275\u0275nextContext();
      ctx_r3.removeOption(key_r7);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275template(3, CustomMultiSelectComponent_For_8_Conditional_3_Template, 2, 3)(4, CustomMultiSelectComponent_For_8_Conditional_4_Template, 1, 1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const key_r7 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext();
    const opt_r9 = \u0275\u0275storeLet(ctx_r3.getOptionForValue(key_r7));
    \u0275\u0275advance();
    \u0275\u0275styleProp("background-color", opt_r9.color || null)("color", opt_r9.color ? ctx_r3.getChipTextColor(opt_r9.color) : null);
    \u0275\u0275classProp("custom-multi-select-chip--colored", opt_r9.color);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(2, 9, "remove"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r3.translateLabels() ? 3 : 4);
  }
}
function CustomMultiSelectComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 6);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 1, ctx_r3.placeholder()), " ");
  }
}
function CustomMultiSelectComponent_Conditional_11_For_2_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "translatePipe");
  }
  if (rf & 2) {
    const opt_r11 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(1, 1, opt_r11.label), " ");
  }
}
function CustomMultiSelectComponent_Conditional_11_For_2_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const opt_r11 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275textInterpolate1(" ", opt_r11.label, " ");
  }
}
function CustomMultiSelectComponent_Conditional_11_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 12);
    \u0275\u0275listener("click", function CustomMultiSelectComponent_Conditional_11_For_2_Template_button_click_0_listener() {
      const opt_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.onOptionClick(opt_r11));
    });
    \u0275\u0275template(1, CustomMultiSelectComponent_Conditional_11_For_2_Conditional_1_Template, 2, 3)(2, CustomMultiSelectComponent_Conditional_11_For_2_Conditional_2_Template, 1, 1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const opt_r11 = ctx.$implicit;
    const \u0275$index_37_r12 = ctx.$index;
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("custom-select-option--add-new", opt_r11.value === ctx_r3.addNewValue())("custom-select-option--chip", ctx_r3.variant() === "chip")("highlighted", ctx_r3.highlightedIndex() === \u0275$index_37_r12);
    \u0275\u0275property("id", ctx_r3.triggerId() ? ctx_r3.triggerId() + "-opt-" + \u0275$index_37_r12 : null);
    \u0275\u0275attribute("aria-selected", ctx_r3.value.includes(opt_r11.value));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r3.translateLabels() ? 1 : 2);
  }
}
function CustomMultiSelectComponent_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "app-scrollable-dropdown", 8);
    \u0275\u0275repeaterCreate(1, CustomMultiSelectComponent_Conditional_11_For_2_Template, 3, 9, "button", 11, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275property("maxHeight", ctx_r3.maxHeight());
    \u0275\u0275attribute("aria-activedescendant", ctx_r3.triggerId() && ctx_r3.highlightedIndex() >= 0 ? ctx_r3.triggerId() + "-opt-" + ctx_r3.highlightedIndex() : null);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r3.dropdownOptions_());
  }
}
var CustomMultiSelectComponent = class _CustomMultiSelectComponent {
  options = input.required();
  placeholder = input("");
  maxHeight = input(240);
  translateLabels = input(true);
  triggerId = input("");
  compact = input(false);
  variant = input("default");
  readonlyChips = input([]);
  addNewValue = input("");
  valueChange = output();
  addNewChosen = output();
  _value = signal([]);
  _onChange = () => {
  };
  _onTouched = () => {
  };
  _disabled = signal(false);
  triggerRef;
  open = signal(false);
  highlightedIndex = signal(-1);
  closeTimeout = null;
  _focusFromMouse = false;
  /** Options to show in dropdown: exclude already selected and readonly chips. */
  dropdownOptions_ = computed(() => {
    const opts = this.options();
    const value = this._value();
    const readonly = this.readonlyChips();
    const addNew = this.addNewValue();
    return opts.filter((o) => o.value === addNew || !value.includes(o.value) && !readonly.includes(o.value));
  });
  onHostFocus() {
    this.triggerRef?.nativeElement?.focus();
  }
  writeValue(value) {
    this._value.set(Array.isArray(value) ? [...value] : []);
  }
  registerOnChange(fn) {
    this._onChange = fn;
  }
  registerOnTouched(fn) {
    this._onTouched = fn;
  }
  setDisabledState(isDisabled) {
    this._disabled.set(isDisabled);
  }
  get value() {
    return this._value();
  }
  get disabled() {
    return this._disabled();
  }
  /** Resolve option for a value (for chip label/color); fallback to value as label. */
  getOptionForValue(value) {
    return this.options().find((o) => o.value === value) ?? { value, label: value };
  }
  /** Luminance-based text color for chip (contrast on background). */
  getChipTextColor(hex) {
    if (!hex?.trim())
      return "var(--color-text-main)";
    let h = hex.trim();
    if (h.startsWith("#"))
      h = h.slice(1);
    if (h.length === 3)
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6)
      return "#0f172a";
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#0f172a" : "#ffffff";
  }
  toggle() {
    if (this._disabled())
      return;
    this.clearCloseTimeout();
    const next = !this.open();
    this.open.set(next);
    if (next) {
      const opts = this.dropdownOptions_();
      this.highlightedIndex.set(opts.length > 0 ? 0 : -1);
    }
  }
  close() {
    this.clearCloseTimeout();
    this.open.set(false);
    this._onTouched();
  }
  openDropdown() {
    if (this._disabled())
      return;
    this.clearCloseTimeout();
    this.open.set(true);
    const opts = this.dropdownOptions_();
    this.highlightedIndex.set(opts.length > 0 ? 0 : -1);
  }
  onTriggerBlur() {
    if (!this.open())
      return;
    this.closeTimeout = setTimeout(() => {
      this.closeTimeout = null;
      this.close();
    }, 120);
  }
  clearCloseTimeout() {
    if (this.closeTimeout != null) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  }
  addOption(value) {
    const current = this._value();
    if (current.includes(value))
      return;
    const next = [...current, value];
    this._value.set(next);
    this._onChange(next);
    this.valueChange.emit(next);
  }
  removeOption(value) {
    const next = this._value().filter((v) => v !== value);
    this._value.set(next);
    this._onChange(next);
    this.valueChange.emit(next);
  }
  onOptionClick(opt) {
    if (opt.value === this.addNewValue()) {
      this.addNewChosen.emit();
      this.close();
      return;
    }
    this.addOption(opt.value);
  }
  onTriggerMousedown() {
    this._focusFromMouse = true;
  }
  onTriggerFocus() {
    if (this._focusFromMouse) {
      this._focusFromMouse = false;
      return;
    }
    if (!this._disabled() && !this.open()) {
      this.openDropdown();
    }
  }
  onTriggerClick() {
    this.toggle();
  }
  onKeydown(e) {
    if (!this.open()) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        this.toggle();
      }
      return;
    }
    const opts = this.dropdownOptions_();
    let idx = this.highlightedIndex();
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (idx >= 0 && opts[idx]) {
        if (opts[idx].value === this.addNewValue()) {
          this.addNewChosen.emit();
          this.close();
        } else {
          this.addOption(opts[idx].value);
        }
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      idx = Math.min(idx + 1, opts.length - 1);
      this.highlightedIndex.set(idx);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      idx = Math.max(idx - 1, 0);
      this.highlightedIndex.set(idx);
      return;
    }
    if (e.key === "Tab") {
      this.close();
    }
  }
  static \u0275fac = function CustomMultiSelectComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _CustomMultiSelectComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _CustomMultiSelectComponent, selectors: [["app-custom-multi-select"]], viewQuery: function CustomMultiSelectComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuery(_c0, 5);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.triggerRef = _t.first);
    }
  }, hostAttrs: ["tabIndex", "-1"], hostBindings: function CustomMultiSelectComponent_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("focus", function CustomMultiSelectComponent_focus_HostBindingHandler() {
        return ctx.onHostFocus();
      })("keydown", function CustomMultiSelectComponent_keydown_HostBindingHandler($event) {
        return ctx.onKeydown($event);
      });
    }
  }, inputs: { options: [1, "options"], placeholder: [1, "placeholder"], maxHeight: [1, "maxHeight"], translateLabels: [1, "translateLabels"], triggerId: [1, "triggerId"], compact: [1, "compact"], variant: [1, "variant"], readonlyChips: [1, "readonlyChips"], addNewValue: [1, "addNewValue"] }, outputs: { valueChange: "valueChange", addNewChosen: "addNewChosen" }, features: [\u0275\u0275ProvidersFeature([
    { provide: NG_VALUE_ACCESSOR, useExisting: _CustomMultiSelectComponent, multi: true }
  ])], decls: 12, vars: 19, consts: [["triggerRef", ""], [1, "custom-multi-select-wrap", 3, "clickOutside"], ["type", "button", "aria-haspopup", "listbox", 1, "c-select", "custom-select-trigger", "custom-multi-select-trigger", 3, "mousedown", "focus", "click", "blur", "id", "disabled"], [1, "custom-multi-select-trigger-inner"], [1, "custom-multi-select-chip", "custom-multi-select-chip--readonly", 3, "custom-multi-select-chip--colored", "background-color", "color"], ["type", "button", 1, "custom-multi-select-chip", "custom-multi-select-chip--removable", 3, "custom-multi-select-chip--colored", "background-color", "color"], [1, "custom-multi-select-placeholder"], ["name", "chevron-down", 3, "size"], ["role", "listbox", "aria-multiselectable", "true", 3, "maxHeight"], [1, "custom-multi-select-chip", "custom-multi-select-chip--readonly"], ["type", "button", 1, "custom-multi-select-chip", "custom-multi-select-chip--removable", 3, "click"], ["type", "button", "role", "option", 1, "custom-select-option", 3, "custom-select-option--add-new", "custom-select-option--chip", "id", "highlighted"], ["type", "button", "role", "option", 1, "custom-select-option", 3, "click", "id"]], template: function CustomMultiSelectComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "div", 1);
      \u0275\u0275listener("clickOutside", function CustomMultiSelectComponent_Template_div_clickOutside_0_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.close());
      });
      \u0275\u0275elementStart(1, "button", 2, 0);
      \u0275\u0275pipe(3, "translatePipe");
      \u0275\u0275listener("mousedown", function CustomMultiSelectComponent_Template_button_mousedown_1_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onTriggerMousedown());
      })("focus", function CustomMultiSelectComponent_Template_button_focus_1_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onTriggerFocus());
      })("click", function CustomMultiSelectComponent_Template_button_click_1_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onTriggerClick());
      })("blur", function CustomMultiSelectComponent_Template_button_blur_1_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onTriggerBlur());
      });
      \u0275\u0275elementStart(4, "span", 3);
      \u0275\u0275repeaterCreate(5, CustomMultiSelectComponent_For_6_Template, 4, 8, "span", 4, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275repeaterCreate(7, CustomMultiSelectComponent_For_8_Template, 5, 11, "button", 5, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275template(9, CustomMultiSelectComponent_Conditional_9_Template, 3, 3, "span", 6);
      \u0275\u0275elementEnd();
      \u0275\u0275element(10, "lucide-icon", 7);
      \u0275\u0275elementEnd();
      \u0275\u0275template(11, CustomMultiSelectComponent_Conditional_11_Template, 3, 2, "app-scrollable-dropdown", 8);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275classProp("open", ctx.open())("custom-multi-select-wrap--chip", ctx.variant() === "chip");
      \u0275\u0275advance();
      \u0275\u0275classProp("custom-select-trigger--compact", ctx.compact())("custom-select-trigger--chip", ctx.variant() === "chip")("open", ctx.open());
      \u0275\u0275property("id", ctx.triggerId())("disabled", ctx.disabled);
      \u0275\u0275attribute("aria-expanded", ctx.open())("aria-label", \u0275\u0275pipeBind1(3, 17, ctx.placeholder()));
      \u0275\u0275advance(4);
      \u0275\u0275repeater(ctx.readonlyChips());
      \u0275\u0275advance(2);
      \u0275\u0275repeater(ctx.value);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.value.length === 0 && ctx.readonlyChips().length === 0 ? 9 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("size", ctx.variant() === "chip" ? 10 : 14);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.open() ? 11 : -1);
    }
  }, dependencies: [
    CommonModule,
    TranslatePipe,
    ClickOutSideDirective,
    ScrollableDropdownComponent,
    LucideAngularModule,
    LucideAngularComponent
  ], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n}\n.custom-multi-select-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  width: 100%;\n}\n.custom-multi-select-wrap.open[_ngcontent-%COMP%] {\n  z-index: 9999;\n}\n.custom-multi-select-wrap.custom-multi-select-wrap--chip[_ngcontent-%COMP%] {\n  width: fit-content;\n  min-width: 0;\n}\n.custom-multi-select-trigger[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.5rem;\n  width: 100%;\n  min-height: 2.25rem;\n  padding-inline: 0.75rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  text-align: start;\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-md);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    border-color 0.2s ease,\n    box-shadow 0.2s ease,\n    background 0.2s ease;\n}\n.custom-multi-select-trigger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-strong);\n}\n.custom-multi-select-trigger[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.custom-multi-select-trigger[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.custom-multi-select-trigger.custom-select-trigger--compact[_ngcontent-%COMP%] {\n  min-height: 1.75rem;\n  padding-inline: 0.375rem;\n  padding-block: 0.25rem;\n  font-size: 0.8125rem;\n  border-radius: var(--radius-sm);\n}\n.custom-multi-select-trigger.custom-select-trigger--chip[_ngcontent-%COMP%] {\n  min-height: auto;\n  padding-inline: 0.5rem;\n  padding-block: 0.25rem;\n  border-radius: 9999px;\n  font-size: 0.8125rem;\n}\n.custom-multi-select-trigger.custom-select-trigger--chip[_ngcontent-%COMP%]:hover:not(:disabled) {\n  border-color: var(--border-focus);\n}\n.custom-multi-select-trigger-inner[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.375rem;\n  flex: 1;\n  min-width: 0;\n}\n.custom-multi-select-placeholder[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n}\n.custom-multi-select-chip[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  padding-inline: 0.5rem;\n  padding-block: 0.2rem;\n  font-size: 0.8125rem;\n  border-radius: 9999px;\n  border: none;\n  cursor: default;\n}\n.custom-multi-select-chip.custom-multi-select-chip--colored[_ngcontent-%COMP%] {\n  border: 1px solid var(--border-glass);\n  box-shadow: var(--shadow-glass);\n}\n.custom-multi-select-chip[_ngcontent-%COMP%]:not(.custom-multi-select-chip--colored) {\n  background: var(--bg-muted);\n  color: var(--color-text-main);\n}\n.custom-multi-select-chip.custom-multi-select-chip--removable[_ngcontent-%COMP%] {\n  cursor: pointer;\n}\n.custom-multi-select-chip.custom-multi-select-chip--removable[_ngcontent-%COMP%]:hover {\n  opacity: 0.9;\n}\n.custom-select-option[_ngcontent-%COMP%] {\n  display: block;\n  width: 100%;\n  padding-block: 0.5rem;\n  padding-inline: 0.75rem;\n  background: none;\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  text-align: start;\n  border: none;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.custom-select-option[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass);\n}\n.custom-select-option.highlighted[_ngcontent-%COMP%] {\n  background: var(--color-primary-soft);\n}\n.custom-select-option.custom-select-option--chip[_ngcontent-%COMP%] {\n  padding-block: 0.375rem;\n  padding-inline: 0.5rem;\n  font-size: 0.8125rem;\n}\n.custom-select-option.custom-select-option--add-new[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n  font-weight: 600;\n  padding-inline-start: calc(0.75rem - 3px);\n  border-inline-start: 3px solid var(--color-primary);\n  background: var(--color-primary-soft);\n}\n.custom-select-option.custom-select-option--add-new[_ngcontent-%COMP%]:hover, \n.custom-select-option.custom-select-option--add-new.highlighted[_ngcontent-%COMP%] {\n  color: var(--color-primary-hover);\n  background: var(--color-primary-glow);\n}\nlucide-icon[_ngcontent-%COMP%] {\n  pointer-events: none;\n}\n/*# sourceMappingURL=custom-multi-select.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CustomMultiSelectComponent, [{
    type: Component,
    args: [{ selector: "app-custom-multi-select", standalone: true, host: { tabIndex: "-1" }, imports: [
      CommonModule,
      TranslatePipe,
      ClickOutSideDirective,
      ScrollableDropdownComponent,
      LucideAngularModule
    ], providers: [
      { provide: NG_VALUE_ACCESSOR, useExisting: CustomMultiSelectComponent, multi: true }
    ], template: `<div\r
  class="custom-multi-select-wrap"\r
  [class.open]="open()"\r
  [class.custom-multi-select-wrap--chip]="variant() === 'chip'"\r
  (clickOutside)="close()">\r
  <button\r
    #triggerRef\r
    type="button"\r
    [id]="triggerId()"\r
    class="c-select custom-select-trigger custom-multi-select-trigger"\r
    [class.custom-select-trigger--compact]="compact()"\r
    [class.custom-select-trigger--chip]="variant() === 'chip'"\r
    [class.open]="open()"\r
    [disabled]="disabled"\r
    (mousedown)="onTriggerMousedown()"\r
    (focus)="onTriggerFocus()"\r
    (click)="onTriggerClick()"\r
    (blur)="onTriggerBlur()"\r
    [attr.aria-expanded]="open()"\r
    aria-haspopup="listbox"\r
    [attr.aria-label]="placeholder() | translatePipe">\r
    <span class="custom-multi-select-trigger-inner">\r
      @for (key of readonlyChips(); track key) {\r
        @let opt = getOptionForValue(key);\r
        <span\r
          class="custom-multi-select-chip custom-multi-select-chip--readonly"\r
          [class.custom-multi-select-chip--colored]="opt.color"\r
          [style.background-color]="opt.color || null"\r
          [style.color]="opt.color ? getChipTextColor(opt.color) : null">\r
          @if (translateLabels()) {\r
            {{ opt.label | translatePipe }}\r
          } @else {\r
            {{ opt.label }}\r
          }\r
        </span>\r
      }\r
      @for (key of value; track key) {\r
        @let opt = getOptionForValue(key);\r
        <button\r
          type="button"\r
          class="custom-multi-select-chip custom-multi-select-chip--removable"\r
          [class.custom-multi-select-chip--colored]="opt.color"\r
          [style.background-color]="opt.color || null"\r
          [style.color]="opt.color ? getChipTextColor(opt.color) : null"\r
          (click)="removeOption(key); $event.stopPropagation()"\r
          [attr.aria-label]="'remove' | translatePipe">\r
          @if (translateLabels()) {\r
            {{ opt.label | translatePipe }}\r
          } @else {\r
            {{ opt.label }}\r
          }\r
        </button>\r
      }\r
      @if (value.length === 0 && readonlyChips().length === 0) {\r
        <span class="custom-multi-select-placeholder">\r
          {{ placeholder() | translatePipe }}\r
        </span>\r
      }\r
    </span>\r
    <lucide-icon name="chevron-down" [size]="variant() === 'chip' ? 10 : 14"></lucide-icon>\r
  </button>\r
\r
  @if (open()) {\r
    <app-scrollable-dropdown\r
      [maxHeight]="maxHeight()"\r
      role="listbox"\r
      aria-multiselectable="true"\r
      [attr.aria-activedescendant]="triggerId() && highlightedIndex() >= 0 ? triggerId() + '-opt-' + highlightedIndex() : null">\r
      @for (opt of dropdownOptions_(); track opt.value; let i = $index) {\r
        <button\r
          type="button"\r
          class="custom-select-option"\r
          [class.custom-select-option--add-new]="opt.value === addNewValue()"\r
          [class.custom-select-option--chip]="variant() === 'chip'"\r
          [id]="triggerId() ? triggerId() + '-opt-' + i : null"\r
          [class.highlighted]="highlightedIndex() === i"\r
          role="option"\r
          [attr.aria-selected]="value.includes(opt.value)"\r
          (click)="onOptionClick(opt)">\r
          @if (translateLabels()) {\r
            {{ opt.label | translatePipe }}\r
          } @else {\r
            {{ opt.label }}\r
          }\r
        </button>\r
      }\r
    </app-scrollable-dropdown>\r
  }\r
</div>\r
`, styles: ["/* src/app/shared/custom-multi-select/custom-multi-select.component.scss */\n:host {\n  display: block;\n}\n.custom-multi-select-wrap {\n  position: relative;\n  width: 100%;\n}\n.custom-multi-select-wrap.open {\n  z-index: 9999;\n}\n.custom-multi-select-wrap.custom-multi-select-wrap--chip {\n  width: fit-content;\n  min-width: 0;\n}\n.custom-multi-select-trigger {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.5rem;\n  width: 100%;\n  min-height: 2.25rem;\n  padding-inline: 0.75rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  text-align: start;\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-md);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    border-color 0.2s ease,\n    box-shadow 0.2s ease,\n    background 0.2s ease;\n}\n.custom-multi-select-trigger:hover:not(:disabled) {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-strong);\n}\n.custom-multi-select-trigger:focus {\n  outline: none;\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.custom-multi-select-trigger:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.custom-multi-select-trigger.custom-select-trigger--compact {\n  min-height: 1.75rem;\n  padding-inline: 0.375rem;\n  padding-block: 0.25rem;\n  font-size: 0.8125rem;\n  border-radius: var(--radius-sm);\n}\n.custom-multi-select-trigger.custom-select-trigger--chip {\n  min-height: auto;\n  padding-inline: 0.5rem;\n  padding-block: 0.25rem;\n  border-radius: 9999px;\n  font-size: 0.8125rem;\n}\n.custom-multi-select-trigger.custom-select-trigger--chip:hover:not(:disabled) {\n  border-color: var(--border-focus);\n}\n.custom-multi-select-trigger-inner {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.375rem;\n  flex: 1;\n  min-width: 0;\n}\n.custom-multi-select-placeholder {\n  color: var(--color-text-muted);\n}\n.custom-multi-select-chip {\n  display: inline-flex;\n  align-items: center;\n  padding-inline: 0.5rem;\n  padding-block: 0.2rem;\n  font-size: 0.8125rem;\n  border-radius: 9999px;\n  border: none;\n  cursor: default;\n}\n.custom-multi-select-chip.custom-multi-select-chip--colored {\n  border: 1px solid var(--border-glass);\n  box-shadow: var(--shadow-glass);\n}\n.custom-multi-select-chip:not(.custom-multi-select-chip--colored) {\n  background: var(--bg-muted);\n  color: var(--color-text-main);\n}\n.custom-multi-select-chip.custom-multi-select-chip--removable {\n  cursor: pointer;\n}\n.custom-multi-select-chip.custom-multi-select-chip--removable:hover {\n  opacity: 0.9;\n}\n.custom-select-option {\n  display: block;\n  width: 100%;\n  padding-block: 0.5rem;\n  padding-inline: 0.75rem;\n  background: none;\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  text-align: start;\n  border: none;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.custom-select-option:hover {\n  background: var(--bg-glass);\n}\n.custom-select-option.highlighted {\n  background: var(--color-primary-soft);\n}\n.custom-select-option.custom-select-option--chip {\n  padding-block: 0.375rem;\n  padding-inline: 0.5rem;\n  font-size: 0.8125rem;\n}\n.custom-select-option.custom-select-option--add-new {\n  color: var(--color-primary);\n  font-weight: 600;\n  padding-inline-start: calc(0.75rem - 3px);\n  border-inline-start: 3px solid var(--color-primary);\n  background: var(--color-primary-soft);\n}\n.custom-select-option.custom-select-option--add-new:hover,\n.custom-select-option.custom-select-option--add-new.highlighted {\n  color: var(--color-primary-hover);\n  background: var(--color-primary-glow);\n}\nlucide-icon {\n  pointer-events: none;\n}\n/*# sourceMappingURL=custom-multi-select.component.css.map */\n"] }]
  }], null, { triggerRef: [{
    type: ViewChild,
    args: ["triggerRef"]
  }], onHostFocus: [{
    type: HostListener,
    args: ["focus"]
  }], onKeydown: [{
    type: HostListener,
    args: ["keydown", ["$event"]]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(CustomMultiSelectComponent, { className: "CustomMultiSelectComponent", filePath: "src/app/shared/custom-multi-select/custom-multi-select.component.ts", lineNumber: 42 });
})();

// src/app/shared/scaling-chip/scaling-chip.component.ts
function ScalingChipComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 4);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275listener("click", function ScalingChipComponent_Conditional_3_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onRemove());
    });
    \u0275\u0275element(2, "lucide-icon", 5);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(1, 2, "remove"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 10);
  }
}
var ADD_NEW_UNIT_VALUE = "__add_unit__";
var ScalingChipComponent = class _ScalingChipComponent {
  value = input.required();
  unit = input.required();
  unitOptions = input.required();
  minAmount = input(0);
  stepOptions = input(void 0);
  variant = input("primary");
  showRemove = input(false);
  valueChange = output();
  unitChange = output();
  createUnit = output();
  remove = output();
  customSelect;
  unitControl = new FormControl("", { nonNullable: true });
  subscription = null;
  constructor() {
    effect(() => {
      const u = this.unit();
      this.unitControl.setValue(u ?? "", { emitEvent: false });
    });
    this.subscription = this.unitControl.valueChanges.subscribe((v) => this.onUnitSelect(v));
  }
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
  onUnitSelect(value) {
    if (value === ADD_NEW_UNIT_VALUE) {
      this.createUnit.emit();
      this.unitControl.setValue(this.unit(), { emitEvent: false });
      return;
    }
    this.unitChange.emit(value);
  }
  onRemove() {
    this.remove.emit();
  }
  get addNewValue() {
    return ADD_NEW_UNIT_VALUE;
  }
  static \u0275fac = function ScalingChipComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ScalingChipComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ScalingChipComponent, selectors: [["app-scaling-chip"]], viewQuery: function ScalingChipComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuery(CustomSelectComponent, 5);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.customSelect = _t.first);
    }
  }, inputs: { value: [1, "value"], unit: [1, "unit"], unitOptions: [1, "unitOptions"], minAmount: [1, "minAmount"], stepOptions: [1, "stepOptions"], variant: [1, "variant"], showRemove: [1, "showRemove"] }, outputs: { valueChange: "valueChange", unitChange: "unitChange", createUnit: "createUnit", remove: "remove" }, decls: 4, vars: 16, consts: [[1, "scaling-chip"], ["variant", "chip", "placeholder", "choose", 3, "formControl", "options", "addNewValue", "translateLabels", "typeToFilter", "maxHeight"], [3, "valueChange", "value", "min", "stepOptions"], ["type", "button", "tabindex", "-1", 1, "scaling-chip-remove"], ["type", "button", "tabindex", "-1", 1, "scaling-chip-remove", 3, "click"], ["name", "x", 3, "size"]], template: function ScalingChipComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0);
      \u0275\u0275element(1, "app-custom-select", 1);
      \u0275\u0275elementStart(2, "app-counter", 2);
      \u0275\u0275listener("valueChange", function ScalingChipComponent_Template_app_counter_valueChange_2_listener($event) {
        return ctx.valueChange.emit($event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(3, ScalingChipComponent_Conditional_3_Template, 3, 4, "button", 3);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275classProp("scaling-chip--primary", ctx.variant() === "primary")("scaling-chip--secondary", ctx.variant() === "secondary")("scaling-chip--has-remove", ctx.showRemove());
      \u0275\u0275advance();
      \u0275\u0275property("formControl", ctx.unitControl)("options", ctx.unitOptions())("addNewValue", ctx.addNewValue)("translateLabels", true)("typeToFilter", true)("maxHeight", 200);
      \u0275\u0275advance();
      \u0275\u0275property("value", ctx.value())("min", ctx.minAmount())("stepOptions", ctx.stepOptions());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showRemove() ? 3 : -1);
    }
  }, dependencies: [
    CommonModule,
    ReactiveFormsModule,
    NgControlStatus,
    FormControlDirective,
    CustomSelectComponent,
    CounterComponent,
    TranslatePipe,
    LucideAngularModule,
    LucideAngularComponent
  ], styles: ["\n\n[_nghost-%COMP%] {\n  display: inline-block;\n}\n.scaling-chip[_ngcontent-%COMP%] {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n  flex-wrap: nowrap;\n  gap: 0.3125rem;\n  padding-inline: 0.6rem;\n  padding-block: 0.4rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  border: 2px solid var(--border-default);\n  border-radius: var(--radius-full);\n  overflow: visible;\n  transition: border-color 0.2s ease, background 0.2s ease;\n  cursor: default;\n}\n.scaling-chip.scaling-chip--primary[_ngcontent-%COMP%] {\n  background: var(--color-primary-soft);\n}\n.scaling-chip.scaling-chip--secondary[_ngcontent-%COMP%] {\n  background: var(--bg-glass);\n}\n.scaling-chip.scaling-chip--has-remove[_ngcontent-%COMP%] {\n  padding-inline-end: 0.25rem;\n}\n.scaling-chip-remove[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 1.25rem;\n  height: 1.25rem;\n  padding: 0;\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  border: none;\n  border-radius: var(--radius-full);\n  cursor: pointer;\n}\n.scaling-chip-remove[_ngcontent-%COMP%]:hover {\n  filter: brightness(0.95);\n}\n/*# sourceMappingURL=scaling-chip.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ScalingChipComponent, [{
    type: Component,
    args: [{ selector: "app-scaling-chip", standalone: true, imports: [
      CommonModule,
      ReactiveFormsModule,
      CustomSelectComponent,
      CounterComponent,
      TranslatePipe,
      LucideAngularModule
    ], template: `<div\r
  class="scaling-chip"\r
  [class.scaling-chip--primary]="variant() === 'primary'"\r
  [class.scaling-chip--secondary]="variant() === 'secondary'"\r
  [class.scaling-chip--has-remove]="showRemove()">\r
  <app-custom-select\r
    [formControl]="unitControl"\r
    variant="chip"\r
    [options]="unitOptions()"\r
    [addNewValue]="addNewValue"\r
    [translateLabels]="true"\r
    [typeToFilter]="true"\r
    placeholder="choose"\r
    [maxHeight]="200" />\r
  <app-counter\r
    [value]="value()"\r
    [min]="minAmount()"\r
    [stepOptions]="stepOptions()"\r
    (valueChange)="valueChange.emit($event)" />\r
  @if (showRemove()) {\r
    <button\r
      type="button"\r
      class="scaling-chip-remove"\r
      tabindex="-1"\r
      (click)="onRemove()"\r
      [attr.aria-label]="'remove' | translatePipe">\r
      <lucide-icon name="x" [size]="10"></lucide-icon>\r
    </button>\r
  }\r
</div>\r
`, styles: ["/* src/app/shared/scaling-chip/scaling-chip.component.scss */\n:host {\n  display: inline-block;\n}\n.scaling-chip {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n  flex-wrap: nowrap;\n  gap: 0.3125rem;\n  padding-inline: 0.6rem;\n  padding-block: 0.4rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  border: 2px solid var(--border-default);\n  border-radius: var(--radius-full);\n  overflow: visible;\n  transition: border-color 0.2s ease, background 0.2s ease;\n  cursor: default;\n}\n.scaling-chip.scaling-chip--primary {\n  background: var(--color-primary-soft);\n}\n.scaling-chip.scaling-chip--secondary {\n  background: var(--bg-glass);\n}\n.scaling-chip.scaling-chip--has-remove {\n  padding-inline-end: 0.25rem;\n}\n.scaling-chip-remove {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 1.25rem;\n  height: 1.25rem;\n  padding: 0;\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  border: none;\n  border-radius: var(--radius-full);\n  cursor: pointer;\n}\n.scaling-chip-remove:hover {\n  filter: brightness(0.95);\n}\n/*# sourceMappingURL=scaling-chip.component.css.map */\n"] }]
  }], () => [], { customSelect: [{
    type: ViewChild,
    args: [CustomSelectComponent]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ScalingChipComponent, { className: "ScalingChipComponent", filePath: "src/app/shared/scaling-chip/scaling-chip.component.ts", lineNumber: 34 });
})();

// src/app/core/utils/recipe-yield-manager.util.ts
var RecipeYieldManager = class {
  form;
  allUnitKeys;
  resetTrigger;
  fb;
  manualTrigger_ = signal(0);
  constructor(form, allUnitKeys, resetTrigger, fb) {
    this.form = form;
    this.allUnitKeys = allUnitKeys;
    this.resetTrigger = resetTrigger;
    this.fb = fb;
  }
  // --- Computeds ---
  usedUnits_ = computed(() => {
    this.manualTrigger_();
    this.resetTrigger();
    const conversions = this.form().get("yield_conversions");
    if (!conversions?.length)
      return /* @__PURE__ */ new Set();
    return new Set(conversions.value.map((c) => c.unit).filter(Boolean));
  });
  availablePrimaryUnits_ = computed(() => {
    this.manualTrigger_();
    this.resetTrigger();
    const all = this.allUnitKeys();
    const conversions = this.form().get("yield_conversions");
    const usedSecondary = conversions?.length > 1 ? new Set(conversions.controls.slice(1).map((c) => c.get("unit")?.value).filter(Boolean)) : /* @__PURE__ */ new Set();
    return all.filter((u) => !usedSecondary.has(u));
  });
  primaryUnitOptions_ = computed(() => {
    const units = this.availablePrimaryUnits_().map((u) => ({ value: u, label: u }));
    return [...units, { value: "__add_unit__", label: "create_new_unit" }];
  });
  availableSecondaryUnits_ = computed(() => {
    this.manualTrigger_();
    this.resetTrigger();
    const all = this.allUnitKeys();
    const used = this.usedUnits_();
    return all.filter((u) => !used.has(u));
  });
  currentRecipeTypeDisplay_ = computed(() => {
    this.manualTrigger_();
    const fromForm = this.form().get("recipe_type")?.value;
    return fromForm === "dish" ? "dish" : "prep";
  });
  primaryUnitLabel_ = computed(() => {
    this.manualTrigger_();
    this.resetTrigger();
    const f = this.form();
    const type = f.get("recipe_type")?.value;
    if (type === "dish")
      return "dish";
    const conversions = f.get("yield_conversions");
    return conversions?.at(0)?.get("unit")?.value ?? "gram";
  });
  primaryAmount_ = computed(() => {
    this.manualTrigger_();
    this.resetTrigger();
    const f = this.form();
    const type = f.get("recipe_type")?.value;
    if (type === "dish") {
      return f.get("serving_portions")?.value ?? 1;
    }
    const conversions = f.get("yield_conversions");
    return conversions?.at(0)?.get("amount")?.value ?? 0;
  });
  // --- Getters ---
  get secondaryConversions() {
    const conversions = this.form().get("yield_conversions");
    if (!conversions?.length)
      return [];
    return conversions.controls.slice(1);
  }
  // --- Primary methods ---
  setPrimaryUnit(newUnit) {
    const type = this.form().get("recipe_type")?.value;
    if (type === "dish") {
      if (newUnit !== "dish") {
        this.form().get("recipe_type")?.setValue("preparation");
        const conversions = this.form().get("yield_conversions");
        const portions = this.form().get("serving_portions")?.value ?? 1;
        if (conversions?.length > 0) {
          conversions.at(0).patchValue({ unit: newUnit, amount: portions });
        }
      }
    } else {
      const conversions = this.form().get("yield_conversions");
      if (conversions?.length > 0) {
        conversions.at(0).get("unit")?.setValue(newUnit);
      }
    }
    this.manualTrigger_.update((v) => v + 1);
  }
  onPrimaryUnitChange(value) {
    if (value === "NEW_UNIT")
      return "create_unit";
    this.setPrimaryUnit(value);
    return null;
  }
  updatePrimaryAmount(delta) {
    const current = this.primaryAmount_();
    const type = this.form().get("recipe_type")?.value;
    const min = type === "dish" ? 1 : 0;
    const next = delta > 0 ? quantityIncrement(current, min, void 0) : quantityDecrement(current, min, void 0);
    this.applyPrimaryUpdate(next);
  }
  onAmountManualChange(rawValue) {
    const parsedValue = parseFloat(rawValue);
    if (!isNaN(parsedValue)) {
      this.applyPrimaryUpdate(parsedValue);
    }
  }
  onScalingChipAmountChange(value) {
    this.applyPrimaryUpdate(value);
  }
  applyPrimaryUpdate(newValue) {
    const type = this.form().get("recipe_type")?.value;
    const sanitizedValue = Math.max(type === "dish" ? 1 : 0, newValue);
    if (type === "dish") {
      this.form().get("serving_portions")?.setValue(sanitizedValue, { emitEvent: true });
    } else {
      const conversions = this.form().get("yield_conversions");
      conversions.at(0).get("amount")?.setValue(sanitizedValue, { emitEvent: true });
    }
    this.manualTrigger_.update((v) => v + 1);
    this.form().updateValueAndValidity({ emitEvent: true });
  }
  onPrimaryAmountKeydown(e) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    e.preventDefault();
    const current = this.primaryAmount_();
    const type = this.form().get("recipe_type")?.value;
    const min = type === "dish" ? 1 : 0;
    const next = e.key === "ArrowUp" ? quantityIncrement(current, min, void 0) : quantityDecrement(current, min, void 0);
    this.applyPrimaryUpdate(next);
  }
  // --- Secondary methods ---
  addSecondaryUnit(unitSymbol) {
    const conversions = this.form().get("yield_conversions");
    const exists = conversions.value.some((c) => c.unit === unitSymbol);
    if (exists) {
      return;
    }
    const newUnitGroup = this.fb.group({
      amount: [0, [Validators.required, Validators.min(0)]],
      unit: [unitSymbol]
    });
    conversions.push(newUnitGroup);
    this.manualTrigger_.update((v) => v + 1);
  }
  addSecondaryChipWithDefault() {
    const available = this.availableSecondaryUnits_();
    if (available.length === 0)
      return;
    const defaultUnit = available[0];
    this.addSecondaryUnit(defaultUnit);
    const conversions = this.form().get("yield_conversions");
    const last = conversions.at(conversions.length - 1);
    last.get("amount")?.setValue(1, { emitEvent: true });
    this.manualTrigger_.update((v) => v + 1);
  }
  onSecondaryAmountInput(group, rawValue) {
    const parsed = parseFloat(rawValue);
    const amountControl = group.get("amount");
    if (amountControl) {
      amountControl.patchValue(isNaN(parsed) ? 0 : Math.max(0, parsed), { emitEvent: true });
    }
    this.manualTrigger_.update((v) => v + 1);
  }
  updateSecondaryAmount(index, delta) {
    const conversions = this.form().get("yield_conversions");
    const groupIndex = index + 1;
    if (groupIndex >= conversions.length)
      return;
    const group = conversions.at(groupIndex);
    const amountControl = group.get("amount");
    if (!amountControl)
      return;
    const current = amountControl.value ?? 0;
    const next = delta > 0 ? quantityIncrement(current, 0, void 0) : quantityDecrement(current, 0, void 0);
    amountControl.setValue(Math.max(0, next), { emitEvent: true });
    this.manualTrigger_.update((v) => v + 1);
  }
  onSecondaryScalingChipAmountChange(chipIdx, value) {
    const conversions = this.form().get("yield_conversions");
    const groupIndex = chipIdx + 1;
    if (groupIndex >= conversions.length)
      return;
    const group = conversions.at(groupIndex);
    const amountControl = group.get("amount");
    if (amountControl) {
      amountControl.setValue(Math.max(0, value), { emitEvent: true });
    }
    this.manualTrigger_.update((v) => v + 1);
  }
  changeSecondaryUnit(chipIndex, newUnit) {
    const conversions = this.form().get("yield_conversions");
    const groupIndex = chipIndex + 1;
    if (groupIndex >= conversions.length)
      return;
    const group = conversions.at(groupIndex);
    const currentUnit = group.get("unit")?.value;
    if (currentUnit === newUnit)
      return;
    const exists = conversions.controls.some((c, i) => i !== groupIndex && c.get("unit")?.value === newUnit);
    if (exists)
      return;
    group.get("unit")?.setValue(newUnit, { emitEvent: true });
    this.manualTrigger_.update((v) => v + 1);
  }
  onSecondaryAmountKeydown(e, index) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    e.preventDefault();
    this.updateSecondaryAmount(index, e.key === "ArrowUp" ? 1 : -1);
  }
  removeSecondaryUnit(index) {
    const conversions = this.form().get("yield_conversions");
    conversions.removeAt(index + 1);
    this.manualTrigger_.update((v) => v + 1);
  }
  availableUnitsForSecondaryChip_(chipIdx) {
    const conversions = this.form().get("yield_conversions");
    const used = /* @__PURE__ */ new Set();
    conversions.controls.forEach((c) => {
      const u = c.get("unit")?.value;
      if (u)
        used.add(u);
    });
    return this.allUnitKeys().filter((u) => !used.has(u));
  }
  getSecondaryUnitOptions(chipIdx) {
    const available = this.availableUnitsForSecondaryChip_(chipIdx);
    const group = this.secondaryConversions[chipIdx];
    const currentUnit = group?.get("unit")?.value;
    let units = available;
    if (currentUnit && !available.includes(currentUnit)) {
      units = [currentUnit, ...available];
    }
    const options = units.map((u) => ({ value: u, label: u }));
    return [...options, { value: "__add_unit__", label: "create_new_unit" }];
  }
  // --- Type toggle ---
  toggleType() {
    const current = this.form().get("recipe_type")?.value;
    const conversions = this.form().get("yield_conversions");
    if (current === "dish") {
      this.form().get("recipe_type")?.setValue("preparation");
      if (conversions?.length > 0) {
        const portions = this.form().get("serving_portions")?.value ?? 1;
        conversions.at(0).patchValue({ amount: portions, unit: "gram" });
      }
    } else {
      this.form().get("recipe_type")?.setValue("dish");
      if (conversions?.length > 0) {
        const amount = conversions.at(0).get("amount")?.value ?? 1;
        this.form().get("serving_portions")?.setValue(Math.max(1, amount), { emitEvent: true });
        conversions.at(0).patchValue({ unit: "dish" });
      }
    }
    this.manualTrigger_.update((v) => v + 1);
    this.form().updateValueAndValidity({ emitEvent: true });
  }
  // --- Misc ---
  bump() {
    this.manualTrigger_.update((v) => v + 1);
  }
};

// src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts
var _c02 = (a0) => ({ unit: a0 });
function RecipeHeaderComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 4);
    \u0275\u0275element(1, "lucide-icon", 34);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 20);
  }
}
function RecipeHeaderComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "span", 35);
    \u0275\u0275element(1, "lucide-icon", 34);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "input", 36);
    \u0275\u0275listener("change", function RecipeHeaderComponent_Conditional_5_Template_input_change_2_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onImageSelected($event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 18);
  }
}
function RecipeHeaderComponent_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 12);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, ctx_r1.yield.currentRecipeTypeDisplay_() === "dish" ? "duplicate_dish_name" : "duplicate_recipe_name"));
  }
}
function RecipeHeaderComponent_For_24_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-scaling-chip", 37);
    \u0275\u0275listener("valueChange", function RecipeHeaderComponent_For_24_Template_app_scaling_chip_valueChange_0_listener($event) {
      const \u0275$index_53_r4 = \u0275\u0275restoreView(_r3).$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.yield.onSecondaryScalingChipAmountChange(\u0275$index_53_r4, $event));
    })("unitChange", function RecipeHeaderComponent_For_24_Template_app_scaling_chip_unitChange_0_listener($event) {
      const \u0275$index_53_r4 = \u0275\u0275restoreView(_r3).$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.changeSecondaryUnitWrapper(\u0275$index_53_r4, $event));
    })("createUnit", function RecipeHeaderComponent_For_24_Template_app_scaling_chip_createUnit_0_listener() {
      const \u0275$index_53_r4 = \u0275\u0275restoreView(_r3).$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onCreateUnit(\u0275$index_53_r4));
    })("remove", function RecipeHeaderComponent_For_24_Template_app_scaling_chip_remove_0_listener() {
      const \u0275$index_53_r4 = \u0275\u0275restoreView(_r3).$index;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.yield.removeSecondaryUnit(\u0275$index_53_r4));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_11_0;
    let tmp_12_0;
    let tmp_15_0;
    const group_r5 = ctx.$implicit;
    const \u0275$index_53_r4 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275property("value", (tmp_11_0 = (tmp_11_0 = group_r5.get("amount")) == null ? null : tmp_11_0.value) !== null && tmp_11_0 !== void 0 ? tmp_11_0 : 0)("unit", (tmp_12_0 = (tmp_12_0 = group_r5.get("unit")) == null ? null : tmp_12_0.value) !== null && tmp_12_0 !== void 0 ? tmp_12_0 : "")("unitOptions", ctx_r1.yield.getSecondaryUnitOptions(\u0275$index_53_r4))("showRemove", true)("stepOptions", \u0275\u0275pureFunction1(5, _c02, (tmp_15_0 = group_r5.get("unit")) == null ? null : tmp_15_0.value));
  }
}
function RecipeHeaderComponent_Conditional_36_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 38);
    \u0275\u0275listener("click", function RecipeHeaderComponent_Conditional_36_Template_button_click_0_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.clearAllManualLabels();
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 1, "clear_all"), " ");
  }
}
function RecipeHeaderComponent_Conditional_52_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "number");
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind2(1, 1, ctx_r1.totalBrutoWeightG(), "1.0-0"), "g ");
  }
}
function RecipeHeaderComponent_Conditional_53_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "number");
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind2(1, 1, ctx_r1.totalVolumeL(), "1.2-2"), " L ");
  }
}
function RecipeHeaderComponent_Conditional_53_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "number");
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind2(1, 1, ctx_r1.totalVolumeMl(), "1.0-0"), " ml ");
  }
}
function RecipeHeaderComponent_Conditional_53_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, RecipeHeaderComponent_Conditional_53_Conditional_0_Template, 2, 4)(1, RecipeHeaderComponent_Conditional_53_Conditional_1_Template, 2, 4);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275conditional(ctx_r1.totalVolumeL() >= 1 ? 0 : 1);
  }
}
function RecipeHeaderComponent_Conditional_54_Conditional_3_For_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 46);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const name_r9 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(name_r9);
  }
}
function RecipeHeaderComponent_Conditional_54_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 42);
    \u0275\u0275listener("click", function RecipeHeaderComponent_Conditional_54_Conditional_3_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r8);
      return \u0275\u0275resetView($event.stopPropagation());
    })("mouseenter", function RecipeHeaderComponent_Conditional_54_Conditional_3_Template_div_mouseenter_0_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onMetricsNoticeZoneEnter());
    })("mouseleave", function RecipeHeaderComponent_Conditional_54_Conditional_3_Template_div_mouseleave_0_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onMetricsNoticeZoneLeave());
    });
    \u0275\u0275elementStart(1, "p", 43);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 44)(5, "div", 45);
    \u0275\u0275repeaterCreate(6, RecipeHeaderComponent_Conditional_54_Conditional_3_For_7_Template, 2, 1, "div", 46, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275element(8, "div", 47)(9, "div", 48);
    \u0275\u0275elementStart(10, "div", 49);
    \u0275\u0275element(11, "lucide-icon", 50);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 51);
    \u0275\u0275element(13, "lucide-icon", 52);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 3, "not_convertible"));
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r1.unconvertibleNamesFiltered_());
    \u0275\u0275advance(5);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
  }
}
function RecipeHeaderComponent_Conditional_54_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "span", 39);
    \u0275\u0275listener("click", function RecipeHeaderComponent_Conditional_54_Template_span_click_0_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      $event.stopPropagation();
      return \u0275\u0275resetView(ctx_r1.toggleMetricsNotice());
    });
    \u0275\u0275element(1, "lucide-icon", 40);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(3, RecipeHeaderComponent_Conditional_54_Conditional_3_Template, 14, 5, "div", 41);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("size", 16)("title", \u0275\u0275pipeBind1(2, 3, "items_not_convertible"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.metricsNoticeOpen_() ? 3 : -1);
  }
}
var RecipeHeaderComponent = class _RecipeHeaderComponent {
  // INJECTED
  fb = inject(FormBuilder);
  unitRegistryService = inject(UnitRegistryService);
  kitchenStateService = inject(KitchenStateService);
  metadataRegistry = inject(MetadataRegistryService);
  translationService = inject(TranslationService);
  labelCreationModal = inject(LabelCreationModalService);
  cdr = inject(ChangeDetectorRef);
  // INPUTS
  form = input.required();
  recipeType = input();
  imageUrl = input(null);
  readonlyMode = input(false);
  currentCost = input(0);
  totalWeightG = input(0);
  totalBrutoWeightG = input(0);
  totalVolumeL = input(0);
  totalVolumeMl = input(0);
  unconvertibleForWeight = input([]);
  unconvertibleForVolume = input([]);
  resetTrigger = input(0);
  autoLabels = input([]);
  // OUTPUTS
  openUnitCreator = output();
  imageChange = output();
  importTextClick = output();
  // YIELD MANAGER
  yield = new RecipeYieldManager(this.form, this.unitRegistryService.allUnitKeys_, this.resetTrigger, this.fb);
  // SIGNALS & CONSTANTS
  placeholderPath = "assets/style/img/recipe_placeholder.png";
  activeUnit = signal(null);
  // LABELS
  labelMultiSelectOptions_ = computed(() => {
    const all = this.metadataRegistry.allLabels_().map((l) => ({
      value: l.key,
      label: l.key,
      color: l.color
    }));
    return [...all, { value: "__add_label__", label: "create_new_label" }];
  });
  get labelsControl() {
    return this.form().get("labels");
  }
  hasManualLabels_ = computed(() => {
    const arr = this.form().get("labels")?.value ?? [];
    return arr.length > 0;
  });
  hasAnyLabelsInContainer_ = computed(() => {
    const manual = this.form().get("labels")?.value ?? [];
    const auto = this.autoLabels();
    return manual.length > 0 || auto.length > 0;
  });
  // WRAPPERS — CDR / output handling
  toggleTypeWrapper() {
    this.yield.toggleType();
    this.cdr.markForCheck();
  }
  onPrimaryUnitChangeWrapper(event) {
    const value = event.target.value;
    const result = this.yield.onPrimaryUnitChange(value);
    if (result === "create_unit") {
      this.onCreateUnit();
      event.target.value = this.yield.primaryUnitLabel_();
    }
  }
  changeSecondaryUnitWrapper(chipIndex, newUnit) {
    this.yield.changeSecondaryUnit(chipIndex, newUnit);
    this.cdr.detectChanges();
  }
  // CREATE UNIT
  onCreateUnit(secondaryChipIndex) {
    this.unitRegistryService.openUnitCreator();
    this.unitRegistryService.unitAdded$.pipe(take(1)).subscribe((newUnit) => {
      if (secondaryChipIndex === void 0) {
        this.yield.setPrimaryUnit(newUnit);
      } else {
        this.changeSecondaryUnitWrapper(secondaryChipIndex, newUnit);
      }
    });
  }
  // METRICS
  metricsDisplayMode_ = signal("weight");
  metricsNoticeOpen_ = signal(false);
  toggleMetricsDisplayMode() {
    this.metricsDisplayMode_.update((m) => m === "weight" ? "volume" : "weight");
    this.metricsNoticeOpen_.set(false);
  }
  toggleMetricsNotice() {
    this.metricsNoticeOpen_.update((v) => !v);
  }
  closeMetricsNotice() {
    this.metricsNoticeOpen_.set(false);
  }
  metricsNoticeCloseTimeout_ = null;
  onMetricsNoticeZoneEnter() {
    if (this.metricsNoticeCloseTimeout_ != null) {
      clearTimeout(this.metricsNoticeCloseTimeout_);
      this.metricsNoticeCloseTimeout_ = null;
    }
    if (this.unconvertibleNamesFiltered_().length > 0) {
      this.metricsNoticeOpen_.set(true);
    }
  }
  onMetricsNoticeZoneLeave() {
    if (this.metricsNoticeCloseTimeout_ != null) {
      clearTimeout(this.metricsNoticeCloseTimeout_);
    }
    this.metricsNoticeCloseTimeout_ = setTimeout(() => {
      this.metricsNoticeCloseTimeout_ = null;
      this.metricsNoticeOpen_.set(false);
    }, 150);
  }
  unconvertibleNamesForCurrentMode_ = computed(() => {
    return this.metricsDisplayMode_() === "weight" ? this.unconvertibleForWeight() : this.unconvertibleForVolume();
  });
  unconvertibleNamesFiltered_ = computed(() => this.unconvertibleNamesForCurrentMode_().filter((n) => n != null && String(n).trim().length > 0));
  showMetricsNoticeIcon_ = computed(() => this.metricsDisplayMode_() === "volume" && this.unconvertibleNamesFiltered_().length > 0);
  // LABELS ACTIONS
  clearAllManualLabels() {
    this.form().get("labels")?.setValue([], { emitEvent: true });
  }
  openCreateLabel() {
    return __async(this, null, function* () {
      const result = yield this.labelCreationModal.open();
      if (!result?.key || !result?.hebrewLabel)
        return;
      try {
        this.translationService.updateDictionary(result.key, result.hebrewLabel);
        yield this.metadataRegistry.registerLabel(result.key, result.color, result.autoTriggers);
        const current = this.form().get("labels")?.value ?? [];
        if (!current.includes(result.key)) {
          this.form().get("labels")?.setValue([...current, result.key], { emitEvent: true });
        }
      } catch {
      }
    });
  }
  // UPDATE
  onImageSelected(event) {
    if (this.readonlyMode())
      return;
    const file = event.target.files?.[0];
    if (!file)
      return;
    const reader = new FileReader();
    reader.onload = () => {
      this.imageChange.emit(reader.result);
    };
    reader.readAsDataURL(file);
  }
  static \u0275fac = function RecipeHeaderComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RecipeHeaderComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _RecipeHeaderComponent, selectors: [["app-recipe-header"]], inputs: { form: [1, "form"], recipeType: [1, "recipeType"], imageUrl: [1, "imageUrl"], readonlyMode: [1, "readonlyMode"], currentCost: [1, "currentCost"], totalWeightG: [1, "totalWeightG"], totalBrutoWeightG: [1, "totalBrutoWeightG"], totalVolumeL: [1, "totalVolumeL"], totalVolumeMl: [1, "totalVolumeMl"], unconvertibleForWeight: [1, "unconvertibleForWeight"], unconvertibleForVolume: [1, "unconvertibleForVolume"], resetTrigger: [1, "resetTrigger"], autoLabels: [1, "autoLabels"] }, outputs: { openUnitCreator: "openUnitCreator", imageChange: "imageChange", importTextClick: "importTextClick" }, decls: 55, vars: 51, consts: [["dir", "rtl", 1, "header-dashboard-container", 3, "formGroup"], [1, "image-square"], [1, "img-upload-label"], ["alt", "", 1, "header-img", 3, "src"], [1, "img-upload-prompt"], [1, "center-controls"], [1, "top-row"], ["type", "button", 1, "type-toggle-btn", 3, "click"], ["type", "button", 1, "import-text-btn", 3, "click"], ["name", "scan-text", 3, "size"], [1, "recipe-name-wrap"], ["formControlName", "name_hebrew", 1, "recipe-name-input", 3, "placeholder"], [1, "name-error-msg"], [1, "scaling-dock-grid"], [1, "primary-chip-wrapper"], ["variant", "primary", 3, "valueChange", "unitChange", "createUnit", "value", "unit", "unitOptions", "minAmount", "stepOptions"], [1, "secondary-units-container"], ["variant", "secondary", 3, "value", "unit", "unitOptions", "showRemove", "stepOptions"], [1, "add-unit-wrapper"], ["type", "button", 1, "add-custom-chip", 3, "click"], ["name", "plus", 3, "size"], [1, "labels-container"], [1, "labels-grid-row-wrap"], [1, "labels-grid-row"], ["placeholder", "labels", "addNewValue", "__add_label__", "variant", "chip", 3, "addNewChosen", "formControl", "options", "readonlyChips", "maxHeight"], [1, "labels-actions"], [1, "labels-btn-label"], ["type", "button", "tabindex", "-1", 1, "labels-btn-clear"], [1, "metrics-square"], [1, "metric-group"], [1, "label"], [1, "value"], [1, "divider"], [1, "metric-group", "metric-group-weight-volume", 3, "click", "clickOutside", "mouseenter", "mouseleave"], ["name", "camera", 3, "size"], [1, "img-upload-hover-overlay"], ["type", "file", "accept", "image/*", 1, "img-file-input", 3, "change"], ["variant", "secondary", 3, "valueChange", "unitChange", "createUnit", "remove", "value", "unit", "unitOptions", "showRemove", "stepOptions"], ["type", "button", "tabindex", "-1", 1, "labels-btn-clear", 3, "click"], [1, "metrics-notice-wrap", 3, "click"], ["name", "alert-circle", 1, "metrics-notice-icon", 3, "size", "title"], [1, "metrics-notice-floating"], [1, "metrics-notice-floating", 3, "click", "mouseenter", "mouseleave"], [1, "metrics-notice-title"], [1, "metrics-notice-list-wrap"], ["scrollIndicators", "", 1, "metrics-notice-list"], [1, "metrics-notice-item"], ["aria-hidden", "true", 1, "metrics-notice-scroll-zone", "metrics-notice-scroll-zone--top"], ["aria-hidden", "true", 1, "metrics-notice-scroll-zone", "metrics-notice-scroll-zone--bottom"], ["aria-hidden", "true", 1, "metrics-notice-scroll-indicator", "metrics-notice-scroll-indicator--top"], ["name", "chevron-up", 3, "size"], ["aria-hidden", "true", 1, "metrics-notice-scroll-indicator", "metrics-notice-scroll-indicator--bottom"], ["name", "chevron-down", 3, "size"]], template: function RecipeHeaderComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "label", 2);
      \u0275\u0275element(3, "img", 3);
      \u0275\u0275template(4, RecipeHeaderComponent_Conditional_4_Template, 2, 1, "span", 4)(5, RecipeHeaderComponent_Conditional_5_Template, 3, 1);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(6, "div", 5)(7, "div", 6)(8, "button", 7);
      \u0275\u0275listener("click", function RecipeHeaderComponent_Template_button_click_8_listener() {
        return ctx.toggleTypeWrapper();
      });
      \u0275\u0275text(9);
      \u0275\u0275pipe(10, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(11, "button", 8);
      \u0275\u0275listener("click", function RecipeHeaderComponent_Template_button_click_11_listener() {
        return ctx.importTextClick.emit();
      });
      \u0275\u0275element(12, "lucide-icon", 9);
      \u0275\u0275text(13);
      \u0275\u0275pipe(14, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(15, "div", 10);
      \u0275\u0275element(16, "input", 11);
      \u0275\u0275pipe(17, "translatePipe");
      \u0275\u0275template(18, RecipeHeaderComponent_Conditional_18_Template, 3, 3, "span", 12);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(19, "div", 13)(20, "div", 14)(21, "app-scaling-chip", 15);
      \u0275\u0275listener("valueChange", function RecipeHeaderComponent_Template_app_scaling_chip_valueChange_21_listener($event) {
        return ctx.yield.onScalingChipAmountChange($event);
      })("unitChange", function RecipeHeaderComponent_Template_app_scaling_chip_unitChange_21_listener($event) {
        return ctx.yield.setPrimaryUnit($event);
      })("createUnit", function RecipeHeaderComponent_Template_app_scaling_chip_createUnit_21_listener() {
        return ctx.onCreateUnit();
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(22, "div", 16);
      \u0275\u0275repeaterCreate(23, RecipeHeaderComponent_For_24_Template, 1, 7, "app-scaling-chip", 17, \u0275\u0275repeaterTrackByIndex);
      \u0275\u0275elementStart(25, "div", 18)(26, "button", 19);
      \u0275\u0275listener("click", function RecipeHeaderComponent_Template_button_click_26_listener() {
        return ctx.yield.addSecondaryChipWithDefault();
      });
      \u0275\u0275element(27, "lucide-icon", 20);
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(28, "div", 21)(29, "div", 22)(30, "div", 23)(31, "app-custom-multi-select", 24);
      \u0275\u0275listener("addNewChosen", function RecipeHeaderComponent_Template_app_custom_multi_select_addNewChosen_31_listener() {
        return ctx.openCreateLabel();
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(32, "div", 25)(33, "span", 26);
      \u0275\u0275text(34);
      \u0275\u0275pipe(35, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275template(36, RecipeHeaderComponent_Conditional_36_Template, 3, 3, "button", 27);
      \u0275\u0275elementEnd()()()()();
      \u0275\u0275elementStart(37, "div", 28)(38, "div", 29)(39, "span", 30);
      \u0275\u0275text(40);
      \u0275\u0275pipe(41, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(42, "span", 31);
      \u0275\u0275text(43);
      \u0275\u0275pipe(44, "number");
      \u0275\u0275elementEnd()();
      \u0275\u0275element(45, "div", 32);
      \u0275\u0275elementStart(46, "div", 33);
      \u0275\u0275listener("click", function RecipeHeaderComponent_Template_div_click_46_listener() {
        return ctx.toggleMetricsDisplayMode();
      })("clickOutside", function RecipeHeaderComponent_Template_div_clickOutside_46_listener() {
        return ctx.closeMetricsNotice();
      })("mouseenter", function RecipeHeaderComponent_Template_div_mouseenter_46_listener() {
        return ctx.onMetricsNoticeZoneEnter();
      })("mouseleave", function RecipeHeaderComponent_Template_div_mouseleave_46_listener() {
        return ctx.onMetricsNoticeZoneLeave();
      });
      \u0275\u0275elementStart(47, "span", 30);
      \u0275\u0275text(48);
      \u0275\u0275pipe(49, "translatePipe");
      \u0275\u0275pipe(50, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(51, "span", 31);
      \u0275\u0275template(52, RecipeHeaderComponent_Conditional_52_Template, 2, 4)(53, RecipeHeaderComponent_Conditional_53_Template, 2, 1);
      \u0275\u0275elementEnd();
      \u0275\u0275template(54, RecipeHeaderComponent_Conditional_54_Template, 4, 5);
      \u0275\u0275elementEnd()()();
    }
    if (rf & 2) {
      let tmp_9_0;
      let tmp_11_0;
      \u0275\u0275property("formGroup", ctx.form());
      \u0275\u0275advance();
      \u0275\u0275classProp("is-readonly", ctx.readonlyMode());
      \u0275\u0275advance(2);
      \u0275\u0275property("src", ctx.imageUrl() || ctx.placeholderPath, \u0275\u0275sanitizeUrl);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.imageUrl() ? 4 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.readonlyMode() ? 5 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275classProp("dish-mode", ctx.yield.currentRecipeTypeDisplay_() === "dish");
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(10, 32, ctx.yield.currentRecipeTypeDisplay_()), " ");
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(14, 34, "import_text_btn"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275classProp("has-error", ((tmp_9_0 = ctx.form().get("name_hebrew")) == null ? null : tmp_9_0.invalid) && ((tmp_9_0 = ctx.form().get("name_hebrew")) == null ? null : tmp_9_0.touched));
      \u0275\u0275property("placeholder", \u0275\u0275pipeBind1(17, 36, ctx.yield.currentRecipeTypeDisplay_() === "dish" ? "dish_name_placeholder" : "recipe_name_placeholder") + "...");
      \u0275\u0275advance(2);
      \u0275\u0275conditional(((tmp_11_0 = ctx.form().get("name_hebrew")) == null ? null : tmp_11_0.errors == null ? null : tmp_11_0.errors["duplicateName"]) && ((tmp_11_0 = ctx.form().get("name_hebrew")) == null ? null : tmp_11_0.touched) ? 18 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275property("value", ctx.yield.primaryAmount_())("unit", ctx.yield.primaryUnitLabel_())("unitOptions", ctx.yield.primaryUnitOptions_())("minAmount", ctx.yield.currentRecipeTypeDisplay_() === "dish" ? 1 : 0)("stepOptions", \u0275\u0275pureFunction1(49, _c02, ctx.yield.primaryUnitLabel_()));
      \u0275\u0275advance(2);
      \u0275\u0275repeater(ctx.yield.secondaryConversions);
      \u0275\u0275advance(4);
      \u0275\u0275property("size", 16);
      \u0275\u0275advance(4);
      \u0275\u0275property("formControl", ctx.labelsControl)("options", ctx.labelMultiSelectOptions_())("readonlyChips", ctx.autoLabels())("maxHeight", 200);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(35, 38, "labels"));
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.hasAnyLabelsInContainer_() ? 36 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(41, 40, "cost"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1("\u20AA", \u0275\u0275pipeBind2(44, 42, ctx.currentCost(), "1.2-2"), "");
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(ctx.metricsDisplayMode_() === "weight" ? \u0275\u0275pipeBind1(49, 45, "weight") : \u0275\u0275pipeBind1(50, 47, "volume"));
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.metricsDisplayMode_() === "weight" ? 52 : 53);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.showMetricsNoticeIcon_() ? 54 : -1);
    }
  }, dependencies: [CommonModule, DecimalPipe, ReactiveFormsModule, DefaultValueAccessor, NgControlStatus, NgControlStatusGroup, FormControlDirective, FormGroupDirective, FormControlName, LucideAngularModule, LucideAngularComponent, ClickOutSideDirective, TranslatePipe, CustomMultiSelectComponent, ScalingChipComponent, ScrollIndicatorsDirective], styles: ['\n\n.header-dashboard-container[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: auto minmax(0, 1fr) auto;\n  align-items: stretch;\n  gap: 1.5rem;\n  padding: 1.25rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.image-square[_ngcontent-%COMP%] {\n  align-self: center;\n  width: 7.5rem;\n  height: 7.5rem;\n  aspect-ratio: 1/1;\n  overflow: hidden;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n}\n.image-square.is-readonly[_ngcontent-%COMP%] {\n  cursor: default;\n}\n.image-square[_ngcontent-%COMP%]   .header-img[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n.img-upload-label[_ngcontent-%COMP%] {\n  display: block;\n  position: relative;\n  width: 100%;\n  height: 100%;\n  cursor: inherit;\n}\n.img-upload-label[_ngcontent-%COMP%]   .img-file-input[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  width: 100%;\n  height: 100%;\n  opacity: 0;\n  cursor: pointer;\n}\n.img-upload-label[_ngcontent-%COMP%]   .img-upload-prompt[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: var(--color-text-muted);\n  background: var(--bg-muted);\n}\n.img-upload-label[_ngcontent-%COMP%]   .img-upload-hover-overlay[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(0, 0, 0, 0.4);\n  color: #fff;\n  opacity: 0;\n  transition: opacity 0.2s ease;\n  pointer-events: none;\n}\n.img-upload-label[_ngcontent-%COMP%]:hover   .img-upload-hover-overlay[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.center-controls[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n  min-width: 0;\n  gap: 1rem;\n}\n.center-controls[_ngcontent-%COMP%]   .top-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.center-controls[_ngcontent-%COMP%]   .recipe-name-wrap[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  min-width: 0;\n}\n.center-controls[_ngcontent-%COMP%]   .recipe-name-input[_ngcontent-%COMP%] {\n  width: 100%;\n  background: transparent;\n  color: var(--color-text-main);\n  font-size: 1.4rem;\n  font-weight: 800;\n  border: none;\n  border-block-end: 2px solid var(--border-default);\n  outline: none;\n  transition: border-color 0.2s ease;\n}\n.center-controls[_ngcontent-%COMP%]   .recipe-name-input[_ngcontent-%COMP%]:focus {\n  border-color: var(--color-primary);\n}\n.center-controls[_ngcontent-%COMP%]   .recipe-name-input.has-error[_ngcontent-%COMP%] {\n  border-block-end-color: var(--color-danger);\n}\n.center-controls[_ngcontent-%COMP%]   .name-error-msg[_ngcontent-%COMP%] {\n  margin-block-start: 0.25rem;\n  font-size: 0.75rem;\n  color: var(--color-danger);\n}\n.center-controls[_ngcontent-%COMP%]   .top-row[_ngcontent-%COMP%]   .type-toggle-btn[_ngcontent-%COMP%] {\n  padding: 0.4rem 1rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  font-size: 0.8rem;\n  font-weight: 800;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.center-controls[_ngcontent-%COMP%]   .top-row[_ngcontent-%COMP%]   .type-toggle-btn.dish-mode[_ngcontent-%COMP%] {\n  background: var(--bg-success);\n  color: var(--text-success);\n  border-color: rgba(167, 243, 208, 0.6);\n}\n.center-controls[_ngcontent-%COMP%]   .import-text-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.3rem;\n  padding: 0.35rem 0.75rem;\n  background: transparent;\n  color: var(--color-text-muted);\n  font-size: 0.75rem;\n  font-weight: 600;\n  border: 1px dashed var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  white-space: nowrap;\n  transition: border-color 0.2s ease, color 0.2s ease;\n}\n.center-controls[_ngcontent-%COMP%]   .import-text-btn[_ngcontent-%COMP%]:hover {\n  border-color: var(--color-primary);\n  color: var(--color-primary);\n}\n.scaling-dock-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: auto minmax(0, 1fr);\n  align-items: center;\n  gap: 0.75rem;\n  margin-block-start: 1rem;\n}\n.primary-chip-wrapper[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  overflow: visible;\n}\n.secondary-units-container[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n  padding-inline-end: 0.75rem;\n  overflow: visible;\n  border-inline-end: 2px solid var(--bg-muted);\n}\n.secondary-units-container[_ngcontent-%COMP%]   .add-unit-wrapper[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n}\n.add-custom-chip[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 2rem;\n  height: 2rem;\n  background: none;\n  color: var(--color-text-muted-light);\n  border: 2px dashed var(--border-strong);\n  border-radius: var(--radius-full);\n  cursor: pointer;\n  transition:\n    color 0.2s ease,\n    background 0.2s ease,\n    border-color 0.2s ease;\n}\n.add-custom-chip[_ngcontent-%COMP%]:hover {\n  color: var(--color-primary);\n  background-color: var(--bg-glass);\n  border-color: var(--color-primary);\n}\n.metrics-square[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-self: center;\n  gap: 0.75rem;\n  min-width: 6.25rem;\n  height: 7.5rem;\n  padding: 1rem;\n  background: var(--color-primary);\n  color: var(--bg-pure);\n  font-size: 0.8rem;\n  text-align: center;\n  border-radius: var(--radius-md);\n}\n.metrics-square[_ngcontent-%COMP%]   .metric-group[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  display: block;\n  margin-block-end: 0.125rem;\n  font-size: 0.65rem;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  opacity: 0.8;\n}\n.metrics-square[_ngcontent-%COMP%]   .metric-group[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  font-size: 1.1rem;\n  font-weight: 900;\n}\n.metrics-square[_ngcontent-%COMP%]   .divider[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 1px;\n  background: rgba(255, 255, 255, 0.2);\n}\n.metrics-square[_ngcontent-%COMP%]   .metric-group-weight-volume[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-wrap: wrap;\n  gap: 0.25rem;\n  cursor: pointer;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-icon[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  color: var(--bg-danger-subtle);\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-floating[_ngcontent-%COMP%] {\n  position: absolute;\n  bottom: 100%;\n  left: 50%;\n  transform: translateX(-50%);\n  z-index: 20;\n  gap: 0.5rem;\n  margin-block-end: 0.35rem;\n  min-width: 7.5rem;\n  max-width: 12.5rem;\n  max-height: 9rem;\n  padding: 0.2rem 0.5rem 0.7rem 0.5rem;\n  background: var(--bg-glass-strong);\n  color: var(--color-text-secondary);\n  font-size: 0.8rem;\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-sm);\n  box-shadow: var(--shadow-glass);\n  overflow: hidden;\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n  display: flex;\n  flex-direction: column;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-title[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  margin: 0 0 0.35rem 0;\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: var(--color-danger);\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-list-wrap[_ngcontent-%COMP%] {\n  flex: 0 1 auto;\n  min-height: 0;\n  overflow: hidden;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-list[_ngcontent-%COMP%] {\n  min-height: 1.5rem;\n  max-height: 8rem;\n  overflow-y: auto;\n  scrollbar-width: none;\n  -ms-overflow-style: none;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-list[_ngcontent-%COMP%]::-webkit-scrollbar {\n  display: none;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-scroll-zone--top[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 0;\n  inset-inline: 0;\n  z-index: 2;\n  height: 2rem;\n  pointer-events: none;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-scroll-zone--bottom[_ngcontent-%COMP%] {\n  position: absolute;\n  bottom: 0;\n  inset-inline: 0;\n  z-index: 2;\n  height: 2rem;\n  pointer-events: none;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-scroll-indicator--top[_ngcontent-%COMP%], \n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-scroll-indicator--bottom[_ngcontent-%COMP%] {\n  position: absolute;\n  inset-inline: 0;\n  z-index: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding-block: 0.2rem;\n  min-height: 1.25rem;\n  color: var(--color-text-secondary);\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity 0.2s var(--ease-smooth);\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-scroll-indicator--top[_ngcontent-%COMP%] {\n  top: 18px;\n  bottom: auto;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-scroll-indicator--bottom[_ngcontent-%COMP%] {\n  top: auto;\n  bottom: -7px;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-list-wrap[_ngcontent-%COMP%]:has(.metrics-notice-list.can-scroll-up)   .metrics-notice-scroll-indicator--top[_ngcontent-%COMP%] {\n  opacity: 0.8;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-list-wrap[_ngcontent-%COMP%]:has(.metrics-notice-list.can-scroll-down)   .metrics-notice-scroll-indicator--bottom[_ngcontent-%COMP%] {\n  opacity: 0.8;\n}\n.metrics-square[_ngcontent-%COMP%]   .metrics-notice-item[_ngcontent-%COMP%] {\n  padding: 0.2rem 0;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.labels-container[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.labels-grid-row-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n}\n.labels-grid-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: stretch;\n  gap: 0.5rem;\n  min-height: 2.25rem;\n}\n.labels-grid-row[_ngcontent-%COMP%]   app-custom-multi-select[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.labels-actions[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.35rem;\n  flex-shrink: 0;\n}\n.labels-btn-label[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  font-weight: 600;\n  color: var(--color-primary);\n}\n.labels-btn-clear[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding-inline: 0.5rem;\n  padding-block: 0.35rem;\n  background: transparent;\n  color: var(--color-text-muted);\n  font-size: 0.75rem;\n  font-weight: 600;\n  border: none;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: color 0.15s ease, background 0.15s ease;\n}\n.labels-btn-clear[_ngcontent-%COMP%]:hover {\n  color: var(--color-danger);\n  background: var(--bg-danger-subtle);\n}\n@media (max-width: 40.625rem) {\n  .header-dashboard-container[_ngcontent-%COMP%] {\n    grid-template-columns: 50% 50%;\n    grid-template-areas: "title " "primary-unit " "secondary-units " "image ";\n    gap: 1.5rem;\n    place-items: center;\n  }\n  .center-controls[_ngcontent-%COMP%] {\n    display: contents;\n  }\n  .top-row[_ngcontent-%COMP%] {\n    grid-area: title;\n    grid-column: 1/3;\n    width: 80%;\n  }\n  .scaling-dock-grid[_ngcontent-%COMP%] {\n    display: contents;\n  }\n  .primary-chip-wrapper[_ngcontent-%COMP%] {\n    grid-area: primary-unit;\n    grid-column: 1/3;\n    justify-content: center;\n  }\n  .secondary-units-container[_ngcontent-%COMP%] {\n    grid-area: secondary-units;\n    grid-column: 1/3;\n    width: 90%;\n    padding-inline-end: 0;\n    padding-block-end: 1rem;\n    border-inline-end: none;\n    border-block-end: 2px solid var(--bg-muted);\n  }\n  .image-square[_ngcontent-%COMP%] {\n    grid-area: image;\n    grid-column: 1;\n  }\n  .metrics-square[_ngcontent-%COMP%] {\n    grid-area: image;\n    grid-column: 2;\n  }\n  .metrics-square[_ngcontent-%COMP%]   .divider[_ngcontent-%COMP%] {\n    width: 1px;\n    height: 20px;\n  }\n}\n/*# sourceMappingURL=recipe-header.component.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RecipeHeaderComponent, [{
    type: Component,
    args: [{ selector: "app-recipe-header", standalone: true, imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ClickOutSideDirective, TranslatePipe, CustomMultiSelectComponent, ScalingChipComponent, ScrollIndicatorsDirective], template: `<div class="header-dashboard-container" [formGroup]="form()" dir="rtl">
    <div class="image-square" [class.is-readonly]="readonlyMode()">
        <label class="img-upload-label">
            <img [src]="imageUrl() || placeholderPath" class="header-img" alt="" />
            @if (!imageUrl()) {
                <span class="img-upload-prompt">
                    <lucide-icon name="camera" [size]="20" />
                </span>
            }
            @if (!readonlyMode()) {
                <span class="img-upload-hover-overlay">
                    <lucide-icon name="camera" [size]="18" />
                </span>
                <input type="file" accept="image/*" class="img-file-input" (change)="onImageSelected($event)" />
            }
        </label>
    </div>

    <div class="center-controls">
        <div class="top-row">
            <button type="button"
                (click)="toggleTypeWrapper()"
                class="type-toggle-btn"
                [class.dish-mode]="yield.currentRecipeTypeDisplay_() === 'dish'">
                {{ yield.currentRecipeTypeDisplay_() | translatePipe }}
            </button>

            <button type="button" class="import-text-btn" (click)="importTextClick.emit()">
                <lucide-icon name="scan-text" [size]="15"></lucide-icon>
                {{ 'import_text_btn' | translatePipe }}
            </button>

            <div class="recipe-name-wrap">
                <input formControlName="name_hebrew"
                    [placeholder]="((yield.currentRecipeTypeDisplay_() === 'dish' ? 'dish_name_placeholder' : 'recipe_name_placeholder') | translatePipe) + '...'"
                    class="recipe-name-input"
                    [class.has-error]="form().get('name_hebrew')?.invalid && form().get('name_hebrew')?.touched" />
                @if (form().get('name_hebrew')?.errors?.['duplicateName'] && form().get('name_hebrew')?.touched) {
                    <span class="name-error-msg">{{ (yield.currentRecipeTypeDisplay_() === 'dish' ? 'duplicate_dish_name' : 'duplicate_recipe_name') | translatePipe }}</span>
                }
            </div>
        </div>

        <div class="scaling-dock-grid">
            <div class="primary-chip-wrapper">
                <app-scaling-chip
                    variant="primary"
                    [value]="yield.primaryAmount_()"
                    [unit]="yield.primaryUnitLabel_()"
                    [unitOptions]="yield.primaryUnitOptions_()"
                    [minAmount]="yield.currentRecipeTypeDisplay_() === 'dish' ? 1 : 0"
                    [stepOptions]="{ unit: yield.primaryUnitLabel_() }"
                    (valueChange)="yield.onScalingChipAmountChange($event)"
                    (unitChange)="yield.setPrimaryUnit($event)"
                    (createUnit)="onCreateUnit()" />
            </div>

            <div class="secondary-units-container">
                @for (group of yield.secondaryConversions; track $index; let chipIdx = $index) {
                <app-scaling-chip
                    variant="secondary"
                    [value]="group.get('amount')?.value ?? 0"
                    [unit]="group.get('unit')?.value ?? ''"
                    [unitOptions]="yield.getSecondaryUnitOptions(chipIdx)"
                    [showRemove]="true"
                    [stepOptions]="{ unit: group.get('unit')?.value }"
                    (valueChange)="yield.onSecondaryScalingChipAmountChange(chipIdx, $event)"
                    (unitChange)="changeSecondaryUnitWrapper(chipIdx, $event)"
                    (createUnit)="onCreateUnit(chipIdx)"
                    (remove)="yield.removeSecondaryUnit(chipIdx)" />
                }

                <div class="add-unit-wrapper">
                    <button type="button" class="add-custom-chip" (click)="yield.addSecondaryChipWithDefault()">
                        <lucide-icon name="plus" [size]="16"></lucide-icon>
                    </button>
                </div>
            </div>
        </div>

        <div class="labels-container">
            <div class="labels-grid-row-wrap">
                <div class="labels-grid-row">
                    <app-custom-multi-select
                        [formControl]="labelsControl"
                        [options]="labelMultiSelectOptions_()"
                        [readonlyChips]="autoLabels()"
                        placeholder="labels"
                        addNewValue="__add_label__"
                        variant="chip"
                        [maxHeight]="200"
                        (addNewChosen)="openCreateLabel()" />
                    <div class="labels-actions">
                        <span class="labels-btn-label">{{ 'labels' | translatePipe }}</span>
                        @if (hasAnyLabelsInContainer_()) {
                            <button type="button" class="labels-btn-clear" tabindex="-1"
                                (click)="clearAllManualLabels(); $event.stopPropagation()">
                                {{ 'clear_all' | translatePipe }}
                            </button>
                        }
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="metrics-square">
        <div class="metric-group">
            <span class="label">{{ 'cost' | translatePipe }}</span>
            <span class="value">\u20AA{{ currentCost() | number:'1.2-2' }}</span>
        </div>
        <div class="divider"></div>
        <div class="metric-group metric-group-weight-volume" (click)="toggleMetricsDisplayMode()"
            (clickOutside)="closeMetricsNotice()"
            (mouseenter)="onMetricsNoticeZoneEnter()" (mouseleave)="onMetricsNoticeZoneLeave()">
            <span class="label">{{ metricsDisplayMode_() === 'weight' ? ('weight' | translatePipe) : ('volume' | translatePipe) }}</span>
            <span class="value">
                @if (metricsDisplayMode_() === 'weight') {
                    {{ totalBrutoWeightG() | number:'1.0-0' }}g
                } @else {
                    @if (totalVolumeL() >= 1) {
                        {{ totalVolumeL() | number:'1.2-2' }} L
                    } @else {
                        {{ totalVolumeMl() | number:'1.0-0' }} ml
                    }
                }
            </span>
            @if (showMetricsNoticeIcon_()) {
                <span class="metrics-notice-wrap" (click)="$event.stopPropagation(); toggleMetricsNotice()">
                    <lucide-icon name="alert-circle" class="metrics-notice-icon" [size]="16" [title]="'items_not_convertible' | translatePipe"></lucide-icon>
                </span>
                @if (metricsNoticeOpen_()) {
                    <div class="metrics-notice-floating" (click)="$event.stopPropagation()"
                        (mouseenter)="onMetricsNoticeZoneEnter()" (mouseleave)="onMetricsNoticeZoneLeave()">
                        <p class="metrics-notice-title">{{ 'not_convertible' | translatePipe }}</p>
                        <div class="metrics-notice-list-wrap">
                            <div class="metrics-notice-list" scrollIndicators>
                                @for (name of unconvertibleNamesFiltered_(); track name) {
                                    <div class="metrics-notice-item">{{ name }}</div>
                                }
                            </div>
                            <div class="metrics-notice-scroll-zone metrics-notice-scroll-zone--top" aria-hidden="true"></div>
                            <div class="metrics-notice-scroll-zone metrics-notice-scroll-zone--bottom" aria-hidden="true"></div>
                            <div class="metrics-notice-scroll-indicator metrics-notice-scroll-indicator--top" aria-hidden="true">
                                <lucide-icon name="chevron-up" [size]="16"></lucide-icon>
                            </div>
                            <div class="metrics-notice-scroll-indicator metrics-notice-scroll-indicator--bottom" aria-hidden="true">
                                <lucide-icon name="chevron-down" [size]="16"></lucide-icon>
                            </div>
                        </div>
                    </div>
                }
            }
        </div>
    </div>
</div>
`, styles: ['/* src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss */\n.header-dashboard-container {\n  display: grid;\n  grid-template-columns: auto minmax(0, 1fr) auto;\n  align-items: stretch;\n  gap: 1.5rem;\n  padding: 1.25rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.image-square {\n  align-self: center;\n  width: 7.5rem;\n  height: 7.5rem;\n  aspect-ratio: 1/1;\n  overflow: hidden;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n}\n.image-square.is-readonly {\n  cursor: default;\n}\n.image-square .header-img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n.img-upload-label {\n  display: block;\n  position: relative;\n  width: 100%;\n  height: 100%;\n  cursor: inherit;\n}\n.img-upload-label .img-file-input {\n  position: absolute;\n  inset: 0;\n  width: 100%;\n  height: 100%;\n  opacity: 0;\n  cursor: pointer;\n}\n.img-upload-label .img-upload-prompt {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: var(--color-text-muted);\n  background: var(--bg-muted);\n}\n.img-upload-label .img-upload-hover-overlay {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(0, 0, 0, 0.4);\n  color: #fff;\n  opacity: 0;\n  transition: opacity 0.2s ease;\n  pointer-events: none;\n}\n.img-upload-label:hover .img-upload-hover-overlay {\n  opacity: 1;\n}\n.center-controls {\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n  min-width: 0;\n  gap: 1rem;\n}\n.center-controls .top-row {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.center-controls .recipe-name-wrap {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  min-width: 0;\n}\n.center-controls .recipe-name-input {\n  width: 100%;\n  background: transparent;\n  color: var(--color-text-main);\n  font-size: 1.4rem;\n  font-weight: 800;\n  border: none;\n  border-block-end: 2px solid var(--border-default);\n  outline: none;\n  transition: border-color 0.2s ease;\n}\n.center-controls .recipe-name-input:focus {\n  border-color: var(--color-primary);\n}\n.center-controls .recipe-name-input.has-error {\n  border-block-end-color: var(--color-danger);\n}\n.center-controls .name-error-msg {\n  margin-block-start: 0.25rem;\n  font-size: 0.75rem;\n  color: var(--color-danger);\n}\n.center-controls .top-row .type-toggle-btn {\n  padding: 0.4rem 1rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  font-size: 0.8rem;\n  font-weight: 800;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.center-controls .top-row .type-toggle-btn.dish-mode {\n  background: var(--bg-success);\n  color: var(--text-success);\n  border-color: rgba(167, 243, 208, 0.6);\n}\n.center-controls .import-text-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.3rem;\n  padding: 0.35rem 0.75rem;\n  background: transparent;\n  color: var(--color-text-muted);\n  font-size: 0.75rem;\n  font-weight: 600;\n  border: 1px dashed var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  white-space: nowrap;\n  transition: border-color 0.2s ease, color 0.2s ease;\n}\n.center-controls .import-text-btn:hover {\n  border-color: var(--color-primary);\n  color: var(--color-primary);\n}\n.scaling-dock-grid {\n  display: grid;\n  grid-template-columns: auto minmax(0, 1fr);\n  align-items: center;\n  gap: 0.75rem;\n  margin-block-start: 1rem;\n}\n.primary-chip-wrapper {\n  display: flex;\n  align-items: center;\n  overflow: visible;\n}\n.secondary-units-container {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n  padding-inline-end: 0.75rem;\n  overflow: visible;\n  border-inline-end: 2px solid var(--bg-muted);\n}\n.secondary-units-container .add-unit-wrapper {\n  flex-shrink: 0;\n}\n.add-custom-chip {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 2rem;\n  height: 2rem;\n  background: none;\n  color: var(--color-text-muted-light);\n  border: 2px dashed var(--border-strong);\n  border-radius: var(--radius-full);\n  cursor: pointer;\n  transition:\n    color 0.2s ease,\n    background 0.2s ease,\n    border-color 0.2s ease;\n}\n.add-custom-chip:hover {\n  color: var(--color-primary);\n  background-color: var(--bg-glass);\n  border-color: var(--color-primary);\n}\n.metrics-square {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-self: center;\n  gap: 0.75rem;\n  min-width: 6.25rem;\n  height: 7.5rem;\n  padding: 1rem;\n  background: var(--color-primary);\n  color: var(--bg-pure);\n  font-size: 0.8rem;\n  text-align: center;\n  border-radius: var(--radius-md);\n}\n.metrics-square .metric-group .label {\n  display: block;\n  margin-block-end: 0.125rem;\n  font-size: 0.65rem;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  opacity: 0.8;\n}\n.metrics-square .metric-group .value {\n  font-size: 1.1rem;\n  font-weight: 900;\n}\n.metrics-square .divider {\n  width: 100%;\n  height: 1px;\n  background: rgba(255, 255, 255, 0.2);\n}\n.metrics-square .metric-group-weight-volume {\n  position: relative;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-wrap: wrap;\n  gap: 0.25rem;\n  cursor: pointer;\n}\n.metrics-square .metrics-notice-wrap {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n}\n.metrics-square .metrics-notice-icon {\n  flex-shrink: 0;\n  color: var(--bg-danger-subtle);\n}\n.metrics-square .metrics-notice-floating {\n  position: absolute;\n  bottom: 100%;\n  left: 50%;\n  transform: translateX(-50%);\n  z-index: 20;\n  gap: 0.5rem;\n  margin-block-end: 0.35rem;\n  min-width: 7.5rem;\n  max-width: 12.5rem;\n  max-height: 9rem;\n  padding: 0.2rem 0.5rem 0.7rem 0.5rem;\n  background: var(--bg-glass-strong);\n  color: var(--color-text-secondary);\n  font-size: 0.8rem;\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-sm);\n  box-shadow: var(--shadow-glass);\n  overflow: hidden;\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n  display: flex;\n  flex-direction: column;\n}\n.metrics-square .metrics-notice-title {\n  flex-shrink: 0;\n  margin: 0 0 0.35rem 0;\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: var(--color-danger);\n}\n.metrics-square .metrics-notice-list-wrap {\n  flex: 0 1 auto;\n  min-height: 0;\n  overflow: hidden;\n}\n.metrics-square .metrics-notice-list {\n  min-height: 1.5rem;\n  max-height: 8rem;\n  overflow-y: auto;\n  scrollbar-width: none;\n  -ms-overflow-style: none;\n}\n.metrics-square .metrics-notice-list::-webkit-scrollbar {\n  display: none;\n}\n.metrics-square .metrics-notice-scroll-zone--top {\n  position: absolute;\n  top: 0;\n  inset-inline: 0;\n  z-index: 2;\n  height: 2rem;\n  pointer-events: none;\n}\n.metrics-square .metrics-notice-scroll-zone--bottom {\n  position: absolute;\n  bottom: 0;\n  inset-inline: 0;\n  z-index: 2;\n  height: 2rem;\n  pointer-events: none;\n}\n.metrics-square .metrics-notice-scroll-indicator--top,\n.metrics-square .metrics-notice-scroll-indicator--bottom {\n  position: absolute;\n  inset-inline: 0;\n  z-index: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding-block: 0.2rem;\n  min-height: 1.25rem;\n  color: var(--color-text-secondary);\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity 0.2s var(--ease-smooth);\n}\n.metrics-square .metrics-notice-scroll-indicator--top {\n  top: 18px;\n  bottom: auto;\n}\n.metrics-square .metrics-notice-scroll-indicator--bottom {\n  top: auto;\n  bottom: -7px;\n}\n.metrics-square .metrics-notice-list-wrap:has(.metrics-notice-list.can-scroll-up) .metrics-notice-scroll-indicator--top {\n  opacity: 0.8;\n}\n.metrics-square .metrics-notice-list-wrap:has(.metrics-notice-list.can-scroll-down) .metrics-notice-scroll-indicator--bottom {\n  opacity: 0.8;\n}\n.metrics-square .metrics-notice-item {\n  padding: 0.2rem 0;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.labels-container {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.labels-grid-row-wrap {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n}\n.labels-grid-row {\n  display: flex;\n  align-items: stretch;\n  gap: 0.5rem;\n  min-height: 2.25rem;\n}\n.labels-grid-row app-custom-multi-select {\n  flex: 1;\n  min-width: 0;\n}\n.labels-actions {\n  display: flex;\n  align-items: center;\n  gap: 0.35rem;\n  flex-shrink: 0;\n}\n.labels-btn-label {\n  font-size: 0.8125rem;\n  font-weight: 600;\n  color: var(--color-primary);\n}\n.labels-btn-clear {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding-inline: 0.5rem;\n  padding-block: 0.35rem;\n  background: transparent;\n  color: var(--color-text-muted);\n  font-size: 0.75rem;\n  font-weight: 600;\n  border: none;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: color 0.15s ease, background 0.15s ease;\n}\n.labels-btn-clear:hover {\n  color: var(--color-danger);\n  background: var(--bg-danger-subtle);\n}\n@media (max-width: 40.625rem) {\n  .header-dashboard-container {\n    grid-template-columns: 50% 50%;\n    grid-template-areas: "title " "primary-unit " "secondary-units " "image ";\n    gap: 1.5rem;\n    place-items: center;\n  }\n  .center-controls {\n    display: contents;\n  }\n  .top-row {\n    grid-area: title;\n    grid-column: 1/3;\n    width: 80%;\n  }\n  .scaling-dock-grid {\n    display: contents;\n  }\n  .primary-chip-wrapper {\n    grid-area: primary-unit;\n    grid-column: 1/3;\n    justify-content: center;\n  }\n  .secondary-units-container {\n    grid-area: secondary-units;\n    grid-column: 1/3;\n    width: 90%;\n    padding-inline-end: 0;\n    padding-block-end: 1rem;\n    border-inline-end: none;\n    border-block-end: 2px solid var(--bg-muted);\n  }\n  .image-square {\n    grid-area: image;\n    grid-column: 1;\n  }\n  .metrics-square {\n    grid-area: image;\n    grid-column: 2;\n  }\n  .metrics-square .divider {\n    width: 1px;\n    height: 20px;\n  }\n}\n/*# sourceMappingURL=recipe-header.component.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(RecipeHeaderComponent, { className: "RecipeHeaderComponent", filePath: "src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts", lineNumber: 25 });
})();

// src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.ts
var _c03 = ["searchInput"];
var _forTrack02 = ($index, $item) => $item._id;
function IngredientSearchComponent_Conditional_6_For_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "li", 8);
    \u0275\u0275listener("click", function IngredientSearchComponent_Conditional_6_For_3_Template_li_click_0_listener() {
      const item_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r4 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r4.selectItem(item_r4));
    })("keydown", function IngredientSearchComponent_Conditional_6_For_3_Template_li_keydown_0_listener($event) {
      const \u0275$index_15_r6 = \u0275\u0275restoreView(_r3).$index;
      const ctx_r4 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r4.onResultItemKeydown($event, \u0275$index_15_r6));
    });
    \u0275\u0275elementStart(1, "span", 10);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 11);
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r4 = ctx.$implicit;
    const \u0275$index_15_r6 = ctx.$index;
    const ctx_r4 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("highlighted", ctx_r4.highlightedIndex_() === \u0275$index_15_r6);
    \u0275\u0275attribute("aria-selected", ctx_r4.highlightedIndex_() === \u0275$index_15_r6);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r4.name_hebrew);
    \u0275\u0275advance();
    \u0275\u0275classProp("recipe", item_r4.item_type_ === "recipe")("product", item_r4.item_type_ !== "recipe");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(5, 9, item_r4.item_type_ === "recipe" ? "recipe" : "product"), " ");
  }
}
function IngredientSearchComponent_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-scrollable-dropdown", 5)(1, "ul", 6);
    \u0275\u0275repeaterCreate(2, IngredientSearchComponent_Conditional_6_For_3_Template, 6, 11, "li", 7, _forTrack02);
    \u0275\u0275elementStart(4, "li", 8);
    \u0275\u0275listener("click", function IngredientSearchComponent_Conditional_6_Template_li_click_4_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.addNewProduct());
    })("keydown", function IngredientSearchComponent_Conditional_6_Template_li_keydown_4_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.onAddItemKeydown($event));
    });
    \u0275\u0275element(5, "lucide-icon", 9);
    \u0275\u0275elementStart(6, "span");
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r4 = \u0275\u0275nextContext();
    \u0275\u0275property("maxHeight", 240);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r4.filteredResults_());
    \u0275\u0275advance(2);
    \u0275\u0275classProp("highlighted", ctx_r4.highlightedIndex_() === ctx_r4.filteredResults_().length)("result-item--add", true);
    \u0275\u0275attribute("aria-selected", ctx_r4.highlightedIndex_() === ctx_r4.filteredResults_().length);
    \u0275\u0275advance();
    \u0275\u0275property("size", 16);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(8, 9, "add_as_new_product"), ' "', ctx_r4.searchQuery_(), '"');
  }
}
var IngredientSearchComponent = class _IngredientSearchComponent {
  state = inject(KitchenStateService);
  quickAddModalService = inject(QuickAddProductModalService);
  /** Row index for focus trigger; when focusTrigger matches this row, we focus. */
  rowIndex = input(0);
  focusTrigger = input(null);
  /** Names of ingredients already in the recipe; these are excluded from search results. */
  excludeNames = input([]);
  /** Optional initial search query (e.g. when editing an existing ingredient name). */
  initialQuery = input("");
  itemSelected = output();
  focusDone = output();
  /** Emit when user presses Enter in search with no selection (e.g. add new row). */
  addNewRowRequested = output();
  /** Emit when user cancels (e.g. Escape) so parent can close edit mode. */
  cancelSearch = output();
  searchInputRef = viewChild("searchInput");
  searchQuery_ = signal("");
  showResults_ = signal(false);
  /** Index of highlighted option for keyboard nav (-1 = none). */
  highlightedIndex_ = signal(-1);
  lastHandledFocusTrigger = null;
  constructor() {
    effect(() => {
      const trigger = this.focusTrigger();
      const row = this.rowIndex();
      if (trigger !== null && trigger === row && trigger !== this.lastHandledFocusTrigger) {
        this.lastHandledFocusTrigger = trigger;
        setTimeout(() => this.focus(), 0);
        this.focusDone.emit();
      }
      if (trigger === null)
        this.lastHandledFocusTrigger = null;
    });
    effect(() => {
      const q = this.initialQuery()?.trim() ?? "";
      if (q && !this.searchQuery_()) {
        this.searchQuery_.set(q);
        this.showResults_.set(true);
        setTimeout(() => this.focus(), 0);
      }
      if (q)
        this.highlightedIndex_.set(-1);
    });
  }
  /** Focus the search input (e.g. after adding a new row). */
  focus() {
    this.searchInputRef()?.nativeElement?.focus();
  }
  // Combine products and recipes; exclude ingredients already in the recipe; filter by "starts with" + script
  filteredResults_ = computed(() => {
    const raw = (this.searchQuery_() ?? "").trim();
    if (!raw)
      return [];
    const excludeSet = new Set((this.excludeNames() ?? []).map((n) => (n ?? "").trim().toLowerCase()).filter(Boolean));
    const products = this.state.products_().map((p) => __spreadProps(__spreadValues({}, p), { item_type_: "product" }));
    const recipes = this.state.recipes_().map((r) => __spreadProps(__spreadValues({}, r), { item_type_: "recipe" }));
    const candidates = [...products, ...recipes].filter((item) => !excludeSet.has((item.name_hebrew ?? "").trim().toLowerCase()));
    return filterOptionsByStartsWith(candidates, raw, (item) => (item.name_hebrew ?? "").trim());
  });
  selectItem(item) {
    this.itemSelected.emit(item);
    this.searchQuery_.set("");
    this.showResults_.set(false);
    this.highlightedIndex_.set(-1);
  }
  onSearchKeydown(e) {
    const results = this.filteredResults_();
    const addItemIndex = results.length;
    const key = e.key;
    if (key === "Enter") {
      const idx = this.highlightedIndex_();
      if (idx === addItemIndex || results.length === 0 && idx < 0) {
        e.preventDefault();
        this.addNewProduct();
        return;
      }
      if (results.length > 0) {
        e.preventDefault();
        this.selectItem(results[idx < 0 ? 0 : idx]);
        return;
      }
      e.preventDefault();
      this.addNewRowRequested.emit();
      return;
    }
    if (key === "ArrowDown") {
      e.preventDefault();
      this.highlightedIndex_.update((i) => i < 0 ? 0 : i < addItemIndex ? i + 1 : 0);
      this.scrollHighlightedIntoView();
      return;
    }
    if (key === "ArrowUp") {
      e.preventDefault();
      this.highlightedIndex_.update((i) => i <= 0 ? addItemIndex : i - 1);
      this.scrollHighlightedIntoView();
      return;
    }
    if (key === "Escape") {
      this.showResults_.set(false);
      this.highlightedIndex_.set(-1);
      this.cancelSearch.emit();
    }
  }
  addNewProduct() {
    return __async(this, null, function* () {
      const product = yield this.quickAddModalService.open({ prefillName: this.searchQuery_() });
      if (!product)
        return;
      this.selectItem(__spreadProps(__spreadValues({}, product), { item_type_: "product" }));
    });
  }
  onSearchTab(e) {
    if (e.shiftKey)
      return;
    if (!this.showResults_())
      return;
    if (this.filteredResults_().length === 0)
      return;
    e.preventDefault();
    const first = document.querySelector(".result-item");
    first?.focus();
  }
  onResultItemKeydown(e, index) {
    if (e.key !== "Tab")
      return;
    e.preventDefault();
    const allItems = Array.from(document.querySelectorAll(".result-item"));
    if (e.shiftKey) {
      const prev = allItems[index - 1];
      if (prev) {
        prev.focus();
      } else {
        this.showResults_.set(false);
        this.searchInputRef()?.nativeElement?.focus();
      }
    } else {
      const next = allItems[index + 1];
      if (next) {
        next.focus();
      } else {
        this.showResults_.set(false);
        this.searchInputRef()?.nativeElement?.focus();
      }
    }
  }
  onAddItemKeydown(e) {
    if (e.key !== "Tab")
      return;
    e.preventDefault();
    const allItems = Array.from(document.querySelectorAll(".result-item"));
    if (e.shiftKey) {
      const prev = allItems[allItems.length - 2];
      if (prev) {
        prev.focus();
      } else {
        this.searchInputRef()?.nativeElement?.focus();
      }
    } else {
      this.showResults_.set(false);
      this.searchInputRef()?.nativeElement?.focus();
    }
  }
  scrollHighlightedIntoView() {
    setTimeout(() => {
      const list = document.querySelector(".c-dropdown__list");
      const highlighted = list?.querySelector(".result-item.highlighted");
      highlighted?.scrollIntoView({ block: "nearest" });
    }, 0);
  }
  static \u0275fac = function IngredientSearchComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _IngredientSearchComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _IngredientSearchComponent, selectors: [["app-ingredient-search"]], viewQuery: function IngredientSearchComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuerySignal(ctx.searchInputRef, _c03, 5);
    }
    if (rf & 2) {
      \u0275\u0275queryAdvance();
    }
  }, inputs: { rowIndex: [1, "rowIndex"], focusTrigger: [1, "focusTrigger"], excludeNames: [1, "excludeNames"], initialQuery: [1, "initialQuery"] }, outputs: { itemSelected: "itemSelected", focusDone: "focusDone", addNewRowRequested: "addNewRowRequested", cancelSearch: "cancelSearch" }, decls: 7, vars: 5, consts: [["searchInput", ""], ["dir", "rtl", 1, "search-container", 3, "clickOutside"], [1, "c-input-wrapper"], ["name", "search", "size", "18"], ["type", "text", "SelectOnFocus", "", 3, "input", "focus", "keydown", "keydown.tab", "value", "placeholder"], [3, "maxHeight"], ["role", "listbox"], ["role", "option", "tabindex", "0", 1, "result-item", 3, "highlighted"], ["role", "option", "tabindex", "0", 1, "result-item", 3, "click", "keydown"], ["name", "plus-circle", 3, "size"], [1, "item-name"], [1, "type-pill"]], template: function IngredientSearchComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "div", 1);
      \u0275\u0275listener("clickOutside", function IngredientSearchComponent_Template_div_clickOutside_0_listener() {
        \u0275\u0275restoreView(_r1);
        ctx.showResults_.set(false);
        return \u0275\u0275resetView(ctx.highlightedIndex_.set(-1));
      });
      \u0275\u0275elementStart(1, "div", 2);
      \u0275\u0275element(2, "lucide-icon", 3);
      \u0275\u0275elementStart(3, "input", 4, 0);
      \u0275\u0275pipe(5, "translatePipe");
      \u0275\u0275listener("input", function IngredientSearchComponent_Template_input_input_3_listener($event) {
        \u0275\u0275restoreView(_r1);
        ctx.searchQuery_.set($event.target.value);
        ctx.showResults_.set(true);
        return \u0275\u0275resetView(ctx.highlightedIndex_.set(-1));
      })("focus", function IngredientSearchComponent_Template_input_focus_3_listener() {
        \u0275\u0275restoreView(_r1);
        ctx.showResults_.set(true);
        return \u0275\u0275resetView(ctx.highlightedIndex_.set(-1));
      })("keydown", function IngredientSearchComponent_Template_input_keydown_3_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onSearchKeydown($event));
      })("keydown.tab", function IngredientSearchComponent_Template_input_keydown_tab_3_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onSearchTab($event));
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275template(6, IngredientSearchComponent_Conditional_6_Template, 9, 11, "app-scrollable-dropdown", 5);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(3);
      \u0275\u0275property("value", ctx.searchQuery_())("placeholder", \u0275\u0275pipeBind1(5, 3, "search_product_or_recipe"));
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.showResults_() && ctx.searchQuery_().trim().length > 0 ? 6 : -1);
    }
  }, dependencies: [CommonModule, LucideAngularModule, LucideAngularComponent, ClickOutSideDirective, ScrollableDropdownComponent, TranslatePipe, SelectOnFocusDirective], styles: ["\n\n.search-container[_ngcontent-%COMP%] {\n  position: relative;\n  width: 100%;\n}\n.search-container[_ngcontent-%COMP%]   app-scrollable-dropdown[_ngcontent-%COMP%]     .c-dropdown {\n  z-index: 100;\n}\n.result-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.result-item[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass);\n}\n.result-item.highlighted[_ngcontent-%COMP%] {\n  background: var(--color-primary-soft);\n}\n.result-item.result-item--add[_ngcontent-%COMP%] {\n  border-block-start: 1px dashed var(--border-default);\n  color: var(--color-primary);\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.item-name[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n}\n.type-pill[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  padding: 0.125rem 0.5rem;\n  font-size: 0.7rem;\n  font-weight: 600;\n  border-radius: var(--radius-xs);\n}\n.type-pill.product[_ngcontent-%COMP%] {\n  background-color: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n}\n.type-pill.recipe[_ngcontent-%COMP%] {\n  background-color: var(--bg-success);\n  color: var(--text-success);\n}\n/*# sourceMappingURL=ingredient-search.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(IngredientSearchComponent, [{
    type: Component,
    args: [{ selector: "app-ingredient-search", standalone: true, imports: [CommonModule, LucideAngularModule, ClickOutSideDirective, ScrollableDropdownComponent, TranslatePipe, SelectOnFocusDirective], template: `<div class="search-container" dir="rtl" (clickOutside)="showResults_.set(false); highlightedIndex_.set(-1)">\r
  <div class="c-input-wrapper">\r
    <lucide-icon name="search" size="18"></lucide-icon>\r
    <input\r
      #searchInput\r
      type="text"\r
      SelectOnFocus\r
      [value]="searchQuery_()"\r
      (input)="searchQuery_.set($any($event.target).value); showResults_.set(true); highlightedIndex_.set(-1)"\r
      (focus)="showResults_.set(true); highlightedIndex_.set(-1)"\r
      (keydown)="onSearchKeydown($event)"\r
      (keydown.tab)="onSearchTab($event)"\r
      [placeholder]="'search_product_or_recipe' | translatePipe" />\r
  </div>\r
\r
  @if (showResults_() && searchQuery_().trim().length > 0) {\r
    <app-scrollable-dropdown [maxHeight]="240">\r
      <ul role="listbox">\r
        @for (item of filteredResults_(); track item._id; let i = $index) {\r
          <li\r
            role="option"\r
            tabindex="0"\r
            [attr.aria-selected]="highlightedIndex_() === i"\r
            [class.highlighted]="highlightedIndex_() === i"\r
            (click)="selectItem(item)"\r
            (keydown)="onResultItemKeydown($event, i)"\r
            class="result-item">\r
            <span class="item-name">{{ item.name_hebrew }}</span>\r
            <span class="type-pill"\r
                  [class.recipe]="item.item_type_ === 'recipe'"\r
                  [class.product]="item.item_type_ !== 'recipe'">\r
              {{ (item.item_type_ === 'recipe' ? 'recipe' : 'product') | translatePipe }}\r
            </span>\r
          </li>\r
        }\r
        <li\r
          role="option"\r
          tabindex="0"\r
          [attr.aria-selected]="highlightedIndex_() === filteredResults_().length"\r
          [class.highlighted]="highlightedIndex_() === filteredResults_().length"\r
          [class.result-item--add]="true"\r
          class="result-item"\r
          (click)="addNewProduct()"\r
          (keydown)="onAddItemKeydown($event)">\r
          <lucide-icon name="plus-circle" [size]="16"></lucide-icon>\r
          <span>{{ 'add_as_new_product' | translatePipe }} "{{ searchQuery_() }}"</span>\r
        </li>\r
      </ul>\r
    </app-scrollable-dropdown>\r
  }\r
</div>`, styles: ["/* src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.scss */\n.search-container {\n  position: relative;\n  width: 100%;\n}\n.search-container app-scrollable-dropdown ::ng-deep .c-dropdown {\n  z-index: 100;\n}\n.result-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.result-item:hover {\n  background: var(--bg-glass);\n}\n.result-item.highlighted {\n  background: var(--color-primary-soft);\n}\n.result-item.result-item--add {\n  border-block-start: 1px dashed var(--border-default);\n  color: var(--color-primary);\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.item-name {\n  flex: 1;\n  min-width: 0;\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n}\n.type-pill {\n  flex-shrink: 0;\n  padding: 0.125rem 0.5rem;\n  font-size: 0.7rem;\n  font-weight: 600;\n  border-radius: var(--radius-xs);\n}\n.type-pill.product {\n  background-color: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n}\n.type-pill.recipe {\n  background-color: var(--bg-success);\n  color: var(--text-success);\n}\n/*# sourceMappingURL=ingredient-search.component.css.map */\n"] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(IngredientSearchComponent, { className: "IngredientSearchComponent", filePath: "src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.ts", lineNumber: 24 });
})();

// src/app/core/directives/focus-by-row.directive.ts
var FocusByRowDirective = class _FocusByRowDirective {
  el;
  rowIndex = input.required();
  kind = input("qty");
  constructor(el) {
    this.el = el;
  }
  focus() {
    this.el.nativeElement.focus();
  }
  static \u0275fac = function FocusByRowDirective_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _FocusByRowDirective)(\u0275\u0275directiveInject(ElementRef));
  };
  static \u0275dir = /* @__PURE__ */ \u0275\u0275defineDirective({ type: _FocusByRowDirective, selectors: [["", "focusByRow", ""]], inputs: { rowIndex: [1, "rowIndex"], kind: [1, "kind"] } });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(FocusByRowDirective, [{
    type: Directive,
    args: [{
      selector: "[focusByRow]",
      standalone: true
    }]
  }], () => [{ type: ElementRef }], null);
})();

// src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts
function RecipeIngredientsTableComponent_For_20_div_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 24);
  }
}
function RecipeIngredientsTableComponent_For_20_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-ingredient-search", 25);
    \u0275\u0275listener("itemSelected", function RecipeIngredientsTableComponent_For_20_Conditional_5_Template_app_ingredient_search_itemSelected_0_listener($event) {
      \u0275\u0275restoreView(_r2);
      const group_r3 = \u0275\u0275nextContext().$implicit;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onItemSelected($event, group_r3));
    })("focusDone", function RecipeIngredientsTableComponent_For_20_Conditional_5_Template_app_ingredient_search_focusDone_0_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.focusSearchDone.emit());
    })("addNewRowRequested", function RecipeIngredientsTableComponent_For_20_Conditional_5_Template_app_ingredient_search_addNewRowRequested_0_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.addIngredient.emit());
    })("cancelSearch", function RecipeIngredientsTableComponent_For_20_Conditional_5_Template_app_ingredient_search_cancelSearch_0_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.editingNameAtRow_.set(null));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_14_0;
    const ctx_r4 = \u0275\u0275nextContext();
    const group_r3 = ctx_r4.$implicit;
    const $index_r6 = ctx_r4.$index;
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275property("rowIndex", $index_r6)("focusTrigger", ctx_r3.focusSearchAtRow())("excludeNames", ctx_r3.editingNameAtRow_() === $index_r6 ? ctx_r3.getExcludeNamesForRow($index_r6) : ctx_r3.existingIngredientNames)("initialQuery", ctx_r3.editingNameAtRow_() === $index_r6 ? (tmp_14_0 = (tmp_14_0 = group_r3.get("name_hebrew")) == null ? null : tmp_14_0.value) !== null && tmp_14_0 !== void 0 ? tmp_14_0 : "" : "");
  }
}
function RecipeIngredientsTableComponent_For_20_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 26);
    \u0275\u0275listener("click", function RecipeIngredientsTableComponent_For_20_Conditional_6_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r7);
      const $index_r6 = \u0275\u0275nextContext().$index;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.editingNameAtRow_.set($index_r6));
    })("keydown.enter", function RecipeIngredientsTableComponent_For_20_Conditional_6_Template_div_keydown_enter_0_listener() {
      \u0275\u0275restoreView(_r7);
      const $index_r6 = \u0275\u0275nextContext().$index;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.editingNameAtRow_.set($index_r6));
    })("keydown.space", function RecipeIngredientsTableComponent_For_20_Conditional_6_Template_div_keydown_space_0_listener($event) {
      \u0275\u0275restoreView(_r7);
      const $index_r6 = \u0275\u0275nextContext().$index;
      const ctx_r3 = \u0275\u0275nextContext();
      $event.preventDefault();
      return \u0275\u0275resetView(ctx_r3.editingNameAtRow_.set($index_r6));
    });
    \u0275\u0275elementStart(1, "span", 27);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 28);
    \u0275\u0275listener("click", function RecipeIngredientsTableComponent_For_20_Conditional_6_Template_button_click_3_listener($event) {
      \u0275\u0275restoreView(_r7);
      const group_r3 = \u0275\u0275nextContext().$implicit;
      const ctx_r3 = \u0275\u0275nextContext();
      $event.stopPropagation();
      return \u0275\u0275resetView(ctx_r3.clearIngredient(group_r3));
    });
    \u0275\u0275element(4, "lucide-icon", 29);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_11_0;
    const group_r3 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate((tmp_11_0 = group_r3.get("name_hebrew")) == null ? null : tmp_11_0.value);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
  }
}
function RecipeIngredientsTableComponent_For_20_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-custom-select", 30);
    \u0275\u0275listener("valueChange", function RecipeIngredientsTableComponent_For_20_Conditional_8_Template_app_custom_select_valueChange_0_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r4 = \u0275\u0275nextContext();
      const group_r3 = ctx_r4.$implicit;
      const $index_r6 = ctx_r4.$index;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onUnitChange(group_r3, $index_r6, $event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r4 = \u0275\u0275nextContext();
    const group_r3 = ctx_r4.$implicit;
    const $index_r6 = ctx_r4.$index;
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275property("typeToFilter", true)("addNewValue", "__add_unit__")("options", ctx_r3.getUnitOptions(group_r3))("triggerId", "unit-row-" + $index_r6)("rowIndex", $index_r6);
  }
}
function RecipeIngredientsTableComponent_For_20_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 16);
    \u0275\u0275text(1, "---");
    \u0275\u0275elementEnd();
  }
}
function RecipeIngredientsTableComponent_For_20_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 17)(1, "button", 31);
    \u0275\u0275listener("click", function RecipeIngredientsTableComponent_For_20_Conditional_11_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r4 = \u0275\u0275nextContext();
      const group_r3 = ctx_r4.$implicit;
      const $index_r6 = ctx_r4.$index;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.decrementAmount(group_r3, $index_r6));
    });
    \u0275\u0275element(2, "lucide-icon", 32);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "input", 33);
    \u0275\u0275listener("input", function RecipeIngredientsTableComponent_For_20_Conditional_11_Template_input_input_3_listener() {
      \u0275\u0275restoreView(_r9);
      const $index_r6 = \u0275\u0275nextContext().$index;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.updateLineCalculations($index_r6));
    })("keydown", function RecipeIngredientsTableComponent_For_20_Conditional_11_Template_input_keydown_3_listener($event) {
      \u0275\u0275restoreView(_r9);
      const $index_r6 = \u0275\u0275nextContext().$index;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onQuantityKeydown($event, $index_r6));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "button", 34);
    \u0275\u0275listener("click", function RecipeIngredientsTableComponent_For_20_Conditional_11_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r4 = \u0275\u0275nextContext();
      const group_r3 = ctx_r4.$implicit;
      const $index_r6 = ctx_r4.$index;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.incrementAmount(group_r3, $index_r6));
    });
    \u0275\u0275element(5, "lucide-icon", 35);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_11_0;
    const ctx_r4 = \u0275\u0275nextContext();
    const group_r3 = ctx_r4.$implicit;
    const $index_r6 = ctx_r4.$index;
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ((tmp_11_0 = (tmp_11_0 = group_r3.get("amount_net")) == null ? null : tmp_11_0.value) !== null && tmp_11_0 !== void 0 ? tmp_11_0 : 0) <= 0);
    \u0275\u0275advance();
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275property("rowIndex", $index_r6);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
  }
}
function RecipeIngredientsTableComponent_For_20_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 16);
    \u0275\u0275text(1, "---");
    \u0275\u0275elementEnd();
  }
}
function RecipeIngredientsTableComponent_For_20_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 19);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "pending"));
  }
}
function RecipeIngredientsTableComponent_For_20_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 20);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "number");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_11_0;
    const group_r3 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\u20AA", \u0275\u0275pipeBind2(2, 1, (tmp_11_0 = group_r3.get("total_cost")) == null ? null : tmp_11_0.value, "1.2-2"), "");
  }
}
function RecipeIngredientsTableComponent_For_20_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9);
    \u0275\u0275template(1, RecipeIngredientsTableComponent_For_20_div_1_Template, 1, 0, "div", 10);
    \u0275\u0275elementStart(2, "div", 11);
    \u0275\u0275element(3, "lucide-icon", 12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 3);
    \u0275\u0275template(5, RecipeIngredientsTableComponent_For_20_Conditional_5_Template, 1, 4, "app-ingredient-search", 13)(6, RecipeIngredientsTableComponent_For_20_Conditional_6_Template, 5, 2, "div", 14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 4);
    \u0275\u0275template(8, RecipeIngredientsTableComponent_For_20_Conditional_8_Template, 1, 5, "app-custom-select", 15)(9, RecipeIngredientsTableComponent_For_20_Conditional_9_Template, 2, 0, "span", 16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 5);
    \u0275\u0275template(11, RecipeIngredientsTableComponent_For_20_Conditional_11_Template, 6, 4, "div", 17)(12, RecipeIngredientsTableComponent_For_20_Conditional_12_Template, 2, 0, "span", 16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "div", 6)(14, "span", 18);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "div", 7);
    \u0275\u0275template(17, RecipeIngredientsTableComponent_For_20_Conditional_17_Template, 3, 3, "span", 19)(18, RecipeIngredientsTableComponent_For_20_Conditional_18_Template, 3, 4, "span", 20);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 21)(20, "button", 22);
    \u0275\u0275listener("click", function RecipeIngredientsTableComponent_For_20_Template_button_click_20_listener() {
      const $index_r6 = \u0275\u0275restoreView(_r1).$index;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.removeIngredient.emit($index_r6));
    });
    \u0275\u0275element(21, "lucide-icon", 23);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_12_0;
    let tmp_13_0;
    let tmp_14_0;
    let tmp_16_0;
    let tmp_17_0;
    const group_r3 = ctx.$implicit;
    const $index_r6 = ctx.$index;
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275property("formGroup", group_r3);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(!((tmp_12_0 = group_r3.get("referenceId")) == null ? null : tmp_12_0.value) || ctx_r3.editingNameAtRow_() === $index_r6 ? 5 : 6);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(((tmp_13_0 = group_r3.get("referenceId")) == null ? null : tmp_13_0.value) ? 8 : 9);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(((tmp_14_0 = group_r3.get("referenceId")) == null ? null : tmp_14_0.value) ? 11 : 12);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r3.getPercentageDisplay(group_r3));
    \u0275\u0275advance();
    \u0275\u0275classProp("is-zero", ((tmp_16_0 = (tmp_16_0 = group_r3.get("total_cost")) == null ? null : tmp_16_0.value) !== null && tmp_16_0 !== void 0 ? tmp_16_0 : 0) === 0);
    \u0275\u0275advance();
    \u0275\u0275conditional(((tmp_17_0 = group_r3.get("total_cost")) == null ? null : tmp_17_0.value) == null ? 17 : 18);
    \u0275\u0275advance(4);
    \u0275\u0275property("size", 18);
  }
}
var RecipeIngredientsTableComponent = class _RecipeIngredientsTableComponent {
  //INJECTIONS
  kitchenStateService = inject(KitchenStateService);
  recipeCostService = inject(RecipeCostService);
  unitRegistry = inject(UnitRegistryService);
  fb = inject(FormBuilder);
  el = inject(ElementRef);
  cdr = inject(ChangeDetectorRef);
  focusByRowRefs;
  constructor() {
    effect(() => {
      this.kitchenStateService.products_();
      this.kitchenStateService.recipes_();
      this.refreshAllLineCalculations();
    });
  }
  //INPUT OUTPUT
  ingredientsFormArray = input.required();
  portions = input(1);
  focusSearchAtRow = input(null);
  removeIngredient = output();
  addIngredient = output();
  focusSearchDone = output();
  // GETTERS
  onDropIngredient(event) {
    if (event.previousIndex === event.currentIndex)
      return;
    const formArray = this.ingredientsFormArray();
    const item = formArray.at(event.previousIndex);
    formArray.removeAt(event.previousIndex);
    formArray.insert(event.currentIndex, item);
  }
  get ingredientGroups() {
    return [...this.ingredientsFormArray().controls];
  }
  /** Names of ingredients already selected in the recipe (for excluding from search dropdown). */
  get existingIngredientNames() {
    return this.ingredientGroups.filter((g) => g.get("referenceId")?.value).map((g) => (g.get("name_hebrew")?.value ?? "").toString().trim()).filter(Boolean);
  }
  /** When set, this row index shows ingredient-search instead of selected-item-display (click name to change item). */
  editingNameAtRow_ = signal(null);
  /** Exclude names from search for a given row (other rows only), so user can re-select the same item when editing. */
  getExcludeNamesForRow(rowIndex) {
    return this.ingredientGroups.filter((g, i) => i !== rowIndex && g.get("referenceId")?.value).map((g) => (g.get("name_hebrew")?.value ?? "").toString().trim()).filter(Boolean);
  }
  /** True when the row's unit is a product purchase unit (use step 1 for +/-). */
  isPurchaseUnitRow(group) {
    const item = this.getItemMetadata(group);
    if (!item || item.item_type_ !== "product")
      return false;
    const prod = item;
    const unit = group.get("unit")?.value;
    return prod.purchase_options_?.some((o) => o.unit_symbol_ === unit) ?? false;
  }
  incrementAmount(group, index) {
    const ctrl = group.get("amount_net");
    const current = ctrl?.value ?? 0;
    const unit = group.get("unit")?.value;
    const stepOpts = this.isPurchaseUnitRow(group) ? { integerOnly: true } : unit ? { unit } : {};
    ctrl?.setValue(quantityIncrement(current, 0, stepOpts));
    this.updateLineCalculations(index);
  }
  decrementAmount(group, index) {
    const ctrl = group.get("amount_net");
    const current = ctrl?.value ?? 0;
    const unit = group.get("unit")?.value;
    const stepOpts = this.isPurchaseUnitRow(group) ? { integerOnly: true } : unit ? { unit } : {};
    ctrl?.setValue(quantityDecrement(current, 0, stepOpts));
    this.updateLineCalculations(index);
  }
  getTotalWeightG() {
    const rows = this.ingredientGroups.map((g) => ({
      amount_net: g.get("amount_net")?.value,
      unit: g.get("unit")?.value,
      referenceId: g.get("referenceId")?.value,
      item_type: g.get("item_type")?.value
    }));
    return this.recipeCostService.computeTotalWeightG(rows);
  }
  getPercentageDisplay(group) {
    const row = {
      amount_net: group.get("amount_net")?.value,
      unit: group.get("unit")?.value,
      referenceId: group.get("referenceId")?.value,
      item_type: group.get("item_type")?.value
    };
    const rowG = this.recipeCostService.getRowWeightG(row);
    if (rowG === null)
      return "n/a";
    const total = this.getTotalWeightG();
    if (total === 0)
      return "0%";
    return `${(rowG / total * 100).toFixed(1)}%`;
  }
  onItemSelected(item, group) {
    const index = this.ingredientGroups.indexOf(group);
    const isEditingName = this.editingNameAtRow_() === index;
    const product = item.item_type_ === "product" ? item : null;
    const hasPurchaseOptions = product?.purchase_options_?.length;
    const unit = hasPurchaseOptions ? product.purchase_options_[0].unit_symbol_ ?? product.base_unit_ ?? "" : "base_unit_" in item ? item.base_unit_ ?? "" : "yield_unit_" in item ? item.yield_unit_ ?? "" : "";
    const amount_net = isEditingName ? group.get("amount_net")?.value ?? (hasPurchaseOptions ? 1 : 0) : hasPurchaseOptions ? 1 : 0;
    group.patchValue({
      name_hebrew: item.name_hebrew,
      referenceId: item._id,
      item_type: item.item_type_,
      unit,
      amount_net
    });
    if (index !== -1) {
      this.updateLineCalculations(index);
    }
    this.editingNameAtRow_.set(null);
    setTimeout(() => this.focusQuantityAtRow(index), 0);
  }
  focusQuantityAtRow(rowIndex) {
    const refs = this.focusByRowRefs?.toArray() ?? [];
    const ref = refs.find((r) => r.rowIndex() === rowIndex && r.kind() === "qty");
    ref?.focus();
  }
  focusUnitAtRow(rowIndex) {
    const refs = this.focusByRowRefs?.toArray() ?? [];
    const ref = refs.find((r) => r.rowIndex() === rowIndex && r.kind() === "unit");
    ref?.focus();
  }
  onQuantityKeydown(e, rowIndex) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const group = this.ingredientsFormArray().at(rowIndex);
      const ctrl = group?.get("amount_net");
      if (!ctrl)
        return;
      e.preventDefault();
      const current = ctrl.value ?? 0;
      const unit = group.get("unit")?.value;
      const stepOpts = this.isPurchaseUnitRow(group) ? { integerOnly: true } : unit ? { unit } : {};
      const next = e.key === "ArrowUp" ? quantityIncrement(current, 0, stepOpts) : quantityDecrement(current, 0, stepOpts);
      ctrl.setValue(next);
      this.updateLineCalculations(rowIndex);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      this.addIngredient.emit();
    }
  }
  onUnitKeydown(e, rowIndex) {
    if (e.key === "Enter") {
      e.preventDefault();
      this.addIngredient.emit();
    }
  }
  clearIngredient(group) {
    group.patchValue({
      referenceId: null,
      name_hebrew: "",
      item_type: null,
      amount_net: null,
      unit: "gram"
    });
    group.updateValueAndValidity();
    this.ingredientsFormArray().updateValueAndValidity();
  }
  getItemMetadata(group) {
    const id = group.get("referenceId")?.value;
    const type = group.get("item_type")?.value;
    return type === "product" ? this.kitchenStateService.products_().find((p) => p._id === id) : this.kitchenStateService.recipes_().find((r) => r._id === id);
  }
  updateLineCalculations(index) {
    const group = this.ingredientGroups[index];
    const item = this.getItemMetadata(group);
    if (!item)
      return;
    const netAmount = group.get("amount_net")?.value || 0;
    const selectedUnit = group.get("unit")?.value || "";
    const itemType = group.get("item_type")?.value;
    let lineCost = 0;
    if (itemType === "recipe") {
      const recipe = item;
      const costPerUnit = this.recipeCostService.getRecipeCostPerUnit(recipe);
      const amountInYieldUnit = this.recipeCostService.amountInRecipeYieldUnit(netAmount, selectedUnit, recipe);
      lineCost = amountInYieldUnit * costPerUnit;
    } else {
      const prod = item;
      const unitOption = prod.purchase_options_?.find((o) => o.unit_symbol_ === selectedUnit);
      if (unitOption) {
        if (unitOption.price_override_ != null && unitOption.price_override_ > 0) {
          lineCost = netAmount * unitOption.price_override_;
        } else {
          const normalizedAmount = netAmount * (unitOption.conversion_rate_ || 1);
          const price = prod.buy_price_global_ || 0;
          const yieldFactor = prod.yield_factor_ || 1;
          lineCost = normalizedAmount / yieldFactor * price;
        }
      } else {
        const price = prod.buy_price_global_ || prod.calculated_cost_per_unit || 0;
        const yieldFactor = prod.yield_factor_ || 1;
        const baseUnit = prod.base_unit_ || "gram";
        const amountG = this.recipeCostService.convertToBaseUnits(netAmount, selectedUnit);
        const baseGPerUnit = this.recipeCostService.convertToBaseUnits(1, baseUnit) || 1;
        const amountInBaseUnit = amountG / baseGPerUnit;
        lineCost = amountInBaseUnit / yieldFactor * price;
      }
    }
    group.get("total_cost")?.setValue(lineCost);
    this.ingredientsFormArray().parent?.updateValueAndValidity();
    this.cdr.markForCheck();
  }
  /** Re-run line cost for every row with referenceId (e.g. when products/recipes load). */
  refreshAllLineCalculations() {
    const groups = this.ingredientGroups;
    if (!groups.length)
      return;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].get("referenceId")?.value)
        this.updateLineCalculations(i);
    }
    this.cdr.markForCheck();
  }
  getAvailableUnits(group) {
    const item = this.getItemMetadata(group);
    if (!item)
      return [];
    const units = /* @__PURE__ */ new Set();
    const meta = item;
    if (meta.base_unit_)
      units.add(meta.base_unit_);
    if (meta.purchase_options_?.length) {
      meta.purchase_options_.forEach((o) => {
        if (o.unit_symbol_)
          units.add(o.unit_symbol_);
      });
    }
    if (meta.unit_options_?.length) {
      meta.unit_options_.forEach((o) => {
        if (o.unit_symbol_)
          units.add(o.unit_symbol_);
      });
    }
    if (meta.yield_unit_)
      units.add(meta.yield_unit_);
    if (meta.yield_conversions_?.length) {
      meta.yield_conversions_.forEach((c) => {
        if (c?.unit)
          units.add(c.unit);
      });
    }
    return Array.from(units);
  }
  getUnitOptions(group) {
    const available = this.getAvailableUnits(group);
    const currentUnit = group.get("unit")?.value;
    const unitsSet = new Set(available);
    if (currentUnit && typeof currentUnit === "string" && currentUnit.trim() && !unitsSet.has(currentUnit.trim())) {
      unitsSet.add(currentUnit.trim());
    }
    const opts = Array.from(unitsSet).map((u) => ({ value: u, label: u }));
    return [...opts, { value: "__add_unit__", label: "+ \u05D9\u05D7\u05D9\u05D3\u05D4 \u05D7\u05D3\u05E9\u05D4" }];
  }
  onUnitChange(group, index, val) {
    if (val === "__add_unit__") {
      group.get("unit")?.setValue("");
      const product = group.get("item_type")?.value === "product" ? this.getItemMetadata(group) : void 0;
      const existingSymbols = product?.purchase_options_?.map((o) => o.unit_symbol_) ?? [];
      setTimeout(() => this.unitRegistry.openUnitCreator({ existingUnitSymbols: existingSymbols }), 0);
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe((newUnit) => {
        const setUnitAndUpdate = () => {
          group.get("unit")?.setValue(newUnit);
          this.updateLineCalculations(index);
        };
        if (group.get("item_type")?.value === "product") {
          const prod = this.getItemMetadata(group);
          if (prod && prod._id) {
            const existing = prod.purchase_options_?.some((o) => o.unit_symbol_ === newUnit);
            if (!existing) {
              const baseFactor = this.unitRegistry.getConversion(prod.base_unit_) || 1;
              const unitFactor = this.unitRegistry.getConversion(newUnit) || 1;
              const conversion_rate_ = baseFactor > 0 && unitFactor > 0 ? unitFactor / baseFactor : 1;
              const newOption = {
                unit_symbol_: newUnit,
                conversion_rate_,
                uom: prod.base_unit_,
                price_override_: 0
              };
              const updated = __spreadProps(__spreadValues({}, prod), {
                purchase_options_: [...prod.purchase_options_ ?? [], newOption]
              });
              this.kitchenStateService.saveProduct(updated).subscribe({
                next: () => setUnitAndUpdate(),
                error: () => setUnitAndUpdate()
              });
              return;
            }
          }
        }
        setUnitAndUpdate();
      });
    } else {
      group.get("unit")?.setValue(val);
      this.updateLineCalculations(index);
    }
  }
  getGrossWeight(index) {
    const group = this.ingredientGroups[index];
    const net = group.get("amount_net")?.value || 0;
    if (group.get("item_type")?.value !== "product") {
      return net;
    }
    const item = this.getItemMetadata(group);
    const yieldValue = item?.yield_factor_ ?? 1;
    return net / yieldValue;
  }
  // #region agent log
  ngAfterViewInit() {
    setTimeout(() => this.logIngredientsLayout(), 100);
  }
  logIngredientsLayout() {
    const host = this.el.nativeElement;
    const container = host.querySelector(".ingredients-container");
    const firstRow = host.querySelector(".ingredient-grid-row");
    const firstQtyControls = host.querySelector(".quantity-controls");
    const firstQtyBtn = host.querySelector(".qty-btn");
    const getStyle = (el, ...props) => {
      if (!el)
        return null;
      const s = getComputedStyle(el);
      return props.reduce((acc, p) => __spreadProps(__spreadValues({}, acc), { [p]: s.getPropertyValue(p.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "")) }), {});
    };
    const payload = {
      sessionId: "632f09",
      location: "recipe-ingredients-table.component.ts:logIngredientsLayout",
      message: "ingredients layout computed",
      data: {
        containerWidth: container?.offsetWidth ?? null,
        containerStyles: container ? { borderRadius: getComputedStyle(container).borderRadius, background: getComputedStyle(container).backgroundColor, border: getComputedStyle(container).border } : null,
        rowStyles: firstRow ? { minHeight: getComputedStyle(firstRow).minHeight, gridTemplateColumns: getComputedStyle(firstRow).gridTemplateColumns } : null,
        qtyControlsStyles: firstQtyControls ? { display: getComputedStyle(firstQtyControls).display, gap: getComputedStyle(firstQtyControls).gap, borderRadius: getComputedStyle(firstQtyControls).borderRadius, background: getComputedStyle(firstQtyControls).backgroundColor, border: getComputedStyle(firstQtyControls).border } : null,
        qtyBtnStyles: firstQtyBtn ? { width: getComputedStyle(firstQtyBtn).width, height: getComputedStyle(firstQtyBtn).height, borderRadius: getComputedStyle(firstQtyBtn).borderRadius } : null,
        hasRows: !!firstRow,
        hasQtyControls: !!firstQtyControls
      },
      timestamp: Date.now(),
      hypothesisId: "A,B,C,D,E"
    };
    fetch("http://127.0.0.1:7371/ingest/4b1f7a8a-853d-43fb-a4b0-16a30277ea08", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "632f09" }, body: JSON.stringify(payload) }).catch(() => {
    });
  }
  static \u0275fac = function RecipeIngredientsTableComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RecipeIngredientsTableComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _RecipeIngredientsTableComponent, selectors: [["app-recipe-ingredients-table"]], viewQuery: function RecipeIngredientsTableComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuery(FocusByRowDirective, 5);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.focusByRowRefs = _t);
    }
  }, inputs: { ingredientsFormArray: [1, "ingredientsFormArray"], portions: [1, "portions"], focusSearchAtRow: [1, "focusSearchAtRow"] }, outputs: { removeIngredient: "removeIngredient", addIngredient: "addIngredient", focusSearchDone: "focusSearchDone" }, decls: 21, vars: 15, consts: [["dir", "rtl", 1, "ingredients-container"], [1, "ingredients-grid-header"], [1, "col-drag"], [1, "col-name"], [1, "col-unit"], [1, "col-quantity"], [1, "col-percent"], [1, "col-cost"], ["cdkDropList", "", 1, "ingredients-grid-body", 3, "cdkDropListDropped"], ["cdkDrag", "", 1, "ingredient-grid-row", 3, "formGroup"], ["class", "cdk-custom-placeholder", 4, "cdkDragPlaceholder"], ["cdkDragHandle", "", 1, "col-drag"], ["name", "grip-vertical", 1, "drag-handle-icon", 3, "size"], [3, "rowIndex", "focusTrigger", "excludeNames", "initialQuery"], ["role", "button", "tabindex", "0", 1, "selected-item-display"], ["formControlName", "unit", "variant", "chip", "placeholder", "unit", "focusByRow", "", "kind", "unit", 1, "grid-select", 3, "typeToFilter", "addNewValue", "options", "triggerId", "rowIndex"], [1, "placeholder-dash"], [1, "quantity-controls"], [1, "percent-value"], [1, "pending-text"], [1, "cost-value"], [1, "col-actions"], ["type", "button", 1, "c-icon-btn", "danger", 3, "click"], ["name", "trash-2", 3, "size"], [1, "cdk-custom-placeholder"], [3, "itemSelected", "focusDone", "addNewRowRequested", "cancelSearch", "rowIndex", "focusTrigger", "excludeNames", "initialQuery"], ["role", "button", "tabindex", "0", 1, "selected-item-display", 3, "click", "keydown.enter", "keydown.space"], [1, "item-text"], ["type", "button", 1, "clear-btn", 3, "click"], ["name", "x", 3, "size"], ["formControlName", "unit", "variant", "chip", "placeholder", "unit", "focusByRow", "", "kind", "unit", 1, "grid-select", 3, "valueChange", "typeToFilter", "addNewValue", "options", "triggerId", "rowIndex"], ["type", "button", "tabindex", "-1", 1, "qty-btn", "minus", 3, "click", "disabled"], ["name", "minus", 3, "size"], ["type", "number", "SelectOnFocus", "", "formControlName", "amount_net", "focusByRow", "", "kind", "qty", "placeholder", "0", "step", "0.001", 1, "grid-input", "qty-input", 3, "input", "keydown", "rowIndex"], ["type", "button", "tabindex", "-1", 1, "qty-btn", "plus", 3, "click"], ["name", "plus", 3, "size"]], template: function RecipeIngredientsTableComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1);
      \u0275\u0275element(2, "div", 2);
      \u0275\u0275elementStart(3, "div", 3);
      \u0275\u0275text(4);
      \u0275\u0275pipe(5, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(6, "div", 4);
      \u0275\u0275text(7);
      \u0275\u0275pipe(8, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(9, "div", 5);
      \u0275\u0275text(10);
      \u0275\u0275pipe(11, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(12, "div", 6);
      \u0275\u0275text(13);
      \u0275\u0275pipe(14, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(15, "div", 7);
      \u0275\u0275text(16);
      \u0275\u0275pipe(17, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(18, "div", 8);
      \u0275\u0275listener("cdkDropListDropped", function RecipeIngredientsTableComponent_Template_div_cdkDropListDropped_18_listener($event) {
        return ctx.onDropIngredient($event);
      });
      \u0275\u0275repeaterCreate(19, RecipeIngredientsTableComponent_For_20_Template, 22, 10, "div", 9, \u0275\u0275repeaterTrackByIndex);
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(5, 5, "ingredient"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(8, 7, "unit"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(11, 9, "quantity"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(14, 11, "percent"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(17, 13, "cost"));
      \u0275\u0275advance(3);
      \u0275\u0275repeater(ctx.ingredientGroups);
    }
  }, dependencies: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    DefaultValueAccessor,
    NumberValueAccessor,
    NgControlStatus,
    NgControlStatusGroup,
    FormGroupDirective,
    FormControlName,
    LucideAngularModule,
    LucideAngularComponent,
    IngredientSearchComponent,
    TranslatePipe,
    SelectOnFocusDirective,
    FocusByRowDirective,
    CustomSelectComponent,
    CdkDrag,
    CdkDropList,
    CdkDragHandle
  ], styles: ["\n\n.ingredients-container[_ngcontent-%COMP%] {\n  container-type: inline-size;\n  container-name: ingredients;\n  width: 100%;\n  overflow: visible;\n}\n.col-drag[_ngcontent-%COMP%] {\n  cursor: grab;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: var(--color-text-muted);\n}\n.col-drag[_ngcontent-%COMP%]:active {\n  cursor: grabbing;\n}\n.cdk-drag-preview[_ngcontent-%COMP%] {\n  box-shadow: var(--shadow-card);\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-accent);\n  border-radius: var(--radius-md);\n  opacity: 0.95;\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.625rem 0.75rem;\n  box-sizing: border-box;\n}\n.cdk-drag-placeholder[_ngcontent-%COMP%] {\n  opacity: 0;\n}\n.cdk-drag-animating[_ngcontent-%COMP%] {\n  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);\n}\n.ingredients-grid-body.cdk-drop-list-dragging[_ngcontent-%COMP%]   .ingredient-grid-row[_ngcontent-%COMP%]:not(.cdk-drag-placeholder) {\n  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);\n}\n.ingredients-grid-header[_ngcontent-%COMP%], \n.ingredient-grid-row[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1.5rem minmax(0, 2.5fr) minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) 1rem;\n  align-items: center;\n  gap: 0.75rem;\n  padding-inline: 1rem;\n  padding-block: 0.5rem;\n}\n.ingredients-grid-header[_ngcontent-%COMP%]   .col-actions[_ngcontent-%COMP%], \n.ingredient-grid-row[_ngcontent-%COMP%]   .col-actions[_ngcontent-%COMP%] {\n  display: grid;\n  place-content: center;\n}\n.ingredient-grid-row[_ngcontent-%COMP%]   .col-actions[_ngcontent-%COMP%]   .c-icon-btn[_ngcontent-%COMP%] {\n  width: 1.5rem;\n  height: 1.5rem;\n  opacity: 0;\n  transition: opacity 0.15s ease;\n}\n.ingredient-grid-row[_ngcontent-%COMP%]:hover   .col-actions[_ngcontent-%COMP%]   .c-icon-btn[_ngcontent-%COMP%], \n.ingredient-grid-row[_ngcontent-%COMP%]   .col-actions[_ngcontent-%COMP%]   .c-icon-btn[_ngcontent-%COMP%]:focus {\n  opacity: 1;\n}\n.ingredients-grid-header[_ngcontent-%COMP%] {\n  padding-inline: 0.75rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n  font-weight: 600;\n  border-block-end: 1px solid var(--border-default);\n  border-radius: var(--radius-md) var(--radius-md) 0 0;\n  backdrop-filter: var(--blur-glass);\n}\n.ingredients-grid-header[_ngcontent-%COMP%]   .col-quantity[_ngcontent-%COMP%], \n.ingredients-grid-header[_ngcontent-%COMP%]   .col-unit[_ngcontent-%COMP%], \n.ingredients-grid-header[_ngcontent-%COMP%]   .col-percent[_ngcontent-%COMP%], \n.ingredients-grid-header[_ngcontent-%COMP%]   .col-cost[_ngcontent-%COMP%] {\n  text-align: center;\n}\n.ingredient-grid-row[_ngcontent-%COMP%] {\n  min-height: 4rem;\n  overflow: visible;\n  background: transparent;\n  border-block-end: 1px solid var(--border-default);\n  transition: background 0.15s ease;\n}\n.ingredient-grid-row[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass);\n}\n.ingredient-grid-row[_ngcontent-%COMP%]   .col-quantity[_ngcontent-%COMP%], \n.ingredient-grid-row[_ngcontent-%COMP%]   .col-unit[_ngcontent-%COMP%], \n.ingredient-grid-row[_ngcontent-%COMP%]   .col-percent[_ngcontent-%COMP%], \n.ingredient-grid-row[_ngcontent-%COMP%]   .col-cost[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 2.5rem;\n}\n.quantity-controls[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n}\n.quantity-controls[_ngcontent-%COMP%]   .qty-btn[_ngcontent-%COMP%] {\n  display: grid;\n  place-content: center;\n  width: 2rem;\n  height: 2rem;\n  padding: 0;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.quantity-controls[_ngcontent-%COMP%]   .qty-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-strong);\n}\n.quantity-controls[_ngcontent-%COMP%]   .qty-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.quantity-controls[_ngcontent-%COMP%]   .qty-input[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 2.5rem;\n  text-align: center;\n  appearance: textfield;\n}\n.quantity-controls[_ngcontent-%COMP%]   .qty-input[_ngcontent-%COMP%]::-webkit-inner-spin-button, \n.quantity-controls[_ngcontent-%COMP%]   .qty-input[_ngcontent-%COMP%]::-webkit-outer-spin-button {\n  appearance: none;\n  margin: 0;\n}\n.col-percent[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.col-cost[_ngcontent-%COMP%] {\n  font-weight: 700;\n  color: var(--color-success);\n  text-align: start;\n}\n.col-cost.is-zero[_ngcontent-%COMP%] {\n  color: var(--color-text-muted-light);\n  font-weight: 400;\n}\n.grid-input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem;\n  background-color: var(--bg-pure);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-sm);\n  outline: none;\n}\n.grid-input[_ngcontent-%COMP%]:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.grid-select[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem;\n  background-color: var(--bg-pure);\n  border: none;\n  border-radius: var(--radius-sm);\n  outline: none;\n}\n.grid-select[_ngcontent-%COMP%]:focus {\n  box-shadow: var(--shadow-focus);\n}\n[_nghost-%COMP%]     .col-unit .custom-select-trigger {\n  background-color: var(--bg-pure);\n  border: none;\n  border-radius: var(--radius-sm);\n}\n[_nghost-%COMP%]     .col-unit .custom-select-trigger:focus {\n  box-shadow: var(--shadow-focus);\n}\n.selected-item-display[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.375rem 0.75rem;\n  background: var(--bg-muted);\n  border-radius: var(--radius-sm);\n}\n.selected-item-display[_ngcontent-%COMP%]   .item-text[_ngcontent-%COMP%] {\n  font-weight: 500;\n}\n@container ingredients (max-width: 520px) {\n  .ingredients-grid-header[_ngcontent-%COMP%] {\n    display: none;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%] {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    grid-template-rows: auto auto auto;\n    gap: 0.5rem;\n    padding: 1rem;\n    margin-block-end: 0.5rem;\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-md);\n    background: var(--bg-glass);\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-name[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-quantity[_ngcontent-%COMP%] {\n    grid-column: 1;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-unit[_ngcontent-%COMP%] {\n    grid-column: 2;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-percent[_ngcontent-%COMP%] {\n    grid-column: 1;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-cost[_ngcontent-%COMP%] {\n    grid-column: 2;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-actions[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n    justify-content: flex-end;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .quantity-controls[_ngcontent-%COMP%]   .qty-btn[_ngcontent-%COMP%] {\n    opacity: 0;\n    width: 0;\n    padding: 0;\n    border: none;\n    overflow: hidden;\n    transition: opacity 0.15s ease, width 0.15s ease;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .quantity-controls[_ngcontent-%COMP%]:hover   .qty-btn[_ngcontent-%COMP%], \n   .ingredient-grid-row[_ngcontent-%COMP%]   .quantity-controls[_ngcontent-%COMP%]:focus-within   .qty-btn[_ngcontent-%COMP%] {\n    opacity: 1;\n    width: 2rem;\n    border: 1px solid var(--border-default);\n  }\n}\n@media (max-width: 640px) {\n  .ingredients-grid-header[_ngcontent-%COMP%] {\n    display: none;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%] {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    grid-template-rows: auto auto auto;\n    gap: 0.5rem;\n    padding: 1rem;\n    margin-block-end: 0.5rem;\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-md);\n    background: var(--bg-glass);\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-name[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-quantity[_ngcontent-%COMP%] {\n    grid-column: 1;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-unit[_ngcontent-%COMP%] {\n    grid-column: 2;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-percent[_ngcontent-%COMP%] {\n    grid-column: 1;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-cost[_ngcontent-%COMP%] {\n    grid-column: 2;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .col-actions[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n    justify-content: flex-end;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .quantity-controls[_ngcontent-%COMP%]   .qty-btn[_ngcontent-%COMP%] {\n    opacity: 0;\n    width: 0;\n    padding: 0;\n    border: none;\n    overflow: hidden;\n    transition: opacity 0.15s ease, width 0.15s ease;\n  }\n  .ingredient-grid-row[_ngcontent-%COMP%]   .quantity-controls[_ngcontent-%COMP%]:hover   .qty-btn[_ngcontent-%COMP%], \n   .ingredient-grid-row[_ngcontent-%COMP%]   .quantity-controls[_ngcontent-%COMP%]:focus-within   .qty-btn[_ngcontent-%COMP%] {\n    opacity: 1;\n    width: 2rem;\n    border: 1px solid var(--border-default);\n  }\n}\n/*# sourceMappingURL=recipe-ingredients-table.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RecipeIngredientsTableComponent, [{
    type: Component,
    args: [{ selector: "app-recipe-ingredients-table", standalone: true, imports: [
      CommonModule,
      ReactiveFormsModule,
      LucideAngularModule,
      IngredientSearchComponent,
      TranslatePipe,
      SelectOnFocusDirective,
      FocusByRowDirective,
      CustomSelectComponent,
      CdkDrag,
      CdkDropList,
      CdkDragHandle
    ], template: `<div class="ingredients-container" dir="rtl">\r
  <div class="ingredients-grid-header">\r
    <div class="col-drag"></div>\r
    <div class="col-name">{{ 'ingredient' | translatePipe }}</div>\r
    <div class="col-unit">{{ 'unit' | translatePipe }}</div>\r
    <div class="col-quantity">{{ 'quantity' | translatePipe }}</div>\r
    <div class="col-percent">{{ 'percent' | translatePipe }}</div>\r
    <div class="col-cost">{{ 'cost' | translatePipe }}</div>\r
    <!-- <div class="col-actions">{{ 'actions' | translatePipe }}</div> -->\r
  </div>\r
\r
  <div class="ingredients-grid-body" cdkDropList (cdkDropListDropped)="onDropIngredient($event)">\r
    @for (group of ingredientGroups; track $index) {\r
    <div [formGroup]="group" class="ingredient-grid-row" cdkDrag>\r
      <div class="cdk-custom-placeholder" *cdkDragPlaceholder></div>\r
      <div class="col-drag" cdkDragHandle>\r
        <lucide-icon name="grip-vertical" [size]="16" class="drag-handle-icon"></lucide-icon>\r
      </div>\r
\r
      <div class="col-name">\r
        @if (!group.get('referenceId')?.value || editingNameAtRow_() === $index) {\r
        <app-ingredient-search [rowIndex]="$index" [focusTrigger]="focusSearchAtRow()"\r
          [excludeNames]="editingNameAtRow_() === $index ? getExcludeNamesForRow($index) : existingIngredientNames"\r
          [initialQuery]="editingNameAtRow_() === $index ? (group.get('name_hebrew')?.value ?? '') : ''"\r
          (itemSelected)="onItemSelected($event, group)" (focusDone)="focusSearchDone.emit()"\r
          (addNewRowRequested)="addIngredient.emit()" (cancelSearch)="editingNameAtRow_.set(null)"></app-ingredient-search>\r
        } @else {\r
        <div class="selected-item-display" role="button" tabindex="0"\r
          (click)="editingNameAtRow_.set($index)"\r
          (keydown.enter)="editingNameAtRow_.set($index)"\r
          (keydown.space)="$event.preventDefault(); editingNameAtRow_.set($index)">\r
          <span class="item-text">{{ group.get('name_hebrew')?.value }}</span>\r
          <button type="button" class="clear-btn" (click)="$event.stopPropagation(); clearIngredient(group)">\r
            <lucide-icon name="x" [size]="14"></lucide-icon>\r
          </button>\r
        </div>\r
        }\r
      </div>\r
\r
      <div class="col-unit">\r
        @if (group.get('referenceId')?.value) {\r
        <app-custom-select\r
          formControlName="unit"\r
          class="grid-select"\r
          variant="chip"\r
          [typeToFilter]="true"\r
          [addNewValue]="'__add_unit__'"\r
          [options]="getUnitOptions(group)"\r
          placeholder="unit"\r
          [triggerId]="'unit-row-' + $index"\r
          focusByRow\r
          [rowIndex]="$index"\r
          kind="unit"\r
          (valueChange)="onUnitChange(group, $index, $event)" />\r
        } @else {\r
        <span class="placeholder-dash">---</span>\r
        }\r
      </div>\r
\r
      <div class="col-quantity">\r
        @if (group.get('referenceId')?.value) {\r
        <div class="quantity-controls">\r
          <button type="button" class="qty-btn minus" tabindex="-1"\r
            [disabled]="(group.get('amount_net')?.value ?? 0) <= 0"\r
            (click)="decrementAmount(group, $index)">\r
            <lucide-icon name="minus" [size]="16"></lucide-icon>\r
          </button>\r
          <input type="number" SelectOnFocus formControlName="amount_net" (input)="updateLineCalculations($index)"\r
            (keydown)="onQuantityKeydown($event, $index)" focusByRow [rowIndex]="$index" kind="qty"\r
            class="grid-input qty-input" placeholder="0" step="0.001" />\r
          <button type="button" class="qty-btn plus" tabindex="-1" (click)="incrementAmount(group, $index)">\r
            <lucide-icon name="plus" [size]="16"></lucide-icon>\r
          </button>\r
        </div>\r
        } @else {\r
        <span class="placeholder-dash">---</span>\r
        }\r
      </div>\r
\r
      <div class="col-percent">\r
        <span class="percent-value">{{ getPercentageDisplay(group) }}</span>\r
      </div>\r
\r
      <div class="col-cost" [class.is-zero]="(group.get('total_cost')?.value ?? 0) === 0">\r
        @if (group.get('total_cost')?.value == null) {\r
        <span class="pending-text">{{ 'pending' | translatePipe }}</span>\r
        } @else {\r
        <span class="cost-value">\u20AA{{ group.get('total_cost')?.value | number:'1.2-2' }}</span>\r
        }\r
      </div>\r
\r
      <div class="col-actions">\r
        <button type="button" (click)="removeIngredient.emit($index)" class="c-icon-btn danger">\r
          <lucide-icon name="trash-2" [size]="18"></lucide-icon>\r
        </button>\r
      </div>\r
\r
    </div>\r
    }\r
  </div>\r
</div>`, styles: ["/* src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss */\n.ingredients-container {\n  container-type: inline-size;\n  container-name: ingredients;\n  width: 100%;\n  overflow: visible;\n}\n.col-drag {\n  cursor: grab;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: var(--color-text-muted);\n}\n.col-drag:active {\n  cursor: grabbing;\n}\n.cdk-drag-preview {\n  box-shadow: var(--shadow-card);\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-accent);\n  border-radius: var(--radius-md);\n  opacity: 0.95;\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.625rem 0.75rem;\n  box-sizing: border-box;\n}\n.cdk-drag-placeholder {\n  opacity: 0;\n}\n.cdk-drag-animating {\n  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);\n}\n.ingredients-grid-body.cdk-drop-list-dragging .ingredient-grid-row:not(.cdk-drag-placeholder) {\n  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);\n}\n.ingredients-grid-header,\n.ingredient-grid-row {\n  display: grid;\n  grid-template-columns: 1.5rem minmax(0, 2.5fr) minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) 1rem;\n  align-items: center;\n  gap: 0.75rem;\n  padding-inline: 1rem;\n  padding-block: 0.5rem;\n}\n.ingredients-grid-header .col-actions,\n.ingredient-grid-row .col-actions {\n  display: grid;\n  place-content: center;\n}\n.ingredient-grid-row .col-actions .c-icon-btn {\n  width: 1.5rem;\n  height: 1.5rem;\n  opacity: 0;\n  transition: opacity 0.15s ease;\n}\n.ingredient-grid-row:hover .col-actions .c-icon-btn,\n.ingredient-grid-row .col-actions .c-icon-btn:focus {\n  opacity: 1;\n}\n.ingredients-grid-header {\n  padding-inline: 0.75rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n  font-weight: 600;\n  border-block-end: 1px solid var(--border-default);\n  border-radius: var(--radius-md) var(--radius-md) 0 0;\n  backdrop-filter: var(--blur-glass);\n}\n.ingredients-grid-header .col-quantity,\n.ingredients-grid-header .col-unit,\n.ingredients-grid-header .col-percent,\n.ingredients-grid-header .col-cost {\n  text-align: center;\n}\n.ingredient-grid-row {\n  min-height: 4rem;\n  overflow: visible;\n  background: transparent;\n  border-block-end: 1px solid var(--border-default);\n  transition: background 0.15s ease;\n}\n.ingredient-grid-row:hover {\n  background: var(--bg-glass);\n}\n.ingredient-grid-row .col-quantity,\n.ingredient-grid-row .col-unit,\n.ingredient-grid-row .col-percent,\n.ingredient-grid-row .col-cost {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 2.5rem;\n}\n.quantity-controls {\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n}\n.quantity-controls .qty-btn {\n  display: grid;\n  place-content: center;\n  width: 2rem;\n  height: 2rem;\n  padding: 0;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.quantity-controls .qty-btn:hover:not(:disabled) {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-strong);\n}\n.quantity-controls .qty-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.quantity-controls .qty-input {\n  flex: 1;\n  min-width: 2.5rem;\n  text-align: center;\n  appearance: textfield;\n}\n.quantity-controls .qty-input::-webkit-inner-spin-button,\n.quantity-controls .qty-input::-webkit-outer-spin-button {\n  appearance: none;\n  margin: 0;\n}\n.col-percent {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.col-cost {\n  font-weight: 700;\n  color: var(--color-success);\n  text-align: start;\n}\n.col-cost.is-zero {\n  color: var(--color-text-muted-light);\n  font-weight: 400;\n}\n.grid-input {\n  width: 100%;\n  padding: 0.5rem;\n  background-color: var(--bg-pure);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-sm);\n  outline: none;\n}\n.grid-input:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.grid-select {\n  width: 100%;\n  padding: 0.5rem;\n  background-color: var(--bg-pure);\n  border: none;\n  border-radius: var(--radius-sm);\n  outline: none;\n}\n.grid-select:focus {\n  box-shadow: var(--shadow-focus);\n}\n:host ::ng-deep .col-unit .custom-select-trigger {\n  background-color: var(--bg-pure);\n  border: none;\n  border-radius: var(--radius-sm);\n}\n:host ::ng-deep .col-unit .custom-select-trigger:focus {\n  box-shadow: var(--shadow-focus);\n}\n.selected-item-display {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.375rem 0.75rem;\n  background: var(--bg-muted);\n  border-radius: var(--radius-sm);\n}\n.selected-item-display .item-text {\n  font-weight: 500;\n}\n@container ingredients (max-width: 520px) {\n  .ingredients-grid-header {\n    display: none;\n  }\n  .ingredient-grid-row {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    grid-template-rows: auto auto auto;\n    gap: 0.5rem;\n    padding: 1rem;\n    margin-block-end: 0.5rem;\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-md);\n    background: var(--bg-glass);\n  }\n  .ingredient-grid-row .col-name {\n    grid-column: 1/-1;\n  }\n  .ingredient-grid-row .col-quantity {\n    grid-column: 1;\n  }\n  .ingredient-grid-row .col-unit {\n    grid-column: 2;\n  }\n  .ingredient-grid-row .col-percent {\n    grid-column: 1;\n  }\n  .ingredient-grid-row .col-cost {\n    grid-column: 2;\n  }\n  .ingredient-grid-row .col-actions {\n    grid-column: 1/-1;\n    justify-content: flex-end;\n  }\n  .ingredient-grid-row .quantity-controls .qty-btn {\n    opacity: 0;\n    width: 0;\n    padding: 0;\n    border: none;\n    overflow: hidden;\n    transition: opacity 0.15s ease, width 0.15s ease;\n  }\n  .ingredient-grid-row .quantity-controls:hover .qty-btn,\n  .ingredient-grid-row .quantity-controls:focus-within .qty-btn {\n    opacity: 1;\n    width: 2rem;\n    border: 1px solid var(--border-default);\n  }\n}\n@media (max-width: 640px) {\n  .ingredients-grid-header {\n    display: none;\n  }\n  .ingredient-grid-row {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    grid-template-rows: auto auto auto;\n    gap: 0.5rem;\n    padding: 1rem;\n    margin-block-end: 0.5rem;\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-md);\n    background: var(--bg-glass);\n  }\n  .ingredient-grid-row .col-name {\n    grid-column: 1/-1;\n  }\n  .ingredient-grid-row .col-quantity {\n    grid-column: 1;\n  }\n  .ingredient-grid-row .col-unit {\n    grid-column: 2;\n  }\n  .ingredient-grid-row .col-percent {\n    grid-column: 1;\n  }\n  .ingredient-grid-row .col-cost {\n    grid-column: 2;\n  }\n  .ingredient-grid-row .col-actions {\n    grid-column: 1/-1;\n    justify-content: flex-end;\n  }\n  .ingredient-grid-row .quantity-controls .qty-btn {\n    opacity: 0;\n    width: 0;\n    padding: 0;\n    border: none;\n    overflow: hidden;\n    transition: opacity 0.15s ease, width 0.15s ease;\n  }\n  .ingredient-grid-row .quantity-controls:hover .qty-btn,\n  .ingredient-grid-row .quantity-controls:focus-within .qty-btn {\n    opacity: 1;\n    width: 2rem;\n    border: 1px solid var(--border-default);\n  }\n}\n/*# sourceMappingURL=recipe-ingredients-table.component.css.map */\n"] }]
  }], () => [], { focusByRowRefs: [{
    type: ViewChildren,
    args: [FocusByRowDirective]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(RecipeIngredientsTableComponent, { className: "RecipeIngredientsTableComponent", filePath: "src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts", lineNumber: 39 });
})();

// src/app/pages/recipe-builder/recipe-builder.page.ts
var _c04 = () => ({ integerOnly: true });
var _forTrack03 = ($index, $item) => $item._id;
function RecipeBuilderPage_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 1)(1, "span");
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "button", 18);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_1_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateBackFromHistory());
    });
    \u0275\u0275text(5);
    \u0275\u0275pipe(6, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 2, "history_view_only_banner"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(6, 4, "back_to_list"), " ");
  }
}
function RecipeBuilderPage_Conditional_2_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 27);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_7_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r4);
      return \u0275\u0275resetView($event.stopPropagation());
    })("clickOutside", function RecipeBuilderPage_Conditional_2_Conditional_7_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275elementStart(1, "button", 28);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_7_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onViewRecipeInfo();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(2, "lucide-icon", 29);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 28);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_7_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onExportRecipeInfo();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(6, "lucide-icon", 30);
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
function RecipeBuilderPage_Conditional_2_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 27);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_14_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    })("clickOutside", function RecipeBuilderPage_Conditional_2_Conditional_14_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275elementStart(1, "button", 28);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_14_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onViewShoppingList();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(2, "lucide-icon", 29);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 28);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_14_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onExportShoppingList();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(6, "lucide-icon", 30);
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
function RecipeBuilderPage_Conditional_2_Conditional_15_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 27);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_15_Conditional_6_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r7);
      return \u0275\u0275resetView($event.stopPropagation());
    })("clickOutside", function RecipeBuilderPage_Conditional_2_Conditional_15_Conditional_6_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275elementStart(1, "button", 28);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_15_Conditional_6_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext(3);
      ctx_r1.onViewCookingSteps();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(2, "lucide-icon", 29);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 28);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_15_Conditional_6_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext(3);
      ctx_r1.onExportCookingSteps();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(6, "lucide-icon", 30);
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
function RecipeBuilderPage_Conditional_2_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 20)(1, "button", 21);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_15_Template_button_click_1_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.openViewExportModal("cooking-steps");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(3, "lucide-icon", 31);
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, RecipeBuilderPage_Conditional_2_Conditional_15_Conditional_6_Template, 9, 8, "div", 23);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(2, 5, "export_cooking_steps"))("aria-expanded", ctx_r1.viewExportModal_() === "cooking-steps");
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(5, 7, "export_cooking_steps"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.viewExportModal_() === "cooking-steps" ? 6 : -1);
  }
}
function RecipeBuilderPage_Conditional_2_Conditional_16_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 27);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_16_Conditional_6_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r9);
      return \u0275\u0275resetView($event.stopPropagation());
    })("clickOutside", function RecipeBuilderPage_Conditional_2_Conditional_16_Conditional_6_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275elementStart(1, "button", 28);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_16_Conditional_6_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(3);
      ctx_r1.onViewDishChecklist();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(2, "lucide-icon", 29);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 28);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_16_Conditional_6_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(3);
      ctx_r1.onExportDishChecklist();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(6, "lucide-icon", 30);
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
function RecipeBuilderPage_Conditional_2_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 20)(1, "button", 21);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_16_Template_button_click_1_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.openViewExportModal("dish-checklist");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(3, "lucide-icon", 31);
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, RecipeBuilderPage_Conditional_2_Conditional_16_Conditional_6_Template, 9, 8, "div", 23);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(2, 5, "export_checklist"))("aria-expanded", ctx_r1.viewExportModal_() === "dish-checklist");
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(5, 7, "export_checklist"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.viewExportModal_() === "dish-checklist" ? 6 : -1);
  }
}
function RecipeBuilderPage_Conditional_2_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 27);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_23_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r10);
      return \u0275\u0275resetView($event.stopPropagation());
    })("clickOutside", function RecipeBuilderPage_Conditional_2_Conditional_23_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275elementStart(1, "button", 28);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_23_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onViewAll();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(2, "lucide-icon", 29);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 28);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Conditional_23_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.onExportAllTogether();
      return \u0275\u0275resetView(ctx_r1.closeViewExportModal());
    });
    \u0275\u0275element(6, "lucide-icon", 30);
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
function RecipeBuilderPage_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-export-toolbar-overlay", 19);
    \u0275\u0275listener("closeRequest", function RecipeBuilderPage_Conditional_2_Template_app_export_toolbar_overlay_closeRequest_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeExportToolbar());
    });
    \u0275\u0275elementStart(1, "div", 20)(2, "button", 21);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Template_button_click_2_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.openViewExportModal("recipe-info");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(4, "lucide-icon", 22);
    \u0275\u0275text(5);
    \u0275\u0275pipe(6, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(7, RecipeBuilderPage_Conditional_2_Conditional_7_Template, 9, 8, "div", 23);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 20)(9, "button", 21);
    \u0275\u0275pipe(10, "translatePipe");
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Template_button_click_9_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.openViewExportModal("shopping-list");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(11, "lucide-icon", 24);
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(14, RecipeBuilderPage_Conditional_2_Conditional_14_Template, 9, 8, "div", 23);
    \u0275\u0275elementEnd();
    \u0275\u0275template(15, RecipeBuilderPage_Conditional_2_Conditional_15_Template, 7, 9, "div", 20)(16, RecipeBuilderPage_Conditional_2_Conditional_16_Template, 7, 9, "div", 20);
    \u0275\u0275elementStart(17, "div", 20)(18, "button", 21);
    \u0275\u0275pipe(19, "translatePipe");
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Template_button_click_18_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.openViewExportModal("all");
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(20, "lucide-icon", 25);
    \u0275\u0275text(21);
    \u0275\u0275pipe(22, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(23, RecipeBuilderPage_Conditional_2_Conditional_23_Template, 9, 8, "div", 23);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "button", 21);
    \u0275\u0275pipe(25, "translatePipe");
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_2_Template_button_click_24_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.onPrint();
      return \u0275\u0275resetView(ctx_r1.closeExportToolbar());
    });
    \u0275\u0275element(26, "lucide-icon", 26);
    \u0275\u0275text(27);
    \u0275\u0275pipe(28, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(3, 20, "export_recipe_info"))("aria-expanded", ctx_r1.viewExportModal_() === "recipe-info");
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(6, 22, "export_recipe_info"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.viewExportModal_() === "recipe-info" ? 7 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(10, 24, "export_shopping_list"))("aria-expanded", ctx_r1.viewExportModal_() === "shopping-list");
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(13, 26, "export_shopping_list"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.viewExportModal_() === "shopping-list" ? 14 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.recipeType_() === "preparation" ? 15 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.recipeType_() === "dish" ? 16 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(19, 28, "export_all_together"))("aria-expanded", ctx_r1.viewExportModal_() === "all");
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(22, 30, "export_all_together"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.viewExportModal_() === "all" ? 23 : -1);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(25, 32, "recipe_print"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(28, 34, "recipe_print"), " ");
  }
}
function RecipeBuilderPage_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 32);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_16_Template_button_click_0_listener($event) {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.addNewIngredientRow();
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(1, "lucide-icon", 33);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(3, 2, "add_row"), " ");
  }
}
function RecipeBuilderPage_Conditional_27_Conditional_20_For_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "li", 51);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_27_Conditional_20_For_3_Template_li_click_0_listener() {
      const opt_r15 = \u0275\u0275restoreView(_r14).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.selectLogisticsOption(opt_r15));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const opt_r15 = ctx.$implicit;
    const \u0275$index_236_r16 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("highlighted", ctx_r1.logisticsHighlightedIndex_() === \u0275$index_236_r16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", opt_r15.name_hebrew, " ");
  }
}
function RecipeBuilderPage_Conditional_27_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-scrollable-dropdown", 43)(1, "ul", 47);
    \u0275\u0275repeaterCreate(2, RecipeBuilderPage_Conditional_27_Conditional_20_For_3_Template, 2, 3, "li", 48, _forTrack03);
    \u0275\u0275elementStart(4, "li", 49);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_27_Conditional_20_Template_li_click_4_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openAddNewToolModal());
    });
    \u0275\u0275element(5, "lucide-icon", 50);
    \u0275\u0275elementStart(6, "span");
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("maxHeight", 220);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.logisticsSearchOptions_());
    \u0275\u0275advance(2);
    \u0275\u0275classProp("highlighted", ctx_r1.logisticsHighlightedIndex_() === ctx_r1.logisticsSearchOptions_().length);
    \u0275\u0275advance();
    \u0275\u0275property("size", 16);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(8, 5, "add_new_tool"));
  }
}
function RecipeBuilderPage_Conditional_27_For_24_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275declareLet(0)(1);
    \u0275\u0275elementStart(2, "div", 46)(3, "button", 52);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_27_For_24_Template_button_click_3_listener() {
      const \u0275$index_252_r18 = \u0275\u0275restoreView(_r17).$index;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.removeBaselineRow(\u0275$index_252_r18));
    });
    \u0275\u0275elementStart(5, "span", 53);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 54);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_12_0;
    let tmp_13_0;
    const ctrl_r19 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    const eqId_r20 = (tmp_12_0 = ctrl_r19.get("equipment_id_")) == null ? null : tmp_12_0.value;
    const qty_r21 = (tmp_13_0 = ctrl_r19.get("quantity_")) == null ? null : tmp_13_0.value;
    \u0275\u0275advance(3);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(4, 3, "remove"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.getEquipmentNameById(eqId_r20));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\xD7", qty_r21, "");
  }
}
function RecipeBuilderPage_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "section", 3)(1, "div", 34);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_27_Template_div_click_1_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.logisticsLogicCollapsed_() && ctx_r1.toggleLogisticsLogic());
    });
    \u0275\u0275elementStart(2, "div", 6);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_27_Template_div_click_2_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.toggleLogisticsLogic();
      return \u0275\u0275resetView($event.stopPropagation());
    })("keydown.enter", function RecipeBuilderPage_Conditional_27_Template_div_keydown_enter_2_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleLogisticsLogic());
    })("keydown.space", function RecipeBuilderPage_Conditional_27_Template_div_keydown_space_2_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.toggleLogisticsLogic();
      return \u0275\u0275resetView($event.preventDefault());
    });
    \u0275\u0275elementStart(3, "h2", 7);
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 8);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_27_Template_button_click_6_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.toggleLogisticsLogic();
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(7, "lucide-icon", 9);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 10);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_27_Template_div_click_8_listener($event) {
      \u0275\u0275restoreView(_r12);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(9, "div", 35);
    \u0275\u0275listener("clickOutside", function RecipeBuilderPage_Conditional_27_Template_div_clickOutside_9_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.logisticsToolDropdownOpen_.set(false));
    });
    \u0275\u0275elementStart(10, "div", 36)(11, "div", 37)(12, "div", 38);
    \u0275\u0275element(13, "lucide-icon", 39);
    \u0275\u0275elementStart(14, "input", 40);
    \u0275\u0275pipe(15, "translatePipe");
    \u0275\u0275listener("input", function RecipeBuilderPage_Conditional_27_Template_input_input_14_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onLogisticsSearchInput($event.target.value));
    })("keydown", function RecipeBuilderPage_Conditional_27_Template_input_keydown_14_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onLogisticsSearchKeydown($event));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "app-counter", 41);
    \u0275\u0275listener("valueChange", function RecipeBuilderPage_Conditional_27_Template_app_counter_valueChange_16_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.logisticsToolQuantity_.set($event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "button", 42);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_27_Template_button_click_17_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onLogisticsAddClick());
    });
    \u0275\u0275text(18);
    \u0275\u0275pipe(19, "translatePipe");
    \u0275\u0275elementEnd()();
    \u0275\u0275template(20, RecipeBuilderPage_Conditional_27_Conditional_20_Template, 9, 7, "app-scrollable-dropdown", 43);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 44)(22, "div", 45);
    \u0275\u0275repeaterCreate(23, RecipeBuilderPage_Conditional_27_For_24_Template, 9, 5, "div", 46, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275classProp("is-collapsed", ctx_r1.logisticsLogicCollapsed_());
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(5, 16, "dish_logistics"));
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-expanded", !ctx_r1.logisticsLogicCollapsed_());
    \u0275\u0275advance();
    \u0275\u0275property("name", ctx_r1.logisticsLogicCollapsed_() ? "chevron-down" : "chevron-up")("size", 20);
    \u0275\u0275advance(2);
    \u0275\u0275property("formGroup", ctx_r1.recipeForm_);
    \u0275\u0275advance(4);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275property("value", ctx_r1.logisticsToolSearchQuery_())("placeholder", \u0275\u0275pipeBind1(15, 18, "search_tool_placeholder"));
    \u0275\u0275advance(2);
    \u0275\u0275property("value", ctx_r1.logisticsToolQuantity_())("min", 1)("stepOptions", \u0275\u0275pureFunction0(22, _c04));
    \u0275\u0275advance();
    \u0275\u0275property("disabled", !ctx_r1.logisticsSelectedToolId_() && !ctx_r1.logisticsToolSearchQuery_().trim());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(19, 20, "add"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.logisticsToolDropdownOpen_() ? 20 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.logisticsBaselineArray.controls);
  }
}
function RecipeBuilderPage_Conditional_28_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 56);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function RecipeBuilderPage_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    const _r22 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "footer", 15)(1, "button", 55);
    \u0275\u0275listener("click", function RecipeBuilderPage_Conditional_28_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r22);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.saveRecipe());
    });
    \u0275\u0275template(2, RecipeBuilderPage_Conditional_28_Conditional_2_Template, 1, 1, "app-loader", 56);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r1.isSaving_());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isSaving_() ? 2 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(4, 3, ctx_r1.isSaving_() ? "saving" : ctx_r1.recipeType_() === "dish" ? "save_dish" : "save_recipe"), " ");
  }
}
function RecipeBuilderPage_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    const _r23 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-approve-stamp", 57);
    \u0275\u0275listener("approve", function RecipeBuilderPage_Conditional_29_Template_app_approve_stamp_approve_0_listener() {
      \u0275\u0275restoreView(_r23);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onApproveStamp());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275property("approved", ctx_r1.isApproved_())("disabled", ctx_r1.isSaving_());
  }
}
function RecipeBuilderPage_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    const _r24 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-export-preview", 58);
    \u0275\u0275listener("exportClick", function RecipeBuilderPage_Conditional_30_Template_app_export_preview_exportClick_0_listener() {
      \u0275\u0275restoreView(_r24);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onExportFromPreview());
    })("printClick", function RecipeBuilderPage_Conditional_30_Template_app_export_preview_printClick_0_listener() {
      \u0275\u0275restoreView(_r24);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onPrintFromPreview());
    })("close", function RecipeBuilderPage_Conditional_30_Template_app_export_preview_close_0_listener() {
      \u0275\u0275restoreView(_r24);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onCloseExportPreview());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275property("payload", ctx);
  }
}
var RecipeBuilderPage = class _RecipeBuilderPage {
  fb = inject(FormBuilder);
  state_ = inject(KitchenStateService);
  userMsg_ = inject(UserMsgService);
  route_ = inject(ActivatedRoute);
  router_ = inject(Router);
  unitRegistry_ = inject(UnitRegistryService);
  versionHistory_ = inject(VersionHistoryService);
  injector_ = inject(Injector);
  equipmentData_ = inject(EquipmentDataService);
  addEquipmentModal_ = inject(AddEquipmentModalService);
  metadataRegistry_ = inject(MetadataRegistryService);
  recipeDataService_ = inject(RecipeDataService);
  dishDataService_ = inject(DishDataService);
  recipeFormService_ = inject(RecipeFormService);
  translation_ = inject(TranslationService);
  logging_ = inject(LoggingService);
  exportService_ = inject(ExportService);
  confirmModal_ = inject(ConfirmModalService);
  heroFab_ = inject(HeroFabService);
  aiRecipeDraft_ = inject(AiRecipeDraftService);
  textImportModal_ = inject(RecipeTextImportModalService);
  //SIGNALS
  saving = useSavingState();
  isSaving_ = this.saving.isSaving_;
  recipeId_ = signal(null);
  resetTrigger_ = signal(0);
  isSubmitted = false;
  /** Bumped when ingredients change so cost/weight computeds re-run (form is not a signal). */
  ingredientsFormVersion_ = signal(0);
  /** Snapshot of form value when user entered the page (for hasRealChanges). */
  initialRecipeSnapshot_ = null;
  /** When set, the ingredients table will focus the search input at this row index; cleared after focus. */
  focusIngredientSearchAtRow_ = signal(null);
  /** When set, the workflow will focus the textarea (prep) or prep search (dish) at this row index; cleared after focus. */
  focusWorkflowRowAt_ = signal(null);
  /** True when viewing an old version from history (read-only, no save). */
  historyViewMode_ = signal(false);
  /** Whether the current recipe is marked approved (stamp sets this; used in buildRecipeFromForm and for stamp UI). */
  isApproved_ = signal(false);
  /** User-uploaded recipe image as base64 data-URL; lives outside the form. */
  recipeImageUrl_ = signal(null);
  /** Section cards collapsed by default (true = collapsed). */
  tableLogicCollapsed_ = signal(true);
  workflowLogicCollapsed_ = signal(true);
  logisticsLogicCollapsed_ = signal(true);
  /** Export toolbar overlay (blur header, same pattern as menu-intelligence). */
  exportToolbarOpen_ = signal(false);
  /** Which View/Export dropdown is open in the toolbar. */
  viewExportModal_ = signal(null);
  exportPreviewPayload_ = signal(null);
  exportPreviewType_ = null;
  toggleTableLogic() {
    const next = !this.tableLogicCollapsed_();
    this.tableLogicCollapsed_.set(next);
    localStorage.setItem("rb_col_ingredients", JSON.stringify(next));
  }
  toggleWorkflowLogic() {
    const next = !this.workflowLogicCollapsed_();
    this.workflowLogicCollapsed_.set(next);
    localStorage.setItem("rb_col_workflow", JSON.stringify(next));
  }
  toggleLogisticsLogic() {
    const next = !this.logisticsLogicCollapsed_();
    this.logisticsLogicCollapsed_.set(next);
    localStorage.setItem("rb_col_logistics", JSON.stringify(next));
  }
  //COMPUTED
  totalCost_ = computed(() => {
    this.ingredientsFormVersion_();
    const raw = this.recipeForm_.getRawValue();
    const ingredients = raw?.ingredients || [];
    return ingredients.reduce((acc, ing) => acc + (ing.total_cost || 0), 0);
  });
  totalWeightG_ = computed(() => {
    this.ingredientsFormVersion_();
    const raw = this.recipeForm_.getRawValue();
    return raw?.total_weight_g ?? 0;
  });
  totalBrutoWeightG_ = signal(0);
  totalVolumeL_ = signal(0);
  totalVolumeMl_ = signal(0);
  unconvertibleForWeight_ = signal([]);
  unconvertibleForVolume_ = signal([]);
  recipeForm_ = this.fb.group({
    name_hebrew: ["", Validators.required],
    recipe_type: ["preparation"],
    serving_portions: [1, [Validators.required, Validators.min(1)]],
    yield_conversions: this.fb.array([
      this.fb.group({ amount: [0], unit: ["gram"] })
    ]),
    ingredients: this.fb.array([]),
    workflow_items: this.fb.array([]),
    total_weight_g: [0],
    total_cost: [0],
    labels: [[]],
    logistics: this.fb.group({
      baseline_: this.fb.array([])
    })
  }, { validators: (c) => this.recipeFormService_.recipeFormValidator(c) });
  portions_ = toSignal(this.recipeForm_.get("serving_portions").valueChanges.pipe(startWith(this.recipeForm_.get("serving_portions")?.value ?? 1)), { initialValue: 1 });
  recipeType_ = toSignal(this.recipeForm_.get("recipe_type").valueChanges.pipe(startWith(this.recipeForm_.get("recipe_type")?.value ?? "preparation"), map((v) => v === "dish" ? "dish" : "preparation")), { initialValue: "preparation" });
  /** Auto-labels from current form ingredients (for header preview). */
  liveAutoLabels_ = computed(() => {
    this.ingredientsFormVersion_();
    const raw = this.recipeForm_.getRawValue();
    const rows = raw?.ingredients ?? [];
    const productIds = rows.filter((r) => r?.referenceId && r?.item_type !== "recipe").map((r) => r.referenceId);
    const products = this.state_.products_().filter((p) => productIds.includes(p._id));
    const triggerSet = /* @__PURE__ */ new Set();
    products.forEach((p) => {
      (p.categories_ ?? []).forEach((c) => triggerSet.add(c));
      (p.allergens_ ?? []).forEach((a) => triggerSet.add(a));
    });
    return this.metadataRegistry_.allLabels_().filter((def) => def.autoTriggers?.some((t) => triggerSet.has(t))).map((def) => def.key);
  });
  destroyRef = inject(DestroyRef);
  cachedPrepItems_ = [];
  cachedSteps_ = [];
  constructor() {
    this.ingredientsArray.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updateTotalWeightG();
      this.ingredientsFormVersion_.update((v) => v + 1);
    });
    this.recipeForm_.get("recipe_type")?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((type) => this.onRecipeTypeChange(type));
  }
  onRecipeTypeChange(type) {
    if (type == null)
      return;
    const isDish = type === "dish";
    const wasDish = !isDish;
    if (wasDish) {
      const rows = this.workflowArray.controls.map((c) => c.getRawValue());
      this.cachedPrepItems_ = rows;
    } else {
      const rows = this.workflowArray.controls.map((c) => c.getRawValue());
      this.cachedSteps_ = rows;
    }
    this.workflowArray.clear();
    if (isDish) {
      if (this.cachedPrepItems_.length > 0) {
        this.cachedPrepItems_.forEach((row) => this.workflowArray.push(this.recipeFormService_.createPrepItemRow(row)));
      } else {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow());
      }
    } else {
      if (this.cachedSteps_.length > 0) {
        this.cachedSteps_.forEach((step, i) => this.workflowArray.push(this.recipeFormService_.createStepGroup(step.order ?? i + 1)));
      } else {
        this.workflowArray.push(this.recipeFormService_.createStepGroup(1));
      }
    }
  }
  /** Resets the form to a blank state for creating a new recipe/dish. */
  resetToNewForm_() {
    this.recipeImageUrl_.set(null);
    this.recipeId_.set(null);
    this.isApproved_.set(false);
    this.cachedPrepItems_ = [];
    this.cachedSteps_ = [];
    this.recipeForm_.patchValue({
      name_hebrew: "",
      recipe_type: "preparation",
      serving_portions: 1,
      total_weight_g: 0,
      total_cost: 0,
      labels: []
    }, { emitEvent: false });
    this.yieldConversionsArray.clear();
    this.yieldConversionsArray.push(this.fb.group({ amount: [0], unit: ["gram"] }));
    this.ingredientsArray.clear();
    this.addNewIngredientRow();
    this.workflowArray.clear();
    this.workflowArray.push(this.recipeFormService_.createStepGroup(1));
    this.logisticsBaselineArray.clear();
    this.recipeForm_.updateValueAndValidity({ emitEvent: false });
    this.recipeForm_.markAsPristine();
    this.resetTrigger_.update((v) => v + 1);
  }
  updateTotalWeightG() {
    const result = this.recipeFormService_.computeWeightsAndVolumes(this.recipeForm_);
    this.recipeForm_.get("total_weight_g")?.setValue(result.totalWeightG, { emitEvent: false });
    this.totalBrutoWeightG_.set(result.totalBrutoWeightG);
    this.totalVolumeL_.set(result.totalVolumeL);
    this.totalVolumeMl_.set(result.totalVolumeMl);
    this.unconvertibleForWeight_.set(result.unconvertibleForWeight);
    this.unconvertibleForVolume_.set(result.unconvertibleForVolume);
  }
  ngOnInit() {
    return __async(this, null, function* () {
      const lsIngredients = localStorage.getItem("rb_col_ingredients");
      if (lsIngredients !== null)
        this.tableLogicCollapsed_.set(JSON.parse(lsIngredients));
      const lsWorkflow = localStorage.getItem("rb_col_workflow");
      if (lsWorkflow !== null)
        this.workflowLogicCollapsed_.set(JSON.parse(lsWorkflow));
      const lsLogistics = localStorage.getItem("rb_col_logistics");
      if (lsLogistics !== null)
        this.logisticsLogicCollapsed_.set(JSON.parse(lsLogistics));
      const q = this.route_.snapshot.queryParams;
      const view = q["view"];
      const entityType = q["entityType"];
      const entityId = q["entityId"];
      const versionAtStr = q["versionAt"];
      if (view === "history" && entityType && entityId && versionAtStr) {
        const versionAt = Number(versionAtStr);
        if (!Number.isNaN(versionAt) && (entityType === "recipe" || entityType === "dish")) {
          const entry = yield this.versionHistory_.getVersionEntry(entityType, entityId, versionAt);
          if (entry && (entry.entityType === "recipe" || entry.entityType === "dish")) {
            const snapshot = entry.snapshot;
            this.patchFormFromRecipe(snapshot);
            this.historyViewMode_.set(true);
            this.recipeForm_.disable();
          } else {
            this.userMsg_.onSetErrorMsg("\u05D2\u05E8\u05E1\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4");
          }
        }
      } else {
        const recipe = this.route_.snapshot.data["recipe"];
        if (recipe) {
          this.recipeId_.set(recipe._id);
          this.patchFormFromRecipe(recipe);
        } else {
          const aiDraft = this.aiRecipeDraft_.consume();
          if (aiDraft) {
            this.prefillFromAiDraft(aiDraft);
          } else {
            const type = this.route_.snapshot.queryParams["type"];
            if (type === "dish") {
              this.recipeForm_.patchValue({
                recipe_type: "dish",
                serving_portions: 1
              }, { emitEvent: false });
              this.yieldConversionsArray.clear();
              this.yieldConversionsArray.push(this.fb.group({ amount: [1], unit: ["dish"] }));
              this.workflowArray.clear();
              this.workflowArray.push(this.recipeFormService_.createPrepItemRow());
            }
          }
        }
      }
      if (this.ingredientsArray.length === 0) {
        this.addNewIngredientRow();
        runInInjectionContext(this.injector_, () => {
          afterNextRender(() => this.focusIngredientSearchAtRow_.set(0));
        });
      }
      if (this.workflowArray.length === 0) {
        const isDish = this.recipeForm_.get("recipe_type")?.value === "dish";
        if (isDish) {
          this.workflowArray.push(this.recipeFormService_.createPrepItemRow());
        } else {
          this.workflowArray.push(this.recipeFormService_.createStepGroup(1));
        }
      }
      this.recipeForm_.get("name_hebrew")?.setAsyncValidators([(ctrl) => this.duplicateNameValidator_(ctrl)]);
      this.recipeForm_.get("recipe_type")?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.recipeForm_.get("name_hebrew")?.updateValueAndValidity({ emitEvent: false }));
      this.updateTotalWeightG();
      this.recipeForm_.markAsPristine();
      if (!this.historyViewMode_() && !this.recipeForm_.disabled) {
        this.initialRecipeSnapshot_ = this.getRecipeSnapshotForComparison();
      }
      const actions = [
        { labelKey: "export", icon: "printer", run: () => this.openExportFromHeroFab() }
      ];
      const id = this.recipeId_();
      if (id) {
        actions.push({
          labelKey: "cook_view",
          icon: "cooking-pot",
          run: () => this.router_.navigate(["/cook", id])
        });
      }
      this.heroFab_.setPageActions(actions, "replace");
      this.router_.events.pipe(filter((e) => e instanceof NavigationStart), takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
        if (!e.url.startsWith("/recipe-builder")) {
          this.closeAllExportOverlays();
        }
      });
    });
  }
  /** Close export toolbar and preview so state is clean when user navigates away. */
  closeAllExportOverlays() {
    this.exportToolbarOpen_.set(false);
    this.viewExportModal_.set(null);
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
  }
  ngOnDestroy() {
    this.closeAllExportOverlays();
    this.heroFab_.clearPageActions();
  }
  prefillFromAiDraft(draft) {
    const isDish = draft.recipe_type === "dish";
    this.recipeForm_.patchValue({ name_hebrew: draft.name_hebrew, recipe_type: draft.recipe_type }, { emitEvent: false });
    this.yieldConversionsArray.clear();
    if (isDish) {
      this.recipeForm_.patchValue({ serving_portions: draft.yield_amount }, { emitEvent: false });
      this.yieldConversionsArray.push(this.fb.group({ amount: [draft.yield_amount], unit: ["dish"] }));
    } else {
      this.yieldConversionsArray.push(this.fb.group({ amount: [draft.yield_amount], unit: [draft.yield_unit] }));
    }
    this.ingredientsArray.clear();
    for (const ing of draft.ingredients) {
      this.ingredientsArray.push(this.recipeFormService_.createIngredientGroup());
      const last = this.ingredientsArray.at(this.ingredientsArray.length - 1);
      last.patchValue({ name_hebrew: ing.name, amount_net: ing.amount, unit: ing.unit });
    }
    this.workflowArray.clear();
    if (isDish) {
      for (const step of draft.steps) {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow({ preparation_name: step }));
      }
      if (this.workflowArray.length === 0) {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow());
      }
    } else {
      draft.steps.forEach((step, i) => {
        const group = this.recipeFormService_.createStepGroup(i + 1);
        group.patchValue({ instruction: step });
        this.workflowArray.push(group);
      });
      if (this.workflowArray.length === 0) {
        this.workflowArray.push(this.recipeFormService_.createStepGroup(1));
      }
    }
  }
  // ─── Text Import ─────────────────────────────────────────────────
  onImportTextClick() {
    this.textImportModal_.open((result) => this.prefillFromParsedResult(result));
  }
  prefillFromParsedResult(result) {
    const currentType = this.recipeForm_.get("recipe_type")?.value;
    if (result.type === "recipe" && currentType === "dish") {
      this.userMsg_.onSetWarningMsg(this.translation_.translate("import_text_type_mismatch_dish_in_recipe"));
      return;
    }
    if (result.type === "dish" && currentType !== "dish") {
      this.userMsg_.onSetWarningMsg(this.translation_.translate("import_text_type_mismatch_recipe_in_dish"));
      return;
    }
    if (result.type === "recipe") {
      const data = result.data;
      this.recipeForm_.patchValue({
        name_hebrew: data.name_hebrew ?? "",
        serving_portions: data.serving_portions ?? 1,
        labels: data.labels ?? []
      }, { emitEvent: false });
      this.ingredientsArray.clear();
      for (const ing of data.ingredients ?? []) {
        this.ingredientsArray.push(this.recipeFormService_.createIngredientGroup());
        const last = this.ingredientsArray.at(this.ingredientsArray.length - 1);
        last.patchValue({ name_hebrew: ing.name_hebrew, amount_net: ing.amount_net, unit: ing.unit });
      }
      if (this.ingredientsArray.length === 0)
        this.addNewIngredientRow();
      this.workflowArray.clear();
      const steps = data.steps ?? [];
      if (steps.length > 0) {
        steps.forEach((step, i) => {
          const group = this.recipeFormService_.createStepGroup(step.order ?? i + 1);
          group.patchValue({ instruction: step.instruction });
          this.workflowArray.push(group);
        });
      } else {
        this.workflowArray.push(this.recipeFormService_.createStepGroup(1));
      }
    } else {
      const data = result.data;
      this.recipeForm_.patchValue({
        name_hebrew: data.name_hebrew ?? "",
        serving_portions: data.serving_portions ?? 1,
        labels: data.labels ?? []
      }, { emitEvent: false });
    }
    this.applyJustFilledHighlight_();
    this.ingredientsFormVersion_.update((v) => v + 1);
  }
  applyJustFilledHighlight_() {
    const el = document.querySelector(".recipe-builder-container");
    el?.classList.add("just-filled");
    setTimeout(() => el?.classList.remove("just-filled"), 1500);
  }
  // ─── Export ───────────────────────────────────────────────────────
  openExportFromHeroFab() {
    setTimeout(() => this.exportToolbarOpen_.set(true), 0);
  }
  closeExportToolbar() {
    this.exportToolbarOpen_.set(false);
    this.viewExportModal_.set(null);
  }
  openViewExportModal(key) {
    this.viewExportModal_.update((current) => current === key ? null : key);
  }
  closeViewExportModal() {
    this.viewExportModal_.set(null);
  }
  goToCookFromHeroFab() {
    const id = this.recipeId_();
    void this.router_.navigate(id ? ["/cook", id] : ["/cook"]);
  }
  /** Async validator: duplicate recipe/dish name by type (excludes current id when editing). */
  duplicateNameValidator_(control) {
    return timer(300).pipe(switchMap(() => {
      const name = (control.value ?? "").toString().trim();
      if (!name)
        return of(null);
      const type = this.recipeForm_.get("recipe_type")?.value === "dish" ? "dish" : "preparation";
      const currentId = this.recipeId_();
      const list = type === "dish" ? this.dishDataService_.allDishes_() : this.recipeDataService_.allRecipes_();
      const isDup = list.some((r) => (r.name_hebrew?.trim() ?? "") === name && r._id !== currentId);
      return of(isDup ? { duplicateName: true } : null);
    }));
  }
  patchFormFromRecipe(recipe) {
    this.isApproved_.set(recipe.is_approved_);
    this.recipeFormService_.patchFormFromRecipe(this.recipeForm_, recipe);
    this.recipeImageUrl_.set(recipe.imageUrl_ ?? null);
  }
  //GETTERS
  get yieldConversionsArray() {
    return this.recipeForm_.get("yield_conversions");
  }
  get workflowArray() {
    return this.recipeForm_.get("workflow_items");
  }
  get ingredientsArray() {
    return this.recipeForm_.get("ingredients");
  }
  get logisticsBaselineArray() {
    return this.recipeForm_.get("logistics")?.get("baseline_");
  }
  /** For pendingChangesGuard: true when current form value differs from initial state when user entered the page. */
  hasRealChanges() {
    if (this.historyViewMode_() || this.recipeForm_.disabled)
      return false;
    if (this.initialRecipeSnapshot_ === null)
      return this.recipeForm_.dirty === true;
    return this.getRecipeSnapshotForComparison() !== this.initialRecipeSnapshot_;
  }
  /** Normalized form value for comparison (numbers coerced, labels sorted). */
  getRecipeSnapshotForComparison() {
    const raw = this.recipeForm_.getRawValue();
    const labels = raw?.["labels"] ?? [];
    const normalizedLabels = [...labels].sort((a, b) => (a ?? "").localeCompare(b ?? ""));
    const yieldConv = raw?.["yield_conversions"] ?? [];
    const yieldNorm = yieldConv.map((c) => ({
      amount: Number(c?.amount ?? 0),
      unit: (c?.unit ?? "").toString()
    }));
    const ingredients = raw?.["ingredients"] ?? [];
    const ingNorm = ingredients.map((ing) => ({
      referenceId: (ing?.referenceId ?? "").toString(),
      item_type: (ing?.item_type ?? "").toString(),
      amount_net: Number(ing?.amount_net ?? 0),
      unit: (ing?.unit ?? "").toString(),
      total_cost: Number(ing?.total_cost ?? 0)
    }));
    const workflow = raw?.["workflow_items"] ?? [];
    const workflowNorm = workflow.map((row) => {
      if (row?.["order"] != null || row?.["instruction"] != null || row?.["labor_time"] != null) {
        return {
          order: Number(row?.["order"] ?? 0),
          instruction: (row?.["instruction"] ?? "").toString(),
          labor_time: Number(row?.["labor_time"] ?? 0)
        };
      }
      return {
        preparation_name: (row?.["preparation_name"] ?? "").toString(),
        category_name: (row?.["category_name"] ?? "").toString(),
        main_category_name: (row?.["main_category_name"] ?? "").toString(),
        quantity: Number(row?.["quantity"] ?? 0),
        unit: (row?.["unit"] ?? "").toString()
      };
    });
    const logistics = raw?.["logistics"];
    const baselineRaw = logistics?.["baseline_"] ?? [];
    const baselineNorm = baselineRaw.map((r) => ({
      equipment_id_: (r?.equipment_id_ ?? "").toString(),
      quantity_: Number(r?.quantity_ ?? 0),
      phase_: (r?.phase_ ?? "both").toString(),
      is_critical_: !!r?.is_critical_,
      notes_: (r?.notes_ ?? "").toString()
    }));
    const normalized = {
      name_hebrew: (raw?.["name_hebrew"] ?? "").toString(),
      recipe_type: (raw?.["recipe_type"] ?? "preparation").toString(),
      serving_portions: Number(raw?.["serving_portions"] ?? 1),
      total_weight_g: Number(raw?.["total_weight_g"] ?? 0),
      total_cost: Number(raw?.["total_cost"] ?? 0),
      labels: normalizedLabels,
      yield_conversions: yieldNorm,
      ingredients: ingNorm,
      workflow_items: workflowNorm,
      logistics_baseline: baselineNorm
    };
    return JSON.stringify(normalized);
  }
  get allEquipment_() {
    return this.equipmentData_.allEquipment_();
  }
  equipmentOptions_ = computed(() => this.equipmentData_.allEquipment_().map((eq) => ({ value: eq._id, label: eq.name_hebrew })));
  phaseOptions_ = [
    { value: "prep", label: "phase_prep" },
    { value: "service", label: "phase_service" },
    { value: "both", label: "phase_both" }
  ];
  logisticsToolSearchQuery_ = signal("");
  logisticsToolQuantity_ = signal(1);
  logisticsToolDropdownOpen_ = signal(false);
  logisticsHighlightedIndex_ = signal(-1);
  /** Selected equipment id (from dropdown); user sets quantity then presses Add. */
  logisticsSelectedToolId_ = signal(null);
  /** Equipment IDs already in the logistics baseline (excluded from equipment search options). */
  logisticsBaselineIds_ = toSignal(this.logisticsBaselineArray.valueChanges.pipe(startWith(this.logisticsBaselineArray.value), map((arr) => arr.map((r) => r.equipment_id_).filter(Boolean))), { initialValue: [] });
  /** Search options: equipment only (by name_hebrew), "starts with" + Hebrew/Latin script. */
  logisticsSearchOptions_ = computed(() => {
    const raw = this.logisticsToolSearchQuery_().trim();
    if (!raw)
      return [];
    const alreadyAdded = new Set(this.logisticsBaselineIds_() ?? []);
    const allEquipment = this.equipmentData_.allEquipment_().filter((eq) => !alreadyAdded.has(eq._id));
    const filtered = filterOptionsByStartsWith(allEquipment, raw, (eq) => eq.name_hebrew);
    const qLower = raw.toLowerCase();
    return filtered.slice().sort((a, b) => {
      const aName = a.name_hebrew.toLowerCase();
      const bName = b.name_hebrew.toLowerCase();
      const aStarts = aName.startsWith(qLower) ? 0 : 1;
      const bStarts = bName.startsWith(qLower) ? 0 : 1;
      if (aStarts !== bStarts)
        return aStarts - bStarts;
      return aName.indexOf(qLower) - bName.indexOf(qLower);
    });
  });
  getEquipmentNameById(id) {
    const eq = this.equipmentData_.allEquipment_().find((e) => e._id === id);
    return eq?.name_hebrew ?? id;
  }
  incrementLogisticsQuantity() {
    this.logisticsToolQuantity_.update((q) => quantityIncrement(q, 1, { integerOnly: true }));
  }
  decrementLogisticsQuantity() {
    this.logisticsToolQuantity_.update((q) => quantityDecrement(q, 1, { integerOnly: true }));
  }
  onLogisticsQuantityKeydown(e) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    e.preventDefault();
    const current = this.logisticsToolQuantity_();
    const next = e.key === "ArrowUp" ? quantityIncrement(current, 1, { integerOnly: true }) : quantityDecrement(current, 1, { integerOnly: true });
    this.logisticsToolQuantity_.set(next);
  }
  /** Select an option from dropdown (does not add yet; user sets quantity and presses Add). */
  selectLogisticsOption(option) {
    this.logisticsSelectedToolId_.set(option._id);
    this.logisticsToolQuantity_.set(1);
    this.logisticsToolSearchQuery_.set(option.name_hebrew);
    this.logisticsToolDropdownOpen_.set(false);
  }
  onLogisticsSearchInput(value) {
    this.logisticsToolSearchQuery_.set(value);
    this.logisticsHighlightedIndex_.set(-1);
    this.logisticsToolDropdownOpen_.set(value.trim().length > 0);
    const selectedId = this.logisticsSelectedToolId_();
    if (selectedId && this.getEquipmentNameById(selectedId) !== value) {
      this.logisticsSelectedToolId_.set(null);
    }
  }
  onLogisticsSearchKeydown(event) {
    if (!this.logisticsToolDropdownOpen_())
      return;
    const opts = this.logisticsSearchOptions_();
    const len = opts.length + 1;
    let idx = this.logisticsHighlightedIndex_();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      idx = Math.min(idx + 1, len - 1);
      this.logisticsHighlightedIndex_.set(idx);
      this.scrollLogisticsDropdownToItem(idx);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      idx = Math.max(idx - 1, 0);
      this.logisticsHighlightedIndex_.set(idx);
      this.scrollLogisticsDropdownToItem(idx);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (idx >= 0 && idx < opts.length) {
        this.selectLogisticsOption(opts[idx]);
        this.logisticsHighlightedIndex_.set(-1);
      } else if (idx === opts.length) {
        this.openAddNewToolModal();
        this.logisticsHighlightedIndex_.set(-1);
      }
    } else if (event.key === "Escape") {
      this.logisticsToolDropdownOpen_.set(false);
      this.logisticsHighlightedIndex_.set(-1);
    }
  }
  scrollLogisticsDropdownToItem(index) {
    setTimeout(() => {
      const dropdown = document.querySelector(".logistics-tool-dropdown");
      if (!dropdown)
        return;
      const items = dropdown.querySelectorAll(".logistics-tool-option");
      if (items[index]) {
        items[index].scrollIntoView({ block: "nearest" });
      }
    }, 0);
  }
  /** Add the currently selected item (with current quantity) to baseline. Called by Add button. */
  addSelectedToolToBaseline() {
    const id = this.logisticsSelectedToolId_();
    if (!id)
      return;
    const qty = this.logisticsToolQuantity_();
    this.logisticsBaselineArray.push(this.recipeFormService_.createBaselineRow({
      equipment_id_: id,
      quantity_: qty,
      phase_: "both",
      is_critical_: true,
      notes_: void 0
    }));
    this.logisticsSelectedToolId_.set(null);
    this.logisticsToolSearchQuery_.set("");
    this.logisticsToolQuantity_.set(1);
    this.logisticsToolDropdownOpen_.set(false);
  }
  /** Add button click: if something selected → add to baseline; if only search text → open add-new-equipment modal. */
  onLogisticsAddClick() {
    if (this.logisticsSelectedToolId_()) {
      this.addSelectedToolToBaseline();
      return;
    }
    if (this.logisticsToolSearchQuery_().trim()) {
      this.openAddNewToolModal();
    }
  }
  openAddNewToolModal() {
    return __async(this, null, function* () {
      this.logisticsToolDropdownOpen_.set(false);
      const initialName = this.logisticsToolSearchQuery_().trim() || void 0;
      const result = yield this.addEquipmentModal_.open(initialName);
      if (!result?.name?.trim())
        return;
      try {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const created = yield this.equipmentData_.addEquipment({
          name_hebrew: result.name.trim(),
          category_: result.category,
          owned_quantity_: 0,
          is_consumable_: false,
          created_at_: now,
          updated_at_: now
        });
        this.logisticsSelectedToolId_.set(created._id);
        this.logisticsToolSearchQuery_.set(created.name_hebrew);
        this.logisticsToolQuantity_.set(1);
      } catch (err) {
        this.logging_.error({ event: "recipe_builder.save_error", message: "Recipe builder save error (add tool)", context: { err } });
        const msg = err instanceof Error && err.message === ERR_DUPLICATE_EQUIPMENT_NAME ? this.translation_.translate("duplicate_equipment_name") ?? "\u05DB\u05DC\u05D9 \u05E2\u05DD \u05E9\u05DD \u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD" : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05D5\u05E1\u05E4\u05EA \u05D4\u05DB\u05DC\u05D9";
        this.userMsg_.onSetErrorMsg(msg);
      }
    });
  }
  //CREATE
  addBaselineRow() {
    this.logisticsBaselineArray.push(this.recipeFormService_.createBaselineRow());
  }
  removeBaselineRow(index) {
    this.logisticsBaselineArray.removeAt(index);
  }
  addNewStep(category) {
    const nextOrder = this.workflowArray.length + 1;
    const isDish = this.recipeForm_.get("recipe_type")?.value === "dish";
    const newGroup = isDish ? this.recipeFormService_.createPrepItemRow({ category_name: category || "", main_category_name: category || "" }) : this.recipeFormService_.createStepGroup(nextOrder);
    this.workflowArray.push(newGroup);
    this.focusWorkflowRowAt_.set(this.workflowArray.length - 1);
  }
  //UPDATE
  onImageChange(url) {
    this.recipeImageUrl_.set(url);
  }
  addNewIngredientRow() {
    const newGroup = this.recipeFormService_.createIngredientGroup();
    this.ingredientsArray.push(newGroup);
    this.ingredientsArray.updateValueAndValidity();
    this.focusIngredientSearchAtRow_.set(this.ingredientsArray.length - 1);
  }
  onIngredientSearchFocusDone() {
    this.focusIngredientSearchAtRow_.set(null);
  }
  saveRecipe(options) {
    if (this.recipeForm_.invalid) {
      this.recipeForm_.markAllAsTouched();
      const msg = this.getRecipeValidationError_();
      this.userMsg_.onSetErrorMsg(msg);
      return;
    }
    const navigateOnSuccess = options?.navigateOnSuccess !== false;
    this.saving.setSaving(true);
    const recipe = this.buildRecipeFromForm();
    recipe.autoLabels_ = this.recipeFormService_.computeAutoLabels(recipe);
    this.state_.saveRecipe(recipe).subscribe({
      next: () => {
        this.saving.setSaving(false);
        if (navigateOnSuccess) {
          this.isSubmitted = true;
          this.resetToNewForm_();
          this.router_.navigate(["/recipe-book"]);
        } else {
          this.userMsg_.onSetSuccessMsg(this.translation_.translate(this.isApproved_() ? "approval_success" : "unapproval_success"));
        }
      },
      error: () => {
        this.saving.setSaving(false);
        if (!navigateOnSuccess) {
          this.userMsg_.onSetErrorMsg(this.translation_.translate("approval_error"));
        }
      }
    });
  }
  onApproveStamp() {
    if (this.recipeId_() && this.hasRealChanges()) {
      this.confirmModal_.open("approve_stamp_unsaved_confirm", { saveLabel: "save_changes" }).then((confirmed) => {
        if (!confirmed)
          return;
        this.isApproved_.set(!this.isApproved_());
        this.saveRecipe({ navigateOnSuccess: false });
      });
      return;
    }
    this.isApproved_.set(!this.isApproved_());
    if (this.recipeId_()) {
      this.saveRecipe({ navigateOnSuccess: false });
    }
  }
  navigateBackFromHistory() {
    this.router_.navigate(["/recipe-book"]);
  }
  onPrint() {
    window.print();
  }
  /** Quantity for export (form snapshot): dish = serving_portions, recipe = yield amount; min 1. */
  exportQuantity_() {
    const raw = this.recipeForm_.getRawValue();
    if (raw?.recipe_type === "dish") {
      const n2 = Number(raw?.serving_portions);
      return isNaN(n2) || n2 < 1 ? 1 : n2;
    }
    const conv = raw?.yield_conversions?.[0];
    const n = conv?.amount != null ? Number(conv.amount) : 1;
    return isNaN(n) || n < 1 ? 1 : n;
  }
  onViewRecipeInfo() {
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    this.exportPreviewPayload_.set(this.exportService_.getRecipeInfoPreviewPayload(recipe, qty));
    this.exportPreviewType_ = "recipe-info";
  }
  onViewShoppingList() {
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    this.exportPreviewPayload_.set(this.exportService_.getShoppingListPreviewPayload(recipe, qty));
    this.exportPreviewType_ = "shopping-list";
  }
  onViewCookingSteps() {
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    this.exportPreviewPayload_.set(this.exportService_.getCookingStepsPreviewPayload(recipe, qty));
    this.exportPreviewType_ = "cooking-steps";
  }
  onViewDishChecklist() {
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    this.exportPreviewPayload_.set(this.exportService_.getDishChecklistPreviewPayload(recipe, qty));
    this.exportPreviewType_ = "dish-checklist";
  }
  onViewAll() {
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    this.exportPreviewPayload_.set(this.exportService_.getRecipeInfoPreviewPayload(recipe, qty));
    this.exportPreviewType_ = "recipe-all";
    this.closeViewExportModal();
  }
  onExportFromPreview() {
    const payload = this.exportPreviewPayload_();
    const type = this.exportPreviewType_;
    if (!payload || !type)
      return;
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    if (type === "recipe-info")
      this.exportService_.exportRecipeInfo(recipe, qty);
    else if (type === "shopping-list")
      this.exportService_.exportShoppingList(recipe, qty);
    else if (type === "cooking-steps")
      this.exportService_.exportCookingSteps(recipe, qty);
    else if (type === "dish-checklist")
      this.exportService_.exportDishChecklist(recipe, qty);
    else if (type === "recipe-all")
      this.exportService_.exportAllTogetherRecipe(recipe, qty);
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
  }
  onExportRecipeInfo() {
    this.exportService_.exportRecipeInfo(this.buildRecipeFromForm(), this.exportQuantity_());
  }
  onExportShoppingList() {
    this.exportService_.exportShoppingList(this.buildRecipeFromForm(), this.exportQuantity_());
  }
  onExportCookingSteps() {
    this.exportService_.exportCookingSteps(this.buildRecipeFromForm(), this.exportQuantity_());
  }
  onExportDishChecklist() {
    this.exportService_.exportDishChecklist(this.buildRecipeFromForm(), this.exportQuantity_());
  }
  onExportAllTogether() {
    this.exportService_.exportAllTogetherRecipe(this.buildRecipeFromForm(), this.exportQuantity_());
  }
  onPrintFromPreview() {
    window.print();
  }
  onCloseExportPreview() {
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
  }
  /** Returns a user-friendly validation error message listing exactly what is missing. */
  getRecipeValidationError_() {
    const isDish = this.recipeForm_.get("recipe_type")?.value === "dish";
    const errors = [];
    const name = (this.recipeForm_.get("name_hebrew")?.value ?? "").toString().trim();
    if (this.recipeForm_.get("name_hebrew")?.errors?.["duplicateName"]) {
      errors.push(isDish ? "\u05E9\u05DD \u05DE\u05E0\u05D4 \u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD" : "\u05E9\u05DD \u05DE\u05EA\u05DB\u05D5\u05DF \u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD");
    }
    if (!name) {
      errors.push(isDish ? "\u05E9\u05DD \u05D4\u05DE\u05E0\u05D4 \u05D7\u05E1\u05E8" : "\u05E9\u05DD \u05D4\u05DE\u05EA\u05DB\u05D5\u05DF \u05D7\u05E1\u05E8");
    }
    const raw = this.recipeForm_.getRawValue();
    const ingredients = raw?.ingredients || [];
    const hasAnyIngredient = ingredients.some((ing) => !!ing?.referenceId);
    if (!hasAnyIngredient) {
      errors.push("\u05D7\u05E1\u05E8 \u05DE\u05E8\u05DB\u05D9\u05D1: \u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05DC\u05E4\u05D7\u05D5\u05EA \u05DE\u05D5\u05E6\u05E8 \u05D0\u05D5 \u05DE\u05EA\u05DB\u05D5\u05DF \u05D0\u05D7\u05D3");
    }
    ingredients.forEach((ing, i) => {
      if (!ing?.referenceId)
        return;
      const amt = ing.amount_net;
      const numAmt = typeof amt === "number" ? amt : Number(amt);
      const label = ing.name_hebrew || `\u05DE\u05E8\u05DB\u05D9\u05D1 ${i + 1}`;
      if (amt == null || amt === "" || isNaN(numAmt) || numAmt < 0) {
        errors.push(`\u05DB\u05DE\u05D5\u05EA \u05D7\u05E1\u05E8\u05D4 \u05E2\u05D1\u05D5\u05E8 "${label}"`);
      } else if (numAmt === 0) {
        errors.push(`\u05DB\u05DE\u05D5\u05EA \u05E2\u05D1\u05D5\u05E8 "${label}" \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05D9\u05D5\u05EA \u05D2\u05D3\u05D5\u05DC\u05D4 \u05DE-0`);
      }
    });
    const portions = this.recipeForm_.get("serving_portions")?.value;
    if (isDish && (portions == null || Number(portions) < 1)) {
      errors.push("\u05DE\u05E1\u05E4\u05E8 \u05DE\u05E0\u05D5\u05EA \u05D7\u05E1\u05E8 \u05D0\u05D5 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF (\u05E0\u05D3\u05E8\u05E9 \u05DC\u05E4\u05D7\u05D5\u05EA 1)");
    }
    const workflowRows = raw?.workflow_items || [];
    if (isDish) {
      workflowRows.forEach((row, i) => {
        if (!row?.preparation_name?.trim())
          return;
        const qty = typeof row.quantity === "number" ? row.quantity : Number(row.quantity);
        if (row.quantity == null || row.quantity === "" || isNaN(qty) || qty < 0) {
          errors.push(`\u05DB\u05DE\u05D5\u05EA \u05D7\u05E1\u05E8\u05D4 \u05E2\u05D1\u05D5\u05E8 \u05D4\u05D4\u05DB\u05E0\u05D4 "${row.preparation_name}"`);
        }
        if (!row?.unit?.trim()) {
          errors.push(`\u05D9\u05D7\u05D9\u05D3\u05D4 \u05D7\u05E1\u05E8\u05D4 \u05E2\u05D1\u05D5\u05E8 \u05D4\u05D4\u05DB\u05E0\u05D4 "${row.preparation_name}"`);
        }
      });
    }
    if (errors.length === 0) {
      return "\u05D9\u05E9 \u05DC\u05DE\u05DC\u05D0 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E9\u05D3\u05D5\u05EA \u05D4\u05E0\u05D3\u05E8\u05E9\u05D9\u05DD";
    }
    return errors.length === 1 ? errors[0] : `\u05D7\u05E1\u05E8\u05D9\u05DD: ${errors.join("; ")}`;
  }
  buildRecipeFromForm() {
    const recipe = this.recipeFormService_.buildRecipeFromForm(this.recipeForm_, this.recipeId_(), this.isApproved_());
    const url = this.recipeImageUrl_();
    return url ? __spreadProps(__spreadValues({}, recipe), { imageUrl_: url }) : recipe;
  }
  //DELETE
  removeIngredient(index) {
    this.ingredientsArray.removeAt(index);
    if (this.ingredientsArray.length === 0) {
      this.addNewIngredientRow();
    }
  }
  onOpenUnitCreator() {
    this.unitRegistry_.openUnitCreator();
  }
  deleteStep(index) {
    this.workflowArray.removeAt(index);
    if (this.recipeForm_.get("recipe_type")?.value === "preparation") {
      this.workflowArray.controls.forEach((group, i) => {
        group.get("order")?.setValue(i + 1);
      });
    }
  }
  static \u0275fac = function RecipeBuilderPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RecipeBuilderPage)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _RecipeBuilderPage, selectors: [["app-recipe-builder-page"]], decls: 31, vars: 43, consts: [["dir", "rtl", 1, "recipe-builder-container"], [1, "history-view-banner"], [1, "builder-shell"], [1, "builder-section"], [3, "openUnitCreator", "imageChange", "importTextClick", "form", "recipeType", "currentCost", "totalWeightG", "totalBrutoWeightG", "totalVolumeL", "totalVolumeMl", "unconvertibleForWeight", "unconvertibleForVolume", "resetTrigger", "autoLabels", "imageUrl", "readonlyMode"], [1, "section-card", "collapsible", "table-logic", 3, "click"], ["role", "button", "tabindex", "0", 1, "section-card-header", 3, "click", "keydown.enter", "keydown.space"], [1, "section-title"], ["type", "button", "tabindex", "-1", 1, "section-toggle-btn", 3, "click"], [3, "name", "size"], [1, "section-card-body", 3, "click"], [3, "removeIngredient", "addIngredient", "focusSearchDone", "ingredientsFormArray", "portions", "focusSearchAtRow"], ["type", "button", 1, "add-row-btn"], [1, "section-card", "collapsible", "workflow-logic", 3, "click"], [3, "addItem", "removeItem", "focusRowDone", "workflowFormArray", "type", "resetTrigger", "focusRowAt"], [1, "action-footer"], [3, "approved", "disabled"], [3, "payload"], ["type", "button", 1, "btn-back", 3, "click"], [3, "closeRequest"], [1, "view-export-wrap"], ["type", "button", 1, "toolbar-glass-btn", 3, "click"], ["name", "table-2", 3, "size"], [1, "view-export-modal"], ["name", "shopping-cart", 3, "size"], ["name", "package", 3, "size"], ["name", "printer", 3, "size"], [1, "view-export-modal", 3, "click", "clickOutside"], ["type", "button", 1, "view-export-option", 3, "click"], ["name", "eye", 3, "size"], ["name", "download", 3, "size"], ["name", "clipboard-list", 3, "size"], ["type", "button", 1, "add-row-btn", 3, "click"], ["name", "plus", 3, "size"], [1, "section-card", "collapsible", "logistics-logic", 3, "click"], [1, "logistics-grid", 3, "clickOutside", "formGroup"], [1, "logistics-add-wrap"], [1, "logistics-add-inner"], [1, "logistics-tool-search-wrap"], ["name", "search", 1, "logistics-search-icon", 3, "size"], ["type", "text", 1, "logistics-tool-search", 3, "input", "keydown", "value", "placeholder"], [3, "valueChange", "value", "min", "stepOptions"], ["type", "button", 1, "logistics-add-btn", 3, "click", "disabled"], [1, "logistics-tool-dropdown", 3, "maxHeight"], ["formGroupName", "logistics", 1, "logistics-chips-wrap"], ["formArrayName", "baseline_", 1, "logistics-chips"], [1, "logistics-chip-wrap"], ["role", "listbox"], ["role", "option", 1, "logistics-tool-option", 3, "highlighted"], ["role", "option", 1, "logistics-tool-option", "logistics-tool-add-new", 3, "click"], ["name", "plus-circle", 3, "size"], ["role", "option", 1, "logistics-tool-option", 3, "click"], ["type", "button", 1, "logistics-chip", 3, "click"], [1, "logistics-chip-label"], [1, "logistics-chip-qty"], [1, "c-btn-primary", "main-submit-btn", 3, "click", "disabled"], ["size", "small", 3, "inline"], [3, "approve", "approved", "disabled"], [3, "exportClick", "printClick", "close", "payload"]], template: function RecipeBuilderPage_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0);
      \u0275\u0275template(1, RecipeBuilderPage_Conditional_1_Template, 7, 6, "div", 1)(2, RecipeBuilderPage_Conditional_2_Template, 29, 36, "app-export-toolbar-overlay");
      \u0275\u0275elementStart(3, "div", 2)(4, "section", 3)(5, "app-recipe-header", 4);
      \u0275\u0275listener("openUnitCreator", function RecipeBuilderPage_Template_app_recipe_header_openUnitCreator_5_listener() {
        return ctx.onOpenUnitCreator();
      })("imageChange", function RecipeBuilderPage_Template_app_recipe_header_imageChange_5_listener($event) {
        return ctx.onImageChange($event);
      })("importTextClick", function RecipeBuilderPage_Template_app_recipe_header_importTextClick_5_listener() {
        return ctx.onImportTextClick();
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(6, "section", 3)(7, "div", 5);
      \u0275\u0275listener("click", function RecipeBuilderPage_Template_div_click_7_listener() {
        return ctx.tableLogicCollapsed_() && ctx.toggleTableLogic();
      });
      \u0275\u0275elementStart(8, "div", 6);
      \u0275\u0275listener("click", function RecipeBuilderPage_Template_div_click_8_listener($event) {
        ctx.toggleTableLogic();
        return $event.stopPropagation();
      })("keydown.enter", function RecipeBuilderPage_Template_div_keydown_enter_8_listener() {
        return ctx.toggleTableLogic();
      })("keydown.space", function RecipeBuilderPage_Template_div_keydown_space_8_listener($event) {
        ctx.toggleTableLogic();
        return $event.preventDefault();
      });
      \u0275\u0275elementStart(9, "h2", 7);
      \u0275\u0275text(10);
      \u0275\u0275pipe(11, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(12, "button", 8);
      \u0275\u0275listener("click", function RecipeBuilderPage_Template_button_click_12_listener($event) {
        ctx.toggleTableLogic();
        return $event.stopPropagation();
      });
      \u0275\u0275element(13, "lucide-icon", 9);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(14, "div", 10);
      \u0275\u0275listener("click", function RecipeBuilderPage_Template_div_click_14_listener($event) {
        return $event.stopPropagation();
      });
      \u0275\u0275elementStart(15, "app-recipe-ingredients-table", 11);
      \u0275\u0275listener("removeIngredient", function RecipeBuilderPage_Template_app_recipe_ingredients_table_removeIngredient_15_listener($event) {
        return ctx.removeIngredient($event);
      })("addIngredient", function RecipeBuilderPage_Template_app_recipe_ingredients_table_addIngredient_15_listener() {
        return ctx.addNewIngredientRow();
      })("focusSearchDone", function RecipeBuilderPage_Template_app_recipe_ingredients_table_focusSearchDone_15_listener() {
        return ctx.onIngredientSearchFocusDone();
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(16, RecipeBuilderPage_Conditional_16_Template, 4, 4, "button", 12);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(17, "section", 3)(18, "div", 13);
      \u0275\u0275listener("click", function RecipeBuilderPage_Template_div_click_18_listener() {
        return ctx.workflowLogicCollapsed_() && ctx.toggleWorkflowLogic();
      });
      \u0275\u0275elementStart(19, "div", 6);
      \u0275\u0275listener("click", function RecipeBuilderPage_Template_div_click_19_listener($event) {
        ctx.toggleWorkflowLogic();
        return $event.stopPropagation();
      })("keydown.enter", function RecipeBuilderPage_Template_div_keydown_enter_19_listener() {
        return ctx.toggleWorkflowLogic();
      })("keydown.space", function RecipeBuilderPage_Template_div_keydown_space_19_listener($event) {
        ctx.toggleWorkflowLogic();
        return $event.preventDefault();
      });
      \u0275\u0275elementStart(20, "h2", 7);
      \u0275\u0275text(21);
      \u0275\u0275pipe(22, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(23, "button", 8);
      \u0275\u0275listener("click", function RecipeBuilderPage_Template_button_click_23_listener($event) {
        ctx.toggleWorkflowLogic();
        return $event.stopPropagation();
      });
      \u0275\u0275element(24, "lucide-icon", 9);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(25, "div", 10);
      \u0275\u0275listener("click", function RecipeBuilderPage_Template_div_click_25_listener($event) {
        return $event.stopPropagation();
      });
      \u0275\u0275elementStart(26, "app-recipe-workflow", 14);
      \u0275\u0275listener("addItem", function RecipeBuilderPage_Template_app_recipe_workflow_addItem_26_listener($event) {
        return ctx.addNewStep($event);
      })("removeItem", function RecipeBuilderPage_Template_app_recipe_workflow_removeItem_26_listener($event) {
        return ctx.deleteStep($event);
      })("focusRowDone", function RecipeBuilderPage_Template_app_recipe_workflow_focusRowDone_26_listener() {
        return ctx.focusWorkflowRowAt_.set(null);
      });
      \u0275\u0275elementEnd()()()();
      \u0275\u0275template(27, RecipeBuilderPage_Conditional_27_Template, 25, 23, "section", 3)(28, RecipeBuilderPage_Conditional_28_Template, 5, 5, "footer", 15);
      \u0275\u0275elementEnd();
      \u0275\u0275template(29, RecipeBuilderPage_Conditional_29_Template, 1, 2, "app-approve-stamp", 16)(30, RecipeBuilderPage_Conditional_30_Template, 1, 1, "app-export-preview", 17);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_21_0;
      let tmp_36_0;
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.historyViewMode_() ? 1 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.exportToolbarOpen_() ? 2 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275property("form", ctx.recipeForm_)("recipeType", ctx.recipeType_())("currentCost", ctx.totalCost_())("totalWeightG", ctx.totalWeightG_())("totalBrutoWeightG", ctx.totalBrutoWeightG_())("totalVolumeL", ctx.totalVolumeL_())("totalVolumeMl", ctx.totalVolumeMl_())("unconvertibleForWeight", ctx.unconvertibleForWeight_())("unconvertibleForVolume", ctx.unconvertibleForVolume_())("resetTrigger", ctx.resetTrigger_())("autoLabels", ctx.liveAutoLabels_())("imageUrl", ctx.recipeImageUrl_())("readonlyMode", ctx.historyViewMode_());
      \u0275\u0275advance(2);
      \u0275\u0275classProp("is-collapsed", ctx.tableLogicCollapsed_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(11, 39, "ingredients_index"));
      \u0275\u0275advance(2);
      \u0275\u0275attribute("aria-expanded", !ctx.tableLogicCollapsed_());
      \u0275\u0275advance();
      \u0275\u0275property("name", ctx.tableLogicCollapsed_() ? "chevron-down" : "chevron-up")("size", 20);
      \u0275\u0275advance(2);
      \u0275\u0275property("ingredientsFormArray", ctx.ingredientsArray)("portions", (tmp_21_0 = ctx.portions_()) !== null && tmp_21_0 !== void 0 ? tmp_21_0 : 1)("focusSearchAtRow", ctx.focusIngredientSearchAtRow_());
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.historyViewMode_() ? 16 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275classProp("is-collapsed", ctx.workflowLogicCollapsed_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(22, 41, ctx.recipeType_() === "dish" ? "prep_list_mise_en_place" : "prep_workflow"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275attribute("aria-expanded", !ctx.workflowLogicCollapsed_());
      \u0275\u0275advance();
      \u0275\u0275property("name", ctx.workflowLogicCollapsed_() ? "chevron-down" : "chevron-up")("size", 20);
      \u0275\u0275advance(2);
      \u0275\u0275property("workflowFormArray", ctx.workflowArray)("type", ctx.recipeType_())("resetTrigger", ctx.resetTrigger_())("focusRowAt", ctx.focusWorkflowRowAt_());
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.historyViewMode_() ? 27 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.historyViewMode_() ? 28 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.historyViewMode_() ? 29 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_36_0 = ctx.exportPreviewPayload_()) ? 30 : -1, tmp_36_0);
    }
  }, dependencies: [
    CommonModule,
    ReactiveFormsModule,
    NgControlStatusGroup,
    FormGroupDirective,
    FormGroupName,
    FormArrayName,
    RecipeHeaderComponent,
    RecipeIngredientsTableComponent,
    RecipeWorkflowComponent,
    LucideAngularModule,
    LucideAngularComponent,
    TranslatePipe,
    LoaderComponent,
    ScrollableDropdownComponent,
    ClickOutSideDirective,
    ExportPreviewComponent,
    ExportToolbarOverlayComponent,
    ApproveStampComponent,
    CounterComponent
  ], styles: ['\n\n[_nghost-%COMP%] {\n  --rb-gap-tight: 0.5rem;\n  --rb-gap-mid: 0.75rem;\n  --rb-submit-width: 12.5rem;\n  --rb-banner-margin: -3rem -1rem 1rem -1rem;\n}\n.history-view-banner[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  position: relative;\n  gap: 1rem;\n  padding: var(--rb-gap-mid) 1rem;\n  margin: var(--rb-banner-margin);\n  background: var(--bg-warning);\n  color: var(--text-warning);\n  font-weight: 600;\n  border-block-end: 2px solid var(--border-warning);\n}\n.history-view-banner[_ngcontent-%COMP%]   .btn-back[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding-block: 0.4rem;\n  padding-inline: var(--rb-gap-mid);\n  background: var(--bg-pure);\n  color: var(--text-warning);\n  font-size: 0.875rem;\n  border: 1px solid var(--border-warning);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: background 0.2s ease;\n}\n.history-view-banner[_ngcontent-%COMP%]   .btn-back[_ngcontent-%COMP%]:hover {\n  background: var(--bg-warning);\n}\n.recipe-builder-container[_ngcontent-%COMP%] {\n  display: block;\n  position: relative;\n  min-height: 100vh;\n  min-height: 100dvh;\n  padding: 2rem 1rem;\n  background: transparent;\n  font-family: "Heebo", sans-serif;\n}\n.recipe-builder-container[_ngcontent-%COMP%]   .builder-shell[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  max-width: 60rem;\n  margin: 0 auto;\n  gap: 1.5rem;\n}\n.recipe-builder-container[_ngcontent-%COMP%]   .builder-shell[_ngcontent-%COMP%]   .builder-section[_ngcontent-%COMP%] {\n  position: relative;\n}\n.recipe-builder-container[_ngcontent-%COMP%]   .builder-shell[_ngcontent-%COMP%]   .builder-section[_ngcontent-%COMP%]   .print-btn-wrap[_ngcontent-%COMP%] {\n  position: absolute;\n  inset-block-start: 0;\n  inset-inline-end: 0;\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  z-index: 20;\n}\n.recipe-builder-container[_ngcontent-%COMP%]   .builder-shell[_ngcontent-%COMP%]   .builder-section[_ngcontent-%COMP%]:nth-of-type(1) {\n  z-index: 10;\n}\n.recipe-builder-container[_ngcontent-%COMP%]   .builder-shell[_ngcontent-%COMP%]   .builder-section[_ngcontent-%COMP%]:nth-of-type(2) {\n  z-index: 8;\n}\n.recipe-builder-container[_ngcontent-%COMP%]   .builder-shell[_ngcontent-%COMP%]   .builder-section[_ngcontent-%COMP%]:nth-of-type(3) {\n  z-index: 6;\n}\n.recipe-builder-container[_ngcontent-%COMP%]   .builder-shell[_ngcontent-%COMP%]   .builder-section[_ngcontent-%COMP%]:nth-of-type(4) {\n  z-index: 4;\n}\n.section-card[_ngcontent-%COMP%] {\n  display: block;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border-inline-start: 4px solid var(--color-primary);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.section-title[_ngcontent-%COMP%] {\n  display: block;\n  margin-block-end: 1rem;\n  color: var(--color-primary);\n  font-size: 1.25rem;\n  font-weight: 700;\n  text-align: center;\n}\n.section-card.collapsible[_ngcontent-%COMP%] {\n}\n.section-card.collapsible[_ngcontent-%COMP%]   .section-card-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  margin-block-end: 0;\n  padding-block-end: 0;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.section-card.collapsible[_ngcontent-%COMP%]   .section-card-header[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass);\n}\n.section-card.collapsible[_ngcontent-%COMP%]   .section-card-header[_ngcontent-%COMP%]   .section-title[_ngcontent-%COMP%] {\n  text-align: start;\n  flex: 1;\n}\n.section-card.collapsible[_ngcontent-%COMP%]   .section-card-header[_ngcontent-%COMP%]   .section-desc[_ngcontent-%COMP%] {\n  flex-basis: 100%;\n  margin-block: 0.25rem 0;\n}\n.section-card.collapsible[_ngcontent-%COMP%]   .section-toggle-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.25rem;\n  min-width: 2rem;\n  min-height: 2rem;\n  background: transparent;\n  color: var(--color-primary);\n  border: none;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition:\n    background 0.2s ease,\n    color 0.2s ease,\n    opacity 0.2s ease;\n}\n.section-card.collapsible[_ngcontent-%COMP%]   .section-toggle-btn[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n}\n.section-card.collapsible[_ngcontent-%COMP%]:not(.is-collapsed)   .section-toggle-btn[_ngcontent-%COMP%] {\n  opacity: 0;\n  pointer-events: none;\n}\n.section-card.collapsible[_ngcontent-%COMP%]:not(.is-collapsed)   .section-card-header[_ngcontent-%COMP%]:hover   .section-toggle-btn[_ngcontent-%COMP%] {\n  opacity: 1;\n  pointer-events: auto;\n}\n.section-card.collapsible[_ngcontent-%COMP%]   .section-card-body[_ngcontent-%COMP%] {\n  margin-block-start: 1rem;\n}\n.section-card.collapsible.is-collapsed[_ngcontent-%COMP%] {\n  cursor: pointer;\n}\n.section-card.collapsible.is-collapsed[_ngcontent-%COMP%]   .section-card-body[_ngcontent-%COMP%] {\n  display: none;\n}\n.section-card.collapsible.is-collapsed[_ngcontent-%COMP%]   .section-card-header[_ngcontent-%COMP%]   .section-desc[_ngcontent-%COMP%] {\n  margin-block-end: 0;\n}\n.placeholder-text[_ngcontent-%COMP%] {\n  display: block;\n  padding: 2rem;\n  color: var(--color-text-muted-light);\n  text-align: center;\n  border: 2px dashed var(--border-default);\n  border-radius: var(--radius-md);\n}\n.main-submit-btn[_ngcontent-%COMP%] {\n  display: block;\n  width: var(--rb-submit-width);\n  margin-block: 2rem;\n  margin-inline: auto;\n}\n.add-row-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  width: 100%;\n  margin-block-start: 0.5rem;\n  padding: 0.5rem;\n  background: transparent;\n  border: none;\n  border-block-end: 1px solid var(--border-default);\n  color: var(--color-primary);\n  font-weight: 600;\n  cursor: pointer;\n  transition: background 0.2s ease;\n}\n.add-row-btn[_ngcontent-%COMP%]:hover {\n  background: var(--color-primary-soft);\n}\n.logistics-logic[_ngcontent-%COMP%]   .section-desc[_ngcontent-%COMP%] {\n  display: block;\n  margin-block: -0.5rem 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  align-items: start;\n  gap: var(--rb-gap-mid);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-chips-wrap[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  min-height: 2.5rem;\n  padding: var(--rb-gap-tight);\n  background: var(--bg-muted);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-chips[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.375rem;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-chip-wrap[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.2rem;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-chip[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  flex-wrap: wrap;\n  gap: 0.2rem;\n  padding-inline: 0.5rem;\n  padding-block: 0.35rem;\n  min-height: 2rem;\n  background: var(--bg-glass-strong);\n  color: var(--color-text-secondary);\n  font-size: 0.8125rem;\n  font-weight: 500;\n  border: 1px solid var(--border-strong);\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-chip[_ngcontent-%COMP%]:hover {\n  background: var(--bg-danger-subtle);\n  border-color: var(--color-danger);\n  color: var(--color-danger);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-chip-label[_ngcontent-%COMP%] {\n  width: fit-content;\n  white-space: nowrap;\n  min-width: 0;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-chip-qty[_ngcontent-%COMP%] {\n  font-variant-numeric: tabular-nums;\n  color: var(--color-text-muted);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-add-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-add-inner[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: var(--rb-gap-tight);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-tool-search-wrap[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  flex: 0 1 53.33%;\n  max-width: 53.33%;\n  min-width: 0;\n  padding-inline: var(--rb-gap-mid);\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-tool-search-wrap[_ngcontent-%COMP%]:focus-within {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-search-icon[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  margin-inline-end: 0.35rem;\n  color: var(--color-text-muted);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-tool-search[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  padding: 0;\n  background: none;\n  border: none;\n  outline: none;\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-qty-controls[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-qty-controls[_ngcontent-%COMP%]   .qty-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 2rem;\n  height: 2rem;\n  padding: 0;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  color: var(--color-text-main);\n  cursor: pointer;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-qty-controls[_ngcontent-%COMP%]   .qty-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-primary-soft);\n  border-color: var(--color-primary);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-qty-controls[_ngcontent-%COMP%]   .qty-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-qty-controls[_ngcontent-%COMP%]   .logistics-qty-input[_ngcontent-%COMP%] {\n  width: 3rem;\n  padding-block: 0.4rem;\n  padding-inline: 0.35rem;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  font-variant-numeric: tabular-nums;\n  text-align: center;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-add-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding-inline: var(--rb-gap-mid);\n  padding-block: 0.5rem;\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  font-weight: 600;\n  font-size: 0.875rem;\n  border: none;\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: filter 0.2s ease;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-add-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  filter: brightness(1.08);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-add-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-tool-dropdown[_ngcontent-%COMP%] {\n  position: absolute;\n  inset-inline-start: 0;\n  inset-inline-end: 0;\n  top: 100%;\n  z-index: 50;\n  margin-block-start: 0.25rem;\n  background: var(--bg-pure);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  box-shadow: var(--shadow-card);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-tool-option[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding-inline: var(--rb-gap-mid);\n  padding-block: 0.5rem;\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-tool-option[_ngcontent-%COMP%]:hover, \n.logistics-logic[_ngcontent-%COMP%]   .logistics-tool-option.highlighted[_ngcontent-%COMP%] {\n  background: var(--bg-glass-hover);\n}\n.logistics-logic[_ngcontent-%COMP%]   .logistics-tool-add-new[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n  font-weight: 600;\n}\n@media (max-width: 48rem) {\n  .recipe-builder-container[_ngcontent-%COMP%] {\n    padding-block: 1rem;\n    padding-inline: 0.75rem;\n  }\n  .builder-shell[_ngcontent-%COMP%] {\n    gap: 1.25rem;\n  }\n  .section-card[_ngcontent-%COMP%] {\n    padding: 1rem;\n    border-inline-start-width: 3px;\n    border-radius: var(--radius-md);\n  }\n  .section-title[_ngcontent-%COMP%] {\n    margin-block-end: 1rem;\n    font-size: 1.1rem;\n  }\n  .main-submit-btn[_ngcontent-%COMP%] {\n    width: 100%;\n    max-width: none;\n  }\n  .logistics-logic[_ngcontent-%COMP%]   .logistics-grid[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n}\n@layer components.recipe-builder {\n  .export-actions-wrap[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    flex-wrap: wrap;\n    gap: 0.5rem;\n  }\n  .export-bar[_ngcontent-%COMP%] {\n    position: relative;\n    display: inline-flex;\n    align-items: center;\n  }\n  .export-bar-trigger[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.25rem;\n  }\n  .export-bar-dropdown[_ngcontent-%COMP%] {\n    position: absolute;\n    inset-block-start: 100%;\n    inset-inline-end: 0;\n    display: flex;\n    flex-direction: column;\n    margin-block-start: 0.25rem;\n    padding: 0.5rem;\n    background: var(--bg-pure);\n    color: var(--color-text-main);\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-md);\n    box-shadow: var(--shadow-glass);\n    min-width: 14rem;\n    z-index: 20;\n  }\n  .export-bar-row[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding: 0.25rem 0;\n  }\n  .export-bar-row.export-bar-all[_ngcontent-%COMP%] {\n    border-block-start: 1px solid var(--border-default);\n    margin-block-start: 0.25rem;\n    padding-block-start: 0.5rem;\n  }\n  .export-bar-label[_ngcontent-%COMP%] {\n    flex: 1;\n    font-size: 0.8125rem;\n    color: var(--color-text-main);\n  }\n  .export-bar-row[_ngcontent-%COMP%]   .icon-btn[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    padding: 0.25rem;\n    background: transparent;\n    color: var(--color-text-muted);\n    border: none;\n    border-radius: var(--radius-sm);\n    cursor: pointer;\n    transition: background 0.2s, color 0.2s;\n  }\n  .export-bar-row[_ngcontent-%COMP%]   .icon-btn[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass);\n    color: var(--color-primary);\n  }\n  .btn-export-all[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.25rem;\n  }\n}\n.recipe-builder-container.just-filled[_ngcontent-%COMP%]   .recipe-name-input[_ngcontent-%COMP%], \n.recipe-builder-container.just-filled[_ngcontent-%COMP%]   .section-card[_ngcontent-%COMP%] {\n  animation: _ngcontent-%COMP%_just-filled-fade 1.5s ease forwards;\n}\n@keyframes _ngcontent-%COMP%_just-filled-fade {\n  0% {\n    box-shadow: 0 0 0 2px var(--color-primary, #4CAF50);\n  }\n  100% {\n    box-shadow: none;\n  }\n}\n/*# sourceMappingURL=recipe-builder.page.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RecipeBuilderPage, [{
    type: Component,
    args: [{ selector: "app-recipe-builder-page", standalone: true, imports: [
      CommonModule,
      ReactiveFormsModule,
      RecipeHeaderComponent,
      RecipeIngredientsTableComponent,
      RecipeWorkflowComponent,
      LucideAngularModule,
      TranslatePipe,
      LoaderComponent,
      ScrollableDropdownComponent,
      ClickOutSideDirective,
      ExportPreviewComponent,
      ExportToolbarOverlayComponent,
      ApproveStampComponent,
      CounterComponent
    ], template: `<div class="recipe-builder-container" dir="rtl">
  @if (historyViewMode_()) {
    <div class="history-view-banner">
      <span>{{ 'history_view_only_banner' | translatePipe }}</span>
      <button type="button" class="btn-back" (click)="navigateBackFromHistory()">
        {{ 'back_to_list' | translatePipe }}
      </button>
    </div>
  }

  @if (exportToolbarOpen_()) {
    <app-export-toolbar-overlay (closeRequest)="closeExportToolbar()">
        <div class="view-export-wrap">
          <button type="button" class="toolbar-glass-btn" (click)="openViewExportModal('recipe-info'); $event.stopPropagation()" [attr.aria-label]="'export_recipe_info' | translatePipe" [attr.aria-expanded]="viewExportModal_() === 'recipe-info'">
            <lucide-icon name="table-2" [size]="14"></lucide-icon>
            {{ 'export_recipe_info' | translatePipe }}
          </button>
          @if (viewExportModal_() === 'recipe-info') {
            <div class="view-export-modal" (click)="$event.stopPropagation()" (clickOutside)="closeViewExportModal()">
              <button type="button" class="view-export-option" (click)="onViewRecipeInfo(); closeViewExportModal()">
                <lucide-icon name="eye" [size]="14"></lucide-icon>
                {{ 'view' | translatePipe }}
              </button>
              <button type="button" class="view-export-option" (click)="onExportRecipeInfo(); closeViewExportModal()">
                <lucide-icon name="download" [size]="14"></lucide-icon>
                {{ 'export' | translatePipe }}
              </button>
            </div>
          }
        </div>
        <div class="view-export-wrap">
          <button type="button" class="toolbar-glass-btn" (click)="openViewExportModal('shopping-list'); $event.stopPropagation()" [attr.aria-label]="'export_shopping_list' | translatePipe" [attr.aria-expanded]="viewExportModal_() === 'shopping-list'">
            <lucide-icon name="shopping-cart" [size]="14"></lucide-icon>
            {{ 'export_shopping_list' | translatePipe }}
          </button>
          @if (viewExportModal_() === 'shopping-list') {
            <div class="view-export-modal" (click)="$event.stopPropagation()" (clickOutside)="closeViewExportModal()">
              <button type="button" class="view-export-option" (click)="onViewShoppingList(); closeViewExportModal()">
                <lucide-icon name="eye" [size]="14"></lucide-icon>
                {{ 'view' | translatePipe }}
              </button>
              <button type="button" class="view-export-option" (click)="onExportShoppingList(); closeViewExportModal()">
                <lucide-icon name="download" [size]="14"></lucide-icon>
                {{ 'export' | translatePipe }}
              </button>
            </div>
          }
        </div>
        @if (recipeType_() === 'preparation') {
          <div class="view-export-wrap">
            <button type="button" class="toolbar-glass-btn" (click)="openViewExportModal('cooking-steps'); $event.stopPropagation()" [attr.aria-label]="'export_cooking_steps' | translatePipe" [attr.aria-expanded]="viewExportModal_() === 'cooking-steps'">
              <lucide-icon name="clipboard-list" [size]="14"></lucide-icon>
              {{ 'export_cooking_steps' | translatePipe }}
            </button>
            @if (viewExportModal_() === 'cooking-steps') {
              <div class="view-export-modal" (click)="$event.stopPropagation()" (clickOutside)="closeViewExportModal()">
                <button type="button" class="view-export-option" (click)="onViewCookingSteps(); closeViewExportModal()">
                  <lucide-icon name="eye" [size]="14"></lucide-icon>
                  {{ 'view' | translatePipe }}
                </button>
                <button type="button" class="view-export-option" (click)="onExportCookingSteps(); closeViewExportModal()">
                  <lucide-icon name="download" [size]="14"></lucide-icon>
                  {{ 'export' | translatePipe }}
                </button>
              </div>
            }
          </div>
        }
        @if (recipeType_() === 'dish') {
          <div class="view-export-wrap">
            <button type="button" class="toolbar-glass-btn" (click)="openViewExportModal('dish-checklist'); $event.stopPropagation()" [attr.aria-label]="'export_checklist' | translatePipe" [attr.aria-expanded]="viewExportModal_() === 'dish-checklist'">
              <lucide-icon name="clipboard-list" [size]="14"></lucide-icon>
              {{ 'export_checklist' | translatePipe }}
            </button>
            @if (viewExportModal_() === 'dish-checklist') {
              <div class="view-export-modal" (click)="$event.stopPropagation()" (clickOutside)="closeViewExportModal()">
                <button type="button" class="view-export-option" (click)="onViewDishChecklist(); closeViewExportModal()">
                  <lucide-icon name="eye" [size]="14"></lucide-icon>
                  {{ 'view' | translatePipe }}
                </button>
                <button type="button" class="view-export-option" (click)="onExportDishChecklist(); closeViewExportModal()">
                  <lucide-icon name="download" [size]="14"></lucide-icon>
                  {{ 'export' | translatePipe }}
                </button>
              </div>
            }
          </div>
        }
        <div class="view-export-wrap">
          <button type="button" class="toolbar-glass-btn" (click)="openViewExportModal('all'); $event.stopPropagation()" [attr.aria-label]="'export_all_together' | translatePipe" [attr.aria-expanded]="viewExportModal_() === 'all'">
            <lucide-icon name="package" [size]="14"></lucide-icon>
            {{ 'export_all_together' | translatePipe }}
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
        <button type="button" class="toolbar-glass-btn" (click)="onPrint(); closeExportToolbar()" [attr.aria-label]="'recipe_print' | translatePipe">
          <lucide-icon name="printer" [size]="14"></lucide-icon>
          {{ 'recipe_print' | translatePipe }}
        </button>
    </app-export-toolbar-overlay>
  }

  <div class="builder-shell">

    <section class="builder-section">
      <app-recipe-header [form]="recipeForm_" [recipeType]="recipeType_()" [currentCost]="totalCost_()"
        [totalWeightG]="totalWeightG_()" [totalBrutoWeightG]="totalBrutoWeightG_()"
        [totalVolumeL]="totalVolumeL_()" [totalVolumeMl]="totalVolumeMl_()"
        [unconvertibleForWeight]="unconvertibleForWeight_()" [unconvertibleForVolume]="unconvertibleForVolume_()"
        [resetTrigger]="resetTrigger_()" [autoLabels]="liveAutoLabels_()" (openUnitCreator)="onOpenUnitCreator()"
        [imageUrl]="recipeImageUrl_()" (imageChange)="onImageChange($event)" [readonlyMode]="historyViewMode_()"
        (importTextClick)="onImportTextClick()"></app-recipe-header>
    </section>

    <section class="builder-section">
      <div class="section-card collapsible table-logic" [class.is-collapsed]="tableLogicCollapsed_()"
        (click)="tableLogicCollapsed_() && toggleTableLogic()">
        <div class="section-card-header" (click)="toggleTableLogic(); $event.stopPropagation()" role="button" tabindex="0" (keydown.enter)="toggleTableLogic()" (keydown.space)="toggleTableLogic(); $event.preventDefault()">
          <h2 class="section-title">{{ 'ingredients_index' | translatePipe }}</h2>
          <button type="button" class="section-toggle-btn" tabindex="-1" (click)="toggleTableLogic(); $event.stopPropagation()" [attr.aria-expanded]="!tableLogicCollapsed_()">
            <lucide-icon [name]="tableLogicCollapsed_() ? 'chevron-down' : 'chevron-up'" [size]="20"></lucide-icon>
          </button>
        </div>
        <div class="section-card-body" (click)="$event.stopPropagation()">
          <app-recipe-ingredients-table [ingredientsFormArray]="ingredientsArray"
            [portions]="portions_() ?? 1" [focusSearchAtRow]="focusIngredientSearchAtRow_()"
            (removeIngredient)="removeIngredient($event)" (addIngredient)="addNewIngredientRow()"
            (focusSearchDone)="onIngredientSearchFocusDone()">
          </app-recipe-ingredients-table>

          @if (!historyViewMode_()) {
            <button type="button" class="add-row-btn" (click)="addNewIngredientRow();$event.stopPropagation()">
              <lucide-icon name="plus" [size]="18"></lucide-icon>
              {{ 'add_row' | translatePipe }}
            </button>
          }
        </div>
      </div>
    </section>
    <section class="builder-section">
      <div class="section-card collapsible workflow-logic" [class.is-collapsed]="workflowLogicCollapsed_()"
        (click)="workflowLogicCollapsed_() && toggleWorkflowLogic()">
        <div class="section-card-header" (click)="toggleWorkflowLogic(); $event.stopPropagation()" role="button" tabindex="0" (keydown.enter)="toggleWorkflowLogic()" (keydown.space)="toggleWorkflowLogic(); $event.preventDefault()">
          <h2 class="section-title">
            {{ (recipeType_() === 'dish' ? 'prep_list_mise_en_place' : 'prep_workflow') | translatePipe }}
          </h2>
          <button type="button" class="section-toggle-btn" tabindex="-1" (click)="toggleWorkflowLogic(); $event.stopPropagation()" [attr.aria-expanded]="!workflowLogicCollapsed_()">
            <lucide-icon [name]="workflowLogicCollapsed_() ? 'chevron-down' : 'chevron-up'" [size]="20"></lucide-icon>
          </button>
        </div>
        <div class="section-card-body" (click)="$event.stopPropagation()">
          <app-recipe-workflow [workflowFormArray]="workflowArray" [type]="recipeType_()" [resetTrigger]="resetTrigger_()"
            [focusRowAt]="focusWorkflowRowAt_()" (addItem)="addNewStep($event)"
            (removeItem)="deleteStep($event)" (focusRowDone)="focusWorkflowRowAt_.set(null)">
          </app-recipe-workflow>
        </div>
      </div>
    </section>

    @if (!historyViewMode_()) {
      <section class="builder-section">
        <div class="section-card collapsible logistics-logic" [class.is-collapsed]="logisticsLogicCollapsed_()"
          (click)="logisticsLogicCollapsed_() && toggleLogisticsLogic()">
          <div class="section-card-header" (click)="toggleLogisticsLogic(); $event.stopPropagation()" role="button" tabindex="0" (keydown.enter)="toggleLogisticsLogic()" (keydown.space)="toggleLogisticsLogic(); $event.preventDefault()">
            <h2 class="section-title">{{ 'dish_logistics' | translatePipe }}</h2>
            <button type="button" class="section-toggle-btn" tabindex="-1" (click)="toggleLogisticsLogic(); $event.stopPropagation()" [attr.aria-expanded]="!logisticsLogicCollapsed_()">
              <lucide-icon [name]="logisticsLogicCollapsed_() ? 'chevron-down' : 'chevron-up'" [size]="20"></lucide-icon>
            </button>
          </div>
          <div class="section-card-body" (click)="$event.stopPropagation()">
          <div class="logistics-grid" [formGroup]="recipeForm_" (clickOutside)="logisticsToolDropdownOpen_.set(false)">
            <div class="logistics-add-wrap">
              <div class="logistics-add-inner">
                <div class="logistics-tool-search-wrap">
                  <lucide-icon name="search" class="logistics-search-icon" [size]="18"></lucide-icon>
                  <input type="text" class="logistics-tool-search"
                    [value]="logisticsToolSearchQuery_()"
                    (input)="onLogisticsSearchInput($any($event.target).value)"
                    (keydown)="onLogisticsSearchKeydown($event)"
                    [placeholder]="'search_tool_placeholder' | translatePipe" />
                </div>
                <app-counter
                  [value]="logisticsToolQuantity_()"
                  [min]="1"
                  [stepOptions]="{integerOnly: true}"
                  (valueChange)="logisticsToolQuantity_.set($event)" />
                <button type="button" class="logistics-add-btn"
                  [disabled]="!logisticsSelectedToolId_() && !logisticsToolSearchQuery_().trim()"
                  (click)="onLogisticsAddClick()">
                  {{ 'add' | translatePipe }}
                </button>
              </div>
              @if (logisticsToolDropdownOpen_()) {
                <app-scrollable-dropdown [maxHeight]="220" class="logistics-tool-dropdown">
                  <ul role="listbox">
                    @for (opt of logisticsSearchOptions_(); track opt._id; let i = $index) {
                      <li role="option" class="logistics-tool-option"
                        [class.highlighted]="logisticsHighlightedIndex_() === i"
                        (click)="selectLogisticsOption(opt)">
                        {{ opt.name_hebrew }}
                      </li>
                    }
                    <li role="option" class="logistics-tool-option logistics-tool-add-new"
                      [class.highlighted]="logisticsHighlightedIndex_() === logisticsSearchOptions_().length"
                      (click)="openAddNewToolModal()">
                      <lucide-icon name="plus-circle" [size]="16"></lucide-icon>
                      <span>{{ 'add_new_tool' | translatePipe }}</span>
                    </li>
                  </ul>
                </app-scrollable-dropdown>
              }
            </div>
            <div class="logistics-chips-wrap" formGroupName="logistics">
              <div class="logistics-chips" formArrayName="baseline_">
                @for (ctrl of logisticsBaselineArray.controls; track $index; let i = $index) {
                  @let eqId = ctrl.get('equipment_id_')?.value;
                  @let qty = ctrl.get('quantity_')?.value;
                  <div class="logistics-chip-wrap">
                    <button type="button" class="logistics-chip"
                      (click)="removeBaselineRow(i)" [attr.aria-label]="'remove' | translatePipe">
                      <span class="logistics-chip-label">{{ getEquipmentNameById(eqId) }}</span>
                      <span class="logistics-chip-qty">\xD7{{ qty }}</span>
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>
    }

    @if (!historyViewMode_()) {
      <footer class="action-footer">
        <button class="c-btn-primary main-submit-btn" [disabled]="isSaving_()" (click)="saveRecipe()">
          @if (isSaving_()) {
            <app-loader size="small" [inline]="true" />
          }
          {{ (isSaving_() ? 'saving' : (recipeType_() === 'dish' ? 'save_dish' : 'save_recipe')) | translatePipe }}
        </button>
      </footer>
    }

  </div>

  @if (!historyViewMode_()) {
    <app-approve-stamp
      [approved]="isApproved_()"
      [disabled]="isSaving_()"
      (approve)="onApproveStamp()" />
  }

  @if (exportPreviewPayload_(); as payload) {
    <app-export-preview [payload]="payload"
      (exportClick)="onExportFromPreview()"
      (printClick)="onPrintFromPreview()"
      (close)="onCloseExportPreview()" />
  }
</div>`, styles: ['/* src/app/pages/recipe-builder/recipe-builder.page.scss */\n:host {\n  --rb-gap-tight: 0.5rem;\n  --rb-gap-mid: 0.75rem;\n  --rb-submit-width: 12.5rem;\n  --rb-banner-margin: -3rem -1rem 1rem -1rem;\n}\n.history-view-banner {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  position: relative;\n  gap: 1rem;\n  padding: var(--rb-gap-mid) 1rem;\n  margin: var(--rb-banner-margin);\n  background: var(--bg-warning);\n  color: var(--text-warning);\n  font-weight: 600;\n  border-block-end: 2px solid var(--border-warning);\n}\n.history-view-banner .btn-back {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding-block: 0.4rem;\n  padding-inline: var(--rb-gap-mid);\n  background: var(--bg-pure);\n  color: var(--text-warning);\n  font-size: 0.875rem;\n  border: 1px solid var(--border-warning);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: background 0.2s ease;\n}\n.history-view-banner .btn-back:hover {\n  background: var(--bg-warning);\n}\n.recipe-builder-container {\n  display: block;\n  position: relative;\n  min-height: 100vh;\n  min-height: 100dvh;\n  padding: 2rem 1rem;\n  background: transparent;\n  font-family: "Heebo", sans-serif;\n}\n.recipe-builder-container .builder-shell {\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  max-width: 60rem;\n  margin: 0 auto;\n  gap: 1.5rem;\n}\n.recipe-builder-container .builder-shell .builder-section {\n  position: relative;\n}\n.recipe-builder-container .builder-shell .builder-section .print-btn-wrap {\n  position: absolute;\n  inset-block-start: 0;\n  inset-inline-end: 0;\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  z-index: 20;\n}\n.recipe-builder-container .builder-shell .builder-section:nth-of-type(1) {\n  z-index: 10;\n}\n.recipe-builder-container .builder-shell .builder-section:nth-of-type(2) {\n  z-index: 8;\n}\n.recipe-builder-container .builder-shell .builder-section:nth-of-type(3) {\n  z-index: 6;\n}\n.recipe-builder-container .builder-shell .builder-section:nth-of-type(4) {\n  z-index: 4;\n}\n.section-card {\n  display: block;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border-inline-start: 4px solid var(--color-primary);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.section-title {\n  display: block;\n  margin-block-end: 1rem;\n  color: var(--color-primary);\n  font-size: 1.25rem;\n  font-weight: 700;\n  text-align: center;\n}\n.section-card.collapsible {\n}\n.section-card.collapsible .section-card-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  margin-block-end: 0;\n  padding-block-end: 0;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.section-card.collapsible .section-card-header:hover {\n  background: var(--bg-glass);\n}\n.section-card.collapsible .section-card-header .section-title {\n  text-align: start;\n  flex: 1;\n}\n.section-card.collapsible .section-card-header .section-desc {\n  flex-basis: 100%;\n  margin-block: 0.25rem 0;\n}\n.section-card.collapsible .section-toggle-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.25rem;\n  min-width: 2rem;\n  min-height: 2rem;\n  background: transparent;\n  color: var(--color-primary);\n  border: none;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition:\n    background 0.2s ease,\n    color 0.2s ease,\n    opacity 0.2s ease;\n}\n.section-card.collapsible .section-toggle-btn:hover {\n  background: var(--bg-glass-hover);\n}\n.section-card.collapsible:not(.is-collapsed) .section-toggle-btn {\n  opacity: 0;\n  pointer-events: none;\n}\n.section-card.collapsible:not(.is-collapsed) .section-card-header:hover .section-toggle-btn {\n  opacity: 1;\n  pointer-events: auto;\n}\n.section-card.collapsible .section-card-body {\n  margin-block-start: 1rem;\n}\n.section-card.collapsible.is-collapsed {\n  cursor: pointer;\n}\n.section-card.collapsible.is-collapsed .section-card-body {\n  display: none;\n}\n.section-card.collapsible.is-collapsed .section-card-header .section-desc {\n  margin-block-end: 0;\n}\n.placeholder-text {\n  display: block;\n  padding: 2rem;\n  color: var(--color-text-muted-light);\n  text-align: center;\n  border: 2px dashed var(--border-default);\n  border-radius: var(--radius-md);\n}\n.main-submit-btn {\n  display: block;\n  width: var(--rb-submit-width);\n  margin-block: 2rem;\n  margin-inline: auto;\n}\n.add-row-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  width: 100%;\n  margin-block-start: 0.5rem;\n  padding: 0.5rem;\n  background: transparent;\n  border: none;\n  border-block-end: 1px solid var(--border-default);\n  color: var(--color-primary);\n  font-weight: 600;\n  cursor: pointer;\n  transition: background 0.2s ease;\n}\n.add-row-btn:hover {\n  background: var(--color-primary-soft);\n}\n.logistics-logic .section-desc {\n  display: block;\n  margin-block: -0.5rem 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n.logistics-logic .logistics-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  align-items: start;\n  gap: var(--rb-gap-mid);\n}\n.logistics-logic .logistics-chips-wrap {\n  display: flex;\n  flex-direction: column;\n  min-height: 2.5rem;\n  padding: var(--rb-gap-tight);\n  background: var(--bg-muted);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n}\n.logistics-logic .logistics-chips {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.375rem;\n}\n.logistics-logic .logistics-chip-wrap {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.2rem;\n}\n.logistics-logic .logistics-chip {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  flex-wrap: wrap;\n  gap: 0.2rem;\n  padding-inline: 0.5rem;\n  padding-block: 0.35rem;\n  min-height: 2rem;\n  background: var(--bg-glass-strong);\n  color: var(--color-text-secondary);\n  font-size: 0.8125rem;\n  font-weight: 500;\n  border: 1px solid var(--border-strong);\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.logistics-logic .logistics-chip:hover {\n  background: var(--bg-danger-subtle);\n  border-color: var(--color-danger);\n  color: var(--color-danger);\n}\n.logistics-logic .logistics-chip-label {\n  width: fit-content;\n  white-space: nowrap;\n  min-width: 0;\n}\n.logistics-logic .logistics-chip-qty {\n  font-variant-numeric: tabular-nums;\n  color: var(--color-text-muted);\n}\n.logistics-logic .logistics-add-wrap {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.logistics-logic .logistics-add-inner {\n  display: flex;\n  align-items: center;\n  gap: var(--rb-gap-tight);\n}\n.logistics-logic .logistics-tool-search-wrap {\n  display: flex;\n  align-items: center;\n  flex: 0 1 53.33%;\n  max-width: 53.33%;\n  min-width: 0;\n  padding-inline: var(--rb-gap-mid);\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n}\n.logistics-logic .logistics-tool-search-wrap:focus-within {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.logistics-logic .logistics-search-icon {\n  flex-shrink: 0;\n  margin-inline-end: 0.35rem;\n  color: var(--color-text-muted);\n}\n.logistics-logic .logistics-tool-search {\n  flex: 1;\n  min-width: 0;\n  padding: 0;\n  background: none;\n  border: none;\n  outline: none;\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n}\n.logistics-logic .logistics-qty-controls {\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n}\n.logistics-logic .logistics-qty-controls .qty-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 2rem;\n  height: 2rem;\n  padding: 0;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  color: var(--color-text-main);\n  cursor: pointer;\n}\n.logistics-logic .logistics-qty-controls .qty-btn:hover:not(:disabled) {\n  background: var(--color-primary-soft);\n  border-color: var(--color-primary);\n}\n.logistics-logic .logistics-qty-controls .qty-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.logistics-logic .logistics-qty-controls .logistics-qty-input {\n  width: 3rem;\n  padding-block: 0.4rem;\n  padding-inline: 0.35rem;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  font-variant-numeric: tabular-nums;\n  text-align: center;\n}\n.logistics-logic .logistics-add-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding-inline: var(--rb-gap-mid);\n  padding-block: 0.5rem;\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  font-weight: 600;\n  font-size: 0.875rem;\n  border: none;\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: filter 0.2s ease;\n}\n.logistics-logic .logistics-add-btn:hover:not(:disabled) {\n  filter: brightness(1.08);\n}\n.logistics-logic .logistics-add-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.logistics-logic .logistics-tool-dropdown {\n  position: absolute;\n  inset-inline-start: 0;\n  inset-inline-end: 0;\n  top: 100%;\n  z-index: 50;\n  margin-block-start: 0.25rem;\n  background: var(--bg-pure);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  box-shadow: var(--shadow-card);\n}\n.logistics-logic .logistics-tool-option {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding-inline: var(--rb-gap-mid);\n  padding-block: 0.5rem;\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.logistics-logic .logistics-tool-option:hover,\n.logistics-logic .logistics-tool-option.highlighted {\n  background: var(--bg-glass-hover);\n}\n.logistics-logic .logistics-tool-add-new {\n  color: var(--color-primary);\n  font-weight: 600;\n}\n@media (max-width: 48rem) {\n  .recipe-builder-container {\n    padding-block: 1rem;\n    padding-inline: 0.75rem;\n  }\n  .builder-shell {\n    gap: 1.25rem;\n  }\n  .section-card {\n    padding: 1rem;\n    border-inline-start-width: 3px;\n    border-radius: var(--radius-md);\n  }\n  .section-title {\n    margin-block-end: 1rem;\n    font-size: 1.1rem;\n  }\n  .main-submit-btn {\n    width: 100%;\n    max-width: none;\n  }\n  .logistics-logic .logistics-grid {\n    grid-template-columns: 1fr;\n  }\n}\n@layer components.recipe-builder {\n  .export-actions-wrap {\n    display: flex;\n    align-items: center;\n    flex-wrap: wrap;\n    gap: 0.5rem;\n  }\n  .export-bar {\n    position: relative;\n    display: inline-flex;\n    align-items: center;\n  }\n  .export-bar-trigger {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.25rem;\n  }\n  .export-bar-dropdown {\n    position: absolute;\n    inset-block-start: 100%;\n    inset-inline-end: 0;\n    display: flex;\n    flex-direction: column;\n    margin-block-start: 0.25rem;\n    padding: 0.5rem;\n    background: var(--bg-pure);\n    color: var(--color-text-main);\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-md);\n    box-shadow: var(--shadow-glass);\n    min-width: 14rem;\n    z-index: 20;\n  }\n  .export-bar-row {\n    display: flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding: 0.25rem 0;\n  }\n  .export-bar-row.export-bar-all {\n    border-block-start: 1px solid var(--border-default);\n    margin-block-start: 0.25rem;\n    padding-block-start: 0.5rem;\n  }\n  .export-bar-label {\n    flex: 1;\n    font-size: 0.8125rem;\n    color: var(--color-text-main);\n  }\n  .export-bar-row .icon-btn {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    padding: 0.25rem;\n    background: transparent;\n    color: var(--color-text-muted);\n    border: none;\n    border-radius: var(--radius-sm);\n    cursor: pointer;\n    transition: background 0.2s, color 0.2s;\n  }\n  .export-bar-row .icon-btn:hover {\n    background: var(--bg-glass);\n    color: var(--color-primary);\n  }\n  .btn-export-all {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.25rem;\n  }\n}\n.recipe-builder-container.just-filled .recipe-name-input,\n.recipe-builder-container.just-filled .section-card {\n  animation: just-filled-fade 1.5s ease forwards;\n}\n@keyframes just-filled-fade {\n  0% {\n    box-shadow: 0 0 0 2px var(--color-primary, #4CAF50);\n  }\n  100% {\n    box-shadow: none;\n  }\n}\n/*# sourceMappingURL=recipe-builder.page.css.map */\n'] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(RecipeBuilderPage, { className: "RecipeBuilderPage", filePath: "src/app/pages/recipe-builder/recipe-builder.page.ts", lineNumber: 67 });
})();
export {
  RecipeBuilderPage
};
//# sourceMappingURL=chunk-JRM6XNDK.js.map
