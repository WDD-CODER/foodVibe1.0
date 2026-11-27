# Plan 762 — A clearer "more" sign, the stock count's name above its controls on phones, tooltips that tap-and-go

Status: draft
Depends-on: none
Track: code
Snapshot: ca7e3b32

## Problem Statement
Dandan graded the house-style cards on 2026-11-27 (branch `orch/biz-house`, plans 747 round two and 758). His words:

- **⑧ sign of more inside the row (phone):** "still too hard to see it! I need something a bit more noticeable!"
- **⑨ stock count on a phone:** "in mobile I want each row to be the name above the rest of the buttons of each row.
  `c-list-body-cell stock-count__name`, `c-list-body-cell stock-count__unit-cell`, `c-list-body-cell
  stock-count__counted` — have these three elements sit in one container and the name in another container; when the
  mobile breakpoint comes in, the name of the item is above the rest of the buttons, which are in the container."
  (Read: the name in its own container; the unit cell, the counted cell and the row's other controls in a second
  container; at the phone breakpoint the name sits on top and the controls container under it.)
- **Tooltips on blocked controls:** "only on mobile, a tap on a button that cannot be used should show the tooltip, and
  the tooltip should disappear once the user taps or scrolls anywhere. At the other breakpoints a tap should do
  nothing — the tooltip shows only on hover. Right now, at every breakpoint a click pins the tooltip until the user
  clicks that button again, which I don't want." (Remark recorded: tag `tooltip-tap-dismiss`.)

## Goals & Success Criteria
**Primary:** the three graded cards pass.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run test:ci` exits 0.
- [auto] `src/app/shared/tooltip/disabled-why.directive.spec.ts` (and the tooltip directive's spec): at a phone width
  (the app's phone breakpoint), a tap on a blocked control opens the tooltip, and a later tap anywhere (also on the same
  control) or a scroll of the page or of any scroll container closes it; at a wider width a click opens nothing and
  hover opens and leave closes; Escape still closes.
- [auto] `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts`: each row has a name container
  and one controls container holding the unit cell, the counted cell and the row's other controls.
- [auto] `src/app/shared/scroll-rail/scroll-rail.component.spec.ts`: the inside "more" sign renders only on the side
  with more and carries the stronger look's class.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/762-house-style-grading-round-three.plan.md` → `ARCH: ok`.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0; `node scripts/inventory.mjs --check` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] At phone width, the settings tabs and the dashboard's metadata row show a clearly visible sign at the edge
  that has more (you notice it without looking for it); it is gone at the end.
- [human] The stock count at phone width: each row shows the item's name on top, and under it the unit, the counted
  box and the row's buttons together; at tablet and desktop width the row looks as before.
- [human] At phone width, tap a blocked button (dev catalog sample): the tooltip shows; tap anywhere else, or scroll:
  it disappears. On a desktop window, click the same button: nothing shows; hover it: the tooltip shows, and moving
  away hides it.
- [human] any page with a small floating box · open it on a row near the top and on a row near the bottom of the screen · it is as wide as its text, sits right above or below the row, and is never cut off — here: the product list's warning triangle at phone width, tapped on the first and the last visible row.

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
src/app/shared/tooltip/**
src/app/shared/scroll-rail/**
src/app/pages/inventory/components/stock-count/**
src/app/shared/tooltip/disabled-why.directive.spec.ts
src/app/shared/scroll-rail/scroll-rail.component.spec.ts
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
src/app/**/breadcrumbs.md
docs/agent/house-style.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/workflow-kit/manifest.json
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
Changes inside the existing shared tooltip, `scroll-rail` and the stock count; the phone breakpoint comes from the
app's one breakpoint set. The new classes:

- `.stock-count__name-box`, `.stock-count__controls`, `.stock-count__head-name` — family: list-page — rung: 3 — why: page-local layout containers of the stock count row on the list shell.
- `.sr-more__badge` — family: sideways-row — rung: 3 — why: the stronger look of the rail's sign of more.

## Defaults

- hints-in-tooltips — applies — how: the shared tooltip (`src/app/shared/tooltip/`), with the new tap-and-go rule on phones.
- disabled-explains-why — applies — how: `appDisabledWhy`; only how its tooltip opens and closes changes.
- anchored-popup — applies — how: the shared tooltip keeps its placement inside the screen.
- one-breakpoint-set — applies — how: the phone breakpoint from the app's breakpoint tokens, no new one.
- app-list-container — exception — why: Dandan asked (2026-11-27) for the stock count's phone rows to be two lines, name above the controls; the rows stay in the list container.
- row-action-icons — exception — why: no row action added.
- live-summary — exception — why: no summary box.
- confirm-destructive-action — exception — why: nothing deleted.
- empty-state-on-list — exception — why: no new list.
- loading-and-error-states — exception — why: no new request.
- unsaved-changes-on-leave — exception — why: no form change.
- leave-and-return — exception — why: no navigation.
- unit-dropdown-add — exception — why: the unit dropdown is unchanged.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a cook counting stock on a phone, I want each item's name on its own line, so I can read it and still reach the
  controls under it.

## Functional Requirements
- "More" sign: larger, higher-contrast edge sign (for example a solid chevron on a soft fade, using the theme's accent
  token) on the side that has more; same behaviour as today otherwise.
- Stock count row: wrap the name cell in one container and the unit cell, counted cell and the row's other controls in
  a second; at the phone breakpoint the row becomes two lines (name, then controls); above it, one line as today.
- Tooltip: at the phone breakpoint (or a touch-only pointer), a tap opens; the next pointer-down anywhere or any
  scroll closes. Above it, hover/focus open and leave/blur close; a click never opens or pins.

## UI/UX Notes
- Use existing tokens only; no new colour.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] F1: Tooltip opens on tap only on phones and closes on any tap or scroll; hover-only elsewhere — src/app/shared/tooltip/tooltip.directive.ts
- [x] F2: Make the inside "more" sign clearly visible — src/app/shared/scroll-rail/scroll-rail.component.scss
- [x] F3: Stock count rows: name container above a controls container on phones — src/app/pages/inventory/components/stock-count/stock-count.component.html
- [x] F4: Run every automatic check and paste the outputs under Execution Notes — plans/762-house-style-grading-round-three.plan.md

## What happens when
- A laptop with a touch screen above the phone breakpoint: hover rules apply; a tap does not pin.
- The tooltip is open and the user taps another blocked control on a phone: the first closes, the second opens.

## Technical Considerations
- Run branch: a new run cut from `orch/biz-house` (ca7e3b32). Do not run browser checks.

## Out of Scope
- Other list pages' phone layouts.

## Critical Questions
- none

## Execution Notes

- `scope-check.mjs --drift` → `REALITY: clean` (Step 0 not run).
- F1: tap mode is `TOOLTIP_TAP_QUERY` (phone width or no hover). A tap opens; the next press anywhere or any scroll
  closes; above it a click or tap never opens or pins. `tooltipOnClick` now has no effect (still declared).
- F2: `.sr-more__badge`, a solid round chevron in `--color-primary` on a wider fade.
- F3: `.stock-count__name-box` + `.stock-count__controls`, `display: contents` above a phone, subgrid lines on a phone
  (measured by a spec in the phone-width test window).
- `behaviour:` the sign uses `--color-primary` (themed), not the unused purple `--color-accent` — reverse: swap the token
  in `.sr-more__badge`.
- `behaviour:` a mouse in a phone-width window still hovers as before (a finger never does); only a tap-opened box is
  closed by a press on its own control — reverse: skip hover in tap mode in `canHover_`.
- `behaviour:` focus that comes from a press opens nothing, text fields included (so a click or tap never opens above a
  phone) — reverse: drop the `pressed_` guard in `onFocusIn`.
- `behaviour:` on a phone the "product" column heading has its own line above the amount / unit / counted headings —
  reverse: hide `.stock-count__head-name` in the phone block.
- Checks (final code): `pnpm run build` → 0; `pnpm run lint` → 0 (0 errors, 69 warnings, none in changed files);
  `pnpm run test:ci` → 0, `TOTAL: 3103 SUCCESS`; orch-state prepare → ok; kit-manifest-check → ok; `scope-check.mjs
  --diff=origin/orch/biz-house2` → `SCOPE: ok` (the main folder's copy of the script reads the main folder, so the
  worktree's copy was used); kit-checks → `KIT_CHECKS: ok (6 checks)`; override-check → ok; lint:icons → 0;
  lint:no-native-select → 0; plan-ledger-check → OK; breadcrumbs-check → `BREADCRUMBS: clean`; ci-scope-check →
  skipped; `scope-check.mjs --arch` → `ARCH: ok INV-none, INV-6`; inventory --check → `INVENTORY: ok`; log-query →
  `SKIP: no database configured`.
