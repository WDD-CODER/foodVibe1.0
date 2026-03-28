import {
  LoggingService
} from "./chunk-ZMFT5D5F.js";
import {
  HttpClient,
  Injectable,
  Pipe,
  __async,
  __spreadProps,
  __spreadValues,
  firstValueFrom,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable,
  ɵɵdefinePipe
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/translation.service.ts
var TranslationService = class _TranslationService {
  http = inject(HttpClient);
  logging = inject(LoggingService);
  // --- SIGNALS ---
  masterDict = signal({});
  /** Hebrew label -> canonical key (for resolving user input to existing key and avoiding duplicates). */
  reverseMap = signal({});
  constructor() {
    this.loadGlobalDictionary();
  }
  buildReverseMap(dict) {
    const rev = {};
    for (const [key, value] of Object.entries(dict)) {
      const trimmed = (value ?? "").trim();
      if (trimmed)
        rev[trimmed] = key;
    }
    return rev;
  }
  //LIST
  loadGlobalDictionary() {
    return __async(this, null, function* () {
      try {
        const jsonPath = "/assets/data/dictionary.json";
        const baseData = yield firstValueFrom(this.http.get(jsonPath));
        const baseFlattened = __spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, baseData.units ?? {}), baseData.categories ?? {}), baseData.section_categories ?? {}), baseData.allergens ?? {}), baseData.actions ?? {}), baseData.preparation_categories ?? {}), baseData.export_headers ?? {}), baseData.general ?? {});
        const localData = localStorage.getItem("DICTIONARY_CACHE");
        const existingCache = localData ? JSON.parse(localData) : {};
        const finalDict = __spreadValues(__spreadValues({}, baseFlattened), existingCache);
        const sortedFinalDict = Object.keys(finalDict).sort().reduce((acc, k) => {
          acc[k] = finalDict[k];
          return acc;
        }, {});
        this.masterDict.set(finalDict);
        this.reverseMap.set(this.buildReverseMap(finalDict));
        try {
          localStorage.setItem("DICTIONARY_CACHE", JSON.stringify(finalDict));
        } catch (err) {
          this.logging.warn({ event: "translation.cache.write_failed", message: "Dictionary cache write failed (quota or access)", context: { err } });
        }
        this.logging.info({ event: "translation.dictionary.loaded", message: "Full hybrid dictionary cached to localStorage" });
      } catch (err) {
        this.logging.error({ event: "translation.dictionary.load_error", message: "Dictionary load error", context: { err } });
      }
    });
  }
  //UPDATE
  updateInternalDictionaries(key, label) {
    const normalizedKey = key.trim().toLowerCase();
    this.masterDict.update((prev) => __spreadProps(__spreadValues({}, prev), {
      [normalizedKey]: label.trim()
    }));
    const rawCache = localStorage.getItem("DICTIONARY_CACHE");
    const cache = rawCache ? JSON.parse(rawCache) : {};
    cache[normalizedKey] = label.trim();
    try {
      localStorage.setItem("DICTIONARY_CACHE", JSON.stringify(cache));
    } catch (err) {
      this.logging.warn({ event: "translation.cache.write_failed", message: "Dictionary cache write failed (quota or access)", context: { err } });
    }
  }
  updateDictionary(key, label) {
    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
    const sanitizedLabel = label.trim();
    this.masterDict.update((prev) => {
      const newDict = __spreadProps(__spreadValues({}, prev), { [normalizedKey]: sanitizedLabel });
      const sortedDict = Object.keys(newDict).sort().reduce((acc, k) => {
        acc[k] = newDict[k];
        return acc;
      }, {});
      try {
        localStorage.setItem("DICTIONARY_CACHE", JSON.stringify(sortedDict));
      } catch (err) {
        this.logging.warn({ event: "translation.cache.write_failed", message: "Dictionary cache write failed (quota or access)", context: { err } });
      }
      return sortedDict;
    });
    this.reverseMap.update((prev) => __spreadProps(__spreadValues({}, prev), { [sanitizedLabel]: normalizedKey }));
    this.logging.info({ event: "translation.dictionary.updated", message: "Dictionary entry updated", context: { key: normalizedKey } });
  }
  /** Resolve Hebrew user input to canonical key (units). Returns null if no match so caller can prompt for English key. */
  resolveUnit(input) {
    const t = (input ?? "").trim();
    return t ? this.reverseMap()[t] ?? null : null;
  }
  /** Resolve Hebrew user input to canonical key (categories). Returns null if no match. */
  resolveCategory(input) {
    const t = (input ?? "").trim();
    return t ? this.reverseMap()[t] ?? null : null;
  }
  /** Resolve Hebrew user input to canonical key (allergens). Returns null if no match. */
  resolveAllergen(input) {
    const t = (input ?? "").trim();
    return t ? this.reverseMap()[t] ?? null : null;
  }
  /** Resolve Hebrew user input to canonical key (section_categories). Returns null if no match. */
  resolveSectionCategory(input) {
    const t = (input ?? "").trim();
    return t ? this.reverseMap()[t] ?? null : null;
  }
  /** Resolve Hebrew user input to canonical key (preparation_categories). Returns null if no match. */
  resolvePreparationCategory(input) {
    const t = (input ?? "").trim();
    return t ? this.reverseMap()[t] ?? null : null;
  }
  translate(key) {
    if (!key)
      return "";
    const normalizedKey = key.trim().toLowerCase();
    const translation = this.masterDict()[normalizedKey];
    return translation || key;
  }
  /** True when the value exists as a key in the dictionary (so it has a translation / is a known canonical key). */
  hasKey(key) {
    if (!key || !String(key).trim())
      return false;
    const normalizedKey = String(key).trim().toLowerCase();
    return this.masterDict()[normalizedKey] !== void 0;
  }
  // --- PRIVATE HELPERS ---
  validateEnglishKey(key) {
    const sanitized = key.trim().toLowerCase().replace(/\s+/g, "_");
    const englishRegex = /^[a-z0-9_]+$/;
    if (!englishRegex.test(sanitized)) {
      return { valid: false, error: "Translation must contain only letters, numbers, and underscores." };
    }
    if (this.masterDict()[sanitized]) {
      const existing = this.masterDict()[sanitized];
      return { valid: false, error: `The ID "${sanitized}" is already used for "${existing}".` };
    }
    return { valid: true };
  }
  /** Like validateEnglishKey but allows an existing key when it already maps to the given Hebrew (same concept). */
  validateKeyForHebrew(key, hebrewLabel) {
    const sanitized = key.trim().toLowerCase().replace(/\s+/g, "_");
    const label = (hebrewLabel ?? "").trim();
    const englishRegex = /^[a-z0-9_]+$/;
    if (!englishRegex.test(sanitized)) {
      return { valid: false, error: "Translation must contain only letters, numbers, and underscores." };
    }
    const existing = this.masterDict()[sanitized];
    if (existing !== void 0) {
      if (existing === label)
        return { valid: true };
      return { valid: false, error: `\u05D4\u05DE\u05E4\u05EA\u05D7 "${sanitized}" \u05DB\u05D1\u05E8 \u05D1\u05E9\u05D9\u05DE\u05D5\u05E9 \u05E2\u05D1\u05D5\u05E8 "${existing}".` };
    }
    return { valid: true };
  }
  isHebrewLabelDuplicate(label) {
    const sanitized = label.trim();
    return Object.values(this.masterDict()).includes(sanitized);
  }
  proposeAndSaveTranslation(hebrewLabel) {
    return __async(this, null, function* () {
      const englishKey = prompt(`Enter English ID for "${hebrewLabel}" (e.g., olive_oil):`);
      if (!englishKey || !englishKey.trim()) {
        this.logging.warn({ event: "translation.add.cancelled", message: "Translation addition cancelled by user" });
        return null;
      }
      const sanitizedKey = englishKey.trim().toLowerCase().replace(/\s+/g, "_");
      this.updateDictionary(sanitizedKey, hebrewLabel);
      this.logging.info({ event: "translation.entry.created", message: "Dictionary entry created", context: { key: sanitizedKey } });
      return sanitizedKey;
    });
  }
  /**
   * When Hebrew input has no matching key, use the app's translation-key modal (unified theme) instead of browser prompt.
   * Callers should use TranslationKeyModalService.open(hebrewLabel, context), then on result call
   * translationService.updateDictionary(result.englishKey, result.hebrewLabel) and use result.englishKey.
   */
  addKeyAndHebrew(englishKey, hebrewLabel) {
    const key = (englishKey ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    const label = (hebrewLabel ?? "").trim();
    if (!key || !label)
      return;
    this.updateDictionary(key, label);
    this.logging.info({ event: "translation.entry.created", message: "Dictionary entry created", context: { key } });
  }
  static \u0275fac = function TranslationService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _TranslationService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _TranslationService, factory: _TranslationService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(TranslationService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

// src/app/core/pipes/translation-pipe.pipe.ts
var TranslatePipe = class _TranslatePipe {
  translationService = inject(TranslationService);
  transform(value) {
    return this.translationService.translate(value);
  }
  static \u0275fac = function TranslatePipe_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _TranslatePipe)();
  };
  static \u0275pipe = /* @__PURE__ */ \u0275\u0275definePipe({ name: "translatePipe", type: _TranslatePipe, pure: false });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(TranslatePipe, [{
    type: Pipe,
    args: [{
      name: "translatePipe",
      standalone: true,
      pure: false
    }]
  }], null, null);
})();

export {
  TranslationService,
  TranslatePipe
};
//# sourceMappingURL=chunk-CH6HZ4GZ.js.map
