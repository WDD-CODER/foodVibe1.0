import {
  BaseEntityDataService
} from "./chunk-7WUWXC4O.js";
import {
  Injectable,
  __async,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-GCYOWW7U.js";

// src/app/core/services/supplier-data.service.ts
var ENTITY = "KITCHEN_SUPPLIERS";
var SupplierDataService = class _SupplierDataService extends BaseEntityDataService {
  /** Domain alias for the base-class signal. */
  allSuppliers_ = this.all_;
  constructor() {
    super(ENTITY);
  }
  getSupplierById(_id) {
    return __async(this, null, function* () {
      return this.storage.get(ENTITY, _id);
    });
  }
  addSupplier(newSupplier) {
    return __async(this, null, function* () {
      const saved = yield this.storage.post(ENTITY, newSupplier);
      this.updateItems((suppliers) => [...suppliers, saved]);
      this.logging.info({ event: "crud.supplier.create", message: "Supplier created", context: { entityType: ENTITY, id: saved._id } });
      return saved;
    });
  }
  updateSupplier(supplier) {
    return __async(this, null, function* () {
      const updated = yield this.storage.put(ENTITY, supplier);
      this.updateItems((suppliers) => suppliers.map((s) => s._id === updated._id ? updated : s));
      this.logging.info({ event: "crud.supplier.update", message: "Supplier updated", context: { entityType: ENTITY, id: updated._id } });
      return updated;
    });
  }
  removeSupplier(_id) {
    return __async(this, null, function* () {
      yield this.storage.remove(ENTITY, _id);
      this.updateItems((suppliers) => suppliers.filter((s) => s._id !== _id));
      this.logging.info({ event: "crud.supplier.delete", message: "Supplier removed", context: { entityType: ENTITY, id: _id } });
    });
  }
  static \u0275fac = function SupplierDataService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SupplierDataService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _SupplierDataService, factory: _SupplierDataService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SupplierDataService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

export {
  SupplierDataService
};
//# sourceMappingURL=chunk-IFJ5YUTT.js.map
