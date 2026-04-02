# Archived Done Tasks

Moved from todo.md to reduce token load.

---

## Done

---

### Plan 233 — Gemini Direct API + Modal Status Feedback (`plans/233-gemini-direct-api-modal-status.plan.md`)
- [x] `gemini.service.ts` — rewrite: fetch-based direct Gemini API call, apiKey_ signal, hasKey computed, setApiKey(), remove HttpClient/dead imports
- [x] `ai-recipe-modal.component.ts` — add configuringKey_/keyInput_/status_ signals, onSaveKey/onClose methods, API key guard in onGenerate(), FormsModule in imports
- [x] `ai-recipe-modal.component.html` — add key config panel + status bar (sending/done/error states)
- [x] `ng build` — verify zero errors

---

### Plan 232 — Backend Collection Registry Standard (`plans/232-backend-collection-registry.plan.md`)
- [x] `.claude/standards-backend.md` — create with 6 sections (22-row collection registry, corrected count)
- [x] `.claude/copilot-instructions.md` — add standards table row for standards-backend.md
- [x] `.claude/copilot-instructions.md` — add §0 Backend persistence trigger bullet
- [x] `.cursor/rules/backend-persistence.mdc` — create with data-service globs
- [x] `.claude/commands/plan-implementation.md` — add Backend Impact output block
- [x] `.claude/commands/execute-it.md` — add Backend Impact check to Execution Rules

---

### Plan 231 — Mongo URI Env Split (`plans/231-mongo-uri-env-split.plan.md`)
- [x] `server/db.js` — rewrite to read single MONGO_URI (remove NODE_ENV branch, MONGO_LOCAL_URI/MONGO_REMOTE_URI)
- [x] `server/.env` — replace split URIs with MONGO_URI=localhost, add PORT=3000, ALLOWED_ORIGIN
- [x] Secrets audit — confirmed server/.env was never committed to git history

---

### Plan 230 — AI Recipe Flow Completion (`plans/230-ai-recipe-flow-completion.plan.md`)
- [x] `recipe-book-list.component.spec.ts` — add Sparkles + HeroFabService + AiRecipeModalService mocks
- [x] `ai-recipe-modal.service.ts` — void open(), private isOpen_, public isOpen accessor
- [x] `ai-recipe-modal.component.ts` — add ChangeDetectionStrategy.OnPush
- [x] `ai-recipe-modal.component.html` — update isOpen_() → isOpen()
- [x] `recipe-builder.page.ts` — move draft consume() inside else block
- [x] `dictionary.json` — add ai_recipe_preview_ingredients + ai_recipe_preview_steps
- [x] Run ng build — zero errors confirmed
- [x] Run ng test — recipe-book-list 9/9 passing; 49 pre-existing failures unchanged

---

### Plan 228 — Backend Awareness in Agent Docs (`plans/228-backend-awareness-agents.plan.md`)
- [x] `.claude/agents/software-architect.md` — add Backend Stack section
- [x] `.claude/agents/product-manager.md` — add backend items to Quality Checklist
- [x] `.claude/agents/qa-engineer.md` — add API Coverage to Test Strategy
- [x] `server/breadcrumbs.md` — create

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

---

### Tech Debt — Audit 2026-03-26 (completed)
- [x] Extract `trim().toLowerCase().replace(/\s+/g, '_')` key-sanitization into `core/utils/sanitize-key.util.ts` (2 services: `translation-key-modal.service.ts:30`, `label-creation-modal.service.ts:33`)

---

### Plan 216 — Dead Code Audit Cleanup (`plans/216-dead-code-audit-cleanup.plan.md`)
- [x] `tsconfig.json` — remove `@components/*` alias
- [x] `metadata-manager.page.component.ts` — remove commented block ~lines 219–263 (already done)
- [x] Delete `src/app/core/components/footer/` (4 files: .ts, .html, .scss, .spec.ts)
- [x] `src/app/core/components/breadcrumbs.md` — remove footer/ row
- [x] Delete `src/app/core/models/filter-category.model.ts`
- [x] Delete `src/app/core/models/filter-option.model.ts`
- [x] Delete `src/app/core/models/units.enum.ts`
- [x] `ng build` — verify zero errors

---

### Plan 215-R — Fix list-state ParamDescriptor<any>[] to remove as any casts (`plans/215-R-list-state-param-descriptor-any.plan.md`)
- [x] `list-state.util.ts`: change `writeSession` param from `ParamDescriptor[]` to `ParamDescriptor<any>[]`
- [x] `list-state.util.ts`: change `useListState` param from `ParamDescriptor[]` to `ParamDescriptor<any>[]`
- [x] `equipment-list.component.ts`: remove 3 `as any` casts (StringParam ×2, StringSetParam ×1)
- [x] `inventory-product-list.component.ts`: remove 2 `as any` casts (NullableStringParam, StringParam)
- [x] `recipe-book-list.component.ts`: remove 2 `as any` casts (NullableStringParam, StringParam)
- [x] `menu-library-list.component.ts`: remove 2 `as any` casts (StringParam ×2)
- [x] `venues-list.component.ts`: remove 1 `as any` cast (StringSetParam)

### Plan 214-R — Extract sanitizeKey utility (`plans/214-R-sanitize-key-util-extraction.plan.md`)
- [x] Create `src/app/core/utils/sanitize-key.util.ts` with `sanitizeKey` export
- [x] `translation-key-modal.service.ts:30` — replace inline expression; add import
- [x] `label-creation-modal.service.ts:33` — replace inline expression; add import
- [x] `key-resolution.service.ts:34` — replace `this.sanitizeAsKey(trimmed)` with `sanitizeKey(trimmed)`
- [x] `key-resolution.service.ts:43` — replace inline expression with `sanitizeKey(result.englishKey)`
- [x] `key-resolution.service.ts:70-72` — delete `sanitizeAsKey` private method; add import
- [x] `ng build` verify clean

---

### Plan 213 — Counter Unified Unit-Aware Stepping (`plans/213-counter-unified-unit-aware-stepping.plan.md`)
- [x] `quantity-step.util.ts`: widen unit to string; replace Plan 210 bucket logic; add UNIT_AWARE_SET/isUnitAware/getUnitAwareStep; wire into quantityIncrement/quantityDecrement/getQuantityStep
- [x] `counter.component.ts`: remove unitAwareIncrement/unitAwareDecrement; simplify routing
- [x] `counter.component.html`: update [step] binding for unit-aware
- [x] `scaling-chip.component.ts`: add stepOptions input
- [x] `scaling-chip.component.html`: add [stepOptions] to app-counter
- [x] `cook-view.page.ts`: add cookViewStepOpts_; update incrementQuantity/decrementQuantity/onEditAmountKeydown/getEditAmountStep
- [x] `cook-view.page.html`: bind cookViewStepOpts_; update keydown/step calls
- [x] `recipe-ingredients-table.component.ts`: add unit to stepOpts
- [x] `recipe-header.component.html`: add [stepOptions] to scaling-chips
- [x] `quantity-step.util.spec.ts`: add unit-aware describe block

---

### Plan 212-R — Slim worktree-session-end + deprecate commit-to-github (`plans/212-R-slim-worktree-session-end-deprecate-commit-skill.plan.md`)
- [x] Rewrite `.claude/skills/worktree-session-end/SKILL.md` — cleanup-only, delegate commit/push/PR to git-agent
- [x] Delete `.claude/skills/commit-to-github/skill-commit-to-github.md` (stale duplicate)
- [x] Delete `.claude/skills/worktree-session-end/skill-worktree-session-end.md` (stale duplicate)
- [x] Overwrite `.claude/skills/commit-to-github/SKILL.md` with DEPRECATED notice → git-agent
- [x] Rewrite `.cursor/commands/commit-github.md` → redirect to git-agent

---

### Plan 211 — Git Agent: replace commit-to-github skill (`plans/211-git-agent-replace-commit-skill.plan.md`)
- [x] Create `.claude/agents/git-agent.md` — full agent spec under 1,000 tokens
- [x] Create `.claude/commands/git.md` — 3-line command pointer to git-agent
- [x] Create `.cursor/commands/git.md` — 3-line Cursor equivalent
- [x] Update `copilot-instructions.md` line 30 — replace commit-to-github trigger; scope to exclude session-end keywords
- [x] Update `.cursor/rules/git-commit-must-use-skill.mdc` — new content per brief
- [x] Update `agent.md` lines 33 and 58 — rename skill pointer; remove stale Phase 0 reference
- [x] Update `standards-git.md` line 28 — replace `commit-to-github` with `git-agent`

Update status after each sub-task. Link plan files here when applicable.

---

### Plan 210 — Counter Smart Step Logic (`plans/210-counter-smart-step-logic.plan.md`)
- [x] Extend `QuantityStepOptions` with `unit` and `ticks` fields in `quantity-step.util.ts`
- [x] Add `unitAwareIncrement` to `quantity-step.util.ts`
- [x] Add `unitAwareDecrement` to `quantity-step.util.ts`
- [x] Add `ticks_` signal + tick tracking in `counter.component.ts`; reset in `stopRepeat()`
- [x] Route `increment()` / `decrement()` through unit-aware functions when unit is set
- [x] Update `onKeydown` to use unit-aware functions when unit is set

---

### Plan 209 — UI Inspector circuit-breaker rewrite (`plans/209-ui-inspector-circuit-breaker-rewrite.plan.md`)
- [x] Rewrite `.claude/agents/ui-inspector.md` — circuit-breaker pipeline, scope filtering, inline rules, dual-route output, model routing

---

### Plan 208-R — dedupeAndFilterOptions util extraction (`plans/208-R-dedupe-select-options-util.plan.md`)
- [x] Create `src/app/core/utils/dedupe-select-options.util.ts` — export `dedupeAndFilterOptions`, delegate filter step to `filterOptionsByStartsWith`
- [x] Replace filter+dedup block in `custom-select.component.ts` with call to `dedupeAndFilterOptions`; fix `translateLabels` conditional in lambda
- [x] Add import for `dedupeAndFilterOptions` to `custom-select.component.ts`
- [x] Verify `ng build` passes; confirm `dedupe-select-options.util.ts` exists

### Plan 207-R — RecipeCostService constants extraction (`plans/207-R-recipe-cost-constants-extraction.plan.md`)
- [x] Create `src/app/core/utils/recipe-cost.constants.ts` — export all four constants verbatim with JSDoc comments
- [x] Update `recipe-cost.service.ts` — delete four constant declarations (lines 8–28) and add import from new util file
- [x] Verify `ng build` passes with no errors

### Plan 206-R — RecipeYieldManager extraction (`plans/206-R-recipe-yield-manager-extraction.plan.md`)
- [x] Create `src/app/core/utils/recipe-yield-manager.util.ts` — plain class with all yield/scaling computeds and methods
- [x] Update `recipe-header.component.ts` — instantiate manager, delete moved members, add CDR/output wrappers
- [x] Update `recipe-header.component.html` — replace all direct method calls with `yield.*` or wrapper calls
- [x] Update `recipe-header.component.spec.ts` — update method paths and rewrite `onPrimaryUnitChange` test

### Plan 205-R — MetadataRegistryService persistRegistry helper (`plans/205-R-metadata-registry-persist-helper.plan.md`)
- [x] Add `private async persistRegistry<T>()` helper to `metadata-registry.service.ts`
- [x] Replace initMetadata categories write block with `persistRegistry` call
- [x] Replace initMetadata allergens write block with `persistRegistry` call
- [x] Replace initMetadata menuTypes write block with `persistRegistry` call
- [x] Replace `registerCategory` inline block with `persistRegistry` call
- [x] Replace `deleteCategory` block — restructure control flow, then `persistRegistry`
- [x] Replace `registerAllergen` inline block with `persistRegistry` call
- [x] Replace `deleteAllergen` block — compute `updated` first, then `persistRegistry`
- [x] Replace `registerLabel` inline block with `persistRegistry` call
- [x] Replace `deleteLabel` inline block with `persistRegistry` call
- [x] Replace `updateLabel` inline block with `persistRegistry` call
- [x] Replace `registerMenuType` inline block with `persistRegistry` call
- [x] Replace `updateMenuType` inline block with `persistRegistry` call
- [x] Replace `deleteMenuType` inline block with `persistRegistry` call
- [x] Replace `renameMenuType` inline block with `persistRegistry` call
- [x] Verify `ng build` passes; confirm file under 320 LOC

### Plan 202 — Back Button Reuse + Venues Nav Rework (`plans/202-back-button-reuse-venues-nav-rework.plan.md`)

- [x] Sub-task 1: Add back button to venue-list shell-actions (`venue-list.component.html/ts/scss`)
- [x] Sub-task 2: Add back button to supplier-list shell-actions (`supplier-list.component.html/ts/scss`)
- [x] Sub-task 3: Add back-to-list button in venues-nav for edit page (`venues.page.html/ts/scss`)
- [x] Sub-task 4: Hide venues-nav on /venues/list route (`venues.page.html/ts`)

### Plan 198 — Lite agent refactor adoption (`plans/198-lite-agent-refactor-adoption.plan.md`)

- [x] HIGH: Add copilot-instructions §0.5 Model Routing table (Efficiency Tiers, central discoverability)
- [x] LOW: Document UI Inspector mixed-tier pattern as reference for future agents

### Plan 191 — Dashboard QA: Specs, `data-testid`, Pattern Fixes (`plans/191-dashboard-qa-testid-and-specs.plan.md`)

- [x] Sub-task 1: Add `data-testid` to `dashboard.page.html`, `dashboard-header.component.html`; add `data-testid` + migrate `*ngIf`/`*ngFor` → `@if`/`@for` in `dashboard-overview.component.html`
- [x] Sub-task 2: Fix `dashboard.page.spec.ts` (V1 HttpClientTestingModule, V2 unknown casts) + add 11 new tests
- [x] Sub-task 3: Fix `dashboard-header.component.spec.ts` (V2–V4 violations) + add 7 new tests
- [x] Sub-task 4: Create `dashboard-overview.component.spec.ts` with 20 tests

### Plan 190 — Master De-Spaghettification Map (`plans/190-master-de-spaghettification-map.plan.md`)

- [x] SW-1: Add `c-form-actions` token; replace `form-actions` in equipment-form, venue-form, supplier-form (branch: feat/despaghetti-low-risk)
- [x] SW-2: Extract shared `inline-edit-panel` CSS to `styles.scss`; remove duplicates from equipment-list + supplier-list SCSS
- [x] HI-2: Create `app-selection-bar`; migrate all 5 list pages (branch: feat/despaghetti-low-risk)
- [x] SW-6: Create `app-empty-state`; replace icon+message variants in supplier-list, recipe-book-list, inventory-product-list
- [x] HI-3: Extract shared `useSavingState` composable (8 components) — signal/composable sprint
- [x] HI-5: Replace duplicated qty stepper with `<app-counter>` (3 of 6 sites) — signal/composable sprint
- [x] HI-4: Wire `useListState` into inventory-product-list; panel pref + mobile collapse parity with other 4 list pages

### Plan 174 — Custom select chip and standalone state (`plans/174-custom-select-chip-and-standalone-state.plan.md`)

- [x] Save plan to plans/174; document current custom-select state (chip, standaloneValue, recipe header + ingredients table)

### Plan 173 — Selected-item-display whole clickable (`plans/173-selected-item-display-whole-clickable.plan.md`)
- [x] recipe-ingredients-table: move click/keyboard from span to .selected-item-display div; stopPropagation on clear button
- [x] recipe-ingredients-table.component.scss: add cursor: pointer to .selected-item-display (Effects group)
- [x] Verify whole chip clickable, clear button does not open search

### Plan 170 — Add-new option and styling (`plans/170-add-new-option-and-styling.plan.md`)

- [x] CustomSelect: isAddNewOption() + .custom-select-option--add-new class
- [x] custom-select.component.scss: style .custom-select-option--add-new with primary color
- [x] Equipment-list: add "add new category" (sentinel, customCategories_, handler, inline edit)

### Plan 169 — List quick-edit UX overlay (`plans/169-list-quick-edit-ux-overlay.plan.md`)

- [x] CustomSelect: add openOnShow input; effect to open dropdown when shown
- [x] CustomSelect: CDK Overlay for dropdown (attach to body, position from trigger)
- [x] Equipment list: [openOnShow]="true" on quick-edit CustomSelects

### Plan 168 — Menu-library full keyboard access (`plans/168-menu-library-full-keyboard-access.plan.md`)

- [x] custom-select: Arrow Down/Up open dropdown when closed (button trigger)
- [x] menu-library-list: Date-from wrap tabindex="0" + keydown.enter/space
- [x] menu-library-list: Event cards keydown.enter/space to open

### Plan 167 — Category/unit add-new audit (`plans/167-category-unit-add-new-audit.plan.md`)

- [x] Fix product-form base-unit "add new" flow (unitAdded$ patch base_unit_ when isBaseUnitMode_)
- [x] Add "add new category" to equipment-form (sentinel, handler, custom categories, set new value in dropdown)
- [x] Verify add-equipment sets new value in category dropdown

### Plan 166 — Preparation category chip translation (`plans/166-preparation-category-chip-translation.plan.md`)

- [x] preparation-search: add translatePipe to category header and category pill
- [x] export.service: inject TranslationService; heCategory(); use for all prep/checklist category columns
- [x] dictionary.json: add missing preparation_categories (e.g. knife_work)

### Plan 165 — Maison Plus row style (`plans/165-maison-plus-row-style.plan.md`)

- [x] Add --space-sm to src/styles.scss :root (optional; or use component token)
- [x] Update recipe-workflow .prep-grid-row: border var(--border-row), padding var(--space-sm), hover var(--bg-glass-hover)
- [x] Update mobile override: padding var(--space-sm); ensure border/hover (inherit or explicit)
- [x] Verify ng build and manual check desktop/mobile

### Plan 165 — Global-specific modal behavior and size (`plans/165-global-specific-modal-behavior-and-size.plan.md`)

- [x] Propagate category change to all dishes that reference the preparation with the old category; wire into recipe-workflow when user chooses "change globally"
- [x] Add optional main_category_name to FlatPrepItem; persist and restore in recipe-builder and cook-view so "only for this recipe" survives reload
- [x] Size global-specific modal to content (remove --fluid)

### Plan 164 — Custom select preserve text on focus (`plans/164-custom-select-preserve-text-on-focus.plan.md`)

- [x] openDropdown(): set searchQuery_ to current selection label (translated if needed) instead of clearing; set highlightedIndex from current value in filtered list

### Plan 163-1 — Cook-view ingredient alignment (`plans/163-1-cook-view-ingredient-alignment.plan.md`)

- [x] Verify alignment in cook-view (view + edit mode); apply min-width to col-amount/col-unit if needed
- [x] Mark Plan 163 item 2.1 done

### Plan 163-2 — Unit-creator keyboard flow (`plans/163-2-unit-creator-keyboard-flow.plan.md`)

- [x] unit-creator: focus name on open (effect + setTimeout); id on name/quantity inputs
- [x] unit-creator: Enter on name → focus quantity; focusQuantityInput()
- [x] custom-select: open on trigger focus when not from mouse (mousedown flag + onTriggerFocus)

### Plan 163 — toFix audit PRD (`plans/163-tofix-audit-prd.plan.md`)

- [x] Recipe header: labels dropdown keyboard nav (focus to dropdown, Arrow Up/Down, Enter, Escape)
- [x] 2.1 Recipe view: verify align values in ingredient list (cook-view SCSS/html)
- [x] 2.6 unit-creator-modal: full keyboard flow (focus name → quantity → unit; prevent scroll) — Plan 163-2

### Plan 162 — No-auto-test agent rule (`plans/162-no-auto-test-agent-rule.plan.md`)

- [x] agent.md: Replace Step 5 Audit with build-only, no full test suite unless commit or user asks
- [x] copilot-instructions.md: Append no-auto-run sentence to Section 3 Services bullet
- [x] .claude/todo.md: Update pending spec item to clarify full suite only at commit or on request

### Plan 161 — Copilot Q&A format refactor (`plans/161-copilot-qa-format-refactor.plan.md`)

- [x] Replace Section 1.1 with single tight "Q&A format" rule (chat, plans, recommendations)
- [x] Add minimal Bad vs Good example; require at least one question for new features
- [x] Align Section 1 Decision Logic to reference Q&A format only

### Plan 159 — Type-to-filter all dropdowns (`plans/159-type-to-filter-all-dropdowns.plan.md`)
- [x] Phase 1: Enhance CustomSelectComponent with typeToFilter (input trigger, filter by "starts with" + script)
- [x] Phase 2: Replace native selects in quick-add-product-modal with app-custom-select
- [x] Phase 3: Align recipe-builder logistics, ingredient-search, preparation-search, recipe-book-list, menu-intelligence to "starts with" + script — completed via Plan 178

---

### Plan 158 — List shell multi-select (`plans/158-list-shell-multi-select.plan.md`)

- [x] Add ListSelectionState with selectAll, allSelected, toggleSelectAll
- [x] Add ListRowCheckboxComponent (shared)
- [x] Wire inventory-product-list, venue-list, equipment-list, supplier-list, recipe-book-list: checkbox column, header select-all, row click, bulk actions
- [x] Add translations clear_selection, remove_selected, select_all

### Plan 156 — Category single-input type-in (`plans/156-category-single-input-type-in.plan.md`)

- [x] product-form: restructure category block to chips + single input; remove Filter block from dropdown
- [x] product-form: focus single input on open/after select; ArrowDown-from-input to list; use categoryInputRef
- [x] product-form SCSS: remove in-dropdown search styles; style single input in category box

### Plan 155 — List shell and cell expand (`plans/155-list-shell-and-cell-expand.plan.md`)

- [x] List-shell: add border-radius transition on .table-area to match panel (0.3s var(--ease-spring))
- [x] List-shell: align small-screen (768px) overlay panel to list container
- [x] Recipe-book-list: replace single-ID signals with Set-based allergen/labels expanded IDs
- [x] Recipe-book-list: cell click toggles one row; header click toggles all; outside click closes all
- [x] Recipe-book-list: reset expanded state when landing on recipe-book (Router.events NavigationEnd)

### Plan 154 — Floating container and change-popover refactor (`plans/154-floating-container-change-popover.plan.md`)

- [x] Create FloatingInfoContainer component (shared) with vertical scroll + arrows
- [x] Create ChangePopover component using FloatingInfoContainer
- [x] Integrate ChangePopover in dashboard-overview; remove inline popover
- [x] Refactor recipe-header metrics-notice to use FloatingInfoContainer
- [x] Remove old popover/metrics styles; verify and clean up

### Plan 153 — Recipe approve stamp button (`plans/153-recipe-approve-stamp-button.plan.md`)

- [x] Recipe builder: add isApproved_ signal, set from loaded recipe and in resetToNewForm_; use in buildRecipeFromForm(); add saveRecipe(options?) and onApproveStamp()
- [x] Recipe builder template: add ApproveStamp component when !historyViewMode_()
- [x] Cook view: add onApproveStamp() that saves with is_approved_: true and updates recipe_()
- [x] Cook view template: add ApproveStamp component when recipe_() is set
- [x] Create ApproveStampComponent (shared): wax-seal style, theme colors, fixed bottom-right, inputs approved/disabled, output approve
- [x] Add approve_recipe translation key; use for stamp aria-label

### Plan 152 — Recipe book date filter sidebar (`plans/152-recipe-book-date-filter-sidebar.plan.md`)

- [x] Add dateFrom_/dateTo_/dateField_ signals and useListState descriptors
- [x] Date-range filter in filteredRecipes_ + clear/hasActiveFilters
- [x] Add dateUpdated to SortField and compareRecipes; sidebar sort buttons
- [x] Date collapsible section in sidebar (From/To inputs, checkbox, sort)
- [x] Expand Date section when date range active; translations and SCSS

### Plan 151 — Recipe secondary unit conversion (`plans/151-recipe-secondary-unit-conversion.plan.md`)

- [x] Add amountInRecipeYieldUnit in RecipeCostService; use in getRowWeightContributionG and computeIngredientCost
- [x] Use recipe-scoped conversion in ingredients table updateLineCalculations
- [x] Add recipe-cost tests for yield_conversions_

### Plan 150 — Secondary units in ingredient dropdown (`plans/150-secondary-units-in-ingredient-dropdown.plan.md`)

- [x] Extend getAvailableUnits metadata type with yield_conversions_
- [x] Add recipe yield_conversions_ units to dropdown in recipe-ingredients-table

### Plan 149 — Recipe-builder and metrics notice fixes (`plans/149-recipe-builder-metrics-notice-fixes.plan.md`)

- [x] Preserve quantity when changing ingredient by name
- [x] Fix metrics-notice-floating position in recipe-header
- [x] Clarify category search (label/styling) in product-form

### Plan 148 — Dashboard toFix items (`plans/148-dashboard-tofix-items.plan.md`)

- [x] Align Add Product button (remove primary)
- [x] Unify dashboard section headers
- [x] Unapproved KPI link to recipe-book with filter
- [x] Low stock KPI link + inventory lowStock=1 URL
- [x] Update toFix.md (dashboard items unmarked)

### Plan 147 — Recipe-builder edit toFix items (`plans/147-recipe-builder-edit-tofix-items.plan.md`)

- [x] Ingredient index: click item name to change item (state + template + ingredient-search initialQuery)
- [x] Ingredient index: align values under titles (SCSS justify-content center)
- [x] metrics-square: fix grams-to-volume in recipe-cost.service
- [x] category-input-box: add search to product-form category multi-select
- [x] Update toFix.md (items remain unmarked)

### Plan 145 — Secondary unit dropdown fix (`plans/145-secondary-unit-dropdown-fix.plan.md`)

- [x] Wrap unit-switcher + dropdown in `.unit-switcher-cell` in recipe-header (secondary chip)
- [x] SCSS: `.unit-switcher-cell` + dropdown host position so dropdown does not take grid cell
- [x] Add "Create new unit" menu item to secondary unit dropdown

### Plan 144 — Precision-based counter step (`plans/144-precision-based-counter-step.plan.md`)

- [x] quantity-step.util: magnitude for integers (1–9→1, 10–99→10, 100→100), precision for decimals; keep integerOnly/explicitStep
- [x] quantity-step.util.spec: tests for magnitude and precision step + increment/decrement
- [x] Cook-view: keydown on main quantity and ingredient amount inputs; call increment/decrement
- [x] Recipe-ingredients-table: onQuantityKeydown ArrowUp/ArrowDown with util + stepOpts
- [x] Recipe-builder: logistics qty input keydown (integerOnly min 1) + step="1"
- [x] Recipe-header: updatePrimaryAmount/updateSecondaryAmount use util; keydown on primary/secondary inputs
- [x] Recipe-header.spec: update expectations for precision/magnitude (e.g. 1.2→1.3, 10→20)

### Plan 143 — Cook-view recipe yield units (`plans/143-cook-view-recipe-yield-units.plan.md`)

- [x] Recipe model: add optional yield_conversions_
- [x] Recipe-builder: persist full yield_conversions on save; load yield_conversions_ into form when editing
- [x] Cook-view: yieldUnitOptions_ from recipe; convertedYieldAmount_ from recipe when present
- [x] Cook-view: onYieldUnitChange — update quantity to equivalent in new unit

### Plan 142 — FAB Add-new for list pages (`plans/142-fab-add-new-list-pages.plan.md`)

- [x] Inventory list: FAB action Add product → /inventory/add
- [x] Equipment list: FAB action Add equipment (use equipmentBasePath)
- [x] Venue list: FAB action Add venue when not embeddedInDashboard
- [x] Supplier list: FAB action Add supplier (modal) when not embeddedInDashboard

### Plan 141 — Hero FAB refactor and page-specific actions (`plans/141-hero-fab-refactor-and-page-actions.plan.md`)

- [x] Hero FAB: effectiveActions_ empty when no state; template cleanup
- [x] Recipe-builder: setPageActions replace, add Cook-view when edit
- [x] Menu-intelligence: setPageActions replace
- [x] Cook-view: FAB action Edit recipe when /cook/:id
- [x] Menu-library: FAB action New menu
- [x] Recipe-book list: replace edit button with cook button in row
- [x] Add cook_view translation key

### Plan 140 — Recipe builder real-changes confirmation (`plans/140-recipe-builder-real-changes-confirmation.plan.md`)

- [x] Add initialRecipeSnapshot_ + getRecipeSnapshotForComparison() + hasRealChanges() in recipe-builder.page.ts
- [x] Set initialRecipeSnapshot_ in ngOnInit when editable; remove hasUnsavedEdits()
- [x] Remove markAsDirty in recipe-builder.page.ts
- [x] Remove markAsDirty in recipe-header, recipe-workflow, recipe-ingredients-table

### Plan 139 — Menu intelligence keyboard focus (`plans/139-menu-intelligence-keyboard-focus.plan.md`)

- [x] HTML: guest count tabindex="-1"; section title Space + id; sell price/add-dish/dish name ids
- [x] TS: event type Space to open and Space to select
- [x] TS: section search Tab/Shift+Tab
- [x] TS: dish search Tab/Shift+Tab
- [x] TS: sell price Tab/Shift+Tab
- [x] Optional: commit-to-github skill "Menu intelligence tab order" subsection

### Plan 138 — Product form header redesign (`plans/138-product-form-header-redesign.plan.md`)

- [x] Move header into form; remove edit-mode subtitle (product-form.component.html)
- [x] Move .form-header under .form-container; compact header; optional card border (product-form.component.scss)
- [x] Update spec if tests reference removed text/DOM (product-form.component.spec.ts)

### Plan 137 — Techdebt and spec coverage agent adherence (`plans/137-techdebt-spec-coverage-agent-adherence.plan.md`)

- [x] commit-to-github SKILL.md: add Phase 0 mandate and checklist
- [x] .cursor/commands/commit-github.md: add explicit Phase 0 step
- [x] .claude/copilot-instructions.md: tie commit trigger to Phase 0
- [x] agent.md: step 7 Phase 0 mandatory; step 5.5 cross-ref
- [x] .cursor/rules/git-commit-must-use-skill.mdc: require Phase 0 before Phase 1

### Plan 136 — Product form keyboard focus (`plans/136-product-form-keyboard-focus.plan.md`)

- [x] Product form: initial focus to name input (ViewChild + ngAfterViewInit); template ref on name input
- [x] Category: Space to select in onCategoryDropdownKeydown
- [x] Custom-select: Space to select when open
- [x] Supplier: tabindex="0", keyboard open/navigate/select/close (HTML + TS)
- [x] Allergen: highlight index + keydown Arrow/Enter/Space/Escape (HTML + TS)
- [x] Collapsible headers: (keydown.space) with preventDefault
- [x] Equipment form: initial focus to name input (ViewChild + template ref + ngAfterViewInit)

### Plan 135 — Translation modal cancel guard title fix (`plans/135-translation-modal-cancel-guard-title-fix.plan.md`)

- [x] Guard: `else { break }` → `else { return false }` (cancel = stay on page)
- [x] Guard: add `.toLowerCase()` to `getPending` filter
- [x] dictionary.json: add `translation_modal_title` key
- [x] translation-key-modal.component.ts: use `translation_modal_title` for generic
- [x] translation-key-modal.service.ts: remove `throw` in `save()`

### Plan 134 — Translation and confirmation modals unified (`plans/134-translation-confirmation-modals-unified.plan.md`)

- [x] Translation modal: Hebrew always editable (both add-time and generic); focus English key on open; template ref + ViewChild
- [x] Product form allergen: resolveAllergen first; open modal only when null; then "already on product" check
- [x] Agent guides: Section 7.2 + Section 0 trigger 7.1+7.2 in copilot-instructions; one-line pointer in agent.md (one source of truth; no Cursor rule)
- [x] Guard/dictionary: confirm getValuesNeedingTranslation and guard unchanged

### Plan 133 — List quick-edit inline (`plans/unused-133-list-quick-edit-inline.plan.md`)

- [x] Row-blur detection and batch "Save these changes?" confirm; pending-edits store per row (equipment pilot)
- [x] Equipment list: keep panel on row click; add quick-edit for category, owned qty, is_consumable (pilot done)
- [x] Carousel: only cell value clickable for quick-edit (equipment); arrows unchanged
- [x] Validation: empty required field → error message + red border + aria-invalid (equipment pilot)
- [x] i18n: save_these_changes, this_item_cannot_be_saved_like_this

### Plan 132 — Translation and add-value flow (`plans/132-translation-add-value-flow.plan.md`)

- [x] Step 0: Guard — save-confirmation last; product form hasRealChanges() + initial snapshot
- [x] Step 1: Translation modal — Hebrew editable for add flows (unit/category/allergen/supplier)
- [x] Step 2: Product form — "already on this product" message for category/allergen
- [x] Step 3: Translation modal — three outcomes + "Continue without saving" button for generic
- [x] Step 4: Guard + product form — removeValuesNeedingTranslation() and notification

### Plan 131 — Spec coverage in techdebt and commit (`plans/131-spec-coverage-techdebt-commit.plan.md`)

- [x] Techdebt: add Phase 7 (Spec coverage) and update report format
- [x] Commit-to-github: Phase 0 handle spec-coverage items from report
- [x] Copilot-instructions: Phase 5 remove spec ask; add Section 5.1; Section 3 qualifier
- [x] agent.md: Audit step — no spec updates here, ref to Section 5.1

### Plan 130 — Numeric precision audit (`plans/130-numeric-precision-audit.plan.md`)

- [x] Add `step="0.001"` to recipe-ingredients `amount_net` input
- [x] Add `step="0.01"` to product-form `price_override_` input
- [x] Change `yield_factor_` to `step="0.001"` in product-form and quick-add-product-modal
- [x] Add `step="0.001"` to recipe-header primary and secondary amount inputs

### Plan 129 — Post-execute verification bullets (`plans/129-post-execute-verification-bullets.plan.md`)

- [x] Add Phase 5 "How to verify" requirement to Gatekeeper Protocol in copilot-instructions.md

### Plan 128 — Hebrew canonical value resolution (`plans/128-hebrew-canonical-value-resolution.plan.md`)

- [x] TranslationService: reverse maps (Hebrew→key) + resolveUnit/Category/Allergen/SectionCategory; add key+Hebrew when user supplies English key
- [x] UnitRegistryService: resolve unit name before register; no match → get English key and update dictionary; product-level check when adding purchase option
- [x] MetadataRegistryService: resolve in registerCategory and registerAllergen; no match → prompt for English key and update dictionary
- [x] MenuSectionCategoriesService, add-equipment-modal, preparation-registry: resolve from Hebrew; no match → modal for English key then register + dictionary
- [x] copilot-instructions: add Section 7.1 (Hebrew canonical values) and Section 0 trigger bullet

### Plan 127 — Recipe builder cost display fix (`plans/127-recipe-builder-cost-display-fix.plan.md`)

- [x] Show "ממתין" only when total_cost is null/undefined; show ₪0.00 or amount for any number
- [x] Enable total_cost control in recipe-form.service (was disabled)
- [x] Call cdr.markForCheck() at end of updateLineCalculations

### Plan 126 — Purchase unit recipe builder fix (`plans/126-purchase-unit-recipe-builder-fix.plan.md`)

- [x] Recipe cost service: getRowWeightContributionG use net * conversion_rate_; computeIngredientCost multiply and price_override_ per 1 unit
- [x] Recipe ingredients table: updateLineCalculations same conversion/price fix; onItemSelected default unit/amount for purchase unit; increment/decrement step 1 for purchase units
- [x] recipe-cost.service.spec.ts: add/update tests for purchase_options_ and price_override_

### Plan 125 — Restore collapse row equipment & suppliers (`plans/125-restore-collapse-row-equipment-suppliers.plan.md`)

- [x] Equipment list: row click toggles inline edit panel; add toggleRowEdit; remove navigateToEquipmentEdit
- [x] Supplier list: row click toggles inline edit panel; add toggleRowEdit; remove navigateToSupplierEdit

### Plan 124 — Unified styling audit and theme (`plans/124-unified-styling-audit-theme.plan.md`)

- [x] Phase 1: Add --border-row, --shadow-nav to styles.scss; replace raw rgba in .c-list-body-cell, .c-grid-cell; add Liquid Glass comment block
- [x] Phase 2: Menu-intelligence, trash, dashboard — replace raw hex/rgba with tokens
- [x] Phase 3: export-preview, list-shell, recipe-book-list, header, footer, user-msg, recipe-header, unit-creator — use tokens
- [x] D3: Enhance footer with 4 metrics: total cost, food cost %, total revenue, cost per guest (`fix/menu-intelligence-footer-totals` merged to main)
- [x] E1a: Toolbar close on click outside, remove close button (`feat/menu-toolbar-click-outside` merged to main)

### Plan 123 — Recipe builder product-only units + persist (`plans/123-recipe-builder-product-only-units-persist.plan.md`)

- [x] Part A: Remove merge of allUnitKeys_() in getAvailableUnits so only product/recipe units shown
- [x] Part B: On "+ יחידה חדשה" for product row, add new unit as purchase option and saveProduct

### Plan 121 — Product units display fix (`plans/121-product-units-display-fix.plan.md`)

- [x] Harden hydrateForm: default missing `uom` from `base_unit_` so legacy purchase-option rows are valid and visible
- [x] Merge global registry units into getAvailableUnits for products so custom units show in ingredient unit select

### Plan 120 — Export "All" view option + cost fix (`plans/120-recipe-builder-all-view-option.plan.md`)

- [x] Part C: Fix getFoodCostPerPortion to divide by derived portions (menu-intelligence.page.ts)
- [x] Part A: Recipe-builder — wrap "All" in view-export-wrap; add view-export-modal (View/Export); onViewAll, exportPreviewType_ 'recipe-all', onExportFromPreview for 'recipe-all'
- [x] Part B: ExportService — add getMenuAllViewPreviewPayload(menu, recipes)
- [x] Part B: Menu-intelligence — replace "All" button with view-export-wrap + view-export-modal; onViewAll, exportPreviewType_ 'menu-all', onExportFromPreview for 'menu-all'

### Plan 119 — Content-driven list row heights (`plans/119-content-driven-list-row-heights.plan.md`)

- [x] list-shell: set grid-template-rows: none and grid-auto-rows: auto for content-sized rows
- [x] list-shell: .table-body .col-name — display: block, overflow-wrap: break-word, text-align: start (keep overflow: hidden)

### Plan 118 — Sidebar close on breakpoint (`plans/118-sidebar-close-on-breakpoint.plan.md`)

- [x] Add matchMedia('(max-width: 768px)').addEventListener('change', ...) in recipe-book-list, supplier-list, equipment-list
- [x] In list-shell.component.scss @media (max-width: 768px): add transition: none for .filter-panel and .panel-content

### Plan 117 — Dish row absolute actions (`plans/117-dish-row-absolute-actions.plan.md`)

- [x] .dish-name-cell: drop grid, add padding-inline-end for button reserve
- [x] .dish-name-meta: content center (remove 100vw trick, text-align center)
- [x] .dish-sell-price and .dish-remove: absolute positioning, vertically centered, inset-inline-end

### Plan 116 — Center main loader in viewport (`plans/116-center-main-loader-viewport.plan.md`)

- [x] In loader.component.scss: set overlay to position: fixed, z-index: 150, border-radius: 0
- [x] Verify route-loading and metadata-manager overlay loaders are centered in viewport

### Plan 115 — Dropdown scroll arrows fix (`plans/115-dropdown-scroll-arrows-fix.plan.md`)

- [x] Pin up arrow inside container: add top: 0; bottom: auto for .c-dropdown__scroll-top in src/styles.scss
- [x] Add zone divs in scrollable-dropdown.component.html (scroll-zone--top, scroll-zone--bottom)
- [x] Add zone styles and :has() hover visibility rules in src/styles.scss; remove global dropdown hover rules

### Plan 114 — Remove logistics templates library (`plans/114-remove-logistics-templates-library.plan.md`)

- [x] Recipe Builder: equipment-only logistics dropdown; remove library state/methods
- [x] Metadata Manager: remove LogisticsBaselineManagerComponent and template usage
- [x] Demo loader: remove logistics baseline fetch and reload
- [x] Async storage: remove LOGISTICS_BASELINE_ITEMS from BACKUP_ENTITY_TYPES
- [x] Delete logistics-baseline-manager component and logistics-baseline-data.service
- [x] logistics.model.ts: remove LogisticsBaselineItem; dictionary: remove metadata_logistics_* keys
- [x] Delete demo-logistics-baseline.json; remove dead .logistics-library-* SCSS

### Plan 113 — Use only prep_categories; discard mise_categories (`plans/113-use-only-prep-categories-discard-mise.plan.md`)

- [x] Model: remove MiseCategory and mise_categories_ from Recipe
- [x] Read paths: getPrepRowsFromRecipe, getScaledPrepItems, isDish — use prep_categories_ only
- [x] Write paths: stop setting mise_categories_ in recipe-builder and cook-view
- [x] Demo data: rename mise_categories_ to prep_categories_ in demo-dishes.json
- [x] Tests: scaling.service.spec use prep_categories_; optional: dish-data normalizer for backward compat

### Plan 112 — Dish dropdown width and keyboard (`plans/112-dish-dropdown-width-keyboard.plan.md`)

- [x] Fix keyboard: wire (ngModelChange) to onDishSearchQueryChange so activeDishSearch_ is set when typing
- [x] Narrow dish-search dropdown to 80% width (and center) in menu-intelligence SCSS
- [x] Add [class.highlighted] and index to recipe @for; add .dropdown-item.highlighted style

### Plan 111 — Unify metadata manager containers (`plans/111-unify-metadata-manager-containers.plan.md`)

- [x] HTML: demo + backup use card-desc, card-actions; remove demo-section/backup-section
- [x] SCSS: add .manager-card .card-desc and .card-actions; remove .menu-types-card .card-desc; replace .demo-section and .backup-section with .manager-card-scoped rules

### Plan 109 — Translate section categories (`plans/109-translate-section-categories.plan.md`)

- [x] Add section_categories to dictionary.json (8 keys, Hebrew or same-as-key)
- [x] Merge section_categories in TranslationService loadGlobalDictionary
- [x] Menu Intelligence: translate section title with placeholder fallback
- [x] Section category manager: display list label with translatePipe

### Plan 108 — Recipe export and view spreadsheet layout (`plans/108-recipe-export-view-spreadsheet.plan.md`)

- [x] Payload and translations: extend export.util with recipe-sheet structure; add recipe_name, preparation_instructions, preparation_time to EXPORT_HEADER_HE and dictionary
- [x] Excel: single-sheet recipe layout in exportRecipeInfo (header, yield, ingredients, instructions, prep time); sheet 1 of exportAllTogetherRecipe same layout
- [x] Preview: getRecipeInfoPreviewPayload returns recipe-sheet shape; export-preview template and SCSS for recipe-sheet layout (header block, yield, table, instructions block, prep time)
- [x] Tests: update export.service.spec.ts for new recipe-info single-sheet structure

### Plan 107 — Export localization and design (`plans/107-export-localization-design.plan.md`)

- [x] Add export_headers to dictionary.json; create heHeader()/heUnit() in export.util.ts
- [x] Update all get*PreviewPayload methods to use Hebrew headers and translated units
- [x] Update all export* methods to use Hebrew headers and translated units
- [x] Add Excel styling helpers and apply to checklist by_dish and all sheets
- [x] Refactor export-preview HTML to table; update SCSS for alignment and RTL

### Plan 106 — Hero FAB export and page actions (`plans/106-hero-fab-export-page-actions.plan.md`)

- [x] Create HeroFabService (setPageActions, clearPageActions, pageActions signal)
- [x] Hero FAB: main button click → recipe-builder; inject service; show replace/append actions
- [x] Menu-intelligence: register Toolbar + Go back in hero FAB; remove menu FAB block and SCSS
- [x] Recipe-builder: register Export, Cook (contextual), Recipe creation; openExportFromHeroFab, goToCookFromHeroFab

### Plan 105 — Persist sidebar state (`plans/105-persist-sidebar-state.plan.md`)

- [x] Add panel-preference.util.ts (getPanelOpen, setPanelOpen)
- [x] Wire inventory-product-list, supplier-list, recipe-book-list, equipment-list, venue-list to panel preference

### Plan 104 — Sell price on dish change (`plans/104-sell-price-on-dish-change.plan.md`)

- [x] Extend editingDishAt_ with previousSellPrice; store it in startEditDishName
- [x] In selectRecipe when replacing: set sell_price to 0 (different recipe) or previousSellPrice (same recipe)

### Plan 103 — Click dish name, food cost per portion, dividers (`plans/103-click-dish-name-food-cost-dividers.plan.md`)

- [x] Make dish name clickable (button calling startEditDishName); add .dish-name-btn styles
- [x] Add getFoodCostPerPortion + read-only field in dish-data
- [x] Divider: info-menu boundary uses section-ornament style; between sections use section-divider (distinct style)
- [x] Add i18n keys change_dish, dish_food_cost_per_portion

### Plan 102 — Unified export refactor (`plans/102-unified-export-refactor.plan.md`)

- [x] Unified export header: floating control + hidden bar on cook-view, recipe-builder; menu-intelligence toolbar with View+Export
- [x] Two icons per export type (View + Export); export-preview component (paper-style popup, click-outside close)
- [x] ExportService: view-model API (getRecipeInfoPreviewPayload, getShoppingListPreviewPayload, getMenuInfoPreviewPayload, getMenuShoppingListPreviewPayload); 2 decimals; file naming (recipe-info_, shopping-list_, check-list_, menu-info_)
- [x] Recipe → cooking steps export; dish → checklist export (by item type in recipe/dish context)
- [x] Menu checklist: by_station mode; two sheets (Accumulated + By dish) when not by_dish
- [x] Unit prices only in shopping list exports; formulas for reactivity in menu shopping list
- [x] Export all together: menu (sheet1 menu + sheets per type); recipe/dish (sheet1 info+ingredients+workflow, sheet2 shopping list)
- [x] Cook-view: replace inline export buttons with floating bar; pass current quantity/scaling
- [x] Recipe-builder: add floating export bar; form snapshot for export; cooking steps vs checklist by type
- [x] Menu-intelligence: add by_station to checklist dropdown; Export all together button; View+Export for menu info and menu shopping list

### Plan 099 — Calculation and Shopping List Testing (`plans/099-calculation-shopping-list-testing.plan.md`)

- [x] Add quantity-step.util.spec.ts (getQuantityStep, quantityIncrement, quantityDecrement)
- [x] Add scaling.service.spec.ts (getScaleFactor, getScaledIngredients, getScaledPrepItems)
- [x] Add menu-intelligence.service.spec.ts (derivePortions, hydrateDerivedPortions, computeEventIngredientCost, computeFoodCostPct)
- [x] Add recipe-cost.service.spec.ts (computeRecipeCost, getCostForIngredient, getRecipeCostPerUnit, weight/volume)
- [x] Add export.service.spec.ts (exportShoppingList, exportMenuShoppingList)

### Plan 098 — Remove Supplier Modal Edit Redundancy (`plans/098-remove-supplier-modal-edit-redundancy.plan.md`)

- [x] Simplify supplier-modal.service.ts (remove edit API and state)
- [x] Update supplier-modal.component.html to bind supplierToEdit to null

### Plan 097 — Portions Per Guest Formula Fix (`plans/097-portions-per-guest-formula-fix.plan.md`)

- [x] In derivePortions: plated_course and buffet_family use guest_count × serving_portions (no take rate, no rounding)
- [x] Keep cocktail_passed as round(guest_count × pieces_per_person × take_rate)
- [x] Verify 2 guests × 1 portion → 2 total; fractional 0.25/0.5 work

### Plan 096 — Supplier Modal Styling Upgrade (`plans/096-supplier-modal-styling-upgrade.plan.md`)

- [x] Align supplier form with shared modal pattern when embedded (h3, c-modal-body, c-input-stack, c-modal-actions)
- [x] Delivery days via c-filter-options--inline + c-filter-option
- [x] Supplier form SCSS: rely on engines, minimal overrides only
- [x] Add reference comment to supplier-modal for reuse pattern

### Plan 094 — Inline Edit & Supplier Modal (`plans/094-inline-edit-supplier-modal.plan.md`)

- [x] Add editingId_, editForm_, dirty guard and inline save/cancel to equipment-list.component.ts
- [x] Add @if inline-edit-panel block in equipment-list.component.html
- [x] Add .inline-edit-panel styles to equipment-list.component.scss (cssLayer)
- [x] Create supplier-modal.service.ts
- [x] Create supplier-modal component (ts + html + scss)
- [x] Add supplierToEdit input and effect to supplier-form.component.ts
- [x] Swap onAdd/onEdit in supplier-list to use SupplierModalService
- [x] Add app-supplier-modal to app.component.html
- [x] Add/verify unsaved_changes_confirm in dictionary

### Plan 093 — Shopping List Calculation Fix (`plans/093-shopping-list-calculation-fix.plan.md`)

- [x] Update `derivePortions` in menu-intelligence.service.ts to accept and apply `servingPortions` parameter
- [x] Update `hydrateDerivedPortions` to pass `item.serving_portions_` through to `derivePortions`
- [x] Fix `getAutoFoodCost` in menu-intelligence.page.ts to use derived portions instead of `servingPortions * guestCount`
- [x] Fix `getDerivedPortions` to pass actual `piecesPerPerson` and `servingPortions` instead of hardcoded 0
- [x] Verify per-item cost, event total, and shopping list produce consistent results

### Plan 092 — Demo Data Trim (`plans/092-demo-data-trim.plan.md`)

- [x] Collect dependency IDs from 15 dishes + 3 preps (products, equipment, suppliers, prep categories)
- [x] Trim demo-dishes.json to 15 dishes; set dish_023 name_hebrew to "פונדו"
- [x] Trim demo-recipes.json to 3 preps + transitive
- [x] Trim demo-products, demo-equipment, demo-suppliers, demo-venues, demo-labels
- [x] Trim demo-kitchen-preparations.json to used categories and preparations only

### Plan 090 — Whole-project logging audit (`plans/090-whole-project-logging-audit.plan.md`)

- [x] Core services: metadata-registry (rename + allergen save/delete), preparation-registry (load), demo-loader, backup
- [x] Page/container: metadata-manager (delete + sync catches), trash
- [x] List components: equipment-list, supplier-list, venue-list
- [x] Form components: supplier-form, product-form, equipment-form, recipe-builder (catch blocks only)

### Plan 088 — Metadata Manager Expansion (`plans/088-metadata-manager-expansion.plan.md`)

- [x] Add deletePreparation, deleteCategory, renamePreparation, renameCategory to PreparationRegistryService
- [x] Add removeCategory, renameCategory to MenuSectionCategoriesService
- [x] Create PreparationManagerComponent (TS + HTML + SCSS) with full CRUD, confirmations, in-use notifications, usage checks
- [x] Create SectionCategoryManagerComponent (TS + HTML + SCSS) with add/delete/rename, confirmations, in-use notifications
- [x] Create LogisticsBaselineManagerComponent (TS + HTML + SCSS) with CRUD, equipment name resolution, confirmations, usage checks
- [x] Import and add all 3 components to metadata-manager template; register any new Lucide icons
- [x] Add all new translation keys to dictionary.json

### Plan 087 — Timestamp All Added Items (`plans/087-timestamp-all-added-items.plan.md`)

- [x] Update /add-recipe SKILL.md: mandate addedAt_ and updatedAt_ on recipe/dish, addedAt_ on products/prep/labels; equipment real ISO timestamps; Schema Reference
- [x] Add addedAt_ to Product model; ProductDataService: normalizeProduct, stamp on add, preserve on update; set updatedAt on add and update
- [x] Add updatedAt_ to Recipe model; recipe-data and dish-data: set on add and update
- [x] Recipe-book-list: add formatUpdatedAt and "Updated at" column (date only); add date_updated to dictionary

### Plan 086 â€” AI Tooling Optimization (`plans/086-ai-tooling-optimization.plan.md`)

- [x] F1: Merge entry points (delete HOW-WE-WORK, reduce agent.md, slim agent.md)
- [x] F3: Refactor copilot-instructions (portable triggers, dedup, fix Section 0)
- [x] F2: Trim .cursor/rules/*.mdc to 3-line pointers
- [x] F5: Inline util-standards + serviceLayer; delete skill files
- [x] F4: Remove Angular restatements from agent personas
- [x] F6+F7: Trim elegant-fix, github-sync, techdebt skills
- [x] F10: Archive old todo entries to todo-archive.md
- [x] F11: Deduplicate commit-to-github safety reminders
- [x] F8: Trim add-recipe schema reference

### Optimize commit-GitHub skill (plan 085 executed, on main)

- [x] Streamline SKILL.md to 5 phases (merge Decide+Build Plan, fold Confirm into Present)
- [x] Shorten Phase 1 commands; compress example and End State/Related
- [x] Slim command and rule files; session-scope remains in command only

### Plan 082 â€” Recipe/Dish date added (`plans/082-recipe-dish-date-added.plan.md`) â€” merged to main

- [x] Add `addedAt_?: number` to Recipe model
- [x] RecipeDataService: set `addedAt_: Date.now()` in addRecipe; merge existing addedAt_ in updateRecipe
- [x] DishDataService: set `addedAt_: Date.now()` in addDish; merge existing addedAt_ in updateDish
- [x] Recipe book list: show "Date added" column/cell; add sort by dateAdded (SortField + compareRecipes)
- [x] i18n: add date_added key (× ×•×¡×£ ×‘×ª××¨×™×š)
- [ ] Optional: recipe builder show "× ×•×¡×£ ×‘×ª××¨×™×š" when editing; dedicated data-service specs for addedAt_

---

### Plan 080 â€” Entity storage audit designated (`plans/080-entity-storage-audit-designated.plan.md`)

- [x] Add MENU_SECTION_CATEGORIES storage; load/save in menu-intelligence; add to BACKUP_ENTITY_TYPES
- [x] Add activity log key to BACKUP_ENTITY_TYPES; use constant in ActivityLogService

### Plan 079 â€” Unify logistics search, remove From library (`plans/079-unify-logistics-search-remove-from-library.plan.md`)

- [x] Remove "From library" button and library-only dropdown (recipe-builder.page.html)
- [x] Use all equipment (not only tools) for search; single dropdown with library + equipment matches (recipe-builder.page.ts)
- [x] Single select handler: library option â†’ add baseline entry; equipment option â†’ add baseline row (recipe-builder.page.ts)
- [x] Keep "Save as template" on chips and "Add new tool" in dropdown

### Plan 078 â€” Logistics designated storage (`plans/078-logistics-designated-storage.plan.md`)

- [x] Add `LogisticsBaselineItem` type and storage wiring (logistics.model.ts, async-storage.service.ts)
- [x] Create LogisticsBaselineDataService (query, getById, add, update, remove, allItems_ signal)
- [x] Recipe builder: inject service; "Add from library" (dropdown + copy into form); "Save as template" per baseline row
- [x] Add translation keys (from_library, save_as_template) and verify build

### Plan 077 â€” Excel export feature (`plans/077-excel-export-feature.plan.md`)

- [x] Install xlsx (SheetJS CE) via npm
- [x] Create ExportService with all four export methods
- [x] Add onExportInfo and onExportShoppingList to cook-view.page.ts
- [x] Add Export Info and Shopping List buttons to cook-view.page.html
- [x] Style export buttons (reuse .edit-btn / .toolbar-btn)
- [x] Add onExportMenuInfo and onExportMenuShoppingList to menu-intelligence.page.ts
- [x] Add two export buttons to menu-intelligence.page.html toolbar
- [x] Add translation keys for all four export actions

### Plan 076 â€” Unified add-recipe skill and create-if-missing (`plans/076-unified-add-recipe-skill-create-if-missing.plan.md`)

- [x] Unify image + text triggers and add "Text input" section in SKILL.md
- [x] Add gap-filling (ask for missing info) and single workflow in SKILL.md
- [x] Add "Create-if-missing before writing" (products, then equipment) in SKILL.md
- [x] Update SCHEMA.md with equipment schema and product-creation rules
- [x] Update HOW-WE-WORK.md "Add recipe from image" to image or text + create-if-missing
- [x] Add-recipe workflow: rename skill to add-recipe, add command + rule; full Step 5 (visual structure, summary, tables, confirm/deny); no write without confirmation; duplicate-name check; recipe-builder cost on load; dish_012 units fix, dish_013, equipment â€” `feat/add-recipe-workflow` merged to main
- [x] Add-recipe full data persistence: demo-kitchen-preparations.json, DemoLoaderService + PreparationRegistryService.reloadFromStorage, SKILL.md Steps 2/5b/6/8 and SCHEMA.md for preparations â€” `feat/add-recipe-full-data-persistence` merged to main
- [x] Add-recipe Step 5 visual tree format (SKILL.md) + dish_017 ××•× ×™×’×™×¨×™ ×ž×•×’×© ×¢× ×§×™×ž×¦×™ ×•×¡×•×™×” (demo data, eq_045â€“050, demo_188, pickling/patisserie) â€” `feat/add-recipe-onigiri-and-visual` merged to main

### Plan 075 â€” Cleanup demo products (`plans/075-cleanup-demo-products.plan.md`) â€” feat/cleanup-demo-products (not merged to main)

- [x] Cleanup demo JSON (products, recipes, venues) and add plan; align app (list-shell, recipe-book, inventory, venue-list, equipment-list) and assistant todo.
- [x] demo-products.json refactor (yield 1, min_stock/expiry 0, 2026 IL prices, allergens) â€” feat/demo-products-cleanup merged to main.

### Plan 074 â€” Tech debt remediation (`plans/074-tech-debt-remediation.plan.md`)

- [x] Migrate @Input/@Output to signals in recipe-ingredients-table and recipe-workflow
- [x] Migrate @Input/@Output to signals in supplier-form and venue-form
- [x] Migrate @Input/@Output to signals in cell-carousel and click-out-side
- [x] Fix 'any' types in conversion.service and ingredient-search
- [x] Extract RecipeFormService from recipe-builder.page.ts
- [x] Extract hardcoded Hebrew strings to dictionary (ingredient-search)

### Plan 073 â€” Log file in project (`plans/073-log-file-in-project.plan.md`)

- [x] Add Node log server script (scripts/log-server.js): POST /log, append to logs/app.log, CORS, GET /health
- [x] Add logServerUrl to environment.ts (dev) and environment.prod.ts (empty); extend LoggingService to POST when set
- [x] Add logs/ to .gitignore
- [x] Add "Development logging" to docs and npm run log-server script

### Plan 072 â€” Robust login, app-wide logging, security (`plans/072-robust-login-app-logging-security.plan.md`)

- [x] Create `.claude/skills/auth-and-logging/SKILL.md`; update HOW-WE-WORK.md and copilot-instructions.md
- [x] Implement LoggingService; replace ad-hoc console.log in user.service and translation.service

### Plan 071 â€” Unified list design system (`plans/071-unified-list-design-system.plan.md`) â€” merged to main (feat/unified-list-design-system)

- [x] Create `app-list-shell` shared component (TS, HTML, SCSS) with content projection slots and panel behavior
- [x] Create `app-carousel-header` shared component for unified carousel column header navigation
- [x] Migrate recipe-book-list to use list-shell + carousel-header (first/template migration)
- [x] Migrate equipment-list to use list-shell + carousel-header
- [x] Migrate supplier-list to use list-shell + carousel-header
- [x] Migrate inventory-product-list: convert table to grid, remove inline editing, add carousel, use list-shell
- [x] Migrate venue-list: convert table to grid, add carousel for Environment + Infrastructure, use list-shell

### Plan 070 â€” Recipe carousel header label sync (`plans/070-recipe-carousel-header-label-sync.plan.md`)

- [x] CellCarouselComponent: add activeIndexChange output; emit new index in next() and prev()
- [x] RecipeBookListComponent: add carouselHeaderIndex_ signal and getCarouselHeaderLabel_()
- [x] Recipe-book-list HTML: dynamic header label; header arrows for whole column, cell-only arrows; matching bg

### Plan 064 â€” Inventory list grid layout refactor (`plans/064-inventory-list-grid-layout-refactor.plan.md`)

- [x] Refactor inventory HTML: replace table/thead/tbody with grid+divs (recipe-book pattern)
- [x] Refactor inventory SCSS: grid template, table-area, table-header, table-body, product-grid-row
- [x] Build and verify

### Plan 063 â€” Recipe book carousel media query, behavior, design (`plans/063-recipe-book-carousel-media-query-behavior-design.plan.md`)

- [x] Desktop: show 3 header columns, hide arrows, no sliding; mobile: carousel header with sliding strip and arrows
- [x] Remove (indexChange) binding from app-cell-carousel; keep [activeIndex]
- [x] Add small label above header carousel (getCarouselHeaderLabel_ or computed) for mobile
- [x] Mobile SCSS: style small label like cell; header arrows opacity 0, on hover opacity 1; match cell arrow size/position

### Plan 062 â€” Auth single source and sign-in/up (`plans/062-auth-single-source-sign-in-up.plan.md`)

- [x] Extend User model with imgUrl? field
- [x] Refactor UserService: StorageService as single source, unique-name rejection, persistent session via localStorage, auto-login on load
- [x] Remove dead code from UtilService (LoadFromStorage, saveToStorage, SIGNED_USERS, session methods)
- [x] Create authGuard (canActivate) and apply to all add/edit/builder/trash routes
- [x] Create AuthModalService (open/close/mode signals)
- [x] Create auth-modal component (sign-in / sign-up form with image upload, unique-name validation)
- [x] Add avatar section to header: guest state (icon + sign-in) vs signed-in state (image + name + log out)
- [x] Hide edit/delete/add buttons and FAB for guest users across all list components
- [x] Add auth-related keys to dictionary.json
- [x] Wire auth modal into app root, register Lucide icons, APP_INITIALIZER for auto-login, authGuard on routes
- [x] Fix auth build errors: add UserService.isLoggedIn, inline session storage (replace removed UtilService methods), wire HeaderComponent auth (isLoggedIn, user_, userInitial, openAuth, logout), User.imgUrl (`fix/auth-isloggedin-storage-header` merged to main)

### Plan 062-1 â€” Fix FAB and cook-view guest access (`plans/062-1-fix-fab-cookview-guest.plan.md`)

- [x] FAB always visible, gate only the recipe-builder action
- [x] Remove authGuard from cook/:id route
- [x] Gate edit actions inside cook-view for guests
- [x] Show add/edit buttons disabled with tooltip when not signed in (feat/suppliers-nav-and-auth-buttons merged to main)

### Plan 061 â€” Header carousel shift controls (`plans/061-header-carousel-shift-controls.plan.md`)

- [x] Add carouselHeaderIndex_ and carouselHeaderPrev/Next in recipe-book-list.component.ts
- [x] Add activeIndex input and indexChange output to CellCarouselComponent; sync and emit
- [x] Header: sliding strip structure and prev/next buttons in recipe-book-list HTML
- [x] Bind [activeIndex] and (indexChange) on each app-cell-carousel in template
- [x] SCSS: carousel header as one grid cell, overflow hidden, inner strip and transform

### Plan 060 â€” Data persistence and backup (`plans/060-data-persistence-and-backup.plan.md`)

- [x] StorageService: wrap `_save()` in try/catch; re-throw with clear message. Harden UtilService and TranslationService direct localStorage writes.
- [x] Demo loader: add confirmation step (modal or confirm) before `loadDemoData()` with copy that demo replaces recipes, dishes, products, suppliers, equipment, venues.
- [x] Backup mirror: define backup entity list; in StorageService after successful save, write to `backup_<entityType>` for listed types.
- [x] Export / Restore: implement `exportAllToFiles()` (download JSON per category) and â€œRestore from backupâ€ / â€œImport from file(s)â€ with validation and reload.

### Plan 059 â€” Unify design engine (`plans/059-unify-design-engine.plan.md`)

- [x] Phase 1: Add missing engine classes to styles.scss (.visually-hidden, .placeholder-dash, .c-table-wrap, .c-data-table, .c-sortable-header, .c-col-actions, .c-empty-state, .c-btn-ghost--sm, .c-chip variants, .c-grid-input/.c-grid-select)
- [x] Phase 2: Migrate .action-btn to .c-icon-btn in recipe-book-list, inventory-product-list, menu-library-list
- [x] Phase 3: Migrate .add-btn to .c-btn-primary in recipe-book-list, inventory-product-list, menu-library-list
- [x] Phase 4: Migrate .input-wrapper to .c-input-wrapper in 5 components
- [x] Phase 5: Remove local .visually-hidden and .placeholder-dash from component SCSS files
- [x] Phase 6: Migrate .table-wrap and th/td to .c-table-wrap/.c-data-table in equipment, venue, supplier
- [x] Phase 7: Migrate sortable-header, col-actions, clear-filters-btn to engine classes in recipe-book + inventory
- [x] Phase 8: Fixed .chipe typo, migrated ingredient chips to .c-chip--success

### Plan 058 â€” Sidebar collapse and floating (`plans/058-sidebar-collapse-floating.plan.md`)

- [x] Inventory: full collapse to width 0 (SCSS + HTML toggle wrap)
- [x] Switch border-radius to right side in both SCSS files
- [x] Add floating overlay behavior at 768px breakpoint in both SCSS files
- [x] Change close icon to chevron-left in both HTML files

### Plan 057 â€” Plans folder full audit (`plans/057-plans-folder-full-audit.plan.md`)

- [x] Execute Plan 055 Group E (Five-Group rhythm: confirm-modal, translation-key-modal, restore-choice-modal, label-creation-modal, global-specific-modal, unit-creator, version-history-panel, custom-select, loader)
- [x] Execute Plan 047 S1: Unify ingredient row style with workflow
- [x] Execute Plan 047 S4: Workflow prep rows match ingredient rows
- [x] Execute Plan 047 L3: Responsive tablet/mobile for recipe builder

### Plan 056 â€” Table carousel columns (`plans/056-table-carousel-columns.plan.md`)

- [x] Create shared CellCarouselComponent and CellCarouselSlideDirective in src/app/shared/cell-carousel/
- [x] Wrap Type/Labels/Allergens columns in recipe-book-list with carousel; adjust header and grid template at 768px
- [x] Wrap Category/Allergens/Supplier columns in inventory-product-list with carousel; adjust header and grid template at 768px
- [x] Check lints on all modified files and fix any issues

### Plan 055 â€” SCSS cssLayer audit fix (`plans/055-scss-csslayer-audit-fix.plan.md`)

- [x] Group A: product-form, recipe-header, preparation-search, menu-intelligence, recipe-ingredients-table, ingredient-search (tokens, logical, rhythm)
- [x] Group B: cook-view (media query, !important, missing --cv-* tokens); other B files left for follow-up
- [x] Group C: equipment/venues border-block-end; menu-library --bg-warm â†’ --bg-body
- [x] Group E: shared modals, unit-creator, version-history-panel, custom-select, loader (Five-Group rhythm, logical props)
- [x] Run ng build to verify

### Plan 054 â€” Unify modal styles (`plans/054-unify-modal-styles.plan.md`)

- [x] Expand engine classes in styles.scss: .c-modal-card modifiers (--md, --fluid), .c-modal-actions, .c-modal-body, .c-input-stack, .c-btn-primary--danger/--warning, modal responsive rules
- [x] Update add-item-modal and add-equipment-modal HTML/SCSS
- [x] Update confirm-modal, restore-choice-modal, global-specific-modal HTML/SCSS
- [x] Update translation-key-modal, label-creation-modal, unit-creator HTML/SCSS
- [x] Run ng build and verify all 8 modals render correctly

### Plan 052 â€” Plan 047 audit report (`plans/052-plan-047-audit-report.plan.md`)

- [x] Update Plan 047 todo items in todo.md per audit findings (split L4, mark items per report)
- [x] Optional: implement quick wins (L1 column reorder, S2 timer fixed width, L4 sort by relevance)
- [x] Clarify B3 (volume conversion fix) and B4 (header unit dropdown polish) with spec or acceptance criteria

### Plan 051 â€” Recipe builder UX fixes (`plans/051-recipe-builder-ux-fixes.plan.md`)

- [x] Remove border of unit select; same height for value containers; center header cells (except col-name)
- [x] Reduce logistics search width by 20%
- [x] Move "add new tool" to bottom of dropdown
- [x] Collapsible section cards: state, markup, styling (table-logic, workflow-logic, logistics-logic)

### Plan 050 â€” Recipe list labels, panel, header, menu UX (`plans/050-recipe-list-labels-panel-header-menu-ux.plan.md`)

- [x] 1. Labels column: compact/expand like allergens; header toggle expand-all; clickOutside close
- [x] 2. Row height: col-labels/col-allergens grow to fit expanded content (recipe-book + inventory)
- [x] 3. Panel: chevron-right icon, remove border; sharper animation (both list components)
- [x] 4. Header layout: title right, search center, same design (recipe-book + inventory)
- [x] 5. Menu Intelligence date: clickable label, open picker + focus; keyboard DD/MM/YYYY
- [x] 6. Guest number: remove default spinner (SCSS)
- [x] 7. Guest number: +/- buttons, disable minus at 0

### Plan 049 â€” Menu Intelligence Layout and UX Fixes (`plans/049-menu-intelligence-layout-ux-fixes.plan.md`)

- [x] Meta-column to opposite side (margin-inline swap)
- [x] Remove focus border from all inputs/selects on page
- [x] Delete icons (section + dish) to opposite side
- [x] Verify info/chevron-up toggle (no code change)
- [x] Hide number input spinners on dish-field inputs
- [x] Food cost (food_cost_money) read-only: no edit mode, span only

### Plan 048 â€” Menu Intelligence UX Polish (`plans/048-menu-intelligence-ux-polish.plan.md`)

- [x] Auto-focus dish search input when a recipe is selected (addItem + selectRecipe)
- [x] Replace X icons with trash-2; remove hover background; keep delete on left
- [x] Change .meta-column to width: fit-content
- [x] Glass style all dropdowns + add clickOutside to event-type and dish-search
- [x] Remove borders from all meta rows for consistent borderless look
- [x] Extend keyboard navigation for sections, dish rows, and dish field editing
- [x] Replace chevron toggle with info icon (collapsed) / chevron-up (expanded); add spacing
- [x] Center dish-data fields horizontally with justify-content: center

### Plan 047 â€” Recipe Builder Polish (`plans/047-recipe-builder-polish.plan.md`)

- [x] L4: Reduce logistics search width by 20% (done in Plan 051)
- [x] L4: Sort logistics dropdown by relevance (closest match first)
- [x] S1: Ingredient row style (border, arrows, delete, add-btn match workflow)
- [x] S2: Timer value fixed-width container
- [x] S3: Textarea align + auto-grow
- [x] S4: Workflow prep rows match ingredient rows
- [x] L1: Unit before amount in ingredient grid
- [x] L2: Smart shrinking grid + delete on hover
- [x] L3: Responsive tablet/mobile (768px unified breakpoint, workflow prep-flat-grid mobile pass)
- [x] B1: Labels add/remove (header + form + modal); demo labels + translations unclear
- [x] B2: Duplicate recipe/dish name validation
- [x] B4: Unit selectors in recipe-header (overflow visible + z-index 100)

### Plan 046 â€” Cook-view scale by ingredient (`plans/046-cook-view-scale-by-ingredient.plan.md`)

- [x] cook-view.page.ts: Add scale-by state signals and methods (startSetByIngredient, applyScaleByIngredient, resetToFullRecipe); hide main quantity in special view
- [x] cook-view.page.html: Per-row hover/tap highlight, "Set recipe by this item", inline amount + Convert; special scaled view banner + "Back to full recipe"
- [x] cook-view.page.scss: Row highlight, set-by row controls, special scaled view styles (cssLayer)
- [x] dictionary.json: set_recipe_by_this_item, convert, scale_recipe_confirm, scaled_to, back_to_full_recipe
- [x] Reuse ConfirmModalService for scale confirmation

### Plan 046-1 â€” Cook-view scale-by UX fixes (`plans/046-1-cook-view-scale-by-ux-fixes.plan.md`)

- [x] HTML: Move "Set recipe by this item" into col-name (left of name); empty col-scale-action for normal rows
- [x] SCSS: Button visible only on row hover; full-row border/box-shadow on hover; yellow box-shadow for setting state; scaled-view shell + banner (edit-mode-like, different colors); spacing between containers

### Plan 045 â€” Logistics tools and menu type edit (`plans/045-logistics-tools-and-menu-type-edit.plan.md`)

- [x] Show logistics section for both recipe and dish (recipe-builder.page.html)
- [x] Tool search + "Add new tool" opening add-equipment modal in recipe builder
- [x] Logistics grid: search + quantity one side, dense chip grid other side; distinct styling from ingredients
- [x] Metadata manager: menu type row grid 1fr auto 30px 30px; inline name edit; removable field chips; confirm on rename
- [x] MetadataRegistryService.renameMenuType; MenuEventDataService.updateServingTypeForAll; confirm modal + translation key

### Plan 044 â€” Custom dropdown for all selects (`plans/044-custom-dropdown-for-all-selects.plan.md`)

- [x] Create CustomSelectComponent (CVA, scrollable dropdown, host focus forwarding)
- [x] Replace native selects app-wide: unit-creator, add-equipment-modal, equipment-form, equipment-list, recipe-workflow, recipe-ingredients-table, inventory-product-list, cook-view, menu-library-list, venue-form, recipe-builder
- [x] Save plan 044 to plans/

### Plan 043 â€” Reusable dropdown with scroll arrows (`plans/043-reusable-dropdown-scroll-arrows.plan.md`)

- [x] Add .c-dropdown engine in src/styles.scss (wrapper, list with hidden scrollbar, scroll-top/scroll-bottom arrows)
- [x] Create scrollIndicators directive (core/directives)
- [x] Create ScrollableDropdownComponent (shared/scrollable-dropdown)
- [x] Migrate preparation-search and ingredient-search (HTML, SCSS)
- [x] Migrate menu-intelligence (event-type, section-dropdown, dish-dropdown)
- [x] Migrate recipe-header (unit x2, label dropdown)
- [x] Migrate product-form (category, supplier, allergen dropdowns)
- [x] Migrate recipe-book-list (ingredient-dropdown)
- [x] Add agent guidance (HOW-WE-WORK and/or copilot-instructions)

### Plan 042 â€” Menu Intelligence Metadata Redesign (`plans/042-menu-intelligence-metadata-redesign.plan.md`)

- [x] 1. menu-intelligence.page.ts: expandedMetaKeys_, isDishMetaExpanded, toggleDishMeta; editingDishField_, startEditDishField, commitEditDishField, isEditingDishField, getInputWidth
- [x] 2. menu-intelligence.page.html: dish row block; name cell + toggle button; conditional .dish-data; click-to-edit fields (display/edit branches)
- [x] 3. menu-intelligence.page.scss: single-column list; .dish-row block; toggle + click-to-edit styles; carousel at narrow (cssLayer)

### Plan 041 â€” Menu Intelligence UX Fixes (`plans/041-menu-intelligence-ux-fixes.plan.md`)

- [x] a: Add dictionary entries for default section categories
- [x] b: Close category dropdown on click outside (ClickOutSideDirective)
- [x] c: Hide scrollbar in dropdown containers
- [x] d: Remove dish-qty (derived portions) from dish row
- [x] e: Section grid layout (30% data column, centered names, responsive + mobile)

### Plan 040 â€” Menu Intelligence Layout and Design (`plans/040-menu-intelligence-layout-design.plan.md`)

- [x] d: Replace var(--bg-paper-light) with var(--bg-pure) in menu-intelligence.page.scss
- [x] a+b+c: Menu name as h1, meta right-aligned and denser, paper border-radius
- [x] f: Add persistent "Add category" in section dropdown via add-item-modal
- [x] g1: MenuTypeDefinition model + MenuItemSelection extend
- [x] g2: MetadataRegistryService MENU_TYPES storage
- [x] g3: Metadata manager "Menu Types" card with field checkboxes
- [x] g4â€“g6: Dynamic serving-type dropdown + dish-row field container in menu-intelligence

### Plan 039 â€” List UX Panel and Scroll (`plans/039-list-ux-panel-scroll.plan.md`)

- [x] Move filter panel to visual right (grid swap in both list SCSS)
- [x] Replace panel toggle with hover-reveal arrow icon; hide scrollbars; remove Cook/History buttons from recipe book
- [x] Move open-panel (hamburger) into list header when panel closed (recipe-book + inventory); merge to main (feat/list-ux-panel-and-header)

### Plan 038 â€” Inverted-L List Layout (`plans/038-inverted-l-list-layout.plan.md`)

- [x] Restructure recipe-book-list and inventory-product-list to inverted-L (header / table-area / filter-panel)
- [x] Rewrite both SCSS: grid, fixed header, scrollable table body, retractable panel (cssLayer)
- [x] Replace sidebar signals with isPanelOpen_ / togglePanel(); remove swipe and media-query logic
- [x] Build and linter verified

### Plan 037 â€” Recipe Labels Refactor (`plans/037-recipe-labels-refactor.plan.md`)

- [x] Create LabelDefinition interface + labels_/autoLabels_ on Recipe model
- [x] Extend MetadataRegistryService: allLabels_ signal, registerLabel, deleteLabel, getLabelColor (KITCHEN_LABELS)
- [x] Create label-creation-modal component + service (name, key, color swatches, auto-trigger picker)
- [x] Extend metadata-manager: add 'label' type, labels card, delete guard, custom add via label modal
- [x] Recipe builder: labels FormControl, patchFormFromRecipe, buildRecipeFromForm, computeAutoLabels on save, liveAutoLabels_
- [x] Recipe header: custom searchable label dropdown, colored chips (manual removable, auto locked)
- [x] Recipe-book: replace main_category with labels column (colored chips), filter, sort
- [x] Add translation keys (labels, choose_label, create_new_label, no_label, label_name, label_color, auto_trigger_sources, save_label, add_new_label)
- [x] Register label-creation-modal in app root

### Plan 036 â€” Dashboard Control Panel Fixed Tabs (`plans/036-dashboard-control-panel-fixed-tabs.plan.md`)

- [x] Extend DashboardTab to five tabs; query param; five tab buttons; sticky header
- [x] Render five views (overview, metadata, venues, add-venue, trash); VenueForm embedded mode
- [x] Suppliers tab in dashboard (suppliers + add-supplier); unified list layout and table (venue, equipment, supplier): fixed layout, col-actions-inner flex, empty states (feat/dashboard-suppliers-unified-lists)

### Plan 035 â€” Header and Navigation Refactor (`plans/035-header-navigation-refactor.plan.md`)

- [x] A. Hide mobile-close-btn in desktop mode via SCSS rule
- [x] B+E. Remove 5 nav items from header HTML, increase gap for padding
- [x] C. Add equipment child route under inventory + nav buttons in inventory page
- [x] D. Create AddEquipmentModal component + service (name + category fields)
- [x] F+H. Location/Trash buttons in dashboard tab bar
- [x] G. Create HeroFab (expand on main-button hover only); remove footer

### Plan 034 â€” Recipe Builder UI Fixes (`plans/034-recipe-builder-ui-fixes.plan.md`)

- [x] a. Type toggle: pass recipeType from parent, add input in header, use in template
- [x] b. Header unit dropdowns: overflow visible + z-index for primary/secondary
- [x] c. Add row button: justify-content center in recipe-builder.page.scss
- [x] d. Ingredient search dropdown: z-index 100, ensure no overflow clip
- [x] e. Ingredients table: container-aware grid + small-screen stacked cards
- [x] f. Workflow section: space-evenly + define prep-flat-grid styles
- [x] g. Add step button: width 100%, align with grid in recipe-workflow

### Plan 032 â€” Custom Cooking Loader (`plans/032-custom-cooking-loader.plan.md`)

- [x] Create loader component (simmering pot + steam, sizes large/medium/small, overlay, inline).
- [x] Add dictionary keys (loader_loading, loader_saving, loader_please_wait, loader_cooking_up).
- [x] Route-level loader in app.component; trash + version-history panel medium loaders.
- [x] Save-button loaders: recipe-builder, menu-intelligence, cook-view, product/equipment/venue forms.
- [x] Delete/clone loaders: recipe-book, inventory, equipment, venue, menu-library; inventory price-save loader.
- [x] Demo data import large overlay on metadata manager.

### Plan 017 â€” Recipe Book List UX Overhaul (`plans/017-recipe-book-list-ux-overhaul.plan.md`)

- [x] Sidebar open by default (desktop), closed on mobile; sticky right; mobile off-canvas with close button.
- [x] Remove approved/station table columns; keep Approved & Station as sidebar filters.
- [x] Remove sort arrow icons; keep click-to-sort on column titles.
- [x] Allergens column: narrow by default; header click = expand all rows, row icon = expand that row; dense grid.
- [x] Cost column before actions; yield tooltip on hover/tap (getRecipeYieldDescription).
- [x] Cost tooltip: show below cell, Hebrew label (price_for), fixed position so last row is visible (feat/recipe-book-cost-tooltip).
- [x] Top search = recipe/dish name (action bar + mobile fixed with toggle); sidebar search = by produce (ingredients) with dropdown, chips, clear, filter by all selected.
- [x] Ingredient search: product dropdown, chips (click to remove), clear, recipeContainsAllProducts filter.
- [x] Dictionary keys: Approved, Station, approved_yes, approved_no, no_station, search_by_ingredients, clear.

### Plan 012-2 â€” Kitchen demo data full values (`plans/012-2-kitchen-demo-data-full-values.plan.md`)

- [x] demo-suppliers.json: 10 suppliers (add 2)
- [x] demo-products.json: subset with purchase_options_ and variety
- [x] demo-recipes.json: optional ingredient note_ on some
- [x] demo-dishes.json: all 10 dishes have logistics_.baseline_, prep_items_ or mise_categories_
- [x] demo-equipment.json: verify categories and scaling mix
- [x] demo-venues.json: 10 venues (add 7)

### Phase 2 â€” Product Enhancement

- [x] **Plan 012 â€” Supplier Management Page**: Dedicated CRUD page at `/suppliers` with list, edit, delete, linked products view.

---

### Plan 011 â€” Dashboard & Command Center Unification (done)

- [x] Dashboard default route, Overview + Core settings tabs; `/command-center` â†’ `/dashboard?tab=metadata`; single Dashboard nav link; unit tests + recipe-builder spec fix (queryParams).

### Phase 1 â€” Stabilize & Complete (`plans/010-product-roadmap.plan.md`)

- [x] Add `recipe-book-list.spec.ts` and run tests (Plan 008 closure).
- [x] Set up Playwright E2E tests: config + 3 critical flow tests (product CRUD, recipe creation with cost, recipe edit persistence).
- [x] Optionally expand minimal specs (e.g. recipe-builder page and subcomponents) with behavior tests when touching those areas.
- [x] Sync documentation: update `project-plan.md` checkboxes, update breadcrumbs.

### Plan 009 â€” Cohesive Add Item Modal (`plans/009-cohesive-add-item-modal.plan.md`)

- [x] Create AddItemModalService and AddItemModal component (refactor from add-supplier-modal).
- [x] Create AddSupplierFlowService for add-supplier orchestration.
- [x] Update TranslationKeyModal for 'unit' context (metadata manager).
- [x] Update Product Form to use AddSupplierFlowService.
- [x] Update Metadata Manager to use TranslationKeyModal instead of prompt().
- [x] Update App Root and delete deprecated add-supplier-modal service.
- [x] Add add_supplier_translation_key and ensure dictionary keys.

### Plan 008 â€” Recipe Book Page (`plans/008-recipe-book-page.plan.md`)

- [x] Route `/recipe-book` + page shell + header link (replace `/dishes`).
- [x] Recipe-book-list component: grid with sortable columns (name, type, cost, approved, station, main-category, allergens, actions).
- [x] Sidebar: search, filters (type, allergens, main-category placeholder).
- [x] Allergens column: button opens floating container with dense allergen chips (aggregated from ingredients).
- [x] Actions: Add, Edit, Delete; KitchenStateService.deleteRecipe (routes to DishDataService/RecipeDataService by recipe_type_).
- [x] Main-category column placeholder (no_category).
- [x] Add recipe-book-list.spec.ts and run tests.

### Plan 007 â€” Product Form Enhancement (`plans/007-product-form-enhancement.plan.md`)

- [x] Add SupplierDataService and persist suppliers to KITCHEN_SUPPLIERS.
- [x] Create TranslationKeyModal component and service (replace prompt).
- [x] Add supplier, is_dairy, min_stock_level, expiry_days_default to form.
- [x] Ensure NEW_CATEGORY and NEW_ALLERGEN flows persist via MetadataRegistry.
- [x] Apply translatePipe to all labels and add dictionary keys.
- [x] Style new fields and modal per application design system.
- [x] Update inventory list to resolve supplierId_ to supplier name for display.

### Plan 006 â€” Recipe Workflow Refactor (`plans/006-recipe-workflow-refactor.plan.md`)

- [x] (a) Preparation category: always a select (main grid + add-form); choose category placeholder; add-option; per-recipe override.
- [x] (b) Quantity input: remove browser default spinners.
- [x] (c) Instruction textarea: SelectOnFocus, Enter-to-save-and-new-row, center text.
- [x] (d) Dish mode: sort/group button beside preparation category.
- [x] (e) Dual workflow persistence: keep both prep list and steps when switching recipe type.
- [x] (f) Apply translatePipe to all user-facing strings.
- [x] (g) New category: prompt for English value, add to dictionary.

### Plan 006-1 â€” Preparation Global vs Specific (`plans/006-1-preparation-global-vs-specific.plan.md`)

- [x] Add dictionary keys (change_global, add_as_specific, category_change_prompt).
- [x] Add getPreparationByName and updatePreparationCategory to PreparationRegistryService.
- [x] Create GlobalSpecificModal component and service.
- [x] Add main_category_name to recipe-builder form and recipe-workflow.
- [x] Extend onCategoryChange with modal logic.
- [x] Register modal in app root.

### Plan 006-2 â€” Preparation Category Change Modal (`plans/006-2-preparation-category-change-modal.plan.md`)

- [x] Category change modal (Change global / Add as specific).
- [x] Undo/revert for change main.

### Plan 005 â€” Inventory Page Enhancement (`plans/005-inventory-page-enhancement.plan.md`)

- [x] Action sidebar: search by name, filters (category, allergens, supplier), collapsible from right.
- [x] Product list: sharp table grid with edit/delete per row.
- [x] Styling: slate palette, allergen pills, sharp borders.
- [x] Hover animation on products for edit and delete icons.

### Plan 005-1 â€” Inventory List Refactor (`plans/005-1-inventory-list-refactor.plan.md`)

- [x] Column-header sort (replace sidebar sort).
- [x] Hamburger fade when sidebar open.
- [x] Remove Add product button.
- [x] Center-align grid row text.

### Plan 004 â€” Recipe Workflow Enhancement (`plans/004-recipe-workflow-enhancement.plan.md`)

- [x] Create PreparationRegistryService + spec.
- [x] Create PreparationSearchComponent (ts, html, scss, spec).
- [x] Update Recipe model (FlatPrepItem, prep_items_, prep_categories_).
- [x] Update recipe-builder.page.ts (flat form, createPrepItemRow, patch, build).
- [x] Update recipe-workflow component for dish flat grid (prep list with search, category, quantity, unit).
- [x] Add dictionary entries and verify icons.
- [x] Migration: load old mise_categories_ into flat form; save as prep_items_ and prep_categories_.

### Plan 003 â€” Recipe Ingredients Table Enhancement (`plans/003-recipe-ingredients-table-enhancement.plan.md`)

- [x] Add plus/minus quantity controls (incrementAmount, decrementAmount).
- [x] Add percentage column (getPercentageDisplay, getRowWeightG in RecipeCostService).
- [x] Update grid layout for quantity+controls and percentage.
- [x] Minor fixes: remove duplicate import, unused totalMass_.

### Plan 002 â€” Recipe Header Scaling (`plans/002-recipe-header-scaling.plan.md`)

- [x] Register `dish` as a real unit in UnitRegistryService.
- [x] Primary unit label for dishes shows `dish` via translatePipe.
- [x] Upgrade secondary chips to same UX as primary (counter-grid, SelectOnFocus, +/- buttons, minus disabled at zero).
- [x] Unit filtering: bidirectional exclusivity (availablePrimaryUnits_, availableSecondaryUnits_).
- [x] Header specs: dish unit, secondary chip UX, unit filtering.

### Recipe Builder (recipe-builder-page.md â€” excluded from plan audit per request)

- [x] Recipe-builder plan executed: `plans/recipe-builder-page.md` â€” A1â€“A5, C1â€“C2 (currentCost, mise-en-place fix, persistence, RecipeDataService, edit flow, pendingChangesGuard, reactive portions).
- [x] fix(recipe-builder): confirm when leaving with unsaved edits â€” markAsDirty in ingredients/workflow/logistics + hasUnsavedEdits(); fix/recipe-unsaved-changes-confirm merged to main.
- [x] Recipe header labels: dense grid + Label dropdown, colored chips, clear all; Lucide icons (log-out, shopping-cart, grip-vertical, archive, download, upload) â€” `feat/recipe-builder-labels-and-icons` merged to main.
- [x] Recipe header label chips: fit width to text (flex + max-content) â€” `fix/recipe-header-label-chips-fit-text` merged to main.
- [x] feat/recipe-cook-quantity-and-ux merged to main: format-quantity pipe, unit registry, recipe-builder/workflow/ingredients/cook-view/metadata-manager/modals and styles, deps and demo data (3 commits).
- [x] feat/quantity-controls-unified merged to main: shared quantity-step util (value-based step 1 / 0.001), cook-view, recipe-ingredients-table, recipe-workflow, menu-intelligence guest count, recipe-builder logistics +/-.
- [x] feat/recipe-builder-ingredients-ux merged to main: no duplicate ingredients in ingredient search dropdown; add preparation adds empty row without category picker.
- [x] feat/add-recipe-dictionary-mise-category merged to main: preparation_categories in dictionary + TranslationService; add-recipe skill (dictionary sync, mise per-preparation semantics, Step 2/5b/6/8); plan 084.

### Unit Tests & Specs

- [x] Unit test suite in place: 27 `.spec.ts` files (Karma/Jasmine).
- [x] Core services with substantive tests: `product-data.service`, `async-storage.service`, `unit-registry.service`, `metadata-registry.service`, `conversion.service`, `kitchen-state.service`, `translation.service`.
- [x] Core guards, resolvers, pipes, directives covered: `pending-changes.guard`, `product.resolver`, `translation-pipe.pipe`, `select-on-focus.directive`, `click-out-side.directive`, `item.validators`.
- [x] Core UI components: `header`, `footer`, `user-msg`.
- [x] Inventory page and components: `inventory.page`, `inventory-product-list`, `product-form`.
- [x] Recipe-builder page and components: page + `recipe-workflow`, `recipe-ingredients-table`, `recipe-header`, `ingredient-search` (minimal "should create" specs).
- [x] Metadata-manager page: `metadata-manager.page.component`.
- [x] Fix spec compile errors: `pending-changes.guard.spec`, `translation-pipe.pipe.spec`, `metadata-manager.page.component.spec` (suite builds and runs).
- [x] Fix remaining 21 failing unit tests: provide `HttpClient` / `TranslationService` where needed; satisfy required inputs; align specs with async API; add Lucide icons; fix header route assertion.
- [x] Run full unit test suite (`npm test -- --no-watch --browsers=ChromeHeadless`) and confirm all tests pass (89/89).
- [x] Shared: `unit-creator.component`.
- [x] App root: `app.component.spec.ts`.

### Recipe Builder â€” Ingredients keyboard-first UX (ad-hoc)

- [x] Open recipe-builder with one empty row and auto-focus its search (afterNextRender).
- [x] Add-row button: focus moves to new rowâ€™s search so user can type immediately.
- [x] Ingredient search: arrow keys + Enter in dropdown; Enter with no selection adds new row.
- [x] After selecting item: focus moves to quantity (no new row); Tab goes to unit select (not +/-).
- [x] Enter in quantity or unit: add new row and focus new rowâ€™s search (keyboard-only flow).
- [x] FocusByRowDirective + wiring for focus-by-row (qty/unit).

### feat/suppliers-nav-and-auth-buttons (merged to main)

- [x] refactor(suppliers): remove redundant page nav, list-header only
- [x] feat(auth): show add/edit disabled with tooltip when not signed in

### feat/list-shell-unified-styling (merged to main)

- [x] style(global): add list header alignment and shared body cell classes (.c-grid-header-cell flex/center, .c-list-row, .c-list-body-cell in styles.scss)
- [x] refactor(lists): use global list classes in all list-shell pages (recipe-book, suppliers, equipment, venues, inventory)

### feat/unify-table-and-design-engine (merged to main)

- [x] refactor(styles): table justify and venue/supplier header layout (styles.scss, venue-list, supplier-list, angular.json)
- [x] refactor(inventory): product list to HTML table and toolbar (inventory-product-list html, scss, ts)

### feat/filter-sidebar-and-ingredient-search (merged to main)

- [x] feat(list-shell): sidebar styling and shared c-filter-* utilities (list-shell, styles.scss, supplier/equipment/inventory/venue list SCSS)
- [x] fix(recipe-book): ingredient search - no duplicate add, no redundant heading, no-match message (recipe-book-list html/scss/ts, dictionary no_ingredients_found)

### Recipe Builder â€” Scaling, Bruto, Weight/Volume Toggle (`docs/recipe_metrics_scaling_plan.md`)

- [x] RecipeCostService: fix product weight formula (`net / conversion_rate_`), registry fallback for volumeâ†’grams, VOLUME_OR_WEIGHT_KEYS.
- [x] RecipeCostService: computeTotalBrutoWeightG, getUnconvertibleNamesForWeight, computeTotalVolumeL (with unconvertible names); IngredientWeightRow.name_hebrew.
- [x] recipe-builder.page: totalBrutoWeightG_, totalVolumeL_/totalVolumeMl_, unconvertibleForWeight_/unconvertibleForVolume_; pass to header; ingredientsFormVersion_ so totalCost_/totalWeightG_ recompute when ingredients change.
- [x] recipe-header: inputs (totalBrutoWeightG, totalVolumeL, totalVolumeMl, unconvertible lists); metricsDisplayMode_ (weight | volume); toggle on metric-group click; bruto or volume display; red notice icon + floating list (names only), hover/click, ClickOutSideDirective.
- [x] recipe-header styles: metric-group-weight-volume, metrics-notice-wrap, metrics-notice-icon, metrics-notice-floating, metrics-notice-item.
- [x] Fix cost not updating when adding ingredients (computed depended on no signal; now depends on ingredientsFormVersion_ bumped in valueChanges).

### feat/demo-products-from-list (merged to main)

- [x] feat(data): update demo-products from user produce list â€” prices for 21 existing products, 65 new products (demo_121â€“demo_185).

### Optimize add-recipe skill and data (feat/optimize-add-recipe-skill merged to main)

- [x] Merge SCHEMA.md into SKILL.md, consolidate 8 steps into 5, add lazy file reads
- [x] Remove dead service_overrides_ from all 18 dishes in demo-dishes.json
- [x] Slim command (7â†’3 lines) and rule (15â†’6 lines)
- [x] Save plan 085 â€” optimize-commit-github-skill

---

## 2026-03-29 â€” Audit cleanup: archived with open tasks deferred

### Plan 190 â€” Master De-Spaghettification Map â€” deferred tasks (`plans/190-master-de-spaghettification-map.plan.md`)

- [ ] Phase A1: Replace hardcoded Hebrew strings with `translatePipe` keys and dictionary entries (SW-4)
- [ ] Phase A2: Replace orphan button classes with design-system `c-*` tokens in product/metadata flows (HI-1)
- [ ] HI-6: Consolidate scroll-zone scaffold into shared `app-scroll-zone` component
- [ ] SW-5: Decompose god files (`menu-intelligence`, `recipe-builder`, `product-form`)
- [ ] Phase C1: Consolidate list-page signal clusters into shared list state base/composable (HI-4)
- [ ] Phase C2: Consolidate scroll-indicator scaffold into shared scroll-zone infrastructure (HI-6)
- [ ] Phase C3: Decompose god files into page services/sub-components (`menu-intelligence`, `recipe-builder`, `product-form`) (SW-5)

### Plan 198 â€” Lite agent refactor adoption â€” deferred tasks (`plans/198-lite-agent-refactor-adoption.plan.md`)

- [ ] CRITICAL: Verify Legacy security-officer requirements + 30-item checklist fully migrated to copilot-instructions §5 before retiring Legacy agent
- [ ] HIGH: Fix `.claude/toBe/agents/breadcrumb-navigator.md` content (Navigator vs Architect mismatch)
- [ ] MEDIUM: Lite QA agent â€” prominent spec-authoring callout (no `.spec.ts` during iterative plan execution)
- [ ] MEDIUM: One Master-section pointer line per Lite agent (delegation cross-references)
- [ ] Adoption: Promote `.claude/toBe/` foundation + agents to canonical paths when 1â€”3 satisfied; run validate-agent-refs
- [ ] Verification: breadcrumb-navigator + ui-inspector SKILLs hold canonical protocol detail before stripping Legacy agents

---

### Plan 240 — Validation Checklist Workflow Integration (`plans/240-validation-checklist-workflow-integration.plan.md`)
- [x] Create `.claude/instructions/` directory (prerequisite — path didn't exist)
- [x] Create `.claude/instructions/validation-checklist.md` — reusable checklist instruction with tree-format output
- [x] Add `@.claude/instructions/validation-checklist.md` to top of `.claude/commands/execute-it.md`

---

### Plan 239 — Incomplete badge + ternary guard modal + AI-prefill fix (`plans/239-incomplete-badge-ternary-modal-guard-fix.plan.md`)
- [x] `recipe-ingredients-table.component.ts` — Router inject + isProductIncomplete + navigateToEditProduct
- [x] `recipe-ingredients-table.component.html` — incomplete-row class + badge button
- [x] `recipe-ingredients-table.component.scss` — .incomplete-row, .incomplete-badge, pulse animation
- [x] `dictionary.json` — product_incomplete_hint, save_and_leave, error_saving_recipe
- [x] `confirm-modal.service.ts` — openTernary(), showSaveButton, saveButtonLabel, ConfirmModalResult
- [x] `confirm-modal.component.html` — string choose() calls + conditional 3rd button
- [x] `confirm-modal.component.spec.ts` — update mock + assertions
- [x] `pending-changes.guard.ts` — saveAndWait interface + ternary vs binary flow
- [x] `recipe-builder.page.ts` — saveAndWait() + hasRealChanges() failsafe for new recipes

---

### Plan 236/237/238 — AI Recipe: ingredients fix + prompt engineering + few-shot loop
- [x] `gemini.service.ts` — Replace SYSTEM_PROMPT with domain-aware rules + English canonical units
- [x] `recipe-builder.page.ts` — Unit fallback in `prefillFromAiDraft` (safeUnit via `allUnitKeys_()`)
- [x] `recipe-ingredients-table.component.html` — Extend `[initialQuery]` to pre-fill AI-suggested names
- [x] Create `src/app/core/utils/gemini-shots.util.ts` — few-shot localStorage util
- [x] `gemini.service.ts` — Inject few-shot block into generateRecipe prompt
- [x] `ai-recipe-modal.component.ts` — Call `addGeminiShot` on “Open in Builder”

---

### Plan 235 — Gemini model fix + usage tracker (`plans/235-gemini-model-fix-usage-tracker.plan.md`)
- [x] `gemini.service.ts` — change model URL from `gemini-2.0-flash` to `gemini-2.5-flash-lite`
- [x] `gemini.service.ts` — replace two-pass fence regex with single non-anchored `/\`\`\`json|\`\`\`/g`
- [x] Create `src/app/core/utils/gemini-usage.util.ts` — localStorage usage tracker with limit guard
- [x] `gemini.service.ts` — import util, add limit guard before fetch, call increment after success
- [x] `ai-recipe-modal.component.ts` — add `computed` + `OnInit` imports; implement interface; add usage signal, computed, refreshUsage
- [x] `ai-recipe-modal.component.html` — insert `.ai-usage-bar` block above generate button
- [x] `ai-recipe-modal.component.scss` — append `.ai-usage-bar` styles

---

### Plan 234 — Filter panel default-closed + animation fix (`plans/234-filter-panel-default-closed-animation-fix.plan.md`)
- [x] `panel-preference.util.ts` — change both `return true` fallbacks to `return false`
- [x] `list-shell.component.scss` — add `overflow: visible` to `.list-container` in tablet media block
- [x] `list-shell.component.scss` — add `border-inline-start-width 0.3s var(--ease-spring)` to desktop `.filter-panel` transition
- [x] `ng build` — verify zero errors

---

### Plan 242 — Dev Guest Backend Token (`plans/242-dev-guest-backend-token.plan.md`)
- [x] `server/models/user.model.js` — add `role` field; make `passwordHash` optional
- [x] `server/routes/auth.js` — add `POST /guest` dev-only route with JWT + refresh cookie
- [x] `src/app/core/services/user.service.ts` — add `callBackendGuestLogin()` + `loginAsGuestBackend()`
- [x] `src/app/core/components/auth-modal/auth-modal.component.ts` — restore `isDev`; branch `loginAsGuest()` on `useBackendAuth`

---

### Plan 241 — Switch FoodVibe to MongoDB Backend Mode (`plans/241-backend-switch.plan.md`)
- [x] `server/routes/generic.js` — remove blanket verifyToken; add per-route middleware on write routes; update comment
- [x] `src/environments/environment.ts` — revert to useBackend: false, useBackendAuth: false
- [x] Create `src/environments/environment.local.ts` — useBackend: true, useBackendAuth: true
- [x] `angular.json` — add local build + serve configurations
- [x] `package.json` — add dev:local script
- [x] `user.service.ts` — fix login() backend path to hash password before sending

---

### Plan 229 — Point dev environment at local Express/MongoDB (`plans/229-dev-env-local-backend.plan.md`) — superseded by Plan 241
- [x] Edit `src/environments/environment.ts`: set apiUrl/authApiUrl to localhost:3000, useBackend/useBackendAuth to true (reverted in Plan 241 — replaced by environment.local.ts approach)
- [x] Run `ng build --configuration production` and confirm zero errors

---

### Plan 241 — gstack Integration & Agent Rewiring (`plans/241-gstack-integration-agent-rewiring.plan.md`)
- [x] Phase 2: `CLAUDE.md` — append gstack section after Branch Rule
- [x] Phase 3: Delete `.claude/agents/ui-inspector.md`
- [x] Phase 4: `team-leader.md` — delete UI Inspector callout + rewrite Section 4 Visual QA
- [x] Phase 5: `qa-engineer.md` — delete UI Inspector callout + rewrite Section 4 + append /investigate to Section 2
- [x] Phase 6: `security-officer.md` — append /cso callout after Model Guidance line
- [x] Phase 7A: `copilot-instructions.md` — delete UI Inspector trigger block (lines 50–54)
- [x] Phase 7B: `copilot-instructions.md` — insert gstack Visual QA + /investigate + /cso triggers
- [x] Phase 7C: `copilot-instructions.md` — rewrite UI Verification Gate to reference /qa
- [x] Phase 7D: `copilot-instructions.md` — delete UI Inspector row from §0.5 Model Routing table
- [x] Phase 8A: `agent.md` — delete UI Inspector row from Agent Task Force table
- [x] Phase 8B: `agent.md` — append gstack line to Core Skills section
- [x] Phase 8C: `agent.md` — rewrite Post-Execution Gate to add /qa step for layout changes
- [x] Phase 9A: `validate-agent-refs.md` — delete ui-inspector.md from expected agents list
- [x] Phase 9B: `validate-agent-refs.md` — remove ui-inspector from bash loop
- [x] Phase 9C: `validate-agent-refs.md` — update expected agent count 7→6
- [x] Phase 10A: `todo.md` — mark Plan 197 Phase 5 as OBSOLETE
- [x] Phase 10B: `todo.md` — check Plan 198 section for ui-inspector reference (Plan 198 is Done, no open tasks)
- [x] Phase 10C: `truly-open-tasks.md` — mark Plan 197 Phase 5 as OBSOLETE
