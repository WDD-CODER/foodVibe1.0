import {
  KeyResolutionService
} from "./chunk-HKRWTH4Y.js";
import {
  TranslationService
} from "./chunk-Z6OI3YDQ.js";
import {
  ProductDataService
} from "./chunk-ACTKISJR.js";
import {
  StorageService,
  UserMsgService
} from "./chunk-WYZGJ7UG.js";
import {
  LoggingService
} from "./chunk-OYT4PDSG.js";
import {
  Injectable,
  __async,
  __spreadProps,
  __spreadValues,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-GCYOWW7U.js";

// src/app/core/models/menu-event.model.ts
var ALL_DISH_FIELDS = [
  { key: "sell_price", labelKey: "dish_sell_price", inputType: "number" },
  { key: "food_cost_money", labelKey: "dish_food_cost_money", inputType: "number" },
  { key: "food_cost_pct", labelKey: "dish_food_cost_pct", inputType: "number" },
  { key: "serving_portions", labelKey: "dish_serving_portions", inputType: "number" },
  { key: "serving_portions_pct", labelKey: "dish_serving_portions_pct", inputType: "number" }
];
var DEFAULT_DISH_FIELDS = [
  "sell_price",
  "food_cost_money",
  "serving_portions"
];

// src/app/core/services/metadata-registry.service.ts
var MetadataRegistryService = class _MetadataRegistryService {
  userMsgService = inject(UserMsgService);
  productDataService = inject(ProductDataService);
  storageService = inject(StorageService);
  logging = inject(LoggingService);
  translationService = inject(TranslationService);
  keyResolution = inject(KeyResolutionService);
  //PRIVATE SIGNALS
  categories_ = signal([]);
  allergens_ = signal([]);
  labels_ = signal([]);
  menuTypes_ = signal([]);
  //PUBLIC SIGNALS
  allCategories_ = this.categories_.asReadonly();
  allAllergens_ = this.allergens_.asReadonly();
  allLabels_ = this.labels_.asReadonly();
  allMenuTypes_ = this.menuTypes_.asReadonly();
  constructor() {
    this.initMetadata();
  }
  /** Reload all metadata signals from storage after a backup import/restore. */
  reloadFromStorage() {
    return __async(this, null, function* () {
      yield this.initMetadata();
    });
  }
  persistRegistry(storageKey, items) {
    return __async(this, null, function* () {
      const registries = yield this.storageService.query(storageKey);
      const existing = registries[0];
      if (existing?._id) {
        yield this.storageService.put(storageKey, __spreadProps(__spreadValues({}, existing), { items }));
      } else {
        yield this.storageService.post(storageKey, { items });
      }
    });
  }
  initMetadata() {
    return __async(this, null, function* () {
      const DEFAULT_CATEGORIES = ["vegetables", "dairy", "meat", "dry", "fish", "spices"];
      const DEFAULT_ALLERGENS = ["gluten", "eggs", "peanuts", "nuts", "soy", "milk_solids", "sesame", "fish", "shellfish", "seafood"];
      const catRegistry = yield this.storageService.query("KITCHEN_CATEGORIES");
      const existingCats = catRegistry[0]?.items || [];
      if (existingCats.length === 0) {
        yield this.persistRegistry("KITCHEN_CATEGORIES", DEFAULT_CATEGORIES);
        this.categories_.set(DEFAULT_CATEGORIES);
      } else {
        this.categories_.set(existingCats);
      }
      const allergenRegistry = yield this.storageService.query("KITCHEN_ALLERGENS");
      const existingAllergens = allergenRegistry[0]?.items || [];
      if (existingAllergens.length === 0) {
        yield this.persistRegistry("KITCHEN_ALLERGENS", DEFAULT_ALLERGENS);
        this.allergens_.set(DEFAULT_ALLERGENS);
      } else {
        this.allergens_.set(existingAllergens);
      }
      yield this.reloadLabelsFromStorage();
      const defaultMenuTypes = [
        { key: "buffet_family", fields: [...DEFAULT_DISH_FIELDS] },
        { key: "plated_course", fields: [...DEFAULT_DISH_FIELDS] },
        { key: "cocktail_passed", fields: ["food_cost_pct", "serving_portions_pct"] }
      ];
      const menuTypeRegistry = yield this.storageService.query("MENU_TYPES");
      const existingMenuTypes = menuTypeRegistry[0]?.items ?? [];
      if (Array.isArray(existingMenuTypes) && existingMenuTypes.length > 0) {
        this.menuTypes_.set(existingMenuTypes);
      } else {
        yield this.persistRegistry("MENU_TYPES", defaultMenuTypes);
        this.menuTypes_.set(defaultMenuTypes);
      }
    });
  }
  getMenuTypeFields(key) {
    const def = this.menuTypes_().find((t) => t.key === key);
    return def?.fields ?? [...DEFAULT_DISH_FIELDS];
  }
  registerMenuType(def) {
    return __async(this, null, function* () {
      const key = def.key.trim();
      if (!key || this.menuTypes_().some((t) => t.key === key))
        return;
      const updated = [...this.menuTypes_(), { key, fields: def.fields ?? [...DEFAULT_DISH_FIELDS] }];
      try {
        yield this.persistRegistry("MENU_TYPES", updated);
        this.menuTypes_.set(updated);
        this.userMsgService.onSetSuccessMsg(`\u05E1\u05D5\u05D2 \u05EA\u05E4\u05E8\u05D9\u05D8 "${key}" \u05E0\u05D5\u05E1\u05E3 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05E1\u05D5\u05D2 \u05D4\u05EA\u05E4\u05E8\u05D9\u05D8");
        this.logging.error({ event: "crud.metadata.menuType.save_error", message: "MenuType save error", context: { err } });
      }
    });
  }
  updateMenuType(key, fields) {
    return __async(this, null, function* () {
      const current = this.menuTypes_();
      const idx = current.findIndex((t) => t.key === key);
      if (idx === -1)
        return;
      const updated = current.slice();
      updated[idx] = __spreadProps(__spreadValues({}, updated[idx]), { fields });
      try {
        yield this.persistRegistry("MENU_TYPES", updated);
        this.menuTypes_.set(updated);
        this.userMsgService.onSetSuccessMsg(`\u05E1\u05D5\u05D2 \u05EA\u05E4\u05E8\u05D9\u05D8 "${key}" \u05E2\u05D5\u05D3\u05DB\u05DF`);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05E1\u05D5\u05D2 \u05D4\u05EA\u05E4\u05E8\u05D9\u05D8");
        this.logging.error({ event: "crud.metadata.menuType.update_error", message: "MenuType update error", context: { err } });
      }
    });
  }
  deleteMenuType(key) {
    return __async(this, null, function* () {
      const updated = this.menuTypes_().filter((t) => t.key !== key);
      try {
        yield this.persistRegistry("MENU_TYPES", updated);
        this.menuTypes_.set(updated);
        this.userMsgService.onSetSuccessMsg(`\u05E1\u05D5\u05D2 \u05EA\u05E4\u05E8\u05D9\u05D8 "${key}" \u05E0\u05DE\u05D7\u05E7`);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05E1\u05D5\u05D2 \u05D4\u05EA\u05E4\u05E8\u05D9\u05D8");
        this.logging.error({ event: "crud.metadata.menuType.delete_error", message: "MenuType delete error", context: { err } });
      }
    });
  }
  renameMenuType(oldKey, newKey) {
    return __async(this, null, function* () {
      const trimmed = newKey.trim();
      if (!trimmed || trimmed === oldKey)
        return;
      if (this.menuTypes_().some((t) => t.key === trimmed)) {
        this.userMsgService.onSetErrorMsg(`\u05E1\u05D5\u05D2 \u05EA\u05E4\u05E8\u05D9\u05D8 "${trimmed}" \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD`);
        return;
      }
      const current = this.menuTypes_();
      const idx = current.findIndex((t) => t.key === oldKey);
      if (idx === -1)
        return;
      const def = current[idx];
      const updated = current.slice();
      updated[idx] = { key: trimmed, fields: def.fields };
      try {
        yield this.persistRegistry("MENU_TYPES", updated);
        this.menuTypes_.set(updated);
        this.userMsgService.onSetSuccessMsg(`\u05E1\u05D5\u05D2 \u05EA\u05E4\u05E8\u05D9\u05D8 \u05E9\u05D5\u05E0\u05D4 \u05DC-"${trimmed}"`);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E9\u05DD \u05E1\u05D5\u05D2 \u05D4\u05EA\u05E4\u05E8\u05D9\u05D8");
        this.logging.error({ event: "crud.metadata.menuType.rename_error", message: "MenuType rename error", context: { err } });
      }
    });
  }
  getLabelColor(key) {
    const def = this.labels_().find((l) => l.key === key);
    return def?.color ?? "#78716C";
  }
  /** Reload labels from storage (e.g. after demo data load). */
  reloadLabelsFromStorage() {
    return __async(this, null, function* () {
      const labelRegistry = yield this.storageService.query("KITCHEN_LABELS");
      const items = labelRegistry[0]?.items ?? [];
      this.labels_.set(Array.isArray(items) ? items : []);
    });
  }
  registerLabel(key, color, autoTriggers) {
    return __async(this, null, function* () {
      const sanitized = key.trim();
      if (!sanitized || this.labels_().some((l) => l.key === sanitized))
        return;
      const updated = [...this.labels_(), { key: sanitized, color: color || "#78716C", autoTriggers: autoTriggers ?? [] }];
      try {
        yield this.persistRegistry("KITCHEN_LABELS", updated);
        this.labels_.set(updated);
        this.userMsgService.onSetSuccessMsg(`\u05EA\u05D5\u05D5\u05D9\u05EA "${sanitized}" \u05E0\u05D5\u05E1\u05E4\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05EA\u05D5\u05D5\u05D9\u05EA");
        this.logging.error({ event: "crud.metadata.label.save_error", message: "Label save error", context: { err } });
      }
    });
  }
  deleteLabel(key) {
    return __async(this, null, function* () {
      const updated = this.labels_().filter((l) => l.key !== key);
      try {
        yield this.persistRegistry("KITCHEN_LABELS", updated);
        this.labels_.set(updated);
        this.userMsgService.onSetSuccessMsg(`\u05EA\u05D5\u05D5\u05D9\u05EA ${key} \u05E0\u05DE\u05D7\u05E7\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05D4\u05EA\u05D5\u05D5\u05D9\u05EA");
        this.logging.error({ event: "crud.metadata.label.delete_error", message: "Label delete error", context: { err } });
      }
    });
  }
  updateLabel(key, changes) {
    return __async(this, null, function* () {
      const current = this.labels_();
      const idx = current.findIndex((l) => l.key === key);
      if (idx === -1)
        return;
      const updated = current.slice();
      updated[idx] = __spreadValues(__spreadValues({}, updated[idx]), changes);
      try {
        yield this.persistRegistry("KITCHEN_LABELS", updated);
        this.labels_.set(updated);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05D4\u05EA\u05D5\u05D5\u05D9\u05EA");
        this.logging.error({ event: "crud.metadata.label.update_error", message: "Label update error", context: { err } });
      }
    });
  }
  purgeGlobalUnit(unitSymbol) {
    return __async(this, null, function* () {
      const affectedProducts = this.productDataService.allProducts_().filter((p) => p.base_unit_ === unitSymbol);
      for (const p of affectedProducts) {
        yield this.productDataService.updateProduct(__spreadProps(__spreadValues({}, p), { base_unit_: "gram" }));
      }
    });
  }
  registerAllergen(name) {
    return __async(this, null, function* () {
      const keyToUse = yield this.keyResolution.ensureKeyForContext(name, "allergen");
      if (!keyToUse)
        return;
      if (this.allergens_().includes(keyToUse))
        return;
      const updated = [...this.allergens_(), keyToUse];
      try {
        yield this.persistRegistry("KITCHEN_ALLERGENS", updated);
        this.allergens_.set(updated);
        this.userMsgService.onSetSuccessMsg(`\u05D0\u05DC\u05E8\u05D2\u05DF "${keyToUse}" \u05E0\u05D5\u05E1\u05E3 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05D0\u05DC\u05E8\u05D2\u05DF");
        this.logging.error({ event: "crud.metadata.allergen.save_error", message: "Allergen save error", context: { err } });
      }
    });
  }
  registerCategory(name) {
    return __async(this, null, function* () {
      const keyToUse = yield this.keyResolution.ensureKeyForContext(name, "category");
      if (!keyToUse)
        return null;
      if (this.categories_().includes(keyToUse))
        return keyToUse;
      const updatedCategories = [...this.categories_(), keyToUse];
      try {
        yield this.persistRegistry("KITCHEN_CATEGORIES", updatedCategories);
        this.categories_.set(updatedCategories);
        this.userMsgService.onSetSuccessMsg(`\u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4 "${keyToUse}" \u05E0\u05D5\u05E1\u05E4\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`);
        return keyToUse;
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4");
        this.logging.error({ event: "crud.metadata.category.save_error", message: "Category save error", context: { err } });
        return null;
      }
    });
  }
  deleteCategory(name) {
    return __async(this, null, function* () {
      const updated = this.categories_().filter((c) => c !== name);
      try {
        yield this.persistRegistry("KITCHEN_CATEGORIES", updated);
        this.categories_.set(updated);
        this.userMsgService.onSetSuccessMsg(`\u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4 ${name} \u05E0\u05DE\u05D7\u05E7\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4 \u05DE\u05D4\u05E9\u05E8\u05EA");
        this.logging.error({ event: "crud.metadata.category.delete_error", message: "Category delete error", context: { err } });
      }
    });
  }
  deleteAllergen(name) {
    return __async(this, null, function* () {
      const updated = this.allergens_().filter((a) => a !== name);
      try {
        yield this.persistRegistry("KITCHEN_ALLERGENS", updated);
        this.allergens_.set(updated);
        this.userMsgService.onSetSuccessMsg(`\u05D4\u05D0\u05DC\u05E8\u05D2\u05DF ${name} \u05E0\u05DE\u05D7\u05E7`);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05D4\u05D0\u05DC\u05E8\u05D2\u05DF \u05DE\u05D4\u05E9\u05E8\u05EA");
        this.logging.error({ event: "crud.metadata.allergen.delete_error", message: "Allergen delete error", context: { err } });
      }
    });
  }
  static \u0275fac = function MetadataRegistryService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MetadataRegistryService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MetadataRegistryService, factory: _MetadataRegistryService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MetadataRegistryService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

export {
  ALL_DISH_FIELDS,
  DEFAULT_DISH_FIELDS,
  MetadataRegistryService
};
//# sourceMappingURL=chunk-AEBXA76L.js.map
