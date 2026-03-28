import {
  Injectable,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-GCYOWW7U.js";

// src/app/core/services/supplier-modal.service.ts
var SupplierModalService = class _SupplierModalService {
  isOpen_ = signal(false);
  isOpen = this.isOpen_.asReadonly();
  openAdd() {
    this.isOpen_.set(true);
  }
  close() {
    this.isOpen_.set(false);
  }
  static \u0275fac = function SupplierModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SupplierModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _SupplierModalService, factory: _SupplierModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SupplierModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  SupplierModalService
};
//# sourceMappingURL=chunk-RMZTF6WV.js.map
