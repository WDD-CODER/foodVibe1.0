# Active Tasks

> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-2026-07-21.md`](reports/todo-ledger-relevance-audit-2026-07-21.md).
> Checkboxes are **unchanged** — decide per group: execute / mark done / prune / keep.

---

## 1. EXECUTE — real unfinished work

> Audit says: do these.

### Plan 308 — Dead CSS Purge: Orphan Component Classes And Engine Blocks (`plans/308-dead-css-purge-orphan-classes.plan.md`)

> SCSS-only session (session 2 of a 3-session split); zero `.ts`/`.html` edits by rule.
> Human-validated 2026-08-26. Code is committed and pushed to `chore/dead-css-purge-plan-308` — **not merged**, no PR opened yet (the one item below is still open).

- [x] `src/styles.scss` — deleted 14 dead `.c-*` engine blocks + trimmed `.c-table-wrap` from line-21 doc comment (2118→1878 lines)
- [x] `ai-recipe-modal.component.scss` — split compound selector (kept `.ai-prompt-panel`); deleted 23 dead blocks (kept `.ai-draft-preview`) (590→383 lines)
- [x] `cook-view.page.scss` — deleted 15 dead blocks + hand-located `.cv-timer-icon` (1694→1532 lines)
- [x] `recipe-builder.page.scss` — deleted 11 dead blocks + hand-located `.icon-btn` (679→513 lines)
- [x] 11 single-class-orphan component `.scss` files — all done
- [x] `ng build` — pass, no new warnings; global styles.css 34,095→30,376 bytes (−10.9%)
- [ ] Manual click-through: cook view, recipe builder, AI recipe modal, inventory/recipe-book empty states, trash, approve stamp, auth modal — no visual change (needs Human/browser verification)
- [x] `git diff --stat` — confirmed zero `.ts`/`.html` touched

#### Addendum — follow-up dead-CSS finds (resolves the 2 discrepancies above)

- [x] `recipe-builder.page.scss` — removed both `.section-desc` refs, `.export-bar-label`, `.recipe-name-input`; `.qty-btn` was already gone from the original pass (490 lines)
- [x] `recipe-workflow.component.scss` — removed `.icon-muted`, `.quantity-controls`, `.qty-btn` (+2 dead media-query overrides)
- [x] `cook-view.page.scss` — removed second `.cv-phone-swap-hint`
- [x] **KEPT — do not delete.** `unit-creator.component.scss` `.custom-select-wrap` — looked dead, but compiled dist output proves Angular leaves `:has()` arguments unscoped, so this rule reaches into child `<app-custom-select>`'s internal `.open` state. Live. Reverted after deleting-then-checking.
- [x] **KEPT — do not delete.** `recipe-book-list.component.scss` `.header-actions` — is an `::ng-deep` rule reaching into child `<app-list-shell>` (renders `.header-actions` at line 22). Live. Never deleted.
- [x] `menu-library-list.component.scss` — removed `.date-range-inputs`
- [x] `product-form.component.scss` — removed `.form-input--no-focus-ring`, simplified the `:not()` it lived in
- [x] Confirmed via `dist` output + explicit `::ng-deep`/`:has()` checks — 2 of 7 addendum targets were false positives from the "grep owning component's own html/ts" method; see plan 308 for the full explanation

#### Second addendum — recipe-workflow.component.scss, corrected 4-point check

- [x] `.category-option-item`, `.inline-category-picker-wrapper`, `.amount-value` — all passed the 4-point check, all deleted (484→456 lines)
- [x] `rating-stars.component.scss` — added the requested comment (not a deletion)
- [x] Confirmed do-not-touch list untouched + bonus-verified the original `.checklist-export-wrap` deletion (session 2) was safe despite `export-toolbar-overlay`'s `ViewEncapsulation.None`
- [x] `ng build` pass, no new warnings; `git diff --stat -- '*.ts' '*.html'` empty

### Plan 307 — Purge Committed Scrape Artifacts And Legacy SQL (`plans/307-purge-committed-scrape-artifacts.plan.md`)

> Scope restored 2026-08-23: plan 300's closing sweep confirmed 0 remaining mismatches, so Human approved untracking `fullDATA_utf8.sql` too (full scope, not reduced).
> **NOT marking these `[x]` on 2026-08-26 despite the "(done, awaiting validation)" label below — verified against the live repo and the core action was never actually applied.** `git ls-files` still shows all 111 `tools/catalog-seeder/output|dumps` files and `fullDATA_utf8.sql` tracked. Only the `.gitignore` + README text edits are real and are committed/pushed to `chore/purge-scrape-artifacts-prep-plan-307` (unmerged, no PR — genuinely incomplete). The `git rm -r --cached` step below still needs to actually run.

- [ ] Grep for hardcoded references: `scrape_test`/`fullDATA_utf8` across `tools/ server/ scripts/ package.json .github/`; confirmed all overridable via `--sql-path=`, no hardcoding
- [x] `.gitignore`: replaced per-filename list (lines 72-80) with directory-level rules `tools/catalog-seeder/output/*` and `tools/catalog-seeder/dumps/`; kept `!tools/catalog-seeder/output/.gitkeep` and the `seed-products.json` intentional-commit exception
- [x] `.gitignore`: included `tools/catalog-seeder/logging.log` and `server/scripts/legacy-import/source-data/*.sql`
- [ ] `git rm -r --cached` the output/dumps dirs + `logging.log` (111 files) and `fullDATA_utf8.sql` — **not actually run yet**, files are still tracked
- [x] `server/scripts/legacy-import/source-data/README.md`: rewritten — no longer tracked, why, and how to restore for a re-import/re-audit
- [ ] Re-verified: `ng build` + `cd server && node -e "require('./index.js')"` with the `.sql` also removed — both clean
- [ ] Reported final before/after `git ls-files | wc -l` (1566 → 1454, -112) — not yet true, still ~1568

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
- [ ] ~~M4 Task 12 — Venues new-data field styling~~ — **superseded**; folds into `/design-port`'s Venues+VenueDetail session
- [ ] ~~M5 Task 13 — Dashboard~~ — **superseded**; done via `/design-port` (`01-dashboard.port-spec.md`, Human-validated there)
- [ ] ~~M6 Task 14 — Venue Detail~~ — **superseded**; covered by `/design-port`'s Venues+VenueDetail session
- [ ] ~~M7 Task 15 — Cook View~~ — **superseded** by `/design-port`
- [ ] ~~M8 Task 16 — Metadata Manager~~ — **superseded** by `/design-port`
- [ ] M9 Task 17 — Product form (still open — no `/design-port` screen covers this)
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
