# Overnight report — 2026-10-10 (01:04–01:07 Israel)
Base commit: f739e9a1

## Scoreboard
| Plan | Status | Branch | PR | Build | Specs |
|---|---|---|---|---|---|
| 318 tech-debt quick fixes | DONE (bookkeeping only) | chore/night-1010-techdebt-quickfixes | #365 | pass | n/a (no code change) |

Nothing else was eligible: every other top-level plan is landed, done, or on the excluded list.

## Merge order / dependencies
- #365 is independent (touches only `plans/318-*.plan.md`). No open PRs from earlier nights.

## Per plan
### Plan 318 — Nightly maintenance follow-ups  [DONE]
What landed: no code change — nutrition-badge `input()`, the 2 stray semicolons and the venue NG8102 `?? []` warnings were already fixed on main. Ticked those 4 items in the plan with evidence.
Auto validation: `rg '@Input\(|@Output\('` (non-spec) → 0 · `rg -n ';\s*$' src/app --type ts -g '!*.spec.ts'` → 0 · `rg 'available_infrastructure_.*\?\?' src/app` → 0 · `npx ng build` → exit 0, no NG8102 — all pass.
Decisions I made:
- Left `auth.interceptor.ts` BehaviorSubject (line 28) open — excluded from unattended runs.
- Bundle budget is climbing again: 46.12 kB over 500 kB (was 39.17 kB on 2026-09-27). Noted, not acted on.
Human validation checklist: none.
Merge notes: None.

## Already in flight (from earlier runs)
- None open. 0 open PRs on the repo at run start.

## Skipped / excluded / not reached
- 353 — landed via PR #363 but the plan file still says `Status: active` with 7 unticked sub-tasks: needs Planner bookkeeping (tick + archive).
- 362 — `Status: done`, landed via PR #359, but 5 sub-tasks still unticked: bookkeeping.
- 395 — done (0 open sub-tasks); could be archived out of the top level.
- 321, 366, 372, 373, 374, 376, 377, 384, 386, 390, 391, 392, 393 — excluded umbrella / kit / decision-gate plans per run rules.
- 318 leftovers — auth.interceptor BehaviorSubject, >300-line refactor backlog: excluded by rule.

## Environment limits hit
- None used: no server tests needed tonight.
