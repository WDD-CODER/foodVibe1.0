import {
  Injectable,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/environments/environment.ts
var environment = {
  production: false,
  apiUrl: "",
  authApiUrl: "",
  useBackendAuth: false,
  useBackend: false,
  logServerUrl: "http://localhost:9765"
};

// src/app/core/services/logging.service.ts
var LoggingService = class _LoggingService {
  sendToLogServer(level, event) {
    const url = environment.logServerUrl;
    if (!url || typeof fetch === "undefined")
      return;
    const payload = {
      level,
      event: event.event,
      message: event.message,
      context: event.context,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    fetch(`${url.replace(/\/$/, "")}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {
    });
  }
  info(messageOrEvent, context) {
    const event = typeof messageOrEvent === "string" ? { event: "app.info", message: messageOrEvent, context } : messageOrEvent;
    if (typeof window !== "undefined" && window.console) {
      console.log(`[info] ${event.event}: ${event.message}`, event.context ?? "");
    }
    this.sendToLogServer("info", event);
  }
  warn(messageOrEvent, context) {
    const event = typeof messageOrEvent === "string" ? { event: "app.warn", message: messageOrEvent, context } : messageOrEvent;
    if (typeof window !== "undefined" && window.console) {
      console.warn(`[warn] ${event.event}: ${event.message}`, event.context ?? "");
    }
    this.sendToLogServer("warn", event);
  }
  error(messageOrEvent, context) {
    const event = typeof messageOrEvent === "string" ? { event: "app.error", message: messageOrEvent, context } : messageOrEvent;
    if (typeof window !== "undefined" && window.console) {
      console.error(`[error] ${event.event}: ${event.message}`, event.context ?? "");
    }
    this.sendToLogServer("error", event);
  }
  static \u0275fac = function LoggingService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LoggingService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _LoggingService, factory: _LoggingService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LoggingService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  environment,
  LoggingService
};
//# sourceMappingURL=chunk-ZMFT5D5F.js.map
