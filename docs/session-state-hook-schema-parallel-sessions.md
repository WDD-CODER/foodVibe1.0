# Session State — 2026-04-15 — Hook Schema Fix + Parallel Session Safety

**Branch:** `fix/hook-schema-parallel-sessions`
**Latest commit on main:** `250552b`
**Build status:** passing (warnings only — pre-existing)

---

## Session Summary

### Fix 1: Context-monitor and pre-compact hooks never fired (silent schema failure)
- **Root cause:** Both hook scripts wrapped `additionalContext` inside a `"decision"` object inside `hookSpecificOutput`. Claude Code schema validation rejected this silently every time. The PostToolUse counter was at 821 — zero warnings ever delivered in the project's history.
- **Fix:**
  - `scripts/context-monitor.sh` — removed `"decision"` wrapper; `additionalContext` now sits flat inside `hookSpecificOutput` (correct PostToolUse schema)
  - `scripts/pre-compact-reminder.sh` — PreCompact has no `hookSpecificOutput` spec; switched to top-level `"systemMessage"`
- **Evidence:** Hook fired correctly immediately after fix — this session hit 70% and the hard-stop message injected. Pre-compact hook also confirmed working (fired during `/compact` between sessions).

### Fix 2: Parallel sessions on `main` overwrite each other's session-state
- **Root cause:** `session-startup.sh` keyed state files by branch only (`docs/session-state-<branch>.md`). Two Claude Code windows on the same branch clobbered each other.
- **Fix (Option B — PPID-keyed files):**
  - `session-startup.sh` derives `SAVE_PATH=docs/session-state-<branch>-<PPID>.md` and writes it to `.claude/.session-state-path`
  - On startup: loads the most recently modified `docs/session-state-<branch>-*.md`
  - Injects `SESSION SAVE TARGET:` line into startup context so Claude knows where to write
  - Auto-cleanup: removes PPID-keyed files older than 7 days
  - `CLAUDE.md` Session Management section updated to explain the new convention

---

## Uncommitted Changes (this branch)

- `scripts/context-monitor.sh` — PostToolUse schema fix (DONE)
- `scripts/pre-compact-reminder.sh` — PreCompact schema fix (`systemMessage`) (DONE)
- `scripts/session-startup.sh` — PPID-keyed parallel session safety (DONE)
- `CLAUDE.md` — Session Management section updated (DONE)
- `docs/session-state-hook-schema-parallel-sessions.md` — this file (NEW, untracked)

---

## Next Steps

1. **Fix `handoff-check.sh`** — read `.claude/.session-state-path` for PPID-keyed path
   - Current code (lines 15-25): checks `SESSION_STATE_PATH` env var, then falls back to `docs/session-state-${BRANCH}.md`, then `docs/session-state.md`
   - Needed: add a middle step — if `.claude/.session-state-path` exists, read it and use that path
   - Insert after line 14 (env var check), before line 18 (BRANCH detection):
     ```bash
     elif [ -f ".claude/.session-state-path" ]; then
       SESSION_STATE=$(cat ".claude/.session-state-path")
     ```
   - Full new block should be:
     ```bash
     if [ -n "$SESSION_STATE_PATH" ]; then
       SESSION_STATE="$SESSION_STATE_PATH"
     elif [ -f ".claude/.session-state-path" ]; then
       SESSION_STATE=$(cat ".claude/.session-state-path")
     else
       BRANCH=$(git branch --show-current 2>/dev/null | sed 's/[^a-zA-Z0-9]/-/g')
       BRANCH_FILE="docs/session-state-${BRANCH}.md"
       if [ -n "$BRANCH" ] && [ -f "$BRANCH_FILE" ]; then
         SESSION_STATE="$BRANCH_FILE"
       else
         SESSION_STATE="docs/session-state.md"
       fi
     fi
     ```
2. **Commit** all 5 files on this branch (4 modified + 1 new session-state file)
3. **PR → merge to main**
4. **Resume main session work** (Plan 268 audit + prior uncommitted recipe-builder fixes)

---

## References

- `scripts/context-monitor.sh` — PostToolUse hook, 40/60/70% thresholds
- `scripts/pre-compact-reminder.sh` — PreCompact hook
- `scripts/session-startup.sh` — SessionStart hook, PPID-keyed state files
- `scripts/handoff-check.sh` — Stop hook (needs PPID-key update — NOT YET DONE)
- `.claude/.session-state-path` — written by startup, contains this session's save target
- `CLAUDE.md` — Session Management section
