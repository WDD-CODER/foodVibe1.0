# Plan 364 — Search fields, part 2: clear (X) in dropdown pickers and no browser suggestions on picker and name fields

Status: done
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Part 1 (plan 363) added `app-input-clear` (`src/app/shared/input-clear/`) to the 8 main search bars. Two gaps remain:

**The 7 search fields inside dropdown pickers have no clear button:**

| # | File | Bound to |
| --- | --- | --- |
| 1 | `pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html` ~L365-372 (ingredient filter, `.ingredient-search-input-wrap`) | `ingredientSearchQuery_` |
| 2 | `pages/recipe-builder/recipe-builder.page.html` ~L289-298 (`.logistics-tool-search-wrap`) | `logisticsToolSearchQuery_` |
| 3 | `shared/chip-search-dropdown/chip-search-dropdown.component.html` L13-19 (`.csd-input`, used for allergens and categories in product-form) | `searchQuery_` |
| 4 | `shared/custom-multi-select/custom-multi-select.component.html` ~L88-96 | `searchQuery_` |
| 5 | `shared/custom-select/custom-select.component.html` ~L8 (type-to-filter input) | filter query |
| 6 | `pages/menu-intelligence/menu-intelligence.page.html` ~L158-165 (event type) and ~L280-287 (section category) | `eventTypeSearch_` / `getSectionSearchQuery(i)` |
| 7 | `pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html` L49-58 | `dishSearchQuery()` input + `clearSearch` output (.ts L62) |

**Browser suggestions cover the fields.** On mobile, Chrome's autocomplete suggestions cover the allergens field in the product form (`.csd-input` has no `autocomplete`, `name` or `id`) and many other picker and name fields. Also, `csd-option-' + i` ids repeat when two chip dropdowns are on one page.

## Goals & Success Criteria

- Primary: all 7 picker searches show the animated X only when they have text, and clearing keeps the dropdown open with the full option list.
- Primary: no browser suggestion strip on picker, search, name or key fields anywhere. Contact, phone and address fields stay autofill-enabled.
- Success: the product-form allergen field can be typed into on Android without anything covering it.

## Execution Mode

- Parallel: no. Run after plan 363 (Search fields part 1), plan 343 (menu-intelligence) and plan 348 (recipe-builder).
- Concurrent plans: none touching the files above
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/chip-search-dropdown/**
src/app/shared/custom-multi-select/**
src/app/shared/custom-select/**
src/app/shared/ai-product-modal/ai-product-modal.component.html
src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.html
src/app/shared/translation-key-modal/translation-key-modal.component.html
src/app/shared/label-creation-modal/label-creation-modal.component.html
src/app/shared/unit-creator/unit-creator.component.html
src/app/shared/add-item-modal/add-item-modal.component.html
src/app/shared/add-equipment-modal/add-equipment-modal.component.html
src/app/shared/quick-add-product-modal/quick-add-product-modal.component.html
src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component.html
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html
src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/components/menu-dish-row/**
src/app/pages/metadata-manager/**
src/app/pages/inventory/components/product-form/product-form.component.html
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As a chef picking allergens or categories on my phone, I want to type without browser suggestions in the way, and to clear my filter text with one tap.

## Functional Requirements

### Must Have (P0)
- [x] Add `app-input-clear` to the 7 picker searches. Clearing sets the query to `''`, keeps the dropdown open with the full list, resets the highlighted index, and refocuses the input. menu-dish-row: emit its existing `clearSearch` output (today it only fires on click-outside).
- [x] Add `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"` to:
  - the 7 picker inputs
  - ai-product-modal category and allergen chip inputs (~L219, ~L245)
  - recipe-workflow timer fields (~L82, ~L125)
  - metadata-manager add/rename inputs (page ~L150, ~L226; section and preparation category managers ~L9, ~L32)
  - name and key fields: product-form `productName` (~L26), recipe-header `nameHebrew` (~L31), translation-key-modal (~L9, ~L21), label-creation-modal (~L14, ~L23), unit-creator (~L9), add-item-modal (~L10), add-equipment-modal (~L9), quick-add-product-modal (~L25), quick-edit-product-panel (~L9), ai-draft-editor (~L5, ~L65, ~L151)
- [x] Do not add it to venue or supplier contact, phone and address fields (legitimate autofill).
- [x] chip-search-dropdown: unique option ids per instance (prefix with a per-instance id), so two dropdowns on one page don't collide.

### Should Have (P1)
- [x] If Android Chrome still shows suggestions on `.csd-input`, switch that input to `autocomplete="new-off"` plus `name="csd-<instanceId>"`. (not needed: Android check showed no suggestions)

### Nice to Have (P2)
- None.

## UI/UX Notes

- Same X component, animation and `clear_search` key as part 1.
- Inside dropdown pickers, the X sits at the inline-end of the search input, not over the options list.

## Atomic Sub-tasks

- [x] A1: chip-search-dropdown, custom-select, custom-multi-select: X, autocomplete, unique ids, specs.
- [x] A2: Recipe-book ingredient filter and recipe-builder logistics search: X + autocomplete.
- [x] A3: Menu-intelligence event type, section category and dish-row search: X + autocomplete.
- [x] A4: Autocomplete sweep on the listed modal, form and metadata fields.
- [x] A5: Build, specs, Android check. Update session-state.

## Technical Considerations

- Dependencies: `InputClearComponent` (plan 363), the shared pickers (used app-wide, so check that product-form, recipe-builder and menu-intelligence still behave).
- New files: none.
- Model changes: none.

## Out of Scope

- The 8 main search bars (plan 363).
- Contact and address autofill fields.

## Critical Questions

- In pickers, after clearing:
  a) Keep the dropdown open with the full list (default)
  b) Close the dropdown

## Success Criteria

- [auto] `rg -n "app-input-clear" src/app --glob '*.html'` → at least 15 matches (8 from part 1 + 7 here).
- [auto] `npx ng test --watch=false --include=src/app/shared/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Android: product form → אלרגנים → type "גלו" → no browser suggestions over the field; our list shows גלוטן → X → text cleared, list still open with all allergens.
- [human] Menu builder → סוג אירוע → type → X clears. Dish search → X clears.
