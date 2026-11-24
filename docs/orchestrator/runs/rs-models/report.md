# Orchestrator run rs-models

Run branch: `orch/rs-models` (from `origin/main` at b52cc08) · started 2026-11-24T10:12:38.317Z · finished 2026-11-24T10:44:36.701Z
Result: 1 merged, 0 parked, skipped or left out, 1 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is b52cc08.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 730 The assistant skips AI models Google has retired and moves on when a model is gone | merged | 0 | build | baf133f |  |

## Scorecard

- Wall: 27.6 min · gate passes: 2 · asks raised mid-run: 0
- Minutes per state (summed over plans): building 15.5 · gate 8.8 · merging 1.1 · checking 0.4
- Checks left out (cached, skipped, not run, same tree): 17, about 15.5 min saved
  - 730: pnpm run test:ci — 178.2 s
  - 730: node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm — 0.1 s
  - 730: pnpm run build — 31.5 s
  - 730: pnpm run lint — 23.4 s
  - 730: pnpm run lint:icons — 1.1 s
  - 730: pnpm run lint:no-native-select — 1 s
  - 730: pnpm run test:server — 458.2 s
  - 730: pnpm run test:ci — 178.2 s
  - final: node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm — 0.1 s
  - final: pnpm run build — 31.5 s
  - final: pnpm run lint — 23.4 s
  - final: node scripts/override-check.mjs — 0.1 s
  - final: pnpm run lint:icons — 1.1 s
  - final: pnpm run lint:no-native-select — 1 s
  - final: node scripts/plan-ledger-check.mjs — 0.1 s
  - final: node scripts/breadcrumbs-check.mjs — 0.2 s
  - final: node scripts/ci-scope-check.mjs --checkout-branch — 0.1 s

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-24T10:12:38.317Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 730 · none · behaviour: removed the ai.media.no_model test (no catalog model lacks a medium now) and rewrote the plan-619 pdf/audio cases as 'every catalog model takes pdf, audio and image' — reverse: restore the cases if a model without a medium is added
- D2 · 730 · none · behaviour: the fallback log for a gone model carries kind 'gone' (as the plan says), and an extra warn ai.model.gone {model, resetAt} is logged — reverse: remove the warn line in callWithFallback

## Run notes

- 730: the folder foodVibe1.0-orch-rs-models-730 was installed (root, scripts, server)
- 730: builder left undone (round 0): [human] simulator check (three guest turns of 'מתי אתם פתוחים?'): not run, left for the Human
- 730: GATE: skip pnpm run test:ci — no change under src/**, public/**, shared/**, angular.json, tsconfig*.json, karma.conf.*
- 730: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-models --plan plans/730-skip-retired-ai-models.plan.md failed first; runs after the fix: node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm
- 730: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-models --plan plans/730-skip-retired-ai-models.plan.md failed first; runs after the fix: pnpm run build
- 730: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-models --plan plans/730-skip-retired-ai-models.plan.md failed first; runs after the fix: pnpm run lint
- 730: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-models --plan plans/730-skip-retired-ai-models.plan.md failed first; runs after the fix: pnpm run lint:icons
- 730: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-models --plan plans/730-skip-retired-ai-models.plan.md failed first; runs after the fix: pnpm run lint:no-native-select
- 730: GATE: not run — node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-models --plan plans/730-skip-retired-ai-models.plan.md failed first; runs after the fix: pnpm run test:server
- 730: node "C:/coding projects/Cursor/foodVibe1.0/scripts/kit-checks.mjs" --base origin/orch/rs-models --plan plans/730-skip-retired-ai-models.plan.md failed before the slow checks: back to the builder (a bounce, not counted in maxFixRounds); the next gate runs every check
- 730: GATE: skip pnpm run test:ci — no change under src/**, public/**, shared/**, angular.json, tsconfig*.json, karma.conf.*
- 730: the folder foodVibe1.0-orch-merge-rs-models was installed (root, scripts, server)
- FINAL: same tree as plan 730's gate — node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm, pnpm run build, pnpm run lint, node scripts/override-check.mjs, pnpm run lint:icons, pnpm run lint:no-native-select, node scripts/plan-ledger-check.mjs, node scripts/breadcrumbs-check.mjs, node scripts/ci-scope-check.mjs --checkout-branch skipped

## Models per agent

- 730 builder: sonnet
- 730 builder fix: sonnet
- 730 reviewer: sonnet

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 730 The assistant skips AI models Google has retired and moves on when a model is gone: On the simulator (`/frontdesk/simulator`, as `demo_host`), the test guest writes "מתי אתם פתוחים?" three

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/rs-models --title "Orchestrator run rs-models" --body-file .claude\orchestrator-runs\rs-models.md
```

Context added by learning: 3.8k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0 → 0 → 0 · parked 1 → 0 → 0
