# Plan 608 — The recipe ingredient amount stays fully visible on phones

Status: draft
Track: design
Depends-on: 604
Snapshot: 7c16fc4d620acf269f6d85dafccf9ac1d1e18777
## Problem Statement

After plan 604, the Human reported on 2026-11-14 that on a phone the ingredient amount on the recipe builder
(`/recipe-builder`) sits in a box that shrinks until the number can't be seen.

The cause is in `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss`,
inside `@container ingredients (max-width: 700px)`:
- the row is `grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) 2.75rem`;
- `.quantity-controls .qty-input` has `min-inline-size: 0`.

So between the two 2rem stepper buttons the input can shrink to a few pixels. Plan 604's check 604-3 measured the
stepper buttons at 30px instead of 32px, which is the same squeeze.

## Goals & Success Criteria
**Primary:** at every phone width (a 320–700px container) the amount input always shows at least four characters
(e.g. "1250" or "12.5") between full-size −/+ buttons.

Done when:
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 320x700 and at 375x812 on `/recipe-builder` signed in, in the first `.ingredient-grid-row` the `.qty-input` is at least 44px wide and each `.qty-btn` is at least 32px wide — `e2e/ui/608-1.spec.ts`, screenshot `screens/608-1.png`
- [human] On a narrow window, type 1250 into an ingredient amount: the whole number is readable, and the − / + buttons are easy to tap.
- [human] Nothing else moved: the unit and the cost still sit on the same row, and the desktop ingredient table looks the same.

## Execution Mode

- Parallel: yes.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss
e2e/ui/608-1.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## Architecture Impact

- INV-none: preserves — one component stylesheet. No server, schema, ownership or AI path is touched.

## Reuse Check

- none — a CSS-only change.

## User Stories

- As a chef entering amounts on my phone, I want to see the number I typed, so that I don't save a wrong quantity.

## Functional Requirements

### Must Have (P0)
- [ ] In the `@container ingredients (max-width: 700px)` block, the row template becomes
  `grid-template-columns: minmax(8.5rem, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) 2.75rem`. The quantity column then never
  goes below two 2rem buttons, their gaps and a 2.75rem input.
- [ ] `.quantity-controls .qty-input`: set `min-inline-size: 2.75rem` (it was `0`) and `text-align: center`. Keep
  `padding-inline: 0.125rem`.
- [ ] `.quantity-controls .qty-btn`: add `min-inline-size: 2rem`, so no flex parent can shrink it.
- [ ] When the row is narrower than these minimums (below about 320px), the unit and cost columns shrink first, since
  they are `minmax(0, 1fr)`. The unit select truncates with its existing ellipsis.

## Atomic Sub-tasks

- [ ] 608-A1: Give the phone amount box a floor so the typed number is always visible — quantity column minmax, input min size, button min size — src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss
- [ ] 608-A2: Prove at 320px and 375px that the amount and the − / + buttons keep their size — e2e/ui/608-1.spec.ts

## Technical Considerations

- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- The desktop ingredient table (containers wider than 700px).
- The recipe header's yield stepper.

## Critical Questions

none

## Execution Notes
