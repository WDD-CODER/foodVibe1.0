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
- [-] DROPPED (Human 2026-10-06) P2b.x Stray keys: `ingredients_` on 36 local products dropped in v2; `steps_[].cooking_time_minutes_` (4 Atlas recipes) kept as deprecated `cookingTimeMinutes` — **Human decides rename-vs-convert**
- [x] P3.0–P3.3 Taxonomy schema, 0003 migration (local + Atlas), server term API — PR #253
- [ ] P3.4 `TaxonomyStore` cutover DONE (PR #253) — REMAINING: shrink the 6 facades (`metadata-registry` 355 lines, `preparation-registry` 223, `unit-registry` 158, …) to ≤30 lines / inline; generic `taxonomy-kind-manager`
- [ ] P3.5 Drop old `KITCHEN_*` registry collections — also delete the now-dead server routes `registry-rename-master` / `registry-delete-master` and their unused `http-storage.adapter.ts` methods (client already goes through `TaxonomyStore`; reality check 2026-10-05)
> Related work outside the plan: Plan 385 (per-user write limit, server-owned rename re-key — merged PR #258), Plan 386 (`canWrite` + remove/rename "for me" on shared terms — draft, next), Plan 387 (architecture guard)
- [-] DROPPED (Human 2026-10-06) P4.0–P4.6 Course/protein/labels split + menu sections → course (Gate G3)
- [-] DROPPED (Human 2026-10-06) P5.0–P5.8 Shared master + per-user overrides; admin-only push + dedicated modal — now also owns Plan 322 Stages 2–5 + Plan 322-metadata M13
- [ ] P6.0–P6.4 One soft-delete model + `userPrefs`
- [ ] P7a–P7f Hygiene: god-file decomposition, service base adoption, script archive, CI hardening, logging, plan 301 remainder
- [ ] P8.1–P8.5 Governance: ADRs 0009–0013, standards docs, lint guards, re-audit

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

### Plan 342 — Form checkboxes → toggle chips (app-wide) (`plans/342-form-checkboxes-to-toggle-chips-app-wide.plan.md`)

- [x] A1: Supplier form delivery days (both branches) → chip group (`supplier-form.component.*`)
- [x] A2: Equipment form `isConsumable` and equipment-list inline-edit booleans → chips (`equipment-form.component.*`, `equipment-list.component.*`)
- [x] A3: Product form special price, quick-add allergens, quick-edit suppliers → chips (`product-form.component.*`, `quick-add-product-modal/**`, `quick-edit-product-panel/**`)
- [x] A4: Label-creation triggers and venue-form active → chips (`label-creation-modal/**`, `venue-form.component.*`)
- [x] A5: Delete the dead local classes and `.c-filter-option` (`src/styles.scss`). Run `rg -n 'type="checkbox"' src/app --glob '*.html'` and confirm only list-row-checkbox remains.
- [ ] A6: Build and run specs. Update the session-state file.

### Plan 346 — Lists: sticky table header and pagination at the top (`plans/346-lists-sticky-table-header-and-pagination-at-top.plan.md`)
- [x] A1: list-shell: `.table-top` wrapper, `[shell-pagination]` slot, sticky styles, `--list-sticky-top`, `overflow:clip`, grid rows (`src/app/shared/list-shell/**`).
- [x] A2: Move pagination in inventory and recipe-book into the slot; adjust `.c-pagination-controls` (`inventory-product-list.component.html/.scss`, `recipe-book-list.component.html/.scss`, `src/styles.scss`).
- [x] A3: Verify suppliers and equipment (no pagination) get the sticky column header with no empty gap.
- [ ] A4: Build and run specs. Check at 360px, 800px and 1280px. Update the session-state file.

### Plan 347 — Mobile keyboard: push content up, keep the focused field visible (`plans/347-mobile-keyboard-keep-focused-field-visible.plan.md`)
- [x] A1: Viewport meta (`src/index.html`).
- [x] A2: `KeyboardInsetService` plus a spec (mock `visualViewport`: inset computed, class toggled, no-op without the API). Inject it in `AppComponent` (`keyboard-inset.service.ts/.spec.ts`, `app.component.ts`).
- [x] A3: The `body.kb-open` rules and `.as-modal` / `.c-modal-card` inset handling (`src/styles.scss`).
- [x] A4: `vh` → `dvh` in the listed files.
- [ ] A5: Build and run specs. Update the session-state file.

### Plan 349 — Shared column carousel (one component for every list) and roomier recipe-book carousel (`plans/349-shared-column-carousel-roomier-recipe-book-carousel.plan.md`)
- [x] A1: Build the group directive, header, cell and slide directive, with specs: next/prev wrap or clamp, header and cell share the index, RTL direction (`src/app/shared/column-carousel/**`).
- [x] A2: Migrate recipe-book, including the spacing changes (`recipe-book-list/**`).
- [x] A3: Migrate inventory, suppliers and equipment (`inventory-product-list/**`, `supplier-list/**`, `equipment-list/**`).
- [x] A4: Delete the old components; `rg` for leftovers (`shared/carousel-header/**`, `shared/cell-carousel/**`).
- [ ] A5: Build and run specs. Check at 360px, 768px and desktop (the carousel is hidden on desktop as today). Update the session-state file.

### Plan 350 — Shared scroll rail for horizontal strips (`plans/350-shared-scroll-rail-for-horizontal-strips.plan.md`)
- [x] A1: `app-scroll-rail` component plus its spec (`src/app/shared/scroll-rail/**`).
- [x] A2: Migrate the metadata jump-nav; delete the old logic (`metadata-manager.page.component.*`).
- [x] A3: Migrate tab chips; adjust the `.c-tab-chips` rules (`core/components/tab-chips/**`, `src/styles.scss`).
- [x] A4: Migrate the dish data strip (`menu-dish-row/**`).
- [ ] A5: Build and run specs. Check at 360px and 1280px in RTL. Update the session-state file.

### Plan 351 — Dashboard "פעילות אחרונה": readable change history (`plans/351-dashboard-recent-activity-readable-change-history.plan.md`)
- [x] A1: `activityValue` pipe plus its spec: supplier ids → names, key translation, unknown id, empty (`core/pipes/activity-value.pipe.ts/.spec.ts`).
- [x] A2: Switch the popover to the pipe (`shared/change-popover/**`).
- [x] A3: New entry template and styles; delete the strip, scroll method and `.change-tag` styles (`dashboard-overview/**`).
- [x] A4: Relative time plus the optional day grouping (`dashboard-overview/**`).
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

### Plan 362 — List overlays escape the table: row actions menu and edit modal render at body level (`plans/362-list-overlays-row-actions-menu-edit-modal-body-level.plan.md`)
- [ ] A1: Move `RowActionsMenuComponent` to CDK Overlay, with a spec (opens, closes on backdrop, `open(anchor)` works) (`shared/row-actions-menu/**`).
- [ ] A2: Move the list-shell `[shell-modal]` slot out of `.list-container` (`shared/list-shell/**`).
- [ ] A3: Gotcha entry (`docs/brain/gotchas.md`).
- [ ] A4: Build, specs. Check inventory, recipe-book, suppliers and equipment at 360px, 800px and 1280px. Update session-state.

### Plan 366 — Delete a supplier that's in use: warning, then admin-only "only me / everyone" (`plans/366-delete-in-use-supplier-warning-admin-scope.plan.md`)
- [ ] A1: Server: allowlist, trash collection and purge route, plus tests (against the isolated DB) (`server/routes/generic.js`, `server/constants/collections.js`, `server/test/**`).
- [ ] A2: Client services: `deleteFromMaster`, `deleteSupplierFromMaster`, own-products source strip.
- [ ] A3: `onDelete` / `onBulkDeleteSelected` flow, model field, dictionary keys.
- [ ] A4: Build, server tests, client specs. Manual test with 2 accounts. Update session-state.

### Plan 367 — Dashboard sub-nav: a "לוח בקרה" chip replaces the current page's chip; remove the four back buttons (`plans/367-dashboard-chip-replaces-current-page-chip-remove-back-buttons.plan.md`)
- [x] A1: Tab-chips replacement logic plus spec (overview → 4 chips; metadata, suppliers, venues and trash → dashboard chip in the right index; query-only navigation updates) (`core/components/tab-chips/**`).
- [x] A2: Remove the 4 back buttons, handlers and styles.
- [x] A3: Specs and e2e cleanup; P1 style.
- [ ] A4: Build, specs, icons lint, check on phone and desktop. Update session-state.

### Plan 368 — Product form responsive on mobile and tablet (`plans/368-product-form-responsive-mobile-tablet.plan.md`)
- [x] A1: Un-nest the media blocks; verify they apply (DevTools computed styles) (`product-form.component.scss`).
- [x] A2: ≤900px tablet layout, including collapsible full width and the scaling row in 2 rows.
- [x] A3: ≤768px phone layout, including padding, actions wrap and the override input.
- [ ] A4: Remove dead rules. Build, specs. Check at 360, 414, 800 and 1280px with an expanded allergens field and a product with 2 purchase options. Update session-state.

### Plan 370 — AI recipe generation: realistic portion and ingredient ratios, with tests (`plans/370-ai-recipe-generation-realistic-portions-with-tests.plan.md`)
- [x] A1: Extract the helpers into `ai-recipe-helpers.js`; `ai.js` imports them; offline tests for the existing behavior (pass before any change).
- [x] A2: Prompt rules, `selectShots`, temperature (`server/routes/ai.js`).
- [x] A3: The `implausible_portion_weight` warning, server and client mirror, plus tests and the dictionary key.
- [ ] A4: Live eval script. Run it locally with the key and paste the pass-rate table into the session state (`server/scripts/ai-eval-recipes.js`).
- [x] A5: Build, server tests. Update session-state.

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

### Plan 390 — Workflow Kit Phase 6A: Drift Reconciliation and Project Overrides (`plans/390-workflow-kit-phase-6a-drift-reconciliation-overrides.plan.md`)
- [ ] A0: Step 0 reality check; record the real diff count and the two validation items' state.
- [ ] A1: Classify every differing file in `docs/workflow-kit/drift-classification.md`.
- [ ] A2: Fix real drift kit-first; patch into FoodVibe (ADR 0018); name kit SHAs in commits.
- [ ] A3: `overrides` in kit `tools/sync.mjs` + `tools/install.mjs` + kit README; scratch install test.
- [ ] A4: Kit `tools/drift-check.mjs` + `kit-drift.ps1`; FoodVibe `kit.config.json` with real values + overrides.
- [ ] A5: Fix ship-prep ULTRA-TRIVIAL and plan-number reuse kit-first if Step 0 found them still open.
- [ ] A6: `manifest.md` phase 6A paragraph; run every [auto] criterion; kit PR merged by Dandan; `/ship`.

### Plan 391 — Workflow Kit Phase 6B: GitHub Pull and Versioned Releases (`plans/391-workflow-kit-phase-6b-github-pull-versioned-releases.plan.md`)
- [ ] B0: Step 0 reality check.
- [ ] B1: Fetch-to-cache helper (`tools/lib/source.mjs`) + `--source/--ref` in install, sync, drift-check, `.ps1` wrappers.
- [ ] B2: `install.json` source/ref/commit; sync defaults + `--ref` upgrade; scratch tests for all [auto] criteria.
- [ ] B3: Public-data sweep; extend leak-check if a pattern is worth keeping; confirm the GitHub Action runs.
- [ ] B4: `kit.json` semver, `CHANGELOG.md`, README rewrite, release steps.
- [ ] B5: Kit PR merged; Dandan's go; tag + GitHub release `v0.5.0`; install from GitHub into a scratch dir.
- [ ] B6: FoodVibe `docs/workflow-kit/manifest.md` phase 6B paragraph; `/ship`.

### Plan 392 — Workflow Kit Phase 6C: FoodVibe Adoption and Retire Patch Mode (`plans/392-workflow-kit-phase-6c-foodvibe-adoption-retire-patch-mode.plan.md`)
- [ ] C0: Step 0 reality check.
- [ ] C1: Kit `--adopt` mode + `-Adopt` wrapper; scratch test on a copy of FoodVibe.
- [ ] C2: Adopt FoodVibe; dry-run sync shows 0 conflicts; `kit-sync -Apply`; build + checks; FoodVibe chore PR.
- [ ] C3: New ADR superseding 0018 (amends 0015); mark 0018 superseded; brain index line.
- [ ] C4: Change-loop doc in the kit; link it from the kit README and FoodVibe `manifest.md`.
- [ ] C5: Replace patch-mode wording (AGENTS.md, `kit-owned.mjs`, kit `scope-guard.sh` + `README_WORKFLOW.md` via release + sync, `manifest.md`).
- [ ] C6: Cut `v1.0.0`; FoodVibe `kit-sync --ref v1.0.0`.
- [ ] C7: `kit-proof` from GitHub, `/plan` → `/take-plan` → `/ship` end to end.
- [ ] C8: No-op `v1.0.1`; upgrade FoodVibe and `kit-proof`; run all [auto] criteria; `/ship`.

### Plan 393 — Slot Dev Servers On Demand and Closed-Todo Archiving (`plans/393-slot-dev-servers-on-demand-closed-todo-archiving.plan.md`)
- [ ] D0: Step 0: bring both repos up to date, take the process snapshot.
- [ ] D1: Kit: `slot-serve.mjs`, plus take-plan no longer starting servers.
- [ ] D2: Kit: orphan-chain detection in `slot-procs.mjs`, `free-merged-slots` stopping servers, and the `SessionEnd` hook.
- [ ] D2a: Kit: reproduce the orphan leak and fix its root cause (kill the whole tree on stop, refuse a start while the port is held), plus the brain gotcha.
- [ ] D2b: Kit: `orphan-sweep.mjs` and its session-start call (slot and main, orphans only), plus the manifest row and `kit-owned.json` entry.
- [ ] D3: Kit: `todo-parse.mjs` counting `[-]` as closed, plus its test.
- [ ] D4: Kit: docs (`take-plan.md`, `remote.md`, preflight, `standards-git.md`, `ship-regular.md`, `job-validation.md`, `workflow-map.md`, `commands.md`), plus the manifest row and the `kit-owned.json` entry for `slot-serve.mjs`.
- [ ] D5: Kit PR merged by Dandan. Patch into FoodVibe (ADR 0018), then run `todo-archive.mjs` once.
- [ ] D6: Run every [auto] criterion, update `manifest.md`'s validation-round paragraph, then `/ship`.

### Plan 394 — Night 2026-10-07 PR Validation and Merge Runbook (`plans/394-night-1007-pr-validation-merge-runbook.plan.md`)
- [ ] R1–R4: clean rebases — #293 tech debt, #301 (347), #302 (371), #307 (348); Human validates each in wt-1 → approve/skip/reject.
- [ ] R5–R8: dictionary/spec conflicts — #297 (365), #298 (370, run Mongo server tests here), #295 (351), #296 (367).
- [ ] R9–R10: #314 chain top (363+364) → merges #299 then #314; #315 (362) rebased onto main's 340.
- [ ] R11–R15: list/form template conflicts — #300 (361), #294 (345), #304 (342), #306 (368), #308 (344).
- [ ] R16–R18: #311 chain top (349+350+352) → merges #309 → #310 → #311; then #313 (346); then #312 (353).
- [ ] Done-when: no open `[night 10-07]` PR; `main` builds + specs pass; wt-1 servers off, `/remote` off.

### Plan 395 — Gemini Model Chain with Daily Quota Fallback and Real Free-Tier Limit (`plans/395-gemini-model-chain-daily-quota-fallback.plan.md`)
> After PR #298 (plan 370) merges. Free tier = 20 calls/model/day; app claims 1,000.
- [ ] G0: Step 0 reality check; per-model status table.
- [ ] G1: `server/services/gemini-client.js` — chain, daily-quota fallback, exhausted map + Mongo mirror, LA-midnight reset, vision set.
- [ ] G2: `server/test/gemini-client.test.js` offline vitest (chain, daily 429 moves, per-minute/5xx/timeout stay, all exhausted, reset, vision, env override).
- [ ] G3: `ai.js` + `ai-recipe-helpers.js` through the client; drop `DAILY_LIMIT` gates; `/usage` new contract.
- [ ] G4: dictionary append `ai_daily_limit_reached_all` + `ai_models_available`; modals switch key.
- [ ] G5: `gemini-usage.util.ts` + modals + usage indicator read `models` from `/usage`.
- [ ] G6: `ai-eval-recipes.js --model=`; eval per model; image call per model; final default order.
- [ ] G7: `.env.example`; all [auto] criteria; HOW TO VALIDATE; `/ship`.

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
