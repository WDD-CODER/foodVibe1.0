# Active Tasks

> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-2026-07-21.md`](reports/todo-ledger-relevance-audit-2026-07-21.md).
> Checkboxes are **unchanged** — decide per group: execute / mark done / prune / keep.

---

## 1. EXECUTE — real unfinished work

> Audit says: do these.

### Plan 301 — Server-side search & lean data loading (`plans/301-server-side-search-lean-data-loading.plan.md`)

> Milestone 1 done, merged to `main` (PR #177), Human-validated 2026-08-13. Milestones 2-4 still not started.

- [x] Confirm exact lean field list the ingredient-search dropdown needs (read `ingredient-search.component.html` template) before designing the `/search` response shape
- [x] Add `{ userId: 1, name_hebrew: 1 }` index (or equivalent) to `server/db.js` for `PRODUCT_LIST`/`RECIPE_LIST`/`DISH_LIST`
- [x] Add `GET /api/v1/data/:type/search?q=&limit=` to `server/routes/generic.js` — prefix match on `name_hebrew`, lean projection, restricted to an allowlist of searchable entity types
- [x] Add `search<T>()` to `HttpStorageAdapter`/`StorageService` mirroring the existing `query()`/`queryFiltered()` shape
- [x] Refactor `ingredient-search.component.ts` to debounce + call the new search endpoint instead of filtering `KitchenStateService.products_()`/`recipes_()` in full
- [x] Refactor `recipe-book-list.component.ts`'s `filteredProductsForIngredientSearch_` the same way
- [x] Verify: build, curl the new endpoint, live typeahead behavior, no regression on inventory/recipe-book, no keystroke-spam requests
- [ ] (Milestone 2/3/4 — see plan file; not started, lower priority, scope separately)

### Plan 302 — Perf Phase 1: Infrastructure & Boot Payload (`plans/302-perf-phase1-infra-and-payload.plan.md`)

> From audit `reports/performance-audit-2026-08-13.md`. M1 gates M2-M5 — ship instrumentation alone first.

- [x] Replace `morgan('tiny')` with a format including `:response-time` and `:res[content-length]` — `server/index.js:65`
- [x] Move `app.use(morgan(...))` above `app.use(express.static(...))` so asset requests are logged — `server/index.js:63,65`
- [x] Add Mongo-time / serialize-time / doc-count / pre-compression-byte logging to `GET /:type` — `server/routes/generic.js:45-77`
- [x] Decide and document whether the `JSON.stringify` size measurement is env-gated (`PERF_LOG=1`) or temporary
- [x] Log boot duration in the `app.listen()` callback to make cold starts visible — `server/index.js:125-131`
- [ ] Deploy; collect ~24h of real-use numbers from Render logs
- [ ] Record observed numbers in `reports/performance-audit-2026-08-13.md` under a new "Observed" section
- [ ] Confirm from M1 logs whether cold starts actually occur during business hours — if not, stop and re-prioritise
- [ ] Human: approve billing change; set `plan: free` → `plan: starter` in `render.yaml:5`
- [ ] Human: verify Atlas cluster region matches Render service region; report findings
- [ ] Human: check whether `MONGO_URI` points at an M0 free cluster; report findings
- [ ] Move `seedMasterData()` to run after `app.listen()` — `server/index.js:125-131`
- [ ] Determine whether both `foodvibe` and `foodvibe-api` Render services exist; document which is canonical
- [x] Add `maxAge: '1y'`, `immutable: true`, and the `index.html` → `no-cache` `setHeaders` guard — `server/index.js:63`
- [x] Set `Cache-Control: no-cache` on the SPA fallback `res.sendFile(index.html)` — `server/index.js:103-108`
- [ ] Verify a fresh deploy is still picked up by a returning browser (guards the fallback caching bug)
- [x] Remove `withPreloading(PreloadAllModules)` and its now-unused import — `src/app/app.config.ts:4,96`
- [x] Convert `menu-export.service.ts:8` and `recipe-export.service.ts:8` to `await import('exceljs')` at point of use
- [x] Propagate resulting `async` signature changes through `export.service.ts` and its 3 consumers
- [ ] Manually verify Excel export still produces a valid `.xlsx` from all three consumer pages
- [x] Re-confirm `food-compos-logo.png` (1.88 MB) is unreferenced; delete if so
- [x] Convert `recipe_placeholder.png` (1.27 MB) to WebP or inline SVG — update `recipe-header.component.ts:133`
- [ ] Convert both approve-stamp PNGs to WebP — update `approve-stamp.component.ts:20,22`

### Plan 303 — Perf Phase 2: Client CPU & Interaction Lag (`plans/303-perf-phase2-client-cpu.plan.md`)

> Gated on plan 302 M1 only. M1 below is the highest value-per-line change in the audit. Full sub-tasks in the plan file.
> M0/M1/M2 executed 2026-08-22 in response to a live user report ("app is stuck, even in local storage mode") — `ng build` passes, spot-verified live via `/browse` against the real 2113-recipe/1478-product dataset.

- [x] M0 (addendum) — Defer the `backup_<entityType>` localStorage mirror write off the critical path — `async-storage.service.ts:172-196`
- [x] M1 — Map-based lookups: add `productsById_`/`recipesById_` computed Maps; replace all 7 O(n) `.find()` scans in `recipe-cost.service.ts` and `recipe-allergens.util.ts:22,25`
- [ ] M1 — Record before/after costs + allergens for 10 representative recipes (nested, depth-limited, broken-ref, price-override) — spot-verified live instead; formal table still not done
- [x] M2 — Precomputed row model for recipe-book + inventory; row loops now read `displayRows_()` instead of calling functions per row
- [ ] M2 — Separate commit: convert the remaining 29 components to `ChangeDetectionStrategy.OnPush`
- [ ] M3 — Hoist the rebuilt `allProductNames` Set above the master loop — `server/services/sync-master.js:273-274` (out of scope: server-only, doesn't affect local-storage mode)
- [ ] M3 — Remove `syncMasterToUser` from `POST /refresh` (or version-gate it) — `server/routes/auth.js:274` (out of scope, same reason)
- [ ] M3 — Regression test: brand-new account signup still receives correctly cloned + remapped master data (out of scope, same reason)

### Plan 304 — Perf Phase 3: Data Volume (`plans/304-perf-phase3-data-volume.plan.md`)

> HARD GATE: do not start until 302 and 303 have shipped **and** been re-measured — they may reduce or eliminate this scope. Faceted search stays out of scope (that is plan 301 M2). Full sub-tasks in the plan file.

- [ ] Prerequisite gate — confirm 302 M1/M2 + 303 M1/M2 shipped and re-measured; reduce or drop scope if no longer justified
- [ ] M1 — List projections on `GET /:type` mirroring `SEARCH_PROJECTIONS` — `server/routes/generic.js:45-77,82-86`
- [ ] M1 — Verify edit flows fetch full documents so a lean list doc cannot round-trip through a save and erase fields
- [ ] M2 — Defer `RecipeDataService`/`DishDataService` to `autoLoad: false`; confirm resolver coverage first
- [ ] M2 — Regression test: cold-load a nested-sub-recipe recipe by direct URL; no ingredient unlinking (plan 300 finding 3)
- [ ] M2 — Collapse the post-login double fetch — `user.service.ts:54-93` (same item as plan 301 M4; mark both)
- [ ] M3 — Add `cdk-virtual-scroll` or pagination to inventory + recipe-book lists (after 303 M2)
- [ ] Hand-off — re-assess plan 301 M2's scope against measured results

### Plan 306 — Visual Restyling: UI Refactor Design Language (`plans/306-visual-restyling-ui-refactor-design-language.plan.md`)

> **Not started — plan only, saved for execution in a separate session.** Picks up where plan 305 (functional preservation, closed) left off: makes every screen actually *look* like `UI refactor/`. Same governing rule (skin only, never lose a function) and same lesson (audit each screen against the design before writing any CSS — plan 305's 46-55 item estimate turned out to be ~1 real item once checked against live source; assume the same here). M0's screenshot diff catalog is mandatory before any other milestone starts.

- [ ] M0 Tasks 1-4 — screenshot every screen live + design side by side (1280px + 390px), write `_claude-data/design-migration/visual-diff.md`, revise milestone order from the actual findings
- [ ] M1 Tasks 5-6 — shared `.c-*` engine class updates in `src/styles.scss`, only for gaps M0 confirms are real
- [ ] M2 Tasks 7-8 — shell/nav remainder (nav-pill gradient, avatar chip)
- [ ] M3 Tasks 9-11 — list-shell chassis pass (Inventory, Recipe Book, Suppliers, Equipment, Menu Library, Venues, Trash share this)
- [ ] M4 Task 12 — style the Venues new-data fields (address/capacity/contact/hours) added in plan 305
- [ ] M5 Task 13 — Dashboard
- [ ] M6 Task 14 — Venue Detail — **scoping question for the human first**: the design has this screen, the app doesn't; confirm whether building it is in scope before starting
- [ ] M7 Task 15 — Cook View
- [ ] M8 Task 16 — Metadata Manager
- [ ] M9 Task 17 — Product form
- [ ] M10 Tasks 18-19 — Menu Intelligence visual pass; fold in the breakpoint-renaming item plan 305 descoped while this milestone already has visual QA on the screen
- [ ] M11 Tasks 20-21 — Recipe Builder (biggest, most complex — do last, once the pattern is proven elsewhere); verify no regression to any of the 19 confirmed-working features from plan 305 §C
- [ ] M12 Tasks 22-25 — cross-screen QA: all 13 screens, 3 breakpoints, RTL, dark-mode-scope check, `ng build` clean

## 6. KEEP DEFERRED — intentional park

> Do not execute against current policy / product decisions.

### Angular 22 Migration (deferred)
- Remaining `npm audit --omit=dev --audit-level=high` findings are all `@angular/*` (XSS in template/attribute namespace + two-way binding sanitization, DoS via OOM in formatDate/digitsInfo, HttpTransferCache cache-key/info-leak) — blocked on the Angular 22 major upgrade.
- Do **not** run `npm audit fix --force`.
- Server `npm audit --omit=dev` is clean (0 vulnerabilities).
- CI (`.github/workflows/security.yml`) runs `npm audit --omit=dev --audit-level=critical`. `--omit=dev` is permanent (devDependency build-tooling churn — Angular CLI, vite, webpack-dev-server — is noise for a never-shipped tree, not app risk); restore `--audit-level=high` on top of `--omit=dev` after the migration clears the `@angular/*` findings above. See `docs/brain/decisions/0005-scope-npm-audit-to-production-deps.md`.

---

### Plan 122 — AI Chatbot Gemini scope (`plans/unused-122-ai-chatbot-gemini-scope.plan.md`)
> Product decisions never made. Path on disk is `unused-122-…`.

- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation → recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set

---

### Plan 248 — Transloco Migration (`plans/248-transloco-migration.plan.md`)
> Never started. AGENTS.md still mandates `translatePipe` + `dictionary.json` — park until policy change.

- [ ] Install `@jsverse/transloco` and configure `provideTransloco` in `src/app/app.config.ts` (standalone — do NOT run `ng add`)
- [ ] Split `public/assets/data/dictionary.json` into 8 scoped files under `public/assets/i18n/he/`
- [ ] Verify Transloco loader path — check network tab for `/assets/i18n/he/units.json` returning 200
- [ ] Replace `| translatePipe` in all templates with `| transloco` (scope-prefixed); add `TranslocoModule`/`TranslocoDirective` to each component's `imports`
- [ ] Replace `this.translation.translate(...)` calls in `.ts` files with `this.transloco.translate('scope.key')`
- [ ] Create `src/app/core/services/vocabulary.service.ts` (~40 lines: `resolve()`, `addEntry()`, localStorage)
- [ ] Update `src/app/core/services/key-resolution.service.ts` to inject `VocabularyService`
- [ ] Update all remaining `TranslationService` injection sites to `VocabularyService`
- [ ] Delete `translation-pipe.pipe.ts` and `translation.service.ts`
- [ ] Verify `ng build` passes and `{{ 'cup' | transloco }}` renders `כוס` in the app

## Where things live

- **Open work** — numbered groups §1–§6 above (this file only).
- **Audit source** — [reports/todo-ledger-relevance-audit-2026-07-21.md](reports/todo-ledger-relevance-audit-2026-07-21.md).
- **Done** — numbered volumes under [todo-archive/](todo-archive/README.md) (+ [INDEX.md](todo-archive/INDEX.md) for old Done catalog rows).
- **All plan files** — [`plans/`](../plans/).

### How to decide (quick)

| You say | Agent does |
| --- | --- |
| `prune discards` / `prune §5` | Remove §5 from this file |
| `mark done` / `done §3` | Mark §3 checkboxes `[x]` (and archive when all-x) |
| `execute 291` | Start Plan 291 (recreate plan file if missing) |
| `verify mobile` | Run mobile re-audits + TRIAGE updates |
| `drop §4 item N` | Remove that Maybe plan after your call |

## PreCompact signal dump (2026-08-09T08:33:10Z)

Open unchecked items at compact time:
- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation → recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set
- [ ] Install `@jsverse/transloco` and configure `provideTransloco` in `src/app/app.config.ts` (standalone — do NOT run `ng add`)
- [ ] Split `public/assets/data/dictionary.json` into 8 scoped files under `public/assets/i18n/he/`
- [ ] Verify Transloco loader path — check network tab for `/assets/i18n/he/units.json` returning 200
- [ ] Replace `| translatePipe` in all templates with `| transloco` (scope-prefixed); add `TranslocoModule`/`TranslocoDirective` to each component's `imports`
- [ ] Replace `this.translation.translate(...)` calls in `.ts` files with `this.transloco.translate('scope.key')`
- [ ] Create `src/app/core/services/vocabulary.service.ts` (~40 lines: `resolve()`, `addEntry()`, localStorage)
- [ ] Update `src/app/core/services/key-resolution.service.ts` to inject `VocabularyService`
- [ ] Update all remaining `TranslationService` injection sites to `VocabularyService`
- [ ] Delete `translation-pipe.pipe.ts` and `translation.service.ts`
- [ ] Verify `ng build` passes and `{{ 'cup' | transloco }}` renders `כוס` in the app

Unresolved tool signals: re-add any pending Verify/Fail/blocker notes under this heading after compact if still open.

## PreCompact signal dump (2026-08-12T07:56:35Z)

Open unchecked items at compact time:
- [ ] Fix `server/services/sync-master.js`: add recipe/dish masterId→userId remap for `type: 'recipe'` ingredient lines (Rule 1 + Rule 2 paths), built incrementally to handle same-pass sibling references
- [ ] Write `server/scripts/legacy-import/repair-subrecipe-refs.js` (dry-run default, `--write=local`) and run it against local Mongo
- [ ] Write `server/scripts/legacy-import/backfill-dish-prep-items.js` (master pass then per-user pass, dry-run default, `--write=local`) and run it against local Mongo
- [ ] Write `server/scripts/legacy-import/backfill-product-nutrition.js` (master pass then per-user pass, dry-run default, `--write=local`) and run it against local Mongo
- [ ] Update `server/scripts/legacy-import/lib/transform.js` so future dish re-imports derive `prep_items_`/`prep_categories_` from sub-recipe ingredient rows
- [ ] Run verification queries (broken-ref count, prep_items_ coverage, nutrition coverage) and spot-check "פיצה" in the running app
- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation → recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set
- [ ] Install `@jsverse/transloco` and configure `provideTransloco` in `src/app/app.config.ts` (standalone — do NOT run `ng add`)
- [ ] Split `public/assets/data/dictionary.json` into 8 scoped files under `public/assets/i18n/he/`
- [ ] Verify Transloco loader path — check network tab for `/assets/i18n/he/units.json` returning 200
- [ ] Replace `| translatePipe` in all templates with `| transloco` (scope-prefixed); add `TranslocoModule`/`TranslocoDirective` to each component's `imports`
- [ ] Replace `this.translation.translate(...)` calls in `.ts` files with `this.transloco.translate('scope.key')`
- [ ] Create `src/app/core/services/vocabulary.service.ts` (~40 lines: `resolve()`, `addEntry()`, localStorage)
- [ ] Update `src/app/core/services/key-resolution.service.ts` to inject `VocabularyService`
- [ ] Update all remaining `TranslationService` injection sites to `VocabularyService`
- [ ] Delete `translation-pipe.pipe.ts` and `translation.service.ts`
- [ ] Verify `ng build` passes and `{{ 'cup' | transloco }}` renders `כוס` in the app
- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation → recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set
- [ ] Install `@jsverse/transloco` and configure `provideTransloco` in `src/app/app.config.ts` (standalone — do NOT run `ng add`)
- [ ] Split `public/assets/data/dictionary.json` into 8 scoped files under `public/assets/i18n/he/`
- [ ] Verify Transloco loader path — check network tab for `/assets/i18n/he/units.json` returning 200
- [ ] Replace `| translatePipe` in all templates with `| transloco` (scope-prefixed); add `TranslocoModule`/`TranslocoDirective` to each component's `imports`
- [ ] Replace `this.translation.translate(...)` calls in `.ts` files with `this.transloco.translate('scope.key')`
- [ ] Create `src/app/core/services/vocabulary.service.ts` (~40 lines: `resolve()`, `addEntry()`, localStorage)
- [ ] Update `src/app/core/services/key-resolution.service.ts` to inject `VocabularyService`
- [ ] Update all remaining `TranslationService` injection sites to `VocabularyService`
- [ ] Delete `translation-pipe.pipe.ts` and `translation.service.ts`
- [ ] Verify `ng build` passes and `{{ 'cup' | transloco }}` renders `כוס` in the app

Unresolved tool signals: re-add any pending Verify/Fail/blocker notes under this heading after compact if still open.

## PreCompact signal dump (2026-08-19T15:04:47Z)

Open unchecked items at compact time:
- [ ] (Milestone 2/3/4 — see plan file; not started, lower priority, scope separately)
- [ ] Deploy; collect ~24h of real-use numbers from Render logs
- [ ] Record observed numbers in `reports/performance-audit-2026-08-13.md` under a new "Observed" section
- [ ] Confirm from M1 logs whether cold starts actually occur during business hours — if not, stop and re-prioritise
- [ ] Human: approve billing change; set `plan: free` → `plan: starter` in `render.yaml:5`
- [ ] Human: verify Atlas cluster region matches Render service region; report findings
- [ ] Human: check whether `MONGO_URI` points at an M0 free cluster; report findings
- [ ] Move `seedMasterData()` to run after `app.listen()` — `server/index.js:125-131`
- [ ] Determine whether both `foodvibe` and `foodvibe-api` Render services exist; document which is canonical
- [ ] Add `maxAge: '1y'`, `immutable: true`, and the `index.html` → `no-cache` `setHeaders` guard — `server/index.js:63`
- [ ] Set `Cache-Control: no-cache` on the SPA fallback `res.sendFile(index.html)` — `server/index.js:103-108`
- [ ] Verify a fresh deploy is still picked up by a returning browser (guards the fallback caching bug)
- [ ] Remove `withPreloading(PreloadAllModules)` and its now-unused import — `src/app/app.config.ts:4,96`
- [ ] Convert `menu-export.service.ts:8` and `recipe-export.service.ts:8` to `await import('exceljs')` at point of use
- [ ] Propagate resulting `async` signature changes through `export.service.ts` and its 3 consumers
- [ ] Manually verify Excel export still produces a valid `.xlsx` from all three consumer pages
- [ ] Re-confirm `food-compos-logo.png` (1.88 MB) is unreferenced; delete if so
- [ ] Convert `recipe_placeholder.png` (1.27 MB) to WebP or inline SVG — update `recipe-header.component.ts:133`
- [ ] Convert both approve-stamp PNGs to WebP — update `approve-stamp.component.ts:20,22`
- [ ] M1 — Map-based lookups: add `productsById_`/`recipesById_` computed Maps; replace the 4 O(n) `.find()` scans in `recipe-cost.service.ts:260,282` and `recipe-allergens.util.ts:22,25`
- [ ] M1 — Record before/after costs + allergens for 10 representative recipes (nested, depth-limited, broken-ref, price-override)
- [ ] M2 — Precomputed row model for recipe-book + inventory; remove the 8 per-row template function calls
- [ ] M2 — Separate commit: convert the remaining 29 components to `ChangeDetectionStrategy.OnPush`
- [ ] M3 — Hoist the rebuilt `allProductNames` Set above the master loop — `server/services/sync-master.js:273-274`
- [ ] M3 — Remove `syncMasterToUser` from `POST /refresh` (or version-gate it) — `server/routes/auth.js:274`
- [ ] M3 — Regression test: brand-new account signup still receives correctly cloned + remapped master data
- [ ] Prerequisite gate — confirm 302 M1/M2 + 303 M1/M2 shipped and re-measured; reduce or drop scope if no longer justified
- [ ] M1 — List projections on `GET /:type` mirroring `SEARCH_PROJECTIONS` — `server/routes/generic.js:45-77,82-86`
- [ ] M1 — Verify edit flows fetch full documents so a lean list doc cannot round-trip through a save and erase fields
- [ ] M2 — Defer `RecipeDataService`/`DishDataService` to `autoLoad: false`; confirm resolver coverage first
- [ ] M2 — Regression test: cold-load a nested-sub-recipe recipe by direct URL; no ingredient unlinking (plan 300 finding 3)
- [ ] M2 — Collapse the post-login double fetch — `user.service.ts:54-93` (same item as plan 301 M4; mark both)
- [ ] M3 — Add `cdk-virtual-scroll` or pagination to inventory + recipe-book lists (after 303 M2)
- [ ] Hand-off — re-assess plan 301 M2's scope against measured results
- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation → recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set

Unresolved tool signals: re-add any pending Verify/Fail/blocker notes under this heading after compact if still open.

## PreCompact signal dump (2026-08-22T04:57:39Z)

Open unchecked items at compact time:
- [ ] (Milestone 2/3/4 — see plan file; not started, lower priority, scope separately)
- [ ] Deploy; collect ~24h of real-use numbers from Render logs
- [ ] Record observed numbers in `reports/performance-audit-2026-08-13.md` under a new "Observed" section
- [ ] Confirm from M1 logs whether cold starts actually occur during business hours — if not, stop and re-prioritise
- [ ] Human: approve billing change; set `plan: free` → `plan: starter` in `render.yaml:5`
- [ ] Human: verify Atlas cluster region matches Render service region; report findings
- [ ] Human: check whether `MONGO_URI` points at an M0 free cluster; report findings
- [ ] Move `seedMasterData()` to run after `app.listen()` — `server/index.js:125-131`
- [ ] Determine whether both `foodvibe` and `foodvibe-api` Render services exist; document which is canonical
- [ ] Add `maxAge: '1y'`, `immutable: true`, and the `index.html` → `no-cache` `setHeaders` guard — `server/index.js:63`
- [ ] Set `Cache-Control: no-cache` on the SPA fallback `res.sendFile(index.html)` — `server/index.js:103-108`
- [ ] Verify a fresh deploy is still picked up by a returning browser (guards the fallback caching bug)
- [ ] Remove `withPreloading(PreloadAllModules)` and its now-unused import — `src/app/app.config.ts:4,96`
- [ ] Convert `menu-export.service.ts:8` and `recipe-export.service.ts:8` to `await import('exceljs')` at point of use
- [ ] Propagate resulting `async` signature changes through `export.service.ts` and its 3 consumers
- [ ] Manually verify Excel export still produces a valid `.xlsx` from all three consumer pages
- [ ] Re-confirm `food-compos-logo.png` (1.88 MB) is unreferenced; delete if so
- [ ] Convert `recipe_placeholder.png` (1.27 MB) to WebP or inline SVG — update `recipe-header.component.ts:133`
- [ ] Convert both approve-stamp PNGs to WebP — update `approve-stamp.component.ts:20,22`
- [ ] M1 — Record before/after costs + allergens for 10 representative recipes (nested, depth-limited, broken-ref, price-override) — spot-verified live instead; formal table still not done
- [ ] M2 — Separate commit: convert the remaining 29 components to `ChangeDetectionStrategy.OnPush`
- [ ] M3 — Hoist the rebuilt `allProductNames` Set above the master loop — `server/services/sync-master.js:273-274` (out of scope: server-only, doesn't affect local-storage mode)
- [ ] M3 — Remove `syncMasterToUser` from `POST /refresh` (or version-gate it) — `server/routes/auth.js:274` (out of scope, same reason)
- [ ] M3 — Regression test: brand-new account signup still receives correctly cloned + remapped master data (out of scope, same reason)
- [ ] Prerequisite gate — confirm 302 M1/M2 + 303 M1/M2 shipped and re-measured; reduce or drop scope if no longer justified
- [ ] M1 — List projections on `GET /:type` mirroring `SEARCH_PROJECTIONS` — `server/routes/generic.js:45-77,82-86`
- [ ] M1 — Verify edit flows fetch full documents so a lean list doc cannot round-trip through a save and erase fields
- [ ] M2 — Defer `RecipeDataService`/`DishDataService` to `autoLoad: false`; confirm resolver coverage first
- [ ] M2 — Regression test: cold-load a nested-sub-recipe recipe by direct URL; no ingredient unlinking (plan 300 finding 3)
- [ ] M2 — Collapse the post-login double fetch — `user.service.ts:54-93` (same item as plan 301 M4; mark both)
- [ ] M3 — Add `cdk-virtual-scroll` or pagination to inventory + recipe-book lists (after 303 M2)
- [ ] Hand-off — re-assess plan 301 M2's scope against measured results
- [ ] M0 Tasks 1-4 — screenshot every screen live + design side by side (1280px + 390px), write `_claude-data/design-migration/visual-diff.md`, revise milestone order from the actual findings
- [ ] M1 Tasks 5-6 — shared `.c-*` engine class updates in `src/styles.scss`, only for gaps M0 confirms are real
- [ ] M2 Tasks 7-8 — shell/nav remainder (nav-pill gradient, avatar chip)
- [ ] M3 Tasks 9-11 — list-shell chassis pass (Inventory, Recipe Book, Suppliers, Equipment, Menu Library, Venues, Trash share this)
- [ ] M4 Task 12 — style the Venues new-data fields (address/capacity/contact/hours) added in plan 305
- [ ] M5 Task 13 — Dashboard
- [ ] M6 Task 14 — Venue Detail — **scoping question for the human first**: the design has this screen, the app doesn't; confirm whether building it is in scope before starting
- [ ] M7 Task 15 — Cook View

Unresolved tool signals: re-add any pending Verify/Fail/blocker notes under this heading after compact if still open.

### Unresolved signals detected at compact time

{"parentUuid":"69dd47f1-ac7c-47bd-b4e3-dceef8b1f214","isSidechain":false,"promptId":"285123da-b575-4e2f-b0ef-139d2983ab23","type":"user","message":{"role":"user","content":[{"type":"text","text":"Base directory for this skill: C:\\coding projects\\Cursor\\foodVibe1.0\\.claude\\skills\\preflight\n\n#
{"parentUuid":"711fedf7-7e57-4648-88ff-5018ee4f147d","isSidechain":false,"promptId":"285123da-b575-4e2f-b0ef-139d2983ab23","type":"user","message":{"role":"user","content":[{"type":"text","text":"Base directory for this skill: C:\\Users\\danwe\\.claude\\skills\\browse\n\n<!-- AUTO-GENERATED from SKI

## PreCompact signal dump (2026-08-22T14:27:20Z)

Open unchecked items at compact time:
- [ ] (Milestone 2/3/4 — see plan file; not started, lower priority, scope separately)
- [ ] Deploy; collect ~24h of real-use numbers from Render logs
- [ ] Record observed numbers in `reports/performance-audit-2026-08-13.md` under a new "Observed" section
- [ ] Confirm from M1 logs whether cold starts actually occur during business hours — if not, stop and re-prioritise
- [ ] Human: approve billing change; set `plan: free` → `plan: starter` in `render.yaml:5`
- [ ] Human: verify Atlas cluster region matches Render service region; report findings
- [ ] Human: check whether `MONGO_URI` points at an M0 free cluster; report findings
- [ ] Move `seedMasterData()` to run after `app.listen()` — `server/index.js:125-131`
- [ ] Determine whether both `foodvibe` and `foodvibe-api` Render services exist; document which is canonical
- [ ] Add `maxAge: '1y'`, `immutable: true`, and the `index.html` → `no-cache` `setHeaders` guard — `server/index.js:63`
- [ ] Set `Cache-Control: no-cache` on the SPA fallback `res.sendFile(index.html)` — `server/index.js:103-108`
- [ ] Verify a fresh deploy is still picked up by a returning browser (guards the fallback caching bug)
- [ ] Remove `withPreloading(PreloadAllModules)` and its now-unused import — `src/app/app.config.ts:4,96`
- [ ] Convert `menu-export.service.ts:8` and `recipe-export.service.ts:8` to `await import('exceljs')` at point of use
- [ ] Propagate resulting `async` signature changes through `export.service.ts` and its 3 consumers
- [ ] Manually verify Excel export still produces a valid `.xlsx` from all three consumer pages
- [ ] Re-confirm `food-compos-logo.png` (1.88 MB) is unreferenced; delete if so
- [ ] Convert `recipe_placeholder.png` (1.27 MB) to WebP or inline SVG — update `recipe-header.component.ts:133`
- [ ] Convert both approve-stamp PNGs to WebP — update `approve-stamp.component.ts:20,22`
- [ ] M1 — Record before/after costs + allergens for 10 representative recipes (nested, depth-limited, broken-ref, price-override) — spot-verified live instead; formal table still not done
- [ ] M2 — Separate commit: convert the remaining 29 components to `ChangeDetectionStrategy.OnPush`
- [ ] M3 — Hoist the rebuilt `allProductNames` Set above the master loop — `server/services/sync-master.js:273-274` (out of scope: server-only, doesn't affect local-storage mode)
- [ ] M3 — Remove `syncMasterToUser` from `POST /refresh` (or version-gate it) — `server/routes/auth.js:274` (out of scope, same reason)
- [ ] M3 — Regression test: brand-new account signup still receives correctly cloned + remapped master data (out of scope, same reason)
- [ ] Prerequisite gate — confirm 302 M1/M2 + 303 M1/M2 shipped and re-measured; reduce or drop scope if no longer justified
- [ ] M1 — List projections on `GET /:type` mirroring `SEARCH_PROJECTIONS` — `server/routes/generic.js:45-77,82-86`
- [ ] M1 — Verify edit flows fetch full documents so a lean list doc cannot round-trip through a save and erase fields
- [ ] M2 — Defer `RecipeDataService`/`DishDataService` to `autoLoad: false`; confirm resolver coverage first
- [ ] M2 — Regression test: cold-load a nested-sub-recipe recipe by direct URL; no ingredient unlinking (plan 300 finding 3)
- [ ] M2 — Collapse the post-login double fetch — `user.service.ts:54-93` (same item as plan 301 M4; mark both)
- [ ] M3 — Add `cdk-virtual-scroll` or pagination to inventory + recipe-book lists (after 303 M2)
- [ ] Hand-off — re-assess plan 301 M2's scope against measured results
- [ ] M0 Tasks 1-4 — screenshot every screen live + design side by side (1280px + 390px), write `_claude-data/design-migration/visual-diff.md`, revise milestone order from the actual findings
- [ ] M1 Tasks 5-6 — shared `.c-*` engine class updates in `src/styles.scss`, only for gaps M0 confirms are real
- [ ] M2 Tasks 7-8 — shell/nav remainder (nav-pill gradient, avatar chip)
- [ ] M3 Tasks 9-11 — list-shell chassis pass (Inventory, Recipe Book, Suppliers, Equipment, Menu Library, Venues, Trash share this)
- [ ] M4 Task 12 — style the Venues new-data fields (address/capacity/contact/hours) added in plan 305
- [ ] M5 Task 13 — Dashboard
- [ ] M6 Task 14 — Venue Detail — **scoping question for the human first**: the design has this screen, the app doesn't; confirm whether building it is in scope before starting
- [ ] M7 Task 15 — Cook View

Unresolved tool signals: re-add any pending Verify/Fail/blocker notes under this heading after compact if still open.

### Unresolved signals detected at compact time

{"parentUuid":"69dd47f1-ac7c-47bd-b4e3-dceef8b1f214","isSidechain":false,"promptId":"285123da-b575-4e2f-b0ef-139d2983ab23","type":"user","message":{"role":"user","content":[{"type":"text","text":"Base directory for this skill: C:\\coding projects\\Cursor\\foodVibe1.0\\.claude\\skills\\preflight\n\n#
{"parentUuid":"711fedf7-7e57-4648-88ff-5018ee4f147d","isSidechain":false,"promptId":"285123da-b575-4e2f-b0ef-139d2983ab23","type":"user","message":{"role":"user","content":[{"type":"text","text":"Base directory for this skill: C:\\Users\\danwe\\.claude\\skills\\browse\n\n<!-- AUTO-GENERATED from SKI
{"parentUuid":"8e51c6da-3b13-4fc5-a292-d0a22737ed67","isSidechain":false,"attachment":{"type":"invoked_skills","skills":[{"name":"angularComponentStructure","path":"projectSettings:angularComponentStructure","content":"Base directory for this skill: C:\\coding projects\\Cursor\\foodVibe1.0\\.claude\
