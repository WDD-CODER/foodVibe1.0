# Plan 761 — The all-users AI budget bar shows only to the platform admin

Status: draft
Depends-on: none
Track: code
Snapshot: edea0010

## Problem Statement
Dandan, grading run live-ready on 2026-11-27: "the `ai-usage-label` that shows the budget for all users should show
only to the admin. Any other user should get only his own `ai-usage-label`."

In `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html` (two copies of the bar, around lines 64 and 281 on
`orch/live-ready`) the `.ai-usage-bar` shows «תקציב AI יומי (לכל המשתמשים)» (`ai_daily_budget`), the shared count
`used / budget`, the models line and the track, and then the user's own line «נשארו לך N מתוך M קריאות AI»
(`callsLeftLine_()`, `data-testid="ai-calls-left"`, plan 736).

## Goals & Success Criteria
**Primary:** a regular user sees only his own calls-left line; the platform admin sees the all-users bar as today.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run test:ci` exits 0.
- [auto] `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.spec.ts`: for a non-admin user both copies of the
  bar render no `ai_daily_budget` label, no shared count and no track, and do render `[data-testid="ai-calls-left"]`;
  for the platform admin the shared label, count and track render as before (and the «ללא הגבלה» line of plan 736).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/761-ai-daily-budget-bar-admin-only.plan.md` → `ARCH: ok`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] Signed in as a regular user, open the AI recipe window: only «נשארו לך … מתוך … קריאות AI» shows, with no
  «תקציב AI יומי (לכל המשתמשים)» bar.
- [human] Signed in as the platform admin, the same window shows the all-users bar and «קריאות AI ללא הגבלה (מנהל
  מערכת)».

## Execution Mode
- Parallel: no — one plan.
- Concurrent plans: none in this run.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.scss
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-6: preserves — no AI call changes; only which label shows.
- INV-none: preserves — display only.

## Reuse Check
- none — the existing platform-admin signal the component already reads for plan 736's «ללא הגבלה» line.

## Defaults

- hints-in-tooltips — exception — why: no new hint.
- loading-and-error-states — exception — why: no new request.
- unsaved-changes-on-leave — exception — why: no form change.
- confirm-destructive-action — exception — why: nothing deleted.
- empty-state-on-list — exception — why: no list.
- row-action-icons — exception — why: no row.
- live-summary — exception — why: no summary box.
- leave-and-return — exception — why: no navigation.
- app-list-container — exception — why: no list.
- one-breakpoint-set — exception — why: no layout change.
- anchored-popup — exception — why: no popup added.
- unit-dropdown-add — exception — why: no dropdown.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a user, I want to see only my own AI allowance, not a platform figure that means nothing to me.

## Functional Requirements
- Wrap the shared label, count, models line and track of both bar copies in the platform-admin condition; the user's
  calls-left line stays for everyone who has one.

## UI/UX Notes
- A non-admin's bar holds only the one line; no empty track.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] E1: Write the spec for admin and non-admin bars — src/app/shared/ai-recipe-modal/ai-recipe-modal.component.spec.ts
- [ ] E2: Show the all-users bar only to the platform admin — src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html
- [ ] E3: Run every automatic check and paste the outputs under Execution Notes — plans/761-ai-daily-budget-bar-admin-only.plan.md

## What happens when
- A user with no allowance line (none set yet): the bar is not shown at all.

## Technical Considerations
- Run branch: a new run cut from `orch/live-ready` (plans 736, 737). Do not run browser checks.

## Out of Scope
- The server's daily budget itself.

## Critical Questions
- none

## Execution Notes
