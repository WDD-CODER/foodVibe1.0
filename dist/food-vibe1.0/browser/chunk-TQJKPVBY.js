import {
  KitchenStateService
} from "./chunk-ZA4PDXUK.js";
import "./chunk-IFJ5YUTT.js";
import "./chunk-ACTKISJR.js";
import "./chunk-VOTRTAY7.js";
import "./chunk-7WUWXC4O.js";
import "./chunk-WYZGJ7UG.js";
import "./chunk-OYT4PDSG.js";
import {
  ChangeDetectionStrategy,
  Component,
  RouterOutlet,
  inject,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵdefineComponent,
  ɵɵelement
} from "./chunk-GCYOWW7U.js";

// src/app/pages/inventory/inventory.page.ts
var InventoryPage = class _InventoryPage {
  kitchenStateService = inject(KitchenStateService);
  isDrawerOpen_ = this.kitchenStateService.isDrawerOpen_;
  selectedProductId_ = this.kitchenStateService.selectedProductId_;
  onClose() {
    this.kitchenStateService.isDrawerOpen_.set(false);
    setTimeout(() => this.kitchenStateService.selectedProductId_.set(null), 300);
  }
  static \u0275fac = function InventoryPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _InventoryPage)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _InventoryPage, selectors: [["inventory-page"]], decls: 1, vars: 0, template: function InventoryPage_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275element(0, "router-outlet");
    }
  }, dependencies: [RouterOutlet], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n  min-height: 100%;\n}\n/*# sourceMappingURL=inventory.page.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(InventoryPage, [{
    type: Component,
    args: [{ selector: "inventory-page", standalone: true, imports: [RouterOutlet], changeDetection: ChangeDetectionStrategy.OnPush, template: "<router-outlet></router-outlet>", styles: ["/* src/app/pages/inventory/inventory.page.scss */\n:host {\n  display: block;\n  min-height: 100%;\n}\n/*# sourceMappingURL=inventory.page.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(InventoryPage, { className: "InventoryPage", filePath: "src/app/pages/inventory/inventory.page.ts", lineNumber: 13 });
})();
export {
  InventoryPage
};
//# sourceMappingURL=chunk-TQJKPVBY.js.map
