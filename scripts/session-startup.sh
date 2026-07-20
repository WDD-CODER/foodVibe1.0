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

if [ -n "$SESSION_STATE_PATH" ]; then
  SESSION_STATE="$SESSION_STATE_PATH"
  SAVE_PATH="$SESSION_STATE_PATH"
else
  BRANCH=$(git branch --show-current 2>/dev/null | sed 's/[^a-zA-Z0-9]/-/g')
  BRANCH="${BRANCH:-main}"

  # Stable per-branch handoff (committed on /ship amend-before-push)
  SAVE_PATH="docs/session-state-${BRANCH}.md"

  # Local pointer only — gitignored (Plan 295)
  mkdir -p .claude
  echo "$SAVE_PATH" > .claude/.session-state-path

  # Prefer branch-canonical; fall back to newest legacy PPID file, then global
  if [ -f "$SAVE_PATH" ]; then
    SESSION_STATE="$SAVE_PATH"
  else
    LATEST=$(ls -t docs/session-state-${BRANCH}-*.md 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
      SESSION_STATE="$LATEST"
    else
      SESSION_STATE="docs/session-state.md"
    fi
  fi
fi

if [ -f "$SESSION_STATE" ]; then
  CONTENT=$(cat "$SESSION_STATE")
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "decision": {
      "additionalContext": "Previous session state loaded from: $SESSION_STATE\\n$CONTENT\\n\\n---\\nSESSION SAVE TARGET: $SAVE_PATH\\nWhen ending this session, write session-state to the path above (not docs/session-state.md directly). The pointer file .claude/.session-state-path is local-only (gitignored)."
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
