---
name: App Load Optimization — Bundle Size + Eager Data Fetching
overview: Phase 2 performance plan. Defer root modals out of the initial JS bundle, defer non-critical data-service GETs until route navigation, and parallelize PUT /:type replaceAll conflict-check. Continues after Save Latency Fix (version-history M1–3).
todos: []
isProject: false
---

# Goal — App Load Optimization (Phase 2)

Reduce "app takes a while to load" by (a) stopping 15 root modals from shipping in the main bundle and (b) stopping non-critical singleton data services from firing network GETs on every bootstrap. Also cheapen the low-traffic `PUT /:type` replaceAll path (Milestone 6).

**Prerequisite:** Save Latency Fix (version-history scoped queries + non-blocking `addVersion`) — Milestones 1–3 — already executed. Do not re-do them here.

**Context for executing agent:** Root cause of slow initial load is (1) all root-level modals in `app.component` shipping in the initial JS chunk regardless of route, and (2) 11+ `providedIn: 'root'` data services calling `loadInitialData()` from constructors on bootstrap whether or not the current route needs that data.

**Execution protocol (Contractor):** ONE milestone at a time, then STOP for review. Do not mark `[x]` until Human validates the job (`/ship` Approve Y or explicit mark-done) — then **must** mark matching todos. Never start the next without explicit Human instruction. Write `/sessions/[today ISO date].md` after each milestone. Run production build / Network checks as declared in Done when. Stay on `feat/` branch — never `main`.

---

# Prior work (do not re-execute)

| Milestone | Status | Notes |
|-----------|--------|-------|
| 1 — Server scoped VERSION_HISTORY GET + bulk DELETE + index | Done | `server/routes/generic.js`, `server/db.js` |
| 2 — Client scoped `addVersion` + fire-and-forget on save | Done | version-history, http/async storage, kitchen-state |
| 3 — Audit other `replaceAll` callers | Done | Trash/demo/backup bounded or intentional; no duplicate save-path bug |

---

# Milestone 4 — Defer modal components out of the initial bundle

## Goal

Stop shipping all 15 root-level modals in the main bundle; load each only when it is actually opened.

## Files to check first

- `src/app/appRoot/app.component.ts` and `app.component.html` (current eager imports/template)
- Each modal's opening service (e.g. `AiRecipeModalService`, `AddEquipmentModalService`, `UnitRegistryService.isCreatorOpen_`, `ConfirmModalService`, etc. — grep `src/app/` for `*modal*.service.ts` and `isOpen` / `isCreatorOpen` style signals that gate each modal's visibility)

## Current root modals (from `app.component.html`)

`unit-creator-modal`, `translation-key-modal`, `app-label-creation-modal`, `add-item-modal`, `app-quick-add-product-modal`, `app-quick-edit-product-modal`, `add-equipment-modal`, `app-global-specific-modal`, `app-confirm-modal`, `app-supplier-modal`, `app-ai-recipe-modal`, `app-ai-menu-modal`, `app-ai-product-modal`, `app-restore-choice-modal`, `app-auth-modal` (+ `app-hero-fab` is not a modal — leave as-is unless it is clearly modal-like and heavy).

## Steps

1. Record **baseline** production build: `ng build --configuration production` — note initial / main bundle size from the build output.
2. For each modal in `app.component.html`, confirm the signal/service that controls visibility (e.g. `@if (aiRecipeModal.isOpen_())`).
3. **Pass 1 — AI modals first** (heaviest / rarest): wrap `app-ai-recipe-modal`, `app-ai-menu-modal`, `app-ai-product-modal` in Angular 19 native `@defer (when <isOpenSignal>)` (or equivalent when-condition on the open signal). Remove eager imports from `app.component.ts` only as required by `@defer` (do not change modal internals).
4. Rebuild production; record size delta after Pass 1.
5. **Pass 2 — remaining modals:** same `@defer` pattern for the other root modals.
6. **Special case:** `app-confirm-modal` and `app-auth-modal` are used very early. After deferring, manually check first-open latency. If noticeable, **revert those two to eager** and only keep the rest deferred. Document the choice in the session summary.
7. After each conversion batch, verify: modal still opens on trigger, no flash-of-missing-content, no regression in `pendingChangesGuard` or cross-modal flows (e.g. `ConfirmModalService` used inside `saveAndWait`).

## Rules

- Do **not** change any modal's internal logic or template — only how/when it is instantiated from the root.
- Do **not** touch routed pages (`app.routes.ts`) — this milestone is root-component-only.
- Do **not** invent a custom lazy-load framework — use Angular 19 `@defer`.
- No new dependencies.

## Atomic Sub-tasks

- [ ] 4.1 Record baseline: `ng build --configuration production` — note initial/main bundle size
- [ ] 4.2 `app.component.html` + `.ts` — `@defer` the 3 AI modals on their open signals; verify open + rebuild size
- [ ] 4.3 Defer remaining root modals (pass 2) — leave confirm/auth eager if first-open latency is noticeable
- [ ] 4.4 Manual verify: all deferred modals open; confirm/auth still snappy; no pendingChangesGuard regression
- [ ] 4.5 Record after numbers from production build output (main vs deferred chunks)

## Done when

- Production build shows a **measurable** reduction in initial (main) bundle size — before/after numbers recorded in `/sessions/[date].md`.
- All deferred modals still open and function when triggered.
- No visible regression in confirm-dialog or auth-modal responsiveness on first use (or those two left eager with rationale documented).

## Verify

```bash
ng build --configuration production
```

Manual: open each deferred modal once; trigger a confirm flow from save/delete; open auth modal.

---

# Milestone 5 — Defer non-critical eager data loading

## Goal

Stop firing network requests for equipment / venues / menu-events / preparations / section-categories on app bootstrap when the user has not navigated to a route that needs them yet.

## Files to check first

- `src/app/core/services/equipment-data.service.ts`
- `src/app/core/services/venue-data.service.ts`
- `src/app/core/services/menu-event-data.service.ts`
- `src/app/core/services/preparation-registry.service.ts`
- `src/app/core/services/menu-section-categories.service.ts`
- `src/app/core/services/base-entity-data.service.ts` (shared constructor pattern)
- `src/app/app.routes.ts` (existing resolver pattern: `productResolver`, `recipeResolver`, etc.)
- `src/app/core/services/kitchen-state.service.ts` / dashboard — confirm nothing outside those routes reads the candidate signals before the relevant route loads

## Steps

1. **Audit:** for each of the 5 candidate services, grep all usages of their `all_` / `allX_` (or equivalent) signals across the app. If a service's data is read from the dashboard or another always-loaded surface, **exclude** it from this milestone — only defer services whose data is read exclusively within their own lazy-loaded route subtree (equipment, venues, menu-intelligence, metadata-manager, etc.).
2. For each service confirmed safe to defer:
   - Remove the `loadInitialData()` (or equivalent) call from the constructor.
   - Add a public `ensureLoaded()` that loads only if not already loaded (guard on a `loaded_` signal/flag to avoid duplicate fetches).
3. Wire `ensureLoaded()` into that route's existing resolver (or add a minimal new resolver / `resolve` entry) so the fetch happens on navigation into that section, not on app bootstrap.
4. If a service is read from more than one lazy route (e.g. preparations in dish workflow **and** recipe-builder), defer to the **earliest** of those routes — no duplicate resolvers for the same service. If recipe-builder needs it immediately, that may force keeping it eager — document and exclude rather than breaking recipe-builder.
5. **Keep eager (do not touch):** `RecipeDataService`, `DishDataService`, `ProductDataService`, `SupplierDataService`, `UnitRegistryService`, `MetadataRegistryService`.
6. Do **not** touch `demo-loader.service.ts` or `backup.service.ts` — both call public `reloadFromStorage()` / reload APIs and must keep working.

## Rules

- Do **not** change any service's public data-access API (`allX_` signals) — only **when** the underlying fetch happens.
- Do **not** invent a new data-loading framework — extend existing resolver + service patterns.
- If audit shows a candidate is unsafe to defer, leave it eager and report in the session summary (no silent scope creep).

## Atomic Sub-tasks

- [x] 5.1 Audit: grep candidate service signal usages — exclude any read from dashboard / always-on surfaces
- [x] 5.2 For each safe service: remove constructor load; add `ensureLoaded()` with `loaded_` guard
- [x] 5.3 Wire `ensureLoaded()` into route resolvers for the owning lazy sections
- [x] 5.4 Keep Recipe/Dish/Product/Supplier/Unit/Metadata registries eager — do not touch
- [x] 5.5 Manual: `/dashboard` Network tab has no GETs for deferred collections until navigation; target pages still populate on first visit

## Done when

- Network tab on initial `/dashboard` load no longer shows GETs for deferred collections (`EQUIPMENT_LIST`, `VENUE_PROFILES`, `MENU_EVENT_LIST`, `KITCHEN_PREPARATIONS`, `MENU_SECTION_CATEGORIES` — whichever were confirmed safe) until the user navigates to a route that needs them.
- Equipment / venues / menu-intelligence / metadata-manager (as applicable) still load data correctly on first visit (no blank state from a missed fetch).

## Verify

Manual Network tab: cold load `/dashboard` → count GETs. Navigate to each deferred section → confirm fetch fires once and UI populates.

---

# Milestone 6 — Fix PUT `/:type` (replaceAll) double query round-trip

## Goal

Remove the extra **sequential** round-trip in the bulk-replace route so trash-clear and backup-import do not pay for an unnecessary wait. Correctness of the id-conflict check stays.

## Files to check first

- `server/routes/generic.js` — `PUT /:type` (`deleteMany` → `stillTaken` lookup → `insertMany`)
- `src/app/core/services/backup.service.ts` — import path (caller of `replaceAll`)
- Trash / data services that call `storage.replaceAll` on trash keys (confirm callers; do not change client contracts)

## Steps

1. Re-read the full `PUT /:type` handler: `deleteMany({ userId })` → query for `stillTaken` ids (ids that exist under other users) → reassign fresh ids to conflicts → `insertMany`.
2. Confirm `_id` uniqueness is collection-wide (Mongo primary key) — the pre-check exists to avoid E11000 by reassigning conflicting ids. **Do not delete the check.**
3. Run `deleteMany({ userId })` and the `stillTaken` lookup in **parallel** (`Promise.all`) — they do not depend on each other's results for correctness of the conflict set (incoming ids vs docs still present after/during delete of *this* user's docs; confirm logic carefully: after parallel delete, other users' docs with those `_id`s remain; the lookup should still find only non-deleted / other-user docs. Prefer: start both; if parallel with delete is racy, run lookup **before** delete in parallel with nothing, or document why sequential delete-then-lookup must stay — but the intended fix is parallelize independent work without weakening safety).
4. Only reassign ids for the subset actually in conflict; everything else proceeds as-is.
5. If investigation shows the check is already a minimal `_id`-indexed lookup and parallelization is the only win, stop there — do not over-engineer a bigger rewrite for a low-traffic route.

## Rules

- Do **not** change the route's external contract (`X-Confirm-Replace` header, response shape) — backup and trash callers must keep working unmodified.
- Do **not** remove the id-conflict safety check — only make independent steps concurrent where safe.
- Delete stays scoped to `userId` — never weaken that.
- No new dependencies / indexing frameworks.

## Atomic Sub-tasks

- [ ] 6.1 `server/routes/generic.js` PUT `/:type` — parallelize `deleteMany` + stillTaken `_id` lookup via `Promise.all` (or equivalent safe concurrent form); keep conflict reassignment
- [ ] 6.2 Manual: trash empty-all + backup-import still correct; contract unchanged

## Done when

- `PUT /:type` no longer waits for delete and conflict-check **sequentially** when they can run concurrently (session summary notes the before/after approach).
- Trash "empty all" and backup-import still work (manual: clear trash with several items; restore a backup file).

## Verify

Manual API or UI: empty trash; import backup. Confirm no E11000 / missing docs.

---

# Rules (all milestones)

- Signals only; `inject()`; no `any`; single quotes / no semicolons in `.ts`.
- No client-side Gemini keys; no secrets in commits.
- Never write on `main`. Never commit/push (Human's job).
- 3-strike rule on compile/test errors within scoped files; then stash + `/bugs/bug_[ID].md` + STOP.
- New dependencies only if named here (none are).

---

# Backend Impact

- Milestone 4–5: **none** (client-only).
- Milestone 6: `server/routes/generic.js` only — behavior-preserving performance tweak to existing `PUT /:type`. No schema / auth / new routes.

---

# Security note

Milestone 6 touches a write route (`verifyToken` + user-scoped `deleteMany`). Do not weaken auth or user scoping. Confirm/auth modal deferral (M4) must not break login UX.

---

# Overall Done When (Phase 2)

- Initial bundle size reduced (Milestone 4) — measurable in build output.
- Initial dashboard load fires fewer network requests (Milestone 5) — measurable in Network tab.
- `PUT /:type` conflict path is concurrent where safe (Milestone 6) — trash/backup still correct.
- No functional regressions in any modal or lazy-loaded section.

---

# Suggested execution order for Cursor

1. Milestone 4 (modals) — mechanical, measurable bundle win.
2. Milestone 5 (eager data) — more invasive; audit first.
3. Milestone 6 (replaceAll parallelize) — small server tweak; last.

Human says e.g. **"execute Milestone 4"** to start.
