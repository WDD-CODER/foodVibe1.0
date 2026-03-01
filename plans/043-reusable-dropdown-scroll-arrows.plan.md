---
name: Reusable dropdown with scroll arrows
overview: Introduce a global dropdown engine (`.c-dropdown`) with hidden scrollbar and hover-only top/bottom scroll-indicator arrows, a directive to drive arrow visibility from scroll position, and a wrapper component so all app dropdowns can reuse the same styling and behavior. Migrate all 12 dropdown locations at once.
todos: []
isProject: true
---

# Reusable dropdown styling and scroll indicators

## Goal

- Reuse the current preparation-search dropdown look (glass, border, shadow, max-height, overflow) **across the application**.
- **Hide the default scrollbar** on the dropdown list.
- On **hover** over the dropdown, show **top/bottom arrow icons** that indicate more content above/below; the **top arrow** hides when the user is at the top, the **bottom arrow** hides when at the bottom (arrows appear/disappear as scroll position changes).

## Approach

- Add a **global engine** in `src/styles.scss` for the dropdown (wrapper + scrollable list + scroll indicators).
- Add a **directive** that toggles `can-scroll-up` / `can-scroll-down` on the scrollable element based on `scrollTop` and `scrollHeight`.
- Provide a **wrapper component** so consumers can drop in one tag and get the full behavior without duplicating markup.
- Migrate **all 12 dropdown locations** in one implementation (see section C for the full list).

---

## 1. Global engine in `src/styles.scss`

Add a new block **after** the existing `.c-modal-card` engine (to keep engines grouped):

- **`.c-dropdown`** — Wrapper: `position: absolute`, `top: calc(100% + 0.25rem)`, `inset-inline: 0`, `z-index: 10`, so it works when placed inside a relative container (e.g. search-container). Use existing tokens: `--bg-glass-strong`, `--border-glass`, `--radius-md`, `--shadow-card`, `--blur-glass`. No `max-height` on the wrapper (handled on the list).

- **`.c-dropdown__list`** — The scrollable area: same visual style as preparation-search `.results-dropdown` (padding, list-style, etc.) plus `max-height: 240px` (or token `--dropdown-list-max-height`), `overflow-y: auto`, and **hidden scrollbar**: `scrollbar-width: none`, `-ms-overflow-style: none`, `&::-webkit-scrollbar { display: none }`.

- **`.c-dropdown__scroll-top`** and **`.c-dropdown__scroll-bottom`** — Absolutely positioned at top/bottom of `.c-dropdown`, centered horizontally, with a small gradient or background so the icon is readable. Chevron-up / chevron-down. Default `opacity: 0`; on `.c-dropdown:hover` show top arrow only when list has `.can-scroll-up`, bottom arrow only when `.can-scroll-down` (sibling selector: list first, then top, then bottom). Short transition for opacity; `pointer-events: none` on arrows.

Follow the **cssLayer** skill: five-group vertical rhythm, logical properties, tokens from `:root`.

---

## 2. Directive `scrollIndicators`

- **Path**: `src/app/core/directives/scroll-indicators.directive.ts` (new file).
- **Selector**: `[scrollIndicators]` on the scrollable element.
- **Behavior**: Host = scrollable element. On `scroll`, `resize`, and after view init, compute `canScrollUp = scrollTop > 0`, `canScrollDown = scrollTop + clientHeight < scrollHeight` (1px threshold optional). Add/remove classes `can-scroll-up` and `can-scroll-down` on the host.
- **Standalone**: yes, like click-out-side directive.

---

## 3. Wrapper component

- **Path**: `src/app/shared/scrollable-dropdown/scrollable-dropdown.component.ts` (and .html, .scss).
- **Template**: Root `div.c-dropdown`; child 1 `div.c-dropdown__list` with `scrollIndicators` and `[style.max-height.px]="maxHeight"` and `ng-content`; child 2 `div.c-dropdown__scroll-top` with chevron-up icon; child 3 `div.c-dropdown__scroll-bottom` with chevron-down icon.
- **Input**: `maxHeight: number` (default 240).
- **Usage**: Wrap list content; inner list keeps item classes. Component SCSS only host/layout if needed; visuals stay in global engine.

---

## 4. DOM order and CSS selectors

Required DOM order: (1) `.c-dropdown__list` with `scrollIndicators`, (2) `.c-dropdown__scroll-top`, (3) `.c-dropdown__scroll-bottom`. Use sibling selectors: `.c-dropdown:hover .c-dropdown__list.can-scroll-up ~ .c-dropdown__scroll-top { opacity: 1 }` and same for can-scroll-down and scroll-bottom.

---

## 5. Migration (all 12 dropdowns at once)

Apply shared dropdown (wrapper or engine classes + directive + arrow divs) to every location in section C. Remove/replace existing component-level dropdown/list styles; keep item-level classes (e.g. `.dropdown-item`, `.category-header`, `.result-item`). Files: preparation-search, ingredient-search, menu-intelligence, recipe-header, product-form, recipe-book-list.

---

## C. Where to apply the new dropdown (plain text list)

1. Preparation search — src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.html — ul.results-dropdown
2. Ingredient search — src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.html — ul.results-dropdown
3. Menu intelligence Event type — src/app/pages/menu-intelligence/menu-intelligence.page.html — div.event-type-dropdown
4. Menu intelligence Section category — src/app/pages/menu-intelligence/menu-intelligence.page.html — div.section-dropdown
5. Menu intelligence Dish — src/app/pages/menu-intelligence/menu-intelligence.page.html — div.dish-dropdown
6. Recipe header Primary unit — src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html — div.unit-dropdown-menu.primary-chip-dropdown
7. Recipe header Secondary unit — src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html — div.unit-dropdown-menu.secondary-chip-dropdown
8. Recipe header Label — src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html — div.label-dropdown
9. Product form Category — src/app/pages/inventory/components/product-form/product-form.component.html — div.category.dropdown
10. Product form Supplier — src/app/pages/inventory/components/product-form/product-form.component.html — div.supplier.dropdown
11. Product form Allergen — src/app/pages/inventory/components/product-form/product-form.component.html — div.allergen.dropdown
12. Recipe book list Ingredient — src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html — ul.ingredient-dropdown

---

## B. Agent guidance: using shared UI

Add to HOW-WE-WORK.md and/or copilot-instructions.md: Before adding a new dropdown or scrollable list overlay, (1) check src/styles.scss for engines (e.g. .c-dropdown), (2) check src/app/shared/ for reusable components (e.g. scrollable-dropdown). Optional: in cssLayer SKILL.md add one sentence about checking shared/ for dropdowns.
