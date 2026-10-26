# Plan 452 — Replace the seven copy-pasted search dropdowns with one shared search box

Status: active
Track: code
Depends-on: 450
Conflicts-with: 453, 454, 455, 456, 457
Snapshot: 34c560fc8db9272f41a85c57c5eb8d3407b3caed

## Problem Statement
Seven pages each hand-build the same `input + <app-scrollable-dropdown> + <ul role="listbox"> + <app-add-option-row>` shell instead of using `shared/custom-select` (`typeToFilter`, `allowTypedAdd`). Each copy re-implements the keyboard rule (rule K), the add-option rule and the Hebrew-aware filter, and they drift (some skip highlight-on-open, some miss rule X). Multi-pick with chips also has two bases (`shared/custom-multi-select`, `shared/chip-search-dropdown`). Found by the reuse audit (`docs/mvp/reuse-audit-2026-10-20.md`, P3). This is a refactor: **no behaviour change**.

Call-sites on `main` before the MVP (re-verified in Step 0):
1. `src/app/pages/menu-intelligence/menu-intelligence.page.html` — event-type (~L60–86) and section-category (~L216–237).
2. `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html` (~L72–86, no add row).
3. `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html` — ingredient filter (~L390–428).
4. `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.html` (+ `.ts`).
5. `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.html` (+ `.ts`).
6. `src/app/pages/recipe-builder/recipe-builder.page.html` — logistics tool picker (~L390–422), state in `services/recipe-logistics-picker.service.ts`.
Chip bases: `chip-search-dropdown` used by `product-form.component.html` (3 places); `custom-multi-select` by `recipe-header.component.html`.

## Goals & Success Criteria
- Primary: every search-style picker above renders through one shared component; the page-local `scrollable-dropdown + listbox + add-option-row` shells are gone; no page behaviour changes.
- Success:
  - [x] [auto] `npx ng build` and `npx ng test --watch=false` pass after every sub-task (exact exit codes in the run notes).
  - [x] [auto] `grep -rl "app-add-option-row" src/app/pages` returns no file in the six call-site files above (only `src/app/shared/**` remains).
  - [x] [auto] Net line count of each frozen file touched (`menu-intelligence.page.ts`, `recipe-builder.page.ts`) is <= 0: `git diff --numstat main -- <file>` added <= deleted.
  - [x] [auto] New/updated specs cover rule K (first option highlighted, Arrow stops at ends, Enter picks, Escape closes, Tab closes), rule X (exact name hides the add row) and rule W (add opens its window, never adds typed text) on the shared component.
  - [x] [auto] `node scripts/scope-check.mjs --diff=main` passes; `node scripts/breadcrumbs-check.mjs` passes.
  - [ ] [human] Smoke check per touched page (one card each, S2–S8): menu-intelligence (event type + section category + dish row), recipe-book list ingredient filter, recipe-builder ingredient search, preparation search, logistics tools — type, arrow, Enter, Escape, add new; identical to before.
  - [ ] [human] Product form and recipe header chip pickers still add/remove chips as before (S9).

## Execution Mode
- Parallel: no — sub-tasks edit the same shared component sequentially; each ends buildable.
- Concurrent plans: 450 must be merged first; 453 (list kit) touches `recipe-book-list` and 451 (modal shell) touches add modals — not parallel with S5 / S8; check `scope-check.mjs --overlap` at start.
- Isolated DB: no

## Execution Notes
- Depends on: the MVP merge to main (branch `mvp`); plan 450 (reuse layer: component-families registry, `reuse-lint`). Independent of 451, 453–457.
- Convert **one call-site per sub-task**; S1 and S9 are the only ones that edit `src/app/shared/**`. Checkpoints (stop, report, wait for `done`): S1, S4, S7, S9.
- Decision ladder: S1 records whether the rich-row pickers (4, 5, 6: unit chips, quantity, availability marks) fit `custom-select` by an `optionTemplate` input plus `typeToFilter`. If the shared component would need more than 3 new boolean/mode flags, build sibling `shared/search-combobox` (sub-task S1b) reusing `filterOptionsByLabel`, `addOptionLabel`, `findOptionByLabel`, `resolveAddedKey` and the existing keyboard code — never another `@if` branch on `custom-select`.
- Multi-pick base decision (S9): `shared/custom-multi-select` is the base for new code. `chip-search-dropdown` is migrated only if S9 finds the product-form usages convert with no behaviour change; otherwise it stays, gets a `@deprecated` note in its component docblock and a line in `docs/brain/component-families.md`, and the Human decides (Critical Questions).
- Frozen files: edit `.ts` of `menu-intelligence.page` and `recipe-builder.page` only to delete code (handlers, signals, `ViewChild`s that the shell needed). Hotspots (`styles.scss`, `dictionary.json`, `app.routes.ts`) append-only; no dictionary change expected.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/custom-select/custom-select.component.ts
src/app/shared/custom-select/custom-select.component.html
src/app/shared/custom-select/custom-select.component.scss
src/app/shared/custom-select/custom-select.component.spec.ts
src/app/shared/search-combobox/**
src/app/shared/custom-multi-select/custom-multi-select.component.ts
src/app/shared/custom-multi-select/custom-multi-select.component.html
src/app/shared/custom-multi-select/custom-multi-select.component.scss
src/app/shared/custom-multi-select/custom-multi-select.component.spec.ts
src/app/shared/chip-search-dropdown/chip-search-dropdown.component.ts
src/app/shared/chip-search-dropdown/chip-search-dropdown.component.html
src/app/shared/chip-search-dropdown/chip-search-dropdown.component.spec.ts
src/app/shared/breadcrumbs.md
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.scss
src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html
src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.ts
src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.scss
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.spec.ts
src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.html
src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.ts
src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.scss
src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.spec.ts
src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.html
src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.ts
src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.scss
src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.spec.ts
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/recipe-builder.page.scss
src/app/pages/recipe-builder/services/recipe-logistics-picker.service.ts
src/app/pages/recipe-builder/services/recipe-logistics-picker.service.spec.ts
src/app/pages/inventory/components/product-form/product-form.component.html
src/app/pages/inventory/components/product-form/product-form.component.ts
docs/brain/component-families.md
docs/brain/decisions/0025-search-combobox-and-one-multi-pick-base.md
docs/agent/standards-domain.md
docs/agent/standards-reuse.md
scripts/lib/registry-families.mjs
src/app/pages/menu-intelligence/_paper-ui.scss
src/app/pages/menu-intelligence/services/menu-picker-search.service.ts
src/app/pages/menu-intelligence/services/menu-picker-search.service.spec.ts
docs/mvp/runs/452.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — UI only; no permission logic touched.
- INV-2: preserves — no data access or `businessId` scoping touched.
- INV-3: preserves — no client-side cascades added; pickers still emit the chosen key and the page's existing add flow runs.
- INV-4: preserves — no schema or persisted-field change.

## Backend Impact
- Collections affected: none.
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Mandatory for this plan (the MVP merge changed many files). Before S1, on current `main` find and print `ok` or `conflict: <what>` per item: every file in the scope block exists; `typeToFilter`, `allowTypedAdd`, `addNewValue`, `addNewLabelKey`, `addNewChosen`, `variant` inputs on `custom-select.component.ts`; `app-scrollable-dropdown` + `app-add-option-row` still present at each of the six call-sites (re-count: expected 7 shells; if the MVP added or removed one, update the sub-task list via `approved:`); `filterOptionsByLabel`, `addOptionLabel`, `findOptionByLabel`, `resolveAddedKey`, `notifyItemAdded` exports; `RecipeLogisticsPickerService` symbols `searchQuery_`, `dropdownOpen_`, `highlightedIndex_`, `addLabel_`; who uses `app-chip-search-dropdown` (audit says events + product-form; `main` pre-MVP shows only product-form) and `app-custom-multi-select`; plan 450 outputs (`docs/brain/component-families.md`, `reuse-lint`) exist. Also record baseline line counts of both frozen `.ts` files.

## User Stories
- As a chef, I want every search box in the app to respond to the keyboard and to adding new items the same way, so that I never relearn it page by page.
- As a developer, I want one search component to extend, so that a fix to the keyboard or add rule lands everywhere at once.

## Functional Requirements

### Must Have (P0)
- [ ] No behaviour change on any converted page: same options, same order, same labels, same add flow (`AddItemModalService`, `TranslationKeyModalService`, `QuickAddProductModalService`, `AddEquipmentModalService`), same selected value.
- [ ] Shared component implements rules F, X, W, M and K once; pages pass inputs and handle `addNewChosen`.
- [ ] Page-local listbox/shell markup, handlers and highlight state for each converted copy are deleted, not left dead.
- [ ] No 8th copy: nothing new page-local.

### Nice to Have (P1)
- [ ] `docs/brain/component-families.md` search-combobox row updated to name the final base(s).

## UI/UX Notes
- Look and spacing stay as today: reuse each page's existing classes through the shared component's inputs; any `.c-*` stays in `src/styles.scss` (append-only). Logical CSS properties only. RTL checked in the smoke cards.
- No new Hebrew strings; existing `add_new_<thing>` keys keep being used.

## Atomic Sub-tasks
- [x] S0: Run Step 0, print ok/conflict per item, record frozen-file baselines — (read only)
- [x] S1: Extend the shared search component so all seven copies can use it: `optionTemplate` input for rich rows, `typeToFilter` already filtering by label; if more than 3 new flags, build `shared/search-combobox` instead (S1b); specs for rules K, X, F, W — `src/app/shared/custom-select/custom-select.component.ts`, `src/app/shared/custom-select/custom-select.component.html`, `src/app/shared/custom-select/custom-select.component.scss`, `src/app/shared/custom-select/custom-select.component.spec.ts`, `src/app/shared/search-combobox/**`
- [x] S2: Convert the menu-dish-row picker (simplest, no add row) — `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html`, `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.ts`, `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.scss`
- [x] S3: Convert the menu-intelligence event-type picker; delete its handlers (net lines <= 0) — `src/app/pages/menu-intelligence/menu-intelligence.page.html`, `src/app/pages/menu-intelligence/menu-intelligence.page.ts`, `src/app/pages/menu-intelligence/menu-intelligence.page.scss`
- [x] S4: Convert the menu-intelligence section-category picker; delete its handlers (net lines <= 0) — `src/app/pages/menu-intelligence/menu-intelligence.page.html`, `src/app/pages/menu-intelligence/menu-intelligence.page.ts`, `src/app/pages/menu-intelligence/menu-intelligence.page.scss`
- [x] S5: Convert the recipe-book list ingredient filter — `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html`, `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts`, `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss`, `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.spec.ts`
- [x] S6: Convert the recipe-builder ingredient search — `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.html`, `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.ts`, `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.scss`, `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.spec.ts`
- [x] S7: Convert the recipe-builder preparation search — `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.html`, `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.ts`, `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.scss`, `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.spec.ts`
- [x] S8: Convert the recipe-builder logistics tool picker; drop highlight/open state the shared component now owns from the service; frozen page `.ts` net <= 0 — `src/app/pages/recipe-builder/recipe-builder.page.html`, `src/app/pages/recipe-builder/recipe-builder.page.ts`, `src/app/pages/recipe-builder/recipe-builder.page.scss`, `src/app/pages/recipe-builder/services/recipe-logistics-picker.service.ts`, `src/app/pages/recipe-builder/services/recipe-logistics-picker.service.spec.ts`
- [x] S9: Choose the single multi-pick base: gap-list `chip-search-dropdown` vs `custom-multi-select` (CVA); migrate product-form's three chip pickers if no behaviour change, else mark `chip-search-dropdown` `@deprecated`; product-form `.ts` net <= 0 — `src/app/shared/custom-multi-select/custom-multi-select.component.ts`, `src/app/shared/custom-multi-select/custom-multi-select.component.html`, `src/app/shared/custom-multi-select/custom-multi-select.component.scss`, `src/app/shared/custom-multi-select/custom-multi-select.component.spec.ts`, `src/app/shared/chip-search-dropdown/chip-search-dropdown.component.ts`, `src/app/shared/chip-search-dropdown/chip-search-dropdown.component.html`, `src/app/shared/chip-search-dropdown/chip-search-dropdown.component.spec.ts`, `src/app/pages/inventory/components/product-form/product-form.component.html`, `src/app/pages/inventory/components/product-form/product-form.component.ts`
- [x] S10: Final grep proof, registry + breadcrumbs update, `ng build`, tests, validation cards — `docs/brain/component-families.md`, `src/app/shared/breadcrumbs.md`

## Technical Considerations
- Dependencies: `filterOptionsByLabel` (`core/utils/option-filter.util.ts`), `core/utils/add-option.util.ts`, `shared/add-option-row`, `shared/scrollable-dropdown`, `KeyResolutionService` (search by translated label).
- New files needed: only `shared/search-combobox/**` if S1 hits the >3-flag rule.
- Model changes: none. Signals only, trailing underscore on private state, `inject()`, `input()`/`output()`; no `any`; OnPush.
- Server-side searches keep server matching (rule F note): pass `serverSearch` style behaviour via an input, not a second copy.
- Reuse ADR: none needed unless S9 deprecates a shared component — then ADR 0024 or later (check `docs/brain/decisions/` for the next free number).
- Project checks: no log-query; no dictionary changes; `breadcrumbs` skill after the shared folder changes.

## Out of Scope
- The modal/add windows themselves (plan 451), list logic (453), chip styling engine (457), rule sweep (458).
- Any new picker, any visual redesign, any change to what the options are.
- Deleting `chip-search-dropdown` unless S9 proves zero users.

## Critical Questions
1. If S9 finds `chip-search-dropdown` behaviours that `custom-multi-select` lacks (product-form add-and-select, inline add), do you want them added to `custom-multi-select` (recommended) or `chip-search-dropdown` kept as the second base? No invariant is affected.
