import {
  Injectable,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-GCYOWW7U.js";

// src/app/core/services/confirm-modal.service.ts
var ConfirmModalService = class _ConfirmModalService {
  isOpen_ = signal(false);
  message_ = signal("");
  saveLabel_ = signal("save");
  variant_ = signal("default");
  resolve_ = null;
  isOpen = this.isOpen_.asReadonly();
  message = this.message_.asReadonly();
  saveLabel = this.saveLabel_.asReadonly();
  variant = this.variant_.asReadonly();
  open(message, options) {
    this.message_.set(message);
    const label = this.resolveSaveLabel(options);
    this.saveLabel_.set(label);
    this.variant_.set(options?.variant ?? "default");
    this.isOpen_.set(true);
    return new Promise((resolve) => {
      this.resolve_ = resolve;
    });
  }
  choose(confirmed) {
    this.resolve_?.(confirmed);
    this.resolve_ = null;
    this.isOpen_.set(false);
    this.message_.set("");
    this.saveLabel_.set("save");
    this.variant_.set("default");
  }
  resolveSaveLabel(options) {
    if (options?.saveLabel)
      return options.saveLabel;
    const title = options?.title;
    if (!title)
      return "save";
    if (title.startsWith("approve_"))
      return `save_approved_${title.slice(8)}`;
    if (title.startsWith("add_"))
      return `save_${title.slice(4)}`;
    return "save";
  }
  static \u0275fac = function ConfirmModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ConfirmModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ConfirmModalService, factory: _ConfirmModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ConfirmModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  ConfirmModalService
};
//# sourceMappingURL=chunk-OMWRJF5J.js.map
