# Plan 661 — Monthly planning screen: feasibility audit against the current code (report only)

Status: draft
Depends-on: none
Snapshot: 5b82258e85b72c0fdf97a2af8b83c5a59150b88f

## Problem Statement

Dandan wants a "monthly economic planning" screen for restaurants (plan a month, then close it with what
actually happened: revenue, food cost, fixed expenses, salaries, profit, break-even, room for the team, a
recommended dish price). A clickable mockup exists, with invented numbers. Before any build plan is written, he
needs to know, from the code as it is today, which of the screen's numbers can come from data FoodVibe already
holds, which need new data or new entry points, and what would make the numbers wrong. Without this the screen
would show figures that nothing in the app backs.

This plan produces one written report. It changes no app code, no schema and no data.

## Goals & Success Criteria

**Primary:** `docs/finance/monthly-planning-feasibility.md` exists and answers, for every data requirement
M1–M15 below, "exists / partial / missing", with file-and-line evidence, the gap, and the data-quality risk, and
ends with an ordered list of build slices and the decisions Dandan must make.

- [auto] `grep -c "^## " docs/finance/monthly-planning-feasibility.md` prints `8`.
- [auto] `grep -c "^| M[0-9]" docs/finance/monthly-planning-feasibility.md` prints `15`.
- [auto] `grep -c "TBD" docs/finance/monthly-planning-feasibility.md` prints `0`.
- [auto] `node scripts/scope-check.mjs --diff=origin/main --plan=plans/661-monthly-planning-feasibility-audit.plan.md` exits 0 (only the report file changed).
- [human] Dandan reads section 1 (Hebrew summary) and can say for each block of the screen whether it is ready to
  build, needs new data first, or should be dropped.

## Execution Mode
- Parallel: yes
- Concurrent plans: 660 "Dish analysis screen: feasibility audit against the current code (report only)"
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/finance/monthly-planning-feasibility.md
origin/orch/fin-audit
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — the plan writes one Markdown report under `docs/finance/`; no code, schema, route or data changes.

## Reuse Check

- none — report only; no component, util, pipe, service or class is created.

## Defaults

- app-list-container — exception — why: report only; the plan builds no list and no screen
- one-breakpoint-set — exception — why: report only; the plan writes no SCSS
- unit-dropdown-add — exception — why: report only; the plan builds no dropdown
- empty-state-on-list — exception — why: report only; the plan builds no list
- loading-and-error-states — exception — why: report only; the plan builds no screen

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef who owns a restaurant, I want the monthly planning screen to show numbers that come from what my
  business really entered, so that I can trust the profit and the room I have for my team.
- As the product owner, I want to know what the code already holds before a build plan is written, so that we do
  not build a screen with no data behind it.

## Functional Requirements

### The screen's data requirements (the audit checks each one)

All money is before VAT unless stated. "Plan" = what the owner expects for the month; "actual" = what happened.

- M1 — Expected revenue for a month (owner input).
- M2 — Actual revenue for a month, with its source (sales report, later a POS file or integration).
- M3 — Planned food cost as a percent of revenue.
- M4 — Actual food cost for a month in money, from supplier invoices.
- M5 — Profit target percent of the business.
- M6 — Fixed expense lines (rent, municipal tax, electricity, gas, water, insurance, accounting, marketing):
  name, monthly amount, plan and actual, the owner can add a line.
- M7 — Team and salary lines (full employer cost per month), each line optionally opened into a sub-list per
  employee (for example "leading cooks" → chef, sous-chef; "cooks" → cook A, B, C); plan and actual; the owner can
  add a role and an employee.
- M8 — Rough mode: one total for all fixed expenses, or one total for all salaries, instead of the lines.
- M9 — Every actual value carries where it came from (document photo, supplier invoice, standing payment, typed by
  hand). An actual value is locked; changing it by hand needs an explicit approval step and is then marked
  "changed by hand", with who changed it, when, and the earlier value.
- M10 — Missing data: an actual value that was never entered counts as 0, and the screen lists what is missing and
  says the picture is better than reality.
- M11 — Document capture: a photo of an electricity bill or a payslip is read by AI into the right line (amount,
  period, and for a payslip only role and employer cost).
- M12 — Derived numbers: profit and profit percent; "room for the team" = revenue × (1 − food cost % − profit
  target %) − fixed expenses − salaries; break-even revenue = (fixed expenses + salaries) ÷ (1 − food cost %);
  overhead percent = (fixed expenses + salaries) ÷ revenue; recommended dish price = dish food cost ÷ (1 − overhead %
  − profit target %) × (1 + VAT).
- M13 — A month as a period: a plan and an actual per business per month, history kept month to month, fixed lines
  carried forward to the next month.
- M14 — Who may see and change it: the owner; a consultant acting in the business; staff never; and which module
  switches the screen on for a business.
- M15 — Privacy: salary data and payslip photos, and whether they fall under the default AI data sharing with the
  platform owner (`aiPrivate`).

### Must Have (P0)
- [ ] The report has exactly these eight `## ` sections, in this order: `## 1. Summary for Dandan (Hebrew)`,
  `## 2. Constraints from the project's rules`, `## 3. What exists today`, `## 4. Requirements matrix`,
  `## 5. Data-quality risks`, `## 6. Architecture impact of a future build`, `## 7. Proposed build slices`,
  `## 8. Decisions for the Human`.
- [ ] Section 4 is one Markdown table with exactly one row per requirement, each row starting `| M1 `…`| M15 `,
  with the columns: requirement, status (`exists` / `partial` / `missing`), evidence (`path:line` on the checked
  commit, or the searches that found nothing), what a build needs (entity, field, endpoint, screen), risk to the
  number's correctness.
- [ ] Every `exists` or `partial` claim cites at least one `path:line`. Every `missing` claim names the searches run
  (the exact `git grep` patterns) and the folders searched.
- [ ] Section 1 is written in Hebrew, at most 30 lines, and gives per screen block (revenue and targets, fixed
  expenses, team and salaries, document capture, derived numbers) one verdict: ready to build / needs new data
  first / not feasible now, and why in one sentence.

### Should Have (P1)
- [ ] Section 7 lists build slices small enough for one Worker session each, in dependency order, each with the
  files it would touch and what it delivers to the owner.

### Nice to Have (P2)
- [ ] Section 3 notes any existing screen that already asks the owner for a number the new screen needs, so the
  build can reuse the stored value instead of asking twice.

## UI/UX Notes
- No UI is built. The mockup is a private page Dandan holds; this plan's requirement list M1–M15 is the complete
  description of what the screen shows.
- No keys are added to `public/assets/data/dictionary.json`.

## Atomic Sub-tasks

- [ ] A1: Read the rules that bind a future build and write section 2 — read `AGENTS.md`,
  `docs/brain/invariants.md`, `docs/brain/index.md` and the decisions and `gotchas.md` it points to,
  `_shared/tech-stack.md`, `docs/modules/modules-map.md`; list only the rules that bear on money data, per-business
  data, AI calls, schemas and modules, each with its source file — `docs/finance/monthly-planning-feasibility.md`
- [ ] A2: Inventory what the code holds today and write section 3 — read and record, with `path:line`, what each of
  these stores, computes or exposes: `shared/schemas/entities/business.schema.ts` (settings, baseline),
  `shared/schemas/entities/invoice.schema.ts`, `shared/schemas/entities/price-history.schema.ts`,
  `shared/schemas/entities/diagnosis.schema.ts`, `shared/schemas/entities/stock-count.schema.ts`,
  `shared/schemas/entities/stored-file.schema.ts`, `shared/schemas/modules-pure.ts`, `server/routes/business.js`,
  `server/routes/stats.js`, `server/routes/diag.js`, `server/routes/product-import.js`,
  `server/routes/ai/invoices.js`, `server/utils/invoice-read.js`, `server/services/invoice-memory.js`,
  `server/utils/permissions.js`, `src/app/core/engine/event-pricing.ts`, `src/app/pages/dashboard/**`,
  `src/app/pages/settings/**`; then run `git grep -n -i -E "expense|salary|payroll|payslip|overhead|rent|revenue"
  -- shared server src` and record every hit that is real business-finance data — same file
- [ ] A3: Fill the requirements matrix, section 4 — one row per M1–M15 using A2's evidence; for a `partial` row say
  exactly which part exists — same file
- [ ] A4: Check whether actual monthly food cost (M4) can be computed from stored invoices, and write the finding
  into section 5 — from `invoice.schema.ts` and the write path in `server/routes/product-import.js`: is a
  per-invoice total stored or only lines; is `invoiceDate` required; how `vatIncluded` is applied; are invoices
  with unread lines counted; purchases in a month are not what was used in a month, so say whether
  `stock-count.schema.ts` gives opening and closing stock that could correct it — same file
- [ ] A5: Check what reading an expense bill and a payslip (M11, M15) would need, and add it to sections 4 and 5 —
  from `server/routes/ai/invoices.js`, `shared/schemas/ai-invoice-read.schema.ts`, `server/utils/invoice-read.js`
  and the stored-file path: what in the pipeline is specific to supplier product invoices, what is reusable, where
  the photo is stored and for how long, what `aiPrivate` covers today, and which payslip fields must never be
  stored (identity number, bank account, address) — same file
- [ ] A6: Write section 6 — for a future build name each invariant INV-1…INV-6 it would touch and whether it can
  be preserved; state how the "C-PRICING" contract in `src/app/core/engine/event-pricing.ts` (the only place profit
  is computed) constrains a new monthly engine; compare with the consultant diagnosis
  (`shared/schemas/entities/diagnosis.schema.ts`, `server/routes/diag.js`, plans 633, 634, 646, 652 under `plans/600-700/`) and say what the monthly screen can share with it and what would be duplicated; propose where
  a new module key would sit in `shared/schemas/modules-pure.ts` — same file
- [ ] A7: Write section 7 (build slices) and section 8 (decisions) — each decision as a choice with the options and
  the recommended one first, never an open question; include at least: who owns the screen (the business's own
  module with consultant access, or the consultant module), whether a payslip photo is kept or only its amounts,
  whether salary data is shared with the platform owner by default, and how overhead is spread over dishes (a
  percent of the dish price, an equal amount per dish sold, by preparation time) — same file
- [ ] A8: Write section 1 last (Hebrew summary) from sections 3–8, then run the four `[auto]` checks and paste
  their output into this plan's Execution Notes — same file

## Technical Considerations
- Dependencies: none changed; the listed files are read only.
- New files needed: `docs/finance/monthly-planning-feasibility.md`
- Model changes: none
- Backend / API: none
- Auth and validation: none
- Security surface: none
- Data / migration: none
- Project checks: the `log-query` Done-when item does not apply (no app or server code is touched); Hebrew applies
  to section 1 of the report only.

## Out of Scope
- Any code, schema, route, migration, seed or dictionary change.
- Building the screen or any part of it; writing the build plans (they follow after Dandan reads the report).
- The dish analysis screen (the sibling plan covers it).
- Choosing or integrating a POS system; accounting or payroll software features.
- Running the app, the database or AI calls: the audit reads code and docs only.

## Critical Questions
- none

## Execution Notes
