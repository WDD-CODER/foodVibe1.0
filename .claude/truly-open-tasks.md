# Truly Open Tasks

> Curated list of all genuinely open work — no duplicates, no archived items.
> Source of truth: `todo.md` (full sub-tasks) | Last synced: 2026-03-29
> Excluded: optional-only items, known dups, archived plans (190/191/198)

---

## Summary

| Group | Count |
|-------|-------|
| 🔴 Quick Fixes | 9 |
| 🟡 Medium | 47 |
| 🟠 Large Refactors | 34 |
| 🔵 Infrastructure / Planning | 24 |
| **Total** | **114** |

---

## 🔴 Quick Fixes
*Small, low-risk, can be completed in one focused session.*

- **229**: `environment.ts` — set apiUrl/authApiUrl to localhost:3000, useBackendAuth to true; run ng build to confirm
- **157.1**: `list-shell` — remove margin-block and max-height from .filter-panel in 768px block
- **157.2**: Inventory list — add afterNextRender + matchMedia to close panel when viewport ≤ 768px
- **174.1**: Cook-view ingredients index — add variant="chip" and typeToFilter to unit selects
- **174.2**: Verify in app: recipe builder and cook-view unit dropdowns match behavior
- **169**: List quick-edit verify — first-click open, carousel dropdown visible, row-blur confirm only
- **134**: Other entry points — align modal resolution flow (metadata-manager, preparation-*, menu-section-categories, add-equipment-modal, recipe-workflow, add-supplier-flow)
- **tech-debt**: Remove commented import `ProductDataService` at `product-form.component.ts:8` and commented statement at line 927
- **074**: Refactor `menu-intelligence.page.scss` into partials (deferred)

---

## 🟡 Medium
*Feature-sized work; each plan is its own session.*

### Plan 219 — Recipe header photo-picker
- [ ] `recipe.model.ts` — add `imageUrl_?: string` after `hiddenBy?`
- [ ] `recipe-builder.page.ts` — add `recipeImageUrl_` signal after `isApproved_`
- [ ] `recipe-builder.page.ts` — patch `patchFormFromRecipe` to set `recipeImageUrl_`
- [ ] `recipe-builder.page.ts` — replace `buildRecipeFromForm` body to spread `imageUrl_`
- [ ] `recipe-builder.page.ts` — add `recipeImageUrl_.set(null)` as first line of `resetToNewForm_`
- [ ] `recipe-builder.page.ts` — add `onImageChange` method to `//UPDATE` group
- [ ] `recipe-builder.page.html` — add `[imageUrl]`, `(imageChange)`, `[readonlyMode]` to `<app-recipe-header>`
- [ ] `recipe-header.component.ts` — add `readonlyMode` input, `imageChange` output, `onImageSelected` method
- [ ] `recipe-header.component.html` — replace `.image-square` div with label+input+overlay structure
- [ ] `app.config.ts` — import `Camera` and add to `LucideAngularModule.pick`
- [ ] `recipe-header.component.scss` — add cursor + `.img-upload-label` rules

### Plan 204-R — Inventory product-price util extraction
- [ ] Create `src/app/core/utils/product-price.util.ts` — three pure exports: `getProductUnits`, `getPricePerUnit`, `calcBuyPriceGlobal`
- [ ] Delete dead `getProductUnits` method from component (no call sites)
- [ ] Replace `getPricePerUnit` body in component with 3-line wrapper (keeps 2-arg template signature)
- [ ] Replace `onPriceChange` conversion block with `calcBuyPriceGlobal(...)` call; add util import
- [ ] Leave `onUnitChange` conversion block unchanged (inverse math — cannot reuse)
- [ ] Verify `ng build` passes

### Plan 197 — AI Framework Redundancy Fix
- [ ] Phase 1: Add subagent gate exemption to `CLAUDE.md`
- [ ] Phase 2: Add main-session-only scope note to `agent.md` preflight
- [ ] Phase 3: Remove duplicate §0.3 agent table from `copilot-instructions.md`
- [ ] Phase 4: Tighten "Apply all project standards" → targeted section refs in 6 agent files
- [ ] Phase 5: Add "Context Scope: gate-exempt" header to `ui-inspector.md`
- [ ] Verification: run `/validate-agent-refs`

### Plan 192 — Pillar 3 Reactive Loop Hardening (A13–A17)
- [ ] A13: Modify `.cursor/rules/session-start.mdc` with first-message guard, state decision tree, and "wrap up" tip
- [ ] A14: Modify `.cursor/rules/session-end.mdc` with expanded trigger phrases and sweep-first prompt
- [ ] A15: Harden Phase 4 Step 6 in `.claude/skills/commit-to-github/SKILL.md` with archive safety gates
- [ ] A17: Modify `.claude/commands/sweep-stale-todos.md` with deferred filter, precise git verification, and 7-day age threshold
- [ ] Validation: Run `validate-agent-refs` and verify no broken references

### Plan 182 — toFix.md verification (undone)
- [ ] Recipe builder: remove chevron up/down arrows in section titles
- [ ] Recipe builder: expandable containers — allow collapse by clicking anywhere on card
- [ ] Logistics: chips grid — chip width fit content so full label visible
- [ ] Activity: change-tag — show clear "what changed" (values, from → to)
- [ ] Add new category modal: two-case focus flow (Hebrew then English, or prefill Hebrew + focus English)
- [ ] Verify/clarify: recipe view alignment; Maison Plus; labels; menu builder keyboard; Plan 147; dashboard; activity scroll; lists sidebar; unit-creator focus; metrics-square gram→volume

### Plan 163 — toFix audit PRD (remaining)
- [ ] 2.3 App-wide: audit category/unit dropdowns for "add new" where applicable
- [ ] 2.4 Labels: selectability in delete-label + recipe builder manual selector
- [ ] 2.5 Menu-library: keyboard (Arrow Up/Down, Enter) on custom-select options
- [ ] 2.7 Lists: sidebar aligned to list container at 768px (list-shell)

### Plan 160 — Global user message queue
- [ ] Refactor UserMsgService to use explicit state (current message, timer, pending queue) instead of concatMap pipeline
- [ ] Success/warning: when current is success/warning, replace text and reset timer; do not enqueue
- [ ] Error: interrupt success/warning; when current is error, enqueue so each error shown in order
- [ ] Add `user-msg.service.spec.ts` with coalesce and error-priority tests

### Plan 124 — Unified styling audit (Phases 4–5)
- [ ] Phase 4: menu-library-list — use c-input-wrapper and c-btn-primary in HTML; recipe-builder main submit use c-btn-primary
- [ ] Phase 5: Spot-check representative pages; search and replace remaining raw colors in `src/**/*.scss`

### Plan 095 — Menu Intelligence Gap Report
- [ ] Add `{ capture: true }` to @HostListener in menu-intelligence.page.ts
- [ ] Wire dish search ngModelChange to onDishSearchQueryChange; add [class.highlighted] and let ri to dish dropdown in HTML
- [ ] Replace dish name span with button + startEditDishName in menu-intelligence.page.html
- [ ] Add .dropdown-item.highlighted and .dish-name-clickable in menu-intelligence.page.scss
- [ ] Optional: section search ngModelChange to onSectionSearchQueryChange if NG5002 appears

### Plan 091 — Menu Intelligence inputs and layout
- [ ] Add SelectOnFocus to sell_price and dish-field inputs; import directive in component
- [ ] Add onSellPriceKeydown and onDishFieldKeydown with 0.25 step for portion fields
- [ ] Wrap dish name + meta toggle in .dish-name-meta; dish-name-cell as grid; .dish-remove out of absolute

### Plan 069 — Unused and redundant code cleanup
- [ ] Remove `@components/*` from tsconfig.json
- [ ] Delete recipe.module.ts, system-health.ts, ingredient.service.ts
- [ ] Update core/breadcrumbs.md and core/services/breadcrumbs.md
- [ ] Remove commented block in metadata-manager.page.component.ts (lines ~219–263)
- [ ] Unit-creator spec: minimal placeholder or delete file
- [ ] Run build and tests to verify

### Plan 066 — Quick-add product modal
- [ ] Create QuickAddProductModalService (signal-based, Promise<Product|null>)
- [ ] Create QuickAddProductModalComponent (compact + expandable, keyboard, OnPush, a11y)
- [ ] Style modal SCSS (engine classes + cssLayer)
- [ ] Update ingredient-search: dropdown condition, add-item row, keyboard fix, auto-select
- [ ] Register modal in app.component; add dictionary keys

### Plan 065 — Carousel title and inventory carousel
- [ ] Recipe-book: remove small label; add one main title (getCarouselHeaderLabel_)
- [ ] Inventory: add carousel (TS: signals + methods; HTML: carousel header + app-cell-carousel in rows; SCSS: desktop 7-col, mobile 5-col + carousel styles)
- [ ] Build and verify

---

## 🟠 Large Refactors
*Multi-session architectural work.*

### Plan 203-R — Recipe-book allergen + cell-expand refactor
- [ ] Create `src/app/core/utils/recipe-allergens.util.ts` — export `MAX_ALLERGEN_RECURSION` + pure `resolveRecipeAllergens` fn
- [ ] Create `src/app/core/utils/cell-expand-state.util.ts` — `CellExpandState` class with signals + helpers
- [ ] Update `recipe-book-list.component.ts` — import constants/util, replace 4 signals with 2 `CellExpandState` instances
- [ ] Update `recipe-book-list.component.ts` — replace `getRecipeAllergens` body with thin wrapper; update `getRecipeProductIds` to import `MAX_ALLERGEN_RECURSION`
- [ ] Update `recipe-book-list.component.ts` — delete 6 expand methods + 2 expand helper methods; add close wrappers + update `resetExpandedCells`
- [ ] Update `recipe-book-list.component.html` — replace 6 method calls in header/body with `allergenExpand.*` / `labelsExpand.*`
- [ ] Verify: `ng build` passes; component under ~600 LOC

### Plan 089 — Menu Intelligence Upgrade
- [ ] A: Auto-name menu with formatted date when name is empty on save, with duplicate handling (1), (2)
- [ ] Timestamps: Add updated_at_ to MenuEvent model; set created_at_ on create and updated_at_ on every save
- [ ] B: Set event_date_ default to today's date for new menus
- [ ] C: Redesign guest counter as unified pill-shaped container with paper-blend styling
- [ ] D1: Tie food cost calculation to serving_portions * guest_count, update service and component
- [ ] D2: Show sell_price inline next to dish name for all menu types
- [ ] E1: Make toolbar collapsible with fixed overlay when opened
- [ ] E2: Create floating FAB on right side with pop-up buttons for toolbar and back navigation
- [ ] Dictionary: Add new Hebrew dictionary keys for new labels

### Plan 081 — toFix Detailed Plans
- [ ] Section 1 — Sign-in / Sign-up: auto-focus, dev user dropdown, Enter-to-submit, field-level errors
- [ ] Section 2 — Quick-add default base unit: set signal to 'gram'
- [ ] Section 3 — Recipe view: number formatting pipe, unit-before-scale, ingredient alignment
- [ ] Section 4 — Recipe builder: persist container state, remove arrows, custom qty buttons, clickable headers, CDK drag-drop
- [ ] Section 5 — Maison Plus (dish prep list): row style, qty buttons, category-first add flow, auto-focus
- [ ] Section 6 — App-wide category/unit dropdowns: add 'add new' sentinel option to every dropdown
- [ ] Section 7 — Logistics: chip fit-content width, keyboard navigation with highlighted index
- [ ] Section 8 — Add-equipment modal: single-step category creation quick-save flow
- [ ] Section 9 — Labels: selectable existing labels in delete UI and recipe builder

### Plan 133 — List quick-edit inline (remaining flows)
- [ ] Inventory product list: editable cells (supplier, category, unit); value click → inline dropdown; row click → edit page
- [ ] Supplier list: keep panel on row click; add quick-edit for chosen cells (e.g. contact, delivery, min order)
- [ ] Keyboard and a11y: focus model, focus trap in inline control, Esc/Enter, return focus, screen reader labels

### Plan 072 — Robust login, app-wide logging, security
- [ ] Wire logging: auth (login/logout/signup/guard/401), HTTP interceptor, global ErrorHandler, critical CRUD in data services
- [ ] Auth hardening: password in UI, credentials types, local hash-only storage, auth abstraction, guard/modal wiring
- [ ] Backend-ready: environment files, API contract, HTTP provider, interceptor, token lifecycle
- [ ] Add "Security & go-live" checklist to docs (HTTPS, headers, rate limiting, no secrets in repo, error exposure)

---

## 🔵 Infrastructure / Planning
*Tooling, docs, environment, conceptual decisions.*

### Plan 222 — Dev Machine Open Ports Security Hardening
- [ ] Disable Dell SupportAssist service in services.msc — verify port 9012 closed
- [ ] Identify and resolve port 5700 (VMware/Hyper-V/Windows component)
- [ ] Verify MongoDB auth enabled in mongod.cfg — confirm --auth flag present
- [ ] Evaluate SMB usage — disable ports 445/139 if not file-sharing on LAN

### Plan 200 — Lite skills refactor validation report
- [ ] Pre-write verification: content check (toBe/skills/commit-to-github.md, toBe/agents/breadcrumb-navigator.md); Master §3–5 completeness; confirm no legacy quick-chat skill
- [ ] Write `notes/comparative-analysis-report.md` (15 sections + appendices A–C per plan)
- [ ] Cross-check Go/No-Go §9 vs Plan 198; reference Plans 198 and 199 in report
- [ ] Post-write: tables render, Appendix B sums match session headline, internal consistency pass

### Plan 199 — Lite refactor workflow comparative analysis
- [ ] Policy: Treat Master (copilot-instructions.md) as OS; agents/skills as thin apps — no duplicate rule blocks in agent files
- [ ] Enforce Efficiency Tier routing (High Reasoning vs Fast/Flash) for planning, decomposition, and procedural phases
- [ ] Keep skills phase-based procedural workflows; use argument shortcuts per commit-to-github skill
- [ ] Track context-load goal (~73% reduction vs Legacy) when editing agent/skill bundles — avoid re-bloating personas
- [ ] Cross-link: execution work continues under Plan 198 (promote .claude/toBe/, §0.5 Model Routing, security migration QA)

### Plan 196 — Commit flow speed audit
- [ ] Add approved-tree drift check before any git write and auto-replan logic
- [ ] Rebase/sync branch before commit plan generation when behind origin/main
- [ ] Create conflict-resolution policy for known files with auto/manual boundaries
- [ ] Split PR merge and remote branch deletion into explicit verified steps
- [ ] Record per-phase timing metrics for each commit workflow run

### Plan 122 — AI Chatbot Gemini scope (conceptual — decisions needed)
- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation → recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set

### Roadmap — Phase 1: Stabilize & Complete
- [ ] When adding new features: add/update `.spec.ts` and mark related sub-tasks here; run full test suite only at commit time or on explicit request

### Roadmap — Phase 2: Product Enhancement
- [ ] Plan 013 — Recipe Quick Actions: Duplicate recipe, approval toggle in recipe book list, batch select/actions
- [ ] Plan 014 — Low Stock Alerts: Visual indicators in inventory list, filter toggle, dashboard card

### Roadmap — Phase 3: Polish & Production Readiness
- [ ] Plan 015 — Empty States & Onboarding: Empty-state UX for all list views, first-use guidance, Hebrew copy
- [ ] Plan 016 — Print-Friendly Recipe View: Print stylesheet, hide navigation in print, RTL-aware layout, print button
- [ ] Plan 018 — Backend API Preparation: Formalize IStorageAdapter, document REST API contract, audit adapter compliance
- [ ] Deployment Pipeline: Validate and activate GitHub Actions workflow for GitHub Pages

### Deferred / Blocked
- [ ] Plan 060: Optional — debounced auto-download per category for physical JSON on every change
- [ ] Plan 059 Phase 9: Deferred — grid header/cell too coupled to display:contents layout
- [ ] Plan 059 Phase 10: Deferred — breakpoint/transition standardization
- [ ] Plan 047 B3: Volume conversion fix (unverifiable without spec; needs acceptance criteria)
