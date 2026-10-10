# Skills v2 — diff report (2026-10-10)

Branch `chore/skill-authoring-standard`. Baseline = `main` @ f739e9a (snapshot in the eval workspace). Standard applied: `docs/agent/skill-authoring-standard.md`. Usage figures from `/skill-doctor` on 2026-10-10.

## Benchmark — old skill vs new skill, same prompt, fresh subagent each (iteration-1)

| Eval | Old skill | New skill | Notes |
| --- | --- | --- | --- |
| cssLayer — kitchen-tip-banner.scss | 8/8 | 8/8 | both discovered `$break-*` is unreachable from component SCSS → rule fixed in v2 |
| angularComponentStructure — tip-of-the-day | 7/8 (public `visible_` misuses `_`) | 7/8 (UI handlers interleaved in CRDUL) | both gaps now explicit in v2 |
| save-plan — "save the plan" + contract | 6/8 (Snapshot silently set to local HEAD; arch gate skipped on env error) | 8/8 | v2 ran the arch gate, left Snapshot empty + disclosed, stopped at push |
| **Mean** | **88%** | **96%** | tokens −2%, time +31 s (save-plan v2 did the gate + commit it was supposed to) |

Review viewer with the raw outputs and per-assertion evidence: `skills-workspace/iteration-1/review.html` (sent alongside this report).

## Skill-by-skill

| Skill | Uses (last) | Before | After | Frontmatter added |
| --- | --- | --- | --- | --- |
| `save-plan` | 55× (4d) | 189 lines · desc 247ch | 97 lines · desc 498ch | `allowed-tools` |
| `cssLayer` | 20× (2d) | 65 lines · desc 146ch | 61 lines · desc 434ch | `paths` |
| `preflight` | 22× (1d) | 23 lines · desc 73ch | 19 lines · desc 347ch | `allowed-tools` |
| `techdebt` | 14× (168d; nightly job + /refactor) | 145 lines · desc 179ch · BOM | 68 lines · desc 448ch | `allowed-tools` |
| `github-sync` | 9× (2d) | 64 lines · desc 121ch · BOM | 43 lines · desc 392ch | `allowed-tools` |
| `angularComponentStructure` | 7× (4d) | 72 lines · desc 127ch | 69 lines · desc 458ch | `paths` |
| `worktree-setup` | 7× (7d) | 73 lines · desc 149ch | 43 lines · desc 402ch | `disable-model-invocation` |
| `brief-detection` | 6× (9d) | 91 lines · desc 80ch · BOM | 60 lines · desc 470ch | `user-invocable` |
| `auth-and-logging` | 5× (4d) | 63 lines · desc 134ch · BOM | 48 lines · desc 462ch | `paths` |
| `breadcrumbs` | new | — | 47 lines · desc 476ch | `allowed-tools` |

### Retired / merged

- `angular-pipe-logic` — 0 uses ever → rules folded into `docs/agent/standards-angular.md` (Pipes & directives bullet)
- `auth-crypto` — 0 uses ever → rules folded into `auth-and-logging` + `standards-security.md` rule 8 (Crypto Hygiene)
- `elegant-fix` — 1 use, 185 days ago; every rule already in AGENTS.md → retired; `/fix` and `/refactor` now point at `standards-angular.md`
- `update-docs` — 1 use, 168 days ago → merged into `breadcrumbs`
- `breadcrumb-navigator` — 0 uses ever → merged into `breadcrumbs`

### Cross-cutting

- BOM removed from every live `SKILL.md`, command, Cursor rule and `docs/agent/*` file (archives untouched).
- Mojibake (`â€”`, `âœ“`, `â†‘`) fixed in the same set.
- "Model Guidance: Haiku/Flash…" prose deleted everywhere (Cursor-era; Claude Code cannot act on it).
- Every retired-skill reference updated: `AGENTS.md` trigger table, 5 Cursor rules deleted + `breadcrumbs-must-use-skill.mdc` added, `/fix`, `/refactor`, `/docs-refresh`, `/commands`, `workflow-map.md`, `kit-extract.mjs`.
- New: `scripts/preflight.mjs`, `scripts/breadcrumbs-check.mjs`, `scripts/techdebt-report.mjs`, `scripts/github-sync-gate.mjs` (Node built-ins only, smoke-tested).
- New: `evals/evals.json` for cssLayer, angularComponentStructure, save-plan.

### Follow-ups (not in this branch)

- Gotcha candidate for `docs/brain/gotchas.md`: `$break-*` Sass variables are not importable into component SCSS; `list-shell` and others keep local mirrors. Proper fix is a small chore plan: `src/styles/_breakpoints.scss` + `stylePreprocessorOptions.includePaths` in `angular.json`.
- `cssLayer` / `angularComponentStructure` names are camelCase; the open skill spec wants lowercase-hyphen. Works in Claude Code today; rename is a separate change (references in kit, Cursor rules, docs).
- `docs/workflow-kit/manifest.json` + `kit-owned.json` need entries for the 4 new scripts and `breadcrumbs`; `kit-manifest-check.mjs` already fails on `main` for unrelated files.
- `/skill-doctor` lists ~56 never-invoked skills from gstack/superpowers/claude.ai sync. Each costs listing budget every turn — worth a `/skills` pass.

## Rationale + unified diff per skill

### save-plan

Checklist moved to the top (compaction keeps the top of a skill); Phase 4 (mid-flight sync) moved to `reference/mid-flight-sync.md`; `allowed-tools` pre-approves the four scripts and read-only git calls; description now carries the trigger phrases that used to live in the body. From the eval: H1-already-numbered rule, origin-unreachable Snapshot rule, environmental scope-check failure rule. All content preserved.

<details><summary>diff</summary>

```diff
--- old/save-plan/SKILL.md
+++ new/save-plan/SKILL.md
@@ -1,63 +1,44 @@
 ---
 name: save-plan
-description: >
-  Persist a Plan Contract to plans/ with name-similarity validation, ledger sync,
-  and Human confirm on collisions. Use when the user pastes/approves a big plan,
-  says save the plan, or any agent (Claude or Cursor) receives a Plan Contract to execute.
+description: Persists a Plan Contract to `plans/NNN-slug.plan.md` with the name-similarity gate, shape lint, architecture gate, ledger sync and (Planner only) commit + push to main with verification. Use when the user says "save the plan" / "save plan", pastes or approves a Plan Contract or big plan (Milestones, Atomic Sub-tasks, Goals), says "here is the plan" / "execute this plan", or when `/plan` or Cursor plan mode produced a contract that is not yet under `plans/`. Runs before any milestone execution.
+allowed-tools: Bash(node scripts/plan-name-similarity.mjs *) Bash(node scripts/next-plan-number.mjs *) Bash(node scripts/todo-query.mjs *) Bash(node scripts/scope-check.mjs *) Bash(git branch *) Bash(git rev-parse *) Bash(git ls-tree *) Bash(git fetch *)
 ---
 
-# Skill: save-plan
+# save-plan
 
-**Model Guidance:** Use Haiku/Flash for Phases 0–1 and 3. Use Sonnet for Phase 2 only when validating PRD alignment on a complex plan.
+A plan is not real until it is on disk under `plans/` — and, for the Planner, until it is on `origin/main`, because a Worker's `take-plan.mjs` reads only `origin/main`. Everything below exists to make that true without reusing a number, duplicating a plan, or shipping a plan a Worker cannot take.
 
-## Triggers (any agent — Claude Code or Cursor)
+**Who am I?** `git branch --show-current` on `main` in the main folder = **Planner**. Inside a `wt-N` slot (`.worktree-root` exists) = **Worker** saving mid-brief. The two differ in Phases 1 and 3; everything else is shared.
 
-Run this skill **before executing milestones** when any of these is true:
+## Checklist — copy into your reply and tick
 
-- User says "save the plan" / "save plan" / confirms a plan and asks to persist it
-- User pastes a **Plan Contract** / big plan (milestones, Atomic Sub-tasks, Goals)
-- User says "here is the plan" / "execute this plan" / drops a plan body into chat
-- Architect `/plan` or Cursor plan mode produced a contract that is not yet under `plans/`
-
-**Hard rule:** Do not start Brief/milestone execution until the plan is on disk under `plans/` (or Human explicitly cancels save).
-
----
-
-## Plan Rules (inline)
-
-- Plan numbering: `node scripts/next-plan-number.mjs` (highest number used by any plan or `<type>/NNN-*` branch, + 1, zero-padded)
-- Refactor variant suffix: `NNN-R`
-- No plans yet → start at `001`
-- Write to `plans/<NNN>-<slug>.plan.md` in project root only — never `~/.cursor/plans/`
-- Preferred H1 shape: `# Plan NNN — <Human Title>` (name must describe the work — similarity depends on it)
-- Todo / Atomic Sub-tasks sync happens as part of save (see phases)
-- Every sub-task: `[ ] Brief description of target file(s)`
-- Medium/Large plan touching auth/storage → note security surface
-- Not on a worktree + plan involves code changes → suggest `feat/` branch checkout
-- Every Done-when / Success Criteria item starts with `[auto]` or `[human]`. `[auto]` = the expected output is exact: an exact string, an exit code, a byte-identical diff, `npm run build` or a test suite passing, or deterministic CLI output. `[human]` = visual/UI judgement, live interaction, subjective or design quality, product decisions. Untagged counts as `[human]`. A UI-touching plan whose only Done-when is `[auto]` `npm run build` passes is under-specified — the planner must add a `[human]` item. Only the plan author tags; agents never promote an item to `[auto]`.
-
----
-
-## Phase 0: Detect + Name Similarity Gate (mandatory)
-
-1. Extract a **plan display name** from the H1 / YAML `name:` / first heading (e.g. `Project Memory Bank`).
-2. Propose a slug: lowercase kebab-case from that name (e.g. `project-memory-bank`).
-3. Run the shared checker (Claude and Cursor — same script):
-
-```bash
-node scripts/plan-name-similarity.mjs --name="<Plan Display Name>"
+```
+save-plan:
+- [ ] 0 similarity: node scripts/plan-name-similarity.mjs --name="<Display Name>" → no hits, or Human chose rewrite/new/cancel
+- [ ] 1 number (Planner, save-as-new only): node scripts/next-plan-number.mjs → NNN
+- [ ] 1 ledger (Planner): Atomic Sub-tasks appended to .claude/todo.md via todo-query.mjs append
+- [ ] 2 shape: Read-Write Scope parses, exactly one Status:, Snapshot: present, every Done-when tagged [auto]/[human]
+- [ ] 2 arch gate: node scripts/scope-check.mjs --arch --plan=<path> → exit 0
+- [ ] 2 prerequisites (Planner): already true on origin/main, or split into NNN-1
+- [ ] 3 written to plans/NNN-slug.plan.md (never ~/.cursor/plans/)
+- [ ] 3 Planner: on main → commit plan + todo only → push → git ls-tree origin/main prints the path
+- [ ] 4 completion line printed
 ```
 
-4. Interpret stdout:
-
-| Result | Action |
-| --- | --- |
-| `no similar plans` | Proceed to Phase 1 — **do not** ask rewrite/new/cancel |
-| `similar plan(s)` | **Stop.** Show Human a short validation block (below). Wait for answer |
-
-### Human validation block (only when hits exist)
+## Plan rules (what a saved plan looks like)
 
-Copy the script output into chat, then ask exactly:
+- Path `plans/<NNN>-<slug>.plan.md`, H1 `# Plan NNN — <Human Title>` (the title drives similarity — make it describe the work). Refactor variant: `NNN-R`.
+- `## Read-Write Scope` in a shape `scripts/lib/plan-scope.mjs` parses: a fenced ```` ```scope ```` block, one glob per line, **or** a `**Scope:**` line followed by bullets whose first token is a `` `backticked` `` glob. A bare `scope` line or un-backticked bullets are not parsed and `take-plan` refuses the plan.
+- Exactly one `Status:` line (`Status: draft` for new; `take-plan` sets `active`). One `Snapshot:` line (filled in Phase 3).
+- Every Atomic Sub-task is `[ ] <what> — <target file(s)>`.
+- Every Done-when item starts with `[auto]` or `[human]`. `[auto]` means the expected output is exact — a string, an exit code, `npm run build` passing, deterministic CLI output. `[human]` is visual/UI judgement, live interaction, product decisions; untagged counts as `[human]`. A UI-touching plan whose only Done-when is `[auto] npm run build` is under-specified — add a `[human]` item. Only the plan author tags; agents never promote to `[auto]`.
+- Medium/large plan touching auth or storage → a one-line security-surface note; `scripts/pre-commit-security-grep.mjs` is the gate.
+
+## Phase 0 — similarity gate (always)
+
+1. Extract the display name from the H1 / `name:` / first heading; derive the kebab-case slug.
+2. `node scripts/plan-name-similarity.mjs --name="<Display Name>"`
+3. `no similar plans` → go on, do **not** ask rewrite/new/cancel. `similar plan(s)` → paste the script output and ask exactly:
 
 ```text
 Similar plan(s) found — validate:
@@ -68,121 +49,48 @@
 Reply: rewrite existing | save as new | cancel
 ```
 
-- **rewrite existing** → Edit/overwrite the chosen existing path; sync its Atomic Sub-tasks + `.claude/todo.md`; do **not** allocate a new `NNN`.
-- **save as new** → Continue Phase 1 with next `NNN`. Before Write, put the relative path in `.claude/.plan-write-ack` (one line, e.g. `plans/291-foo.plan.md`) so the PreToolUse guard allows the create.
-- **cancel** → Stop. Do not write. Do not execute briefs.
-
----
+- **rewrite existing** → overwrite that path, sync its Atomic Sub-tasks + `.claude/todo.md`, no new `NNN`.
+- **save as new** → continue; before the Write put the relative path in `.claude/.plan-write-ack` (one line, e.g. `plans/291-foo.plan.md`) so the PreToolUse guard allows the create.
+- **cancel** → stop, write nothing, execute nothing.
 
-## Phase 1: Ledger Sync
+## Phase 1 — number + ledger (Planner only)
 
-**Planner-only.** This phase (NNN assignment + `.claude/todo.md` append) runs only for the
-Planner — main folder, checked out on `main`. A Worker inside a `wt-N` slot never assigns a
-new `NNN` and never touches `.claude/todo.md`; see Phase 4 for what a Worker does instead.
+A Worker never assigns `NNN` and never touches `.claude/todo.md` (it is Planner-owned; `todo-query.mjs sync --merged` collects the Worker's plan-file changes after merge).
 
-Do not Read .claude/todo.md in full.
+- **Number (save-as-new):** `node scripts/next-plan-number.mjs`. The script's number wins even when the pasted H1 already carries one (an Architect drafting in chat cannot see Workers' open branches) — rename the H1 and tell the Human in the completion line. It fetches, then takes the highest number across local plans, `origin/main` plans, the main worktree, and every local/remote `<type>/NNN-*` branch — a Worker's open branch whose plan you cannot see yet — plus 1. Never count `plans/` by hand; that is exactly how a number got reused. Re-run right before the write if anything else saved a plan meanwhile.
+- **Ledger:** don't read `.claude/todo.md` in full. Extract the Atomic Sub-tasks into a temp file and `node scripts/todo-query.mjs append --from <file>` (it inserts under `### Plan NNN — <Title>` before the footers). Then `node scripts/todo-query.mjs open` — unrelated open items get surfaced, not silently buried.
 
-**Todo Update:** Extract `# Atomic Sub-tasks` (or equivalent checklist), write it to a temp file, and run `node scripts/todo-query.mjs append --from <file>` to insert it under `### Plan NNN — <Title>` before `.claude/todo.md`'s footers.
+## Phase 2 — lint the draft (cheap here, expensive in a slot)
 
-**Sub-task Formatting:** Every task `[ ]` with target file(s) when known.
-
-**State Verification:** Run `node scripts/todo-query.mjs open` — if unrelated open tasks exist → surface them before proceeding.
-
-**Numbering (save as new only):** run `node scripts/next-plan-number.mjs` and use the number it prints. It fetches, then takes the highest number used by local plans, `origin/main`'s plans, the main worktree's plans, and any local or remote `<type>/NNN-*` branch (a Worker's open branch whose plan you may not see yet), plus 1. Never compute `NNN` by hand from `plans/` alone — that is how a Worker's open branch number got reused. Re-run it right before the write if anything else saved a plan meanwhile.
-
----
+- **Shape:** scope block parses; one `Status:`; a `Snapshot:` line exists (may be empty until Phase 3); Done-when tags present.
+- **Coverage:** every requirement in the plan has an Atomic Sub-task.
+- **Architecture gate:** `node scripts/scope-check.mjs --arch --plan=<path>` must exit 0 (`ARCH: ok …` or `ARCH: skipped …`). A crash that is environmental (`Cannot find package 'picomatch'` → `node_modules` missing, run `npm ci`) is not a gate result — fix the environment and re-run; do not reason the gate out by hand. It fails when the scope touches an invariant in `docs/brain/invariants.md` with no `## Architecture Impact` line, or a `deviation`/`changes` line lacking `Arch-approved: Human YYYY-MM-DD` or a valid ADR. Fix the draft. Only the Human's literal `approve arch change INV-n` in chat allows an `Arch-approved:` line — never write one on your own.
+- **Prerequisites (Planner):** if the draft has `## Prerequisites`, verify each is already true on `origin/main` *now*. A tiny Planner-owned fix (a few lines) → land it as its own chore commit first. Anything bigger → save it as its own plan `NNN-1`, sequenced before this one. A Worker must never take a plan with a gate it cannot clear itself.
 
-## Phase 2: Logic Validation
+## Phase 3 — write, and (Planner) commit + push + verify
 
-**PRD Alignment:** Atomic sub-tasks cover the plan requirements — no requirement without a task.
+- `Snapshot:` = `git rev-parse origin/main` when the draft left it empty; never overwrite a SHA the Architect filled in. If `origin/main` cannot be resolved (no remote, fetch failed), leave it empty and say so — a local `HEAD` SHA is not what the Worker's drift check compares against, and substituting it hides the problem.
+- Write the file (rewrite → existing path; new → `plans/<NNN>-<slug>.plan.md`). Never under `~/.cursor/plans/`.
+- Not in a worktree and the plan changes code → suggest a `feat/` branch for whoever executes it.
 
-**Risk Audit:** Medium/Large + auth/storage → note security surface; rely on pre-commit security grep + CI.
+**Planner only:**
 
-**Shape lint (mandatory before saving):** a Worker's `take-plan.mjs` refuses a plan without these, so check them here where the fix is cheap:
+1. `git branch --show-current` **immediately before committing** — if it is not `main` (e.g. `branch-guard.sh` auto-switched to `feat/session-*`), `git checkout main` first. Catch it here, not after.
+2. `git add` the plan file and `.claude/todo.md` only (never `-A`), commit. This is the Planner's admin write to `main` (`AGENTS.md` Planner-Worker bullet; enforced by `scripts/branch-guard.sh` and `.husky/pre-push`).
+3. `git push origin main`. Blocked, rejected or non-zero → **stop**; surface the blocker and ask. Do not tell the Human the plan is ready.
+4. `git fetch origin --quiet` then `git ls-tree origin/main --name-only -- plans/<NNN>-<slug>.plan.md` must print the path. Empty → the push did not land; stop and investigate.
 
-- `## Read-Write Scope` holds the globs in one of the two shapes `scripts/lib/plan-scope.mjs` parses: a fenced block opened with ```` ```scope ```` (one glob per line), or a `**Scope:**` line followed by bullets that each start with a `` `backticked` `` glob. A bare `scope` line, or bullets without backticks, are not parsed.
-- Exactly one `Status:` line, with a value (`Status: draft` for a new plan; take-plan sets `active`).
-- A `Snapshot:` line (see Phase 3) — the Worker's drift check compares against it.
-- **Architecture gate (block):** `node scripts/scope-check.mjs --arch --plan=<path>` exits 0 (`ARCH: ok …`, or `ARCH: skipped …` for a grandfathered plan / no registry). It fails when the scope touches an invariant in `docs/brain/invariants.md` that has no `## Architecture Impact` line, or a `deviation`/`changes` line lacks `Arch-approved: Human YYYY-MM-DD` or a valid ADR. Fix the draft; only the Human's explicit `approve arch change INV-n` in chat allows an `Arch-approved:` line.
+A Worker saving mid-brief does not commit here — its plan-file change rides its `feat/NNN-*` branch at `/ship`.
 
-**Prerequisites Gate (Planner only):** If the draft has a `## Prerequisites` section, check it's already true against `origin/main` *before* saving — do not hand a Worker a plan that will STOP on take. If unmet:
-
-- **Tiny, Planner-owned fix** (a few lines, no plan-worthy scope of its own) → land it directly as its own chore commit/PR to `main` now, then save this plan.
-- **Anything bigger** → save the prerequisite as its own plan (`NNN-1`, sequenced before this one) instead of writing a Prerequisites gate that STOPs a Worker. A plan should never ship with a hard gate the Worker who takes it cannot clear itself.
-
----
-
-## Phase 3: Write Plan File
-
-**Worktree Verification:** If not on a worktree and plan involves code changes → suggest `feat/` branch checkout.
-
-**Write:**
-
-- rewrite → overwrite the existing plan path Human confirmed
-- save as new → write `plans/<NNN>-<slug>.plan.md` (after `.claude/.plan-write-ack` if the write-guard may block)
-
-Never write under `~/.cursor/plans/`. `Snapshot:` — every plan has one. Fill it with the current
-`origin/main` SHA (`git rev-parse origin/main`) when the draft left it empty or has no
-`Snapshot:` line at all; never overwrite a SHA the Architect already filled in.
-
-**Pre-commit branch check (Planner only):** Run `git branch --show-current` immediately
-before committing. If it is not `main` (or `master`) — e.g. `branch-guard.sh` mis-fired and
-auto-switched to a `feat/session-*` branch — STOP before committing: `git checkout main`
-first, so the commit lands directly on `main`. Do not commit on a stray branch and fix it
-after; catch it here.
-
-**Commit (Planner, on `main`, only):** `git add` only the plan file and `.claude/todo.md`
-(never `-A`), then commit. This is the Planner's admin-bypass write to `main` — see
-`AGENTS.md`'s Planner-Worker bullet, enforced by `scripts/branch-guard.sh` and
-`.husky/pre-push`. A Worker saving mid-brief inside a `wt-N` slot does not commit here —
-its commit happens at `/ship` time on its `feat/NNN-*` branch, plan file only (Phase 4).
-
-**Push + Verify (Planner only, mandatory — do this before telling the Human the plan is
-ready):**
-
-1. `git push origin main`. If the push is blocked (permission prompt, rejected, or any
-   non-zero exit) — STOP. Do not tell the Human to execute the plan yet; surface the
-   blocker and ask for a decision first. A Worker's `take-plan.mjs` only reads
-   `origin/main`, so an unpushed plan fails silently in the worktree instead of here where
-   it's cheap to fix.
-2. After a successful push, confirm it actually landed: `git fetch origin --quiet` then
-   `git ls-tree origin/main --name-only -- plans/<NNN>-<slug>.plan.md` must print the path
-   (non-empty). If empty, the push did not do what it looked like — STOP and investigate
-   before announcing done.
-3. Only once both checks pass does the Completion Gate's "Plan NNN pushed" line become true.
-
----
-
-## Phase 4: Brief / mid-flight sync (ongoing — not only at save)
-
-After the plan is saved, **any agent** executing a brief from it must keep the plan file live:
-
-1. Brief must name its **parent plan path** (e.g. `plans/290-….plan.md`).
-2. If review fail / fallout / Human adds a stage → **append** a new `[ ]` Atomic Sub-task
-   (and milestone row if needed) **before** doing the new work.
-   - **Worker (inside a `wt-N` slot):** append to the plan file **only**. Never touch
-     `.claude/todo.md` — it is Planner-owned; the Planner's `todo-query.mjs sync --merged`
-     picks this up once the branch merges.
-   - **Planner (main folder, on `main`):** append to the plan file **and**
-     `.claude/todo.md`, as before.
-3. On validation per `docs/agent/job-validation.md` (Human reply, ship Y, or the Tier 1 auto path) → mark the matching item(s) `[x]`.
-   - **Worker:** mark `[x]` in the plan file's own Atomic Sub-tasks only.
-   - **Planner:** mark `[x]` in both the plan file and `.claude/todo.md` (see
-     `docs/agent/job-validation.md`).
-
----
-
-## Completion Gate
-
-Output:
+## Phase 4 — completion line
 
 ```text
 Plan saved: plans/<NNN>-<slug>.plan.md
 Ledger updated. Similarity: <none | rewrite | save-as-new>
 ```
 
-Then the last line depends on who saved it:
+then, **Planner:** `Plan NNN pushed. Open a free slot and say: execute plan NNN.` — the Planner never starts execution, even for a one-milestone plan. **Worker / anywhere else:** `Ready to execute Task 1: [Task Name].`
+
+## After the save — keeping the plan live
 
-- **Planner (main folder, on `main`):** `Plan NNN pushed. Open a free slot and say: execute plan NNN.`
-  The Planner never starts execution itself, even for a one-milestone plan.
-- **Worker (inside a `wt-N` slot) or anywhere else:** `Ready to execute Task 1: [Task Name].`
+Briefs executed from a saved plan must keep the plan file current (new sub-tasks appended *before* the work, `[x]` only after validation per `docs/agent/job-validation.md`). The Planner/Worker split for that is in [reference/mid-flight-sync.md](reference/mid-flight-sync.md) — read it when a brief adds a stage, a review produces fallout, or you are marking items done.
```

</details>

### cssLayer

`paths:` auto-activates on `src/**/*.scss`; rules keep their *why*; one real five-group example with the repo's actual tokens; verification loop with two greps. From the eval: `$break-*` is not importable into component SCSS — the old rule was unfollowable; now says to declare a one-line local mirror. Rules that only duplicate AGENTS.md removed.

<details><summary>diff</summary>

```diff
--- old/cssLayer/SKILL.md
+++ new/cssLayer/SKILL.md
@@ -1,64 +1,60 @@
 ---
 name: cssLayer
-description: Enforces the project CSS architecture — engine placement, five-group rhythm, and token tier rules — before any SCSS/CSS file is written or edited.
+description: FoodVibe CSS architecture — where `.c-*` engine classes may live, design-token usage (`var(--*)`, `$break-*`), logical properties and the five-group property order. Use before creating or editing ANY `.scss` or `.css` file under `src/`, when styling a component, adding a breakpoint or a glass surface, and whenever the user mentions styles, SCSS, CSS, theme, tokens, layout, spacing or responsive — even if they never say "cssLayer".
+paths:
+  - "src/**/*.scss"
+  - "src/**/*.css"
 ---
 
-# Skill: cssLayer
-**Model Guidance:** Use Haiku/Flash for Phases 1 and 2. Use Sonnet for Phase 3 only when designing a new global `.c-*` engine class.
+# cssLayer — writing SCSS in FoodVibe
 
-**Trigger:** Before creating or editing any `.scss` or `.css` file in `src/`.
+The design system lives in `src/styles.scss`: the token block at the top (`/* Designated global tokens */`), the `$break-*` variables, and the `.c-*` engine classes. Component `.scss` files only *compose* that system. Every rule below exists to keep that true.
 
-**CSS Rules (inline — no guide read required):**
-- `.c-*` engine classes belong **only** in `src/styles.scss` — never inside a component `.scss`
-- Angular view encapsulation will scope `.c-*` defined in components, breaking cross-component reuse
-- If a `.c-*` is found in a component file → move to `src/styles.scss` before proceeding
-- No inline styles unless the value is dynamic/runtime
-- Logical properties only: `padding-inline`, `padding-block`, `margin-inline` — no physical directional values
-- Responsive breakpoints must follow project token definitions (`$break-mobile`, `$break-tablet`, `$break-desktop` from `src/styles.scss` — never hardcode pixel values)
-- **No hardcoded values** — use `var(--*)` for ALL colors, shadows, radii, blur, and easing. Hardcoding `#ffffff`, `rgba(0,0,0,0.1)`, `8px` radius, or `blur(16px)` is a theme violation — the design system tokens exist for exactly these values
+## Rules and why
 
----
-
-## Phase 1: Token & Engine Audit 
-
-**Theme Alignment:** Read the design system comment block at the top of `src/styles.scss` (the `/* Designated global tokens */` section). Identify which tokens apply to the component type you're about to style — surface tokens (`--bg-glass`, `--blur-glass`), semantic tokens (`--bg-warning`, `--text-warning`), radius tokens (`--radius-*`), shadow tokens (`--shadow-*`). Every value you write should map to one of these. If you can't find a token for a value, that's a signal the value might not belong in the design.
-
-**Engine Search:** Scan `src/styles.scss` for existing `.c-*` engine classes that can be composed before writing new styles. Composing an engine means adding it as an HTML class on the host element — not replicating its properties in the component SCSS.
-
-**Component Scan:** Check all component `.scss` files in scope for any `.c-*` definitions → move any found to `src/styles.scss`.
+- **`.c-*` engine classes are defined only in `src/styles.scss`.** Angular view encapsulation rewrites selectors inside a component stylesheet, so a `.c-*` defined there is scoped to that component and silently stops being reusable. Use an engine by adding its class to the host element in the template, not by copying its properties.
+- **No hardcoded design values.** Colors, shadows, radii, blur and easing come from `var(--*)` tokens. A literal `#fff`, `rgba(0,0,0,.1)`, `8px` radius or `blur(16px)` is a theme fork: it will not follow the theme when a token changes. If no token fits, that is a signal the value doesn't belong in the design — ask before inventing one.
+- **Breakpoints.** `$break-mobile` (768) / `$break-tablet` (900) / `$break-desktop` (1200) are declared in `src/styles.scss`, and Sass variables there are *not* reachable from a component stylesheet (no `stylePreprocessorOptions.includePaths`). Until a shared `_breakpoints.scss` partial exists, declare a local mirror at the top of the component file with a comment naming the global it mirrors — `$break-tablet: 900px; // mirrors src/styles.scss` — and use that in `@media`. Never a bare number inside `@media`.
+- **Logical properties only** (`padding-inline`, `margin-block`, `inset-inline-start`). The UI is Hebrew RTL; physical `left`/`right` breaks mirroring.
+- **No inline styles** unless the value is runtime-dynamic.
+- **Native CSS nesting**, breakpoint blocks *after* the base styles of the selector.
 
-**Shared UI Check:** Scan `src/app/shared/` for composable patterns before writing new markup.
+## Workflow
 
----
-
-## Phase 2: Structural Authoring 
+1. **Audit before writing.** Read the token block at the top of `src/styles.scss` and pick the tokens for this surface (surface: `--bg-glass`, `--bg-glass-strong`, `--blur-glass`; semantic: `--bg-warning-soft`, `--text-warning`; type: `--fs-*`, `--fw-*`; `--space-*`; `--radius-*`; `--shadow-*`; `--ease-smooth`/`--ease-spring`). Grep `src/styles.scss` for an existing `.c-*` engine and `src/app/shared/` for a composable pattern before authoring anything new.
+2. **Write each selector in five groups**, blank line between groups, in this order:
 
-Apply the **Five-Group Vertical Rhythm** in every selector — in this order, each group separated by a blank line:
+   ```scss
+   .recipe-card {
+     display: grid;                       /* 1 layout: display, flex/grid, position, gap, z-index */
+     grid-template-columns: 1fr auto;
 
-1. **Layout** — `display`, `flex`, `grid`, `position`, `gap`, `z-index`
-2. **Dimensions** — `width`, `height`, `aspect-ratio`
-3. **Content** — typography, colors, `content`
-4. **Structure** — `margin`, `padding`, `border`, `border-radius`
-5. **Effects** — `transition`, `animation`, `shadow`, `opacity`
+     inline-size: 100%;                   /* 2 dimensions: width/height (logical), aspect-ratio */
 
-Use logical properties throughout (`margin-inline`, `padding-block`). Use native CSS nesting syntax. Place responsive breakpoint blocks after the base selector — never before the base styles.
+     color: var(--color-primary);         /* 3 content: typography, colors, content */
+     font-size: var(--fs-md);
 
----
+     padding-inline: var(--space-4);      /* 4 structure: margin, padding, border, radius */
+     border-radius: var(--radius-md);
 
-## Phase 3: Complexity Review 
+     transition: box-shadow var(--ease-smooth); /* 5 effects: transition, animation, shadow, opacity */
+     box-shadow: var(--shadow-glass);
 
-> **Only invoke if** the same styles are repeated across more than two components.
+     @media (min-width: $break-tablet) {  /* breakpoints come last; $break-tablet is the local mirror */
+       grid-template-columns: 1fr 1fr;
+     }
+   }
+   ```
 
-**Abstraction:** Propose a new `.c-*` engine class for `src/styles.scss` — name it, define it, register it. Then replace the repeated styles in each affected component file with the new `.c-*` class.
+3. **Promote, don't repeat.** The same block in more than two components → define a `.c-*` engine in `src/styles.scss`, then replace the copies with the class in each template.
 
-**Performance:** Optimize for layout stability (avoid CLS) and minimal selector depth.
-
----
+## Verify before you finish (loop until both are empty)
 
-## Completion Gate
+```bash
+# engines defined in a component stylesheet — must print nothing for the files you edited
+grep -nE "^\s*\.c-[a-z]" <edited .scss files>
+# hardcoded values — must print nothing (tokens, and the one-line $break-* mirror declaration, are fine)
+grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|[0-9]+px.*(radius|blur)|@media.*[0-9]+px" <edited .scss files>
+```
 
-- No inline styles added (unless value is dynamic/runtime)
-- Responsive breakpoints use `$break-*` SCSS variables — no hardcoded pixel values
-- No `.c-*` class defined in any component `.scss` file
-- Five-Group Vertical Rhythm applied to every new/edited selector
-- No hardcoded colors, shadows, radii, or blur values — every value uses `var(--*)` or a `$` SCSS variable from `src/styles.scss`
+A hit means fix it, re-run. Pre-existing hits in files you did not touch are tech debt, not your job here — note them for `techdebt`.
```

</details>

### preflight

Four prose checks → `scripts/preflight.mjs` (Node built-ins, exit code, same on Windows/CI); `allowed-tools` so it runs without a prompt; `--visual` flag for the gstack check.

<details><summary>diff</summary>

```diff
--- old/preflight/SKILL.md
+++ new/preflight/SKILL.md
@@ -1,22 +1,18 @@
 ---
 name: preflight
-description: Pre-flight environment check — dev server, MongoDB, branch, gstack binary
+description: Environment check before any work that needs the dev server, the browser or MongoDB — verifies the dev server answers on this checkout's port, MongoDB is reachable, and the branch is not `main`. Use at the start of a UI check, a browser flow, a DB query or a plan that runs the app, and whenever something "doesn't load" — run it before debugging.
+allowed-tools: Bash(node scripts/preflight.mjs *)
 ---
 
-# Preflight Check
+# Preflight
 
-**Skill:** preflight
-Run before any workflow that touches dev server / browser / database.
+Run the script; it prints one line per check and exits non-zero on any `FAIL`:
 
-## Checks
+```bash
+node scripts/preflight.mjs            # dev server, MongoDB, branch
+node scripts/preflight.mjs --visual   # + gstack browse binary, for screenshot/browser flows
+```
 
-1. **Dev server reachable:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:$(cat .worktree-port 2>/dev/null || echo 4200)` returns `200`
-2. **MongoDB reachable:** `mongosh --eval "db.runCommand({ping:1})" --quiet` returns ok
-3. **Current branch != main:** `git branch --show-current` is not `"main"`
-4. **(visual workflows only) gstack binary present:** `ls ~/.claude/skills/gstack/browse/dist/browse`
+The port comes from `.worktree-port` (a `wt-N` slot) or defaults to 4200 (main). Override with `--port`.
 
-## Output
-
-Single line per check: `OK` | `FAIL: <reason>`
-
-On any `FAIL` → return non-zero. Calling workflow aborts.
+On `FAIL`, fix the named cause before continuing — a dev-server check that fails is not "flaky", it means the next browser step would be testing nothing. If the fix is outside your scope (MongoDB not installed, slot not provisioned), report the exact `FAIL` line to the Human and stop.
```

</details>

### techdebt

Retention/date logic (described twice, inconsistently) → `scripts/techdebt-report.mjs prepare`; the trend table is computed, not eyeballed; uses `npm run lint` / `audit:deadcode` instead of hand-scanning; stale `commit-to-github` reference removed; stays model-invocable for `/refactor` and the nightly job.

<details><summary>diff</summary>

```diff
--- old/techdebt/SKILL.md
+++ new/techdebt/SKILL.md
@@ -1,144 +1,67 @@
-﻿---
-name: techdebt
-description: Scans for duplicated code, dead code, style violations, and TODO debt — run before PRs, after features, or at session end. Maintains a rolling archive of the last 7 audit reports.
 ---
-
-# Skill: techdebt
-
-**Trigger:** End of development session, before a PR, after large features, or user says "audit tech debt" / "cleanup" / "check todos".
-
-**Style Violation Rules (inline — no guide read required):**
-- Flag: `@Input`/`@Output` decorators → replace with `input()`, `output()`, `model()`
-- Flag: `BehaviorSubject` → replace with `signal()`
-- Flag: `any` types → replace with explicit types
-- Flag: semicolons in TypeScript files
-- Flag: components or services exceeding 300 lines → refactor candidate
-- Flag: temporary auth bypasses or hardcoded keys → security risk, must fix before PR
-- Reusable logic → move to `shared/` or `core/utils/`
-
----
-
-## Report Archive — Rolling 7-Report Retention
-
-**Folder:** `.claude/techdebt-reports/`
-
-**Filename convention:** `techdebt-YYYY-MM-DD.md` (one report per calendar day; re-running on the same day overwrites that day's report).
-
-**Retention logic — execute at the START of every audit, before writing the new report:**
-
-1. List all files in `.claude/techdebt-reports/` matching `techdebt-*.md`.
-2. Sort by date extracted from filename (oldest first).
-3. Count existing reports:
-   - **Count < 7:** No deletion needed — proceed to write the new report.
-   - **Count ≥ 7:** Delete the oldest file(s) until only 6 remain, making room for the new report (result: 7 after write).
-4. Write (or overwrite) today's report: `techdebt-YYYY-MM-DD.md`.
-
-> **Edge case:** If the audit runs multiple times on the same day, the existing report for that date is overwritten in-place — it does NOT count as a new addition, so no old reports are deleted.
-
----
-
-## Scope Modes
-
-- **Working-tree mode** (invoked from `commit-to-github` [S-full] Phase 0): scope = only files staged for commit
-- **Full-project mode** (invoked at session end): scope = all of `src/app/`
-- **Fast-path skip:** If no `.ts` files are in scope → skip entirely and report clean
-
----
-
-## Phase 0 — docs/brain Orient (CONDITIONAL)
-
-If the task involves an unfamiliar area, an architectural choice, or known-recurring debt: read `docs/brain/index.md`, then only the relevant sub-file (`gotchas.md`, `decisions/`, `patterns/`, etc.). Default: skip for routine cleanup or pattern application. Do not call optional MCP memory tools.
-
+name: techdebt
+description: Tech-debt audit for FoodVibe — dead code, duplicated logic, style-rule violations (`@Input`/`@Output`, `BehaviorSubject`, `any`, semicolons), oversized components, leftover TODO/FIXME and security leftovers — written as a dated report with a 7-report trend. Use before a PR, after a large feature, at session end, from `/refactor`, by the nightly maintenance job, or when the user says "audit", "tech debt", "cleanup", "dead code" or "check todos".
+allowed-tools: Bash(node scripts/techdebt-report.mjs *) Bash(npm run lint *) Bash(npm run audit:deadcode *)
 ---
 
-## Phase 1: Static Analysis `[Procedural — Haiku/Composer (Fast/Flash)]`
+# techdebt
 
-**Duplicate Detection:** Scan for redundant utility functions or UI patterns that should move to `shared/` or `core/utils/`.
+Produces `.claude/techdebt-reports/techdebt-<today>.md`. The folder keeps the newest 7 so the Trend section can show whether debt is shrinking; the script owns that bookkeeping so you never compute dates or decide what to delete.
 
-**Dead Code:** Identify unused imports, variables, and commented-out code blocks.
+## 1. Prepare (script)
 
-**TODO Audit:** Scan for `// TODO` or `// FIXME` comments — categorize by urgency (critical / nice-to-have).
-
-**Style Violations:** Flag all violations listed in the rules above.
-
----
-
-## Phase 2: Logic & Complexity Pruning
+```bash
+node scripts/techdebt-report.mjs prepare --scope full-project    # session end, nightly, "audit tech debt"
+node scripts/techdebt-report.mjs prepare --scope working-tree    # before a PR: only staged files
+```
 
-> **Only invoke if** style violations, refactor candidates, or security flags were found in Phase 1.
+It prints `REPORT_PATH`, the scope (and the staged file list in working-tree mode), what it pruned, and a `TREND` table of the previous reports' Summary counts. If the scope lists no source files, write a two-line "clean, nothing in scope" report and stop.
 
-**Refactor Candidates:** Identify components or services exceeding 300 lines — propose split strategy.
+## 2. Analyze the scope
 
-**Signal Optimization:** Identify imperative logic convertible to declarative Signals or `computed()` values.
+Run the tools that exist before reading code by hand — they are faster and don't miss files:
 
-**Security Surface:** Verify no temporary auth bypasses or hardcoded keys remain — these are blocking, must be resolved before PR.
+- `npm run lint` — style rules (semicolons, quotes, `any`)
+- `npm run audit:deadcode` — unused exports, files and dependencies (knip)
+- `grep -rnE "@Input\(|@Output\(|BehaviorSubject" <scope>` — the two banned patterns lint does not catch
+- `grep -rnE "TODO|FIXME" <scope>` — classify each as critical / nice-to-have
+- components or services over 300 lines (`wc -l`) — split candidates
+- anything that looks like a temporary auth bypass or a hardcoded key — these are **blocking** and go to the top of the report
 
----
+Then read for what tools can't see: copied logic blocks that belong in `src/app/core/services/util.service.ts`, imperative state that should be a `computed()`.
 
-## Phase 3: Report Generation & Archive Management
+Fix only what is mechanical and safe in this scope (unused imports, commented-out code, stray `console.log`). Anything that changes behaviour is a finding, not a fix — it becomes a `[ ]` in the report for a plan to pick up.
 
-**3a — Retention cleanup:**
-```
-1. Ensure `.claude/techdebt-reports/` exists (create if missing).
-2. Glob `.claude/techdebt-reports/techdebt-*.md`.
-3. Parse dates from filenames, sort oldest-first.
-4. If today's date already has a report → that slot will be overwritten (no deletion needed unless count > 7).
-5. If count of *other* dates ≥ 7 → delete oldest until 6 remain.
-6. Write today's report.
-```
+## 3. Write the report
 
-**3b — Report template:** Each report file must follow this structure:
+Write `REPORT_PATH` with exactly this structure; the script parses the `## Summary` lines next time to build the trend, so keep the labels verbatim:
 
 ```markdown
 # Tech Debt Audit — YYYY-MM-DD
 
 ## Summary
-- Unused imports removed: X
-- TODOs logged: Y (critical: C / nice-to-have: N)
-- Components flagged for refactor: Z
-- Style violations fixed: W
-- Security flags: S
+- Unused imports removed: N
+- TODOs logged: N (critical: C / nice-to-have: N)
+- Components flagged for refactor: N
+- Style violations: N
+- Security flags: N
 
 ## Scope
-<!-- working-tree | full-project -->
+full-project | working-tree (file list)
 
 ## Detailed Findings
-
+### Security Flags
 ### Dead Code
-<!-- list removed imports, unused vars, commented blocks -->
-
-### TODO / FIXME Inventory
-<!-- table: location | text | urgency -->
-
 ### Style Violations
-<!-- list: file, line, violation, fix applied or pending -->
-
 ### Refactor Candidates
-<!-- components/services > 300 lines, proposed split -->
-
-### Security Flags
-<!-- any temp auth bypasses, hardcoded keys -->
+### TODO / FIXME Inventory
 
 ## Trend (last 7 audits)
-<!-- Compare today's totals vs previous reports in the folder.
-     Show direction arrows: â†‘ worse / â†“ better / → stable -->
+<the TREND table from the script, with ↑ worse / ↓ better / → stable next to today's numbers>
 ```
 
-> The **Trend** section is populated by reading the Summary block from the other reports in the archive folder and comparing counts. This gives a quick at-a-glance view of whether tech debt is growing or shrinking over the rolling window.
-
----
-
-## Phase 4: Documentation & Sync `[Procedural — Haiku/Composer (Fast/Flash)]`
-
-**Breadcrumb Check:** Run `update-docs` skill to ensure navigation maps reflect the cleaned state.
-
-**Ledger Update:** Mark completed items in `.claude/todo.md` — move unresolved debt to a dedicated "Tech Debt" section.
-
----
-
-## Completion Gate
-
-Output: `"Tech debt audit complete. [X] unused imports removed, [Y] TODOs logged, [Z] components flagged for refactor. Report saved to .claude/techdebt-reports/techdebt-YYYY-MM-DD.md ([N]/7 reports in archive)."`
-
-If critical logic was changed → invoke CI / ng test for verification before committing.
+## 4. Hand-off
 
+- Open findings that need a plan → append `[ ]` items under a `### Tech Debt` heading in `.claude/todo.md` (Planner only; a Worker lists them in the report and in its PR description instead).
+- Breadcrumbs stale after deletions → run `breadcrumbs`.
+- Finish with one line: `Tech debt audit written to <REPORT_PATH> — N blocking, N findings, N fixed.`
```

</details>

### github-sync

Once-per-day gate + git facts now computed by `scripts/github-sync-gate.mjs` via `!` dynamic injection before Claude reads the body; mojibake `âœ“` fixed; dead GitHub-MCP reference dropped (`gh` only); marker written *after* a successful sync; `allowed-tools` for the read-only commands.

<details><summary>diff</summary>

```diff
--- old/github-sync/SKILL.md
+++ new/github-sync/SKILL.md
@@ -1,63 +1,42 @@
-﻿---
-name: github-sync
-description: Pulls recent GitHub activity and syncs the local branch at session start or after time away — runs once per calendar day.
----
-
-# Skill: github-sync
-
-**Trigger:** Session start or after time away. **Once-per-day gate:** Check `notes/github-sync/<today-date>.md` first — if it exists, skip and print `âœ“ GitHub sync already ran today`. Only run if missing.
-**Standard:** Session start rules are in session context from startup — no file reload needed.
-
----
-
-## Phase 0: Worktree Remote Cleanup `[Procedural — Haiku/Composer (Fast/Flash)]`
-
-**Check for breadcrumb:** If `.worktree-cleanup` exists in the repo root:
-1. Read each line (one branch name per line)
-2. For each branch name, run: `git push origin --delete <branch-name>`
-   - If it succeeds: log `âœ“ Deleted remote branch: <branch-name>`
-   - If it fails with "remote ref does not exist": log `âœ“ Already gone: <branch-name>` (safe to ignore)
-3. Delete the `.worktree-cleanup` file after processing all entries
-4. Run `git fetch --prune` to sync remote refs
-
-If `.worktree-cleanup` does not exist, skip this phase entirely.
-
 ---
-
-## Phase 1: Environment Audit `[Procedural — Haiku/Composer (Fast/Flash)]`
-
-**Status Check:** Run `git status` and `git fetch`.
-
-**Conflict Check:** Identify if local changes conflict with remote `main` or active `feat/` branch.
-
-**Worktree Detection:** Identify if operating in a worktree; verify `.worktree-port` and `.worktree-root`.
-
+name: github-sync
+description: Once-a-day sync at session start or after time away — pulls with rebase, cleans up remote branches listed in `.worktree-cleanup`, prunes merged locals, and summarizes open PRs and the project state for this session. Use when a session begins, when the user says "sync", "pull", "what changed", "I'm back", or when `git status` shows the branch is behind. Skips itself if it already ran today.
+allowed-tools: Bash(node scripts/github-sync-gate.mjs *) Bash(git status *) Bash(git fetch *) Bash(git branch *) Bash(git log *) Bash(gh pr list *)
 ---
 
-## Phase 2: Synchronization `[Procedural — Haiku/Composer (Fast/Flash)]`
-
-**Pull / Rebase:** Execute `git pull --rebase` for clean history.
+# github-sync
 
-**Stash Management:** If uncommitted changes exist: `git stash` → sync → `git stash pop`.
+## Gate (computed before you read this)
 
-**Branch Cleanup:** Identify merged local branches safe to delete.
+!`node scripts/github-sync-gate.mjs || true`
 
----
+If the first line is `GATE: already-ran`, print `✓ GitHub sync already ran today` and stop — nothing else in this file applies. Otherwise continue; the facts above (branch, dirty count, ahead/behind, cleanup list) replace any need to re-run `git status`.
 
-## Phase 3: Session Intelligence `[High Reasoning — Sonnet/Gemini 1.5 Pro]`
+## 1. Remote cleanup (only if `CLEANUP` listed branches)
 
-**Daily Log Audit:** Read latest `.claude/sessions/*/session-handoff.md` (preferred) or `notes/session-handoffs/` (legacy fallback) and `notes/github-sync/` files. Summarize the "State of the Project" for the current session.
+For each branch in `.worktree-cleanup`: `git push origin --delete <branch>`. "remote ref does not exist" means it is already gone — log `✓ Already gone: <branch>` and move on. When all entries are processed, delete `.worktree-cleanup` and run `git fetch --prune`. The file is the hand-off from `/cleanup` in a slot that cannot push deletes itself; leaving it behind would re-delete on every sync.
 
-**GitHub Context:** Read open PRs via MCP (`mcp__github__list_pull_requests`) → fallback to `gh pr list`. Surface any pending reviews or CI failures.
+## 2. Sync
 
-**Todo Alignment:** Verify `.claude/todo.md` matches the current branch state.
+- `DIRTY > 0` → `git stash` first, pop after the pull. Never rebase on top of uncommitted work.
+- `git pull --rebase` (rebase keeps the Planner/Worker history linear, which `plan-ledger-check` relies on).
+- On a conflict: stop, show the conflicting files, and ask — do not resolve someone else's work.
+- List local branches already merged into `main` (`git branch --merged main`) and offer them for deletion; do not delete without a yes.
 
----
+## 3. Session intelligence
 
-## Completion Gate
+- Read the newest `.claude/sessions/*/session-handoff.md` and the newest `docs/session-state-*.md` (by date suffix) — these are the "where were we" files.
+- `gh pr list --state open` → surface pending reviews and failing checks.
+- Compare `.claude/todo.md` open items (`node scripts/todo-query.mjs open`) with the current branch; flag anything that looks finished but unmarked.
 
-Output: `"GitHub sync complete. Remote changes merged. Local branch is up to date."`
+## 4. Finish
 
-Save sync log to `notes/github-sync/<today-date>.md`.
+Write `notes/github-sync/<today>.md` (the `MARKER` path from the gate) with: branch, what was pulled, branches deleted, open PRs, and the 3–5 line project summary. Writing the marker is the last step on purpose — a sync that failed halfway must not count as done for today.
 
+Then report in chat, in this shape:
 
+```
+GitHub sync complete — <branch> up to date (<n> commits pulled, <m> remote branches cleaned).
+Open PRs: …
+State: …
+```
```

</details>

### angularComponentStructure

`paths:` on `*.component.ts`; the section order is now a complete annotated class instead of a numbered list; Model Guidance and 4 'phases' removed (specs/`commit-to-github` references were stale); duplicated AGENTS.md rules removed. From the eval: where UI handlers go, and that only writable private signals carry `_`.

<details><summary>diff</summary>

```diff
--- old/angularComponentStructure/SKILL.md
+++ new/angularComponentStructure/SKILL.md
@@ -1,71 +1,68 @@
 ---
 name: angularComponentStructure
-description: Defines the mandatory class structure, section ordering, and CRDUL method grouping for every Angular component in this project.
+description: The required class layout for every Angular component in FoodVibe — section order (injected → inputs → outputs → signals → computed → CRDUL methods), signals-only state, `inject()`, `input()`/`output()`/`model()`, OnPush. Use before creating, scaffolding, refactoring or reviewing ANY `*.component.ts`, when adding a page or modal, and whenever the user mentions a component, page, modal, dialog, widget or "class structure" — even without naming this skill.
+paths:
+  - "src/app/**/*.component.ts"
 ---
 
-# Skill: angularComponentStructure
+# angularComponentStructure
 
-**Model Guidance:** Use Haiku/Flash for Phases 1 and 3. Use Sonnet for Phases 2 and 4.
+Every component class reads the same way, top to bottom, so any agent or developer can find state, API and behaviour without scanning. The order is the rule; the rest of the Angular conventions (signals only, `inject()`, no `any`, quotes/semicolons) are in `AGENTS.md` and `docs/agent/standards-angular.md` and are not repeated here.
 
-**Trigger:** Before creating or refactoring any Angular component class.
+## Class section order
 
-**Component Rules (inline — no guide read required):**
-- `standalone: true` — always
-- `changeDetection: ChangeDetectionStrategy.OnPush` — always
-- `inject()` for all dependencies — no constructor injection ever
-- No `.c-*` classes defined in component `.scss` — use `src/styles.scss` engines only
-- Lucide icons must be registered in `app.config.ts` before use in templates
-- `.spec.ts` only during `commit-to-github` Phase 0 or explicit user request — never during iterative work
-- No `any` types — use explicit TypeScript types for all method parameters and return values
+```ts
+@Component({
+  selector: 'recipe-card',            // kebab-case, no app- prefix unless it collides with native HTML
+  standalone: true,
+  changeDetection: ChangeDetectionStrategy.OnPush,
+  imports: [TranslatePipe, LucideAngularComponent],
+  templateUrl: './recipe-card.component.html',
+  styleUrl: './recipe-card.component.scss',
+})
+export class RecipeCardComponent {
+  // 1. INJECTED
+  private readonly recipeService = inject(RecipeService)
+  private readonly userMsg = inject(UserMsgService)
 
----
-
-## Phase 1: Boilerplate Generation 
-
-**File Creation:** Standard four-file split: `.ts`, `.html`, `.scss`, `.spec.ts` (unless `inlineTemplate` requested). When refactoring an existing component, skip file creation — reorder class sections in place.
-
-**Class Section Order (strict — enforce this sequence every time):**
-1. INJECTED services
-2. INPUTS (`input()`, `model()`)
-3. OUTPUTS (`output()`)
-4. SIGNALS & CONSTANTS (`signal()`, `readonly`)
-5. COMPUTED SIGNALS (`computed()`)
-6. CRDUL methods — Create, Read, Delete, Update, List (grouped in this order)
-
----
-
-## Phase 2: Reactive State Definition 
-
-**Signal Mapping:** Define internal state using `signal()`. Expose public state via `.asReadonly()`.
+  // 2. INPUTS  — input(), model()
+  recipe = input.required<Recipe>()
+  expanded = model(false)
 
-**Derived State:** Implement `computed()` values to prevent unnecessary `effect()` calls.
+  // 3. OUTPUTS — output()
+  selected = output<Recipe>()
 
-**API Definition:** Use `input()`, `output()`, `model()` for all component communication — no `@Input`/`@Output` decorators.
+  // 4. SIGNALS & CONSTANTS — writable private state ends with _; expose it via asReadonly(). computed() never carries the _ suffix
+  private readonly saving_ = signal(false)
+  readonly saving = this.saving_.asReadonly()
+  readonly maxTags = 5
 
----
-
-## Phase 3: Template & Style Integration 
-
-**HTML:** Double quotes throughout. Semantic element choice. Verify every Lucide icon used is registered in `app.config.ts`.
-
-**SCSS:** Follow cssLayer skill rules — logical properties (`margin-inline`, `padding-block`), five-group vertical rhythm.
+  // 5. COMPUTED
+  readonly title = computed(() => this.recipe().name.trim())
 
-**Engine Check:** Scan component `.scss` for any `.c-*` class definitions → move to `src/styles.scss` if found.
+  // 6. METHODS in CRDUL order: Create, Read, Delete, Update, List — then UI handlers
+  addTag(tag: string) { /* C */ }
+  tagById(id: string) { /* R */ }
+  removeTag(id: string) { /* D */ }
+  rename(name: string) { /* U */ }
+  tags() { /* L */ }
+  toggleExpanded() { /* UI handlers (toggle, dismiss, next…) come after the five data groups, never between them */ }
+}
+```
 
----
-
-## Phase 4: Unit Test Strategy 
+Why CRDUL and not alphabetical: the verbs map to the data flow a reader is tracing, and grouping them makes a missing branch (a delete with no confirm, an update with no validation) visible at a glance.
 
-> **Only execute this phase during `commit-to-github` Phase 0 or on explicit user request.**
+## When you create a component
 
-**Spec Logic:** Define core testing requirements for the component's Signal-driven logic.
+- Four files: `.ts`, `.html`, `.scss`, `.spec.ts` (skip `.spec.ts` during iterative plan work — specs are written when the unit is finalized or on request, per `docs/agent/standards-angular.md`).
+- Register every Lucide icon the template uses in `app.config.ts` before using it — an unregistered icon renders nothing and fails silently.
+- Styles follow `cssLayer` (it activates on its own when you touch the `.scss`).
+- Hebrew strings go through `translatePipe` + `dictionary.json`; `dictionary.json` is append-only.
 
-**Signal Testing:** Ensure `.spec.ts` correctly triggers and asserts signal changes.
-
----
+## When you refactor an existing component
 
-## Completion Gate
+Reorder the existing members into the six sections in place; do not recreate files. Keep behaviour identical — a reorder commit should contain no logic change.
 
-Output: `"Component [Name] created with [X] signals and [Y] inputs. Lucide registry verified."`
+## Check before finishing
 
-Update `.claude/todo.md` and proceed to the next atomic task.
+Re-read the class top to bottom and confirm: sections appear in order 1–6 with nothing interleaved; CRDUL is contiguous with UI handlers after it; no `@Input`/`@Output`, `BehaviorSubject`, constructor injection or `any`; writable private signals end with `_` and are exposed read-only; nothing public carries the `_` suffix. Build is checked at `/ship`, not here.
```

</details>

### worktree-setup

`disable-model-invocation: true` (npm install + worktree creation are side effects; only `/worktree-setup` runs it); legacy `wt-parallel` migration collapsed into an 'old pattern' details block.

<details><summary>diff</summary>

```diff
--- old/worktree-setup/SKILL.md
+++ new/worktree-setup/SKILL.md
@@ -1,72 +1,42 @@
 ---
 name: worktree-setup
-description: One-time provisioning of the 3 permanent Planner-Worker slots (wt-1..3). Not automatic — invoke only when a slot is missing or being (re)initialized.
+description: One-time provisioning or repair of the three permanent Planner-Worker slots `../foodVibe1.0-wt-1..3` — git worktrees detached at origin/main with deps installed, `.worktree-root`/`.worktree-port` written and `server/.env` copied. Use only when the user says "setup worktree", "new worktree", "slot is missing" or a `wt-N` folder is absent. Taking a plan into an existing slot is `/take-plan`, not this.
+disable-model-invocation: true
 ---
 
-# Skill: worktree-setup
-**Model Guidance:** Use Haiku/Flash throughout — this is mechanical.
+# worktree-setup
 
-**Trigger:** User says "setup worktree" or "new worktree" (on-demand only).
+Three slots exist so up to three Workers can run in parallel without touching the main folder. A slot is *infrastructure*: created once, reused for every plan, never on a branch while idle. This skill creates or repairs that infrastructure and nothing else — it starts no servers (`scripts/take-plan.mjs` does that when a plan is taken).
 
-> **Not the take-plan flow.** Starting work on a plan is "execute plan NNN" / "take plan
-> NNN" (see `.claude/commands/take-plan.md`), which reuses an already-initialized slot.
-> This skill only creates the 3 permanent slots the first time, or repairs a missing one.
+## 1. Create missing slots
 
-## What this does
-
-Ensures `../foodVibe1.0-wt-1`, `../foodVibe1.0-wt-2` and `../foodVibe1.0-wt-3` exist as git
-worktrees, each detached at `origin/main`, each with its own `.worktree-root` /
-`.worktree-port`, dependencies installed, and `server/.env` copied. It starts no servers —
-`scripts/take-plan.mjs` does that when a plan is actually taken.
-
----
-
-## Phase 1 — Migrate the legacy parallel worktree (one-time)
-
-If `../foodVibe1.0-wt-parallel` exists:
-
-1. Remove the one known disposable artifact before the cleanliness check:
-   `../foodVibe1.0-wt-parallel/.claude/dev-server.log` (a log file the retired
-   `claim-parallel-slot.sh` wrote on every claim — not real work, safe to delete).
-2. `git -C ../foodVibe1.0-wt-parallel status --porcelain` — if anything remains, **stop and
-   report** the dirty/unpushed state to the Human; do not touch the worktree further.
-3. If clean: `git worktree move ../foodVibe1.0-wt-parallel ../foodVibe1.0-wt-1`.
-
-If `../foodVibe1.0-wt-parallel` does not exist, skip this phase.
-
----
-
-## Phase 2 — Create missing slots
-
-For each of `wt-1`, `wt-2`, `wt-3` whose directory does not already exist:
+For each of `wt-1`, `wt-2`, `wt-3` whose folder `../foodVibe1.0-wt-N` does not exist:
 
 ```bash
-git worktree add --detach ../foodVibe1.0-wt-<N> origin/main
+git worktree add --detach ../foodVibe1.0-wt-N origin/main
 ```
 
-Idle slots are always detached at `origin/main` — never on `main`, never on a branch.
-
----
-
-## Phase 3 — Provision each slot
+Detached at `origin/main`, never on `main` and never on a branch — an idle slot on a branch is how a stale branch gets accidental commits.
 
-For every slot directory (existing after Phase 1, or just created in Phase 2):
+## 2. Provision every slot (new or existing)
 
 1. `npm install` at the slot root and inside `server/`.
-2. Write `.worktree-root` (absolute path back to the main repo) and `.worktree-port` (the
-   slot's frontend port — `420N` for `wt-N`, matching the port map in `AGENTS.md`).
-3. Copy `server/.env` from the main repo into the slot's `server/.env` — silent skip if
-   missing. (This repo only has `server/.env`; there is no root `.env` to copy.)
-4. Start no servers — `take-plan.mjs` starts the backend and `ng serve -c slot` when a plan
-   is actually taken.
+2. Write `.worktree-root` = absolute path of the main repo, and `.worktree-port` = `420N` (the port map in `AGENTS.md`: `wt-1`=4201, `wt-2`=4202, `wt-3`=4203).
+3. Copy `server/.env` from the main repo into the slot (`server/.env` is the only env file; skip silently if missing — it is a secret and may be absent on purpose).
 
----
+## 3. Report
 
-## Completion Gate
+One line per slot, then the next step:
 
-Output one line per slot:
 ```
-wt-N: <created | migrated | already present> — deps installed, .env copied
+wt-1: created — deps installed, .env copied
+wt-2: already present — deps installed, .env copied
+wt-3: created — deps installed, .env copied
+3 slots ready. In a free slot, say "execute plan NNN" to start work.
 ```
 
-Then: `3 slots ready. In a free slot, say "execute plan NNN" to start work.`
+<details><summary>Old pattern: the single `wt-parallel` worktree (pre-2026-09)</summary>
+
+If `../foodVibe1.0-wt-parallel` still exists: delete its disposable `.claude/dev-server.log`, then `git -C ../foodVibe1.0-wt-parallel status --porcelain`. Dirty or unpushed → stop and report; clean → `git worktree move ../foodVibe1.0-wt-parallel ../foodVibe1.0-wt-1` before step 1.
+
+</details>
```

</details>

### brief-detection

BOM removed; `user-invocable: false` (Claude-only gate, hidden from `/`); description lists the H2 marker words so triggering no longer depends on body text. Body kept, tightened.

<details><summary>diff</summary>

```diff
--- old/brief-detection/SKILL.md
+++ new/brief-detection/SKILL.md
@@ -1,90 +1,59 @@
-﻿---
+---
 name: brief-detection
-description: Detects structured briefs in user messages and gates execution. Source-agnostic.
+description: Recognizes a pasted structured brief or Plan Contract in the user's message and gates execution — Plan Contracts route to the Planner protocol or save-plan, briefs get the a/b/c choice (refine / execute / discuss) before any tool call. Use whenever a message contains markdown H2 headers like `## Goal`, `## Scope`, `## Steps`, `## Rules`, `## Done when`, `## Milestones`, `## Atomic Sub-tasks`, or a `# Plan` title, from any source (human paste, Cursor, another agent).
+user-invocable: false
 ---
 
 # Brief Detection Gate
 
-**Skill:** brief-detection
-**Source-agnostic** — does not check who sent the brief.
-
-## Trigger
+Source-agnostic: it does not matter who sent the brief. The point of the gate is that a pasted plan is a *proposal* until the Human says otherwise; executing it on sight has cost whole sessions.
 
-### Plan Contract shape check (runs FIRST)
+## 1. Plan Contract shape check (always first)
 
-Before counting brief H2 markers, inspect the pasted text for Plan Contract shape.
-Treat it as a **Plan Contract** (not a brief) when any of these are true:
+Treat the text as a **Plan Contract** (not a brief) when any of these hold:
 
-- Contains `## Milestones` or `## Atomic Sub-tasks` (case-insensitive heading match)
-- H1 matches `# Plan …` or contains `Plan Contract`
+- it contains `## Milestones` or `## Atomic Sub-tasks` (case-insensitive)
+- its H1 matches `# Plan …` or contains `Plan Contract`
 
-On Plan Contract shape, check `git branch --show-current`:
+Then check `git branch --show-current`:
 
-- **On `main` (Planner):**
-  ```
-  Detected Plan Contract — routing to the Planner protocol
-  ```
-  Hand off to `.claude/commands/plan.md` **Planner protocol**, steps 1–6 (pull, todo sync,
-  overlap check, save-plan, commit, push) — not save-plan alone. The Planner never starts
-  execution itself; it ends on step 6's message.
-- **Inside a `wt-N` slot (Worker, mid-brief plan save):**
-  ```
-  Detected Plan Contract — routing to save-plan
-  ```
-  Hand off to `.claude/skills/save-plan/SKILL.md` **Phase 0** directly.
+- **On `main` (Planner):** say `Detected Plan Contract — routing to the Planner protocol` and hand off to `.claude/commands/plan.md` Planner protocol steps 1–6 (pull, todo sync, overlap check, save-plan, commit, push). The Planner never starts execution; it ends on step 6's message.
+- **Inside a `wt-N` slot (Worker, mid-brief save):** say `Detected Plan Contract — routing to save-plan` and hand off to `.claude/skills/save-plan/SKILL.md` Phase 0.
 
-Do **not** show the a/b/c brief gate. Do **not** write plan files here — save-plan does.
+No a/b/c gate for a Plan Contract, and no plan file written here — save-plan does that.
 
-### Brief H2 markers (only if Plan Contract shape did NOT match)
+## 2. Brief markers (only when it is not a Plan Contract)
 
-User's first message in a turn contains 3+ of these markdown H2 headers (case-insensitive):
+Count these H2 headers (case-insensitive) in the user's message:
 
-- `## Goal` or `## Objective`
-- `## Files to check first` or `## Scope` or `## Files`
-- `## Steps` or `## Implementation` or `## Tasks`
-- `## Rules` or `## Constraints` or `## Out of Scope`
-- `## Done when` or `## Success Criteria` or `## Acceptance`
+`## Goal`/`## Objective` · `## Files to check first`/`## Scope`/`## Files` · `## Steps`/`## Implementation`/`## Tasks` · `## Rules`/`## Constraints`/`## Out of Scope` · `## Done when`/`## Success Criteria`/`## Acceptance`
 
-### Threshold
+| Markers | Action |
+| --- | --- |
+| 3+ | show the gate below |
+| 2 | ambiguous — do not gate, just answer |
+| 0–1 | not a brief |
 
-| Markers found | Action |
-|---|---|
-| 3+ (and no Plan Contract shape) | Trigger brief a/b/c gate |
-| 2 | Ambiguous — do NOT auto-gate |
-| 0–1 | Not a brief — no action |
-
-## Gate Output (terse, no preamble)
+## 3. Gate output (terse, no preamble)
 
 ```
-Detected structured brief: {one-line goal extracted}.
+Detected structured brief: {one-line goal}.
 {N} steps · {M} rules · {K} done-when criteria
 
 How should I handle this?
 a. Refine first — discuss before any execution (default)
-b. Execute as-is — /feat (or /plan → Contractor one milestone → /review-it)
+b. Execute as-is — /feat (or /plan → one milestone → /review-it)
 c. Discussion only — no execution
 ```
 
-**Stop. Wait for user choice before any tool calls.**
-
-## Routing
-
-| Choice | Action |
-|---|---|
-| `a` | Discussion mode — do NOT auto-trigger `/plan` or Contractor execution |
-| `b` | Invoke `/feat` (or `/plan` with the brief). After Human approves the Plan Contract: Contractor executes **one milestone**, writes `/sessions/[date].md`, stops; then `/review-it`. Do **not** invoke retired `/plan-implementation` or `/execute-it`. |
-| `c` | Acknowledge, treat as documentation — no execution |
-
-**Default:** Anything other than a/b/c (e.g., "yes", "go", blank) → option `a` (Refine first).
-
-## Override
+Stop and wait. Anything other than an explicit `b` or `c` ("yes", "go", blank) means **a**.
 
-If Plan Contract shape also matches, still route to save-plan (shape check wins).
+| Choice | Then |
+| --- | --- |
+| a | discussion mode; do not trigger `/plan` or execution |
+| b | `/feat` (or `/plan` with the brief); after the Human approves the Plan Contract, execute **one milestone**, write the session file, stop, then `/review-it` |
+| c | acknowledge and treat as documentation |
 
-## What this skill does NOT do
+## Scope of this skill
 
-- Does not write or modify code
-- Does not write plan files under `plans/` (hands Plan Contracts to save-plan)
-- Does not consult second-brain (`docs/brain/`) or optional MCP memory tools
-- Does not invoke other agents (save-plan handoff is same-agent skill follow-through)
-- Does not pre-load standards files
+It writes no code and no plan files, reads no `docs/brain/`, pre-loads no standards, and invokes no other agent — the save-plan hand-off is the same agent continuing.
```

</details>

### auth-and-logging

Absorbs auth-crypto (0 uses) as a conditional section; `paths:` on the auth surface; checklist to tick; the vague 'pre-commit security grep + CI agent' replaced by the real command `node scripts/pre-commit-security-grep.mjs` as a validation loop.

<details><summary>diff</summary>

```diff
--- old/auth-and-logging/SKILL.md
+++ new/auth-and-logging/SKILL.md
@@ -1,62 +1,47 @@
-﻿---
-name: auth-and-logging
-description: Audits and hardens authentication guards, mutation entry points, and logging calls in compliance with project Security & QA standards.
----
-
-# Skill: auth-and-logging
-**Model Guidance:** Use Haiku/Flash for Phases 1 and 3. Use Sonnet for Phase 2 only.
-**Trigger:** Touching auth guards, interceptors, user services, HTTP CRUD, or any flow requiring protected access.
-
-**Security Rules (inline — no guide read required):**
-- Every new protected route → `canActivate: [authGuard]` — no exceptions
-- Every mutation handler (add, edit, delete buttons/modals/FABs) → `isLoggedIn()` check at entry point
-- Credentials → `sessionStorage` only — never `localStorage`
-- Sensitive data handling → use `auth-crypto.ts` and invoke `auth-crypto` skill
-- No PII in logs — only `user._id` permitted in audit trails
-- User-facing security warnings → `UserMsgService` only (e.g. `'sign_in_to_use'`)
-- pre-commit security grep + CI sign-off required before commit if this task touches the security surface
-
----
-
-## Phase 0 — docs/brain Orient (CONDITIONAL)
-
-If the task involves an unfamiliar area, an architectural choice, or known-recurring auth/security debt: read `docs/brain/index.md`, then only the relevant sub-file (`gotchas.md`, `decisions/`, `patterns/`, etc.). Default: skip for routine guard/logging work. Do not call optional MCP memory tools.
-
----
-
-## Phase 1: Surface Audit 
-
-**Entry Point Scan:** Identify all new routes in `app.routes.ts` and new mutation handlers (buttons, FABs, modals) that require protection.
-
-**Storage Check:** Verify all code touching `localStorage` or `sessionStorage` — credentials must use `sessionStorage` only.
-
-**Logging Scan:** List all new `LoggingService` calls and flag any that may include PII.
-
----
-
-## Phase 2: Security Implementation 
-
-**Guard Application:** Apply `canActivate: [authGuard]` to every new protected route in `app.routes.ts`.
-
-**Mutation Hardening:** Implement `isLoggedIn()` check at the entry point of all non-route mutation handlers — add, edit, delete buttons and modals.
-
-**Crypto / Logic:** If handling sensitive data → delegate to `auth-crypto.ts` and invoke the `auth-crypto` skill.
-
 ---
+name: auth-and-logging
+description: Security checklist for FoodVibe's auth and logging surface — route guards, `isLoggedIn()` at mutation entry points, sessionStorage-only credentials, no PII in logs, and the `auth-crypto.ts` hashing/token rules. Use when touching routes, guards, interceptors, user/auth services, HTTP CRUD, login/signup, tokens, hashing, `LoggingService` calls or anything that stores user data — and whenever the user mentions auth, login, permissions, security, logging or PII.
+paths:
+  - "src/app/app.routes.ts"
+  - "src/app/core/guards/**"
+  - "src/app/core/interceptors/**"
+  - "src/app/core/services/user*.ts"
+  - "src/app/core/services/logging*.ts"
+  - "src/app/core/auth-crypto.ts"
+  - "server/routes/auth.js"
+  - "server/middleware/**"
+---
+
+# auth-and-logging
+
+The full standard is `docs/agent/standards-security.md` (read it for anything not covered here). This skill is the working checklist for the surface you are editing right now, plus the one command that proves you didn't leak anything.
+
+## Checklist — copy into your reply and tick as you go
+
+```
+Auth & logging:
+- [ ] Every new/changed protected route in app.routes.ts has canActivate: [authGuard]
+- [ ] Every non-route mutation entry (add/edit/delete button, modal, FAB) calls userService.isLoggedIn() first
+- [ ] Session data only in sessionStorage (key loggedInUser); nothing auth-related in localStorage
+- [ ] LoggingService calls carry { event, message, context? } and no password/hash/token/name/email — user._id only
+- [ ] User-facing security messages go through UserMsgService (e.g. 'sign_in_to_use'), never alert/console
+- [ ] [innerHTML] absent, or sanitized with a documented reason
+- [ ] node scripts/pre-commit-security-grep.mjs exits 0
+```
+
+Why the entry-point check: a guard protects navigation, not a button the user can reach from an unguarded page. The `isLoggedIn()` call at the handler is what stops a logged-out mutation.
+
+## Crypto (only when `src/app/core/auth-crypto.ts` is in scope)
+
+- Hashing PBKDF2 (100k iterations, SHA-256, random 16-byte salt); encryption AES-256. Raw SHA-256 is legacy read-only — never for new users.
+- Salts and IVs are generated at runtime per call, never hardcoded, never logged — including in specs.
+- Crypto failures return one generic message; distinguishing "bad padding" from "bad key" is what timing/padding attacks read.
+- Any new crypto dependency is typed, in `package.json`, and named in the PR.
+
+## Verify
+
+```bash
+node scripts/pre-commit-security-grep.mjs
+```
 
-## Phase 3: Logging & Privacy Audit 
-
-**PII Scrub:** Scan all new `LoggingService` calls — ensure NO PII (emails, names, passwords, tokens) is logged.
-
-**Identity Check:** Only `user._id` is permitted in audit trails — flag anything else.
-
-**Feedback Logic:** Verify all user-facing security warnings route through `UserMsgService`.
-
----
-
-## Completion Gate
-
-**pre-commit security grep + CI Trigger:** If this task touches the security surface (auth files, `localStorage`/`sessionStorage`, `[innerHTML]`, new routes) → invoke pre-commit security grep + CI agent for final audit before committing. No exceptions.
-
-Output: `"Auth/Logging hardened. [X] mutation handlers protected, PII audit passed."`
-
+Fix every hit and re-run until it exits 0. This grep is also the pre-commit hook, so a hit here is a hit at `/ship`.
```

</details>

### breadcrumbs

NEW — merges `update-docs` (1 use) + `breadcrumb-navigator` (0 uses). The seam/stale/stray checks are `scripts/breadcrumbs-check.mjs`; the skill only writes. Running it today already finds 12 stale entries in the existing maps.

<details><summary>diff</summary>

```diff
--- old/breadcrumbs/SKILL.md
+++ new/breadcrumbs/SKILL.md
@@ -0,0 +1,46 @@
+---
+name: breadcrumbs
+description: Creates and refreshes the `breadcrumbs.md` navigation maps that live at FoodVibe's major seams (`src/app/core/`, `core/services`, `core/models`, `core/components`, `shared/`, `pages/`), pruning stale entries and stray files. Use after adding a `pages/<x>/` or any top-level subtree, after moving or deleting files, before a PR that reshaped folders, from `/docs-refresh`, or when the user says "update docs", "breadcrumbs", "refresh the maps" or asks what a directory contains.
+allowed-tools: Bash(node scripts/breadcrumbs-check.mjs *)
+---
+
+# breadcrumbs
+
+A `breadcrumbs.md` is a 30-second orientation for a folder: what each sub-folder and primary file is for. They exist only at the six seams — a map in every leaf folder is noise that rots faster than it helps.
+
+## 1. Check (script)
+
+```bash
+node scripts/breadcrumbs-check.mjs
+```
+
+For each seam it prints `OK`/`MISSING`, every `stale entry` (a path the file mentions that no longer exists) and every `not mentioned` child, plus any `STRAY` breadcrumb outside a seam. Exit 0 means nothing to do — say so and stop.
+
+## 2. Fix what it found
+
+- `MISSING` → create the file (format below).
+- `stale entry` → remove or correct the line.
+- `not mentioned` → add a line, *if* the item earns one: a sub-folder, a `.service.ts` / `.model.ts` / `.component.ts`, a guard, a pipe. Specs and index files don't.
+- `STRAY` → delete it.
+
+For each line you write, read the file's header or class name so the description says what it *does*, not what it is called (`recipe.service.ts — CRUD + ledger math for recipes` beats `recipe service`).
+
+## Format
+
+```markdown
+# <seam path> — breadcrumbs
+
+| Entry | Purpose |
+| --- | --- |
+| `services/` | Root-provided singletons; see `services/breadcrumbs.md` |
+| `recipe.service.ts` | CRUD + ingredient-ledger math for recipes |
+
+## Key exports
+`RecipeService`, `Recipe`, `authGuard`
+```
+
+Keep it a table; keep every path in backticks (the checker reads them).
+
+## 3. Verify and finish
+
+Re-run the script until it prints `BREADCRUMBS: clean`, then report `Breadcrumbs refreshed at <seams touched>` (or `clean, nothing changed`).
```

</details>
