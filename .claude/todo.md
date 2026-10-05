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

### Plan 321 — Professional Foundation Refactor (`plans/321-professional-foundation-refactor.plan.md`)

> **State 2026-10-05:** Phases 0–2b done; Phase 3 mostly done (PR #253) — P3.4 cleanup + P3.5 left. Phases 4–7 not started. P7e (logging) partly covered by Plan 383.

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
- [x] P1.8 Stale branch list gathered (65 branches, `gh-pages` excluded) — 66 merged branches deleted by Human 2026-10-01; session/claude/audit branches left for later cleanup
- [x] P2a.0–P2a.6 Shared Zod schema package, observe-mode validation (commit `3014d286`)
- [x] P2b.0–P2b.6 v2 migration: rename + `schemaVersion` + enforce (Gates G1/G2) — PR #239 + #240; Atlas validate-all 0 violations; Human smoke "all good" 2026-10-02
- [ ] P2b.x Stray keys: `ingredients_` on 36 local products dropped in v2; `steps_[].cooking_time_minutes_` (4 Atlas recipes) kept as deprecated `cookingTimeMinutes` — **Human decides rename-vs-convert**
- [x] P3.0–P3.3 Taxonomy schema, 0003 migration (local + Atlas), server term API — PR #253
- [ ] P3.4 `TaxonomyStore` cutover DONE (PR #253) — REMAINING: shrink the 6 facades (`metadata-registry` 355 lines, `preparation-registry` 223, `unit-registry` 158, …) to ≤30 lines / inline; generic `taxonomy-kind-manager`
- [ ] P3.5 Drop old `KITCHEN_*` registry collections — also delete the now-dead server routes `registry-rename-master` / `registry-delete-master` and their unused `http-storage.adapter.ts` methods (client already goes through `TaxonomyStore`; reality check 2026-10-05)
> Related work outside the plan: Plan 385 (per-user write limit, server-owned rename re-key — merged PR #258), Plan 386 (`canWrite` + remove/rename "for me" on shared terms — draft, next), Plan 387 (architecture guard)
- [ ] P4.0–P4.6 Course/protein/labels split + menu sections → course (Gate G3)
- [ ] P5.0–P5.8 Shared master + per-user overrides; admin-only push + dedicated modal — now also owns Plan 322 Stages 2–5 + Plan 322-metadata M13
- [ ] P6.0–P6.4 One soft-delete model + `userPrefs`
- [ ] P7a–P7f Hygiene: god-file decomposition, service base adoption, script archive, CI hardening, logging, plan 301 remainder
- [ ] P8.1–P8.5 Governance: ADRs 0009–0013, standards docs, lint guards, re-audit

### Plan 322 — Admin Master-Push Expansion (`plans/322-admin-master-push-expansion.plan.md`)

> 2026-10-05 reality check: Stage 1 server guard, `askScope` admin gate and Products push already shipped (via Plan 322-metadata + 335). Registry part of Stage 3 deferred to Plan 321 Phase 3. Read-Write Scope added — takeable.

> Saved 2026-09-30, not yet started. **Related to Plan 321's Phase 5** ("Shared master +
> per-user overrides; admin-only push + dedicated modal") but NOT a duplicate: Plan 322
> is the near-term incremental version built on the *current* clone/`_masterId`/sync-master
> architecture; Plan 321 Phase 5 is the later full replacement of that architecture
> (override model, no cloning). Plan 321's Phase 5 section now cross-references this plan
> so its Reality Check absorbs Plan 322's shipped state instead of re-deriving it. Safe to
> execute Plan 322 now — Plan 321 Phase 5 will migrate its output when that phase starts.

> **State 2026-10-05:** Stages 2–5 build on the clone/`_masterId` model that Plan 321 Phase 5 deletes — anything added there is throwaway. **Human 2026-10-05: Stage 1 only; Stages 2–5 FOLDED into 321 P5.**

- [ ] Stage 1 — PARTLY DONE: `requireAdmin` on `push-to-master` ✅, `askScope()` → `'me'` for non-admins ✅. LEFT: one public `isAdmin_` on `UserService`, replace the 7 ad hoc copies (master-push, taxonomy-store, product-form, user-management, metadata-manager page, recipe-book-list, recipe-builder)
- [-] Stage 2 (FOLDED into 321 P5) — Products DONE; server already accepts suppliers/equipment (`PUSHABLE_TYPES`). LEFT: equipment + supplier client wiring
- [-] Stage 3 (FOLDED into 321 P5) — registry part MOOT (taxonomy terms are shared live since 321 P3). LEFT: venues + menuEvents only
- [-] Stage 4 (FOLDED into 321 P5) — not started (terms already support "add as shared")
- [-] Stage 5 (FOLDED into 321 P5) — `delete-from-master` exists for recipes/dishes/products. LEFT: equipment/suppliers/venues/menuEvents

### Plan 320 — Recipe Labels Fix + Course/Category Field (`plans/320-recipe-labels-fix-course-category-field.plan.md`) — active in worktree `../foodVibe1.0-wt-recipe-labels`, branch `feat/recipe-labels-course-field`

> **CLOSED 2026-10-05 — superseded by Plan 321 Phase 4** (course/protein/labels split on v2 data). This plan uses pre-v2 names (`labels_`, `KITCHEN_LABELS`, `course_`) that no longer exist after the Phase 2b migration. Do not take it; Phase 4's Step 0 reads it for the label-cluster decisions.

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
- [ ] (still open, not Plan 320 work — fold into Plan 364 A1, which touches `custom-select`) Bug: course `app-custom-select` dropdown option sometimes needs ~2-3 clicks to register a selection — reproduced, root cause not yet pinned (shared `CustomSelectComponent`, not obviously course-specific); deferred, not a data-correctness issue

### Plan 301 — Server-side search & lean data loading (`plans/301-server-side-search-lean-data-loading.plan.md`)

> **CLOSED 2026-10-05** — plan file is archived (`plans/archive/301-…`); its remaining milestones are Plan 321 P7f.

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

### Plan 304 — Perf Phase 3: Data Volume (`plans/304-perf-phase3-data-volume.plan.md`)

> 2026-10-05 reality check: only Milestone 1 (list projections) left, still justified. Read-Write Scope (M1 only) added — takeable.

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

### Plan 336 — AI product from a photo (`plans/336-ai-product-from-photo.plan.md`) — must run after Plan 335
- [ ] A1: Write the `downscaleImage` util and its spec (dimensions capped, small file passthrough). — `src/app/core/utils/downscale-image.util.ts`, `downscale-image.util.spec.ts`
- [ ] A2: Add the server endpoint plus a test (missing image → 400; bad mime → 400). — `server/routes/ai.js`, `server/test/**`
- [ ] A3: Add `GeminiService.generateProductFromImage`, using the util. — `src/app/core/services/gemini.service.ts`, `gemini.service.spec.ts`
- [ ] A4: Add the modal toggle, image picker, preview and generate wiring. On confirm, the result goes through the create path from plan 335 (registry resolver). — `src/app/shared/ai-product-modal/**`
- [ ] A5: Recipe image path uses the util (P1). — `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts`
- [ ] A6: Build and run specs. Update the session-state file.

### Plan 338 — Equipment: one route tree, back-to-products navigation, remove scaling rule from UI (`plans/338-equipment-one-route-tree-back-to-products-remove-scaling.plan.md`)
- [ ] A1: Replace the /equipment routes with redirects and delete EquipmentPage. (src/app/app.routes.ts, src/app/pages/equipment/equipment.page.*)
- [ ] A2: Remove the URL branching in list, form and resolver. (equipment-list.component.ts, equipment-form.component.ts, equipment.resolver.ts)
- [ ] A3: Add the two inventory tab chips, and remove the .control-nav from the equipment and inventory filter panels. (tab-chips.component.ts, equipment-list.component.html, inventory-product-list.component.html)
- [ ] A4: Swap the logistics labels for equipment. (equipment-list.component.html, inventory-product-list.component.html)
- [ ] A5: Remove the scaling UI from form and list; deprecate the model fields. (equipment-form.component.*, equipment-list.component.*, equipment.model.ts)
- [ ] A6: Run rg -n "scaling|isUnderInventory|EquipmentPage|'/equipment" src/app and clean the leftovers. Build, specs, e2e grep. Update the session-state file.

### Plan 339 — Toggle-chip engine: replace filter checkboxes with chips, compact clear filters (`plans/339-toggle-chip-engine-filter-chips-clear-filters.plan.md`)
- [ ] A1: Build the `.c-toggle-chip` / `.c-toggle-chip-group` engine and the phone-override exclusion.
- [ ] A2: Remove the panel heading; add the `[shell-filter-clear]` slot and positioning; fix the recipe-book active-filter check.
- [ ] A3: Migrate inventory and recipe-book filters.
- [ ] A4: Migrate suppliers, equipment and venues filters.
- [ ] A5: Delete the dead `.c-filter-option`, `.c-filter-section-header` and `.env-filter-pill` styles (grep first).
- [ ] A6: Build and run specs. Check at 360px, 768px and 1280px. Update the session-state file.

### Plan 340 — Metadata: compact chips, tap-to-act menu, menu-type fields as toggle chips (`plans/340-metadata-compact-chips-tap-menu-menu-type-toggle-chips.plan.md`)

- [ ] A1: Add `RowActionsMenuComponent.open(anchor)` / `close()` (public) and anchor-based positioning, with a spec. Verify the 4 existing list usages are unchanged. (`src/app/shared/row-actions-menu/**`)
- [ ] A2: Switch `#managerCard` to pills for every type and add the tap menu. Delete the category grid styles and hover-reveal rules. (`metadata-manager.page.component.*`)
- [ ] A3: Switch the preparation and section category managers to pills plus the tap menu. (`metadata-manager/components/**`)
- [ ] A4: Switch menu types to fixed-order toggle chips that save on toggle, and remove the checkbox edit mode. (`metadata-manager.page.component.*`)
- [ ] A5: Build and run the specs. Check on the phone at 360px. Update the session-state file.

### Plan 341 — Suppliers: add/edit as a page like venues; center the venues inner nav (`plans/341-suppliers-add-edit-as-page-center-venues-nav.plan.md`)

- [ ] A1: `SuppliersPage` back bar plus centering styles; venues centering (`src/app/pages/suppliers/suppliers.page.*`, `src/app/pages/venues/venues.page.scss`, `venue-form.component.scss`)
- [ ] A2: Route add and edit to pages; remove inline edit from supplier-list (`supplier-list.component.*`)
- [ ] A3: Align the supplier-form full-page markup and styles with venue-form (`supplier-form.component.*`)
- [ ] A4: Delete the supplier modal, its service and mount; grep for leftovers (`shared/supplier-modal/**`, `supplier-modal.service*`, `app.component.*`)
- [ ] A5: Build, specs, e2e grep for supplier-modal. Update the session-state file.

### Plan 342 — Form checkboxes → toggle chips (app-wide) (`plans/342-form-checkboxes-to-toggle-chips-app-wide.plan.md`)

- [ ] A1: Supplier form delivery days (both branches) → chip group (`supplier-form.component.*`)
- [ ] A2: Equipment form `isConsumable` and equipment-list inline-edit booleans → chips (`equipment-form.component.*`, `equipment-list.component.*`)
- [ ] A3: Product form special price, quick-add allergens, quick-edit suppliers → chips (`product-form.component.*`, `quick-add-product-modal/**`, `quick-edit-product-panel/**`)
- [ ] A4: Label-creation triggers and venue-form active → chips (`label-creation-modal/**`, `venue-form.component.*`)
- [ ] A5: Delete the dead local classes and `.c-filter-option` (`src/styles.scss`). Run `rg -n 'type="checkbox"' src/app --glob '*.html'` and confirm only list-row-checkbox remains.
- [ ] A6: Build and run specs. Update the session-state file.

### Plan 344 — Menu "צ'קליסט והדפסות": top drop-down sheet from the FAB, and portrait-safe checklist views (`plans/344-menu-checklist-and-prints-top-sheet-portrait-checklists.plan.md`)
- [ ] A1: `menu-export-sheet` component: markup, animation, backdrop and Escape close, with a spec (open → backdrop click → close emitted) (`components/menu-export-sheet/**`).
- [ ] A2: Wire the FAB action → `exportSheetOpen_`; connect the sheet outputs to the existing page methods (`menu-intelligence.page.ts/.html`).
- [ ] A3: Remove the export pills, their styles and the dead signals and methods (`menu-intelligence.page.ts/.html`, `_toolbar.scss`).
- [ ] A4: export-preview portrait styles (`export-preview.component.scss`).
- [ ] A5: Build and run specs. Check at 360px portrait, landscape and desktop. Update the session-state file.

### Plan 345 — Filter categories collapsed by default on mobile (`plans/345-filter-categories-collapsed-by-default-on-mobile.plan.md`)
- [ ] A1: Write the util plus its spec (`collapsible-categories.util.ts/.spec.ts`).
- [ ] A2: Migrate inventory and recipe-book (`inventory-product-list/**`, `recipe-book-list/**`).
- [ ] A3: Add collapsible headers to suppliers and equipment (`supplier-list/**`, `equipment-list/**`).
- [ ] A4: Build and run specs. Check at 360px and 1280px. Update the session-state file.

### Plan 346 — Lists: sticky table header and pagination at the top (`plans/346-lists-sticky-table-header-and-pagination-at-top.plan.md`)
- [ ] A1: list-shell: `.table-top` wrapper, `[shell-pagination]` slot, sticky styles, `--list-sticky-top`, `overflow:clip`, grid rows (`src/app/shared/list-shell/**`).
- [ ] A2: Move pagination in inventory and recipe-book into the slot; adjust `.c-pagination-controls` (`inventory-product-list.component.html/.scss`, `recipe-book-list.component.html/.scss`, `src/styles.scss`).
- [ ] A3: Verify suppliers and equipment (no pagination) get the sticky column header with no empty gap.
- [ ] A4: Build and run specs. Check at 360px, 800px and 1280px. Update the session-state file.

### Plan 347 — Mobile keyboard: push content up, keep the focused field visible (`plans/347-mobile-keyboard-keep-focused-field-visible.plan.md`)
- [ ] A1: Viewport meta (`src/index.html`).
- [ ] A2: `KeyboardInsetService` plus a spec (mock `visualViewport`: inset computed, class toggled, no-op without the API). Inject it in `AppComponent` (`keyboard-inset.service.ts/.spec.ts`, `app.component.ts`).
- [ ] A3: The `body.kb-open` rules and `.as-modal` / `.c-modal-card` inset handling (`src/styles.scss`).
- [ ] A4: `vh` → `dvh` in the listed files.
- [ ] A5: Build and run specs. Update the session-state file.

### Plan 348 — Recipe builder on mobile: usable ingredient rows (portrait and landscape) (`plans/348-recipe-builder-mobile-usable-ingredient-rows.plan.md`)
- [ ] A1: Remove the conflicting media block; tune the container card layout for portrait and landscape (`recipe-ingredients-table.component.scss`).
- [ ] A2: Gate hover-reveals behind `(hover: hover)` (`recipe-ingredients-table.component.scss`).
- [ ] A3: Update the `isMobile_` query (`recipe-ingredients-table.component.ts`).
- [ ] A4: Nutrition badge tap positioning, clamp and outside-tap close, with a spec (`shared/nutrition-badge/**`).
- [ ] A5: Header grid `1fr 1fr` (`recipe-header.component.scss`).
- [ ] A6: Build and run specs. Check at 360×740 portrait, 740×360 landscape and desktop. Update the session-state file.

### Plan 349 — Shared column carousel (one component for every list) and roomier recipe-book carousel (`plans/349-shared-column-carousel-roomier-recipe-book-carousel.plan.md`)
- [ ] A1: Build the group directive, header, cell and slide directive, with specs: next/prev wrap or clamp, header and cell share the index, RTL direction (`src/app/shared/column-carousel/**`).
- [ ] A2: Migrate recipe-book, including the spacing changes (`recipe-book-list/**`).
- [ ] A3: Migrate inventory, suppliers and equipment (`inventory-product-list/**`, `supplier-list/**`, `equipment-list/**`).
- [ ] A4: Delete the old components; `rg` for leftovers (`shared/carousel-header/**`, `shared/cell-carousel/**`).
- [ ] A5: Build and run specs. Check at 360px, 768px and desktop (the carousel is hidden on desktop as today). Update the session-state file.

### Plan 350 — Shared scroll rail for horizontal strips (`plans/350-shared-scroll-rail-for-horizontal-strips.plan.md`)
- [ ] A1: `app-scroll-rail` component plus its spec (`src/app/shared/scroll-rail/**`).
- [ ] A2: Migrate the metadata jump-nav; delete the old logic (`metadata-manager.page.component.*`).
- [ ] A3: Migrate tab chips; adjust the `.c-tab-chips` rules (`core/components/tab-chips/**`, `src/styles.scss`).
- [ ] A4: Migrate the dish data strip (`menu-dish-row/**`).
- [ ] A5: Build and run specs. Check at 360px and 1280px in RTL. Update the session-state file.

### Plan 351 — Dashboard "פעילות אחרונה": readable change history (`plans/351-dashboard-recent-activity-readable-change-history.plan.md`)
- [ ] A1: `activityValue` pipe plus its spec: supplier ids → names, key translation, unknown id, empty (`core/pipes/activity-value.pipe.ts/.spec.ts`).
- [ ] A2: Switch the popover to the pipe (`shared/change-popover/**`).
- [ ] A3: New entry template and styles; delete the strip, scroll method and `.change-tag` styles (`dashboard-overview/**`).
- [ ] A4: Relative time plus the optional day grouping (`dashboard-overview/**`).
- [ ] A5: Build and run specs. Check at 360px and desktop. Update the session-state file.

### Plan 352 — Page header, part 1: `<app-page-header>` and the list-shell pages (`plans/352-page-header-part-1-app-page-header-list-shell.plan.md`)
- [ ] A1: `PageHeaderComponent` plus a spec (renders title, count, back; slots project) (`src/app/shared/page-header/**`).
- [ ] A2: list-shell uses it; delete the old header grid styles (`src/app/shared/list-shell/**`).
- [ ] A3: Clean the 4 pages' title markup and styles (`inventory-product-list/**`, `recipe-book-list/**`, `supplier-list/**`, `equipment-list/**`).
- [ ] A4: Build and run specs. Check at 360px, 768px and 1280px. Update the session-state file.

### Plan 353 — Page header, part 2: venues, menu library, dashboard, trash (`plans/353-page-header-part-2-venues-menu-library-dashboard-trash.plan.md`)
- [ ] A1: Add the `subtitleKey` input to `PageHeaderComponent`, plus a spec case (`src/app/shared/page-header/**`).
- [ ] A2: Venues and menu library (`venue-list/**`, `menu-library-list/**`).
- [ ] A3: Dashboard overview and the dashboard tabs header (title = active tab) (`dashboard-overview.component.html/.scss`, `dashboard-header/**`).
- [ ] A4: Trash (`src/app/pages/trash/**`).
- [ ] A5: Delete the dead styles; run `rg 'class="page-title"'`. Build and run specs. Check at 360px and 1280px. Update the session-state file.

### Plan 361 — Lists quick fixes: bulk-edit dropdown clipped, suppliers table grid and labels (`plans/361-lists-quick-fixes-bulk-edit-dropdown-suppliers-grid-labels.plan.md`)
- [ ] A1: Remove `.selection-bar-area` overflow; verify the bulk-edit dropdown in all 4 lists (`list-shell.component.scss`).
- [ ] A2: Suppliers 9-track desktop grid (`supplier-list/**`).
- [ ] A3: Min-order into the carousel; mobile grid `'2fr 1fr 40px 28px'`; ₪ formatting (`supplier-list/**`).
- [ ] A4: Dictionary keys; title tokens (P1) (`dictionary.json`, `supplier-list.component.scss`).
- [ ] A5: Build, specs, check at 360px and 1280px. Update session-state.

### Plan 362 — List overlays escape the table: row actions menu and edit modal render at body level (`plans/362-list-overlays-row-actions-menu-edit-modal-body-level.plan.md`)
- [ ] A1: Move `RowActionsMenuComponent` to CDK Overlay, with a spec (opens, closes on backdrop, `open(anchor)` works) (`shared/row-actions-menu/**`).
- [ ] A2: Move the list-shell `[shell-modal]` slot out of `.list-container` (`shared/list-shell/**`).
- [ ] A3: Gotcha entry (`docs/brain/gotchas.md`).
- [ ] A4: Build, specs. Check inventory, recipe-book, suppliers and equipment at 360px, 800px and 1280px. Update session-state.

### Plan 363 — Search fields, part 1: animated clear (X) button and no browser suggestions on the 8 main search bars (`plans/363-search-fields-part-1-clear-button-no-autocomplete-main-bars.plan.md`)
- [ ] A1: `InputClearComponent` + spec (hidden when `visible=false`, emits `clear`); engine CSS (`shared/input-clear/**`, `src/styles.scss`).
- [ ] A2: Wire the 4 list pages (recipe-book, inventory, suppliers, equipment).
- [ ] A3: Wire menu-library and venues.
- [ ] A4: Wire ingredient-search and preparation-search, preserving their keyboard and result-panel behavior.
- [ ] A5: Autocomplete attributes on all 8. Build, specs, phone check. Update session-state.

### Plan 364 — Search fields, part 2: clear (X) in dropdown pickers and no browser suggestions on picker and name fields (`plans/364-search-fields-part-2-picker-clear-and-no-autocomplete.plan.md`)
- [ ] A1: chip-search-dropdown, custom-select, custom-multi-select: X, autocomplete, unique ids, specs.
- [ ] A2: Recipe-book ingredient filter and recipe-builder logistics search: X + autocomplete.
- [ ] A3: Menu-intelligence event type, section category and dish-row search: X + autocomplete.
- [ ] A4: Autocomplete sweep on the listed modal, form and metadata fields.
- [ ] A5: Build, specs, Android check. Update session-state.

### Plan 365 — Admin scope prompt ("רק לי / לכולם"): wording that fits each action, item type and count (`plans/365-admin-scope-prompt-wording-per-action-entity-count.plan.md`)
- [ ] A1: Service API, `buildTexts`, and spec; dictionary keys (`master-push.service.ts`, spec).
- [ ] A2: Update recipe and dish call sites (cook-view, recipe-book, recipe-builder).
- [ ] A3: Update product call sites (product-form, inventory), with the product-delete warning.
- [ ] A4: Metadata `resolvePushScope(type, action)`.
- [ ] A5: Single dialog on admin delete; `confirm_delete` key. Build, specs. Update session-state.

### Plan 366 — Delete a supplier that's in use: warning, then admin-only "only me / everyone" (`plans/366-delete-in-use-supplier-warning-admin-scope.plan.md`)
- [ ] A1: Server: allowlist, trash collection and purge route, plus tests (against the isolated DB) (`server/routes/generic.js`, `server/constants/collections.js`, `server/test/**`).
- [ ] A2: Client services: `deleteFromMaster`, `deleteSupplierFromMaster`, own-products source strip.
- [ ] A3: `onDelete` / `onBulkDeleteSelected` flow, model field, dictionary keys.
- [ ] A4: Build, server tests, client specs. Manual test with 2 accounts. Update session-state.

### Plan 367 — Dashboard sub-nav: a "לוח בקרה" chip replaces the current page's chip; remove the four back buttons (`plans/367-dashboard-chip-replaces-current-page-chip-remove-back-buttons.plan.md`)
- [ ] A1: Tab-chips replacement logic plus spec (overview → 4 chips; metadata, suppliers, venues and trash → dashboard chip in the right index; query-only navigation updates) (`core/components/tab-chips/**`).
- [ ] A2: Remove the 4 back buttons, handlers and styles.
- [ ] A3: Specs and e2e cleanup; P1 style.
- [ ] A4: Build, specs, icons lint, check on phone and desktop. Update session-state.

### Plan 368 — Product form responsive on mobile and tablet (`plans/368-product-form-responsive-mobile-tablet.plan.md`)
- [ ] A1: Un-nest the media blocks; verify they apply (DevTools computed styles) (`product-form.component.scss`).
- [ ] A2: ≤900px tablet layout, including collapsible full width and the scaling row in 2 rows.
- [ ] A3: ≤768px phone layout, including padding, actions wrap and the override input.
- [ ] A4: Remove dead rules. Build, specs. Check at 360, 414, 800 and 1280px with an expanded allergens field and a product with 2 purchase options. Update session-state.

### Plan 369 — Recipe builder: correct prompt and yield when switching dish ↔ preparation (`plans/369-recipe-builder-type-toggle-prompt-and-yield.plan.md`)
- [ ] A1: Yield manager caching and correct conversions, plus spec (`recipe-yield-manager.util.ts`, spec).
- [ ] A2: `isExistingRecord` input; toggle prompt logic; dictionary keys (`recipe-header/**`, `recipe-builder.page.*`).
- [ ] A3: Build, specs. Manual test of new and existing, both directions. Update session-state.

### Plan 370 — AI recipe generation: realistic portion and ingredient ratios, with tests (`plans/370-ai-recipe-generation-realistic-portions-with-tests.plan.md`)
- [ ] A1: Extract the helpers into `ai-recipe-helpers.js`; `ai.js` imports them; offline tests for the existing behavior (pass before any change).
- [ ] A2: Prompt rules, `selectShots`, temperature (`server/routes/ai.js`).
- [ ] A3: The `implausible_portion_weight` warning, server and client mirror, plus tests and the dictionary key.
- [ ] A4: Live eval script. Run it locally with the key and paste the pass-rate table into the session state (`server/scripts/ai-eval-recipes.js`).
- [ ] A5: Build, server tests. Update session-state.

### Plan 371 — Venues A: hours on the card, discreet select checkbox, responsive form, unsaved-changes guard (`plans/371-venues-a-card-hours-select-checkbox-responsive-form-guard.plan.md`)
- [ ] A1: `venue-hours.util.ts` plus spec; card and detail use it.
- [ ] A2: Checkbox visibility and position on cards (`venue-list/**`).
- [ ] A3: Responsive venue form (`venue-form.component.scss`).
- [ ] A4: Guard contract on `VenueFormComponent` plus routes, with a spec (dirty → `hasRealChanges` true; after save → `isSubmitted`) (`venue-form/**`, `app.routes.ts`).
- [ ] A5: Build, specs. Check at 360px and 1280px, touch and mouse. Update session-state.

### Plan 372 — Venues B: multiple contacts and an interactive days/hours picker (`plans/372-venues-b-multiple-contacts-hours-picker.plan.md`)
- [ ] A1: Schema and model additions; `build:schemas`; server validation test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [ ] A2: `venue-hours.util` `toDisplay` / `parseLegacy` plus spec (Hebrew range forms, midnight crossing, unparseable).
- [ ] A3: `HoursEditorComponent` plus spec; wire into the venue form; hydrate and save both shapes (`shared/hours-editor/**`, `venue-form/**`).
- [ ] A4: Contacts FormArray, legacy hydrate, save mirror, detail list (`venue-form/**`, `venue-detail/**`).
- [ ] A5: Build, specs. Open 2 existing venues (one with free-text hours), edit and save, check no 400s. Update session-state.

### Plan 373 — Venues C: tour videos (links with a visit date) and "save my current location" (`plans/373-venues-c-tour-videos-current-location.plan.md`)
- [ ] A1: Schema and model; `build:schemas`; server test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [ ] A2: Videos FormArray, plus the detail list (`venue-form/**`, `venue-detail/**`).
- [ ] A3: Geolocation button and state, plus the detail navigate links.
- [ ] A4: Build, specs. Phone test over HTTPS (geolocation needs a secure context; localhost is fine). Update session-state.

### Plan 374 — Venues D: separate infrastructure from regular equipment in the venue form (`plans/374-venues-d-infrastructure-vs-equipment-groups.plan.md`)
- [ ] A1: Computeds and the transient `group` control; hydrate grouping; payload strip (`venue-form/**`).
- [ ] A2: Two-group template with correct index mapping; detail split (`venue-form/**`, `venue-detail/**`).
- [ ] A3: Equipment-form infrastructure hint (`equipment-form/**`).
- [ ] A4: Build, specs (hydrate grouping, payload has no `group`). Edit an existing venue and save, no 400. Update session-state.

### Plan 376 — Dish types cleanup: keep only real dish types, remap recipes safely (decision gate first) (`plans/376-dish-types-cleanup-remap-recipes-decision-gate.plan.md`)
- [ ] A0: Decision gate: show the table and the a/b question, then STOP.
- [ ] A1: Pure mapping module plus test; script with dry-run, backup check and log (`server/scripts/cleanup-dish-types.js`, `server/test/**`).
- [ ] A2: Dry-run local; show counts to Dandan; STOP for go.
- [ ] A3: Code seed lists, dictionary `main_dish`, safe display (`metadata-registry.service.ts`, `scripts/migrate-labels-to-courses.mjs`, `recipe-header/**`, `recipe-book-list/**`).
- [ ] A4: `--write` on local; verify in app (recipe book filters, recipe builder select, metadata list).
- [ ] A5: Hand Dandan the exact PowerShell commands for the Atlas backup, dry-run and write; record results. Update session-state.

### Plan 377 — Units A: rename and edit a unit, with cascade to all my products and recipes (`plans/377-units-a-rename-edit-unit-cascade-own-data.plan.md`)
- [ ] A1: Registry `renameUnit` / `updateUnitRate` plus spec (`unit-registry.service.*`).
- [ ] A2: `countUnitUsage` and `cascadeRenameUnitForAll` plus specs, covering all fields (`kitchen-state.service.*`).
- [ ] A3: Metadata UI: edit for non-system units; unit-creator edit mode; confirms (`metadata-manager/**`, `shared/unit-creator/**`).
- [ ] A4: Delete in-use check covers recipes.
- [ ] A5: Build, specs. Manual test against the isolated DB: rename a custom unit used in 2 products and 1 recipe; check the cost is unchanged. Update session-state.

### Plan 378 — Units B: admin "for everyone" when adding, renaming, editing or deleting a unit (`plans/378-units-b-admin-for-everyone-unit-changes.plan.md`)
- [ ] A1: Server route plus system-unit constant plus tests (isolated DB) (`server/routes/generic.js`, `server/test/**`).
- [ ] A2: Client adapter, storage and registry plumbing (`http-storage.adapter.ts`, `async-storage.service.ts`, `unit-registry.service.*`).
- [ ] A3: Metadata scope prompt for units; wire the ops; global dictionary on "everyone" (`metadata-manager.page.component.*`).
- [ ] A4: Build, server and client tests. Manual test: admin renames a custom unit for everyone → a new signup sees the new unit. Update session-state.

### Plan 380 — Workflow Kit Validation Round 1 Fixes
- [x] A1: take-plan — squash-merge detection via the merged GitHub PR (head must match); delete the stale local branch and its old remote branch, start fresh; release any merged current branch (not only `feat/`); delete the session-state pointer on claim; one server line (`started` / `kept`) — `scripts/take-plan.mjs`
- [x] A2: Session-state pointer ignored when it names another branch's file — `scripts/session-state-path.mjs`
- [x] A3: Branch's plan wins over a mismatched `.worktree-plan`; `--list` flags it — `scripts/lib/slot.mjs`
- [x] A4: Drift check falls back to the commit that added the plan; save-plan always writes `Snapshot:` — `scripts/scope-check.mjs`, `.claude/skills/save-plan/SKILL.md`
- [x] A5: `git fetch origin --prune` after a slot merge — `docs/agent/standards-git.md`, `docs/agent/ship-regular.md`
- [x] A6: Validation after merge goes through the Planner, no second PR — `docs/agent/job-validation.md`
- [x] A7: `scripts/next-plan-number.mjs` (plans + `<type>/NNN-*` branches); save-plan numbering calls it; manifest row + `kit-owned.json` — `scripts/next-plan-number.mjs`, `docs/workflow-kit/**`, `docs/agent/workflow-map.md`
- [ ] A8: Checks + `/ship`; Dandan commits the kit repo.

### Plan 382 — Client log ingest + Mongo sink (replace dev log server) (`plans/382-client-log-ingest-mongo-sink.plan.md`)
- [ ] A1: Zod `LogEventSchema` + export; `npm run build:schemas` passes (`shared/schemas/entities/log-event.schema.ts`, `shared/schemas/index.ts`).
- [ ] A2: `server/services/log-sink.js` + indexes in `server/db.js`.
- [ ] A3: `server/routes/log.js` (optionalToken → rateLimit → json 16kb → validate → sink → 202); mount in `server/app.js`; global error handler writes to sink.
- [ ] A4: `server/test/log-route.test.js` (supertest + mongodb-memory-server, same helpers as `generic.test.js`): 202 valid; 400 bad `event` pattern; 400 oversized context; 429 after 60 in a minute; `info` not persisted by default, persisted with `LOG_PERSIST_INFO=1`; `userId` set when Bearer token present, `null` when absent.
- [ ] A5: `LoggingService` rewrite (`sendToServer`, token, back-off, flood guard, `url`) (`src/app/core/services/logging.service.ts`).
- [ ] A6: Interceptor fix `endsWith('/api/v1/log')` (`src/app/core/interceptors/auth.interceptor.ts`).
- [ ] A7: Remove `logServerUrl` ×5 (`src/environments/*.ts`), delete `scripts/log-server.js`, npm script (`package.json`), `.gitignore` block.
- [ ] A8: Docs + ADR 0016 + gotcha supersede + CHANGELOG + tech-stack.
- [ ] A9: `ng build`, `npm --prefix server test`, the `rg` zero-match check, manual [human] check.

### Plan 383 — Structured server logging: pino + request ids (delivers 321 §7e early) (`plans/383-structured-server-logging-pino-request-ids.plan.md`)
- [ ] B1: add `pino`, `pino-http` (deps) and `pino-pretty` (devDep) in `server/package.json`; `server/logger.js` with redaction + Mongo bridge.
- [ ] B2: `pino-http` in `server/app.js` (replace morgan, `genReqId`, `X-Request-Id`, ignore list, `exposedHeaders`); remove `morgan` dependency.
- [ ] B3: migrate `server/routes/generic.js` (incl. `PERF_LOG` → debug event) and `server/db.js`.
- [ ] B4: migrate `server/routes/auth.js`, `server/routes/admin.js`, `server/middleware/**`, `server/services/**`.
- [ ] B5: migrate `server/routes/ai.js` (largest; keep `logTag` semantics as the `event` prefix).
- [ ] B6: global error handler + `server/index.js`; `render.yaml` cleanup.
- [ ] B7: client — interceptor `requestId` (`auth.interceptor.ts`), `logging.service.ts` pass-through.
- [ ] B8: ESLint `no-console` scoped rule (`server/eslint.config.mjs`); fix anything it catches.
- [ ] B9: `server/test/request-id.test.js` + test helper for capturing pino output (`server/test/helpers/**`).
- [ ] B10: docs/patterns mapping, standards, tech-stack, 321 checklist, CHANGELOG; run all [auto] criteria.

### Plan 384 — Logs in the AI workflow: query script, slot log retention, command wiring (`plans/384-logs-in-ai-workflow-query-script-slot-retention.plan.md`)
- [ ] C1: `scripts/lib/log-format.mjs` normaliser (client-echo JSON, pino JSON, raw passthrough) + unit-ish self-test via `node --test` if cheap.
- [ ] C2: `scripts/log-query.mjs` Mongo mode (URI resolution, filters, `--summary`, `--json`, limits).
- [ ] C3: `--file` mode + `--since=plan-start` (`scripts/log-query.mjs`).
- [ ] C4: `scripts/take-plan.mjs` rotation + `.slot-plan-start`; `.gitignore`; prune (`scripts/prune-old-sessions.sh`).
- [ ] C5: wire `.claude/commands/fix.md`, `auto-solve.md`, `review-it.md`, `.claude/skills/preflight/SKILL.md`, `.claude/references/prd-template.md`, `AGENTS.md`.
- [ ] C6: `package.json` script, `docs/brain/patterns/log-query-usage.md`, `docs/workflow-kit/manifest.md`, CHANGELOG; run all [auto] criteria.

### Plan 386 — One write-ownership rule (canWrite) + "remove for me" / "rename for me" on shared terms (`plans/386-write-ownership-rule-can-write-remove-for-me.plan.md`)
- [ ] A1: `can-write.js` + unit tests. Refactor `generic.js` PUT/DELETE/bulk-DELETE to use it. Existing `generic.test.js` + `taxonomy-terms-api.test.js` stay green (`server/utils/can-write.js`, `server/routes/generic.js`, `server/test/**`).
- [ ] A2: Schema `hidden` + `displayName`. POST override rules (allowed only over a master key; `hidden` blocked when own docs reference it; `displayName` no ref check). PUT own override. GET filtering + `displayName` merge + `includeHidden`. Restore/reset clears the field, deletes the override when empty. Tests for each, including: user B still sees the term user A hid, and still sees the original name of the term user A renamed (`taxonomy-term.schema.ts`, `generic.js`, `server/test/**`).
- [ ] A3: `PermissionService` + spec. `TaxonomyStore.canEdit` delegates. `hideForMe` / `restoreForMe` / `renameForMe` / `resetNameForMe` + spec. Facades show `displayName ?? key` (`permission.service.ts`, `taxonomy-store.service.ts`, registry facades).
- [ ] A4: Metadata Manager main page: non-admin "rename for me" / "remove for me" / "reset name", admin ternary for remove and rename (`src/app/pages/metadata-manager/**`).
- [ ] A5: Same for prep-category, section-category and menu-type UIs.
- [ ] A6: Dictionary keys (append-only) (`public/assets/data/dictionary.json` — hotspot).
- [ ] A7 (P1): Removed-items disclosure + restore.
- [ ] A8: ADR 0016, AGENTS.md hard-rule line, gotcha, brain index.
- [ ] A9: Grep for any place that renders a term key without going through the facades (so a `displayName` override wouldn't show). If it's outside the scope, raise it via the Escalation Protocol.

### Plan 387 — Architecture guard: invariants registry, Architecture Impact gate, invariant tests (`plans/387-architecture-guard-invariants-gate.plan.md`)

- [ ] A1: Write `docs/brain/invariants.md` (format + 6 seed invariants + `Enforced from plan: 388`).
- [ ] A2: Write `scripts/lib/invariants.mjs` (parse the registry + a plan's Architecture Impact).
- [ ] A3: Add `scope-check.mjs --arch --plan` (block) and `--arch --diff` (warn, including decision-without-adr); update the usage header.
- [ ] A4: Wire the gate into save-plan Phase 2, `take-plan.mjs`, `ship-prep.mjs`, `/review-it` step 3.
- [ ] A5: Add the `## Architecture Impact` section to `prd-template.md`, the line to `hld-template.md`, and the Architect step to `plan.md`.
- [ ] A6: Add the AGENTS.md hard-rule bullet and repoint the `AGENTS.md:57` row.
- [ ] A7: Write `server/test/invariants.test.js` (INV-1, INV-2, INV-4).
- [ ] A8: Write ADR 0017, add the brain index line and the gotcha, update `docs/agent/workflow-map.md`.
- [ ] A9: Classify the new files in the workflow-kit manifest.
- [ ] A10 (P1): Add `node --test` script tests + `npm run test:scripts`.

### Plan 388 — On-demand remote port for validation (`plans/388-on-demand-remote-port.plan.md`)
- [ ] A1: Proxy module + `node --test` suite (`scripts/lib/remote-proxy.mjs`, `scripts/lib/remote-proxy.test.mjs`).
- [ ] A2: CLI on/off/status + state file + TTL cleanup; `.gitignore` (`scripts/remote-port.mjs`, `.gitignore`).
- [ ] A3: Remote-aware `environment.local.ts`; `generateEnvironmentSlot()` regex; regenerate and check `environment.slot.ts`.
- [ ] A4: `/remote` command, `AGENTS.md` row, `commands.md` line, `docs/agent/remote-port.md`.
- [ ] A5: Build + tests; live check from this slot; update session-state.

### Plan 389 — Workflow Kit Validation Round 2 Fixes (`plans/389-workflow-kit-validation-round-2-fixes.plan.md`)
- [ ] A1: Slot frees itself after merge — `standards-git.md` "Merging from a slot" ends with `node scripts/free-merged-slots.mjs`; `session-startup.sh` runs it (short timeout) before the role check so a merged slot starts idle (`scripts/session-startup.sh`, `docs/agent/standards-git.md`)
- [ ] A2: Planner folder stays on `main` — `branch-guard.sh` denies (no auto-switch) a non-plan write in the Planner folder on `main`, telling the agent to use a slot or ask the Human for an explicit branch; `session-startup.sh` warns when the Planner folder is not on `main` (`scripts/branch-guard.sh`, `scripts/session-startup.sh`, `.claude/commands/plan.md`)
- [ ] A3: Guards follow the target file's worktree — when the file is in another worktree that has the same guard script, `branch-guard.sh` / `scope-guard.sh` hand the tool input to that worktree's guard (`scripts/branch-guard.sh`, `scripts/scope-guard.sh`)
- [ ] A4: `docs/brain/**` always allowed in a slot (append-only) (`scripts/scope-check.mjs`)
- [ ] A5: `/workflow-report` command with the round-2 report prompt (`.claude/commands/workflow-report.md`, `.claude/commands/commands.md`)
- [ ] A6: `PYTHONIOENCODING=utf-8` in `.claude/settings.json` `env`
- [ ] A7: Order check treats a superseded/done/archived prerequisite plan as satisfied (`scripts/take-plan.mjs`)
- [ ] A8: Docs: ledger sync is the todo-sync Action, not a Planner step (`.claude/commands/take-plan.md`, `.claude/commands/plan.md`, `.claude/skills/save-plan/SKILL.md`, `docs/agent/job-validation.md`, `docs/agent/workflow-map.md`)
- [ ] A9: Kit manifest + kit-owned list for the new command; all checks; session-state

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
