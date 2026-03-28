import {
  BaseEntityDataService
} from "./chunk-7WUWXC4O.js";
import {
  Injectable,
  __async,
  __objRest,
  __spreadProps,
  __spreadValues,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-GCYOWW7U.js";

// src/app/core/services/equipment-data.service.ts
var ENTITY = "EQUIPMENT_LIST";
var TRASH_KEY = "TRASH_EQUIPMENT";
var ERR_DUPLICATE_EQUIPMENT_NAME = "DUPLICATE_EQUIPMENT_NAME";
var EquipmentDataService = class _EquipmentDataService extends BaseEntityDataService {
  /** Domain alias for the base-class signal. */
  allEquipment_ = this.all_;
  constructor() {
    super(ENTITY);
  }
  getEquipmentById(_id) {
    return __async(this, null, function* () {
      return this.storage.get(ENTITY, _id);
    });
  }
  addEquipment(newItem) {
    return __async(this, null, function* () {
      const name = (newItem.name_hebrew ?? "").trim();
      if (name && this.currentItems().some((e) => (e.name_hebrew ?? "").trim() === name)) {
        throw new Error(ERR_DUPLICATE_EQUIPMENT_NAME);
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const withTimestamps = __spreadProps(__spreadValues({}, newItem), {
        created_at_: newItem.created_at_ ?? now,
        updated_at_: now
      });
      const saved = yield this.storage.post(ENTITY, withTimestamps);
      this.updateItems((list) => [...list, saved]);
      this.logging.info({ event: "crud.equipment.create", message: "Equipment created", context: { entityType: ENTITY, id: saved._id } });
      return saved;
    });
  }
  updateEquipment(item) {
    return __async(this, null, function* () {
      const name = (item.name_hebrew ?? "").trim();
      if (name && this.currentItems().some((e) => e._id !== item._id && (e.name_hebrew ?? "").trim() === name)) {
        throw new Error(ERR_DUPLICATE_EQUIPMENT_NAME);
      }
      const updated = __spreadProps(__spreadValues({}, item), {
        updated_at_: (/* @__PURE__ */ new Date()).toISOString()
      });
      const result = yield this.storage.put(ENTITY, updated);
      this.updateItems((list) => list.map((e) => e._id === result._id ? result : e));
      this.logging.info({ event: "crud.equipment.update", message: "Equipment updated", context: { entityType: ENTITY, id: result._id } });
      return result;
    });
  }
  deleteEquipment(_id) {
    return __async(this, null, function* () {
      const item = yield this.storage.get(ENTITY, _id);
      const withDeleted = __spreadProps(__spreadValues({}, item), { deletedAt: Date.now() });
      yield this.storage.appendExisting(TRASH_KEY, withDeleted);
      yield this.storage.remove(ENTITY, _id);
      this.updateItems((list) => list.filter((e) => e._id !== _id));
      this.logging.info({ event: "crud.equipment.delete", message: "Equipment deleted", context: { entityType: ENTITY, id: _id } });
    });
  }
  getTrashEquipment() {
    return __async(this, null, function* () {
      return this.storage.query(TRASH_KEY, 0);
    });
  }
  restoreEquipment(_id) {
    return __async(this, null, function* () {
      const trash = yield this.storage.query(TRASH_KEY, 0);
      const found = trash.find((e) => e._id === _id);
      if (!found)
        throw new Error(`Equipment ${_id} not found in trash`);
      const _a = found, { deletedAt: _ } = _a, item = __objRest(_a, ["deletedAt"]);
      const rest = trash.filter((e) => e._id !== _id);
      yield this.storage.replaceAll(TRASH_KEY, rest);
      yield this.storage.appendExisting(ENTITY, item);
      this.updateItems((list) => [...list, item]);
      return item;
    });
  }
  static \u0275fac = function EquipmentDataService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _EquipmentDataService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _EquipmentDataService, factory: _EquipmentDataService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(EquipmentDataService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

export {
  ERR_DUPLICATE_EQUIPMENT_NAME,
  EquipmentDataService
};
//# sourceMappingURL=chunk-YEG5WWUX.js.map
