# Session state — plan 401 (dropdown add option, part 2)

Branch: `feat/401-dropdown-add-option-part-2-page-dropdowns-recipe-builder-menu`

## A1 — page dropdowns after 397/398/400 merged

| Dropdown | Before | Now |
| --- | --- | --- |
| Recipe builder → ingredient search | bare `add`; nothing highlighted; wrap; Tab moved focus into the list | `הוסף "<typed>"` / `add_new_ingredient`; rule 5 |
| Recipe builder → preparation search | bare `add` only when 0 matches; no arrows | add option last whenever the name is new; arrows; rule 5 |
| Recipe builder → logistics tool | bare `add` option; nothing highlighted | `הוסף "<typed>"` / `add_new_tool`; rule 5; added tool keeps the quantity |
| Menu → event type | bare `add`; filtered by raw key; list showed raw keys | translated labels; `הוסף "<typed>"` adds directly / `add_new_event_type` opens the modal; rule 5 |
| Menu → section category | two add buttons in the template (typed / generic) | one button through `add-option-row` |

The logistics "הוסף" button next to the quantity counter is the commit-to-baseline action, not a
dropdown add option — the dropdown has one add entry.

## `filterOptionsByStartsWith(` calls (7)

| Call | Filters by | Verdict |
| --- | --- | --- |
| `core/utils/dedupe-select-options.util.ts` | translated label | ok |
| `menu-intelligence.page.ts` event types | was raw key | fixed → translated label |
| `menu-intelligence.page.ts` dish recipes | `nameHebrew` | ok |
| `menu-intelligence.page.ts` section categories | translated label | ok |
| `menu-dish-row.component.ts` recipes | `nameHebrew` | ok |
| `recipe-logistics-picker.service.ts` equipment | `nameHebrew` | ok |
| `preparation-search.component.ts` preparations | `name` (stored as typed Hebrew) | ok |

## Remaining `'add' | translatePipe` in `src/app/pages` (not add options)

List-page toolbar "add" buttons (equipment, recipe book, venues, inventory, suppliers), the
taxonomy manager input placeholder, and the logistics commit button.

## Session Summary

- Ingredient search, preparation search, logistics tool picker and menu event type use the shared add option + `KeyedPickerSearch`; menu section category uses `add-option-row`.
- `MenuPickerSearchService` now builds on `core/utils/keyed-picker-search.util.ts`; the local class is gone.
- New dictionary keys: `add_new_ingredient`, `add_new_preparation`, `add_new_event_type`.
- `ng build` + `ng test` (574) green.

## Next Steps

- Human click-through (see the validation list in chat).
