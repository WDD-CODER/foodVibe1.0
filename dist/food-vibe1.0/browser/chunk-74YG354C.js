import {
  TrashPage
} from "./chunk-4PQULVAL.js";
import "./chunk-CLR4M7FF.js";
import {
  MenuSectionCategoriesService
} from "./chunk-UGAMZUG4.js";
import {
  MenuEventDataService
} from "./chunk-NSXDTEAV.js";
import {
  PreparationRegistryService
} from "./chunk-QEXSSWBW.js";
import {
  LabelCreationModalService
} from "./chunk-OUBA3W4T.js";
import "./chunk-2YXZYHHY.js";
import {
  ALL_DISH_FIELDS,
  DEFAULT_DISH_FIELDS,
  MetadataRegistryService
} from "./chunk-RXL6AQUB.js";
import {
  SYSTEM_UNITS,
  UnitRegistryService
} from "./chunk-UA66Z5WI.js";
import {
  AddItemModalService
} from "./chunk-V6TDRV34.js";
import {
  ConfirmModalService
} from "./chunk-QWCHAH6M.js";
import {
  TranslationKeyModalService,
  isTranslationKeyResult
} from "./chunk-7STEE3M4.js";
import {
  VenueListComponent
} from "./chunk-SQR3LQTP.js";
import "./chunk-WQAH7QWB.js";
import "./chunk-TM2E3L5G.js";
import "./chunk-6DTZ43TT.js";
import {
  VenueFormComponent
} from "./chunk-LOCHCQF6.js";
import "./chunk-6FJWTD4F.js";
import "./chunk-I64HYR5B.js";
import {
  EquipmentDataService
} from "./chunk-EYK2NP5M.js";
import {
  VenueDataService
} from "./chunk-UJ4TV5QR.js";
import "./chunk-D637KIHB.js";
import {
  AuthModalService
} from "./chunk-WWCQSEYJ.js";
import {
  ClickOutSideDirective,
  ScrollIndicatorsDirective
} from "./chunk-MG3FUR2W.js";
import {
  FormsModule
} from "./chunk-CA2J44DF.js";
import {
  LoaderComponent
} from "./chunk-G7HPFFIH.js";
import {
  toSignal
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
import {
  SupplierDataService
} from "./chunk-ZDTM2BLR.js";
import {
  DishDataService,
  ProductDataService,
  RecipeDataService
} from "./chunk-V3KHFSXP.js";
import {
  UserService
} from "./chunk-NQ7PICSF.js";
import "./chunk-AB3R4JQV.js";
import {
  ActivityLogService,
  BACKUP_ENTITY_TYPES,
  StorageService,
  UserMsgService
} from "./chunk-Z3W6FQFP.js";
import {
  LoggingService
} from "./chunk-ZMFT5D5F.js";
import {
  ActivatedRoute,
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  HttpClient,
  Injectable,
  NgTemplateOutlet,
  Router,
  __async,
  __spreadProps,
  __spreadValues,
  catchError,
  computed,
  firstValueFrom,
  inject,
  input,
  of,
  output,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelement,
  ɵɵelementContainer,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵproperty,
  ɵɵpureFunction0,
  ɵɵpureFunction1,
  ɵɵreference,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate3
} from "./chunk-FJPSXAXA.js";

// src/app/shared/floating-info-container/floating-info-container.component.ts
var _c0 = ["*", "*"];
function FloatingInfoContainerComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 1)(1, "div", 3);
    \u0275\u0275projection(2);
    \u0275\u0275elementEnd();
    \u0275\u0275element(3, "div", 4)(4, "div", 5);
    \u0275\u0275elementStart(5, "div", 6);
    \u0275\u0275element(6, "lucide-icon", 7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 8);
    \u0275\u0275element(8, "lucide-icon", 9);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275styleProp("max-height", ctx_r0.maxHeight(), "px")("min-height", ctx_r0.maxHeight(), "px");
    \u0275\u0275advance(5);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
  }
}
function FloatingInfoContainerComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 2);
    \u0275\u0275projection(1, 1);
    \u0275\u0275elementEnd();
  }
}
var FloatingInfoContainerComponent = class _FloatingInfoContainerComponent {
  /** 'vertical' = scrollable area with arrow indicators; 'none' = no scroll wrapper. */
  scrollAxis = input("vertical");
  /** Max height (px) for the scrollable area when scrollAxis is 'vertical'. */
  maxHeight = input(240);
  static \u0275fac = function FloatingInfoContainerComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _FloatingInfoContainerComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _FloatingInfoContainerComponent, selectors: [["app-floating-info-container"]], inputs: { scrollAxis: [1, "scrollAxis"], maxHeight: [1, "maxHeight"] }, ngContentSelectors: _c0, decls: 3, vars: 3, consts: [[1, "floating-info-card"], [1, "floating-info-scroll-wrap"], [1, "floating-info-content"], ["scrollIndicators", "", 1, "floating-info-scroll"], ["aria-hidden", "true", 1, "floating-info-scroll-zone", "floating-info-scroll-zone--top"], ["aria-hidden", "true", 1, "floating-info-scroll-zone", "floating-info-scroll-zone--bottom"], ["aria-hidden", "true", 1, "floating-info-scroll-indicator", "floating-info-scroll-indicator--top"], ["name", "chevron-up", 3, "size"], ["aria-hidden", "true", 1, "floating-info-scroll-indicator", "floating-info-scroll-indicator--bottom"], ["name", "chevron-down", 3, "size"]], template: function FloatingInfoContainerComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275projectionDef(_c0);
      \u0275\u0275elementStart(0, "div", 0);
      \u0275\u0275template(1, FloatingInfoContainerComponent_Conditional_1_Template, 9, 6, "div", 1)(2, FloatingInfoContainerComponent_Conditional_2_Template, 2, 0, "div", 2);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275classProp("floating-info-card--scroll-vertical", ctx.scrollAxis() === "vertical");
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.scrollAxis() === "vertical" ? 1 : 2);
    }
  }, dependencies: [LucideAngularModule, LucideAngularComponent, ScrollIndicatorsDirective], styles: ["\n\n@layer components.floating-info-container {\n  [_nghost-%COMP%] {\n    display: block;\n  }\n  .floating-info-card[_ngcontent-%COMP%] {\n    display: flex;\n    flex-direction: column;\n    min-width: 7.5rem;\n    padding: 0.5rem 0.75rem;\n    background: var(--bg-glass-strong);\n    color: var(--color-text-main);\n    font-size: 0.8rem;\n    border: 1px solid var(--border-glass);\n    border-radius: var(--radius-md);\n    box-shadow: var(--shadow-card);\n    overflow: hidden;\n    backdrop-filter: var(--blur-glass);\n    -webkit-backdrop-filter: var(--blur-glass);\n  }\n  .floating-info-card--scroll-vertical[_ngcontent-%COMP%]   .floating-info-scroll-wrap[_ngcontent-%COMP%] {\n    position: relative;\n    flex: 1;\n    min-height: 0;\n    overflow: hidden;\n  }\n  .floating-info-scroll[_ngcontent-%COMP%] {\n    overflow-y: auto;\n    scrollbar-width: none;\n    -ms-overflow-style: none;\n  }\n  .floating-info-scroll[_ngcontent-%COMP%]::-webkit-scrollbar {\n    display: none;\n  }\n  .floating-info-scroll-zone--top[_ngcontent-%COMP%] {\n    position: absolute;\n    top: 0;\n    inset-inline: 0;\n    z-index: 2;\n    height: 2rem;\n    pointer-events: none;\n  }\n  .floating-info-scroll-zone--bottom[_ngcontent-%COMP%] {\n    position: absolute;\n    bottom: 0;\n    inset-inline: 0;\n    z-index: 2;\n    height: 2rem;\n    pointer-events: none;\n  }\n  .floating-info-scroll-indicator--top[_ngcontent-%COMP%], \n   .floating-info-scroll-indicator--bottom[_ngcontent-%COMP%] {\n    position: absolute;\n    inset-inline: 0;\n    z-index: 1;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    padding-block: 0.2rem;\n    min-height: 1.25rem;\n    background:\n      linear-gradient(\n        to bottom,\n        var(--bg-glass-strong) 0%,\n        transparent 100%);\n    color: var(--color-text-muted);\n    opacity: 0;\n    pointer-events: none;\n    transition: opacity 0.2s var(--ease-smooth);\n  }\n  .floating-info-scroll-indicator--top[_ngcontent-%COMP%] {\n    top: 0;\n    bottom: auto;\n  }\n  .floating-info-scroll-indicator--bottom[_ngcontent-%COMP%] {\n    top: auto;\n    bottom: 0;\n    background:\n      linear-gradient(\n        to top,\n        var(--bg-glass-strong) 0%,\n        transparent 100%);\n  }\n  .floating-info-scroll-wrap[_ngcontent-%COMP%]:has(.floating-info-scroll.can-scroll-up)   .floating-info-scroll-indicator--top[_ngcontent-%COMP%] {\n    opacity: 0.8;\n  }\n  .floating-info-scroll-wrap[_ngcontent-%COMP%]:has(.floating-info-scroll.can-scroll-down)   .floating-info-scroll-indicator--bottom[_ngcontent-%COMP%] {\n    opacity: 0.8;\n  }\n  .floating-info-content[_ngcontent-%COMP%] {\n    display: block;\n  }\n}\n/*# sourceMappingURL=floating-info-container.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(FloatingInfoContainerComponent, [{
    type: Component,
    args: [{ selector: "app-floating-info-container", standalone: true, imports: [LucideAngularModule, ScrollIndicatorsDirective], template: `<div class="floating-info-card" [class.floating-info-card--scroll-vertical]="scrollAxis() === 'vertical'">\r
  @if (scrollAxis() === 'vertical') {\r
    <div class="floating-info-scroll-wrap">\r
      <div\r
        class="floating-info-scroll"\r
        scrollIndicators\r
        [style.max-height.px]="maxHeight()"\r
        [style.min-height.px]="maxHeight()"\r
      >\r
        <ng-content></ng-content>\r
      </div>\r
      <div class="floating-info-scroll-zone floating-info-scroll-zone--top" aria-hidden="true"></div>\r
      <div class="floating-info-scroll-zone floating-info-scroll-zone--bottom" aria-hidden="true"></div>\r
      <div class="floating-info-scroll-indicator floating-info-scroll-indicator--top" aria-hidden="true">\r
        <lucide-icon name="chevron-up" [size]="16"></lucide-icon>\r
      </div>\r
      <div class="floating-info-scroll-indicator floating-info-scroll-indicator--bottom" aria-hidden="true">\r
        <lucide-icon name="chevron-down" [size]="16"></lucide-icon>\r
      </div>\r
    </div>\r
  } @else {\r
    <div class="floating-info-content">\r
      <ng-content></ng-content>\r
    </div>\r
  }\r
</div>\r
`, styles: ["/* src/app/shared/floating-info-container/floating-info-container.component.scss */\n@layer components.floating-info-container {\n  :host {\n    display: block;\n  }\n  .floating-info-card {\n    display: flex;\n    flex-direction: column;\n    min-width: 7.5rem;\n    padding: 0.5rem 0.75rem;\n    background: var(--bg-glass-strong);\n    color: var(--color-text-main);\n    font-size: 0.8rem;\n    border: 1px solid var(--border-glass);\n    border-radius: var(--radius-md);\n    box-shadow: var(--shadow-card);\n    overflow: hidden;\n    backdrop-filter: var(--blur-glass);\n    -webkit-backdrop-filter: var(--blur-glass);\n  }\n  .floating-info-card--scroll-vertical .floating-info-scroll-wrap {\n    position: relative;\n    flex: 1;\n    min-height: 0;\n    overflow: hidden;\n  }\n  .floating-info-scroll {\n    overflow-y: auto;\n    scrollbar-width: none;\n    -ms-overflow-style: none;\n  }\n  .floating-info-scroll::-webkit-scrollbar {\n    display: none;\n  }\n  .floating-info-scroll-zone--top {\n    position: absolute;\n    top: 0;\n    inset-inline: 0;\n    z-index: 2;\n    height: 2rem;\n    pointer-events: none;\n  }\n  .floating-info-scroll-zone--bottom {\n    position: absolute;\n    bottom: 0;\n    inset-inline: 0;\n    z-index: 2;\n    height: 2rem;\n    pointer-events: none;\n  }\n  .floating-info-scroll-indicator--top,\n  .floating-info-scroll-indicator--bottom {\n    position: absolute;\n    inset-inline: 0;\n    z-index: 1;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    padding-block: 0.2rem;\n    min-height: 1.25rem;\n    background:\n      linear-gradient(\n        to bottom,\n        var(--bg-glass-strong) 0%,\n        transparent 100%);\n    color: var(--color-text-muted);\n    opacity: 0;\n    pointer-events: none;\n    transition: opacity 0.2s var(--ease-smooth);\n  }\n  .floating-info-scroll-indicator--top {\n    top: 0;\n    bottom: auto;\n  }\n  .floating-info-scroll-indicator--bottom {\n    top: auto;\n    bottom: 0;\n    background:\n      linear-gradient(\n        to top,\n        var(--bg-glass-strong) 0%,\n        transparent 100%);\n  }\n  .floating-info-scroll-wrap:has(.floating-info-scroll.can-scroll-up) .floating-info-scroll-indicator--top {\n    opacity: 0.8;\n  }\n  .floating-info-scroll-wrap:has(.floating-info-scroll.can-scroll-down) .floating-info-scroll-indicator--bottom {\n    opacity: 0.8;\n  }\n  .floating-info-content {\n    display: block;\n  }\n}\n/*# sourceMappingURL=floating-info-container.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(FloatingInfoContainerComponent, { className: "FloatingInfoContainerComponent", filePath: "src/app/shared/floating-info-container/floating-info-container.component.ts", lineNumber: 12 });
})();

// src/app/shared/change-popover/change-popover.component.ts
function ChangePopoverComponent_Conditional_0_Conditional_1_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "app-floating-info-container", 2)(1, "p", 3);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 4)(5, "span", 5);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 6);
    \u0275\u0275text(8, "\u2192");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span", 7);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const c_r3 = ctx;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 3, c_r3.label));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.formatChangeValue(c_r3.from));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.formatChangeValue(c_r3.to));
  }
}
function ChangePopoverComponent_Conditional_0_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, ChangePopoverComponent_Conditional_0_Conditional_1_Conditional_0_Template, 11, 5, "app-floating-info-container", 2);
  }
  if (rf & 2) {
    let tmp_4_0;
    const o_r4 = \u0275\u0275nextContext();
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275conditional((tmp_4_0 = ctx_r1.getChange(ctx, o_r4.field)) ? 0 : -1, tmp_4_0);
  }
}
function ChangePopoverComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 1);
    \u0275\u0275listener("clickOutside", function ChangePopoverComponent_Conditional_0_Template_div_clickOutside_0_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeRequest.emit($event));
    });
    \u0275\u0275template(1, ChangePopoverComponent_Conditional_0_Conditional_1_Template, 1, 1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_4_0;
    const o_r4 = ctx;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("top", o_r4.top, "px")("left", o_r4.left, "px");
    \u0275\u0275advance();
    \u0275\u0275conditional((tmp_4_0 = ctx_r1.activity()) ? 1 : -1, tmp_4_0);
  }
}
var ChangePopoverComponent = class _ChangePopoverComponent {
  translation = inject(TranslationService);
  open = input(null);
  activity = input(void 0);
  closeRequest = output();
  getChange(activity, field) {
    return activity?.changes?.find((c) => c.field === field);
  }
  formatChangeValue(value) {
    if (value == null || value === "")
      return "";
    return value.split(",").map((s) => this.translation.translate(s.trim())).join(", ");
  }
  static \u0275fac = function ChangePopoverComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ChangePopoverComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ChangePopoverComponent, selectors: [["app-change-popover"]], inputs: { open: [1, "open"], activity: [1, "activity"] }, outputs: { closeRequest: "closeRequest" }, decls: 1, vars: 1, consts: [[1, "change-popover-anchor", 3, "top", "left"], [1, "change-popover-anchor", 3, "clickOutside"], ["scrollAxis", "none"], [1, "change-popover-label"], [1, "change-popover-values"], [1, "change-popover-from"], ["aria-hidden", "true", 1, "change-popover-arrow"], [1, "change-popover-to"]], template: function ChangePopoverComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275template(0, ChangePopoverComponent_Conditional_0_Template, 2, 5, "div", 0);
    }
    if (rf & 2) {
      let tmp_0_0;
      \u0275\u0275conditional((tmp_0_0 = ctx.open()) ? 0 : -1, tmp_0_0);
    }
  }, dependencies: [CommonModule, TranslatePipe, ClickOutSideDirective, FloatingInfoContainerComponent], styles: ["\n\n@layer components.change-popover {\n  .change-popover-anchor[_ngcontent-%COMP%] {\n    position: fixed;\n    z-index: 1000;\n    transform: translateX(-50%);\n    margin-top: 0.25rem;\n    background: transparent;\n    pointer-events: none;\n  }\n  .change-popover-anchor[_ngcontent-%COMP%]   app-floating-info-container[_ngcontent-%COMP%] {\n    pointer-events: auto;\n  }\n  .change-popover-label[_ngcontent-%COMP%] {\n    margin: 0 0 0.5rem 0;\n    padding-block-end: 0.35rem;\n    font-size: 0.7rem;\n    font-weight: 600;\n    color: var(--color-text-muted);\n    text-transform: uppercase;\n    letter-spacing: 0.03em;\n    border-block-end: 1px solid var(--border-default);\n  }\n  .change-popover-values[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    gap: 0.5rem;\n    font-size: 0.8125rem;\n    color: var(--color-text-main);\n    line-height: 1.35;\n  }\n  .change-popover-from[_ngcontent-%COMP%] {\n    color: var(--color-text-muted);\n    text-decoration: line-through;\n  }\n  .change-popover-arrow[_ngcontent-%COMP%] {\n    flex-shrink: 0;\n    color: var(--color-primary);\n    font-weight: 600;\n  }\n  .change-popover-to[_ngcontent-%COMP%] {\n    font-weight: 600;\n    color: var(--color-primary-hover);\n  }\n}\n/*# sourceMappingURL=change-popover.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ChangePopoverComponent, [{
    type: Component,
    args: [{ selector: "app-change-popover", standalone: true, imports: [CommonModule, TranslatePipe, ClickOutSideDirective, FloatingInfoContainerComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: '@if (open(); as o) {\r\n  <div\r\n    class="change-popover-anchor"\r\n    [style.top.px]="o.top"\r\n    [style.left.px]="o.left"\r\n    (clickOutside)="closeRequest.emit($event)"\r\n  >\r\n    @if (activity(); as act) {\r\n      @if (getChange(act, o.field); as c) {\r\n        <app-floating-info-container scrollAxis="none">\r\n          <p class="change-popover-label">{{ c.label | translatePipe }}</p>\r\n          <div class="change-popover-values">\r\n            <span class="change-popover-from">{{ formatChangeValue(c.from) }}</span>\r\n            <span class="change-popover-arrow" aria-hidden="true">\u2192</span>\r\n            <span class="change-popover-to">{{ formatChangeValue(c.to) }}</span>\r\n          </div>\r\n        </app-floating-info-container>\r\n      }\r\n    }\r\n  </div>\r\n}\r\n', styles: ["/* src/app/shared/change-popover/change-popover.component.scss */\n@layer components.change-popover {\n  .change-popover-anchor {\n    position: fixed;\n    z-index: 1000;\n    transform: translateX(-50%);\n    margin-top: 0.25rem;\n    background: transparent;\n    pointer-events: none;\n  }\n  .change-popover-anchor app-floating-info-container {\n    pointer-events: auto;\n  }\n  .change-popover-label {\n    margin: 0 0 0.5rem 0;\n    padding-block-end: 0.35rem;\n    font-size: 0.7rem;\n    font-weight: 600;\n    color: var(--color-text-muted);\n    text-transform: uppercase;\n    letter-spacing: 0.03em;\n    border-block-end: 1px solid var(--border-default);\n  }\n  .change-popover-values {\n    display: flex;\n    align-items: center;\n    gap: 0.5rem;\n    font-size: 0.8125rem;\n    color: var(--color-text-main);\n    line-height: 1.35;\n  }\n  .change-popover-from {\n    color: var(--color-text-muted);\n    text-decoration: line-through;\n  }\n  .change-popover-arrow {\n    flex-shrink: 0;\n    color: var(--color-primary);\n    font-weight: 600;\n  }\n  .change-popover-to {\n    font-weight: 600;\n    color: var(--color-primary-hover);\n  }\n}\n/*# sourceMappingURL=change-popover.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ChangePopoverComponent, { className: "ChangePopoverComponent", filePath: "src/app/shared/change-popover/change-popover.component.ts", lineNumber: 24 });
})();

// src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts
var _c02 = () => [];
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.field;
function DashboardOverviewComponent_Conditional_71_For_3_For_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 49);
    \u0275\u0275listener("click", function DashboardOverviewComponent_Conditional_71_For_3_For_11_Template_button_click_0_listener($event) {
      const change_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const item_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.toggleChangePopover(item_r5.id, change_r4.field, $event));
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const change_r4 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 1, change_r4.label), " ");
  }
}
function DashboardOverviewComponent_Conditional_71_For_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 32)(1, "span", 39);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 40);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 41)(7, "button", 42);
    \u0275\u0275listener("click", function DashboardOverviewComponent_Conditional_71_For_3_Template_button_click_7_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.scrollActivityChanges($event, "left"));
    });
    \u0275\u0275element(8, "lucide-icon", 43);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 44);
    \u0275\u0275repeaterCreate(10, DashboardOverviewComponent_Conditional_71_For_3_For_11_Template, 3, 3, "button", 45, _forTrack1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 46);
    \u0275\u0275listener("click", function DashboardOverviewComponent_Conditional_71_For_3_Template_button_click_12_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.scrollActivityChanges($event, "right"));
    });
    \u0275\u0275element(13, "lucide-icon", 47);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "span", 48);
    \u0275\u0275text(15);
    \u0275\u0275pipe(16, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r5 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275attribute("data-entity", item_r5.entityType);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(3, 7, item_r5.entityType === "product" ? "product" : item_r5.entityType === "dish" ? "dish" : "preparation"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", item_r5.entityName, " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(item_r5.changes || \u0275\u0275pureFunction0(11, _c02));
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275attribute("data-action", item_r5.action);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(16, 9, "activity_" + item_r5.action), " ");
  }
}
function DashboardOverviewComponent_Conditional_71_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 28)(1, "div", 31);
    \u0275\u0275repeaterCreate(2, DashboardOverviewComponent_Conditional_71_For_3_Template, 17, 12, "div", 32, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275element(4, "div", 33)(5, "div", 34);
    \u0275\u0275elementStart(6, "div", 35);
    \u0275\u0275element(7, "lucide-icon", 36);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 37);
    \u0275\u0275element(9, "lucide-icon", 38);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.getRecentActivity());
    \u0275\u0275advance(5);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
  }
}
function DashboardOverviewComponent_Conditional_72_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 29);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 1, "no_recent_activity"), " ");
  }
}
var DashboardOverviewComponent = class _DashboardOverviewComponent {
  activeTab = input.required();
  tabChange = output();
  kitchenState = inject(KitchenStateService);
  router = inject(Router);
  activityLog = inject(ActivityLogService);
  isLoggedIn = inject(UserService).isLoggedIn;
  openChange_ = signal(null);
  constructor() {
    this.activityLog.syncFromStorage();
  }
  totalProducts_ = computed(() => this.kitchenState.products_().length);
  totalRecipes_ = computed(() => this.kitchenState.recipes_().length);
  lowStockCount_ = computed(() => this.kitchenState.lowStockProducts_().length);
  unapprovedCount_ = computed(() => {
    return this.kitchenState.recipes_().filter((r) => !r.is_approved_).length;
  });
  /** Recent activity: read directly from localStorage so the list always reflects current storage (not in-memory cache). */
  getRecentActivity() {
    return this.activityLog.getRecentEntriesFromStorage(10);
  }
  trackByActivityId(_index, item) {
    return item.id;
  }
  toggleChangePopover(activityId, field, event) {
    const current = this.openChange_();
    if (current && current.activityId === activityId && current.field === field) {
      this.openChange_.set(null);
      return;
    }
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    this.openChange_.set({
      activityId,
      field,
      top: rect.bottom + 4,
      left: rect.left + rect.width / 2
    });
  }
  isChangeOpen(activityId, field) {
    const current = this.openChange_();
    return !!current && current.activityId === activityId && current.field === field;
  }
  /** Activity entry for the currently open popover (used by fixed popover). */
  getOpenActivity() {
    const open = this.openChange_();
    if (!open)
      return void 0;
    return this.getRecentActivity().find((e) => e.id === open.activityId);
  }
  /** Close popover when clicking outside; ignore clicks on change tags (they toggle instead). */
  closeChangePopoverOnOutsideClick(target) {
    if (target.closest?.(".change-tag"))
      return;
    this.openChange_.set(null);
  }
  /** Scroll the activity-changes container left/right (used on mobile for clickable scroll). */
  scrollActivityChanges(event, direction) {
    const btn = event.currentTarget;
    const item = btn.closest(".activity-item");
    const changesEl = item?.querySelector(".activity-changes");
    if (!changesEl)
      return;
    const delta = Math.max(120, changesEl.clientWidth * 0.6);
    const step = direction === "left" ? -delta : delta;
    changesEl.scrollBy({ left: step, behavior: "smooth" });
  }
  goToInventory() {
    void this.router.navigate(["/inventory"]);
  }
  goToAddProduct() {
    void this.router.navigate(["/inventory", "add"]);
  }
  goToRecipeBook() {
    void this.router.navigate(["/recipe-book"]);
  }
  goToRecipeBookUnapproved() {
    void this.router.navigate(["/recipe-book"], {
      queryParams: { filters: "Approved:false" },
      queryParamsHandling: "merge"
    });
  }
  goToInventoryLowStock() {
    void this.router.navigate(["/inventory"], {
      queryParams: { lowStock: "1" },
      queryParamsHandling: "merge"
    });
  }
  goToSuppliers() {
    void this.router.navigate(["/suppliers"]);
  }
  static \u0275fac = function DashboardOverviewComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _DashboardOverviewComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _DashboardOverviewComponent, selectors: [["app-dashboard-overview"]], inputs: { activeTab: [1, "activeTab"] }, outputs: { tabChange: "tabChange" }, decls: 74, vars: 62, consts: [["dir", "rtl", 1, "dashboard-overview"], [1, "dashboard-header"], [1, "page-title"], ["role", "group", "aria-label", "Dashboard actions", 1, "header-actions"], ["aria-label", "Dashboard sections", 1, "header-actions__nav"], ["type", "button", "data-testid", "btn-nav-metadata", 1, "header-btn", 3, "click"], ["type", "button", "data-testid", "btn-nav-venues", 1, "header-btn", 3, "click"], ["name", "map-pin", "size", "16"], ["type", "button", "data-testid", "btn-nav-trash", 1, "header-btn", "header-btn--trash", 3, "click"], ["name", "trash-2", "size", "16"], ["type", "button", "data-testid", "btn-nav-suppliers", 1, "header-btn", 3, "click"], ["name", "truck", "size", "16"], [1, "dashboard-main"], [1, "kpi-grid"], ["data-testid", "kpi-total-products", 1, "kpi-card"], [1, "kpi-label"], [1, "kpi-value"], [1, "kpi-actions"], ["type", "button", "data-testid", "btn-view-inventory", 1, "link-btn", 3, "click"], ["type", "button", "data-testid", "btn-add-product", 1, "link-btn", 3, "click", "disabled"], ["data-testid", "kpi-total-recipes", 1, "kpi-card"], ["type", "button", "data-testid", "btn-view-recipes", 1, "link-btn", 3, "click"], ["data-testid", "kpi-low-stock", 1, "kpi-card", "warning"], ["type", "button", "data-testid", "btn-view-low-stock", 1, "link-btn", 3, "click"], ["data-testid", "kpi-unapproved", 1, "kpi-card", "info"], ["type", "button", "data-testid", "btn-view-unapproved", 1, "link-btn", 3, "click"], [1, "activity-section"], [1, "section-header"], [1, "activity-list-scroll-wrap"], ["data-testid", "activity-empty", 1, "empty-copy"], [3, "closeRequest", "open", "activity"], ["data-testid", "activity-list", "scrollIndicators", "", 1, "activity-list"], ["data-testid", "activity-item", 1, "activity-item"], ["aria-hidden", "true", 1, "activity-scroll-zone", "activity-scroll-zone--top"], ["aria-hidden", "true", 1, "activity-scroll-zone", "activity-scroll-zone--bottom"], ["aria-hidden", "true", 1, "activity-scroll-indicator", "activity-scroll-indicator--top"], ["name", "chevron-up", 3, "size"], ["aria-hidden", "true", 1, "activity-scroll-indicator", "activity-scroll-indicator--bottom"], ["name", "chevron-down", 3, "size"], [1, "entity-type-tag"], [1, "activity-name"], [1, "activity-changes-wrapper"], ["type", "button", "aria-label", "Scroll changes left", 1, "activity-scroll-btn", "activity-scroll-left", 3, "click"], ["name", "chevron-right", 3, "size"], [1, "activity-changes"], ["type", "button", 1, "change-tag"], ["type", "button", "aria-label", "Scroll changes right", 1, "activity-scroll-btn", "activity-scroll-right", 3, "click"], ["name", "chevron-left", 3, "size"], [1, "activity-type"], ["type", "button", 1, "change-tag", 3, "click"]], template: function DashboardOverviewComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "h1", 2);
      \u0275\u0275text(3);
      \u0275\u0275pipe(4, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "div", 3)(6, "nav", 4)(7, "button", 5);
      \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_7_listener() {
        return ctx.tabChange.emit("metadata");
      });
      \u0275\u0275text(8);
      \u0275\u0275pipe(9, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(10, "button", 6);
      \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_10_listener() {
        return ctx.tabChange.emit("venues");
      });
      \u0275\u0275element(11, "lucide-icon", 7);
      \u0275\u0275text(12);
      \u0275\u0275pipe(13, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "button", 8);
      \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_14_listener() {
        return ctx.tabChange.emit("trash");
      });
      \u0275\u0275element(15, "lucide-icon", 9);
      \u0275\u0275text(16);
      \u0275\u0275pipe(17, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(18, "button", 10);
      \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_18_listener() {
        return ctx.goToSuppliers();
      });
      \u0275\u0275element(19, "lucide-icon", 11);
      \u0275\u0275elementStart(20, "span");
      \u0275\u0275text(21);
      \u0275\u0275pipe(22, "translatePipe");
      \u0275\u0275elementEnd()()()()();
      \u0275\u0275elementStart(23, "main", 12)(24, "section", 13)(25, "article", 14)(26, "h2", 15);
      \u0275\u0275text(27);
      \u0275\u0275pipe(28, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(29, "p", 16);
      \u0275\u0275text(30);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(31, "div", 17)(32, "button", 18);
      \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_32_listener() {
        return ctx.goToInventory();
      });
      \u0275\u0275text(33);
      \u0275\u0275pipe(34, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(35, "button", 19);
      \u0275\u0275pipe(36, "translatePipe");
      \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_35_listener() {
        return ctx.goToAddProduct();
      });
      \u0275\u0275text(37);
      \u0275\u0275pipe(38, "translatePipe");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(39, "article", 20)(40, "h2", 15);
      \u0275\u0275text(41);
      \u0275\u0275pipe(42, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(43, "p", 16);
      \u0275\u0275text(44);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(45, "button", 21);
      \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_45_listener() {
        return ctx.goToRecipeBook();
      });
      \u0275\u0275text(46);
      \u0275\u0275pipe(47, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(48, "article", 22)(49, "h2", 15);
      \u0275\u0275text(50);
      \u0275\u0275pipe(51, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(52, "p", 16);
      \u0275\u0275text(53);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(54, "button", 23);
      \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_54_listener() {
        return ctx.goToInventoryLowStock();
      });
      \u0275\u0275text(55);
      \u0275\u0275pipe(56, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(57, "article", 24)(58, "h2", 15);
      \u0275\u0275text(59);
      \u0275\u0275pipe(60, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(61, "p", 16);
      \u0275\u0275text(62);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(63, "button", 25);
      \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_63_listener() {
        return ctx.goToRecipeBookUnapproved();
      });
      \u0275\u0275text(64);
      \u0275\u0275pipe(65, "translatePipe");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(66, "section", 26)(67, "header", 27)(68, "h2");
      \u0275\u0275text(69);
      \u0275\u0275pipe(70, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(71, DashboardOverviewComponent_Conditional_71_Template, 10, 2, "div", 28)(72, DashboardOverviewComponent_Conditional_72_Template, 3, 3, "p", 29);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(73, "app-change-popover", 30);
      \u0275\u0275listener("closeRequest", function DashboardOverviewComponent_Template_app_change_popover_closeRequest_73_listener($event) {
        return ctx.closeChangePopoverOnOutsideClick($event);
      });
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 30, "dashboard"));
      \u0275\u0275advance(4);
      \u0275\u0275classProp("active", ctx.activeTab() === "metadata");
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(9, 32, "core_settings"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.activeTab() === "venues");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(13, 34, "venue_list"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.activeTab() === "trash");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(17, 36, "trash"), " ");
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(22, 38, "suppliers"));
      \u0275\u0275advance(6);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(28, 40, "total_products"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(ctx.totalProducts_());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(34, 42, "view_inventory"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", !ctx.isLoggedIn());
      \u0275\u0275attribute("title", !ctx.isLoggedIn() ? \u0275\u0275pipeBind1(36, 44, "sign_in_to_use") : null);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(38, 46, "add_product"), " ");
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(42, 48, "total_recipes"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(ctx.totalRecipes_());
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(47, 50, "view_recipes"), " ");
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(51, 52, "low_stock"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(ctx.lowStockCount_());
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(56, 54, "view_inventory"), " ");
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(60, 56, "unapproved_recipes"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(ctx.unapprovedCount_());
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(65, 58, "view_recipes"), " ");
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(70, 60, "recent_activity"));
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.getRecentActivity().length ? 71 : 72);
      \u0275\u0275advance(2);
      \u0275\u0275property("open", ctx.openChange_())("activity", ctx.getOpenActivity());
    }
  }, dependencies: [CommonModule, LucideAngularModule, LucideAngularComponent, TranslatePipe, ScrollIndicatorsDirective, ChangePopoverComponent], styles: ["\n\n.dashboard-overview[_ngcontent-%COMP%] {\n  padding: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.dashboard-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n@media (max-width: 900px) {\n  .dashboard-header[_ngcontent-%COMP%] {\n    align-items: stretch;\n  }\n  .dashboard-header[_ngcontent-%COMP%]   .page-title[_ngcontent-%COMP%] {\n    text-align: center;\n  }\n  .dashboard-header[_ngcontent-%COMP%]   .header-actions[_ngcontent-%COMP%] {\n    align-items: stretch;\n  }\n  .dashboard-header[_ngcontent-%COMP%]   .header-actions__nav[_ngcontent-%COMP%] {\n    width: 100%;\n  }\n  .dashboard-header[_ngcontent-%COMP%]   .header-btn[_ngcontent-%COMP%] {\n    width: fit-content;\n    justify-content: center;\n    font-size: 0.8125rem;\n    padding-inline: 0.75rem;\n  }\n}\n.page-title[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n  letter-spacing: -0.01em;\n}\n.header-actions[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.header-actions__nav[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.header-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.375rem;\n  padding-inline: 1.25rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  font-weight: 500;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-full);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    background 0.2s ease,\n    color 0.2s ease,\n    border-color 0.2s ease,\n    box-shadow 0.2s ease;\n}\n.header-btn[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-text-main);\n}\n.header-btn.active[_ngcontent-%COMP%] {\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-primary);\n  box-shadow: var(--shadow-glow);\n}\n.header-btn--trash[_ngcontent-%COMP%] {\n  color: var(--color-danger);\n  border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);\n}\n.header-btn--trash[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-danger);\n  border-color: var(--color-danger);\n}\n.header-btn--trash.active[_ngcontent-%COMP%] {\n  background: var(--color-danger);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-danger);\n}\n.dashboard-main[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) minmax(450px, 1fr);\n  gap: 1.5rem;\n}\n@media (max-width: 900px) {\n  .dashboard-main[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n}\n.kpi-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));\n  gap: 1rem;\n}\n@media (max-width: 768px) {\n  .kpi-grid[_ngcontent-%COMP%] {\n    grid-template-columns: repeat(2, 1fr);\n    gap: 0.75rem;\n  }\n}\n.kpi-card[_ngcontent-%COMP%] {\n  padding: 1rem 1.125rem;\n  border-radius: var(--radius-lg);\n  border: 1px solid var(--border-glass);\n  background: var(--bg-glass);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n  transition:\n    transform 0.25s ease,\n    box-shadow 0.25s ease,\n    background 0.2s ease;\n}\n@media (hover: hover) {\n  .kpi-card[_ngcontent-%COMP%]:hover {\n    transform: translateY(-2px);\n    box-shadow: var(--shadow-hover), 0 4px 16px rgba(20, 184, 166, 0.08);\n  }\n}\n.kpi-card.warning[_ngcontent-%COMP%]   .kpi-value[_ngcontent-%COMP%] {\n  color: var(--border-warning);\n}\n.kpi-card.info[_ngcontent-%COMP%]   .kpi-value[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n}\n@media (max-width: 768px) {\n  .kpi-card[_ngcontent-%COMP%] {\n    padding: 1rem;\n  }\n  .kpi-card[_ngcontent-%COMP%]   .kpi-value[_ngcontent-%COMP%] {\n    font-size: 1.5rem;\n  }\n}\n.kpi-label[_ngcontent-%COMP%] {\n  font-size: 0.9rem;\n  color: var(--color-text-muted);\n}\n.kpi-value[_ngcontent-%COMP%] {\n  font-size: 1.75rem;\n  font-weight: 800;\n  color: var(--color-text-main);\n}\n.kpi-actions[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n  margin-top: 0.25rem;\n}\n.link-btn[_ngcontent-%COMP%] {\n  align-self: flex-start;\n  padding: 0.25rem 0;\n  background: none;\n  border: none;\n  color: var(--color-primary);\n  font-size: 0.8rem;\n  cursor: pointer;\n}\n.link-btn[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.activity-section[_ngcontent-%COMP%] {\n  padding: 1rem 1.125rem;\n  border-radius: var(--radius-lg);\n  border: 1px solid var(--border-glass);\n  background: var(--bg-glass-strong);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}\n.section-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: var(--color-text-main);\n}\n.activity-list-scroll-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  flex: 1;\n  min-height: 0;\n}\n.activity-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  height: 260px;\n  max-height: 260px;\n  overflow-y: auto;\n  scrollbar-width: none;\n  -ms-overflow-style: none;\n}\n.activity-list[_ngcontent-%COMP%]::-webkit-scrollbar {\n  display: none;\n}\n.activity-scroll-zone--top[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 0;\n  inset-inline: 0;\n  z-index: 2;\n  height: 2.5rem;\n  pointer-events: none;\n}\n.activity-scroll-zone--bottom[_ngcontent-%COMP%] {\n  position: absolute;\n  bottom: 0;\n  inset-inline: 0;\n  z-index: 2;\n  height: 2.5rem;\n  pointer-events: none;\n}\n.activity-scroll-indicator--top[_ngcontent-%COMP%], \n.activity-scroll-indicator--bottom[_ngcontent-%COMP%] {\n  position: absolute;\n  inset-inline: 0;\n  z-index: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding-block: 0.25rem;\n  min-height: 1.5rem;\n  background:\n    linear-gradient(\n      to bottom,\n      var(--bg-glass-strong) 0%,\n      transparent 100%);\n  color: var(--color-text-muted);\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity 0.2s var(--ease-smooth);\n}\n.activity-scroll-indicator--top[_ngcontent-%COMP%] {\n  top: 0;\n  bottom: auto;\n}\n.activity-scroll-indicator--bottom[_ngcontent-%COMP%] {\n  top: auto;\n  bottom: 0;\n  background:\n    linear-gradient(\n      to top,\n      var(--bg-glass-strong) 0%,\n      transparent 100%);\n}\n.activity-list-scroll-wrap[_ngcontent-%COMP%]:has(.activity-list.can-scroll-up)   .activity-scroll-indicator--top[_ngcontent-%COMP%] {\n  opacity: 0.7;\n}\n.activity-list-scroll-wrap[_ngcontent-%COMP%]:has(.activity-list.can-scroll-down)   .activity-scroll-indicator--bottom[_ngcontent-%COMP%] {\n  opacity: 0.7;\n}\n.activity-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: flex-start;\n  gap: 0.5rem;\n  padding: 0.5rem 0.625rem;\n  border-radius: var(--radius-md);\n  background: transparent;\n  border-bottom: 1px solid var(--border-default);\n  transition: background 0.15s ease;\n}\n.activity-item[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass);\n}\n@media (max-width: 768px) {\n  .activity-item[_ngcontent-%COMP%] {\n    flex-wrap: wrap;\n    gap: 0.5rem;\n  }\n  .activity-item[_ngcontent-%COMP%]   .activity-name[_ngcontent-%COMP%] {\n    flex: 1 1 100%;\n    font-weight: 600;\n  }\n}\n.activity-type[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  margin-inline-start: auto;\n  font-size: 0.75rem;\n  font-weight: 600;\n  padding: 0.25rem 0.625rem;\n  border-radius: var(--radius-full);\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n}\n.activity-type[data-action=created][_ngcontent-%COMP%] {\n  background: var(--bg-success);\n  color: var(--text-success);\n}\n.activity-type[data-action=updated][_ngcontent-%COMP%] {\n  background: var(--bg-warning);\n  color: var(--text-warning);\n}\n.activity-type[data-action=deleted][_ngcontent-%COMP%] {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n}\n.activity-name[_ngcontent-%COMP%] {\n  font-size: 0.9rem;\n  color: var(--color-text-main);\n  text-align: end;\n}\n.entity-type-tag[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  font-size: 0.75rem;\n  padding: 0.25rem 0.625rem;\n  border-radius: var(--radius-full);\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n}\n.entity-type-tag[data-entity=product][_ngcontent-%COMP%] {\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n}\n.entity-type-tag[data-entity=recipe][_ngcontent-%COMP%] {\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n}\n.entity-type-tag[data-entity=dish][_ngcontent-%COMP%] {\n  background: var(--bg-success);\n  color: var(--text-success);\n}\n.activity-changes[_ngcontent-%COMP%] {\n  display: flex;\n  flex: 1 1 auto;\n  gap: 0.375rem;\n  overflow-x: auto;\n  padding-inline: 0.25rem;\n  min-width: 0;\n  scrollbar-width: none;\n}\n.activity-changes[_ngcontent-%COMP%]::-webkit-scrollbar {\n  width: 0;\n  height: 0;\n}\n.activity-changes[_ngcontent-%COMP%]:hover {\n  scrollbar-width: thin;\n}\n.activity-changes[_ngcontent-%COMP%]:hover::-webkit-scrollbar {\n  height: 4px;\n}\n.activity-changes[_ngcontent-%COMP%]:hover::-webkit-scrollbar-track {\n  background: var(--bg-muted);\n  border-radius: 2px;\n}\n.activity-changes[_ngcontent-%COMP%]:hover::-webkit-scrollbar-thumb {\n  background: var(--border-strong);\n  border-radius: 2px;\n}\n.activity-changes-wrapper[_ngcontent-%COMP%] {\n  display: flex;\n  flex: 1 1 auto;\n  align-items: center;\n  gap: 0.25rem;\n  min-width: 0;\n}\n.activity-scroll-btn[_ngcontent-%COMP%] {\n  display: none;\n  flex-shrink: 0;\n  align-items: center;\n  justify-content: center;\n  width: 1.75rem;\n  height: 1.75rem;\n  padding: 0;\n  border: none;\n  border-radius: var(--radius-sm);\n  background: var(--border-default);\n  color: var(--color-text-muted);\n  cursor: pointer;\n  transition: background 0.15s ease, color 0.15s ease;\n}\n.activity-scroll-btn[_ngcontent-%COMP%]:hover {\n  background: var(--border-strong);\n  color: var(--color-text-main);\n}\n@media (max-width: 414px) {\n  .activity-scroll-btn[_ngcontent-%COMP%] {\n    display: inline-flex;\n  }\n}\n@media (max-width: 414px) {\n  .activity-changes-wrapper[_ngcontent-%COMP%] {\n    flex: 1 1 auto;\n    min-width: 0;\n  }\n  .activity-changes-wrapper[_ngcontent-%COMP%]   .activity-changes[_ngcontent-%COMP%] {\n    flex: 1 1 auto;\n    min-width: 0;\n    max-width: 100%;\n  }\n}\n.change-tag[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  padding: 0.2rem 0.5rem;\n  border-radius: var(--radius-full);\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n  border: none;\n  cursor: pointer;\n  white-space: nowrap;\n}\n.empty-copy[_ngcontent-%COMP%] {\n  font-size: 0.85rem;\n  color: var(--color-text-muted);\n}\n/*# sourceMappingURL=dashboard-overview.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DashboardOverviewComponent, [{
    type: Component,
    args: [{ selector: "app-dashboard-overview", standalone: true, imports: [CommonModule, LucideAngularModule, TranslatePipe, ScrollIndicatorsDirective, ChangePopoverComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="dashboard-overview" dir="rtl">
  <header class="dashboard-header">
    <h1 class="page-title">{{ 'dashboard' | translatePipe }}</h1>
    <div class="header-actions" role="group" aria-label="Dashboard actions">
      <nav class="header-actions__nav" aria-label="Dashboard sections">
        <button
          type="button"
          class="header-btn"
          data-testid="btn-nav-metadata"
          [class.active]="activeTab() === 'metadata'"
          (click)="tabChange.emit('metadata')"
        >
          {{ 'core_settings' | translatePipe }}
        </button>
        <button
          type="button"
          class="header-btn"
          data-testid="btn-nav-venues"
          [class.active]="activeTab() === 'venues'"
          (click)="tabChange.emit('venues')"
        >
          <lucide-icon name="map-pin" size="16"></lucide-icon>
          {{ 'venue_list' | translatePipe }}
        </button>
        <button
          type="button"
          class="header-btn header-btn--trash"
          data-testid="btn-nav-trash"
          [class.active]="activeTab() === 'trash'"
          (click)="tabChange.emit('trash')"
        >
          <lucide-icon name="trash-2" size="16"></lucide-icon>
          {{ 'trash' | translatePipe }}
        </button>
        <button type="button" class="header-btn" data-testid="btn-nav-suppliers" (click)="goToSuppliers()">
          <lucide-icon name="truck" size="16"></lucide-icon>
          <span>{{ 'suppliers' | translatePipe }}</span>
        </button>
      </nav>
    </div>
  </header>

  <main class="dashboard-main">
    <section class="kpi-grid">
      <article class="kpi-card" data-testid="kpi-total-products">
        <h2 class="kpi-label">{{ 'total_products' | translatePipe }}</h2>
        <p class="kpi-value">{{ totalProducts_() }}</p>
        <div class="kpi-actions">
          <button type="button" class="link-btn" data-testid="btn-view-inventory" (click)="goToInventory()">
            {{ 'view_inventory' | translatePipe }}
          </button>
          <button type="button" class="link-btn" data-testid="btn-add-product" (click)="goToAddProduct()"
            [disabled]="!isLoggedIn()"
            [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
            {{ 'add_product' | translatePipe }}
          </button>
        </div>
      </article>

      <article class="kpi-card" data-testid="kpi-total-recipes">
        <h2 class="kpi-label">{{ 'total_recipes' | translatePipe }}</h2>
        <p class="kpi-value">{{ totalRecipes_() }}</p>
        <button type="button" class="link-btn" data-testid="btn-view-recipes" (click)="goToRecipeBook()">
          {{ 'view_recipes' | translatePipe }}
        </button>
      </article>

      <article class="kpi-card warning" data-testid="kpi-low-stock">
        <h2 class="kpi-label">{{ 'low_stock' | translatePipe }}</h2>
        <p class="kpi-value">{{ lowStockCount_() }}</p>
        <button type="button" class="link-btn" data-testid="btn-view-low-stock" (click)="goToInventoryLowStock()">
          {{ 'view_inventory' | translatePipe }}
        </button>
      </article>

      <article class="kpi-card info" data-testid="kpi-unapproved">
        <h2 class="kpi-label">{{ 'unapproved_recipes' | translatePipe }}</h2>
        <p class="kpi-value">{{ unapprovedCount_() }}</p>
        <button type="button" class="link-btn" data-testid="btn-view-unapproved" (click)="goToRecipeBookUnapproved()">
          {{ 'view_recipes' | translatePipe }}
        </button>
      </article>
    </section>

    <section class="activity-section">
      <header class="section-header">
        <h2>{{ 'recent_activity' | translatePipe }}</h2>
      </header>

      @if (getRecentActivity().length) {
        <div class="activity-list-scroll-wrap">
          <div class="activity-list" data-testid="activity-list" scrollIndicators>
            @for (item of getRecentActivity(); track item.id) {
              <div class="activity-item" data-testid="activity-item">
                <span class="entity-type-tag" [attr.data-entity]="item.entityType">
                  {{ (item.entityType === 'product'
                    ? 'product'
                    : item.entityType === 'dish'
                      ? 'dish'
                      : 'preparation') | translatePipe }}
                </span>

                <span class="activity-name">
                  {{ item.entityName }}
                </span>

                <div class="activity-changes-wrapper">
                  <button
                    type="button"
                    class="activity-scroll-btn activity-scroll-left"
                    (click)="scrollActivityChanges($event, 'left')"
                    aria-label="Scroll changes left"
                  >
                    <lucide-icon name="chevron-right" [size]="16"></lucide-icon>
                  </button>
                  <div class="activity-changes">
                    @for (change of item.changes || []; track change.field) {
                      <button
                        type="button"
                        class="change-tag"
                        (click)="toggleChangePopover(item.id, change.field, $event)"
                      >
                        {{ change.label | translatePipe }}
                      </button>
                    }
                  </div>
                  <button
                    type="button"
                    class="activity-scroll-btn activity-scroll-right"
                    (click)="scrollActivityChanges($event, 'right')"
                    aria-label="Scroll changes right"
                  >
                    <lucide-icon name="chevron-left" [size]="16"></lucide-icon>
                  </button>
                </div>

                <span class="activity-type" [attr.data-action]="item.action">
                  {{ ('activity_' + item.action) | translatePipe }}
                </span>
              </div>
            }
          </div>
          <div class="activity-scroll-zone activity-scroll-zone--top" aria-hidden="true"></div>
          <div class="activity-scroll-zone activity-scroll-zone--bottom" aria-hidden="true"></div>
          <div class="activity-scroll-indicator activity-scroll-indicator--top" aria-hidden="true">
            <lucide-icon name="chevron-up" [size]="16"></lucide-icon>
          </div>
          <div class="activity-scroll-indicator activity-scroll-indicator--bottom" aria-hidden="true">
            <lucide-icon name="chevron-down" [size]="16"></lucide-icon>
          </div>
        </div>
      } @else {
        <p class="empty-copy" data-testid="activity-empty">
          {{ 'no_recent_activity' | translatePipe }}
        </p>
      }
    </section>
  </main>

  <app-change-popover
    [open]="openChange_()"
    [activity]="getOpenActivity()"
    (closeRequest)="closeChangePopoverOnOutsideClick($event)"
  />
</div>
`, styles: ["/* src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss */\n.dashboard-overview {\n  padding: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.dashboard-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n@media (max-width: 900px) {\n  .dashboard-header {\n    align-items: stretch;\n  }\n  .dashboard-header .page-title {\n    text-align: center;\n  }\n  .dashboard-header .header-actions {\n    align-items: stretch;\n  }\n  .dashboard-header .header-actions__nav {\n    width: 100%;\n  }\n  .dashboard-header .header-btn {\n    width: fit-content;\n    justify-content: center;\n    font-size: 0.8125rem;\n    padding-inline: 0.75rem;\n  }\n}\n.page-title {\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n  letter-spacing: -0.01em;\n}\n.header-actions {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.header-actions__nav {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.header-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.375rem;\n  padding-inline: 1.25rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  font-weight: 500;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-full);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    background 0.2s ease,\n    color 0.2s ease,\n    border-color 0.2s ease,\n    box-shadow 0.2s ease;\n}\n.header-btn:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-text-main);\n}\n.header-btn.active {\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-primary);\n  box-shadow: var(--shadow-glow);\n}\n.header-btn--trash {\n  color: var(--color-danger);\n  border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);\n}\n.header-btn--trash:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-danger);\n  border-color: var(--color-danger);\n}\n.header-btn--trash.active {\n  background: var(--color-danger);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-danger);\n}\n.dashboard-main {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) minmax(450px, 1fr);\n  gap: 1.5rem;\n}\n@media (max-width: 900px) {\n  .dashboard-main {\n    grid-template-columns: 1fr;\n  }\n}\n.kpi-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));\n  gap: 1rem;\n}\n@media (max-width: 768px) {\n  .kpi-grid {\n    grid-template-columns: repeat(2, 1fr);\n    gap: 0.75rem;\n  }\n}\n.kpi-card {\n  padding: 1rem 1.125rem;\n  border-radius: var(--radius-lg);\n  border: 1px solid var(--border-glass);\n  background: var(--bg-glass);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n  transition:\n    transform 0.25s ease,\n    box-shadow 0.25s ease,\n    background 0.2s ease;\n}\n@media (hover: hover) {\n  .kpi-card:hover {\n    transform: translateY(-2px);\n    box-shadow: var(--shadow-hover), 0 4px 16px rgba(20, 184, 166, 0.08);\n  }\n}\n.kpi-card.warning .kpi-value {\n  color: var(--border-warning);\n}\n.kpi-card.info .kpi-value {\n  color: var(--color-primary);\n}\n@media (max-width: 768px) {\n  .kpi-card {\n    padding: 1rem;\n  }\n  .kpi-card .kpi-value {\n    font-size: 1.5rem;\n  }\n}\n.kpi-label {\n  font-size: 0.9rem;\n  color: var(--color-text-muted);\n}\n.kpi-value {\n  font-size: 1.75rem;\n  font-weight: 800;\n  color: var(--color-text-main);\n}\n.kpi-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n  margin-top: 0.25rem;\n}\n.link-btn {\n  align-self: flex-start;\n  padding: 0.25rem 0;\n  background: none;\n  border: none;\n  color: var(--color-primary);\n  font-size: 0.8rem;\n  cursor: pointer;\n}\n.link-btn:hover {\n  text-decoration: underline;\n}\n.activity-section {\n  padding: 1rem 1.125rem;\n  border-radius: var(--radius-lg);\n  border: 1px solid var(--border-glass);\n  background: var(--bg-glass-strong);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}\n.section-header h2 {\n  margin: 0;\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: var(--color-text-main);\n}\n.activity-list-scroll-wrap {\n  position: relative;\n  flex: 1;\n  min-height: 0;\n}\n.activity-list {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  height: 260px;\n  max-height: 260px;\n  overflow-y: auto;\n  scrollbar-width: none;\n  -ms-overflow-style: none;\n}\n.activity-list::-webkit-scrollbar {\n  display: none;\n}\n.activity-scroll-zone--top {\n  position: absolute;\n  top: 0;\n  inset-inline: 0;\n  z-index: 2;\n  height: 2.5rem;\n  pointer-events: none;\n}\n.activity-scroll-zone--bottom {\n  position: absolute;\n  bottom: 0;\n  inset-inline: 0;\n  z-index: 2;\n  height: 2.5rem;\n  pointer-events: none;\n}\n.activity-scroll-indicator--top,\n.activity-scroll-indicator--bottom {\n  position: absolute;\n  inset-inline: 0;\n  z-index: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding-block: 0.25rem;\n  min-height: 1.5rem;\n  background:\n    linear-gradient(\n      to bottom,\n      var(--bg-glass-strong) 0%,\n      transparent 100%);\n  color: var(--color-text-muted);\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity 0.2s var(--ease-smooth);\n}\n.activity-scroll-indicator--top {\n  top: 0;\n  bottom: auto;\n}\n.activity-scroll-indicator--bottom {\n  top: auto;\n  bottom: 0;\n  background:\n    linear-gradient(\n      to top,\n      var(--bg-glass-strong) 0%,\n      transparent 100%);\n}\n.activity-list-scroll-wrap:has(.activity-list.can-scroll-up) .activity-scroll-indicator--top {\n  opacity: 0.7;\n}\n.activity-list-scroll-wrap:has(.activity-list.can-scroll-down) .activity-scroll-indicator--bottom {\n  opacity: 0.7;\n}\n.activity-item {\n  display: flex;\n  align-items: center;\n  justify-content: flex-start;\n  gap: 0.5rem;\n  padding: 0.5rem 0.625rem;\n  border-radius: var(--radius-md);\n  background: transparent;\n  border-bottom: 1px solid var(--border-default);\n  transition: background 0.15s ease;\n}\n.activity-item:hover {\n  background: var(--bg-glass);\n}\n@media (max-width: 768px) {\n  .activity-item {\n    flex-wrap: wrap;\n    gap: 0.5rem;\n  }\n  .activity-item .activity-name {\n    flex: 1 1 100%;\n    font-weight: 600;\n  }\n}\n.activity-type {\n  flex-shrink: 0;\n  margin-inline-start: auto;\n  font-size: 0.75rem;\n  font-weight: 600;\n  padding: 0.25rem 0.625rem;\n  border-radius: var(--radius-full);\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n}\n.activity-type[data-action=created] {\n  background: var(--bg-success);\n  color: var(--text-success);\n}\n.activity-type[data-action=updated] {\n  background: var(--bg-warning);\n  color: var(--text-warning);\n}\n.activity-type[data-action=deleted] {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n}\n.activity-name {\n  font-size: 0.9rem;\n  color: var(--color-text-main);\n  text-align: end;\n}\n.entity-type-tag {\n  flex-shrink: 0;\n  font-size: 0.75rem;\n  padding: 0.25rem 0.625rem;\n  border-radius: var(--radius-full);\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n}\n.entity-type-tag[data-entity=product] {\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n}\n.entity-type-tag[data-entity=recipe] {\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n}\n.entity-type-tag[data-entity=dish] {\n  background: var(--bg-success);\n  color: var(--text-success);\n}\n.activity-changes {\n  display: flex;\n  flex: 1 1 auto;\n  gap: 0.375rem;\n  overflow-x: auto;\n  padding-inline: 0.25rem;\n  min-width: 0;\n  scrollbar-width: none;\n}\n.activity-changes::-webkit-scrollbar {\n  width: 0;\n  height: 0;\n}\n.activity-changes:hover {\n  scrollbar-width: thin;\n}\n.activity-changes:hover::-webkit-scrollbar {\n  height: 4px;\n}\n.activity-changes:hover::-webkit-scrollbar-track {\n  background: var(--bg-muted);\n  border-radius: 2px;\n}\n.activity-changes:hover::-webkit-scrollbar-thumb {\n  background: var(--border-strong);\n  border-radius: 2px;\n}\n.activity-changes-wrapper {\n  display: flex;\n  flex: 1 1 auto;\n  align-items: center;\n  gap: 0.25rem;\n  min-width: 0;\n}\n.activity-scroll-btn {\n  display: none;\n  flex-shrink: 0;\n  align-items: center;\n  justify-content: center;\n  width: 1.75rem;\n  height: 1.75rem;\n  padding: 0;\n  border: none;\n  border-radius: var(--radius-sm);\n  background: var(--border-default);\n  color: var(--color-text-muted);\n  cursor: pointer;\n  transition: background 0.15s ease, color 0.15s ease;\n}\n.activity-scroll-btn:hover {\n  background: var(--border-strong);\n  color: var(--color-text-main);\n}\n@media (max-width: 414px) {\n  .activity-scroll-btn {\n    display: inline-flex;\n  }\n}\n@media (max-width: 414px) {\n  .activity-changes-wrapper {\n    flex: 1 1 auto;\n    min-width: 0;\n  }\n  .activity-changes-wrapper .activity-changes {\n    flex: 1 1 auto;\n    min-width: 0;\n    max-width: 100%;\n  }\n}\n.change-tag {\n  font-size: 0.75rem;\n  padding: 0.2rem 0.5rem;\n  border-radius: var(--radius-full);\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n  border: none;\n  cursor: pointer;\n  white-space: nowrap;\n}\n.empty-copy {\n  font-size: 0.85rem;\n  color: var(--color-text-muted);\n}\n/*# sourceMappingURL=dashboard-overview.component.css.map */\n"] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(DashboardOverviewComponent, { className: "DashboardOverviewComponent", filePath: "src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts", lineNumber: 22 });
})();

// src/app/pages/dashboard/components/dashboard-header/dashboard-header.component.ts
function DashboardHeaderComponent_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 12);
    \u0275\u0275listener("click", function DashboardHeaderComponent_Conditional_6_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.backToDashboard());
    });
    \u0275\u0275element(1, "lucide-icon", 13);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(3, 1, "back_to_dashboard"), " ");
  }
}
function DashboardHeaderComponent_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 14);
    \u0275\u0275listener("click", function DashboardHeaderComponent_Conditional_7_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.tabChange.emit("metadata"));
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r1.activeTab() === "metadata");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 3, "core_settings"), " ");
  }
}
var DashboardHeaderComponent = class _DashboardHeaderComponent {
  activeTab = input.required();
  tabChange = output();
  router = inject(Router);
  goToSuppliers() {
    void this.router.navigate(["/suppliers"]);
  }
  backToDashboard() {
    this.tabChange.emit("overview");
  }
  static \u0275fac = function DashboardHeaderComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _DashboardHeaderComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _DashboardHeaderComponent, selectors: [["app-dashboard-header"]], inputs: { activeTab: [1, "activeTab"] }, outputs: { tabChange: "tabChange" }, decls: 21, vars: 17, consts: [[1, "dashboard-header"], [1, "page-title"], ["role", "group", "aria-label", "Dashboard actions", 1, "header-actions"], ["aria-label", "Dashboard sections", 1, "header-actions__nav"], ["type", "button", "data-testid", "btn-back-to-dashboard", 1, "header-btn", "header-btn--back"], ["type", "button", "data-testid", "btn-nav-metadata", 1, "header-btn", 3, "active"], ["type", "button", "data-testid", "btn-nav-venues", 1, "header-btn", 3, "click"], ["name", "map-pin", "size", "16"], ["type", "button", "data-testid", "btn-nav-suppliers", 1, "header-btn", 3, "click"], ["name", "truck", "size", "16"], ["type", "button", "data-testid", "btn-nav-trash", 1, "header-btn", "header-btn--trash", 3, "click"], ["name", "trash-2", "size", "16"], ["type", "button", "data-testid", "btn-back-to-dashboard", 1, "header-btn", "header-btn--back", 3, "click"], ["name", "arrow-right", "size", "16"], ["type", "button", "data-testid", "btn-nav-metadata", 1, "header-btn", 3, "click"]], template: function DashboardHeaderComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "header", 0)(1, "h1", 1);
      \u0275\u0275text(2);
      \u0275\u0275pipe(3, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "div", 2)(5, "nav", 3);
      \u0275\u0275template(6, DashboardHeaderComponent_Conditional_6_Template, 4, 3, "button", 4)(7, DashboardHeaderComponent_Conditional_7_Template, 3, 5, "button", 5);
      \u0275\u0275elementStart(8, "button", 6);
      \u0275\u0275listener("click", function DashboardHeaderComponent_Template_button_click_8_listener() {
        return ctx.tabChange.emit("venues");
      });
      \u0275\u0275element(9, "lucide-icon", 7);
      \u0275\u0275text(10);
      \u0275\u0275pipe(11, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(12, "button", 8);
      \u0275\u0275listener("click", function DashboardHeaderComponent_Template_button_click_12_listener() {
        return ctx.goToSuppliers();
      });
      \u0275\u0275element(13, "lucide-icon", 9);
      \u0275\u0275elementStart(14, "span");
      \u0275\u0275text(15);
      \u0275\u0275pipe(16, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(17, "button", 10);
      \u0275\u0275listener("click", function DashboardHeaderComponent_Template_button_click_17_listener() {
        return ctx.tabChange.emit("trash");
      });
      \u0275\u0275element(18, "lucide-icon", 11);
      \u0275\u0275text(19);
      \u0275\u0275pipe(20, "translatePipe");
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 9, "dashboard"));
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.activeTab() === "metadata" ? 6 : 7);
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.activeTab() === "venues");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(11, 11, "venue_list"), " ");
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(16, 13, "suppliers"));
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.activeTab() === "trash");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(20, 15, "trash"), " ");
    }
  }, dependencies: [CommonModule, LucideAngularModule, LucideAngularComponent, TranslatePipe], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n}\n.dashboard-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n@media (max-width: 900px) {\n  .dashboard-header[_ngcontent-%COMP%] {\n    align-items: stretch;\n  }\n  .dashboard-header[_ngcontent-%COMP%]   .page-title[_ngcontent-%COMP%] {\n    text-align: center;\n  }\n  .dashboard-header[_ngcontent-%COMP%]   .header-actions[_ngcontent-%COMP%] {\n    align-items: stretch;\n  }\n  .dashboard-header[_ngcontent-%COMP%]   .header-actions__nav[_ngcontent-%COMP%] {\n    width: 100%;\n  }\n  .dashboard-header[_ngcontent-%COMP%]   .header-btn[_ngcontent-%COMP%] {\n    width: fit-content;\n    justify-content: center;\n    font-size: 0.8125rem;\n    padding-inline: 0.75rem;\n  }\n}\n.page-title[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n  letter-spacing: -0.01em;\n}\n.header-actions[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.header-actions__nav[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.header-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.375rem;\n  padding-inline: 1.25rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  font-weight: 500;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-full);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    background 0.2s ease,\n    color 0.2s ease,\n    border-color 0.2s ease,\n    box-shadow 0.2s ease;\n}\n.header-btn[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-text-main);\n}\n.header-btn.active[_ngcontent-%COMP%] {\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-primary);\n  box-shadow: var(--shadow-glow);\n}\n.header-btn--trash[_ngcontent-%COMP%] {\n  color: var(--color-danger);\n  border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);\n}\n.header-btn--trash[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-danger);\n  border-color: var(--color-danger);\n}\n.header-btn--trash.active[_ngcontent-%COMP%] {\n  background: var(--color-danger);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-danger);\n}\n.header-btn--back[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n  border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);\n}\n.header-btn--back[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-primary-hover);\n  border-color: var(--color-primary);\n}\n/*# sourceMappingURL=dashboard-header.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DashboardHeaderComponent, [{
    type: Component,
    args: [{ selector: "app-dashboard-header", standalone: true, imports: [CommonModule, LucideAngularModule, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `<header class="dashboard-header">\r
  <h1 class="page-title">{{ 'dashboard' | translatePipe }}</h1>\r
  <div class="header-actions" role="group" aria-label="Dashboard actions">\r
    <nav class="header-actions__nav" aria-label="Dashboard sections">\r
      @if (activeTab() === 'metadata') {\r
      <button type="button" class="header-btn header-btn--back" data-testid="btn-back-to-dashboard" (click)="backToDashboard()">\r
        <lucide-icon name="arrow-right" size="16"></lucide-icon>\r
        {{ 'back_to_dashboard' | translatePipe }}\r
      </button>\r
      } @else {\r
      <button type="button" class="header-btn" data-testid="btn-nav-metadata" [class.active]="activeTab() === 'metadata'"\r
        (click)="tabChange.emit('metadata')">\r
        {{ 'core_settings' | translatePipe }}\r
      </button>\r
      }\r
      <button type="button" class="header-btn" data-testid="btn-nav-venues" [class.active]="activeTab() === 'venues'"\r
        (click)="tabChange.emit('venues')">\r
        <lucide-icon name="map-pin" size="16"></lucide-icon>\r
        {{ 'venue_list' | translatePipe }}\r
      </button>\r
      <button type="button" class="header-btn" data-testid="btn-nav-suppliers" (click)="goToSuppliers()">\r
        <lucide-icon name="truck" size="16"></lucide-icon>\r
        <span>{{ 'suppliers' | translatePipe }}</span>\r
      </button>\r
      <button type="button" class="header-btn header-btn--trash" data-testid="btn-nav-trash" [class.active]="activeTab() === 'trash'"\r
        (click)="tabChange.emit('trash')">\r
        <lucide-icon name="trash-2" size="16"></lucide-icon>\r
        {{ 'trash' | translatePipe }}\r
      </button>\r
    </nav>\r
  </div>\r
</header>\r
`, styles: ["/* src/app/pages/dashboard/components/dashboard-header/dashboard-header.component.scss */\n:host {\n  display: block;\n}\n.dashboard-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n@media (max-width: 900px) {\n  .dashboard-header {\n    align-items: stretch;\n  }\n  .dashboard-header .page-title {\n    text-align: center;\n  }\n  .dashboard-header .header-actions {\n    align-items: stretch;\n  }\n  .dashboard-header .header-actions__nav {\n    width: 100%;\n  }\n  .dashboard-header .header-btn {\n    width: fit-content;\n    justify-content: center;\n    font-size: 0.8125rem;\n    padding-inline: 0.75rem;\n  }\n}\n.page-title {\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n  letter-spacing: -0.01em;\n}\n.header-actions {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.header-actions__nav {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n.header-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.375rem;\n  padding-inline: 1.25rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  font-weight: 500;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-full);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    background 0.2s ease,\n    color 0.2s ease,\n    border-color 0.2s ease,\n    box-shadow 0.2s ease;\n}\n.header-btn:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-text-main);\n}\n.header-btn.active {\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-primary);\n  box-shadow: var(--shadow-glow);\n}\n.header-btn--trash {\n  color: var(--color-danger);\n  border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);\n}\n.header-btn--trash:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-danger);\n  border-color: var(--color-danger);\n}\n.header-btn--trash.active {\n  background: var(--color-danger);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-danger);\n}\n.header-btn--back {\n  color: var(--color-primary);\n  border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);\n}\n.header-btn--back:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-primary-hover);\n  border-color: var(--color-primary);\n}\n/*# sourceMappingURL=dashboard-header.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(DashboardHeaderComponent, { className: "DashboardHeaderComponent", filePath: "src/app/pages/dashboard/components/dashboard-header/dashboard-header.component.ts", lineNumber: 17 });
})();

// src/app/core/services/demo-loader.service.ts
var ASSETS = "assets/data";
var DemoLoaderService = class _DemoLoaderService {
  http = inject(HttpClient);
  storage = inject(StorageService);
  productData = inject(ProductDataService);
  supplierData = inject(SupplierDataService);
  recipeData = inject(RecipeDataService);
  dishData = inject(DishDataService);
  equipmentData = inject(EquipmentDataService);
  venueData = inject(VenueDataService);
  preparationRegistry = inject(PreparationRegistryService);
  metadataRegistry = inject(MetadataRegistryService);
  menuSectionCategories = inject(MenuSectionCategoriesService);
  menuEventData = inject(MenuEventDataService);
  translation = inject(TranslationService);
  userMsg = inject(UserMsgService);
  logging = inject(LoggingService);
  /**
   * Fetches demo JSON files, replaces PRODUCT_LIST, KITCHEN_SUPPLIERS, RECIPE_LIST, DISH_LIST,
   * EQUIPMENT_LIST, VENUE_PROFILES, and KITCHEN_PREPARATIONS in localStorage, then reloads all data services.
   */
  loadDemoData() {
    return __async(this, null, function* () {
      try {
        const [suppliers, products, recipes, dishes, equipment, venues, preparations, labels, sectionCategories, menuEvents] = yield Promise.all([
          firstValueFrom(this.http.get(`${ASSETS}/demo-suppliers.json`)),
          firstValueFrom(this.http.get(`${ASSETS}/demo-products.json`)),
          firstValueFrom(this.http.get(`${ASSETS}/demo-recipes.json`)),
          firstValueFrom(this.http.get(`${ASSETS}/demo-dishes.json`)),
          firstValueFrom(this.http.get(`${ASSETS}/demo-equipment.json`).pipe(catchError(() => of([])))),
          firstValueFrom(this.http.get(`${ASSETS}/demo-venues.json`).pipe(catchError(() => of([])))),
          firstValueFrom(this.http.get(`${ASSETS}/demo-kitchen-preparations.json`).pipe(catchError(() => of([])))),
          firstValueFrom(this.http.get(`${ASSETS}/demo-labels.json`).pipe(catchError(() => of([])))),
          firstValueFrom(this.http.get(`${ASSETS}/demo-section-categories.json`).pipe(catchError(() => of([])))),
          firstValueFrom(this.http.get(`${ASSETS}/demo-menu-events.json`).pipe(catchError(() => of([]))))
        ]);
        yield this.storage.replaceAll("KITCHEN_SUPPLIERS", suppliers ?? []);
        yield this.storage.replaceAll("PRODUCT_LIST", products ?? []);
        yield this.storage.replaceAll("RECIPE_LIST", recipes ?? []);
        yield this.storage.replaceAll("DISH_LIST", dishes ?? []);
        yield this.storage.replaceAll("EQUIPMENT_LIST", equipment ?? []);
        yield this.storage.replaceAll("VENUE_PROFILES", venues ?? []);
        yield this.storage.replaceAll("KITCHEN_PREPARATIONS", Array.isArray(preparations) ? preparations : []);
        if (Array.isArray(labels) && labels.length > 0) {
          yield this.storage.replaceAll("KITCHEN_LABELS", labels);
        }
        yield this.storage.replaceAll("MENU_SECTION_CATEGORIES", Array.isArray(sectionCategories) ? sectionCategories : []);
        yield this.storage.replaceAll("MENU_EVENT_LIST", Array.isArray(menuEvents) ? menuEvents : []);
        yield Promise.all([
          this.supplierData.reloadFromStorage(),
          this.productData.reloadFromStorage(),
          this.recipeData.reloadFromStorage(),
          this.dishData.reloadFromStorage(),
          this.equipmentData.reloadFromStorage(),
          this.venueData.reloadFromStorage(),
          this.preparationRegistry.reloadFromStorage(),
          this.metadataRegistry.reloadLabelsFromStorage(),
          this.menuSectionCategories.reloadFromStorage(),
          this.menuEventData.reloadFromStorage()
        ]);
        yield this.translation.loadGlobalDictionary();
        this.userMsg.onSetSuccessMsg("\u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05D3\u05D2\u05DE\u05D4 \u05E0\u05D8\u05E2\u05E0\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");
      } catch (err) {
        this.logging.error({ event: "demo.load_error", message: "Demo load failed", context: { err } });
        this.userMsg.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05D3\u05D2\u05DE\u05D4");
      }
    });
  }
  static \u0275fac = function DemoLoaderService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _DemoLoaderService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _DemoLoaderService, factory: _DemoLoaderService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DemoLoaderService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/core/services/backup.service.ts
var BACKUP_FILE_VERSION = 1;
var BackupService = class _BackupService {
  storage = inject(StorageService);
  productData = inject(ProductDataService);
  supplierData = inject(SupplierDataService);
  recipeData = inject(RecipeDataService);
  dishData = inject(DishDataService);
  equipmentData = inject(EquipmentDataService);
  venueData = inject(VenueDataService);
  menuEventData = inject(MenuEventDataService);
  menuSectionCategories = inject(MenuSectionCategoriesService);
  activityLog = inject(ActivityLogService);
  unitRegistry = inject(UnitRegistryService);
  preparationRegistry = inject(PreparationRegistryService);
  metadataRegistry = inject(MetadataRegistryService);
  userMsg = inject(UserMsgService);
  logging = inject(LoggingService);
  /**
   * Export all backup-backed keys to a single JSON file (download).
   */
  exportAllToFile() {
    return __async(this, null, function* () {
      const data = {};
      for (const key of BACKUP_ENTITY_TYPES) {
        const backupKey = `backup_${key}`;
        const raw = localStorage.getItem(backupKey) ?? localStorage.getItem(key);
        if (raw != null) {
          try {
            data[key] = JSON.parse(raw);
          } catch {
            data[key] = raw;
          }
        }
      }
      const payload = {
        version: BACKUP_FILE_VERSION,
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        data
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `foodvibe-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.userMsg.onSetSuccessMsg("\u05D2\u05D9\u05D1\u05D5\u05D9 \u05D9\u05D5\u05E6\u05D0 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");
    });
  }
  /**
   * Restore from in-app backup keys (backup_*) into main keys and reload data services.
   */
  restoreFromBackup() {
    return __async(this, null, function* () {
      let restored = 0;
      for (const key of BACKUP_ENTITY_TYPES) {
        const backupKey = `backup_${key}`;
        const raw = localStorage.getItem(backupKey);
        if (raw != null) {
          try {
            const parsed = JSON.parse(raw);
            localStorage.setItem(key, JSON.stringify(parsed));
            restored++;
          } catch {
          }
        }
      }
      yield this.reloadAllDataServices();
      this.userMsg.onSetSuccessMsg(restored > 0 ? `\u05E9\u05D5\u05D7\u05D6\u05E8 \u05DE\u05D2\u05D9\u05D1\u05D5\u05D9 (${restored} \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA)` : "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05D2\u05D9\u05D1\u05D5\u05D9 \u05DC\u05E9\u05D7\u05D6\u05D5\u05E8");
    });
  }
  /**
   * Import from a previously exported backup file. Overwrites current data for keys present in the file.
   */
  importFromFile(file) {
    return __async(this, null, function* () {
      const text = yield file.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        this.userMsg.onSetErrorMsg("\u05E7\u05D5\u05D1\u05E5 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF (\u05DC\u05D0 JSON)");
        return;
      }
      if (payload.version !== BACKUP_FILE_VERSION || !payload.data || typeof payload.data !== "object") {
        this.userMsg.onSetErrorMsg("\u05E4\u05D5\u05E8\u05DE\u05D8 \u05D2\u05D9\u05D1\u05D5\u05D9 \u05DC\u05D0 \u05E0\u05EA\u05DE\u05DA");
        return;
      }
      const keys = Object.keys(payload.data).filter((k) => BACKUP_ENTITY_TYPES.has(k));
      if (keys.length === 0) {
        this.userMsg.onSetErrorMsg("\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E0\u05EA\u05DE\u05DB\u05D9\u05DD \u05D1\u05E7\u05D5\u05D1\u05E5");
        return;
      }
      for (const key of keys) {
        const value = payload.data[key];
        try {
          localStorage.setItem(key, JSON.stringify(value));
          const backupKey = `backup_${key}`;
          localStorage.setItem(backupKey, JSON.stringify(value));
        } catch (err) {
          this.logging.warn({ event: "backup.write_failed", message: "Backup write failed", context: { key, err } });
        }
      }
      yield this.reloadAllDataServices();
      this.userMsg.onSetSuccessMsg(`\u05D9\u05D5\u05D1\u05D0 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 (${keys.length} \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA)`);
    });
  }
  reloadAllDataServices() {
    return __async(this, null, function* () {
      yield Promise.all([
        this.supplierData.reloadFromStorage(),
        this.productData.reloadFromStorage(),
        this.recipeData.reloadFromStorage(),
        this.dishData.reloadFromStorage(),
        this.equipmentData.reloadFromStorage(),
        this.venueData.reloadFromStorage(),
        this.menuEventData.reloadFromStorage(),
        this.menuSectionCategories.reloadFromStorage(),
        this.unitRegistry.reloadFromStorage(),
        this.preparationRegistry.reloadFromStorage(),
        this.metadataRegistry.reloadFromStorage()
      ]);
      this.activityLog.syncFromStorage();
    });
  }
  static \u0275fac = function BackupService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _BackupService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _BackupService, factory: _BackupService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(BackupService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/pages/metadata-manager/components/preparation-category-manager/preparation-category-manager.component.ts
function PreparationCategoryManagerComponent_Conditional_18_For_2_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "input", 19);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275listener("blur", function PreparationCategoryManagerComponent_Conditional_18_For_2_Conditional_1_Template_input_blur_0_listener($event) {
      \u0275\u0275restoreView(_r4);
      const key_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r5 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r5.onRenameBlur(key_r5, $event.target.value));
    })("keydown.enter", function PreparationCategoryManagerComponent_Conditional_18_For_2_Conditional_1_Template_input_keydown_enter_0_listener($event) {
      \u0275\u0275restoreView(_r4);
      return \u0275\u0275resetView($event.target.blur());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const key_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275property("value", \u0275\u0275pipeBind1(1, 1, key_r5));
  }
}
function PreparationCategoryManagerComponent_Conditional_18_For_2_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "span", 20);
    \u0275\u0275listener("dblclick", function PreparationCategoryManagerComponent_Conditional_18_For_2_Conditional_2_Template_span_dblclick_0_listener() {
      \u0275\u0275restoreView(_r7);
      const key_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r5 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r5.onStartRename(key_r5));
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const key_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, key_r5));
  }
}
function PreparationCategoryManagerComponent_Conditional_18_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 11);
    \u0275\u0275template(1, PreparationCategoryManagerComponent_Conditional_18_For_2_Conditional_1_Template, 2, 3, "input", 12)(2, PreparationCategoryManagerComponent_Conditional_18_For_2_Conditional_2_Template, 3, 3, "span", 13);
    \u0275\u0275elementStart(3, "div", 14)(4, "button", 15);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275listener("click", function PreparationCategoryManagerComponent_Conditional_18_For_2_Template_button_click_4_listener() {
      const key_r5 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r5 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r5.onStartRename(key_r5));
    });
    \u0275\u0275element(6, "lucide-icon", 16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 17);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275listener("click", function PreparationCategoryManagerComponent_Conditional_18_For_2_Template_button_click_7_listener() {
      const key_r5 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r5 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r5.onRemove(key_r5));
    });
    \u0275\u0275element(9, "lucide-icon", 18);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const key_r5 = ctx.$implicit;
    const ctx_r5 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r5.editingKey_() === key_r5 ? 1 : 2);
    \u0275\u0275advance(3);
    \u0275\u0275property("disabled", !ctx_r5.isLoggedIn());
    \u0275\u0275attribute("title", !ctx_r5.isLoggedIn() ? \u0275\u0275pipeBind1(5, 7, "sign_in_to_use") : null);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", !ctx_r5.isLoggedIn());
    \u0275\u0275attribute("title", !ctx_r5.isLoggedIn() ? \u0275\u0275pipeBind1(8, 9, "sign_in_to_use") : null);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
  }
}
function PreparationCategoryManagerComponent_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 9);
    \u0275\u0275repeaterCreate(1, PreparationCategoryManagerComponent_Conditional_18_For_2_Template, 10, 11, "div", 11, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r5 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r5.categories_());
  }
}
function PreparationCategoryManagerComponent_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 10);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "metadata_no_prep_categories"));
  }
}
var PreparationCategoryManagerComponent = class _PreparationCategoryManagerComponent {
  prepRegistry = inject(PreparationRegistryService);
  kitchenState = inject(KitchenStateService);
  confirmModal = inject(ConfirmModalService);
  userMsg = inject(UserMsgService);
  translation = inject(TranslationService);
  translationKeyModal = inject(TranslationKeyModalService);
  isLoggedIn = inject(UserService).isLoggedIn;
  authModal = inject(AuthModalService);
  categories_ = this.prepRegistry.preparationCategories_;
  editingKey_ = signal(null);
  requireSignIn() {
    if (this.isLoggedIn())
      return true;
    this.userMsg.onSetWarningMsg(this.translation.translate("sign_in_to_use"));
    this.authModal.open("sign-in");
    return false;
  }
  countRecipesUsingCategory(key) {
    return this.kitchenState.recipes_().filter((r) => (r.prep_items_ ?? []).some((p) => p.category_name === key) || (r.prep_categories_ ?? []).some((c) => c.category_name === key)).length;
  }
  onAdd(hebrewLabel, inputEl) {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const sanitized = hebrewLabel.trim();
      if (!sanitized)
        return;
      const existingLabels = this.categories_().map((k) => this.translation.translate(k));
      if (existingLabels.includes(sanitized)) {
        this.userMsg.onSetErrorMsg(this.translation.translate("metadata_category_exists"));
        return;
      }
      const result = yield this.translationKeyModal.open(sanitized, "category");
      if (!isTranslationKeyResult(result))
        return;
      this.translation.updateDictionary(result.englishKey, result.hebrewLabel);
      yield this.prepRegistry.registerCategory(result.englishKey, result.hebrewLabel);
      inputEl.value = "";
    });
  }
  onRemove(key) {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const usageCount = this.countRecipesUsingCategory(key);
      if (usageCount > 0) {
        const msg = this.translation.translate("metadata_cannot_delete_in_use").replace("{n}", String(usageCount));
        this.userMsg.onSetErrorMsg(msg);
        return;
      }
      const label = this.translation.translate(key);
      const confirmMsg = `${this.translation.translate("metadata_confirm_remove_category")} "${label}"`;
      const confirmed = yield this.confirmModal.open(confirmMsg, { variant: "warning" });
      if (!confirmed)
        return;
      yield this.prepRegistry.deleteCategory(key);
      this.userMsg.onSetSuccessMsg(this.translation.translate("metadata_updated_success"));
    });
  }
  onStartRename(key) {
    if (!this.requireSignIn())
      return;
    this.editingKey_.set(key);
  }
  onRenameBlur(oldKey, newValue) {
    return __async(this, null, function* () {
      this.editingKey_.set(null);
      const trimmed = (newValue ?? "").trim();
      if (!trimmed)
        return;
      const oldLabel = this.translation.translate(oldKey);
      if (trimmed === oldLabel)
        return;
      const usageCount = this.countRecipesUsingCategory(oldKey);
      if (usageCount > 0) {
        const msg = this.translation.translate("metadata_rename_affects_recipes").replace("{n}", String(usageCount));
        const confirmed = yield this.confirmModal.open(msg, { variant: "warning", saveLabel: "save" });
        if (!confirmed)
          return;
      } else {
        const confirmed = yield this.confirmModal.open(this.translation.translate("metadata_confirm_rename_category"), { saveLabel: "save" });
        if (!confirmed)
          return;
      }
      yield this.prepRegistry.renameCategory(oldKey, oldKey, trimmed);
      this.userMsg.onSetSuccessMsg(this.translation.translate("metadata_updated_success"));
    });
  }
  static \u0275fac = function PreparationCategoryManagerComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _PreparationCategoryManagerComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _PreparationCategoryManagerComponent, selectors: [["app-preparation-category-manager"]], decls: 20, vars: 17, consts: [["newInput", ""], [1, "manager-card"], [1, "card-title"], ["name", "cooking-pot", 1, "card-icon"], [1, "card-desc"], [1, "input-group"], ["type", "text", 3, "keyup.enter", "placeholder"], ["type", "button", 1, "c-btn-primary", 3, "click", "disabled"], [1, "list-container"], [1, "list-stack"], [1, "empty-state"], [1, "list-item", "group"], ["type", "text", "autofocus", "", 1, "inline-edit-input", 3, "value"], [1, "item-label"], [1, "item-actions"], ["type", "button", 1, "btn-edit", 3, "click", "disabled"], ["name", "pencil", 3, "size"], ["type", "button", 1, "c-icon-btn", "danger", 3, "click", "disabled"], ["name", "trash-2", 3, "size"], ["type", "text", "autofocus", "", 1, "inline-edit-input", 3, "blur", "keydown.enter", "value"], [1, "item-label", 3, "dblclick"]], template: function PreparationCategoryManagerComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "section", 1)(1, "div", 2);
      \u0275\u0275element(2, "lucide-icon", 3);
      \u0275\u0275elementStart(3, "h2");
      \u0275\u0275text(4);
      \u0275\u0275pipe(5, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(6, "p", 4);
      \u0275\u0275text(7);
      \u0275\u0275pipe(8, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(9, "div", 5)(10, "input", 6, 0);
      \u0275\u0275pipe(12, "translatePipe");
      \u0275\u0275listener("keyup.enter", function PreparationCategoryManagerComponent_Template_input_keyup_enter_10_listener() {
        \u0275\u0275restoreView(_r1);
        const newInput_r2 = \u0275\u0275reference(11);
        return \u0275\u0275resetView(ctx.onAdd(newInput_r2.value, newInput_r2));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(13, "button", 7);
      \u0275\u0275pipe(14, "translatePipe");
      \u0275\u0275listener("click", function PreparationCategoryManagerComponent_Template_button_click_13_listener() {
        \u0275\u0275restoreView(_r1);
        const newInput_r2 = \u0275\u0275reference(11);
        return \u0275\u0275resetView(ctx.onAdd(newInput_r2.value, newInput_r2));
      });
      \u0275\u0275text(15);
      \u0275\u0275pipe(16, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(17, "div", 8);
      \u0275\u0275template(18, PreparationCategoryManagerComponent_Conditional_18_Template, 3, 0, "div", 9)(19, PreparationCategoryManagerComponent_Conditional_19_Template, 3, 3, "div", 10);
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(5, 7, "metadata_prep_categories"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(8, 9, "metadata_preparations_desc"));
      \u0275\u0275advance(3);
      \u0275\u0275property("placeholder", \u0275\u0275pipeBind1(12, 11, "metadata_add_category"));
      \u0275\u0275advance(3);
      \u0275\u0275property("disabled", !ctx.isLoggedIn());
      \u0275\u0275attribute("title", !ctx.isLoggedIn() ? \u0275\u0275pipeBind1(14, 13, "sign_in_to_use") : null);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(16, 15, "metadata_add"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.categories_().length > 0 ? 18 : 19);
    }
  }, dependencies: [LucideAngularModule, LucideAngularComponent, TranslatePipe], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n}\n.card-icon[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n}\n.manager-card[_ngcontent-%COMP%] {\n  height: fit-content;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n@media (max-width: 768px) {\n  .manager-card[_ngcontent-%COMP%] {\n    padding: 1rem;\n  }\n}\n.card-title[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-block-end: 1rem;\n  padding-block-end: 1rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.card-title[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.125rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n}\n.card-desc[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n.input-group[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n}\n.input-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  flex: 1;\n  padding-inline: 0.75rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  outline: none;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.input-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]::placeholder {\n  color: var(--color-text-muted-light);\n}\n.input-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.list-container[_ngcontent-%COMP%] {\n  margin-block-start: 1.5rem;\n}\n.list-container[_ngcontent-%COMP%]   .list-stack[_ngcontent-%COMP%] {\n  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fit, minmax(140px, auto));\n  gap: 0.5rem;\n}\n.list-container[_ngcontent-%COMP%]   .list-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.75rem 1rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-weight: 600;\n  border: 1px solid transparent;\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.list-container[_ngcontent-%COMP%]   .list-item[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-default);\n}\n.list-container[_ngcontent-%COMP%]   .list-item.group[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 0.5rem;\n}\n.list-container[_ngcontent-%COMP%]   .item-label[_ngcontent-%COMP%] {\n  cursor: default;\n}\n.list-container[_ngcontent-%COMP%]   .item-actions[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  align-self: center;\n  gap: 0.25rem;\n}\n.list-container[_ngcontent-%COMP%]   .inline-edit-input[_ngcontent-%COMP%] {\n  display: block;\n  width: 100%;\n  min-width: 0;\n  padding: 0;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font: inherit;\n  font-weight: 600;\n  border: none;\n  border-radius: var(--radius-xs);\n  outline: none;\n  box-shadow: 0 0 0 1px var(--border-focus);\n  cursor: text;\n}\n.list-container[_ngcontent-%COMP%]   .btn-edit[_ngcontent-%COMP%], \n.list-container[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%] {\n  display: grid;\n  place-content: center;\n  width: 2.25rem;\n  height: 2.25rem;\n  opacity: 0;\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  transition:\n    opacity 0.2s ease,\n    background 0.2s ease,\n    color 0.2s ease,\n    transform 0.2s var(--ease-spring);\n}\n.list-container[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%]:hover {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  transform: scale(1.12) rotate(8deg);\n}\n.list-container[_ngcontent-%COMP%]   .btn-edit[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n}\n.list-container[_ngcontent-%COMP%]   .btn-edit[_ngcontent-%COMP%]:hover {\n  color: var(--color-primary);\n}\n.list-container[_ngcontent-%COMP%]   .list-item[_ngcontent-%COMP%]:hover   .btn-edit[_ngcontent-%COMP%], \n.list-container[_ngcontent-%COMP%]   .list-item[_ngcontent-%COMP%]:hover   .c-icon-btn.danger[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 2rem;\n  color: var(--color-text-muted);\n  border: 1px dashed var(--border-default);\n  border-radius: var(--radius-md);\n  font-style: italic;\n}\n/*# sourceMappingURL=preparation-category-manager.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(PreparationCategoryManagerComponent, [{
    type: Component,
    args: [{ selector: "app-preparation-category-manager", standalone: true, imports: [LucideAngularModule, TranslatePipe], template: `<section class="manager-card">
  <div class="card-title">
    <lucide-icon name="cooking-pot" class="card-icon"></lucide-icon>
    <h2>{{ 'metadata_prep_categories' | translatePipe }}</h2>
  </div>
  <p class="card-desc">{{ 'metadata_preparations_desc' | translatePipe }}</p>

  <div class="input-group">
    <input #newInput type="text"
      [placeholder]="'metadata_add_category' | translatePipe"
      (keyup.enter)="onAdd(newInput.value, newInput)">
    <button type="button" class="c-btn-primary" (click)="onAdd(newInput.value, newInput)"
      [disabled]="!isLoggedIn()"
      [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
      {{ 'metadata_add' | translatePipe }}
    </button>
  </div>

  <div class="list-container">
    @if (categories_().length > 0) {
      <div class="list-stack">
        @for (key of categories_(); track key) {
          <div class="list-item group">
            @if (editingKey_() === key) {
              <input type="text" class="inline-edit-input"
                [value]="key | translatePipe"
                (blur)="onRenameBlur(key, $any($event.target).value)"
                (keydown.enter)="$any($event.target).blur()"
                autofocus />
            } @else {
              <span class="item-label" (dblclick)="onStartRename(key)">{{ key | translatePipe }}</span>
            }
            <div class="item-actions">
              <button type="button" class="btn-edit" (click)="onStartRename(key)"
                [disabled]="!isLoggedIn()"
                [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
                <lucide-icon name="pencil" [size]="14"></lucide-icon>
              </button>
              <button type="button" class="c-icon-btn danger" (click)="onRemove(key)"
                [disabled]="!isLoggedIn()"
                [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
                <lucide-icon name="trash-2" [size]="16"></lucide-icon>
              </button>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="empty-state">{{ 'metadata_no_prep_categories' | translatePipe }}</div>
    }
  </div>
</section>
`, styles: ["/* src/app/pages/metadata-manager/components/preparation-category-manager/preparation-category-manager.component.scss */\n:host {\n  display: block;\n}\n.card-icon {\n  color: var(--color-primary);\n}\n.manager-card {\n  height: fit-content;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n@media (max-width: 768px) {\n  .manager-card {\n    padding: 1rem;\n  }\n}\n.card-title {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-block-end: 1rem;\n  padding-block-end: 1rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.card-title h2 {\n  margin: 0;\n  font-size: 1.125rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n}\n.card-desc {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n.input-group {\n  display: flex;\n  gap: 0.5rem;\n}\n.input-group input {\n  flex: 1;\n  padding-inline: 0.75rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  outline: none;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.input-group input::placeholder {\n  color: var(--color-text-muted-light);\n}\n.input-group input:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.list-container {\n  margin-block-start: 1.5rem;\n}\n.list-container .list-stack {\n  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fit, minmax(140px, auto));\n  gap: 0.5rem;\n}\n.list-container .list-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.75rem 1rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-weight: 600;\n  border: 1px solid transparent;\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.list-container .list-item:hover {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-default);\n}\n.list-container .list-item.group {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 0.5rem;\n}\n.list-container .item-label {\n  cursor: default;\n}\n.list-container .item-actions {\n  display: flex;\n  align-items: center;\n  align-self: center;\n  gap: 0.25rem;\n}\n.list-container .inline-edit-input {\n  display: block;\n  width: 100%;\n  min-width: 0;\n  padding: 0;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font: inherit;\n  font-weight: 600;\n  border: none;\n  border-radius: var(--radius-xs);\n  outline: none;\n  box-shadow: 0 0 0 1px var(--border-focus);\n  cursor: text;\n}\n.list-container .btn-edit,\n.list-container .c-icon-btn.danger {\n  display: grid;\n  place-content: center;\n  width: 2.25rem;\n  height: 2.25rem;\n  opacity: 0;\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  transition:\n    opacity 0.2s ease,\n    background 0.2s ease,\n    color 0.2s ease,\n    transform 0.2s var(--ease-spring);\n}\n.list-container .c-icon-btn.danger:hover {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  transform: scale(1.12) rotate(8deg);\n}\n.list-container .btn-edit {\n  color: var(--color-text-muted);\n}\n.list-container .btn-edit:hover {\n  color: var(--color-primary);\n}\n.list-container .list-item:hover .btn-edit,\n.list-container .list-item:hover .c-icon-btn.danger {\n  opacity: 1;\n}\n.empty-state {\n  text-align: center;\n  padding: 2rem;\n  color: var(--color-text-muted);\n  border: 1px dashed var(--border-default);\n  border-radius: var(--radius-md);\n  font-style: italic;\n}\n/*# sourceMappingURL=preparation-category-manager.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(PreparationCategoryManagerComponent, { className: "PreparationCategoryManagerComponent", filePath: "src/app/pages/metadata-manager/components/preparation-category-manager/preparation-category-manager.component.ts", lineNumber: 20 });
})();

// src/app/pages/metadata-manager/components/section-category-manager/section-category-manager.component.ts
function SectionCategoryManagerComponent_Conditional_18_For_2_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "input", 19);
    \u0275\u0275listener("blur", function SectionCategoryManagerComponent_Conditional_18_For_2_Conditional_1_Template_input_blur_0_listener($event) {
      \u0275\u0275restoreView(_r4);
      const name_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r5 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r5.onRenameBlur(name_r5, $event.target.value));
    })("keydown.enter", function SectionCategoryManagerComponent_Conditional_18_For_2_Conditional_1_Template_input_keydown_enter_0_listener($event) {
      \u0275\u0275restoreView(_r4);
      return \u0275\u0275resetView($event.target.blur());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const name_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275property("value", name_r5);
  }
}
function SectionCategoryManagerComponent_Conditional_18_For_2_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "span", 20);
    \u0275\u0275listener("dblclick", function SectionCategoryManagerComponent_Conditional_18_For_2_Conditional_2_Template_span_dblclick_0_listener() {
      \u0275\u0275restoreView(_r7);
      const name_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r5 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r5.onStartRename(name_r5));
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const name_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, name_r5));
  }
}
function SectionCategoryManagerComponent_Conditional_18_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 11);
    \u0275\u0275template(1, SectionCategoryManagerComponent_Conditional_18_For_2_Conditional_1_Template, 1, 1, "input", 12)(2, SectionCategoryManagerComponent_Conditional_18_For_2_Conditional_2_Template, 3, 3, "span", 13);
    \u0275\u0275elementStart(3, "div", 14)(4, "button", 15);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275listener("click", function SectionCategoryManagerComponent_Conditional_18_For_2_Template_button_click_4_listener() {
      const name_r5 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r5 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r5.onStartRename(name_r5));
    });
    \u0275\u0275element(6, "lucide-icon", 16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 17);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275listener("click", function SectionCategoryManagerComponent_Conditional_18_For_2_Template_button_click_7_listener() {
      const name_r5 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r5 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r5.onRemove(name_r5));
    });
    \u0275\u0275element(9, "lucide-icon", 18);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const name_r5 = ctx.$implicit;
    const ctx_r5 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r5.editingName_() === name_r5 ? 1 : 2);
    \u0275\u0275advance(3);
    \u0275\u0275property("disabled", !ctx_r5.isLoggedIn());
    \u0275\u0275attribute("title", !ctx_r5.isLoggedIn() ? \u0275\u0275pipeBind1(5, 7, "sign_in_to_use") : null);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", !ctx_r5.isLoggedIn());
    \u0275\u0275attribute("title", !ctx_r5.isLoggedIn() ? \u0275\u0275pipeBind1(8, 9, "sign_in_to_use") : null);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
  }
}
function SectionCategoryManagerComponent_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 9);
    \u0275\u0275repeaterCreate(1, SectionCategoryManagerComponent_Conditional_18_For_2_Template, 10, 11, "div", 11, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r5 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r5.categories_());
  }
}
function SectionCategoryManagerComponent_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 10);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "metadata_no_section_categories"));
  }
}
var SectionCategoryManagerComponent = class _SectionCategoryManagerComponent {
  sectionCategories = inject(MenuSectionCategoriesService);
  menuEventData = inject(MenuEventDataService);
  confirmModal = inject(ConfirmModalService);
  userMsg = inject(UserMsgService);
  translation = inject(TranslationService);
  isLoggedIn = inject(UserService).isLoggedIn;
  authModal = inject(AuthModalService);
  categories_ = this.sectionCategories.sectionCategories_;
  editingName_ = signal(null);
  requireSignIn() {
    if (this.isLoggedIn())
      return true;
    this.userMsg.onSetWarningMsg(this.translation.translate("sign_in_to_use"));
    this.authModal.open("sign-in");
    return false;
  }
  countMenuEventsUsingSection(name) {
    return this.menuEventData.allMenuEvents_().filter((e) => (e.sections_ ?? []).some((s) => s.name_ === name)).length;
  }
  onAdd(value, inputEl) {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const trimmed = value.trim();
      if (!trimmed)
        return;
      if (this.categories_().includes(trimmed)) {
        this.userMsg.onSetErrorMsg(this.translation.translate("metadata_section_exists"));
        return;
      }
      yield this.sectionCategories.addCategory(trimmed);
      inputEl.value = "";
      this.userMsg.onSetSuccessMsg(this.translation.translate("metadata_updated_success"));
    });
  }
  onRemove(name) {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const usageCount = this.countMenuEventsUsingSection(name);
      if (usageCount > 0) {
        const msg = this.translation.translate("metadata_section_in_use").replace("{n}", String(usageCount));
        this.userMsg.onSetErrorMsg(msg);
        return;
      }
      const confirmMsg = `${this.translation.translate("metadata_confirm_remove_section")} "${name}"`;
      const confirmed = yield this.confirmModal.open(confirmMsg, { variant: "warning" });
      if (!confirmed)
        return;
      yield this.sectionCategories.removeCategory(name);
      this.userMsg.onSetSuccessMsg(this.translation.translate("metadata_updated_success"));
    });
  }
  onStartRename(name) {
    if (!this.requireSignIn())
      return;
    this.editingName_.set(name);
  }
  onRenameBlur(oldName, newValue) {
    return __async(this, null, function* () {
      this.editingName_.set(null);
      const trimmed = (newValue ?? "").trim();
      if (!trimmed || trimmed === oldName)
        return;
      const usageCount = this.countMenuEventsUsingSection(oldName);
      if (usageCount > 0) {
        const msg = this.translation.translate("metadata_rename_affects_menus").replace("{n}", String(usageCount));
        const confirmed = yield this.confirmModal.open(msg, { variant: "warning", saveLabel: "save" });
        if (!confirmed)
          return;
      } else {
        const confirmed = yield this.confirmModal.open(this.translation.translate("metadata_confirm_rename_section"), { saveLabel: "save" });
        if (!confirmed)
          return;
      }
      yield this.sectionCategories.renameCategory(oldName, trimmed);
      yield this.updateMenuEventSections(oldName, trimmed);
      this.userMsg.onSetSuccessMsg(this.translation.translate("metadata_updated_success"));
    });
  }
  updateMenuEventSections(oldName, newName) {
    return __async(this, null, function* () {
      const events = this.menuEventData.allMenuEvents_();
      for (const event of events) {
        const hasMatch = (event.sections_ ?? []).some((s) => s.name_ === oldName);
        if (!hasMatch)
          continue;
        const updatedSections = event.sections_.map((s) => s.name_ === oldName ? __spreadProps(__spreadValues({}, s), { name_: newName }) : s);
        yield this.menuEventData.updateMenuEvent(__spreadProps(__spreadValues({}, event), { sections_: updatedSections }));
      }
    });
  }
  static \u0275fac = function SectionCategoryManagerComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SectionCategoryManagerComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SectionCategoryManagerComponent, selectors: [["app-section-category-manager"]], decls: 20, vars: 17, consts: [["newInput", ""], [1, "manager-card"], [1, "card-title"], ["name", "book-open", 1, "card-icon"], [1, "card-desc"], [1, "input-group"], ["type", "text", 3, "keyup.enter", "placeholder"], ["type", "button", 1, "c-btn-primary", 3, "click", "disabled"], [1, "list-container"], [1, "list-stack"], [1, "empty-state"], [1, "list-item", "group"], ["type", "text", "autofocus", "", 1, "inline-edit-input", 3, "value"], [1, "item-label"], [1, "item-actions"], ["type", "button", 1, "btn-edit", 3, "click", "disabled"], ["name", "pencil", 3, "size"], ["type", "button", 1, "c-icon-btn", "danger", 3, "click", "disabled"], ["name", "trash-2", 3, "size"], ["type", "text", "autofocus", "", 1, "inline-edit-input", 3, "blur", "keydown.enter", "value"], [1, "item-label", 3, "dblclick"]], template: function SectionCategoryManagerComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "section", 1)(1, "div", 2);
      \u0275\u0275element(2, "lucide-icon", 3);
      \u0275\u0275elementStart(3, "h2");
      \u0275\u0275text(4);
      \u0275\u0275pipe(5, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(6, "p", 4);
      \u0275\u0275text(7);
      \u0275\u0275pipe(8, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(9, "div", 5)(10, "input", 6, 0);
      \u0275\u0275pipe(12, "translatePipe");
      \u0275\u0275listener("keyup.enter", function SectionCategoryManagerComponent_Template_input_keyup_enter_10_listener() {
        \u0275\u0275restoreView(_r1);
        const newInput_r2 = \u0275\u0275reference(11);
        return \u0275\u0275resetView(ctx.onAdd(newInput_r2.value, newInput_r2));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(13, "button", 7);
      \u0275\u0275pipe(14, "translatePipe");
      \u0275\u0275listener("click", function SectionCategoryManagerComponent_Template_button_click_13_listener() {
        \u0275\u0275restoreView(_r1);
        const newInput_r2 = \u0275\u0275reference(11);
        return \u0275\u0275resetView(ctx.onAdd(newInput_r2.value, newInput_r2));
      });
      \u0275\u0275text(15);
      \u0275\u0275pipe(16, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(17, "div", 8);
      \u0275\u0275template(18, SectionCategoryManagerComponent_Conditional_18_Template, 3, 0, "div", 9)(19, SectionCategoryManagerComponent_Conditional_19_Template, 3, 3, "div", 10);
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(5, 7, "metadata_section_categories_title"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(8, 9, "metadata_section_categories_desc"));
      \u0275\u0275advance(3);
      \u0275\u0275property("placeholder", \u0275\u0275pipeBind1(12, 11, "metadata_section_placeholder"));
      \u0275\u0275advance(3);
      \u0275\u0275property("disabled", !ctx.isLoggedIn());
      \u0275\u0275attribute("title", !ctx.isLoggedIn() ? \u0275\u0275pipeBind1(14, 13, "sign_in_to_use") : null);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(16, 15, "metadata_add"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.categories_().length > 0 ? 18 : 19);
    }
  }, dependencies: [LucideAngularModule, LucideAngularComponent, TranslatePipe], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n}\n.manager-card[_ngcontent-%COMP%] {\n  height: fit-content;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n@media (max-width: 768px) {\n  .manager-card[_ngcontent-%COMP%] {\n    padding: 1rem;\n  }\n}\n.card-icon[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n}\n.card-title[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-block-end: 1rem;\n  padding-block-end: 1rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.card-title[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.125rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n}\n.card-desc[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n.input-group[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n}\n.input-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  flex: 1;\n  padding-inline: 0.75rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  outline: none;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.input-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]::placeholder {\n  color: var(--color-text-muted-light);\n}\n.input-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.list-container[_ngcontent-%COMP%] {\n  margin-block-start: 1.5rem;\n}\n.list-container[_ngcontent-%COMP%]   .list-stack[_ngcontent-%COMP%] {\n  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fit, minmax(150px, auto));\n  gap: 0.5rem;\n}\n.list-container[_ngcontent-%COMP%]   .list-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.75rem 1rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-weight: 600;\n  border: 1px solid transparent;\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.list-container[_ngcontent-%COMP%]   .list-item[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-default);\n}\n.list-container[_ngcontent-%COMP%]   .list-item.group[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 0.5rem;\n}\n.list-container[_ngcontent-%COMP%]   .item-label[_ngcontent-%COMP%] {\n  cursor: default;\n}\n.list-container[_ngcontent-%COMP%]   .item-actions[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  align-self: center;\n  gap: 0.25rem;\n}\n.list-container[_ngcontent-%COMP%]   .inline-edit-input[_ngcontent-%COMP%] {\n  display: block;\n  width: 100%;\n  min-width: 0;\n  padding: 0;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font: inherit;\n  font-weight: 600;\n  border: none;\n  border-radius: var(--radius-xs);\n  outline: none;\n  box-shadow: 0 0 0 1px var(--border-focus);\n  cursor: text;\n}\n.list-container[_ngcontent-%COMP%]   .btn-edit[_ngcontent-%COMP%], \n.list-container[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%] {\n  display: grid;\n  place-content: center;\n  width: 2.25rem;\n  height: 2.25rem;\n  opacity: 0;\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  transition:\n    opacity 0.2s ease,\n    background 0.2s ease,\n    color 0.2s ease,\n    transform 0.2s var(--ease-spring);\n}\n.list-container[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%]:hover {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  transform: scale(1.12) rotate(8deg);\n}\n.list-container[_ngcontent-%COMP%]   .btn-edit[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n}\n.list-container[_ngcontent-%COMP%]   .btn-edit[_ngcontent-%COMP%]:hover {\n  color: var(--color-primary);\n}\n.list-container[_ngcontent-%COMP%]   .list-item[_ngcontent-%COMP%]:hover   .btn-edit[_ngcontent-%COMP%], \n.list-container[_ngcontent-%COMP%]   .list-item[_ngcontent-%COMP%]:hover   .c-icon-btn.danger[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 2rem;\n  color: var(--color-text-muted);\n  border: 1px dashed var(--border-default);\n  border-radius: var(--radius-md);\n  font-style: italic;\n}\n/*# sourceMappingURL=section-category-manager.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SectionCategoryManagerComponent, [{
    type: Component,
    args: [{ selector: "app-section-category-manager", standalone: true, imports: [LucideAngularModule, TranslatePipe], template: `<section class="manager-card">
  <div class="card-title">
    <lucide-icon name="book-open" class="card-icon"></lucide-icon>
    <h2>{{ 'metadata_section_categories_title' | translatePipe }}</h2>
  </div>
  <p class="card-desc">{{ 'metadata_section_categories_desc' | translatePipe }}</p>

  <div class="input-group">
    <input #newInput type="text"
      [placeholder]="'metadata_section_placeholder' | translatePipe"
      (keyup.enter)="onAdd(newInput.value, newInput)">
    <button type="button" class="c-btn-primary" (click)="onAdd(newInput.value, newInput)"
      [disabled]="!isLoggedIn()"
      [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
      {{ 'metadata_add' | translatePipe }}
    </button>
  </div>

  <div class="list-container">
    @if (categories_().length > 0) {
      <div class="list-stack">
        @for (name of categories_(); track name) {
          <div class="list-item group">
            @if (editingName_() === name) {
              <input type="text" class="inline-edit-input"
                [value]="name"
                (blur)="onRenameBlur(name, $any($event.target).value)"
                (keydown.enter)="$any($event.target).blur()"
                autofocus />
            } @else {
              <span class="item-label" (dblclick)="onStartRename(name)">{{ name | translatePipe }}</span>
            }
            <div class="item-actions">
              <button type="button" class="btn-edit" (click)="onStartRename(name)"
                [disabled]="!isLoggedIn()"
                [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
                <lucide-icon name="pencil" [size]="14"></lucide-icon>
              </button>
              <button type="button" class="c-icon-btn danger" (click)="onRemove(name)"
                [disabled]="!isLoggedIn()"
                [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
                <lucide-icon name="trash-2" [size]="16"></lucide-icon>
              </button>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="empty-state">{{ 'metadata_no_section_categories' | translatePipe }}</div>
    }
  </div>
</section>
`, styles: ["/* src/app/pages/metadata-manager/components/section-category-manager/section-category-manager.component.scss */\n:host {\n  display: block;\n}\n.manager-card {\n  height: fit-content;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n@media (max-width: 768px) {\n  .manager-card {\n    padding: 1rem;\n  }\n}\n.card-icon {\n  color: var(--color-primary);\n}\n.card-title {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-block-end: 1rem;\n  padding-block-end: 1rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.card-title h2 {\n  margin: 0;\n  font-size: 1.125rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n}\n.card-desc {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n.input-group {\n  display: flex;\n  gap: 0.5rem;\n}\n.input-group input {\n  flex: 1;\n  padding-inline: 0.75rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  outline: none;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.input-group input::placeholder {\n  color: var(--color-text-muted-light);\n}\n.input-group input:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.list-container {\n  margin-block-start: 1.5rem;\n}\n.list-container .list-stack {\n  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fit, minmax(150px, auto));\n  gap: 0.5rem;\n}\n.list-container .list-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.75rem 1rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-weight: 600;\n  border: 1px solid transparent;\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.list-container .list-item:hover {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-default);\n}\n.list-container .list-item.group {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 0.5rem;\n}\n.list-container .item-label {\n  cursor: default;\n}\n.list-container .item-actions {\n  display: flex;\n  align-items: center;\n  align-self: center;\n  gap: 0.25rem;\n}\n.list-container .inline-edit-input {\n  display: block;\n  width: 100%;\n  min-width: 0;\n  padding: 0;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font: inherit;\n  font-weight: 600;\n  border: none;\n  border-radius: var(--radius-xs);\n  outline: none;\n  box-shadow: 0 0 0 1px var(--border-focus);\n  cursor: text;\n}\n.list-container .btn-edit,\n.list-container .c-icon-btn.danger {\n  display: grid;\n  place-content: center;\n  width: 2.25rem;\n  height: 2.25rem;\n  opacity: 0;\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  transition:\n    opacity 0.2s ease,\n    background 0.2s ease,\n    color 0.2s ease,\n    transform 0.2s var(--ease-spring);\n}\n.list-container .c-icon-btn.danger:hover {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  transform: scale(1.12) rotate(8deg);\n}\n.list-container .btn-edit {\n  color: var(--color-text-muted);\n}\n.list-container .btn-edit:hover {\n  color: var(--color-primary);\n}\n.list-container .list-item:hover .btn-edit,\n.list-container .list-item:hover .c-icon-btn.danger {\n  opacity: 1;\n}\n.empty-state {\n  text-align: center;\n  padding: 2rem;\n  color: var(--color-text-muted);\n  border: 1px dashed var(--border-default);\n  border-radius: var(--radius-md);\n  font-style: italic;\n}\n/*# sourceMappingURL=section-category-manager.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SectionCategoryManagerComponent, { className: "SectionCategoryManagerComponent", filePath: "src/app/pages/metadata-manager/components/section-category-manager/section-category-manager.component.ts", lineNumber: 19 });
})();

// src/app/pages/metadata-manager/metadata-manager.page.component.ts
var _c03 = (a0) => ({ title: "metadata_units_and_conversions_title", icon: "scale", colorClass: "icon-success", items: a0, type: "unit" });
var _c1 = (a0) => ({ title: "metadata_product_categories_title", icon: "tag", colorClass: "icon-primary", items: a0, type: "category" });
var _c2 = (a0) => ({ title: "metadata_global_allergens_title", icon: "alert-triangle", colorClass: "icon-danger", items: a0, type: "allergen" });
var _c3 = (a0) => ({ title: "metadata_recipe_labels_title", icon: "tags", colorClass: "icon-info", items: a0, type: "label" });
var _forTrack02 = ($index, $item) => $item.key;
function MetadataManagerComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 4);
  }
  if (rf & 2) {
    \u0275\u0275property("overlay", true);
  }
}
function MetadataManagerComponent_ng_container_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementContainer(0);
  }
}
function MetadataManagerComponent_ng_container_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementContainer(0);
  }
}
function MetadataManagerComponent_ng_container_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementContainer(0);
  }
}
function MetadataManagerComponent_ng_container_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementContainer(0);
  }
}
function MetadataManagerComponent_Conditional_21_For_2_Conditional_1_For_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 31)(1, "input", 35);
    \u0275\u0275listener("change", function MetadataManagerComponent_Conditional_21_For_2_Conditional_1_For_5_Template_input_change_1_listener() {
      const f_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r4 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r4.toggleMenuTypeField(f_r4.key));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const f_r4 = ctx.$implicit;
    const ctx_r4 = \u0275\u0275nextContext(4);
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r4.isMenuTypeFieldSelected(f_r4.key));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(3, 2, f_r4.labelKey), " ");
  }
}
function MetadataManagerComponent_Conditional_21_For_2_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 28)(1, "span", 29);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 30);
    \u0275\u0275repeaterCreate(4, MetadataManagerComponent_Conditional_21_For_2_Conditional_1_For_5_Template, 4, 4, "label", 31, _forTrack02);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 32)(7, "button", 33);
    \u0275\u0275listener("click", function MetadataManagerComponent_Conditional_21_For_2_Conditional_1_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r4 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r4.onSaveMenuTypeFields());
    });
    \u0275\u0275text(8);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "button", 34);
    \u0275\u0275listener("click", function MetadataManagerComponent_Conditional_21_For_2_Conditional_1_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r4 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r4.onCancelEditMenuType());
    });
    \u0275\u0275text(11);
    \u0275\u0275pipe(12, "translatePipe");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const def_r6 = \u0275\u0275nextContext().$implicit;
    const ctx_r4 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(def_r6.key);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r4.ALL_DISH_FIELDS);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(9, 3, "save"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(12, 5, "cancel"));
  }
}
function MetadataManagerComponent_Conditional_21_For_2_Conditional_2_For_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 43);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275listener("click", function MetadataManagerComponent_Conditional_21_For_2_Conditional_2_For_3_Template_button_click_0_listener() {
      const f_r9 = \u0275\u0275restoreView(_r8).$implicit;
      const def_r6 = \u0275\u0275nextContext(2).$implicit;
      const ctx_r4 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r4.removeFieldFromMenuType(def_r6.key, f_r9));
    });
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const f_r9 = ctx.$implicit;
    const ctx_r4 = \u0275\u0275nextContext(4);
    \u0275\u0275property("disabled", !ctx_r4.isLoggedIn());
    \u0275\u0275attribute("title", !ctx_r4.isLoggedIn() ? \u0275\u0275pipeBind1(1, 3, "sign_in_to_use") : null);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(3, 5, ctx_r4.getDishFieldLabelKey(f_r9)), " ");
  }
}
function MetadataManagerComponent_Conditional_21_For_2_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "input", 36);
    \u0275\u0275listener("blur", function MetadataManagerComponent_Conditional_21_For_2_Conditional_2_Template_input_blur_0_listener($event) {
      \u0275\u0275restoreView(_r7);
      const def_r6 = \u0275\u0275nextContext().$implicit;
      const ctx_r4 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r4.onMenuTypeNameBlur(def_r6.key, $event.target.value));
    })("keydown.enter", function MetadataManagerComponent_Conditional_21_For_2_Conditional_2_Template_input_keydown_enter_0_listener($event) {
      \u0275\u0275restoreView(_r7);
      return \u0275\u0275resetView($event.target.blur());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "div", 37);
    \u0275\u0275repeaterCreate(2, MetadataManagerComponent_Conditional_21_For_2_Conditional_2_For_3_Template, 4, 7, "button", 38, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "button", 39);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275pipe(6, "translatePipe");
    \u0275\u0275listener("click", function MetadataManagerComponent_Conditional_21_For_2_Conditional_2_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r7);
      const def_r6 = \u0275\u0275nextContext().$implicit;
      const ctx_r4 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r4.onEditMenuType(def_r6.key));
    });
    \u0275\u0275element(7, "lucide-icon", 40);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "button", 41);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275pipe(10, "translatePipe");
    \u0275\u0275listener("click", function MetadataManagerComponent_Conditional_21_For_2_Conditional_2_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r7);
      const def_r6 = \u0275\u0275nextContext().$implicit;
      const ctx_r4 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r4.onRemoveMenuType(def_r6.key));
    });
    \u0275\u0275element(11, "lucide-icon", 42);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const def_r6 = \u0275\u0275nextContext().$implicit;
    const ctx_r4 = \u0275\u0275nextContext(2);
    \u0275\u0275property("value", def_r6.key);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(def_r6.fields);
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", !ctx_r4.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(5, 9, "edit"))("title", !ctx_r4.isLoggedIn() ? \u0275\u0275pipeBind1(6, 11, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", !ctx_r4.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(9, 13, "remove"))("title", !ctx_r4.isLoggedIn() ? \u0275\u0275pipeBind1(10, 15, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 16);
  }
}
function MetadataManagerComponent_Conditional_21_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 27);
    \u0275\u0275template(1, MetadataManagerComponent_Conditional_21_For_2_Conditional_1_Template, 13, 7, "div", 28)(2, MetadataManagerComponent_Conditional_21_For_2_Conditional_2_Template, 12, 17);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const def_r6 = ctx.$implicit;
    const ctx_r4 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r4.editingMenuTypeKey_() === def_r6.key ? 1 : 2);
  }
}
function MetadataManagerComponent_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 13);
    \u0275\u0275repeaterCreate(1, MetadataManagerComponent_Conditional_21_For_2_Template, 3, 1, "div", 27, _forTrack02);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r4 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r4.allMenuTypes_());
  }
}
function MetadataManagerComponent_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 14);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "metadata_no_menu_types"));
  }
}
function MetadataManagerComponent_ng_template_62_Conditional_16_For_2_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 52);
  }
  if (rf & 2) {
    const item_r14 = \u0275\u0275nextContext().$implicit;
    const ctx_r4 = \u0275\u0275nextContext(3);
    \u0275\u0275styleProp("background-color", ctx_r4.getLabelColor(item_r14));
  }
}
function MetadataManagerComponent_ng_template_62_Conditional_16_For_2_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 50);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275element(2, "lucide-icon", 53);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275attribute("title", \u0275\u0275pipeBind1(1, 2, "unit_default_unremovable"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
  }
}
function MetadataManagerComponent_ng_template_62_Conditional_16_For_2_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 54);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275listener("click", function MetadataManagerComponent_ng_template_62_Conditional_16_For_2_Conditional_6_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r15);
      const item_r14 = \u0275\u0275nextContext().$implicit;
      const type_r12 = \u0275\u0275nextContext(2).type;
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.onRemoveMetadata(item_r14, type_r12));
    });
    \u0275\u0275element(2, "lucide-icon", 55);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const type_r12 = \u0275\u0275nextContext(3).type;
    const ctx_r4 = \u0275\u0275nextContext();
    \u0275\u0275property("disabled", !ctx_r4.isLoggedIn());
    \u0275\u0275attribute("title", !ctx_r4.isLoggedIn() ? \u0275\u0275pipeBind1(1, 4, "sign_in_to_use") : null);
    \u0275\u0275advance(2);
    \u0275\u0275property("name", type_r12 === "allergen" ? "x" : "trash-2")("size", type_r12 === "allergen" ? 14 : 16);
  }
}
function MetadataManagerComponent_ng_template_62_Conditional_16_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div");
    \u0275\u0275template(1, MetadataManagerComponent_ng_template_62_Conditional_16_For_2_Conditional_1_Template, 1, 2, "span", 49);
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, MetadataManagerComponent_ng_template_62_Conditional_16_For_2_Conditional_5_Template, 3, 4, "span", 50)(6, MetadataManagerComponent_ng_template_62_Conditional_16_For_2_Conditional_6_Template, 3, 6, "button", 51);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r14 = ctx.$implicit;
    const type_r12 = \u0275\u0275nextContext(2).type;
    const ctx_r4 = \u0275\u0275nextContext();
    \u0275\u0275classMap(type_r12 === "allergen" ? "allergen-pill" : type_r12 === "label" ? "label-pill" : "list-item group");
    \u0275\u0275advance();
    \u0275\u0275conditional(type_r12 === "label" ? 1 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 5, item_r14));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(type_r12 === "unit" && ctx_r4.isSystemUnit(item_r14) ? 5 : type_r12 !== "unit" || !ctx_r4.isSystemUnit(item_r14) ? 6 : -1);
  }
}
function MetadataManagerComponent_ng_template_62_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div");
    \u0275\u0275repeaterCreate(1, MetadataManagerComponent_ng_template_62_Conditional_16_For_2_Template, 7, 7, "div", 48, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r15 = \u0275\u0275nextContext();
    const items_r17 = ctx_r15.items;
    const type_r12 = ctx_r15.type;
    \u0275\u0275classMap(type_r12 === "allergen" ? "allergen-pool" : type_r12 === "label" ? "label-pool" : "list-stack");
    \u0275\u0275advance();
    \u0275\u0275repeater(items_r17);
  }
}
function MetadataManagerComponent_ng_template_62_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 14);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const title_r18 = \u0275\u0275nextContext().title;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate3("", \u0275\u0275pipeBind1(2, 3, "metadata_no_items_prefix"), " ", \u0275\u0275pipeBind1(3, 5, title_r18), " ", \u0275\u0275pipeBind1(4, 7, "metadata_no_items_suffix"), "");
  }
}
function MetadataManagerComponent_ng_template_62_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "section", 15)(1, "div", 8);
    \u0275\u0275element(2, "lucide-icon", 44);
    \u0275\u0275elementStart(3, "h2");
    \u0275\u0275text(4);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 45)(7, "input", 46, 2);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275pipe(10, "translatePipe");
    \u0275\u0275listener("keyup.enter", function MetadataManagerComponent_ng_template_62_Template_input_keyup_enter_7_listener() {
      const type_r12 = \u0275\u0275restoreView(_r11).type;
      const newInput_r13 = \u0275\u0275reference(8);
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.onAddMetadata(newInput_r13.value, type_r12, newInput_r13));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 47);
    \u0275\u0275pipe(12, "translatePipe");
    \u0275\u0275listener("click", function MetadataManagerComponent_ng_template_62_Template_button_click_11_listener() {
      const type_r12 = \u0275\u0275restoreView(_r11).type;
      const newInput_r13 = \u0275\u0275reference(8);
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.onAddMetadata(newInput_r13.value, type_r12, newInput_r13));
    });
    \u0275\u0275text(13);
    \u0275\u0275pipe(14, "translatePipe");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 12);
    \u0275\u0275template(16, MetadataManagerComponent_ng_template_62_Conditional_16_Template, 3, 2, "div", 48)(17, MetadataManagerComponent_ng_template_62_Conditional_17_Template, 5, 9, "div", 14);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const title_r18 = ctx.title;
    const icon_r19 = ctx.icon;
    const colorClass_r20 = ctx.colorClass;
    const items_r17 = ctx.items;
    const type_r12 = ctx.type;
    const ctx_r4 = \u0275\u0275nextContext();
    \u0275\u0275attribute("data-type", type_r12);
    \u0275\u0275advance(2);
    \u0275\u0275classMap(colorClass_r20);
    \u0275\u0275property("name", icon_r19);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(5, 10, title_r18));
    \u0275\u0275advance(3);
    \u0275\u0275property("placeholder", \u0275\u0275pipeBind1(9, 12, "add") + " " + \u0275\u0275pipeBind1(10, 14, title_r18) + "...");
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", !ctx_r4.isLoggedIn());
    \u0275\u0275attribute("title", !ctx_r4.isLoggedIn() ? \u0275\u0275pipeBind1(12, 16, "sign_in_to_use") : null);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(14, 18, "add"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275conditional(items_r17.length > 0 ? 16 : 17);
  }
}
var MetadataManagerComponent = class _MetadataManagerComponent {
  unitRegistry = inject(UnitRegistryService);
  metadataRegistry = inject(MetadataRegistryService);
  productData = inject(ProductDataService);
  demoLoader = inject(DemoLoaderService);
  backupService = inject(BackupService);
  confirmModal = inject(ConfirmModalService);
  translationService = inject(TranslationService);
  userMsgService = inject(UserMsgService);
  translationKeyModal = inject(TranslationKeyModalService);
  labelCreationModal = inject(LabelCreationModalService);
  kitchenState = inject(KitchenStateService);
  menuEventData = inject(MenuEventDataService);
  addItemModal = inject(AddItemModalService);
  isLoggedIn = inject(UserService).isLoggedIn;
  authModal = inject(AuthModalService);
  logging = inject(LoggingService);
  /** Returns false if not signed in (shows message and opens sign-in modal). */
  requireSignIn() {
    if (this.isLoggedIn())
      return true;
    this.userMsgService.onSetWarningMsg(this.translationService.translate("sign_in_to_use"));
    this.authModal.open("sign-in");
    return false;
  }
  // SIGNALS
  allUnitKeys_ = this.unitRegistry.allUnitKeys_;
  allAllergens_ = this.metadataRegistry.allAllergens_;
  allCategories_ = this.metadataRegistry.allCategories_;
  allLabels_ = this.metadataRegistry.allLabels_;
  allLabelKeys_ = computed(() => this.allLabels_().map((l) => l.key));
  allMenuTypes_ = this.metadataRegistry.allMenuTypes_;
  isImporting_ = signal(false);
  editingMenuTypeKey_ = signal(null);
  editingMenuTypeFields_ = signal([]);
  ALL_DISH_FIELDS = ALL_DISH_FIELDS;
  DEFAULT_DISH_FIELDS = DEFAULT_DISH_FIELDS;
  getLabelColor(key) {
    return this.metadataRegistry.getLabelColor(key);
  }
  isSystemUnit(unitKey) {
    return unitKey in SYSTEM_UNITS;
  }
  //CREATE
  // addUnit(name: string): void {
  //   if (!name.trim()) return;
  //   this.unitRegistry.registerUnit(name.trim(), 1);
  // }
  onAddLabel() {
    return __async(this, null, function* () {
      const result = yield this.labelCreationModal.open();
      if (!result?.key || !result?.hebrewLabel)
        return;
      try {
        this.translationService.updateDictionary(result.key, result.hebrewLabel);
        yield this.metadataRegistry.registerLabel(result.key, result.color, result.autoTriggers);
        this.userMsgService.onSetSuccessMsg("\u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E0\u05E9\u05DE\u05E8\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");
      } catch (err) {
        this.logging.error({ event: "metadata.sync_error", message: "Metadata sync error (add label)", context: { err } });
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E1\u05E0\u05DB\u05E8\u05D5\u05DF \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD");
      }
    });
  }
  onAddMetadata(hebrewLabel, type, inputElement) {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      if (type === "label") {
        yield this.onAddLabel();
        return;
      }
      const sanitizedHebrew = hebrewLabel.trim();
      if (!sanitizedHebrew)
        return;
      const currentIds = this.getRegistryByType(type);
      const existingLabels = currentIds.map((id) => this.translationService.translate(id));
      if (existingLabels.includes(sanitizedHebrew)) {
        this.userMsgService.onSetErrorMsg(`\u05D4\u05E2\u05E8\u05DA "${sanitizedHebrew}" \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD \u05D1\u05E8\u05E9\u05D9\u05DE\u05D4 \u05D4\u05D6\u05D5.`);
        return;
      }
      const contextMap = { category: "category", allergen: "allergen", unit: "unit" };
      const result = yield this.translationKeyModal.open(sanitizedHebrew, contextMap[type]);
      if (!isTranslationKeyResult(result))
        return;
      const sanitizedKey = result.englishKey;
      try {
        this.translationService.updateDictionary(sanitizedKey, result.hebrewLabel);
        if (type === "category") {
          yield this.metadataRegistry.registerCategory(result.hebrewLabel);
        } else {
          yield this.registerInService(sanitizedKey, type);
        }
        inputElement.value = "";
        this.userMsgService.onSetSuccessMsg("\u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E0\u05E9\u05DE\u05E8\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");
      } catch (err) {
        this.logging.error({ event: "metadata.sync_error", message: "Metadata sync error (add metadata)", context: { err } });
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E1\u05E0\u05DB\u05E8\u05D5\u05DF \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD");
      }
    });
  }
  // addAllergen(name: string): void {
  //   if (name.trim()) {
  //     this.metadataRegistry.registerAllergen(name.trim());
  //   }
  // }
  //DELETE
  onRemoveMetadata(item, type) {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const allProducts = this.productData.allProducts_();
      let isUsed = false;
      switch (type) {
        case "unit":
          isUsed = allProducts.some((p) => p.base_unit_ === item || p.purchase_options_?.some((opt) => opt.unit_symbol_ === item));
          break;
        case "allergen":
          isUsed = allProducts.some((p) => p.allergens_?.includes(item));
          break;
        case "category":
          isUsed = allProducts.some((p) => (p.categories_ ?? []).includes(item));
          break;
        case "label": {
          const recipes = this.kitchenState.recipes_();
          isUsed = recipes.some((r) => (r.labels_ ?? []).includes(item) || (r.autoLabels_ ?? []).includes(item));
          break;
        }
      }
      if (isUsed) {
        const typeNames = {
          unit: "\u05D4\u05D9\u05D7\u05D9\u05D3\u05D4",
          allergen: "\u05D4\u05D0\u05DC\u05E8\u05D2\u05DF",
          category: "\u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4",
          label: "\u05D4\u05EA\u05D5\u05D5\u05D9\u05EA"
        };
        const where = type === "label" ? "\u05D1\u05DE\u05EA\u05DB\u05D5\u05E0\u05D9\u05DD" : "\u05D1\u05DE\u05DC\u05D0\u05D9";
        this.userMsgService.onSetErrorMsg(`\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05DE\u05D7\u05D5\u05E7 \u05D0\u05EA ${typeNames[type]} "${this.translationService.translate(item)}" - \u05D4\u05D9\u05D0 \u05E0\u05DE\u05E6\u05D0\u05EA \u05D1\u05E9\u05D9\u05DE\u05D5\u05E9 ${where}`);
        return;
      }
      try {
        switch (type) {
          case "unit":
            yield this.unitRegistry.deleteUnit(item);
            break;
          case "allergen":
            yield this.metadataRegistry.deleteAllergen(item);
            break;
          case "category":
            yield this.metadataRegistry.deleteCategory(item);
            break;
          case "label":
            yield this.metadataRegistry.deleteLabel(item);
            break;
        }
        this.userMsgService.onSetSuccessMsg("\u05D4\u05DE\u05D7\u05D9\u05E7\u05D4 \u05D1\u05D5\u05E6\u05E2\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");
      } catch (err) {
        this.logging.error({ event: "crud.metadata.delete_error", message: `Failed to delete ${type}`, context: { err } });
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D1\u05D9\u05E6\u05D5\u05E2 \u05D4\u05DE\u05D7\u05D9\u05E7\u05D4 \u05DE\u05D5\u05DC \u05D4\u05E9\u05E8\u05EA");
      }
    });
  }
  //HELPERS
  registerInService(key, type) {
    return __async(this, null, function* () {
      switch (type) {
        case "unit":
          yield this.unitRegistry.registerUnit(key, 1);
          break;
        case "allergen":
          yield this.metadataRegistry.registerAllergen(key);
          break;
        case "category":
          yield this.metadataRegistry.registerCategory(key);
          break;
        case "label":
          yield this.metadataRegistry.registerLabel(key, this.metadataRegistry.getLabelColor(key) || "#78716C", []);
          break;
      }
    });
  }
  getRegistryByType(type) {
    switch (type) {
      case "unit":
        return this.allUnitKeys_();
      case "allergen":
        return this.allAllergens_();
      case "category":
        return this.allCategories_();
      case "label":
        return this.allLabelKeys_();
      default:
        return [];
    }
  }
  onLoadDemoData() {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const message = this.translationService.translate("load_demo_data_confirm");
      const confirmed = yield this.confirmModal.open(message, { variant: "warning", saveLabel: "load_demo_data" });
      if (!confirmed)
        return;
      this.isImporting_.set(true);
      try {
        yield this.demoLoader.loadDemoData();
      } finally {
        this.isImporting_.set(false);
      }
    });
  }
  onExportBackup() {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      yield this.backupService.exportAllToFile();
    });
  }
  onRestoreFromBackup() {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const message = this.translationService.translate("backup_restore_confirm");
      const confirmed = yield this.confirmModal.open(message, { variant: "warning", saveLabel: "backup_restore_from_backup" });
      if (!confirmed)
        return;
      this.isImporting_.set(true);
      try {
        yield this.backupService.restoreFromBackup();
      } finally {
        this.isImporting_.set(false);
      }
    });
  }
  onImportBackupFile(event) {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const input2 = event.target;
      const file = input2.files?.[0];
      if (!file)
        return;
      const message = this.translationService.translate("backup_import_confirm");
      const confirmed = yield this.confirmModal.open(message, { variant: "warning", saveLabel: "backup_import" });
      if (!confirmed) {
        input2.value = "";
        return;
      }
      this.isImporting_.set(true);
      try {
        yield this.backupService.importFromFile(file);
      } finally {
        this.isImporting_.set(false);
        input2.value = "";
      }
    });
  }
  // Menu Types
  onAddMenuType() {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const result = yield this.addItemModal.open({
        title: "add_new_category",
        label: "menu_serving_style",
        placeholder: "menu_serving_style",
        saveLabel: "save"
      });
      if (result?.trim()) {
        const key = result.trim();
        if (this.allMenuTypes_().some((t) => t.key === key)) {
          this.userMsgService.onSetErrorMsg(`\u05E1\u05D5\u05D2 \u05EA\u05E4\u05E8\u05D9\u05D8 "${key}" \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD`);
          return;
        }
        yield this.metadataRegistry.registerMenuType({ key, fields: [...DEFAULT_DISH_FIELDS] });
      }
    });
  }
  onEditMenuType(key) {
    if (!this.requireSignIn())
      return;
    this.editingMenuTypeKey_.set(key);
    this.editingMenuTypeFields_.set([...this.metadataRegistry.getMenuTypeFields(key)]);
  }
  toggleMenuTypeField(fieldKey) {
    this.editingMenuTypeFields_.update((fields) => {
      const has = fields.includes(fieldKey);
      if (has)
        return fields.filter((f) => f !== fieldKey);
      return [...fields, fieldKey];
    });
  }
  isMenuTypeFieldSelected(fieldKey) {
    return this.editingMenuTypeFields_().includes(fieldKey);
  }
  getDishFieldLabelKey(fieldKey) {
    return ALL_DISH_FIELDS.find((f) => f.key === fieldKey)?.labelKey ?? fieldKey;
  }
  onSaveMenuTypeFields() {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const key = this.editingMenuTypeKey_();
      if (!key)
        return;
      yield this.metadataRegistry.updateMenuType(key, this.editingMenuTypeFields_());
      this.editingMenuTypeKey_.set(null);
      this.editingMenuTypeFields_.set([]);
    });
  }
  onCancelEditMenuType() {
    this.editingMenuTypeKey_.set(null);
    this.editingMenuTypeFields_.set([]);
  }
  onRemoveMenuType(key) {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const isUsed = this.menuEventData.allMenuEvents_().some((e) => e.serving_type_ === key);
      if (isUsed) {
        this.userMsgService.onSetErrorMsg(`\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05DE\u05D7\u05D5\u05E7: \u05E1\u05D5\u05D2 \u05D4\u05EA\u05E4\u05E8\u05D9\u05D8 "${key}" \u05D1\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05EA\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05E9\u05DE\u05D5\u05E8\u05D9\u05DD`);
        return;
      }
      yield this.metadataRegistry.deleteMenuType(key);
    });
  }
  onMenuTypeNameBlur(oldKey, newName) {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const trimmed = (newName ?? "").trim();
      if (trimmed === oldKey || !trimmed)
        return;
      const msg = this.translationService.translate("menu_type_rename_confirm");
      const confirmed = yield this.confirmModal.open(msg, { saveLabel: "save" });
      if (!confirmed)
        return;
      yield this.metadataRegistry.renameMenuType(oldKey, trimmed);
      yield this.menuEventData.updateServingTypeForAll(oldKey, trimmed);
    });
  }
  removeFieldFromMenuType(key, fieldKey) {
    return __async(this, null, function* () {
      if (!this.requireSignIn())
        return;
      const current = this.metadataRegistry.getMenuTypeFields(key);
      const updated = current.filter((f) => f !== fieldKey);
      yield this.metadataRegistry.updateMenuType(key, updated);
    });
  }
  static \u0275fac = function MetadataManagerComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MetadataManagerComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _MetadataManagerComponent, selectors: [["app-metadata-manager"]], decls: 64, vars: 58, consts: [["fileInputRef", ""], ["managerCard", ""], ["newInput", ""], ["dir", "rtl", 1, "metadata-page"], ["size", "large", "label", "loader_cooking_up", 3, "overlay"], [1, "admin-grid"], [4, "ngTemplateOutlet", "ngTemplateOutletContext"], [1, "manager-card", "menu-types-card"], [1, "card-title"], ["name", "utensils-crossed", 1, "icon-primary"], [1, "card-desc"], ["type", "button", 1, "c-btn-primary", 3, "click", "disabled"], [1, "list-container"], [1, "list-stack"], [1, "empty-state"], [1, "manager-card"], ["name", "package", 1, "icon-warning"], [1, "card-actions"], ["type", "button", 1, "btn-demo", 3, "click"], ["name", "archive", 1, "icon-accent"], ["type", "button", 1, "btn-backup", "btn-export", 3, "click"], ["name", "download", 3, "size"], ["type", "button", 1, "btn-backup", "btn-restore", 3, "click"], ["name", "rotate-ccw", 3, "size"], ["type", "button", 1, "btn-backup", "btn-import", 3, "click"], ["name", "upload", 3, "size"], ["type", "file", "accept", ".json,application/json", 1, "backup-file-input", 3, "change"], [1, "list-item", "group", "menu-type-row"], [1, "menu-type-edit"], [1, "menu-type-key"], [1, "field-checkboxes"], [1, "field-check"], [1, "edit-actions"], ["type", "button", 1, "c-btn-primary", 3, "click"], ["type", "button", 1, "c-btn-ghost--sm", 3, "click"], ["type", "checkbox", 3, "change", "checked"], ["type", "text", 1, "menu-type-key-input", 3, "blur", "keydown.enter", "value"], [1, "field-pills"], ["type", "button", 1, "field-pill", "field-pill-removable", 3, "disabled"], ["type", "button", 1, "btn-edit", 3, "click", "disabled"], ["name", "pencil", 3, "size"], ["type", "button", 1, "c-icon-btn", "danger", 3, "click", "disabled"], ["name", "trash-2", 3, "size"], ["type", "button", 1, "field-pill", "field-pill-removable", 3, "click", "disabled"], [3, "name"], [1, "input-group"], ["type", "text", 3, "keyup.enter", "placeholder"], [1, "c-btn-primary", 3, "click", "disabled"], [3, "class"], [1, "label-color-dot", 3, "background-color"], ["aria-label", "default unit", 1, "unit-default-badge"], [1, "c-icon-btn", "danger", 3, "disabled"], [1, "label-color-dot"], ["name", "lock", 3, "size"], [1, "c-icon-btn", "danger", 3, "click", "disabled"], [3, "name", "size"]], template: function MetadataManagerComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "div", 3);
      \u0275\u0275template(1, MetadataManagerComponent_Conditional_1_Template, 1, 1, "app-loader", 4);
      \u0275\u0275elementStart(2, "div", 5);
      \u0275\u0275template(3, MetadataManagerComponent_ng_container_3_Template, 1, 0, "ng-container", 6)(4, MetadataManagerComponent_ng_container_4_Template, 1, 0, "ng-container", 6)(5, MetadataManagerComponent_ng_container_5_Template, 1, 0, "ng-container", 6)(6, MetadataManagerComponent_ng_container_6_Template, 1, 0, "ng-container", 6);
      \u0275\u0275elementStart(7, "section", 7)(8, "div", 8);
      \u0275\u0275element(9, "lucide-icon", 9);
      \u0275\u0275elementStart(10, "h2");
      \u0275\u0275text(11);
      \u0275\u0275pipe(12, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(13, "p", 10);
      \u0275\u0275text(14);
      \u0275\u0275pipe(15, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(16, "button", 11);
      \u0275\u0275pipe(17, "translatePipe");
      \u0275\u0275listener("click", function MetadataManagerComponent_Template_button_click_16_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onAddMenuType());
      });
      \u0275\u0275text(18);
      \u0275\u0275pipe(19, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(20, "div", 12);
      \u0275\u0275template(21, MetadataManagerComponent_Conditional_21_Template, 3, 0, "div", 13)(22, MetadataManagerComponent_Conditional_22_Template, 3, 3, "div", 14);
      \u0275\u0275elementEnd()();
      \u0275\u0275element(23, "app-preparation-category-manager")(24, "app-section-category-manager");
      \u0275\u0275elementStart(25, "section", 15)(26, "div", 8);
      \u0275\u0275element(27, "lucide-icon", 16);
      \u0275\u0275elementStart(28, "h2");
      \u0275\u0275text(29);
      \u0275\u0275pipe(30, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(31, "p", 10);
      \u0275\u0275text(32);
      \u0275\u0275pipe(33, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(34, "div", 17)(35, "button", 18);
      \u0275\u0275listener("click", function MetadataManagerComponent_Template_button_click_35_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onLoadDemoData());
      });
      \u0275\u0275text(36);
      \u0275\u0275pipe(37, "translatePipe");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(38, "section", 15)(39, "div", 8);
      \u0275\u0275element(40, "lucide-icon", 19);
      \u0275\u0275elementStart(41, "h2");
      \u0275\u0275text(42);
      \u0275\u0275pipe(43, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(44, "p", 10);
      \u0275\u0275text(45);
      \u0275\u0275pipe(46, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(47, "div", 17)(48, "button", 20);
      \u0275\u0275listener("click", function MetadataManagerComponent_Template_button_click_48_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onExportBackup());
      });
      \u0275\u0275element(49, "lucide-icon", 21);
      \u0275\u0275text(50);
      \u0275\u0275pipe(51, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(52, "button", 22);
      \u0275\u0275listener("click", function MetadataManagerComponent_Template_button_click_52_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onRestoreFromBackup());
      });
      \u0275\u0275element(53, "lucide-icon", 23);
      \u0275\u0275text(54);
      \u0275\u0275pipe(55, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(56, "button", 24);
      \u0275\u0275listener("click", function MetadataManagerComponent_Template_button_click_56_listener() {
        \u0275\u0275restoreView(_r1);
        const fileInputRef_r10 = \u0275\u0275reference(61);
        return \u0275\u0275resetView(fileInputRef_r10.click());
      });
      \u0275\u0275element(57, "lucide-icon", 25);
      \u0275\u0275text(58);
      \u0275\u0275pipe(59, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(60, "input", 26, 0);
      \u0275\u0275listener("change", function MetadataManagerComponent_Template_input_change_60_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onImportBackupFile($event));
      });
      \u0275\u0275elementEnd()()()()();
      \u0275\u0275template(62, MetadataManagerComponent_ng_template_62_Template, 18, 20, "ng-template", null, 1, \u0275\u0275templateRefExtractor);
    }
    if (rf & 2) {
      const managerCard_r21 = \u0275\u0275reference(63);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.isImporting_() ? 1 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275property("ngTemplateOutlet", managerCard_r21)("ngTemplateOutletContext", \u0275\u0275pureFunction1(50, _c03, ctx.allUnitKeys_()));
      \u0275\u0275advance();
      \u0275\u0275property("ngTemplateOutlet", managerCard_r21)("ngTemplateOutletContext", \u0275\u0275pureFunction1(52, _c1, ctx.allCategories_()));
      \u0275\u0275advance();
      \u0275\u0275property("ngTemplateOutlet", managerCard_r21)("ngTemplateOutletContext", \u0275\u0275pureFunction1(54, _c2, ctx.allAllergens_()));
      \u0275\u0275advance();
      \u0275\u0275property("ngTemplateOutlet", managerCard_r21)("ngTemplateOutletContext", \u0275\u0275pureFunction1(56, _c3, ctx.allLabelKeys_()));
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(12, 26, "metadata_menu_types_title"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(15, 28, "metadata_menu_types_desc"));
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", !ctx.isLoggedIn());
      \u0275\u0275attribute("title", !ctx.isLoggedIn() ? \u0275\u0275pipeBind1(17, 30, "sign_in_to_use") : null);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(19, 32, "metadata_add_menu_type"));
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.allMenuTypes_().length > 0 ? 21 : 22);
      \u0275\u0275advance(8);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(30, 34, "load_demo_data"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(33, 36, "metadata_demo_data_desc"));
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(37, 38, "load_demo_data"), " ");
      \u0275\u0275advance(6);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(43, 40, "backup_restore"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(46, 42, "backup_restore_desc"));
      \u0275\u0275advance(4);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(51, 44, "backup_export"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(55, 46, "backup_restore_from_backup"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(59, 48, "backup_import"), " ");
    }
  }, dependencies: [CommonModule, NgTemplateOutlet, FormsModule, LucideAngularModule, LucideAngularComponent, TranslatePipe, LoaderComponent, PreparationCategoryManagerComponent, SectionCategoryManagerComponent], styles: ['\n\n.metadata-page[_ngcontent-%COMP%] {\n  position: relative;\n  min-height: 100vh;\n  min-height: 100dvh;\n  padding: 1.5rem;\n  background: transparent;\n  font-family: "Heebo", sans-serif;\n}\n.metadata-page[_ngcontent-%COMP%]   .header-section[_ngcontent-%COMP%] {\n  margin-block-end: 2.5rem;\n  padding-block-end: 1.5rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.metadata-page[_ngcontent-%COMP%]   .header-section[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.875rem;\n  font-weight: 900;\n  color: var(--color-text-main);\n}\n.metadata-page[_ngcontent-%COMP%]   .header-section[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin-top: 0.5rem;\n  color: var(--color-text-muted);\n}\n.metadata-page[_ngcontent-%COMP%]   .admin-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fit, minmax(335px, 1fr));\n  place-content: center;\n  gap: 2rem;\n}\n@media (max-width: 900px) {\n  .metadata-page[_ngcontent-%COMP%]   .admin-grid[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n    max-width: 28rem;\n    margin-inline: auto;\n  }\n}\n.manager-card[_ngcontent-%COMP%] {\n  height: fit-content;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.manager-card[_ngcontent-%COMP%]   .card-title[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-block-end: 1.5rem;\n  padding-block-end: 1rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.manager-card[_ngcontent-%COMP%]   .card-title[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.125rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n}\n.manager-card[_ngcontent-%COMP%]   .card-desc[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n.manager-card[_ngcontent-%COMP%]   .card-actions[_ngcontent-%COMP%] {\n  display: flex;\n  position: relative;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n}\n@media (max-width: 768px) {\n  .manager-card[_ngcontent-%COMP%] {\n    padding: 1rem;\n  }\n}\n.list-container[_ngcontent-%COMP%] {\n  margin-top: 1.5rem;\n}\n.list-container[_ngcontent-%COMP%]   .list-stack[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.list-container[_ngcontent-%COMP%]   .label-color-dot[_ngcontent-%COMP%] {\n  width: 0.75rem;\n  height: 0.75rem;\n  border-radius: 50%;\n  flex-shrink: 0;\n  margin-inline-end: 0.5rem;\n}\n.list-container[_ngcontent-%COMP%]   .list-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.75rem 1rem;\n  background: var(--bg-glass);\n  border-radius: var(--radius-md);\n  font-weight: 600;\n  color: var(--color-text-main);\n  border: 1px solid transparent;\n  backdrop-filter: var(--blur-glass);\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.list-container[_ngcontent-%COMP%]   .list-item[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-default);\n}\n.list-container[_ngcontent-%COMP%]   .list-item.group[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 0.625rem;\n}\n.list-container[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%] {\n  opacity: 0;\n  transition:\n    opacity 0.2s ease,\n    background 0.2s ease,\n    color 0.2s ease,\n    transform 0.2s var(--ease-spring);\n}\n.list-container[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%]:hover {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  transform: scale(1.12) rotate(8deg);\n}\n.list-container[_ngcontent-%COMP%]   .list-item[_ngcontent-%COMP%]:hover   .c-icon-btn.danger[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.list-container[_ngcontent-%COMP%]   .unit-default-badge[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 1.875rem;\n  height: 1.875rem;\n  color: var(--color-text-muted);\n  cursor: default;\n}\n.list-container[_ngcontent-%COMP%]   .unit-default-badge[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-muted);\n}\n.menu-types-card[_ngcontent-%COMP%]   .menu-type-row[_ngcontent-%COMP%] {\n  grid-template-columns: 1fr auto auto;\n  grid-template-rows: auto auto;\n  align-items: center;\n  gap: 0.25rem 0.5rem;\n}\n.menu-types-card[_ngcontent-%COMP%]   .menu-type-row[_ngcontent-%COMP%]   .menu-type-key-input[_ngcontent-%COMP%] {\n  grid-column: 1;\n  grid-row: 1;\n}\n.menu-types-card[_ngcontent-%COMP%]   .menu-type-row[_ngcontent-%COMP%]   .field-pills[_ngcontent-%COMP%] {\n  grid-column: 1;\n  grid-row: 2;\n  padding-block-end: 0.25rem;\n}\n.menu-types-card[_ngcontent-%COMP%]   .menu-type-row[_ngcontent-%COMP%]   .btn-edit[_ngcontent-%COMP%] {\n  grid-column: 2;\n  grid-row: 1/3;\n  align-self: center;\n}\n.menu-types-card[_ngcontent-%COMP%]   .menu-type-row[_ngcontent-%COMP%]    > .c-icon-btn.danger[_ngcontent-%COMP%] {\n  grid-column: 3;\n  grid-row: 1/3;\n  align-self: center;\n}\n.menu-types-card[_ngcontent-%COMP%]   .menu-type-key[_ngcontent-%COMP%], \n.menu-types-card[_ngcontent-%COMP%]   .menu-type-key-input[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: var(--color-text-main);\n}\n.menu-types-card[_ngcontent-%COMP%]   .menu-type-key-input[_ngcontent-%COMP%] {\n  display: block;\n  width: 100%;\n  min-width: 0;\n  padding: 0;\n  background: transparent;\n  border: none;\n  border-radius: var(--radius-xs);\n  outline: none;\n  font: inherit;\n  cursor: text;\n}\n.menu-types-card[_ngcontent-%COMP%]   .menu-type-key-input[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass);\n}\n.menu-types-card[_ngcontent-%COMP%]   .menu-type-key-input[_ngcontent-%COMP%]:focus {\n  background: var(--bg-glass);\n  box-shadow: 0 0 0 1px var(--border-focus);\n}\n.menu-types-card[_ngcontent-%COMP%]   .field-pills[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.35rem;\n}\n.menu-types-card[_ngcontent-%COMP%]   .field-pill[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  padding: 0.2rem 0.5rem;\n  background: var(--color-primary-soft);\n  color: var(--color-primary);\n  border-radius: var(--radius-full);\n  font-weight: 500;\n}\n.menu-types-card[_ngcontent-%COMP%]   .field-pill-removable[_ngcontent-%COMP%] {\n  border: none;\n  cursor: pointer;\n  transition: background 0.2s ease, color 0.2s ease;\n}\n.menu-types-card[_ngcontent-%COMP%]   .field-pill-removable[_ngcontent-%COMP%]:hover {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n}\n.menu-types-card[_ngcontent-%COMP%]   .menu-type-edit[_ngcontent-%COMP%] {\n  grid-column: 1/-1;\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n  padding: 0.5rem 0;\n}\n.menu-types-card[_ngcontent-%COMP%]   .field-checkboxes[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem 1rem;\n}\n.menu-types-card[_ngcontent-%COMP%]   .field-check[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.35rem;\n  font-size: 0.875rem;\n  font-weight: 500;\n  cursor: pointer;\n  color: var(--color-text-secondary);\n}\n.menu-types-card[_ngcontent-%COMP%]   .edit-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n}\n.menu-types-card[_ngcontent-%COMP%]   .btn-save-small[_ngcontent-%COMP%] {\n  padding: 0.35rem 0.75rem;\n  font-size: 0.875rem;\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  font-weight: 600;\n}\n.menu-types-card[_ngcontent-%COMP%]   .btn-save-small[_ngcontent-%COMP%] {\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  border: none;\n}\n.menu-types-card[_ngcontent-%COMP%]   .btn-edit[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 4px;\n  background: transparent;\n  color: var(--color-text-muted);\n  border: none;\n  opacity: 0;\n  cursor: pointer;\n  transition: opacity 0.2s ease;\n}\n.menu-types-card[_ngcontent-%COMP%]   .btn-edit[_ngcontent-%COMP%]:hover {\n  color: var(--color-primary);\n}\n.menu-types-card[_ngcontent-%COMP%]   .menu-type-row[_ngcontent-%COMP%]:hover   .btn-edit[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.manager-card[data-type=unit][_ngcontent-%COMP%]   .list-stack[_ngcontent-%COMP%] {\n  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fit, minmax(115px, auto));\n}\n.manager-card[data-type=unit][_ngcontent-%COMP%]   .list-item.group[_ngcontent-%COMP%] {\n  grid-template-columns: 1fr auto;\n  gap: 0.625rem;\n}\n.manager-card[data-type=category][_ngcontent-%COMP%]   .list-stack[_ngcontent-%COMP%] {\n  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fit, minmax(115px, auto));\n}\n.manager-card[data-type=category][_ngcontent-%COMP%]   .list-item.group[_ngcontent-%COMP%] {\n  grid-template-columns: 1fr auto;\n  gap: 0.625rem;\n}\n.allergen-pool[_ngcontent-%COMP%], \n.label-pool[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  place-content: center;\n  gap: 0.5rem;\n}\n.allergen-pool[_ngcontent-%COMP%]   .allergen-pill[_ngcontent-%COMP%], \n.allergen-pool[_ngcontent-%COMP%]   .label-pill[_ngcontent-%COMP%], \n.label-pool[_ngcontent-%COMP%]   .allergen-pill[_ngcontent-%COMP%], \n.label-pool[_ngcontent-%COMP%]   .label-pill[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.25rem 0.75rem;\n  background: rgba(254, 226, 226, 0.5);\n  color: #9f1239;\n  border: 1px solid rgba(254, 205, 213, 0.6);\n  border-radius: var(--radius-full);\n  font-size: 0.875rem;\n  font-weight: 600;\n  backdrop-filter: var(--blur-glass);\n}\n.allergen-pool[_ngcontent-%COMP%]   .allergen-pill[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%], \n.allergen-pool[_ngcontent-%COMP%]   .label-pill[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%], \n.label-pool[_ngcontent-%COMP%]   .allergen-pill[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%], \n.label-pool[_ngcontent-%COMP%]   .label-pill[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.allergen-pool[_ngcontent-%COMP%]   .label-pill[_ngcontent-%COMP%], \n.label-pool[_ngcontent-%COMP%]   .label-pill[_ngcontent-%COMP%] {\n  background: var(--bg-glass-strong);\n  color: var(--color-text-main);\n  border: 1px solid var(--border-default);\n}\n.allergen-pool[_ngcontent-%COMP%]   .label-pill[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%], \n.label-pool[_ngcontent-%COMP%]   .label-pill[_ngcontent-%COMP%]   .c-icon-btn.danger[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n}\n.icon-primary[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n}\n.icon-success[_ngcontent-%COMP%] {\n  color: var(--color-success);\n}\n.icon-danger[_ngcontent-%COMP%] {\n  color: var(--color-danger);\n}\n.icon-warning[_ngcontent-%COMP%] {\n  color: var(--text-warning);\n}\n.icon-info[_ngcontent-%COMP%] {\n  color: var(--color-info, #0ea5e9);\n}\n.icon-accent[_ngcontent-%COMP%] {\n  color: var(--color-accent, #8b5cf6);\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 2rem;\n  color: var(--color-text-muted);\n  border: 1px dashed var(--border-default);\n  border-radius: var(--radius-md);\n  font-style: italic;\n}\n.input-group[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n}\n.input-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  flex: 1;\n  padding-inline: 0.75rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  outline: none;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.input-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]::placeholder {\n  color: var(--color-text-muted-light);\n}\n.input-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.manager-card[_ngcontent-%COMP%]   .btn-demo[_ngcontent-%COMP%] {\n  padding-inline: 1.25rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--text-warning);\n  font-weight: 600;\n  font-size: 0.875rem;\n  border: 1px solid var(--border-warning);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.manager-card[_ngcontent-%COMP%]   .btn-demo[_ngcontent-%COMP%]:hover {\n  background: var(--bg-warning);\n  border-color: var(--border-warning);\n}\n.manager-card[_ngcontent-%COMP%]   .btn-backup[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding-inline: 1rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  font-weight: 600;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.manager-card[_ngcontent-%COMP%]   .btn-backup[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-focus);\n}\n.manager-card[_ngcontent-%COMP%]   .btn-export[_ngcontent-%COMP%] {\n  border-color: var(--color-primary);\n  color: var(--color-primary);\n}\n.manager-card[_ngcontent-%COMP%]   .btn-export[_ngcontent-%COMP%]:hover {\n  background: var(--color-primary-soft);\n}\n.manager-card[_ngcontent-%COMP%]   .btn-restore[_ngcontent-%COMP%]:hover, \n.manager-card[_ngcontent-%COMP%]   .btn-import[_ngcontent-%COMP%]:hover {\n  border-color: var(--color-text-muted);\n}\n.manager-card[_ngcontent-%COMP%]   .backup-file-input[_ngcontent-%COMP%] {\n  position: absolute;\n  width: 0;\n  height: 0;\n  opacity: 0;\n  pointer-events: none;\n}\n/*# sourceMappingURL=metadata-manager.page.component.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MetadataManagerComponent, [{
    type: Component,
    args: [{ selector: "app-metadata-manager", standalone: true, imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, PreparationCategoryManagerComponent, SectionCategoryManagerComponent], template: `<div class="metadata-page" dir="rtl">
  @if (isImporting_()) {
    <app-loader size="large" label="loader_cooking_up" [overlay]="true" />
  }
  <div class="admin-grid">
    <ng-container *ngTemplateOutlet="managerCard; context: { 
      title: 'metadata_units_and_conversions_title', 
      icon: 'scale', 
      colorClass: 'icon-success',
      items: allUnitKeys_(),
      type: 'unit'
    }"></ng-container>

    <ng-container *ngTemplateOutlet="managerCard; context: { 
      title: 'metadata_product_categories_title', 
      icon: 'tag', 
      colorClass: 'icon-primary',
      items: allCategories_(),
      type: 'category'
    }"></ng-container>

    <ng-container *ngTemplateOutlet="managerCard; context: { 
      title: 'metadata_global_allergens_title', 
      icon: 'alert-triangle', 
      colorClass: 'icon-danger',
      items: allAllergens_(),
      type: 'allergen'
    }"></ng-container>

    <ng-container *ngTemplateOutlet="managerCard; context: { 
      title: 'metadata_recipe_labels_title', 
      icon: 'tags', 
      colorClass: 'icon-info',
      items: allLabelKeys_(),
      type: 'label'
    }"></ng-container>

    <section class="manager-card menu-types-card">
      <div class="card-title">
        <lucide-icon name="utensils-crossed" class="icon-primary"></lucide-icon>
        <h2>{{ 'metadata_menu_types_title' | translatePipe }}</h2>
      </div>
      <p class="card-desc">{{ 'metadata_menu_types_desc' | translatePipe }}</p>
      <button type="button" class="c-btn-primary" (click)="onAddMenuType()"
        [disabled]="!isLoggedIn()"
        [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">{{ 'metadata_add_menu_type' | translatePipe }}</button>
      <div class="list-container">
        @if (allMenuTypes_().length > 0) {
          <div class="list-stack">
            @for (def of allMenuTypes_(); track def.key) {
              <div class="list-item group menu-type-row">
                @if (editingMenuTypeKey_() === def.key) {
                  <div class="menu-type-edit">
                    <span class="menu-type-key">{{ def.key }}</span>
                    <div class="field-checkboxes">
                      @for (f of ALL_DISH_FIELDS; track f.key) {
                        <label class="field-check">
                          <input type="checkbox" [checked]="isMenuTypeFieldSelected(f.key)" (change)="toggleMenuTypeField(f.key)">
                          {{ f.labelKey | translatePipe }}
                        </label>
                      }
                    </div>
                    <div class="edit-actions">
                      <button type="button" class="c-btn-primary" (click)="onSaveMenuTypeFields()">{{ 'save' | translatePipe }}</button>
                      <button type="button" class="c-btn-ghost--sm" (click)="onCancelEditMenuType()">{{ 'cancel' | translatePipe }}</button>
                    </div>
                  </div>
                } @else {
                  <input type="text" class="menu-type-key-input" [value]="def.key"
                    (blur)="onMenuTypeNameBlur(def.key, $any($event.target).value)"
                    (keydown.enter)="$any($event.target).blur()" />
                  <div class="field-pills">
                    @for (f of def.fields; track f) {
                      <button type="button" class="field-pill field-pill-removable"
                        (click)="removeFieldFromMenuType(def.key, f)"
                        [disabled]="!isLoggedIn()"
                        [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
                        {{ getDishFieldLabelKey(f) | translatePipe }}
                      </button>
                    }
                  </div>
                  <button type="button" class="btn-edit" (click)="onEditMenuType(def.key)"
                    [attr.aria-label]="'edit' | translatePipe"
                    [disabled]="!isLoggedIn()"
                    [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
                    <lucide-icon name="pencil" [size]="14"></lucide-icon>
                  </button>
                  <button type="button" class="c-icon-btn danger" (click)="onRemoveMenuType(def.key)"
                    [attr.aria-label]="'remove' | translatePipe"
                    [disabled]="!isLoggedIn()"
                    [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
                    <lucide-icon name="trash-2" [size]="16"></lucide-icon>
                  </button>
                }
              </div>
            }
          </div>
        } @else {
          <div class="empty-state">{{ 'metadata_no_menu_types' | translatePipe }}</div>
        }
      </div>
    </section>

    <app-preparation-category-manager />
    <app-section-category-manager />

    <section class="manager-card">
      <div class="card-title">
        <lucide-icon name="package" class="icon-warning"></lucide-icon>
        <h2>{{ 'load_demo_data' | translatePipe }}</h2>
      </div>
      <p class="card-desc">{{ 'metadata_demo_data_desc' | translatePipe }}</p>
      <div class="card-actions">
        <button type="button" class="btn-demo" (click)="onLoadDemoData()">
          {{ 'load_demo_data' | translatePipe }}
        </button>
      </div>
    </section>

    <section class="manager-card">
      <div class="card-title">
        <lucide-icon name="archive" class="icon-accent"></lucide-icon>
        <h2>{{ 'backup_restore' | translatePipe }}</h2>
      </div>
      <p class="card-desc">{{ 'backup_restore_desc' | translatePipe }}</p>
      <div class="card-actions">
        <button type="button" class="btn-backup btn-export" (click)="onExportBackup()">
          <lucide-icon name="download" [size]="18"></lucide-icon>
          {{ 'backup_export' | translatePipe }}
        </button>
        <button type="button" class="btn-backup btn-restore" (click)="onRestoreFromBackup()">
          <lucide-icon name="rotate-ccw" [size]="18"></lucide-icon>
          {{ 'backup_restore_from_backup' | translatePipe }}
        </button>
        <button type="button" class="btn-backup btn-import" (click)="fileInputRef.click()">
          <lucide-icon name="upload" [size]="18"></lucide-icon>
          {{ 'backup_import' | translatePipe }}
        </button>
        <input #fileInputRef type="file" accept=".json,application/json" class="backup-file-input"
          (change)="onImportBackupFile($event)" />
      </div>
    </section>
  </div>
</div>

<ng-template #managerCard let-title="title" let-icon="icon" let-colorClass="colorClass" let-items="items"
  let-type="type">
  <section class="manager-card" [attr.data-type]="type">
    <div class="card-title">
      <lucide-icon [name]="icon" [class]="colorClass"></lucide-icon>
      <h2>{{ title | translatePipe }}</h2>
    </div>

    <div class="input-group">
      <input #newInput type="text" [placeholder]="('add' | translatePipe) + ' ' + (title | translatePipe) + '...'"
        (keyup.enter)="onAddMetadata(newInput.value, type, newInput)">

      <button (click)="onAddMetadata(newInput.value, type, newInput)" class="c-btn-primary"
        [disabled]="!isLoggedIn()"
        [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
        {{ 'add' | translatePipe }}
      </button>
    </div>

    <div class="list-container">
      @if (items.length > 0) {
      <div [class]="type === 'allergen' ? 'allergen-pool' : (type === 'label' ? 'label-pool' : 'list-stack')">
        @for (item of items; track item) {
        <div [class]="type === 'allergen' ? 'allergen-pill' : (type === 'label' ? 'label-pill' : 'list-item group')">
          @if (type === 'label') {
            <span class="label-color-dot" [style.background-color]="getLabelColor(item)"></span>
          }
          <span>{{ item | translatePipe }}</span>

          @if (type === 'unit' && isSystemUnit(item)) {
          <span class="unit-default-badge" [attr.title]="'unit_default_unremovable' | translatePipe" aria-label="default unit">
            <lucide-icon name="lock" [size]="14"></lucide-icon>
          </span>
          } @else if (type !== 'unit' || !isSystemUnit(item)) {
          <button class="c-icon-btn danger" (click)="onRemoveMetadata(item, type)"
            [disabled]="!isLoggedIn()"
            [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
            <lucide-icon [name]="type === 'allergen' ? 'x' : 'trash-2'"
              [size]="type === 'allergen' ? 14 : 16"></lucide-icon>
          </button>
          }
        </div>
        }
      </div>
      } @else {
      <div class="empty-state">{{ 'metadata_no_items_prefix' | translatePipe }} {{ title | translatePipe }} {{ 'metadata_no_items_suffix' | translatePipe }}</div>
      }
    </div>
  </section>
</ng-template>`, styles: ['/* src/app/pages/metadata-manager/metadata-manager.page.component.scss */\n.metadata-page {\n  position: relative;\n  min-height: 100vh;\n  min-height: 100dvh;\n  padding: 1.5rem;\n  background: transparent;\n  font-family: "Heebo", sans-serif;\n}\n.metadata-page .header-section {\n  margin-block-end: 2.5rem;\n  padding-block-end: 1.5rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.metadata-page .header-section h1 {\n  margin: 0;\n  font-size: 1.875rem;\n  font-weight: 900;\n  color: var(--color-text-main);\n}\n.metadata-page .header-section p {\n  margin-top: 0.5rem;\n  color: var(--color-text-muted);\n}\n.metadata-page .admin-grid {\n  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fit, minmax(335px, 1fr));\n  place-content: center;\n  gap: 2rem;\n}\n@media (max-width: 900px) {\n  .metadata-page .admin-grid {\n    grid-template-columns: 1fr;\n    max-width: 28rem;\n    margin-inline: auto;\n  }\n}\n.manager-card {\n  height: fit-content;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.manager-card .card-title {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-block-end: 1.5rem;\n  padding-block-end: 1rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.manager-card .card-title h2 {\n  margin: 0;\n  font-size: 1.125rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n}\n.manager-card .card-desc {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n.manager-card .card-actions {\n  display: flex;\n  position: relative;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n}\n@media (max-width: 768px) {\n  .manager-card {\n    padding: 1rem;\n  }\n}\n.list-container {\n  margin-top: 1.5rem;\n}\n.list-container .list-stack {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.list-container .label-color-dot {\n  width: 0.75rem;\n  height: 0.75rem;\n  border-radius: 50%;\n  flex-shrink: 0;\n  margin-inline-end: 0.5rem;\n}\n.list-container .list-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.75rem 1rem;\n  background: var(--bg-glass);\n  border-radius: var(--radius-md);\n  font-weight: 600;\n  color: var(--color-text-main);\n  border: 1px solid transparent;\n  backdrop-filter: var(--blur-glass);\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.list-container .list-item:hover {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-default);\n}\n.list-container .list-item.group {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 0.625rem;\n}\n.list-container .c-icon-btn.danger {\n  opacity: 0;\n  transition:\n    opacity 0.2s ease,\n    background 0.2s ease,\n    color 0.2s ease,\n    transform 0.2s var(--ease-spring);\n}\n.list-container .c-icon-btn.danger:hover {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n  transform: scale(1.12) rotate(8deg);\n}\n.list-container .list-item:hover .c-icon-btn.danger {\n  opacity: 1;\n}\n.list-container .unit-default-badge {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 1.875rem;\n  height: 1.875rem;\n  color: var(--color-text-muted);\n  cursor: default;\n}\n.list-container .unit-default-badge:hover {\n  color: var(--color-text-muted);\n}\n.menu-types-card .menu-type-row {\n  grid-template-columns: 1fr auto auto;\n  grid-template-rows: auto auto;\n  align-items: center;\n  gap: 0.25rem 0.5rem;\n}\n.menu-types-card .menu-type-row .menu-type-key-input {\n  grid-column: 1;\n  grid-row: 1;\n}\n.menu-types-card .menu-type-row .field-pills {\n  grid-column: 1;\n  grid-row: 2;\n  padding-block-end: 0.25rem;\n}\n.menu-types-card .menu-type-row .btn-edit {\n  grid-column: 2;\n  grid-row: 1/3;\n  align-self: center;\n}\n.menu-types-card .menu-type-row > .c-icon-btn.danger {\n  grid-column: 3;\n  grid-row: 1/3;\n  align-self: center;\n}\n.menu-types-card .menu-type-key,\n.menu-types-card .menu-type-key-input {\n  font-weight: 600;\n  color: var(--color-text-main);\n}\n.menu-types-card .menu-type-key-input {\n  display: block;\n  width: 100%;\n  min-width: 0;\n  padding: 0;\n  background: transparent;\n  border: none;\n  border-radius: var(--radius-xs);\n  outline: none;\n  font: inherit;\n  cursor: text;\n}\n.menu-types-card .menu-type-key-input:hover {\n  background: var(--bg-glass);\n}\n.menu-types-card .menu-type-key-input:focus {\n  background: var(--bg-glass);\n  box-shadow: 0 0 0 1px var(--border-focus);\n}\n.menu-types-card .field-pills {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.35rem;\n}\n.menu-types-card .field-pill {\n  font-size: 0.75rem;\n  padding: 0.2rem 0.5rem;\n  background: var(--color-primary-soft);\n  color: var(--color-primary);\n  border-radius: var(--radius-full);\n  font-weight: 500;\n}\n.menu-types-card .field-pill-removable {\n  border: none;\n  cursor: pointer;\n  transition: background 0.2s ease, color 0.2s ease;\n}\n.menu-types-card .field-pill-removable:hover {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n}\n.menu-types-card .menu-type-edit {\n  grid-column: 1/-1;\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n  padding: 0.5rem 0;\n}\n.menu-types-card .field-checkboxes {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem 1rem;\n}\n.menu-types-card .field-check {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.35rem;\n  font-size: 0.875rem;\n  font-weight: 500;\n  cursor: pointer;\n  color: var(--color-text-secondary);\n}\n.menu-types-card .edit-actions {\n  display: flex;\n  gap: 0.5rem;\n}\n.menu-types-card .btn-save-small {\n  padding: 0.35rem 0.75rem;\n  font-size: 0.875rem;\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  font-weight: 600;\n}\n.menu-types-card .btn-save-small {\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  border: none;\n}\n.menu-types-card .btn-edit {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 4px;\n  background: transparent;\n  color: var(--color-text-muted);\n  border: none;\n  opacity: 0;\n  cursor: pointer;\n  transition: opacity 0.2s ease;\n}\n.menu-types-card .btn-edit:hover {\n  color: var(--color-primary);\n}\n.menu-types-card .menu-type-row:hover .btn-edit {\n  opacity: 1;\n}\n.manager-card[data-type=unit] .list-stack {\n  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fit, minmax(115px, auto));\n}\n.manager-card[data-type=unit] .list-item.group {\n  grid-template-columns: 1fr auto;\n  gap: 0.625rem;\n}\n.manager-card[data-type=category] .list-stack {\n  display: grid;\n  grid-auto-flow: dense;\n  grid-template-columns: repeat(auto-fit, minmax(115px, auto));\n}\n.manager-card[data-type=category] .list-item.group {\n  grid-template-columns: 1fr auto;\n  gap: 0.625rem;\n}\n.allergen-pool,\n.label-pool {\n  display: flex;\n  flex-wrap: wrap;\n  place-content: center;\n  gap: 0.5rem;\n}\n.allergen-pool .allergen-pill,\n.allergen-pool .label-pill,\n.label-pool .allergen-pill,\n.label-pool .label-pill {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.25rem 0.75rem;\n  background: rgba(254, 226, 226, 0.5);\n  color: #9f1239;\n  border: 1px solid rgba(254, 205, 213, 0.6);\n  border-radius: var(--radius-full);\n  font-size: 0.875rem;\n  font-weight: 600;\n  backdrop-filter: var(--blur-glass);\n}\n.allergen-pool .allergen-pill .c-icon-btn.danger,\n.allergen-pool .label-pill .c-icon-btn.danger,\n.label-pool .allergen-pill .c-icon-btn.danger,\n.label-pool .label-pill .c-icon-btn.danger {\n  opacity: 1;\n}\n.allergen-pool .label-pill,\n.label-pool .label-pill {\n  background: var(--bg-glass-strong);\n  color: var(--color-text-main);\n  border: 1px solid var(--border-default);\n}\n.allergen-pool .label-pill .c-icon-btn.danger,\n.label-pool .label-pill .c-icon-btn.danger {\n  color: var(--color-text-muted);\n}\n.icon-primary {\n  color: var(--color-primary);\n}\n.icon-success {\n  color: var(--color-success);\n}\n.icon-danger {\n  color: var(--color-danger);\n}\n.icon-warning {\n  color: var(--text-warning);\n}\n.icon-info {\n  color: var(--color-info, #0ea5e9);\n}\n.icon-accent {\n  color: var(--color-accent, #8b5cf6);\n}\n.empty-state {\n  text-align: center;\n  padding: 2rem;\n  color: var(--color-text-muted);\n  border: 1px dashed var(--border-default);\n  border-radius: var(--radius-md);\n  font-style: italic;\n}\n.input-group {\n  display: flex;\n  gap: 0.5rem;\n}\n.input-group input {\n  flex: 1;\n  padding-inline: 0.75rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  outline: none;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.input-group input::placeholder {\n  color: var(--color-text-muted-light);\n}\n.input-group input:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.manager-card .btn-demo {\n  padding-inline: 1.25rem;\n  padding-block: 0.625rem;\n  background: var(--bg-glass);\n  color: var(--text-warning);\n  font-weight: 600;\n  font-size: 0.875rem;\n  border: 1px solid var(--border-warning);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.manager-card .btn-demo:hover {\n  background: var(--bg-warning);\n  border-color: var(--border-warning);\n}\n.manager-card .btn-backup {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding-inline: 1rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-main);\n  font-size: 0.875rem;\n  font-weight: 600;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.manager-card .btn-backup:hover {\n  background: var(--bg-glass-hover);\n  border-color: var(--border-focus);\n}\n.manager-card .btn-export {\n  border-color: var(--color-primary);\n  color: var(--color-primary);\n}\n.manager-card .btn-export:hover {\n  background: var(--color-primary-soft);\n}\n.manager-card .btn-restore:hover,\n.manager-card .btn-import:hover {\n  border-color: var(--color-text-muted);\n}\n.manager-card .backup-file-input {\n  position: absolute;\n  width: 0;\n  height: 0;\n  opacity: 0;\n  pointer-events: none;\n}\n/*# sourceMappingURL=metadata-manager.page.component.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(MetadataManagerComponent, { className: "MetadataManagerComponent", filePath: "src/app/pages/metadata-manager/metadata-manager.page.component.ts", lineNumber: 35 });
})();

// src/app/pages/dashboard/dashboard.page.ts
function DashboardPage_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-dashboard-overview", 7);
    \u0275\u0275listener("tabChange", function DashboardPage_Conditional_2_Template_app_dashboard_overview_tabChange_0_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setTab($event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275property("activeTab", ctx_r1.activeTab());
  }
}
function DashboardPage_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 3)(1, "app-dashboard-header", 8);
    \u0275\u0275listener("tabChange", function DashboardPage_Conditional_3_Template_app_dashboard_header_tabChange_1_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setTab($event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(2, "app-metadata-manager");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("activeTab", ctx_r1.activeTab());
  }
}
function DashboardPage_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-venue-list", 9);
    \u0275\u0275listener("addVenueClick", function DashboardPage_Conditional_4_Template_app_venue_list_addVenueClick_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setTab("add-venue"));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275property("embeddedInDashboard", true);
  }
}
function DashboardPage_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-venue-form", 10);
    \u0275\u0275listener("saved", function DashboardPage_Conditional_5_Template_app_venue_form_saved_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setTab("venues"));
    })("cancel", function DashboardPage_Conditional_5_Template_app_venue_form_cancel_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setTab("venues"));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275property("embeddedInDashboard", true);
  }
}
function DashboardPage_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-trash-page", 6);
  }
}
var TAB_QUERY_VALUES = {
  overview: null,
  metadata: "metadata",
  venues: "venues",
  "add-venue": "add-venue",
  trash: "trash"
};
var DashboardPage = class _DashboardPage {
  router = inject(Router);
  route = inject(ActivatedRoute);
  queryParams_ = toSignal(this.route.queryParams, {
    initialValue: {}
  });
  activeTab = computed(() => {
    const params = this.queryParams_();
    const t = params["tab"];
    if (t === "metadata" || t === "venues" || t === "add-venue" || t === "trash")
      return t;
    return "overview";
  });
  setTab(tab) {
    const value = TAB_QUERY_VALUES[tab];
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: value ? { tab: value } : {},
      queryParamsHandling: value ? "merge" : "",
      replaceUrl: true
    });
  }
  static \u0275fac = function DashboardPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _DashboardPage)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _DashboardPage, selectors: [["app-dashboard-page"]], decls: 7, vars: 1, consts: [["dir", "rtl", 1, "dashboard-shell"], [1, "dashboard-content"], ["data-testid", "dashboard-tab-overview", 3, "activeTab"], ["data-testid", "dashboard-tab-metadata", 1, "dashboard-metadata-layout"], ["data-testid", "dashboard-tab-venues", 3, "embeddedInDashboard"], ["data-testid", "dashboard-tab-add-venue", 3, "embeddedInDashboard"], ["data-testid", "dashboard-tab-trash"], ["data-testid", "dashboard-tab-overview", 3, "tabChange", "activeTab"], [3, "tabChange", "activeTab"], ["data-testid", "dashboard-tab-venues", 3, "addVenueClick", "embeddedInDashboard"], ["data-testid", "dashboard-tab-add-venue", 3, "saved", "cancel", "embeddedInDashboard"]], template: function DashboardPage_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1);
      \u0275\u0275template(2, DashboardPage_Conditional_2_Template, 1, 1, "app-dashboard-overview", 2)(3, DashboardPage_Conditional_3_Template, 3, 1, "div", 3)(4, DashboardPage_Conditional_4_Template, 1, 1, "app-venue-list", 4)(5, DashboardPage_Conditional_5_Template, 1, 1, "app-venue-form", 5)(6, DashboardPage_Conditional_6_Template, 1, 0, "app-trash-page", 6);
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.activeTab() === "overview" ? 2 : ctx.activeTab() === "metadata" ? 3 : ctx.activeTab() === "venues" ? 4 : ctx.activeTab() === "add-venue" ? 5 : ctx.activeTab() === "trash" ? 6 : -1);
    }
  }, dependencies: [
    CommonModule,
    LucideAngularModule,
    DashboardOverviewComponent,
    DashboardHeaderComponent,
    MetadataManagerComponent,
    VenueListComponent,
    VenueFormComponent,
    TrashPage
  ], styles: ["\n\n.dashboard-shell[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n  padding: 0;\n}\n.dashboard-content[_ngcontent-%COMP%] {\n  flex: 1;\n  min-height: 0;\n  padding: 1.5rem;\n}\n.dashboard-metadata-layout[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n/*# sourceMappingURL=dashboard.page.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DashboardPage, [{
    type: Component,
    args: [{ selector: "app-dashboard-page", standalone: true, imports: [
      CommonModule,
      LucideAngularModule,
      DashboardOverviewComponent,
      DashboardHeaderComponent,
      MetadataManagerComponent,
      VenueListComponent,
      VenueFormComponent,
      TrashPage
    ], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="dashboard-shell" dir="rtl">
  <div class="dashboard-content">
    @if (activeTab() === 'overview') {
      <app-dashboard-overview data-testid="dashboard-tab-overview" [activeTab]="activeTab()" (tabChange)="setTab($event)" />
    } @else if (activeTab() === 'metadata') {
      <div class="dashboard-metadata-layout" data-testid="dashboard-tab-metadata">
        <app-dashboard-header [activeTab]="activeTab()" (tabChange)="setTab($event)" />
        <app-metadata-manager />
      </div>
    } @else if (activeTab() === 'venues') {
      <app-venue-list data-testid="dashboard-tab-venues" [embeddedInDashboard]="true" (addVenueClick)="setTab('add-venue')" />
    } @else if (activeTab() === 'add-venue') {
      <app-venue-form data-testid="dashboard-tab-add-venue" [embeddedInDashboard]="true" (saved)="setTab('venues')" (cancel)="setTab('venues')" />
    } @else if (activeTab() === 'trash') {
      <app-trash-page data-testid="dashboard-tab-trash" />
    }
  </div>
</div>
`, styles: ["/* src/app/pages/dashboard/dashboard.page.scss */\n.dashboard-shell {\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n  padding: 0;\n}\n.dashboard-content {\n  flex: 1;\n  min-height: 0;\n  padding: 1.5rem;\n}\n.dashboard-metadata-layout {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n/*# sourceMappingURL=dashboard.page.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(DashboardPage, { className: "DashboardPage", filePath: "src/app/pages/dashboard/dashboard.page.ts", lineNumber: 46 });
})();
export {
  DashboardPage
};
//# sourceMappingURL=chunk-74YG354C.js.map
