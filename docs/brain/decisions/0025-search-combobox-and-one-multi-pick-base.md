---
status: accepted
date: 2026-10-21
review-by: 2027-04-21
---

# 0025. One search box (`app-search-combobox`) for typed results; `custom-multi-select` is the chip base, `chip-search-dropdown` is deprecated

## Context

Plan 452 (reuse audit P3). Six templates each hand-built `input + app-scrollable-dropdown + <ul role="listbox"> +
app-add-option-row`, and each copy re-implemented rule K (keyboard), rule X (exact name hides the add row), rule F
(contains, prefix first) and the add label. Two shared bases also exist for multi-pick with chips.

## Decision

- **Search box.** The decision ladder (ADR 0024) asked whether `app-custom-select` (`typeToFilter`, `allowTypedAdd`) can
  carry the seven copies. It cannot without more than three new flags: the copies need a page-owned query (server
  search), a list that only shows after N typed characters, a result cap, grouped and rich rows (type pill, category
  pill), a growing textarea, a "no results" line, Tab hand-off to the next field, an inline panel layout, and a
  controlled open state. So plan 452 built the sibling `src/app/shared/search-combobox/` (`app-search-combobox`)
  on the same helpers (`KeyedPickerSearch`, `filterOptionsByLabel`, `addOptionLabel`, `findOptionByLabel`,
  `app-add-option-row`). `custom-select` stays for "pick one value of a short fixed list".
- **Multi-pick.** `custom-multi-select` is the base for new code. `chip-search-dropdown` is **not** migrated by plan 452
  because the product form's three pickers (category, supplier, allergens) rely on behaviours `custom-multi-select`
  lacks, so a move would change behaviour: chips and the search field in one inline box (typing without opening a
  popup), plain string options with a `displayFn`, a generic add row with an empty search (`showAddNewAlways`), the
  "all selected" line (`noOptionsLabel`), a caller filter (`searchFilterFn`, supplier by name) and add/remove outputs
  instead of a form control. It is marked `@deprecated` in its docblock and in `docs/brain/component-families.md`.
  Moving the product form is a later, separate plan that first adds those behaviours to `custom-multi-select`.

## Consequences

- Easier: a fix to the search keyboard or the add rule lands in one place; pages pass inputs and handle `(picked)` /
  `(addChosen)`.
- Harder: `app-search-combobox` has many inputs; new variants go to a sibling again, not another `@if`.
- Accepted: two multi-pick bases remain until the product-form plan.

## Review

Check that no page-local `input + app-scrollable-dropdown` shell was added (`reuse-lint` rule `page-local-combobox`), and
whether the product-form move to `custom-multi-select` has been planned.
