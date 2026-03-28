import {
  Directive,
  ElementRef,
  HostListener,
  setClassMetadata,
  ɵɵdefineDirective,
  ɵɵdirectiveInject,
  ɵɵlistener
} from "./chunk-GCYOWW7U.js";

// src/app/core/directives/select-on-focus.directive.ts
var SelectOnFocusDirective = class _SelectOnFocusDirective {
  el;
  constructor(el) {
    this.el = el;
  }
  onFocus() {
    this.el.nativeElement.select();
  }
  static \u0275fac = function SelectOnFocusDirective_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SelectOnFocusDirective)(\u0275\u0275directiveInject(ElementRef));
  };
  static \u0275dir = /* @__PURE__ */ \u0275\u0275defineDirective({ type: _SelectOnFocusDirective, selectors: [["", "SelectOnFocus", ""]], hostBindings: function SelectOnFocusDirective_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("focus", function SelectOnFocusDirective_focus_HostBindingHandler() {
        return ctx.onFocus();
      });
    }
  } });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SelectOnFocusDirective, [{
    type: Directive,
    args: [{
      selector: "[SelectOnFocus]",
      standalone: true
    }]
  }], () => [{ type: ElementRef }], { onFocus: [{
    type: HostListener,
    args: ["focus"]
  }] });
})();

export {
  SelectOnFocusDirective
};
//# sourceMappingURL=chunk-W2XHIWHI.js.map
