import {
  NG_VALUE_ACCESSOR
} from "./chunk-UNNU6L7T.js";
import {
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-JROUPDH4.js";
import {
  TranslatePipe,
  TranslationService
} from "./chunk-Z6OI3YDQ.js";
import {
  CommonModule,
  Component,
  Directive,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  input,
  output,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdefineDirective,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵloadQuery,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵproperty,
  ɵɵqueryRefresh,
  ɵɵreference,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵresolveDocument,
  ɵɵresolveWindow,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate1,
  ɵɵviewQuery
} from "./chunk-GCYOWW7U.js";

// src/app/core/directives/click-out-side.ts
var ClickOutSideDirective = class _ClickOutSideDirective {
  elementRef = inject(ElementRef);
  clickOutside = output();
  onClick(target) {
    if (!(target instanceof HTMLElement) || !target.isConnected)
      return;
    const isInside = this.elementRef.nativeElement.contains(target);
    if (!isInside) {
      this.clickOutside.emit(target);
    }
  }
  static \u0275fac = function ClickOutSideDirective_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ClickOutSideDirective)();
  };
  static \u0275dir = /* @__PURE__ */ \u0275\u0275defineDirective({ type: _ClickOutSideDirective, selectors: [["", "clickOutside", ""]], hostBindings: function ClickOutSideDirective_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("click", function ClickOutSideDirective_click_HostBindingHandler($event) {
        return ctx.onClick($event.target);
      }, false, \u0275\u0275resolveDocument);
    }
  }, outputs: { clickOutside: "clickOutside" } });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ClickOutSideDirective, [{
    type: Directive,
    args: [{
      selector: "[clickOutside]",
      standalone: true
    }]
  }], null, { onClick: [{
    type: HostListener,
    args: ["document:click", ["$event.target"]]
  }] });
})();

// src/app/core/directives/scroll-indicators.directive.ts
var ScrollIndicatorsDirective = class _ScrollIndicatorsDirective {
  el = inject(ElementRef);
  ngAfterViewInit() {
    requestAnimationFrame(() => this.update());
  }
  onScroll() {
    this.update();
  }
  onResize() {
    this.update();
  }
  update() {
    const host = this.el.nativeElement;
    const threshold = 1;
    const scrollTop = host.scrollTop;
    const clientHeight = host.clientHeight;
    const scrollHeight = host.scrollHeight;
    const canScrollUp = scrollTop > threshold;
    const canScrollDown = scrollTop + clientHeight < scrollHeight - threshold;
    host.classList.toggle("can-scroll-up", canScrollUp);
    host.classList.toggle("can-scroll-down", canScrollDown);
  }
  static \u0275fac = function ScrollIndicatorsDirective_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ScrollIndicatorsDirective)();
  };
  static \u0275dir = /* @__PURE__ */ \u0275\u0275defineDirective({ type: _ScrollIndicatorsDirective, selectors: [["", "scrollIndicators", ""]], hostBindings: function ScrollIndicatorsDirective_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("scroll", function ScrollIndicatorsDirective_scroll_HostBindingHandler() {
        return ctx.onScroll();
      })("resize", function ScrollIndicatorsDirective_resize_HostBindingHandler() {
        return ctx.onResize();
      }, false, \u0275\u0275resolveWindow);
    }
  } });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ScrollIndicatorsDirective, [{
    type: Directive,
    args: [{
      selector: "[scrollIndicators]",
      standalone: true
    }]
  }], null, { onScroll: [{
    type: HostListener,
    args: ["scroll"]
  }], onResize: [{
    type: HostListener,
    args: ["window:resize"]
  }] });
})();

// src/app/shared/scrollable-dropdown/scrollable-dropdown.component.ts
var _c0 = ["*", [["", "slot", "footer"]]];
var _c1 = ["*", "[slot=footer]"];
var ScrollableDropdownComponent = class _ScrollableDropdownComponent {
  /** Max height in px for the scrollable list. Default 240. */
  maxHeight = input(240);
  static \u0275fac = function ScrollableDropdownComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ScrollableDropdownComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ScrollableDropdownComponent, selectors: [["app-scrollable-dropdown"]], inputs: { maxHeight: [1, "maxHeight"] }, ngContentSelectors: _c1, decls: 10, vars: 4, consts: [[1, "c-dropdown"], ["scrollIndicators", "", 1, "c-dropdown__list"], ["aria-hidden", "true", 1, "c-dropdown__scroll-zone", "c-dropdown__scroll-zone--top"], ["aria-hidden", "true", 1, "c-dropdown__scroll-zone", "c-dropdown__scroll-zone--bottom"], ["aria-hidden", "true", 1, "c-dropdown__scroll-top"], ["name", "chevron-up", 3, "size"], ["aria-hidden", "true", 1, "c-dropdown__scroll-bottom"], ["name", "chevron-down", 3, "size"]], template: function ScrollableDropdownComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275projectionDef(_c0);
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1);
      \u0275\u0275projection(2);
      \u0275\u0275elementEnd();
      \u0275\u0275projection(3, 1);
      \u0275\u0275element(4, "div", 2)(5, "div", 3);
      \u0275\u0275elementStart(6, "div", 4);
      \u0275\u0275element(7, "lucide-icon", 5);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "div", 6);
      \u0275\u0275element(9, "lucide-icon", 7);
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275advance();
      \u0275\u0275styleProp("max-height", ctx.maxHeight(), "px");
      \u0275\u0275advance(6);
      \u0275\u0275property("size", 16);
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 16);
    }
  }, dependencies: [LucideAngularModule, LucideAngularComponent, ScrollIndicatorsDirective], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n}\n/*# sourceMappingURL=scrollable-dropdown.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ScrollableDropdownComponent, [{
    type: Component,
    args: [{ selector: "app-scrollable-dropdown", standalone: true, imports: [LucideAngularModule, ScrollIndicatorsDirective], template: '<div class="c-dropdown">\n  <div\n    class="c-dropdown__list"\n    scrollIndicators\n    [style.max-height.px]="maxHeight()">\n    <ng-content></ng-content>\n  </div>\n  <ng-content select="[slot=footer]"></ng-content>\n  <div class="c-dropdown__scroll-zone c-dropdown__scroll-zone--top" aria-hidden="true"></div>\n  <div class="c-dropdown__scroll-zone c-dropdown__scroll-zone--bottom" aria-hidden="true"></div>\n  <div class="c-dropdown__scroll-top" aria-hidden="true">\n    <lucide-icon name="chevron-up" [size]="16"></lucide-icon>\n  </div>\n  <div class="c-dropdown__scroll-bottom" aria-hidden="true">\n    <lucide-icon name="chevron-down" [size]="16"></lucide-icon>\n  </div>\n</div>\n', styles: ["/* src/app/shared/scrollable-dropdown/scrollable-dropdown.component.scss */\n:host {\n  display: block;\n}\n/*# sourceMappingURL=scrollable-dropdown.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ScrollableDropdownComponent, { className: "ScrollableDropdownComponent", filePath: "src/app/shared/scrollable-dropdown/scrollable-dropdown.component.ts", lineNumber: 12 });
})();

// src/app/core/utils/filter-starts-with.util.ts
function filterOptionsByStartsWith(options, query, getDisplayLabel) {
  const raw = query.trim();
  if (!raw)
    return options;
  const qLower = raw.toLowerCase();
  const isHebrew = /[\u0590-\u05FF]/.test(raw);
  const isLatin = /[a-zA-Z]/.test(raw);
  return options.filter((item) => {
    const display = getDisplayLabel(item);
    if (isHebrew)
      return display.startsWith(raw);
    if (isLatin)
      return /[a-zA-Z]/.test(display) && display.toLowerCase().startsWith(qLower);
    return display.toLowerCase().startsWith(qLower);
  });
}

// src/app/core/utils/dedupe-select-options.util.ts
function dedupeAndFilterOptions(options, query, currentValue, translateFn) {
  const baseList = filterOptionsByStartsWith(options, query, (opt) => translateFn(opt.label));
  const deduped = [];
  const seenDisplay = /* @__PURE__ */ new Map();
  for (const opt of baseList) {
    const display = translateFn(opt.label);
    const existingIdx = seenDisplay.get(display);
    if (existingIdx !== void 0) {
      if (opt.value === currentValue)
        deduped[existingIdx] = opt;
    } else {
      seenDisplay.set(display, deduped.length);
      deduped.push(opt);
    }
  }
  return deduped;
}

// src/app/shared/custom-select/custom-select.component.ts
var _c02 = ["triggerRef"];
var _c12 = ["inputRef"];
var _forTrack0 = ($index, $item) => $item.value;
function CustomSelectComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 6);
    \u0275\u0275listener("click", function CustomSelectComponent_Conditional_1_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const inputRef_r2 = \u0275\u0275reference(2);
      return \u0275\u0275resetView(inputRef_r2 == null ? null : inputRef_r2.focus());
    });
    \u0275\u0275elementStart(1, "input", 7, 0);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275listener("input", function CustomSelectComponent_Conditional_1_Template_input_input_1_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onInputInput($event.target.value));
    })("focus", function CustomSelectComponent_Conditional_1_Template_input_focus_1_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.openDropdown());
    })("blur", function CustomSelectComponent_Conditional_1_Template_input_blur_1_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onTriggerBlur());
    })("keydown", function CustomSelectComponent_Conditional_1_Template_input_keydown_1_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onInputKeydown($event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(5, "lucide-icon", 8);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("custom-select-trigger--compact", ctx_r2.compact())("custom-select-trigger--chip", ctx_r2.variant() === "chip")("open", ctx_r2.open());
    \u0275\u0275advance();
    \u0275\u0275property("id", ctx_r2.triggerId())("value", ctx_r2.inputDisplayValue_())("placeholder", \u0275\u0275pipeBind1(3, 13, ctx_r2.placeholder()));
    \u0275\u0275attribute("size", ctx_r2.variant() === "chip" ? ctx_r2.chipInputSize_() : null)("aria-expanded", ctx_r2.open())("aria-label", \u0275\u0275pipeBind1(4, 15, ctx_r2.placeholder()));
    \u0275\u0275advance(4);
    \u0275\u0275property("size", ctx_r2.variant() === "chip" ? 10 : 14);
  }
}
function CustomSelectComponent_Conditional_2_Conditional_3_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "translatePipe");
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(1, 1, ctx_r2.selectedLabel()), " ");
  }
}
function CustomSelectComponent_Conditional_2_Conditional_3_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275textInterpolate1(" ", ctx_r2.selectedLabel(), " ");
  }
}
function CustomSelectComponent_Conditional_2_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, CustomSelectComponent_Conditional_2_Conditional_3_Conditional_0_Template, 2, 3)(1, CustomSelectComponent_Conditional_2_Conditional_3_Conditional_1_Template, 1, 1);
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275conditional(ctx_r2.translateLabels() ? 0 : 1);
  }
}
function CustomSelectComponent_Conditional_2_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "translatePipe");
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(1, 1, ctx_r2.placeholder()), " ");
  }
}
function CustomSelectComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 9, 1);
    \u0275\u0275listener("mousedown", function CustomSelectComponent_Conditional_2_Template_button_mousedown_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onTriggerMousedown());
    })("focus", function CustomSelectComponent_Conditional_2_Template_button_focus_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onTriggerFocus());
    })("click", function CustomSelectComponent_Conditional_2_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onTriggerClick());
    })("blur", function CustomSelectComponent_Conditional_2_Template_button_blur_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onTriggerBlur());
    });
    \u0275\u0275elementStart(2, "span", 10);
    \u0275\u0275template(3, CustomSelectComponent_Conditional_2_Conditional_3_Template, 2, 1)(4, CustomSelectComponent_Conditional_2_Conditional_4_Template, 2, 3);
    \u0275\u0275elementEnd();
    \u0275\u0275element(5, "lucide-icon", 8);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("custom-select-trigger--compact", ctx_r2.compact())("custom-select-trigger--chip", ctx_r2.variant() === "chip")("open", ctx_r2.open());
    \u0275\u0275property("id", ctx_r2.triggerId())("disabled", ctx_r2.disabled);
    \u0275\u0275attribute("aria-expanded", ctx_r2.open())("aria-label", ctx_r2.placeholder());
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r2.selectedLabel() ? 3 : 4);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
  }
}
function CustomSelectComponent_Conditional_3_For_2_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "translatePipe");
  }
  if (rf & 2) {
    const opt_r6 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(1, 1, opt_r6.label), " ");
  }
}
function CustomSelectComponent_Conditional_3_For_2_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const opt_r6 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275textInterpolate1(" ", opt_r6.label, " ");
  }
}
function CustomSelectComponent_Conditional_3_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 13);
    \u0275\u0275listener("click", function CustomSelectComponent_Conditional_3_For_2_Template_button_click_0_listener() {
      const opt_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onOptionClick(opt_r6));
    });
    \u0275\u0275template(1, CustomSelectComponent_Conditional_3_For_2_Conditional_1_Template, 2, 3)(2, CustomSelectComponent_Conditional_3_For_2_Conditional_2_Template, 1, 1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const opt_r6 = ctx.$implicit;
    const \u0275$index_31_r7 = ctx.$index;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("custom-select-option--chip", ctx_r2.variant() === "chip")("highlighted", ctx_r2.highlightedIndex() === \u0275$index_31_r7);
    \u0275\u0275property("id", ctx_r2.triggerId() ? ctx_r2.triggerId() + "-opt-" + \u0275$index_31_r7 : null);
    \u0275\u0275attribute("aria-selected", ctx_r2.value === opt_r6.value);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.translateLabels() ? 1 : 2);
  }
}
function CustomSelectComponent_Conditional_3_Conditional_3_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "translatePipe");
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(1, 1, ctx_r2.addNewOption_().label), " ");
  }
}
function CustomSelectComponent_Conditional_3_Conditional_3_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275textInterpolate1(" ", ctx_r2.addNewOption_().label, " ");
  }
}
function CustomSelectComponent_Conditional_3_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 12)(1, "button", 14);
    \u0275\u0275listener("click", function CustomSelectComponent_Conditional_3_Conditional_3_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onOptionClick(ctx_r2.addNewOption_()));
    });
    \u0275\u0275element(2, "lucide-icon", 15);
    \u0275\u0275template(3, CustomSelectComponent_Conditional_3_Conditional_3_Conditional_3_Template, 2, 3)(4, CustomSelectComponent_Conditional_3_Conditional_3_Conditional_4_Template, 1, 1);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275classProp("custom-select-option--chip", ctx_r2.variant() === "chip")("highlighted", ctx_r2.highlightedIndex() === ctx_r2.visibleOptions_().length);
    \u0275\u0275attribute("aria-selected", ctx_r2.value === ctx_r2.addNewOption_().value);
    \u0275\u0275advance();
    \u0275\u0275property("size", 12);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.translateLabels() ? 3 : 4);
  }
}
function CustomSelectComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "app-scrollable-dropdown", 5);
    \u0275\u0275repeaterCreate(1, CustomSelectComponent_Conditional_3_For_2_Template, 3, 7, "button", 11, _forTrack0);
    \u0275\u0275template(3, CustomSelectComponent_Conditional_3_Conditional_3_Template, 5, 7, "div", 12);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275property("maxHeight", ctx_r2.maxHeight());
    \u0275\u0275attribute("aria-activedescendant", ctx_r2.typeToFilter() && ctx_r2.highlightedIndex() >= 0 ? ctx_r2.triggerId() + "-opt-" + ctx_r2.highlightedIndex() : null);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r2.visibleOptions_());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.addNewOption_() ? 3 : -1);
  }
}
var CustomSelectComponent = class _CustomSelectComponent {
  options = input.required();
  placeholder = input("");
  maxHeight = input(240);
  translateLabels = input(true);
  /** When true, trigger is an input and options are filtered by typing ("starts with" + script). Default false to preserve existing layout. */
  typeToFilter = input(false);
  /** Optional id for the trigger (e.g. for focus management). */
  triggerId = input("");
  /** When true, use compact sizing to match native select in dense forms (e.g. quick-add modal). */
  compact = input(false);
  /** 'chip' = pill trigger (e.g. recipe ingredients unit). Default = bordered trigger. */
  variant = input("default");
  /** Option value treated as "add new" for styling and pinned at end when filtering. Parent handles in valueChange. */
  addNewValue = input("__add_unit__");
  valueChange = output();
  _value = signal("");
  _onChange = () => {
  };
  _onTouched = () => {
  };
  _disabled = signal(false);
  translationService = inject(TranslationService);
  triggerRef;
  inputRef;
  open = signal(false);
  highlightedIndex = signal(-1);
  searchQuery_ = signal("");
  closeTimeout = null;
  /** When true, next trigger focus came from mouse (click); do not auto-open dropdown. */
  _focusFromMouse = false;
  /** When host receives programmatic focus (e.g. from FocusByRowDirective), forward to trigger. */
  onHostFocus() {
    if (this.typeToFilter()) {
      this.inputRef?.nativeElement?.focus();
    } else {
      this.triggerRef?.nativeElement?.focus();
    }
  }
  selectedLabel = computed(() => {
    const v = this._value();
    const opts = this.options();
    const opt = opts.find((o) => o.value === v);
    return opt ? opt.label : "";
  });
  /** Options filtered by search: "starts with" + Hebrew vs Latin by script. Add-new option is always pinned at end. Deduplicated by translated label (prefer current value). */
  filteredOptions_ = computed(() => {
    const raw = this.searchQuery_().trim();
    const opts = this.options();
    const addNewVal = this.addNewValue();
    const addNewOpt = opts.find((o) => o.value === addNewVal);
    const rest = addNewOpt ? opts.filter((o) => o.value !== addNewVal) : opts;
    const currentValue = this._value();
    const deduped = dedupeAndFilterOptions(rest, raw, currentValue, (k) => this.translateLabels() ? this.translationService.translate(k) : k);
    return addNewOpt ? [...deduped, addNewOpt] : deduped;
  });
  /** The add-new option from the full options list, or null if not present. */
  addNewOption_ = computed(() => this.options().find((o) => o.value === this.addNewValue()) ?? null);
  /** Options for the scrollable list — excludes the add-new sentinel (rendered separately as footer). */
  visibleOptions_ = computed(() => {
    const all = this.typeToFilter() ? this.filteredOptions_() : this.options();
    const addNewVal = this.addNewValue();
    return all.filter((o) => o.value !== addNewVal);
  });
  /** Input display value: when open show search query, when closed show selected label (translated if needed). */
  inputDisplayValue_ = computed(() => {
    if (this.open())
      return this.searchQuery_();
    const v = this._value();
    if (!v)
      return "";
    const label = this.selectedLabel();
    return this.translateLabels() ? this.translationService.translate(label) : label;
  });
  /** For chip + typeToFilter: input size attribute so width matches placeholder or value. Min 4 so "בחר" fits. */
  chipInputSize_ = computed(() => {
    if (this.variant() !== "chip" || !this.typeToFilter())
      return null;
    const placeholderText = this.translationService.translate(this.placeholder());
    const displayLen = this.inputDisplayValue_().length;
    const placeholderLen = placeholderText.length;
    return Math.max(4, placeholderLen, displayLen);
  });
  writeValue(value) {
    this._value.set(value ?? "");
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
  toggle() {
    if (this._disabled())
      return;
    this.clearCloseTimeout();
    const next = !this.open();
    this.open.set(next);
    if (next) {
      const idx = this.options().findIndex((o) => o.value === this._value());
      this.highlightedIndex.set(idx >= 0 ? idx : 0);
    }
  }
  close() {
    this.clearCloseTimeout();
    this.open.set(false);
    if (this.typeToFilter())
      this.searchQuery_.set("");
    this._onTouched();
  }
  openDropdown() {
    if (this._disabled())
      return;
    this.clearCloseTimeout();
    this.open.set(true);
    this.searchQuery_.set("");
    const filtered = this.filteredOptions_();
    const currentIdx = this._value() ? filtered.findIndex((o) => o.value === this._value()) : -1;
    this.highlightedIndex.set(currentIdx >= 0 ? currentIdx : filtered.length > 0 ? 0 : -1);
    setTimeout(() => this.inputRef?.nativeElement?.focus(), 0);
  }
  onInputInput(value) {
    this.searchQuery_.set(value ?? "");
    if (!this.open()) {
      this.open.set(true);
      const filtered = this.filteredOptions_();
      this.highlightedIndex.set(filtered.length > 0 ? 0 : -1);
    } else {
      const filtered = this.filteredOptions_();
      this.highlightedIndex.set(filtered.length > 0 ? 0 : -1);
    }
  }
  onInputKeydown(e) {
    if (!this.open()) {
      if (e.key === "Escape")
        return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        this.openDropdown();
      }
      return;
    }
    const opts = this.filteredOptions_();
    let idx = this.highlightedIndex();
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      this.inputRef?.nativeElement?.blur();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx >= 0 && opts[idx])
        this.select(opts[idx].value);
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
  }
  /** Close after a short delay so option click can run first when focus moves on mousedown. */
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
  select(value) {
    this._value.set(value);
    this._onChange(value);
    this.valueChange.emit(value);
    this.close();
  }
  onTriggerMousedown() {
    this._focusFromMouse = true;
  }
  /** Open dropdown when trigger receives focus from Tab or programmatic focus; skip when focus came from click. */
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
  onOptionClick(opt) {
    this.select(opt.value);
  }
  onKeydown(e) {
    if (this.typeToFilter() && e.target?.tagName === "INPUT")
      return;
    if (!this.open()) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        this.toggle();
      }
      return;
    }
    const opts = this.typeToFilter() ? this.filteredOptions_() : this.options();
    let idx = this.highlightedIndex();
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (idx >= 0 && opts[idx])
        this.select(opts[idx].value);
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
  static \u0275fac = function CustomSelectComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _CustomSelectComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _CustomSelectComponent, selectors: [["app-custom-select"]], viewQuery: function CustomSelectComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuery(_c02, 5);
      \u0275\u0275viewQuery(_c12, 5);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.triggerRef = _t.first);
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.inputRef = _t.first);
    }
  }, hostAttrs: ["tabIndex", "-1"], hostBindings: function CustomSelectComponent_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("focus", function CustomSelectComponent_focus_HostBindingHandler() {
        return ctx.onHostFocus();
      })("keydown", function CustomSelectComponent_keydown_HostBindingHandler($event) {
        return ctx.onKeydown($event);
      });
    }
  }, inputs: { options: [1, "options"], placeholder: [1, "placeholder"], maxHeight: [1, "maxHeight"], translateLabels: [1, "translateLabels"], typeToFilter: [1, "typeToFilter"], triggerId: [1, "triggerId"], compact: [1, "compact"], variant: [1, "variant"], addNewValue: [1, "addNewValue"] }, outputs: { valueChange: "valueChange" }, features: [\u0275\u0275ProvidersFeature([
    { provide: NG_VALUE_ACCESSOR, useExisting: _CustomSelectComponent, multi: true }
  ])], decls: 4, vars: 6, consts: [["inputRef", ""], ["triggerRef", ""], [1, "custom-select-wrap", 3, "clickOutside"], [1, "custom-select-trigger", "custom-select-trigger--input", 3, "custom-select-trigger--compact", "custom-select-trigger--chip", "open"], ["type", "button", "aria-haspopup", "listbox", 1, "c-select", "custom-select-trigger", 3, "id", "custom-select-trigger--compact", "custom-select-trigger--chip", "open", "disabled"], [3, "maxHeight"], [1, "custom-select-trigger", "custom-select-trigger--input", 3, "click"], ["type", "text", "aria-haspopup", "listbox", 1, "custom-select-input", "form-input--no-focus-ring", 3, "input", "focus", "blur", "keydown", "id", "value", "placeholder"], ["name", "chevron-down", 3, "size"], ["type", "button", "aria-haspopup", "listbox", 1, "c-select", "custom-select-trigger", 3, "mousedown", "focus", "click", "blur", "id", "disabled"], [1, "custom-select-label"], ["type", "button", "role", "option", 1, "custom-select-option", 3, "custom-select-option--chip", "id", "highlighted"], ["slot", "footer", 1, "custom-select-footer"], ["type", "button", "role", "option", 1, "custom-select-option", 3, "click", "id"], ["type", "button", "role", "option", 1, "custom-select-option", "custom-select-option--add-new", 3, "click"], ["name", "plus", 3, "size"]], template: function CustomSelectComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 2);
      \u0275\u0275listener("clickOutside", function CustomSelectComponent_Template_div_clickOutside_0_listener() {
        return ctx.close();
      });
      \u0275\u0275template(1, CustomSelectComponent_Conditional_1_Template, 6, 17, "div", 3)(2, CustomSelectComponent_Conditional_2_Template, 6, 12, "button", 4)(3, CustomSelectComponent_Conditional_3_Template, 4, 3, "app-scrollable-dropdown", 5);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275classProp("open", ctx.open())("custom-select-wrap--chip", ctx.variant() === "chip");
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.typeToFilter() ? 1 : 2);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.open() ? 3 : -1);
    }
  }, dependencies: [
    CommonModule,
    TranslatePipe,
    ClickOutSideDirective,
    ScrollableDropdownComponent,
    LucideAngularModule,
    LucideAngularComponent
  ], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n}\n.custom-select-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  width: 100%;\n}\n.custom-select-wrap.open[_ngcontent-%COMP%] {\n  z-index: 9999;\n}\n.custom-select-wrap.custom-select-wrap--chip[_ngcontent-%COMP%] {\n  width: fit-content;\n  min-width: 0;\n}\n.custom-select-trigger[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.5rem;\n  width: 100%;\n  min-height: 2.25rem;\n  padding-inline: 0.75rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  text-align: start;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.custom-select-trigger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  border-color: var(--border-strong);\n}\n.custom-select-trigger[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.custom-select-trigger[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.custom-select-trigger.custom-select-trigger--compact[_ngcontent-%COMP%] {\n  min-height: 1.75rem;\n  padding-inline: 0.375rem;\n  padding-block: 0.25rem;\n  font-size: 0.8125rem;\n  border-radius: var(--radius-sm);\n}\n.custom-select-trigger.custom-select-trigger--chip[_ngcontent-%COMP%] {\n  min-height: auto;\n  padding-inline: 0.5rem;\n  padding-block: 0.25rem;\n  border-radius: 9999px;\n  font-size: 0.8125rem;\n}\n.custom-select-trigger--input[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n}\n.custom-select-trigger--input[_ngcontent-%COMP%]:focus-within {\n  cursor: text;\n}\n.custom-select-trigger--input[_ngcontent-%COMP%]   .custom-select-input[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  border: none;\n  border-radius: inherit;\n  background: transparent;\n  font: inherit;\n  color: inherit;\n  outline: none;\n  padding: 0;\n}\n.custom-select-trigger--input.custom-select-trigger--chip[_ngcontent-%COMP%]   .custom-select-input[_ngcontent-%COMP%] {\n  flex: 0 0 auto;\n  min-width: 4ch;\n}\n.custom-select-trigger--input[_ngcontent-%COMP%]   lucide-icon[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  pointer-events: none;\n}\n.custom-select-label[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.custom-select-option[_ngcontent-%COMP%] {\n  display: block;\n  width: 100%;\n  padding-block: 0.5rem;\n  padding-inline: 0.75rem;\n  background: none;\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  text-align: start;\n  border: none;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.custom-select-option[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass);\n}\n.custom-select-option.highlighted[_ngcontent-%COMP%] {\n  background: var(--color-primary-soft);\n}\n.custom-select-option.custom-select-option--chip[_ngcontent-%COMP%] {\n  padding-block: 0.375rem;\n  padding-inline: 0.5rem;\n  font-size: 0.8125rem;\n}\n.custom-select-footer[_ngcontent-%COMP%] {\n  border-top: 1px solid var(--border-default);\n  pointer-events: auto;\n}\n.custom-select-footer[_ngcontent-%COMP%]   .custom-select-option--add-new[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.375rem;\n  width: 100%;\n  color: var(--color-primary);\n  font-weight: 600;\n  background: var(--color-primary-soft);\n}\n.custom-select-footer[_ngcontent-%COMP%]   .custom-select-option--add-new[_ngcontent-%COMP%]   lucide-icon[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n}\n.custom-select-footer[_ngcontent-%COMP%]   .custom-select-option--add-new[_ngcontent-%COMP%]:hover, \n.custom-select-footer[_ngcontent-%COMP%]   .custom-select-option--add-new.highlighted[_ngcontent-%COMP%] {\n  color: var(--color-primary-hover);\n  background: var(--color-primary-glow);\n}\n/*# sourceMappingURL=custom-select.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CustomSelectComponent, [{
    type: Component,
    args: [{ selector: "app-custom-select", standalone: true, host: { tabIndex: "-1" }, imports: [
      CommonModule,
      TranslatePipe,
      ClickOutSideDirective,
      ScrollableDropdownComponent,
      LucideAngularModule
    ], providers: [
      { provide: NG_VALUE_ACCESSOR, useExisting: CustomSelectComponent, multi: true }
    ], template: `<div class="custom-select-wrap" [class.open]="open()" [class.custom-select-wrap--chip]="variant() === 'chip'" (clickOutside)="close()">
  @if (typeToFilter()) {
    <div class="custom-select-trigger custom-select-trigger--input"
      [class.custom-select-trigger--compact]="compact()"
      [class.custom-select-trigger--chip]="variant() === 'chip'"
      [class.open]="open()"
      (click)="inputRef?.focus()">
      <input #inputRef
        type="text"
        [id]="triggerId()"
        class="custom-select-input form-input--no-focus-ring"
        [value]="inputDisplayValue_()"
        [attr.size]="variant() === 'chip' ? chipInputSize_() : null"
        (input)="onInputInput($any($event.target).value)"
        (focus)="openDropdown()"
        (blur)="onTriggerBlur()"
        (keydown)="onInputKeydown($event)"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        [attr.aria-label]="placeholder() | translatePipe"
        [placeholder]="placeholder() | translatePipe" />
      <lucide-icon name="chevron-down" [size]="variant() === 'chip' ? 10 : 14"></lucide-icon>
    </div>
  } @else {
    <button
      #triggerRef
      type="button"
      [id]="triggerId()"
      class="c-select custom-select-trigger"
      [class.custom-select-trigger--compact]="compact()"
      [class.custom-select-trigger--chip]="variant() === 'chip'"
      [class.open]="open()"
      [disabled]="disabled"
      (mousedown)="onTriggerMousedown()"
      (focus)="onTriggerFocus()"
      (click)="onTriggerClick()"
      (blur)="onTriggerBlur()"
      [attr.aria-expanded]="open()"
      aria-haspopup="listbox"
      [attr.aria-label]="placeholder()">
      <span class="custom-select-label">
        @if (selectedLabel()) {
          @if (translateLabels()) {
            {{ selectedLabel() | translatePipe }}
          } @else {
            {{ selectedLabel() }}
          }
        } @else {
          {{ placeholder() | translatePipe }}
        }
      </span>
      <lucide-icon name="chevron-down" [size]="14"></lucide-icon>
    </button>
  }

  @if (open()) {
    <app-scrollable-dropdown [maxHeight]="maxHeight()" [attr.aria-activedescendant]="typeToFilter() && highlightedIndex() >= 0 ? triggerId() + '-opt-' + highlightedIndex() : null">
      @for (opt of visibleOptions_(); track opt.value; let i = $index) {
        <button
          type="button"
          class="custom-select-option"
          [class.custom-select-option--chip]="variant() === 'chip'"
          [id]="triggerId() ? triggerId() + '-opt-' + i : null"
          [class.highlighted]="highlightedIndex() === i"
          role="option"
          [attr.aria-selected]="value === opt.value"
          (click)="onOptionClick(opt)">
          @if (translateLabels()) {
            {{ opt.label | translatePipe }}
          } @else {
            {{ opt.label }}
          }
        </button>
      }
      @if (addNewOption_()) {
        <div slot="footer" class="custom-select-footer">
          <button
            type="button"
            class="custom-select-option custom-select-option--add-new"
            [class.custom-select-option--chip]="variant() === 'chip'"
            [class.highlighted]="highlightedIndex() === visibleOptions_().length"
            role="option"
            [attr.aria-selected]="value === addNewOption_()!.value"
            (click)="onOptionClick(addNewOption_()!)">
            <lucide-icon name="plus" [size]="12"></lucide-icon>
            @if (translateLabels()) {
              {{ addNewOption_()!.label | translatePipe }}
            } @else {
              {{ addNewOption_()!.label }}
            }
          </button>
        </div>
      }
    </app-scrollable-dropdown>
  }
</div>
`, styles: ["/* src/app/shared/custom-select/custom-select.component.scss */\n:host {\n  display: block;\n}\n.custom-select-wrap {\n  position: relative;\n  width: 100%;\n}\n.custom-select-wrap.open {\n  z-index: 9999;\n}\n.custom-select-wrap.custom-select-wrap--chip {\n  width: fit-content;\n  min-width: 0;\n}\n.custom-select-trigger {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.5rem;\n  width: 100%;\n  min-height: 2.25rem;\n  padding-inline: 0.75rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  text-align: start;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.custom-select-trigger:hover:not(:disabled) {\n  border-color: var(--border-strong);\n}\n.custom-select-trigger:focus {\n  outline: none;\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.custom-select-trigger:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.custom-select-trigger.custom-select-trigger--compact {\n  min-height: 1.75rem;\n  padding-inline: 0.375rem;\n  padding-block: 0.25rem;\n  font-size: 0.8125rem;\n  border-radius: var(--radius-sm);\n}\n.custom-select-trigger.custom-select-trigger--chip {\n  min-height: auto;\n  padding-inline: 0.5rem;\n  padding-block: 0.25rem;\n  border-radius: 9999px;\n  font-size: 0.8125rem;\n}\n.custom-select-trigger--input {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n}\n.custom-select-trigger--input:focus-within {\n  cursor: text;\n}\n.custom-select-trigger--input .custom-select-input {\n  flex: 1;\n  min-width: 0;\n  border: none;\n  border-radius: inherit;\n  background: transparent;\n  font: inherit;\n  color: inherit;\n  outline: none;\n  padding: 0;\n}\n.custom-select-trigger--input.custom-select-trigger--chip .custom-select-input {\n  flex: 0 0 auto;\n  min-width: 4ch;\n}\n.custom-select-trigger--input lucide-icon {\n  flex-shrink: 0;\n  pointer-events: none;\n}\n.custom-select-label {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.custom-select-option {\n  display: block;\n  width: 100%;\n  padding-block: 0.5rem;\n  padding-inline: 0.75rem;\n  background: none;\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  text-align: start;\n  border: none;\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n.custom-select-option:hover {\n  background: var(--bg-glass);\n}\n.custom-select-option.highlighted {\n  background: var(--color-primary-soft);\n}\n.custom-select-option.custom-select-option--chip {\n  padding-block: 0.375rem;\n  padding-inline: 0.5rem;\n  font-size: 0.8125rem;\n}\n.custom-select-footer {\n  border-top: 1px solid var(--border-default);\n  pointer-events: auto;\n}\n.custom-select-footer .custom-select-option--add-new {\n  display: flex;\n  align-items: center;\n  gap: 0.375rem;\n  width: 100%;\n  color: var(--color-primary);\n  font-weight: 600;\n  background: var(--color-primary-soft);\n}\n.custom-select-footer .custom-select-option--add-new lucide-icon {\n  flex-shrink: 0;\n}\n.custom-select-footer .custom-select-option--add-new:hover,\n.custom-select-footer .custom-select-option--add-new.highlighted {\n  color: var(--color-primary-hover);\n  background: var(--color-primary-glow);\n}\n/*# sourceMappingURL=custom-select.component.css.map */\n"] }]
  }], null, { triggerRef: [{
    type: ViewChild,
    args: ["triggerRef"]
  }], inputRef: [{
    type: ViewChild,
    args: ["inputRef"]
  }], onHostFocus: [{
    type: HostListener,
    args: ["focus"]
  }], onKeydown: [{
    type: HostListener,
    args: ["keydown", ["$event"]]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(CustomSelectComponent, { className: "CustomSelectComponent", filePath: "src/app/shared/custom-select/custom-select.component.ts", lineNumber: 38 });
})();

export {
  ClickOutSideDirective,
  ScrollIndicatorsDirective,
  ScrollableDropdownComponent,
  filterOptionsByStartsWith,
  CustomSelectComponent
};
//# sourceMappingURL=chunk-KKA4TBVQ.js.map
