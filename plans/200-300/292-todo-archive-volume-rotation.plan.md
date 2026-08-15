# Plan 292 — Todo Archive Volume Rotation

## Goal

Keep `.claude/todo.md` small and open-work-only: when a plan section is fully
`[x]`, move it into numbered archive volumes (max 300 lines each). Slim the Plan
Index to non-Done rows. Teach duplicate/similarity checks to read the last two
archive volumes so agents do not recreate finished work.

## Author / role

Architect pass (Cursor plan mode + Human). Contractor = Cursor.
Executes **one milestone at a time**, writes `sessions/[date].md` after each, stops
for review / Human validation.

## Problem statement

1. `.claude/todo.md` (~681 lines) mixes open work with ~12 fully-done plan sections
   (~346 lines of dead weight).
2. `.claude/todo-archive.md` (~1992 lines) is a single dump — agents cannot afford
   to read it for duplicate checks.
3. Ship / done / sweep already say “archive fully-complete sections,” but all append
   to that one file — no volume rotation, no line cap.
4. `scripts/plan-name-similarity.mjs` only scans `plans/**/*.plan.md`, never the
   ledger archive titles.
5. The bottom Plan Index (~292 lines, 82 Done rows) keeps `todo.md` huge even after
   checkbox sections are archived.

## Non-goals / out of scope

- Not renumbering historical plan files under `plans/`.
- Not changing job-validation rules (Human still validates before `[x]`).
- Not archiving partial sections (any open `[ ]` stays in `todo.md`).
- Not auto-archiving sections that contain `(deferred)`, `(skipped)`, or `[~]`.

## Decisions (locked)

- Archive path: `.claude/todo-archive/NNN.md` (zero-padded), max **300 lines** per
  file; roll to `NNN+1` when an append would exceed the cap.
- Trigger: when a plan section is all-`[x]` (after Human-validated marks), via
  `node scripts/todo-archive.mjs` from ship / done / sweep / explicit run.
- Plan Index: **slim** — `todo.md` keeps Active / Planned / Partial only; Done rows
  move to `.claude/todo-archive/INDEX.md`.
- Similarity: `plan-name-similarity.mjs` also token-matches headings in the **last
  two** archive volume files (not the full history).
- One-time migrate: split legacy `todo-archive.md` into volumes + move current
  all-`[x]` sections out of `todo.md`; leave a stub pointer at the old path.

## Milestones

### Milestone 1 — Archive script + volume rotation

**Files:**
- `scripts/todo-archive.mjs` (new)
- `.claude/todo-archive/README.md` (new)

**Atomic Sub-tasks:**
- [x] `scripts/todo-archive.mjs` — parse `### Plan …` sections from `.claude/todo.md`
- [x] Same — select all-`[x]` sections; skip `(deferred)` / `(skipped)` / `[~]`
- [x] Same — append to latest `.claude/todo-archive/NNN.md`; create next NNN if
      append would exceed 300 lines
- [x] Same — `--migrate` splits legacy `.claude/todo-archive.md` into volumes
- [x] Same — `--dry-run` prints moves without writing; exit 0 when nothing to do
- [x] `.claude/todo-archive/README.md` — naming, 300-line cap, agent read rule
      (last 2 volumes only)

**Verify:** `node scripts/todo-archive.mjs --dry-run` lists current all-`[x]`
candidates; `--migrate --dry-run` reports how many volumes the legacy file would
produce.

---

### Milestone 2 — Wire commands + similarity last-2

**Files:**
- `.claude/commands/ship.md`
- `.claude/commands/done.md`
- `.claude/commands/sweep-stale-todos.md`
- `.claude/commands/auto-solve.md`
- `scripts/plan-name-similarity.mjs`
- `docs/agent/job-validation.md` (archive path note)

**Atomic Sub-tasks:**
- [x] Replace single-file `todo-archive.md` append instructions with
      `node scripts/todo-archive.mjs` in ship / done / sweep / auto-solve
- [x] `plan-name-similarity.mjs` — after plans/ scan, also score titles from the
      last two `.claude/todo-archive/NNN.md` volumes
- [x] `job-validation.md` — document volume archive + slim index rule

**Verify:** `node scripts/plan-name-similarity.mjs --name="AI Phase 2 Products"`
surfaces an archive hit when that title exists in a recent volume (after M3
migrate) or reports cleanly when volumes empty.

---

### Milestone 3 — Migrate + slim todo.md

**Files:**
- `.claude/todo.md`
- `.claude/todo-archive.md` (stub)
- `.claude/todo-archive/*.md` (volumes + INDEX.md)
- `AGENTS.md` (one-line pointer if needed)

**Atomic Sub-tasks:**
- [x] Run `node scripts/todo-archive.mjs --migrate` then default archive pass
- [x] Slim Plan Index: keep non-Done rows in `todo.md`; write Done rows to
      `.claude/todo-archive/INDEX.md`
- [x] Replace `.claude/todo-archive.md` with a short stub linking to
      `todo-archive/README.md` + latest volume
- [x] Confirm `.claude/todo.md` is open-work-only (no all-`[x]` plan sections left
      except deferred exceptions)

**Verify:** `todo.md` line count well under prior 681; each volume ≤ 300 lines;
  stub + README present.

## Atomic Sub-tasks (ledger)

- [x] M1 `scripts/todo-archive.mjs` + `.claude/todo-archive/README.md`
- [x] M2 Wire ship/done/sweep/auto-solve + similarity last-2 + job-validation note
- [x] M3 Migrate legacy archive, slim Plan Index, stub old path
