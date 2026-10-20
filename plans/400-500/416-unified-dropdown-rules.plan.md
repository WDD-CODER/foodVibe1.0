# Plan 416 — Unified dropdown rules: exact match, add window always, saved message, keyboard everywhere

Status: done
Track: code — here (not design)
Snapshot: 4816d408a371818a98ec18521c895f8a1125aa91

## Problem Statement

The Human's validation of plans 400–402 (2026-10-20) found that dropdowns still behave differently from each other:

1. Adding something from a dropdown shows no confirmation. The user never knows it was saved.
2. Typing filters by "starts with" only, so similar existing items (e.g. "סיר 20 ליטר" when typing "20 ליטר") are not shown. The user can't see that the item already exists.
3. Recipe builder, new recipe: changing labels (and most other fields) does not count as an unsaved change, so leaving the page asks nothing. Cause: `hasRealChanges()` short-circuits for new recipes (`recipe-builder.page.ts` ~608-613) and checks only the name and linked ingredients. Free-text ingredient names are missing from the snapshot for all recipes.
4. Allergens: arrowing to `הוסף "ב"` and pressing Enter added a chip "ב" with no window. Cause: `onAddNewAllergen` skips the window when `resolveAllergen` finds any dictionary entry with that Hebrew value. Several other places also add a typed name directly with no window: menu event type, menu section category, preparation search, equipment-list category, add-equipment-modal category, quick-add-product category.
5. Typing an exact existing name still shows an add row (the generic `הוסף קטגוריה חדשה` when `showAddNewAlways` is on, and in `custom-select`, which always shows its add option).
6. Same as 4, for menu event type.
7. Keyboard: menu "סוג הגשה" (serving type) has arrows hijacked by the page's `onMetaKeydown` focus-move. Recipe-book ingredient filter search has no keyboard support. The Human wants one keyboard rule in every dropdown.

## Goals & Success Criteria

- Primary: every dropdown in the app follows one rule: filter by "contains" with prefix matches first, no add row on an exact name, every add opens a window prefilled with the typed name, a saved message after the window saves, and the same keyboard handling everywhere. The rule is written into the standard.
- Success:
  - [auto] `ng build` passes.
  - [auto] `ng test` passes, including new specs:
    - the option filter util: contains, prefix-first order, trim, case-insensitive;
    - `addOptionLabel`/new `showAddOption`: exact match → no add option, even with "always show";
    - each shared select: exact match hides the add row;
    - `hasRealChanges()` on a new recipe: true for a label-only, a course-only and a rating-only change, false for a blank new recipe.
  - [auto] `rg -n "resolveAllergen" src/app/pages/inventory/components/product-form/product-form.component.ts` prints nothing.
  - [auto] `rg -n "addPreparationDirectly|addNewSectionCategory\(" src/app/pages` prints only the call sites behind a window, not a direct typed add (worker pastes the output with a one-line note per hit).
  - [human] Exact name: typing an existing name exactly (e.g. "בשר" in product category) shows only that item and no add row, in each dropdown that has add.
  - [human] Similar names: typing part of a name shows every existing item that contains it, with the ones that start with it first.
  - [human] Add always opens a window: in allergens, product category, labels, equipment category, preparation category, quick-add product category, menu event type, menu section category, preparation search, logistics tool and ingredient search, Enter or a click on `הוסף "<typed>"` opens the add window with the name filled in. Nothing is added without the window.
  - [human] After saving in the add window, a message `"<name>" נוסף` appears, and the new item is selected. Cancel shows no message and selects nothing.
  - [human] Keyboard in every dropdown (list in A7): arrows move through the options while the cursor stays in the box, no wrap, Enter picks, Esc closes, Tab/Shift+Tab move fields. This includes menu "סוג הגשה" and the recipe-book ingredient filter.
  - [human] New recipe: change only the labels, then leave the page → the "save changes?" question appears. The same for dish type, portions, rating, a workflow step and a logistics tool.
  - [human] The Human reads the updated "Add-option rule (dropdowns)" section and confirms it says all of the above.

## Execution Mode

- Parallel: no (touches the same files as 400/401)
- Concurrent plans: none
- Isolated DB: no
- Saved by the Worker in wt-3 on its own branch (the Human asked for the fixes in the same session). `.claude/todo.md` is synced by the todo-sync Action after the merge.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/add-option.util.ts
src/app/core/utils/add-option.util.spec.ts
src/app/core/utils/option-filter.util.ts
src/app/core/utils/option-filter.util.spec.ts
src/app/core/utils/filter-starts-with.util.ts
src/app/core/utils/dedupe-select-options.util.ts
src/app/core/utils/dedupe-select-options.util.spec.ts
src/app/core/utils/keyed-picker-search.util.ts
src/app/core/utils/keyed-picker-search.util.spec.ts
src/app/core/services/add-item-modal.service.ts
src/app/shared/add-item-modal/**
src/app/shared/add-option-row/**
src/app/shared/custom-select/**
src/app/shared/custom-multi-select/**
src/app/shared/chip-search-dropdown/**
src/app/shared/add-equipment-modal/**
src/app/shared/quick-add-product-modal/**
src/app/shared/label-creation-modal/**
src/app/pages/inventory/components/product-form/**
src/app/pages/equipment/components/equipment-list/**
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/pages/recipe-builder/recipe-builder.page.spec.ts
src/app/pages/recipe-builder/components/recipe-header/**
src/app/pages/recipe-builder/components/recipe-workflow/**
src/app/pages/recipe-builder/components/ingredient-search/**
src/app/pages/recipe-builder/components/preparation-search/**
src/app/pages/recipe-builder/services/recipe-logistics-picker.service.ts
src/app/pages/recipe-builder/services/recipe-logistics-picker.service.spec.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.spec.ts
src/app/pages/menu-intelligence/components/menu-dish-row/**
src/app/pages/menu-intelligence/services/**
src/app/pages/recipe-book/components/recipe-book-list/**
docs/agent/standards-domain.md
docs/brain/patterns/dropdown-add-option.md
```

## Read Scope

Entire repo.

## Escalation Protocol

If a file outside the scope is needed: STOP, tell the Human the file, the change and why; wait for `approved: <path>`; append it to the scope block; retry.

## Architecture Impact

- INV-5: preserves — new terms are still registered through the existing registry/`TaxonomyStore` paths and windows; this only changes when the window opens and what is filtered.
- INV-6: preserves — no AI call is added or moved; file names only match the `*ai*` glob.
- INV-none: preserves — client-side UI behavior; no write routes, schemas or AI calls change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Print one line per commit: `ok` or `conflict: <what>`.

## User Stories

- As a chef, when I type in any dropdown I see every existing item that looks like what I typed, so I don't create a duplicate by accident.
- As a chef, when I add something new, a window always opens so I can confirm it, and a message tells me it was saved.
- As a chef, a new recipe warns me before I leave without saving, whatever I changed.
- As a chef, every dropdown works the same with the keyboard.

## Functional Requirements

1. **Filter (rule F):** typing filters options whose on-screen label *contains* the trimmed text, case-insensitive; options that start with it come first, then the rest in their original order. One util (`core/utils/option-filter.util.ts`) used by the three shared selects and every hand-rolled picker that filters locally (event type, section category, dish search, preparation search, logistics tool). Server searches (ingredient search, recipe-book filter) keep their server matching.
2. **Exact match (rule X):** when the trimmed typed text equals an option's on-screen label (case-insensitive), there is no add row at all — `showAddNewAlways` applies only with an empty search. Spaces inside the text count (an extra space = a new name); spaces at the start/end are ignored. Applies to every dropdown with an add option.
3. **Add opens a window (rule W):** choosing the add option (Enter or click), typed or generic, always opens that item's add window, prefilled with the typed name where the window takes a name. No dropdown adds a typed name directly. Changes:
   - product-form allergens: drop the `resolveAllergen` shortcut; always open the translation-key window.
   - menu event type and menu section category: open the add-item window prefilled (add an optional `initialValue` to `AddItemConfig` and the add-item modal component).
   - preparation search: the add option opens the add-item window (prefilled name) instead of `addPreparationDirectly()`.
   - equipment-list category, add-equipment-modal category, quick-add-product category: a typed name opens the window prefilled instead of skipping it.
   - Units and suppliers already open their windows (no prefill, known limit — out of scope).
4. **Saved message (rule M):** after an add window saves and the item is stored, show `userMsgService.onSetSuccessMsg` with the new dictionary key `item_added_msg` = `"{name}" נוסף` (name = the Hebrew label). One helper so every add path calls the same thing. Cancel → no message.
5. **Keyboard (rule K):** every dropdown uses `KeyedPickerSearch` (or the shared selects that wrap it): first option highlighted on open, ↑/↓ stop at the ends, highlight scrolls into view, focus stays in the input, Enter picks (on the add row: opens the window), Esc closes, Tab/Shift+Tab move to the next/previous field. Fixes:
   - menu `servingType` (custom-select button mode): while its list is open, the page's `onMetaKeydown` must not move focus on ↑/↓/Enter (custom-select stops propagation when open, or the page checks).
   - recipe-book-list ingredient filter search: add keyboard handling.
   - chip-search-dropdown: Enter on an option closes and clears like a click; after `emitAddNew` the list closes.
6. **Recipe dirty (rule D):** remove the new-recipe short-circuit in `hasRealChanges()` so new and existing recipes both compare against the snapshot; add free-text ingredient `nameHebrew` to the snapshot. An AI draft applied to a new recipe counts as unsaved: capture the baseline before the draft is applied.
7. **Standard:** extend "Add-option rule (dropdowns)" in `docs/agent/standards-domain.md` and `docs/brain/patterns/dropdown-add-option.md` with rules F, X, W, M, K.

## UI/UX Notes

- Message text: `"<name>" נוסף` (success style, 2s).
- No visual change to rows; only which rows show and what Enter does.

## Atomic Sub-tasks

- [x] A1: Show every option containing the typed text, with exact-start matches first — option-filter util + spec; use it in the three shared selects — src/app/core/utils/option-filter.util.ts, shared/custom-select, custom-multi-select, chip-search-dropdown, dedupe-select-options.util.ts
- [x] A2: Hide the add row when the typed text exactly matches an existing item — add-option.util + shared selects (showAddNewAlways only when empty) + specs — src/app/core/utils/add-option.util.ts, shared selects
- [x] A3: Make every add open its window with the typed name filled in — AddItemConfig.initialValue + modal; allergens, event type, section category, preparation search, equipment/quick-add/add-equipment category — see FR 3
- [x] A4: Tell the user an added item was saved — item_added_msg key + one helper called on every add path after save — add-option.util.ts, dictionary.json, callers
- [x] A5: Give the hand-rolled pickers the same filter and exact-match rule — event type, section category, dish search, preparation search, logistics tool — menu-intelligence, preparation-search, recipe-logistics-picker.service.ts
- [x] A6: Make a new recipe warn before leaving whatever was changed — hasRealChanges short-circuit removed, ingredient name in snapshot, AI-draft baseline, specs — recipe-builder.page.ts, recipe-builder.page.spec.ts
- [x] A7: Make the keyboard work the same in every dropdown — serving type arrow conflict, recipe-book ingredient filter, chip dropdown Enter/close — menu-intelligence, custom-select, recipe-book-list, chip-search-dropdown
- [x] A8: Write the unified dropdown rules into the standard — rules F, X, W, M, K — docs/agent/standards-domain.md, docs/brain/patterns/dropdown-add-option.md
- [x] A9: Build, test, start the app and hand you the click list — ng build + ng test green, rg checks, slot-serve running, validation cards

## Technical Considerations

- `custom-select` puts the add sentinel in `options`; rule X must drop it from `filteredOptions_` on an exact match.
- `onAddNewAllergen` is also reached with an exact-existing allergen only through the generic row; with rule X that row is hidden when typed text matches.
- Keep `filter-starts-with.util.ts` exported for any other caller; switch callers to the new util.

## Out of Scope

- Prefilled names for the unit creator and the supplier add flow (needs `core/services` changes; separate plan if wanted).
- The "Servers first" validation hook (kit plan, separate).

## Critical Questions

None open — the Human confirmed A–D and items 2–3 on 2026-10-20.
