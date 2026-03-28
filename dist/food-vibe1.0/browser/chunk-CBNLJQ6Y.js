import {
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-XDVMM5TS.js";
import {
  TranslatePipe
} from "./chunk-CH6HZ4GZ.js";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
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
  ɵɵproperty,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-FJPSXAXA.js";

// src/app/shared/empty-state/empty-state.component.ts
function EmptyStateComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "lucide-icon", 1);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275property("name", ctx_r0.icon())("size", 48);
  }
}
function EmptyStateComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 4);
    \u0275\u0275listener("click", function EmptyStateComponent_Conditional_5_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.ctaClick.emit());
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275property("disabled", ctx_r0.ctaDisabled());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 2, ctx_r0.ctaLabelKey()), " ");
  }
}
var EmptyStateComponent = class _EmptyStateComponent {
  messageKey = input.required();
  icon = input(null);
  ctaLabelKey = input(null);
  ctaDisabled = input(false);
  ctaClick = output();
  static \u0275fac = function EmptyStateComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _EmptyStateComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _EmptyStateComponent, selectors: [["app-empty-state"]], inputs: { messageKey: [1, "messageKey"], icon: [1, "icon"], ctaLabelKey: [1, "ctaLabelKey"], ctaDisabled: [1, "ctaDisabled"] }, outputs: { ctaClick: "ctaClick" }, decls: 6, vars: 5, consts: [[1, "c-empty-state"], [1, "c-empty-state__icon", 3, "name", "size"], [1, "c-empty-state__msg"], ["type", "button", 1, "c-btn-primary", 3, "disabled"], ["type", "button", 1, "c-btn-primary", 3, "click", "disabled"]], template: function EmptyStateComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0);
      \u0275\u0275template(1, EmptyStateComponent_Conditional_1_Template, 1, 2, "lucide-icon", 1);
      \u0275\u0275elementStart(2, "p", 2);
      \u0275\u0275text(3);
      \u0275\u0275pipe(4, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275template(5, EmptyStateComponent_Conditional_5_Template, 3, 4, "button", 3);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.icon() ? 1 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 3, ctx.messageKey()));
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.ctaLabelKey() ? 5 : -1);
    }
  }, dependencies: [LucideAngularModule, LucideAngularComponent, TranslatePipe], encapsulation: 2, changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(EmptyStateComponent, [{
    type: Component,
    args: [{ selector: "app-empty-state", standalone: true, imports: [LucideAngularModule, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: '<div class="c-empty-state">\r\n  @if (icon()) {\r\n    <lucide-icon [name]="icon()!" [size]="48" class="c-empty-state__icon" />\r\n  }\r\n  <p class="c-empty-state__msg">{{ messageKey() | translatePipe }}</p>\r\n  @if (ctaLabelKey()) {\r\n    <button type="button" class="c-btn-primary" [disabled]="ctaDisabled()" (click)="ctaClick.emit()">\r\n      {{ ctaLabelKey()! | translatePipe }}\r\n    </button>\r\n  }\r\n</div>\r\n' }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(EmptyStateComponent, { className: "EmptyStateComponent", filePath: "src/app/shared/empty-state/empty-state.component.ts", lineNumber: 12 });
})();

export {
  EmptyStateComponent
};
//# sourceMappingURL=chunk-CBNLJQ6Y.js.map
