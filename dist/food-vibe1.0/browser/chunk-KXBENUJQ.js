import {
  ChangeDetectionStrategy,
  Component,
  RouterOutlet,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵdefineComponent,
  ɵɵelement
} from "./chunk-FJPSXAXA.js";

// src/app/pages/suppliers/suppliers.page.ts
var SuppliersPage = class _SuppliersPage {
  static \u0275fac = function SuppliersPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SuppliersPage)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SuppliersPage, selectors: [["app-suppliers-page"]], decls: 1, vars: 0, template: function SuppliersPage_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275element(0, "router-outlet");
    }
  }, dependencies: [RouterOutlet], styles: ["\n\n@layer components.suppliers {\n  [_nghost-%COMP%] {\n    display: block;\n  }\n}\n/*# sourceMappingURL=suppliers.page.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SuppliersPage, [{
    type: Component,
    args: [{ selector: "app-suppliers-page", standalone: true, imports: [RouterOutlet], changeDetection: ChangeDetectionStrategy.OnPush, template: "<router-outlet></router-outlet>\r\n", styles: ["/* src/app/pages/suppliers/suppliers.page.scss */\n@layer components.suppliers {\n  :host {\n    display: block;\n  }\n}\n/*# sourceMappingURL=suppliers.page.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SuppliersPage, { className: "SuppliersPage", filePath: "src/app/pages/suppliers/suppliers.page.ts", lineNumber: 12 });
})();
export {
  SuppliersPage
};
//# sourceMappingURL=chunk-KXBENUJQ.js.map
