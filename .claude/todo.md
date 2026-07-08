# Active Tasks

---

### Plan 285 — AI Menu Phase 1 (`plans/285-ai-menu-phase1.plan.md`)

- [x] 1.1.1 `server/routes/ai.js` — add MENU_GENERATE_SYSTEM_PROMPT
- [x] 1.1.2 `server/routes/ai.js` — add validateMenuDraft() helper
- [x] 1.1.3 `server/routes/ai.js` — add POST /generate-menu endpoint
- [x] 1.1.4 `server/routes/ai.js` — add MENU_PATCH_SYSTEM_PROMPT
- [x] 1.1.5 `server/routes/ai.js` — add POST /patch-menu endpoint
- [x] 1.2.1 `src/app/core/models/ai-menu-draft.model.ts` — create
- [x] 1.2.2 `src/app/core/utils/recipe-match.util.ts` — create
- [x] 1.2.3 `src/app/core/services/gemini.service.ts` — add generateMenu() + patchMenu()
- [x] 1.2.4 `src/app/pages/menu-intelligence/services/menu-ai-flow.service.ts` — create
- [x] 1.3.1 `src/app/shared/ai-menu-modal/ai-menu-modal.service.ts` — create
- [x] 1.3.2 `src/app/shared/ai-menu-modal/ai-menu-modal.component.ts` — create
- [x] 1.3.3 `src/app/shared/ai-menu-modal/ai-menu-modal.component.html` — create
- [x] 1.3.4 `src/app/shared/ai-menu-modal/ai-menu-modal.component.scss` — create
- [x] 1.3.5 `src/app/appRoot/app.component.html` — add `<app-ai-menu-modal/>`
- [x] 1.3.6 `src/app/appRoot/app.component.ts` — import AiMenuModalComponent
- [x] 1.3.7 `public/assets/data/dictionary.json` — add 19 ai_menu_* keys
- [x] 1.4.1 `menu-intelligence.page.ts` — providers + inject + ngOnInit init()
- [x] 1.4.2 `menu-intelligence.page.ts` — openAiMenuModal() + buildAiMenuSnapshot_()
- [x] 1.4.3 `menu-intelligence.page.html` — add AI button
- [x] 1.4.4 `menu-library-list.component.ts + .html` — onCreateWithAi() + button
- [x] 1.4.5 `public/assets/data/dictionary.json` — add 4 integration keys
- [x] BG — ng build 0 errors

---

### Plan 234 — Per-User Collections + Render Deployment — operational tasks re-opened (`plans/234-per-user-collections-render-deploy.plan.md`)
> Partially re-opened after archive audit 2026-04-13 — see `.qa-reports/plan-234-archive-audit.md`

- [ ] Run stamp migration against Atlas; verify in Compass
- [ ] PR + merge `feat/user-scoped-schema` *(re-check: no separate PR found — all code shipped via PR #53)*
- [ ] Build verification + manual API test (Brief 2)
- [ ] Security Officer review (Brief 2)
- [ ] PR + merge `feat/user-scoped-backend` *(re-check: no separate PR found — all code shipped via PR #53)*
- [ ] Security Officer review (Brief 3)
- [ ] PR + merge `feat/frontend-auth-wiring` *(re-check: no separate PR found — all code shipped via PR #53)*
- [ ] Build + serve verification (Brief 4)
- [ ] PR + merge `feat/express-static-serving` *(re-check: no separate PR found — all code shipped via PR #53)*
- [ ] Manual deploy + smoke test

---

### Plan 262 — Mobile Layout Audit 375×812 (`plans/262-mobile-layout-audit.plan.md`)

- [x] 1.1 Create ROUTE_INVENTORY.md from app.routes.ts — all paths, auth guards, children, page components
- [x] 1.2 Read all page .component.html files — catalog interactive elements
- [x] 1.3 Read shared/*.component.html files — catalog reusable interactive components
- [x] 1.4 Write INTERACTIVE_CATALOG.md — page | element_selector | trigger_action | expected_behavior
- [x] 2.1 /browse audit: launch localhost:4200 at 375×812, confirm RTL, screenshot all public pages
- [x] 2.2 /browse audit: trigger all interactive elements per INTERACTIVE_CATALOG.md, screenshot each state
- [x] 2.3 /browse audit: auth-required pages (login, then repeat crawl) — all auth pages captured; only /menu-library rows and /menu-intelligence/:id skipped (no DB data)
- [x] 3.1 Create MOBILE_AUDIT_REPORT.md — critical/major/minor issues, clean pages, pass/fail checklist

---

### Plan 259 — DB-Backed Shared Few-Shot Pool (`plans/259-gemini-shots-db-pool.plan.md`)

- [ ] Task 1: `server/routes/ai.js` — add `GEMINI_SHOTS` helpers (`saveShot`, `getApprovedShots`, `computeSoftWarnings`), remove `buildFewShotBlock` from body path
- [ ] Task 2: `server/routes/ai.js` — add `POST /api/v1/ai/shots` endpoint
- [ ] Task 3: `server/routes/ai.js` — update `/generate`, `/generate-from-image`, `/generate-from-url` to fetch shots from DB server-side
- [ ] Task 4: Create `src/app/core/services/gemini-shots.service.ts`
- [ ] Task 5: `ai-recipe-modal.component.ts` — call shots service on approve/reject, show inline warnings
- [ ] Task 6: `gemini.service.ts` — remove `getGeminiShots` import and `shots` from request bodies
- [ ] Task 7: Deprecate `gemini-shots.util.ts` — remove `addGeminiShot` call from modal
- [ ] Task 8: `ng build` + smoke test

---

### Plan 258 — Quick-Edit Product Panel (`plans/258-quick-edit-product-panel.plan.md`)

- [x] Create `src/app/core/services/quick-edit-product-modal.service.ts`
- [x] Create `src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component.ts`
- [x] Create `src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component.html`
- [x] Create `src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component.scss`
- [x] Create `src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.ts`
- [x] Create `src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.html`
- [x] Create `src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.scss`
- [x] Edit `src/app/appRoot/app.component.ts` — register QuickEditProductModalComponent
- [x] Edit `src/app/appRoot/app.component.html` — add <app-quick-edit-product-modal/>
- [x] Edit `recipe-ingredients-table.component.ts` — signals, helpers, badge handlers
- [x] Edit `recipe-ingredients-table.component.html` — replace badge clicks, add accordion
- [x] Edit `recipe-ingredients-table.component.scss` — .quick-edit-accordion grid-column

---

### Plan 255 — Dead Code Cleanup (`plans/255-dead-code-cleanup.plan.md`)

- [x] Task 1: Delete `.claude/skills/commit-to-github/` — confirmed deprecated, replaced by git-agent
- [x] Task 2: Delete `.claude/skills/end-session/` — confirmed deprecated, replaced by worktree-session-end
- [x] Task 3: Delete `.claude/agents/triage-agent.md` — zero references, never wired in
- [x] Task 4: Delete `scripts/backfill-name-snapshots.mjs` — untracked, no npm entry
- [x] Task 5: Delete `scripts/seed-from-dump.js` — one-time seed, explicitly documented as done
- [x] Task 6: Delete `scripts/stamp-master-userId.js` — one-time migration, explicitly "Run ONCE"
- [x] Task 7: Run `ng build` — confirm zero errors after deletions
- [ ] Task 8: Investigate repair script trio (`backup-before-repair.mjs`, `diagnose-broken-refs.mjs`, `repair-recipe-references.mjs`) — confirm repair is complete, then delete all three
- [ ] Task 9: Investigate migration pair (`migrate-to-master.mjs`, `link-users-to-master.mjs`) — confirm master-layer migration is done in prod, then delete both
- [ ] Task 10: Investigate `scripts/trim-demo-data.mjs` — recurring or one-time? Add npm entry or delete
- [x] Task 11: Add `git-agent.md` row to `§0.3` agent roster in `copilot-instructions.md`
- [x] Task 12: Fix stale `commit-to-github Phase 0` reference in `.claude/agents/qa-engineer.md`
- [ ] Task 14: Decide on `.claude/commands/reflect-add-tests.md` — add trigger or delete
- [ ] Task 15: Decide on `.claude/commands/sweep-stale-todos.md` — verify pending update, then add trigger
- [ ] Task 16: Decide on `getGeminiShots()` in `gemini-shots.util.ts` — build read-back feature or remove orphan export

---

### Plan 256 — Gemini Few-Shot Injection (Backend Migration) (`plans/256-gemini-few-shot-backend.plan.md`)

- [ ] Task 1: Extend backend generate endpoints to accept optional `shots` array in request body
- [ ] Task 2: Build few-shot prompt block on the server using the shots array
- [ ] Task 3: Update `GeminiService.generateRecipe()` to call `getGeminiShots()` and pass shots to backend
- [ ] Task 4: Repeat for `generateFromImage()` and `generateFromUrl()` (all generate endpoints)
- [ ] Task 5: Verify `ng build` passes and test end-to-end in dev

---

### Plan 254 — Recipe Ref Repair + Name Snapshot (`plans/254-recipe-ref-repair-and-name-snapshot.plan.md`)

- [x] Task 1: `git checkout -b fix/recipe-ref-repair` — create new branch
- [x] Task 2: Write `scripts/backup-before-repair.mjs`
- [x] Task 3: Run backup — confirm non-empty
- [x] Task 4: Write `scripts/repair-recipe-references.mjs`
- [x] Task 5: Run dry-run — confirm counts
- [x] Task 6: Run `--write` — confirm 118 fixed
- [x] Task 7: `ingredient.model.ts` — add `nameSnapshot?: string`
- [x] Task 8: `recipe-form.service.ts` `createIngredientGroup` — add nameSnapshot control
- [x] Task 9: `recipe-form.service.ts` `buildRecipeFromForm` — persist nameSnapshot
- [x] Task 10: `recipe-form.service.ts` `patchFormFromRecipe` — patch nameSnapshot
- [x] Task 11: `recipe-ingredients-table.component.ts` `onItemSelected` — write nameSnapshot
- [x] Task 12: `recipe-ingredients-table.component.ts` `getDisplayName` — nameSnapshot fallback
- [x] Task 13: `recipe-ingredients-table.component.html` — unlinked marker
- [x] Task 14: Run `--write --backfill-snapshot`
- [x] Task 15: `scripts/seed-from-dump.js` — add count safety check

---

### Plan 249 — Catalog Seeder Data Quality + Supplier Model (`plans/249-seeder-data-quality.plan.md`)
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

### Plan 233 — Gemini Direct API + Modal Status Feedback (`plans/233-gemini-direct-api-modal-status.plan.md`) ✅❌ INTENTIONALLY PARTIAL
> **Architecture pivot 2026-04-19:** Direct fetch + localStorage API key approach was dropped in favour of backend proxy (`/api/v1/ai/*`). Key lives server-side. Only the modal status feedback tasks were implemented.

- [ ] ~~`gemini.service.ts` — fetch-based direct API, apiKey_ signal, hasKey, setApiKey()~~ **DROPPED — backend proxy kept; API key is server-side**
- [ ] ~~`ai-recipe-modal.component.ts` — configuringKey_/keyInput_ signals, onSaveKey, API key guard~~ **DROPPED — no client-side key management**
- [ ] ~~`ai-recipe-modal.component.html` — key config panel~~ **DROPPED**
- [x] `ai-recipe-modal.component.ts` — status_ signal (idle/sending/done/error), onClose, status bar in HTML — **DONE**
- [x] `ng build` — verify zero errors

---

### Plan 248 — Transloco Migration (`plans/248-transloco-migration.plan.md`)
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

---

### Plan 247 — Reflect: self-improving skills system (`plans/247-reflect-skill-improvement-loop.plan.md`)
- [ ] Create `.claude/reflect/test-suites/` directory
- [ ] Create `.claude/reflect/test-suite-template.md`
- [ ] Create `.claude/reflect/evaluator.md` (immutable scoring)
- [ ] Create `.claude/reflect/reflection-log.tsv` (header only)
- [ ] Create `.claude/reflect/test-suites/angularComponentStructure.tests.md`
- [ ] Create `.claude/commands/reflect.md` (orchestrator)
- [ ] Verify all files exist and paths are correct

---

## 🔴 Quick Fixes

### Plan 251 — Recipe Builder Ingredient Name Display Fix (`plans/251-recipe-builder-ingredient-name-display.plan.md`)
- [x] Task 1: `recipe-form.service.ts` — add `name_hebrew` to `lastGroup.patchValue(...)` in `patchFormFromRecipe`
- [x] Task 2: `recipe-ingredients-table.component.ts` — add `protected getDisplayName(group: FormGroup): string` method in GETTERS section
- [x] Task 3: `recipe-ingredients-table.component.html` — replace `{{ group.get('name_hebrew')?.value }}` with `{{ getDisplayName(group) }}`

---

## 🔴 Quick Fixes

### Plan 134 — Translation and confirmation modals unified (`plans/134-translation-confirmation-modals-unified.plan.md`) [TRIAGED 2026-04-02]

- [x] Other entry points: align with resolve first → modal if needed → already in parameter (metadata-manager, preparation-*, menu-section-categories, add-equipment-modal, recipe-workflow, add-supplier-flow)

### Plan 074 — Tech debt remediation (`plans/074-tech-debt-remediation.plan.md`) [TRIAGED 2026-04-02]

- [x] Refactor menu-intelligence.page.scss into partials (deferred)

### Plan 167 — Category/unit add-new audit (`plans/167-category-unit-add-new-audit.plan.md`) [TRIAGED 2026-04-02]
- [x] Optional: Cook-view “add new unit” so user can add from there

---

## 🟡 Medium

### Plan 182 + 163 — Visual & UX fix backlog (`plans/182-tofix-verification-undone.plan.md`, `plans/163-tofix-audit-prd.plan.md`)
- [x] Recipe builder: remove up/down arrows in section titles — no such buttons exist (N/A)
- [x] Recipe builder: clicking a card header collapses/expands it — already implemented on all 3 sections
- [x] Logistics: chip labels get cut off — fixed flex-wrap + flex-shrink + fit-content
- [x] Activity: “what changed” tag should show the old and new value (e.g. “Unit: kg → g”) — already done
- [x] Add new category modal: focus flows Hebrew first — inline inputs, no focus gap found (N/A)
- [x] App-wide: audit every category/unit dropdown — add “add new” option — added NEW_UNIT sentinel to product-form UOM select
- [x] Labels: you should be able to select existing labels — already works via app-custom-multi-select
- [x] Menu library: keyboard navigation — app-custom-select already has built-in keyboard nav
- [x] Lists: sidebar aligns correctly to the list container on smaller screens (768px) — already fixed on branch

---

## 🟠 Large Refactors

### Plan 089 — Menu Intelligence Upgrade (`plans/089-menu-intelligence-upgrade.plan.md`)

- [ ] A: Auto-name menu with formatted date when name is empty on save, with duplicate handling (1), (2)
- [ ] Timestamps: Add updated_at_ to MenuEvent model; set created_at_ on create and updated_at_ on every save
- [x] B: Set event_date_ default to today's date for new menus
- [x] C: Redesign guest counter as unified pill-shaped container with paper-blend styling
- [x] D1: Tie food cost calculation to serving_portions * guest_count, update service and component
- [x] D2: Show sell_price inline next to dish name for all menu types
- [x] E1: Make toolbar collapsible with fixed overlay when opened
- [x] E2: Create floating FAB on right side with pop-up buttons for toolbar and back navigation
- [x] Dictionary: Add new Hebrew dictionary keys for new labels

### Plan 081 — toFix Detailed Plans (`plans/081-tofix-detailed-plans.plan.md`)

- [ ] Section 1 — Sign-in / Sign-up: auto-focus, dev user dropdown, Enter-to-submit, field-level errors
- [ ] Section 2 — Quick-add default base unit: set signal to 'gram'
- [ ] Section 3 — Recipe view: number formatting pipe, unit-before-scale, ingredient alignment
- [ ] Section 4 — Recipe builder: persist container state, remove arrows, custom qty buttons, clickable headers, CDK drag-drop
- [ ] Section 5 — Maison Plus (dish prep list): row style, qty buttons, category-first add flow, auto-focus
- [ ] Section 6 — App-wide category/unit dropdowns: add 'add new' sentinel option to every dropdown
- [ ] Section 7 — Logistics: chip fit-content width, keyboard navigation with highlighted index
- [ ] Section 8 — Add-equipment modal: single-step category creation quick-save flow
- [ ] Section 9 — Labels: selectable existing labels in delete UI and recipe builder

### Plan 133 — List quick-edit inline (`plans/unused-133-list-quick-edit-inline.plan.md`)

- [ ] Inventory product list: editable cells (supplier, category, unit); value click → inline dropdown; row click → edit page
- [ ] Supplier list: keep panel on row click; add quick-edit for chosen cells (e.g. contact, delivery, min order)
- [ ] Keyboard and a11y: focus model, focus trap in inline control, Esc/Enter, return focus, screen reader labels (partial: aria-label on buttons)
- [ ] Venue list / Recipe-book list: optional quick-edit columns as needed

### Plan 072 — Robust login, app-wide logging, security (`plans/072-robust-login-app-logging-security.plan.md`)

- [ ] Wire logging: auth (login/logout/signup/guard/401), HTTP interceptor, global ErrorHandler, critical CRUD in data services
- [ ] Auth hardening: password in UI, credentials types, local hash-only storage, auth abstraction, guard/modal wiring
- [ ] Backend-ready: environment files, API contract, HTTP provider, interceptor, token lifecycle
- [ ] Add “Security & go-live” checklist to docs (HTTPS, headers, rate limiting, no secrets in repo, error exposure)

---

## 🔵 Infrastructure / Planning

### Plan 222 — Dev Machine Open Ports Security Hardening (`plans/222-dev-machine-open-ports-security.plan.md`)
- [ ] Disable Dell SupportAssist service in `services.msc` — verify port 9012 closed
- [ ] Identify and resolve port 5700 (VMware/Hyper-V/Windows component)
- [ ] Verify MongoDB auth enabled in `mongod.cfg` — confirm `--auth` flag present
- [ ] Evaluate SMB usage — disable ports 445/139 if not file-sharing on LAN

### Plan 200 — Lite skills refactor validation report (`plans/200-lite-skills-refactor-validation-report.plan.md`)
- [ ] Pre-write verification: content check (`toBe/skills/commit-to-github.md`, `toBe/agents/breadcrumb-navigator.md`); Master §3–5 completeness in `toBe/copilot-instructions.md`; confirm no legacy `quick-chat` skill
- [ ] Write `notes/comparative-analysis-report.md` (15 sections + appendices A–C per plan)
- [ ] Cross-check Go/No-Go §9 vs Plan 198; reference Plans 198 and 199 in report
- [ ] Post-write: tables render, Appendix B sums match session headline, internal consistency pass

### Plan 199 — Lite refactor workflow comparative analysis (`plans/199-lite-refactor-workflow-comparative-analysis.plan.md`)
- [ ] Policy: Treat Master (`copilot-instructions.md`) as OS; agents/skills as thin apps — no duplicate rule blocks in agent files
- [ ] Enforce Efficiency Tier routing (High Reasoning vs Fast/Flash) for planning, decomposition, and procedural phases
- [ ] Keep skills phase-based procedural workflows; use argument shortcuts (`c`, `s`, `sl`, `sf`) per commit-to-github skill
- [ ] Track context-load goal (~73% reduction vs Legacy) when editing agent/skill bundles — avoid re-bloating personas
- [ ] Cross-link: execution work continues under Plan 198 (promote `.claude/toBe/`, §0.5 Model Routing, security migration QA)

### Plan 196 — Commit flow speed audit (`plans/196-commit-flow-speed-audit.plan.md`)
- [ ] Add approved-tree drift check before any git write and auto-replan logic
- [ ] Rebase/sync branch before commit plan generation when behind origin/main
- [ ] Create conflict-resolution policy for known files with auto/manual boundaries
- [ ] Split PR merge and remote branch deletion into explicit verified steps
- [ ] Record per-phase timing metrics for each commit workflow run

### Plan 122 — AI Chatbot Gemini scope (`plans/122-ai-chatbot-gemini-scope.plan.md`)

- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation → recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set

### Phase 1 — Stabilize & Complete (`plans/010-product-roadmap.plan.md`)

- [ ] When adding new features: add/update `.spec.ts` and mark related sub-tasks here; run the full test suite only at commit time (Phase 0) or when the user explicitly asks — not after every iteration.

### Phase 2 — Product Enhancement

- [ ] **Plan 011 (KPI expansion, optional)**: Further dashboard enhancements per roadmap if desired.
- [ ] **Plan 013 — Recipe Quick Actions**: Duplicate recipe, approval toggle in recipe book list, batch select/actions.
- [ ] **Plan 014 — Low Stock Alerts**: Visual indicators in inventory list, filter toggle, dashboard card.

### Phase 3 — Polish & Production Readiness

- [ ] **Plan 015 — Empty States & Onboarding**: Empty-state UX for all list views, first-use guidance, Hebrew copy.
- [ ] **Plan 016 — Print-Friendly Recipe View**: Print stylesheet, hide navigation in print, RTL-aware layout, print button.
- [ ] **Plan 018 — Backend API Preparation**: Formalize `IStorageAdapter`, document REST API contract, audit adapter compliance.
- [ ] **Deployment Pipeline**: Validate and activate GitHub Actions workflow for GitHub Pages.

### Plan 060 — Data persistence and backup (`plans/060-data-persistence-and-backup.plan.md`)

- [ ] Optional: debounced auto-download per category for physical JSON on every change.

### Plan 059 — Unify design engine (`plans/059-unify-design-engine.plan.md`)

Execution plan: `plans/059-1-unify-design-engine-refactor.plan.md`

- [ ] Phase 9: Deferred — grid header/cell too coupled to display:contents layout
- [ ] Phase 10: Deferred — breakpoint/transition standardization for follow-up

### Plan 047 — Recipe Builder Polish (`plans/047-recipe-builder-polish.plan.md`)

- [x] B3: Volume conversion fix (unverifiable without spec; needs acceptance criteria)

---

## Done

Completed entries are in [todo-archive.md](todo-archive.md).

## Plan Index (for reference)

| Plan | Name | Status |
|------|------|--------|
| 200 | Lite skills refactor validation report | Planned |
| 199 | Lite refactor workflow comparative analysis | Planned |
| 198 | Lite agent refactor adoption | Done |
| 002 | Recipe Header Scaling & Dish Mode | Done |
| 003 | Recipe Ingredients Table Enhancement | Done |
| 004 | Recipe Workflow Enhancement | Done |
| 005 | Inventory Page Enhancement | Done |
| 005-1 | Inventory List Refactor | Done |
| 006 | Recipe Workflow Refactor | Done |
| 006-1 | Preparation Global vs Specific | Done |
| 006-2 | Preparation Category Change Modal | Done |
| 007 | Product Form Enhancement | Done |
| 008 | Recipe Book Page | Done |
| 009 | Cohesive Add Item Modal | Done |
| 010 | Product Roadmap: V1 Completion & Beyond | Active |
| 011 | Unify Dashboard & Command Center | Done |
| — | Recipe Builder: scaling, bruto, weight/volume toggle, unconvertible notice | Done |
| 012 | Kitchen Demo Data (original) | Done |
| 012-1 | Kitchen Demo Data and Recipes | Done |
| 012-2 | Kitchen Demo Data Full Values | Done |
| 012b | Supplier Management Page | Done |
| 013 | Recipe Quick Actions | Planned |
| 014 | Low Stock Alerts | Planned |
| 015 | Empty States & Onboarding | Planned |
| 016 | Print-Friendly Recipe View | Planned |
| 017 | Recipe Book List UX Overhaul | Done |
| 018 | Backend API Preparation | Planned |
| 019 | Recipe Cook View Page | Done |
| 020 | Cook View UX Overhaul | Done |
| 021 | Cook View Workflow Fix Redesign | Done |
| 022 | Recipe Builder Focus and Save | Done |
| 023 | Cook View Workflow Fix Redesign (dup) | Done |
| 024 | Full Project QA Audit | Done |
| 025 | Menu Intelligence Module | Done |
| 026 | Menu Builder UX Styling | Done |
| 027 | Sidebar Filter UX | Done |
| 028 | CSS Layer Token Hierarchy Skill Update | Done |
| 029 | SCSS Global Tokens Audit Refactor | Done |
| 030 | Contextual Logistics Layer | Done |
| 031 | Menu Library Style UX | Done |
| 032 | Custom Cooking Loader | Done |
| 033 | Liquid Glass Design System | Done |
| 034 | Recipe Builder UI Fixes | Done |
| 035 | Header and Navigation Refactor | Done |
| 036 | Dashboard Control Panel Fixed Tabs | Done |
| 037 | Recipe Labels Refactor | Done |
| 038 | Inverted-L List Layout | Done |
| 039 | List UX Panel and Scroll | Done |
| 040 | Menu Intelligence Layout and Design | Done |
| 041 | Menu Intelligence UX Fixes | Done |
| 042 | Menu Intelligence Metadata Redesign | Active |
| 043 | Reusable dropdown with scroll arrows | Done |
| 044 | Custom dropdown for all selects | Done |
| 045 | Logistics tools and menu type edit | Done |
| 046 | Cook-view scale by ingredient | Done |
| 046-1 | Cook-view scale-by UX fixes | Done |
| 047 | Recipe Builder Polish | Done (B3 deferred until spec) |
| 048 | Menu Intelligence UX Polish | Done |
| 049 | Menu Intelligence Layout and UX Fixes | Done |
| 050 | Recipe list labels, panel, header, menu UX | Active |
| 051 | Recipe builder UX fixes | Done |
| 053 | Todo audit and fixes | Done |
| 054 | Unify modal styles | Done |
| 055 | SCSS cssLayer audit fix | Done |
| 056 | Table carousel columns | Active |
| 057 | Plans folder full audit | Done |
| 058 | Sidebar collapse and floating | Active |
| 059 | Unify design engine | Active |
| 059-1 | Unify design engine refactor (execution) | Active |
| 060 | Data persistence and backup | Done |
| 061 | Header carousel shift controls | Active |
| 062 | Auth single source and sign-in/up | Done |
| 062-1 | Fix FAB and cook-view guest access | Done |
| 063 | Recipe book carousel media query, behavior, design | Active |
| 064 | Inventory list grid layout refactor | Active |
| 065 | Carousel title and inventory carousel | Done |
| 066 | Quick-add product modal | Active |
| 069 | Unused and redundant code cleanup | Planned |
| 070 | Recipe carousel header label sync | Done |
| 071 | Unified list design system | Done |
| 072 | Robust login, app-wide logging, security | Planned |
| 073 | Log file in project (dev) | Active |
| 074 | Tech debt remediation | Active |
| 076 | Unified add-recipe skill and create-if-missing | Done |
| 077 | Excel export feature | Done |
| 078 | Logistics designated storage | Active |
| 079 | Unify logistics search, remove From library | Done |
| 080 | Entity storage audit designated | Active |
|| 081 | toFix Detailed Plans | Planned |
| 082 | Recipe/Dish date added | Done |
| 085 | Optimize commit-GitHub skill | Done |
| 086 | AI Tooling Optimization | Active |
| 087 | Timestamp All Added Items | Active |
| 088 | Metadata Manager Expansion | Active |
|| 089 | Menu Intelligence Upgrade | Active |
| 090 | Whole-project logging audit | Active |
| 091 | Menu intelligence inputs and layout | Active |
| 094 | Inline Edit & Supplier Modal | Done |
| 095 | Menu Intelligence Gap Report | Planned |
| 096 | Supplier Modal Styling Upgrade | Active |
| 098 | Remove Supplier Modal Edit Redundancy | Active |
| 099 | Calculation and Shopping List Testing | Active |
| 102 | Unified export refactor | Active |
| 105 | Persist sidebar open/close state | Active |
| 107 | Export localization and design | Done |
| 108 | Recipe export and view spreadsheet layout | Active |
| 109 | Translate section categories | Planned |
| 111 | Unify metadata manager containers | Done |
| 112 | Dish dropdown width and keyboard | Planned |
| 113 | Use only prep_categories; discard mise_categories | Done |
| 116 | Center main loader in viewport | Done |
| 117 | Dish row absolute actions | Done |
| 118 | Sidebar close on breakpoint | Planned |
| 120 | Export "All" view option (recipe + menu) + cost per portion fix | Active |
| 121 | Product units display fix (Edit form + ingredient unit select) | Active |
| 122 | AI Chatbot Gemini scope (conceptual) | Planned |
| 123 | Recipe builder product-only units + persist new unit to product | Active |
| 124 | Unified styling audit and theme | Active |
| 126 | Purchase unit recipe builder fix | Active |
| 127 | Recipe builder cost display fix | Active |
| 128 | Hebrew canonical value resolution | Done |
| 129 | Post-execute verification bullets | Active |
| 130 | Numeric precision audit | Done |
| 131 | Spec coverage techdebt commit | Active |
| 132 | Translation add-value flow | Done |
| 133 | List quick-edit inline | Planned |
| 136 | Product form keyboard focus | Active |
| 137 | Techdebt spec coverage agent adherence | Active |
| 139 | Menu intelligence keyboard focus | Active |
| 140 | Recipe builder real-changes confirmation | Active |
| 138 | Product form header redesign | Active |
| 135 | Translation modal cancel guard title fix | Active |
| 134 | Translation and confirmation modals unified | Active |
| 141 | Hero FAB refactor and page-specific actions | Active |
| 142 | FAB Add-new for list pages | Active |
| 143 | Cook-view recipe yield units | Done |
| 144 | Precision-based counter step | Active |
| 145 | Secondary unit dropdown fix | Active |
| 150 | Secondary units in ingredient dropdown | Active |
| 163 | toFix audit PRD | Planned |
| 163-2 | Unit-creator keyboard flow | Active |
| 169 | List quick-edit UX overlay | Active |
| 170 | Add-new option and styling | Done |
| 167 | Category/unit add-new audit | Active |
| 163-1 | Cook-view ingredient alignment (2.1) | Active |
| 165 | Maison Plus row style | Done |
| 164 | Custom select preserve text on focus | Planned |
| 162 | No-auto-test agent rule | Active |
| 160 | Global user message queue | Active |
| 159 | Type-to-filter all dropdowns | Active |
| 157 | Fix sidebar alignment and close on breakpoint | Active |
| 156 | Category single-input type-in | Active |
| 155 | List shell and cell expand | Active |
| 153 | Recipe approve stamp button | Active |
| 152 | Recipe book date filter sidebar | Planned |
| 151 | Recipe secondary unit conversion | Active |
| 173 | Selected-item-display whole clickable | Active |
| 177 | Workflow select behavior | Merged into 178 |
| 178 | App-wide custom-select behavior | Active |
| 182 | toFix verification undone | Planned |
| 183 | Agent Intelligence Map and Optimization | Done |
| 190 | Agent process optimization | Done |
| 191 | Dashboard QA: Specs, data-testid, Pattern Fixes | Done |
| 190 | Master De-Spaghettification Map | Done |
| 192 | Pillar 3 Reactive Loop Hardening (A13–A17) | Done |
| 196 | Commit flow speed audit | Planned |
| 222 | Dev Machine Open Ports Security Hardening | Planned |
| 248 | Transloco Migration | Planned |

*Excluded from audit: `plans/recipe-builder-page.md` (recipe book plan).*

### Plan 276 — Design System Token Gaps + Cook Mode Overlay
- [x] A1: Add 7 missing token categories to src/styles.scss :root
- [x] B1: Create cook-mode.component.ts (signals, inputs, timer logic)
- [x] B2: Create cook-mode.component.html (3-variant template)
- [x] B3: Create cook-mode.component.scss (RTL, tokens, variant styles)
- [x] B4: Timer logic (start/pause/reset/step-change)
- [x] B5: Ingredient check-off toggle
- [x] B6: Swipe gesture handler (touch, RTL-aware)
- [x] B7: Wake lock (feature-detect)
- [x] C1: Add cook_mode_* translation keys to dictionary.json
- [x] C2: Wire "Start Cook Mode" button in cook-view.page
- [x] D1: ng build verification

---

## Workflow Evolution

- [x] **2026-04-28** Reflect test-drive verdict — **RESOLVED 2026-07-09**: **PARK / superseded by three-agent cutover**. Harness `.claude/reflect/test-drive/` absent (deleted in cutover). Default PARK for under-logged runs applied retrospectively; no KEEP/REBUILD.
- [x] **2026-04-28** Remove reflect reminder from `end-session/SKILL.md` — **RESOLVED 2026-07-09**: **obsolete / superseded**. Skill already gone with cutover; no further action.
- [x] **2026-05-04** Reflect system verdict — **RESOLVED 2026-07-09**: **PARK / superseded by three-agent cutover** (same outcome as 2026-04-28 test-drive closeout).
- [x] **2026-05-04** Agent roster 2-week review — **RESOLVED 2026-07-09**: Kept all 6 live agents as-is — `git-agent`, `mobile-flow-auditor`, `qa-engineer`, `render-flow-auditor`, `security-officer`, `team-leader`. Each referenced by ≥1 live command and/or `CLAUDE.md` / `.cursorrules`. `invocation-log.tsv` is stale (pre-cutover `scss-implementer` only). No further removals this pass.

---

### Plan 276 — Mobile audit fix: rtl-fab (`plans/276-mobile-audit-rtl-fab.plan.md`)
- [x] `hero-fab.component.scss` line 4 — `left: 0.75rem` → `inset-inline-end: 0.75rem`
- [x] `hero-fab.component.scss` line 110 — `left: 0.5rem` → `inset-inline-end: 0.5rem`
- [x] Run `ng build` — 0 errors
- [ ] Re-run `/mobile-flow-audit --only dashboard --only recipe-builder-new-prep --only signup`
- [ ] Update TRIAGE.md — Cluster 1 ✓ resolved

---

### Plan 277 — Mobile audit fix: ingredient-grid-mobile (`plans/277-mobile-audit-ingredient-grid-mobile.plan.md`)
- [x] `recipe-ingredients-table.component.scss` — add 5th column `2.75rem` to mobile grid template
- [x] Remove `display: none` from `.col-actions` in `@media (max-width: 640px)` block; assign `grid-column: 5`; set `.c-icon-btn { opacity: 1; min-width/height: 2.75rem }`
- [x] Run `ng build` — 0 errors
- [ ] Re-run `/mobile-flow-audit --only recipe-builder-new-prep --only recipe-builder-new-dish`
- [ ] Update TRIAGE.md — Cluster 2 C2/C4/DC1/DC2 ✓ resolved

---

### Plan 278 — Mobile audit fix: bottom-nav-occlusion (`plans/278-mobile-audit-bottom-nav-occlusion.plan.md`)
- [x] `_toolbar.scss` `.financial-bar` — `z-index: 201`; `@media ≤620px { bottom: 3.5rem }`
- [x] Menu-intelligence page SCSS — add `padding-block-end: calc(3.5rem + env(safe-area-inset-bottom,0))`
- [x] Venues-add SCSS — same `padding-block-end`
- [x] Inventory-add/edit SCSS — same `padding-block-end`
- [x] Equipment-add SCSS — same `padding-block-end`
- [x] Run `ng build` — 0 errors
- [ ] Re-run `/mobile-flow-audit --only menu-intelligence-event --only venues-add --only inventory-add-product --only inventory-edit-product --only equipment-add`
- [ ] Update TRIAGE.md — Cluster 4 ✓ resolved

---

### Plan 279 — Mobile audit fix: sticky-header-safe-zone (`plans/279-mobile-audit-sticky-header-safe-zone.plan.md`)
- [x] `dashboard.page.scss` `.dashboard-content` — add `@media (max-width: 620px) { padding-block-start: 3.875rem; }`
- [x] `recipe-book-list.component.scss` — add same `padding-block-start: 3.875rem` at ≤620px
- [x] Run `ng build` — 0 errors
- [ ] Re-run `/mobile-flow-audit --only dashboard --only recipe-book-list`
- [ ] Update TRIAGE.md — Cluster 5 ✓ resolved

---

### Plan 280 — Mobile audit fix: rtl-layout (`plans/280-mobile-audit-rtl-layout.plan.md`)
- [x] `recipe-book-list.component.scss` — fix filter close button `left:` → `inset-inline-end:` and search icon position
- [x] Suppliers SCSS — add `padding-inline-end: 0.75rem` to page title at mobile
- [x] Venues SCSS — fix "הוסף שורה" button icon order for RTL
- [x] `trash.page.scss` line 164 — `margin-right: auto` → `margin-inline-end: auto`
- [x] Run `ng build` — 0 errors
- [ ] Re-run `/mobile-flow-audit --only recipe-book-list --only suppliers-add --only venues-add --only trash-restore`
- [ ] Update TRIAGE.md — Cluster 6 ✓ resolved

---

### Plan 281 — Mobile audit fix: input-overflow (`plans/281-mobile-audit-input-overflow.plan.md`)
- [x] `recipe-builder.page.scss` — recipe name input: `text-overflow: ellipsis`, `overflow: hidden`
- [x] `recipe-builder.page.scss` — yield vessel search: `width: 100%`, `min-width: 0`
- [x] `recipe-ingredients-table.component.scss` mobile block — ensure `.col-name .grid-input` has `width: 100%`, `min-width: 0`
- [x] Prep-item search input — fix `padding-inline-end` for search icon
- [x] Run `ng build` — 0 errors
- [ ] Re-run `/mobile-flow-audit --only recipe-builder-new-prep --only recipe-builder-new-dish --only recipe-builder-edit`
- [ ] Update TRIAGE.md — Cluster 7 ✓ resolved

---

### Plan 282 — Mobile audit fix: dropdown-z-index (`plans/282-mobile-audit-dropdown-z-index.plan.md`)
- [x] Inventory edit TS — fix `onCategorySelect` to close dropdown after selection
- [x] Inventory edit template — verify `[multiple]="false"` on category ng-select
- [x] Inventory edit TS — fix duplicate-name validator to exclude current product ID
- [x] `styles.scss` — add global Escape dismiss for ng-select dropdowns if missing
- [x] Inventory SCSS — add `max-height: 40vh; overflow-y: auto` for category dropdown panel at ≤620px
- [x] Run `ng build` — 0 errors
- [ ] Re-run `/mobile-flow-audit --only inventory-edit-product --only inventory-add-product --only recipe-builder-new-dish`
- [ ] Update TRIAGE.md — Cluster 8 + DEF-IE-02 ✓ resolved

---

### Plan 283 — Mobile audit fix: touch-target-size (`plans/283-mobile-audit-touch-target-size.plan.md`)
- [x] `trash.page.scss` `.btn-item` — add `min-block-size: 2.75rem`
- [x] `trash.page.scss` `.btn-action` — add `min-block-size: 2.75rem`
- [x] `recipe-book-list.component.scss` — row action buttons: add `min-inline-size: 2.75rem; min-block-size: 2.75rem`
- [x] Run `ng build` — 0 errors
- [ ] Re-run `/mobile-flow-audit --only trash-restore --only recipe-book-list`
- [ ] Update TRIAGE.md — Cluster 10 ✓ resolved

---

### Plan 284 — Context Monitor Token Rewrite (`plans/284-context-monitor-token-rewrite.plan.md`)

- [x] Task 1: Create `.claude/config/model-context-windows.json` — model → context-window map
- [x] Task 2: Create `scripts/context-monitor.py` — token-based, session-scoped, 3-tier warnings, override support
- [x] Task 3: Create `.claude/commands/context-override.md` — slash command to suppress warnings 30 min
- [ ] Task 4: Simplify `scripts/pre-compact-reminder.sh` — remove baseline block, add SESSION SAVE TARGET reference + Post-Compact Resume instruction
- [ ] Task 5: Update `scripts/session-startup.sh` — add post-compact resume reminder line
- [x] Task 6: Update `.claude/settings.json` — swap .sh → .py in PostToolUse hook

