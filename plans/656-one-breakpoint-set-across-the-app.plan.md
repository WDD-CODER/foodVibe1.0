# Plan 656 — One breakpoint set across the app: phone ≤767, tablet ≤1023, desktop ≥1024

Status: draft
Depends-on: 655
Snapshot: ffc8f1e0

## Problem Statement
Dandan, 2026-11-21: "why do we have so many [breakpoints]? … its not possible to have so many". Measured on staging
`ffc8f1e0`:

- Two named sets live side by side at the top of `src/styles.scss`: the original `$break-mobile` 768 /
  `$break-tablet` 900 / `$break-desktop` 1200, and the half-finished redesign's (plan 305) `$break-xs-max` 479 /
  `$break-phone-max` 767 / `$break-tablet-max` 1023.
- Most screens use neither: hand-typed widths in `@media` — 620px (28 places), 768px (24), 767px (6), 1023px (4),
  600 (4), 900, 621, 480, 430, 1100 (2 each), 640, 1699 (1 each) — across 72 `.scss` files with an `@media`.
- The browser code has its own copies: `'(max-width: 768px)'` in `src/app/core/utils/panel-preference.util.ts:4` and
  `src/app/shared/column-carousel/column-carousel-swipe.ts:28`, `'(max-width: 1023px)'` in
  `src/app/core/utils/collapsible-categories.util.ts:4`, `'(min-width: 1024px)'` in
  `src/app/core/utils/desktop-detection.util.ts:4`, `'(max-width: 767px)'` in `src/app/pages/cook-view/cook-view.page.ts:1129`
  and `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts:67`.
- So rows break at a slightly different width on each page (the stock count broke at ~760 px, plan 653).

Dandan's decision: one set — phone up to 767 px, tablet up to 1023 px, desktop from 1024 px — enforced always
(default `one-breakpoint-set`, turned on 2026-11-21), and every existing layout fixed to it. Plan 655's "below
desktop" for the count's counted checkbox and base amount becomes `≤ 1023px` here (Dandan: "655 at 1023").

## Goals & Success Criteria
**Primary:** every layout change in the app happens at 767/768 or 1023/1024 px through one set of names, in the styles
and in the browser code, and the default's check holds every future change to it.

- [auto] `node scripts/kit-checks.mjs --base origin/main` exits 0 and `_shared/debt-baseline.json` has no entry left
  under `default.one-breakpoint-set` (every existing gap fixed, not baselined).
- [auto] `pnpm run test:ci` passes, including the new `src/app/core/utils/breakpoints.spec.ts`: (a) the browser
  constants `PHONE_MAX` 767, `TABLET_MAX` 1023 and the queries `PHONE_QUERY` `(max-width: 767px)`, `TABLET_DOWN_QUERY`
  `(max-width: 1023px)`, `DESKTOP_QUERY` `(min-width: 1024px)` equal the values read from `src/styles.scss`; (b) no
  `.ts` file under `src/app` other than `breakpoints.ts` holds a `(max-width: …px)` / `(min-width: …px)` text.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] At 375, 800 and 1280 px, the inventory product list, the recipe book, the suppliers list, the stock count, the
  dashboard and the main header render without a horizontal scroll and every list row stays on one line
  (`e2e/ui/656-1.spec.ts`, one screenshot per page and width kept for the Human).
- [human] Dandan opens the main pages on a phone, at a half-width laptop window and at full width: each page changes
  layout at the same widths, nothing overlaps or breaks.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line

## Execution Mode
- Parallel: no — touches the styles of almost every screen; runs alone on its own run branch and is merged into
  staging only after Dandan's check.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/styles.scss
src/**/*.scss
src/app/core/utils/breakpoints.ts
src/app/core/utils/breakpoints.spec.ts
src/app/core/utils/panel-preference.util.ts
src/app/core/utils/collapsible-categories.util.ts
src/app/core/utils/collapsible-categories.util.spec.ts
src/app/core/utils/desktop-detection.util.ts
src/app/shared/column-carousel/column-carousel-swipe.ts
src/app/shared/column-carousel/column-carousel.spec.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts
_shared/debt-baseline.json
e2e/ui/656-1.spec.ts
src/app/core/breadcrumbs.md
src/app/core/services/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/workflow-kit/manifest.json
src/app/pages/inventory/components/stock-count/stock-count.component.ts
src/app/shared/partial-cost-badge/partial-cost-badge.component.ts
src/app/core/components/header/header.component.spec.ts
scripts/test/breakpoints-no-literals.test.mjs
```

`src/styles.scss` may be rewritten at its top (the breakpoint names) and in its `@media` lines: Dandan asked for the
old names to go. Every other existing entry stays.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-3: preserves — only `.scss` widths under `src/app/pages/metadata-manager/**`; no data or server change.
- INV-6: preserves — only `.scss` widths of AI screens (`src/app/**/*ai*`); no model call changes.

## Reuse Check

- the breakpoint names — family: engine-classes — rung: 1 — why: the existing names at the top of `src/styles.scss`,
  cut down to one set.
- the browser breakpoint constants — family: helpers — rung: 3 — why: one new pure file `breakpoints.ts` replaces six
  copies; no service.

## Defaults

- one-breakpoint-set — applies — how: every `@media` uses `$break-phone-max`, `$break-tablet-min`, `$break-tablet-max`,
  `$break-desktop-min`; the browser uses `breakpoints.ts`.
- app-list-container — applies — how: list rows stay on one line at the new widths (the column carousel switches at
  767 px).
- leave-and-return — exception — why: no page change.
- unit-dropdown-add — exception — why: no dropdown change.
- hints-in-tooltips — exception — why: no dialog change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want every page to switch between phone, tablet and desktop layouts at the same widths, so nothing
  breaks halfway on one page and not another.

## Functional Requirements

### Must Have (P0)
- [ ] `src/styles.scss`: one set — `$break-phone-max: 767px`, `$break-tablet-min: 768px`, `$break-tablet-max: 1023px`,
  `$break-desktop-min: 1024px`. `$break-mobile`, `$break-tablet`, `$break-desktop` and `$break-xs-max` are removed
  after every use moves; the old KNOWN COLLISION note goes.
- [ ] Every `@media` width in `src/**/*.scss` uses those names. Mapping of a hand-typed width: up to 900 → phone
  (`max-width: $break-phone-max` / `min-width: $break-tablet-min`); above 900 up to 1200 → tablet
  (`$break-tablet-max` / `$break-desktop-min`); 1699 → `$break-desktop-min` unless it is a wide-screen cap, then a
  `min-width` on a container instead of a breakpoint. Each moved rule is checked at both sides of its new width.
- [ ] `src/app/core/utils/breakpoints.ts`: `PHONE_MAX`, `TABLET_MAX`, `PHONE_QUERY`, `TABLET_DOWN_QUERY`,
  `DESKTOP_QUERY`; the six browser copies import it.
- [ ] The stock count's 655 rule (counted checkbox, base amount on tap) switches at `$break-tablet-max`.
- [ ] `_shared/debt-baseline.json`: the `default.one-breakpoint-set` entries removed as their files are fixed.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Make one set of names — the four names, the browser constants file and its spec, the six browser copies — src/styles.scss, src/app/core/utils/breakpoints.ts, src/app/core/utils/breakpoints.spec.ts, src/app/core/utils/panel-preference.util.ts, src/app/core/utils/collapsible-categories.util.ts, src/app/core/utils/desktop-detection.util.ts, src/app/shared/column-carousel/column-carousel-swipe.ts, src/app/pages/cook-view/cook-view.page.ts, src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts
- [ ] A2: Move the shared and core pieces to the names — every `@media` under src/app/shared and src/app/core and src/app/appRoot, their debt entries — src/**/*.scss, _shared/debt-baseline.json
- [ ] A3: Move every page to the names — every `@media` under src/app/pages, their debt entries, the count's 1023 — src/**/*.scss, _shared/debt-baseline.json
- [ ] A4: Remove the old names and prove it at three widths — the old names gone, the screen spec, then the Done-when commands in order — src/styles.scss, e2e/ui/656-1.spec.ts, docs/brain/inventory.md

## Technical Considerations
- Dependencies: 655 (the count page's narrow rules land first).
- A moved rule that changes when it applies (620 → 767, 1200 → 1023) is a visible change: the screen spec keeps one
  screenshot per page and width for Dandan.

## Out of Scope
- Redesigning any page. Only the width at which an existing rule applies changes.

## Critical Questions
- none

## Execution Notes
- decided: phone ≤767 / tablet ≤1023 / desktop ≥1024 — why: Dandan chose the recommended set; it is the redesign's set
  and the usual device split.
- decided: run on its own run branch, served in its own slot, merged into staging only after Dandan's check — why:
  Dandan, "in a separate worktree cause this can get things messed up".
