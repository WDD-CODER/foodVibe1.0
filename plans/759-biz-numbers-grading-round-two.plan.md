# Plan 759 — Dish VAT in the shared tooltip, the month picture filled from the forecast, one chip behaviour

Status: draft
Depends-on: none
Track: code
Snapshot: 86e0b119

## Problem Statement
Dandan graded the biz-fixes cards on 2026-11-27 (run biz-fixes, plans 748–750). Three cards failed; his words, cleaned
from voice dictation:

- **⑥ (restaurant menu):** "the tooltip should use the shared tooltip! And it needs to be a statement 'the VAT is =
  xxx', where xxx is the total amount of the VAT on this item."
- **⑨ (monthly plan):** the figures update live, but «תמונת החודש» is wrong while only some actuals are typed: with
  one actual entered, the picture treats it as the only actual outcome. In the summary, a line with no actual should
  use its forecast by default, shown very simply (little text) as coming from the forecast, so the user does not have to
  type every actual to get an up-to-date picture; whenever the user types an actual, that line switches to it.
- **⑫ (monthly plan):** every forecast and actual box behaves like the forecast chip does now, as in his screenshot:
  closed, a chip; empty → the chip shows only its word («תחזית» / «בפועל»); filled → one chip «תחזית · ‎₪158,000.00» /
  «בפועל · ‎₪100,000.00»; pressing the chip opens the box; when typing ends the box closes back to the chip. The same
  behaviour in every forecast and actual pair on the page.

The run branch `orch/biz-house` is `orch/biz-fixes` (plans 723–729, 748–750) with `orch/house-style-ui` (743–747, 758)
merged in, so the shared tooltip (`src/app/shared/tooltip/tooltip.directive.ts`, `[appTooltip]`, class `.c-tooltip`,
plan 744) is available to the biz pages.

## Goals & Success Criteria
**Primary:** the three graded cards pass: the VAT of each dish shows in the shared tooltip as an amount, the month
picture is complete from the first typed actual, and every forecast/actual pair is the same chip.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run test:ci` exits 0.
- [auto] `src/app/core/engine/month-plan.spec.ts` (or the spec of the function that builds the actual column): with
  revenue actual 100,000 and every other actual empty, the actual column uses the forecast for food cost, labour and
  fixed costs, marks those three as "from forecast", and works out prime cost and profit from the mixed values; with
  every actual typed, nothing is marked.
- [auto] `src/app/shared/month-figures/month-figures.component.spec.ts`: a cell that comes from the forecast renders
  with the faded class and the shared tooltip text «מהתחזית»; a typed actual renders plain.
- [auto] `src/app/pages/monthly-plan/components/month-pair/month-pair.component.spec.ts`: an empty pair shows two chips
  with only their words; a filled one shows «word · amount»; pressing a chip opens its box; blur or Enter closes it
  back; the same for the forecast and the actual side.
- [auto] `src/app/pages/restaurant-menu/restaurant-menu.page.spec.ts`: hovering a dish's «מחיר ללא מע"מ» cell opens
  the shared tooltip with «מע"מ: ‎₪X» where X is the price with VAT minus the price without VAT (rounded by
  `src/app/core/engine/rounding.ts`); a «עוסק פטור» business shows «עוסק פטור — אין מע"מ»; no native `title`
  attribute is left on that page for the VAT note.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/759-biz-numbers-grading-round-two.plan.md` → `ARCH: ok`;
  `node scripts/scope-check.mjs --reuse --plan=plans/759-biz-numbers-grading-round-two.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0; `node scripts/inventory.mjs --check` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] Signed in as `demo_host`, on «תפריט המסעדה» hover the «מחיר ללא מע"מ» of a dish: the app's tooltip box
  (the same look as elsewhere) says «מע"מ: ‎₪…» with that dish's VAT amount.
- [human] On «תכנון חודשי», «נובמבר 2026» (forecast only): type only «הכנסות» בפועל 100000: «תמונת החודש» בפועל
  shows food cost, staff cost and fixed costs taken from the forecast, faded, and a full profit figure; hovering a
  faded figure says it comes from the forecast; typing an actual for staff cost turns that line plain.
- [human] On the same month every pair, in every card, is two chips: empty shows «תחזית» / «בפועל» alone, filled shows
  «תחזית · ‎₪…» / «בפועל · ‎₪…»; pressing a chip opens its box and leaving the box closes it back to the chip.

## Execution Mode
- Parallel: no — one plan.
- Concurrent plans: none in this run.
- Isolated DB: no — nothing new is stored.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/restaurant-menu/**
src/app/pages/monthly-plan/**
src/app/shared/month-figures/**
src/app/core/engine/month-plan.ts
src/app/core/engine/month-plan.spec.ts
src/app/**/breadcrumbs.md
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
- INV-1: preserves — no permission change; salary lines stay owner-only (ADR 0034); only how figures are shown.
- INV-none: preserves — nothing new is stored; the forecast fill-in is worked out in the browser for display, saved
  actuals are unchanged.

## Reuse Check
- none — uses the shared tooltip (`[appTooltip]`, family `tooltip`), `app-month-figures` (family `month-figures`) and
  the existing `month-pair` component; money through `src/app/core/engine/rounding.ts`.

## Defaults

- hints-in-tooltips — applies — how: the shared tooltip directive `[appTooltip]` (src/app/shared/tooltip/).
- live-summary — applies — how: `app-month-figures` recalculates from the draft as the user types, now with the
  forecast filling the empty actuals.
- row-action-icons — exception — why: no row action added.
- disabled-explains-why — exception — why: no control is disabled by this plan.
- confirm-destructive-action — exception — why: no new delete.
- empty-state-on-list — exception — why: no list added.
- loading-and-error-states — exception — why: no new data request.
- unsaved-changes-on-leave — exception — why: the existing guard is unchanged.
- leave-and-return — exception — why: no navigation.
- app-list-container — exception — why: no list added.
- one-breakpoint-set — exception — why: no new breakpoint.
- anchored-popup — exception — why: the tooltip is the shared one.
- unit-dropdown-add — exception — why: no dropdown.
- modal-centered — exception — why: no popup.
- modal-scrollable — exception — why: no popup.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want to see a dish's VAT amount at a glance, so I know what goes to the tax office.
- As an owner, I want the month picture to be complete from my first real number, so I see where the month is heading
  without typing everything.

## Functional Requirements
- **VAT tooltip:** on the restaurant menu, the «מחיר ללא מע"מ» cell of each row gets `[appTooltip]` with
  «מע"מ: ‎₪X» (X = with-VAT price − without-VAT price, money-rounded). The column title's note moves to the shared
  tooltip too, as a short statement «מע"מ {{rate}}%» («עוסק פטור — אין מע"מ» for patur). No native `title` remains.
- **Forecast fill-in:** the actual column of the month picture uses, for each input line (revenue, food cost, staff
  cost, fixed costs, and each fixed line inside the fixed sum), the typed actual when there is one, else the forecast.
  A filled-in value is marked "from forecast": faded text plus the shared tooltip «מהתחזית — עוד לא הוזן בפועל». The
  derived rows (prime cost, profit, break-even, room for the team) are worked out from the mixed values and are faded
  when any of their parts is filled in. With no actual at all, the actual column stays «לא הוזן» (nothing to project).
  The «חלקי» tag gives way to this mark.
- **One chip behaviour:** `month-pair` shows both sides as chips. Empty: the word alone, gray. Filled: «word · amount»,
  teal. Press → its box opens (the actual box keeps the faded forecast placeholder of plan 749). Blur or Enter → back to
  the chip. Every card of the page (revenue, food, staff, fixed lines, the estimated fixed total) uses it.

## UI/UX Notes
- Match Dandan's screenshot: two rounded chips side by side, «תחזית · ‎₪158,000.00» and «בפועל · ‎₪100,000.00».
- Faded = the same muted text colour the page already uses for placeholders; no new colour.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] C1: Show each dish's VAT amount in the shared tooltip and move the column note to it — src/app/pages/restaurant-menu/restaurant-menu.page.html
- [ ] C2: Fill empty actuals from the forecast in the actual column and mark them — src/app/core/engine/month-plan.ts
- [ ] C3: Show filled-in figures faded with the shared tooltip in the month picture — src/app/shared/month-figures/month-figures.component.html
- [ ] C4: Make every forecast/actual pair the same chip that opens and closes — src/app/pages/monthly-plan/components/month-pair/month-pair.component.ts
- [ ] C5: Run every automatic check and paste the outputs under Execution Notes — plans/759-biz-numbers-grading-round-two.plan.md

## What happens when
- A fixed line has a forecast but no actual, another has an actual: the fixed actual is their sum, marked as partly
  from forecast.
- A line has neither forecast nor actual: it counts as 0 and the picture says so as today.
- The owner types an actual equal to the forecast: plain (typed), not faded.

## Technical Considerations
- Run branch `orch/biz-house` (biz-fixes + house-style). The merge order to main stays: the biz branches and house
  style together through this branch, restaurant last.
- Do not run browser checks; the Human checks the cards.
- Model changes: none. Backend / API: none. Data / migration: none. Security: none.

## Out of Scope
- Saving the filled-in forecast as an actual (display only).
- Closing a month (later slice).

## Critical Questions
- none

## Execution Notes
