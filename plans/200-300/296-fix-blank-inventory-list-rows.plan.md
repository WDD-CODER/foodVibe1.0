# Plan 296 — Fix Blank Inventory List Rows

## Goal

Inventory list rows show all cell text on first load — no need to hover the nutrition badge to “wake” blank rows.

## Author / role

Architect pass (Cursor plan mode + Human). Contractor = Cursor.
Executes **one milestone at a time**, writes `sessions/[date].md` after each, stops
for review / Human validation.

## Problem statement

On `/inventory/list`, many rows showed only checkbox + ₪ until nutrition-badge hover.
Browse verification found the real cause:

1. `filteredProducts_()` had **all** names (257).
2. Console: hundreds of `Error: The "more-vertical" icon has not been provided…`
   from `RowActionsMenuComponent` (one throw per row).
3. That exception **aborts change detection mid-`@for`**, leaving later row bindings empty.
4. Hover / `ng.applyChanges` started another CD pass → a few more rows filled.

## Non-goals / out of scope

- Rewriting list-shell content projection
- Product hydrate / data-layer changes

## Decisions (locked)

- **Primary fix:** register Lucide `MoreVertical` in `app.config.ts` (used by
  `row-actions-menu` mobile trigger; was in test icons only).
- M1–M2 glass/paint experiments **reverted** (wrong theory).

## Milestones

| ID | Status | Deliverable |
| --- | --- | --- |
| M1–M2 | [x] | Paint experiments — tried, then reverted |
| M3 | [x] | Register `MoreVertical`; browse verify 257/257 filled |
| M4 | [x] | Revert leftover CSS from M1–M2 |

## Atomic Sub-tasks

- [x] M3a `app.config.ts` — add `MoreVertical` to `LucideAngularModule.pick`
- [x] M3c Browse: cold load → `filled === total`, no new `more-vertical` errors
- [x] M4a Revert `list-shell` / `.c-list-body-cell` paint-theory CSS; keep only `MoreVertical`
