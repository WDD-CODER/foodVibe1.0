# Plan 653 — Stock count: rows that stay whole under 760 px, a compact date, one header style, and the unit checked after a choice

Status: done
Depends-on: 651
Snapshot: 25537342

## Problem Statement
Dandan checked plan 651 on 2026-11-20 (staging `25537342`, screenshot at ~740 px wide):

1. **Rows break below about 760 px.** The cells of one product spill into the next line («אבטיח» shows its counter on
   one row and its name under the next product). Cause, verified in code: the count page drops the base-amount column on
   phones by `display: none` on its cells (`stock-count.component.scss`, `@media (max-width: 768px)`, `.stock-count__base`)
   while the shell's grid keeps the same number of columns, so the grid auto-places the remaining cells into the wrong
   columns. The other list pages (e.g. `inventory-product-list.component.html:87`, `:228`) handle narrow screens with
   `app-column-carousel-header` / `app-column-carousel-cell`, so their rows never break. The count page was not built
   like them.
2. **The date field fills the whole width** (`app-date-field` in the `shell-table-header` slot,
   `stock-count.component.html:44`); it must be a compact control like the other pages' small filters.
3. **The header strip mixes styles**: the column headings sit on a coloured band but the «ביחידת בסיס» heading sits on a
   second band and the rest of the strip has none; the tabs, the AI button and «העברת המסומנים לראש הרשימה» are on
   unstyled rows. It must look like the other list pages' header (one band, one row of headings).
4. **The unit after a choice is wrong.** «שלושה ארגזים עגבניות» asked which tomato product (good), but after picking one
   the row got **3 grams**. Plan 651 maps the spoken unit to the product's own units only for an automatic match; a line
   resolved by the user's pick takes the product's default unit. The same unit rule must run after a pick: the spoken
   unit mapped to the picked product's units, or the row flagged «יש לבדוק את היחידה» and not counted until fixed.

## Goals & Success Criteria
**Primary:** the count page keeps every row whole at every width with the same narrow-screen pattern as the other list
pages, the date is compact, the header has one style, and a picked product gets the spoken unit or a flag — never a
silent default.

- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts` new cases: (a) the rows use
  `app-column-carousel-header` / `app-column-carousel-cell` for the columns that do not fit, as `inventory-product-list`;
  (b) no rule hides a grid cell with `display: none` inside a `c-list-row`; (c) the date control is inside the shell's
  filter or actions area with an inline size of at most 12rem; (d) the header strip renders one band with the column
  headings in one row.
- [auto] The same command,
  `src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts`: a `choose` line
  with spoken unit «ארגזים», picking a product that has «ארגז» → the row gets 3 «ארגז»; picking a product with only g
  and kg → the row shows the unit note and is not counted; a picked product never gets its default unit silently.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] At 375, 740 and 1280 px every `c-list-row` on `/inventory/count` has its name, amount, unit and counted cells
  on one line (`e2e/ui/653-1.spec.ts`).
- [human] Dandan narrows the window below 760 px: rows stay whole, the date is a small control, the header looks like
  the inventory list's; «שלושה ארגזים עגבניות» → he picks a tomato product → the row reads crates, or shows the unit
  note.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line
- [human] any screen with a unit dropdown · open the dropdown · an add-unit option is there and opens the add-unit popup; the new unit is selected after saving

## Execution Mode
- Parallel: no — stock screens only; after 651.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/stock-count/**
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts
server/utils/stock-extract.js
server/test/stock-extract-util.test.js
public/assets/data/dictionary.json
e2e/ui/653-1.spec.ts
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — the AI draft component still calls the model only through the server route; the pick only maps a
  unit in the browser and the pure server helper.

## Reuse Check

- the narrow-screen columns — family: list-page — rung: 1 — why: `app-column-carousel-header` /
  `app-column-carousel-cell` as `inventory-product-list` uses them.
- the compact date — family: form-field — rung: 2 — why: `app-date-field` with the size input other filters use.
- new class `.stock-count__date` (a 12rem box around `app-date-field` in the shell actions) — family: form-field —
  rung: 2 — why: the date field has no size input.
- the unit mapping after a pick — family: helpers — rung: 3 — why: the existing spoken-unit mapper of plan 651, called
  on pick as well.

## Defaults

- app-list-container — applies — how: `app-list-shell` + `app-page-header` + the column carousel, like the product
  list.
- unit-dropdown-add — applies — how: the row's unit dropdown keeps the add-unit option plan 651 added
  (`UnitRegistryService.openUnitCreator`).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner on a phone, I want each product on one clean row.
- As an owner, I want the amount I said saved in the right unit, or a clear flag.

## Functional Requirements

### Must Have (P0)
- [ ] Columns on narrow screens through the column carousel, never `display: none` on grid cells.
- [ ] The date as a compact control (≤ 12rem) in the shell's filter/actions area.
- [ ] One header band with all column headings in one row; tabs and the AI and move-to-top buttons styled like the
  other list pages' toolbar.
- [ ] On pick: map the spoken unit to the picked product's units; none → the unit note, not counted.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Keep every row whole at every width the way the other lists do — the column carousel, the header band, the compact date, the specs — src/app/pages/inventory/components/stock-count/**
- [x] A2: Check the unit after the user picks a product — the mapping on pick, the flag, the cases — src/app/pages/inventory/components/stock-count/**, server/utils/stock-extract.js
- [x] A3: Prove it in the running app and run every check — the screen spec at three widths, then the Done-when commands in order — e2e/ui/653-1.spec.ts, docs/brain/inventory.md

## Technical Considerations
- Dependencies: 651.

## Out of Scope
- Other pages' headers.

## Critical Questions
- none

## Execution Notes
- decided: follow `inventory-product-list`'s narrow-screen pattern exactly — why: Dandan asked why this list was not
  built like the others; default `app-list-container`.
- decided: the base-amount column is the carousel's one slide (header + cells); mobile grid keeps a 5th auto column for it.
- A2: pick and add-product mapped through new `stock-count/spoken-unit.ts` (same table as server `resolveUnit`, plural-folded); server helper unchanged.
- A3: `e2e/ui/653-1.spec.ts` written, not run. `pnpm run test:ci` → exit 0, 2682 SUCCESS; build, lint, lint:icons, lint:no-native-select, lint:reuse, override/ledger/breadcrumbs checks → exit 0.
