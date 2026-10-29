# Plan 506 — Remove the session-state concept from FoodVibe

Status: draft
Depends-on: 497, 419
Snapshot: c5e6916634cf8f1aad1a7acf852e0642a876e072

## Problem Statement

Kit v1.8.0 (kit plan 027) dropped the per-branch session-state file: done work lives in git and the PR, open work in
the plan's checkboxes and `## Execution Notes`. FoodVibe still carries the old concept in three places: 140 tracked
`docs/session-state*.md` files, two kit files FoodVibe keeps as overrides (`scripts/scope-check.mjs` and
`.claude/references/prd-template.md`, plan 450's reuse layer) that still allow or template `docs/session-state-<branch>.md`,
and project-owned docs and scripts (AGENTS.md, the brain, `.gitignore`, `ci-scope-check` and its test, the workflow map)
that still tell agents to write or read it. Agents keep following the stale instructions, and the installed fleet mod (an
old build, kit fix pending) keeps producing new files. Until that fix ships: no `/handoff` and no handoff button; use
`/compact`.

Checked on origin/main `c5e69166` (2026-10-29): `kit-sync -Ref v1.9.0` dry-run reports `0 new, 0 kit-update,
0 conflicts, 0 removed-from-kit, 21 overrides`; `scripts/write-session-state.mjs` and `scripts/session-state-path.mjs`
no longer exist. The two override files are therefore not drift — the sync skips them by design — and they are fixed by
hand (A2). The kit's own legacy lines (`.claude/commands/cleanup.md:52`, `.claude/commands/ship.md:210`,
`scripts/local-excludes.mjs`, `scripts/take-plan.mjs`) are removed by kit plan 032 and arrive with the next kit-sync;
nothing to do here.

## Goals & Success Criteria

**Primary:** no file FoodVibe owns names, allows or templates a session-state file; the 140 old files are gone from git.

- [auto] In the repo root, this prints nothing (every remaining mention is history or kit-owned):
  `git grep -n -i -e "session-state" -e "session state" -- . ':!docs/brain/decisions' ':!sessions' ':!notes' ':!.claude/sessions' ':!.claude/todo-archive' ':!.claude/reports' ':!plans/archive' ':(exclude,glob)plans/*-*/**' ':!plans/506-*' ':!docs/archive' ':!docs/mvp/runs' ':!docs/handoff-321-validation-findings.md' ':!docs/workflow-kit/manifest.json' ':!docs/workflow-kit/manifest.md' ':!docs/workflow-kit/lessons-triage.md' ':!src' ':!.claude/commands/cleanup.md' ':!.claude/commands/ship.md' ':!scripts/local-excludes.mjs' ':!scripts/take-plan.mjs'`
- [auto] `git ls-files 'docs/session-state*.md'` prints nothing, and `.claude/.session-state-path` does not exist in the slot.
- [auto] `pnpm run build` exits 0 and `pnpm run test:scripts` (`node --test scripts/test/*.test.mjs`) exits 0 with no failing test.
- [auto] `node scripts/scope-check.mjs --deps --plan=plans/506-remove-the-session-state-concept-from-foodvibe.plan.md` prints `DEPENDS_ON: ok (497, 419)` and `node scripts/scope-check.mjs --reuse --plan=<same>` exits 0 — proves the rebased `scope-check.mjs` has both the kit's new commands and the plan-450 reuse layer.
- [auto] `diff <(git -C ../ai-workflow-kit show v1.9.0:core/scripts/scope-check.mjs) scripts/scope-check.mjs` shows only rendered placeholders plus the reuse-layer lines (one import, one `--reuse` dispatch, usage text); same for `.claude/references/prd-template.md` against `core/.claude/references/prd-template.md` (only the `## Reuse Check` block and rendered placeholders). Paste both diffs in Execution Notes.
- [human] After the kit fix ships and the fleet mod updates: `/ship` on a small change and one `/handoff`, and no `docs/session-state*` file appears.

## Execution Mode
- Parallel: no
- Concurrent plans: none in wt-1/wt-2/wt-3 while the Worker edits the open plans' lines (A5 only touches 419/497 if they are still open)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/session-state*.md
AGENTS.md
.gitignore
docs/brain/index.md
docs/brain/glossary.md
docs/brain/projectbrief.md
docs/brain/how-it-works.md
docs/brain/gotchas.md
docs/brain/gotchas/agent-workflow.md
docs/brain/gotchas/git-workflow.md
docs/agent/workflow-map.md
docs/workflow-kit/parameters.md
scripts/scope-check.mjs
scripts/ci-scope-check.mjs
scripts/test/ci-scope-check.test.mjs
.claude/references/prd-template.md
kit.config.json
plans/419-*.plan.md
plans/497-*.plan.md
```

`kit.config.json` is in scope only for the two override `reason` strings (A2). `plans/419-*` and `plans/497-*` are in scope
only for their "Always allowed" line and only while they are still open under `plans/` (A5).

## Read Scope

Entire repo, plus `../ai-workflow-kit` at tag `v1.9.0` (read-only source of the kit versions of the two override files).

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — workflow docs, workflow scripts and tracked notes only; no app, server or data change (`src/` is not in scope).

## Reuse Check
- none — docs and workflow-script cleanup; no new component, util, pipe, service or `.c-*` class.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol and print one line per commit: `ok` or `conflict: <what>`. STOP only on a `conflict`.

## Functional Requirements

### Must Have (P0)

- A1: delete the old files — `git rm` every tracked `docs/session-state*.md` (140 on `c5e69166`; use `git ls-files 'docs/session-state*.md' | xargs git rm -q`), and delete the untracked local pointer `.claude/.session-state-path` if it exists in the slot. Do not touch `.claude/sessions/**`, `sessions/**`, `notes/**`.
- A2: rebase the two overrides onto kit v1.9.0 (Human decision: keep the plan-450 reuse layer, take everything else from the kit) —
  - `scripts/scope-check.mjs`: start from `git -C ../ai-workflow-kit show v1.9.0:core/scripts/scope-check.mjs`; render its placeholders by hand with FoodVibe's values (`{{project.i18nFile|quoted}}` → `'public/assets/data/dictionary.json'`, `{{paths.hotspots|quoted}}` → `'src/styles.scss', 'src/app/app.routes.ts'`, `{{ownership.upstreamPaths|json}}` → `[]`, `{{git.mainBranch}}` → `main`); then re-add from the current file the `import { runReuseCheck } from './lib/reuse-check.mjs'` line, the `if (args.reuse) process.exit(runReuseCheck({ args, repoRoot }))` dispatch line and `--reuse --plan=<p>` in the usage string. The kit file has no `docs/session-state-${branch}.md` allowance and no `:(glob)docs/session-state*.md` pathspec, and `sanitizeBranch` is not needed any more — do not carry them over. Check that the result has `cmdDeps`, `cmdTags` and `branchPlanPath` (new in the kit) and that `scripts/lib/plan-deps.mjs`, `scripts/lib/done-when.mjs` exist on `main` (they do on `c5e69166`; if one is missing, STOP → Escalation).
  - `.claude/references/prd-template.md`: start from `git -C ../ai-workflow-kit show v1.9.0:core/.claude/references/prd-template.md`; render `{{git.mainBranch}}` → `main`, `{{paths.hotspots}}` → `src/styles.scss, src/app/app.routes.ts`, `{{project.uiLocale}}` → `Hebrew RTL`, `{{project.i18nFile}}` → `public/assets/data/dictionary.json`, `{{paths.planChecks}}` → `docs/agent/plan-checks.md`; then re-insert the current file's `## Reuse Check` block (between `## Architecture Impact` and `## Step 0 — Reality Check`). The kit's "Always allowed" line has no `docs/session-state-<branch>.md` — keep it that way.
  - `kit.config.json`: the two overrides' `reason` strings say "plan 450 reuse layer on top of kit v1.9.0 (rebased by plan 506); queued as a kit PR".
- A3: scrub the project-owned files —
  - `AGENTS.md` line 19 (Compaction rule) becomes: "Compaction: on a context-full warning, state open signals/todos in chat, then prefer `/compact focus on <current job + open signals>`; between unrelated tasks prefer `/clear` and read the plan's Execution Notes." Line 23: "never only a session-state/commit note" → "never only a chat or commit note".
  - `.gitignore`: delete line 62 (`.claude/.session-state-path`; the kit's `scripts/local-excludes.mjs` already excludes it locally) and the comment block at lines 73–78.
  - `docs/brain/index.md` line 3, `glossary.md` line 10, `projectbrief.md` line 30: current work status lives in the open plans under `plans/` (their checkboxes and `## Execution Notes`), `.claude/todo.md`, git and the PR — say that, name no old file. `docs/brain/how-it-works.md` lines 18, 120, 210: the `docs/session-state.md` node/row/table entry becomes the open plan's `## Execution Notes` (keep the mermaid syntax valid). `docs/brain/gotchas.md` line 21: "session state" → "plan Execution Notes".
  - `docs/brain/gotchas/agent-workflow.md` line 15: persist to "plan files under `plans/` (checkboxes, `## Execution Notes`) and `.claude/todo.md`"; lines 321 and 323: "a session-state 'Human decision' line" → "a chat note", "a session-state note is never checked again" → "a chat note is never checked again".
  - `docs/brain/gotchas/git-workflow.md` section "Tracked session-state pointer dirties every ship/merge" (lines 29–35): replace the whole section with the kit v1.9.0 seed text of `core/docs/brain/gotchas/git-workflow.md` — heading "A rewritten state file dirties every ship (so the kit has none)" and its three paragraphs, ending "Keep no session-state file. Done work is in git and the PR; open work is the plan's checkboxes and `## Execution Notes`; a loose end for the Human goes in the PR body." — except drop its last sentence about deleting old files (this plan did that). Note: that heading keeps the word "session-state" inside the quoted kit sentence; reword to "Keep no state file." so the Done-when grep stays empty.
  - `docs/agent/workflow-map.md` lines 60, 130, 191, 215, 269, 286, 291, 318: remove `/ship` Phase 5 "session-state write", the `session-state-path.mjs` row, the `docs/session-state*.md` artifact row and the SessionStart "loads previous session-state / sets save target" text; where a flow line needs a replacement say "open work: plan checkboxes + Execution Notes". Delete rows for scripts that no longer exist rather than renaming them.
  - `docs/workflow-kit/parameters.md` line 110: drop `docs/session-state.md` (+ per-branch …) from the runtime-paths list.
- A4: CI scope check — `scripts/ci-scope-check.mjs` header comment (lines 12–13): `--checkout-branch` now exists so `scope-check.mjs` can name the plan from the branch when no `--plan` is given (kit `branchPlanPath`); say that, not the session-state reason. `scripts/test/ci-scope-check.test.mjs` test at line 145: rename to "--checkout-branch names a detached checkout after the branch" and commit an in-scope file (e.g. `src/elsewhere/a.ts` under the fixture plan's scope — read the fixture's scope at the top of the file) instead of `docs/session-state-feat-900-demo.md`; keep the two asserts (exit 0, `branch --show-current` equals the branch). The branch name `chore/session-state` in the test at line 99 is just an arbitrary non-feat name — rename it `chore/anything`.
- A5: open plans 419 and 497 — only if `plans/419-*.plan.md` or `plans/497-*.plan.md` is still directly under `plans/` after the run branch merged (plan-close normally moves a merged plan to `plans/<range>/`, which is history and stays untouched): remove `` `docs/session-state-<branch>.md`, `` from its "Always allowed" line. The other open plans were fixed by the Planner on `main` when this plan was saved.

### Should Have (P1)
- none

## Atomic Sub-tasks

- [ ] A1: Delete the 140 old per-branch state files from git and the local pointer file so no agent reads stale status again — git rm the 140 tracked state files under docs/; delete the untracked pointer file under .claude/ — docs/ (the old per-branch state files)
- [ ] A2: Rebuild the two kit-override files from kit v1.9.0 and put only the reuse layer back, so they stop allowing a state file and gain the kit's newer checks — render placeholders by hand; keep import + --reuse dispatch; keep ## Reuse Check block; update override reasons — scripts/scope-check.mjs, .claude/references/prd-template.md, kit.config.json
- [ ] A3: Rewrite the rules and brain docs so they say where work status lives now instead of naming the old file — AGENTS.md compaction rule with the kit's wording; brain points to plans, todo, git and PR; gitignore lines 62 and 73–78 removed; workflow map rows for dead scripts removed — AGENTS.md, .gitignore, docs/brain/index.md, docs/brain/glossary.md, docs/brain/projectbrief.md, docs/brain/how-it-works.md, docs/brain/gotchas.md, docs/brain/gotchas/agent-workflow.md, docs/brain/gotchas/git-workflow.md, docs/agent/workflow-map.md, docs/workflow-kit/parameters.md
- [ ] A4: Make the CI scope-check test prove the branch naming without relying on a state file being allowed — header comment reworded; test at line 145 commits an in-scope fixture file — scripts/ci-scope-check.mjs, scripts/test/ci-scope-check.test.mjs
- [ ] A5: Clean the two plans from the live run only if they are still open after the run merges — Always-allowed line only; closed plans in plans/<range>/ stay untouched — plans/419-*.plan.md, plans/497-*.plan.md
- [ ] A6: Prove nothing FoodVibe owns still names the old file and the build and script tests pass — run the Done-when grep, pnpm run build, pnpm run test:scripts, the --deps/--reuse checks and the two kit diffs; paste outputs — this plan file (Execution Notes)

## Technical Considerations
- Dependencies: plans 497 and 419 merged (run branch `orch/run-497-419`); `take-plan` refuses before that. Kit v1.9.0 checked out or cached in `../ai-workflow-kit` (the `git show v1.9.0:…` reads need the tag).
- Why by hand and not kit-sync: an `overrides` entry is never written by the sync. The `.kit/install.json` records for the two files stay as they are (the sync does not read them for overrides).
- History stays untouched (Human decision): `docs/brain/decisions/**`, `sessions/**`, `notes/**`, `.claude/sessions/**`, `.claude/todo-archive/**`, `.claude/reports/**`, closed plans in `plans/<range>/` and `plans/archive/`, `docs/archive/**`, `docs/mvp/runs/**`, `docs/handoff-321-validation-findings.md`, `docs/workflow-kit/{manifest.json,manifest.md,lessons-triage.md}`. `src/app/core/services/user.service.ts:142` says "session state" in the login sense and stays.
- Kit-owned legacy lines (`cleanup.md`, `ship.md`, `local-excludes.mjs`, `take-plan.mjs`) are kit plan 032's; the next `kit-sync` brings the removal. They are excluded from the Done-when grep.
- Backend / API: none. Auth and validation: none. Security surface: none (`scope-check.mjs` becomes stricter: one allowance fewer). Data / migration: none.
- Project checks (`docs/agent/plan-checks.md`): no app or server code → no log-query item; Reuse Check filled (none); no hotspot, translation or data change.

## Open Questions
- Q: Take the kit version of the two override files or keep the local change? A: rebase — kit v1.9.0 plus the plan-450 reuse layer, overrides kept (Human, 2026-10-29).
- Q: Run now beside run-497-419 or after it? A: after — Depends-on: 497, 419; executed with take-plan in a free slot (Human, 2026-10-29).
- Q: Kit-managed legacy lines? A: excluded from the grep; kit plan 032 removes them (Human, 2026-10-29).
- Q: Extra history paths and `src/` excluded from the grep? A: yes (Human, 2026-10-29).

## Execution Notes
- 2026-10-29 Planner: the 10 other open plans (410, 411, 422, 471, 473, 498–502) and design plans 372–374 had `docs/session-state-<branch>.md` removed from their "Always allowed" line, and 372–374's "Update session-state." sub-task text (plus the mirrored `.claude/todo.md` lines) dropped, in the plan-save push on `main`. 419 and 497 were left alone (live run).
