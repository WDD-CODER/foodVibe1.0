# Orchestrator run rs-demo

Run branch: `orch/rs-demo` (from `origin/main` at 654f3c5) · started 2026-11-23T11:37:32.237Z · finished 2026-11-23T12:12:55.839Z
Result: 1 merged, 0 parked, skipped or left out, 1 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is 654f3c5.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 674 A demo restaurant: a seeded room, a week of bookings and a waiting list, and the setup step "draw your room" | merged | 0 | build | 5979a3f |  |

## Scorecard

- Wall: 34.4 min · gate passes: 1 · asks raised mid-run: 0
- Minutes per state (summed over plans): building 18.5 · gate 12.3 · merging 1.2 · checking 0.3
- Checks left out (cached, skipped, not run, same tree): 0, about 0 min saved

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-23T11:37:32.237Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 674 · none · behaviour: the area keys are `inside`, `outside` and `barzone`, not `bar`. C-FLOOR requires keys of 6–12 characters ([a-z0-9]), and the area's display name stays 'בר' — reverse: rename the key in demo-restaurant-data.js (it needs a valid 6+ character key)
- D2 · 674 · none · behaviour: booking `createdAt` is the earlier of `now` and `startAt` − 2 days, and the demo owner's `createdAt` is `now` − 90 days. Neither is in the plan — reverse: change the one line in buildBookings or in the users row of the seed script
- D3 · 674 · none · behaviour: `docs/brain/inventory.md` was regenerated with `node scripts/inventory.mjs` and committed, although it is not in the plan's scope. The kit check reported it stale after the two component-families.md entries (both required by the reuse-registry check) — reverse: revert that file and drop the two family entries
- D4 · 674 · none · seen: the scope-check run against `origin/orch/rs-demo` lists files outside the plan scope (server/routes/generic.js, plans/600-700/697-*.plan.md, the logistics-item-manager files, .claude/todo.md and others). I did not touch them; the diff base is probably newer than my branch's merge-base. The orchestrator should re-run it on the real diff.

## Run notes

- 674: the folder foodVibe1.0-orch-rs-demo-674 was installed (root, scripts, server)
- 674: builder left undone (round 0): [ui] 674-1: written, not run (e2e/ui/674-1.spec.ts); [human] Dandan's hand check: run the seed with --write on a scratch local database and look at /bookings?view=floor
- 674: the folder foodVibe1.0-orch-merge-rs-demo was installed (root, scripts, server)
- FINAL: same tree as plan 674's gate — node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm, pnpm run build, pnpm run lint, pnpm run test:ci, node scripts/override-check.mjs, pnpm run lint:icons, pnpm run lint:no-native-select, node scripts/plan-ledger-check.mjs, node scripts/breadcrumbs-check.mjs, node scripts/ci-scope-check.mjs --checkout-branch

## Models per agent

- 674 builder: sonnet
- 674 reviewer: sonnet

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 674 A demo restaurant: a seeded room, a week of bookings and a waiting list, and the setup step "draw your room": Dandan runs the seed with `--write` on a scratch local database, signs in as the demo owner, opens

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/rs-demo --title "Orchestrator run rs-demo" --body-file .claude\orchestrator-runs\rs-demo.md
```

Context added by learning: 3.8k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0 → 0 → 0 · parked 0 → 0 → 0
