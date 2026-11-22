# Plan 660 — Dish analysis screen: feasibility audit against the current code (report only)

Status: draft
Depends-on: none
Snapshot: 5b82258e85b72c0fdf97a2af8b83c5a59150b88f

## Problem Statement

Dandan wants a "dish analysis" screen for restaurants that sell single dishes from a standing menu: how many of
each dish were sold, how many came back and why, what each dish leaves after its ingredients, which dishes are
popular and profitable, and whether there is room for a new crowd-drawing dish. A clickable mockup exists, with
invented numbers. FoodVibe today is built around events and recipes. Before any build plan is written, he needs to
know, from the code as it is today, which of the screen's numbers can come from data the app already holds, which
need a new entity or a new way to enter data, and what would make the numbers wrong.

This plan produces one written report. It changes no app code, no schema and no data.

## Goals & Success Criteria

**Primary:** `docs/finance/dish-analysis-feasibility.md` exists and answers, for every data requirement D1–D15
below, "exists / partial / missing", with file-and-line evidence, the gap, and the data-quality risk, and ends with
an ordered list of build slices and the decisions Dandan must make.

- [auto] `grep -c "^## " docs/finance/dish-analysis-feasibility.md` prints `8`.
- [auto] `grep -c "^| D[0-9]" docs/finance/dish-analysis-feasibility.md` prints `15`.
- [auto] `grep -c "TBD" docs/finance/dish-analysis-feasibility.md` prints `0`.
- [auto] `node scripts/scope-check.mjs --diff=origin/main --plan=plans/660-dish-analysis-feasibility-audit.plan.md` exits 0 (only the report file changed).
- [human] Dandan reads section 1 (Hebrew summary) and can say for each block of the screen whether it is ready to
  build, needs new data first, or should be dropped.

## Execution Mode
- Parallel: yes
- Concurrent plans: 661 "Monthly planning screen: feasibility audit against the current code (report only)"
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/finance/dish-analysis-feasibility.md
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
- As a chef who owns a restaurant, I want to see what each dish sold, what came back and what it leaves me, from
  real sales data, so that I can decide which dishes to keep, reprice, promote or replace.
- As the product owner, I want to know what the code already holds before a build plan is written, so that we do
  not build a screen with no data behind it.

## Functional Requirements

### The screen's data requirements (the audit checks each one)

"Left per dish" = sell price before VAT minus the dish's ingredient cost.

- D1 — A standing restaurant menu: the list of dishes a restaurant sells every day, outside any event.
- D2 — Each menu dish linked to a recipe, with the recipe's ingredient cost per portion, and a flag when that cost
  is incomplete (an ingredient without a price).
- D3 — A sell price per dish as printed on the menu (with VAT) and the VAT rate, so the price before VAT can be
  computed.
- D4 — Units sold per dish for a period (a month): typed by hand first, then from a file (CSV or Excel) exported
  from the point-of-sale, later a live integration; including how a name on the sales file is matched to a dish.
- D5 — Units returned per dish for the period.
- D6 — Why dishes came back: a reason per return (free text or a short list), counted per dish.
- D7 — A category per dish (starter, main, dessert) for filtering.
- D8 — Derived numbers: left per dish; ingredient cost percent; share of all units sold; total left per dish for
  the month; return rate; cost of returns (returns × ingredient cost); average left per unit over the menu; and the
  four classes: popular = units sold ≥ 70% of an equal share (0.7 × total units ÷ number of dishes), profitable =
  left per dish ≥ the menu's weighted average; star (both), workhorse (popular only), puzzle (profitable only),
  dead weight (neither).
- D9 — Preparation minutes per dish (for a later full cost that adds labour): the recipe steps' labour minutes,
  and for a preparation made in a batch, its minutes divided by its yield.
- D10 — The "new crowd-drawing dish" calculator: price, ingredient cost, expected monthly sales, the share that
  replaces another main dish, added monthly labour and equipment cost; compared with the "room for the team" figure
  of the monthly planning screen.
- D11 — Sentences the screen writes by itself from the numbers (where the profit comes from, which popular dishes
  leave little, which profitable dishes sell little, how balanced the menu is).
- D12 — A period and a source for every number (typed by hand, sales file, integration), and a clear note when a
  dish has no sales data or no cost.
- D13 — Who may see and change it: the owner; a consultant acting in the business; staff never; and which module
  switches the screen on for a business.
- D14 — What the consultant diagnosis already holds for the same need (its menu with sell prices and dish links)
  and what the menu library page holds.
- D15 — Items that are sold but have no recipe (drinks, bought-in desserts): whether they can be listed, priced
  and counted.

### Must Have (P0)
- [ ] The report has exactly these eight `## ` sections, in this order: `## 1. Summary for Dandan (Hebrew)`,
  `## 2. Constraints from the project's rules`, `## 3. What exists today`, `## 4. Requirements matrix`,
  `## 5. Data-quality risks`, `## 6. Architecture impact of a future build`, `## 7. Proposed build slices`,
  `## 8. Decisions for the Human`.
- [ ] Section 4 is one Markdown table with exactly one row per requirement, each row starting `| D1 `…`| D15 `,
  with the columns: requirement, status (`exists` / `partial` / `missing`), evidence (`path:line` on the checked
  commit, or the searches that found nothing), what a build needs (entity, field, endpoint, screen), risk to the
  number's correctness.
- [ ] Every `exists` or `partial` claim cites at least one `path:line`. Every `missing` claim names the searches run
  (the exact `git grep` patterns) and the folders searched.
- [ ] Section 1 is written in Hebrew, at most 30 lines, and gives per screen block (key numbers, the four dish
  classes, returns and reasons, the dish list and dish detail, the new-dish calculator, the written insights) one
  verdict: ready to build / needs new data first / not feasible now, and why in one sentence.

### Should Have (P1)
- [ ] Section 7 lists build slices small enough for one Worker session each, in dependency order, each with the
  files it would touch and what it delivers to the owner.

### Nice to Have (P2)
- [ ] Section 5 lists the three most likely ways the sales figures end up wrong (for example a renamed dish on the
  sales file, two sizes of one dish, a dish whose recipe changed mid-month) and what the build should do about each.

## UI/UX Notes
- No UI is built. The mockup is a private page Dandan holds; this plan's requirement list D1–D15 is the complete
  description of what the screen shows.
- No keys are added to `public/assets/data/dictionary.json`.

## Atomic Sub-tasks

- [ ] A1: Read the rules that bind a future build and write section 2 — read `AGENTS.md`,
  `docs/brain/invariants.md`, `docs/brain/index.md` and the decisions and `gotchas.md` it points to,
  `_shared/tech-stack.md`, `docs/modules/modules-map.md`; list only the rules that bear on recipes and their cost,
  per-business data, taxonomy, AI calls, schemas and modules, each with its source file —
  `docs/finance/dish-analysis-feasibility.md`
- [ ] A2: Inventory what the code holds today and write section 3 — read and record, with `path:line`, what each of
  these stores, computes or exposes: `shared/schemas/entities/recipe.schema.ts` (dish and preparation, `steps`,
  `course`, yield), `shared/schemas/entities/menu-event.schema.ts` (`sections[].items[]` with `sellPrice`,
  `foodCostOverride`), `shared/schemas/entities/diagnosis.schema.ts` (`menu`, `vatPct`, `pricesIncludeVat`),
  `shared/schemas/entities/invoice-alias.schema.ts`, `shared/schemas/entities/taxonomy-term.schema.ts`,
  `shared/schemas/entities/product.schema.ts` (`yieldFactor`), `src/app/core/services/recipe-cost.service.ts`
  (`computeRecipeCost`, `computeRecipeCostStatus`, `getRecipeCostPerUnit`),
  `src/app/core/services/menu-intelligence.service.ts`, `src/app/pages/menu-library/**`,
  `src/app/pages/menu-intelligence/**`, `server/routes/diag.js`, `server/routes/stats.js`,
  `server/routes/product-import.js`, `src/app/core/services/excel-workbook.util.ts`; then run `git grep -n -i -E
  "sold|sales|returned|refund|pos|popularity|contribution" -- shared server src` and record every hit that is real
  sales or dish-performance data — same file
- [ ] A3: Fill the requirements matrix, section 4 — one row per D1–D15 using A2's evidence; for a `partial` row say
  exactly which part exists — same file
- [ ] A4: Settle the standing-menu question (D1, D3, D14) and write it into sections 4 and 6 — is there any stored
  list of a business's dishes with sell prices outside a `menuEvent`; can a `menuEvent` with a serving type act as
  a standing menu without misuse of event fields (`guestCount`, `eventDate`, stage, pricing cache); what the
  diagnosis `menu` array already models; state the two or three realistic ways to store a standing menu and what
  each breaks or reuses — same file
- [ ] A5: Check ingredient cost per portion for a dish (D2, D9) and write the finding into section 5 — where the
  cost is computed (client only, or also on the server), whether it can be read for many dishes at once on the
  server for a report, what happens when an ingredient has no price or no unit conversion
  (`computeRecipeCostStatus`), whether the cost is the current price or the price at the time of sale
  (`price-history.schema.ts`), and whether step labour minutes are filled or default to 0 — same file
- [ ] A6: Check how sales could get in (D4, D5, D6, D15) and add it to sections 4 and 5 — what file-import code
  exists (`server/routes/product-import.js`, `excel-workbook.util.ts`) and what of it a sales file could reuse;
  whether the alias pattern of `invoice-alias.schema.ts` fits matching a sales-file name to a dish; where a return
  and its reason would be stored; how an item without a recipe would be represented — same file
- [ ] A7: Write section 6 — for a future build name each invariant INV-1…INV-6 it would touch and whether it can
  be preserved; say whether the written insights (D11) can be plain rules computed from the numbers or need an AI
  call (INV-6); state what the dish screen and the consultant diagnosis can share and what would be duplicated;
  name the dependency on the monthly planning screen (D10) — same file
- [ ] A8: Write section 7 (build slices) and section 8 (decisions) — each decision as a choice with the options and
  the recommended one first, never an open question; include at least: how the standing menu is stored, whether
  sales start as typing by hand or as a file import, whether return reasons are free text or a fixed short list,
  and whether dishes without a recipe are in the first version — same file
- [ ] A9: Write section 1 last (Hebrew summary) from sections 3–8, then run the four `[auto]` checks and paste
  their output into this plan's Execution Notes — same file

## Technical Considerations
- Dependencies: none changed; the listed files are read only.
- New files needed: `docs/finance/dish-analysis-feasibility.md`
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
- The monthly planning screen (the sibling plan covers it).
- Choosing or integrating a POS system.
- Running the app, the database or AI calls: the audit reads code and docs only.

## Critical Questions
- none

## Execution Notes
