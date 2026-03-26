Select and Dropdown Components: Full Application Audit

Goal

Unify all select and dropdown experiences so that single-select and multi-select share the same structure, behavior, and visual rules below. Styling (e.g. compact, chip) may vary by context; behavior and layout rules do not.



Unified requirements (expectations)

All select and multi-select custom components must meet the following. The plan and refactor work are aligned to these.

a. Type-to-filter  





Every select and multi-select must allow the user to type to search and see only options that match the search (filter by text).

b. Keyboard navigation and scroll-into-view  





Arrow Up/Down move through options (no tab into the list; focus stays on trigger/input).  



Enter or Space select the highlighted option.  



Escape close the dropdown.  



When the user moves highlight with the keyboard, the scroll container must scroll so the highlighted option stays visible (scroll-into-view). If it does not, the user can move into an “unusable” area where the highlight is off-screen.  



The option under the keyboard focus must have a distinct background (highlight state) so the user sees which value they are on.

c. Multi-select layout and dropdown width  





Multi-select layout: One fixed area for the search input; above it, a container for chips (selected values). So: chips area on top, search input below, then dropdown below the input. Options that support “add new” must include an “add new” option in the list.  



Dropdown width when inside a container: When a select sits inside a larger container (e.g. table cell, scaling chip, row), the dropdown panel must size to the container (e.g. full width of the cell or chip), not only to the width of the trigger. The current bug (dropdown only as wide as the unit switcher part of the chip) must be fixed so the dropdown aligns with the host container.  



Select trigger width: The select trigger should use minimum width that fits its content (e.g. selected label or placeholder), not force full width unless the layout explicitly requires it.

d. Option values in main app color  





Option labels (and selected values / chips where appropriate) should use the main application color (e.g. teal) so “ethnic”/domain values are visually tied to the brand (e.g. highlighted option text, selected chip text).

e. “Add new” separator in dropdown  





When the list includes an “add new option” row, there must be a visible upper border (separator) between the regular options and the “add new” row so it is clearly distinct.



1. Shared Building Blocks

1.1 app-custom-select (src/app/shared/custom-select/)





Role: Single-select only. Implements ControlValueAccessor; used with formControlName or ngModel.



Dropdown container: Uses app-scrollable-dropdown internally for the option list.



Modes:





Button trigger (default): typeToFilter = false. Trigger shows selected label or placeholder; click opens list. Keyboard: Arrow Up/Down/Enter/Space on trigger (no tab needed); Escape closes.



Input trigger: typeToFilter = true. Trigger is an input; typing filters options (starts-with + script-aware). Keyboard: Same arrow/Enter/Escape when open; focus stays on input.



Behavior already correct: When focus is on the trigger (button or input), user can use Arrow Up/Down to move through options and Enter/Space to select without tabbing into the list.



Gap: typeToFilter is opt-in; most usages do not set it, so many single-selects do not support type-to-filter.

1.2 app-scrollable-dropdown (src/app/shared/scrollable-dropdown/)





Role: Presentational only. Wraps content in .c-dropdown with maxHeight, scroll, and scroll indicators. No keyboard handling; no focus management. Parent is responsible for highlight, Arrow Up/Down, Enter, Escape, and aria-activedescendant.



Used in two ways:





Inside custom-select (option list) — keyboard is handled by custom-select.



Standalone — parent implements its own trigger, filter logic, and keydown (or not), leading to inconsistent behavior across the app.



2. Inventory: Where Each Pattern Is Used

2.1 Components using app-custom-select (single-select only)







Location



File



Count



typeToFilter



Purpose





Product form



product-form.component.html



3



No



base_unit, unit_symbol, uom (purchase rows)





Cook view



cook-view.page.html



3



No



yield unit (header), unit per ingredient row (x2)





Venue form



venue-form.component.html



2



No



environment_type_, equipment_id_ (infra rows)





Menu intelligence



menu-intelligence.page.html



1



No



serving_type_





Menu library list



menu-library-list.component.html



3



No



event type filter, serving style filter, sort





Equipment form



equipment-form.component.html



1



No



category/type





Equipment list



equipment-list.component.html



1



No



filter





Add equipment modal



add-equipment-modal.component.html



1



No



category





Unit creator



unit-creator.component.html



1



No



unit





Recipe ingredients table



recipe-ingredients-table.component.html



1



Yes



unit per row





Recipe workflow



recipe-workflow.component.html



2



No



phase, category (or similar)





Quick-add product modal



quick-add-product-modal.component.html



2



Yes



product + unit

Summary: 20 usages total. Only 3 use [typeToFilter]="true" (recipe-ingredients-table x1, quick-add-product-modal x2). All custom-select usages already have arrow key navigation (no tab) when focus is on the trigger.



2.2 Standalone app-scrollable-dropdown (custom trigger + list)

These are not using custom-select; they use an input or button + scrollable-dropdown and implement their own logic. Behavior is inconsistent.







Location



Purpose



Type-to-filter



Arrow keys in list



Notes





Product form



Category (multi, chips)



Yes



Yes



product-form: input + onCategoryDropdownKeydown / onCategoryInputKeydown





Product form



Supplier (multi, chips)



Yes



Yes



onSupplierDropdownKeydown / onSupplierInputKeydown





Product form



Allergen (multi, chips)



Yes



Yes



onAllergenKeydown / onAllergenInputKeydown





Menu intelligence



Event type (single)



Yes



Yes



menu-intelligence.page.html: input + onEventTypeSearchKeydown





Menu intelligence



Section category (single)



Yes



Yes



Section search input + onSectionSearchKeydown





Menu intelligence



Dish search (single)



Yes



Yes



Dish search input + onDishSearchKeydown





Recipe header



Primary unit (chip)



No



Yes



recipe-header.component: button trigger, onPrimaryUnitKeydown (Arrow Up/Down/Enter/Space/Escape)





Recipe header



Secondary unit (chip)



No



No



Button opens dropdown; no keydown on trigger when dropdown is open — arrow keys do not move through options





Recipe header



Labels (multi, chips)



Filter by search in filteredLabelOptions_



No



Click to open; no keydown on list — arrow keys do not move through options





Ingredient search



Product/recipe (single)



Yes



Yes



ingredient-search.component: onSearchKeydown (Arrow Up/Down, Enter, Escape)





Preparation search



Preparation (single)



Yes



No



preparation-search.component: input has no keydown — arrow keys do not move through list





Recipe book list



Ingredient filter (multi, chips)



Yes



No



recipe-book-list.component.html: input has no keydown — arrow keys do not move through list





Recipe builder



Logistics tool (single, then add)



Yes



Yes



recipe-builder.page: input + onLogisticsToolKeydown / scroll into view



2.3 Native <select> (exception)







Location



Purpose





auth-modal.component.html



Dev-only user pick (auth-dev-select). Can remain as-is or be replaced last for consistency.



3. Behavior Gaps (Where to Apply Fixes)

3.1 Type-to-filter





Single-select: Today only 3 custom-select instances use typeToFilter. For a unified experience, decide whether all single-selects should support type-to-filter (then enable by default or per usage in high-option scenarios).



Standalone dropdowns: All listed above already have type-to-filter where an input is used; no gap for “typing to match.”

3.2 Arrow key navigation (focus on container → Up/Down without tab)





Already correct: custom-select (all 20 usages), product-form (category/supplier/allergen), menu-intelligence (event type, section category, dish search), recipe-header primary unit, ingredient-search, recipe-builder logistics.



Missing arrow key navigation when dropdown is open:





Recipe header – secondary unit chip: Dropdown opens on click/Enter/Space, but when open there is no keydown on the trigger (or list) to move highlight with Arrow Up/Down or select with Enter. Fix: Add keydown on the unit-switcher button when activeSecondaryEdit_() === chipIdx (mirror onPrimaryUnitKeydown).



Recipe header – labels dropdown: No keydown when labels list is open. Fix: Add keydown on the labels trigger or the list container (Arrow Up/Down, Enter to select, Escape to close).



Preparation search: Input has no keydown; list is not keyboard-navigable. Fix: Add (keydown) on the search input (Arrow Up/Down, Enter, Escape) and highlight index + scroll-into-view, same pattern as ingredient-search.



Recipe book list – ingredient filter: Input has no keydown; dropdown list is not keyboard-navigable. Fix: Add keydown on the ingredient search input for Arrow Up/Down, Enter to select, Escape to close.

3.3 Dropdown width when inside a container (requirement c)





When a select lives inside a container (e.g. recipe-header scaling chip with counter + unit), the dropdown panel is currently only as wide as the trigger (the unit switcher part), not the full chip/row. That makes the dropdown feel broken and misaligned. The dropdown must be able to size to the container (e.g. full width of the chip or cell), not just the trigger.

3.4 Styling and structure





Custom-select has variants: default (bordered trigger), compact, chip. Styling is centralized in custom-select.component.scss; global engine in styles.scss (e.g. .c-select, .c-dropdown).



Standalone dropdowns use different class names and local SCSS (e.g. .dropdown-item, .menu-item, .labels-dropdown-item, .logistics-tool-option), so visual style is not unified. Unification would mean either:





Standardizing on custom-select (or a new “searchable single/multi select” wrapper) where possible and using a single set of engine classes for list options, or



Defining a single “dropdown option” engine class and reusing it in all standalone dropdowns so look-and-feel matches.



"Add new" separator (requirement e): Today the separator above "add new" in dropdowns is very subtle or missing; a clear upper border is required.



4. Component Map (Visual)

flowchart TB
  subgraph shared [Shared]
    CS[app-custom-select]
    SD[app-scrollable-dropdown]
    CS --> SD
  end

  subgraph single_select [Single-select usage]
    CS
    PF_units[product-form: base_unit, unit_symbol, uom]
    CV[cook-view: yield + row units]
    VF[venue-form: env + equipment]
    MI_serving[menu-intelligence: serving_type]
    ML[menu-library: event, serving, sort]
    EF[equipment-form/list/modal]
    UC[unit-creator]
    RIT[recipe-ingredients-table: unit]
    RW[recipe-workflow: 2]
    QAP[quick-add-product: 2]
  end

  subgraph standalone [Standalone scrollable-dropdown]
    SD
    PF_multi[product-form: category, supplier, allergen]
    MI_custom[menu-intelligence: event type, section, dish]
    RH_units[recipe-header: primary + secondary unit]
    RH_labels[recipe-header: labels]
    IS[ingredient-search]
    PS[preparation-search]
    RBL[recipe-book-list: ingredient filter]
    RB_log[recipe-builder: logistics tool]
  end

  CS --> PF_units
  CS --> CV
  CS --> VF
  CS --> MI_serving
  CS --> ML
  CS --> EF
  CS --> UC
  CS --> RIT
  CS --> RW
  CS --> QAP

  SD --> PF_multi
  SD --> MI_custom
  SD --> RH_units
  SD --> RH_labels
  SD --> IS
  SD --> PS
  SD --> RBL
  SD --> RB_log



5. Recommendations (Unified Process)

Aligned with the unified requirements (a–e) above.





Type-to-filter (a)





All single-select and multi-select must support type-to-filter. Enable it by default in shared components (e.g. typeToFilter: true or always-on input mode). Migrate every usage so typing filters options; no exceptions for “simple” selects.



Keyboard and scroll-into-view (b)





Arrow Up/Down on trigger/input move highlight; Enter/Space select; Escape close. No tab into the list.  



Scroll-into-view: On every Arrow Up/Down, call scroll-into-view (or equivalent) on the highlighted option so the list scrolls and the highlight never goes off-screen. Centralize this in shared components (custom-select, any shared multi-select).  



Highlight state: Use a single engine class (e.g. .c-dropdown__option--highlighted or .highlighted) and the main app color for the highlighted option background so the “current” value is always visible.  



Fix the four current gaps: recipe-header secondary unit, recipe-header labels, preparation-search, recipe-book-list ingredient filter.



Multi-select layout and dropdown width (c)





Multi-select: One shared app-custom-multiselect (or equivalent) with: chips container above the search input, search input below chips, dropdown below. Include “add new” option in the list where applicable.  



Dropdown width in context: When the select is used inside a container (e.g. recipe-header scaling chip, table cell), the dropdown panel must take its width from the container (e.g. width: 100% of the host or a configurable dropdownWidthAnchor), not from the trigger. Implement via a shared API (e.g. input dropdownWidth: 'trigger' | 'container' or anchor selector) and use it in recipe-header unit dropdowns and any other in-container selects.  



Trigger width: Select trigger uses min-width: fit-content (or equivalent) so it is only as wide as the label/placeholder; full width only when explicitly required by layout.



Option values in main color (d)





Use the application’s main color (e.g. teal) for: highlighted option text/background, selected chip text (and optionally borders). Define in one place (e.g. CSS variable or design token) and apply in custom-select, scrollable-dropdown option styling, and any shared multi-select.



“Add new” separator (e)





In shared dropdown templates, add a visible upper border (e.g. border-top or a divider element) on the “add new” row so it is clearly separated from the rest of the options. Apply in custom-select (add-new option) and in any shared multi-select that has “add new.”



Single-select implementation





Use app-custom-select everywhere for single value from list; ensure it meets (a)–(e). Migrate standalone “input + scrollable-dropdown” single-selects (menu-intelligence event/section/dish, recipe-builder logistics) to custom-select or a single searchable-select wrapper. No one-off implementations.



Auth modal





Native <select> for dev user pick can stay as-is or be replaced with custom-select last; low priority.



6. Files to Touch (When Implementing)





Keyboard + scroll-into-view (requirement b):





recipe-header.component.ts (secondary unit keydown when open; labels keydown; ensure scroll-into-view on arrow keys).



recipe-header.component.html (bind keydown for secondary unit when open; labels).



preparation-search.component.ts (add highlight index + keydown handler + scroll-into-view).



preparation-search.component.html (keydown on input; highlighted class on option).



recipe-book-list.component.ts (add highlight index + keydown for ingredient dropdown + scroll-into-view).



recipe-book-list.component.html (keydown on ingredient input; highlighted class).



custom-select.component.ts: Verify scroll-into-view on Arrow Up/Down so highlight never goes off-screen; add if missing.



Dropdown width from container (requirement c):





custom-select.component.ts and custom-select.component.scss: Add support for dropdown width anchored to container (e.g. input or host wrapper) when select is inside a chip/cell.



recipe-header.component (unit dropdowns): Use container-width dropdown so panel matches chip/row width, not only the unit switcher (fixes the broken width shown in the screenshot).



Trigger min-width (requirement c):





custom-select.component.scss: Ensure trigger uses minimum width that fits content (e.g. min-width: fit-content or equivalent).



Multi-select layout (requirement c):





New or extended app-custom-multiselect: Chips container above, search input below, dropdown below; “add new” in list. Replace product-form category/supplier/allergen and recipe-book-list ingredient filter with this component.



Option values in main color (requirement d):





styles.scss or design tokens: Define main app color for option highlight and selected chips.



custom-select.component.scss and shared dropdown option styles: Use that color for highlighted option and selected display.



“Add new” upper border (requirement e):





custom-select.component.html / custom-select.component.scss: Add visible upper border (or divider) above the add-new option row.



Any shared multi-select template: Same separator above “add new” row.



Type-to-filter for all (requirement a):





Enable type-to-filter by default in custom-select (or set typeToFilter: true everywhere single-select is used). Migrate remaining standalone dropdowns to shared components that support typing to search.

This audit and the unified requirements (a–e) give a complete map of where each dropdown/select lives and what to change so the app has one consistent structure, behavior, and look for single-select and multi-select.