# Pattern: Global loading feedback via `LoadingService.track()`

## Problem

The app has a production-ready "pot with steam" overlay component (`LoaderComponent` with `[overlay]="true"`, glass-blur backdrop) that was only wired to 2 of 34 usages — route navigation and post-login data reload. Every other async wait (most critically, a data service's first `ensureLoaded()` hydration) showed nothing while loading, and in the worst case a list briefly rendered its "no results" empty-state before real data arrived, reading as broken rather than loading. The visual existed; there was no shared signal tracking "is anything worth telling the user about in flight."

## Solution

1. `LoadingService` (`src/app/core/services/loading.service.ts`) is a signal-based pending-count with a `track<T>(promise): Promise<T>` wrapper and a **200ms show-debounce** — a load that resolves faster than the debounce never flashes the overlay; one that takes longer shows it immediately once the debounce elapses, and hides the instant the count returns to zero.
2. Wrap ONLY the initial-hydration fetch inside each data service's `loadInitialData()` — e.g. `await this.loading_.track(this.storage.query<T>(this.storageKey))` — not every CRUD call. This covers both `ensureLoaded()` and `reloadFromStorage()` in one place (they both funnel through `loadInitialData()`) without touching per-action mutations.
3. Root `AppComponent`'s existing overlay `@if` gets one more OR clause: `isRouteLoading() || isDataReloading_() || loading_.isLoading_()` — same `<app-loader size="large" [overlay]="true">`, zero new markup.
4. Do NOT wrap the ~30 existing per-button inline spinners (favorite/save/delete) in this counter — they already give correct, localized feedback; adding the global overlay on top of those would double-indicate the same action and feel heavier than intended. Scope this counter to "the user has nothing else telling them something is happening," not "every async op."

## When to use

Any new root data service with its own `ensureLoaded()`/`loadInitialData()` shape (whether it extends `BaseEntityDataService` or duplicates the pattern by hand — see the companion pattern below) should wrap its fetch in `LoadingService.track()` the same way, so first-load feedback stays consistent app-wide without each service inventing its own spinner.

See also: pattern **Defer singleton data with `ensureLoaded`** — that pattern controls *when* a service's data loads; this one makes *whatever triggers that load* visible to the user while it's in flight. They compose: a deferred `ensureLoaded()` call fired from a route resolver still gets the global overlay the same way an eager constructor-time load does.
