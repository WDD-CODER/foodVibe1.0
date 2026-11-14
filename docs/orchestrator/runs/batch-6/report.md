# Orchestrator run batch-6

Run branch: `orch/batch-6` (from `origin/main` at afc44e9) · started 2026-11-14T10:41:48.461Z · finished 2026-11-14T11:26:51.172Z
Result: 3 merged, 0 parked, skipped or left out, 3 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is afc44e9.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 582 Recipe AI examples stay inside their business | merged | 0 | build | eb76044 |  |
| 595 Website imports refuse redirects to internal addresses | merged | 0 | build | bcb02db |  |
| 596 Platform CSV downloads show Hebrew correctly in Excel | merged | 0 | build | 421b998 |  |

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-14T10:41:48.461Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 582 · none · behaviour: old GEMINI_SHOTS documents without businessId are left in place and never read or pruned (as the plan says) — reverse: run a cleanup or migration that deletes or stamps them
- D2 · 582 · none · behaviour: POST /shots now stores userId as req.user.userId instead of req.user._id (the plan's P0 requires it) — reverse: pass req.user._id again in saveShot
- D3 · 595 · none · behaviour: a 3xx answer with no Location header is returned as the final answer, so it ends as 502 as before — reverse: change safeFetch to throw instead
- D4 · 595 · none · behaviour: tests use public IP literals (93.184.216.34) so no dns.lookup stub is needed — reverse: switch to hostnames and stub dns.promises.lookup

## Run notes

- 582: the folder foodVibe1.0-orch-batch-6-582 was installed (root, scripts, server)
- 582: the folder foodVibe1.0-orch-merge-batch-6 was installed (root, scripts, server)
- 595: the folder foodVibe1.0-orch-batch-6-595 was installed (root, scripts, server)
- 596: the folder foodVibe1.0-orch-batch-6-596 was installed (root, scripts, server)
- 596: builder left undone (round 0): [human] Excel check of the downloaded CSV on /platform: not done by the builder

## Models per agent

- 582 builder: sonnet
- 582 reviewer: sonnet
- 595 builder: sonnet
- 595 reviewer: sonnet
- 596 builder: sonnet
- 596 reviewer: sonnet

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 596 Platform CSV downloads show Hebrew correctly in Excel: On `/platform`, download "ייצוא קבלה CSV" and open it in Excel by double-clicking it: the business names read in

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/batch-6 --title "Orchestrator run batch-6" --body-file .claude\orchestrator-runs\batch-6.md
```

Context added by learning: 3.5k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0.43 → 0 → 0 · parked 0 → 0 → 0
