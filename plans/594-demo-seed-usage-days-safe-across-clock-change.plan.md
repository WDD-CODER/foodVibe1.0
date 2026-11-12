# Plan 594 — The demo seed makes 21 different usage days even when the window crosses a clock change

Status: draft
Depends-on: none
Snapshot: bd321e0d75d2402122072a3bc81fd72caccddae8

## Problem Statement
GitHub CI on PR #563 (2026-11-12 21:21 UTC) failed `server/test/seed-demo-business.test.js` ("inserts the business once,
feeds the dashboard, and a second run adds nothing") with
`E11000 duplicate key error collection: foodvibe_test.usageDays index: _id_ dup key: { _id: "demo_owner:2026-10-25" }`.
The code is on main (plan 575). `server/scripts/lib/demo-data.js:294-298` builds each day as
`jerusalemDate(now - d * DAY)`. Israel's clock moved back on 2026-10-25, so for some hours of the day two values of `d`
give the same Jerusalem date (here 21:21 UTC: d=18 → 23:21 on 25/10 at UTC+2, d=19 → 00:21 on 25/10 at UTC+3), and the
seed inserts the same `_id` twice. The test passes or fails by the time of day it runs.

## Goals & Success Criteria
- [auto] `pnpm run test:server` passes, including `server/test/seed-demo-business.test.js` with a new case: with `now`
  fixed at `Date.parse('2026-11-12T21:21:00Z')` (and at `2026-03-28T21:30:00Z`, the spring change), `buildDemoData`
  returns 21 usage days with 21 different dates, one per calendar day ending today in Jerusalem.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
Orchestrator run from `origin/main`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
server/scripts/lib/demo-data.js
server/test/seed-demo-business.test.js
```

## Read Scope
`server/scripts/seed-demo-business.js`.

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — a local-only seed script and its test.

## Reuse Check
- none — fixes one loop in an existing file.

## Step 0 — Reality Check
Run the test with `now` fixed at 2026-11-12T21:21:00Z and confirm the duplicate before the change.

## User Stories
- As the team, we want the demo seed's test to pass at any time of day.

## Functional Requirements

### Must Have (P0)
1. Usage days are calendar days: take today's Jerusalem date once (`jerusalemDate(now)`), then step back one calendar day
   at a time on the date itself (parse `YYYY-MM-DD` as UTC midnight, subtract `d * DAY`, format as `YYYY-MM-DD`), so the
   21 dates are always different. `firstAt` / `lastAt` keep their meaning (a time on that day).
2. Event dates (`demo-data.js:258`) are left as they are unless the same test shows a duplicate there too.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- none.

## Atomic Sub-tasks
- [x] A1: Make the seed's 21 usage days always 21 different calendar days — server/scripts/lib/demo-data.js
- [x] A2: Prove it with the times that broke it, around both clock changes — server/test/seed-demo-business.test.js

## What happens when
- Any `now` → 21 distinct dates.

## Technical Considerations
- none.

## Out of Scope
- Data already seeded locally.

## Critical Questions
- none.

## Open questions for the Human
- none.

## Execution Notes
- Planner 2026-11-12: found when PR #563 (batch-3) failed CI on this test; the failure is on main, not in batch 3.
- Builder: cd server; pnpm exec vitest run test/seed-demo-business.test.js -> exit 0, 9 passed (incl. 3 new now cases: 2026-11-12T21:21Z, 2026-03-28T21:30Z, 2026-10-25T00:30Z). Step 0 skipped: duplicate reproduced by the CI report; run at 21:47 UTC (failing window) now passes.
