# Plan 291 — Plan Persistence & Brief Sync Hardening

## Goal

Close the gaps that let a big plan get executed brief-by-brief without ever being
persisted under `plans/`, and make plan↔ledger state self-verifying instead of
trust-based, for both Claude Code and Cursor.

## Author / role

Architect pass (Claude Code, Human-directed override). Contractor = Cursor.
Executes **one milestone at a time**, writes `sessions/[date].md` after each, stops
for `/review-it`.

## Problem statement (evidence)

1. **Ghost plan 285** — `.claude/todo.md` (Plan 285 section, "AI Menu Phase 1") lists
   ~22 completed Atomic Sub-tasks referencing `plans/285-ai-menu-phase1.plan.md`.
   That file does not exist anywhere under `plans/`. The big plan was executed
   brief-by-brief and never persisted — the exact failure mode this plan closes.
2. **Convention fork** — `.claude/commands/plan.md`, `feat.md`, `review-it.md`
   describe a "new convention" `plans/[feature]_v[N].md`. The save-plan skill,
   `scripts/plan-write-guard.sh`, and `scripts/plan-name-similarity.mjs` only
   recognize `plans/NNN-slug.plan.md` (`*.plan.md` suffix, numeric prefix). No file
   on disk uses `_v[N]`. A plan saved under that form would bypass the write-guard
   hook and the similarity check entirely.
3. **brief-detection swallows Plan Contracts** — a pasted big plan (Milestones,
   Atomic Sub-tasks, Goal/Steps/Done-when headers) matches the same 3+ H2-marker
   threshold that triggers `.claude/skills/brief-detection/SKILL.md`. Its option
   `b` routes straight to `/feat` execution — never mentions save-plan — which is
   the most likely mechanism behind failure #1.
4. **`/brief` accepts a dangling parent plan** — it records a `## Parent plan` path
   but never verifies the file exists before proceeding.
5. **Duplicate plan numbers on disk today**: 234, 239, 241, 247, 248, 250, 259, 268
   each have two files. The 60-second same-second collision guard in save-plan
   Phase 1 does not cover parallel sessions/worktrees allocating `NNN` minutes
   apart from different `git` states.
6. **No ledger integrity check** — nothing verifies that plan paths referenced in
   `.claude/todo.md` / session briefs actually resolve on disk. A cheap script
   would have caught #1 immediately instead of it going unnoticed for months.
7. **Cursor enforcement is advisory-only** — `plan-write-guard.sh` is a Claude Code
   `PreToolUse` hook; Cursor has no hook runtime, only the `.mdc` rule text
   (`save-plan-must-use-skill.mdc`). The shared `.husky/pre-commit` hooks
   (`pre-commit-no-semi.mjs`, `pre-commit-secret-scan.mjs`,
   `pre-commit-security-grep.mjs`) are the only hard gate that runs regardless of
   which agent/editor made the change — and none of them touch plan/ledger state.

## Non-goals / out of scope

- Not rewriting the save-plan skill's Phase 0–4 logic (it is sound); this plan
  wires missing enforcement points into it.
- Not migrating existing duplicate-numbered plans (234/239/241/247/248/250/259/268)
  — flag them in M1's report, leave renumbering as a follow-up decision for the
  Human (renumbering touches `.claude/todo.md` history and is not safe to automate
  blind).
- Not touching auth, storage, or crypto — this is tooling/process only. No
  security-surface note required per `save-plan` Phase 2 risk audit.

## Milestones

Each milestone: Contractor executes it alone, runs its Verify command, writes
`sessions/[date].md`, stops for `/review-it`. Do not start milestone N+1 before
N is reviewed.

---

### Milestone 1 — Ledger integrity checker

**Files:**
- `scripts/plan-ledger-check.mjs` (new)

**Atomic Sub-tasks:**
- [x] `scripts/plan-ledger-check.mjs` — parse `.claude/todo.md`; for every
      `plans/....plan.md` path referenced under a `### Plan NNN — ...` heading,
      verify the file exists under `plans/` (recursive, including `plans/1-100/`)
- [x] Same script — parse every `.claude/sessions/*/brief.md` `## Parent plan`
      line (skip `none (ad-hoc)`); verify the referenced file exists
- [x] Same script — scan `plans/**/*.plan.md` filenames; report any numeric
      prefix `NNN` used by 2+ files (duplicate-number report, non-blocking)
- [x] Same script — report any `plans/*.plan.md` file whose name does not match
      `NNN-slug.plan.md` or `NNN-R-slug.plan.md` (unnumbered/legacy strays,
      non-blocking)
- [x] Exit code: **1** if any referenced plan path is missing (hard failure);
      **0** with warnings printed for duplicate-number / stray-name findings
      (advisory only, matches `plan-name-similarity.mjs`'s advisory pattern)
- [x] `--json` flag for machine-readable output (mirror
      `plan-name-similarity.mjs` CLI conventions: `--json`, plain args, no deps
      beyond `fs`/`path`)

**Verify:** `node scripts/plan-ledger-check.mjs` — run against current repo state;
must report the Plan 285 ghost as a hard failure (proves the checker works)
before M6 fixes it.

---

### Milestone 2 — Wire ledger check into enforcement

**Files:**
- `.husky/pre-commit`
- `.claude/commands/ship.md`

**Atomic Sub-tasks:**
- [x] `.husky/pre-commit` — add `node scripts/plan-ledger-check.mjs` after the
      existing three `pre-commit-*.mjs` calls (runs for both Claude Code and
      Cursor commits — this is the cross-agent hard gate)
- [x] `.claude/commands/ship.md` Phase 1 (Build gate) — add a line: run
      `node scripts/plan-ledger-check.mjs`; hard failure blocks commit same as
      `ng build` (append to the existing unconditional-stop language, do not
      create a new phase)

**Verify:** Stage a commit that references a nonexistent plan path in
`.claude/todo.md` (temp test edit, then revert) → confirm `git commit` is
blocked by the hook; then confirm a clean state commits normally.

---

### Milestone 3 — Fix the `_v[N]` convention fork

**Files:**
- `.claude/commands/plan.md`
- `.claude/commands/feat.md`

**Atomic Sub-tasks:**
- [x] `.claude/commands/plan.md` — replace both `/plans/[feature]_v[N].md`
      references (Invokes section + Typical flow step 3) with
      `plans/NNN-slug.plan.md`; delete the trailing "Legacy `plans/NNN-name.plan.md`
      files coexist; new work uses `[feature]_v[N].md`" note (inverted — the
      numbered form *is* the live convention, tooling only supports it)
- [x] `.claude/commands/feat.md` — replace `/plans/[feature]_v[N].md` reference
      (Invokes section) with `plans/NNN-slug.plan.md`
- [x] Grep repo for any other `_v[N]` / `_v{N}` plan-path references
      (`docs/agent/`, `.cursor/`) and align them to the numbered convention

**Verify:** `grep -rn "_v\[N\]\|_v{N}" .claude/commands docs/agent .cursor` returns
no plan-path hits.

---

### Milestone 4 — brief-detection routes Plan Contracts to save-plan first

**Files:**
- `.claude/skills/brief-detection/SKILL.md`

**Atomic Sub-tasks:**
- [x] Add a **Plan Contract shape check** ahead of the existing H2-marker
      threshold: if the pasted text also contains `## Milestones` or
      `## Atomic Sub-tasks` (or a `# Plan` / `Plan Contract` H1), treat it as a
      Plan Contract, not a brief
- [x] On Plan Contract shape detected → do not show the a/b/c gate; instead state
      "Detected Plan Contract — routing to save-plan" and hand off to
      `.claude/skills/save-plan/SKILL.md` Phase 0 directly
- [x] Keep existing brief-only routing (a/b/c) unchanged for genuine briefs
      (3+ markers, no Milestones/Atomic-Sub-tasks section)
- [x] Update the skill's "What this skill does NOT do" list if it now touches
      save-plan handoff (still does not write plan files itself — save-plan does)

**Verify:** Paste a synthetic Plan Contract (Goal + Milestones + Atomic Sub-tasks
headers) in a test turn → confirm it routes to save-plan Phase 0, not the a/b/c
gate. Paste a genuine 3-marker brief (no Milestones section) → confirm normal
a/b/c gate still fires.

---

### Milestone 5 — `/brief` stops on a dangling parent plan

**Files:**
- `.claude/commands/brief.md`

**Atomic Sub-tasks:**
- [x] Step 2a (Proactive mode) — after identifying the `## Parent plan` path,
      verify the file exists on disk before writing `brief.md`; if it does not
      exist → STOP, tell the Human the named plan is missing, offer:
      "run save-plan now | proceed ad-hoc (parent plan: none) | cancel"
- [x] Step 2b (Retroactive mode) — same check when a parent plan is inferred from
      `.claude/todo.md` context

**Verify:** Manually invoke `/brief` naming a nonexistent `plans/999-fake.plan.md`
→ confirm it stops and offers the three choices instead of writing the brief.

---

### Milestone 6 — Cross-worktree NNN allocation hardening

**Files:**
- `.claude/skills/save-plan/SKILL.md`

**Atomic Sub-tasks:**
- [x] Phase 1 Numbering — add: before finalizing `NNN`, also run
      `git ls-tree -r origin/main --name-only -- plans/` (fetch not required if
      already fresh) and take the higher of (local max + 1) vs (origin/main max + 1)
      — extends the existing "Worktree: also check main repo `plans/`" rule to
      cover branches that haven't fetched recent origin/main plan additions
- [x] Document the failure mode this closes (parallel Cursor/Claude Code sessions
      on different branches both computing `NNN` from stale local state) as a
      one-line comment in the skill file, not a separate doc

**Verify:** No code to run — skill file is instructions only. `/review-it` checks
the added rule reads correctly and doesn't contradict existing Phase 1 language.

---

### Milestone 7 — Backfill ghost Plan 285

**Files:**
- `plans/285-ai-menu-phase1.plan.md` (new — reconstructed)

**Atomic Sub-tasks:**
- [x] Reconstruct `plans/285-ai-menu-phase1.plan.md` from the existing
      `.claude/todo.md` "Plan 285 — AI Menu Phase 1" section (22 sub-tasks, all
      already `[x]`) — use the standard Plan Contract shape (`# Plan 285 — AI Menu
      Phase 1`, `## Goal`, `## Atomic Sub-tasks` with the same items, all `[x]`)
- [x] Add a one-line provenance note under the H1: reconstructed on 2026-07-20
      from `.claude/todo.md` history; original plan was never persisted (this
      plan, M7)
- [x] Run `node scripts/plan-ledger-check.mjs` — confirm the Plan 285 hard
      failure from M1's baseline run is now resolved

**Verify:** `node scripts/plan-ledger-check.mjs` exits 0 (or only advisory
warnings for the pre-existing duplicate NNNs / strays, which are explicitly out
of scope for this plan).

---

## Done when

- [x] `node scripts/plan-ledger-check.mjs` exits 0 against current repo state
      (Plan 285 resolved; duplicate/stray findings are advisory-only, expected)
- [x] Pre-commit hook blocks a commit that introduces a dangling plan reference
      (M2 verify reproduced)
- [x] No `_v[N]` plan-path convention referenced anywhere in `.claude/commands`,
      `docs/agent`, or `.cursor`
- [x] A synthetic Plan Contract paste routes to save-plan, not the brief a/b/c gate
- [x] `ng build` passes (unchanged — this plan touches no Angular code)

## Risk notes

Low risk — no product code, no auth/storage/crypto surface. Highest-impact file
is `.husky/pre-commit` (M2): a bug in `plan-ledger-check.mjs` could block
unrelated commits. Mitigate: M1 Verify step runs the script standalone against
real repo state before M2 wires it into the hook.
