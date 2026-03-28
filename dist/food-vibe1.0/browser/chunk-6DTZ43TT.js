import {
  Injectable,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/hero-fab.service.ts
var HeroFabService = class _HeroFabService {
  pageState_ = signal(null);
  pageActions = this.pageState_.asReadonly();
  setPageActions(actions, mode) {
    this.pageState_.set({ actions, mode });
  }
  clearPageActions() {
    this.pageState_.set(null);
  }
  static \u0275fac = function HeroFabService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _HeroFabService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _HeroFabService, factory: _HeroFabService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(HeroFabService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  HeroFabService
};
//# sourceMappingURL=chunk-6DTZ43TT.js.map
