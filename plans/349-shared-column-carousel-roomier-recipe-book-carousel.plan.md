# Plan 349 — Shared column carousel (one component for every list) and roomier recipe-book carousel

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

On mobile, the list tables show extra columns through a "column carousel": one header cell and one body cell per row, where the user swipes or taps to see the next field. It's built from two separate shared components with different APIs:

- `shared/carousel-header`: `CarouselHeaderComponent` plus `[carouselHeaderColumn]`. Uses input `activeIndex` / output `activeIndexChange` and the legacy `@ContentChildren`. Arrows only on the header (`width:1rem`, `opacity:.55`).
- `shared/cell-carousel`: `CellCarouselComponent` plus `[cellCarouselSlide]`. Uses model `activeIndex` and `@ContentChildren`. Swipe only; `prev()` / `next()` exist but no arrows render. Label at `0.625rem`.

Each of the 4 lists (recipe-book, inventory, suppliers, equipment) wires the two together through its own `carouselHeaderIndex_` signal. Each list repeats the same `@media 768 { … app-cell-carousel {background…} }` block:

| List | scss lines |
| --- | --- |
| recipe-book | ~529-541 |
| inventory | ~404-416 |
| suppliers | ~81-93 |
| equipment | ~154-166 |

In the recipe book the carousel column gets `1fr` of ~4.5fr, and padding stacks up:

- list-shell `.75rem`
- `.c-list-body-cell` `.75rem` (`styles.scss:~956`)
- `.carousel-cell` `.75rem`
- a `1rem` arrow zone

The content gets squeezed. Dandan wants one professional carousel used everywhere, and more room in the recipe book.

## Goals & Success Criteria

- Primary: one `shared/column-carousel` with a single shared index (no per-page wiring), arrows and swipe on both header and cells, and RTL-correct direction.
- Primary: the 4 lists are migrated; the old `carousel-header` and `cell-carousel` are deleted.
- Success: the recipe-book carousel column is visibly wider on a 360px phone, and its content isn't truncated.

## Execution Mode

- Parallel: no. It touches all 4 list pages. Run after Plan 346 (sticky table).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/column-carousel/**
src/app/shared/carousel-header/**
src/app/shared/cell-carousel/**
src/app/pages/recipe-book/components/recipe-book-list/**
src/app/pages/inventory/components/inventory-product-list/**
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

- As a chef browsing a list on my phone, I want to flip through extra columns smoothly, from the header or any row, with enough room to read the values.

## Functional Requirements

### Must Have (P0)
- [ ] `src/app/shared/column-carousel/`:
  - `ColumnCarouselGroupDirective` (`[columnCarouselGroup]`) on the list container. It provides a group state (`index_` signal, `count_`, `next()`, `prev()`, `go(i)`) via DI, plus optional `[(columnCarouselIndex)]` for URL or state persistence.
  - `ColumnCarouselHeaderComponent` (`app-column-carousel-header`) and `ColumnCarouselCellComponent` (`app-column-carousel-cell`) both inject the group. Slides are marked with `[columnSlide]` (`label` input), queried with the `contentChildren()` signal API (no `@ContentChildren`).
  - Both have prev/next arrows (≥32px tap area, visible), swipe (pointer events, ~40px threshold, horizontal-only, no vertical scroll hijack), and RTL-aware direction.
  - The header shows the active slide label plus small position dots.
  - Animated transition, respecting `prefers-reduced-motion`.
  - All styles inside the component, including the mobile background that each list currently repeats.
- [ ] Migrate the 4 lists. Remove `carouselHeaderIndex_` and its wiring, and delete each list's duplicated `@media 768 … app-cell-carousel` block.
- [ ] Delete `shared/carousel-header` and `shared/cell-carousel`.
- [ ] Header arrows float: small round buttons (28px, glass background, shadow) overlaid at the cell's top edge (`inset-block-start: -0.5rem`) or floating over the label edges, so the column label gets the full cell width (`white-space:nowrap; text-overflow:ellipsis`). The host must not clip them (no `overflow:hidden` on the carousel host; check `.table-area` clipping).
- [ ] Cell background: the carousel cell inherits the row's background (`background: inherit` or transparent), with no white fill that differs from the row color. Delete the per-list `@media 768 … app-cell-carousel { background }` blocks.
- [ ] Recipe-book spacing on ≤768px:
  - The carousel column goes from `1fr` to ~`1.4fr`, and the type column shrinks (`0.7fr` → `0.5fr`) in the mobile grid template `'2fr 0.7fr 1fr 0.8fr 40px 28px'`.
  - Carousel cell `padding-inline` drops to `.25rem`.
  - Override `.c-list-body-cell` padding for the carousel cell only, via a class on that cell in recipe-book scss; don't edit the global engine.

### Should Have (P1)
- [ ] Keyboard: the left/right arrow keys on a focused header move slides.

### Nice to Have (P2)
- None.

## UI/UX Notes

- In RTL, "next" points left. The arrows use Lucide `chevron-left` / `chevron-right` mapped by `dir`.
- The label is at least `--fs-2xs` (not `0.625rem`).
- No dictionary changes (labels come from existing keys passed as `label`).

## Atomic Sub-tasks

- [x] A1: Build the group directive, header, cell and slide directive, with specs: next/prev wrap or clamp, header and cell share the index, RTL direction (`src/app/shared/column-carousel/**`).
- [x] A2: Migrate recipe-book, including the spacing changes (`recipe-book-list/**`).
- [x] A3: Migrate inventory, suppliers and equipment (`inventory-product-list/**`, `supplier-list/**`, `equipment-list/**`).
- [x] A4: Delete the old components; `rg` for leftovers (`shared/carousel-header/**`, `shared/cell-carousel/**`).
- [ ] A5: Build and run specs. Check at 360px, 768px and desktop (the carousel is hidden on desktop as today). Update the session-state file.

## Technical Considerations

- Dependencies: the 4 list components and `ListShellComponent` (layout only).
- New files: `shared/column-carousel/{column-carousel-group.directive.ts, column-carousel-header.component.*, column-carousel-cell.component.*, column-slide.directive.ts}` plus specs.
- Model changes: none.
- Signals-only: `input()`, `model()`, `contentChildren()`, `inject()`.

## Out of Scope

- Scroll-based strips (tab chips, metadata jump-nav, dashboard activity, menu dish data): Plan 350.
- Desktop column layout.

## Critical Questions

1. At the last slide, "next":
   - a) Wraps to the first (default)
   - b) Stops (arrow disabled)

## Success Criteria

- [auto] `rg -n "app-cell-carousel|app-carousel-header|carouselHeaderIndex_" src/app` → no matches.
- [auto] `npx ng test --watch=false --include=src/app/shared/column-carousel/**/*.spec.ts --include=src/app/pages/**/*-list.component.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Phone: recipe book → swipe a row's carousel cell or tap the header arrow → all rows and the header move together to the next field. The carousel column is wider and its values aren't cut off.
- [human] Same behavior in inventory, suppliers and equipment.
- [human] The carousel column title is fully readable with the arrows floating above it, and carousel cells match their row color.
