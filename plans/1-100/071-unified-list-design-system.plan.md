# Plan 071 — Unified List Design System

## Overview

Create a shared `list-shell` layout component and a `carousel-header` component to unify all five list pages (recipe-book, inventory, equipment, suppliers, venues) under the recipe-book-list design pattern. Each page keeps its own data logic but delegates layout, panel behavior, and carousel navigation to the shared components.

## Current State

Five list pages exist with two different patterns:

- **Grid + carousel** (recipe-book-list, equipment-list, supplier-list): CSS grid layout, collapsible filter panel, carousel header with `app-cell-carousel` in rows. Massive SCSS duplication (~800-1000 lines each repeating the same container, header, panel, and table-area styles).
- **Table-based** (inventory-product-list, venue-list): HTML `<table>`, different responsive strategy, no carousel.

The recipe-book-list is the gold standard. Equipment and supplier lists already copy its structure nearly line-for-line.

## Architecture

Two new shared components plus refactoring of all five list pages:

- `src/app/shared/list-shell/` — structural layout component with content projection
- `src/app/shared/carousel-header/` — carousel column header navigation
- `src/app/shared/cell-carousel/` — existing row-level carousel (unchanged)

All five list pages consume `list-shell` + `carousel-header` instead of duplicating layout/panel/carousel-header code.

## Component 1: `app-list-shell`

**Path**: `src/app/shared/list-shell/list-shell.component.{ts,html,scss}`

A purely structural layout component. It owns:

- The outer 2x2 CSS grid (`"header header" / "panel table"`)
- The header bar layout (title slot, search slot, actions slot)
- The collapsible filter panel (toggle, width transition, mobile overlay)
- The table area wrapper (scrollable body)
- All shared SCSS for container, header, panel, and table area

**Inputs**:

- `isPanelOpen: boolean` — controls panel state
- `gridTemplate: string` — CSS grid-template-columns for the table
- `mobileGridTemplate: string` — grid columns for mobile
- `emptyState: boolean` — whether to show empty-state slot
- `dir: 'rtl' | 'ltr'` — defaults to `'rtl'`

**Outputs**:

- `panelToggle: EventEmitter<void>` — when panel toggle is clicked

**Content projection slots** (via `select` attributes on `<ng-content>`):

- `[shell-title]` — page title
- `[shell-search]` — search input
- `[shell-actions]` — header action buttons
- `[shell-filters]` — filter panel content
- `[shell-table-header]` — column headers (including carousel-header)
- `[shell-table-body]` — data rows
- `[shell-empty]` — empty state content

## Component 2: `app-carousel-header`

**Path**: `src/app/shared/carousel-header/carousel-header.component.{ts,html,scss}`

Replaces the duplicated `.carousel-header-wrap` pattern.

**Inputs**:

- `columns: { label: string; sortable?: boolean; sortField?: string; expandable?: boolean }[]`
- `activeIndex: number` — current carousel slide
- `sortBy: string | null` — current sort field
- `sortOrder: 'asc' | 'desc'` — current sort direction

**Outputs**:

- `activeIndexChange: EventEmitter<number>` — prev/next navigation
- `sortChange: EventEmitter<{ field: string; order: 'asc' | 'desc' }>` — column sort click
- `expandToggle: EventEmitter<string>` — expand-all toggle for a column

**Behavior**:

- Desktop (>768px): `display: contents`, columns render inline in parent grid
- Mobile (<=768px): sliding label strip with prev/next arrows

## Page Migration Plan

### Recipe-book-list (first migration)

- Wrap in `<app-list-shell>`, replace carousel header with `<app-carousel-header>`
- Remove ~600 lines of duplicated layout SCSS
- Grid: `2fr 1fr 1fr minmax(48px,0.8fr) 0.8fr 80px`, mobile: `2fr 1fr 0.8fr 80px`

### Equipment-list

- Same migration as recipe-book-list
- Grid: `2fr 1fr minmax(48px,0.8fr) 0.8fr 80px`, mobile: `2fr 1fr 80px`

### Supplier-list

- Same migration as recipe-book-list
- Grid: `2fr 1fr minmax(48px,0.8fr) 0.8fr 0.8fr 0.8fr 80px`, mobile: `2fr 1fr 0.8fr 0.8fr 80px`

### Inventory-product-list

- Convert from `<table>` to CSS grid
- Remove inline price/unit editing; show values read-only
- Add carousel for Category + Allergens + Supplier
- Grid: `2fr 1fr 1fr minmax(48px,0.8fr) 0.8fr 80px`, mobile: `2fr 1fr 0.8fr 80px`

### Venue-list

- Convert from `<table>` to CSS grid
- Add carousel for Environment + Infrastructure
- Add filter panel (environment type filter)
- Grid: `2fr 1fr 0.8fr 80px`, mobile: `2fr 1fr 80px`

## Execution Order

1. Create `app-list-shell` component
2. Create `app-carousel-header` component
3. Migrate recipe-book-list (validate the pattern works)
4. Migrate equipment-list
5. Migrate supplier-list
6. Migrate inventory-product-list (table to grid)
7. Migrate venue-list (table to grid + add carousel)
