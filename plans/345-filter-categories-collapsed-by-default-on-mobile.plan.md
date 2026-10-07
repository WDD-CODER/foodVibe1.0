# Plan 345 — Filter categories collapsed by default on mobile

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

On mobile, opening the filter panel shows every category fully expanded, which is a long scroll.

| Page | Current state | Starts as |
| --- | --- | --- |
| Inventory | `collapsedFilterCategories_ = signal<Set<string>>(new Set())` (`inventory-product-list.component.ts:122`) | all expanded |
| Recipe-book | `new Set(['Date'])` (`recipe-book-list.component.ts:221`) | only Date collapsed; an effect at ~L170-183 re-expands categories with active values |
| Suppliers, equipment | static labels, no header button | can't collapse at all |

Dandan wants every category collapsed by default on mobile; the user opens what they need.

## Goals & Success Criteria

- Primary: at ≤1023px (where the panel stacks full-width, list-shell `$panel-overlay-break`), every filter category in inventory, recipe-book, suppliers and equipment starts collapsed. A category with an active selection starts expanded.
- Success: desktop (>1023px) behavior is unchanged.

## Execution Mode

- Parallel: no. It shares list pages and `src/styles.scss` with the toggle-chip, sticky-table and keyboard plans. Run after Plan 339 (toggle-chip) and Plan 342 (form checkboxes).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/collapsible-categories.util.ts
src/app/core/utils/collapsible-categories.util.spec.ts
src/app/pages/inventory/components/inventory-product-list/**
src/app/pages/recipe-book/components/recipe-book-list/**
src/app/pages/suppliers/components/supplier-list/**
src/app/pages/equipment/components/equipment-list/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef on my phone, I want the filter panel to show just category headers so I can open only the one I need.

## Functional Requirements

### Must Have (P0)
- [ ] New `useCollapsibleCategories(opts?: { desktopCollapsed?: string[] })` in `src/app/core/utils/collapsible-categories.util.ts`. It returns `{ isExpanded(name), toggle(name), expandIfActive(name, hasActive) }`.
  - It tracks expanded names when mobile (`matchMedia('(max-width: 1023px)')`, starting empty) and collapsed names when desktop (seeded from `desktopCollapsed`).
  - It re-evaluates on breakpoint crossing.
  - The initial mobile check is synchronous (same reasoning as `useResponsivePanelState` and the gotcha in `docs/brain/gotchas.md`).
- [ ] Inventory and recipe-book replace `collapsedFilterCategories_` / `toggleFilterCategory` / `isCategoryExpanded` with the util. Recipe-book passes `desktopCollapsed:['Date']` and keeps its re-expand-on-active effect via `expandIfActive`.
- [ ] Suppliers (delivery days, linked) and equipment (category, consumable) get the same collapsible header markup as inventory: the `.c-filter-category-header` button, chevron, `.c-filter-category-count` badge and `@if (isExpanded(...))`.
- [ ] Unit spec for the util: mobile starts all collapsed, toggle works, desktop seed works, and an active category is expanded.

### Should Have (P1)
- [ ] The count badge shows the number of selected values even when collapsed, so the user sees active filters without expanding.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Collapsed header: chevron left (RTL), name, and selected-count badge when >0.
- No new dictionary keys.

## Atomic Sub-tasks

- [x] A1: Write the util plus its spec (`collapsible-categories.util.ts/.spec.ts`).
- [x] A2: Migrate inventory and recipe-book (`inventory-product-list/**`, `recipe-book-list/**`).
- [x] A3: Add collapsible headers to suppliers and equipment (`supplier-list/**`, `equipment-list/**`).
- [ ] A4: Build and run specs. Check at 360px and 1280px. Update the session-state file.

## Technical Considerations

- Dependencies: `filter-category-counts.util.ts` (badge counts), `panel-preference.util.ts` (unchanged).
- New files: `collapsible-categories.util.ts` plus its spec.
- Model changes: none.
- Note: `MOBILE_QUERY` in `panel-preference.util.ts` is 768px while stacking starts at 1023px. Don't change it in this plan (the gotcha covers it); flag it in the session state as a follow-up.

## Out of Scope

- Panel open/close behavior.
- Venues and menu-library filter bars (no categories).

## Critical Questions

1. Remember the user's expanded categories between visits on mobile?
   - a) No, always start collapsed (default)
   - b) Yes, per page in localStorage

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/core/utils/collapsible-categories.util.spec.ts` → 0 failures.
- [auto] `npx ng test --watch=false --include=src/app/pages/**/*-list.component.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Phone: open filters on inventory, recipe book, suppliers and equipment → only category headers show. Tap one → it opens. Select a value, leave and come back → that category is open with its count badge.
- [human] Desktop: filter panels look as before.
