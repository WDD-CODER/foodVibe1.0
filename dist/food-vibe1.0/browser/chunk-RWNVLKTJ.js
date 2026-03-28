import {
  Injectable,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/shared/ai-recipe-modal/ai-recipe-modal.service.ts
var AiRecipeModalService = class _AiRecipeModalService {
  isOpen_ = signal(false);
  resolve_ = null;
  open() {
    this.isOpen_.set(true);
    return new Promise((resolve) => {
      this.resolve_ = resolve;
    });
  }
  close() {
    this.resolve_?.();
    this.resolve_ = null;
    this.isOpen_.set(false);
  }
  static \u0275fac = function AiRecipeModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AiRecipeModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AiRecipeModalService, factory: _AiRecipeModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AiRecipeModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  AiRecipeModalService
};
//# sourceMappingURL=chunk-RWNVLKTJ.js.map
