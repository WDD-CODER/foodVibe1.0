import {
  sanitizeKey
} from "./chunk-7STEE3M4.js";
import {
  TranslationService
} from "./chunk-CH6HZ4GZ.js";
import {
  Injectable,
  Subject,
  firstValueFrom,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/shared/label-creation-modal/label-creation-modal.service.ts
var LabelCreationModalService = class _LabelCreationModalService {
  translationService = inject(TranslationService);
  resultSubject = new Subject();
  isOpen_ = signal(false);
  hebrewLabel_ = signal("");
  englishKey_ = signal("");
  selectedColor_ = signal("#3B82F6");
  selectedTriggers_ = signal([]);
  open() {
    this.hebrewLabel_.set("");
    this.englishKey_.set("");
    this.selectedColor_.set("#3B82F6");
    this.selectedTriggers_.set([]);
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }
  save(englishKey, hebrewLabel, color, autoTriggers) {
    const sanitizedKey = sanitizeKey(englishKey);
    const validation = this.translationService.validateEnglishKey(sanitizedKey);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    this.resultSubject.next({
      key: sanitizedKey,
      hebrewLabel: hebrewLabel.trim(),
      color: color || "#78716C",
      autoTriggers: autoTriggers ?? []
    });
    this.close();
  }
  cancel() {
    this.resultSubject.next(null);
    this.close();
  }
  close() {
    this.isOpen_.set(false);
    this.hebrewLabel_.set("");
    this.englishKey_.set("");
    this.selectedColor_.set("#3B82F6");
    this.selectedTriggers_.set([]);
  }
  validateKey(key) {
    return this.translationService.validateEnglishKey(key);
  }
  toggleTrigger(value) {
    const current = this.selectedTriggers_();
    if (current.includes(value)) {
      this.selectedTriggers_.set(current.filter((t) => t !== value));
    } else {
      this.selectedTriggers_.set([...current, value]);
    }
  }
  static \u0275fac = function LabelCreationModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LabelCreationModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _LabelCreationModalService, factory: _LabelCreationModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LabelCreationModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  LabelCreationModalService
};
//# sourceMappingURL=chunk-OUBA3W4T.js.map
