import {
  StorageService,
  UserMsgService
} from "./chunk-Z3W6FQFP.js";
import {
  LoggingService,
  environment
} from "./chunk-ZMFT5D5F.js";
import {
  HttpClient,
  Injectable,
  __async,
  __spreadValues,
  catchError,
  from,
  inject,
  map,
  of,
  setClassMetadata,
  signal,
  switchMap,
  tap,
  throwError,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/utils/auth-crypto.ts
var ITERATIONS = 1e5;
var HASH_ALGO = "SHA-256";
var KEY_BITS = 256;
function hashPassword(plain) {
  return __async(this, null, function* () {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = yield crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, ["deriveBits"]);
    const bits = yield crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: HASH_ALGO }, key, KEY_BITS);
    const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${saltHex}:${toHex(bits)}`;
  });
}
function verifyPassword(plain, stored) {
  return __async(this, null, function* () {
    if (!stored.includes(":")) {
      const buf = new TextEncoder().encode(plain);
      const digest = yield crypto.subtle.digest("SHA-256", buf);
      const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      return hex === stored;
    }
    const [saltHex, hashHex] = stored.split(":");
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map((b) => parseInt(b, 16)));
    const key = yield crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, ["deriveBits"]);
    const bits = yield crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: HASH_ALGO }, key, KEY_BITS);
    const computed = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return computed === hashHex;
  });
}

// src/app/core/services/user.service.ts
var SIGNED_USERS = "signed-users-db";
var SESSION_USER_KEY = "loggedInUser";
var TOKEN_KEY = "fv_token";
var UserService = class _UserService {
  userMsgService = inject(UserMsgService);
  storageService = inject(StorageService);
  logging = inject(LoggingService);
  http = inject(HttpClient);
  authBase = environment.authApiUrl;
  _user_ = signal(this._loadUserFromSession());
  user_ = this._user_.asReadonly();
  isLoggedIn = () => this._user_() !== null;
  get currentUser() {
    return this._user_();
  }
  // -------------------------------------------------------------------------
  // Token helpers — public so auth interceptor can read/write fv_token
  // -------------------------------------------------------------------------
  storeToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
  }
  // -------------------------------------------------------------------------
  // Backend HTTP helpers
  // -------------------------------------------------------------------------
  /** Public — auth interceptor calls this on 401 to silently refresh the access token. */
  callBackendRefresh() {
    return this.http.post(`${this.authBase}/api/v1/auth/refresh`, {}, { withCredentials: true });
  }
  callBackendLogin(name, password) {
    return this.http.post(`${this.authBase}/api/v1/auth/login`, { name, password });
  }
  callBackendSignup(newUser, hashedPassword) {
    return this.http.post(`${this.authBase}/api/v1/auth/signup`, { name: newUser.name, email: newUser.email, imgUrl: newUser.imgUrl, password: hashedPassword });
  }
  callBackendLogout() {
    return this.http.post(`${this.authBase}/api/v1/auth/logout`, {}, { withCredentials: true });
  }
  // -------------------------------------------------------------------------
  // Public auth methods
  // -------------------------------------------------------------------------
  signup(newUser, password) {
    if (environment.useBackendAuth) {
      return from(hashPassword(password)).pipe(switchMap((hashedPassword) => this.callBackendSignup(newUser, hashedPassword)), tap(({ token, user }) => {
        this.storeToken(token);
        this._saveUserLocal(user);
        this.logging.info({ event: "auth.signup", message: "Signup success", context: { userId: user._id } });
      }), map(({ user }) => user), catchError((err) => {
        const body = err.error?.error;
        if (body === "EMAIL_TAKEN")
          return throwError(() => new Error("EMAIL_TAKEN"));
        return throwError(() => new Error("USERNAME_TAKEN"));
      }));
    }
    return from(this.storageService.query(SIGNED_USERS)).pipe(map((users) => users.find((u) => u.name === newUser.name)), switchMap((existing) => existing ? throwError(() => new Error("USERNAME_TAKEN")) : from(hashPassword(password)).pipe(switchMap((passwordHash) => from(this.storageService.post(SIGNED_USERS, {
      name: newUser.name,
      email: newUser.email,
      imgUrl: newUser.imgUrl,
      role: newUser.role ?? "user",
      passwordHash
    }))))), tap((stored) => {
      const user = this._toUser(stored);
      this.userMsgService.onSetSuccessMsg("Signup Successfully ");
      this._saveUserLocal(user);
      this.logging.info({ event: "auth.signup", message: "Signup success", context: { userId: user._id } });
    }));
  }
  logout() {
    const userId = this._user_()?._id;
    return of(null).pipe(tap(() => {
      this._saveUserLocal(null);
      this.clearToken();
      if (environment.useBackendAuth) {
        this.callBackendLogout().subscribe({ error: () => {
        } });
      }
      this.logging.info({ event: "auth.logout", message: "Logout", context: userId ? { userId } : void 0 });
    }));
  }
  login(credentials) {
    const { name, password } = credentials;
    if (environment.useBackendAuth) {
      return this.callBackendLogin(name, password).pipe(tap(({ token, user }) => {
        this.storeToken(token);
        this._saveUserLocal(user);
        this.logging.info({ event: "auth.login", message: "Login success", context: { userId: user._id } });
      }), map(({ user }) => user), catchError((err) => {
        if (err.status === 423)
          return throwError(() => new Error("ACCOUNT_LOCKED"));
        if (err.status === 429)
          return throwError(() => new Error("RATE_LIMITED"));
        return throwError(() => new Error("USER_NOT_FOUND"));
      }));
    }
    return from(this.storageService.query(SIGNED_USERS)).pipe(map((users) => users.find((u) => u.name === name)), switchMap((stored) => {
      if (!stored) {
        this.logging.warn({ event: "auth.login.failure", message: "Login failed: user not found", context: {} });
        return throwError(() => new Error("USER_NOT_FOUND"));
      }
      if (!stored.passwordHash) {
        this.logging.warn({ event: "auth.login.failure", message: "Login failed: no password hash on record", context: {} });
        return throwError(() => new Error("USER_NOT_FOUND"));
      }
      return from(verifyPassword(password, stored.passwordHash)).pipe(switchMap((ok) => {
        if (!ok) {
          this.logging.warn({ event: "auth.login.failure", message: "Login failed: invalid password", context: {} });
          return throwError(() => new Error("USER_NOT_FOUND"));
        }
        const user = this._toUser(stored);
        this._saveUserLocal(user);
        this.logging.info({ event: "auth.login", message: "Login success", context: { userId: user._id } });
        return of(user);
      }));
    }));
  }
  _toUser(stored) {
    return { _id: stored._id, name: stored.name, email: stored.email, imgUrl: stored.imgUrl, role: stored.role };
  }
  _saveUserLocal(user) {
    this._user_.set(user && __spreadValues({}, user));
    this._saveUserToSession(user);
  }
  _clearSessionStorage() {
    sessionStorage.clear();
    this._user_.set(null);
  }
  _getLoggedInUser() {
    return this._user_();
  }
  _loadUserFromSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  _saveUserToSession(user) {
    if (user) {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_USER_KEY);
    }
  }
  static \u0275fac = function UserService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _UserService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _UserService, factory: _UserService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UserService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  UserService
};
//# sourceMappingURL=chunk-NQ7PICSF.js.map
