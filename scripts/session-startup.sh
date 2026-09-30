#!/usr/bin/env bash
# session-startup.sh — SessionStart hook
# Automatically loads the previous session's state into context,
# so the AI picks up exactly where it left off.
#
# Branch-canonical save target (Plan 295):
#   - SAVE_PATH = docs/session-state-${BRANCH}.md (no PPID — safe to commit on /ship)
#   - .claude/.session-state-path is local-only (gitignored) so SessionStart never dirties git
#   - Override both with SESSION_STATE_PATH for rare parallel-window cases
#   - Falls back to docs/session-state.md if no branch file exists
#
# Hook type: SessionStart (matcher: "startup")
# Timeout: 10s

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/session-lock.sh"

# --- Two-slot parallel session detection (Plan: two-slot-parallel-sessions) ---
CURRENT="$(git rev-parse --show-toplevel 2>/dev/null)"
OTHER=""
if [ -f "$CURRENT/.claude/.parallel-slot-b" ]; then
  OTHER="$(cat "$CURRENT/.claude/.parallel-slot-b")"
elif [ -f "$CURRENT/.claude/.parallel-slot-a" ]; then
  OTHER="$(cat "$CURRENT/.claude/.parallel-slot-a")"
fi

if [ -n "$OTHER" ]; then
  if lock_is_fresh "$CURRENT"; then
    # Collision: another live session already owns this directory.
    if lock_is_fresh "$OTHER"; then
      cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "decision": {
      "additionalContext": "PARALLEL-SLOT: Both parallel slots are currently busy ($CURRENT and $OTHER each have a live session). Do not auto-provision a third worktree - ask the human how to proceed (wait, work read-only, or manually run the worktree-setup skill for a temporary third worktree)."
    }
  }
}
EOF
      exit 0
    fi

    CLAIM_OUTPUT="$("$SCRIPT_DIR/claim-parallel-slot.sh" "$OTHER" 2>&1)"
    CLAIM_STATUS=$?
    if [ "$CLAIM_STATUS" -ne 0 ]; then
      cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "decision": {
      "additionalContext": "PARALLEL-SLOT: This directory ($CURRENT) is busy with another live session, and the other slot ($OTHER) could not be auto-refreshed ($CLAIM_OUTPUT). Ask the human how to proceed rather than working here or forcing a refresh."
    }
  }
}
EOF
      exit 0
    fi

    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "decision": {
      "additionalContext": "PARALLEL-SLOT: This directory ($CURRENT) is busy with another live session. This session must work exclusively under $OTHER for its remaining work - cd there for every Bash command and use absolute paths under it for Edit/Write, never touch $CURRENT. It has just been fast-forwarded to latest main ($CLAIM_OUTPUT). Tell the user at the start of your first reply that you switched to the second parallel worktree and why."
    }
  }
}
EOF
    exit 0
  fi

  claim_lock "$CURRENT"
fi
# --- end two-slot parallel session detection ---

# Resolved once, the same way for session-startup.sh, handoff-check.sh and
# write-session-state.mjs — see scripts/session-state-path.mjs.
RESOLVED=$(node "$SCRIPT_DIR/session-state-path.mjs" 2>/dev/null)

if [ "$RESOLVED" = "NONE" ]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "decision": {
      "additionalContext": "IDLE SLOT: ask Dandan which plan to execute."
    }
  }
}
EOF
  exit 0
fi

SAVE_PATH="$RESOLVED"
SESSION_STATE="$RESOLVED"

# Local pointer only — gitignored (Plan 295)
mkdir -p .claude
echo "$SAVE_PATH" > .claude/.session-state-path

BRANCH=$(git branch --show-current 2>/dev/null)
BRANCH="${BRANCH:-main}"

if [ -f "$SESSION_STATE" ]; then
  # Do not Read .claude/todo.md in full. Only Session Summary / Next Steps / Commit
  # are injected here, capped at 1500 chars — full session-state stays on disk.
  CONTENT=$(awk '
    /^## Session Summary/ { flag=1 }
    /^## Next Steps/ { flag=1 }
    /^## Commit/ { flag=1 }
    /^## / && $0 !~ /^## Session Summary/ && $0 !~ /^## Next Steps/ && $0 !~ /^## Commit/ { flag=0 }
    flag { print }
  ' "$SESSION_STATE")

  if [ -z "$CONTENT" ]; then
    CONTENT=$(head -c 1500 "$SESSION_STATE")
  else
    CONTENT=$(printf '%s' "$CONTENT" | head -c 1500)
  fi

  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "decision": {
      "additionalContext": "Previous session state loaded from: $SESSION_STATE\\n$CONTENT\\n\\nFull file: $SESSION_STATE — read only if needed.\\n\\n---\\nSESSION SAVE TARGET: $SAVE_PATH\\nWhen ending this session, write session-state to the path above (not docs/session-state.md directly). The pointer file .claude/.session-state-path is local-only (gitignored)."
    }
  }
}
EOF
else
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "decision": {
      "additionalContext": "No previous session state found for branch: ${BRANCH}.\\n\\n---\\nSESSION SAVE TARGET: $SAVE_PATH\\nWhen ending this session, write session-state to the path above."
    }
  }
}
EOF
fi

exit 0
