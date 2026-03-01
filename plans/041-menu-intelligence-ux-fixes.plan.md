---
name: Menu intelligence UX fixes
overview: "Plan for menu-intelligence: (a) add dictionary entries for default section categories, (b) close category dropdown on click outside via ClickOutSideDirective, (c) hide scrollbar in dropdowns, (d) remove dish-qty (derived portions) from the dish row, (e) restructure each section as a grid (30% data column, 70% centered category + dish names) with aligned data and responsive/mobile behavior."
todos: []
isProject: true
---

# Menu Intelligence UX Fixes

## a. Translations for default section categories

Add one entry per default category in dictionary.json (keys: Amuse-Bouche, Appetizers, Soups, Salads, Main Course, Sides, Desserts, Beverages) with Hebrew labels.

## b. Close category dropdown on click outside

Apply ClickOutSideDirective to .section-search-wrap; on (clickOutside) call closeSectionSearch().

## c. Hide scrollbar in dropdown containers

Add scrollbar-hiding CSS for .event-type-list, .section-dropdown, .dish-dropdown (webkit, Firefox, ms).

## d. Remove derived portions (dish-qty) from the dish row

Remove the entire <span class="dish-qty no-print">...</span> element from menu-intelligence.page.html.

## e. Section grid layout

- .menu-section: grid with columns 30% 1fr; .section-header spans full width, centered.
- Data column (30%): sub-grid with N columns (from activeMenuTypeFields_), one row per dish; data cells align by field.
- Names column (70%): dish names + remove button, centered.
- Responsive: narrow = single column, name then data below; mobile = compact single-column cards.
- Set --data-cols from component for dynamic data grid columns.
