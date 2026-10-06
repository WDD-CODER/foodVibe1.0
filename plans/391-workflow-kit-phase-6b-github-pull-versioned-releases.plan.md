# Plan 391 — Workflow Kit Phase 6B: GitHub Pull and Versioned Releases

Status: draft
Snapshot: c186c9c0

## Problem Statement
Phase 6, part 2 of 3 (**390 → 391 → 392**). This plan must run after plan 390.

`kit-install` and `kit-sync` only read a local kit folder, and the public kit repo (https://github.com/WDD-CODER/ai-workflow-kit, `main`, no tags, `kit.json` 0.4.0) has no release process. Its README is stale ("phase 4 of 5, local only, no remote"), there is no CHANGELOG, and the leak-check CI has never been confirmed running on GitHub. The repo is public, so it must also be checked for FoodVibe-specific data that shouldn't be there.

Decisions (Dandan, 2026-10-06): pull by **git fetch of a tag** into a cache (no tarball, no npm package, no plugin — ADR 0015 rejected the plugin); **v0.x** until FoodVibe adopts (first tag here `v0.5.0`; `v1.0.0` is cut in plan 392 once FoodVibe runs on kit-sync); **no license** — all rights reserved, stated in the README.

## Goals & Success Criteria
**Primary:** a project installs or syncs from a tagged GitHub release and records exactly which one.

- [auto] `node tools/install.mjs --source github:WDD-CODER/ai-workflow-kit --ref v0.5.0 --target <scratch> --packs angular` installs from a shallow fetch into the cache and writes `"source": "github:WDD-CODER/ai-workflow-kit", "ref": "v0.5.0", "commit": "<sha>"` into `<scratch>/.kit/install.json`.
- [auto] `node tools/sync.mjs --target <scratch>` with no `--source` uses the source+ref recorded in `install.json`; `--ref vX` with a ref that doesn't exist exits non-zero with `KIT_SYNC: FAIL — ref vX not found`, nothing written.
- [auto] A local-folder source still works: `--source ../ai-workflow-kit` (or no `--source` when run from the kit) records `"source": "local:<path>"`.
- [auto] `git ls-remote --tags origin v0.5.0` prints the tag; a GitHub release `v0.5.0` exists (`gh release view v0.5.0`).
- [auto] The kit's leak-check workflow ran green on GitHub for the release commit (`gh run list --workflow leak-check.yml`).
- [auto] A public-data sweep (`tools/leak-check.mjs` extended, or a one-off grep list in the PR) finds no FoodVibe names, paths, emails, URLs or secrets outside declared examples.
- [auto] Kit `leak-check`, `pack-check`, `install-check` pass.
- [human] Dandan reads the new README + CHANGELOG and agrees they describe how to install, sync and upgrade.

## Execution Mode
- **Parallel:** no. Kit-side plan: the Worker opens its session in `../ai-workflow-kit` (as in phases 2–4). FoodVibe side writes only this plan file.
- **Isolated DB:** no.
- **Kit edits:** kit branch `feat/391-github-pull-releases` + kit PR; Dandan merges; the tag/release is cut from the merged `main`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/workflow-kit/manifest.md
```

**Outside this repo:** the kit repo `../ai-workflow-kit/**` (main output), its GitHub repo (tags, releases, Actions), and the kit's fetch cache folder (choose a per-user cache, e.g. `~/.cache/ai-workflow-kit/`, never inside a project). Scratch install targets under the session scratchpad.

## Read Scope

The kit repo; FoodVibe `docs/workflow-kit/**`, ADR 0015.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry. Pushing a tag or publishing a release is outward-facing: show the tag name + release notes and wait for Dandan's go first.

## Architecture Impact

- INV-none: preserves — kit repo and its release process only; no FoodVibe app file is touched.

## Step 0 — Reality Check

0. **Both repos on their latest state, before anything else.** FoodVibe: `git fetch origin --prune`; the slot branch is based on the current `origin/main` (take-plan does this — confirm `git log -1 origin/main` matches). Kit: `git -C ../ai-workflow-kit fetch --prune`; local `main` clean and equal to `origin/main` (`git -C ../ai-workflow-kit pull --ff-only` if behind; STOP and ask if it is ahead or has uncommitted work); `gh pr list -R WDD-CODER/ai-workflow-kit` and `git -C ../ai-workflow-kit branch -a --no-merged main` show no unmerged kit work (finish or ask first). Also check no open FoodVibe Worker branch holds an unported kit-owned change (`node scripts/lib/slot.mjs --list`, diff each claimed slot against `kit-owned.json`). Only then compare the two.
1. Plan 390 merged (FoodVibe and kit); kit `main` clean; `gh auth status` works for the kit repo (use `env -u GITHUB_TOKEN gh ...` for writes).
2. Kit `tools/install.mjs` / `sync.mjs` still read the kit root from their own location — confirm before adding `--source`.

## Functional Requirements

### Must Have (P0)
- [ ] `--source github:<owner>/<repo>` + `--ref <tag>` in `tools/install.mjs`, `tools/sync.mjs`, `tools/drift-check.mjs` and the `.ps1` wrappers: shallow `git fetch --depth 1` of the tag into `<cache>/<owner>/<repo>/<ref>/`, reuse when present, verify the tag's commit. Local-folder source kept for kit development.
- [ ] `.kit/install.json` records `source`, `ref`, `commit`; sync defaults to them; `--ref` upgrades and rewrites them on `--apply`.
- [ ] Semver in `kit.json`; `CHANGELOG.md` (Keep-a-Changelog style, phases 1–6A as the history); README rewritten (status, install/sync/upgrade from GitHub, overrides, "All rights reserved" notice).
- [ ] Release script or documented steps: bump `kit.json` → CHANGELOG entry → tag `vX.Y.Z` → `gh release create`.
- [ ] Leak-check CI confirmed running on GitHub (push + PR); public-data sweep done, findings fixed.
- [ ] Tag + release `v0.5.0`.

### Won't Have (this plan)
- npm package, Claude Code plugin, release tarballs, a LICENSE file.

## Atomic Sub-tasks
- [ ] B0: Step 0 reality check.
- [ ] B1: Fetch-to-cache helper (`tools/lib/source.mjs`) + `--source/--ref` in install, sync, drift-check, `.ps1` wrappers.
- [ ] B2: `install.json` source/ref/commit; sync defaults + `--ref` upgrade; scratch tests for all [auto] criteria.
- [ ] B3: Public-data sweep; extend leak-check if a pattern is worth keeping; confirm the GitHub Action runs.
- [ ] B4: `kit.json` semver, `CHANGELOG.md`, README rewrite, release steps.
- [ ] B5: Kit PR merged; Dandan's go; tag + GitHub release `v0.5.0`; install from GitHub into a scratch dir.
- [ ] B6: FoodVibe `docs/workflow-kit/manifest.md` phase 6B paragraph; `/ship`.

## Out of Scope
FoodVibe adoption, retiring ADR 0018, the change-loop doc, second-consumer proof, `v1.0.0` (all plan 392).
