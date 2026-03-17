---
name: Tech Debt Report
overview: Full six-phase technical debt scan of foodVibe 1.0 as of Mar 10, 2026.
todos:
  - id: delete-system-health
    content: Delete src/app/core/utils/system-health.ts
    status: pending
  - id: type-storage-query
    content: Type storageService.query in metadata-registry.service.ts
    status: pending
  - id: shared-require-auth
    content: Extract requireAuth() and replace copy-pasted auth blocks
    status: pending
  - id: list-shell-base
    content: Extract list-shell shared util from 6 list components
    status: pending
  - id: merge-dish-recipe-service
    content: Merge or generify DishDataService and RecipeDataService
    status: pending
  - id: generic-resolver-factory
    content: Create createEntityResolver factory for 4 resolvers
    status: pending
  - id: translate-pipe-hebrew
    content: Replace hardcoded Hebrew in 7 templates with translatePipe
    status: pending
  - id: split-large-ts-files
    content: Split menu-intelligence and recipe-builder pages
    status: pending
  - id: split-product-form
    content: Split product-form into sub-form components
    status: pending
  - id: inline-styles
    content: Move 7 inline style= to component SCSS
    status: pending
  - id: unexported-symbols
    content: Remove export from 7 unused symbols
    status: pending
  - id: fix-delete-consistency
    content: Normalize onDelete handlers to async/await
    status: pending
  - id: fix-lazy-load-dashboard
    content: Fix dashboard lazy-load vs static imports
    status: pending
---

# Tech Debt Report — foodVibe 1.0 — Mar 10, 2026

## Critical (Fix Now)

- [ ] **system-health.ts** — Delete (dead file).
- [ ] **metadata-registry.service.ts** — Type storageService.query<T> (15 any hits).
- [ ] **metadata-manager.page.component.html** — Replace ~16 hardcoded Hebrew with translatePipe.

## High Priority

- Extract shared **requireAuth()**; replace 10+ copy-pasted auth blocks in list components.
- Extract **list-shell** shared util (togglePanel, setSort, onCarouselHeaderChange, afterNextRender, filteredXxx_).
- Merge or generify **DishDataService** and **RecipeDataService**.
- File size: split menu-intelligence.page.ts (1,084), recipe-builder.page.ts (1,011), product-form (736+334).
- Hardcoded Hebrew: 7 templates (~47 lines).

## Medium / Low

Duplicate: saveCurrentInlineEdit, 4 resolvers, filter helpers, getSupplierName, focusTrigger. SCSS/HTML over 300 lines. Inline styles (7). Unused exports (7). TODOs (3). Dashboard lazy-load.

## Metrics

TODOs 3 | Duplicate groups 12 | Files >300 lines 26 | any 30 | Hebrew ~47 | Inline styles 7 | Dead files 1
