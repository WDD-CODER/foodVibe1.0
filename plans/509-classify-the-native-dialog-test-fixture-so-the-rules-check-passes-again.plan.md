# Plan 509 — Classify the native-dialog test fixture so the rules check passes again

Status: active
Depends-on: none
Snapshot: c1a54f6f8b43884ce28b668deebce6ee74c0223d

## Problem Statement

The `rules` check fails on every pull request and on `main` itself (since plan 498 merged, `0c7b8730`): the kit manifest
check reports `unclassified: scripts/test/fixtures/reuse/native-dialog.diff`. Plan 498 added that fixture for the
reuse-lint test (`scripts/test/reuse-lint.test.mjs:50`) but did not add its entry to `docs/workflow-kit/manifest.json`,
where all 15 sibling files under `scripts/test/fixtures/reuse/` are listed one by one as `project` / `stay`. A red
`rules` on `main` hides real failures and trains everyone to merge past red checks.

Checked on origin/main `c1a54f6f` (2026-10-29): `node scripts/kit-manifest-check.mjs` prints
`KIT_MANIFEST: FAIL — 342 classified, 1 unclassified, 0 duplicates, 0 unhandled-coupling (1 problems)` and lists only
that one path. `docs/workflow-kit/manifest.json` is FoodVibe-owned (not in `kit-owned.json`), so no kit release is needed.

## Goals & Success Criteria

**Primary:** `rules` is green on `main`; the manifest lists the new fixture the same way as its siblings.

- [auto] `node scripts/kit-manifest-check.mjs` prints `KIT_MANIFEST: ok — 343 classified, 0 unclassified, 0 duplicates, 0 unhandled-coupling` and exits 0.
- [auto] `node --test scripts/test/reuse-lint.test.mjs` exits 0 (the fixture itself is untouched).
- [auto] (does not hold — see Execution Notes) `node scripts/kit-manifest-check.mjs --lessons` exits 0 (the lessons half of the same CI step still passes).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/509-classify-the-native-dialog-test-fixture-so-the-rules-check-passes-again.plan.md` exits 0 and `node scripts/scope-check.mjs --reuse --plan=<same>` exits 0.
- [human] After the PR is open: the `rules` check on it is green.

## Execution Mode
- Parallel: yes
- Concurrent plans: any; the only shared file is `docs/workflow-kit/manifest.json`, which plan 506 does not edit (its grep excludes it)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry
without escalating).

```scope
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

- INV-none: preserves — the plan edits one workflow-manifest data file; no invariant in `docs/brain/invariants.md` touches it.

## Reuse Check

- none — no component, util, pipe, service or `.c-*` class is created; one JSON entry copies the shape of its siblings.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef-side maintainer, I want the rules check green on `main` so that a red check always means a real problem.

## Functional Requirements

### Must Have (P0)
- [x] `docs/workflow-kit/manifest.json` has exactly one entry for `scripts/test/fixtures/reuse/native-dialog.diff`.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- none — no app screen or dictionary key is touched.

## Atomic Sub-tasks
- [x] A1: Add the missing manifest entry for the native-dialog test fixture so the rules check stops failing — insert one object after the `mixed.diff` entry (alphabetical, before `registry-broken.md`) with `"path": "scripts/test/fixtures/reuse/native-dialog.diff"`, `"tier": "project"`, `"action": "stay"`, `"params": []`, `"refs": []`, `"notes": "Test fixture for the reuse-check and reuse-lint script tests; data, not workflow."` (copy the `clean.diff` entry's shape and wording exactly) — docs/workflow-kit/manifest.json
- [x] A2: Prove the manifest check is green and nothing else moved — run the Done-when commands and paste the `KIT_MANIFEST: ok` line in Execution Notes; `git diff --stat` must show only `docs/workflow-kit/manifest.json` (+8 lines)

## Technical Considerations
- Dependencies: `scripts/kit-manifest-check.mjs` (reads the manifest; an entry's `path` must match the file exactly once).
- New files needed: none.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: no app or server code is touched, so the `log-query` Done-when item from `docs/agent/plan-checks.md` does not apply; the Reuse Check and Architecture Impact above are filled.
- Do not edit `docs/workflow-kit/manifest.md` (its counts are history, not checked by CI) and do not use a glob in `excluded`: the 15 existing per-file entries would then be duplicates.

## Out of Scope
- Making the check tolerate future fixtures (a glob entry for `scripts/test/fixtures/reuse/**` would mean removing the 15 per-file entries); plans 499, 500 and 502 name `scripts/test/fixtures/reuse/**` in their scope, so if any of them adds a fixture it needs its own manifest entry in the same commit.
- The `server-tests` and `test` failures seen on PR #481 (they passed on `main`).
- Any change to `scripts/test/fixtures/reuse/native-dialog.diff` or to plan 498.

## Critical Questions
none

## Execution Notes
- `node scripts/kit-manifest-check.mjs` → `KIT_MANIFEST: ok — 343 classified, 0 unclassified, 0 duplicates, 0 unhandled-coupling`, exit 0.
- `node --test scripts/test/reuse-lint.test.mjs` → 14 pass, 0 fail. `scope-check.mjs --arch` → `ARCH: ok INV-none`; `--reuse` → `REUSE: ok none`. `git diff --stat`: only `docs/workflow-kit/manifest.json` (+8) besides this plan file.
- Done-when item 3 is wrong: `kit-manifest-check.mjs --lessons` exits 1 on origin/main (`KIT_LESSONS: FAIL — 115 entries triaged, 13 missing`, rows missing in `docs/workflow-kit/lessons-triage.md`). It does not touch the fixture, and CI's `rules.yml:35` runs the manifest check without `--lessons`, so it does not affect the red check this plan fixes. Left alone (out of scope); needs its own plan.
