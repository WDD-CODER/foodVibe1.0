# Orchestrator run test-512-422

Run branch: `orch/test-512-422` (from `origin/main` at 3986b15) · started 2026-11-02T08:23:37.923Z · finished 2026-11-02T09:06:22.396Z
Result: 1 merged, 1 parked, skipped or left out, 2 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is 3986b15.
Stopped: wave 1 parked 512 — later waves not started

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 422 Nightly QA morning report and shorter runs once pages are clean | merged | 1 | build | dcfad4a |  |
| 512 Add the client record, owner-only writes and staff-limited reads on the server | parked | 1 | judgment |  | replan needed: The plan's Read-Write Scope forbids server/test/cross-business.test.js, but that test loops over every ALL_USER_ENTITY_TYPES entry and the plan's own sub-task (register 'clients' in collections.js) cannot pass it without a 'clients' body. T |

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-02T08:23:37.923Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): n/a (first run) · collapsed: 0 · ask: 7 · follow-ups: 3

### To grade

- D13 · 512 · ask · data-shape-derived-field · behaviour: derived phoneNormalized from phone on the doc just before the schema check (the strict schema requires the field, so 'after validation' is impossible); an invalid phone still fails on the phone regex and a client-sent value is always overwritten — reverse: make phoneNormalized optional in client.schema.ts and derive after checkStoredDoc in generic.js POST/PUT
  recommend: Keep server-derived phoneNormalized before schema check. — why: Touches stored data shape for clients.
- D15 · 512 · ask · data-lineage · behaviour: clients carry no _masterId/_userModified on POST or PUT (new NO_LINEAGE set in generic.js shared with taxonomyTerms), because the strict schema rejects them and INV-2 says clients never carry _masterId — reverse: remove 'clients' from NO_LINEAGE and allow the two fields in clientSchema
  recommend: Keep clients without lineage fields per INV-2. — why: Data shape and invariant change.
- D14 · 512 · ask · data-shape-default · behaviour: server does not store the clientType default (checkStoredDoc validates only, it does not store parsed output), so a client posted without clientType is stored without it — reverse: add clientType: 'private' to the POST stamp for clients in generic.js
  recommend: Stamp clientType 'private' on POST so stored docs are consistent. — why: Stored data lacks a default field.
- D7 · 422 · ask · plan-snapshot-advance · behaviour: advanced the plan's Snapshot line to origin/main HEAD after Step 0 passed, instead of leaving drift reported — reverse: restore Snapshot: 8d7997e5b732007392f50cc07f40b2aa430f37d6 in the plan file
  recommend: Restore the old Snapshot unless you want it advanced. — why: Hides drift the plan was meant to report.
- D5 · 422 · ask · exit-code-masking · behaviour: qa-nightly-down.ps1 logs the morning report's exit code but still exits with the qa-down exit code, so a report failure never fails the task. Reverse: exit with the report's code instead.
  recommend: Keep exit of qa-down but log the report failure. — why: Report failures stay silent to the task scheduler.
- D3 · 422 · ask · report-status-wording · behaviour: with no UI-run row in INDEX.md, no new S1/S2 findings and QA on current code, the status is ATTENTION with Do now 'check why the UI run did not run'. The plan marks that row as ATTENTION but gives no Do now wording for it. Reverse: drop the 'else if (!ui)' branch in buildReport.
  recommend: Keep ATTENTION with the check-why wording unless you prefer another. — why: Sets what the morning report tells the owner.
- D4 · 422 · ask · report-status-blocked · behaviour: a night with no '.nightly.log' lines on the report date gives BLOCKED, 'the nightly tasks did not run'. The plan does not cover this case. Reverse: remove the nightLogEmpty branch.
  recommend: Keep BLOCKED when nightly log is empty. — why: New status rule changes the report users read.

### Accepted by triage

- D1 · 422 · accept · test-fixture-location · behaviour: fixtures for the morning-report tests are built at run time in a temp dir, because bugs/ is gitignored at any depth. The scope entry scripts/test/fixtures/qa-morning/** is unused. Reverse: add static fixture folders there.
  recommend: Keep run-time temp fixtures; drop unused scope entry. — why: Test-only, reversible, forced by gitignore.
- D2 · 422 · accept · step-failure-scope · behaviour: a failed 'git merge --ff-only' in the up step does not count as a failed step; only 'qa-up.ps1', 'code-qa', 'merge' and 'qa-down.ps1' exit codes are checked. The plan says QA continues on the current tree in that case. Reverse: add the git lines to STEPS in morning-report.mjs.
  recommend: Keep: ff-only failure is not a failed step. — why: Matches the plan's stated behaviour; reversible.
- D6 · 422 · accept · idempotent-history · behaviour: morning-history.md has one line per date; rerunning the report for the same date replaces that line instead of appending a duplicate. Reverse: always append.
  recommend: Keep one line per date, replace on rerun. — why: Avoids duplicates; reversible.

### Follow-ups

- D8 · 422 · follow-up · build-check-substitute · seen: the plan's 'ng build' check is not an allowed command; I ran 'pnpm run build' and logged the difference in Execution Notes. Reverse: run 'npx ng build' yourself.
  recommend: Keep pnpm run build; difference is logged. — why: Human already chose this (answer 6).
- D10 · 422 · follow-up · worktree-upstream · seen: git status -sb in the wt-2 worktree shows feat/422-nightly-qa-morning-report tracking origin/orch/test-512-422 (ahead 2), so a bare push targets the wrong upstream branch; I pushed the named branch explicitly
  recommend: Plan a fix so worktree branches track their own remote branch. — why: Wrong upstream is a workflow defect.
- D16 · 512 · follow-up · test-scope-gap · seen: server/test/cross-business.test.js:55 — the every-type test fails for any new collection until BODY has an entry; future plans that add a collection must list this file in scope
  recommend: Note in plan template that new collections must list cross-business.test.js. — why: Recurring scope gap for future plans.

### Noise

- D9 · 422 · noise · evidence · seen: scope-check --drift still prints 'REALITY: drift' because main has new commits since the plan snapshot; that is expected. I ran Step 0 by symbol and every symbol was ok.
  why: Expected drift note, not a decision.
- D11 · 422 · noise · evidence · seen: C:/coding projects/Cursor/foodVibe1.0-wt-2 scripts/test/code-qa-rotation.test.mjs + qa-morning-report.test.mjs rerun -> 22 pass, 0 fail
  why: Test result confirmation.
- D12 · 422 · noise · evidence · seen: morning-report.mjs --root=C:/dev/foodVibe-qa --date=2026-10-20 --out=- -> exit 0, Status: ATTENTION
  why: Run result confirmation.

## Run notes

- 512: starts on the judgment tier: Architecture Impact names INV-1
- 422: builder left undone (round 0): The two [human] morning checks (first and second morning after merge) are left unticked as Human follow-ups
- 512: builder left undone (round 0): node scripts/log-query.mjs --since=plan-start --level=error not run by the builder: skipped per the Human's readiness answer (the run report's 'App errors since the run started' section replaces it)
- final gate failed: node scripts/kit-manifest-check.mjs — unclassified: scripts/qa/morning-brief.mjs | unclassified: scripts/qa/morning-report.mjs | unclassified: scripts/test/qa-morning-report.test.mjs | KIT_MANIFEST: FAIL — 373 classified, 3 unclassified, 0 duplicates, 0 unhandled-coupling (3 problems)

## Models per agent

- 422 orch-builder: claude-sonnet-5-5 / medium
- 422 orch-gate: claude-haiku-5-5 / low
- 422 orch-check-plan: claude-sonnet-5-5 / high
- 422 orch-check-bugs: claude-sonnet-5-5 / high
- 422 orch-check-rules: claude-sonnet-5-5 / high
- 422 orch-security: claude-sonnet-5-5 / high
- 422 orch-verify: claude-sonnet-5-5 / medium
- 422 orch-merge: claude-sonnet-5-5 / low
- 512 orch-builder: claude-sonnet-5-5 / medium
- 512 orch-gate: claude-haiku-5-5 / low

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 422 Nightly QA morning report and shorter runs once pages are clean: The first morning after merge: `C:\dev\foodVibe-qa\bugs\qa-runs\MORNING.md` exists with that night's
2. 422 Nightly QA morning report and shorter runs once pages are clean: The second night after merge: `queue.md` lists only pages whose code changed under "due" and the rest

- Decide on 512: replan needed: The plan's Read-Write Scope forbids server/test/cross-business.test.js, but that test loops over every ALL_USER_ENTITY_TYPES entry and the plan's own sub-task (register 'clients' in collections.js) cannot pass it without a 'clients' body. T
- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/test-512-422 --title "Orchestrator run test-512-422" --body-file .claude\orchestrator-runs\test-512-422.md
```

Context added by learning: 661 chars across 6 roles

Trend: first logged run
