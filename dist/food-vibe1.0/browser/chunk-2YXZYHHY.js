import {
  Injectable,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/restore-choice-modal.service.ts
var RestoreChoiceModalService = class _RestoreChoiceModalService {
  isOpen_ = signal(false);
  resolve_ = null;
  isOpen = this.isOpen_.asReadonly();
  open() {
    this.isOpen_.set(true);
    return new Promise((resolve) => {
      this.resolve_ = resolve;
    });
  }
  choose(choice) {
    this.resolve_?.(choice);
    this.resolve_ = null;
    this.isOpen_.set(false);
  }
  static \u0275fac = function RestoreChoiceModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RestoreChoiceModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _RestoreChoiceModalService, factory: _RestoreChoiceModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RestoreChoiceModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  RestoreChoiceModalService
};
//# sourceMappingURL=chunk-2YXZYHHY.js.map
