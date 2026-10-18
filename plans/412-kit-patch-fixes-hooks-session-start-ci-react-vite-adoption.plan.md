# Plan 412 — Kit Patch Fixes for Hooks, Session Start and CI from the React-Vite Adoption

Status: draft
Track: code — here (not design)
Snapshot: 46cc44c7ecbb3f124b0cf4f8e0f59db460d2e6ef

## Problem Statement
Installing kit v1.0.3 into a React + Vite + Supabase project took 3 plans, 4 PRs and about 30 manual fixes. The adopting agent wrote a hand-off with every issue, its symptom and a working fix: `../ai-workflow-kit/handoff/2026-10-18-react-vite-adoption.md` (local only, untracked; **never commit it**, it names a real project and people).

This plan ships the **pure fixes** (§6 "patch" list of the hand-off) as kit **v1.0.5**: nothing a project has to do. It also fixes three leftovers from the retired agent personas found on 2026-10-18. Plans 413–416 cover the rest of the hand-off.

Fixes in this plan (hand-off issue ids):
- **I-1** git hooks without a shebang can't run on Windows (every commit failed, including `take-plan`'s claim commit).
- **I-3** SessionStart context sits under `decision` (ignored) and breaks the JSON when the session-state file has quotes or newlines.
- **I-7** gitleaks job lacks token permissions.
- **I-12** Python hook and `ship-prep` assume `python3` (the Windows Store stub fails silently).
- **I-13** pre-push refuses plans in range folders (`plans/<range>/`).
- **I-14** todo-sync fails without a repo setting and leaves `chore/todo-sync-*` branches behind.
- **I-17** stale paths in core: `save-plan` names `scripts/pre-commit-security-grep.mjs` (it is `pre-commit-secret-scan.mjs`), `workflow-map.md` names `.claude/todo-archive.md` (it is the folder `.claude/todo-archive/`), example plan names from FoodVibe in `auto-solve.md` and `save-plan`.
- **Persona leftovers:** `core/.claude/commands/docs-refresh.md` spawns `subagent_type: "generalPurpose"` (Cursor's name; Claude Code needs `general-purpose`, or drop the type); `core/.claude/commands/security.md` step 2 is a garbled sentence ("`pre-commit security grep + CI security workflow` reads relevant source files") and step 4 says "three-agent".

## Prerequisites
- Kit PR #21 (`fix/security-hardening`, v1.0.4: PR-title injection = hand-off **I-8**, git-hook bypass denies) merged and tagged `v1.0.4` by Dandan.

## Goals & Success Criteria
- [auto] Kit `node tools/install-check.mjs` and `node tools/e2e-check.mjs` pass, including a new case: target **without** husky in `package.json`, `core.hooksPath=.husky` → the first commit runs the pre-commit hook (exit 0) and a staged fake key is refused.
- [auto] `git ls-files -s core/.husky/` shows mode `100755` for every hook, and each starts with `#!/usr/bin/env sh` + `set -e`; install writes them executable.
- [auto] Each branch of `core/scripts/session-startup.sh` (idle slot / worker without state / worker with a state file containing `"`, `\`, backticks and newlines), piped into `node -e "JSON.parse(...)"`, parses, and `hookSpecificOutput.additionalContext` is a string.
- [auto] pre-push accepts a push touching only `plans/300-400/x.plan.md` and still refuses `src/x.ts`.
- [auto] `git grep -n "pre-commit-security-grep\|todo-archive\.md\|219-recipe\|generalPurpose\|three-agent" -- core` finds nothing; `node tools/leak-check.mjs` passes.
- [auto] Tag + GitHub release `v1.0.5` exist; FoodVibe chore PR with `kit-sync -Ref v1.0.5 -Apply`: `npx ng build` passes, `node scripts/kit-owned.mjs --check` passes, 0 `conflict` rows.
- [human] In a FoodVibe `wt-N` slot after the sync, a new session shows the WORKER line from SessionStart, and a normal commit runs the hooks with no `--no-verify`.

## Execution Mode
- **Parallel:** no. The Worker opens the kit session in `../ai-workflow-kit` (its own hooks apply); the FoodVibe side is only the final sync PR from a FoodVibe `wt-N` slot.
- **Concurrent plans:** no other plan editing the kit (`core/`, `tools/`, `templates/`). Plans 413–416 run after this one, in order. Plan 409 S5 / 410 / 411 kit work waits or rebases.
- **Isolated DB:** no.
- **Kit edits:** kit branch `fix/412-adoption-patch-fixes` + kit PR; Dandan merges; tag after Dandan's go.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
.kit/**
kit.config.json
docs/workflow-kit/**
# Files kit-sync -Apply writes (kit-owned; written by kit-sync, not by hand)
.claude/**
.cursor/**
.github/workflows/**
.husky/**
docs/agent/**
scripts/**
README_WORKFLOW.md
```

**Outside this repo:** kit `../ai-workflow-kit/core/**`, `templates/**`, `tools/**`, `CHANGELOG.md`, `kit.json`, `README.md` (CI / first-time setup section); kit GitHub repo (PR, tag, release).

## Read Scope
Kit repo, FoodVibe repo, the hand-off file. The adopting project's working copies are described in the hand-off; copy logic from the hand-off text, not from that repo.

## Escalation Protocol
Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry. Any `conflict` row in the FoodVibe sync dry-run: STOP and show it — never `--force`. Tags and releases: show them and wait for Dandan's go.

## Architecture Impact
- INV-none: preserves — kit workflow files and FoodVibe's kit-owned copies only; no app, server or schema file.

## Step 0 — Reality Check
- PR #21 merged and `v1.0.4` tagged; kit `main` clean and equal to `origin/main`.
- Re-read hand-off §3 I-1, I-3, I-7, I-12, I-13, I-14, I-17 against kit `main` (some may already be fixed); print one `ok` / `already fixed` line per issue.

## Design
- **Hooks (I-1):** every `core/.husky/*` starts `#!/usr/bin/env sh` + `set -e`; lint-staged runs only when `node_modules/.bin/lint-staged` exists; `install.mjs` writes hooks with the executable bit and `git update-index --chmod=+x` in the kit repo.
- **SessionStart (I-3):** build the whole output object in node (`JSON.stringify`), `additionalContext` directly under `hookSpecificOutput`; no heredoc JSON.
- **CI (I-7):** gitleaks job `permissions: { contents: read, pull-requests: read }`, `GITLEAKS_ENABLE_COMMENTS: false`; README CI note.
- **Python (I-12):** `scripts/run-python.sh` (first of `python3 python py` that passes `-c "import sys"`, else exit 0) used by the settings hook; `ship-prep.mjs` loops `python3, python, py` and prints a visible warning instead of silently returning `no_manifest`. Porting the two Python scripts to node is out of scope (later).
- **pre-push (I-13):** allow `^plans/((design|[0-9]+-[0-9]+)/)?[^/]+\.plan\.md$` (render through the existing `plans.openDirs` placeholder plus the range form).
- **todo-sync (I-14):** on `gh pr create` failure delete the pushed branch and print `::error title=todo-sync needs a repo setting::…` naming Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"; same line in install output and README first-time setup.
- **Stale paths (I-17) + persona leftovers:** as listed in the Problem Statement; example plan names become generic (`plans/123-example-feature.plan.md`).
- CHANGELOG `[1.0.5]`: fixes only, "nothing to do".

## Atomic Sub-tasks
- [ ] P0: Check which hand-off fixes are still needed on the current kit — Step 0 reality check, one line per issue — `plans/412-kit-patch-fixes-hooks-session-start-ci-react-vite-adoption.plan.md`
- [ ] P1: Make git hooks run on Windows without husky installed — shebang, set -e, guarded lint-staged, executable bit in kit and at install, e2e case without husky — `../ai-workflow-kit/core/.husky/*`, `../ai-workflow-kit/tools/install.mjs`, `../ai-workflow-kit/tools/e2e-check.mjs`
- [ ] P2: Make session start actually deliver the worker and resume text to the session — JSON built in node, additionalContext under hookSpecificOutput, test with quotes and newlines — `../ai-workflow-kit/core/scripts/session-startup.sh`
- [ ] P3: Give the secret-scan CI job the permissions it needs — gitleaks permissions + comments off + README CI note — `../ai-workflow-kit/core/.github/workflows/ci.yml`, `../ai-workflow-kit/README.md`
- [ ] P4: Stop the session manifest from silently failing when python3 is missing — run-python.sh fallback for the hook; ship-prep tries python3, python, py and warns — `../ai-workflow-kit/core/scripts/run-python.sh`, `../ai-workflow-kit/core/.claude/settings.json`, `../ai-workflow-kit/core/scripts/ship-prep.mjs`
- [ ] P5: Let the Planner push closed plans that moved into range folders — pre-push regex accepts plans/<range>/ — `../ai-workflow-kit/core/.husky/pre-push`
- [ ] P6: Make todo-sync explain the missing repo setting and clean up its branch — delete branch on failure, ::error line, install output + README first-time setup — `../ai-workflow-kit/core/.github/workflows/todo-sync.yml`, `../ai-workflow-kit/tools/install.mjs`, `../ai-workflow-kit/README.md`
- [ ] P7: Fix stale paths and leftovers from the retired agent personas — security-grep name, todo-archive folder, generic example plans, docs-refresh subagent type, garbled security step — `../ai-workflow-kit/core/.claude/skills/save-plan/SKILL.md`, `../ai-workflow-kit/core/docs/agent/workflow-map.md`, `../ai-workflow-kit/core/.claude/commands/{auto-solve,docs-refresh,security}.md`
- [ ] P8: Run all kit checks, open the kit PR and release v1.0.5 — leak-check, pack-check, install-check, e2e-check; CHANGELOG; tag after Dandan's go — kit repo
- [ ] P9: Sync FoodVibe to v1.0.5 and ship it — kit-sync dry-run (0 conflicts), Apply, ng build, kit-owned check, /ship — `.kit/install.json` + files kit-sync writes

## Out of Scope
Planner role change (413); stack-neutral core, CI config keys, dev server by config (414, 415); React-Vite pack and upstream-owned layer (416); hand-off I-28 (guards mod, tracked under plan 409).
