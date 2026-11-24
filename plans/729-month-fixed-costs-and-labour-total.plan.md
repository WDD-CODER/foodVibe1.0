# Plan 729 — Monthly plan: fixed cost lines or one rough total, the labour total and typed purchases

Status: draft
Depends-on: 728
Track: code
Snapshot: 33a6c572

## Problem Statement
After plans 727 and 728 a month has revenue and targets, and the engine already shows what is missing: food cost,
labour and fixed costs. Monthly slice 3 of the revised order ("fixed lines, rough mode and the labour total with burden
factor, where labour moves in from old slice 4") lets the owner fill them. The research report ("Restaurant dish and
month analytics", sections "A monthly P&L rests on prime cost and honest blanks" and "Updated decisions") and Dandan's
answer of 2026-11-24 ("decisions: all recommended") set the rules:

- monthly 10 (change): labour as a total comes early, because prime cost needs it; per-employee lines come late
  (N-M3, ADR 0034) and payslip capture is deferred.
- N-M1: the owner types an employer-cost total (from the payroll provider or the accountant); if only gross pay is
  known, the app multiplies it by an editable factor (default 1.25) and labels the result «הערכה».
- N-M8: kashrut supervision is on the starter fixed lines, beside rent, arnona, electricity, water, gas, insurance and
  marketing (the feasibility audit's M6 starter list, `docs/finance/monthly-planning-feasibility.md` section 7 slice 3).
- Rough mode (feasibility M8, research "one spreadsheet-first operator tracks all operating expenses as one category"):
  the owner may type one fixed total instead of lines; switching never loses numbers and never double counts.
- N-M2: every amount is `null` (not entered) or a number; the fixed card shows «הוזנו 3 מתוך 9 שורות».
- monthly 6 (keep, refined): "a typed purchases total is allowed for cash buys", labelled «קניות, לא צריכה». Invoices as
  the main source come in a later slice; until then the typed total is the month's actual food cost.

Verified on `origin/main` 33a6c572 (plus plans 727 and 728 as written):
- Plan 727's `monthPlanSchema` (`shared/schemas/entities/month-plan.schema.ts`) is a `z.strictObject` with `revenue`,
  `targets`, `vatRatePct`, `dealerType`, `status`; `PUT /api/v1/month-plans/:month` sets named paths only and refuses a
  closed month; `MONEY_FIELDS.monthPlans` = `targets`, `revenue`, `vatRatePct`.
- Plan 728's `monthInputOf(month)` (`src/app/core/engine/month-plan.ts`) returns `null` pairs for `foodCost`, `labour`
  and `fixed`, and `MonthInput.fixed` already carries `entered` and `lines`, `MonthInput.labour` carries `estimate`.
- `src/app/core/services/confirm-modal.service.ts` is the shared confirm for removing a line (default
  confirm-destructive-action).
- No fixed-cost, salary or payroll field exists anywhere (feasibility M6, M7: searches listed there).

## Goals & Success Criteria
**Primary:** on an opened month the owner sees «הוצאות קבועות» with eight starter lines (plan and actual each), adds his
own line, or switches to «סכום אחד» and types one total; types «עלות צוות» as an employer-cost total or as gross pay
with the factor 1.25 («הערכה»); types «קניות חומרי גלם»; and «תמונת החודש» fills in profit, prime cost and break-even,
with «חלקי» gone once all four actual inputs are entered.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `pnpm run test:server` exits 0, including `server/test/month-plans.test.js` (A2) and `server/test/month-rules.test.js` (A1).
- [auto] `pnpm run test:ci` exits 0, including `src/app/core/engine/month-plan.spec.ts` (A3), `src/app/pages/monthly-plan/components/fixed-costs-card/fixed-costs-card.component.spec.ts` (A4), `src/app/pages/monthly-plan/components/labour-card/labour-card.component.spec.ts` (A5) and `src/app/pages/monthly-plan/monthly-plan.page.spec.ts` (A6).
- [auto] `src/app/core/engine/month-plan.spec.ts` covers: lines mode sums only entered lines and counts entered of all; rough mode uses only the rough total even when lines hold numbers; gross 10000 × 1.25 → labour 12500 with `estimate: true`; employer mode → `estimate: false`; a month stored before this plan (no `fixed`, `labour`, `purchases`) still maps to `null` pairs.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/729-month-fixed-costs-and-labour-total.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/729-month-fixed-costs-and-labour-total.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] Open a month on «תכנון חודשי»: «הוצאות קבועות» lists «שכירות», «ארנונה», «חשמל», «מים», «גז», «ביטוח», «כשרות», «שיווק», all «לא הוזן», and the line «הוזנו 0 מתוך 8 שורות».
- [human] Type 12000 in «שכירות» (בפועל), press «הוסף שורה», name it «הנהלת חשבונות» and type 1500, save and reload: both are kept and the line says «הוזנו 2 מתוך 9 שורות».
- [human] Switch «הוצאות קבועות» to «סכום אחד», type 30000, save: «תמונת החודש» uses 30000 as fixed costs; switch back to «שורות»: the 12000 and 1500 are still there and the figure goes back to 13500.
- [human] In «עלות צוות» choose «ברוטו», type 40000: it shows «50,000 ₪ (הערכה)» and the factor box «1.25»; change the factor to 1.3: it shows «52,000 ₪ (הערכה)».
- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed — on «תכנון חודשי» press «הסר» on «הנהלת חשבונות»: «להסיר את השורה?» asks; «ביטול» leaves the line, a second try with «הסר» removes it.
- [human] Fill «הכנסה בפועל», «קניות חומרי גלם», «עלות צוות» and one fixed line, save: the badge reads «הוזנו 4 מתוך 4» and «חלקי» shows only beside the fixed figure while other lines are still «לא הוזן».
- [human] Change a fixed line, then press another chip without saving: the page asks whether to leave; «הישאר» keeps the typed number.

## Execution Mode
- Parallel: yes — writes the month schema, the month router and the monthly page of plans 727/728 only.
- Concurrent plans: any but a later monthly slice.
- Isolated DB: no — new optional fields on `monthPlans`; older months stay valid.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/month/**
shared/schemas/entities/month-plan.schema.ts
shared/schemas/money-fields.ts
server/routes/month-plans.js
server/test/month-plans.test.js
server/test/month-rules.test.js
src/app/core/engine/month-plan.ts
src/app/core/engine/month-plan.spec.ts
src/app/pages/monthly-plan/**
src/app/pages/monthly-plan/monthly-plan.page.spec.ts
src/app/pages/monthly-plan/components/fixed-costs-card/fixed-costs-card.component.spec.ts
src/app/pages/monthly-plan/components/labour-card/labour-card.component.spec.ts
server/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-4: preserves — the new groups are optional fields of `monthPlanSchema` in `shared/schemas/entities/month-plan.schema.ts`;
  the router validates `fixed`, `labour` and `purchases` with `monthPlanUpdateInputSchema` and the stored month with
  `checkStoredDoc`; older months without them stay valid.
- INV-none: preserves — no route, permission or scope change: the plan 727 router's chain (`requireModule('monthly_plan')`,
  `assertCan('editMoney')`) covers the new fields, so owner and consultant write them and staff never read them;
  `MONEY_FIELDS.monthPlans` gains `fixed`, `labour`, `purchases`. Labour is one total with no person in it, so the
  INV-1 consultant rule (as amended by plan 722, ADR 0034, for per-employee lines only) does not apply yet. The fixed
  line names are free text stored in the month, not taxonomy terms (INV-5 untouched).

## Reuse Check
- `fixed-costs-card` — family: list-page — rung: 2 — why: editable rows of `app-form-field` + `appNumberBox` inside the month form, the remove button with `ConfirmModalService`, the lines/total switch as `.c-chip--toggle` radios; no list shell (a card, not a page list)
- `labour-card` — family: number-box — rung: 2 — why: two `appNumberBox` boxes and the employer/gross switch as `.c-chip--toggle` radios
- starter fixed lines and default groups (`FIXED_STARTER_KEYS`, `defaultFixed`, `defaultLabour`, `LABOUR_FACTOR_DEFAULT`) — family: helpers — rung: 3 — why: added to plan 727's `shared/schemas/month/month-rules.ts`, so the server's new month and the browser's older month start from the same lines
- `monthInputOf` fixed, labour and purchases mapping — family: event-plan — rung: 3 — why: fills plan 728's engine inputs; no new engine

## Defaults

- confirm-destructive-action — applies — how: removing a fixed line asks through `ConfirmModalService` («להסיר את השורה?», «הסר» / «ביטול»); cancel leaves it. Switching to «סכום אחד» removes nothing.
- empty-state-on-list — exception — why: the fixed lines start with the eight starter lines; when the owner removes them all, the card shows «אין שורות. הוסיפו שורה או עברו לסכום אחד.» (covered by the card spec).
- loading-and-error-states — exception — why: no new request; the cards save with the month form of plan 727, which owns loading and errors.
- unsaved-changes-on-leave — applies — how: the cards are part of the plan 727 month form (`useUnsavedChanges`, `pendingChangesGuard` on the route); a changed line, factor or total counts as a change.
- hints-in-tooltips — exception — why: no dialog; «הערכה» and «קניות, לא צריכה» are short labels on the page.
- leave-and-return — exception — why: the page sends the user nowhere.
- app-list-container — exception — why: the fixed lines are editable rows inside a month card, not a page list.
- one-breakpoint-set — applies — how: no new `@media`; a line's name, plan and actual boxes wrap on a phone with the shared form layout.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want to type my rent, arnona, electricity and the other fixed bills with what I planned and what I paid, so the month shows what is left.
- As a busy owner, I want to type one total for all fixed costs when I have no time for lines, so I still get a profit figure.
- As an owner who knows only gross salaries, I want the app to estimate the employer cost for me and say it is an estimate, so my prime cost is not understated.
- As an owner who pays cash at the market, I want to type the month's purchases, so food cost is not empty until invoices arrive.

## Functional Requirements

### Must Have (P0)
- [ ] **Rules** (append to `shared/schemas/month/month-rules.ts`): `FIXED_STARTER_KEYS = ['rent', 'arnona',
  'electricity', 'water', 'gas', 'insurance', 'kashrut', 'marketing']`; `FIXED_LINES_MAX = 40`;
  `LABOUR_FACTOR_DEFAULT = 1.25`; `defaultFixed()` = `{ mode: 'lines', lines: <one line per starter key, id = key,
  plan and actual null>, rough: { plan: null, actual: null } }`; `defaultLabour()` = `{ mode: 'employer', factor: 1.25,
  plan: null, actual: null }`.
- [ ] **Schema** (`month-plan.schema.ts`), all optional on the stored month:
  - `fixed: { mode: 'lines' | 'rough', lines: Line[] (≤ 40), rough: { plan, actual } }`;
    `Line = { id: string 1–40, starterKey?: FIXED_STARTER_KEYS, name?: string trimmed 1–60, plan, actual }`, refined so
    a line has exactly one of `starterKey` or `name`; ids unique.
  - `labour: { mode: 'employer' | 'gross', factor: number 1–2, plan, actual }` — one total for the whole team; no names,
    no roles, no per-person rows.
  - `purchases: { actual }` — typed food purchases of the month (VAT-free, «קניות, לא צריכה»).
  - Every amount is plan 727's `amount` (`null` or 0 … 1,000,000,000).
  - `monthPlanUpdateInputSchema` accepts `fixed`, `labour` and `purchases` as whole groups (replace each group);
    `MONEY_FIELDS.monthPlans` gains `fixed`, `labour`, `purchases`.
- [ ] **Router:** `POST /` seeds `fixed: defaultFixed()`, `labour: defaultLabour()`, `purchases: { actual: null }`;
  `PUT /:month` sets a named group as sent (still refused for a closed month); `GET` returns the stored month as is.
  Logs carry the month id and the number of lines, never an amount or a line name.
- [ ] **Engine mapping** (`monthInputOf` in `src/app/core/engine/month-plan.ts`):
  - `fixed`, lines mode: `plan` / `actual` = the sum of the lines' non-null values, `null` when every line is `null`;
    `entered` = lines whose `actual` is not `null`, `lines` = the line count; partial when `entered < lines`.
  - `fixed`, rough mode: the rough pair; `entered` = 1 when the rough actual is set, else 0; `lines` = 1. The lines are
    ignored (never added to the rough total).
  - `labour`: employer mode → the pair as typed, `estimate: false`; gross mode → each amount × `factor`
    (`roundMoney`), `estimate: true`.
  - `foodCost.actual` = `purchases.actual`; `foodCost.plan` stays the target-based plan of plan 728.
  - A month without the groups (opened before this plan) maps to `null` pairs, as in plan 728.
- [ ] **Card `fixed-costs-card`** (`src/app/pages/monthly-plan/components/fixed-costs-card/`): the switch
  «שורות» / «סכום אחד»; in lines mode one row per line — the name (starter lines by dictionary key, own lines as typed,
  editable), «תכנון» and «בפועל» boxes, a remove button (confirm first) — then «הוסף שורה» (a new own line with an
  empty name box and focus on it; refused past 40 lines with «אפשר עד 40 שורות») and the line
  «הוזנו {{entered}} מתוך {{lines}} שורות» with the plan and actual totals; in rough mode the two boxes of the total and
  the line «השורות נשמרות ולא נספרות כשמשתמשים בסכום אחד».
- [ ] **Card `labour-card`** (same folder): the switch «עלות מעביד» / «ברוטו»; «תכנון» and «בפועל» boxes; in gross
  mode the factor box (1–2, step 0.01, default 1.25) and under each box «{{amount}} ₪ (הערכה)»; the line
  «סכום אחד לכל הצוות. שורות לפי עובד יגיעו בהמשך, לבעלים בלבד.».
- [ ] **Purchases box** on the page, beside the revenue card: «קניות חומרי גלם» (בפועל) with the label
  «קניות, לא צריכה».
- [ ] **Page wiring:** the cards are part of the plan 727 month form; «שמירה» sends the changed groups; a month without
  the groups shows `defaultFixed()` / `defaultLabour()` and stores them on its first save; «תמונת החודש» (plan 728)
  reads the saved month; the labour figure shows «(הערכה)» when `estimate`.

### Should Have (P1)
- [ ] `server/breadcrumbs.md`: the month router writes `fixed`, `labour`, `purchases`; `src/app/pages/breadcrumbs.md`:
  the two cards; `docs/brain/component-families.md`: the helpers family lists `defaultFixed` / `defaultLabour`.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical properties only; money with `formatMoney`; no new `.c-*` class; no new `@media`.
- Dictionary keys (append-only, `general`): `mp_fixed_title` ("הוצאות קבועות"), `mp_fixed_mode_lines` ("שורות"),
  `mp_fixed_mode_rough` ("סכום אחד"), `mp_fixed_rent` ("שכירות"), `mp_fixed_arnona` ("ארנונה"),
  `mp_fixed_electricity` ("חשמל"), `mp_fixed_water` ("מים"), `mp_fixed_gas` ("גז"), `mp_fixed_insurance` ("ביטוח"),
  `mp_fixed_kashrut` ("כשרות"), `mp_fixed_marketing` ("שיווק"), `mp_fixed_add` ("הוסף שורה"),
  `mp_fixed_name` ("שם השורה"), `mp_fixed_remove` ("הסר"), `mp_fixed_remove_confirm` ("להסיר את השורה?"),
  `mp_fixed_max` ("אפשר עד 40 שורות"), `mp_fixed_entered` ("הוזנו {{entered}} מתוך {{lines}} שורות"),
  `mp_fixed_rough_note` ("השורות נשמרות ולא נספרות כשמשתמשים בסכום אחד"),
  `mp_fixed_empty` ("אין שורות. הוסיפו שורה או עברו לסכום אחד."), `mp_plan` ("תכנון"), `mp_actual` ("בפועל"),
  `mp_labour_title` ("עלות צוות"), `mp_labour_mode_employer` ("עלות מעביד"), `mp_labour_mode_gross` ("ברוטו"),
  `mp_labour_factor` ("מקדם עלות מעביד"), `mp_labour_estimate` ("{{amount}} ₪ (הערכה)"),
  `mp_labour_note` ("סכום אחד לכל הצוות. שורות לפי עובד יגיעו בהמשך, לבעלים בלבד."),
  `mp_purchases_title` ("קניות חומרי גלם"), `mp_purchases_label` ("קניות, לא צריכה").
  (`mp_not_entered` «לא הוזן» comes from plan 727.)

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Give every new month the same starter fixed lines and labour settings — starter keys incl. kashrut, defaults, line cap and factor; tests — shared/schemas/month/month-rules.ts, server/test/month-rules.test.js
- [ ] A2: Store fixed lines or one total, the labour total and typed purchases on the month — optional schema groups, update input, money fields, seeded on create, saved by group; tests: lines cap and unique ids, one of starter key or name, null kept apart from 0, staff refused, closed month refused, an older month still valid — shared/schemas/entities/month-plan.schema.ts, shared/schemas/money-fields.ts, server/routes/month-plans.js, server/test/month-plans.test.js
- [ ] A3: Feed fixed costs, labour and purchases into the month figures without double counting — lines vs rough, gross × factor as an estimate, purchases as actual food cost; spec cases of the Done-when — src/app/core/engine/month-plan.ts, src/app/core/engine/month-plan.spec.ts
- [ ] A4: Let the owner type fixed costs as lines or as one total — the fixed card with add, rename, remove after a confirmation, the switch and the entered count; spec — src/app/pages/monthly-plan/components/fixed-costs-card/**
- [ ] A5: Let the owner type the team's cost as employer cost or as gross pay with a factor — the labour card with the estimate label; spec — src/app/pages/monthly-plan/components/labour-card/**
- [ ] A6: Put the fixed, labour and purchases inputs into the month form and its save — defaults for an older month, changed groups only, leave question; page spec — src/app/pages/monthly-plan/monthly-plan.page.ts, src/app/pages/monthly-plan/monthly-plan.page.html, src/app/pages/monthly-plan/monthly-plan.page.spec.ts
- [ ] A7: Add the Hebrew words — the keys of UI/UX Notes — public/assets/data/dictionary.json
- [ ] A8: Record the new fields and cards in the maps and run every automatic check — paste outputs under Execution Notes — server/breadcrumbs.md, src/app/pages/breadcrumbs.md, docs/brain/component-families.md

## What happens when
- The owner switches to «סכום אחד» with lines filled: the lines stay stored and are shown again on switching back; only
  the active mode counts.
- The owner removes every starter line: the card shows «אין שורות. הוסיפו שורה או עברו לסכום אחד.»; the fixed figure
  is «לא הוזן».
- A line has a plan but no actual: it counts in the plan total, not in «הוזנו»; the actual fixed figure is «חלקי».
- Gross mode with factor 1.25 and actual 0: labour is 0, entered, marked «(הערכה)».
- A water bill that covers two months: the owner types the month's share himself; spreading a bill over months is a
  later slice (the bill capture).
- The owner pays VAT-inclusive bills: amounts are typed before VAT (all money is net, monthly 7); for a `patur` dealer
  the amount paid is the cost (the research's dealer-type rule), which the owner types as is.

## Technical Considerations
- Dependencies: plans 727 (schema, router, page, form) and 728 (engine inputs, figures card).
- **Room for later slices:** per-employee lines (N-M3, ADR 0034) go into their own owner-only collection; the server then
  writes or computes `labour.actual` from them (a later `labour.source` field), and a consultant keeps reading only this
  total. Carry-forward (N-M5) copies `fixed.lines` (names and plans, actuals blank), `labour.mode` and `factor`. The
  invoices slice adds a second food-cost source beside `purchases`, one source per month (feasibility section 5).
- **Planner choices for Dandan to grade:**
  - `behaviour:` a typed purchases total is in this plan (monthly 6 allows it) so the month's food cost is not empty
    until the invoices slice — reverse: leave food cost to the invoices slice.
  - `behaviour:` the gross factor is one number for plan and actual — reverse: a factor per column.
  - `behaviour:` a line's plan without an actual still counts in the plan total — reverse: plan totals only from lines
    that have both.
- Cost: none. Security: labour is one number with no person in it; logs never carry an amount or a line name.

## Out of Scope
- Per-employee lines, payslip capture, bill capture by AI, invoices as food cost, stock correction, carry-forward,
  month close, daily target.

## Critical Questions
- none — Dandan answered "decisions: all recommended" (2026-11-24); the unasked choices are logged above as
  `behaviour:` decisions for him to grade.

## Execution Notes
- Planner 2026-11-24: written from the research report and Dandan's decisions.
