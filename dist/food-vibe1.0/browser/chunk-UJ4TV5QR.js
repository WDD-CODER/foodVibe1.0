import {
  BaseEntityDataService
} from "./chunk-AB3R4JQV.js";
import {
  Injectable,
  __async,
  __objRest,
  __spreadProps,
  __spreadValues,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/venue-data.service.ts
var ENTITY = "VENUE_PROFILES";
var TRASH_KEY = "TRASH_VENUES";
var VenueDataService = class _VenueDataService extends BaseEntityDataService {
  /** Domain alias for the base-class signal. */
  allVenues_ = this.all_;
  constructor() {
    super(ENTITY);
  }
  getVenueById(_id) {
    return __async(this, null, function* () {
      return this.storage.get(ENTITY, _id);
    });
  }
  addVenue(newItem) {
    return __async(this, null, function* () {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const withTimestamp = __spreadProps(__spreadValues({}, newItem), {
        created_at_: newItem.created_at_ ?? now
      });
      const saved = yield this.storage.post(ENTITY, withTimestamp);
      this.updateItems((list) => [...list, saved]);
      this.logging.info({ event: "crud.venue.create", message: "Venue created", context: { entityType: ENTITY, id: saved._id } });
      return saved;
    });
  }
  updateVenue(item) {
    return __async(this, null, function* () {
      const result = yield this.storage.put(ENTITY, item);
      this.updateItems((list) => list.map((v) => v._id === result._id ? result : v));
      this.logging.info({ event: "crud.venue.update", message: "Venue updated", context: { entityType: ENTITY, id: result._id } });
      return result;
    });
  }
  deleteVenue(_id) {
    return __async(this, null, function* () {
      const item = yield this.storage.get(ENTITY, _id);
      const withDeleted = __spreadProps(__spreadValues({}, item), { deletedAt: Date.now() });
      yield this.storage.appendExisting(TRASH_KEY, withDeleted);
      yield this.storage.remove(ENTITY, _id);
      this.updateItems((list) => list.filter((v) => v._id !== _id));
      this.logging.info({ event: "crud.venue.delete", message: "Venue deleted", context: { entityType: ENTITY, id: _id } });
    });
  }
  getTrashVenues() {
    return __async(this, null, function* () {
      return this.storage.query(TRASH_KEY, 0);
    });
  }
  restoreVenue(_id) {
    return __async(this, null, function* () {
      const trash = yield this.storage.query(TRASH_KEY, 0);
      const found = trash.find((v) => v._id === _id);
      if (!found)
        throw new Error(`Venue ${_id} not found in trash`);
      const _a = found, { deletedAt: _ } = _a, item = __objRest(_a, ["deletedAt"]);
      const rest = trash.filter((v) => v._id !== _id);
      yield this.storage.replaceAll(TRASH_KEY, rest);
      yield this.storage.appendExisting(ENTITY, item);
      this.updateItems((list) => [...list, item]);
      return item;
    });
  }
  static \u0275fac = function VenueDataService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _VenueDataService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _VenueDataService, factory: _VenueDataService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(VenueDataService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

export {
  VenueDataService
};
//# sourceMappingURL=chunk-UJ4TV5QR.js.map
