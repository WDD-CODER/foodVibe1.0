# Gotchas — Angular / frontend

Part of the domain split of `docs/brain/gotchas.md` — see that file for the index and the append routing table. Same rules as the parent file: each entry is what hurt / why the obvious fix is wrong / what to do instead. Append new entries at the bottom; never delete a still-true entry. If this file exceeds ~150 lines / ~10 entries, propose a further split as a brain proposal at the next Merge Gate.

Scope: `src/app/` — components, signals-based state, routing, template/CD behavior.

---

## Login reload bypasses deferred constructor load

**What hurt:** Plan 289 deferred venue / menu-event / section-category constructor fetches, but Equipment and Preparations still hit the network on cold dashboard after login. Removing constructor `loadInitialData()` alone was not enough — `UserService._reloadDataServices()` still called `reloadFromStorage()` unconditionally for those services on every auth hydrate.

**Why the obvious fix is wrong:** Treating “no constructor load” as “no bootstrap GET” ignores the login/guest path, which constructs the service and forces a full rehydrate. Keeping the service eager “because recipe-builder needs it” also skips the cheaper fix: wire `ensureLoaded()` on the recipe-builder route.

**What to do instead:** For every deferred singleton data service, gate login reload with `hasLoaded()` (skip until first route/tab hydrate). Wire `ensureLoaded()` on owning resolvers / first UI surface. See [[defer-singleton-data-ensureLoaded]].

---

## Unregistered Lucide icon aborts list `@for` CD

**What hurt:** Inventory (and any list using `app-row-actions-menu`) showed mostly empty rows (checkbox + ₪ only). Data was fine in the signal; `ng.applyChanges` filled every row. Hovering a nutrition badge “woke” a few more. Agents burned time on paint/`backdrop-filter` theories.

**Why the obvious fix is wrong:** Treating blank cells as a CSS compositing bug (or forcing `detectChanges` hacks) misses the console: Lucide throws `The "more-vertical" icon has not been provided` inside each row’s `RowActionsMenuComponent`. That exception **stops change detection mid-`@for`**, so later bindings never run. Tests can pass while the app is broken if `TEST_LUCIDE_ICONS` includes the icon but `app.config.ts` does not.

**What to do instead:** When list rows are blank but the store has data, open the console first for Lucide provider errors. Register every template icon in `LucideAngularModule.pick` in `app.config.ts` (see glossary **Lucide icon registration**). Keep test picks and app picks in sync when adding shared UI (e.g. `row-actions-menu`). Do not chase paint fixes until the console is clean.

---

## Gating a user action on a fire-and-forget side-write silently breaks it for some users

**What hurt:** `ai-recipe-modal.component.ts`'s "approve and go to recipe builder" button did nothing for non-admin accounts. `onDraftApproved()` only called `navigateToBuilder_()` inside the success callback of `saveShot()`, but `POST /api/v1/ai/shots` required `requireAdmin` — a 403 with no `.subscribe()` error handler silently swallowed the navigation. Render logs showed repeated `POST /api/v1/ai/shots 403` with no visible connection to the reported symptom ("button does nothing").

**Why the obvious fix is wrong:** Adding an error handler that also navigates on failure just hides the coupling — the next side-write added to that callback (analytics, notifications, whatever) reintroduces the same class of bug. The real problem is treating a background/curation write as a precondition for the primary user action at all.

**What to do instead:** Any write that exists to feed a secondary system (training data, analytics, audit log) must be fire-and-forget relative to the user-facing action — compute what the UI needs locally (here, `computeWarnings()` already existed client-side) and never gate navigation on the network call's result. `ai-menu-modal.component.ts` already had this right (apply first, `saveMenuShot(...).catch(() => {})` after); mirror that pattern for any future modal with a training-shot side-write.

---

## Route-resolved data read once in a field initializer goes stale across param-only navigation

**What hurt:** `VenueDetailComponent`'s `venue_` signal was initialized from `this.route.snapshot.data['venue']` in a field initializer. The `venueResolver` correctly re-runs and refetches on every navigation to `/venues/view/:id`, including param-only changes — but Angular's default `RouteReuseStrategy` reuses the component instance across those navigations (same route config, different `:id`), so the field initializer never re-ran and `venue_` stayed pinned to whichever venue loaded first.

**Why the obvious fix is wrong:** The bug was invisible in every manual test this session, because every reachable navigation path into this route goes through `/venues/list` first (a genuine route change, so Angular destroys/recreates the component). It only bites on a same-route param-only transition — a bookmark, browser back/forward across two venue URLs, or any future in-page "next venue" link — none of which existed yet to trigger it.

**What to do instead:** For any component that reads resolver data, use `toSignal(this.route.data)` (reactive) instead of `this.route.snapshot.data` (read-once) unless the route config is provably always destroy/recreate for every reachable navigation into it. See `venue-detail.component.ts`.
