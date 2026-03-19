# Inverted-L List Layout Refactor

## Overview

Refactor both the Recipe Book List and Inventory Product List from a sidebar-left grid layout to an "inverted L" layout: a fixed full-width header bar on top, a retractable filter panel on the right (collapsing to an icon strip), and a scrollable table body with a sticky column header.

## Current State

Both list pages use the same grid layout pattern:

```
grid-template-areas:
  "header header"
  "sidebar table";
```

The sidebar is a sticky left panel containing search and filter controls. The table scrolls with the page.

**Files to change:**

- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html`
- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss`
- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts`
- `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html`
- `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss`
- `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts`

## Target Layout

The "inverted L" means: the header spans full width; the filter panel lives only to the RIGHT of the table below the header, not extending into the header row.

- **Container**: viewport-locked (`height: 100dvh`), no page scroll.
- **Header bar**: full width, fixed (title | search | action buttons).
- **Table area**: table column header fixed at top of area; only table body scrolls.
- **Filter panel**: right side, retractable to a narrow icon strip (~48px) with toggle button.

## Layout Structure (both pages)

### 1. Container

- `display: grid`
- `grid-template-rows: auto 1fr` (header row + content row)
- `grid-template-columns: 1fr auto` (table + panel)
- `grid-template-areas: "header header" / "table panel"`
- `height: 100dvh; overflow: hidden`

### 2. Header Bar (`grid-area: header`)

- Flex row (RTL). Contains: page title, search input, action button(s). Does NOT scroll.

### 3. Table Area (`grid-area: table`)

- Flex column, overflow hidden. Table header row as first flex child (never scrolls). Table body `flex: 1; overflow-y: auto` (only scrollable zone).

### 4. Filter Panel (`grid-area: panel`)

- Expanded: ~200–220px, search/filters. Collapsed: ~48px icon strip with toggle. Smooth transition on width/min-width. Border-inline-start for separation.

### 5. Mobile (< 768px)

- Same pattern as desktop: panel collapses to icon strip (no slide-out drawer).

## Key Decisions

- **Table header stickiness**: header is a non-scrolling flex sibling above the scrollable body (no `position: sticky`).
- **Panel collapsed**: toggle button visible in 48px column; panel content hidden with `opacity: 0` + `pointer-events: none`.
- **RTL**: `dir="rtl"`; `border-inline-start` and grid respect direction.
- **Styling**: Follow `.claude/skills/cssLayer/SKILL.md` (Five Groups, tokens from `src/styles.scss`, component-scoped tokens where needed).
