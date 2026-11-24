# Orchestrator run rs-fixes-2

Run branch: `orch/rs-fixes-2` (from `origin/main` at 54f0a65) · started 2026-11-23T22:54:01.818Z · finished 2026-11-24T00:32:02.621Z
Result: 2 merged, 0 parked, skipped or left out, 2 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is 54f0a65.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 701 The assistant answers when Google is busy: a second model on overload, a reason the staff can read, and a steady voice test | merged | 0 | build | aad8b8f |  |
| 702 The new-booking map shows before a time is picked, the staff read why the assistant stopped, and sign-out works from the dashboard | merged | 1 | build | d217740 |  |

## Scorecard

- Wall: 97.3 min · gate passes: 3 · asks raised mid-run: 1
- Minutes per state (summed over plans): building 59.7 · queued 51.1 · gate 15.8 · asking 9.7 · fixing 4.2 · merging 1.7 · parked 1.1 · checking 0.8
- Checks left out (cached, skipped, not run, same tree): 7, about 3 min saved
  - 702: node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm — 0.2 s
  - 702: pnpm run build — 29.7 s
  - 702: pnpm run lint — 21.4 s
  - 702: pnpm run test:ci — 122.7 s
  - 702: pnpm run lint:icons — 1.1 s
  - 702: pnpm run lint:no-native-select — 1 s
  - 702: pnpm run lint:reuse — 3 s

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-23T22:54:01.818Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 701 · none · behaviour: with fallback, a model already known to be out of its daily quota is skipped at the start; the request starts on the first usable model instead of answering model_exhausted, because the front desk has no user to choose — reverse: drop the `knownReset && fallback` branch in callGemini
- D2 · 701 · none · behaviour: /suggest always answers `reason` on a 502 ('other' when the result has no group), so the existing 400 case now expects { error: 'AI_FAILED', reason: 'other' } — reverse: send reason only when the group is not 'other'
- D3 · 701 · none · behaviour: assistantFailed is removed by a wrapper around runTurn whenever a turn in mode `turn` returns ok, a blocked turn that hands off included — reverse: unset it only on the frontdesk.turn.done paths
- D4 · 701 · none · behaviour: the front desk switches to the next free model on overload; this is a narrow exception to the 2026-10-09 rule that the server never switches models by itself. It applies only to callers that pass fallback and only among free catalog models on the shared key — reverse: drop fallback: true in server/routes/ai/frontdesk.js
- D5 · 702 · none · behaviour: the map shows read-only until a time is chosen; the owner's table pick still needs a time first — reverse: drop !this.time_() from onMapTap
- D6 · 702 · none · behaviour: on the bare dashboard, sign-out happens at once; /dashboard?tab=metadata still asks about unsaved changes — reverse: remove the _isOnBareDashboard() condition in logout()
- D7 · 702 · none · behaviour: the staff note hides as soon as anyone writes in the chat after the failure — reverse: change showAssistantFailure()

## Run notes

- 701: the folder foodVibe1.0-orch-rs-fixes-2-701 was installed (root, scripts, server)
- 701: builder left undone (round 0): kit-checks reuse-registry check: needs a family heading in docs/brain/component-families.md that names the three Reuse Check rows (callGemini options, failureReason, gemini-fallback.test.js). The file is not in the plan's scope.; [human] simulator check (three questions answered within about half a
- 701: parked: nothing to save (nothing uncommitted)
- 701: ask 701-1 (scope, the Human or the advisor answers): May the builder add a family heading naming callGemini fallback/deadlineMs, failureReason and gemini-fallback.test.js to docs/brain/component-families.md (and regenerate docs/brain/inventory.md if needed)?
- plan 701 asks 701-1 — 702 wait on the answer; the rest go on
- 701: ask 701-1 answered by the human: approved: docs/brain/component-families.md
- 701: scope of plan 701 extended on orch/rs-fixes-2 by the answer to 701-1: docs/brain/component-families.md
- 701: resumed from park/rs-fixes-2-701: round 0, tier build, after: asking 701-1: replan needed: ESCALATE: scope docs/brain/component-families.md — `node scripts/kit-checks.mjs --base origin/orch/rs-fixes-2 --plan plans/701-...p
- 701: the folder foodVibe1.0-orch-rs-fixes-2-701 was installed (root, scripts, server)
- 701: builder left undone (round 0): [human] simulator check: three questions each get an answer within about half a minute
- 701: the folder foodVibe1.0-orch-merge-rs-fixes-2 was installed (root, scripts, server)
- 702: the folder foodVibe1.0-orch-rs-fixes-2-702 was installed (root, scripts, server)
- 702: builder left undone (round 0): [ui] 702-1: written, not run; [ui] 702-2: written, not run; [ui] 702-3: written, not run; [human] cards: not ticked
- 702: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-fixes-2 --plan plans/702-booking-map-before-a-time-assistant-failure-notes-and-sign-out-from-the-dashboard.plan.md failed first; runs after the fix: node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm
- 702: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-fixes-2 --plan plans/702-booking-map-before-a-time-assistant-failure-notes-and-sign-out-from-the-dashboard.plan.md failed first; runs after the fix: pnpm run build
- 702: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-fixes-2 --plan plans/702-booking-map-before-a-time-assistant-failure-notes-and-sign-out-from-the-dashboard.plan.md failed first; runs after the fix: pnpm run lint
- 702: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-fixes-2 --plan plans/702-booking-map-before-a-time-assistant-failure-notes-and-sign-out-from-the-dashboard.plan.md failed first; runs after the fix: pnpm run test:ci
- 702: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-fixes-2 --plan plans/702-booking-map-before-a-time-assistant-failure-notes-and-sign-out-from-the-dashboard.plan.md failed first; runs after the fix: pnpm run lint:icons
- 702: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-fixes-2 --plan plans/702-booking-map-before-a-time-assistant-failure-notes-and-sign-out-from-the-dashboard.plan.md failed first; runs after the fix: pnpm run lint:no-native-select
- 702: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-fixes-2 --plan plans/702-booking-map-before-a-time-assistant-failure-notes-and-sign-out-from-the-dashboard.plan.md failed first; runs after the fix: pnpm run lint:reuse
- 702: node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-fixes-2 --plan plans/702-booking-map-before-a-time-assistant-failure-notes-and-sign-out-from-the-dashboard.plan.md failed before the slow checks: back to the builder (a bounce, not counted in maxFixRounds); the next gate runs every check
- 702: builder left undone (round 0): pnpm run build, pnpm run test:ci, lint:icons, lint:no-native-select, log-query: not run in this round; ci-scope-check --checkout-branch: skipped (it reported branch "" is not feat/NNN-*, so I could not confirm it)
- 702: builder left undone (round 1): I did not run the scope-check (kit copy) --diff command by name. kit-checks and ci-scope-check passed.; The `[ui]` items are written, not run.
- FINAL: same tree as plan 702's gate — node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm, pnpm run build, pnpm run lint, pnpm run test:ci, node scripts/override-check.mjs, pnpm run lint:icons, pnpm run lint:no-native-select, node scripts/plan-ledger-check.mjs, node scripts/breadcrumbs-check.mjs, node scripts/ci-scope-check.mjs --checkout-branch

## Models per agent

- 701 builder: sonnet
- 701 reviewer: sonnet
- 702 builder: sonnet
- 702 builder fix: sonnet
- 702 reviewer: sonnet

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 701 The assistant answers when Google is busy: a second model on overload, a reason the staff can read, and a steady voice test: On the simulator (`/frontdesk/simulator`, as `demo_host`), the test guest writes three questions in a row
2. 702 The new-booking map shows before a time is picked, the staff read why the assistant stopped, and sign-out works from the dashboard: a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal
3. 702 The new-booking map shows before a time is picked, the staff read why the assistant stopped, and sign-out works from the dashboard: the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page
4. 702 The new-booking map shows before a time is picked, the staff read why the assistant stopped, and sign-out works from the dashboard: Sign out from the dashboard: sign in as `demo_host`, stay on the dashboard, press your name at the top →
5. 702 The new-booking map shows before a time is picked, the staff read why the assistant stopped, and sign-out works from the dashboard: Fix this answer (replays the failed card): in the simulator the test guest asks "יש חניה?" and the

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/rs-fixes-2 --title "Orchestrator run rs-fixes-2" --body-file .claude\orchestrator-runs\rs-fixes-2.md
```

Context added by learning: 3.8k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0.4 → 0.5 → 0.5 · parked 0 → 1 → 0
