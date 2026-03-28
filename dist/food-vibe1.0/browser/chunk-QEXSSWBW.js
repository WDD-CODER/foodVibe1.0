import {
  KeyResolutionService
} from "./chunk-UA66Z5WI.js";
import {
  TranslationService
} from "./chunk-CH6HZ4GZ.js";
import {
  DishDataService
} from "./chunk-V3KHFSXP.js";
import {
  StorageService,
  UserMsgService
} from "./chunk-Z3W6FQFP.js";
import {
  LoggingService
} from "./chunk-ZMFT5D5F.js";
import {
  Injectable,
  __async,
  __spreadProps,
  __spreadValues,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/preparation-registry.service.ts
var STORAGE_KEY = "KITCHEN_PREPARATIONS";
var PreparationRegistryService = class _PreparationRegistryService {
  storageService = inject(StorageService);
  userMsgService = inject(UserMsgService);
  translationService = inject(TranslationService);
  keyResolution = inject(KeyResolutionService);
  logging = inject(LoggingService);
  dishDataService = inject(DishDataService);
  categories_ = signal([]);
  preparations_ = signal([]);
  preparationCategories_ = this.categories_.asReadonly();
  allPreparations_ = this.preparations_.asReadonly();
  getPreparationsByCategory_ = computed(() => {
    const preps = this.allPreparations_();
    const byCategory = /* @__PURE__ */ new Map();
    for (const p of preps) {
      const list = byCategory.get(p.category) ?? [];
      list.push(p);
      byCategory.set(p.category, list);
    }
    return byCategory;
  });
  constructor() {
    this.initRegistry();
  }
  /** Reload categories and preparations from storage (e.g. after demo data load). */
  reloadFromStorage() {
    return __async(this, null, function* () {
      yield this.initRegistry();
    });
  }
  initRegistry() {
    return __async(this, null, function* () {
      try {
        const registries = yield this.storageService.query(STORAGE_KEY);
        const doc = registries[0];
        if (doc?.categories?.length !== void 0) {
          this.categories_.set(doc.categories);
        }
        if (doc?.preparations?.length !== void 0) {
          this.preparations_.set(doc.preparations);
        }
      } catch (err) {
        this.logging.error({ event: "crud.preparations.load_error", message: "Failed to load preparation registry", context: { err } });
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E8\u05D9\u05E9\u05D5\u05DD \u05D4\u05D4\u05DB\u05E0\u05D5\u05EA");
      }
    });
  }
  /** Persist a single registry doc. Assigns _id if missing (e.g. after demo load) so future put() works. */
  persistDoc(payload) {
    return __async(this, null, function* () {
      const id = payload._id ?? this.storageService.makeId();
      yield this.storageService.replaceAll(STORAGE_KEY, [__spreadProps(__spreadValues({}, payload), { _id: id })]);
    });
  }
  /** Register category with English key (backend) and Hebrew label (dictionary). */
  registerCategory(englishKey, hebrewLabel) {
    return __async(this, null, function* () {
      const key = englishKey.trim().toLowerCase().replace(/\s+/g, "_");
      const label = hebrewLabel.trim();
      if (!key)
        return;
      if (this.categories_().includes(key))
        return;
      this.translationService.updateDictionary(key, label);
      const updated = [...this.categories_(), key];
      try {
        const registries = yield this.storageService.query(STORAGE_KEY);
        const doc = registries[0];
        const payload = doc ? __spreadProps(__spreadValues({}, doc), { categories: updated }) : { categories: updated, preparations: [] };
        if (doc?._id) {
          yield this.storageService.put(STORAGE_KEY, __spreadProps(__spreadValues({}, payload), { _id: doc._id }));
        } else {
          yield this.persistDoc(payload);
        }
        this.categories_.set(updated);
        this.userMsgService.onSetSuccessMsg(`\u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4 "${label}" \u05E0\u05D5\u05E1\u05E4\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4");
        this.logging.error({ event: "crud.preparations.category.save_error", message: "Preparation category save error", context: { err } });
      }
    });
  }
  /**
   * Updates all dishes that contain this preparation with the old category to use the new category.
   * Only DISH_LIST is updated (per plan 165 recommendation).
   */
  propagateCategoryToDishes(preparationName, oldCategory, newCategory) {
    return __async(this, null, function* () {
      const nameLower = preparationName.toLowerCase();
      const dishes = this.dishDataService.allDishes_();
      for (const dish of dishes) {
        const items = dish.prep_items_;
        if (!items?.length)
          continue;
        let changed = false;
        const updatedItems = items.map((p) => {
          const match = p.preparation_name.trim().toLowerCase() === nameLower && (p.category_name?.trim() ?? "") === oldCategory;
          if (!match)
            return p;
          changed = true;
          return __spreadValues(__spreadProps(__spreadValues({}, p), {
            category_name: newCategory
          }), p.main_category_name !== void 0 && { main_category_name: newCategory });
        });
        if (!changed)
          continue;
        const byCategory = /* @__PURE__ */ new Map();
        updatedItems.forEach((p) => {
          const list = byCategory.get(p.category_name) ?? [];
          list.push({
            item_name: p.preparation_name,
            unit: p.unit,
            quantity: p.quantity
          });
          byCategory.set(p.category_name, list);
        });
        const prepCategories = Array.from(byCategory.entries()).map(([category_name, items2]) => ({
          category_name,
          items: items2.map((it) => ({ item_name: it.item_name, unit: it.unit }))
        }));
        yield this.dishDataService.updateDish(__spreadProps(__spreadValues({}, dish), {
          prep_items_: updatedItems,
          prep_categories_: prepCategories
        }));
      }
    });
  }
  /** Returns the first matching preparation by name (case-insensitive). */
  getPreparationByName(name) {
    const q = name.trim().toLowerCase();
    return this.preparations_().find((p) => p.name.toLowerCase() === q);
  }
  /** Updates a preparation's category in the registry. */
  updatePreparationCategory(name, oldCategory, newCategory, options) {
    return __async(this, null, function* () {
      const preps = this.preparations_();
      const idx = preps.findIndex((p) => p.name.toLowerCase() === name.trim().toLowerCase() && p.category === oldCategory.trim());
      if (idx < 0)
        return;
      const sanitizedNew = newCategory.trim().toLowerCase().replace(/\s+/g, "_");
      const updated = preps.map((p, i) => i === idx ? __spreadProps(__spreadValues({}, p), { category: sanitizedNew }) : p);
      try {
        const registries = yield this.storageService.query(STORAGE_KEY);
        const doc = registries[0];
        const payload = doc ? __spreadProps(__spreadValues({}, doc), { preparations: updated }) : { categories: this.categories_(), preparations: updated };
        if (doc?._id) {
          yield this.storageService.put(STORAGE_KEY, __spreadProps(__spreadValues({}, payload), { _id: doc._id }));
        } else {
          yield this.storageService.post(STORAGE_KEY, payload);
        }
        this.preparations_.set(updated);
        if (!options?.silent) {
          yield this.propagateCategoryToDishes(name.trim(), oldCategory.trim(), sanitizedNew);
          const onRevert = options?.onRevert;
          const undo = () => this.updatePreparationCategory(name, sanitizedNew, oldCategory, { silent: true }).then(() => onRevert?.());
          this.userMsgService.onSetSuccessMsgWithUndo(`\u05D4\u05D4\u05DB\u05E0\u05D4 "${name}" \u05E2\u05D5\u05D3\u05DB\u05E0\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`, undo);
        }
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05D4\u05D4\u05DB\u05E0\u05D4");
        this.logging.error({ event: "crud.preparations.update_error", message: "Preparation update error", context: { err } });
      }
    });
  }
  deleteCategory(key) {
    return __async(this, null, function* () {
      const trimmed = key.trim().toLowerCase();
      const updated = this.categories_().filter((c) => c !== trimmed);
      if (updated.length === this.categories_().length)
        return;
      try {
        const registries = yield this.storageService.query(STORAGE_KEY);
        const doc = registries[0];
        const payload = doc ? __spreadProps(__spreadValues({}, doc), { categories: updated }) : { categories: updated, preparations: [] };
        if (doc?._id) {
          yield this.storageService.put(STORAGE_KEY, __spreadProps(__spreadValues({}, payload), { _id: doc._id }));
        } else {
          yield this.persistDoc(payload);
        }
        this.categories_.set(updated);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4");
        this.logging.error({ event: "crud.preparations.category.delete_error", message: "Preparation category delete error", context: { err } });
      }
    });
  }
  renameCategory(oldKey, newKey, newLabel) {
    return __async(this, null, function* () {
      const sanitizedNew = newKey.trim().toLowerCase().replace(/\s+/g, "_");
      if (!sanitizedNew || sanitizedNew === oldKey)
        return;
      const updatedCats = this.categories_().map((c) => c === oldKey ? sanitizedNew : c);
      const updatedPreps = this.preparations_().map((p) => p.category === oldKey ? __spreadProps(__spreadValues({}, p), { category: sanitizedNew }) : p);
      try {
        const registries = yield this.storageService.query(STORAGE_KEY);
        const doc = registries[0];
        const payload = doc ? __spreadProps(__spreadValues({}, doc), { categories: updatedCats, preparations: updatedPreps }) : { categories: updatedCats, preparations: updatedPreps };
        if (doc?._id) {
          yield this.storageService.put(STORAGE_KEY, __spreadProps(__spreadValues({}, payload), { _id: doc._id }));
        } else {
          yield this.persistDoc(payload);
        }
        this.categories_.set(updatedCats);
        this.preparations_.set(updatedPreps);
        this.translationService.updateDictionary(sanitizedNew, newLabel.trim());
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4");
        this.logging.error({ event: "crud.preparations.category.rename_error", message: "Preparation category rename error", context: { err } });
      }
    });
  }
  registerPreparation(name, category) {
    return __async(this, null, function* () {
      const sanitizedName = name.trim();
      const sanitizedCategory = (category ?? "").trim();
      if (!sanitizedName)
        return;
      const key = yield this.keyResolution.ensureKeyForContext(sanitizedCategory, "preparation_category");
      if (sanitizedCategory && !key)
        return;
      const cats = this.categories_();
      const categoryExists = key != null && cats.includes(key);
      if (!categoryExists && key) {
        yield this.registerCategory(key, sanitizedCategory);
      }
      const preps = this.preparations_();
      const exists = preps.some((p) => p.name.toLowerCase() === sanitizedName.toLowerCase() && p.category === key);
      if (exists)
        return;
      const entry = { name: sanitizedName, category: key ?? "" };
      const updated = [...preps, entry];
      try {
        const registries = yield this.storageService.query(STORAGE_KEY);
        const doc = registries[0];
        const payload = doc ? __spreadProps(__spreadValues({}, doc), { preparations: updated }) : { categories: this.categories_(), preparations: updated };
        if (doc?._id) {
          yield this.storageService.put(STORAGE_KEY, __spreadProps(__spreadValues({}, payload), { _id: doc._id }));
        } else {
          yield this.persistDoc(payload);
        }
        this.preparations_.set(updated);
        this.userMsgService.onSetSuccessMsg(`\u05D4\u05D4\u05DB\u05E0\u05D4 "${sanitizedName}" \u05E0\u05D5\u05E1\u05E4\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`);
      } catch (err) {
        this.userMsgService.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05D4\u05DB\u05E0\u05D4");
        this.logging.error({ event: "crud.preparations.save_error", message: "Preparation save error", context: { err } });
      }
    });
  }
  static \u0275fac = function PreparationRegistryService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _PreparationRegistryService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _PreparationRegistryService, factory: _PreparationRegistryService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(PreparationRegistryService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

export {
  PreparationRegistryService
};
//# sourceMappingURL=chunk-QEXSSWBW.js.map
