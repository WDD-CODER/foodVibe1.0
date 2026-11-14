# Plan 607 — The phone bottom bar shows no waiting-count badge

Status: draft
Track: design
Depends-on: 597
Snapshot: 7c16fc4d620acf269f6d85dafccf9ac1d1e18777
## Problem Statement

On 2026-11-14 the Human asked for the waiting-count badge (`.c-chip__count`) to come off the phone bottom bar
(`<nav class="bottom-nav">` in `src/app/core/components/header/header.component.html`). Plan 597 moved the badge onto
the clients icon (`.bottom-nav__icon`), but on narrow screens it still crowds the six tabs. The top header's badges stay:
the desktop and tablet nav pills, `data-testid="header-waiting-count"`.

## Goals & Success Criteria
**Primary:** at phone width the bottom bar's clients tab shows only its icon and label, with no count badge. The
desktop and tablet header badge is unchanged.

Done when:
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 375x812 on `/dashboard` signed in, `.bottom-nav .c-chip__count` has count 0 — `e2e/ui/607-1.spec.ts`, screenshot `screens/607-1.png`
- [human] On a phone-width window the bottom bar shows six clean tabs, with no number on the clients tab.
- [human] Nothing else moved: on a wide window the top menu still shows the waiting count next to "לקוחות והזמנות".

## Execution Mode

- Parallel: yes.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/components/header/header.component.html
src/app/core/components/header/header.component.scss
src/app/core/components/header/header.component.spec.ts
e2e/ui/607-1.spec.ts
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

- INV-none: preserves — a template and stylesheet change in the header only. No server, schema, ownership or AI path
  is touched.

## Reuse Check

- none — the plan only removes markup and styles.

## User Stories

- As a chef on my phone, I want a calm bottom bar, so that every tab name reads clearly.

## Functional Requirements

### Must Have (P0)
- [ ] `header.component.html`: inside `.bottom-nav`, delete the `@if (waitingCount_() > 0) { <span class="c-chip__count" …> }`
  block on the clients link. Unwrap the icon from `.bottom-nav__icon` unless another rule still needs the wrapper.
- [ ] The clients tab's `aria-label` keeps the full section name and drops the count, since the badge is gone.
- [ ] `header.component.scss`: remove the `.bottom-nav__icon` / `.c-chip__count` rules that nothing uses any more.
- [ ] `header.component.spec.ts`: update the plan-597 cases:
  - the bottom bar renders no `.c-chip__count`;
  - the top nav still renders `[data-testid="header-waiting-count"]` when `waitingCount_() > 0`.

## Atomic Sub-tasks

- [x] 607-A1: Take the waiting-count badge out of the phone bottom bar — delete the badge block, tidy the aria-label — src/app/core/components/header/header.component.html
- [x] 607-A2: Drop the badge styles the bottom bar no longer uses — src/app/core/components/header/header.component.scss
- [x] 607-A3: Update the header spec and prove on a phone screen that the badge is gone — src/app/core/components/header/header.component.spec.ts, e2e/ui/607-1.spec.ts

## Technical Considerations

- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- The top header's badge.
- The waiting-count service.

## Critical Questions

none

## Execution Notes

- decision: Human 2026-11-14 — "remove it in mobile from the nav".
- pnpm run build -> exit 0; pnpm run lint -> exit 0
- pnpm run test:ci -> first run 2 unrelated ExportService timeouts, rerun exit 0, 2191 SUCCESS
- [ui] 607-1: written, not run (e2e/ui/607-1.spec.ts)
