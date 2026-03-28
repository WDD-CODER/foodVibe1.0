import {
  Injectable,
  Subject,
  firstValueFrom,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/add-equipment-modal.service.ts
var AddEquipmentModalService = class _AddEquipmentModalService {
  resultSubject = new Subject();
  initialName_ = signal("");
  isOpen_ = signal(false);
  /** Initial name to pre-fill when opening (e.g. from logistics search). */
  initialName = this.initialName_.asReadonly();
  open(initialName) {
    this.initialName_.set(initialName?.trim() ?? "");
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }
  save(result) {
    this.resultSubject.next(result);
    this.close();
  }
  cancel() {
    this.resultSubject.next(null);
    this.close();
  }
  close() {
    this.isOpen_.set(false);
    this.initialName_.set("");
  }
  static \u0275fac = function AddEquipmentModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AddEquipmentModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AddEquipmentModalService, factory: _AddEquipmentModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AddEquipmentModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/core/services/ai-recipe-draft.service.ts
var AiRecipeDraftService = class _AiRecipeDraftService {
  draft_ = signal(null);
  draft = this.draft_.asReadonly();
  set(draft) {
    this.draft_.set(draft);
  }
  consume() {
    const d = this.draft_();
    this.draft_.set(null);
    return d;
  }
  static \u0275fac = function AiRecipeDraftService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AiRecipeDraftService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AiRecipeDraftService, factory: _AiRecipeDraftService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AiRecipeDraftService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/core/services/recipe-text-import-modal.service.ts
var RecipeTextImportModalService = class _RecipeTextImportModalService {
  isOpen = signal(false);
  onResult_ = null;
  open(onResult) {
    this.onResult_ = onResult;
    this.isOpen.set(true);
  }
  close() {
    this.onResult_ = null;
    this.isOpen.set(false);
  }
  deliver(result) {
    this.onResult_?.(result);
    this.close();
  }
  static \u0275fac = function RecipeTextImportModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RecipeTextImportModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _RecipeTextImportModalService, factory: _RecipeTextImportModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RecipeTextImportModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/core/services/quick-add-product-modal.service.ts
var QuickAddProductModalService = class _QuickAddProductModalService {
  resultSubject = new Subject();
  config_ = signal(null);
  isOpen_ = signal(false);
  config = this.config_.asReadonly();
  open(config) {
    this.config_.set(config);
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }
  save(product) {
    this.resultSubject.next(product);
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
  static \u0275fac = function QuickAddProductModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _QuickAddProductModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _QuickAddProductModalService, factory: _QuickAddProductModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(QuickAddProductModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  AddEquipmentModalService,
  QuickAddProductModalService,
  AiRecipeDraftService,
  RecipeTextImportModalService
};
//# sourceMappingURL=chunk-3AYLBXN4.js.map
