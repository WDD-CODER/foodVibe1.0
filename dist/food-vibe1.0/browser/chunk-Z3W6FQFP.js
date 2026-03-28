import {
  environment
} from "./chunk-ZMFT5D5F.js";
import {
  HttpClient,
  HttpHeaders,
  Injectable,
  __async,
  __spreadProps,
  __spreadValues,
  firstValueFrom,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/services/user-msg.service.ts
var SUCCESS_DURATION_MS = 2e3;
var ERROR_DURATION_MS = 4e3;
var UserMsgService = class _UserMsgService {
  _msg_ = signal(null);
  msg_ = this._msg_.asReadonly();
  _pending = [];
  _timerHandle = null;
  _clearTimer() {
    if (this._timerHandle !== null) {
      clearTimeout(this._timerHandle);
      this._timerHandle = null;
    }
  }
  _durationMs(type) {
    return type === "error" ? ERROR_DURATION_MS : SUCCESS_DURATION_MS;
  }
  _showNext() {
    this._msg_.set(null);
    if (this._pending.length > 0) {
      const next = this._pending.shift();
      this._msg_.set(next);
      this._timerHandle = setTimeout(() => this._showNext(), this._durationMs(next.type));
    } else {
      this._timerHandle = null;
    }
  }
  _startTimer(durationMs) {
    this._clearTimer();
    this._timerHandle = setTimeout(() => this._showNext(), durationMs);
  }
  _setMsg(msg) {
    const current = this._msg_();
    if (msg.type === "success" || msg.type === "warning") {
      if (current && (current.type === "success" || current.type === "warning")) {
        this._msg_.set(msg);
        this._startTimer(SUCCESS_DURATION_MS);
        return;
      }
      if (!current) {
        this._msg_.set(msg);
        this._startTimer(SUCCESS_DURATION_MS);
        return;
      }
      this._pending.push(msg);
      return;
    }
    if (msg.type === "error") {
      if (current && current.type !== "error") {
        this._msg_.set(msg);
        this._startTimer(ERROR_DURATION_MS);
        return;
      }
      if (current && current.type === "error") {
        this._pending.push(msg);
        return;
      }
      this._msg_.set(msg);
      this._startTimer(ERROR_DURATION_MS);
    }
  }
  CloseMsg() {
    this._clearTimer();
    this._msg_.set(null);
    if (this._pending.length > 0) {
      const next = this._pending.shift();
      this._msg_.set(next);
      this._timerHandle = setTimeout(() => this._showNext(), this._durationMs(next.type));
    }
  }
  onSetSuccessMsg(txt) {
    this._setMsg({ txt, type: "success" });
  }
  /** Success message with optional undo action. */
  onSetSuccessMsgWithUndo(txt, undo) {
    this._setMsg({ txt, type: "success", undo });
  }
  onSetErrorMsg(txt) {
    this._setMsg({ txt, type: "error" });
  }
  onSetWarningMsg(txt) {
    this._setMsg({ txt, type: "warning" });
  }
  static \u0275fac = function UserMsgService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _UserMsgService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _UserMsgService, factory: _UserMsgService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UserMsgService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/app/core/services/activity-log.service.ts
var ACTIVITY_STORAGE_KEY = "activity_log";
var MAX_ACTIVITY_ENTRIES = 100;
var ActivityLogService = class _ActivityLogService {
  activityLogInternal_ = signal(this.hydrateFromStorage());
  /** Readonly view so consumers always see latest when they read. */
  activityLog_ = this.activityLogInternal_.asReadonly();
  /** Re-read from localStorage and update the signal. Call when the dashboard is shown so the list reflects current storage. */
  syncFromStorage() {
    const entries = this.hydrateFromStorage();
    this.activityLogInternal_.set(entries);
  }
  /**
   * Read the most recent activity entries directly from localStorage.
   * Use this for display so the list always reflects current storage (e.g. after user clears it in DevTools).
   */
  getRecentEntriesFromStorage(maxItems = 10) {
    const entries = this.hydrateFromStorage();
    return [...entries].sort((a, b) => b.timestamp - a.timestamp).slice(0, maxItems);
  }
  recordActivity(entry) {
    const nextEntry = __spreadProps(__spreadValues({}, entry), {
      id: `${entry.entityType}-${entry.entityId || "new"}-${Date.now()}`,
      timestamp: Date.now()
    });
    const current = this.activityLogInternal_();
    const updated = [nextEntry, ...current].slice(0, MAX_ACTIVITY_ENTRIES);
    this.activityLogInternal_.set(updated);
    this.persistToStorage(updated);
  }
  hydrateFromStorage() {
    try {
      const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (!raw)
        return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed))
        return [];
      return parsed;
    } catch {
      return [];
    }
  }
  persistToStorage(entries) {
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(entries));
    } catch {
    }
  }
  static \u0275fac = function ActivityLogService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ActivityLogService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ActivityLogService, factory: _ActivityLogService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ActivityLogService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/app/core/services/http-storage.adapter.ts
var TOKEN_KEY = "fv_token";
var HttpStorageAdapter = class _HttpStorageAdapter {
  http = inject(HttpClient);
  base = environment.apiUrl;
  // ---------------------------------------------------------------------------
  // Token helper
  // ---------------------------------------------------------------------------
  headers() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
  // ---------------------------------------------------------------------------
  // Public interface — matches StorageService exactly
  // ---------------------------------------------------------------------------
  /**
   * Returns all entities of a given type.
   * The delay parameter is accepted for interface compatibility but ignored
   * (HTTP latency already provides natural async delay).
   */
  query(entityType, _delay = 100) {
    return __async(this, null, function* () {
      return firstValueFrom(this.http.get(`${this.base}/api/v1/data/${entityType}`, { headers: this.headers() }));
    });
  }
  /** Returns one entity by id. Throws if not found (404 → HttpErrorResponse). */
  get(entityType, entityId) {
    return __async(this, null, function* () {
      return firstValueFrom(this.http.get(`${this.base}/api/v1/data/${entityType}/${entityId}`, { headers: this.headers() }));
    });
  }
  /**
   * Creates a new entity. Assigns a fresh _id via makeId() before sending,
   * matching the behaviour of StorageService.post().
   */
  post(entityType, newEntity) {
    return __async(this, null, function* () {
      const entityWithId = __spreadProps(__spreadValues({}, newEntity), { _id: this.makeId() });
      return firstValueFrom(this.http.post(`${this.base}/api/v1/data/${entityType}`, entityWithId, { headers: this.headers() }));
    });
  }
  /** Updates one entity. Uses updatedEntity._id as the path parameter. */
  put(entityType, updatedEntity) {
    return __async(this, null, function* () {
      return firstValueFrom(this.http.put(`${this.base}/api/v1/data/${entityType}/${updatedEntity._id}`, updatedEntity, { headers: this.headers() }));
    });
  }
  /** Removes one entity by id. */
  remove(entityType, entityId) {
    return __async(this, null, function* () {
      yield firstValueFrom(this.http.delete(`${this.base}/api/v1/data/${entityType}/${entityId}`, { headers: this.headers() }));
    });
  }
  /**
   * 5-char alphanumeric ID generator — identical to StorageService.makeId().
   * Existing localStorage _id values are also 5-char alphanumeric, so IDs
   * generated here are format-compatible for migration purposes.
   */
  makeId(length = 5) {
    let txt = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
      txt += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return txt;
  }
  /**
   * Appends an entity that already has an _id (e.g. restoring from trash).
   * Unlike post(), does not generate a new _id — sends body as-is.
   */
  appendExisting(entityType, entity) {
    return __async(this, null, function* () {
      yield firstValueFrom(this.http.post(`${this.base}/api/v1/data/${entityType}`, entity, { headers: this.headers() }));
    });
  }
  /**
   * Replaces the entire entity collection (e.g. clearing trash after dispose-all).
   * Sends array to PUT /api/v1/data/:entityType (no id segment — server does deleteMany + insertMany).
   */
  replaceAll(entityType, entities) {
    return __async(this, null, function* () {
      yield firstValueFrom(this.http.put(`${this.base}/api/v1/data/${entityType}`, entities, { headers: this.headers().set("X-Confirm-Replace", "true"), withCredentials: true }));
    });
  }
  static \u0275fac = function HttpStorageAdapter_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _HttpStorageAdapter)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _HttpStorageAdapter, factory: _HttpStorageAdapter.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(HttpStorageAdapter, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/core/services/async-storage.service.ts
var STORAGE_ERROR_MESSAGE = "Storage failed: quota or access denied";
var BACKUP_ENTITY_TYPES = /* @__PURE__ */ new Set([
  "PRODUCT_LIST",
  "RECIPE_LIST",
  "DISH_LIST",
  "KITCHEN_SUPPLIERS",
  "EQUIPMENT_LIST",
  "VENUE_PROFILES",
  "MENU_EVENT_LIST",
  "TRASH_RECIPES",
  "TRASH_DISHES",
  "TRASH_PRODUCTS",
  "TRASH_EQUIPMENT",
  "TRASH_VENUES",
  "TRASH_MENU_EVENTS",
  "VERSION_HISTORY",
  ACTIVITY_STORAGE_KEY,
  "KITCHEN_UNITS",
  "KITCHEN_PREPARATIONS",
  "KITCHEN_CATEGORIES",
  "KITCHEN_ALLERGENS",
  "KITCHEN_LABELS",
  "MENU_TYPES",
  "MENU_SECTION_CATEGORIES"
]);
var StorageService = class _StorageService {
  /** Injected unconditionally so Angular's DI graph is stable.
   *  Only used at runtime when environment.useBackend is true. */
  httpAdapter = inject(HttpStorageAdapter);
  query(entityType, delay = 100) {
    return __async(this, null, function* () {
      if (environment.useBackend)
        return this.httpAdapter.query(entityType, delay);
      let entities = [];
      try {
        const raw = localStorage.getItem(entityType) || "null";
        const parsed = JSON.parse(raw);
        entities = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      } catch {
        entities = [];
      }
      if (delay) {
        return new Promise((resolve) => setTimeout(resolve, delay, entities));
      }
      return entities;
    });
  }
  get(entityType, entityId) {
    return __async(this, null, function* () {
      if (environment.useBackend)
        return this.httpAdapter.get(entityType, entityId);
      const entities = yield this.query(entityType);
      const entity = entities.find((entity2) => entity2._id === entityId);
      if (!entity)
        throw new Error(`Cannot get, Item ${entityId} of type: ${entityType} does not exist`);
      return entity;
    });
  }
  post(entityType, newEntity) {
    return __async(this, null, function* () {
      if (environment.useBackend)
        return this.httpAdapter.post(entityType, newEntity);
      const entityToSave = __spreadProps(__spreadValues({}, newEntity), { _id: this.makeId() });
      const entities = yield this.query(entityType, 0);
      entities.push(entityToSave);
      this._save(entityType, entities);
      return entityToSave;
    });
  }
  put(entityType, updatedEntity) {
    return __async(this, null, function* () {
      if (environment.useBackend)
        return this.httpAdapter.put(entityType, updatedEntity);
      const entities = yield this.query(entityType, 0);
      const idx = entities.findIndex((entity) => entity._id === updatedEntity._id);
      if (idx === -1)
        throw new Error(`Cannot update, product ${updatedEntity._id} does not exist`);
      entities[idx] = updatedEntity;
      this._save(entityType, entities);
      return updatedEntity;
    });
  }
  remove(entityType, entityId) {
    return __async(this, null, function* () {
      if (environment.useBackend)
        return this.httpAdapter.remove(entityType, entityId);
      const entities = yield this.query(entityType, 0);
      const idx = entities.findIndex((entity) => entity._id === entityId);
      if (idx !== -1) {
        entities.splice(idx, 1);
        this._save(entityType, entities);
      } else {
        throw new Error(`Cannot remove, product ${entityId} of type: ${entityType} does not exist`);
      }
    });
  }
  makeId(length = 5) {
    let txt = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
      txt += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return txt;
  }
  /** Append an entity (e.g. with existing _id) to a list and save. Use delay 0 to avoid artificial delay. */
  appendExisting(entityType, entity) {
    return __async(this, null, function* () {
      if (environment.useBackend)
        return this.httpAdapter.appendExisting(entityType, entity);
      const list = yield this.query(entityType, 0);
      list.push(entity);
      this._save(entityType, list);
    });
  }
  /** Replace the entire list for an entity type (e.g. trash list after remove). */
  replaceAll(entityType, entities) {
    return __async(this, null, function* () {
      if (environment.useBackend)
        return this.httpAdapter.replaceAll(entityType, entities);
      this._save(entityType, entities);
    });
  }
  _save(entityType, entities) {
    try {
      localStorage.setItem(entityType, JSON.stringify(entities));
      if (BACKUP_ENTITY_TYPES.has(entityType)) {
        try {
          localStorage.setItem(`backup_${entityType}`, JSON.stringify(entities));
        } catch {
        }
      }
    } catch {
      throw new Error(STORAGE_ERROR_MESSAGE);
    }
  }
  static \u0275fac = function StorageService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _StorageService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _StorageService, factory: _StorageService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(StorageService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

export {
  UserMsgService,
  ActivityLogService,
  BACKUP_ENTITY_TYPES,
  StorageService
};
//# sourceMappingURL=chunk-Z3W6FQFP.js.map
