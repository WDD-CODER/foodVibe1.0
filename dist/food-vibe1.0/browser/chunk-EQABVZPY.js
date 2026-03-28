import {
  KeyResolutionService
} from "./chunk-HKRWTH4Y.js";
import {
  TranslationService
} from "./chunk-Z6OI3YDQ.js";
import {
  StorageService
} from "./chunk-WYZGJ7UG.js";
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

// src/app/core/services/menu-section-categories.service.ts
var STORAGE_KEY = "MENU_SECTION_CATEGORIES";
var DEFAULT_SECTION_CATEGORIES = [
  "Amuse-Bouche",
  "Appetizers",
  "Soups",
  "Salads",
  "Main Course",
  "Sides",
  "Desserts",
  "Beverages"
];
var MenuSectionCategoriesService = class _MenuSectionCategoriesService {
  storage = inject(StorageService);
  translationService = inject(TranslationService);
  keyResolution = inject(KeyResolutionService);
  categories_ = signal([]);
  sectionCategories_ = this.categories_.asReadonly();
  constructor() {
    this.load();
  }
  /** Re-read from storage (e.g. after backup restore). */
  reloadFromStorage() {
    return __async(this, null, function* () {
      yield this.load();
    });
  }
  load() {
    return __async(this, null, function* () {
      try {
        const registries = yield this.storage.query(STORAGE_KEY);
        const doc = registries[0];
        const items = doc?.items;
        if (Array.isArray(items) && items.length > 0) {
          this.categories_.set([...items]);
          return;
        }
        const payload = doc?._id ? __spreadProps(__spreadValues({}, doc), { items: DEFAULT_SECTION_CATEGORIES }) : { items: DEFAULT_SECTION_CATEGORIES };
        if (doc?._id) {
          yield this.storage.put(STORAGE_KEY, payload);
        } else {
          yield this.storage.post(STORAGE_KEY, payload);
        }
        this.categories_.set([...DEFAULT_SECTION_CATEGORIES]);
      } catch {
        this.categories_.set([...DEFAULT_SECTION_CATEGORIES]);
      }
    });
  }
  /** Add a section category if not already present; resolves Hebrew to key, or opens translation-key modal for English key; persists to storage. */
  addCategory(name) {
    return __async(this, null, function* () {
      const keyToUse = yield this.keyResolution.ensureKeyForContext(name, "section_category");
      if (!keyToUse)
        return;
      const current = this.categories_();
      if (keyToUse == null || current.includes(keyToUse))
        return;
      const updated = [...current, keyToUse];
      yield this.persist(updated);
    });
  }
  removeCategory(name) {
    return __async(this, null, function* () {
      const updated = this.categories_().filter((c) => c !== name);
      if (updated.length === this.categories_().length)
        return;
      yield this.persist(updated);
    });
  }
  renameCategory(oldName, newName) {
    return __async(this, null, function* () {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName)
        return;
      const updated = this.categories_().map((c) => c === oldName ? trimmed : c);
      yield this.persist(updated);
    });
  }
  persist(items) {
    return __async(this, null, function* () {
      try {
        const registries = yield this.storage.query(STORAGE_KEY);
        const doc = registries[0];
        const payload = doc ? __spreadProps(__spreadValues({}, doc), { items }) : { items };
        if (doc?._id) {
          yield this.storage.put(STORAGE_KEY, __spreadProps(__spreadValues({}, payload), { _id: doc._id }));
        } else {
          yield this.storage.post(STORAGE_KEY, payload);
        }
        this.categories_.set(items);
      } catch {
        this.categories_.set(items);
      }
    });
  }
  static \u0275fac = function MenuSectionCategoriesService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MenuSectionCategoriesService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MenuSectionCategoriesService, factory: _MenuSectionCategoriesService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MenuSectionCategoriesService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

export {
  MenuSectionCategoriesService
};
//# sourceMappingURL=chunk-EQABVZPY.js.map
