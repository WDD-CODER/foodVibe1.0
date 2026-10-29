# Plan 473 — Let each supplier have its own price for a product

Status: draft
Track: code
Snapshot: feb9f3da29fafafdacf2f3f12cfd22a5791d58f6

## Problem Statement
Handoff B5 (`docs/mvp/review-handoff-2026-10-21.md`, Source #50). The data already holds one price per supplier
(`Product.sources: { supplierId, price }[]`), but the product form has one price box and copies it to every selected
supplier on save (`product-form.component.ts:926-942`). The chef wants a price per supplier (cucumber 4 ₪ at one,
5 ₪ at another), shown in the list and tooltip too.

**Parked by the Human (2026-10-21): not in the current fix run (459–477).** Decision so far: a recipe cost uses the
**cheapest** supplier price. The Human wants something smarter later (preferred supplier, last bought, …); this plan
is rewritten in a planning session before it runs.

## Goals & Success Criteria
- Primary: each selected supplier keeps its own price, and costs use the cheapest one.
- Success (to be refined before the run):
  - [ ] [human] A product with two suppliers at 4 ₪ and 5 ₪ saves both prices; reopening the form shows both.
  - [ ] [human] A recipe using that product costs it at 4 ₪.
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — not scheduled.

## Execution Notes
- Deferred: parked by the Human (2026-10-21). Do not take this plan in an orchestrator run until it is rewritten.
- Base branch `origin/mvp`; merge back into `mvp` only (never main); executed per `docs/mvp/run-mode.md` when scheduled.
- Depends on: plan 461 (product form; growth-frozen file, net ≤ 0).
- Cost rule touches the «לא סגור סופית» (unpriced) rule from plan 444 and the money-field permission check
  (`moneySignature`, plan 449).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/product-form/**
docs/mvp/runs/473.md
```

## Read Scope

Entire repo.

## Escalation Protocol

If a Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and
why; offer `approved: <path>`; then append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — client form change only at this stage; the rewrite re-checks INV-1 (money fields) and INV-4.

## Backend Impact
- To be decided in the rewrite (the cost engine and any server-side cost use).

## Step 0 — Reality Check
In the rewrite session: find every reader of `sources[].price` (cost engine, unpriced rule, inventory list, exports).

## User Stories
- As a chef, I want each supplier's own price stored so that my costs use the cheapest real price.

## Functional Requirements

### Must Have (P0)
- [ ] One price box per selected supplier in the product form.
- [ ] Costs use the cheapest supplier price.

## UI/UX Notes
- Defined in the rewrite.

## Atomic Sub-tasks
- [ ] P1: Rewrite this plan with the Human before it runs, including the smarter price choice — this plan file

## Technical Considerations
- None yet.

## Out of Scope
- Any export, print or preview of a recipe or a menu — plan 471, not this run.
- Preferred-supplier or last-bought pricing (the "smarter" rule).

## Critical Questions
- Answered 2026-10-21 (Human): costs use the cheapest supplier price for now; the plan is parked.
