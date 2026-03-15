---
name: Type-to-filter all dropdowns
overview: Add type-to-filter behavior (type in container, see matches in dropdown, "starts with" + Hebrew/Latin) to all dropdown/select surfaces: enhance the shared CustomSelectComponent, replace native selects, and align existing type-in dropdowns to the same filtering rules.
---

# Type-to-filter behavior for all dropdowns app-wide

## Goal

Every place the user can select from a dropdown should support type-to-filter: user focuses or clicks the control, types in the same container, and sees only options that start with the typed text (Hebrew vs Latin by script). No separate "filter" section; single input/container. For single-select (no chips), same behavior but without chips.

## Phases

| Phase | What | Where |
|-------|------|--------|
| 1 | Type-to-filter in CustomSelectComponent (input trigger, filter by "starts with" + script) | custom-select |
| 2 | Replace native selects with app-custom-select | quick-add-product-modal |
| 3 | Align existing type-in dropdowns to "starts with" + script | recipe-builder (logistics), ingredient-search, preparation-search, recipe-book-list, menu-intelligence |
| 4 | (Optional) Type-in when open for recipe-header unit/labels dropdowns | recipe-header |

## Phase 1: CustomSelectComponent

- Add `typeToFilter = input<boolean>(true)`.
- When true: input trigger (not button), searchQuery_ signal, filteredOptions_ computed with "starts with" + Hebrew/Latin; open on focus/click; keyboard ArrowDown/Up, Enter, Escape.
- Inject TranslationService for label filtering when translateLabels().
- When false: keep current button trigger.

## Phase 2: quick-add-product-modal

- Replace category and base unit `<select>` with `<app-custom-select>`; wire options and valueChange/ngModel.

## Phase 3: Align filtering

- recipe-builder logisticsSearchOptions_: "starts with" + Hebrew/Latin on name_hebrew.
- ingredient-search, preparation-search, recipe-book-list ingredient filter, menu-intelligence section/dish: audit and align to "starts with" + script.
- Optional: shared filter helper (e.g. filterOptionsByStartsWith) for reuse.

---

**Done (Phases 1–3):** CustomSelect type-to-filter, quick-add modal uses app-custom-select for base unit and category, shared `filterOptionsByStartsWith` in `src/app/core/utils/filter-starts-with.util.ts`. Recipe-builder logistics, ingredient-search, preparation-search, recipe-book-list ingredient filter, menu-intelligence event types / section categories / dish search all use "starts with" + script.
