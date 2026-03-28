import {
  TranslationService
} from "./chunk-Z6OI3YDQ.js";
import {
  Injectable,
  Subject,
  firstValueFrom,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-GCYOWW7U.js";

// src/app/core/utils/sanitize-key.util.ts
function sanitizeKey(input) {
  return input.trim().toLowerCase().replace(/\s+/g, "_");
}

// src/app/core/services/translation-key-modal.service.ts
function isTranslationKeyResult(r) {
  return r != null && typeof r === "object" && "englishKey" in r && "hebrewLabel" in r;
}
var TranslationKeyModalService = class _TranslationKeyModalService {
  translationService = inject(TranslationService);
  resultSubject = new Subject();
  isOpen_ = signal(false);
  hebrewLabel_ = signal("");
  context_ = signal("generic");
  open(hebrewLabel = "", context = "generic") {
    this.hebrewLabel_.set(hebrewLabel.trim());
    this.context_.set(context);
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }
  save(englishKey, hebrewLabel) {
    const sanitizedKey = sanitizeKey(englishKey);
    const label = hebrewLabel.trim();
    const validation = this.translationService.validateKeyForHebrew(sanitizedKey, label);
    if (!validation.valid) {
      return;
    }
    this.resultSubject.next({ englishKey: sanitizedKey, hebrewLabel: label });
    this.close();
  }
  cancel() {
    this.resultSubject.next(null);
    this.close();
  }
  /** For on-leave (generic) context: leave without adding this value to the dictionary; untranslated value will be removed from the item. */
  continueWithoutSaving() {
    this.resultSubject.next({ continueWithoutSaving: true });
    this.close();
  }
  close() {
    this.isOpen_.set(false);
    this.hebrewLabel_.set("");
    this.context_.set("generic");
  }
  validateKey(key) {
    return this.translationService.validateEnglishKey(key);
  }
  validateKeyForHebrew(key, hebrewLabel) {
    return this.translationService.validateKeyForHebrew(key, hebrewLabel);
  }
  static \u0275fac = function TranslationKeyModalService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _TranslationKeyModalService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _TranslationKeyModalService, factory: _TranslationKeyModalService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(TranslationKeyModalService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  sanitizeKey,
  isTranslationKeyResult,
  TranslationKeyModalService
};
//# sourceMappingURL=chunk-KNQKKPOG.js.map
