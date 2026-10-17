# Plan 390 — Workflow Kit Phase 6A: Drift Reconciliation and Project Overrides

Status: active
Track: code — here (not design)
Snapshot: 7db0890ef2f25865256f679e36adde3dbc7310e6

## Problem Statement
Phase 6 makes `../ai-workflow-kit` (public: https://github.com/WDD-CODER/ai-workflow-kit) the one source of truth that FoodVibe and new projects pull from with `kit-sync`, ending patch mode (ADR 0018). It is split into three plans that run in order: **390 (this) → 391 → 392**. Take them one at a time; each starts only after the previous one has merged (FoodVibe and kit).

Before FoodVibe can be adopted, the kit and FoodVibe must agree. They no longer do (re-checked by the Planner 2026-10-17):

- `node scripts/kit-extract.mjs --check` **fails**: `KIT_EXTRACT: FAIL — 84/89 core, 18/23 pack:angular, 26/26 layer:cursor, 1/1 pack:node-express landed (10 problems)`. The 10 missing kit files are all from skills v2 (FoodVibe `110afab7`, `fb6ce80b`: `preflight.mjs`, `github-sync-gate.mjs`, `techdebt-report.mjs`, `breadcrumbs-check.mjs`, skill `evals/`, `save-plan/reference/mid-flight-sync.md`, `breadcrumbs` skill + Cursor rule).
- Two kit changes were made kit-first but never landed on kit `main`:
  - kit PR #4 `chore/skills-v2-port` (skills v2, 39 files): open since 2026-10-10, `CONFLICTING`, its check is red.
  - kit branch `feat/take-plan-brief-and-validation-cards` (`fb7c071`, `core/.claude/commands/take-plan.md` +10 lines, the PLAN BRIEF + HOW TO VALIDATE opening, FoodVibe `d6d2d279`): pushed, no PR.
- Since the old snapshot (`c186c9c0`, 2026-10-06) FoodVibe also got: open-plan folders `plans/design/` (plan 406 — already in kit as PRs #6/#7, new config key `plans.openDirs`), plan auto-close (`plan-close.mjs`, kit PR #5), validation cards (kit PR #3), the QA harness (plan 408: `qa-up`, ports 4205/3005/4206), design port (plan 405), pino logging (plan 383). Each of these is either kit-owned (must match the kit) or FoodVibe-only (must be classified so the drift check ignores it).
- A fresh extract diffed against the kit differed in ~60 files on 2026-10-06 (`settings.json`, `ship.md`, `take-plan.mjs`, `ci.yml`, `standards-security.md`, `workflow-map.md`, `standards-backend.md`, …). Many differences are on purpose (placeholders, `<!-- PACK -->` markers, splits); some are real drift. Nobody has classified them. FoodVibe also keeps some deliberate local differences (e.g. `ci.yml`'s root `npm ci` for `build:schemas`) that `kit-sync` would flag as a conflict on every run.

Decisions (Dandan, 2026-10-06): pull by git fetch of a tag; v0.x until FoodVibe adopts; FoodVibe adopts in one PR; no license (all rights reserved); validation-round fixes keep flowing as ADR 0018 patches until plan 392 retires patch mode.

Order (Planner, 2026-10-17): this plan now runs **before** plan 393. 393 was meant to go first, but it has not started and its Step 0 would stop on the same stranded kit work this plan cleans up. 393 runs after 390 merges, still as an ADR 0018 patch. The drift check from A4 then confirms 393 kept both sides equal.

## Goals & Success Criteria
**Primary:** one repeatable check says "kit and FoodVibe agree except for the declared differences".

- [auto] `node scripts/kit-extract.mjs --check` prints `KIT_EXTRACT: ok`, exit 0 (today it fails with 10 problems).
- [auto] Kit PR #4 (skills v2) and the take-plan brief branch are merged into kit `main` or closed with their content landed another way; `git -C ../ai-workflow-kit branch -a --no-merged main` lists neither, and `gh pr list -R WDD-CODER/ai-workflow-kit` shows no PR from before this plan.
- [auto] `docs/workflow-kit/drift-classification.md` has one row per differing file, each classed `intended` / `drift-fixed` / `override` / `project-only`; no row is unclassed (Worker shows the row count against the fresh-extract diff count).
- [auto] The kit's drift check (A5), run against FoodVibe with FoodVibe's `kit.config.json`, prints `KIT_DRIFT: ok — 0 undeclared differences, N overrides`, exit 0; editing one managed file in a scratch copy makes it exit 1 naming that file.
- [auto] Kit `node tools/sync.mjs` reports an overridden path as `override` (not `conflict`) in a scratch install test; `--apply` leaves it untouched.
- [auto] `node scripts/kit-manifest-check.mjs` (+ `--lessons`), `node scripts/kit-owned.mjs --check`, the kit's `node tools/leak-check.mjs`, `pack-check.mjs`, `install-check.mjs` all pass.
- [auto] `npx ng build` passes.
- [human] Dandan reviews `drift-classification.md` and agrees with every `override` row (each one is a difference FoodVibe keeps forever).

## Execution Mode
- **Parallel:** no. Single Worker in a FoodVibe `wt-N` slot (wt-1 is free on 2026-10-17); kit edits by path in `../ai-workflow-kit`.
- **Concurrent plans:** no other plan that edits kit-owned files or the kit repo while this one runs. Plan 393 waits until this merges. Plan 409 Stage 5 (moving the mods into the kit) may run alongside only if it writes nothing outside the kit's `layers/claude-code-mods/**`; its `kit.json` bump and README change wait for plan 391. Plan 409 Stage 6 (retiring shell hooks) is held back to the end of phase 6 (after the last of the three plans).
- **Isolated DB:** no.
- **Kit edits:** on a kit branch `feat/390-drift-reconciliation`, pushed to GitHub with a kit PR; Dandan merges it. Kit-first, then each fix reaches FoodVibe as an ADR 0018 patch in this plan's branch. Use `GITHUB_TOKEN= gh ...` for kit writes (the env token is read-only).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/workflow-kit/**
kit.config.json
scripts/kit-extract.mjs
# Drift fixes patched in from the kit (ADR 0018). Write only files that
# drift-classification.md marks drift-fixed with FoodVibe as the side that changes.
.claude/**
.cursor/**
.github/workflows/**
.husky/**
docs/agent/**
scripts/**
README_WORKFLOW.md
```

**Outside this repo:** the kit repo `../ai-workflow-kit/**` (main output) and its GitHub PRs. Scratch test dirs under the session scratchpad.

## Read Scope

Entire FoodVibe repo and the kit repo. Start from `docs/workflow-kit/manifest.md`, `manifest.json`, `kit-owned.json`, `parameters.md`, ADRs 0015, 0018 and 0020, the kit README, `kit.config.json` (its `$comment` lists every key, including `plans.openDirs`), `tools/install.mjs`, `tools/sync.mjs`.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a FoodVibe file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry. When a drifted file's right side is unclear (FoodVibe newer vs kit newer), ask the Human per file — never pick silently. Closing a kit PR or deleting a kit branch: show what would be lost and wait for Dandan's go.

## Architecture Impact

- INV-none: preserves — workflow tooling only (kit repo, `docs/workflow-kit/`, scripts, CI); no app runtime file or invariant `Touches` glob is changed.

## Step 0 — Reality Check

0. **Both repos on their latest state, before anything else.** FoodVibe: `git fetch origin --prune`; the slot branch is based on the current `origin/main` (take-plan does this — confirm `git log -1 origin/main` matches). Kit: `git -C ../ai-workflow-kit fetch --prune`; local `main` equal to `origin/main` (`git -C ../ai-workflow-kit pull --ff-only` if behind; STOP and ask if it is ahead). The kit's untracked `.claude/sessions/` folder is session logs, not work. Leave it alone; it does not count as uncommitted work.
1. **Unmerged kit work.** Expected: PR #4 `chore/skills-v2-port` and branch `feat/take-plan-brief-and-validation-cards` (plus the old `origin/chore/skills-v2`, which PR #4 replaced). These are handled in A1, so they don't stop the plan. Anything **else** unmerged: STOP and ask.
2. Check that no open FoodVibe Worker branch holds an unported kit-owned change: `node scripts/lib/slot.mjs --list`, then diff each claimed slot against `kit-owned.json`. On 2026-10-17, wt-2 = `fix/408-qa-up-build-schemas` and wt-3 = `feat/404-cook-view-redesign`. List what you find; any kit-owned file there becomes a row in A2.
3. `node scripts/kit-extract.mjs --check`: record the problems (expected: the 10 skills-v2 files above). `kit-manifest-check` (+ `--lessons`).
4. Fresh extract into a scratchpad folder, diff against the kit: record the real file count.
5. Check the two old validation items:
   - ship-prep calls a big uncommitted diff ULTRA-TRIVIAL (`scripts/ship-prep.mjs` `ULTRA_TRIVIAL_RE`, line ~27).
   - Plan-number reuse across open Worker branches. `scripts/next-plan-number.mjs` now exists and save-plan uses it, so this is probably fixed; confirm it.
   Record `still open` / `fixed` for each.

## Functional Requirements

### Must Have (P0)
- [ ] Stranded kit work landed: PR #4 rebased on kit `main`, conflicts resolved, check green, merged by Dandan; the take-plan brief change merged by PR (or folded into PR #4); `origin/chore/skills-v2` deleted after Dandan's go. Then `kit-extract --check` is clean.
- [ ] `docs/workflow-kit/drift-classification.md`: one row per differing file — path, class (`intended` placeholder/PACK/split, `drift-fixed` + which side was right, `override` + reason, `project-only` for FoodVibe files that are not kit-owned, e.g. QA harness / design-port files if Step 0 finds them unclassified), kit commit for fixes.
- [ ] Every real drift fixed kit-first (kit branch + PR), then patched into FoodVibe (ADR 0018).
- [ ] Project overrides: an `overrides` list in the project's `kit.config.json` (`[{ "path": "...", "reason": "..." }]`). `tools/sync.mjs` reports those paths as `override`, never `conflict`, and `--apply` never writes them; `tools/install.mjs` skips them; the kit README documents it.
- [ ] Kit drift check (`tools/drift-check.mjs`, wrapped by `kit-drift.ps1`): renders every managed file with the target's `kit.config.json` and compares with the target's copy; prints the A5 output line; works without `.kit/install.json` (so it runs on FoodVibe before adoption).
- [ ] FoodVibe `kit.config.json` with real values (from `docs/workflow-kit/parameters.md`, including `plans.openDirs: ["plans/", "plans/design/"]` and the stack packs `angular` + `node-express` + layer `cursor`) and its `overrides` list (at least `.github/workflows/ci.yml`).
- [ ] The Step 0 validation items fixed kit-first if still open.

### Won't Have (this plan)
- Remote pull, tags, releases (plan 391). `.kit/install.json` for FoodVibe and retiring patch mode (plan 392). The Claude Code mods layer (plan 409).

## Atomic Sub-tasks
- [x] A0: Step 0 reality check; record the extract-check problems, real diff count, open-slot kit-owned changes and the two validation items' state — `docs/workflow-kit/drift-classification.md`
- [ ] A1: Land stranded kit work: rebase + fix PR #4 (skills v2), PR the take-plan brief branch, Dandan merges, delete `chore/skills-v2` after go; `kit-extract --check` clean — `../ai-workflow-kit/**`
- [x] A2: Classify every differing file — `docs/workflow-kit/drift-classification.md`
- [ ] A3: Fix real drift kit-first; patch into FoodVibe (ADR 0018); name kit SHAs in commits — `../ai-workflow-kit/**`, `.claude/**`, `scripts/**`, `docs/agent/**`
- [ ] A4: `overrides` in kit `tools/sync.mjs` + `tools/install.mjs` + kit README; scratch install test — `../ai-workflow-kit/tools/**`
- [ ] A5: Kit `tools/drift-check.mjs` + `kit-drift.ps1`; FoodVibe `kit.config.json` with real values + overrides — `../ai-workflow-kit/tools/drift-check.mjs`, `kit.config.json`
- [x] A6: Fix ship-prep ULTRA-TRIVIAL and plan-number reuse kit-first if Step 0 found them still open — `scripts/ship-prep.mjs`, `scripts/next-plan-number.mjs` (Step 0: both already fixed, nothing to do)
- [ ] A7: `manifest.md` phase 6A paragraph; run every [auto] criterion; kit PR merged by Dandan; `/ship` — `docs/workflow-kit/manifest.md`

## Out of Scope
GitHub fetch, versioning and release hygiene (391); FoodVibe adoption, new ADR, change loop docs, second-consumer proof (392); the mods layer (409).
