# Plan 399 — Recipe book list split: map seams, then extract self-contained flows

Status: done
Track: code — here (not design)
Snapshot: da1d7f666cefa259d0233d6c5522042073ab8a3f

## Problem Statement
`src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts` is 978
lines and the most frequently edited of the three (14–17 edits since 2026-09-01). Follow-up to
closed plan 318 (refactor-candidate backlog). It hasn't been mapped yet, so this plan starts
with a map and a go from the Human before code moves.

A first pass of the method list (2026-10-10) suggests these candidates — A1 confirms or replaces them:
- **Pure helpers** (~L524–620): date parse/format (`parseDateTo*`, `formatAddedAt`,
  `formatUpdatedAt*`), `compareRecipes`, `recipeContainsAllProducts` / `getRecipeProductIds`
  → a `.util.ts` with specs (no Angular needed).
- **Row actions** (~L759–960): delete / permanently delete / remove / bulk edit / bulk delete /
  duplicate / approval / favorite → a component-scoped actions service.
- **Tooltips** (~L702–740): cost and date tooltip hover/tap state → small service, or leave if tiny.
- Likely stays: filter-category computeds (~L292–360), ingredient-product filter, sort and
  pagination (~L467–500, L630–650) — these feed the shared `displayRows_()` chain.

Proven pattern: the cook-view split (2026-09-28, `chore/cook-view-service-split`) moved
self-contained flows into component-scoped services (`@Injectable()` + component `providers`),
1201 → 979 lines, and left code tied to the shared signals in place.

## Goals & Success Criteria
- Primary: a mapped, Human-approved split; the approved seams live in a `services/` (and/or
  `utils/`) subfolder of the component; the component delegates. Refactor only — no behavior,
  look or text change.
- Success:
  - [human] A1 map approved by the Human before any code moves.
  - [auto] `ng build` passes.
  - [auto] `ng test` passes (existing specs, incl. `recipe-book-list.component.spec.ts`).
  - [auto] `wc -l` of the component is lower than 978 (report the number).
  - [human] Recipe book: search, filters (open/close categories, clear all), ingredient-product filter, sort by each column and by date, next/prev page — same results as before.
  - [human] Row actions: edit, cook, history, duplicate, approve, favorite, rating, delete (incl. admin scope prompt), bulk edit and bulk delete — same as before.
  - [human] Cost and date tooltips on hover (PC) and tap (phone).

## Execution Mode
- Parallel: yes — disjoint folders from plans 397 and 398
- Concurrent plans: 397, 398
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/recipe-book/components/recipe-book-list/**
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html
src/app/pages/equipment/components/equipment-list/equipment-list.component.html
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — client-side refactor inside one component folder; no write routes, schemas, taxonomy storage or AI calls change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a developer, I want the recipe book list split along its real seams, so the most-edited
  list file stops growing and its pure logic is testable on its own.

## Functional Requirements

### Must Have (P0)
- [ ] A1 map in session-state: each block, its line range, what it reads/writes, and verdict
      (move to util / move to service / stays, with the reason). STOP and show the Human; move
      only what they approve.
- [ ] Approved seams extracted into `recipe-book-list/services/` and/or `recipe-book-list/utils/`;
      services `@Injectable()` provided on the component.
- [ ] Template bindings updated; no visible change.
- [ ] Code style per hard rules: `inject()`, signals with trailing `_` for private state, no
      `any`, single quotes, no semicolons. Class structure per
      `.claude/skills/angularComponentStructure/SKILL.md`.

### Should Have (P1)
- [ ] Specs for any extracted pure util (date format/parse, compare, product containment).

### Nice to Have (P2)
- none

## UI/UX Notes
- No UI change, no new dictionary keys.

## Atomic Sub-tasks
- [x] A1: Map `recipe-book-list.component.ts` seams into session-state; ⛔ STOP for the Human's go on which to move (go + delete dead, 2026-10-10)
- [x] A2: Extract approved pure helpers to `recipe-book-list/utils/*.util.ts` (+ specs)
- [x] A3: Extract approved service(s) to `recipe-book-list/services/`; wire component + `recipe-book-list.component.html`
- [x] A4: Update `recipe-book-list.component.spec.ts` if it touches moved members
- [x] A5: `ng build` + `ng test` green, report new line count; hand the Human the click list from Success
- [x] A6 (validation fallout): touch — next touch anywhere closes the cost/date tooltip (`recipe-list-tooltips.service.ts`)
- [x] A7 (validation fallout): >768px — carousel cells of a selected row get the selected tint/outline (`src/styles.scss`, append)
- [x] A8 (validation fallout, approved): hide recipe-builder/cook tab chips on `/recipe-book` (`tab-chips.component.ts`)
- [x] A9 (validation fallout, approved): drop the row pencil where it equals the row click — products list + equipment list

## Technical Considerations
- Dependencies: recipe data/kitchen state services, admin scope prompt (plan 365), list shell
  and bulk-edit components (read only), `filter-category-counts.util.ts` (read only).
- Delete flows use the admin scope prompt — move them as a unit, don't split the prompt from
  its action.
- New files: per the approved map.
- Model changes: none.

## Out of Scope
- `recipe-book.page.ts` and other recipe-book components.
- Shared list engine CSS / virtual scroll (see the pagination comment ~L467).
- Any behavior, style or text change.

## Critical Questions
- none
