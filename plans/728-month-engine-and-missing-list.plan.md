# Plan 728 — Month engine: profit, prime cost, break-even and an honest missing list on the monthly page

Status: draft
Depends-on: 727
Track: code
Snapshot: 33a6c572

## Problem Statement
Plan 727 stores a month with its revenue and its targets, but shows no result. Monthly slice 2 of the revised order
("engine and missing list with null-vs-zero, prime cost, break-even and completeness") turns the stored numbers into the
month's figures, in one tested place. The research report ("Restaurant dish and month analytics", sections "A monthly
P&L rests on prime cost and honest blanks" and "Updated decisions") and Dandan's answer of 2026-11-24 ("decisions: all
recommended") fix the rules:

- monthly 8 (keep): a second engine file that names C-PRICING (`src/app/core/engine/event-pricing.ts:4`) as its
  counterpart, plus one sentence added to the contract. No component computes profit.
- N-M2: an amount that is not entered stays `null`, never a silent 0; the month shows a completeness badge ("1 of 4
  entered") and profit and break-even carry the label «חלקי» until the key inputs exist.
- N-M7: break-even = fixed ÷ (1 − variable %).
- monthly 5 (keep, reworded): recommended dish price = plate cost ÷ target food-cost %, computed net and shown with
  VAT (× 1 + the month's VAT rate).
- N-M4: the Israeli bands are shown next to the actual percentages.
- The research's headline: prime cost (food + labour) is the main figure, and it needs labour.

The feasibility audit's biggest risk (`docs/finance/monthly-planning-feasibility.md`, M10, section 5 "Other numbers")
is a month with no data counted as zero; this plan makes every figure say what it is missing.

Verified on `origin/main` 33a6c572 (plus plan 727 as written):
- `src/app/core/engine/event-pricing.ts:4` — the contract line "Contract C-PRICING (plan 445): the only place profit,
  profit %, minimum price and safety margin are computed."; `computeEventPricing` (`:70-106`) divides by
  `1 - target / 100` (`:88`).
- `src/app/core/engine/rounding.ts` — `roundMoney` (`:20`), `formatMoney` (`:44`), `formatPct1` (`:48`): the only money
  and percent rounding (family helpers).
- Plan 727 gives `MonthPlan` (`revenue.plan`, `revenue.actual` nullable, `targets` five keys, `vatRatePct`,
  `dealerType`, `status`) and `MONTH_TARGET_BANDS` in `shared/schemas/month/month-rules.ts`; the page is
  `src/app/pages/monthly-plan/monthly-plan.page.*`.
- Food cost, labour and fixed costs are not stored yet (plan 729 adds fixed, labour and typed purchases; invoices come in
  a later slice). The engine takes them as nullable inputs now, so plan 729 only fills them.

## Goals & Success Criteria
**Primary:** the monthly page shows a «תמונת החודש» card with a plan column and an actual column — revenue, food cost,
labour, prime cost, fixed costs, profit, break-even and room for the team — with «לא הוזן» for what is missing, a badge
«הוזנו 1 מתוך 4», «חלקי» beside every figure that rests on a missing input, the band beside each actual percent, and a
small dish-price calculator.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `pnpm run test:ci` exits 0, including `src/app/core/engine/month-plan.spec.ts` (A1, A2) and `src/app/shared/month-figures/month-figures.component.spec.ts` (A4) and `src/app/pages/monthly-plan/components/dish-price-calc/dish-price-calc.component.spec.ts` (A5).
- [auto] `src/app/core/engine/month-plan.spec.ts` covers: break-even 4000 fixed at 30% variable → 5714.29; plate 5.00 at 30% food target → net 16.67, with 18% VAT 19.67, `patur` 16.67; food % ≥ 100 → break-even `null`; revenue `null` → every percent `null`; an entered 0 counts as entered; a `null` input marks `partial` and is listed in `missing`.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/728-month-engine-and-missing-list.plan.md` → `ARCH: ok` (or `ARCH: skipped`); `node scripts/scope-check.mjs --reuse --plan=plans/728-month-engine-and-missing-list.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] On «תכנון חודשי», open a month with «הכנסה צפויה» 100000 and nothing else: «תמונת החודש» shows «הוזנו 0 מתוך 4», the actual column shows «לא הוזן» for every row, and the plan column's profit carries «חלקי».
- [human] Type 0 in «הכנסה בפועל» and save: the badge goes to «הוזנו 1 מתוך 4» (0 counts as entered) and the actual percentages show «—», not a number.
- [human] In «מחיר מנה מומלץ» type 5 as the plate cost with the food target at 30%: it shows «16.67 ₪ לפני מע״מ» and «19.67 ₪ כולל מע״מ».

## Execution Mode
- Parallel: yes — touches only the engine folder (one new file, one comment line in `event-pricing.ts`), one new
  shared card and the monthly page folder of plan 727.
- Concurrent plans: any but 729 (which builds on this one).
- Isolated DB: no — no data change.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/engine/month-plan.ts
src/app/core/engine/month-plan.spec.ts
src/app/core/engine/event-pricing.ts
src/app/pages/monthly-plan/**
src/app/shared/month-figures/**
src/app/pages/monthly-plan/monthly-plan.page.spec.ts
src/app/shared/month-figures/month-figures.component.spec.ts
src/app/pages/monthly-plan/components/dish-price-calc/dish-price-calc.component.spec.ts
src/app/core/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
src/app/pages/menu-intelligence/services/menu-event-save.service.spec.ts
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
- INV-none: preserves — no server, schema, route or permission change: the engine runs in the browser on the month the
  plan 727 router already returns to the owner or the consultant (staff never reach the page or the data). Money stays
  owner and consultant only; the module gate is plan 727's `requireModule('monthly_plan')` and `monthlyPlanGuard`.
- C-PRICING (not an INV): `event-pricing.ts:4` gains one sentence naming `month-plan.ts` as the monthly counterpart
  (monthly decision 8, approved 2026-11-24); events keep their engine untouched.

## Reuse Check
- `month-plan` engine (`monthFigures`, `monthInputOf`, `breakEven`, `dishPrice`, `bandOf`) — family: event-plan — rung: 3 — why: the costing engine family; a second file beside `event-pricing.ts` that names C-PRICING as its counterpart (monthly decision 8), rounding only through `rounding.ts`
- `month-figures` — family: none — rung: 4 — why: no shared piece shows a plan-versus-actual table with missing marks; layout-only classes `.mf`, `.mf__head`, `.mf__title`, `.mf__muted`, `.mf__grid`, `.mf__row`, `.mf__row--head`, `.mf__label`, `.mf__cell`, `.mf__money`, `.mf__money--neg`, `.mf__pct`; built in `src/app/shared/month-figures/` (shared code, never page-local) with a registry entry, so a later month or dish screen reuses it rather than copying
- `dish-price-calc` — family: number-box — rung: 2 — why: layout-only classes `.dpc`, `.dpc__title`, `.dpc__field`, `.dpc__label`, `.dpc__suffix`, `.dpc__muted`, `.dpc__result`; one `appNumberBox` for the plate cost and two read-only result lines; no new control
- «חלקי» and band tags — family: chip — rung: 2 — why: `.c-chip--tag --amber` / `--teal` as they are; `app-partial-cost-badge` is the event's missing-price picker and does not fit a month figure


## Adopt Check
- month-figures — verdict: skip — why: an eight-row plan-versus-actual card with app-specific missing and band marks; a table or grid package would add a dependency for one small card

## Defaults

- confirm-destructive-action — exception — why: nothing is deleted.
- empty-state-on-list — exception — why: no list; the card is part of an opened month (plan 727's empty state covers no month).
- loading-and-error-states — exception — why: no new data request; the card computes from the month the page already loaded (plan 727 owns loading and errors).
- unsaved-changes-on-leave — exception — why: the calculator's plate cost is a scratch number that is never saved; the month form keeps plan 727's guard.
- hints-in-tooltips — applies — how: the break-even rule and the room-for-the-team rule are a native `[attr.title]` plus `[attr.aria-label]` on each row label, not text on the card.
- leave-and-return — exception — why: the page sends the user nowhere.
- app-list-container — exception — why: a fixed table of eight figures, not a list.
- one-breakpoint-set — applies — how: no new `@media`; below `$break-phone-max` the two columns stay, labels wrap.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want to see what my month's plan leaves as profit and where I break even, so I know how much I must sell.
- As a restaurant owner, I want the screen to tell me what I have not entered yet, so I never trust a profit that only looks good because a cost is missing.
- As a chef, I want to type a plate cost and get the menu price that keeps my food target, so pricing a dish takes seconds.

## Functional Requirements

### Must Have (P0)
- [ ] **Engine** `src/app/core/engine/month-plan.ts` (pure, no Angular), header comment: "Monthly counterpart of
  C-PRICING (`event-pricing.ts`): the only place a month's profit, prime cost, break-even and recommended dish price are
  computed."
  - `MonthInput` = `{ revenue: Pair, foodCost: Pair, labour: Pair & { estimate: boolean }, fixed: Pair & { entered:
    number, lines: number }, targets: MonthTargets, vatRatePct: number, dealerType: 'murshe' | 'patur' }`, where
    `Pair = { plan: number | null, actual: number | null }`.
  - `monthInputOf(month: MonthPlan): MonthInput` — maps the stored month; until plan 729 stores them, `foodCost`,
    `labour` and `fixed` are `null` pairs (`estimate: false`, `entered: 0`, `lines: 0`).
  - `monthFigures(input): { plan: MonthColumn; actual: MonthColumn; completeness: { entered: number; of: 4 }; missing:
    MissingKey[] }`. A column has `revenue`, `foodCost`, `labour`, `primeCost`, `fixed`, `profit`, `roomForTeam`,
    `breakEven` (numbers or `null`), the percents `foodPct`, `labourPct`, `primePct`, `fixedPct`, `profitPct`
    (`null` when revenue is `null` or 0), and `partial: boolean`.
  - Plan column: `foodCost` = `foodCost.plan` when typed, else `revenue.plan × targets.foodPct / 100` (marked
    `fromTarget`); `labour` and `fixed` = their plan values.
  - Actual column: each actual value as stored.
  - `primeCost = foodCost + labour`; `profit = revenue − foodCost − labour − fixed`; `roomForTeam = revenue − foodCost −
    fixed − revenue × targets.profitPct / 100` (what labour may cost while the profit target holds).
  - `breakEven(fixedCosts, variablePct)` = `fixedCosts ÷ (1 − variablePct / 100)`, with fixed costs = fixed + labour
    (labour is paid whatever the month sells) and variable % = the column's food cost % (actual when known, else the
    food target); `null` when variable % ≥ 100.
  - A `null` input is counted as 0 in a sum **and** marks every figure that uses it `partial`; it is listed once in
    `missing` (`revenue`, `foodCost`, `labour`, `fixed` per column). `completeness` counts the four actual inputs that
    are not `null` (0 counts as entered).
  - `bandOf(key, pct)` → `'below' | 'in' | 'above' | null` from `MONTH_TARGET_BANDS`.
  - `dishPrice(plateCost, foodTargetPct, vatRatePct, dealerType)` → `{ net, gross } | null`: `net = plateCost ÷
    (foodTargetPct / 100)`; `gross = net × (1 + vatRatePct / 100)` for `murshe`, `= net` for `patur` (no VAT is
    charged); `null` when the target is ≤ 0 or the cost is `null`.
  - Every money result through `roundMoney`, every percent rounded to 1 decimal.
- [ ] **Contract sentence** at `event-pricing.ts:4`: "Its monthly counterpart is `month-plan.ts` (plan 728): a month's
  profit, prime cost and break-even are computed there, never here or in a component."
- [ ] **Card `month-figures`** (`src/app/shared/month-figures/`): input `figures`
  (`monthFigures` result) and `targets`; rows «הכנסות», «עלות מזון», «עלות צוות», «עלות ראשית», «הוצאות קבועות»,
  «רווח», «נקודת איזון», «מקום לצוות», each with money and percent for plan and actual; `null` → «לא הוזן» (an input)
  or «—» (a figure that cannot be computed); `partial` → the tag «חלקי»; a plan food cost taken from the target shows
  «לפי היעד»; beside each actual percent its band tag («בטווח» teal, «מחוץ לטווח» amber); the badge
  «הוזנו {{entered}} מתוך {{of}}» at the top; under it the missing list «חסר: עלות מזון בפועל, עלות צוות בפועל …».
  A negative profit or room for the team shows in the error colour token.
- [ ] **Card `dish-price-calc`** (same folder): input `foodTargetPct`, `vatRatePct`, `dealerType`; one plate-cost box;
  shows «{{net}} ₪ לפני מע״מ» and, for `murshe`, «{{gross}} ₪ כולל מע״מ»; the line «לפי יעד עלות מזון {{pct}}%».
  The typed cost is not saved.
- [ ] **Page wiring:** the monthly page computes `figures_ = computed(() => monthFigures(monthInputOf(month)))` from the
  saved month (not the unsaved form) and shows both cards under the targets; after a save the cards update.

### Should Have (P1)
- [ ] `src/app/core/breadcrumbs.md` names `engine/month-plan.ts` as the C-PRICING counterpart;
  `src/app/shared/breadcrumbs.md` names `app-month-figures`; `src/app/pages/breadcrumbs.md` names the calculator card; `docs/brain/component-families.md`: the event-plan family lists
  the month engine, a new `month-figures` entry.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical properties only; numbers with `formatMoney` / `formatPct1`; no new `.c-*` class; no new `@media`.
- Dictionary keys (append-only, `general`): `mp_figures_title` ("תמונת החודש"), `mp_col_plan` ("תכנון"),
  `mp_col_actual` ("בפועל"), `mp_row_revenue` ("הכנסות"), `mp_row_food` ("עלות מזון"), `mp_row_labour` ("עלות צוות"),
  `mp_row_prime` ("עלות ראשית"), `mp_row_fixed` ("הוצאות קבועות"), `mp_row_profit` ("רווח"),
  `mp_row_break_even` ("נקודת איזון"), `mp_row_room_for_team` ("מקום לצוות"),
  `mp_break_even_rule` ("הוצאות קבועות וצוות ÷ (1 − אחוז עלות המזון)"),
  `mp_room_rule` ("מה שנשאר לצוות אחרי מזון, הוצאות קבועות ויעד הרווח"), `mp_partial` ("חלקי"),
  `mp_from_target` ("לפי היעד"), `mp_in_band` ("בטווח"), `mp_completeness` ("הוזנו {{entered}} מתוך {{of}}"),
  `mp_missing` ("חסר: {{list}}"), `mp_missing_revenue` ("הכנסה בפועל"), `mp_missing_food` ("עלות מזון בפועל"),
  `mp_missing_labour` ("עלות צוות בפועל"), `mp_missing_fixed` ("הוצאות קבועות בפועל"),
  `mp_dish_title` ("מחיר מנה מומלץ"), `mp_dish_cost` ("עלות מנה"), `mp_dish_net` ("{{net}} ₪ לפני מע״מ"),
  `mp_dish_gross` ("{{gross}} ₪ כולל מע״מ"), `mp_dish_rule` ("לפי יעד עלות מזון {{pct}}%").
  (`mp_not_entered` «לא הוזן» and `mp_out_of_band` «מחוץ לטווח» come from plan 727.)

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Compute a month's profit, prime cost, break-even and room for the team in one tested place — engine, input mapping, missing list, completeness, bands; spec with the Toast break-even example and every null case — src/app/core/engine/month-plan.ts, src/app/core/engine/month-plan.spec.ts
- [ ] A2: Give the recommended dish price the same tested rule, net and with VAT — dishPrice, patur without VAT; spec with the 5.00 at 30% example — src/app/core/engine/month-plan.ts, src/app/core/engine/month-plan.spec.ts
- [ ] A3: Name the month engine in the pricing contract so profit is never computed elsewhere — one sentence — src/app/core/engine/event-pricing.ts
- [ ] A4: Show the month's plan and actual figures with what is missing marked — the figures card, badge, missing list, partial and band tags; spec: null shows not entered, partial shows the tag, 0 counts as entered — src/app/shared/month-figures/**
- [ ] A5: Let the owner price a dish from its plate cost and the month's food target — calculator card; spec for murshe and patur — src/app/pages/monthly-plan/components/dish-price-calc/**
- [ ] A6: Put both cards on the monthly page, fed from the saved month — computed figures, update after save; page spec case — src/app/pages/monthly-plan/monthly-plan.page.ts, src/app/pages/monthly-plan/monthly-plan.page.html, src/app/pages/monthly-plan/monthly-plan.page.spec.ts
- [ ] A7: Add the Hebrew words — the keys of UI/UX Notes — public/assets/data/dictionary.json
- [ ] A8: Record the engine and the cards in the maps and run every automatic check — paste outputs under Execution Notes — src/app/core/breadcrumbs.md, src/app/shared/breadcrumbs.md, src/app/pages/breadcrumbs.md, docs/brain/component-families.md

## What happens when
- Revenue is 0 or `null`: all percents are «—»; money figures still show, marked «חלקי» when an input is missing.
- The food target is 100% or more: break-even is «—» (it cannot be reached); the dish price needs a target above 0.
- Costs are larger than revenue: profit and room for the team are negative and shown in the error colour; nothing is
  hidden.
- The owner types into the form but does not save: the cards keep showing the saved month (they never show figures of
  numbers that are not stored).
- A closed month (later slice): the cards show the same figures; nothing here writes.

## Technical Considerations
- Dependencies: plan 727 (the month, `MONTH_TARGET_BANDS`, the page). Plan 729 fills `foodCost`, `labour` and `fixed`
  in `monthInputOf`; this plan's engine API must not change for that.
- **Planner choices for Dandan to grade:**
  - `behaviour:` break-even treats labour as a fixed cost (fixed costs = fixed lines + labour) and food cost as the only
    variable cost — reverse: variable % = food % + labour %.
  - `behaviour:` completeness counts four actual inputs (revenue, food cost, labour, fixed) — reverse: count each fixed
    line separately (plan 729 shows the per-line count «3 מתוך 9 שורות» on its own card either way).
  - `behaviour:` the planned food cost falls back to revenue × food target and is labelled «לפי היעד» — reverse: leave it
    «לא הוזן» until typed.
- The engine is browser-only (beside C-PRICING). If a later slice needs the figures on the server (month close, a
  dashboard card computed server-side), move the pure file to `shared/schemas/month/` and re-export it here, as
  `units.ts` re-exports `shared/schemas/units/to-base.ts`.
- Cost: none. Security: no new data path.

## Out of Scope
- Storing fixed lines, labour or purchases (plan 729); invoices as food cost; daily target and break-even progress
  (N-M7 daily part); picking a dish from the standing menu in the calculator (dish slice after plan 725); overhead per
  dish sold.

## Critical Questions
- none — Dandan answered "decisions: all recommended" (2026-11-24); the three unasked choices are logged above as
  `behaviour:` decisions for him to grade.

## Execution Notes
- Planner 2026-11-24: written from the research report and Dandan's decisions.
