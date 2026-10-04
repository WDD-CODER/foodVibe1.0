# Plan 334 — Workflow Kit Extraction, Phase 4: Installer, Sync, Template Skeletons

Status: active
Snapshot: deb9eb6b

## Problem Statement
Phases 2-3 (plans 329, 331, merged) built the kit repo `../ai-workflow-kit` with core, two stack packs, the Cursor layer and the lessons. It cannot be installed yet. Phase 4 (see `docs/brain/decisions/0015-workflow-kit-extraction.md`) adds the installer (`kit-install.ps1`, optional `-Cursor`), the dry-run-first `kit-sync.ps1`, the 17 `template` skeletons (`AGENTS.md`, `CLAUDE.md`, `docs/brain/*`, `docs/project/*`, `.gitignore`, `.mcp.json`, …) and a `settings.json` with no hardcoded machine paths, then proves the result on an empty repo. FoodVibe's own workflow files are never edited (ADR 0015); all output lands in the kit repo plus FoodVibe-side manifest docs and the extractor's coverage check.

**Executed without a Planner round trip:** Dandan told the Worker in wt-1 to write and run each phase plan itself (2026-10-02).

**Decisions made here (Dandan can overrule at the [human] review):**
- Engine in Node, wrappers in PowerShell: `tools/install.mjs` and `tools/sync.mjs` hold the logic; `kit-install.ps1` / `kit-sync.ps1` are thin wrappers (ADR names the `.ps1` files). Node is already a prerequisite of every workflow script, and the engine can be tested without PowerShell.
- Rendering: `{{dotted.key}}` from the project's `kit.config.json`; arrays join with `, `. Precedence: project config > pack `configDefaults` > kit defaults. Ports default to base 4200/3000 + slot index when null. Empty non-required keys render `(not set)` and are listed; required keys (`project.name`, `commands.build|lint|test`, `hooks.shellPath`) empty -> install stops before writing (`--allow-unfilled` overrides).
- `settings.json`: the four absolute-path `Write(...)`/`Edit(...)` allow lines are dropped; keys `hooks.projectRoot` and `hooks.userHome` are removed from `kit.config.json` (41 -> 39 keys). Only `${CLAUDE_PROJECT_DIR}` and `hooks.shellPath` remain.
- Existing files in the target are never overwritten (reported `SKIP-EXISTING`); `--force` overrides. The installer writes `.kit/install.json` (kit version, packs, flags, sha256 per rendered file, kind `managed` or `seed`).
- Template skeletons are `seed` files: written once, never updated by sync. Core files are `managed`.
- Sync is dry-run by default (new / kit-update / local-only / conflict / removed-from-kit report), writes nothing; `--apply` writes only `new` and `kit-update`, never a conflict.
- "Yes chef!" gate is opt-in: `-YesChef` appends it to `CLAUDE.md`. Raw Playwright MCP is not installed (decided phase 2).
- Pack `AGENTS.fragment.md` (hard rules, skill triggers, standards-index rows) fills `<!-- PACK:... -->` markers in the `AGENTS.md` skeleton.
- Live proof: this session cannot run `git` against another directory (worktree guard) or drive interactive `/plan` -> `/take-plan` -> `/ship`, so the agent proves everything that needs no git (`install-check`) and hands Dandan the git-dependent run as the [human] item.

## Goals & Success Criteria
**Primary:** `kit-install` turns an empty folder into a working Planner-Worker repo, and `kit-sync` shows what a newer kit would change without touching local edits.

**Success:**
- [auto] In the kit repo, `node tools/install-check.mjs` exits 0. It installs three fixtures into temp dirs (core only; angular + Cursor; node-express + Cursor + yes-chef) and asserts: no unresolved `{{key}}` outside the allowed list, every `.json` parses, every `.mjs` passes `node --check`, `.claude/settings.json` has no `Write(`/`Edit(` entries and no machine path, the `AGENTS.md` skeleton lists the pack's rules, `-Cursor` adds `.cursor/` and no `playwright`, `-YesChef` adds the gate and the default omits it.
- [auto] Re-running the installer on an installed target changes 0 files; a locally edited file is reported `SKIP-EXISTING` and kept (covered by `install-check`).
- [auto] `node tools/sync.mjs` on an installed target prints `KIT_SYNC: dry-run — … 0 conflicts` and writes nothing; after a local edit it reports `local-only`; after a kit-side change (fixture) `--apply` updates only `kit-update` + `new` (covered by `install-check`).
- [auto] Kit `node tools/leak-check.mjs` (core, layers, templates) and `--root packs --project-only` and `node tools/pack-check.mjs` exit 0; `kit.config.json` has 39 keys.
- [auto] FoodVibe: `node scripts/kit-extract.mjs --check` prints `… 17/17 template skeletons present …` and `0 missing`, `node scripts/kit-manifest-check.mjs` and `--lessons` print ok; `git diff --name-only origin/main...HEAD` lists only `docs/workflow-kit/**`, `scripts/kit-extract.mjs`, `scripts/kit-lessons-extract.mjs` and this plan file.
- [x] [human] Dandan runs the live proof in a normal terminal on an empty git repo (checklist printed at D9): `kit-install.ps1`, then `/plan` -> `/take-plan` -> `/ship` all work.

## Execution Mode
- **Parallel:** no. Single Worker, wt-1.
- **Concurrent plans:** 321 (wt-2) may merge workflow-file changes; re-run Step 0 first.
- **Isolated DB:** no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/workflow-kit/**
scripts/kit-extract.mjs
scripts/kit-lessons-extract.mjs
```

**Outside this repo:** the kit repo at `../ai-workflow-kit/**` is this plan's main output and is not covered by FoodVibe's `scope-check.mjs`; the whole directory is in scope, nothing else outside FoodVibe is (temp test dirs under the session scratchpad are fine).

## Read Scope

Entire FoodVibe repo; `docs/workflow-kit/manifest.json` (17 `template` rows) is the source of truth for the skeletons. The kit repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. Never edit a FoodVibe workflow file the manifest classifies; this plan only reads them. If a Worker needs a FoodVibe file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry.

## Step 0 — Reality Check

1. `node scripts/kit-manifest-check.mjs` and `--lessons` must print ok.
2. `node scripts/kit-extract.mjs --check` must still print 77/77, 22/22, 28/28, 1/1.
3. STOP for a go only if drift shows inside a core, pack or layer row.

## Functional Requirements

### Must Have (P0)
- [x] Core `settings.json` without absolute-path allow lines; `hooks.projectRoot` / `hooks.userHome` removed from config; checks still green.
- [x] Pack contract extended: optional `configDefaults` (keys must exist in `kit.config.json`) and `agentsFragment`; `pack-check` validates both; both packs filled.
- [x] 17 template skeletons under `templates/` (generic, placeholders, `docs/project/` instead of `_shared/`, Cursor-only ones under `templates/cursor/`).
- [x] `tools/install.mjs` + `kit-install.ps1` (`-Target -Config -Packs -Cursor -YesChef -DryRun -Force -AllowUnfilled`).
- [x] `tools/sync.mjs` + `kit-sync.ps1` (dry-run default, `-Apply`).
- [x] `tools/install-check.mjs` + CI step; leak-check scans `templates/`.
- [x] `kit-extract.mjs` reports template coverage; `manifest.md` + kit README updated.

### Won't Have (this phase)
- Switching FoodVibe to the kit (phase 5, hard `[human]` gate: reply `switch ownership`).
- Auto-merging conflicts in sync; a plugin; a third stack pack; publishing the kit repo to a remote.

## Atomic Sub-tasks
- [x] D0: Step 0 reality check.
- [x] D1: Core `settings.json` + config keys cleanup.
- [x] D2: Pack contract: `configDefaults`, `agentsFragment`; fill both packs; extend `pack-check`.
- [x] D3: Write the 17 template skeletons.
- [x] D4: Installer engine, `kit-install.ps1`.
- [x] D5: Sync engine, `kit-sync.ps1`.
- [x] D6: `install-check.mjs`, CI, leak-check roots; all green.
- [x] D7: `kit-extract.mjs` template coverage; `manifest.md`; kit README.
- [x] D8: Full check run; prepare the kit commit (message file; Dandan runs git in the kit repo).
- [x] D9: STOP. Hand Dandan the live-proof checklist ([human]). Apply changes if requested, then `/ship` on the FoodVibe side only; the kit repo stays local until Dandan says otherwise.
