# Active Tasks

---

### Plan 227 — Render Deploy Config (`plans/227-render-deploy-config.plan.md`)
- [x] `render.yaml` — create at repo root with web service config (rootDir: server, MONGO_REMOTE_URI, JWT_SECRET, ALLOWED_ORIGIN)
- [x] `angular.json` — verify outputPath matches `dist/food-vibe1.0/browser` in server/index.js

---

### Plan 226 — AI Text Import Parser (`plans/226-ai-text-import-parser.plan.md`)
- [x] `parsed-result.model.ts` — ParsedIngredient, ParsedStep, ParsedRecipe, ParsedDish, ParsedResult
- [x] `gemini.service.ts` — add parseText() via proxy
- [x] `recipe-text-import-modal.service.ts` — signal-based open/close + result
- [x] `recipe-parser.service.ts` — wraps GeminiService; Observable<ParsedResult>; catchError
- [x] `recipe-text-import-modal/` — standalone component, 3 states, confidence warning
- [x] `recipe-header.component.ts+html` — importTextClick output + "ייבוא מטקסט" button
- [x] `recipe-builder.page.ts` — inject, patch form, type mismatch toasts
- [x] `recipe-builder.page.scss` — .just-filled animation
- [x] `app.component.ts+html` — register modal at root
- [x] `dictionary.json` — Hebrew translation keys
- [x] `server/routes/ai.js` — POST /parse-text route
- [ ] `dictionary.json` — Hebrew translation keys

---

### Plan 225 — Gemini AI Proxy — Key Off Client (`plans/225-gemini-ai-proxy.plan.md`)
- [x] `server/routes/ai.js` — create: POST /generate behind verifyToken, calls Gemini with process.env.GEMINI_API_KEY
- [x] `server/index.js` — mount aiRouter at /api/v1/ai
- [x] `.env` — add GEMINI_API_KEY= placeholder
- [x] `gemini.service.ts` — remove apiKey_ signal + localStorage; inject HttpClient; proxy call to /api/v1/ai/generate
- [x] `ai-recipe-modal.component.ts` — remove configuring_, keyInput_, onSaveKey()
- [x] `ai-recipe-modal.component.html` — remove key-config panel blocks
- [x] Run ng build — verify zero errors

---

### Plan 223 — Backend Auth Wire + cookie-parser Fix (`plans/223-backend-auth-wire.plan.md`)
- [x] `server/` — npm install cookie-parser
- [x] `server/index.js` — add cookieParser() middleware after express.json()
- [x] `server/routes/auth.js` — fix login: replace direct safeCompare with PBKDF2 re-derivation
- [x] `user.service.ts` — add HttpClient import + inject; add environment import + authBase
- [x] `user.service.ts` — add storeToken() / clearToken() helpers using 'fv_token'
- [x] `user.service.ts` — add callBackendLogin(), callBackendSignup(), callBackendRefresh(), callBackendLogout()
- [x] `user.service.ts` — update login() with useBackendAuth branch + HTTP error mapping
- [x] `user.service.ts` — update signup() with useBackendAuth branch (hash before send) + error mapping
- [x] `user.service.ts` — update logout() — add clearToken() + fire-and-forget logout POST
- [x] `auth.interceptor.ts` — add silent token refresh on 401 with URL guard to prevent infinite loop
- [x] Run ng build — verify zero errors

---

### Plan 222 — Dev Machine Open Ports Security Hardening (`plans/222-dev-machine-open-ports-security.plan.md`)
- [ ] Disable Dell SupportAssist service in `services.msc` — verify port 9012 closed
- [ ] Identify and resolve port 5700 (VMware/Hyper-V/Windows component)
- [ ] Verify MongoDB auth enabled in `mongod.cfg` — confirm `--auth` flag present
- [ ] Evaluate SMB usage — disable ports 445/139 if not file-sharing on LAN

---

### Plan 221 — Unify recipe delete button (`plans/221-unify-recipe-delete-button.plan.md`)
- [x] `recipe-book-list.component.ts` — add `removingId_` signal; remove `hidingId_` and `permanentDeletingId_`
- [x] `recipe-book-list.component.ts` — mark `onHideRecipe` and `onPermanentlyDeleteRecipe` private; update both to use `removingId_`
- [x] `recipe-book-list.component.ts` — add `onRemoveRecipe(recipe)` unified public method with requireAuth gate + role-based confirm + routing
- [x] `recipe-book-list.component.ts` — update `onBulkDeleteSelected` to call `hideRecipe` (non-admin) or `permanentlyDeleteRecipe` (admin) per recipe
- [x] `recipe-book-list.component.html` — replace two-button block with single unified trash-2 button block guarded by `@if (isLoggedIn())`

### Plan 220 — Add recipe via AI (`plans/220-add-recipe-via-ai.plan.md`)
- [x] `src/app/core/services/ai-recipe-draft.service.ts` — create AiRecipeDraft interface + AiRecipeDraftService
- [x] `src/app/core/services/gemini.service.ts` — create GeminiService with localStorage key, fetch-based generateRecipe
- [x] `src/app/shared/ai-recipe-modal/ai-recipe-modal.service.ts` — create promise-based modal service
- [x] `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts + .html + .scss` — create modal component
- [x] `src/app/appRoot/app.component.ts + .html` — wire AiRecipeModalComponent into root
- [x] `recipe-book-list.component.ts` — add OnInit/OnDestroy + FAB action for AI recipe
- [x] `recipe-builder.page.ts` — inject AiRecipeDraftService, add prefillFromAiDraft, call from ngOnInit
- [x] `public/assets/data/dictionary.json` — add AI recipe translation keys to "general" section

### Plan 219 — Recipe header photo-picker (`plans/219-recipe-header-photo-picker.plan.md`)
- [ ] recipe.model.ts — add `imageUrl_?: string` after `hiddenBy?`
- [ ] recipe-builder.page.ts — add `recipeImageUrl_` signal after `isApproved_`
- [ ] recipe-builder.page.ts — patch `patchFormFromRecipe` to set `recipeImageUrl_`
- [ ] recipe-builder.page.ts — replace `buildRecipeFromForm` body to spread `imageUrl_`
- [ ] recipe-builder.page.ts — add `recipeImageUrl_.set(null)` as first line of `resetToNewForm_`
- [ ] recipe-builder.page.ts — add `onImageChange` method to `//UPDATE` group
- [ ] recipe-builder.page.html — add `[imageUrl]`, `(imageChange)`, `[readonlyMode]` to `<app-recipe-header>`
- [ ] recipe-header.component.ts — add `readonlyMode` input, `imageChange` output, `onImageSelected` method
- [ ] recipe-header.component.html — replace `.image-square` div with label+input+overlay structure
- [ ] app.config.ts — import `Camera` and add to `LucideAngularModule.pick`
- [ ] recipe-header.component.scss — add cursor + `.img-upload-label` rules


### Plan 204-R — Inventory product-price util extraction (`plans/204-R-inventory-product-price-util.plan.md`)
- [ ] Create `src/app/core/utils/product-price.util.ts` — three pure exports: `getProductUnits`, `getPricePerUnit`, `calcBuyPriceGlobal`
- [ ] Delete dead `getProductUnits` method from component (no call sites)
- [ ] Replace `getPricePerUnit` body in component with 3-line wrapper (keeps 2-arg template signature)
- [ ] Replace `onPriceChange` conversion block with `calcBuyPriceGlobal(...)` call; add util import
- [ ] Leave `onUnitChange` conversion block unchanged (inverse math — cannot reuse)
- [ ] Verify `ng build` passes

### Plan 203-R — Recipe-book allergen + cell-expand refactor (`plans/203-R-recipe-book-allergen-cell-expand-refactor.plan.md`)
- [ ] Create `src/app/core/utils/recipe-allergens.util.ts` — export `MAX_ALLERGEN_RECURSION` + pure `resolveRecipeAllergens` fn
- [ ] Create `src/app/core/utils/cell-expand-state.util.ts` — `CellExpandState` class with signals + helpers
- [ ] Update `recipe-book-list.component.ts` — import constants/util, replace 4 signals with 2 `CellExpandState` instances
- [ ] Update `recipe-book-list.component.ts` — replace `getRecipeAllergens` body with thin wrapper; update `getRecipeProductIds` to import `MAX_ALLERGEN_RECURSION`
- [ ] Update `recipe-book-list.component.ts` — delete 6 expand methods + 2 expand helper methods; add close wrappers + update `resetExpandedCells`
- [ ] Update `recipe-book-list.component.html` — replace 6 method calls in header/body with `allergenExpand.*` / `labelsExpand.*`
- [ ] Verify: `ng build` passes; component under ~600 LOC

## Done

Completed entries are in [todo-archive.md](todo-archive.md).

---

## Ahead (Pending)


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

### Plan 198 — Lite agent refactor adoption (`plans/198-lite-agent-refactor-adoption.plan.md`)
- [ ] CRITICAL: Verify Legacy security-officer requirements + 30-item checklist fully migrated to copilot-instructions §5 before retiring Legacy agent
- [ ] HIGH: Fix `.claude/toBe/agents/breadcrumb-navigator.md` content (Navigator vs Architect mismatch)
- [ ] MEDIUM: Lite QA agent — prominent spec-authoring callout (no `.spec.ts` during iterative plan execution)
- [ ] MEDIUM: One Master-section pointer line per Lite agent (delegation cross-references)
- [ ] Adoption: Promote `.claude/toBe/` foundation + agents to canonical paths when 1–3 satisfied; run validate-agent-refs
- [ ] Verification: breadcrumb-navigator + ui-inspector SKILLs hold canonical protocol detail before stripping Legacy agents

### Plan 197 — AI Framework Redundancy Fix (`plans/197-ai-framework-redundancy-fix.plan.md`)
- [ ] Phase 1: Add subagent gate exemption to `CLAUDE.md`
- [ ] Phase 2: Add main-session-only scope note to `agent.md` preflight
- [ ] Phase 3: Remove duplicate §0.3 agent table from `copilot-instructions.md`
- [ ] Phase 4: Tighten "Apply all project standards" → targeted section refs in 6 agent files
- [ ] Phase 5: Add "Context Scope: gate-exempt" header to `ui-inspector.md`
- [ ] Verification: run `/validate-agent-refs`

### Plan 196 — Commit flow speed audit (`plans/196-commit-flow-speed-audit.plan.md`)
- [ ] Add approved-tree drift check before any git write and auto-replan logic
- [ ] Rebase/sync branch before commit plan generation when behind origin/main
- [ ] Create conflict-resolution policy for known files with auto/manual boundaries
- [ ] Split PR merge and remote branch deletion into explicit verified steps
- [ ] Record per-phase timing metrics for each commit workflow run

### Plan 192 — Pillar 3 Reactive Loop Hardening (A13–A17) (`plans/192-reactive-loop-hardening-a13-a17.plan.md`)
- [ ] A13: Modify `.cursor/rules/session-start.mdc` with first-message guard, state decision tree, and "wrap up" tip
- [ ] A14: Modify `.cursor/rules/session-end.mdc` with expanded trigger phrases and sweep-first prompt
- [ ] A15: Harden Phase 4 Step 6 in `.claude/skills/commit-to-github/SKILL.md` with archive safety gates
- [ ] A17: Modify `.claude/commands/sweep-stale-todos.md` with deferred filter, precise git verification, and 7-day age threshold
- [ ] Validation: Run `validate-agent-refs` and verify no broken references

### Plan 190 — Master De-Spaghettification Map (`plans/190-master-de-spaghettification-map.plan.md`)
- [ ] Phase A1: Replace hardcoded Hebrew strings with `translatePipe` keys and dictionary entries (SW-4)
- [ ] Phase A2: Replace orphan button classes with design-system `c-*` tokens in product/metadata flows (HI-1)
- [ ] HI-6: Consolidate scroll-zone scaffold into shared `app-scroll-zone` component
- [ ] SW-5: Decompose god files (`menu-intelligence`, `recipe-builder`, `product-form`)
- [ ] Phase C1: Consolidate list-page signal clusters into shared list state base/composable (HI-4)
- [ ] Phase C2: Consolidate scroll-indicator scaffold into shared scroll-zone infrastructure (HI-6)
- [ ] Phase C3: Decompose god files into page services/sub-components (`menu-intelligence`, `recipe-builder`, `product-form`) (SW-5)

### Plan 182 — toFix.md verification (undone) (`plans/182-tofix-verification-undone.plan.md`)
- [ ] Recipe builder: remove chevron up/down arrows in section titles
- [ ] Recipe builder: expandable containers — allow collapse by clicking anywhere on card
- [ ] Logistics: chips grid — chip width fit content so full label visible
- [ ] Activity: change-tag — show clear "what changed" (values, from → to)
- [ ] Add new category modal: two-case focus flow (Hebrew then English, or prefill Hebrew + focus English)
- [ ] Verify/clarify: recipe view alignment; Maison Plus; labels; menu builder keyboard; Plan 147; dashboard; activity scroll; lists sidebar; unit-creator focus; metrics-square gram→volume

### Plan 174 — Custom select chip and standalone state (`plans/174-custom-select-chip-and-standalone-state.plan.md`)
- [ ] Cook-view ingredients index: add variant="chip" and typeToFilter to unit selects for consistency with recipe builder
- [ ] Verify in app: recipe builder and cook-view ingredients index unit dropdowns


### Plan 169 — List quick-edit UX overlay (`plans/169-list-quick-edit-ux-overlay.plan.md`)
- [ ] Verify first-click open, carousel dropdown visible, row-blur confirm only

### Plan 167 — Category/unit add-new audit (`plans/167-category-unit-add-new-audit.plan.md`)
- [ ] Optional: Cook-view "add new unit" so user can add from there

### Plan 163 — toFix audit PRD (`plans/163-tofix-audit-prd.plan.md`)
- [ ] 2.2 Recipe builder: verify remove up/down arrows in category title (recipe-workflow)
- [ ] 2.3 App-wide: audit category/unit dropdowns for "add new" where applicable
- [ ] 2.4 Labels: selectability in delete-label + recipe builder manual selector
- [ ] 2.5 Menu-library: keyboard (Arrow Up/Down, Enter) on custom-select options
- [ ] 2.7 Lists: sidebar aligned to list container at 768px (list-shell)

### Plan 160 — Global user message queue (`plans/160-global-user-message-queue.plan.md`)
- [ ] Refactor UserMsgService to use explicit state (current message, timer, pending queue) instead of concatMap pipeline
- [ ] Success/warning: when current is success/warning, replace text and reset timer; do not enqueue
- [ ] Error: interrupt success/warning; when current is error, enqueue so each error shown in order
- [ ] Add user-msg.service.spec.ts with coalesce and error-priority tests


### Plan 157 — Fix sidebar alignment and close on breakpoint (`plans/157-fix-sidebar-alignment-close-breakpoint.plan.md`)
- [ ] List-shell: remove margin-block and max-height from .filter-panel in 768px block
- [ ] Inventory list: add afterNextRender + matchMedia to close panel when viewport <= 768px

### Plan 134 — Translation and confirmation modals unified (`plans/134-translation-confirmation-modals-unified.plan.md`)

- [ ] Other entry points: align with resolve first → modal if needed → already in parameter (metadata-manager, preparation-*, menu-section-categories, add-equipment-modal, recipe-workflow, add-supplier-flow)

### Plan 133 — List quick-edit inline (`plans/unused-133-list-quick-edit-inline.plan.md`)

- [ ] Inventory product list: editable cells (supplier, category, unit); value click → inline dropdown; row click → edit page
- [ ] Supplier list: keep panel on row click; add quick-edit for chosen cells (e.g. contact, delivery, min order)
- [ ] Keyboard and a11y: focus model, focus trap in inline control, Esc/Enter, return focus, screen reader labels (partial: aria-label on buttons)
- [ ] Venue list / Recipe-book list: optional quick-edit columns as needed

### Plan 124 — Unified styling audit and theme (`plans/124-unified-styling-audit-theme.plan.md`)

- [ ] Phase 4: menu-library-list — use c-input-wrapper and c-btn-primary in HTML; recipe-builder main submit use c-btn-primary
- [ ] Phase 5: Spot-check representative pages; search and replace remaining raw colors in src/**/*.scss

### Plan 122 — AI Chatbot Gemini scope (`plans/122-ai-chatbot-gemini-scope.plan.md`)

- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation → recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set

### Plan 089 — Menu Intelligence Upgrade (`plans/089-menu-intelligence-upgrade.plan.md`)

- [ ] A: Auto-name menu with formatted date when name is empty on save, with duplicate handling (1), (2)
- [ ] Timestamps: Add updated_at_ to MenuEvent model; set created_at_ on create and updated_at_ on every save
- [ ] B: Set event_date_ default to today's date for new menus
- [ ] C: Redesign guest counter as unified pill-shaped container with paper-blend styling
- [ ] D1: Tie food cost calculation to serving_portions * guest_count, update service and component
- [ ] D2: Show sell_price inline next to dish name for all menu types
- [ ] E1: Make toolbar collapsible with fixed overlay when opened
- [ ] E2: Create floating FAB on right side with pop-up buttons for toolbar and back navigation
- [ ] Dictionary: Add new Hebrew dictionary keys for new labels

### Plan 091 — Menu Intelligence Inputs and Layout (`plans/091-menu-intelligence-inputs-layout.plan.md`)

- [ ] Add SelectOnFocus to sell_price and dish-field inputs; import directive in component
- [ ] Add onSellPriceKeydown and onDishFieldKeydown with 0.25 step for portion fields
- [ ] Wrap dish name + meta toggle in .dish-name-meta; dish-name-cell as grid; .dish-remove out of absolute

### Plan 095 — Menu Intelligence Gap Report (`plans/095-menu-intelligence-gap-report.plan.md`)

- [ ] Add `{ capture: true }` to @HostListener in menu-intelligence.page.ts
- [ ] Wire dish search ngModelChange to onDishSearchQueryChange; add [class.highlighted] and let ri to dish dropdown in HTML
- [ ] Replace dish name span with button + startEditDishName in menu-intelligence.page.html
- [ ] Add .dropdown-item.highlighted and .dish-name-clickable in menu-intelligence.page.scss
- [ ] Optional: section search ngModelChange to onSectionSearchQueryChange if NG5002 appears

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

### Plan 074 â€” Tech debt remediation (`plans/074-tech-debt-remediation.plan.md`)

- [ ] Refactor menu-intelligence.page.scss into partials (deferred)

### Plan 072 â€” Robust login, app-wide logging, security (`plans/072-robust-login-app-logging-security.plan.md`)

- [ ] Wire logging: auth (login/logout/signup/guard/401), HTTP interceptor, global ErrorHandler, critical CRUD in data services
- [ ] Auth hardening: password in UI, credentials types, local hash-only storage, auth abstraction, guard/modal wiring
- [ ] Backend-ready: environment files, API contract, HTTP provider, interceptor, token lifecycle
- [ ] Add "Security & go-live" checklist to docs (HTTPS, headers, rate limiting, no secrets in repo, error exposure)


### Tech Debt — Audit 2026-03-26 (unplanned items)
- [x] Extract `trim().toLowerCase().replace(/\s+/g, '_')` key-sanitization into `core/utils/sanitize-key.util.ts` (2 services: `translation-key-modal.service.ts:30`, `label-creation-modal.service.ts:33`)
- [ ] Remove commented import `ProductDataService` at `product-form.component.ts:8` and commented statement at line 927

### Plan 069 â€” Unused and redundant code cleanup (`plans/069-unused-redundant-code-cleanup.plan.md`)

- [ ] Remove `@components/*` from tsconfig.json
- [ ] Delete recipe.module.ts, system-health.ts, ingredient.service.ts
- [ ] Update core/breadcrumbs.md and core/services/breadcrumbs.md
- [ ] Remove commented block in metadata-manager.page.component.ts (lines ~219â€“263)
- [ ] Unit-creator spec: minimal placeholder or delete file
- [ ] Run build and tests to verify

### Plan 066 â€” Quick-add product modal (`plans/066-quick-add-product-modal.plan.md`)

- [ ] Create QuickAddProductModalService (signal-based, Promise<Product|null>)
- [ ] Create QuickAddProductModalComponent (compact + expandable, keyboard, OnPush, a11y)
- [ ] Style modal SCSS (engine classes + cssLayer)
- [ ] Update ingredient-search: dropdown condition, add-item row, keyboard fix, auto-select
- [ ] Register modal in app.component; add dictionary keys

### Plan 065 â€” Carousel title and inventory carousel (`plans/065-carousel-title-and-inventory-carousel.plan.md`)

- [ ] Recipe-book: remove small label; add one main title (getCarouselHeaderLabel_)
- [ ] Inventory: add carousel (TS: signals + methods; HTML: carousel header + app-cell-carousel in rows; SCSS: desktop 7-col, mobile 5-col + carousel styles)
- [ ] Build and verify

### Plan 060 â€” Data persistence and backup (`plans/060-data-persistence-and-backup.plan.md`)

- [ ] Optional: debounced auto-download per category for physical JSON on every change.

### Plan 059 â€” Unify design engine (`plans/059-unify-design-engine.plan.md`)

Execution plan: `plans/059-1-unify-design-engine-refactor.plan.md`

- [ ] Phase 9: Deferred â€” grid header/cell too coupled to display:contents layout
- [ ] Phase 10: Deferred â€” breakpoint/transition standardization for follow-up

### Plan 047 â€” Recipe Builder Polish (`plans/047-recipe-builder-polish.plan.md`)

- [ ] B3: Volume conversion fix (unverifiable without spec; needs acceptance criteria)

### Phase 1 â€” Stabilize & Complete (`plans/010-product-roadmap.plan.md`)

- [ ] When adding new features: add/update `.spec.ts` and mark related sub-tasks here; run the full test suite only at commit time (Phase 0) or when the user explicitly asks — not after every iteration.

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

## Plan Index (for reference)

| Plan | Name | Status |
|------|------|--------|
| 200 | Lite skills refactor validation report | Planned |
| 199 | Lite refactor workflow comparative analysis | Planned |
| 198 | Lite agent refactor adoption | Planned |
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
| â€” | Recipe Builder: scaling, bruto, weight/volume toggle, unconvertible notice | Done |
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
| 052 | Plan 047 audit report | Planned |
| 053 | Todo audit and fixes | Active |
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
| 065 | Carousel title and inventory carousel | Active |
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
| 190 | Agent process optimization | Planned |
| 191 | Dashboard QA: Specs, data-testid, Pattern Fixes | Active |
| 190 | Master De-Spaghettification Map | Planned |
| 192 | Pillar 3 Reactive Loop Hardening (A13–A17) | Planned |
| 196 | Commit flow speed audit | Planned |
| 222 | Dev Machine Open Ports Security Hardening | Planned |

*Excluded from audit: `plans/recipe-builder-page.md` (recipe book plan).*
