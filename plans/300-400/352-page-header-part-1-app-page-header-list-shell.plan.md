# Plan 352 — Page header, part 1: `<app-page-header>` and the list-shell pages

Status: done
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Page titles look bad on every screen because there's no shared header. There are about 6 patterns, with `.page-title` copy-pasted per component (font sizes `1.5rem/700` vs `--fs-xl`).

The worst case is the list-shell header (`src/app/shared/list-shell/list-shell.component.html` `.list-header`). It's used by inventory, recipe-book, suppliers and equipment:

- It's flex-wrap, then becomes a 5-column grid at `@container (max-width: $header-break-grid)` (`'ham back title title mirror' / 'ham search search actions mirror'`), then a 3-row grid at `$header-break-stack`.
- It has a ham button and a mirror spacer just to center the title.
- `::ng-deep .page-title { flex:1; text-align:center }` fights each page's own `flex-shrink:0; --fs-xl`.
- On a phone this produces a tall, 3-row, centered header that wastes space.

## Proposal (Dandan asked for one)

One compact header, start-aligned:

```text
Row 1:  [← back?]  Title  (count badge)  ············  [filter] [actions]
Row 2 (≤768px only, when a search slot is present):  [ search — full width ]
```

- Title: inline-start aligned (right in RTL), never centered. `--fs-xl` on desktop and `--fs-lg` at ≤768px, weight 700, one line with ellipsis.
- Count: the result count as a small pill badge next to the title (replaces the separate `.list-result-count` line).
- Filter toggle and actions: grouped at the inline-end as icon buttons (44px tap area on phone). No mirror spacer.
- Desktop: search sits on row 1 between the title and actions (max 24rem). It drops to row 2 only on narrow widths.
- Height: 1 row on desktop, at most 2 rows on phone.

## Goals & Success Criteria

- Primary: a reusable `<app-page-header>` implementing the proposal. List-shell renders its header through it, so all 4 list pages switch at once.
- Success: on a 360px phone, each list page's header is at most 2 rows (title row plus search), with no centered title or mirror spacer.

## Execution Mode

- Parallel: no. It touches list-shell and the 4 list pages. Run after the carousel plans (349, 350).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/page-header/**
src/app/shared/list-shell/**
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

- As a chef, I want every page to start with the same clean title row, so I know where I am and the content starts quickly.

## Functional Requirements

### Must Have (P0)
- [x] `src/app/shared/page-header/page-header.component.{ts,html,scss}` (`app-page-header`):
  - Inputs: `titleKey` (string, translated) or a projected `[header-title]`, `count` (`number | null`), `backLink` (`string | null`) or a `(back)` output.
  - Slots: `[header-search]`, `[header-actions]`, `[header-leading]` (for the filter toggle).
  - Layout per the proposal, using container queries on the component (not viewport), with logical properties only.
  - The title is an `<h1>` (one per page).
- [x] `ListShellComponent` replaces `.list-header` internals with `<app-page-header>`. It maps the existing slots (`[shell-back-btn]`, `[shell-title]`, `[shell-search]`, `[shell-actions]`, the open-panel button) into it. Delete the grid areas, `.header-ham-mirror`, `.header-spacer`, the `::ng-deep .page-title` rule and `$header-break-*` usage.
- [x] `resultCountText()` → the count badge (keep the text form for screen readers via `aria-label`).
- [x] The 4 list pages drop their local `.page-title` styles; their `shell-title` content becomes the title text only.

### Should Have (P1)
- [x] The count badge animates subtly on change (respect reduced motion).

### Nice to Have (P2)
- None.

## UI/UX Notes

- Title color `--color-text-main`; count badge uses existing `.c-chip` tokens.
- No new dictionary keys (titles reuse the existing keys).
- Keep the 44px tap targets on phone.

## Atomic Sub-tasks

- [x] A1: `PageHeaderComponent` plus a spec (renders title, count, back; slots project) (`src/app/shared/page-header/**`).
- [x] A2: list-shell uses it; delete the old header grid styles (`src/app/shared/list-shell/**`).
- [x] A3: Clean the 4 pages' title markup and styles (`inventory-product-list/**`, `recipe-book-list/**`, `supplier-list/**`, `equipment-list/**`).
- [x] A4: Build and run specs. Check at 360px, 768px and 1280px. Update the session-state file.

## Technical Considerations

- Dependencies: `ListShellComponent` and its 4 consumers.
- New files: `shared/page-header/*` plus its spec.
- Model changes: none.

## Out of Scope

- Non-list pages (venues, menu-library, dashboard, trash, forms): Plan 353 (Page header, part 2).
- Sticky behavior for the header (only the table top is sticky).

## Critical Questions

1. Title tag:
   - a) `<h1>` per page (default; one main heading per page)
   - b) Keep `<h2>`

## Success Criteria

- [auto] `rg -n "header-ham-mirror|header-spacer|header-break-grid" src/app` → no matches.
- [auto] `npx ng test --watch=false --include=src/app/shared/page-header/**/*.spec.ts --include=src/app/shared/list-shell/**/*.spec.ts --include=src/app/pages/**/*-list.component.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Phone: inventory, recipe book, suppliers and equipment each show the title at the right with a count badge, filter and actions at the left, and search on one line below. Two rows total.
- [human] Desktop: a single header row with the title, search and actions.
