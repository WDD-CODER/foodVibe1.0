# Menu Intelligence Page — Keyboard Focus Implementation Plan

Implements [KEYBOARD-FOCUS-REPORT.md](src/app/pages/menu-intelligence/KEYBOARD-FOCUS-REPORT.md): skip guest +/- in tab order, Space for event type and section title, Space to select in event type dropdown, Tab/Shift+Tab in section search, dish search, and sell price.

## 1. HTML (menu-intelligence.page.html)

- Guest count: add `tabindex="-1"` to both `.counter-pill-btn` (minus and plus).
- Section title: add `(keydown.space)="$event.preventDefault(); openSectionSearch(sectionIndex)"` and `[id]="'section-title-' + sectionIndex"`.
- Sell price input: add `[id]="'dish-sell-' + sectionIndex + '-' + itemIndex"`.
- Add-dish button: add `[id]="'add-dish-' + sectionIndex"`.
- Dish name button: add `[id]="'dish-name-' + sectionIndex + '-' + itemIndex"`.

## 2. TypeScript (menu-intelligence.page.ts)

- **onMetaKeydown:** when `field === 'event_type_'` and `e.key === ' '`, preventDefault and `openEventTypeDropdown()`.
- **onEventTypeSearchKeydown:** add `e.key === ' '` branch with same logic as Enter (select/add new, close, focus serving_type_).
- **onSectionSearchKeydown:** handle `e.key === 'Tab'`: preventDefault/stopPropagation, closeSectionSearch(); Shift+Tab → focus `section-title-{sectionIndex}`; Tab → focus `dish-search-{sectionIndex}-0` or `add-dish-{sectionIndex}` (setTimeout 0).
- **onDishSearchKeydown:** handle Tab: preventDefault/stopPropagation; Tab → if row has recipe focus `dish-sell-{s}-{i}`, else focus `dish-search-{s}-{i+1}` or `add-dish-{s}`; Shift+Tab → focus `dish-search-{s}-{i-1}` or `section-title-{s}` (setTimeout 0).
- **onSellPriceKeydown:** handle `e.key === 'Tab'`: preventDefault; Tab → focus `dish-search-{s}-{i+1}` or `dish-sell-{s}-{i+1}` or `add-dish-{s}`; Shift+Tab → focus `dish-name-{s}-{i}` (setTimeout 0).

## 3. Optional

- In .assistant/skills/commit-to-github/SKILL.md add "Menu intelligence tab order (canonical)" subsection with the 13-step list.

## Files

- src/app/pages/menu-intelligence/menu-intelligence.page.html
- src/app/pages/menu-intelligence/menu-intelligence.page.ts
- .assistant/skills/commit-to-github/SKILL.md (optional)
