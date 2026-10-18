---
status: accepted
date: 2026-10-18
review-by: 2027-04-18
# supersedes: 0018-kit-changes-reach-foodvibe-as-patches
---

# 0021. Kit changes reach FoodVibe only through a kit release and `kit-sync --ref`

## Context

ADR 0018 made every kit change reach FoodVibe as a hand-applied `git apply` patch, because FoodVibe had no
`.kit/install.json` and `kit-sync` could not target it. Each fix cost an extra apply step, and templated hunks
needed hand edits. Plan 391 gave the kit tagged GitHub releases (`v0.5.0`) and `--source github:… --ref <tag>`.
Plan 392 added `kit-install --adopt`, which records the current files of a project that already carries the
workflow, and adopted FoodVibe with it: `kit-sync.ps1 -Target ..\foodVibe1.0` now works. That is the exit
condition 0018 named.

## Decision

Kit-owned files (`docs/workflow-kit/kit-owned.json`) change in FoodVibe only through a kit release:

1. Change the file in `../ai-workflow-kit` on a kit branch and PR (session opened in the kit folder).
2. Merge, then cut a release (`vX.Y.Z` tag + GitHub release, the kit README's **Releasing** steps).
3. In a FoodVibe slot: `kit-sync.ps1 -Target ..\foodVibe1.0 -Ref vX.Y.Z` (dry-run), then `-Apply`, then
   build + checks + `/ship` as one `chore(kit): sync ai-workflow-kit vX.Y.Z` commit with `.kit/install.json`.
4. A fix found in FoodVibe goes to the kit first. When it can't wait, make the same edit in FoodVibe and in the
   kit in one session; the next sync then sees a matching file.
5. A change that fits FoodVibe only is an override in `kit.config.json` (`path` + `reason`), not a kit change.

The full loop, semver rules and the adopt step: the kit's `docs/CHANGE-LOOP.md`.

This amends ADR 0015's ownership note ("change it in the kit, then kit-sync"): kit-sync always targets a
tagged release, never the kit's working folder.

Rejected: keeping patch mode as a fallback (two paths drift, and the patch path skips the release record in
`.kit/install.json`), and syncing from the local kit folder (`local:` source) for FoodVibe (no tag, so nothing
records which kit version FoodVibe runs).

## Consequences

- Every kit change shows up in FoodVibe as one sync commit naming the release; `.kit/install.json` says which
  release FoodVibe runs (`ref`, `commit`).
- A small fix now needs a release. Patch releases (`vX.Y.Z+1`) are cheap and that cost is accepted.
- `scripts/kit-owned.mjs`'s block message and `AGENTS.md`'s kit-owned rule point here.
- ADR 0018 is superseded.

## Review

Check how many kit releases were cut and whether any FoodVibe sync hit a `conflict`; if conflicts are common,
look at which files keep diverging and whether they should be overrides.
