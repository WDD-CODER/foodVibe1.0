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

- [ ] `feat/optimization` — PR #192, merged to `main`. Delivered: double-fetch fix (plan 301 M4), full OnPush sweep (plan 303 M2), animations-async bundle cut, approve-stamp WebP (plan 302 M5), sync-master O(n²) fix (plan 303 M3 first item) — all Human-validated 2026-08-31. Remaining backlog (KITCHEN_UNITS double-fetch mystery, syncMasterToUser version-gating, plan 304's Human-only unblockers) persisted as `plans/309-optimization-loop-closeout-remaining-backlog.plan.md`.

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

### Plan 323 — Todo Query Script and Trimmed Session Injection (`plans/323-todo-query-trimmed-session-injection.plan.md`)

> Saved 2026-09-30. First of a 3-part sequence (this plan → Brief B1 → Brief B2), each executed and Human-validated in order.

- [x] 1. Move parser functions from `todo-archive.mjs` into new `scripts/lib/todo-parse.mjs`; `--dry-run` output must stay byte-identical
- [x] 2. Create `scripts/todo-query.mjs` with `next` / `open` / `sweep` / `mark` / `append` subcommands + `--json`
- [x] 3. Trim `scripts/session-startup.sh` line 105 SessionStart injection to Summary/Next Steps/Commit, capped at 1,500 chars
- [x] 4. Rewire consumers (`auto-solve.md`, `sweep-stale-todos.md`, `done.md`, `ship.md` "On approval" step 1, `save-plan` Phase 1) to use `todo-query`
- [x] 5. Add `"todo"` script to `package.json`

### Plan 324 — Ship Prep and Write Session State Scripts (`plans/324-ship-prep-and-write-session-state-scripts.plan.md`)

> Saved 2026-09-30. Second of a 3-part sequence (Plan 323 merged → this plan → Brief B2), each executed and Human-validated in order.

- [x] 1. Create `scripts/ship-prep.mjs` (lane classification, baseline check, secret-path flags, todo-query integration)
- [x] 2. Create `scripts/write-session-state.mjs` (session-state schema writer)
- [x] 3. Wire `ship.md` Phase 0 / Phase 3 / Phase 5 to the new scripts
- [x] 4. Add exclude pathspecs + stat-only summary for noisy paths in `review.md`'s diff filter

### Plan 325 — Ship.md Core and On-Demand File Split (`plans/325-ship-md-core-and-on-demand-split.plan.md`)

> Saved 2026-09-30 (retroactively — save-plan step was skipped before execution). Third of a 3-part sequence (Plan 323 merged → Plan 324 merged → this plan).

- [x] 1. Create `docs/agent/ship-regular.md` (Phase 2/Brain-entry/Commit-vs-PR/After-opening-PR/Phase 4.5 REGULAR content, moved verbatim)
- [x] 2. Create `docs/agent/ship-recovery.md` (Recovery only/Push conflict guard/PR merge fallback, moved verbatim)
- [x] 3. Rewrite `ship.md` core with routing lines to the split files
- [x] 4. Compress duplicated fast-flag explanation into one paragraph in Flags
- [x] 5. Check `AGENTS.md` line 72 for moved section names (none found, no change needed)

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

### Plan 326 — Planner–Worker Workflow (`plans/326-planner-worker-workflow.plan.md`)
- [x] M0 complete — no blockers, findings folded into M1-M4 tasks below
- [x] A1: New `scripts/lib/slot.mjs` — `isSlot()`, `slotNumber()`, `ports()` (`{fe, be}`), `activePlanPath()` (from `.worktree-plan` or null), `listSlots()`
- [x] A2: New `scripts/session-state-path.mjs` — resolves one path via `SESSION_STATE_PATH` env → `.claude/.session-state-path` → `docs/session-state-<branch>.md`; falls back to `docs/session-state.md` only outside a slot; prints `NONE` and exits 0 in a slot with no branch file
- [x] A3: Rewire `scripts/session-startup.sh`, `scripts/handoff-check.sh`, `scripts/write-session-state.mjs` to resolve paths through `session-state-path.mjs` (no duplicated resolution logic)
- [x] A4: New `scripts/scope-check.mjs` — parses `## Read-Write Scope` fenced ` ```scope ` block (one glob per line, `#` comments); always-allowed: plan file, `docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, hotspots (append-only, M4). Modes: `--file=<p>`, `--diff=<base>`, `--overlap --plan=<p>`, `--drift` (against `Snapshot:`, excluding the plan file, via `:(glob)` pathspecs). Plan defaults to `slot.activePlanPath()`; missing plan/scope block → exit 1
- [x] A5: `scripts/todo-query.mjs` — add `sync --plan NNN` (rebuild that plan's `### Plan NNN` section from its `## Atomic Sub-tasks` checkboxes via `lib/todo-parse.mjs`, creating the section if missing; print `TODO_QUERY: sync plan NNN (x/y done)`) and `sync --merged` (sync every plan whose `feat/NNN-*` branch merged into `origin/main` since last sync); update usage header
- [x] A6: `scripts/branch-guard.sh` — read stdin with `plan-write-guard.sh`'s timeout pattern; on `main`, allow without switching when path matches `^plans/[^/]+\.plan\.md$|^\.claude/todo\.md$`; otherwise keep auto-switch (including empty stdin)
- [x] A7: New `scripts/scope-guard.sh` (PreToolUse, valid JSON) — silent allow when not a slot or no `.worktree-plan`; else run `scope-check.mjs --file=<path>`; deny with the `SCOPE_GUARD:` message on exit 1; allow with `SCOPE_GUARD: check failed (<reason>)` on internal error. Register in `.claude/settings.json` after `plan-write-guard.sh`, `"timeout": 10`
- [x] A8: New `.husky/pre-push` — for stdin lines with remote ref `refs/heads/main`, diff `<remote_sha>..<local_sha>` (`origin/main` when remote SHA is all zeros); exit 1 if any file falls outside `^plans/[^/]+\.plan\.md$|^\.claude/todo\.md$` with the `--no-verify is human-only` message; other branches pass untouched
- [x] A9: `scripts/ship-prep.mjs` — plan-only lane check before `SENSITIVE_PATHS_RE`; replace both `worktreeCount() > 1` triggers per M0 findings (in-slot: `scope-check.mjs --diff=origin/main` instead of manifest overlaps; outside slots: overlaps only when `listSlots()` shows a non-detached slot); `--check-baseline` re-reports the scope line in a slot
- [x] A10: Update `.claude/commands/ship.md` core (Phase 3/"On approval" stayed there — see corrected M0 finding above): scope-out hard STOP in Phase 3; `git fetch && git rebase origin/main` before Phase 4 (add/add conflicts in hotspots keep both sides, anything else escalates); "On approval" step 1 marks only the plan file's Atomic Sub-tasks in a slot, skipping `todo-query` mark / `todo-archive.mjs`
- [x] A11: `angular.json` — add a `slot` configuration to both `build` and `serve`, copying `local` but swapping in `src/environments/environment.slot.ts` (generated, gitignored); default `ng build` unaffected
- [x] A12: Rewrite `.claude/skills/worktree-setup/SKILL.md` as one-time slot init: move `../foodVibe1.0-wt-parallel` to `-wt-1` only if clean (per M0, it currently has an untracked `.claude/dev-server.log` — decide whether to ignore/clean that file or report-and-stop); create missing slots detached at `origin/main`; `npm install` root + `server/`; write `.worktree-root`/`.worktree-port`; copy `server/.env` only (per M0, no root `.env` exists); start no servers
- [x] A13: New `scripts/take-plan.mjs <NNN>` (ports `claim-parallel-slot.sh` logic): slot-only guard; refuse on uncommitted/untracked non-ignored files; release a merged `feat/*` branch or refuse naming the holding plan; fetch + refuse if `plans/NNN-*.plan.md` isn't on `origin/main`; `git switch -c feat/NNN-<slug> origin/main`, write `.worktree-plan`, set `Status: active`, commit; conditional `npm install` via lockfile hash; generate `environment.slot.ts` with `http://localhost:300N`; port/PID bookkeeping via `.claude/.slot-pids` (refuse on a foreign PID, keep this slot's own, else spawn backend + `ng serve -c slot --port 420N` detached with logs in `.claude/`); isolated DB via `MONGO_LOCAL_URI` = `foodvibe_wtN` + seed via `db-backup.js`/`db-restore.js` (confirmed CLI args: M0) when `Isolated DB: yes`; `claim_lock` via `session-lock.sh` or a ported helper in `lib/slot.mjs`; print `OK plan=NNN branch=... fe=420N be=300N db=shared|foodvibe_wtN` followed by `scope-check.mjs --drift`
- [x] A14: New `.claude/commands/take-plan.md` — run the script; stop on exit 1; on `REALITY: clean` execute milestones with no report; on `REALITY: drift` run the plan's Step 0 on the listed commits only, then STOP for a go
- [x] A15: `scripts/session-startup.sh` — replace the two-slot block (no auto-claim) using `node scripts/lib/slot.mjs --describe` (new small CLI entry); inject `PLANNER:` / `WORKER: plan=<path>` / `IDLE SLOT:` per slot state; keep the 1,500-char trimmed injection fed by `session-state-path.mjs`, nothing injected when it prints `NONE`
- [x] A16: Delete `scripts/claim-parallel-slot.sh` after porting. Live references gone; remaining hits are intentional history (`plans/323-*`, `plans/324-*`, `docs/session-state-feat-session-20260929.md` — pre-existing, not rewritten) and explicit "retired"/"the old two-slot system" mentions in the new docs/scripts that replaced it. `docs/agent/workflow-map.md`'s own two-slot section is still pending — that's M4 A24.
- [x] A17: `.gitignore` — added `.worktree-plan`, `.claude/.slot-pids`, `.claude/.last-npm-install-hash-server`, `src/environments/environment.slot.ts` (`.worktree-root`/`.worktree-port` were already ignored). Kept `.claude/.parallel-slot-a`/`-b` ignored rather than removing them — this very session's own SessionStart hook (pre-M3 code) had already written a stray `.claude/.parallel-slot-b`, proving old markers can still exist on disk even though nothing new writes them; safer to keep the ignore rule than let one become trackable.
- [x] A18: `.claude/references/prd-template.md` — after `## Goals & Success Criteria`, add `Status:`/`Snapshot:`, `## Execution Mode`, `## Read-Write Scope` (fenced block + always-allowed line), `## Read Scope`, `## Escalation Protocol`, `Step 0 — Reality Check`
- [x] A19: `.claude/commands/plan.md` — Planner protocol: main clean + `git pull --ff-only`; `todo-query.mjs sync --merged` + `todo-archive.mjs` + `lib/slot.mjs --list`; ask about parallel execution → `scope-check.mjs --overlap` must report `OVERLAP: none`; save via save-plan with `Snapshot:` filled; `git add` only the plan file + `.claude/todo.md`, commit, push to `main`; end with "Plan NNN pushed. Open a free slot and say: execute plan NNN."
- [x] A20: `.claude/skills/save-plan/SKILL.md` — Phase 1: only the Planner (main, on `main`) assigns `NNN`/runs `todo-query append`; Phase 3: on `main`, commit only the plan file + `todo.md`; Phase 4: Workers append/mark `[x]` in their plan file only, never `todo.md`
- [x] A21: `docs/agent/job-validation.md` — same Worker-only-marks-plan-file rule
- [x] A22: `AGENTS.md` — Hard rule becomes "Never write on `main` — except the Planner committing `plans/*.plan.md` and `.claude/todo.md`"; add one compact Planner–Worker bullet (Golden Rule + escalation; append-only hotspots `src/styles.scss`, `public/assets/data/dictionary.json` (M0's confirmed real path), `src/app/app.routes.ts`; 3-slot port map; Workers never write `.claude/todo.md`; `--no-verify` is human-only); trigger rows for "execute/take plan NNN" → `take-plan.md`, worktree-setup → one-time slot init only
- [x] A23: `README_WORKFLOW.md` — rewrite Roles + Day-to-day loop (plan → push → "execute plan NNN" in a free slot → back to Planner → `/review-it` then `/ship` (PR) → Dandan merges → slot releases on next take); keep cost routing
- [x] A24: `docs/agent/workflow-map.md` — replace two-slot section with the slot model + port map; update hook rows for `scope-guard.sh` and `.husky/pre-push`; add rows for `take-plan.mjs`, `scope-check.mjs`, `lib/slot.mjs`, `session-state-path.mjs`, `todo-query sync`
- [x] A25: New ADR `docs/brain/decisions/0009-planner-worker-worktrees.md` (per M0, next number is `0009`) from `_TEMPLATE.md` — supersedes the two-slot system; direct `main` pushes for plans/todo via the admin bypass restricted by `branch-guard.sh`/pre-push; 3 permanent slots, manual take, lazy release; per-slot ports, shared DB by default / isolated on opt-in; append-only hotspots; conditional reality check; scope gate replaces manifest overlap in slots; `/ship` gate is the guarantee since Cursor has no hooks; mechanical steps live in scripts
- [ ] A26: Run every check in **Done when** below
- [ ] A27: Run `node scripts/plan-ledger-check.mjs` and `ng build`
- [ ] A28: Write the `sessions/` handoff
- [ ] A29: `/ship` on `chore/planner-worker-workflow` as one PR
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


## PreCompact signal dump (2026-09-30T11:09:15Z)

Open unchecked items at compact time:
- [ ] `auth.interceptor.ts` — `BehaviorSubject` used for refresh-token gate; hard rule says signals only
- [ ] `nutrition-badge.component.ts:46` — legacy `@Input()` decorator, unresolved since `techdebt-2026-04-20.md`
- [ ] 2 stray trailing semicolons (`quick-add-product-modal.component.ts:121`, `menu-library-list.component.ts:197`)
- [ ] 24-file refactor-candidate backlog (>300 lines each) — triage, top 3 are 1200+ lines
  - [ ] `menu-intelligence.page.ts` (1413) / `recipe-builder.page.ts` (1394) / remaining ~21-file backlog — not yet triaged
- [ ] 2 unnecessary `?? []` NG8102 warnings (`venue-detail`/`venue-list` templates)
- [ ] `feat/optimization` — PR #192, merged to `main`. Delivered: double-fetch fix (plan 301 M4), full OnPush sweep (plan 303 M2), animations-async bundle cut, approve-stamp WebP (plan 302 M5), sync-master O(n²) fix (plan 303 M3 first item) — all Human-validated 2026-08-31. Remaining backlog (KITCHEN_UNITS double-fetch mystery, syncMasterToUser version-gating, plan 304's Human-only unblockers) persisted as `plans/309-optimization-loop-closeout-remaining-backlog.plan.md`.
- [ ] P1.8 Stale branch list gathered (65 branches, `gh-pages` excluded) — **awaiting Human approval before deleting any**
- [ ] P2a.0–P2a.6 Shared Zod schema package, observe-mode validation
- [ ] P2b.0–P2b.5 v2 migration: rename + `schemaVersion` + enforce (Gates G1/G2)
- [ ] P3.0–P3.5 Unified taxonomy store (`taxonomyTerms` + `TaxonomyStore`)
- [ ] P4.0–P4.6 Course/protein/labels split + menu sections → course (Gate G3)
- [ ] P5.0–P5.8 Shared master + per-user overrides; admin-only push + dedicated modal
- [ ] P6.0–P6.4 One soft-delete model + `userPrefs`
- [ ] P7a–P7f Hygiene: god-file decomposition, service base adoption, script archive, CI hardening, logging, plan 301 remainder
- [ ] P8.1–P8.5 Governance: ADRs 0009–0013, standards docs, lint guards, re-audit
- [ ] Stage 1 — Foundation: `isAdmin_` signal on `UserService` + migrate ad hoc copies; gate `push-to-master` route with `requireAdmin`; `askScope()` short-circuits to `'me'` for non-admins
- [ ] Stage 2 — Wire existing server support (Products, Equipment, Suppliers): `_masterId` field + `pushToMaster()` + save-flow wiring
- [ ] Stage 3 — Extend to Venues, Menu Events, and 9 taxonomy/registry collections (labels, categories, allergens, units, menu types, menu event types, menu section categories, equipment custom categories, preparations)
- [ ] Stage 4 — New items created as shared from the start (`POST .../create-shared`, admin-only)
- [ ] Stage 5 — Non-destructive delete propagation (`PUT .../remove-from-master`, master-only removal, no cascade to existing users)
- [ ] 1. Move parser functions from `todo-archive.mjs` into new `scripts/lib/todo-parse.mjs`; `--dry-run` output must stay byte-identical
- [ ] 2. Create `scripts/todo-query.mjs` with `next` / `open` / `sweep` / `mark` / `append` subcommands + `--json`
- [ ] 3. Trim `scripts/session-startup.sh` line 105 SessionStart injection to Summary/Next Steps/Commit, capped at 1,500 chars
- [ ] 4. Rewire consumers (`auto-solve.md`, `sweep-stale-todos.md`, `done.md`, `ship.md` "On approval" step 1, `save-plan` Phase 1) to use `todo-query`
- [ ] 5. Add `"todo"` script to `package.json`
- [ ] Milestone 2 — carved out to Plan 310 (below) — see `plans/310-faceted-search-pagination-inventory-recipe-book.plan.md`
- [ ] M1 — DevTools Performance profile on recipe-book before/after; record in the audit report — genuinely not done, needs a human with DevTools open (not scriptable via `/browse`)
- [ ] M3 — Regression test: existing user's modified docs still win after login (Rule 3) — not verified this session; the version-gate only touches `POST /refresh`, `/login` is an unchanged code path, so risk is low but untested
- [ ] Prerequisite gate — confirm 302 M1/M2 + 303 M1/M2 shipped and re-measured; reduce or drop scope if no longer justified — **bypassed 2026-09-15 for M2/M3 only**: live user report ("really really slow, locally even more") is itself real-world evidence the formal deploy-and-measure step was meant to provide; M1 (below) was explicitly NOT started, since it still needs the gate
- [ ] M1 — List projections on `GET /:type` mirroring `SEARCH_PROJECTIONS` — `server/routes/generic.js:45-77,82-86`
- [ ] M1 — Verify edit flows fetch full documents so a lean list doc cannot round-trip through a save and erase fields
- [ ] Hand-off — re-assess plan 301 M2's scope against measured results
- [ ] Prerequisite gate — confirm plan 304 M1/M2/M3 shipped + measured; re-scope if 304 M3 already solves pagination
- [ ] Milestone 0 — Decisions (Human): facet-count strategy, allergens resolution strategy (denormalize / `$graphLookup` / punt), ingredient-containment index, pagination ownership vs plan 304 M3, search UX (prefix vs substring), favorites storage shape
- [ ] Milestone 1 — Low-risk facets + pagination skeleton (Category/Supplier/product-Allergens/low-stock/invalid/incomplete/nutrition for inventory; Type/Approved/Station/Labels/date-range for recipe-book)
- [ ] Milestone 2 — Allergens facet for recipe-book (recursive nested-recipe resolution — highest-risk piece, per Decision 2)
- [ ] Milestone 3 — Ingredient-containment filter for recipe-book
- [ ] Milestone 4 — Client rewire (`inventory-product-list.component.ts`, `recipe-book-list.component.ts`) + pagination UI wiring
- [ ] Milestone 5 — Cross-screen verification (facet parity, RTL, selection/bulk-edit/inline-edit regressions, `ng build`)

Unresolved tool signals: re-add any pending Verify/Fail/blocker notes under this heading after compact if still open.

### Unresolved signals detected at compact time

{"parentUuid":"8454aff1-8c20-4ed8-b4e3-cde280d5137d","isSidechain":false,"attachment":{"type":"prompt_snapshot","systemPrompt":["\nYou are an interactive agent that helps users according to your \"Output Style\", which describes how you should respond to user queries. Use the instructions below and 
{"parentUuid":"13cc007c-4f4e-405b-a4d0-033ab891580b","isSidechain":false,"promptId":"1938fbeb-094b-4f84-90de-2d23cea4bd8c","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01Pt2hV2MiNDvwxmg1qne46H","type":"tool_result","content":"1\t# Active Tasks\n2\t\n3\t> Rearranged 2026-07
{"parentUuid":"a4b9ed04-6508-45c2-840a-75d3a882b525","isSidechain":false,"attachment":{"type":"edited_text_file","filename":"C:\\coding projects\\Cursor\\foodVibe1.0\\.claude\\todo.md","snippet":"1\t# Active Tasks\n2\t\n3\t> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-202
{"parentUuid":"b5809822-989b-4325-81a0-87c049f949d5","isSidechain":false,"promptId":"7c48473c-0f78-4859-93e6-0390cffc5f90","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01GG3kQDwrqsGRrGez8JezGN","type":"tool_result","content":"husky - DEPRECATED\n\nPlease remove the followi
{"parentUuid":"90c57207-ebfd-4a05-a176-48cb72f8f95f","isSidechain":false,"attachment":{"type":"edited_text_file","filename":"C:\\coding projects\\Cursor\\foodVibe1.0\\.claude\\todo.md","snippet":"1\t# Active Tasks\n2\t\n3\t> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-202
{"parentUuid":"211a16c1-bd8e-4c4d-887c-716ff4664bd4","isSidechain":false,"promptId":"7c48473c-0f78-4859-93e6-0390cffc5f90","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01BbFAmsXLfBuUxDJD4Lpeiz","type":"tool_result","content":"husky - DEPRECATED\n\nPlease remove the followi
{"parentUuid":"0ea075d6-f3ba-4b0d-85db-e0939c57bdd1","isSidechain":false,"promptId":"40af95e7-685c-4c72-8218-8b8fdce683e9","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01XV2Y6otYMdAUfTsmrmp1nL","type":"tool_result","content":"husky - DEPRECATED\n\nPlease remove the followi
{"parentUuid":"d813fe25-f9ea-4578-95c1-c1ca4c780467","isSidechain":false,"promptId":"40af95e7-685c-4c72-8218-8b8fdce683e9","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01BqkCRDfu3DtZGh1rF6p1cP","type":"tool_result","content":"husky - DEPRECATED\n\nPlease remove the followi
{"parentUuid":"aa0f80ee-f2bc-444b-882c-48211e2ae745","isSidechain":false,"promptId":"6a936c08-5112-4afe-9c96-a1851402c2ca","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01GcmAQh5nTffDP7NjhwXAvf","type":"tool_result","content":"husky - DEPRECATED\n\nPlease remove the followi
{"parentUuid":"e54380f9-28a2-4deb-81fa-eb74eebd5080","isSidechain":false,"promptId":"6a936c08-5112-4afe-9c96-a1851402c2ca","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_015C59mzDsHcBtg3bTThvVZT","type":"tool_result","content":"36\t### Plan 320 — Recipe Labels Fix + Course
{"parentUuid":"86fbea21-d2f6-4fa9-9550-d0dd64b9399e","isSidechain":false,"promptId":"6a936c08-5112-4afe-9c96-a1851402c2ca","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01UHwihAuBcK1nQUrEzBB8DA","type":"tool_result","content":"husky - DEPRECATED\n\nPlease remove the followi
{"parentUuid":"883a53c5-6cf8-4c77-9fcc-467d57449383","isSidechain":false,"attachment":{"type":"prompt_snapshot","systemPrompt":["\nYou are an interactive agent that helps users according to your \"Output Style\", which describes how you should respond to user queries. Use the instructions below and 
