# Active Tasks

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

### Plan 245 — Unified context-aware AI modal (`plans/245-unified-ai-modal.plan.md`)
- [x] server/routes/ai.js — add POST /api/v1/ai/patch-recipe endpoint with smart partial-patch system prompt
- [x] gemini.service.ts — add `patchRecipe(currentRecipe, instruction)` method calling new endpoint
- [x] ai-recipe-modal.service.ts — extend to support `open('create')` and `open('edit', currentRecipe, onPatch)`
- [x] ai-recipe-modal.component.ts + .html — add edit-mode UI (instruction textarea + patch preview card)
- [x] recipe-builder.page.ts — replace `onImportTextClick` + `RecipeTextImportModalService` with `onAiEditClick` wired to AiRecipeModalService edit mode
- [x] recipe-header.component.ts + .html — remove `importTextClick` output + `import-text-btn`
- [x] app.component.ts + .html — remove RecipeTextImportModalComponent
- [x] Delete recipe-text-import-modal component (3 files) + recipe-text-import-modal.service.ts
- [x] ng build — verify zero errors

---

### Plan 246 — Create /evaluate-me command (`plans/246-evaluate-me-command.plan.md`)
- [x] Create `.claude/retrospectives/` directory with `.gitkeep`
- [x] Create `.claude/commands/evaluate-me.md` with full retrospective prompt
- [x] Update `agent.md` commands table to include evaluate-me

## 🔴 Quick Fixes

### Plan 244 — Auto-solve command (`plans/244-auto-solve-command.plan.md`)
- [x] Create `.claude/commands/auto-solve.md` with full command content (both Playwright prefixes in allowed-tools)
- [x] Edit `.claude/settings.json` — remove "playwright" from disabledMcpjsonServers
- [x] Edit `agent.md` — add auto-solve row to commands table
- [x] Edit `.claude/copilot-instructions.md` — add /auto-solve trigger after Security review line


### Plan 157 — Fix sidebar alignment and close on breakpoint (`plans/157-fix-sidebar-alignment-close-breakpoint.plan.md`)
- [x] List-shell: remove margin-block and max-height from .filter-panel in 768px block
- [x] Inventory list: add afterNextRender + matchMedia to close panel when viewport <= 768px

### Plan 174 — Custom select chip and standalone state (`plans/174-custom-select-chip-and-standalone-state.plan.md`) [TRIAGED 2026-04-02]
- [x] Cook-view ingredients index: add variant=”chip” and typeToFilter to unit selects for consistency with recipe builder
- [x] Verify in app: recipe builder and cook-view ingredients index unit dropdowns

### Plan 169 — List quick-edit UX overlay (`plans/169-list-quick-edit-ux-overlay.plan.md`)
- [ ] Verify first-click open, carousel dropdown visible, row-blur confirm only

### Plan 134 — Translation and confirmation modals unified (`plans/134-translation-confirmation-modals-unified.plan.md`) [TRIAGED 2026-04-02]

- [ ] Other entry points: align with resolve first → modal if needed → already in parameter (metadata-manager, preparation-*, menu-section-categories, add-equipment-modal, recipe-workflow, add-supplier-flow)

### Tech Debt — Audit 2026-03-26 (unplanned items)
- [x] Remove commented import `ProductDataService` at `product-form.component.ts:8` and commented statement at line 927

### Plan 074 â€” Tech debt remediation (`plans/074-tech-debt-remediation.plan.md`) [TRIAGED 2026-04-02]

- [ ] Refactor menu-intelligence.page.scss into partials (deferred)

### Plan 167 — Category/unit add-new audit (`plans/167-category-unit-add-new-audit.plan.md`) [TRIAGED 2026-04-02]
- [ ] Optional: Cook-view “add new unit” so user can add from there

---

## 🟡 Medium

### Plan 219 — Recipe header photo-picker (`plans/219-recipe-header-photo-picker.plan.md`)
- [x] recipe.model.ts — add `imageUrl_?: string` after `hiddenBy?`
- [x] recipe-builder.page.ts — add `recipeImageUrl_` signal after `isApproved_`
- [x] recipe-builder.page.ts — patch `patchFormFromRecipe` to set `recipeImageUrl_`
- [x] recipe-builder.page.ts — replace `buildRecipeFromForm` body to spread `imageUrl_`
- [x] recipe-builder.page.ts — add `recipeImageUrl_.set(null)` as first line of `resetToNewForm_`
- [x] recipe-builder.page.ts — add `onImageChange` method to `//UPDATE` group
- [x] recipe-builder.page.html — add `[imageUrl]`, `(imageChange)`, `[readonlyMode]` to `<app-recipe-header>`
- [x] recipe-header.component.ts — add `readonlyMode` input, `imageChange` output, `onImageSelected` method
- [x] recipe-header.component.html — replace `.image-square` div with label+input+overlay structure
- [x] app.config.ts — import `Camera` and add to `LucideAngularModule.pick`
- [x] recipe-header.component.scss — add cursor + `.img-upload-label` rules (+ fix: display:block + object-position:center)

### Plan 204-R — Inventory product-price util extraction (`plans/204-R-inventory-product-price-util.plan.md`)
- [x] Create `src/app/core/utils/product-price.util.ts` — three pure exports: `getProductUnits`, `getPricePerUnit`, `calcBuyPriceGlobal`
- [x] Delete dead `getProductUnits` method from component (no call sites)
- [x] Replace `getPricePerUnit` body in component with 3-line wrapper (keeps 2-arg template signature)
- [x] Replace `onPriceChange` conversion block with `calcBuyPriceGlobal(...)` call; add util import
- [x] Leave `onUnitChange` conversion block unchanged (inverse math — cannot reuse)
- [x] Verify `ng build` passes


### Plan 182 + 163 — Visual & UX fix backlog (`plans/182-tofix-verification-undone.plan.md`, `plans/163-tofix-audit-prd.plan.md`)
- [ ] Recipe builder: remove up/down arrows in section titles
- [ ] Recipe builder: clicking a card header collapses/expands it (currently only the arrow does)
- [ ] Logistics: chip labels get cut off — make chip width fit the full text
- [ ] Activity: “what changed” tag should show the old and new value (e.g. “Unit: kg → g”), not just that something changed
- [ ] Add new category modal: focus flows Hebrew first, then English (or pre-fills Hebrew and focuses English)
- [ ] App-wide: audit every category/unit dropdown — add “add new” option where it's missing
- [ ] Labels: you should be able to select existing labels in the delete-label screen and recipe builder
- [ ] Menu library: keyboard navigation (arrow keys + Enter) on dropdown options
- [ ] Lists: sidebar aligns correctly to the list container on smaller screens (768px)

---

## 🟠 Large Refactors

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

### Plan 133 — List quick-edit inline (`plans/unused-133-list-quick-edit-inline.plan.md`)

- [ ] Inventory product list: editable cells (supplier, category, unit); value click → inline dropdown; row click → edit page
- [ ] Supplier list: keep panel on row click; add quick-edit for chosen cells (e.g. contact, delivery, min order)
- [ ] Keyboard and a11y: focus model, focus trap in inline control, Esc/Enter, return focus, screen reader labels (partial: aria-label on buttons)
- [ ] Venue list / Recipe-book list: optional quick-edit columns as needed

### Plan 072 â€” Robust login, app-wide logging, security (`plans/072-robust-login-app-logging-security.plan.md`)

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

### Plan 060 â€” Data persistence and backup (`plans/060-data-persistence-and-backup.plan.md`)

- [ ] Optional: debounced auto-download per category for physical JSON on every change.

### Plan 059 â€” Unify design engine (`plans/059-unify-design-engine.plan.md`)

Execution plan: `plans/059-1-unify-design-engine-refactor.plan.md`

- [ ] Phase 9: Deferred â€” grid header/cell too coupled to display:contents layout
- [ ] Phase 10: Deferred â€” breakpoint/transition standardization for follow-up

### Plan 047 â€” Recipe Builder Polish (`plans/047-recipe-builder-polish.plan.md`)

- [ ] B3: Volume conversion fix (unverifiable without spec; needs acceptance criteria)

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

*Excluded from audit: `plans/recipe-builder-page.md` (recipe book plan).*
