import {
  AuthModalService
} from "./chunk-WWCQSEYJ.js";
import {
  TranslationService
} from "./chunk-CH6HZ4GZ.js";
import {
  UserService
} from "./chunk-NQ7PICSF.js";
import {
  UserMsgService
} from "./chunk-Z3W6FQFP.js";
import {
  Injectable,
  inject,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/utils/require-auth.util.ts
var RequireAuthService = class _RequireAuthService {
  userService = inject(UserService);
  userMsg = inject(UserMsgService);
  translation = inject(TranslationService);
  authModal = inject(AuthModalService);
  requireAuth() {
    if (this.userService.isLoggedIn())
      return true;
    this.userMsg.onSetWarningMsg(this.translation.translate("sign_in_to_use"));
    this.authModal.open("sign-in");
    return false;
  }
  static \u0275fac = function RequireAuthService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RequireAuthService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _RequireAuthService, factory: _RequireAuthService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RequireAuthService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  RequireAuthService
};
//# sourceMappingURL=chunk-D637KIHB.js.map
