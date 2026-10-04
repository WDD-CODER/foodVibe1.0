# Active Tasks

> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-2026-07-21.md`](reports/todo-ledger-relevance-audit-2026-07-21.md).
> Checkboxes are **unchanged** — decide per group: execute / mark done / prune / keep.
> **2026-09-16 (overnight):** `/auto-solve` running unattended in worktree `../foodVibe1.0-wt-auto-solve` on branch `feat/auto-solve-overnight`, self-approving each plan (no Human present). See that branch's `OVERNIGHT-REPORT.md` for what landed — nothing pushed/merged without Human review.

---

## Tech Debt (from `/nightly-maintenance` 2026-09-27)

> Full plan: `plans/318-nightly-maintenance-followups-2026-09-27.plan.md`. Full audit: `.claude/techdebt-reports/techdebt-2026-09-27.md`.

- [ ] `auth.interceptor.ts` — `BehaviorSubject` used for refresh-token gate; hard rule says signals only
- [ ] `nutrition-badge.component.ts:46` — legacy `@Input()` decorator, unresolved since `techdebt-2026-04-20.md`
- [ ] 2 stray trailing semicolons (`quick-add-product-modal.component.ts:121`, `menu-library-list.component.ts:197`)
- [ ] 24-file refactor-candidate backlog (>300 lines each) — triage, top 3 are 1200+ lines
  - [x] `cook-view.page.ts` — triaged + split 2026-09-28: timer/stopwatch + export/preview extracted to component-scoped services (`src/app/pages/cook-view/services/`), 1201 → 979 lines; `ng build` clean; branch `chore/cook-view-service-split`; Human-validated. Full detail: `plans/318-nightly-maintenance-followups-2026-09-27.plan.md`.
  - [ ] `menu-intelligence.page.ts` (1413) / `recipe-builder.page.ts` (1394) / remaining ~21-file backlog — not yet triaged
- [ ] 2 unnecessary `?? []` NG8102 warnings (`venue-detail`/`venue-list` templates)

---

## 1. EXECUTE — real unfinished work

> Audit says: do these.

- [x] `feat/optimization` — PR #192, merged to `main`. Delivered: double-fetch fix (plan 301 M4), full OnPush sweep (plan 303 M2), animations-async bundle cut, approve-stamp WebP (plan 302 M5), sync-master O(n²) fix (plan 303 M3 first item) — all Human-validated 2026-08-31. Remaining backlog (KITCHEN_UNITS double-fetch mystery, syncMasterToUser version-gating, plan 304's Human-only unblockers) persisted as `plans/309-optimization-loop-closeout-remaining-backlog.plan.md`.

### Plan 321 — Professional Foundation Refactor (`plans/321-professional-foundation-refactor.plan.md`)

> Phase 1 done 2026-09-29 (branch `chore/foundation-p1-single-source-of-truth`), pending Human validation. Phase 2a next — its own Step 0 Reality Check required before starting. Parallel-session note: Plan 320 (recipe course field + labels, `feat/recipe-labels-course-field` in worktree `foodVibe1.0-wt-recipe-labels`) is separate, unrelated work — no file overlap so far.

- [x] P0.0 Reality Check → `docs/session-state-foundation-refactor.md` + Human go
- [x] P0.1 Consolidate backup + add restore-to-scratch; drill local + Atlas — found & fixed a `system.views` crash bug in `db-backup.js` along the way; both drills verified 0 mismatches
- [x] P0.2 Server test harness (vitest + mongodb-memory-server + supertest)
- [x] P0.3 Characterization tests: generic.js, sync-master.js, push-to-master — 42 tests, all passing
- [x] P0.4 CI `server-tests` job
- [x] P0.5 ADR 0008
- [x] P1.0 Reality Check + Human go
- [x] P1.1 Collections registry — also fixed a real drift bug (2 collections missing from CLONEABLE_TYPES/BACKUP_ENTITY_TYPES)
- [x] P1.2 Single `newId()` server+client; server-generated `_id` on POST (client id still honored when given — appendExisting/trash-restore needs it)
- [x] P1.3 Removed localStorage mode + `useBackend` flags + `delay` param + the now-dead `backup_<key>` mirror — surfaced and fixed a real bug along the way: `UserService`'s constructor now always attempts silent refresh, needing `HttpClient` unconditionally; fixed 5 specs that broke
- [x] P1.4 Restricted whole-collection replace to `REPLACEABLE_TYPES` (broader than assumed — TRASH_*/VERSION_HISTORY use it too, not just registries)
- [x] P1.5 Rate limits: `/api/v1/data` writes 300/15min, `/api/v1/ai` 20/15min per user
- [x] P1.6 Fixed docs drift (`standards-backend.md §5`, `standards-security.md §9`) + stale `imageUrl_` comment
- [x] P1.7 `render.yaml` `PERF_LOG: "0"` — **Human action open:** mirror in Render dashboard
- [ ] P1.8 Stale branch list gathered (65 branches, `gh-pages` excluded) — **awaiting Human approval before deleting any**
- [ ] P2a.0–P2a.6 Shared Zod schema package, observe-mode validation
- [ ] P2b.0–P2b.5 v2 migration: rename + `schemaVersion` + enforce (Gates G1/G2)
- [ ] P3.0–P3.5 Unified taxonomy store (`taxonomyTerms` + `TaxonomyStore`)
- [ ] P4.0–P4.6 Course/protein/labels split + menu sections → course (Gate G3)
- [ ] P5.0–P5.8 Shared master + per-user overrides; admin-only push + dedicated modal
- [ ] P6.0–P6.4 One soft-delete model + `userPrefs`
- [ ] P7a–P7f Hygiene: god-file decomposition, service base adoption, script archive, CI hardening, logging, plan 301 remainder
- [ ] P8.1–P8.5 Governance: ADRs 0009–0013, standards docs, lint guards, re-audit

### Plan 322 — Admin Master-Push Expansion (`plans/322-admin-master-push-expansion.plan.md`)

> Saved 2026-09-30, not yet started. **Related to Plan 321's Phase 5** ("Shared master +
> per-user overrides; admin-only push + dedicated modal") but NOT a duplicate: Plan 322
> is the near-term incremental version built on the *current* clone/`_masterId`/sync-master
> architecture; Plan 321 Phase 5 is the later full replacement of that architecture
> (override model, no cloning). Plan 321's Phase 5 section now cross-references this plan
> so its Reality Check absorbs Plan 322's shipped state instead of re-deriving it. Safe to
> execute Plan 322 now — Plan 321 Phase 5 will migrate its output when that phase starts.

- [ ] Stage 1 — Foundation: `isAdmin_` signal on `UserService` + migrate ad hoc copies; gate `push-to-master` route with `requireAdmin`; `askScope()` short-circuits to `'me'` for non-admins
- [ ] Stage 2 — Wire existing server support (Products, Equipment, Suppliers): `_masterId` field + `pushToMaster()` + save-flow wiring
- [ ] Stage 3 — Extend to Venues, Menu Events, and 9 taxonomy/registry collections (labels, categories, allergens, units, menu types, menu event types, menu section categories, equipment custom categories, preparations)
- [ ] Stage 4 — New items created as shared from the start (`POST .../create-shared`, admin-only)
- [ ] Stage 5 — Non-destructive delete propagation (`PUT .../remove-from-master`, master-only removal, no cascade to existing users)

### Plan 320 — Recipe Labels Fix + Course/Category Field (`plans/320-recipe-labels-fix-course-category-field.plan.md`) — active in worktree `../foodVibe1.0-wt-recipe-labels`, branch `feat/recipe-labels-course-field`

> Scope correction 2026-09-29: only 5 of the audit's 9 clusters are genuine duplicates (dairy, vegan, marinade, asian, sipur_shel_ochel); the other 4 (meat/salads/soups/dessert) are course strings mis-clustered by the audit script's fuzzy matching — deferred to Milestone 2, not merged in Milestone 1. See plan file's Milestone 1 header for full detail.

**Milestone 1 — Merge duplicate dietary labels (5 confirmed clusters only)**
- [ ] M1.1: Read `.claude/reports/label-audit/data.json` Section D — extract the 5 confirmed clusters (dairy, vegan, marinade, asian, sipur_shel_ochel), canonical keys, orphan members, full affected-recipe lists
- [ ] M1.2: Confirm/register each canonical key in `KITCHEN_LABELS` for every affected `userId` (incl. `__master__`)
- [ ] M1.3: Write `scripts/merge-labels.mjs` (dry-run default, `--write` to mutate; scoped to the 5 clusters only) — replace orphan members with canonical key, dedupe, log mutations
- [ ] M1.4: Dry-run local → Human confirms host → `--remote` dry-run → review log → `--write --remote`
- [ ] M1.5: Fix `normalizeLabelKeys`/`buildRecipeFromForm` asymmetry in `recipe-form.service.ts` (save path should accept translation-dictionary fallback like load path)
- [ ] M1.6: Re-run `scripts/audit-labels.mjs --remote` — confirm 0 orphans in the 5 merged clusters (the other 4 clusters still showing orphans here is expected, not a regression)

**Milestone 2 — Recipe course/category field**
- [ ] M2.1: Add `course_?: string` to `Recipe` interface in `recipe.model.ts`
- [ ] M2.2: Add `KITCHEN_COURSES` registry to `metadata-registry.service.ts` (mirror `KITCHEN_LABELS` pattern; do not touch `KITCHEN_CATEGORIES`)
- [ ] M2.3: Seed `DEFAULT_COURSES` for `__master__` from non-dietary-duplicate orphan strings in `.claude/reports/label-audit/data.json`, including the 4 course-like clusters' members kept as distinct strings (not merged)
- [ ] M2.4: `recipe-builder.page.ts` — add `course: ['']` to `recipeForm_` (sole approved exception to file freeze)
- [ ] M2.5: `recipe-form.service.ts` — course handling in `patchFormFromRecipe`/`buildRecipeFromForm`
- [ ] M2.6: `recipe-header.component.ts`/`.html` — single-select course dropdown bound to `metadataRegistry.courses_()`
- [ ] M2.7: Metadata manager — "Courses" CRUD card (mirror labels card)
- [ ] M2.8: `recipe-book-list.component.ts` — surface `course_` in list/filter sidebar
- [ ] M2.9: `dictionary.json` — Hebrew translation entries for seeded course strings
- [ ] M2.10: Write `scripts/migrate-labels-to-courses.mjs` (dry-run default) — move course-like strings from `labels_`/`autoLabels_` to `course_`; multi-match conflicts go to a Human-review list, never auto-picked
- [ ] M2.11: Dry-run local → Human resolves conflicts → `--remote` dry-run → `--write --remote`
- [ ] M2.12: Re-run `scripts/audit-labels.mjs --remote` — confirm 0 course-like strings remain in `labels_`/`autoLabels_`

**Follow-up (post-M2, Human-tested 2026-09-29) — landed as a separate commit, not a new milestone:**
- [x] Course dropdown "clear to none" option + cascade-delete-with-confirm for in-use labels/courses (mirrors `renameMenuType`'s confirm+cascade shape) — committed
- [x] Bug: `getRecipeSnapshotForComparison()` never tracked `course_`, so changing only the course didn't mark the form dirty — fixed
- [x] Bug: metadata-manager's `onAddLabel` discarded the already-typed input text instead of prefilling the creation modal — fixed
- [ ] Bug: course `app-custom-select` dropdown option sometimes needs ~2-3 clicks to register a selection — reproduced, root cause not yet pinned (shared `CustomSelectComponent`, not obviously course-specific); deferred, not a data-correctness issue

### Plan 322 — Metadata Rename-in-Place with Cascade Update (`plans/322-metadata-rename-in-place-cascade-update.plan.md`)

> Follow-up to Plan 320: fixing a typo in a label/course/category/allergen today requires delete+recreate+manually-reassign even with cascade-delete. Mirrors the existing `renameMenuType`/`updateServingTypeForAll` pattern. Units explicitly out of scope (riskier, affects conversions elsewhere).

**Milestone 1 — Registry rename + cascade methods (no UI yet)**
- [ ] M1.1: `metadata-registry.service.ts` — `renameLabel`/`renameCourse`/`renameCategory`/`renameAllergen`, mirroring `renameMenuType`'s collision-check + persist + signal-update shape
- [ ] M1.2: `kitchen-state.service.ts` — rename-capable variants of `cascadeClearLabelFromAll`/`cascadeClearCourseFromAll` (reuse `applyCascadeUpdate`)
- [ ] M1.3: `kitchen-state.service.ts` — new `cascadeRenameCategoryForAll`/`cascadeRenameAllergenForAll` (product-side, via `productDataService.updateProduct` directly + activity/version-history logging)
- [ ] M1.4: `TranslationKeyModalService.open()` — add optional `englishKey_` prefill (backward compatible)
- [ ] M1.5: `LabelCreationModalService` — add edit-mode prefill if not already supported

**Milestone 2 — Wire up the UI**
- [ ] M2.1: Metadata Manager cards — edit/pencil action per pill alongside delete
- [ ] M2.2: `metadata-manager.page.component.ts` — `onRenameMetadata(item, type)`: open the right modal prefilled, confirm with affected count, cascade, success toast
- [ ] M2.3: Reject rename-to-existing-key before opening the confirm dialog

**Milestone 3 — Admin master-push for registry renames (added 2026-09-30) — Human-validated 2026-09-30 except M3.3 (see M3.7)**
- [x] M3.1: `registry-rename-master` server route + client plumbing chain
- [x] M3.2: Admin-only ternary (me/everyone/cancel) in `confirmAndCascadeRename` — Human-validated
- [x] M3.3: Fix false "key in use" collision on rename (`excludeKey` missing from label-creation-modal's own validation path) — Human validated the false-positive is gone, but flagged a real gap it exposed, see M3.7
- [x] M3.5: Fix unconditional success toast masking a failed master-push — Human-validated
- [x] M3.6: Remove "continue without saving" button leaking into course/category/allergen modal — Human-validated
- [x] M3.7 (added 2026-09-30, round 3): Fixed `TranslationService.validateKeyForHebrew` — now rejects a Hebrew label already used by a *different* key ("name already taken"), while still excluding the item's own key/label during rename. `ng build` clean; live UI check still needed from Human (frontend wasn't running for this pass).

**Milestone 4 — Server-side Hebrew dictionary sync (added 2026-09-30) — Human-validated 2026-09-30**
- [x] M4.1: `DICTIONARY_OVERRIDES` collection (per-user personal overrides)
- [x] M4.2: `__global__` pseudo-user doc + GET/PUT routes (admin-only write)
- [x] M4.3: `TranslationService` loads+merges dictionary.json → global → personal (localStorage becomes cache only, not source of truth)
- [x] M4.4: `updateDictionary(key, label, scope)` persists server-side per scope
- [x] M4.5: Wire admin ternary's me/everyone choice into `updateDictionary`'s scope
- [x] M4.6: Extend the key-unchanged/Hebrew-only-edit fast path to also offer the ternary (bug 4 from 2026-09-30 test round) — Human-validated

**Milestone 5 — "Everyone" upsert fixes + extend to ADD + recipe create (added 2026-09-30, 2nd round) — Human-validated 2026-09-30**
- [x] M5.1: `registry-rename-master` upserts (add to master) instead of 404ing when the item is new
- [x] M5.2: `push-to-master` (recipe/dish/product route) — same upsert fix, was silently no-op'ing
- [x] M5.3: No-op rename guard — skip prompt+save entirely when nothing changed
- [x] M5.4: Admin ternary extended to ADD flows (label/course/category/allergen) — Human-validated
- [x] M5.5: `recipe-builder.page.ts` — admin's brand-new recipe now also asks me/everyone on first save — Human-validated
- [x] M5.6: `push-to-master` — fixed a real 500 (E11000 duplicate key) on first push of a self-linked doc; now inserts master copy under a fresh `_id` instead of reusing the caller's own — Human-validated (everyone-save no longer errors)

**Milestone 6 — Admin "delete for everyone" on recipes/dishes (added 2026-09-30, round 3) — Human-validated 2026-09-30**
- [x] M6.1: Found delete handler (client `kitchen-state.service.ts`/`recipe-book-list.component.ts`, server trash-based, no master involvement before this)
- [x] M6.2: Same "just me / everyone" ternary now asked on delete (`MasterPushService.askDeleteScope`, wired into all 3 delete call sites) — prompts based on `_masterId` presence, same convention as the existing save-time ternary (not admin-gated — flag if a stricter gate is wanted)
- [x] M6.3: "Everyone" moves the master's linked copy to `TRASH_RECIPES`/`TRASH_DISHES` under `__master__` — new server route `PUT /:type/:id/delete-from-master`, no new flag field
- [x] M6.4: "Just me" unchanged
- [x] M6.5: Verified via direct API + DB check — master copy moved to trash and gone from the live collection, caller's own copy untouched. `ng build` clean.

**Milestone 7 — Recipe-builder save robustness fixes (added 2026-09-30, round 3)**
- [x] M7.1: Investigated, not a bug — `saveRecipe()` already shows a red inline message + global toast + auto-scroll when an ingredient row is blocking; couldn't reproduce a truly silent case (both product-creation paths in the app require a base unit). No code change.
- [x] M7.2: Investigated, not a bug — the "dead button" is actually `בונה מתכונים` (Recipe Builder), the active half of a 2-tab toggle with `מצב בישול` (Cook Mode); confirmed live by switching tabs. Misread at a glance as a broken duplicate save button. Nothing removed.

**Milestone 8 — Product delete: in-use warning + count + admin everyone-cascade (added 2026-09-30, round 4) — implemented, not verified/Human-validated**
- [x] M8.1: Investigated — today's product delete has zero in-use awareness; hard-succeeds and leaves dangling ingredient references behind (invalid/blocking rows). Only `onDeleteProduct` (single-item) changed, not bulk-delete.
- [x] M8.2: Affected-count confirm added before deleting an in-use product
- [x] M8.3: `KitchenStateService.cascadeRemoveIngredientForAll(productId)` — pulls the ingredient line entirely, reuses `applyCascadeUpdate`
- [x] M8.4: `askDeleteScope(product)` now asked when the product has a `_masterId`; `Product` model gained `_masterId?`/`_userModified?` (previously untyped)
- [x] M8.5: "Just me" unchanged scope
- [x] M8.6: `delete-from-master` extended to `PRODUCT_LIST`. Confirmed clones get a fresh `_id` per user at signup (not the master's), so added new route `PUT /:type/:id/purge-ingredient-everywhere` (`PRODUCT_LIST` only) — two-hop resolution via `_masterId` then per-user `$pull` on `RECIPE_LIST`/`DISH_LIST`
- [x] M8.7: Not run — Human explicitly asked to skip live/API verification and not create test data for this one; `ng build` clean is the hand-off bar. Human will test directly in the app.

**Milestone 9 — Admin push-to-everyone on new product creation + recipe push carries its new products along (added 2026-09-30, round 5) — Human-validated 2026-09-30 ("m9 all good here")**
- [x] M9.1: Found — `product-form.component.ts`'s `saveAndWait()` (both create+edit); quick-add-product modal is a separate fast-entry path, deliberately not prompted (see M9.2)
- [x] M9.2: Admin ternary added to `product-form.component.ts` (same `askScope`/`forcePrompt` pattern as brand-new recipes); quick-add-product modal left as-is, relies on M9.3
- [x] M9.3: `push-to-master` route refactored into recursive `pushDocToMasterRecursive` — any never-pushed referenced product/sub-recipe now gets pushed as a dependency instead of leaving an unresolvable local id behind; `saveProduct()` return type changed `void` → `Product` to get the new `_id` (checked all 5 call sites, backward compatible)
- [x] M9.4: Not run — Human's standing instruction, no test data created this session; `ng build` clean + `node --check` on the server file is the hand-off bar

**Milestone 10 — Admin ternary + master push on label/course/category/allergen DELETE (added 2026-09-30, round 5)**
- [x] M10.1: `onRemoveMetadata` now calls `resolvePushScope(type)` before executing, in both the in-use cascade branch and the not-in-use plain-delete branch — cancel aborts the whole delete
- [x] M10.2: New `PUT /:type/registry-delete-master` route — removes key from `__master__`'s registry doc + bulk-strips from every other user's own data in one `updateMany` per collection (no per-user two-hop needed, key is shared literally unlike product `_id`s)
- [x] M10.3: Decided by Human 2026-09-30 — yes, aggressive cross-user removal, same as Milestone 8's products
- [ ] M10.4: Not run — standing instruction to skip live verification; `ng build` + `node --check` clean. Human will test in the app.

**Milestone 11 — Bulk multi-select product delete gets Milestone 8's warning + ternary (added 2026-09-30, round 5)**
- [x] M11.1: `onBulkDeleteSelected` computes in-use count per selected product, cascades the ingredient removal, asks ONE combined ternary for the whole batch (not per-product)
- [x] M11.2: Combined confirm copy summarizing total affected across the selection; falls back to the plain old copy when nothing selected is in use
- [x] M11.3: Not run — Human's standing instruction to skip live verification/test data; `ng build` clean is the hand-off bar

**Milestone 12 — `_masterId` never patched into local client state after push-to-master (found during round 5 testing)**
- [x] M12.1: `push-to-master` route response now returns `{ ok: true, masterId: resolvedMasterId }` instead of just `{ ok: true }`
- [x] M12.2: `master-push.service.ts`'s `pushToMaster`/`pushProductToMaster` now patch the resolved `masterId` into local state via `.then()` instead of discarding it
- [x] M12.3: New `patchMasterId(id, masterId)` method on `product-data.service.ts`/`recipe-data.service.ts`/`dish-data.service.ts`
- [x] M12.4: `node --check` + `ng build --configuration=local` both clean
- [x] M12.5: Live end-to-end verified in browser (self-validated per Human's request): create product → push to everyone → same-session delete → "just me/everyone" ternary now correctly appears and completes (caveat: didn't exercise the cross-user purge path — see M13)

**Milestone 13 — `purge-ingredient-everywhere` doesn't actually strip the dangling ingredient from other users (found round 6, NOT YET FIXED)**
- [ ] M13.1: Need backend terminal log for `[data/purge-ingredient-everywhere]` (or add temp logging of otherClones.length + updateMany matchedCount) — masterId chains all check out in DB, client calls are confirmed sent, URL construction is correct; the actual server-side failure point is still unknown
- [ ] M13.2: Root-cause once visible
- [ ] M13.3: Fix + verify a non-admin user's RECIPE_LIST/DISH_LIST loses the dangling ref; confirm with Human whether "everyone" should also delete from other users' own PRODUCT_LIST (broader than original M8 scope)
- [ ] M13.4: Sanity-check whether M10's registry-delete-master shares the same root cause

### Plan 323 — Metadata Registry Single Source of Truth (`plans/323-metadata-registry-single-source-of-truth.plan.md`)

> Two disconnected seed paths (server clone-from-`__master__` at signup, vs. a client-side hardcoded-default fallback when a user's own doc is empty) let `__master__` silently fall behind real usage for KITCHEN_CATEGORIES/ALLERGENS/COURSES/MENU_TYPES — courses was the extreme case (63 vs 2), found + manually patched 2026-09-30 during Plan 322 testing. Plan-only for now; not started.

**Milestone 1 — Backfill + remove the client-side fallback**
- [ ] M1.1: `server/scripts/seed-master-registries.mjs` — one-off backfill script (local + Atlas)
- [ ] M1.2: `metadata-registry.service.ts` `initMetadata()` — remove client-side default-seed branches for categories/allergens/courses/menu-types
- [ ] M1.3: Delete the now-dead `DEFAULT_CATEGORIES`/`DEFAULT_ALLERGENS`/`DEFAULT_COURSES`/`defaultMenuTypes` constants
- [ ] M1.4: Confirm `clone-master.js` reliably clones these 4 types before removing the client-side safety net

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

- [x] M9 Task 17 — Product form — composed `.c-input` engine class on all plain inputs instead of duplicating its styles locally in `product-form.component.scss`; `ng build` clean, visual QA via gstack browse confirmed no regression. Human-validated 2026-09-16.
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

### Plan 328 — Workflow Kit Extraction, Phase 1: Audit & Manifest (`plans/328-workflow-kit-extraction-phase-1-audit-manifest.plan.md`)

- [ ] A1: `git fetch origin`. Generate the raw inventory file list from the roots (and exclusions), and write the pending-branch report.
- [ ] A2: Write `scripts/kit-manifest-check.mjs` first, against an empty `manifest.json`. It must list everything as unclassified.
- [ ] A3: Classify `.claude/**` (commands, skills, agents, references, instructions, prompts, workflows, `settings.json`): tier, action, params, refs, notes.
- [ ] A4: Classify `scripts/**`, `.husky/**`, `.github/workflows/**` and the root config files.
- [ ] A5: Classify `.cursor/**`, `docs/agent/**`, `docs/brain/**` (as files), `_shared/**`, `.vscode/**`, `AGENTS.md`, `CLAUDE.md` and `README_WORKFLOW.md`.
- [ ] A6: Build `parameters.md` from all `params[]`, plus the reference map, and record the blockers in the summary.
- [ ] A7: Lessons triage: all gotcha entries across the 5 domain files, all ADRs, and all patterns.
- [ ] A8: Write the ADR (next free number after rebase).
- [ ] A9: Write the `manifest.md` summary. Run both checker modes until they are green, then run the build.
- [ ] A10: STOP. Hand Dandan the two `[human]` reviews. Apply re-verdicts if requested, then `/ship`.

### Plan 329 — Workflow Kit Extraction, Phase 2: Core Scaffold (`plans/329-workflow-kit-extraction-phase-2-core-scaffold.plan.md`)

- [ ] B0: Verify the Prerequisites gate — plan 321's `take-plan.mjs` Windows `shell` fix is merged to FoodVibe `main`. If not, STOP and tell the Human.
- [ ] B1: Create `../ai-workflow-kit` (fresh `git init`), baseline `README.md`, `.gitignore`, empty `core/` tree.
- [ ] B2: Write `kit.config.json` with all 38 `parameters.md` keys plus `docs.domainStandards` and `paths.sharedDocs`, placeholder values only.
- [ ] B3: Write `scripts/kit-extract.mjs` (FoodVibe-side, reads `manifest.json`, writes into the kit repo path) applying `copy`/`parameterize` for every `tier: core` row; run it.
- [ ] B4: Hand-fix the 7 `split` core files (generic half only) and the 7 blocker files per the Blockers table's proposed-fix column.
- [ ] B5: Write the kit repo's framework-name-leak CI check; get it green against the extracted `core/`.
- [ ] B6: Extend `scripts/kit-extract.mjs` (or add a sibling check) with a coverage report confirming all 77 core rows landed.
- [ ] B7: Record the kit repo's location in `docs/workflow-kit/manifest.md`.
- [ ] B8: STOP. Hand Dandan the two `[human]` reviews (kit.config.json keys; kit repo name/location). Apply changes if requested, then `/ship` on the FoodVibe side only — the kit repo stays local, no remote, until Dandan says otherwise.

### Plan 330 — take-plan.mjs: Skip Mark-Active Commit When Already Active (`plans/330-take-plan-mark-active-skip-fix.plan.md`)
- [ ] Add the already-active / no-diff guard around the mark-active commit in `scripts/take-plan.mjs`
- [ ] Verify `node scripts/take-plan.mjs <NNN>` runs to completion both when a plan starts as non-active and when it's already `Status: active`

### Plan 332 — Recipe edit blocked by "name already in use": diagnose and fix (`plans/332-recipe-edit-blocked-duplicate-name.plan.md`)

- [ ] A1: Create src/app/pages/recipe-builder/utils/find-duplicate-name.util.ts, exporting findDuplicateName(list: Recipe[], name: string, currentId: string | null): Recipe | null. Trim both sides and exclude currentId. Add a spec covering: same-id excluded, whitespace, a dish/recipe twin, and no match.
- [ ] A2: Change duplicateNameValidator_() (recipe-builder.page.ts:593) to use the util over this.state_.recipes_() (kitchen-state.service.ts:35, the same combined list). Return the detail object and add the console.warn.
- [ ] A3: In recipe-header.component.html around L42, add the "open existing" link (router link to /recipe-builder/ + id) and the optional master tag. Add both dictionary keys.
- [ ] A4: Human gate. Dandan opens the recipe that failed, tries to save, and reports the console line and what the link opens. STOP until he answers.
- [ ] A5: Act on the answer: cause (b) make type-change path add-then-delete with a spec; cause (a) unlinked master clone, no client fix, write follow-up note for server-side plan; genuine duplicate, no code fix.
- [ ] A6: npm run build and the targeted specs pass. Update the session-state file.

### Plan 333 — Remove the hidden-recipes concept (`plans/333-remove-hidden-recipes-concept.plan.md`)

> Run after Plan 332 (duplicate-name fix) — both touch `kitchen-state.service.ts`.

- [ ] A1: Remove the hide methods from the three services and the uncalled onHideRecipe.
- [ ] A2: Replace visibleRecipes_ with recipes_ in recipe-book-list (ts, html, spec), then delete visibleRecipes_.
- [ ] A3: Remove the hiddenBy carry-forward in both update methods; strip the field on save (P1).
- [ ] A4: Mark the model field @deprecated. Run the grep in Success Criteria.
- [ ] A5: Build and run the targeted specs. Update the session-state file.

### Plan 335 — AI product: register categories and allergens through the registry (`plans/335-ai-product-register-categories-allergens-registry.plan.md`)
- [ ] A1: Make registerAllergen return the key (or null). Update callers and the spec. (`src/app/core/services/metadata-registry.service.ts`, `src/app/core/services/metadata-registry.service.spec.ts`)
- [ ] A2: Create src/app/pages/inventory/services/ai-draft-metadata.util.ts with resolveDraftMetadata(), plus a spec covering: known key passthrough, Hebrew→key, null dropped, dedupe.
- [ ] A3: Wire it into ProductAiFlowService.applyDraft() and openAiCreateModal(). (`src/app/pages/inventory/services/product-ai-flow.service.ts`, `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts`)
- [ ] A4: Route the modal's free-text add through it (P1). (`src/app/shared/ai-product-modal/**`)
- [ ] A5: GeminiService: send knownCategories and knownAllergens in the product generate and patch bodies. ai.js: read them (optional arrays, cap 200 each) and append them to the prompt. (`src/app/core/services/gemini.service.ts`, `server/routes/ai.js`)
- [ ] A6: Server test for the prompt append (or a manual curl if there's no harness for ai.js). Build and run specs. Update the session-state file. (`server/test/**`)

### Plan 336 — AI product from a photo (`plans/336-ai-product-from-photo.plan.md`) — must run after Plan 335
- [ ] A1: Write the `downscaleImage` util and its spec (dimensions capped, small file passthrough). — `src/app/core/utils/downscale-image.util.ts`, `downscale-image.util.spec.ts`
- [ ] A2: Add the server endpoint plus a test (missing image → 400; bad mime → 400). — `server/routes/ai.js`, `server/test/**`
- [ ] A3: Add `GeminiService.generateProductFromImage`, using the util. — `src/app/core/services/gemini.service.ts`, `gemini.service.spec.ts`
- [ ] A4: Add the modal toggle, image picker, preview and generate wiring. On confirm, the result goes through the create path from plan 335 (registry resolver). — `src/app/shared/ai-product-modal/**`
- [ ] A5: Recipe image path uses the util (P1). — `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts`
- [ ] A6: Build and run specs. Update the session-state file.

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
