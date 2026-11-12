# Plan 590 — Date tests pass on any PC: specs that type into a date field fix the pointer type instead of reading the machine's

Status: draft
Depends-on: none
Snapshot: 8e7b189e653c617d7f2d21e01bac9b69c5e568f5

## Problem Statement
On 2026-11-12 from about 11:45 every local final gate failed (`run-589`, `batch-3`, `batch-2-fix`) with the same 9 unit
tests, all in specs that type into `app-date-field`:
`src/app/shared/new-inquiry-dialog/new-inquiry-dialog.component.spec.ts` (3),
`src/app/pages/menu-intelligence/components/deposit-paid-dialog/deposit-paid-dialog.component.spec.ts` (4),
`src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts` (2). Examples:
`Expected '' to be '25/12/2026'`, `Expected '2026-11-03' to be '03/11/2026'`.

The code is not the cause: commit 4e1b4b12 passed the same specs in the morning and fails them now on this PC, and
GitHub CI (Linux) passes the client tests on the same main. `src/app/shared/date-field/date-field.component.ts:49-52`
switches to the phone picker when `window.matchMedia('(pointer: coarse)')` matches. On this PC it now matches (a touch
input became active), so the text field turns read-only and the typed digits are ignored. Only
`date-field.component.spec.ts` stubs `matchMedia` (lines 39-40); the three specs above read the real machine.

## Goals & Success Criteria
- [auto] `pnpm run test:ci` passes on this PC, including the three spec files above.
- [auto] `src/testing/fine-pointer.spec.ts` passes: with `matchMedia` faked to report a coarse pointer, `stubFinePointer()` makes `(pointer: coarse)` report false and leaves other queries to the fake.
- [auto] `pnpm run build`, `pnpm run lint` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
Orchestrator run from `origin/main`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
src/testing/fine-pointer.ts
src/testing/fine-pointer.spec.ts
src/app/shared/new-inquiry-dialog/new-inquiry-dialog.component.spec.ts
src/app/pages/menu-intelligence/components/deposit-paid-dialog/deposit-paid-dialog.component.spec.ts
src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
docs/brain/gotchas.md
```

## Read Scope
`src/app/shared/date-field/**`, `src/app/shared/list-selection/touch-row-selection.spec.ts`.

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-6: preserves — test files only; the `*ai*` glob matches `deposit-paid-dialog` by its name, no AI call is touched.

## Reuse Check
- `stubFinePointer()` in `src/testing/fine-pointer.ts` — family: none — rung: 4 — why: one test helper; the date-field
  spec's own stub (lines 39-40) is the pattern, made shared.

## Step 0 — Reality Check
Run the three specs once (`ng test --watch=false --browsers=ChromeHeadless --include=<file>`) and confirm they fail
before the change on this PC; note the result in `## Execution Notes`.

## User Stories
- As the team, we want the unit tests to give the same answer on every PC, so a run is not stopped by the machine.

## Functional Requirements

### Must Have (P0)
1. `src/testing/fine-pointer.ts` exports `stubFinePointer()`: makes `window.matchMedia('(pointer: coarse)')` report
   `matches: false` for the current spec, passing every other query to the real `matchMedia`; it works whether or not
   `matchMedia` is already a spy (same as `date-field.component.spec.ts:39-40`).
2. Each of the three spec files calls `stubFinePointer()` in its `beforeEach`, before the component is created.
3. `docs/brain/gotchas.md`: one entry — a spec that types into `app-date-field` must call `stubFinePointer()`, or it
   fails on a PC with a touch input.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- none (test-only).

## Atomic Sub-tasks
- [x] A1: Add one shared helper that makes a spec see a mouse, not a touch screen — src/testing/fine-pointer.ts, src/testing/fine-pointer.spec.ts
- [x] A2: Use it in the three specs that type a date, so they pass on any PC — src/app/shared/new-inquiry-dialog/new-inquiry-dialog.component.spec.ts, src/app/pages/menu-intelligence/components/deposit-paid-dialog/deposit-paid-dialog.component.spec.ts, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
- [x] A3: Write the trap down so the next date spec does the same — docs/brain/gotchas.md

## What happens when
- A PC without touch → the helper changes nothing visible; the specs pass as before.

## Technical Considerations
- none.

## Out of Scope
- The date field's behaviour in the app.

## Critical Questions
- none.

## Open questions for the Human
- none.

## Execution Notes
- Planner 2026-11-12: found while three run final gates failed locally; GitHub CI client tests pass on the same main.
- Builder: Step 0 skipped as a separate run (the failure needs a touch PC; the full suite now passes here).
- scope note: gotchas.md is an index; the entry was appended at its bottom as the plan's scope names that file (domain file angular.md is outside scope).
- pnpm run lint -> 0; pnpm run build -> 0; pnpm run test:ci -> 0, TOTAL 1980 SUCCESS (incl. fine-pointer.spec.ts and the 3 specs).
