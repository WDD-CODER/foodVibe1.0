import {
  CustomSelectComponent
} from "./chunk-KKA4TBVQ.js";
import {
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-JROUPDH4.js";
import {
  TranslatePipe
} from "./chunk-Z6OI3YDQ.js";
import {
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  ContentChildren,
  Directive,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵcontentQuery,
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
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-GCYOWW7U.js";

// src/app/shared/cell-carousel/cell-carousel.component.ts
var _c0 = ["*"];
var CAROUSEL_ACTIVE_CLASS = "carousel-slide-active";
var CellCarouselSlideDirective = class _CellCarouselSlideDirective {
  elementRef = inject(ElementRef);
  label = input("");
  static \u0275fac = function CellCarouselSlideDirective_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _CellCarouselSlideDirective)();
  };
  static \u0275dir = /* @__PURE__ */ \u0275\u0275defineDirective({ type: _CellCarouselSlideDirective, selectors: [["", "cellCarouselSlide", ""]], inputs: { label: [1, "label"] } });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CellCarouselSlideDirective, [{
    type: Directive,
    args: [{
      selector: "[cellCarouselSlide]",
      standalone: true
    }]
  }], null, null);
})();
var CellCarouselComponent = class _CellCarouselComponent {
  slides;
  /** Two-way: parent controls the active slide; component emits when user changes via prev/next. */
  activeIndex = model(0);
  currentIndex = signal(0);
  getCurrentLabel() {
    const idx = this.currentIndex();
    const list = this.slides?.toArray() ?? [];
    const slide = list[idx];
    return slide?.label() ?? "";
  }
  updateActiveSlide() {
    const list = this.slides?.toArray() ?? [];
    const idx = this.currentIndex();
    list.forEach((slide, i) => {
      const el = slide.elementRef.nativeElement;
      el.classList.toggle(CAROUSEL_ACTIVE_CLASS, i === idx);
    });
  }
  constructor() {
    effect(() => {
      this.currentIndex();
      this.updateActiveSlide();
    });
    effect(() => {
      const external = this.activeIndex();
      if (external === void 0 || external === null)
        return;
      const list = this.slides?.toArray() ?? [];
      if (list.length === 0)
        return;
      const max = list.length - 1;
      const clamped = Math.min(max, Math.max(0, external));
      this.currentIndex.set(clamped);
      this.updateActiveSlide();
    });
  }
  ngAfterViewInit() {
    this.updateActiveSlide();
    const external = this.activeIndex();
    if (external !== void 0 && external !== null) {
      const list = this.slides?.toArray() ?? [];
      const max = Math.max(0, list.length - 1);
      const clamped = Math.min(max, Math.max(0, external));
      this.currentIndex.set(clamped);
      this.updateActiveSlide();
    }
  }
  /** Set active slide by index (e.g. when header "whole column" is used). */
  setActiveIndex(index) {
    const list = this.slides?.toArray() ?? [];
    if (list.length === 0)
      return;
    const max = list.length - 1;
    const clamped = Math.min(max, Math.max(0, index));
    this.currentIndex.set(clamped);
    this.updateActiveSlide();
  }
  next() {
    const list = this.slides?.toArray() ?? [];
    if (list.length === 0)
      return;
    const idx = (this.currentIndex() + 1) % list.length;
    this.currentIndex.set(idx);
    this.activeIndex.set(this.currentIndex());
  }
  prev() {
    const list = this.slides?.toArray() ?? [];
    if (list.length === 0)
      return;
    const idx = this.currentIndex() - 1;
    this.currentIndex.set(idx < 0 ? list.length - 1 : idx);
    this.activeIndex.set(this.currentIndex());
  }
  static \u0275fac = function CellCarouselComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _CellCarouselComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _CellCarouselComponent, selectors: [["app-cell-carousel"]], contentQueries: function CellCarouselComponent_ContentQueries(rf, ctx, dirIndex) {
    if (rf & 1) {
      \u0275\u0275contentQuery(dirIndex, CellCarouselSlideDirective, 4);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.slides = _t);
    }
  }, inputs: { activeIndex: [1, "activeIndex"] }, outputs: { activeIndex: "activeIndexChange" }, ngContentSelectors: _c0, decls: 8, vars: 3, consts: [[1, "carousel-cell"], ["aria-hidden", "true", 1, "carousel-label"], ["type", "button", "aria-label", "Previous slide", 1, "carousel-arrow", "carousel-arrow-prev", 3, "click"], ["name", "chevron-right", 3, "size"], ["type", "button", "aria-label", "Next slide", 1, "carousel-arrow", "carousel-arrow-next", 3, "click"], ["name", "chevron-left", 3, "size"]], template: function CellCarouselComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275projectionDef();
      \u0275\u0275elementStart(0, "div", 0)(1, "span", 1);
      \u0275\u0275text(2);
      \u0275\u0275elementEnd();
      \u0275\u0275projection(3);
      \u0275\u0275elementStart(4, "button", 2);
      \u0275\u0275listener("click", function CellCarouselComponent_Template_button_click_4_listener($event) {
        ctx.prev();
        return $event.stopPropagation();
      });
      \u0275\u0275element(5, "lucide-icon", 3);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(6, "button", 4);
      \u0275\u0275listener("click", function CellCarouselComponent_Template_button_click_6_listener($event) {
        ctx.next();
        return $event.stopPropagation();
      });
      \u0275\u0275element(7, "lucide-icon", 5);
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.getCurrentLabel());
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 14);
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 14);
    }
  }, dependencies: [CommonModule, LucideAngularModule, LucideAngularComponent], styles: ["\n\n[_nghost-%COMP%] {\n  display: contents;\n}\n.carousel-cell[_ngcontent-%COMP%] {\n  display: contents;\n}\n.carousel-label[_ngcontent-%COMP%], \n.carousel-arrow[_ngcontent-%COMP%] {\n  display: none;\n}\n@media (max-width: 768px) {\n  [_nghost-%COMP%] {\n    display: flex;\n    position: relative;\n    align-items: center;\n    min-width: 0;\n    overflow: hidden;\n  }\n  .carousel-cell[_ngcontent-%COMP%] {\n    display: flex;\n    position: relative;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    min-width: 0;\n    width: 100%;\n    padding-inline: 0.75rem;\n    padding-block: 0.625rem;\n    background: transparent;\n    transition: background 0.15s ease;\n  }\n  .carousel-label[_ngcontent-%COMP%] {\n    display: block;\n    flex-shrink: 0;\n    margin-block-end: 0.25rem;\n    font-size: 0.625rem;\n    font-weight: 600;\n    color: var(--color-text-muted);\n    text-transform: uppercase;\n    letter-spacing: 0.03em;\n  }\n  [_nghost-%COMP%]     [cellCarouselSlide] {\n    display: none;\n    min-width: 0;\n    width: 100%;\n    justify-content: center;\n    align-items: center;\n  }\n  [_nghost-%COMP%]     [cellCarouselSlide].carousel-slide-active {\n    display: flex;\n  }\n  .carousel-arrow[_ngcontent-%COMP%] {\n    display: grid;\n    place-content: center;\n    position: absolute;\n    top: 0;\n    bottom: 0;\n    width: 1.5rem;\n    padding: 0;\n    background: var(--bg-glass);\n    color: var(--color-text-muted);\n    border: none;\n    border-block: none;\n    cursor: pointer;\n    opacity: 0;\n    transition: opacity 0.2s var(--ease-smooth), background 0.2s ease;\n  }\n  .carousel-arrow[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  [_nghost-%COMP%]:hover   .carousel-arrow[_ngcontent-%COMP%] {\n    opacity: 1;\n  }\n  .carousel-arrow-prev[_ngcontent-%COMP%] {\n    inset-inline-start: 0;\n    border-inline-end: 1px solid var(--border-default);\n  }\n  .carousel-arrow-next[_ngcontent-%COMP%] {\n    inset-inline-end: 0;\n    border-inline-start: 1px solid var(--border-default);\n  }\n}\n@media (max-width: 768px) and (hover: none) {\n  .carousel-arrow[_ngcontent-%COMP%] {\n    opacity: 0.6;\n  }\n}\n/*# sourceMappingURL=cell-carousel.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CellCarouselComponent, [{
    type: Component,
    args: [{ selector: "app-cell-carousel", standalone: true, imports: [CommonModule, LucideAngularModule], changeDetection: ChangeDetectionStrategy.OnPush, template: '<div class="carousel-cell">\r\n  <span class="carousel-label" aria-hidden="true">{{ getCurrentLabel() }}</span>\r\n  <ng-content></ng-content>\r\n  <button type="button" class="carousel-arrow carousel-arrow-prev" (click)="prev(); $event.stopPropagation()" aria-label="Previous slide">\r\n    <lucide-icon name="chevron-right" [size]="14"></lucide-icon>\r\n  </button>\r\n  <button type="button" class="carousel-arrow carousel-arrow-next" (click)="next(); $event.stopPropagation()" aria-label="Next slide">\r\n    <lucide-icon name="chevron-left" [size]="14"></lucide-icon>\r\n  </button>\r\n</div>\r\n', styles: ["/* src/app/shared/cell-carousel/cell-carousel.component.scss */\n:host {\n  display: contents;\n}\n.carousel-cell {\n  display: contents;\n}\n.carousel-label,\n.carousel-arrow {\n  display: none;\n}\n@media (max-width: 768px) {\n  :host {\n    display: flex;\n    position: relative;\n    align-items: center;\n    min-width: 0;\n    overflow: hidden;\n  }\n  .carousel-cell {\n    display: flex;\n    position: relative;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    min-width: 0;\n    width: 100%;\n    padding-inline: 0.75rem;\n    padding-block: 0.625rem;\n    background: transparent;\n    transition: background 0.15s ease;\n  }\n  .carousel-label {\n    display: block;\n    flex-shrink: 0;\n    margin-block-end: 0.25rem;\n    font-size: 0.625rem;\n    font-weight: 600;\n    color: var(--color-text-muted);\n    text-transform: uppercase;\n    letter-spacing: 0.03em;\n  }\n  :host ::ng-deep [cellCarouselSlide] {\n    display: none;\n    min-width: 0;\n    width: 100%;\n    justify-content: center;\n    align-items: center;\n  }\n  :host ::ng-deep [cellCarouselSlide].carousel-slide-active {\n    display: flex;\n  }\n  .carousel-arrow {\n    display: grid;\n    place-content: center;\n    position: absolute;\n    top: 0;\n    bottom: 0;\n    width: 1.5rem;\n    padding: 0;\n    background: var(--bg-glass);\n    color: var(--color-text-muted);\n    border: none;\n    border-block: none;\n    cursor: pointer;\n    opacity: 0;\n    transition: opacity 0.2s var(--ease-smooth), background 0.2s ease;\n  }\n  .carousel-arrow:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  :host:hover .carousel-arrow {\n    opacity: 1;\n  }\n  .carousel-arrow-prev {\n    inset-inline-start: 0;\n    border-inline-end: 1px solid var(--border-default);\n  }\n  .carousel-arrow-next {\n    inset-inline-end: 0;\n    border-inline-start: 1px solid var(--border-default);\n  }\n}\n@media (max-width: 768px) and (hover: none) {\n  .carousel-arrow {\n    opacity: 0.6;\n  }\n}\n/*# sourceMappingURL=cell-carousel.component.css.map */\n"] }]
  }], () => [], { slides: [{
    type: ContentChildren,
    args: [CellCarouselSlideDirective]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(CellCarouselComponent, { className: "CellCarouselComponent", filePath: "src/app/shared/cell-carousel/cell-carousel.component.ts", lineNumber: 37 });
})();

// src/app/shared/list-shell/list-shell.component.ts
var _c02 = [[["", "shell-title", ""]], [["", "shell-search", ""]], [["", "shell-actions", ""]], [["", "shell-table-header", ""]], [["", "shell-table-body", ""]], [["", "shell-filters", ""]]];
var _c1 = ["[shell-title]", "[shell-search]", "[shell-actions]", "[shell-table-header]", "[shell-table-body]", "[shell-filters]"];
function ListShellComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 14);
    \u0275\u0275listener("click", function ListShellComponent_Conditional_3_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.panelToggle.emit());
    });
    \u0275\u0275element(1, "lucide-icon", 15);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 24);
  }
}
function ListShellComponent_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 16);
    \u0275\u0275listener("click", function ListShellComponent_Conditional_18_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.panelToggle.emit());
    });
    \u0275\u0275element(1, "lucide-icon", 17);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 20);
  }
}
var ListShellComponent = class _ListShellComponent {
  isPanelOpen = input(true);
  gridTemplate = input("");
  mobileGridTemplate = input("");
  dir = input("rtl");
  panelToggle = output();
  constructor() {
    const el = inject(ElementRef);
    effect(() => {
      const host = el.nativeElement;
      host.style.setProperty("--list-grid", this.gridTemplate());
      host.style.setProperty("--list-grid-mobile", this.mobileGridTemplate());
    });
  }
  static \u0275fac = function ListShellComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ListShellComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ListShellComponent, selectors: [["app-list-shell"]], inputs: { isPanelOpen: [1, "isPanelOpen"], gridTemplate: [1, "gridTemplate"], mobileGridTemplate: [1, "mobileGridTemplate"], dir: [1, "dir"] }, outputs: { panelToggle: "panelToggle" }, ngContentSelectors: _c1, decls: 21, vars: 9, consts: [[1, "list-container"], [1, "list-header"], [1, "header-start"], ["type", "button", "aria-label", "Toggle filters", 1, "open-panel-btn"], [1, "header-spacer"], [1, "header-search"], [1, "header-actions"], [1, "table-area"], [1, "table-header"], [1, "table-body"], ["aria-hidden", "true", 1, "panel-backdrop", 3, "click"], [1, "filter-panel"], ["type", "button", "aria-label", "Close filters", 1, "panel-toggle-icon"], [1, "panel-content"], ["type", "button", "aria-label", "Toggle filters", 1, "open-panel-btn", 3, "click"], ["name", "menu", 3, "size"], ["type", "button", "aria-label", "Close filters", 1, "panel-toggle-icon", 3, "click"], ["name", "circle-x", 3, "size"]], template: function ListShellComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275projectionDef(_c02);
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2);
      \u0275\u0275template(3, ListShellComponent_Conditional_3_Template, 2, 1, "button", 3);
      \u0275\u0275projection(4);
      \u0275\u0275elementEnd();
      \u0275\u0275element(5, "div", 4);
      \u0275\u0275elementStart(6, "div", 5);
      \u0275\u0275projection(7, 1);
      \u0275\u0275elementEnd();
      \u0275\u0275element(8, "div", 4);
      \u0275\u0275elementStart(9, "div", 6);
      \u0275\u0275projection(10, 2);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(11, "section", 7)(12, "div", 8);
      \u0275\u0275projection(13, 3);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "div", 9);
      \u0275\u0275projection(15, 4);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(16, "div", 10);
      \u0275\u0275listener("click", function ListShellComponent_Template_div_click_16_listener() {
        return ctx.panelToggle.emit();
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(17, "aside", 11);
      \u0275\u0275template(18, ListShellComponent_Conditional_18_Template, 2, 1, "button", 12);
      \u0275\u0275elementStart(19, "div", 13);
      \u0275\u0275projection(20, 5);
      \u0275\u0275elementEnd()()();
    }
    if (rf & 2) {
      \u0275\u0275classProp("panel-open", ctx.isPanelOpen());
      \u0275\u0275attribute("dir", ctx.dir());
      \u0275\u0275advance(3);
      \u0275\u0275conditional(!ctx.isPanelOpen() ? 3 : -1);
      \u0275\u0275advance(13);
      \u0275\u0275classProp("visible", ctx.isPanelOpen());
      \u0275\u0275advance();
      \u0275\u0275classProp("collapsed", !ctx.isPanelOpen());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.isPanelOpen() ? 18 : -1);
    }
  }, dependencies: [LucideAngularModule, LucideAngularComponent], styles: ['\n\n@layer components.list-shell {\n  [_nghost-%COMP%] {\n    display: block;\n  }\n  .list-container[_ngcontent-%COMP%] {\n    display: grid;\n    grid-template-rows: auto 1fr;\n    grid-template-columns: auto 1fr;\n    grid-template-areas: "header header" "panel  table";\n    container-type: inline-size;\n    height: 90dvh;\n    padding: 1rem 1.5rem;\n    gap: 0;\n    overflow: hidden;\n    box-sizing: border-box;\n  }\n  .list-header[_ngcontent-%COMP%] {\n    grid-area: header;\n    display: flex;\n    align-items: center;\n    flex-wrap: wrap;\n    gap: 1rem;\n    padding-block-end: 1rem;\n    border-block-end: 1px solid var(--border-default);\n  }\n  .header-spacer[_ngcontent-%COMP%] {\n    flex: 1;\n    min-width: 0;\n  }\n  .header-start[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    flex-shrink: 0;\n    gap: 1rem;\n  }\n  .header-search[_ngcontent-%COMP%] {\n    flex: 1 1 30%;\n    width: 100%;\n    min-width: 30%;\n    max-width: 22.5rem;\n  }\n  .header-actions[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    flex-shrink: 0;\n    gap: 1rem;\n    margin-inline-start: 0;\n  }\n  .open-panel-btn[_ngcontent-%COMP%] {\n    display: grid;\n    place-content: center;\n    flex-shrink: 0;\n    width: 2.5rem;\n    height: 2.5rem;\n    padding: 0;\n    background: var(--bg-glass);\n    color: var(--color-text-muted);\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-md);\n    cursor: pointer;\n    transition: background 0.2s ease, color 0.2s ease;\n  }\n  .open-panel-btn[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  @container (max-width: 640px) {\n    .list-header[_ngcontent-%COMP%] {\n      display: grid;\n      grid-template-columns: 1fr 1fr;\n      grid-template-rows: auto auto;\n      grid-template-areas: "title   title" "search  actions";\n      gap: 1rem;\n    }\n    .header-start[_ngcontent-%COMP%] {\n      grid-area: title;\n      min-width: 0;\n    }\n    .header-search[_ngcontent-%COMP%] {\n      grid-area: search;\n      flex: none;\n      min-width: 0;\n      max-width: none;\n    }\n    .header-actions[_ngcontent-%COMP%] {\n      grid-area: actions;\n      justify-content: flex-end;\n    }\n    .header-spacer[_ngcontent-%COMP%] {\n      display: none;\n    }\n  }\n  @container (max-width: 360px) {\n    .list-header[_ngcontent-%COMP%] {\n      grid-template-columns: 1fr;\n      grid-template-rows: auto auto auto;\n      grid-template-areas: "title" "search" "actions";\n    }\n    .header-actions[_ngcontent-%COMP%] {\n      justify-content: stretch;\n    }\n  }\n  .table-area[_ngcontent-%COMP%] {\n    grid-area: table;\n    position: relative;\n    display: grid;\n    grid-template-columns: var(--list-grid);\n    grid-template-rows: 50px 1fr;\n    min-width: 0;\n    background: var(--bg-glass-strong);\n    border: 1px solid var(--border-glass);\n    border-radius: var(--radius-lg);\n    box-shadow: var(--shadow-glass);\n    backdrop-filter: var(--blur-glass);\n    -webkit-backdrop-filter: var(--blur-glass);\n    overflow: hidden;\n    transition: border-inline-start-radius 0.3s var(--ease-spring);\n  }\n  @media (min-width: 1025px) {\n    .list-container.panel-open[_ngcontent-%COMP%]   .table-area[_ngcontent-%COMP%] {\n      border-top-right-radius: 0;\n      border-bottom-right-radius: 0;\n    }\n  }\n  .table-header[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n    display: grid;\n    grid-template-columns: var(--list-grid);\n    flex-shrink: 0;\n  }\n  .table-body[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n    display: grid;\n    grid-template-columns: var(--list-grid);\n    grid-auto-rows: minmax(auto, max-content);\n    min-height: 0;\n    overflow-y: auto;\n    scrollbar-width: none;\n    -ms-overflow-style: none;\n  }\n  .table-body[_ngcontent-%COMP%]::-webkit-scrollbar {\n    display: none;\n  }\n  [_nghost-%COMP%]     .table-header > *, \n   [_nghost-%COMP%]     .table-body > * {\n    min-width: 0;\n  }\n  [_nghost-%COMP%]     .table-body .col-name {\n    display: block;\n    overflow-wrap: break-word;\n  }\n  .filter-panel[_ngcontent-%COMP%] {\n    grid-area: panel;\n    display: flex;\n    flex-direction: column;\n    width: 220px;\n    min-width: 220px;\n    background: var(--bg-glass-strong);\n    border-inline-start: 3px solid var(--color-primary);\n    border-radius: 0 var(--radius-lg) var(--radius-lg) 0;\n    box-shadow: var(--shadow-glass);\n    backdrop-filter: var(--blur-glass);\n    -webkit-backdrop-filter: var(--blur-glass);\n    overflow-y: auto;\n    scrollbar-width: none;\n    -ms-overflow-style: none;\n    transition:\n      width 0.3s var(--ease-spring),\n      min-width 0.3s var(--ease-spring),\n      opacity 0.25s var(--ease-smooth);\n  }\n  .filter-panel[_ngcontent-%COMP%]::-webkit-scrollbar {\n    display: none;\n  }\n  .filter-panel.collapsed[_ngcontent-%COMP%] {\n    width: 0;\n    min-width: 0;\n    border-inline-start-width: 0;\n    overflow: hidden;\n  }\n  .filter-panel.collapsed[_ngcontent-%COMP%]   .panel-content[_ngcontent-%COMP%] {\n    opacity: 0;\n    transform: translateX(8px);\n    pointer-events: none;\n  }\n  .panel-toggle-icon[_ngcontent-%COMP%] {\n    display: grid;\n    place-content: center;\n    align-self: flex-end;\n    flex-shrink: 0;\n    width: 2rem;\n    height: 2rem;\n    margin: 0.625rem 0.625rem 0;\n    padding: 0;\n    background: transparent;\n    color: var(--color-text-muted-light);\n    border: none;\n    border-radius: var(--radius-sm);\n    cursor: pointer;\n    opacity: 0;\n    transition:\n      opacity 0.2s var(--ease-smooth),\n      background 0.2s ease,\n      color 0.2s ease;\n  }\n  .panel-toggle-icon[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  .filter-panel[_ngcontent-%COMP%]:hover   .panel-toggle-icon[_ngcontent-%COMP%] {\n    opacity: 1;\n  }\n  .panel-content[_ngcontent-%COMP%] {\n    padding: 0.5rem 1rem 1rem;\n    min-height: 12.5rem;\n    transition: opacity 0.25s var(--ease-spring), transform 0.25s var(--ease-spring);\n  }\n  .panel-backdrop[_ngcontent-%COMP%] {\n    display: none;\n    position: absolute;\n    inset: 0;\n    z-index: 9;\n    background: var(--overlay-backdrop);\n    opacity: 0;\n    pointer-events: none;\n    transition: opacity 0.25s var(--ease-smooth);\n  }\n  @media (max-width: 1024px) {\n    .list-container[_ngcontent-%COMP%] {\n      display: grid;\n      grid-template-rows: auto 1fr;\n      grid-template-columns: 1fr;\n      grid-template-areas: "header" "table";\n      position: relative;\n      padding: 1rem;\n    }\n    .panel-backdrop[_ngcontent-%COMP%] {\n      display: block;\n      grid-row: 2;\n      grid-column: 1;\n      position: absolute;\n      inset: 0;\n      z-index: 9;\n    }\n    .panel-backdrop.visible[_ngcontent-%COMP%] {\n      opacity: 1;\n      pointer-events: auto;\n    }\n    .filter-panel[_ngcontent-%COMP%] {\n      grid-row: 2;\n      grid-column: 1;\n      position: absolute;\n      inset-block: 0;\n      right: 0;\n      left: auto;\n      z-index: 10;\n      width: 300px;\n      min-width: 0;\n      background: var(--bg-glass-strong);\n      backdrop-filter: var(--blur-glass);\n      -webkit-backdrop-filter: var(--blur-glass);\n      border-inline-start: none;\n      border-top-left-radius: var(--radius-lg);\n      border-bottom-left-radius: var(--radius-lg);\n      border-top-right-radius: 0;\n      border-bottom-right-radius: 0;\n      box-shadow: var(--shadow-modal);\n      overflow-y: auto;\n      transform: translateX(110%);\n      opacity: 0;\n      pointer-events: none;\n      transition: transform 0.35s var(--ease-spring), opacity 0.2s var(--ease-smooth);\n    }\n    .filter-panel.collapsed[_ngcontent-%COMP%] {\n      width: 300px;\n      min-width: 0;\n      border-inline-start-width: 0;\n      overflow: hidden;\n    }\n    .filter-panel.collapsed[_ngcontent-%COMP%]   .panel-content[_ngcontent-%COMP%] {\n      transform: none;\n    }\n    .filter-panel[_ngcontent-%COMP%]:not(.collapsed) {\n      transform: translateX(0);\n      opacity: 1;\n      pointer-events: auto;\n    }\n    .panel-content[_ngcontent-%COMP%] {\n      transition: opacity 0.25s var(--ease-spring), transform 0.25s var(--ease-spring);\n    }\n    .panel-toggle-icon[_ngcontent-%COMP%] {\n      opacity: 1;\n    }\n  }\n  @media (max-width: 768px) {\n    .filter-panel[_ngcontent-%COMP%] {\n      position: fixed;\n      inset-block: 1rem;\n      right: 0;\n      left: auto;\n      z-index: 1000;\n      width: min(85vw, 340px);\n      max-height: calc(100dvh - 2rem);\n      border-top-left-radius: var(--radius-xl);\n      border-bottom-left-radius: var(--radius-xl);\n      border-top-right-radius: 0;\n      border-bottom-right-radius: 0;\n    }\n    .panel-backdrop[_ngcontent-%COMP%] {\n      position: fixed;\n      inset: 0;\n      z-index: 999;\n    }\n    .table-area[_ngcontent-%COMP%] {\n      grid-template-columns: var(--list-grid-mobile);\n    }\n    .table-header[_ngcontent-%COMP%] {\n      grid-template-columns: var(--list-grid-mobile);\n    }\n    .table-body[_ngcontent-%COMP%] {\n      grid-template-columns: var(--list-grid-mobile);\n    }\n  }\n}\n/*# sourceMappingURL=list-shell.component.css.map */'], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ListShellComponent, [{
    type: Component,
    args: [{ selector: "app-list-shell", standalone: true, imports: [LucideAngularModule], changeDetection: ChangeDetectionStrategy.OnPush, template: '<div class="list-container" [class.panel-open]="isPanelOpen()" [attr.dir]="dir()">\r\n  <header class="list-header">\r\n    <div class="header-start">\r\n      @if (!isPanelOpen()) {\r\n        <button type="button" class="open-panel-btn" (click)="panelToggle.emit()" aria-label="Toggle filters">\r\n          <lucide-icon name="menu" [size]="24"></lucide-icon>\r\n        </button>\r\n      }\r\n      <ng-content select="[shell-title]"></ng-content>\r\n    </div>\r\n    <div class="header-spacer"></div>\r\n    <div class="header-search">\r\n      <ng-content select="[shell-search]"></ng-content>\r\n    </div>\r\n    <div class="header-spacer"></div>\r\n    <div class="header-actions">\r\n      <ng-content select="[shell-actions]"></ng-content>\r\n    </div>\r\n  </header>\r\n\r\n  <section class="table-area">\r\n    <div class="table-header">\r\n      <ng-content select="[shell-table-header]"></ng-content>\r\n    </div>\r\n    <div class="table-body">\r\n      <ng-content select="[shell-table-body]"></ng-content>\r\n    </div>\r\n  </section>\r\n\r\n  <div\r\n    class="panel-backdrop"\r\n    [class.visible]="isPanelOpen()"\r\n    (click)="panelToggle.emit()"\r\n    aria-hidden="true">\r\n  </div>\r\n\r\n  <aside class="filter-panel" [class.collapsed]="!isPanelOpen()">\r\n    @if (isPanelOpen()) {\r\n      <button type="button" class="panel-toggle-icon" (click)="panelToggle.emit()" aria-label="Close filters">\r\n        <lucide-icon name="circle-x" [size]="20"></lucide-icon>\r\n      </button>\r\n    }\r\n    <div class="panel-content">\r\n      <ng-content select="[shell-filters]"></ng-content>\r\n    </div>\r\n  </aside>\r\n</div>\r\n', styles: ['/* src/app/shared/list-shell/list-shell.component.scss */\n@layer components.list-shell {\n  :host {\n    display: block;\n  }\n  .list-container {\n    display: grid;\n    grid-template-rows: auto 1fr;\n    grid-template-columns: auto 1fr;\n    grid-template-areas: "header header" "panel  table";\n    container-type: inline-size;\n    height: 90dvh;\n    padding: 1rem 1.5rem;\n    gap: 0;\n    overflow: hidden;\n    box-sizing: border-box;\n  }\n  .list-header {\n    grid-area: header;\n    display: flex;\n    align-items: center;\n    flex-wrap: wrap;\n    gap: 1rem;\n    padding-block-end: 1rem;\n    border-block-end: 1px solid var(--border-default);\n  }\n  .header-spacer {\n    flex: 1;\n    min-width: 0;\n  }\n  .header-start {\n    display: flex;\n    align-items: center;\n    flex-shrink: 0;\n    gap: 1rem;\n  }\n  .header-search {\n    flex: 1 1 30%;\n    width: 100%;\n    min-width: 30%;\n    max-width: 22.5rem;\n  }\n  .header-actions {\n    display: flex;\n    align-items: center;\n    flex-shrink: 0;\n    gap: 1rem;\n    margin-inline-start: 0;\n  }\n  .open-panel-btn {\n    display: grid;\n    place-content: center;\n    flex-shrink: 0;\n    width: 2.5rem;\n    height: 2.5rem;\n    padding: 0;\n    background: var(--bg-glass);\n    color: var(--color-text-muted);\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-md);\n    cursor: pointer;\n    transition: background 0.2s ease, color 0.2s ease;\n  }\n  .open-panel-btn:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  @container (max-width: 640px) {\n    .list-header {\n      display: grid;\n      grid-template-columns: 1fr 1fr;\n      grid-template-rows: auto auto;\n      grid-template-areas: "title   title" "search  actions";\n      gap: 1rem;\n    }\n    .header-start {\n      grid-area: title;\n      min-width: 0;\n    }\n    .header-search {\n      grid-area: search;\n      flex: none;\n      min-width: 0;\n      max-width: none;\n    }\n    .header-actions {\n      grid-area: actions;\n      justify-content: flex-end;\n    }\n    .header-spacer {\n      display: none;\n    }\n  }\n  @container (max-width: 360px) {\n    .list-header {\n      grid-template-columns: 1fr;\n      grid-template-rows: auto auto auto;\n      grid-template-areas: "title" "search" "actions";\n    }\n    .header-actions {\n      justify-content: stretch;\n    }\n  }\n  .table-area {\n    grid-area: table;\n    position: relative;\n    display: grid;\n    grid-template-columns: var(--list-grid);\n    grid-template-rows: 50px 1fr;\n    min-width: 0;\n    background: var(--bg-glass-strong);\n    border: 1px solid var(--border-glass);\n    border-radius: var(--radius-lg);\n    box-shadow: var(--shadow-glass);\n    backdrop-filter: var(--blur-glass);\n    -webkit-backdrop-filter: var(--blur-glass);\n    overflow: hidden;\n    transition: border-inline-start-radius 0.3s var(--ease-spring);\n  }\n  @media (min-width: 1025px) {\n    .list-container.panel-open .table-area {\n      border-top-right-radius: 0;\n      border-bottom-right-radius: 0;\n    }\n  }\n  .table-header {\n    grid-column: 1/-1;\n    display: grid;\n    grid-template-columns: var(--list-grid);\n    flex-shrink: 0;\n  }\n  .table-body {\n    grid-column: 1/-1;\n    display: grid;\n    grid-template-columns: var(--list-grid);\n    grid-auto-rows: minmax(auto, max-content);\n    min-height: 0;\n    overflow-y: auto;\n    scrollbar-width: none;\n    -ms-overflow-style: none;\n  }\n  .table-body::-webkit-scrollbar {\n    display: none;\n  }\n  :host ::ng-deep .table-header > *,\n  :host ::ng-deep .table-body > * {\n    min-width: 0;\n  }\n  :host ::ng-deep .table-body .col-name {\n    display: block;\n    overflow-wrap: break-word;\n  }\n  .filter-panel {\n    grid-area: panel;\n    display: flex;\n    flex-direction: column;\n    width: 220px;\n    min-width: 220px;\n    background: var(--bg-glass-strong);\n    border-inline-start: 3px solid var(--color-primary);\n    border-radius: 0 var(--radius-lg) var(--radius-lg) 0;\n    box-shadow: var(--shadow-glass);\n    backdrop-filter: var(--blur-glass);\n    -webkit-backdrop-filter: var(--blur-glass);\n    overflow-y: auto;\n    scrollbar-width: none;\n    -ms-overflow-style: none;\n    transition:\n      width 0.3s var(--ease-spring),\n      min-width 0.3s var(--ease-spring),\n      opacity 0.25s var(--ease-smooth);\n  }\n  .filter-panel::-webkit-scrollbar {\n    display: none;\n  }\n  .filter-panel.collapsed {\n    width: 0;\n    min-width: 0;\n    border-inline-start-width: 0;\n    overflow: hidden;\n  }\n  .filter-panel.collapsed .panel-content {\n    opacity: 0;\n    transform: translateX(8px);\n    pointer-events: none;\n  }\n  .panel-toggle-icon {\n    display: grid;\n    place-content: center;\n    align-self: flex-end;\n    flex-shrink: 0;\n    width: 2rem;\n    height: 2rem;\n    margin: 0.625rem 0.625rem 0;\n    padding: 0;\n    background: transparent;\n    color: var(--color-text-muted-light);\n    border: none;\n    border-radius: var(--radius-sm);\n    cursor: pointer;\n    opacity: 0;\n    transition:\n      opacity 0.2s var(--ease-smooth),\n      background 0.2s ease,\n      color 0.2s ease;\n  }\n  .panel-toggle-icon:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  .filter-panel:hover .panel-toggle-icon {\n    opacity: 1;\n  }\n  .panel-content {\n    padding: 0.5rem 1rem 1rem;\n    min-height: 12.5rem;\n    transition: opacity 0.25s var(--ease-spring), transform 0.25s var(--ease-spring);\n  }\n  .panel-backdrop {\n    display: none;\n    position: absolute;\n    inset: 0;\n    z-index: 9;\n    background: var(--overlay-backdrop);\n    opacity: 0;\n    pointer-events: none;\n    transition: opacity 0.25s var(--ease-smooth);\n  }\n  @media (max-width: 1024px) {\n    .list-container {\n      display: grid;\n      grid-template-rows: auto 1fr;\n      grid-template-columns: 1fr;\n      grid-template-areas: "header" "table";\n      position: relative;\n      padding: 1rem;\n    }\n    .panel-backdrop {\n      display: block;\n      grid-row: 2;\n      grid-column: 1;\n      position: absolute;\n      inset: 0;\n      z-index: 9;\n    }\n    .panel-backdrop.visible {\n      opacity: 1;\n      pointer-events: auto;\n    }\n    .filter-panel {\n      grid-row: 2;\n      grid-column: 1;\n      position: absolute;\n      inset-block: 0;\n      right: 0;\n      left: auto;\n      z-index: 10;\n      width: 300px;\n      min-width: 0;\n      background: var(--bg-glass-strong);\n      backdrop-filter: var(--blur-glass);\n      -webkit-backdrop-filter: var(--blur-glass);\n      border-inline-start: none;\n      border-top-left-radius: var(--radius-lg);\n      border-bottom-left-radius: var(--radius-lg);\n      border-top-right-radius: 0;\n      border-bottom-right-radius: 0;\n      box-shadow: var(--shadow-modal);\n      overflow-y: auto;\n      transform: translateX(110%);\n      opacity: 0;\n      pointer-events: none;\n      transition: transform 0.35s var(--ease-spring), opacity 0.2s var(--ease-smooth);\n    }\n    .filter-panel.collapsed {\n      width: 300px;\n      min-width: 0;\n      border-inline-start-width: 0;\n      overflow: hidden;\n    }\n    .filter-panel.collapsed .panel-content {\n      transform: none;\n    }\n    .filter-panel:not(.collapsed) {\n      transform: translateX(0);\n      opacity: 1;\n      pointer-events: auto;\n    }\n    .panel-content {\n      transition: opacity 0.25s var(--ease-spring), transform 0.25s var(--ease-spring);\n    }\n    .panel-toggle-icon {\n      opacity: 1;\n    }\n  }\n  @media (max-width: 768px) {\n    .filter-panel {\n      position: fixed;\n      inset-block: 1rem;\n      right: 0;\n      left: auto;\n      z-index: 1000;\n      width: min(85vw, 340px);\n      max-height: calc(100dvh - 2rem);\n      border-top-left-radius: var(--radius-xl);\n      border-bottom-left-radius: var(--radius-xl);\n      border-top-right-radius: 0;\n      border-bottom-right-radius: 0;\n    }\n    .panel-backdrop {\n      position: fixed;\n      inset: 0;\n      z-index: 999;\n    }\n    .table-area {\n      grid-template-columns: var(--list-grid-mobile);\n    }\n    .table-header {\n      grid-template-columns: var(--list-grid-mobile);\n    }\n    .table-body {\n      grid-template-columns: var(--list-grid-mobile);\n    }\n  }\n}\n/*# sourceMappingURL=list-shell.component.css.map */\n'] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ListShellComponent, { className: "ListShellComponent", filePath: "src/app/shared/list-shell/list-shell.component.ts", lineNumber: 20 });
})();

// src/app/shared/carousel-header/carousel-header.component.ts
var _c03 = ["*"];
var CarouselHeaderColumnDirective = class _CarouselHeaderColumnDirective {
  label = input("");
  static \u0275fac = function CarouselHeaderColumnDirective_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _CarouselHeaderColumnDirective)();
  };
  static \u0275dir = /* @__PURE__ */ \u0275\u0275defineDirective({ type: _CarouselHeaderColumnDirective, selectors: [["", "carouselHeaderColumn", ""]], inputs: { label: [1, "label"] } });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CarouselHeaderColumnDirective, [{
    type: Directive,
    args: [{
      selector: "[carouselHeaderColumn]",
      standalone: true
    }]
  }], null, null);
})();
var CarouselHeaderComponent = class _CarouselHeaderComponent {
  columns;
  activeIndex = input(0);
  activeIndexChange = output();
  currentIndex = signal(0);
  constructor() {
    effect(() => {
      this.currentIndex.set(this.activeIndex());
    });
  }
  ngAfterViewInit() {
    this.currentIndex.set(this.activeIndex());
  }
  getCurrentLabel() {
    const list = this.columns?.toArray() ?? [];
    return list[this.currentIndex()]?.label() ?? "";
  }
  prev() {
    const count = this.columns?.length ?? 0;
    if (count === 0)
      return;
    const idx = this.currentIndex() - 1;
    this.currentIndex.set(idx < 0 ? count - 1 : idx);
    this.activeIndexChange.emit(this.currentIndex());
  }
  next() {
    const count = this.columns?.length ?? 0;
    if (count === 0)
      return;
    this.currentIndex.set((this.currentIndex() + 1) % count);
    this.activeIndexChange.emit(this.currentIndex());
  }
  static \u0275fac = function CarouselHeaderComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _CarouselHeaderComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _CarouselHeaderComponent, selectors: [["app-carousel-header"]], contentQueries: function CarouselHeaderComponent_ContentQueries(rf, ctx, dirIndex) {
    if (rf & 1) {
      \u0275\u0275contentQuery(dirIndex, CarouselHeaderColumnDirective, 4);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.columns = _t);
    }
  }, inputs: { activeIndex: [1, "activeIndex"] }, outputs: { activeIndexChange: "activeIndexChange" }, ngContentSelectors: _c03, decls: 8, vars: 5, consts: [[1, "carousel-header-label"], ["type", "button", "aria-label", "Previous column", 1, "carousel-header-arrow", "prev", 3, "click"], ["name", "chevron-right", 3, "size"], ["type", "button", "aria-label", "Next column", 1, "carousel-header-arrow", "next", 3, "click"], ["name", "chevron-left", 3, "size"]], template: function CarouselHeaderComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275projectionDef();
      \u0275\u0275projection(0);
      \u0275\u0275elementStart(1, "div", 0);
      \u0275\u0275text(2);
      \u0275\u0275pipe(3, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "button", 1);
      \u0275\u0275listener("click", function CarouselHeaderComponent_Template_button_click_4_listener($event) {
        ctx.prev();
        return $event.stopPropagation();
      });
      \u0275\u0275element(5, "lucide-icon", 2);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(6, "button", 3);
      \u0275\u0275listener("click", function CarouselHeaderComponent_Template_button_click_6_listener($event) {
        ctx.next();
        return $event.stopPropagation();
      });
      \u0275\u0275element(7, "lucide-icon", 4);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 3, ctx.getCurrentLabel()));
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 14);
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 14);
    }
  }, dependencies: [LucideAngularModule, LucideAngularComponent, TranslatePipe], styles: ["\n\n@layer components.carousel-header {\n  [_nghost-%COMP%] {\n    display: contents;\n  }\n  .carousel-header-label[_ngcontent-%COMP%] {\n    display: none;\n  }\n  .carousel-header-arrow[_ngcontent-%COMP%] {\n    display: none;\n  }\n  @media (max-width: 768px) {\n    [_nghost-%COMP%] {\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      position: relative;\n      min-width: 0;\n      background: var(--bg-glass);\n      overflow: hidden;\n      transition: background 0.15s ease;\n    }\n    [_nghost-%COMP%]     [carouselHeaderColumn] {\n      display: none !important;\n    }\n    .carousel-header-label[_ngcontent-%COMP%] {\n      display: block;\n      font-size: 0.8125rem;\n      font-weight: 600;\n      color: var(--color-text-muted);\n    }\n    .carousel-header-arrow[_ngcontent-%COMP%] {\n      display: grid;\n      place-content: center;\n      position: absolute;\n      z-index: 1;\n      top: 0;\n      bottom: 0;\n      width: 1.5rem;\n      padding: 0;\n      background: var(--bg-glass);\n      color: var(--color-text-muted);\n      border: none;\n      cursor: pointer;\n      opacity: 0;\n      transition: opacity 0.2s var(--ease-smooth), background 0.2s ease;\n    }\n    .carousel-header-arrow[_ngcontent-%COMP%]:hover {\n      background: var(--bg-glass-hover);\n      color: var(--color-text-main);\n    }\n    [_nghost-%COMP%]:hover   .carousel-header-arrow[_ngcontent-%COMP%] {\n      opacity: 1;\n    }\n    .carousel-header-arrow.prev[_ngcontent-%COMP%] {\n      inset-inline-start: 0;\n      border-inline-end: 1px solid var(--border-default);\n    }\n    .carousel-header-arrow.next[_ngcontent-%COMP%] {\n      inset-inline-end: 0;\n      border-inline-start: 1px solid var(--border-default);\n    }\n  }\n  @media (max-width: 768px) and (hover: none) {\n    .carousel-header-arrow[_ngcontent-%COMP%] {\n      opacity: 0.6;\n    }\n  }\n}\n/*# sourceMappingURL=carousel-header.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CarouselHeaderComponent, [{
    type: Component,
    args: [{ selector: "app-carousel-header", standalone: true, imports: [LucideAngularModule, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: '<ng-content></ng-content>\r\n<div class="carousel-header-label">{{ getCurrentLabel() | translatePipe }}</div>\r\n<button type="button" class="carousel-header-arrow prev"\r\n  (click)="prev(); $event.stopPropagation()" aria-label="Previous column">\r\n  <lucide-icon name="chevron-right" [size]="14"></lucide-icon>\r\n</button>\r\n<button type="button" class="carousel-header-arrow next"\r\n  (click)="next(); $event.stopPropagation()" aria-label="Next column">\r\n  <lucide-icon name="chevron-left" [size]="14"></lucide-icon>\r\n</button>\r\n', styles: ["/* src/app/shared/carousel-header/carousel-header.component.scss */\n@layer components.carousel-header {\n  :host {\n    display: contents;\n  }\n  .carousel-header-label {\n    display: none;\n  }\n  .carousel-header-arrow {\n    display: none;\n  }\n  @media (max-width: 768px) {\n    :host {\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      position: relative;\n      min-width: 0;\n      background: var(--bg-glass);\n      overflow: hidden;\n      transition: background 0.15s ease;\n    }\n    :host ::ng-deep [carouselHeaderColumn] {\n      display: none !important;\n    }\n    .carousel-header-label {\n      display: block;\n      font-size: 0.8125rem;\n      font-weight: 600;\n      color: var(--color-text-muted);\n    }\n    .carousel-header-arrow {\n      display: grid;\n      place-content: center;\n      position: absolute;\n      z-index: 1;\n      top: 0;\n      bottom: 0;\n      width: 1.5rem;\n      padding: 0;\n      background: var(--bg-glass);\n      color: var(--color-text-muted);\n      border: none;\n      cursor: pointer;\n      opacity: 0;\n      transition: opacity 0.2s var(--ease-smooth), background 0.2s ease;\n    }\n    .carousel-header-arrow:hover {\n      background: var(--bg-glass-hover);\n      color: var(--color-text-main);\n    }\n    :host:hover .carousel-header-arrow {\n      opacity: 1;\n    }\n    .carousel-header-arrow.prev {\n      inset-inline-start: 0;\n      border-inline-end: 1px solid var(--border-default);\n    }\n    .carousel-header-arrow.next {\n      inset-inline-end: 0;\n      border-inline-start: 1px solid var(--border-default);\n    }\n  }\n  @media (max-width: 768px) and (hover: none) {\n    .carousel-header-arrow {\n      opacity: 0.6;\n    }\n  }\n}\n/*# sourceMappingURL=carousel-header.component.css.map */\n"] }]
  }], () => [], { columns: [{
    type: ContentChildren,
    args: [CarouselHeaderColumnDirective]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(CarouselHeaderComponent, { className: "CarouselHeaderComponent", filePath: "src/app/shared/carousel-header/carousel-header.component.ts", lineNumber: 32 });
})();

// src/app/shared/list-selection/list-selection.state.ts
var ListSelectionState = class {
  selectedIds = signal(/* @__PURE__ */ new Set());
  selectionMode = computed(() => this.selectedIds().size > 0);
  toggle(id) {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id))
        next.delete(id);
      else
        next.add(id);
      return next;
    });
  }
  clear() {
    this.selectedIds.set(/* @__PURE__ */ new Set());
  }
  isSelected(id) {
    return this.selectedIds().has(id);
  }
  /** Set selection to exactly the given ids (e.g. all visible/filtered item ids). */
  selectAll(ids) {
    this.selectedIds.set(new Set(ids));
  }
  /** True if every id in the given list is selected. */
  allSelected(ids) {
    if (ids.length === 0)
      return false;
    const set = this.selectedIds();
    return ids.every((id) => set.has(id));
  }
  /** True if at least one id in the given list is selected. */
  someSelected(ids) {
    const set = this.selectedIds();
    return ids.some((id) => set.has(id));
  }
  /**
   * Toggle select-all: if all visible ids are selected, clear; otherwise select all visible.
   * Call from header checkbox click.
   */
  toggleSelectAll(visibleIds) {
    if (this.allSelected(visibleIds)) {
      this.clear();
    } else {
      this.selectAll(visibleIds);
    }
  }
};

// src/app/shared/list-selection/list-row-checkbox.component.ts
var ListRowCheckboxComponent = class _ListRowCheckboxComponent {
  checked = input(false);
  disabled = input(false);
  toggle = output();
  onCheckboxClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled())
      return;
    this.toggle.emit();
  }
  static \u0275fac = function ListRowCheckboxComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ListRowCheckboxComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ListRowCheckboxComponent, selectors: [["app-list-row-checkbox"]], inputs: { checked: [1, "checked"], disabled: [1, "disabled"] }, outputs: { toggle: "toggle" }, decls: 2, vars: 3, consts: [["role", "button", "tabindex", "0", 1, "list-row-checkbox", 3, "click", "keydown.enter", "keydown.space"], ["type", "checkbox", "tabindex", "-1", 3, "checked", "disabled"]], template: function ListRowCheckboxComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0);
      \u0275\u0275listener("click", function ListRowCheckboxComponent_Template_div_click_0_listener($event) {
        return ctx.onCheckboxClick($event);
      })("keydown.enter", function ListRowCheckboxComponent_Template_div_keydown_enter_0_listener($event) {
        return ctx.onCheckboxClick($event);
      })("keydown.space", function ListRowCheckboxComponent_Template_div_keydown_space_0_listener($event) {
        $event.preventDefault();
        return ctx.onCheckboxClick($event);
      });
      \u0275\u0275element(1, "input", 1);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance();
      \u0275\u0275property("checked", ctx.checked())("disabled", ctx.disabled());
      \u0275\u0275attribute("aria-label", ctx.checked() ? "Deselect row" : "Select row");
    }
  }, styles: ["\n\n@layer components.list-selection {\n  [_nghost-%COMP%] {\n    display: block;\n  }\n  .list-row-checkbox[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    min-width: 0;\n    padding: 0.25rem;\n    cursor: pointer;\n  }\n  .list-row-checkbox[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%] {\n    width: 0.75rem;\n    height: 0.75rem;\n    margin: 0;\n    cursor: pointer;\n    accent-color: var(--color-primary);\n  }\n}\n/*# sourceMappingURL=list-row-checkbox.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ListRowCheckboxComponent, [{
    type: Component,
    args: [{ selector: "app-list-row-checkbox", standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="list-row-checkbox" (click)="onCheckboxClick($event)" role="button" tabindex="0" (keydown.enter)="onCheckboxClick($event)" (keydown.space)="$event.preventDefault(); onCheckboxClick($event)">\r
  <input\r
    type="checkbox"\r
    [checked]="checked()"\r
    [disabled]="disabled()"\r
    [attr.aria-label]="checked() ? 'Deselect row' : 'Select row'"\r
    tabindex="-1"\r
  />\r
</div>\r
`, styles: ["/* src/app/shared/list-selection/list-row-checkbox.component.scss */\n@layer components.list-selection {\n  :host {\n    display: block;\n  }\n  .list-row-checkbox {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    min-width: 0;\n    padding: 0.25rem;\n    cursor: pointer;\n  }\n  .list-row-checkbox input[type=checkbox] {\n    width: 0.75rem;\n    height: 0.75rem;\n    margin: 0;\n    cursor: pointer;\n    accent-color: var(--color-primary);\n  }\n}\n/*# sourceMappingURL=list-row-checkbox.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ListRowCheckboxComponent, { className: "ListRowCheckboxComponent", filePath: "src/app/shared/list-selection/list-row-checkbox.component.ts", lineNumber: 10 });
})();

// src/app/shared/selection-bar/selection-bar.component.ts
function SelectionBarComponent_Conditional_0_Conditional_16_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-custom-select", 11);
    \u0275\u0275listener("valueChange", function SelectionBarComponent_Conditional_0_Conditional_16_Conditional_0_Template_app_custom_select_valueChange_0_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.onFieldSelect($event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275property("options", ctx_r1.fieldOptions_())("placeholder", "change_field")("translateLabels", true)("compact", true);
  }
}
function SelectionBarComponent_Conditional_0_Conditional_16_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 10)(1, "span", 12);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "app-custom-select", 13);
    \u0275\u0275listener("valueChange", function SelectionBarComponent_Conditional_0_Conditional_16_Conditional_1_Template_app_custom_select_valueChange_4_listener($event) {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.onValueSelect($event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 14);
    \u0275\u0275listener("click", function SelectionBarComponent_Conditional_0_Conditional_16_Conditional_1_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.onCancelEdit());
    });
    \u0275\u0275element(6, "lucide-icon", 6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_7_0;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", \u0275\u0275pipeBind1(3, 8, ctx_r1.activeField_().label), ":");
    \u0275\u0275advance(2);
    \u0275\u0275property("options", ctx_r1.activeField_().options)("placeholder", "select_value")("translateLabels", true)("addNewValue", (tmp_7_0 = ctx_r1.activeField_().addNewValue) !== null && tmp_7_0 !== void 0 ? tmp_7_0 : "")("typeToFilter", true)("compact", true);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 14);
  }
}
function SelectionBarComponent_Conditional_0_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, SelectionBarComponent_Conditional_0_Conditional_16_Conditional_0_Template, 1, 4, "app-custom-select", 9)(1, SelectionBarComponent_Conditional_0_Conditional_16_Conditional_1_Template, 7, 10, "div", 10);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275conditional(!ctx_r1.activeField_() ? 0 : 1);
  }
}
function SelectionBarComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "span", 2);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 3);
    \u0275\u0275text(5);
    \u0275\u0275pipe(6, "translatePipe");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 4)(8, "button", 5);
    \u0275\u0275listener("click", function SelectionBarComponent_Conditional_0_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.selectionState().clear());
    });
    \u0275\u0275element(9, "lucide-icon", 6);
    \u0275\u0275text(10);
    \u0275\u0275pipe(11, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 7);
    \u0275\u0275listener("click", function SelectionBarComponent_Conditional_0_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onBulkDelete());
    });
    \u0275\u0275element(13, "lucide-icon", 8);
    \u0275\u0275text(14);
    \u0275\u0275pipe(15, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(16, SelectionBarComponent_Conditional_0_Conditional_16_Template, 2, 1);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.selectionState().selectedIds().size);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(6, 7, "items_selected"));
    \u0275\u0275advance(4);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(11, 9, "clear"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(15, 11, "delete"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.editableFields().length > 0 ? 16 : -1);
  }
}
var SelectionBarComponent = class _SelectionBarComponent {
  selectionState = input.required();
  editableFields = input([]);
  bulkDelete = output();
  bulkEdit = output();
  addNewRequested = output();
  activeField_ = signal(null);
  fieldOptions_ = computed(() => this.editableFields().map((f) => ({ value: f.key, label: f.label })));
  onFieldSelect(key) {
    this.activeField_.set(this.editableFields().find((f) => f.key === key) ?? null);
  }
  onValueSelect(value) {
    const field = this.activeField_();
    if (!field)
      return;
    if (value === field.addNewValue) {
      this.addNewRequested.emit({ field: field.key });
    } else {
      this.bulkEdit.emit({ field: field.key, value, ids: Array.from(this.selectionState().selectedIds()) });
      this.selectionState().clear();
    }
    this.activeField_.set(null);
  }
  onCancelEdit() {
    this.activeField_.set(null);
  }
  onBulkDelete() {
    this.bulkDelete.emit(Array.from(this.selectionState().selectedIds()));
  }
  static \u0275fac = function SelectionBarComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SelectionBarComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SelectionBarComponent, selectors: [["app-selection-bar"]], inputs: { selectionState: [1, "selectionState"], editableFields: [1, "editableFields"] }, outputs: { bulkDelete: "bulkDelete", bulkEdit: "bulkEdit", addNewRequested: "addNewRequested" }, decls: 1, vars: 1, consts: [[1, "selection-bar"], [1, "selection-bar__header"], [1, "selection-bar__count"], [1, "selection-bar__count-label"], [1, "selection-bar__actions"], ["type", "button", 1, "c-btn-ghost--sm", "selection-bar__btn", 3, "click"], ["name", "x", 3, "size"], ["type", "button", 1, "c-btn-ghost--sm", "selection-bar__btn", "selection-bar__btn--danger", 3, "click"], ["name", "trash-2", 3, "size"], [3, "options", "placeholder", "translateLabels", "compact"], [1, "selection-bar__edit-flow"], [3, "valueChange", "options", "placeholder", "translateLabels", "compact"], [1, "selection-bar__edit-label"], [3, "valueChange", "options", "placeholder", "translateLabels", "addNewValue", "typeToFilter", "compact"], ["type", "button", 1, "c-btn-ghost--sm", "selection-bar__btn--cancel", 3, "click"]], template: function SelectionBarComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275template(0, SelectionBarComponent_Conditional_0_Template, 17, 13, "div", 0);
    }
    if (rf & 2) {
      \u0275\u0275conditional(ctx.selectionState().selectionMode() ? 0 : -1);
    }
  }, dependencies: [TranslatePipe, CustomSelectComponent, LucideAngularModule, LucideAngularComponent], styles: ["\n\n@layer components.selection-bar {\n  .selection-bar[_ngcontent-%COMP%] {\n    position: relative;\n    z-index: 50;\n    display: flex;\n    flex-direction: column;\n    align-items: stretch;\n    min-inline-size: 22rem;\n    border: 1px solid var(--border-glass);\n    border-radius: var(--radius-lg);\n    color: var(--color-text);\n    background: var(--bg-glass-strong);\n    backdrop-filter: var(--blur-glass);\n    -webkit-backdrop-filter: var(--blur-glass);\n    box-shadow: var(--shadow-glass);\n  }\n  .selection-bar__header[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 0.25rem;\n    padding-block: 0.375rem;\n    padding-inline: 1rem;\n    border-block-end: 1px solid var(--border-glass);\n    background: color-mix(in srgb, var(--color-primary) 8%, transparent);\n  }\n  .selection-bar__count[_ngcontent-%COMP%] {\n    color: var(--color-primary);\n    font-weight: 700;\n    font-size: 0.9375rem;\n  }\n  .selection-bar__count-label[_ngcontent-%COMP%] {\n    color: var(--color-text-muted, var(--color-text));\n    font-size: 0.8125rem;\n    font-weight: 500;\n  }\n  .selection-bar__actions[_ngcontent-%COMP%] {\n    display: flex;\n    flex-direction: row;\n    align-items: center;\n    flex-wrap: wrap;\n    justify-content: space-evenly;\n    gap: 0.375rem;\n    padding-block: 0.5rem;\n    padding-inline: 0.75rem;\n  }\n  .selection-bar__btn[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    gap: 0.25rem;\n    white-space: nowrap;\n  }\n  .selection-bar__btn.selection-bar__btn--danger[_ngcontent-%COMP%]:hover {\n    color: var(--color-danger);\n    border-color: var(--color-danger);\n  }\n  .selection-bar__edit-flow[_ngcontent-%COMP%] {\n    display: inline-flex;\n    flex-direction: row;\n    align-items: center;\n    gap: 0.375rem;\n  }\n  .selection-bar__edit-label[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    color: var(--color-text-muted, var(--color-text));\n    font-size: 0.8125rem;\n    white-space: nowrap;\n  }\n  .selection-bar__btn--cancel[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    block-size: 1.75rem;\n    inline-size: 1.75rem;\n    padding: 0;\n  }\n}\n/*# sourceMappingURL=selection-bar.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SelectionBarComponent, [{
    type: Component,
    args: [{ selector: "app-selection-bar", standalone: true, imports: [TranslatePipe, CustomSelectComponent, LucideAngularModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `@if (selectionState().selectionMode()) {\r
  <div class="selection-bar">\r
    <header class="selection-bar__header">\r
      <span class="selection-bar__count">{{ selectionState().selectedIds().size }}</span>\r
      <span class="selection-bar__count-label">{{ 'items_selected' | translatePipe }}</span>\r
    </header>\r
\r
    <div class="selection-bar__actions">\r
      <button type="button" class="c-btn-ghost--sm selection-bar__btn" (click)="selectionState().clear()">\r
        <lucide-icon name="x" [size]="16" />\r
        {{ 'clear' | translatePipe }}\r
      </button>\r
\r
      <button type="button" class="c-btn-ghost--sm selection-bar__btn selection-bar__btn--danger" (click)="onBulkDelete()">\r
        <lucide-icon name="trash-2" [size]="16" />\r
        {{ 'delete' | translatePipe }}\r
      </button>\r
\r
      @if (editableFields().length > 0) {\r
        @if (!activeField_()) {\r
          <app-custom-select\r
            [options]="fieldOptions_()"\r
            [placeholder]="'change_field'"\r
            [translateLabels]="true"\r
            [compact]="true"\r
            (valueChange)="onFieldSelect($event)" />\r
        } @else {\r
          <div class="selection-bar__edit-flow">\r
            <span class="selection-bar__edit-label">{{ activeField_()!.label | translatePipe }}:</span>\r
            <app-custom-select\r
              [options]="activeField_()!.options"\r
              [placeholder]="'select_value'"\r
              [translateLabels]="true"\r
              [addNewValue]="activeField_()!.addNewValue ?? ''"\r
              [typeToFilter]="true"\r
              [compact]="true"\r
              (valueChange)="onValueSelect($event)" />\r
            <button type="button" class="c-btn-ghost--sm selection-bar__btn--cancel" (click)="onCancelEdit()">\r
              <lucide-icon name="x" [size]="14" />\r
            </button>\r
          </div>\r
        }\r
      }\r
    </div>\r
  </div>\r
}\r
`, styles: ["/* src/app/shared/selection-bar/selection-bar.component.scss */\n@layer components.selection-bar {\n  .selection-bar {\n    position: relative;\n    z-index: 50;\n    display: flex;\n    flex-direction: column;\n    align-items: stretch;\n    min-inline-size: 22rem;\n    border: 1px solid var(--border-glass);\n    border-radius: var(--radius-lg);\n    color: var(--color-text);\n    background: var(--bg-glass-strong);\n    backdrop-filter: var(--blur-glass);\n    -webkit-backdrop-filter: var(--blur-glass);\n    box-shadow: var(--shadow-glass);\n  }\n  .selection-bar__header {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 0.25rem;\n    padding-block: 0.375rem;\n    padding-inline: 1rem;\n    border-block-end: 1px solid var(--border-glass);\n    background: color-mix(in srgb, var(--color-primary) 8%, transparent);\n  }\n  .selection-bar__count {\n    color: var(--color-primary);\n    font-weight: 700;\n    font-size: 0.9375rem;\n  }\n  .selection-bar__count-label {\n    color: var(--color-text-muted, var(--color-text));\n    font-size: 0.8125rem;\n    font-weight: 500;\n  }\n  .selection-bar__actions {\n    display: flex;\n    flex-direction: row;\n    align-items: center;\n    flex-wrap: wrap;\n    justify-content: space-evenly;\n    gap: 0.375rem;\n    padding-block: 0.5rem;\n    padding-inline: 0.75rem;\n  }\n  .selection-bar__btn {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    gap: 0.25rem;\n    white-space: nowrap;\n  }\n  .selection-bar__btn.selection-bar__btn--danger:hover {\n    color: var(--color-danger);\n    border-color: var(--color-danger);\n  }\n  .selection-bar__edit-flow {\n    display: inline-flex;\n    flex-direction: row;\n    align-items: center;\n    gap: 0.375rem;\n  }\n  .selection-bar__edit-label {\n    display: inline-flex;\n    align-items: center;\n    color: var(--color-text-muted, var(--color-text));\n    font-size: 0.8125rem;\n    white-space: nowrap;\n  }\n  .selection-bar__btn--cancel {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    block-size: 1.75rem;\n    inline-size: 1.75rem;\n    padding: 0;\n  }\n}\n/*# sourceMappingURL=selection-bar.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SelectionBarComponent, { className: "SelectionBarComponent", filePath: "src/app/shared/selection-bar/selection-bar.component.ts", lineNumber: 16 });
})();

// src/app/core/utils/panel-preference.util.ts
var STORAGE_PREFIX = "list-panel:";
function getPanelOpen(context) {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_PREFIX + context) : null;
    if (raw === null)
      return true;
    const value = JSON.parse(raw);
    return value === true;
  } catch {
    return true;
  }
}
function setPanelOpen(context, open) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_PREFIX + context, JSON.stringify(open));
    }
  } catch {
  }
}

export {
  CellCarouselSlideDirective,
  CellCarouselComponent,
  ListShellComponent,
  CarouselHeaderColumnDirective,
  CarouselHeaderComponent,
  ListSelectionState,
  ListRowCheckboxComponent,
  SelectionBarComponent,
  getPanelOpen,
  setPanelOpen
};
//# sourceMappingURL=chunk-FIK4BYDO.js.map
