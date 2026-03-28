import {
  StorageService
} from "./chunk-Z3W6FQFP.js";
import {
  LoggingService
} from "./chunk-ZMFT5D5F.js";
import {
  __async,
  inject,
  signal
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/base-entity-data.service.ts
var BaseEntityDataService = class {
  storageKey;
  storage = inject(StorageService);
  logging = inject(LoggingService);
  store_ = signal([]);
  /** Read-only view of the entity list. Subclasses may alias this under a domain name. */
  all_ = this.store_.asReadonly();
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.loadInitialData();
  }
  /** Re-read from storage and refresh the signal (e.g. after demo data load). */
  reloadFromStorage() {
    return __async(this, null, function* () {
      yield this.loadInitialData();
    });
  }
  setItems(items) {
    this.store_.set(items);
  }
  updateItems(updater) {
    this.store_.update(updater);
  }
  currentItems() {
    return this.store_();
  }
  loadInitialData() {
    return __async(this, null, function* () {
      const data = yield this.storage.query(this.storageKey);
      this.store_.set(Array.isArray(data) ? data : []);
    });
  }
};

export {
  BaseEntityDataService
};
//# sourceMappingURL=chunk-AB3R4JQV.js.map
