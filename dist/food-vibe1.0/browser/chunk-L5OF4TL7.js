import {
  Injectable,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/global-specific-modal.service.ts
var GlobalSpecificModalService = class _GlobalSpecificModalService {
  isOpen_ = signal(false);
  config_ = signal(null);
  resolve_ = null;
  isOpen = this.isOpen_.asReadonly();
  config = this.config_.asReadonly();
  open(config) {
    this.config_.set(config);
    this.isOpen_.set(true);
    return new Promise((resolve) => {
      this.resolve_ = resolve;
    });
  }
  choose(choice) {
    this.resolve_?.(choice);
    this.resolve_ = null;
    this.isOpen_.set(false);
    this.config_.set(null);
  }
  static \u0275fac = function GlobalSpecificModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _GlobalSpecificModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _GlobalSpecificModalService, factory: _GlobalSpecificModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(GlobalSpecificModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  GlobalSpecificModalService
};
//# sourceMappingURL=chunk-L5OF4TL7.js.map
