# Plan 329 — Workflow Kit Extraction, Phase 2: Core Scaffold

Status: active
Snapshot: 4a2c6ff92d726087c68c3c16366c5868fa0c1ac7

## Problem Statement
Plan 328 (phase 1) classified every workflow file into `core` / `layer:cursor` / `pack:angular` / `pack:node-express` / `template` / `project`, and recorded 7 core→project blockers plus a 38-key parameter catalogue (`docs/workflow-kit/manifest.md`, `manifest.json`, `parameters.md`). Phase 2 (of the 5-phase effort map in `docs/brain/decisions/0015-workflow-kit-extraction.md`) creates the actual kit repo: extracts the 77 `tier: core` files, parameterizes them through a new `kit.config.json`, fixes the 7 blockers so no core file points at a FoodVibe-only path, and ships a CI check that fails if a core file names a framework. `layer:cursor`, both stack packs, the `template` skeletons and the installer are explicitly out of scope — phases 3 and 4. FoodVibe's own workflow files are never edited in phases 1-4 (ADR 0015); all extraction writes land in a new repo outside FoodVibe.

**Locked inputs (Dandan, 2026-10-01 — "go with your recommendations"):**
- Kit ships `_shared/` as `docs/project/` behind one config key `paths.sharedDocs`; FoodVibe keeps `_shared/` until the phase 5 cutover (avoids the clash with plan 321's `shared/`). Phase 2 only needs to introduce the `paths.sharedDocs` key — the `docs/project/` skeleton itself is phase 4.
- Fix the 7 blockers in `manifest.md`'s Blockers table: `feat.md`/`fix.md` get a configurable `docs.domainStandards` key; the ADR 0006/0009/0014 references move to the kit's own copies; the `docs/brain/gotchas/` pointer stays (already a non-blocker per the manifest).
- Plan 321's `take-plan.mjs` Windows `shell` fix lands as its own chore PR to FoodVibe `main` **before** this plan's A1 starts, so the kit copies the fixed file, not the buggy one.
- The old branches (`audit/2026-04-25`, `main-fadnX`, `claude/document-ai-workflow-ySGoG`, `claude/notion-api-assistant-ZvfeH`) are left alone — not merged, not deleted, not re-classified by this plan.
- Dropping the raw Playwright entry from `.cursor/mcp.json` happens in phase 3, not here.
- The "Yes chef!" gate ships opt-in in the kit's `CLAUDE.md` template — that's `template` tier, phase 4, not here.

## Prerequisites (hard gate before Step 0)
Plan 321's `take-plan.mjs` Windows `shell` fix must already be merged to FoodVibe `main` (as its own chore PR, not the full plan 321). Check: `git log origin/main -- scripts/take-plan.mjs` shows the fix, or diff `origin/main` against `feat/321-professional-foundation-refactor` for that one file is empty. If it hasn't landed: STOP, tell the Human, do not start A1.

## Goals & Success Criteria
**Primary:** a new kit repo exists with every `tier: core` file from `docs/workflow-kit/manifest.json` extracted and parameterized through `kit.config.json`, the 7 blockers fixed in the kit's copies, and a CI check proving no core file leaks a framework name.

**Success:**
- [auto] A new `scripts/kit-extract.mjs` (FoodVibe-side, reads `manifest.json`) run against the kit repo prints `KIT_EXTRACT: ok — 77/77 core files landed, 0 missing, 0 unhandled-action` and exits 0.
- [auto] The kit repo's own CI framework-name-leak check (new, written in B5) exits 0 against the extracted `core/` tree.
- [auto] `git diff --name-only origin/main...HEAD` on this plan's FoodVibe-side branch lists only `docs/workflow-kit/**`, `scripts/kit-extract.mjs`, and this plan file — confirms no FoodVibe workflow file was edited.
- [auto] None of the 7 blocker files in the kit repo contain the literal strings `docs/agent/standards-domain.md`, `docs/brain/gotchas/agent-workflow.md`, `0006-`, `0009-`, or `0014-` (grep check) — proves the blockers were actually fixed, not just noted.
- [human] Dandan opens the kit repo and confirms `kit.config.json`'s keys (including the two new ones, `docs.domainStandards` and `paths.sharedDocs`) match his intent.
- [human] Dandan confirms the kit repo's name and location (proposed: sibling folder `../ai-workflow-kit`, fresh `git init`, no remote pushed yet) before anything is pushed anywhere.

## Execution Mode
- **Parallel:** yes, but gated on the Prerequisites section above.
- **Concurrent plans:** 321 (wt-2) continues independently — no file overlap once the chore PR prerequisite lands. Re-run Step 0 if `feat/session-20261001-1854` (touches `save-plan` SKILL.md, `branch-guard.sh`, two gotcha files — all `core`/`project` tier) merges before this plan starts; re-classify those specific files before copying.
- **Isolated DB:** no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/workflow-kit/**
scripts/kit-extract.mjs
```

**Outside this repo:** the new kit repo at `../ai-workflow-kit/**` is this plan's main output and is not covered by FoodVibe's `scope-check.mjs` — treat the whole directory as in-scope for this plan, nothing else outside FoodVibe is.

## Read Scope

Entire FoodVibe repo — `docs/workflow-kit/manifest.json` is the source of truth for what to copy and how. The new kit repo once created.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. Never
edit a FoodVibe workflow file that `manifest.json` classifies — this plan only reads them. If
a blocker's proposed fix (the Blockers table in `manifest.md`) turns out wrong once you're
looking at the real file content, STOP and ask before improvising a different fix. If a
Worker needs a FoodVibe file outside the `## Read-Write Scope` above: STOP, tell the Human
the file, the exact change, and why it can't be done in-scope; wait for `approved: <path>`;
then append the path to the scope block above and retry.

## Step 0 — Reality Check

1. Confirm the Prerequisites section's `take-plan.mjs` fix landed.
2. Run `node scripts/kit-manifest-check.mjs` — must still print `KIT_MANIFEST: ok`, proving `manifest.json` hasn't drifted since 2026-10-01.
3. Check whether `feat/session-20261001-1854` merged since; if so, re-classify `save-plan/SKILL.md`, `branch-guard.sh` and the two gotcha files it touches before copying them (they may now differ from what `manifest.json` recorded).
4. STOP for a go if either check shows drift inside the `core` tier; otherwise proceed.

## User Stories
- As Dandan, I want a real kit repo I can point a second project at, not just a manifest, so phases 3-5 have something to build on.
- As Dandan, I want the 7 known blockers fixed at extraction time, not discovered later, so the kit's core never silently depends on a FoodVibe-only file.
- As a phase 3 Worker, I want `kit.config.json`'s keys finalized — including the two new ones — so the stack packs have a stable contract to implement against.

## Functional Requirements

### Must Have (P0)
- [ ] New kit repo created at `../ai-workflow-kit` (sibling folder, fresh `git init`, no FoodVibe history), with baseline `README.md`, `.gitignore`, and an empty `core/` tree matching the target layout (`.claude/`, `.cursor/`, `.husky/`, `.github/workflows/`, `docs/agent/`, `scripts/`, root config files).
- [ ] `kit.config.json` scaffold with all 38 keys from `docs/workflow-kit/parameters.md`, plus 2 new keys this plan introduces:
  - `docs.domainStandards` (path, optional, project-owned) — read by `feat.md`/`fix.md` instead of hardcoding `docs/agent/standards-domain.md`.
  - `paths.sharedDocs` (path, default `docs/project` in the kit's own skeleton — not set here; FoodVibe's eventual value stays `_shared` until phase 5 cutover, recorded as a comment only).
  - Values are placeholders/empty in the kit repo — core must never ship with FoodVibe's actual values baked in.
- [ ] Every `tier: core` entry in `manifest.json` (77 files) landed in the kit repo at the same relative path, action applied mechanically:
  - `copy` (34) — byte-identical.
  - `parameterize` (36) — hardcoded FoodVibe strings replaced with `{{kit.config.json key}}` placeholders, per `manifest.json`'s `params[].strings`.
  - `split` (7) — generic half only, extracted into the kit repo; leave a `<!-- PACK:<stack> -->` marker where the Angular/Express-specific half was — do not invent pack content here, that's phase 3.
- [ ] The 7 blockers from `manifest.md`'s Blockers table fixed in the **kit's** copies (never in FoodVibe's):
  - `.claude/commands/feat.md`, `fix.md` → read `docs.domainStandards` instead of a hardcoded path.
  - `.claude/commands/ship.md`, `docs/agent/ship-regular.md` → point at the kit's own generalized gotchas (the lessons-triage `transfer`-verdict entries), not `docs/brain/gotchas/agent-workflow.md`.
  - `.cursor/rules/git-commit-must-use-skill.mdc`, `scripts/brain-capture-comment.mjs` → the kit's own ADR-0006-equivalent.
  - `docs/agent/job-validation.md` → the kit's own ADR-0014-equivalent.
  - `README_WORKFLOW.md` → the kit's own ADR-0009-equivalent.
  - `docs/agent/brain-capture.md` → verify-only (manifest already says this isn't a real blocker — confirm `docs/brain/` exists as a directory in the kit tree).
  - `scripts/kit-manifest-check.mjs` → the kit repo gets its own drift-checker reading inventory roots from `kit.config.json` (FoodVibe's copy of this script is untouched — it keeps serving phases 1-4 here).
- [ ] A CI check in the kit repo's own `.github/workflows/` that fails the build if any file under `core/` contains a stack/framework name (`Angular`, `ng build`, `ng serve`, `Express`, `MongoDB`, `Mongo`) outside a `kit.config.json` value or a `<!-- PACK -->` marker.
- [ ] One pointer recorded in FoodVibe's `docs/workflow-kit/manifest.md` noting the kit repo's location — the only FoodVibe-side content edit this plan makes.

### Won't Have (this phase)
- `layer:cursor` optional layer, both stack packs (`pack:angular`, `pack:node-express`), the `template` skeletons, and the installer/sync scripts — phases 3-4 per ADR 0015's effort map.
- Dropping the Playwright entry from `.cursor/mcp.json` — phase 3.
- The "Yes chef!" opt-in gate — `template` tier, phase 4.
- Any edit to a FoodVibe workflow file itself — frozen until phase 5 (ADR 0015).
- Touching `audit/2026-04-25`, `main-fadnX`, or the two `claude/*` branches — explicit Human decision to leave them alone.

## Atomic Sub-tasks
- [ ] B0: Verify the Prerequisites gate — plan 321's `take-plan.mjs` Windows `shell` fix is merged to FoodVibe `main`. If not, STOP and tell the Human.
- [ ] B1: Create `../ai-workflow-kit` (fresh `git init`), baseline `README.md`, `.gitignore`, empty `core/` tree.
- [ ] B2: Write `kit.config.json` with all 38 `parameters.md` keys plus `docs.domainStandards` and `paths.sharedDocs`, placeholder values only.
- [ ] B3: Write `scripts/kit-extract.mjs` (FoodVibe-side, reads `manifest.json`, writes into the kit repo path) applying `copy`/`parameterize` for every `tier: core` row; run it.
- [ ] B4: Hand-fix the 7 `split` core files (generic half only) and the 7 blocker files per the Blockers table's proposed-fix column.
- [ ] B5: Write the kit repo's framework-name-leak CI check; get it green against the extracted `core/`.
- [ ] B6: Extend `scripts/kit-extract.mjs` (or add a sibling check) with a coverage report confirming all 77 core rows landed.
- [ ] B7: Record the kit repo's location in `docs/workflow-kit/manifest.md`.
- [ ] B8: STOP. Hand Dandan the two `[human]` reviews (kit.config.json keys; kit repo name/location). Apply changes if requested, then `/ship` on the FoodVibe side only — the kit repo stays local, no remote, until Dandan says otherwise.
