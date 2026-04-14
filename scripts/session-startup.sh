#!/usr/bin/env bash
# session-startup.sh — SessionStart hook
# Automatically loads the previous session's state into context,
# so the AI picks up exactly where it left off.
#
# Parallel-session safe: loads a branch-keyed file (docs/session-state-<branch>.md)
# so parallel sessions on different branches don't overwrite each other.
# Falls back to docs/session-state.md if no branch-specific file exists.
#
# Set SESSION_STATE_PATH to override all auto-detection.
#
# Hook type: SessionStart (matcher: "startup")
# Timeout: 10s

if [ -n "$SESSION_STATE_PATH" ]; then
  SESSION_STATE="$SESSION_STATE_PATH"
else
  BRANCH=$(git branch --show-current 2>/dev/null | sed 's/[^a-zA-Z0-9]/-/g')
  BRANCH_FILE="docs/session-state-${BRANCH}.md"
  if [ -n "$BRANCH" ] && [ -f "$BRANCH_FILE" ]; then
    SESSION_STATE="$BRANCH_FILE"
  else
    SESSION_STATE="docs/session-state.md"
  fi
fi

if [ -f "$SESSION_STATE" ]; then
  CONTENT=$(cat "$SESSION_STATE")
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "decision": {
      "additionalContext": "Previous session state loaded automatically:\\n$CONTENT"
    }
  }
}
EOF
fi

exit 0
