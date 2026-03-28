import {
  TranslationKeyModalService,
  isTranslationKeyResult,
  sanitizeKey
} from "./chunk-7STEE3M4.js";
import {
  TranslationService
} from "./chunk-CH6HZ4GZ.js";
import {
  StorageService,
  UserMsgService
} from "./chunk-Z3W6FQFP.js";
import {
  LoggingService
} from "./chunk-ZMFT5D5F.js";
import {
  Injectable,
  Subject,
  __async,
  __spreadProps,
  __spreadValues,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/key-resolution.service.ts
var HEBREW_SCRIPT = /[\u0590-\u05FF]/;
var KeyResolutionService = class _KeyResolutionService {
  translation = inject(TranslationService);
  translationKeyModal = inject(TranslationKeyModalService);
  /**
   * Resolve user input to an English key for key-based fields.
   * If input is Hebrew and has no translation, opens the translation modal.
   * Returns the key to use, or null if cancelled or empty.
   */
  ensureKeyForContext(value, context) {
    return __async(this, null, function* () {
      const trimmed = (value ?? "").trim();
      if (!trimmed)
        return null;
      const existingKey = this.resolveForContext(trimmed, context);
      if (existingKey)
        return existingKey;
      if (!HEBREW_SCRIPT.test(trimmed)) {
        return sanitizeKey(trimmed);
      }
      const modalContext = this.toModalContext(context);
      const result = yield this.translationKeyModal.open(trimmed, modalContext);
      if (!isTranslationKeyResult(result) || !result.englishKey?.trim() || !result.hebrewLabel?.trim()) {
        return null;
      }
      this.translation.addKeyAndHebrew(result.englishKey, result.hebrewLabel);
      return sanitizeKey(result.englishKey);
    });
  }
  resolveForContext(trimmed, context) {
    switch (context) {
      case "category":
      case "supplier":
      case "generic":
        return this.translation.resolveCategory(trimmed);
      case "allergen":
        return this.translation.resolveAllergen(trimmed);
      case "unit":
        return this.translation.resolveUnit(trimmed);
      case "preparation_category":
        return this.translation.resolvePreparationCategory(trimmed);
      case "section_category":
        return this.translation.resolveSectionCategory(trimmed);
      default:
        return this.translation.resolveCategory(trimmed);
    }
  }
  toModalContext(context) {
    if (context === "preparation_category" || context === "section_category")
      return "category";
    return context;
  }
  static \u0275fac = function KeyResolutionService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _KeyResolutionService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _KeyResolutionService, factory: _KeyResolutionService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(KeyResolutionService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/core/services/unit-registry.service.ts
var SYSTEM_UNITS = {
  kg: 1e3,
  liter: 1e3,
  gram: 1,
  ml: 1,
  unit: 1,
  dish: 1
};
var UnitRegistryService = class _UnitRegistryService {
  userMsgService = inject(UserMsgService);
  storageService = inject(StorageService);
  logging = inject(LoggingService);
  translationService = inject(TranslationService);
  keyResolution = inject(KeyResolutionService);
  STORAGE_KEY = "KITCHEN_UNITS";
  // Standardized key
  unitAdded$ = new Subject();
  /** When opening the unit creator from a product form, pass this product's purchase unit symbols so duplicate names can be rejected in-modal. */
  unitCreatorContext = signal(null);
  // SIGNALS
  isCreatorOpen = signal(false);
  isCreatorOpen_ = this.isCreatorOpen.asReadonly();
  // Initial defaults - will be overwritten by hydration if storage exists
  globalUnits_ = signal(__spreadValues({}, SYSTEM_UNITS));
  // COMPUTED
  allUnitKeys_ = computed(() => Object.keys(this.globalUnits_()));
  constructor() {
    this.initUnits();
  }
  /**
   * Hydrates the registry from storage or persists defaults if empty.
   * @param skipOverwriteIfNewer When true (e.g. initial load), do not replace in-memory state if it has more units than storage (avoids race where user added a unit before hydration completed).
   */
  initUnits(skipOverwriteIfNewer = true) {
    return __async(this, null, function* () {
      try {
        const registries = yield this.storageService.query(this.STORAGE_KEY);
        const existingRegistry = registries[0];
        const hasNoUnits = !existingRegistry || !existingRegistry.units || Object.keys(existingRegistry.units).length === 0;
        if (hasNoUnits) {
          const defaultUnits = __spreadValues({}, SYSTEM_UNITS);
          if (existingRegistry?._id) {
            yield this.storageService.put(this.STORAGE_KEY, __spreadProps(__spreadValues({}, existingRegistry), {
              units: defaultUnits
            }));
          } else {
            yield this.storageService.post(this.STORAGE_KEY, {
              units: defaultUnits
            });
          }
          this.globalUnits_.set(defaultUnits);
        } else {
          const units = __spreadValues({}, existingRegistry.units);
          Object.keys(SYSTEM_UNITS).forEach((k) => {
            units[k] = SYSTEM_UNITS[k];
          });
          if (skipOverwriteIfNewer) {
            const currentKeys = Object.keys(this.globalUnits_());
            if (currentKeys.length > Object.keys(units).length)
              return;
          }
          this.globalUnits_.set(units);
        }
      } catch (err) {
        this.logging.error({ event: "crud.units.hydrate_error", message: "Failed to hydrate units", context: { err } });
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA \u05D4\u05DE\u05D9\u05D3\u05D4");
      }
    });
  }
  // UI CONTROL
  openUnitCreator(context) {
    this.unitCreatorContext.set(context ?? null);
    this.isCreatorOpen.set(true);
    this.refreshFromStorage();
  }
  closeUnitCreator() {
    this.isCreatorOpen.set(false);
    this.unitCreatorContext.set(null);
  }
  /** Re-load units from storage so dropdowns show the latest (e.g. after add in another tab or previous session). */
  refreshFromStorage() {
    return __async(this, null, function* () {
      yield this.initUnits(false);
    });
  }
  /** Reload from storage after a backup import/restore. */
  reloadFromStorage() {
    return __async(this, null, function* () {
      yield this.initUnits(false);
    });
  }
  // GET
  getConversion(key) {
    return this.globalUnits_()[key] || 1;
  }
  /**
   * Registers a new unit or updates an existing one using POST/PUT logic.
   * Resolves Hebrew input to canonical key (e.g. "יחידה" -> "unit"); if no match, prompts for English key and adds to dictionary.
   * @param name Display name for the unit (e.g. "צנצנת" or "יחידה")
   * @param rate Amount of basis units that equal 1 of the new unit (e.g. 330 when basis is gram)
   * @param basisUnitKey Key of the reference unit (e.g. "gram"). Rate is stored in gram-equivalent.
   * @returns Result so caller can show in-modal error when unit already exists on product (modal stays open).
   */
  registerUnit(name, rate, basisUnitKey) {
    return __async(this, null, function* () {
      const keyToUse = yield this.keyResolution.ensureKeyForContext(name, "unit");
      if (!keyToUse) {
        return { success: false, error: (name ?? "").trim() ? "cancelled_by_user" : "unit_name_empty" };
      }
      const key = keyToUse.toLowerCase();
      const curUnits = this.globalUnits_();
      const context = this.unitCreatorContext();
      const existingResolved = (context?.existingUnitSymbols ?? []).map((s) => this.translationService.resolveUnit(s ?? "") ?? (s ?? "").trim().toLowerCase());
      if (existingResolved.includes(key)) {
        return { success: false, alreadyOnProduct: true };
      }
      if (curUnits[key]) {
        this.refreshFromStorage();
        this.unitAdded$.next(key);
        this.userMsgService.onSetSuccessMsg("\u05E0\u05D5\u05E1\u05E4\u05D4 \u05DC\u05E8\u05E9\u05D9\u05DE\u05EA \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA \u05D4\u05E8\u05DB\u05E9 \u05E9\u05DC \u05D4\u05DE\u05D5\u05E6\u05E8.");
        return { success: true, alreadyInRegistry: true };
      }
      const factor = basisUnitKey ? this.getConversion(basisUnitKey) : 1;
      const rateInGrams = rate * factor;
      const valueToStore = key in SYSTEM_UNITS ? SYSTEM_UNITS[key] : rateInGrams;
      const updatedUnits = __spreadProps(__spreadValues({}, curUnits), { [key]: valueToStore });
      try {
        const registries = yield this.storageService.query(this.STORAGE_KEY);
        const existingRegistry = registries[0];
        if (existingRegistry && existingRegistry._id) {
          yield this.storageService.put(this.STORAGE_KEY, __spreadProps(__spreadValues({}, existingRegistry), {
            units: updatedUnits
          }));
        } else {
          yield this.storageService.post(this.STORAGE_KEY, {
            units: updatedUnits
          });
        }
        this.globalUnits_.set(updatedUnits);
        this.unitAdded$.next(key);
        this.userMsgService.onSetSuccessMsg(`\u05D4\u05D9\u05D7\u05D9\u05D3\u05D4 ${key} \u05E0\u05D5\u05E1\u05E4\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`);
        return { success: true };
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05D9\u05D7\u05D9\u05D3\u05D4 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA");
        this.logging.error({ event: "crud.units.save_error", message: "Unit save error", context: { err } });
        return { success: false, error: "unit_save_error" };
      }
    });
  }
  /**
   * Deletes a custom unit from the registry.
   * System units (kg, liter, gram, ml, unit, dish) cannot be removed.
   */
  deleteUnit(unitKey) {
    return __async(this, null, function* () {
      if (unitKey in SYSTEM_UNITS) {
        this.userMsgService.onSetErrorMsg("\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05DE\u05D7\u05D5\u05E7 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA \u05D1\u05E1\u05D9\u05E1");
        return;
      }
      const updatedUnits = __spreadValues({}, this.globalUnits_());
      delete updatedUnits[unitKey];
      try {
        const registries = yield this.storageService.query(this.STORAGE_KEY);
        const registry = registries[0];
        if (registry?._id) {
          yield this.storageService.put(this.STORAGE_KEY, __spreadProps(__spreadValues({}, registry), {
            units: updatedUnits
          }));
          this.globalUnits_.set(updatedUnits);
          this.userMsgService.onSetSuccessMsg(`\u05D4\u05D9\u05D7\u05D9\u05D3\u05D4 ${unitKey} \u05D4\u05D5\u05E1\u05E8\u05D4`);
        }
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05D4\u05D9\u05D7\u05D9\u05D3\u05D4 \u05DE\u05D4\u05E9\u05E8\u05EA");
        this.logging.error({ event: "crud.units.delete_error", message: "Unit delete error", context: { err } });
      }
    });
  }
  static \u0275fac = function UnitRegistryService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _UnitRegistryService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _UnitRegistryService, factory: _UnitRegistryService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UnitRegistryService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

export {
  KeyResolutionService,
  SYSTEM_UNITS,
  UnitRegistryService
};
//# sourceMappingURL=chunk-UA66Z5WI.js.map
