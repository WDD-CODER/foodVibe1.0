# Active Tasks

> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-2026-07-21.md`](reports/todo-ledger-relevance-audit-2026-07-21.md).
> Checkboxes are **unchanged** — decide per group: execute / mark done / prune / keep.
> **2026-09-16 (overnight):** `/auto-solve` running unattended in worktree `../foodVibe1.0-wt-auto-solve` on branch `feat/auto-solve-overnight`, self-approving each plan (no Human present). See that branch's `OVERNIGHT-REPORT.md` for what landed — nothing pushed/merged without Human review.

---

## 1. EXECUTE — real unfinished work

> Audit says: do these.

- [ ] `feat/optimization` — PR #192, merged to `main`. Delivered: double-fetch fix (plan 301 M4), full OnPush sweep (plan 303 M2), animations-async bundle cut, approve-stamp WebP (plan 302 M5), sync-master O(n²) fix (plan 303 M3 first item) — all Human-validated 2026-08-31. Remaining backlog (KITCHEN_UNITS double-fetch mystery, syncMasterToUser version-gating, plan 304's Human-only unblockers) persisted as `plans/309-optimization-loop-closeout-remaining-backlog.plan.md`.

### Plans 316-317 — Full SQL→Mongo migration completion (`plans/316-…`, `plans/317-…`)

> Executed 2026-09-27 on BOTH local and Atlas; awaiting Human validation.

- [x] `plans/317-sql-to-mongo-migration-spec.md` — field-by-field spec for all 26 source tables; the independent authority the transform can no longer be its own check against
- [x] `audit-against-spec.js` (new) — derives expectations from the spec, never from `buildImport()`; zero findings on Atlas, 3 real user edits on local
- [x] `cost-cross-check.js` (new) — §7a outside signal; 854 recipes, no clustering at any power of ten, rules out systemic unit error
- [x] `db-backup.js`, `reset-user-from-master.js` (new) — JSON snapshots (no mongodump on this box) + clone reset/orphan sweep
- [x] Atlas rollout complete — orphan sweep 7,752, quantities 10,732+1,532, prep-items 911, yields 2,093, nutrition 33, phones 25, config
- [x] Local: orphan sweep 2,855; dev-guest reset and re-cloned from corrected master
- [x] New scope delivered: `cholesterol_mg` on the product model + import; `MASTER_META/legacy-config` (laborCost 30, vatPercent 16)
- [x] Category images dropped — the 38 legacy categories are unregistered bare strings, nothing to attach an image to
- [x] `push-to-master`: resets the caller's `_userModified` (else you publish to everyone and freeze yourself out) + type allowlist
- [x] cook-view `saveEdits` now shows the same save-for-me / save-for-everyone prompt as recipe-builder
- [x] `ng build` passes

### Plan 315 — Multi-measure yields + `neto_confirmed_` (`plans/315-yield-multi-measure-conversions.plan.md`)

> Implemented and applied to local Mongo 2026-09-26; awaiting Human validation.

- [x] `lib/transform.js` — yield derived from all source measures (`dbTotalGram→gram`, `dbTotalLiter→ml`, `dbTotalUnit→unit`, `noOfDishes→dish`); `measureUnit` no longer consulted (it is `2` on all 2,093 rows); `yield_conversions_[0]` is now the primary, per the recipe-builder's own contract
- [x] `lib/transform.js` — sets `neto_confirmed_: true` on a recovered yield, stopping the header effect overwriting the net yield with the gross ingredient sum
- [x] `repair-recipe-yields.js` (new) — master + per-user passes, skips `_userModified: true`
- [x] Applied: master 2,092 docs, per-user 4,183; 1,905 gained a selectable unit; 960 unit relabels; 423 dishes moved from a gram figure to their portion count
- [x] Verified: 0 yield mismatches on `__master__`/`yYYGl`; recipeNo 1620 shows `םרג 850` + `הנמ 1`; parent line holds at ₪10.59; `ng build` passes
- [x] Atlas/production NOT touched — local only

### Plan 314 — Dish mise-en-place from the legacy checklist (`plans/314-dish-mise-en-place-checklist-import-fix.plan.md`)

> Supersedes plan 300 Finding 5. Implemented and applied to local Mongo 2026-09-26; awaiting Human validation.

- [x] `lib/transform.js` — dish `prep_items_`/`prep_categories_` derived from `tblInstructions` (split on newlines, `quantity: 0`, `unit: 'gram'`, empty category) instead of copied ingredient lines; retracted plan-300 comment replaced
- [x] `repair-dish-prep-items.js` — `_userModified: { $ne: true }` guard on the per-user pass + corrected docstring
- [x] `backfill-dish-prep-items.js` — marked superseded, do not re-run
- [x] Applied `repair-dish-prep-items.js --write=local`: master 849 + per-user 1,697 dishes; 5,754 → 3,952 prep rows, 137 dishes intentionally empty
- [x] Verified: `verify-against-source.js` clean on prep fields for `__master__`/`dev-guest`/`yYYGl`; recipeNo 1317 spot-checked in the browser; `ng build` passes
- [x] Atlas/production has NOT been touched — local only

### Plan 301 — Server-side search & lean data loading (`plans/301-server-side-search-lean-data-loading.plan.md`)

> Milestone 1 done, merged to `main` (PR #177), Human-validated 2026-08-13. Milestones 2-4 still not started.

- [x] Confirm exact lean field list the ingredient-search dropdown needs (read `ingredient-search.component.html` template) before designing the `/search` response shape
- [x] Add `{ userId: 1, name_hebrew: 1 }` index (or equivalent) to `server/db.js` for `PRODUCT_LIST`/`RECIPE_LIST`/`DISH_LIST`
- [x] Add `GET /api/v1/data/:type/search?q=&limit=` to `server/routes/generic.js` — prefix match on `name_hebrew`, lean projection, restricted to an allowlist of searchable entity types
- [x] Add `search<T>()` to `HttpStorageAdapter`/`StorageService` mirroring the existing `query()`/`queryFiltered()` shape
- [x] Refactor `ingredient-search.component.ts` to debounce + call the new search endpoint instead of filtering `KitchenStateService.products_()`/`recipes_()` in full
- [x] Refactor `recipe-book-list.component.ts`'s `filteredProductsForIngredientSearch_` the same way
- [x] Verify: build, curl the new endpoint, live typeahead behavior, no regression on inventory/recipe-book, no keystroke-spam requests
- [x] Milestone 3 — dashboard count endpoint (`GET /:type/count?filter=lowStock|unapproved`) added to `server/routes/generic.js`; `ng build` + live curl verified against real `dev-guest` data. Dashboard component intentionally not rewired — per plan note, only becomes a real win once Milestone 2 lands.
- [ ] Milestone 2 — carved out to Plan 310 (below) — see `plans/310-faceted-search-pagination-inventory-recipe-book.plan.md`
- [x] Milestone 4 — collapse `UserService._reloadDataServices()`'s post-login re-fetch with each service's constructor-time load: done in `feat/optimization` — `reloadFromStorage()` now awaits an in-flight load instead of racing a duplicate one (`base-entity-data.service.ts`, `product-data.service.ts`, `recipe-data.service.ts`, `dish-data.service.ts`, `menu-event-data.service.ts`, `menu-section-categories.service.ts`, `preparation-registry.service.ts`, `metadata-registry.service.ts`). Verified via network capture: PRODUCT_LIST/RECIPE_LIST/DISH_LIST/etc. each fetch exactly once per page load, down from twice (~5MB/page deduped). Human-validated 2026-08-31.

### Plan 303 — Perf Phase 2: Client CPU & Interaction Lag (`plans/303-perf-phase2-client-cpu.plan.md`)

> Gated on plan 302 M1 only. M1 below is the highest value-per-line change in the audit. Full sub-tasks in the plan file.
> M0/M1/M2 executed 2026-08-22 in response to a live user report ("app is stuck, even in local storage mode") — `ng build` passes, spot-verified live via `/browse` against the real 2113-recipe/1478-product dataset.

- [x] M0 (addendum) — Defer the `backup_<entityType>` localStorage mirror write off the critical path — `async-storage.service.ts:172-196`
- [x] M1 — Map-based lookups: add `productsById_`/`recipesById_` computed Maps; replace all 7 O(n) `.find()` scans in `recipe-cost.service.ts` and `recipe-allergens.util.ts:22,25`
- [x] M1 — Record before/after costs + allergens for 10 representative recipes — closed as satisfied-via-spot-verification (2026-09-15): M1's Map-based lookups already shipped and were spot-verified live against the real dataset; a retroactive formal before/after table adds no further confidence and isn't worth the effort now that M1/M2 are both done and Human-validated.
- [ ] M1 — DevTools Performance profile on recipe-book before/after; record in the audit report — genuinely not done, needs a human with DevTools open (not scriptable via `/browse`)
- [x] M2 — Precomputed row model for recipe-book + inventory; row loops now read `displayRows_()` instead of calling functions per row
- [x] M2 — Separate commit: convert the remaining 29 components to `ChangeDetectionStrategy.OnPush` — done in `feat/optimization`, 28 components across 8 commits, each individually traced for signal-safety (not batch-applied); `grep -rL "ChangeDetectionStrategy.OnPush" src/app --include="*.component.ts"` returns empty. Human-validated 2026-08-31.
- [x] M3 — Hoist the rebuilt `allProductNames` Set above the master loop — `server/services/sync-master.js:273-274` — done in `feat/optimization`: was rebuilt once per master PRODUCT_LIST doc needing an insert check (up to ~1500x per sync run); now built once. Applies to the app's normal backend-connected mode (the "out of scope" note above was specific to a local-storage-mode bug report, not to whether this helps overall — it does, this runs on every signup and every 13-min token refresh). Static verification only (no live timing — shared backend's Mongo needs credentials this session doesn't have). Human-validated 2026-08-31.
- [x] M3 — Remove `syncMasterToUser` from `POST /refresh` (or version-gate it) — `server/routes/auth.js:274` — satisfied by `plans/309-optimization-loop-closeout-remaining-backlog.plan.md` Milestone 2 (already `[x]` there): version-gated via `MASTER_META`/`master-version.js` + `User.lastSyncedMasterVersion`. Re-verified 2026-09-16 (overnight auto-solve session) — `server/routes/auth.js:285` skips `syncMasterToUser` when `user.lastSyncedMasterVersion === masterVersion`, `server/services/master-version.js` exists. No new code change needed.
- [x] M3 — Regression test: brand-new account signup still receives correctly cloned + remapped master data — satisfied by `plans/309-…` Milestone 2 (already `[x]` there: "New-signup clone regression test passed (1478 products/1114 recipes cloned)"). Re-confirmed 2026-09-16 that the code backing this claim is present in `server/routes/auth.js`.
- [ ] M3 — Regression test: existing user's modified docs still win after login (Rule 3) — not verified this session; the version-gate only touches `POST /refresh`, `/login` is an unchanged code path, so risk is low but untested

### Plan 304 — Perf Phase 3: Data Volume (`plans/304-perf-phase3-data-volume.plan.md`)

> HARD GATE: do not start until 302 and 303 have shipped **and** been re-measured — they may reduce or eliminate this scope. Faceted search stays out of scope (that is plan 301 M2). Full sub-tasks in the plan file.

- [ ] Prerequisite gate — confirm 302 M1/M2 + 303 M1/M2 shipped and re-measured; reduce or drop scope if no longer justified — **bypassed 2026-09-15 for M2/M3 only**: live user report ("really really slow, locally even more") is itself real-world evidence the formal deploy-and-measure step was meant to provide; M1 (below) was explicitly NOT started, since it still needs the gate
- [ ] M1 — List projections on `GET /:type` mirroring `SEARCH_PROJECTIONS` — `server/routes/generic.js:45-77,82-86`
- [ ] M1 — Verify edit flows fetch full documents so a lean list doc cannot round-trip through a save and erase fields
- [x] M2 — Defer `RecipeDataService`/`DishDataService` to `autoLoad: false`; confirm resolver coverage first — done 2026-09-15: audited every `recipes_()`/`dishes_()` consumer, gated `menu-library`/`menu-intelligence` routes with `kitchenDataEnsureLoadedResolver`, migrated dashboard's recipe/dish counts to the `/count` endpoint, added defensive `ensureLoaded()` to metadata-manager screens. Also found and fixed a second bootstrap trigger in `user.service.ts`'s `_reloadDataServices()` that would have silently undone the deferral (missing `hasLoaded()` guard — see [[defer-singleton-data-ensureLoaded]]). Verified via network trace: cold `/dashboard` no longer fetches RECIPE_LIST/DISH_LIST (~4.3MB saved).
- [x] M2 — Regression test: cold-load a nested-sub-recipe recipe by direct URL; no ingredient unlinking (plan 300 finding 3) — verified 2026-09-15 via fresh-tab direct URL load of a real user recipe; ingredients rendered with real names, nothing unlinked.
- [x] M2 — Collapse the post-login double fetch — `user.service.ts:54-93` (same item as plan 301 M4; done there, see above — Human-validated 2026-08-31)
- [x] M3 — Add `cdk-virtual-scroll` or pagination to inventory + recipe-book lists (after 303 M2) — delivered as **pagination**, not `cdk-virtual-scroll`, 2026-09-15: the shared `.c-list-row { display: contents }` engine class (used by every list page) is structurally incompatible with CDK's item-wrapper DOM — see new gotcha in `docs/brain/gotchas/angular.md`. Pagination (50/page) gets the same DOM-size win with zero shared-CSS risk. Verified: rendered rows dropped ~2,113 → 50, selection state survives page navigation, search resets to page 1.
- [ ] Hand-off — re-assess plan 301 M2's scope against measured results

### Plan 310 — Faceted Server-Side Search & Pagination for Inventory + Recipe Book (`plans/310-faceted-search-pagination-inventory-recipe-book.plan.md`)

> **ABANDONED 2026-09-27.** Fully implemented (all 6 milestones) and verified against a local copy of the data, but never tested against the real Atlas database before going live — that test found it made the app badly worse (near-1-minute recipe-book loads from an expensive `$graphLookup` allergens resolution re-run on every page view against free-tier Atlas; non-cancellable debounced fetches queuing up and landing out of order under real latency; a genuine pagination-reset bug in inventory). Human had it fully reverted rather than patched — dropped, not worth fixing. Full postmortem and the specific technical causes are in `plans/310-…plan.md`'s "STATUS: ABANDONED" section at the top — read that before ever reconsidering this plan.

- [ ] Prerequisite gate — confirm plan 304 M1/M2/M3 shipped + measured; re-scope if 304 M3 already solves pagination
- [ ] Milestone 0 — Decisions (Human): facet-count strategy, allergens resolution strategy (denormalize / `$graphLookup` / punt), ingredient-containment index, pagination ownership vs plan 304 M3, search UX (prefix vs substring), favorites storage shape
- [ ] Milestone 1 — Low-risk facets + pagination skeleton (Category/Supplier/product-Allergens/low-stock/invalid/incomplete/nutrition for inventory; Type/Approved/Station/Labels/date-range for recipe-book)
- [ ] Milestone 2 — Allergens facet for recipe-book (recursive nested-recipe resolution — highest-risk piece, per Decision 2)
- [ ] Milestone 3 — Ingredient-containment filter for recipe-book
- [ ] Milestone 4 — Client rewire (`inventory-product-list.component.ts`, `recipe-book-list.component.ts`) + pagination UI wiring
- [ ] Milestone 5 — Cross-screen verification (facet parity, RTL, selection/bulk-edit/inline-edit regressions, `ng build`)

### Plan 306 — Visual Restyling: UI Refactor Design Language (`plans/306-visual-restyling-ui-refactor-design-language.plan.md`)

> **RECONCILED 2026-08-26 — superseded for all screen-scoped milestones by `/design-port`**
> (`.claude/commands/design-port.md`), which has already shipped Dashboard, Inventory, and Recipe
> Book (PR #187) against the same design generation. Screen-by-screen work now runs there —
> `_claude-data/design-migration/screens/_registry.md` is the live tracker. Full rationale in
> `plans/306-visual-restyling-ui-refactor-design-language.plan.md`'s supersession note. Only M9
> (Product form) and M12 (final cross-screen QA, deferred until all `/design-port` screens are
> `done`) remain open from this plan.

- [ ] ~~M0 Tasks 1-4 — screenshot diff catalog~~ — **superseded**; each `/design-port` session's Inventory 3 does this per-screen instead
- [ ] ~~M1 Tasks 5-6 — shared `.c-*` engine class updates~~ — **superseded**; folded into each `/design-port` session's Inventory 3
- [ ] ~~M2 Tasks 7-8 — shell/nav remainder~~ — **superseded** by `/design-port`
- [ ] ~~M3 Tasks 9-11 — list-shell chassis pass (Inventory, Recipe Book, Suppliers, Equipment, Menu Library, Venues, Trash)~~ — **superseded**; each screen ported individually via `/design-port`
- [ ] ~~M4 Task 12 — Venues new-data field styling~~ — **superseded**; done via `/design-port` (`06-venues.port-spec.md`, Human-validated there)
- [ ] ~~M5 Task 13 — Dashboard~~ — **superseded**; done via `/design-port` (`01-dashboard.port-spec.md`, Human-validated there)
- [ ] ~~M6 Task 14 — Venue Detail~~ — **superseded**; done via `/design-port` (`06-venues.port-spec.md`, Human-validated there)
- [ ] ~~M7 Task 15 — Cook View~~ — **superseded** by `/design-port`
- [ ] ~~M8 Task 16 — Metadata Manager~~ — **superseded** by `/design-port`
- [x] M9 Task 17 — Product form — composed `.c-input` engine class on all plain inputs instead of duplicating its styles locally in `product-form.component.scss`; `ng build` clean, visual QA via gstack browse confirmed no regression. Human-validated 2026-09-16.
- [ ] ~~M10 Tasks 18-19 — Menu Intelligence visual pass~~ — **superseded** by `/design-port`
- [ ] ~~M11 Tasks 20-21 — Recipe Builder~~ — **superseded** by `/design-port`
- [ ] M12 Tasks 22-25 — cross-screen QA: all 13 screens, 3 breakpoints, RTL, dark-mode-scope check, `ng build` clean (deferred — revisit once `/design-port` registry shows all screens `done`)

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

## PreCompact signal dump (2026-09-26T15:05:15Z)

Open unchecked items at compact time:
- [ ] `feat/optimization` — PR #192, merged to `main`. Delivered: double-fetch fix (plan 301 M4), full OnPush sweep (plan 303 M2), animations-async bundle cut, approve-stamp WebP (plan 302 M5), sync-master O(n²) fix (plan 303 M3 first item) — all Human-validated 2026-08-31. Remaining backlog (KITCHEN_UNITS double-fetch mystery, syncMasterToUser version-gating, plan 304's Human-only unblockers) persisted as `plans/309-optimization-loop-closeout-remaining-backlog.plan.md`.
- [ ] Milestone 2 — carved out to Plan 310 (below) — see `plans/310-faceted-search-pagination-inventory-recipe-book.plan.md`
- [ ] Deploy; collect ~24h of real-use numbers from Render logs
- [ ] Record observed numbers in `reports/performance-audit-2026-08-13.md` under a new "Observed" section
- [ ] Confirm from M1 logs whether cold starts actually occur during business hours — if not, stop and re-prioritise
- [ ] Human: approve billing change; set `plan: free` → `plan: starter` in `render.yaml:5`
- [ ] Human: verify Atlas cluster region matches Render service region; report findings
- [ ] Human: check whether `MONGO_URI` points at an M0 free cluster; report findings
- [ ] Determine whether both `foodvibe` and `foodvibe-api` Render services exist; document which is canonical
- [ ] Verify a fresh deploy is still picked up by a returning browser (guards the fallback caching bug)
- [ ] Prerequisite gate — confirm 302 M1/M2 + 303 M1/M2 shipped and re-measured; reduce or drop scope if no longer justified — **bypassed 2026-09-15 for M2/M3 only**: live user report ("really really slow, locally even more") is itself real-world evidence the formal deploy-and-measure step was meant to provide; M1 (below) was explicitly NOT started, since it still needs the gate
- [ ] M1 — List projections on `GET /:type` mirroring `SEARCH_PROJECTIONS` — `server/routes/generic.js:45-77,82-86`
- [ ] M1 — Verify edit flows fetch full documents so a lean list doc cannot round-trip through a save and erase fields
- [ ] Hand-off — re-assess plan 301 M2's scope against measured results
- [ ] M3 — Human unblockers for plan 304's Prerequisite Gate (billing tier, Atlas region check, Mongo tier check, canonical Render service, deploy + collect logs)
- [ ] Prerequisite gate — confirm plan 304 M1/M2/M3 shipped + measured; re-scope if 304 M3 already solves pagination
- [ ] Milestone 0 — Decisions (Human): facet-count strategy, allergens resolution strategy (denormalize / `$graphLookup` / punt), ingredient-containment index, pagination ownership vs plan 304 M3, search UX (prefix vs substring), favorites storage shape
- [ ] Milestone 1 — Low-risk facets + pagination skeleton (Category/Supplier/product-Allergens/low-stock/invalid/incomplete/nutrition for inventory; Type/Approved/Station/Labels/date-range for recipe-book)
- [ ] Milestone 2 — Allergens facet for recipe-book (recursive nested-recipe resolution — highest-risk piece, per Decision 2)
- [ ] Milestone 3 — Ingredient-containment filter for recipe-book
- [ ] Milestone 4 — Client rewire (`inventory-product-list.component.ts`, `recipe-book-list.component.ts`) + pagination UI wiring
- [ ] Milestone 5 — Cross-screen verification (facet parity, RTL, selection/bulk-edit/inline-edit regressions, `ng build`)
- [ ] ~~M0 Tasks 1-4 — screenshot diff catalog~~ — **superseded**; each `/design-port` session's Inventory 3 does this per-screen instead
- [ ] ~~M1 Tasks 5-6 — shared `.c-*` engine class updates~~ — **superseded**; folded into each `/design-port` session's Inventory 3
- [ ] ~~M2 Tasks 7-8 — shell/nav remainder~~ — **superseded** by `/design-port`
- [ ] ~~M3 Tasks 9-11 — list-shell chassis pass (Inventory, Recipe Book, Suppliers, Equipment, Menu Library, Venues, Trash)~~ — **superseded**; each screen ported individually via `/design-port`
- [ ] ~~M4 Task 12 — Venues new-data field styling~~ — **superseded**; done via `/design-port` (`06-venues.port-spec.md`, Human-validated there)
- [ ] ~~M5 Task 13 — Dashboard~~ — **superseded**; done via `/design-port` (`01-dashboard.port-spec.md`, Human-validated there)
- [ ] ~~M6 Task 14 — Venue Detail~~ — **superseded**; done via `/design-port` (`06-venues.port-spec.md`, Human-validated there)
- [ ] ~~M7 Task 15 — Cook View~~ — **superseded** by `/design-port`
- [ ] ~~M8 Task 16 — Metadata Manager~~ — **superseded** by `/design-port`
- [ ] ~~M10 Tasks 18-19 — Menu Intelligence visual pass~~ — **superseded** by `/design-port`
- [ ] ~~M11 Tasks 20-21 — Recipe Builder~~ — **superseded** by `/design-port`
- [ ] M12 Tasks 22-25 — cross-screen QA: all 13 screens, 3 breakpoints, RTL, dark-mode-scope check, `ng build` clean (deferred — revisit once `/design-port` registry shows all screens `done`)
- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation → recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set

Unresolved tool signals: re-add any pending Verify/Fail/blocker notes under this heading after compact if still open.

### Unresolved signals detected at compact time

{"parentUuid":"10494c06-a6ee-4a01-b6bd-9293cce2d3c5","isSidechain":false,"attachment":{"type":"prompt_snapshot","systemPrompt":["\nYou are an interactive agent that helps users according to your \"Output Style\", which describes how you should respond to user queries. Use the instructions below and 
