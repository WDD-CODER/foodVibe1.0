# Plan 328 — Workflow Kit Extraction, Phase 1: Audit & Manifest

Status:
Snapshot: a4f396dda2f35a315505293e2414513b30d20ec7

## Problem Statement
Dandan's AI workflow lives inside FoodVibe: the Planner-Worker pipeline, skills, commands, guard hooks, the ship and brain system, and the Cursor rules. He wants it as a reusable kit, so new apps run the same workflow from Claude Code inside Cursor's terminal. This plan is phase 1 of 5. It is read-only on the workflow and produces the classification every later phase builds on.

**Effort map (locked 2026-10-01; later plans reference this):**
1. **Audit & manifest** (this plan). Classify every workflow file, every parameterization point and every lesson.
2. **Kit repo scaffold.** Core extraction; `kit.config.json`; a CI check that fails if a core file names a framework.
3. **Stack packs.** `packs/angular` and `packs/node-express`, plus the generalized lessons.
4. **Installer and sync.**
   - `kit-install.ps1`, with an optional `-Cursor` layer.
   - `kit-sync.ps1`: shows a dry-run diff, then STOPs before overwriting.
   - Templates: skeleton `AGENTS.md`, `CLAUDE.md`, `docs/brain/` and `_shared/`, plus a `settings.json` with no hardcoded paths.
   - Proven on an empty test repo with `/plan` → `/take-plan` → `/ship`.
5. **FoodVibe cutover.**
   - A1 is a hard `[human]` gate: the Worker posts an `OWNERSHIP SWITCH` notice (the kit-owned file list plus drift since extraction) and waits for the exact reply `switch ownership`.
   - After the switch, `scripts/scope-guard.sh` blocks edits to kit-owned files inside FoodVibe.

**Locked decisions:**
- **Ownership.** After phase 5 the kit repo is the source of truth and FoodVibe consumes it. Until then FoodVibe stays master, and phases 1–4 never modify FoodVibe workflow files.
- **Distribution** is by copying files into each project repo, not a Claude Code plugin. Cursor and the hooks need repo-local files.
- **Swappable stack.** Angular now, swappable later. Core speaks only through `kit.config.json`, which references npm script names, not raw commands. Each stack pack implements one contract: standards doc, skills, Cursor rules, gotchas and validation commands.
- **Lessons travel.** Each brain entry gets a verdict: transfer, generalize or stay.
- **Where plans live.** All five plans live in FoodVibe `plans/`. Workers for phases 2–4 open their session in the kit repo folder.

## Goals & Success Criteria
- **Primary:** every workflow file in FoodVibe is classified exactly once (tier + action), every gotcha, ADR and pattern has a verdict, and a checker script proves coverage.
- **Success:**
  - [auto] `node scripts/kit-manifest-check.mjs`
    - Prints `KIT_MANIFEST: ok — <N> classified, 0 unclassified, 0 duplicates, 0 unhandled-coupling`.
    - Exit code 0.
  - [auto] `node scripts/kit-manifest-check.mjs --lessons`
    - Prints `KIT_LESSONS: ok — <N> entries triaged, 0 missing`.
    - Exit code 0.
  - [auto] `git diff --name-only origin/main...HEAD`
    - Lists only `docs/workflow-kit/**`, `scripts/kit-manifest-check.mjs` and one new `docs/brain/decisions/*-workflow-kit-extraction.md`.
  - [auto] `npm run build:render`, or `npx ng build` if plan 321 has not merged yet.
    - Passes.
  - [human] Dandan reads `docs/workflow-kit/lessons-triage.md` and replies `approved`, or lists entries to re-verdict.
  - [human] Dandan reads the summary table at the top of `docs/workflow-kit/manifest.md` (counts per tier, the blockers list, the pending-branch list) and confirms the split matches his intent.

## Execution Mode
- **Parallel:** yes.
- **Concurrent plans:** 321 (wt-2). No overlap: 321 writes `server/`, `shared/`, `src/app/core/models/`, `package.json` and `tsconfig.json`. Run this plan in wt-1 or wt-3.
- **Isolated DB:** no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/workflow-kit/**
scripts/kit-manifest-check.mjs
docs/brain/decisions/*-workflow-kit-extraction.md   # one new ADR; next free number at commit time
```

## Read Scope

Entire repo, plus remote branches via `git fetch`. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

**Plan-specific rule:** never edit a file this plan classifies. If a file looks broken or stale, record it in the manifest `notes` field. Fixes belong to their own plans.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

Note for this plan: drift inside the inventory roots only means re-classifying those paths. Plan 321 is expected to land `scripts/take-plan.mjs`, `package.json` and `.gitignore` changes.

## User Stories
- As Dandan, I want a precise map of my workflow split into core, stack-specific and FoodVibe-only, so the extraction (phases 2–5) never guesses.
- As Dandan, I want every brain lesson triaged, so new projects inherit the workflow and stack lessons without FoodVibe noise.
- As a phase 2–5 Worker, I want a machine-readable manifest and a checker, so I can extract, install and detect drift mechanically.

## Functional Requirements

### Must Have (P0)
- [ ] **Inventory roots.** Every file below gets exactly one entry in `docs/workflow-kit/manifest.json`:
  - Root files: `AGENTS.md`, `CLAUDE.md`, `README_WORKFLOW.md`, `.mcp.json`, `.lintstagedrc.mjs`, `.editorconfig`, `.prettierrc.json`, `eslint.config.mjs`, `knip.json`, `.gitleaksignore`, `.gitattributes`, `.gitignore`, `.nvmrc`, `package.json`, `server/package.json`. The two `package.json` files are classified as `project`; their workflow-called scripts go in the parameter catalogue.
  - `.claude/`:
    - `.claude/{commands,skills,agents,references,instructions,prompts,workflows}/**`
    - `.claude/settings.json`
  - `.cursor/`:
    - `.cursor/rules/**`
    - `.cursor/commands/**`
    - `.cursor/mcp.json`
  - Scripts, docs and other workflow folders:
    - `scripts/**`, including `scripts/lib/**`
    - `docs/agent/**`, `docs/brain/**`, `_shared/**`
    - `.husky/**`, `.github/workflows/**`, `.vscode/**`
- [ ] **Excluded paths** (project history or data) are listed once in the manifest with a reason, and the checker ignores them:
  - `.claude/{sessions,reports,audits,techdebt-reports,todo-archive}/**`
  - `.claude/todo.md`, `.claude/todo-archive.md`
  - `plans/**`
  - `docs/session-state-*.md`
  - `.cursor/*.log`
- [ ] **Entry schema.** Each entry records: `path`, `tier`, `action`, `params[]`, `refs[]`, `notes`.
  - Tier is one of:
    - `core`
    - `pack:angular`
    - `pack:node-express`
    - `layer:cursor`
    - `template` (generic structure, FoodVibe content; ships as a skeleton)
    - `project` (stays in FoodVibe)
  - Action is one of:
    - `copy`
    - `parameterize` (every hardcoded value listed and mapped to a config key)
    - `split` (the generic part and the FoodVibe part identified by heading or line range)
    - `skeleton`
    - `stay`
- [ ] **Coupling sweep.**
  - **Which files:** every `core` or `layer:cursor` entry that mentions any of the following must have action `parameterize` or `split`, with the exact strings recorded:
    - Angular / `ng ` / signals / scss
    - Express / Mongo / Atlas / Render
    - FoodVibe / Hebrew / `dictionary.json`
    - `C:/coding projects` / `danwe` / `C:/Program Files/Git`
    - ports `420N` / `300N`
    - `-wt-N` / `wt-N`
    - gstack `/browse`
  - **How:** grep is a first pass only; read each file line by line.
  - **First-pass hits to start from:**
    - `.claude/commands/`: `ship`, `take-plan`, `feat`, `fix`, `refactor`, `auto-solve`, `review-it`, `docs-refresh` (`.md`).
    - `.claude/skills/`: `worktree-setup`, `preflight`, `elegant-fix`, `update-docs`, `save-plan`, `techdebt` (`SKILL.md`).
    - `scripts/`: `take-plan`, `scope-check`, `brain-review-check`, `pre-commit-secret-scan`, `pre-commit-security-grep` (`.mjs`), and `scripts/lib/slot.mjs`.
    - `.claude/settings.json`: absolute Windows paths and the Git Bash path.
    - `AGENTS.md`.
- [ ] **Parameter catalogue** in `docs/workflow-kit/parameters.md`. Each distinct point is a proposed `kit.config.json` key with name, type, FoodVibe value, the files that use it, and a one-line purpose.
  - Values reference npm script names wherever one exists, not raw commands.
  - Must cover:
    - build, dev, test, lint and e2e
    - schema/codegen pre-steps (`build:schemas` from 321)
    - main branch
    - slot count, slot ports, slot folder suffix
    - stack
    - hook shell path
    - project root
    - hotspot files
    - browser tool
    - the npm scripts the workflow calls by name, e.g. `dev:local` in both `package.json` files, called from `scripts/take-plan.mjs`
- [ ] **Reference map.** For every `core` file, list the paths it references (`refs[]`). Any `core` → `project` reference is a blocker in the manifest summary, with a proposed fix: parameterize, move or drop.
- [ ] **Pending-branch report.**
  - Run `git fetch origin`.
  - For every open remote branch, run `git diff --name-only origin/main...origin/<branch>` and keep only paths inside the inventory roots.
  - List each such path with its branch in a manifest section titled `Pending workflow changes`.
  - Known: `feat/321-professional-foundation-refactor` → `scripts/take-plan.mjs` (Windows `shell` fix), `package.json`, `.gitignore`.
- [ ] **Lessons triage** in `docs/workflow-kit/lessons-triage.md`. Covers every `##` entry in `docs/brain/gotchas/*.md`, every ADR in `docs/brain/decisions/`, and every file in `docs/brain/patterns/` (excluding `_TEMPLATE.md`). Each row records:
  - source path + title
  - verdict: `transfer` | `generalize` | `stay`
  - destination: `core` | `pack:angular` | `pack:node-express`
  - for `generalize`, a one-line draft of the stack-neutral lesson
  - Do not rewrite the entries themselves; that is phase 3.
- [ ] **Checker** `scripts/kit-manifest-check.mjs`, Node only with no new dependencies. It:
  - walks the inventory roots and diffs them against `manifest.json` (unclassified, duplicate, missing-on-disk);
  - validates the enums;
  - re-runs the coupling term scan, failing any `core` file that has an unhandled hit;
  - with `--lessons`, verifies every gotcha `##` heading, ADR file and pattern file has a triage row.
  - The output lines must match the success criteria exactly. Keep it reusable: phase 5 uses it for drift.
- [ ] **ADR.** One new ADR in `docs/brain/decisions/` following `_TEMPLATE.md`. It records the effort map and the locked decisions above, verbatim in substance.
  - Number: next free after `git fetch && git rebase origin/main` at commit time, because 321 may add one.

### Should Have (P1)
- [ ] The summary table at the top of `manifest.md`: counts per tier/action, blockers, pending-branch changes, and files flagged stale or broken in `notes`.
- [ ] A naming-collision note: `_shared/` (workflow docs) vs `shared/` (321's code schemas). Propose how the kit template names `_shared/` to avoid confusion.

### Nice to Have (P2)
- [ ] For each `pack:*` file, a note on what a React equivalent would need. A single line is enough; this is input for future packs.

## UI/UX Notes
- N/A. No app UI and no dictionary keys.

## Atomic Sub-tasks
- [ ] A1: `git fetch origin`. Generate the raw inventory file list from the roots (and exclusions), and write the pending-branch report.
- [ ] A2: Write `scripts/kit-manifest-check.mjs` first, against an empty `manifest.json`. It must list everything as unclassified.
- [ ] A3: Classify `.claude/**` (commands, skills, agents, references, instructions, prompts, workflows, `settings.json`): tier, action, params, refs, notes.
- [ ] A4: Classify `scripts/**`, `.husky/**`, `.github/workflows/**` and the root config files.
- [ ] A5: Classify `.cursor/**`, `docs/agent/**`, `docs/brain/**` (as files), `_shared/**`, `.vscode/**`, `AGENTS.md`, `CLAUDE.md` and `README_WORKFLOW.md`.
- [ ] A6: Build `parameters.md` from all `params[]`, plus the reference map, and record the blockers in the summary.
- [ ] A7: Lessons triage: all gotcha entries across the 5 domain files, all ADRs, and all patterns.
- [ ] A8: Write the ADR (next free number after rebase).
- [ ] A9: Write the `manifest.md` summary. Run both checker modes until they are green, then run the build.
- [ ] A10: STOP. Hand Dandan the two `[human]` reviews. Apply re-verdicts if requested, then `/ship`.

## Technical Considerations
- **Dependencies:** none at runtime. The checker uses Node built-ins only (`fs`, `path`, `child_process` for git).
- **New files:**
  - `docs/workflow-kit/manifest.json`
  - `docs/workflow-kit/manifest.md`
  - `docs/workflow-kit/parameters.md`
  - `docs/workflow-kit/lessons-triage.md`
  - `scripts/kit-manifest-check.mjs`
  - one ADR
- **Model changes:** none.
- **Hebrew canonical values:** N/A.
- **Risks:**
  - **Hidden coupling** that grep misses, such as implied Angular assumptions in prose. Mitigation: line-by-line reading for every `core` candidate.
  - **Drift while phases 2–4 run.** Mitigation: the checker and the pending-branch report are reused at each later phase's Step 0.

## Out of Scope
- Creating the kit repo or moving any file (phase 2).
- Rewriting or generalizing any brain entry; this plan only gives verdicts (phase 3).
- Installer and sync scripts (phase 4).
- Any change to existing workflow files, including fixing issues found during the audit.
- Merging or cherry-picking the plan 321 `take-plan.mjs` fix. That is a separate chore PR.

## Critical Questions
1. **Where the manifest lives.**
   - a) `docs/workflow-kit/` in FoodVibe until phase 2 moves it into the kit repo. **(default)**
   - b) Keep it permanently in FoodVibe.
2. **`.vscode/**` and lint/format configs** (`eslint.config.mjs`, `.prettierrc.json`, `.lintstagedrc.mjs`).
   - a) Classify them; they are likely `pack:angular` or `template`. **(default)**
   - b) Exclude them as editor or project config, not workflow.
3. **Pending-branch changes found in A1.**
   - a) Record only; phase 2's Step 0 picks them up after merge. **(default)**
   - b) STOP and ask Dandan to merge or cherry-pick first.
