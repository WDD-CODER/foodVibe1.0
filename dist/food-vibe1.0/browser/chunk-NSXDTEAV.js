import {
  StorageService
} from "./chunk-Z3W6FQFP.js";
import {
  Injectable,
  __async,
  __objRest,
  __spreadProps,
  __spreadValues,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/menu-event-data.service.ts
var ENTITY = "MENU_EVENT_LIST";
var TRASH_KEY = "TRASH_MENU_EVENTS";
var MenuEventDataService = class _MenuEventDataService {
  storage = inject(StorageService);
  eventsStore_ = signal([]);
  allMenuEvents_ = this.eventsStore_.asReadonly();
  constructor() {
    this.loadInitialData();
  }
  reloadFromStorage() {
    return __async(this, null, function* () {
      yield this.loadInitialData();
    });
  }
  loadInitialData() {
    return __async(this, null, function* () {
      const data = yield this.storage.query(ENTITY);
      this.eventsStore_.set(data);
    });
  }
  getMenuEventById(_id) {
    return __async(this, null, function* () {
      return this.storage.get(ENTITY, _id);
    });
  }
  addMenuEvent(newEvent) {
    return __async(this, null, function* () {
      const saved = yield this.storage.post(ENTITY, newEvent);
      this.eventsStore_.update((events) => [...events, saved]);
      return saved;
    });
  }
  updateMenuEvent(event) {
    return __async(this, null, function* () {
      const updated = yield this.storage.put(ENTITY, event);
      this.eventsStore_.update((events) => events.map((e) => e._id === updated._id ? updated : e));
      return updated;
    });
  }
  deleteMenuEvent(_id) {
    return __async(this, null, function* () {
      const item = yield this.storage.get(ENTITY, _id);
      const withDeleted = __spreadProps(__spreadValues({}, item), { deletedAt: Date.now() });
      yield this.storage.appendExisting(TRASH_KEY, withDeleted);
      yield this.storage.remove(ENTITY, _id);
      this.eventsStore_.update((events) => events.filter((e) => e._id !== _id));
    });
  }
  cloneMenuEventAsNew(_id) {
    return __async(this, null, function* () {
      const source = yield this.getMenuEventById(_id);
      const _a = source, { _id: _ } = _a, rest = __objRest(_a, ["_id"]);
      const cloned = __spreadProps(__spreadValues({}, rest), {
        name_: `${source.name_} (Copy)`,
        created_from_template_id_: source._id
      });
      return this.addMenuEvent(cloned);
    });
  }
  /** Updates all menu events that use oldServingType to newServingType. */
  updateServingTypeForAll(oldServingType, newServingType) {
    return __async(this, null, function* () {
      if (oldServingType === newServingType)
        return;
      const events = this.eventsStore_();
      const toUpdate = events.filter((e) => e.serving_type_ === oldServingType);
      for (const event of toUpdate) {
        yield this.updateMenuEvent(__spreadProps(__spreadValues({}, event), { serving_type_: newServingType }));
      }
    });
  }
  static \u0275fac = function MenuEventDataService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MenuEventDataService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MenuEventDataService, factory: _MenuEventDataService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MenuEventDataService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

export {
  MenuEventDataService
};
//# sourceMappingURL=chunk-NSXDTEAV.js.map
