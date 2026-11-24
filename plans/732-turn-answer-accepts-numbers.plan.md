# Plan 732 — The assistant's table answers stop failing when the model writes a number as a number

Status: draft
Depends-on: none
Snapshot: 08ba3d40619489a9b0cce50418b085f0e163f64e

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

The Planner's end-to-end test of 2026-11-24 evening (demo restaurant, assistant level 1, guest messages through
`POST /api/v1/sim/inbound`, three rounds of four questions, slot log `.claude/be.log` of `wt-2`) left the guest's
"אפשר שולחן לארבעה מחר ב-20:00?" unanswered in all three rounds. Plan 731's new log line names the cause:
`frontdesk.turn.bad_answer` `reason: bad_shape`, `paths: ["collected.party_size"]`, `codes: ["invalid_type"]` — on the
first try and on the retry.

`shared/schemas/front-desk/turn-answer.schema.ts`: `collected` is an object whose known key is `table`
(`partySize: z.number()`), and every other key goes through `.catchall(z.string().max(300))`. The model sends the
guest's answers to the request-kind questions under their question keys (`party_size`, `date`, `time` from
`shared/schemas/front-desk-templates.ts`, where `party_size` is a `'number'` question) and writes a count as a JSON
number (`"party_size": 4`). The catch-all accepts only strings, so the whole answer is refused and the turn fails
silently (R-04): the guest gets nothing.

The other failures of the same test were Google overload (503 on every model in the chain, plan 701/730's fallback
walked them all); that is not in this plan.

## Goals & Success Criteria
- [auto] `pnpm run test:server` → exit 0, including the new cases in `server/test/frontdesk-turn.test.js`:
  - a stubbed model answer with `collected: { party_size: 4, date: "2026-11-25", time: "20:00" }` and
    `intent: "book"` is accepted (no `frontdesk.turn.bad_answer` log line) and the turn completes;
  - `collected: { party_size: 4 }` reaches the stored conversation / request as the string `"4"` (the catch-all
    keeps its string type for everything downstream);
  - a boolean (`true`) is accepted as `"true"`; an object or array value under a catch-all key is still refused
    (`bad_shape`), as today;
  - a string longer than 300 characters is still refused, as today.
- [auto] `pnpm run build` → exit 0 (the shared schema is also compiled for the browser).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no new error lines.
- [human] Simulator (`/frontdesk/simulator`, as `demo_host`): a new test guest writes "אפשר שולחן לארבעה מחר ב-20:00?"
  · within about half a minute the assistant answers with a table offer ("יש מקום ... לאשר?") or asks one missing
  detail — not silence. (The Planner runs the same check three times end to end before handing it over.)

## Execution Mode
- Parallel: yes with plans that do not touch `shared/schemas/front-desk/turn-answer.schema.ts`.
- Concurrent plans: none
- Isolated DB: no
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/front-desk/turn-answer.schema.ts
server/generated/schemas/front-desk/turn-answer.schema.js
server/test/frontdesk-turn.test.js
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — the one Zod schema in `shared/schemas/front-desk/turn-answer.schema.ts` stays the single source; the generated server copy is rebuilt by `build:schemas` (run by `pnpm run test:server`), never edited by hand.
- INV-6: preserves — no model call, route or key changes; only what the server accepts from the model's JSON.
- INV-7: preserves — `collected.table` (the values the table engine validates) is unchanged; the catch-all values stay strings after parsing, and every table decision still goes through the engine.

## Reuse Check

- none — one schema line changes (the catch-all value type); no new piece.

## Defaults

- loading-and-error-states — exception — why: no screen in this plan
- hints-in-tooltips — exception — why: no screen in this plan
- empty-state-on-list — exception — why: no list or screen in this plan
- app-list-container — exception — why: no list or screen in this plan
- one-breakpoint-set — exception — why: no screen and no CSS in this plan

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a guest, when I ask for a table for four, I get an answer instead of silence.

## Functional Requirements
- `collected`'s catch-all accepts a string (max 300), a finite number or a boolean, and turns numbers and booleans
  into strings (`z.union([z.string().max(300), z.number().finite(), z.boolean()]).transform(String)` or the
  equivalent), so the parsed type of every catch-all value is still `string`.
- Objects, arrays and null under a catch-all key are still refused.
- `collected.table` and every other field are unchanged.

## UI/UX Notes
- None (server-side parsing only).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Let the assistant's collected answers hold a number or a yes/no the way the model writes them — catch-all accepts string, number, boolean and keeps them as text — shared/schemas/front-desk/turn-answer.schema.ts, server/generated/schemas/front-desk/turn-answer.schema.js (rebuilt by build:schemas)
- [x] A2: Prove a table question with a numeric party size is answered, and that bad values are still refused — the cases of Goals in server/test/frontdesk-turn.test.js — server/test/frontdesk-turn.test.js
- [x] A3: Run every check of this plan and record the evidence — test:server, build, log-query; evidence into Execution Notes

## Technical Considerations
- `server/generated/schemas/**` is produced by `pnpm run build:schemas`; commit the rebuilt file only if the repo
  tracks it (check `git ls-files`); never hand-edit it.
- Keep the inferred `TurnAnswer` type's catch-all as `string` so `frontdesk-turn.js` and the request writer need no change.

## Out of Scope
- Google overload (503 on every model): plans 701 and 730.
- A guest-facing message when a turn fails (R-04 keeps it silent).

## Critical Questions
- none

## Execution Notes
- behaviour: numbers and booleans are kept as their string form (`4` → `"4"`), so everything after the parse sees the same type as before.
- pnpm run test:server -> exit 0, 177 files, 2491 tests pass (incl. 3 new plan-732 cases)
- pnpm run build -> exit 0; pnpm run lint -> exit 0; log-query error -> exit 0
- server/generated/schemas is not tracked by git; rebuilt by build:schemas, not committed
