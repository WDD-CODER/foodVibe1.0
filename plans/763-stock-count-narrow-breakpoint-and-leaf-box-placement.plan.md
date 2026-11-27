# Plan 763 — The stock count's two-line rows only on narrow phones; the leaf's nutrition box always in the same place

Status: draft
Depends-on: none
Track: code
Snapshot: 71e739d9

## Problem Statement
Dandan graded the combined biz cards on 2026-11-27 (branch `orch/biz-all`, plan 762). His words:

- **Stock count two lines:** "let's have the count's new layout from a smaller breakpoint! starting only below 420 or
  the closest breakpoint to it." Today the two-line row starts at `$break-phone-max` (767px,
  `stock-count.component.scss:177`). The app's breakpoint set (`src/app/core/styles/_breakpoints.scss`, mirrored at the
  top of `src/styles.scss`) has no step near 420px.
- **Leaf icon:** "same as the triangle, the leaf icon should show in the same place every time! aligned correctly!"
  The product list's warning triangle box (card ⑧) passed. The nutrition leaf (`src/app/shared/nutrition-badge/`) opens
  its box in a place that changes between opens and rows. (behaviour decision: "in the same place" read as — the box
  always opens on the same side of the leaf, centred on it, the same distance from it, like the triangle's box; and the
  leaf itself sits at the same spot in every row of the product list.)

## Goals & Success Criteria
**Primary:** the two cards pass.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run test:ci` exits 0.
- [auto] `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts`: at a 400px-wide layout each
  row is two lines (name container above the controls container); at 500px and at 800px each row is one line.
- [auto] `src/app/shared/nutrition-badge/nutrition-badge.component.spec.ts`: opening the box on a badge near the top
  and near the bottom of the screen, and opening it twice on the same badge, gives the same side, the same gap and the
  box centred on the leaf (or pushed inside the screen with the arrow still on the leaf), with the content's final size
  measured before placing.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/763-stock-count-narrow-breakpoint-and-leaf-box-placement.plan.md` → `ARCH: ok`.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0; `node scripts/inventory.mjs --check` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] The stock count with the window at about 400px wide: name on top, the controls under it; at about 600px
  wide and wider: one line per row, as before.
- [human] any page with a small floating box · open it on a row near the top and on a row near the bottom of the screen · it is as wide as its text, sits right above or below the row, and is never cut off — here: the product list's leaf icon, opened on the first and the last visible row and twice on the same row; it opens in the same place relative to the leaf every time, and the leaf sits at the same spot in every row.

## Execution Mode
- Parallel: no — one plan.
- Concurrent plans: none in this run.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/styles/_breakpoints.scss
src/app/pages/inventory/components/stock-count/**
src/app/shared/nutrition-badge/**
src/app/pages/inventory/components/inventory-product-list/**
src/app/core/utils/**
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
src/app/shared/nutrition-badge/nutrition-badge.component.spec.ts
src/app/**/breadcrumbs.md
docs/agent/house-style.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/workflow-kit/manifest.json
src/app/core/engine/plan-snapshot.spec.ts
src/app/core/services/export.service.spec.ts
src/app/core/services/user.service.spec.ts
src/app/pages/recipe-builder/services/recipe-builder-export.service.spec.ts
scripts/test/breakpoints-no-literals.test.mjs
src/app/pages/metadata-manager/components/user-management/user-management.component.html
src/app/pages/metadata-manager/components/user-management/user-management.component.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — presentation only; no route, permission, data or AI change.
- INV-6: preserves — the scope glob `src/app/**/breadcrumbs.md` matches `*ai*` paths only by name; no AI call is touched.

## Reuse Check
- none — the narrow step is one more token in the app's one breakpoint set; the leaf box keeps the shared
  `placeInViewport` placement the triangle's box uses.

## Defaults

- one-breakpoint-set — applies — how: a narrow-phone token (`$break-phone-narrow-max: 419px`, plus its `--bp-` custom property) is added to `_breakpoints.scss` and the mirror at the top of `src/styles.scss`; no raw pixel value in the component.
- anchored-popup — applies — how: the leaf box uses `placeInViewport` from the measured final size, the same as the triangle's box.
- hints-in-tooltips — applies — how: the leaf box keeps opening from the icon; no hint text added.
- app-list-container — exception — why: Dandan asked (2026-11-27) for the stock count's narrow-phone rows to be two lines; the rows stay in the list container.
- row-action-icons — exception — why: no row action added.
- live-summary — exception — why: no summary box.
- confirm-destructive-action — exception — why: nothing deleted.
- empty-state-on-list — exception — why: no new list.
- loading-and-error-states — exception — why: no new request.
- unsaved-changes-on-leave — exception — why: no form change.
- leave-and-return — exception — why: no navigation.
- unit-dropdown-add — exception — why: no dropdown.
- disabled-explains-why — exception — why: no control is blocked.
- modal-centered — exception — why: no modal.
- modal-scrollable — exception — why: no modal.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a cook counting stock on a normal phone, I want the row on one line when it fits, and on two lines only on a
  narrow phone.
- As a cook reading nutrition, I want the leaf's box to open in the same place every time, so I know where to look.

## Functional Requirements
- Breakpoint set: add `$break-phone-narrow-max: 419px` (and `--bp-phone-narrow-max`) to the app's one breakpoint set;
  the stock count's two-line rule moves from `$break-phone-max` to it.
- Leaf box: find why the box opens in different places (for example placing before its content has its final size,
  a pinned-versus-hover difference, or the badge's width changing per row) and fix it so it opens like the triangle's
  box; in the product list the leaf sits in one fixed spot in its cell on every row.

## UI/UX Notes
- Existing tokens only; no new colour.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] G1: Add the narrow-phone breakpoint and move the stock count's two-line rule to it — src/app/pages/inventory/components/stock-count/stock-count.component.scss
- [x] G2: The leaf's box opens in the same place every time, like the triangle's — src/app/shared/nutrition-badge/nutrition-badge.component.ts
- [ ] G3: Run every automatic check and paste the outputs under Execution Notes — plans/763-stock-count-narrow-breakpoint-and-leaf-box-placement.plan.md

## What happens when
- A window between 420px and 767px: the stock count rows are one line, as on a tablet.
- No room above the leaf: the box opens below it, the same way the triangle's does.

## Technical Considerations
- Run branch: a new run cut from `orch/biz-all` (71e739d9). Do not run browser checks.

## Out of Scope
- Other pages' phone layouts; other tooltips.

## Critical Questions
- none

## Execution Notes

### G1 — narrow-phone step
- `$break-phone-narrow-max: 419px` in `_breakpoints.scss` and `src/styles.scss` (plus `--bp-phone-narrow-max`);
  `PHONE_NARROW_MAX` / `PHONE_NARROW_QUERY` in `breakpoints.ts`.
- The two-line media rule uses the new name. The stock count's phone column template follows the same step
  (`narrowPhone_`): 420–767px has the name column again (`minmax(0, 1.5fr) auto minmax(6rem, 1fr) auto`, the template
  from before plan 762); without it a one-line row has four cells in three columns.
- Spec: the drawn sheet is copied into a frame 400 / 420 / 500 / 800px wide; two lines at 400, one line at the others.
  It replaces the old phone test, which was always `pending` in a wide test window.

### G2 — the leaf and its box
- Cause check: the new placement tests (side, gap, centring, same place twice, screen edges) passed on the unchanged
  badge (14 run, 13 pass, 1 fail), so placing before the content had its final size was **not** reproduced.
  The one failure: the box was a fixed 164px and cut row labels off. In the list, the leaf sat after the name text, so
  its spot (and the box's) moved with each name's length.
- Fix: the leaf has its own 1.5rem slot at the name cell's inline-end on every row; the box is `max-content` wide
  (capped by the screen); placed again one frame after opening, as the shared tooltip does; the arrow offset takes
  the 1px border off. Preferred side stays above, flipping below when there is no room (`## What happens when`).

### Decisions
- behaviour: the leaf sits at the end of the name cell (after the name), not beside the warning triangle — reverse:
  move the `name-nutrition-slot` span (it reuses `.name-status-slot`) before `.name-text` and widen the header's start
  padding.

### G3 — checks
- `pnpm run build` -> exit 0
- `pnpm run lint` -> exit 0 (0 errors, 71 warnings)
- `pnpm run test:ci` -> exit 0, `TOTAL: 3137 SUCCESS` (one earlier run: the 800px layout test timed out waiting for a
  stylesheet to load; the test now copies the loaded rules and waits for nothing)
- `kit-manifest-check.mjs --root .` -> `KIT_MANIFEST: ok`
- `override-check`, `lint:icons`, `lint:no-native-select`, `plan-ledger-check`, `breadcrumbs-check`,
  `inventory.mjs --check` -> exit 0
- `scope-check.mjs --arch` -> `ARCH: ok INV-none, INV-6`
- `log-query.mjs --since=plan-start --level=error` -> `SKIP: no database configured`
- **FAIL** `pnpm run test:scripts` (a CI step) -> 156 of 157: `scripts/test/breakpoints-no-literals.test.mjs`
  "no @media under src types a width" allows only the four old names, so it rejects
  `@media (max-width: $break-phone-narrow-max)`. The file is outside the scope; asked to add it.
  Change needed there: add `phone-narrow-max` to the allowed-name pattern (line 59), and to `NAMES` / `EXPECTED`.
