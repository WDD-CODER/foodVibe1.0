import { DestroyRef, WritableSignal, effect, inject, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

export interface ParamSerializer<T> {
  toUrl(value: T): string | null;
  fromUrl(raw: string): T;
  toSession(value: T): unknown;
  fromSession(raw: unknown): T;
}

export interface ParamDescriptor<T = unknown> {
  urlParam: string;
  signal: WritableSignal<T>;
  serializer: ParamSerializer<T>;
}

export const StringParam: ParamSerializer<string> = {
  toUrl: (v) => v || null,
  fromUrl: (r) => r ?? '',
  toSession: (v) => v,
  fromSession: (r) => (typeof r === 'string' ? r : ''),
};

export const NullableStringParam: ParamSerializer<string | null> = {
  toUrl: (v) => v ?? null,
  fromUrl: (r) => r ?? null,
  toSession: (v) => v,
  fromSession: (r) => (typeof r === 'string' ? r : null),
};

/** 'created' | 'updated'; URL only when 'updated'. */
export const DateFieldParam: ParamSerializer<'created' | 'updated'> = {
  toUrl: (v) => (v === 'updated' ? 'updated' : null),
  fromUrl: (r) => (r === 'updated' ? 'updated' : 'created'),
  toSession: (v) => v,
  fromSession: (r) => (r === 'updated' ? 'updated' : 'created'),
};

export const BooleanParam: ParamSerializer<boolean> = {
  toUrl: (v) => (v ? '1' : null),
  fromUrl: (r) => r === '1',
  toSession: (v) => v,
  fromSession: (r) => r === true,
};

export const NullableBooleanParam: ParamSerializer<boolean | null> = {
  toUrl: (v) => (v === null ? null : v ? '1' : '0'),
  fromUrl: (r) => {
    if (r === '1') return true;
    if (r === '0') return false;
    return null;
  },
  toSession: (v) => v,
  fromSession: (r) => {
    if (r === true) return true;
    if (r === false) return false;
    return null;
  },
};

export const StringArrayParam: ParamSerializer<string[]> = {
  toUrl: (v) => (v.length ? v.join(',') : null),
  fromUrl: (r) => (r ? r.split(',').filter(Boolean) : []),
  toSession: (v) => v,
  fromSession: (r) => (Array.isArray(r) ? r : []),
};

export const StringSetParam: ParamSerializer<Set<string>> = {
  toUrl: (v) => (v.size ? Array.from(v).join(',') : null),
  fromUrl: (r) => new Set(r ? r.split(',').filter(Boolean) : []),
  toSession: (v) => Array.from(v),
  fromSession: (r) => new Set(Array.isArray(r) ? r : []),
};

export const NumberSetParam: ParamSerializer<Set<number>> = {
  toUrl: (v) => (v.size ? Array.from(v).join(',') : null),
  fromUrl: (r) =>
    new Set(
      r
        ? r
            .split(',')
            .map(Number)
            .filter((n) => !isNaN(n))
        : []
    ),
  toSession: (v) => Array.from(v),
  fromSession: (r) => new Set(Array.isArray(r) ? r.map(Number) : []),
};

/**
 * Serializes Record<string, string[]> for multi-category filters.
 * URL format: `type:dish|allergens:gluten,dairy`
 */
export const FilterRecordParam: ParamSerializer<Record<string, string[]>> = {
  toUrl(value) {
    const entries = Object.entries(value).filter(([, v]) => v.length > 0);
    if (!entries.length) return null;
    return entries.map(([k, v]) => `${k}:${v.join(',')}`).join('|');
  },
  fromUrl(raw) {
    const result: Record<string, string[]> = {};
    if (!raw) return result;
    for (const part of raw.split('|')) {
      const idx = part.indexOf(':');
      if (idx < 1) continue;
      const key = part.slice(0, idx);
      const vals = part.slice(idx + 1).split(',').filter(Boolean);
      if (vals.length) result[key] = vals;
    }
    return result;
  },
  toSession: (v) => v,
  fromSession: (r) =>
    r && typeof r === 'object' && !Array.isArray(r)
      ? (r as Record<string, string[]>)
      : {},
};

const SESSION_PREFIX = 'list-state:';

function readSession(routeKey: string): Record<string, unknown> | null {
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + routeKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(
  routeKey: string,
  descriptors: ParamDescriptor[]
): void {
  try {
    const obj: Record<string, unknown> = {};
    for (const d of descriptors) {
      obj[d.urlParam] = d.serializer.toSession(d.signal());
    }
    sessionStorage.setItem(SESSION_PREFIX + routeKey, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

/**
 * Connects component signals to URL query params and sessionStorage.
 *
 * Must be called from a component constructor (or field initializer)
 * so Angular's injection context is available.
 *
 * Priority: URL query params > sessionStorage > signal defaults.
 */
export function useListState(
  routeKey: string,
  descriptors: ParamDescriptor[]
): void {
  const router = inject(Router);
  const route = inject(ActivatedRoute);

  const params = route.snapshot.queryParams;
  const hasUrlState = descriptors.some((d) => params[d.urlParam] != null);

  if (hasUrlState) {
    for (const d of descriptors) {
      const raw = params[d.urlParam];
      if (raw != null) d.signal.set(d.serializer.fromUrl(raw));
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

  // Sync signals from URL when query params change (e.g. KPI link to list with filters).
  // Only update when URL value differs to avoid feedback loop with the effect below.
  const destroyRef = inject(DestroyRef);
  route.queryParams.pipe(takeUntilDestroyed(destroyRef)).subscribe((params) => {
    for (const d of descriptors) {
      const raw = params[d.urlParam];
      if (raw == null) continue;
      const currentUrl = d.serializer.toUrl(d.signal());
      if (raw !== currentUrl) {
        d.signal.set(d.serializer.fromUrl(raw));
      }
    }
  });

  effect(() => {
    const queryParams: Record<string, string | null> = {};
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
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  });
}
