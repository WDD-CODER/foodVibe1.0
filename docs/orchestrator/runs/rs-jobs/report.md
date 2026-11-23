# Orchestrator run rs-jobs

Run branch: `orch/rs-jobs` (from `origin/main` at 379f842) · started 2026-11-23T10:40:58.807Z · finished 2026-11-23T11:21:39.187Z
Result: 1 merged, 0 parked, skipped or left out, 1 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is 379f842.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 676 Things that happen by themselves: the scheduler, the reminder with Confirm and Cancel, automatic no-show, waiting-list expiry and the orphan-hold sweep | merged | 0 | build | 5fa47f6 |  |

## Scorecard

- Wall: 37.5 min · gate passes: 1 · asks raised mid-run: 0
- Minutes per state (summed over plans): building 23.9 · gate 9.7 · merging 1 · checking 0.4
- Checks left out (cached, skipped, not run, same tree): 10, about 3.6 min saved
  - 676: pnpm run test:ci — 145.7 s
  - final: node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm — 0.3 s
  - final: pnpm run build — 39.5 s
  - final: pnpm run lint — 28.5 s
  - final: node scripts/override-check.mjs — 0.2 s
  - final: pnpm run lint:icons — 1.2 s
  - final: pnpm run lint:no-native-select — 1.5 s
  - final: node scripts/plan-ledger-check.mjs — 0.2 s
  - final: node scripts/breadcrumbs-check.mjs — 0.3 s
  - final: node scripts/ci-scope-check.mjs --checkout-branch — 0.1 s

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-23T10:40:58.807Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 676 · none · behaviour: a Confirm tap on a token with no matching confirmed booking of that client hands the conversation to a person, like Cancel — reverse: drop the toHuman call in confirm()
- D2 · 676 · none · behaviour: the simulator's 'late' job moves the booking at max(now, startAt + holdMinutes + 1 min), so the no-show-before-start rule never blocks the simulator — reverse: pass now instead
- D3 · 676 · none · behaviour: the timer test checks that no tick runs after stopScheduler(). An unref'd timer does not show in process.getActiveResourcesInfo(), so counting active timeouts cannot prove it — reverse: none needed
- D4 · 676 · none · behaviour: the plan's `{ kind: 'template', ...templateMessage() }` does not match sendOut, which reads outbound.template and outbound.buttons; the jobs and handlers split the result of templateMessage() into template and buttons — reverse: none needed
- D5 · 676 · none · behaviour: added a new family `scheduled-jobs` in docs/brain/component-families.md (the registry check requires a heading for each new piece) and regenerated docs/brain/inventory.md — reverse: delete that section

## Run notes

- 676: the folder foodVibe1.0-orch-rs-jobs-676 was installed (root, scripts, server)
- 676: builder left undone (round 0): [human] Dandan reads the uptime-ping note added to docs/security-go-live.md (items 4–6 under D6)
- 676: GATE: skip pnpm run test:ci — no change under src/**, public/**, shared/**, angular.json, tsconfig*.json, karma.conf.*
- 676: the folder foodVibe1.0-orch-merge-rs-jobs was installed (root, scripts, server)
- FINAL: same tree as plan 676's gate — node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm, pnpm run build, pnpm run lint, node scripts/override-check.mjs, pnpm run lint:icons, pnpm run lint:no-native-select, node scripts/plan-ledger-check.mjs, node scripts/breadcrumbs-check.mjs, node scripts/ci-scope-check.mjs --checkout-branch skipped

## Models per agent

- 676 builder: sonnet
- 676 reviewer: sonnet

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 676 Things that happen by themselves: the scheduler, the reminder with Confirm and Cancel, automatic no-show, waiting-list expiry and the orphan-hold sweep: Dandan reads the note this plan adds to `docs/security-go-live.md`: reminders go out only while the

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/rs-jobs --title "Orchestrator run rs-jobs" --body-file .claude\orchestrator-runs\rs-jobs.md
```

Context added by learning: 3.8k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0 → 0 → 0 · parked 0 → 0 → 0
