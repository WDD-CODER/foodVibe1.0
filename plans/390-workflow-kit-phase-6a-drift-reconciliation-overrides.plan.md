# Plan 390 — Workflow Kit Phase 6A: Drift Reconciliation and Project Overrides

Status: draft
Snapshot: c186c9c0

## Problem Statement
Phase 6 makes `../ai-workflow-kit` (public: https://github.com/WDD-CODER/ai-workflow-kit) a real upstream that FoodVibe and new projects pull from with `kit-sync`, ending patch mode (ADR 0018). It is split into three plans that run in order: **390 (this) → 391 → 392**.

Before FoodVibe can be adopted, the kit and FoodVibe must agree. `node scripts/kit-extract.mjs --check` is clean (byte-identical `copy` rows match), but a fresh extract diffed against the kit still differs in ~60 files (`settings.json`, `ship.md`, `take-plan.mjs`, `ci.yml`, `standards-security.md`, `workflow-map.md`, `standards-backend.md`, …). Many differences are on purpose (placeholders, `<!-- PACK -->` markers, splits); some may be real drift. Nobody has classified them. Also, FoodVibe keeps some deliberate local differences (e.g. `ci.yml`'s root `npm ci` for `build:schemas`) that a future `kit-sync` would flag as a conflict on every run.

Decisions (Dandan, 2026-10-06): pull by git fetch of a tag; v0.x until FoodVibe adopts; FoodVibe adopts in one PR; no license (all rights reserved); validation-round fixes keep flowing as ADR 0018 patches until plan 392 retires patch mode.

## Goals & Success Criteria
**Primary:** one repeatable check says "kit and FoodVibe agree except for the declared differences".

- [auto] `docs/workflow-kit/drift-classification.md` has one row per differing file, each classed `intended` / `drift-fixed` / `override`; no row is unclassed (Worker shows the row count against the fresh-extract diff count).
- [auto] The kit's drift check (A4), run against FoodVibe with FoodVibe's `kit.config.json`, prints `KIT_DRIFT: ok — 0 undeclared differences, N overrides`, exit 0; editing one managed file in a scratch copy makes it exit 1 naming that file.
- [auto] Kit `node tools/sync.mjs` reports an overridden path as `override` (not `conflict`) in a scratch install test; `--apply` leaves it untouched.
- [auto] `node scripts/kit-extract.mjs --check`, `node scripts/kit-manifest-check.mjs` (+ `--lessons`), `node scripts/kit-owned.mjs --check`, the kit's `node tools/leak-check.mjs`, `pack-check.mjs`, `install-check.mjs` all pass.
- [auto] `npx ng build` passes.
- [human] Dandan reviews `drift-classification.md` and agrees with every `override` row (each one is a difference FoodVibe keeps forever).

## Execution Mode
- **Parallel:** no. Single Worker in a FoodVibe `wt-N` slot; kit edits by path in `../ai-workflow-kit`.
- **Concurrent plans:** 383 (wt-1) is server-only; no overlap.
- **Isolated DB:** no.
- **Kit edits:** on a kit branch `feat/390-drift-reconciliation`, pushed to GitHub with a kit PR; Dandan merges it. Kit-first, then each fix reaches FoodVibe as an ADR 0018 patch in this plan's branch.

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

**Outside this repo:** the kit repo `../ai-workflow-kit/**` (main output). Scratch test dirs under the session scratchpad.

## Read Scope

Entire FoodVibe repo and the kit repo. Start from `docs/workflow-kit/manifest.md`, `manifest.json`, `kit-owned.json`, `parameters.md`, ADRs 0015 and 0018, the kit README, `tools/install.mjs`, `tools/sync.mjs`.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a FoodVibe file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry. When a drifted file's right side is unclear (FoodVibe newer vs kit newer), ask the Human per file — never pick silently.

## Architecture Impact

- INV-none: preserves — workflow tooling only (kit repo, `docs/workflow-kit/`, scripts, CI); no app runtime file or invariant `Touches` glob is changed.

## Step 0 — Reality Check

1. `node scripts/kit-extract.mjs --check` is clean; `kit-manifest-check` (+ `--lessons`) ok.
2. Fresh extract into a scratchpad folder, diff against the kit: record the real file count (brief said ~60).
3. Confirm today's syncs held: workflows (FoodVibe → kit `8488ffc`), `scripts/todo-query.mjs` (kit → FoodVibe).
4. Check the two open validation items: ship-prep calls a big uncommitted diff ULTRA-TRIVIAL; plan-number reuse across open Worker branches (A7 `next-plan-number.mjs` may already fix it). Record `still open` / `fixed` for each.

## Functional Requirements

### Must Have (P0)
- [ ] `docs/workflow-kit/drift-classification.md`: one row per differing file — path, class (`intended` placeholder/PACK/split, `drift-fixed` + which side was right, `override` + reason), kit commit for fixes.
- [ ] Every real drift fixed kit-first (kit branch + PR), then patched into FoodVibe (ADR 0018).
- [ ] Project overrides: an `overrides` list in the project's `kit.config.json` (`[{ "path": "...", "reason": "..." }]`). `tools/sync.mjs` reports those paths as `override`, never `conflict`, and `--apply` never writes them; `tools/install.mjs` skips them; the kit README documents it.
- [ ] Kit drift check (`tools/drift-check.mjs`, wrapped by `kit-drift.ps1`): renders every managed file with the target's `kit.config.json` and compares with the target's copy; prints the A4 output line; works without `.kit/install.json` (so it runs on FoodVibe before adoption).
- [ ] FoodVibe `kit.config.json` with real values (from `docs/workflow-kit/parameters.md`) and its `overrides` list (at least `.github/workflows/ci.yml`).
- [ ] The two Step 0 validation items fixed kit-first if still open.

### Won't Have (this plan)
- Remote pull, tags, releases (plan 391). `.kit/install.json` for FoodVibe and retiring patch mode (plan 392).

## Atomic Sub-tasks
- [ ] A0: Step 0 reality check; record the real diff count and the two validation items' state.
- [ ] A1: Classify every differing file in `docs/workflow-kit/drift-classification.md`.
- [ ] A2: Fix real drift kit-first; patch into FoodVibe (ADR 0018); name kit SHAs in commits.
- [ ] A3: `overrides` in kit `tools/sync.mjs` + `tools/install.mjs` + kit README; scratch install test.
- [ ] A4: Kit `tools/drift-check.mjs` + `kit-drift.ps1`; FoodVibe `kit.config.json` with real values + overrides.
- [ ] A5: Fix ship-prep ULTRA-TRIVIAL and plan-number reuse kit-first if Step 0 found them still open.
- [ ] A6: `manifest.md` phase 6A paragraph; run every [auto] criterion; kit PR merged by Dandan; `/ship`.

## Out of Scope
GitHub fetch, versioning and release hygiene (391); FoodVibe adoption, new ADR, change loop docs, second-consumer proof (392).
