# Plan 331 — Workflow Kit Extraction, Phase 3: Stack Packs, Cursor Layer, Lessons

Status: closed
Snapshot: 16f7428f

> **CLOSED 2026-10-06 — merged; nothing left to do here.** Any unticked box below is history, not open work. Phase 6 (kit as a GitHub upstream, FoodVibe adoption, retiring patch mode) lives in plans 390 → 391 → 392.

## Problem Statement
Phase 2 (plan 329, merged) built the kit repo `../ai-workflow-kit` with the 77 `tier: core` files and a leak-check CI. Phase 3 (of the effort map in `docs/brain/decisions/0015-workflow-kit-extraction.md`) fills the rest of what is not core: the two stack packs (`pack:angular` 22 files, `pack:node-express` 1 file), the optional Cursor layer (`layer:cursor` 28 files, including dropping the raw Playwright MCP entry), and the brain lessons per `docs/workflow-kit/lessons-triage.md` (50 transfer, 21 generalize, 13 stay). It also settles the open item from phase 2: `standards-{{stack.name}}.md` breaks when the stack name is "Angular 19", so a 41st key `stack.standardsDoc` is added. Templates (17) and the installer are phase 4. FoodVibe's own workflow files are never edited (ADR 0015); all writes land in the kit repo plus FoodVibe-side tooling.

**Executed without a Planner round trip:** Dandan told the Worker in wt-1 to write and run this plan itself (2026-10-02).

**Decisions made here (Dandan can overrule at the [human] review):**
- Pack layout: `packs/<name>/` mirrors the target project paths, plus `pack.json` (the contract).
- Layer layout: `layers/cursor/` mirrors target paths; installer flag `-Cursor` is phase 4.
- Pack files keep their stack names (Angular, Express); only project-specific values (FoodVibe, ports, hotspots, machine paths, Hebrew) are parameterized.
- `stack.standardsDoc` (path, e.g. `docs/agent/standards-angular.md`) replaces `standards-{{stack.name}}.md` in core.
- Lessons: `transfer` entries copy as-is into the destination; `generalize` entries are written from the triage draft in the gotcha/pattern shape and marked `status: draft`; `stay` entries are not shipped.

## Goals & Success Criteria
**Primary:** the kit repo has both packs, the Cursor layer and the triaged lessons, each reproducible from FoodVibe-side scripts, with leak checks green.

**Success:**
- [auto] `node scripts/kit-extract.mjs --check` prints `KIT_EXTRACT: ok — 77 core, 22 pack:angular, 1 pack:node-express, 28 layer:cursor landed, 0 missing, 0 unhandled-action` and exits 0.
- [auto] `node scripts/kit-lessons-extract.mjs --check` prints `KIT_LESSONS_EXTRACT: ok — 50 transfer + 21 generalize landed, 13 stay skipped, 0 missing` and exits 0.
- [auto] In the kit repo, `node tools/leak-check.mjs` exits 0 over `core/` and `layers/` (no framework names) and `node tools/leak-check.mjs --root packs --project-only` exits 0 (packs may name frameworks, never the project).
- [auto] `layers/cursor/.cursor/mcp.json` contains no `playwright` string.
- [auto] Each pack has a valid `pack.json` with keys `standardsDoc`, `skills`, `cursorRules`, `gotchas`, `validation` (npm script names only), checked by `node tools/pack-check.mjs` in the kit repo, exit 0.
- [auto] `kit.config.json` has 41 keys including `stack.standardsDoc`, and `grep -r "standards-{{stack.name}}" core` returns nothing.
- [auto] `node scripts/kit-manifest-check.mjs` and `--lessons` still print ok; `git diff --name-only origin/main...HEAD` lists only `docs/workflow-kit/**`, `scripts/kit-extract.mjs`, `scripts/kit-lessons-extract.mjs`, and this plan file.
- [human] Dandan reviews `packs/angular/pack.json` and `packs/node-express/pack.json` (the stack-pack contract) and a sample of the 21 generalized lesson drafts in the kit repo.

## Execution Mode
- **Parallel:** no. Single Worker, wt-1.
- **Concurrent plans:** 321 (wt-2) may merge workflow-file changes; re-run Step 0 and re-classify any touched workflow file before extracting it.
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

**Outside this repo:** the kit repo at `../ai-workflow-kit/**` is this plan's main output and is not covered by FoodVibe's `scope-check.mjs`; the whole directory is in scope, nothing else outside FoodVibe is.

## Read Scope

Entire FoodVibe repo; `docs/workflow-kit/manifest.json` and `lessons-triage.md` are the source of truth. The kit repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. Never edit a FoodVibe workflow file the manifest classifies; this plan only reads them. If a pack file's proposed split turns out wrong once you read the real content, STOP and ask. If a Worker needs a FoodVibe file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; wait for `approved: <path>`; then append the path to the scope block and retry.

## Step 0 — Reality Check

1. `node scripts/kit-manifest-check.mjs` and `--lessons` must print ok (no drift since phase 2).
2. `node scripts/kit-extract.mjs --check` must still print 77/77.
3. STOP for a go only if either shows drift inside a `pack:*`, `layer:cursor` or core row.

## Functional Requirements

### Must Have (P0)
- [x] `stack.standardsDoc` added to `kit.config.json`; core placeholders `standards-{{stack.name}}` replaced by `{{stack.standardsDoc}}` in the kit copies and in `kit-extract.mjs` rules.
- [ ] `kit-extract.mjs` extended: `pack:angular` -> `packs/angular/`, `pack:node-express` -> `packs/node-express/`, `layer:cursor` -> `layers/cursor/`, same `copy`/`parameterize`/`split` handling, stack keys not substituted inside packs, coverage report per tier.
- [ ] The 3 `split` pack rows hand-fixed in the kit: `conventions.md` and `pre-commit-security-grep.mjs` (angular half, project-specific half dropped), `standards-backend.md` (node-express half).
- [ ] `layers/cursor/.cursor/mcp.json`: Playwright entry removed.
- [ ] Per-pack `pack.json` contract and `tools/pack-check.mjs`.
- [ ] `scripts/kit-lessons-extract.mjs` (FoodVibe-side): reads `lessons-triage.md`, writes transfer and generalize entries to the kit (`core/docs/brain/**`, `packs/<x>/docs/brain/**`), `--check` mode.
- [ ] Kit `tools/leak-check.mjs` gains `--root` list and `--project-only`; the CI workflow runs all three scans.
- [ ] Both new scripts classified in `manifest.json` (`project`/`stay`); `manifest.md` updated with pack/layer/lesson locations and counts.

### Won't Have (this phase)
- Template skeletons, installer, `kit-sync.ps1`: phase 4.
- Rewriting FoodVibe's own files or switching FoodVibe to the kit: phase 5.
- A React or other third stack pack.

## Atomic Sub-tasks
- [x] C0: Step 0 reality check.
- [x] C1: Add `stack.standardsDoc`; fix `standards-{{stack.name}}` in the kit copies and extractor rules.
- [x] C2: Extend `kit-extract.mjs` for packs and layer; run it; fix the 3 `split` pack rows.
- [x] C3: Drop the Playwright entry from `layers/cursor/.cursor/mcp.json`.
- [x] C4: Write `pack.json` per pack and `tools/pack-check.mjs`; green.
- [x] C5: Write `scripts/kit-lessons-extract.mjs`; run it; `--check` green.
- [x] C6: Extend kit `tools/leak-check.mjs` (`--root` repeatable, `--project-only`) and the CI workflow; green.
- [x] C7: Classify the new scripts in `manifest.json`; update `manifest.md`.
- [x] C8: STOP. Hand Dandan the [human] review. Apply changes if requested, then `/ship` on the FoodVibe side only; the kit repo stays local until Dandan says otherwise.
