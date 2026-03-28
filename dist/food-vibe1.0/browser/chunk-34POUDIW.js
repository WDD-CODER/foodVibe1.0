import {
  takeUntilDestroyed
} from "./chunk-4LOKEQAU.js";
import {
  ActivatedRoute,
  DestroyRef,
  Router,
  effect,
  inject,
  untracked
} from "./chunk-GCYOWW7U.js";

// src/app/core/utils/list-state.util.ts
var StringParam = {
  toUrl: (v) => v || null,
  fromUrl: (r) => r ?? "",
  toSession: (v) => v,
  fromSession: (r) => typeof r === "string" ? r : ""
};
var NullableStringParam = {
  toUrl: (v) => v ?? null,
  fromUrl: (r) => r ?? null,
  toSession: (v) => v,
  fromSession: (r) => typeof r === "string" ? r : null
};
var BooleanParam = {
  toUrl: (v) => v ? "1" : null,
  fromUrl: (r) => r === "1",
  toSession: (v) => v,
  fromSession: (r) => r === true
};
var NullableBooleanParam = {
  toUrl: (v) => v === null ? null : v ? "1" : "0",
  fromUrl: (r) => {
    if (r === "1")
      return true;
    if (r === "0")
      return false;
    return null;
  },
  toSession: (v) => v,
  fromSession: (r) => {
    if (r === true)
      return true;
    if (r === false)
      return false;
    return null;
  }
};
var StringArrayParam = {
  toUrl: (v) => v.length ? v.join(",") : null,
  fromUrl: (r) => r ? r.split(",").filter(Boolean) : [],
  toSession: (v) => v,
  fromSession: (r) => Array.isArray(r) ? r : []
};
var StringSetParam = {
  toUrl: (v) => v.size ? Array.from(v).join(",") : null,
  fromUrl: (r) => new Set(r ? r.split(",").filter(Boolean) : []),
  toSession: (v) => Array.from(v),
  fromSession: (r) => new Set(Array.isArray(r) ? r : [])
};
var NumberSetParam = {
  toUrl: (v) => v.size ? Array.from(v).join(",") : null,
  fromUrl: (r) => new Set(r ? r.split(",").map(Number).filter((n) => !isNaN(n)) : []),
  toSession: (v) => Array.from(v),
  fromSession: (r) => new Set(Array.isArray(r) ? r.map(Number) : [])
};
var FilterRecordParam = {
  toUrl(value) {
    const entries = Object.entries(value).filter(([, v]) => v.length > 0);
    if (!entries.length)
      return null;
    return entries.map(([k, v]) => `${k}:${v.join(",")}`).join("|");
  },
  fromUrl(raw) {
    const result = {};
    if (!raw)
      return result;
    for (const part of raw.split("|")) {
      const idx = part.indexOf(":");
      if (idx < 1)
        continue;
      const key = part.slice(0, idx);
      const vals = part.slice(idx + 1).split(",").filter(Boolean);
      if (vals.length)
        result[key] = vals;
    }
    return result;
  },
  toSession: (v) => v,
  fromSession: (r) => r && typeof r === "object" && !Array.isArray(r) ? r : {}
};
var SESSION_PREFIX = "list-state:";
function readSession(routeKey) {
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + routeKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeSession(routeKey, descriptors) {
  try {
    const obj = {};
    for (const d of descriptors) {
      obj[d.urlParam] = d.serializer.toSession(d.signal());
    }
    sessionStorage.setItem(SESSION_PREFIX + routeKey, JSON.stringify(obj));
  } catch {
  }
}
function useListState(routeKey, descriptors) {
  const router = inject(Router);
  const route = inject(ActivatedRoute);
  const params = route.snapshot.queryParams;
  const hasUrlState = descriptors.some((d) => params[d.urlParam] != null);
  if (hasUrlState) {
    for (const d of descriptors) {
      const raw = params[d.urlParam];
      if (raw != null)
        d.signal.set(d.serializer.fromUrl(raw));
    }
  } else {
    const cached = readSession(routeKey);
    if (cached) {
      for (const d of descriptors) {
        if (d.urlParam in cached) {
          d.signal.set(d.serializer.fromSession(cached[d.urlParam]));
        }
      }
    }
  }
  let skipFirstUrlWrite = hasUrlState;
  const destroyRef = inject(DestroyRef);
  route.queryParams.pipe(takeUntilDestroyed(destroyRef)).subscribe((params2) => {
    for (const d of descriptors) {
      const raw = params2[d.urlParam];
      if (raw == null)
        continue;
      const currentUrl = d.serializer.toUrl(d.signal());
      if (raw !== currentUrl) {
        d.signal.set(d.serializer.fromUrl(raw));
      }
    }
  });
  effect(() => {
    const queryParams = {};
    for (const d of descriptors) {
      queryParams[d.urlParam] = d.serializer.toUrl(d.signal());
    }
    writeSession(routeKey, descriptors);
    if (skipFirstUrlWrite) {
      skipFirstUrlWrite = false;
      return;
    }
    untracked(() => {
      router.navigate([], {
        relativeTo: route,
        queryParams,
        queryParamsHandling: "merge",
        replaceUrl: true
      });
    });
  });
}

export {
  StringParam,
  NullableStringParam,
  BooleanParam,
  NullableBooleanParam,
  StringArrayParam,
  StringSetParam,
  NumberSetParam,
  FilterRecordParam,
  useListState
};
//# sourceMappingURL=chunk-34POUDIW.js.map
