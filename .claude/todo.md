# Active Tasks

---

### Plan 291 — Plan Persistence & Brief Sync Hardening (`plans/291-plan-persistence-brief-sync-hardening.plan.md`)
> Closes the gap that let Plan 285 (AI Menu Phase 1) execute brief-by-brief without ever being persisted under `plans/`. Contractor (Cursor) executes one milestone at a time.

- [ ] M1 `scripts/plan-ledger-check.mjs` — new: verify todo.md/brief plan refs exist, report duplicate NNNs + unnumbered strays
- [ ] M2 `.husky/pre-commit` + `.claude/commands/ship.md` — wire ledger check into pre-commit (cross-agent) and ship Phase 1
- [ ] M3 `.claude/commands/plan.md` + `feat.md` — remove `_v[N]` convention fork, align to `NNN-slug.plan.md`
- [ ] M4 `.claude/skills/brief-detection/SKILL.md` — detect Plan Contract shape (Milestones/Atomic Sub-tasks), route to save-plan instead of a/b/c gate
- [ ] M5 `.claude/commands/brief.md` — STOP when `## Parent plan` path doesn't resolve on disk
- [ ] M6 `.claude/skills/save-plan/SKILL.md` — NNN allocation also checks `origin/main` plans/ tree
- [ ] M7 `plans/285-ai-menu-phase1.plan.md` — reconstruct from todo.md history, resolve ledger-check hard failure

---

## Angular 22 Migration (deferred)

- Remaining `npm audit --omit=dev --audit-level=high` findings are all `@angular/*` (XSS in template/attribute namespace + two-way binding sanitization, DoS via OOM in formatDate/digitsInfo, HttpTransferCache cache-key/info-leak) — blocked on the Angular 22 major upgrade.
- Do **not** run `npm audit fix --force`.
- Server `npm audit --omit=dev` is clean (0 vulnerabilities).
- CI (`.github/workflows/security.yml`) runs `npm audit --omit=dev --audit-level=critical`. `--omit=dev` is permanent (devDependency build-tooling churn — Angular CLI, vite, webpack-dev-server — is noise for a never-shipped tree, not app risk); restore `--audit-level=high` on top of `--omit=dev` after the migration clears the `@angular/*` findings above. See `docs/brain/decisions/0005-scope-npm-audit-to-production-deps.md`.

---

### Plan 289 â€” App Load Optimization (`plans/289-app-load-optimization.plan.md`)
> Phase 2 after Save Latency Fix (M1â€“3 already executed in session 2026-07-09). M4 shipped earlier; M5 marked `[x]` after ship Approve Y (`4e051d3` / PR #158). M6 still open.

- [x] 4.1 Record baseline: `ng build --configuration production` â€” note initial/main bundle size *(done in session: 920.70 kB)*
- [x] 4.2 `app.component.html` + `.ts` â€” `@defer` the 3 AI modals (`ai-recipe`, `ai-menu`, `ai-product`) on their open signals; verify open + rebuild size
- [x] 4.3 Defer remaining root modals (pass 2) â€” leave `app-confirm-modal` / `app-auth-modal` eager if first-open latency is noticeable
- [x] 4.4 Manual verify: all deferred modals open; confirm/auth still snappy; no pendingChangesGuard regression
- [x] 4.5 Record after numbers from production build output (main vs deferred chunks) *(after: 670.83 kB, âˆ’249.87 kB)*
- [x] 5.1 Audit: grep candidate usages â€” defer safe services; Equipment + Preparations deferred in M5 ship (were wrongly kept eager before)
- [x] 5.2 For each safe service: remove constructor `loadInitialData()`; add `ensureLoaded()` with `loaded_` guard
- [x] 5.3 Wire `ensureLoaded()` into route resolvers (equipment, venues, menu-intelligence, metadata-manager as applicable)
- [x] 5.4 Keep Recipe/Dish/Product/Supplier/Unit/Metadata registries eager â€” do not touch
- [x] 5.5 Manual: `/dashboard` Network tab has no GETs for deferred collections until navigation *(Human verify on PR #158 test plan)*
- [ ] 6.1 `server/routes/generic.js` PUT `/:type` â€” parallelize `deleteMany` + stillTaken `_id` lookup via `Promise.all`
- [ ] 6.2 Manual: trash empty-all + backup-import still correct; contract (`X-Confirm-Replace`) unchanged

---

### Plan 234 â€” Per-User Collections + Render Deployment â€” operational tasks re-opened (`plans/234-per-user-collections-render-deploy.plan.md`)
> Partially re-opened after archive audit 2026-04-13 â€” see `.qa-reports/plan-234-archive-audit.md`

- [ ] Run stamp migration against Atlas; verify in Compass
- [ ] PR + merge `feat/user-scoped-schema` *(re-check: no separate PR found â€” all code shipped via PR #53)*
- [ ] Build verification + manual API test (Brief 2)
- [ ] pre-commit security grep + CI review (Brief 2)
- [ ] PR + merge `feat/user-scoped-backend` *(re-check: no separate PR found â€” all code shipped via PR #53)*
- [ ] pre-commit security grep + CI review (Brief 3)
- [ ] PR + merge `feat/frontend-auth-wiring` *(re-check: no separate PR found â€” all code shipped via PR #53)*
- [ ] Build + serve verification (Brief 4)
- [ ] PR + merge `feat/express-static-serving` *(re-check: no separate PR found â€” all code shipped via PR #53)*
- [ ] Manual deploy + smoke test

---

### Plan 259 â€” DB-Backed Shared Few-Shot Pool (`plans/259-gemini-shots-db-pool.plan.md`)

- [ ] Task 1: `server/routes/ai.js` â€” add `GEMINI_SHOTS` helpers (`saveShot`, `getApprovedShots`, `computeSoftWarnings`), remove `buildFewShotBlock` from body path
- [ ] Task 2: `server/routes/ai.js` â€” add `POST /api/v1/ai/shots` endpoint
- [ ] Task 3: `server/routes/ai.js` â€” update `/generate`, `/generate-from-image`, `/generate-from-url` to fetch shots from DB server-side
- [ ] Task 4: Create `src/app/core/services/gemini-shots.service.ts`
- [ ] Task 5: `ai-recipe-modal.component.ts` â€” call shots service on approve/reject, show inline warnings
- [ ] Task 6: `gemini.service.ts` â€” remove `getGeminiShots` import and `shots` from request bodies
- [ ] Task 7: Deprecate `gemini-shots.util.ts` â€” remove `addGeminiShot` call from modal
- [ ] Task 8: `ng build` + smoke test

---

### Plan 255 â€” Dead Code Cleanup (`plans/255-dead-code-cleanup.plan.md`)

- [x] Task 1: Delete `.claude/skills/commit-to-github/` â€” confirmed deprecated, replaced by git-agent
- [x] Task 2: Delete `.claude/skills/end-session/` â€” confirmed deprecated, replaced by worktree-session-end
- [x] Task 3: Delete `.claude/agents/triage-agent.md` â€” zero references, never wired in
- [x] Task 4: Delete `scripts/backfill-name-snapshots.mjs` â€” untracked, no npm entry
- [x] Task 5: Delete `scripts/seed-from-dump.js` â€” one-time seed, explicitly documented as done
- [x] Task 6: Delete `scripts/stamp-master-userId.js` â€” one-time migration, explicitly "Run ONCE"
- [x] Task 7: Run `ng build` â€” confirm zero errors after deletions
- [ ] Task 8: Investigate repair script trio (`backup-before-repair.mjs`, `diagnose-broken-refs.mjs`, `repair-recipe-references.mjs`) â€” confirm repair is complete, then delete all three
- [ ] Task 9: Investigate migration pair (`migrate-to-master.mjs`, `link-users-to-master.mjs`) â€” confirm master-layer migration is done in prod, then delete both
- [ ] Task 10: Investigate `scripts/trim-demo-data.mjs` â€” recurring or one-time? Add npm entry or delete
- [x] Task 11: Add `git-agent.md` row to `Â§0.3` agent roster in `copilot-instructions.md`
- [x] Task 12: Fix stale `commit-to-github Phase 0` reference in `.claude/agents/qa-engineer.md`
- [ ] Task 14: Decide on `.claude/commands/reflect-add-tests.md` â€” add trigger or delete
- [ ] Task 15: Decide on `.claude/commands/sweep-stale-todos.md` â€” verify pending update, then add trigger
- [ ] Task 16: Decide on `getGeminiShots()` in `gemini-shots.util.ts` â€” build read-back feature or remove orphan export

---

### Plan 256 â€” Gemini Few-Shot Injection (Backend Migration) (`plans/256-gemini-few-shot-backend.plan.md`)

- [ ] Task 1: Extend backend generate endpoints to accept optional `shots` array in request body
- [ ] Task 2: Build few-shot prompt block on the server using the shots array
- [ ] Task 3: Update `GeminiService.generateRecipe()` to call `getGeminiShots()` and pass shots to backend
- [ ] Task 4: Repeat for `generateFromImage()` and `generateFromUrl()` (all generate endpoints)
- [ ] Task 5: Verify `ng build` passes and test end-to-end in dev

---

### Plan 249 â€” Catalog Seeder Data Quality + Supplier Model (`plans/249-seeder-data-quality.plan.md`)
- [ ] Step 0: Clear bad seed from PRODUCT_LIST; delete output/pending-review.json and output/enriched.json
- [ ] Step 1: Add `_safe_float` helper to `enrich.py`
- [ ] Step 2: Expand `_PROMPT_TEMPLATE` in `enrich.py` to return 8 fields
- [ ] Step 3: Update `_validate_response` in `enrich.py` to validate new fields
- [ ] Step 4: Update `_attach_enrichment` in `enrich.py` with name override + `_recalc_pricing`
- [ ] Step 5: Add `_recalc_pricing` and `_pack_to_base_conversion` to `enrich.py`
- [ ] Step 6: Add `SUPPLIERS_COLLECTION` to `config.py`
- [ ] Step 7: Add `_make_id` helper + imports to `db_write.py`
- [ ] Step 8: Add `_upsert_suppliers` to `db_write.py`
- [ ] Step 9: Update `write_approved` to call `_upsert_suppliers`
- [ ] Step 10: Update `_prepare_doc` to link `supplierIds_`
- [ ] Step 11: Update `_INTERNAL_KEYS` in `db_write.py`
- [ ] Step 12: Update `db_write.py` imports for `SUPPLIERS_COLLECTION`
- [ ] Step 13: Branch `feat/seeder-data-quality` and re-seed

---

### Plan 233 â€” Gemini Direct API + Modal Status Feedback (`plans/233-gemini-direct-api-modal-status.plan.md`) âœ…âŒ INTENTIONALLY PARTIAL
> **Architecture pivot 2026-04-19:** Direct fetch + localStorage API key approach was dropped in favour of backend proxy (`/api/v1/ai/*`). Key lives server-side. Only the modal status feedback tasks were implemented.

- [ ] ~~`gemini.service.ts` â€” fetch-based direct API, apiKey_ signal, hasKey, setApiKey()~~ **DROPPED â€” backend proxy kept; API key is server-side**
- [ ] ~~`ai-recipe-modal.component.ts` â€” configuringKey_/keyInput_ signals, onSaveKey, API key guard~~ **DROPPED â€” no client-side key management**
- [ ] ~~`ai-recipe-modal.component.html` â€” key config panel~~ **DROPPED**
- [x] `ai-recipe-modal.component.ts` â€” status_ signal (idle/sending/done/error), onClose, status bar in HTML â€” **DONE**
- [x] `ng build` â€” verify zero errors

---

### Plan 248 â€” Transloco Migration (`plans/248-transloco-migration.plan.md`)
- [ ] Install `@jsverse/transloco` and configure `provideTransloco` in `src/app/app.config.ts` (standalone â€” do NOT run `ng add`)
- [ ] Split `public/assets/data/dictionary.json` into 8 scoped files under `public/assets/i18n/he/`
- [ ] Verify Transloco loader path â€” check network tab for `/assets/i18n/he/units.json` returning 200
- [ ] Replace `| translatePipe` in all templates with `| transloco` (scope-prefixed); add `TranslocoModule`/`TranslocoDirective` to each component's `imports`
- [ ] Replace `this.translation.translate(...)` calls in `.ts` files with `this.transloco.translate('scope.key')`
- [ ] Create `src/app/core/services/vocabulary.service.ts` (~40 lines: `resolve()`, `addEntry()`, localStorage)
- [ ] Update `src/app/core/services/key-resolution.service.ts` to inject `VocabularyService`
- [ ] Update all remaining `TranslationService` injection sites to `VocabularyService`
- [ ] Delete `translation-pipe.pipe.ts` and `translation.service.ts`
- [ ] Verify `ng build` passes and `{{ 'cup' | transloco }}` renders `×›×•×¡` in the app

---

### Plan 247 â€” Reflect: self-improving skills system (`plans/247-reflect-skill-improvement-loop.plan.md`)
- [ ] Create `.claude/reflect/test-suites/` directory
- [ ] Create `.claude/reflect/test-suite-template.md`
- [ ] Create `.claude/reflect/evaluator.md` (immutable scoring)
- [ ] Create `.claude/reflect/reflection-log.tsv` (header only)
- [ ] Create `.claude/reflect/test-suites/angularComponentStructure.tests.md`
- [ ] Create `.claude/commands/reflect.md` (orchestrator)
- [ ] Verify all files exist and paths are correct

---

## ðŸ”´ Quick Fixes

---

### Plan 074 â€” Tech debt remediation (`plans/074-tech-debt-remediation.plan.md`) [TRIAGED 2026-04-02]

- [x] Refactor menu-intelligence.page.scss into partials (deferred)

---

### Plan 089 â€” Menu Intelligence Upgrade (`plans/089-menu-intelligence-upgrade.plan.md`)

- [ ] A: Auto-name menu with formatted date when name is empty on save, with duplicate handling (1), (2)
- [ ] Timestamps: Add updated_at_ to MenuEvent model; set created_at_ on create and updated_at_ on every save
- [x] B: Set event_date_ default to today's date for new menus
- [x] C: Redesign guest counter as unified pill-shaped container with paper-blend styling
- [x] D1: Tie food cost calculation to serving_portions * guest_count, update service and component
- [x] D2: Show sell_price inline next to dish name for all menu types
- [x] E1: Make toolbar collapsible with fixed overlay when opened
- [x] E2: Create floating FAB on right side with pop-up buttons for toolbar and back navigation
- [x] Dictionary: Add new Hebrew dictionary keys for new labels

---

### Plan 081 â€” toFix Detailed Plans (`plans/081-tofix-detailed-plans.plan.md`)

- [ ] Section 1 â€” Sign-in / Sign-up: auto-focus, dev user dropdown, Enter-to-submit, field-level errors
- [ ] Section 2 â€” Quick-add default base unit: set signal to 'gram'
- [ ] Section 3 â€” Recipe view: number formatting pipe, unit-before-scale, ingredient alignment
- [ ] Section 4 â€” Recipe builder: persist container state, remove arrows, custom qty buttons, clickable headers, CDK drag-drop
- [ ] Section 5 â€” Maison Plus (dish prep list): row style, qty buttons, category-first add flow, auto-focus
- [ ] Section 6 â€” App-wide category/unit dropdowns: add 'add new' sentinel option to every dropdown
- [ ] Section 7 â€” Logistics: chip fit-content width, keyboard navigation with highlighted index
- [ ] Section 8 â€” Add-equipment modal: single-step category creation quick-save flow
- [ ] Section 9 â€” Labels: selectable existing labels in delete UI and recipe builder

---

### Plan 133 â€” List quick-edit inline (`plans/unused-133-list-quick-edit-inline.plan.md`)

- [ ] Inventory product list: editable cells (supplier, category, unit); value click â†’ inline dropdown; row click â†’ edit page
- [ ] Supplier list: keep panel on row click; add quick-edit for chosen cells (e.g. contact, delivery, min order)
- [ ] Keyboard and a11y: focus model, focus trap in inline control, Esc/Enter, return focus, screen reader labels (partial: aria-label on buttons)
- [ ] Venue list / Recipe-book list: optional quick-edit columns as needed

---

### Plan 072 â€” Robust login, app-wide logging, security (`plans/072-robust-login-app-logging-security.plan.md`)

- [ ] Wire logging: auth (login/logout/signup/guard/401), HTTP interceptor, global ErrorHandler, critical CRUD in data services
- [ ] Auth hardening: password in UI, credentials types, local hash-only storage, auth abstraction, guard/modal wiring
- [ ] Backend-ready: environment files, API contract, HTTP provider, interceptor, token lifecycle
- [ ] Add â€œSecurity & go-liveâ€ checklist to docs (HTTPS, headers, rate limiting, no secrets in repo, error exposure)

---

## ðŸ”µ Infrastructure / Planning

---

### Plan 222 â€” Dev Machine Open Ports Security Hardening (`plans/222-dev-machine-open-ports-security.plan.md`)
- [ ] Disable Dell SupportAssist service in `services.msc` â€” verify port 9012 closed
- [ ] Identify and resolve port 5700 (VMware/Hyper-V/Windows component)
- [ ] Verify MongoDB auth enabled in `mongod.cfg` â€” confirm `--auth` flag present
- [ ] Evaluate SMB usage â€” disable ports 445/139 if not file-sharing on LAN

---

### Plan 200 â€” Lite skills refactor validation report (`plans/200-lite-skills-refactor-validation-report.plan.md`)
- [ ] Pre-write verification: content check (`toBe/skills/commit-to-github.md`, `toBe/agents/breadcrumb-navigator.md`); Master Â§3â€“5 completeness in `toBe/copilot-instructions.md`; confirm no legacy `quick-chat` skill
- [ ] Write `notes/comparative-analysis-report.md` (15 sections + appendices Aâ€“C per plan)
- [ ] Cross-check Go/No-Go Â§9 vs Plan 198; reference Plans 198 and 199 in report
- [ ] Post-write: tables render, Appendix B sums match session headline, internal consistency pass

---

### Plan 199 â€” Lite refactor workflow comparative analysis (`plans/199-lite-refactor-workflow-comparative-analysis.plan.md`)
- [ ] Policy: Treat Master (`copilot-instructions.md`) as OS; agents/skills as thin apps â€” no duplicate rule blocks in agent files
- [ ] Enforce Efficiency Tier routing (High Reasoning vs Fast/Flash) for planning, decomposition, and procedural phases
- [ ] Keep skills phase-based procedural workflows; use argument shortcuts (`c`, `s`, `sl`, `sf`) per commit-to-github skill
- [ ] Track context-load goal (~73% reduction vs Legacy) when editing agent/skill bundles â€” avoid re-bloating personas
- [ ] Cross-link: execution work continues under Plan 198 (promote `.claude/toBe/`, Â§0.5 Model Routing, security migration QA)

---

### Plan 196 â€” Commit flow speed audit (`plans/196-commit-flow-speed-audit.plan.md`)
- [ ] Add approved-tree drift check before any git write and auto-replan logic
- [ ] Rebase/sync branch before commit plan generation when behind origin/main
- [ ] Create conflict-resolution policy for known files with auto/manual boundaries
- [ ] Split PR merge and remote branch deletion into explicit verified steps
- [ ] Record per-phase timing metrics for each commit workflow run

---

### Plan 122 â€” AI Chatbot Gemini scope (`plans/122-ai-chatbot-gemini-scope.plan.md`)

- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation â†’ recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set

### Phase 1 â€” Stabilize & Complete (`plans/010-product-roadmap.plan.md`)

- [ ] When adding new features: add/update `.spec.ts` and mark related sub-tasks here; run the full test suite only at commit time (Phase 0) or when the user explicitly asks â€” not after every iteration.

### Phase 2 â€” Product Enhancement

- [ ] **Plan 011 (KPI expansion, optional)**: Further dashboard enhancements per roadmap if desired.
- [ ] **Plan 013 â€” Recipe Quick Actions**: Duplicate recipe, approval toggle in recipe book list, batch select/actions.
- [ ] **Plan 014 â€” Low Stock Alerts**: Visual indicators in inventory list, filter toggle, dashboard card.

### Phase 3 â€” Polish & Production Readiness

- [ ] **Plan 015 â€” Empty States & Onboarding**: Empty-state UX for all list views, first-use guidance, Hebrew copy.
- [ ] **Plan 016 â€” Print-Friendly Recipe View**: Print stylesheet, hide navigation in print, RTL-aware layout, print button.
- [ ] **Plan 018 â€” Backend API Preparation**: Formalize `IStorageAdapter`, document REST API contract, audit adapter compliance.
- [ ] **Deployment Pipeline**: Validate and activate GitHub Actions workflow for GitHub Pages.

---

### Plan 060 â€” Data persistence and backup (`plans/060-data-persistence-and-backup.plan.md`)

- [ ] Optional: debounced auto-download per category for physical JSON on every change.

---

### Plan 059 â€” Unify design engine (`plans/059-unify-design-engine.plan.md`)

Execution plan: `plans/059-1-unify-design-engine-refactor.plan.md`

- [ ] Phase 9: Deferred â€” grid header/cell too coupled to display:contents layout
- [ ] Phase 10: Deferred â€” breakpoint/transition standardization for follow-up

---

### Plan 276 â€” Mobile audit fix: rtl-fab (`plans/276-mobile-audit-rtl-fab.plan.md`)
- [x] `hero-fab.component.scss` line 4 â€” `left: 0.75rem` â†’ `inset-inline-end: 0.75rem`
- [x] `hero-fab.component.scss` line 110 â€” `left: 0.5rem` â†’ `inset-inline-end: 0.5rem`
- [x] Run `ng build` â€” 0 errors
- [ ] Re-run `/mobile-flow-audit --only dashboard --only recipe-builder-new-prep --only signup`
- [ ] Update TRIAGE.md â€” Cluster 1 âœ“ resolved

---

### Plan 277 â€” Mobile audit fix: ingredient-grid-mobile (`plans/277-mobile-audit-ingredient-grid-mobile.plan.md`)
- [x] `recipe-ingredients-table.component.scss` â€” add 5th column `2.75rem` to mobile grid template
- [x] Remove `display: none` from `.col-actions` in `@media (max-width: 640px)` block; assign `grid-column: 5`; set `.c-icon-btn { opacity: 1; min-width/height: 2.75rem }`
- [x] Run `ng build` â€” 0 errors
- [ ] Re-run `/mobile-flow-audit --only recipe-builder-new-prep --only recipe-builder-new-dish`
- [ ] Update TRIAGE.md â€” Cluster 2 C2/C4/DC1/DC2 âœ“ resolved

---

### Plan 278 â€” Mobile audit fix: bottom-nav-occlusion (`plans/278-mobile-audit-bottom-nav-occlusion.plan.md`)
- [x] `_toolbar.scss` `.financial-bar` â€” `z-index: 201`; `@media â‰¤620px { bottom: 3.5rem }`
- [x] Menu-intelligence page SCSS â€” add `padding-block-end: calc(3.5rem + env(safe-area-inset-bottom,0))`
- [x] Venues-add SCSS â€” same `padding-block-end`
- [x] Inventory-add/edit SCSS â€” same `padding-block-end`
- [x] Equipment-add SCSS â€” same `padding-block-end`
- [x] Run `ng build` â€” 0 errors
- [ ] Re-run `/mobile-flow-audit --only menu-intelligence-event --only venues-add --only inventory-add-product --only inventory-edit-product --only equipment-add`
- [ ] Update TRIAGE.md â€” Cluster 4 âœ“ resolved

---

### Plan 279 â€” Mobile audit fix: sticky-header-safe-zone (`plans/279-mobile-audit-sticky-header-safe-zone.plan.md`)
- [x] `dashboard.page.scss` `.dashboard-content` â€” add `@media (max-width: 620px) { padding-block-start: 3.875rem; }`
- [x] `recipe-book-list.component.scss` â€” add same `padding-block-start: 3.875rem` at â‰¤620px
- [x] Run `ng build` â€” 0 errors
- [ ] Re-run `/mobile-flow-audit --only dashboard --only recipe-book-list`
- [ ] Update TRIAGE.md â€” Cluster 5 âœ“ resolved

---

### Plan 280 â€” Mobile audit fix: rtl-layout (`plans/280-mobile-audit-rtl-layout.plan.md`)
- [x] `recipe-book-list.component.scss` â€” fix filter close button `left:` â†’ `inset-inline-end:` and search icon position
- [x] Suppliers SCSS â€” add `padding-inline-end: 0.75rem` to page title at mobile
- [x] Venues SCSS â€” fix "×”×•×¡×£ ×©×•×¨×”" button icon order for RTL
- [x] `trash.page.scss` line 164 â€” `margin-right: auto` â†’ `margin-inline-end: auto`
- [x] Run `ng build` â€” 0 errors
- [ ] Re-run `/mobile-flow-audit --only recipe-book-list --only suppliers-add --only venues-add --only trash-restore`
- [ ] Update TRIAGE.md â€” Cluster 6 âœ“ resolved

---

### Plan 281 â€” Mobile audit fix: input-overflow (`plans/281-mobile-audit-input-overflow.plan.md`)
- [x] `recipe-builder.page.scss` â€” recipe name input: `text-overflow: ellipsis`, `overflow: hidden`
- [x] `recipe-builder.page.scss` â€” yield vessel search: `width: 100%`, `min-width: 0`
- [x] `recipe-ingredients-table.component.scss` mobile block â€” ensure `.col-name .grid-input` has `width: 100%`, `min-width: 0`
- [x] Prep-item search input â€” fix `padding-inline-end` for search icon
- [x] Run `ng build` â€” 0 errors
- [ ] Re-run `/mobile-flow-audit --only recipe-builder-new-prep --only recipe-builder-new-dish --only recipe-builder-edit`
- [ ] Update TRIAGE.md â€” Cluster 7 âœ“ resolved

---

### Plan 282 â€” Mobile audit fix: dropdown-z-index (`plans/282-mobile-audit-dropdown-z-index.plan.md`)
- [x] Inventory edit TS â€” fix `onCategorySelect` to close dropdown after selection
- [x] Inventory edit template â€” verify `[multiple]="false"` on category ng-select
- [x] Inventory edit TS â€” fix duplicate-name validator to exclude current product ID
- [x] `styles.scss` â€” add global Escape dismiss for ng-select dropdowns if missing
- [x] Inventory SCSS â€” add `max-height: 40vh; overflow-y: auto` for category dropdown panel at â‰¤620px
- [x] Run `ng build` â€” 0 errors
- [ ] Re-run `/mobile-flow-audit --only inventory-edit-product --only inventory-add-product --only recipe-builder-new-dish`
- [ ] Update TRIAGE.md â€” Cluster 8 + DEF-IE-02 âœ“ resolved

---

### Plan 283 â€” Mobile audit fix: touch-target-size (`plans/283-mobile-audit-touch-target-size.plan.md`)
- [x] `trash.page.scss` `.btn-item` â€” add `min-block-size: 2.75rem`
- [x] `trash.page.scss` `.btn-action` â€” add `min-block-size: 2.75rem`
- [x] `recipe-book-list.component.scss` â€” row action buttons: add `min-inline-size: 2.75rem; min-block-size: 2.75rem`
- [x] Run `ng build` â€” 0 errors
- [ ] Re-run `/mobile-flow-audit --only trash-restore --only recipe-book-list`
- [ ] Update TRIAGE.md â€” Cluster 10 âœ“ resolved

## Where things live

- **Open work** — `### Plan` sections above (this file only).
- **Done** — numbered volumes under [todo-archive/](todo-archive/README.md) (+ [INDEX.md](todo-archive/INDEX.md) for old Done catalog rows).
- **All plan files** — [`plans/`](../plans/).
