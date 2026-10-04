# Plan 346 — Lists: sticky table header and pagination at the top

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

In the list pages built on `app-list-shell` (inventory, recipe-book, suppliers, equipment), the column header row doesn't stay visible while scrolling on tablet or phone, and pagination sits at the bottom.

- **>1023px:** `.list-container` is `90dvh` with `.table-body` scrolling internally, so the header already stays. But pagination (`.c-pagination-controls`, `styles.scss:~982`) is the last child of `[shell-table-body]`:
  - inventory `.html:~241-255`
  - recipe-book `.html:~332-346`

  So it's at the far end of the scroll.
- **≤1023px:** `.list-container` becomes `height:auto; overflow:visible` and the window scrolls. `.table-area { overflow:hidden }` (`list-shell.component.scss:~245`) is a scroll container, which breaks any `position:sticky` inside it. Nothing is sticky.

Dandan wants the top of the table to stay fixed while scrolling, with pagination at the top.

## Goals & Success Criteria

- Primary: at every width, the pagination bar plus the column header row stay pinned at the top of the visible area while rows scroll.
- Success: pagination appears above the column headers in inventory and recipe-book. Suppliers and equipment (no pagination) get the sticky column header.

## Execution Mode

- Parallel: no. It shares list-shell, the list pages and `src/styles.scss` with the filter plans and the keyboard plan. Run after Plan 345 (filter categories).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/list-shell/**
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss
```

`src/styles.scss`: this plan edits the existing `.c-pagination-controls` rule (border side and placement). That's an approved exception to append-only for that rule.

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

- As a chef scrolling a long product list, I want the column names and page controls always visible.

## Functional Requirements

### Must Have (P0)
- [ ] `list-shell.component.html`: new `<div class="table-top">` inside `section.table-area`, before the rows. It holds a new `<ng-content select="[shell-pagination]">` followed by the existing `.table-header`.
- [ ] `.table-top { position:sticky; inset-block-start:var(--list-sticky-top, 0); z-index:5; background: <opaque surface token> }`.
- [ ] `--list-sticky-top` on `:host`:
  - `0` at >1023px (internal scroll)
  - the app header height (`3.875rem`, the same value `.c-table th` uses at `styles.scss:~1111`) at 621–1023px
  - `env(safe-area-inset-top, 0px)` at ≤620px (the top bar is hidden there)
- [ ] `.table-area` switches `overflow:hidden` → `overflow:clip`, which keeps the clipping without creating a scroll container. Update `grid-template-rows` (`50px 1fr` → `auto 1fr`) and the ≤1023px variant.
- [ ] Move the `.c-pagination-controls` blocks in inventory and recipe-book out of `[shell-table-body]` into a `shell-pagination` element. In `styles.scss`, `.c-pagination-controls` swaps `border-block-start` for `border-block-end` and drops `grid-column:1/-1` if it's no longer in the grid.
- [ ] The `[shell-modal]` slot stays outside `.table-area` (backdrop-filter containing-block reason, per the existing comment).

### Should Have (P1)
- [ ] Changing page scrolls the table back to its first row (`scrollIntoView` on `.table-top`, block start).

### Nice to Have (P2)
- None.

## UI/UX Notes

- Pagination and the column header together stay under ~6rem on phone; pagination is compact (prev / "עמוד X מתוך Y" / next).
- No new dictionary keys (reuse `pageIndicatorText_`).

## Atomic Sub-tasks

- [ ] A1: list-shell: `.table-top` wrapper, `[shell-pagination]` slot, sticky styles, `--list-sticky-top`, `overflow:clip`, grid rows (`src/app/shared/list-shell/**`).
- [ ] A2: Move pagination in inventory and recipe-book into the slot; adjust `.c-pagination-controls` (`inventory-product-list.component.html/.scss`, `recipe-book-list.component.html/.scss`, `src/styles.scss`).
- [ ] A3: Verify suppliers and equipment (no pagination) get the sticky column header with no empty gap.
- [ ] A4: Build and run specs. Check at 360px, 800px and 1280px. Update the session-state file.

## Technical Considerations

- Dependencies: `ListShellComponent` plus its 4 consumers. Page state (`currentPage_`, `totalPages_`, `goToPrev/NextPage`) is unchanged.
- New files: none.
- Model changes: none.
- Sticky breaks if any ancestor between `.table-top` and the scroll root has `overflow:hidden|auto|scroll`. Check `.list-container` and `app-root .app-content` at each width.

## Out of Scope

- Making the title/search `.list-header` sticky.
- Venues and menu-library card grids.
- Pagination for suppliers and equipment.

## Critical Questions

1. What stays pinned?
   - a) Pagination plus the column header row (default)
   - b) Also the title/search header (takes about 2 more rows on phone)

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/shared/list-shell/**/*.spec.ts --include=src/app/pages/**/*-list.component.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Phone and tablet: inventory → scroll down → the pagination bar and column names stay pinned at the top. Next page works from the top.
- [human] Desktop: the same pinned header; pagination is at the top of the table, not the bottom.
- [human] Suppliers and equipment: the column header stays pinned while scrolling.
