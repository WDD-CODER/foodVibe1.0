import {
  Injectable,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-GCYOWW7U.js";

// src/app/core/services/auth-modal.service.ts
var AuthModalService = class _AuthModalService {
  isOpen = signal(false);
  mode = signal("sign-in");
  open(mode = "sign-in") {
    this.mode.set(mode);
    this.isOpen.set(true);
  }
  close() {
    this.isOpen.set(false);
  }
  static \u0275fac = function AuthModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AuthModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AuthModalService, factory: _AuthModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AuthModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  AuthModalService
};
//# sourceMappingURL=chunk-RXM3SI3E.js.map
