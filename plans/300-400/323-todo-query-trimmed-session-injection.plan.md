# Plan 323 — Todo Query Script and Trimmed Session Injection

## Goal

Stop reading `.claude/todo.md` and the full session-state file into context. Add a `todo-query` script and a trimmed SessionStart injection.

## Files to check first

- `scripts/session-startup.sh` (line 105: `CONTENT=$(cat "$SESSION_STATE")`)
- `scripts/todo-archive.mjs` (parser functions at lines 93–195: `isTodoFooterLine`, `splitPlanSections`, `isDeferredBlocked`, `checkboxStats`, `isFullyDone`, `findArchiveCandidates`)
- `scripts/plan-ledger-check.mjs` (`collectTodoPlanRefs`, line 87)
- `.claude/todo.md` (format: `## group` headers, `### Plan NNN — Title (plans/…plan.md)` sections, nested `- [ ]` items)
- `.claude/commands/auto-solve.md` (Phase 0, lines 14–20)
- `.claude/commands/sweep-stale-todos.md` (Steps 1–3)
- `.claude/commands/done.md` (line 14)
- `.claude/commands/ship.md` ("On approval" step 1, line 182)
- `.claude/skills/save-plan/SKILL.md` (Phase 1 Ledger Sync, lines 76–96)

Verified against live repo on 2026-09-30: all line numbers above match current state exactly. `scripts/todo-query.mjs` and `scripts/lib/` do not exist yet.

## Atomic Sub-tasks

- [x] 1. Move parser functions out of `todo-archive.mjs` into new `scripts/lib/todo-parse.mjs` as named exports (`isTodoFooterLine`, `splitPlanSections`, `isDeferredBlocked`, `checkboxStats`, `isFullyDone`, `findArchiveCandidates`). Import them back into `todo-archive.mjs`. Capture `node scripts/todo-archive.mjs --dry-run` output before and after — must be byte-identical.
- [x] 2. Create `scripts/todo-query.mjs` (Node ESM, no new deps, same code style as `todo-archive.mjs`) with subcommands: `next` (first `### Plan` section with ≥1 `[ ]` item: heading, plan path, open items with line numbers), `open [--plan NNN]` (open items, all or one plan, with line numbers), `sweep` (lists all-`[x]` sections excluding deferred per `isDeferredBlocked`; for each runs `git log --oneline -i --grep=<plan number>` and, if `gh` available, `gh pr list --state merged --search <plan number>`; marks verified/unverifiable), `mark --line N[,N…]` (flips `[ ]` → `[x]` only on lines currently containing `[ ]`; refuses whole call if any line doesn't match; prints changed lines), `append --from <file>` (appends a prepared `### Plan` section before todo.md footers, reusing `isTodoFooterLine`). All read subcommands support `--json`. Exit code 1 with clear message when file missing or no sections parse — never print empty success.
- [x] 3. Trim `scripts/session-startup.sh` line 105: replace full `cat` with extraction of `## Session Summary`, `## Next Steps`, `## Commit` sections, capped at 1,500 characters (first 1,500 chars if none of those headings exist). Append line `Full file: $SESSION_STATE — read only if needed.` Leave `SESSION SAVE TARGET` text and parallel-slot logic (lines 18–80) untouched.
- [x] 4. Rewire consumers: `auto-solve.md` Phase 0 steps 1–3 → `node scripts/todo-query.mjs next`; `sweep-stale-todos.md` Steps 1–3 → `node scripts/todo-query.mjs sweep` (keep Step 4 human gate); `done.md` line 14 and `ship.md` "On approval" step 1 → use `todo-query open` to find matches and `todo-query mark` to tick them; `save-plan` Phase 1 Ledger Sync → `todo-query open` for State Verification and `todo-query append` for the new section. Every changed file gets the line "Do not Read .claude/todo.md in full."
- [x] 5. Add `"todo": "node scripts/todo-query.mjs"` to `package.json` scripts.

**Human-validated 2026-09-30.**

## Rules

- Do not change `todo.md` format or content except through `mark`/`append`.
- `ship.md`: touch ONLY "On approval" step 1 — a separate later plan (Brief B1) owns the rest of that file.
- Do not edit `claim-parallel-slot.sh`, `session-lock.sh`, `session-manifest-*.py` (Planner-Worker rework, out of scope).
- One parser only — `todo-archive.mjs`, `todo-query.mjs`, `plan-ledger-check.mjs` all import from `scripts/lib/todo-parse.mjs`, never copy.
- Scripts are `.mjs`, not bash — must run identically in PowerShell and Git Bash.

## Verify / Done when

- `node scripts/todo-query.mjs next` prints the current first open plan in under 30 lines.
- `node scripts/todo-archive.mjs --dry-run` output is byte-identical before and after the refactor.
- `todo-query mark` on a line without `[ ]` exits 1 and changes nothing.
- A new Claude Code session shows only Summary, Next Steps and Commit from the session-state file, plus the path line.
- `/auto-solve` in a fresh session reaches Phase 1 without a Read of `.claude/todo.md` in the tool log.

## Sequence note

This is the first of a 3-part sequence: this plan → Brief B1 (ship-prep/write-session-state scripts) → Brief B2 (ship.md file split). Each part is a separate plan, executed and Human-validated in order before the next starts.
