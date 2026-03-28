import {
  TranslatePipe
} from "./chunk-CH6HZ4GZ.js";
import {
  CommonModule,
  Component,
  input,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate
} from "./chunk-FJPSXAXA.js";

// src/app/shared/loader/loader.component.ts
function LoaderComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 9);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, ctx_r0.label()));
  }
}
var LoaderComponent = class _LoaderComponent {
  /** 'large' (48px), 'medium' (32px), 'small' (20px). Default: medium. */
  size = input("medium");
  /** Translation key for label below the pot (e.g. loader_please_wait). Shown for large/medium only. */
  label = input(void 0);
  /** When true, full-area glass overlay over parent. */
  overlay = input(false);
  /** When true, inline-flex (e.g. next to button text). */
  inline = input(false);
  static \u0275fac = function LoaderComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LoaderComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LoaderComponent, selectors: [["app-loader"]], inputs: { size: [1, "size"], label: [1, "label"], overlay: [1, "overlay"], inline: [1, "inline"] }, decls: 10, vars: 11, consts: [[1, "loader-wrap"], [1, "pot-wrap"], ["aria-hidden", "true", 1, "steam-wisp", "wisp-1"], ["aria-hidden", "true", 1, "steam-wisp", "wisp-2"], ["aria-hidden", "true", 1, "steam-wisp", "wisp-3"], ["viewBox", "0 0 48 40", "fill", "none", "xmlns", "http://www.w3.org/2000/svg", "aria-hidden", "true", 1, "pot"], ["d", "M8 14 L8 32 Q8 38 24 38 Q40 38 40 32 L40 14 L38 12 L10 12 Z", "stroke", "var(--color-primary)", "stroke-width", "2", "fill", "none", "stroke-linejoin", "round"], ["d", "M10 14 L38 14", "stroke", "var(--color-primary)", "stroke-width", "2", "stroke-linecap", "round"], ["d", "M6 18 L2 18 M42 18 L46 18", "stroke", "var(--color-primary)", "stroke-width", "1.5", "stroke-linecap", "round"], [1, "loader-label"]], template: function LoaderComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1);
      \u0275\u0275element(2, "div", 2)(3, "div", 3)(4, "div", 4);
      \u0275\u0275namespaceSVG();
      \u0275\u0275elementStart(5, "svg", 5);
      \u0275\u0275element(6, "path", 6)(7, "path", 7)(8, "path", 8);
      \u0275\u0275elementEnd()();
      \u0275\u0275template(9, LoaderComponent_Conditional_9_Template, 3, 3, "span", 9);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275classProp("overlay", ctx.overlay())("inline", ctx.inline())("size-large", ctx.size() === "large")("size-medium", ctx.size() === "medium")("size-small", ctx.size() === "small");
      \u0275\u0275advance(9);
      \u0275\u0275conditional(ctx.label() && ctx.size() !== "small" ? 9 : -1);
    }
  }, dependencies: [CommonModule, TranslatePipe], styles: ["\n\n.loader-wrap[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 1rem;\n  background: var(--bg-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.loader-wrap.inline[_ngcontent-%COMP%] {\n  display: inline-flex;\n  flex-direction: row;\n  align-items: center;\n  gap: 0.375rem;\n  padding: 0;\n  background: transparent;\n  border-radius: 0;\n  box-shadow: none;\n  backdrop-filter: none;\n  -webkit-backdrop-filter: none;\n}\n.loader-wrap.overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  z-index: 150;\n  background: var(--bg-glass);\n  border-radius: 0;\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.loader-wrap.size-small[_ngcontent-%COMP%]   .pot-wrap[_ngcontent-%COMP%] {\n  width: 1.875rem;\n  height: 1.59375rem;\n}\n.loader-wrap.size-small[_ngcontent-%COMP%]   .steam-wisp[_ngcontent-%COMP%] {\n  width: 0.28125rem;\n  height: 0.5625rem;\n  inset-block-end: 1.03125rem;\n}\n.loader-wrap.size-medium[_ngcontent-%COMP%]   .pot-wrap[_ngcontent-%COMP%] {\n  width: 3rem;\n  height: 2.53125rem;\n}\n.loader-wrap.size-medium[_ngcontent-%COMP%]   .steam-wisp[_ngcontent-%COMP%] {\n  width: 0.375rem;\n  height: 0.75rem;\n  inset-block-end: 1.6875rem;\n}\n.loader-wrap.size-large[_ngcontent-%COMP%]   .pot-wrap[_ngcontent-%COMP%] {\n  width: 6.75rem;\n  height: 5.625rem;\n}\n.loader-wrap.size-large[_ngcontent-%COMP%]   .steam-wisp[_ngcontent-%COMP%] {\n  width: 0.65625rem;\n  height: 1.3125rem;\n  inset-block-end: 3.65625rem;\n}\n.pot-wrap[_ngcontent-%COMP%] {\n  position: relative;\n  flex-shrink: 0;\n  width: 100%;\n  height: 100%;\n}\n.pot-wrap[_ngcontent-%COMP%]   .pot[_ngcontent-%COMP%] {\n  display: block;\n  width: 100%;\n  height: 100%;\n}\n.steam-wisp[_ngcontent-%COMP%] {\n  position: absolute;\n  inset-inline-start: 50%;\n  transform: translateX(-50%);\n  border-radius: 50%;\n  background: var(--color-primary-soft);\n  opacity: 0.7;\n  animation: _ngcontent-%COMP%_steam 1.5s ease-out infinite;\n}\n.steam-wisp.wisp-1[_ngcontent-%COMP%] {\n  animation-delay: 0s;\n  margin-inline-start: -0.5625rem;\n}\n.steam-wisp.wisp-2[_ngcontent-%COMP%] {\n  animation-delay: 0.3s;\n  margin-inline-start: 0;\n}\n.steam-wisp.wisp-3[_ngcontent-%COMP%] {\n  animation-delay: 0.6s;\n  margin-inline-start: 0.5625rem;\n}\n.size-small[_ngcontent-%COMP%]   .steam-wisp.wisp-1[_ngcontent-%COMP%] {\n  margin-inline-start: -0.375rem;\n}\n.size-small[_ngcontent-%COMP%]   .steam-wisp.wisp-3[_ngcontent-%COMP%] {\n  margin-inline-start: 0.375rem;\n}\n.size-large[_ngcontent-%COMP%]   .steam-wisp.wisp-1[_ngcontent-%COMP%] {\n  margin-inline-start: -0.84375rem;\n}\n.size-large[_ngcontent-%COMP%]   .steam-wisp.wisp-3[_ngcontent-%COMP%] {\n  margin-inline-start: 0.84375rem;\n}\n@keyframes _ngcontent-%COMP%_steam {\n  from {\n    opacity: 0.7;\n    transform: translateX(-50%) translateY(0) scaleX(1);\n  }\n  to {\n    opacity: 0;\n    transform: translateX(-50%) translateY(-1.5rem) scaleX(0.5);\n  }\n}\n.loader-label[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.loader-wrap.inline[_ngcontent-%COMP%]   .loader-label[_ngcontent-%COMP%] {\n  display: none;\n}\n@media (prefers-reduced-motion: reduce) {\n  .steam-wisp[_ngcontent-%COMP%] {\n    animation: _ngcontent-%COMP%_steam-reduced 1.2s ease-in-out infinite;\n  }\n}\n@keyframes _ngcontent-%COMP%_steam-reduced {\n  0%, 100% {\n    opacity: 0.4;\n  }\n  50% {\n    opacity: 0.8;\n  }\n}\n@media (max-width: 768px) {\n  .loader-wrap.size-large[_ngcontent-%COMP%]   .pot-wrap[_ngcontent-%COMP%] {\n    width: 5.25rem;\n    height: 4.40625rem;\n  }\n  .loader-wrap.size-large[_ngcontent-%COMP%]   .steam-wisp[_ngcontent-%COMP%] {\n    width: 0.5625rem;\n    height: 1.125rem;\n    inset-block-end: 2.90625rem;\n  }\n}\n/*# sourceMappingURL=loader.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LoaderComponent, [{
    type: Component,
    args: [{ selector: "app-loader", standalone: true, imports: [CommonModule, TranslatePipe], template: `<div class="loader-wrap" [class.overlay]="overlay()" [class.inline]="inline()" [class.size-large]="size() === 'large'" [class.size-medium]="size() === 'medium'" [class.size-small]="size() === 'small'">\r
  <div class="pot-wrap">\r
    <div class="steam-wisp wisp-1" aria-hidden="true"></div>\r
    <div class="steam-wisp wisp-2" aria-hidden="true"></div>\r
    <div class="steam-wisp wisp-3" aria-hidden="true"></div>\r
    <svg class="pot" viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\r
      <!-- Pot body: U-shape with rim -->\r
      <path d="M8 14 L8 32 Q8 38 24 38 Q40 38 40 32 L40 14 L38 12 L10 12 Z" stroke="var(--color-primary)" stroke-width="2" fill="none" stroke-linejoin="round"/>\r
      <!-- Rim line -->\r
      <path d="M10 14 L38 14" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>\r
      <!-- Handles -->\r
      <path d="M6 18 L2 18 M42 18 L46 18" stroke="var(--color-primary)" stroke-width="1.5" stroke-linecap="round"/>\r
    </svg>\r
  </div>\r
  @if (label() && size() !== 'small') {\r
    <span class="loader-label">{{ label()! | translatePipe }}</span>\r
  }\r
</div>\r
`, styles: ["/* src/app/shared/loader/loader.component.scss */\n.loader-wrap {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 1rem;\n  background: var(--bg-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.loader-wrap.inline {\n  display: inline-flex;\n  flex-direction: row;\n  align-items: center;\n  gap: 0.375rem;\n  padding: 0;\n  background: transparent;\n  border-radius: 0;\n  box-shadow: none;\n  backdrop-filter: none;\n  -webkit-backdrop-filter: none;\n}\n.loader-wrap.overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 150;\n  background: var(--bg-glass);\n  border-radius: 0;\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.loader-wrap.size-small .pot-wrap {\n  width: 1.875rem;\n  height: 1.59375rem;\n}\n.loader-wrap.size-small .steam-wisp {\n  width: 0.28125rem;\n  height: 0.5625rem;\n  inset-block-end: 1.03125rem;\n}\n.loader-wrap.size-medium .pot-wrap {\n  width: 3rem;\n  height: 2.53125rem;\n}\n.loader-wrap.size-medium .steam-wisp {\n  width: 0.375rem;\n  height: 0.75rem;\n  inset-block-end: 1.6875rem;\n}\n.loader-wrap.size-large .pot-wrap {\n  width: 6.75rem;\n  height: 5.625rem;\n}\n.loader-wrap.size-large .steam-wisp {\n  width: 0.65625rem;\n  height: 1.3125rem;\n  inset-block-end: 3.65625rem;\n}\n.pot-wrap {\n  position: relative;\n  flex-shrink: 0;\n  width: 100%;\n  height: 100%;\n}\n.pot-wrap .pot {\n  display: block;\n  width: 100%;\n  height: 100%;\n}\n.steam-wisp {\n  position: absolute;\n  inset-inline-start: 50%;\n  transform: translateX(-50%);\n  border-radius: 50%;\n  background: var(--color-primary-soft);\n  opacity: 0.7;\n  animation: steam 1.5s ease-out infinite;\n}\n.steam-wisp.wisp-1 {\n  animation-delay: 0s;\n  margin-inline-start: -0.5625rem;\n}\n.steam-wisp.wisp-2 {\n  animation-delay: 0.3s;\n  margin-inline-start: 0;\n}\n.steam-wisp.wisp-3 {\n  animation-delay: 0.6s;\n  margin-inline-start: 0.5625rem;\n}\n.size-small .steam-wisp.wisp-1 {\n  margin-inline-start: -0.375rem;\n}\n.size-small .steam-wisp.wisp-3 {\n  margin-inline-start: 0.375rem;\n}\n.size-large .steam-wisp.wisp-1 {\n  margin-inline-start: -0.84375rem;\n}\n.size-large .steam-wisp.wisp-3 {\n  margin-inline-start: 0.84375rem;\n}\n@keyframes steam {\n  from {\n    opacity: 0.7;\n    transform: translateX(-50%) translateY(0) scaleX(1);\n  }\n  to {\n    opacity: 0;\n    transform: translateX(-50%) translateY(-1.5rem) scaleX(0.5);\n  }\n}\n.loader-label {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.loader-wrap.inline .loader-label {\n  display: none;\n}\n@media (prefers-reduced-motion: reduce) {\n  .steam-wisp {\n    animation: steam-reduced 1.2s ease-in-out infinite;\n  }\n}\n@keyframes steam-reduced {\n  0%, 100% {\n    opacity: 0.4;\n  }\n  50% {\n    opacity: 0.8;\n  }\n}\n@media (max-width: 768px) {\n  .loader-wrap.size-large .pot-wrap {\n    width: 5.25rem;\n    height: 4.40625rem;\n  }\n  .loader-wrap.size-large .steam-wisp {\n    width: 0.5625rem;\n    height: 1.125rem;\n    inset-block-end: 2.90625rem;\n  }\n}\n/*# sourceMappingURL=loader.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LoaderComponent, { className: "LoaderComponent", filePath: "src/app/shared/loader/loader.component.ts", lineNumber: 12 });
})();

export {
  LoaderComponent
};
//# sourceMappingURL=chunk-G7HPFFIH.js.map
