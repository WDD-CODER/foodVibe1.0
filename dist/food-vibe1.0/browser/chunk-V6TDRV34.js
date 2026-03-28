import {
  Injectable,
  Subject,
  firstValueFrom,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/add-item-modal.service.ts
var AddItemModalService = class _AddItemModalService {
  resultSubject = new Subject();
  config_ = signal(null);
  isOpen_ = signal(false);
  config = this.config_.asReadonly();
  open(config) {
    this.config_.set(config);
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }
  save(value) {
    const trimmed = value.trim();
    if (!trimmed)
      return;
    this.resultSubject.next(trimmed);
    this.close();
  }
  cancel() {
    this.resultSubject.next(null);
    this.close();
  }
  close() {
    this.isOpen_.set(false);
    this.config_.set(null);
  }
  static \u0275fac = function AddItemModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AddItemModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AddItemModalService, factory: _AddItemModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AddItemModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  AddItemModalService
};
//# sourceMappingURL=chunk-V6TDRV34.js.map
