# Plan 360 — Workflow Kit Extraction, Phase 5: FoodVibe Cutover

Status: closed
Snapshot: 7c264799

> **CLOSED 2026-10-06 — merged; nothing left to do here.** Any unticked box below is history, not open work. Phase 6 (kit as a GitHub upstream, FoodVibe adoption, retiring patch mode) lives in plans 390 → 391 → 392.

## Problem Statement
Phases 1-4 (plans 328, 329, 331, 334, merged) built the kit repo `../ai-workflow-kit` and proved it on an empty repo. Phase 5 (see `docs/brain/decisions/0015-workflow-kit-extraction.md`) flips ownership: the kit becomes the source of truth for every `core`, `layer:cursor` and `pack:*` workflow file, and `scripts/scope-guard.sh` blocks agent edits to those files inside FoodVibe. Workflow changes are then made in the kit and pulled in with `kit-sync`.

**Executed without a Planner round trip:** Dandan told the Worker in wt-1 to write and run each phase plan itself (2026-10-02).

**Hard `[human]` gate A1 — cleared:** the Worker posted the `OWNERSHIP SWITCH` notice (kit-owned file list = 128 files from the manifest; drift since extraction = 1 file, `scripts/session-manifest-ship.py`, re-synced into the kit) and Dandan replied `switch ownership` (2026-10-04).

**Decisions made here:**
- Kit-owned = manifest tiers `core`, `layer:cursor`, `pack:*` (actions copy, parameterize, split). `template` rows (seeds) and `project` rows stay FoodVibe-owned.
- The list is generated into `docs/workflow-kit/kit-owned.json` by `scripts/kit-owned.mjs --write`; `--check` fails when it is out of sync with the manifest.
- `scope-guard.sh` asks `scripts/kit-owned.mjs --file=<path>` first, in every checkout (main, slot, idle slot) and denies a kit-owned path. It fails open if the script is absent (so a consuming project without it is unaffected). Dandan editing in a normal terminal and `kit-sync` (plain node writes) are not hooked, so they remain the supported paths.
- `kit-owned.mjs` is a FoodVibe-only file (`project`/`stay`); the guard change is also mirrored into the kit's `core/scripts/scope-guard.sh`.
- FoodVibe's `.kit/install.json` baseline and a first real `kit-sync` against FoodVibe are out of scope here (follow-up).

## Goals & Success Criteria
**Primary:** after this merges, an agent Edit/Write of any kit-owned FoodVibe file is denied with a message pointing at the kit.

**Success:**
- [auto] `node scripts/kit-owned.mjs --check` prints `KIT_OWNED: ok — 131 kit-owned files, list in sync with manifest`, exit 0.
- [auto] `scripts/lib/plan-scope.mjs` reads the scope of every queued plan on main (331-339, four different shapes) and returns null for prose; `node scripts/take-plan.mjs 335` in a dirty slot gets past the scope check and refuses `uncommitted or untracked changes`, exit 1, branch unchanged.
- [human] Next real `/take-plan` in a slot with leftover servers: they are stopped automatically and both servers come up (or the log tail is shown).
- [auto] `node scripts/kit-owned.mjs --file=scripts/take-plan.mjs` exits 1 and prints `KIT_OWNED: yes`; `--file=src/app/app.routes.ts` exits 0.
- [auto] Piping a Write tool-input for a kit-owned path into `bash scripts/scope-guard.sh` prints a `"permission":"deny"` JSON; a non-owned path prints `"permission":"allow"`.
- [auto] `node scripts/kit-manifest-check.mjs` (+ `--lessons`), `node scripts/kit-extract.mjs --check` and the kit's `node tools/leak-check.mjs` stay ok.
- [auto] `npm run build:render` passes (or `npx ng build`).
- [x] [human] Dandan replied `switch ownership` after the notice.

## Execution Mode
- **Parallel:** no. Single Worker, wt-1.
- **Isolated DB:** no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/workflow-kit/**
scripts/kit-owned.mjs
scripts/scope-guard.sh
scripts/kit-extract.mjs
scripts/take-plan.mjs
scripts/lib/slot-procs.mjs
scripts/slot-stop.mjs
scripts/free-merged-slots.mjs
scripts/todo-query.mjs
scripts/scope-check.mjs
scripts/lib/plan-scope.mjs
.claude/commands/take-plan.md
.claude/skills/save-plan/SKILL.md
.gitignore
docs/agent/standards-git.md
docs/agent/ship-regular.md
docs/agent/ship-recovery.md
.claude/commands/ship.md
docs/brain/gotchas/git-workflow.md
```

**Outside this repo:** the kit repo `../ai-workflow-kit/**` (guard mirror, drift re-sync, and the slot-startup fixes below, which are authored in the kit first). Nothing else outside FoodVibe.

## Read Scope

Entire FoodVibe repo; `docs/workflow-kit/manifest.json` is the source of truth for ownership.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a FoodVibe file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry.

## Step 0 — Reality Check

1. `node scripts/kit-manifest-check.mjs` and `--lessons` print ok.
2. `node scripts/kit-extract.mjs --check` prints 77/77, 22/22, 28/28, 1/1 (done: one drifted file re-synced).

## Functional Requirements

### Must Have (P0)
- [x] `scripts/kit-owned.mjs` (`--write`, `--check`, `--file=`) and the generated `docs/workflow-kit/kit-owned.json`.
- [x] `scope-guard.sh` denies kit-owned paths before the slot checks; fails open when `kit-owned.mjs` is absent.
- [x] Guard change mirrored into the kit's `core/scripts/scope-guard.sh`; manifest row for `scripts/kit-owned.mjs` (`project`/`stay`).
- [x] `docs/workflow-kit/manifest.md` records phase 5 and how to change a kit-owned file (edit the kit, then `kit-sync`).

### Won't Have (this phase) — now covered by plans 390–392
- `.kit/install.json` baseline for FoodVibe and a real `kit-sync` run against FoodVibe.
- Blocking Bash-level edits (`sed -i`); the hook only sees Edit/Write.
- Publishing the kit repo to a remote.

## Atomic Sub-tasks
- [x] E0: Step 0 reality check; re-sync drifted file into the kit.
- [x] E0b: Found the existing guards emit Cursor-style JSON that Claude Code ignores; kit-owned deny emits both formats. Hooks did not fire in the Worker session, so the live deny is verified by direct invocation only (Human to confirm in a fresh session).
- [x] E1: `scripts/kit-owned.mjs` + generated list.
- [x] E2: `scope-guard.sh` change (FoodVibe + kit mirror).
- [x] E3: Manifest row + `manifest.md`.
- [x] E4: Run all checks and the guard smoke tests.
- [x] E5: Slot-startup fixes from two Worker diagnostic reports (2026-10-04), authored in the kit's `core/` and rendered into FoodVibe:
  - take-plan validates plan + fenced scope + clean tree + ports BEFORE the claim (no half-claimed slot); re-run with the same NNN resumes.
  - New `scripts/lib/slot-procs.mjs` + `scripts/slot-stop.mjs`: servers recognised by recorded PID or descendant; leftover dev servers on the slot's ports are stopped; non-dev programs refused; cross-platform kill.
  - Servers are waited on (be 90s, fe 180s); on failure the log tail is printed. The real port-owner PID is recorded.
  - Optional `commands.slotPrepare` (FoodVibe: `build:schemas`) runs before the servers.
  - Release (take-plan, free-merged-slots) stops the slot's servers; squash merges (upstream `[gone]`) count as merged; `.claude/*.log` never makes a slot dirty (+ `.gitignore`).
  - `/take-plan` step 0: outside a slot, name the free slot and ask for a new session there.
  - Scope parsing: the Planner's plans 335-338 had the ```scope fence mangled in three different ways (bare `scope` line, plain fence, tag above the fence), which is what broke both Workers. New shared `scripts/lib/plan-scope.mjs` accepts those shapes plus a `**Scope:**` list; `scope-check.mjs` and `take-plan.mjs` (pre-claim) both use it.
  - `save-plan` shape lint (readable scope, one `Status:`) + Prerequisites Gate ported into the kit (it had drifted).
  - Kit `commands.dbBackup` fix: backup and restore are separate list entries (was one script for both).
- [x] E5b: Third Worker report (wt-3, plan 335): take-plan crashed on an empty "mark active" commit when the Planner had saved the plan as `Status: active` (the bug plan 330 targets) - now commits only when something is staged. Slot continuity: merging from a slot drops `--delete-branch` (it switched the checkout to `main`) and deletes the remote branch separately (`standards-git.md` → "Merging from a slot"); the slot's own servers keep running across plans and restart only after an npm install; `free-merged-slots` no longer stops them.
- [x] E5c: Reports from wt-2 (plan 337) and wt-3 (plan 335), 2026-10-05: take-plan now checks, before changing anything, that the plan's branch is not taken by another slot, that the plan is not already done (all sub-tasks `[x]` on main), and plan order ("must run after plan N" / "until N is done" → refuse while N has open sub-tasks; `--ignore-order` overrides). A leftover merged branch is replaced, a leftover unmerged one reused. "released (merged)" now says "merged or unused". `/ship`: only the literal word `merge` merges — `Y`, `--yes`, "ship fast y" never do (ship.md, ship-regular.md, standards-git.md).
- [x] E6: `todo-query.mjs sync --merged` also syncs any todo section whose plan file has more `[x]` than the section, so Workers' validated marks reach `.claude/todo.md` without the Planner re-marking (merged branches are usually deleted, so branch refs missed them).
- [-] E7: `/ship` the FoodVibe side; Dandan commits the kit repo. — closed 2026-10-06: shipped in PR #247, kit committed. Won't Have items moved to plans 390–392.
