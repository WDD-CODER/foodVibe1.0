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

### Plan 303 — Perf Phase 2: Client CPU & Interaction Lag (`plans/303-perf-phase2-client-cpu.plan.md`)

> Gated on plan 302 M1 only. M1 below is the highest value-per-line change in the audit. Full sub-tasks in the plan file.

- [ ] M1 — Map-based lookups: add `productsById_`/`recipesById_` computed Maps; replace the 4 O(n) `.find()` scans in `recipe-cost.service.ts:260,282` and `recipe-allergens.util.ts:22,25`
- [ ] M1 — Record before/after costs + allergens for 10 representative recipes (nested, depth-limited, broken-ref, price-override)
- [ ] M2 — Precomputed row model for recipe-book + inventory; remove the 8 per-row template function calls
- [ ] M2 — Separate commit: convert the remaining 29 components to `ChangeDetectionStrategy.OnPush`
- [ ] M3 — Hoist the rebuilt `allProductNames` Set above the master loop — `server/services/sync-master.js:273-274`
- [ ] M3 — Remove `syncMasterToUser` from `POST /refresh` (or version-gate it) — `server/routes/auth.js:274`
- [ ] M3 — Regression test: brand-new account signup still receives correctly cloned + remapped master data

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

### Plan 305 — Design Migration: UI refactor port (`plans/305-design-migration-ui-refactor-port.plan.md`)

> Source of truth is `UI refactor/` (untracked), **not** the stale claude.ai cloud project. Governing rule: the design is a skin — never lose a function. The 46 restorations live in `_claude-data/design-migration/ACTION-LIST.md`; M3+ are blocked on the 5 open decisions at the foot of that file.

- [x] M1 Task 1 — type scale `--fs-xs`…`--fs-3xl` in `src/styles.scss` `:root`
- [x] M1 Task 2 — weight tokens `--fw-regular`…`--fw-extrabold`
- [x] M1 Task 3 — line-height `--lh-*` + tracking `--tracking-*`
- [x] M1 Task 4 — 8-pt spacing scale `--space-0`…`--space-12`
- [x] M1 Task 5 — `--dur-fast/base/slow` + `--tap: 44px`
- [x] M1 Task 6 — add `--font-display`; drop Space Grotesk from `--font-mono`
- [x] M1 Task 7 — trim Google Fonts `@import` to Heebo only (supersedes plan 273's Rubik migration)
- [x] M1 Task 8 — superseded, no code written: `.ambient-bg` is unused by all 13 design screens; app's existing `body::before` is the same gradients at higher opacity, already unconditional
- [x] M1 Task 9 — `ng build` 0 errors; verified all 8 token groups + zero Rubik/Space-Grotesk in output CSS
- [x] M2 Task 10 — port `.m-*` mobile utilities from `UI refactor/mobile-pass.css` (dropped `overflow-x:hidden` — breaks existing sticky headers; dropped `::after` checkmark — app uses SVG background)
- [x] M2 Task 11 — ≤767px iOS focus-zoom guard + compact checkbox/radio, token-based sizing
- [x] M2 Task 12 — 768 vs 767 collision **recorded, not resolved** — no tablet tier exists yet to fall back to; deferred to M3 shell. Added `$break-xs-max`/`$break-phone-max`/`$break-tablet-max` as a parallel tier, existing breakpoints untouched
- [x] M2 Task 13 — `ng build` 0 errors; all 7 `.m-*` classes confirmed in output CSS. Live-viewport pass deferred to M3 (nothing consumes these classes yet)
- [x] Decisions 1-5 resolved 2026-08-19 (Human answers 2, 3, 5; my flagged defaults 1, 4) — see plan 305 "Decisions" table and `ACTION-LIST.md`. No milestone blocked on a decision anymore.
- [x] M3 Task 14a — 4 tabs: already existed in `HeaderComponent`, no rebuild needed
- [x] M3 Task 14b — chip row: new `TabChipsComponent`, built + verified via gstack browse (renders, navigates, no console errors)
- [x] M3 Task 14c — mobile collision fix: chip row now clears the header's fixed floating avatar at ≤620px
- [x] M3 Task 14d — hero FAB tray items now show labels (matches design's icon+text pill), verified via DOM
- [x] M3 Task 14e — brand mark added (copied single SVG, not the design bundle), wash background already covered by M1 Task 8; verified image loads
- [ ] M3 Task 14f — decide: Dashboard's embedded sub-nav vs the new chip row (overlapping destinations, different mechanisms) — flagged, not resolved
- [x] M3 Task 15 rescoped — 5 of 6 ACTION-LIST A items already exist/wired in the live app (auth, guard, 3-button confirm, toast undo, URL filter state); only Hebrew re-key is real ongoing work, done for the chip row so far
- [x] M4 Task 16/17 rescoped — bulk edit, deleting loader, empty-state, auth gating already existed on Inventory/Suppliers/Equipment; nothing built. Recipe Book not yet audited
- [x] M4 Task 17a — row edit panel desktop-only DONE for Equipment+Suppliers (Inventory/Recipe Book use full-page nav, decision 2 N/A there). Fixed a real containing-block bug (modal pinned to `.table-area` instead of viewport) + a real dirty-check asymmetry between the two screens. Verified via gstack at 1280px + 390px
- [ ] M4 Task 17b — new data: Inventory supplier+low-stock flag — not started
- [x] M4 Task 17c — new data: Equipment scaling rule — already built, found live in the edit panel, no new code needed
- [ ] M5 Tasks 18-20 — Recipe Builder + ACTION-LIST C (19); unit selector first
- [ ] M5 Task 20a — new data: Recipe Builder secondary yields
- [ ] M5 Task 20b — confirm dual-timer restoration also satisfies labor/cook-time new-data item (no duplicate build)
- [ ] M6 Tasks 21-22 — product form (full page, decision 1) + Metadata Manager (+user mgmt/backup tiles, decision 4) + ACTION-LIST D (3), E (6)
- [ ] M6 Task 22a — new data: Metadata Manager label colours + unit locked flag
- [ ] M7 Task 23 — Menu Intelligence: mobile logic only, screen untouched + ACTION-LIST F (2)
- [ ] M7 Task 23a — new data: Menu Intelligence sell price/profit-per-portion (new work on the OLD screen)
- [ ] M8 Task 24 — Trash / Venues / Suppliers restorations + ACTION-LIST G (3)
- [ ] M8 Tasks 24a-24b — new data: Venues address/capacity/contact/hours, Trash history (confirm UI is design-complete first)

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
